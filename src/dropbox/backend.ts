/**
 * The web Backend: every file operation goes to the Dropbox HTTP API.
 * Paths are Dropbox paths ("/Notes/daily/2026-07-07.md"); the app's "root"
 * is a Dropbox folder path. "mtime" is Dropbox's server_modified in epoch
 * seconds — server-assigned, so it is a consistent clock across devices.
 *
 * Conflict safety: reads remember each file's rev; writeFile uploads in
 * "update <rev>" mode, which Dropbox applies atomically — if anything else
 * (1Writer, Drafts, another tab) changed the file since we read it, the
 * upload is rejected and the caller gets `conflict: true`, exactly like the
 * desktop mtime check but enforced server-side.
 *
 * Search/backlinks/dataview run client-side over a rev-keyed content cache:
 * one recursive folder listing tells us which files changed; only those are
 * re-downloaded.
 */

import type {
  Backend,
  Config,
  Entry,
  FileContent,
  Hit,
  ImageContent,
  NoteMeta,
  Theme,
  WindowInit,
  WriteResult,
} from "../api";
import * as dbx from "./client";
import { loadConfigLocal, saveConfigLocal } from "./config";
import { isMdName, parseNote } from "./notemeta";
import { renderPreview, setSingleLineBreaks } from "./render";
import { bundledThemes } from "./themes";

export { setSingleLineBreaks };
export * as auth from "./auth";

const SEARCH_MAX_BYTES = 4 * 1024 * 1024;
const NOTE_MAX_BYTES = 2 * 1024 * 1024;
const MAX_RESULTS = 500;

// same visibility rules as the desktop tree (src-tauri/src/files.rs)
const TEXT_EXTENSIONS = new Set([
  "md", "markdown", "mdown", "txt", "text", "json", "yaml", "yml", "toml", "ini", "cfg",
  "conf", "csv", "tsv", "log", "tex", "bib", "org", "rst", "adoc", "html", "htm", "css",
  "js", "ts", "jsx", "tsx", "py", "rs", "sh", "bash", "zsh", "fish", "c", "h", "cpp",
  "hpp", "go", "rb", "lua", "sql", "xml", "svg", "env", "gitignore", "fountain",
]);
const MEDIA_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif", "tiff", "tif", // images
  "mp3", "wav", "ogg", "oga", "m4a", "flac", "opus", "aac", "weba", // audio
  "mp4", "m4v", "webm", "mov", "mkv", "ogv", // video
  "pdf",
]);

const extOf = (name: string): string | null => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : null;
};
// no byte-sniffing over HTTP: unknown extensions stay out of the web tree
const isTextName = (name: string): boolean => {
  const ext = extOf(name);
  return ext === null || TEXT_EXTENSIONS.has(ext);
};
const isVisibleFile = (name: string): boolean =>
  isTextName(name) || MEDIA_EXTENSIONS.has(extOf(name) ?? "");

