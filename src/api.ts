import { invoke } from "@tauri-apps/api/core";

export interface Entry {
  name: string;
  path: string;
  is_dir: boolean;
  mtime: number;
  children: Entry[] | null;
}

export interface FileContent {
  content: string;
  mtime: number;
}

export interface WriteResult {
  mtime: number;
  conflict: boolean;
}

export interface Hit {
  path: string;
  line: number;
  text: string;
  start: number;
  end: number;
}

export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  css: string | null;
}

export interface Config {
  theme: string;
  font_size: number;
  ui_font_size: number;
  editor_font: string;
  editor_margin: number;
  /** longest line in characters before text wraps; 0 = fill the window */
  line_width: number;
  line_numbers: boolean;
  highlight_line: boolean;
  vim_mode: boolean;
  /** render single newlines as line breaks in the preview (wysiwyg) */
  single_line_breaks: boolean;
  root: string | null;
  recent_roots: string[];
  pinned_roots: string[];
  daily_dir: string;
  image_dir: string;
  sidebar_width: number;
  sidebar_right: boolean;
  /** keep the file sidebar visible in zen / fullscreen mode */
  zen_sidebar: boolean;
  /** typewriter scrolling in zen mode */
  zen_typewriter: boolean;
  /** where the typewriter line sits: "top" (upper third) or "center" */
  typewriter_anchor: string;
  /** underline misspelled words in the editor (browser/OS dictionary) */
  spellcheck: boolean;
  /** on desktop, preview replaces the editor pane instead of a side-by-side split */
  preview_replaces_editor: boolean;
  toolbar_capture: boolean;
  toolbar_calendar: boolean;
  toolbar_preview: boolean;
  keys: Record<string, string>;
}

export interface ImageContent {
  base64: string;
  mtime: number;
}

export interface WindowInit {
  root: string | null;
  file: string | null;
}

export interface TaskItem {
  text: string;
  done: boolean;
  line: number;
}

export interface NoteMeta {
  path: string;
  rel: string;
  name: string;
  mtime: number;
  tags: string[];
  fields: Record<string, string>;
  tasks: TaskItem[];
}

/**
 * The storage/data surface the app talks to. The desktop build binds this to
 * the Tauri/Rust backend (local filesystem); the mobile PWA build binds it to
 * a Dropbox adapter. `main.ts` only ever touches the re-exported functions at
 * the bottom of this file, so swapping backends never touches the editor.
 *
 * See MOD_API.md and the mobile roadmap in changes.txt.
 */
