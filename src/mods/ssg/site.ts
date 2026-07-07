/**
 * Site model: turn a folder into an addressable set of output files and the
 * indexes needed to resolve wikilinks/embeds/links between them.
 *
 * This is a TypeScript port of the naming + resolution rules the app's old
 * Rust exporter used, so a `[[note]]` resolves to the same page it would in
 * the editor. The markdown→HTML step itself is delegated to the host renderer
 * (see render.ts); this file is pure path bookkeeping.
 */

import type { Entry } from "../../api";

export interface SrcFile {
  rel: string; // path relative to the site root, '/'-separated
  path: string; // absolute source path
  note: boolean; // markdown note → rendered page; else copied verbatim
}

export interface Site {
  root: string;
  title: string;
  files: SrcFile[]; // in stable (sorted) order
  outOf: Map<string, string>; // src rel → output rel
  noteByStem: Map<string, string>; // lowercase note stem → src rel
  byBasename: Map<string, string>; // lowercase basename → src rel
}

// ------------------------------------------------------------ path helpers

export const isNote = (name: string) => /\.(md|markdown|mdown)$/i.test(name);

export function dirOf(rel: string): string {
  const i = rel.lastIndexOf("/");
  return i < 0 ? "" : rel.slice(0, i);
}

export function baseOf(rel: string): string {
  const i = rel.lastIndexOf("/");
  return i < 0 ? rel : rel.slice(i + 1);
}

export function stemOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

/** Strip characters that break file names / URLs (mirrors the old exporter). */
export function sanitizeComponent(c: string): string {
  const cleaned = Array.from(c)
    .map((ch) => ("#?%\"<>\\|".includes(ch) || ch.charCodeAt(0) < 0x20 ? "-" : ch))
    .join("");
  return cleaned === "" ? "-" : cleaned;
}

/** Heading-anchor slug — must match the host renderer's heading ids. */
export function slugify(text: string): string {
  let out = "";
  let dash = true;
  for (const c of text) {
    if (/[\p{L}\p{N}]/u.test(c)) {
      out += c.toLowerCase();
      dash = false;
    } else if (!dash) {
      out += "-";
      dash = true;
    }
  }
  return out.replace(/-+$/, "");
}