/** "" for the Dropbox root, otherwise "/x/y" with no trailing slash. */
const norm = (p: string): string => {
  const s = p.trim().replace(/\/+$/, "");
  if (s === "" || s === "/") return "";
  return s.startsWith("/") ? s : `/${s}`;
};
const joinPath = (dir: string, name: string): string => `${norm(dir)}/${name}`;
const baseName = (p: string): string => p.slice(p.lastIndexOf("/") + 1);
const parentOf = (p: string): string => p.slice(0, p.lastIndexOf("/"));
const relTo = (root: string, path: string): string =>
  path.slice(norm(root).length).replace(/^\//, "");
const hasHiddenSegment = (rel: string): boolean =>
  rel.split("/").some((s) => s.startsWith("."));

// ------------------------------------------------------- rev/content cache

/** path_lower → last seen rev+mtime, so autosaves skip a metadata roundtrip. */
const revCache = new Map<string, { rev: string; mtime: number }>();

interface CachedText {
  rev: string;
  text: string;
  mtime: number;
  path: string; // display path
  size: number;
}
/** path_lower → downloaded content, reused until the rev changes. */
const contentCache = new Map<string, CachedText>();

function remember(meta: dbx.FileMetadata, text?: string): void {
  const mtime = dbx.mtimeOf(meta);
  revCache.set(meta.path_lower, { rev: meta.rev, mtime });
  if (text !== undefined && isTextName(meta.name)) {
    contentCache.set(meta.path_lower, {
      rev: meta.rev,
      text,
      mtime,
      path: meta.path_display,
      size: meta.size,
    });
  }
}

function forget(pathLower: string): void {
  // a rename/delete invalidates the path and everything under it
  const prefix = `${pathLower}/`;
  for (const map of [revCache, contentCache]) {
    for (const key of map.keys()) {
      if (key === pathLower || key.startsWith(prefix)) map.delete(key);
    }
  }
}

const isFileMeta = (m: dbx.EntryMetadata | null): m is dbx.FileMetadata & { ".tag": "file" } =>
  m !== null && m[".tag"] !== "folder";

/**
 * Make the content cache current for every text file under root (one listing,
 * then only changed files are downloaded), and return them.
 */
async function ensureTexts(root: string): Promise<CachedText[]> {
  const rootN = norm(root);
  const entries = await dbx.listFolderAll(rootN, true);
  const wanted = entries.filter(
    (e): e is dbx.FileMetadata & { ".tag": "file" } =>
      e[".tag"] === "file" &&
      isTextName(e.name) &&
      e.size <= SEARCH_MAX_BYTES &&
      !hasHiddenSegment(relTo(rootN, e.path_display)),
  );
  const stale = wanted.filter((f) => contentCache.get(f.path_lower)?.rev !== f.rev);
  let next = 0;
  const worker = async () => {
    while (next < stale.length) {
      const f = stale[next++];
      const { resp, meta } = await dbx.download(f.path_lower);
      remember(meta, await resp.text());
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, stale.length) }, worker));
  return wanted
    .map((f) => contentCache.get(f.path_lower))
    .filter((c): c is CachedText => c !== undefined);
}

// ---------------------------------------------------------------- backend

async function writeFile(
  path: string,
  content: string,
  expectedMtime: number | null,
): Promise<WriteResult> {
  const p = norm(path);
  let mode: dbx.UploadMode;
  const known = revCache.get(p.toLowerCase());
  if (expectedMtime === null) {
    mode = "overwrite";
  } else if (known && known.mtime === expectedMtime) {
    mode = { ".tag": "update", update: known.rev }; // atomic server-side check
  } else {
    const meta = await dbx.getMetadataOrNull(p);
    if (!isFileMeta(meta)) {
      mode = "add"; // deleted (or never existed) underneath us: (re)create
    } else if (dbx.mtimeOf(meta) !== expectedMtime) {
      return { mtime: dbx.mtimeOf(meta), conflict: true };
    } else {
      mode = { ".tag": "update", update: meta.rev };
    }
  }
  try {
    const done = await dbx.upload(p, content, mode);
    remember(done, content);
    return { mtime: dbx.mtimeOf(done), conflict: false };
  } catch (e) {
    if (e instanceof dbx.DropboxError && dbx.hasTag(e.error, "conflict")) {
      const now = await dbx.getMetadataOrNull(p);
      return { mtime: isFileMeta(now) ? dbx.mtimeOf(now) : 0, conflict: true };
    }
    throw e;
  }
}