export interface Backend {
  listTree(root: string): Promise<Entry[]>;
  readFile(path: string): Promise<FileContent>;
  readImage(path: string): Promise<ImageContent>;
  writeFile(path: string, content: string, expectedMtime: number | null): Promise<WriteResult>;
  statMtime(path: string): Promise<number>;
  createFile(path: string): Promise<void>;
  createDir(path: string): Promise<void>;
  renamePath(from: string, to: string): Promise<void>;
  copyPath(src: string, destDir: string): Promise<string>;
  overwriteBase64(path: string, base64: string): Promise<void>;
  importFile(src: string, destDir: string): Promise<string>;
  writeBase64(destDir: string, name: string, base64: string): Promise<string>;
  trashPath(path: string): Promise<void>;
  readBase64(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  searchText(root: string, query: string): Promise<Hit[]>;
  findBacklinks(root: string, target: string): Promise<Hit[]>;
  openWindow(root: string | null, file: string | null): Promise<void>;
  windowInitParams(): Promise<WindowInit | null>;
  collectNotes(root: string): Promise<NoteMeta[]>;
  renderPreview(text: string): Promise<string>;
  listThemes(): Promise<Theme[]>;
  themesDirPath(): Promise<string>;
  loadConfig(): Promise<Config>;
  saveConfig(config: Config): Promise<void>;
  watchRoot(root: string): Promise<void>;
}

/**
 * Whether single newlines render as <br> (wysiwyg). Config-driven and set by
 * the app (see setSingleLineBreaks), so every render path — preview, SSG, PDF,
 * mods — honours it without threading the flag through each caller.
 */
let singleLineBreaks = false;
export const setSingleLineBreaks = (v: boolean) => {
  singleLineBreaks = v;
  if (!isTauri) void dropbox().then((m) => m.setSingleLineBreaks(v));
};

/** The desktop backend: every call is a Tauri command into the Rust core. */
const tauriBackend: Backend = {
  listTree: (root) => invoke<Entry[]>("list_tree", { root }),
  readFile: (path) => invoke<FileContent>("read_file", { path }),
  readImage: (path) => invoke<ImageContent>("read_image", { path }),
  writeFile: (path, content, expectedMtime) =>
    invoke<WriteResult>("write_file", { path, content, expectedMtime }),
  statMtime: (path) => invoke<number>("stat_mtime", { path }),
  createFile: (path) => invoke<void>("create_file", { path }),
  createDir: (path) => invoke<void>("create_dir", { path }),
  renamePath: (from, to) => invoke<void>("rename_path", { from, to }),
  copyPath: (src, destDir) => invoke<string>("copy_path", { src, destDir }),
  overwriteBase64: (path, base64) => invoke<void>("overwrite_base64", { path, base64 }),
  importFile: (src, destDir) => invoke<string>("import_file", { src, destDir }),
  writeBase64: (destDir, name, base64) =>
    invoke<string>("write_base64", { destDir, name, base64 }),
  trashPath: (path) => invoke<void>("trash_path", { path }),
  readBase64: (path) => invoke<string>("read_base64", { path }),
  writeTextFile: (path, content) => invoke<void>("write_text_file", { path, content }),
  copyFile: (src, dest) => invoke<void>("copy_file", { src, dest }),
  searchText: (root, query) => invoke<Hit[]>("search_text", { root, query }),
  findBacklinks: (root, target) => invoke<Hit[]>("find_backlinks", { root, target }),
  openWindow: (root, file) => invoke<void>("open_window", { root, file }),
  windowInitParams: () => invoke<WindowInit | null>("window_init_params"),
  collectNotes: (root) => invoke<NoteMeta[]>("collect_notes", { root }),
  renderPreview: (text) => invoke<string>("render_preview", { text, singleLineBreaks }),
  listThemes: () => invoke<Theme[]>("list_themes"),
  themesDirPath: () => invoke<string>("themes_dir_path"),
  loadConfig: () => invoke<Config>("load_config"),
  saveConfig: (config) => invoke<void>("save_config", { config }),
  watchRoot: (root) => invoke<void>("watch_root", { root }),
};

/**
 * The mobile/PWA backend: the Dropbox adapter (src/dropbox/). Loaded lazily
 * via dynamic import so the desktop app never pulls the Dropbox client or
 * the client-side markdown renderer into its startup path. Every Backend
 * method is async, so resolving the module inside each call is transparent.
 */
const dropbox = () => import("./dropbox/backend");
const webBackend = new Proxy({} as Backend, {
  get:
    (_target, method: keyof Backend) =>
    (...args: unknown[]) =>
      dropbox().then((m) =>
        (m.dropboxBackend[method] as (...a: unknown[]) => unknown)(...args),
      ),
});

/** Tauri v2 injects this on the window; its absence means a plain browser. */
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const backend: Backend = isTauri ? tauriBackend : webBackend;

export const listTree = (root: string) => backend.listTree(root);
export const readFile = (path: string) => backend.readFile(path);
export const readImage = (path: string) => backend.readImage(path);
export const writeFile = (path: string, content: string, expectedMtime: number | null) =>
  backend.writeFile(path, content, expectedMtime);
export const statMtime = (path: string) => backend.statMtime(path);
export const createFile = (path: string) => backend.createFile(path);
export const createDir = (path: string) => backend.createDir(path);
export const renamePath = (from: string, to: string) => backend.renamePath(from, to);
export const copyPath = (src: string, destDir: string) => backend.copyPath(src, destDir);
export const overwriteBase64 = (path: string, base64: string) =>
  backend.overwriteBase64(path, base64);
export const importFile = (src: string, destDir: string) => backend.importFile(src, destDir);
export const writeBase64 = (destDir: string, name: string, base64: string) =>
  backend.writeBase64(destDir, name, base64);
export const trashPath = (path: string) => backend.trashPath(path);

// generic filesystem primitives for mods (see src/mods/types.ts, MOD_API.md)
export const readBase64 = (path: string) => backend.readBase64(path);
export const writeTextFile = (path: string, content: string) =>
  backend.writeTextFile(path, content);
export const copyFile = (src: string, dest: string) => backend.copyFile(src, dest);
export const searchText = (root: string, query: string) => backend.searchText(root, query);
export const findBacklinks = (root: string, target: string) =>
  backend.findBacklinks(root, target);

export const openWindow = (root: string | null, file: string | null) =>
  backend.openWindow(root, file);
export const windowInitParams = () => backend.windowInitParams();

export interface LatexResult {
  ok: boolean;
  pdf_path: string;
  log: string;
}

/** Desktop-only: compiles a .tex file with the system's pdflatex. No web
 * equivalent (no filesystem/process access in the browser), so this bypasses
 * the Backend abstraction rather than needing a no-op on the web side. */
export const compileLatex = (path: string): Promise<LatexResult> =>
  isTauri
    ? invoke<LatexResult>("compile_latex", { path })
    : Promise.reject(new Error("LaTeX compiling needs the desktop app"));

/** Desktop-only: the clipboard's image as base64 PNG, or null when the
 * clipboard holds no image. WebKitGTK's paste events don't reliably carry
 * image data, so the editor falls back to this. On the web the paste event
 * itself is the only clipboard access — resolves null there. */
export const readClipboardImage = (): Promise<string | null> =>
  isTauri ? invoke<string | null>("read_clipboard_image") : Promise.resolve(null);

/** Note metadata (frontmatter, tags, tasks) for dataview query blocks. */
export const collectNotes = (root: string) => backend.collectNotes(root);

/** Markdown → preview HTML (wikilinks/embeds left for the app to resolve). */
export const renderPreview = (text: string) => backend.renderPreview(text);

export const listThemes = () => backend.listThemes();
export const themesDirPath = () => backend.themesDirPath();
export const loadConfig = () => backend.loadConfig();
export const saveConfig = (config: Config) => backend.saveConfig(config);
export const watchRoot = (root: string) => backend.watchRoot(root);