/** Collapse `.`/`..` segments (mirrors normalizePath in main.ts). */
export function normalizePath(p: string): string {
  const parts: string[] = [];
  for (const part of p.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

export const encodeHref = (path: string) =>
  path.split("/").map(encodeURIComponent).join("/");

const rootPrefix = (from: string) => "../".repeat((from.match(/\//g) ?? []).length);

/** Relative href from the page at `from` (output rel) to output rel `to`. */
export const relHref = (from: string, to: string) => encodeHref(rootPrefix(from) + to);

export { rootPrefix };

// ------------------------------------------------------------ name ordering

const datish = (name: string) => {
  const s = stemOf(name);
  return s !== "" && /^[0-9]/.test(s) && /^[0-9-]+$/.test(s);
};

/** Order like the app tree: A–Z, but date-shaped names (daily notes) newest
 * first, kept as a separate leading group (a total order — see the old Rust
 * comment about why interleaving panicked). */
export function nameOrder(a: string, b: string): number {
  const da = datish(a);
  const db = datish(b);
  if (da && db) return a < b ? 1 : a > b ? -1 : 0; // dates: newest first
  if (!da && !db) return a.toLowerCase().localeCompare(b.toLowerCase());
  return da ? -1 : 1; // dates group leads
}

// ------------------------------------------------------------ reading order

/** Folder → note structure: the single source of truth for the table of
 * contents, the prev/next page order, and the PDF section order. Notes come
 * before subfolders at every level (root notes read as front matter, folders
 * as chapters), both in {@link nameOrder}. */
export interface TocNode {
  dirs: Map<string, TocNode>;
  notes: { title: string; out: string }[];
}

export function buildToc(site: Site): TocNode {
  const root: TocNode = { dirs: new Map(), notes: [] };
  for (const f of site.files) {
    if (!f.note) continue;
    const out = site.outOf.get(f.rel)!;
    const parts = f.rel.split("/");
    let node = root;
    for (const seg of parts.slice(0, -1)) {
      let child = node.dirs.get(seg);
      if (!child) node.dirs.set(seg, (child = { dirs: new Map(), notes: [] }));
      node = child;
    }
    node.notes.push({ title: stemOf(parts[parts.length - 1]), out });
  }
  return root;
}

export const sortedNotes = (node: TocNode) =>
  [...node.notes].sort((a, b) => nameOrder(a.title, b.title));
export const sortedDirs = (node: TocNode) =>
  [...node.dirs.entries()].sort((a, b) => nameOrder(a[0], b[0]));

export interface PageRef {
  out: string;
  title: string;
}

/** Every note page in ToC order — the book's spine. */
export function readingOrder(site: Site): PageRef[] {
  const order: PageRef[] = [];
  const walk = (node: TocNode) => {
    for (const nt of sortedNotes(node)) order.push({ out: nt.out, title: nt.title });
    for (const [, child] of sortedDirs(node)) walk(child);
  };
  walk(buildToc(site));
  return order;
}

/** Where the generated contents page lives: index.html, unless a root
 * README/index note claimed it — then the first free contents*.html. */
export function tocPath(site: Site): string {
  const taken = new Set(site.outOf.values());
  if (!taken.has("index.html")) return "index.html";
  for (let n = 0; ; n++) {
    const p = n === 0 ? "contents.html" : `contents-${n}.html`;
    if (!taken.has(p)) return p;
  }
}

// ------------------------------------------------------------ gather + build

/** Flatten the sidebar tree into source files (notes + copyable assets). */
export function gather(root: string, tree: Entry[]): SrcFile[] {
  const files: SrcFile[] = [];
  const base = root.endsWith("/") ? root : root + "/";
  const walk = (entries: Entry[]) => {
    for (const e of entries) {
      if (e.is_dir) {
        if (e.children) walk(e.children);
      } else {
        const rel = e.path.startsWith(base) ? e.path.slice(base.length) : e.name;
        files.push({ rel, path: e.path, note: isNote(e.name) });
      }
    }
  };
  walk(tree);
  return files;
}

export function buildSite(root: string, title: string, srcFiles: SrcFile[]): Site {
  const files = [...srcFiles].sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

  const used = new Set<string>();
  const dedup = (candidate: string): string => {
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    const slash = candidate.lastIndexOf("/");
    const dot = candidate.lastIndexOf(".");
    const [stem, ext] =
      dot > slash + 1 ? [candidate.slice(0, dot), candidate.slice(dot)] : [candidate, ""];
    for (let n = 1; ; n++) {
      const p = `${stem}-${n}${ext}`;
      if (!used.has(p)) {
        used.add(p);
        return p;
      }
    }
  };

  const site: Site = {
    root,
    title,
    files: [],
    outOf: new Map(),
    noteByStem: new Map(),
    byBasename: new Map(),
  };

  for (const f of files) {
    const name = baseOf(f.rel);
    const dir = f.rel
      .split("/")
      .slice(0, -1)
      .map(sanitizeComponent)
      .join("/");
    const join = (n: string) => (dir === "" ? n : `${dir}/${n}`);
    const clean = sanitizeComponent(name);

    if (f.note) {
      const hasIndex = files.some(
        (o) =>
          o.note &&
          dirOf(o.rel) === dirOf(f.rel) &&
          stemOf(baseOf(o.rel)).toLowerCase() === "index",
      );
      const stem = stemOf(clean);
      const outName =
        stem.toLowerCase() === "readme" && !hasIndex ? "index.html" : `${stem}.html`;
      const out = dedup(join(outName));
      site.outOf.set(f.rel, out);
      const key = stemOf(name).toLowerCase();
      if (!site.noteByStem.has(key)) site.noteByStem.set(key, f.rel);
    } else {
      const out = dedup(join(clean));
      site.outOf.set(f.rel, out);
    }
    const bkey = name.toLowerCase();
    if (!site.byBasename.has(bkey)) site.byBasename.set(bkey, f.rel);
  }
  site.files = files;
  return site;
}

// ------------------------------------------------------------ resolution

/** Resolve a link target the way the app does: relative to the note's dir,
 * then the site root, then by bare basename. Returns an output rel or null. */
export function resolve(site: Site, target: string, curDir: string): string | null {
  let t = target;
  try {
    t = decodeURIComponent(target);
  } catch {
    /* keep raw */
  }
  t = t.trim().replace(/^\/+/, "");
  const candidates = curDir === "" ? [t] : [`${curDir}/${t}`, t];
  for (const c of candidates) {
    const norm = normalizePath(c);
    const out = site.outOf.get(norm);
    if (out) return out;
  }
  const base = (t.split("/").pop() ?? t).toLowerCase();
  const rel = site.byBasename.get(base);
  return rel ? (site.outOf.get(rel) ?? null) : null;
}

/** Resolve a wikilink note target: stem match first, then basename. */
export function resolveNote(site: Site, target: string): string | null {
  const key = target.trim().toLowerCase();
  const byStem = site.noteByStem.get(key);
  if (byStem) return site.outOf.get(byStem) ?? null;
  const rel = site.byBasename.get(key);
  return rel ? (site.outOf.get(rel) ?? null) : null;
}