async function listTree(root: string): Promise<Entry[]> {
  const rootN = norm(root);
  const entries = await dbx.listFolderAll(rootN, true);
  const dirs = new Map<string, Entry>();
  const top: Entry = { name: "", path: rootN, is_dir: true, mtime: 0, children: [] };
  dirs.set(rootN.toLowerCase(), top);
  // a recursive list_folder of "/x" includes "/x" itself — that's `top`,
  // not a child; keeping it would shadow top in the map and orphan the tree
  const visible = entries.filter(
    (e) =>
      e.path_lower !== rootN.toLowerCase() &&
      !hasHiddenSegment(relTo(rootN, e.path_display)),
  );
  for (const e of visible) {
    if (e[".tag"] === "folder") {
      dirs.set(e.path_lower, {
        name: e.name,
        path: e.path_display,
        is_dir: true,
        mtime: 0,
        children: [],
      });
    }
  }
  for (const e of visible) {
    const parent = dirs.get(parentOf(e.path_lower) || rootN.toLowerCase());
    if (!parent) continue; // parent under a hidden dir
    if (e[".tag"] === "folder") {
      parent.children!.push(dirs.get(e.path_lower)!);
    } else if (isVisibleFile(e.name)) {
      remember(e as dbx.FileMetadata);
      parent.children!.push({
        name: e.name,
        path: e.path_display,
        is_dir: false,
        mtime: dbx.mtimeOf(e as dbx.FileMetadata),
        children: null,
      });
    }
  }
  const sortTree = (list: Entry[]): Entry[] => {
    const key = (x: Entry) => x.name.toLowerCase();
    const dirsFirst = [
      ...list.filter((e) => e.is_dir).sort((a, b) => key(a).localeCompare(key(b))),
      ...list.filter((e) => !e.is_dir).sort((a, b) => key(a).localeCompare(key(b))),
    ];
    for (const d of dirsFirst) if (d.children) d.children = sortTree(d.children);
    return dirsFirst;
  };
  return sortTree(top.children!);
}

const b64FromBytes = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

const bytesFromB64 = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const smartcaseIndex = (line: string, query: string, ci: boolean): number =>
  ci ? line.toLowerCase().indexOf(query) : line.indexOf(query);

export const dropboxBackend: Backend = {
  listTree,
  writeFile,

  readFile: async (path) => {
    const { resp, meta } = await dbx.download(norm(path));
    const content = await resp.text();
    remember(meta, content);
    return { content, mtime: dbx.mtimeOf(meta) } satisfies FileContent;
  },

  readImage: async (path) => {
    const { resp, meta } = await dbx.download(norm(path));
    remember(meta);
    return {
      base64: b64FromBytes(await resp.arrayBuffer()),
      mtime: dbx.mtimeOf(meta),
    } satisfies ImageContent;
  },

  statMtime: async (path) => {
    const meta = await dbx.getMetadata(norm(path));
    if (!isFileMeta(meta)) throw new Error(`${path} is a folder`);
    return dbx.mtimeOf(meta);
  },

  createFile: async (path) => {
    try {
      remember(await dbx.upload(norm(path), "", "add"), "");
    } catch (e) {
      if (e instanceof dbx.DropboxError && dbx.hasTag(e.error, "conflict")) {
        throw new Error(`${path} already exists`);
      }
      throw e;
    }
  },

  createDir: async (path) => {
    try {
      await dbx.rpc("files/create_folder_v2", { path: norm(path), autorename: false });
    } catch (e) {
      // mkdir -p semantics: an existing folder is fine
      if (e instanceof dbx.DropboxError && dbx.hasTag(e.error, "conflict")) return;
      throw e;
    }
  },

  renamePath: async (from, to) => {
    await dbx.rpc("files/move_v2", {
      from_path: norm(from),
      to_path: norm(to),
      autorename: false,
    });
    forget(norm(from).toLowerCase());
  },

  copyPath: async (src, destDir) => {
    const res = await dbx.rpc<{ metadata: dbx.EntryMetadata }>("files/copy_v2", {
      from_path: norm(src),
      to_path: joinPath(destDir, baseName(norm(src))),
      autorename: true,
    });
    return res.metadata.path_display;
  },

  overwriteBase64: async (path, base64) => {
    remember(await dbx.upload(norm(path), bytesFromB64(base64), "overwrite"));
  },

  importFile: () => {
    // takes a local filesystem path — meaningless in a browser
    throw new Error("importFile is desktop-only");
  },

  writeBase64: async (destDir, name, base64) => {
    const meta = await dbx.upload(joinPath(destDir, name), bytesFromB64(base64), "add", true);
    remember(meta);
    return meta.path_display;
  },

  trashPath: async (path) => {
    // delete_v2 goes to Dropbox's trash — recoverable for 30 days, like the
    // desktop's native trash
    await dbx.rpc("files/delete_v2", { path: norm(path) });
    forget(norm(path).toLowerCase());
  },

  readBase64: async (path) => {
    const { resp, meta } = await dbx.download(norm(path));
    remember(meta);
    return b64FromBytes(await resp.arrayBuffer());
  },

  writeTextFile: async (path, content) => {
    remember(await dbx.upload(norm(path), content, "overwrite"), content);
  },

  copyFile: async (src, dest) => {
    // desktop fs::copy overwrites; Dropbox copy won't, so clear the way first
    try {
      await dbx.rpc("files/delete_v2", { path: norm(dest) });
    } catch (e) {
      if (!(e instanceof dbx.DropboxError && dbx.hasTag(e.error, "not_found"))) throw e;
    }
    await dbx.rpc("files/copy_v2", {
      from_path: norm(src),
      to_path: norm(dest),
      autorename: false,
    });
  },

  searchText: async (root, query) => {
    if (!query.trim()) return [];
    // smartcase: case-insensitive unless the query has an uppercase letter
    const ci = !/\p{Lu}/u.test(query);
    const needle = ci ? query.toLowerCase() : query;
    const hits: Hit[] = [];
    for (const file of await ensureTexts(root)) {
      const lines = file.text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const start = smartcaseIndex(lines[i], needle, ci);
        if (start < 0) continue;
        hits.push({
          path: file.path,
          line: i + 1,
          text: lines[i].slice(0, 400),
          start,
          end: Math.min(start + query.length, 400),
        });
        if (hits.length >= MAX_RESULTS) return hits;
      }
    }
    return hits;
  },

  findBacklinks: async (root, target) => {
    if (!target.trim()) return [];
    const escaped = target.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\[\\[${escaped}\\s*([|#][^\\]]*)?\\]\\]`, "i");
    const hits: Hit[] = [];
    for (const file of await ensureTexts(root)) {
      const lines = file.text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = pattern.exec(lines[i]);
        if (!m) continue;
        hits.push({
          path: file.path,
          line: i + 1,
          text: lines[i].slice(0, 400),
          start: m.index,
          end: Math.min(m.index + m[0].length, 400),
        });
        if (hits.length >= MAX_RESULTS) return hits;
      }
    }
    return hits;
  },

  collectNotes: async (root) => {
    const out: NoteMeta[] = [];
    for (const file of await ensureTexts(root)) {
      const name = baseName(file.path);
      if (!isMdName(name) || file.size > NOTE_MAX_BYTES) continue;
      const { fields, tags, tasks } = parseNote(file.text);
      out.push({
        path: file.path,
        rel: relTo(root, file.path),
        name: name.replace(/\.[^.]*$/, ""),
        mtime: file.mtime,
        tags,
        fields,
        tasks,
      });
    }
    return out;
  },

  openWindow: async (root, file) => {
    const url = new URL(location.origin + location.pathname);
    if (root) url.searchParams.set("root", root);
    if (file) url.searchParams.set("file", file);
    window.open(url.toString(), "_blank");
  },

  windowInitParams: async (): Promise<WindowInit | null> => {
    const params = new URLSearchParams(location.search);
    const root = params.get("root");
    const file = params.get("file");
    return root || file ? { root, file } : null;
  },

  renderPreview: async (text) => renderPreview(text),

  listThemes: async (): Promise<Theme[]> => bundledThemes(),
  themesDirPath: async () => "", // no themes folder on the web — bundled only

  loadConfig: async (): Promise<Config> => loadConfigLocal(),
  saveConfig: async (config) => saveConfigLocal(config),

  watchRoot: async () => {
    // no push notifications over HTTP; the rev checks in ensureTexts and
    // writeFile keep us consistent. (Phase 3 could poll list_folder cursors.)
  },
};
