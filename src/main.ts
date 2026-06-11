import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import * as api from "./api";
import { Editor, type NoteRef } from "./editor";
import { applyTheme, setFontSize, setUiFontSize } from "./theme";
import { closeModal, confirmBox, pick, promptText } from "./modal";
import { dataUrlBytes, invalidateImage, isViewableImage, loadImage } from "./images";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

// ---------------------------------------------------------------- state

let config: api.Config;
let themes: api.Theme[] = [];
let root: string | null = null;
let tree: api.Entry[] = [];
let allFiles: { rel: string; path: string; conflicted: boolean }[] = [];
let notes: NoteRef[] = [];

let currentPath: string | null = null;
let currentMtime: number | null = null;
let viewingImage = false;
let imageBytes = 0;
let dirty = false;
let saving = false;
let autosaveTimer: number | undefined;
let searchTimer: number | undefined;

let editor: Editor;

const expanded = new Set<string>(
  JSON.parse(localStorage.getItem("text.expanded") ?? "[]"),
);

// ---------------------------------------------------------------- helpers

const rel = (path: string) =>
  root && path.startsWith(root) ? path.slice(root.length).replace(/^\//, "") : path;

const stem = (name: string) => name.replace(/\.[^.]+$/, "");

const isNote = (name: string) => /\.(md|markdown|mdown)$/i.test(name);

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function flatten(entries: api.Entry[]) {
  allFiles = [];
  notes = [];
  const walk = (items: api.Entry[]) => {
    for (const item of items) {
      if (item.is_dir) {
        if (item.children) walk(item.children);
      } else {
        allFiles.push({
          rel: rel(item.path),
          path: item.path,
          conflicted: /conflicted copy/i.test(item.name),
        });
        if (isNote(item.name)) notes.push({ name: stem(item.name), path: item.path });
      }
    }
  };
  walk(entries);
}

// ---------------------------------------------------------------- banner

const banner = $("#banner");
const bannerText = $("#banner-text");
const bannerActions = $("#banner-actions");

function showBanner(text: string, actions: { label: string; run: () => void }[]) {
  bannerText.textContent = text;
  bannerActions.replaceChildren(
    ...actions.map(({ label, run }) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", () => {
        hideBanner();
        run();
      });
      return b;
    }),
  );
  banner.hidden = false;
}

const hideBanner = () => {
  banner.hidden = true;
};

// ---------------------------------------------------------------- status bar

const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

function updateStatus() {
  $("#status-path").textContent = currentPath ? rel(currentPath) : "";
  $("#status-dirty").hidden = !dirty;
  if (!currentPath) {
    $("#status-right").textContent = "";
    return;
  }
  if (viewingImage) {
    const img = $<HTMLImageElement>("#image-view img");
    const dims = img.naturalWidth ? `${img.naturalWidth}×${img.naturalHeight} · ` : "";
    $("#status-right").textContent = `${dims}${fmtSize(imageBytes)}`;
    document.title = `text — ${rel(currentPath)}`;
    return;
  }
  const s = editor.status();
  const counts = isNote(currentPath) ? `${s.words} words · ` : "";
  $("#status-right").textContent = `${counts}${s.chars} chars · ${s.line}:${s.col}`;
  document.title = `text — ${rel(currentPath)}`;
}

// ---------------------------------------------------------------- file tree

const treeEl = $("#tree");
const entryByPath = new Map<string, api.Entry>();
const rowByPath = new Map<string, HTMLElement>();

function renderTree() {
  entryByPath.clear();
  rowByPath.clear();
  treeEl.replaceChildren(...tree.map((e) => renderEntry(e, 0)));
}

function renderEntry(entry: api.Entry, depth: number): HTMLElement {
  const row = document.createElement("div");
  row.className = "tree-row" + (entry.is_dir ? " dir" : "");
  row.style.paddingLeft = `${10 + depth * 14}px`;
  row.dataset.path = entry.path;
  if (entry.path === currentPath) row.classList.add("current");
  entryByPath.set(entry.path, entry);
  rowByPath.set(entry.path, row);

  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = entry.is_dir
    ? (expanded.has(entry.path) ? "▾ " : "▸ ") + entry.name
    : isNote(entry.name)
      ? stem(entry.name)
      : entry.name;
  row.appendChild(label);
  if (!entry.is_dir && /conflicted copy/i.test(entry.name)) {
    row.classList.add("conflicted");
    row.title = "Dropbox conflicted copy";
  }

  const wrap = document.createElement("div");
  wrap.appendChild(row);

  if (entry.is_dir && expanded.has(entry.path) && entry.children) {
    for (const child of entry.children) wrap.appendChild(renderEntry(child, depth + 1));
  }
  return wrap;
}

/** Mark the open file in the tree without rebuilding it. */
function setCurrentRow(path: string | null) {
  for (const [p, row] of rowByPath) row.classList.toggle("current", p === path);
}

function entryAt(e: Event): api.Entry | undefined {
  const row = (e.target as HTMLElement).closest<HTMLElement>(".tree-row");
  return row?.dataset.path ? entryByPath.get(row.dataset.path) : undefined;
}

// Activate rows on mousedown, delegated from the container: it reacts a beat
// faster than click and survives the tree being re-rendered mid-press (a
// rebuild between mousedown and mouseup would otherwise swallow the click).
treeEl.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  const entry = entryAt(e);
  if (!entry) return;
  e.preventDefault();
  if (entry.is_dir) {
    expanded.has(entry.path) ? expanded.delete(entry.path) : expanded.add(entry.path);
    localStorage.setItem("text.expanded", JSON.stringify([...expanded]));
    renderTree();
  } else {
    void openFile(entry.path);
  }
});
treeEl.addEventListener("contextmenu", (e) => {
  const entry = entryAt(e);
  if (!entry) return;
  e.preventDefault();
  showContextMenu(e, entry);
});

function showContextMenu(e: MouseEvent, entry: api.Entry) {
  document.getElementById("ctx-menu")?.remove();
  const menu = document.createElement("div");
  menu.id = "ctx-menu";
  const add = (label: string, run: () => void) => {
    const item = document.createElement("div");
    item.textContent = label;
    // mousedown, not click: the document-level close handler below also fires
    // on mousedown and would remove the menu before a click could complete.
    item.addEventListener("mousedown", (ev) => {
      ev.stopPropagation();
      menu.remove();
      run();
    });
    menu.appendChild(item);
  };
  if (entry.is_dir) {
    add("new note inside", () => void newNote(entry.path));
    add("new folder inside", () => void newFolder(entry.path));
  }
  add("rename", () => void renameEntry(entry));
  add("delete", () => void deleteEntry(entry));
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  document.body.appendChild(menu);
  const close = () => menu.remove();
  setTimeout(() => document.addEventListener("mousedown", close, { once: true }));
}

let treeFingerprint = "";

async function refreshTree() {
  if (!root) return;
  tree = await api.listTree(root);
  flatten(tree);
  // Skip the DOM rebuild when nothing structural changed (autosaves trip the
  // fs watcher constantly); rebuilding mid-interaction eats mouse presses.
  const fingerprint = JSON.stringify(tree);
  if (fingerprint === treeFingerprint) return;
  treeFingerprint = fingerprint;
  renderTree();
}

// ---------------------------------------------------------------- open/save

async function openFile(path: string) {
  if (isViewableImage(path)) return openImage(path);
  if (currentPath && dirty) await save();
  hideBanner();
  try {
    const file = await api.readFile(path);
    currentPath = path;
    currentMtime = file.mtime;
    dirty = false;
    hideImageView();
    editor.openDoc(file.content, path.split("/").pop() ?? path);
    $("#welcome").style.display = "none";
    localStorage.setItem("text.lastFile", path);
    setCurrentRow(path);
    updateStatus();
    void refreshBacklinks();
    editor.focus();
  } catch (err) {
    showBanner(String(err), [{ label: "ok", run: hideBanner }]);
  }
}

async function openImage(path: string) {
  if (currentPath && dirty && !viewingImage) await save();
  hideBanner();
  try {
    const src = await loadImage(path);
    currentPath = path;
    currentMtime = null;
    dirty = false;
    viewingImage = true;
    imageBytes = dataUrlBytes(src);
    const img = $<HTMLImageElement>("#image-view img");
    img.onload = updateStatus; // natural dimensions arrive async
    img.src = src;
    $("#image-view").hidden = false;
    $("#welcome").style.display = "none";
    localStorage.setItem("text.lastFile", path);
    setCurrentRow(path);
    updateStatus();
    void refreshBacklinks();
  } catch (err) {
    showBanner(String(err), [{ label: "ok", run: hideBanner }]);
  }
}

function hideImageView() {
  viewingImage = false;
  $("#image-view").hidden = true;
}

async function save(): Promise<boolean> {
  if (!currentPath || saving || viewingImage) return true;
  saving = true;
  try {
    const result = await api.writeFile(currentPath, editor.text, currentMtime);
    if (result.conflict) {
      const path = currentPath;
      showBanner("this file changed on disk while you were editing it", [
        {
          label: "overwrite with mine",
          run: () => {
            currentMtime = null;
            void save();
          },
        },
        {
          label: "reload from disk",
          run: () => {
            dirty = false;
            void openFile(path);
          },
        },
      ]);
      return false;
    }
    currentMtime = result.mtime;
    dirty = false;
    if (currentPath === configFilePath) await applyConfigFromDisk();
    updateStatus();
    return true;
  } catch (err) {
    showBanner(`save failed: ${err}`, [{ label: "ok", run: hideBanner }]);
    return false;
  } finally {
    saving = false;
  }
}

function scheduleAutosave() {
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => void save(), 900);
}

// ---------------------------------------------------------------- external changes

async function onFsChanged(paths: string[]) {
  await refreshTree();
  for (const p of paths) invalidateImage(p);
  if (!currentPath || !paths.includes(currentPath)) return;
  if (viewingImage) {
    try {
      await api.statMtime(currentPath);
    } catch {
      showBanner("this image was deleted or moved on disk", [
        { label: "close it", run: closeCurrent },
      ]);
      return;
    }
    await openImage(currentPath);
    return;
  }
  let onDisk: number;
  try {
    onDisk = await api.statMtime(currentPath);
  } catch {
    // the open file was deleted or moved externally
    showBanner("this file was deleted or moved on disk", [
      { label: "keep my copy (re-save)", run: () => ((currentMtime = null), void save()) },
      { label: "close it", run: closeCurrent },
    ]);
    return;
  }
  if (currentMtime !== null && onDisk === currentMtime) return;
  if (!dirty) {
    const file = await api.readFile(currentPath);
    currentMtime = file.mtime;
    editor.replaceContent(file.content);
    updateStatus();
  } else {
    const path = currentPath;
    showBanner("this file changed on disk and you have unsaved edits", [
      {
        label: "keep mine (overwrites)",
        run: () => ((currentMtime = null), void save()),
      },
      {
        label: "take theirs",
        run: () => {
          dirty = false;
          void openFile(path);
        },
      },
    ]);
  }
}

function closeCurrent() {
  currentPath = null;
  currentMtime = null;
  dirty = false;
  hideImageView();
  editor.openDoc("", "untitled.md");
  $("#welcome").style.display = "";
  setCurrentRow(null);
  updateStatus();
}

// ---------------------------------------------------------------- create/rename/delete

async function newNote(dir?: string) {
  if (!root) return;
  const name = await promptText("new note name", "");
  if (!name) return;
  const file = name.includes(".") ? name : `${name}.md`;
  const path = `${dir ?? root}/${file}`;
  try {
    await api.createFile(path);
    await refreshTree();
    await openFile(path);
  } catch (err) {
    showBanner(String(err), [{ label: "ok", run: hideBanner }]);
  }
}

async function newFolder(dir?: string) {
  if (!root) return;
  const name = await promptText("new folder name", "");
  if (!name) return;
  await api.createDir(`${dir ?? root}/${name}`);
  await refreshTree();
}

async function renameEntry(entry: api.Entry) {
  const name = await promptText("rename to", entry.name);
  if (!name || name === entry.name) return;
  const parent = entry.path.slice(0, entry.path.length - entry.name.length);
  const to = parent + name;
  try {
    await api.renamePath(entry.path, to);
    if (currentPath === entry.path) {
      currentPath = to;
      localStorage.setItem("text.lastFile", to);
    }
    await refreshTree();
    updateStatus();
  } catch (err) {
    showBanner(String(err), [{ label: "ok", run: hideBanner }]);
  }
}

async function deleteEntry(entry: api.Entry) {
  const ok = await confirmBox(`move "${entry.name}" to trash?`, "Trash it");
  if (!ok) return;
  await api.trashPath(entry.path);
  if (currentPath?.startsWith(entry.path)) closeCurrent();
  await refreshTree();
}

// ---------------------------------------------------------------- switcher / wikilinks

async function quickSwitch() {
  if (!root) return;
  const chosen = await pick(
    allFiles.map((f) => ({ label: f.rel, value: f.path })),
    {
      placeholder: "open note…",
      freeTextHint: "new note",
      onFreeText: (text) => void createAndOpen(text),
    },
  );
  if (chosen) void openFile(chosen.value);
}

async function createAndOpen(name: string) {
  if (!root) return;
  const file = name.includes(".") ? name : `${name}.md`;
  const path = `${root}/${file}`;
  try {
    await api.createFile(path);
  } catch {
    // already exists — just open it
  }
  await refreshTree();
  await openFile(path);
}

function openWikilink(target: string) {
  const hit = notes.find((n) => n.name.toLowerCase() === target.toLowerCase());
  if (hit) return void openFile(hit.path);
  // non-note targets like [[photo.png]] — match by file name
  const file = allFiles.find(
    (f) => f.path.split("/").pop()!.toLowerCase() === target.toLowerCase(),
  );
  if (file) return void openFile(file.path);
  void createAndOpen(target);
}

// ---------------------------------------------------------------- image embeds

/** Collapse `.` and `..` segments so relative links match tree paths. */
function normalizePath(p: string): string {
  const abs = p.startsWith("/");
  const parts: string[] = [];
  for (const part of p.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return (abs ? "/" : "") + parts.join("/");
}

/** Resolve an embed target to an img src: URLs pass through; local paths are
 * tried relative to the open file, then the root, then by bare file name. */
async function resolveImage(target: string): Promise<string | null> {
  if (/^(https?:|data:)/i.test(target)) return target;
  if (!root) return null;
  let t = target;
  try {
    t = decodeURIComponent(target);
  } catch {
    // not URI-encoded — use as-is
  }
  const dir = currentPath ? currentPath.slice(0, currentPath.lastIndexOf("/")) : root;
  const candidates = t.startsWith("/") ? [t] : [`${dir}/${t}`, `${root}/${t}`];
  for (const c of candidates) {
    const path = normalizePath(c);
    if (allFiles.some((f) => f.path === path)) return loadImage(path).catch(() => null);
  }
  const base = t.split("/").pop()!.toLowerCase();
  const hit = allFiles.find((f) => f.path.split("/").pop()!.toLowerCase() === base);
  return hit ? loadImage(hit.path).catch(() => null) : null;
}

// ---------------------------------------------------------------- sidebar panes

function showPane(tab: "files" | "search" | "links") {
  for (const b of document.querySelectorAll<HTMLElement>("#sidebar-tabs button")) {
    b.classList.toggle("active", b.dataset.tab === tab);
  }
  $("#pane-files").classList.toggle("active", tab === "files");
  $("#pane-search").classList.toggle("active", tab === "search");
  $("#pane-links").classList.toggle("active", tab === "links");
  if (tab === "search") $("#search-input").focus();
  if (tab === "links") void refreshBacklinks();
}

function renderHits(container: HTMLElement, hits: api.Hit[], empty: string) {
  if (!hits.length) {
    const div = document.createElement("div");
    div.className = "hit-empty";
    div.textContent = empty;
    container.replaceChildren(div);
    return;
  }
  container.replaceChildren(
    ...hits.map((hit) => {
      const row = document.createElement("div");
      row.className = "hit-row";
      const where = document.createElement("div");
      where.className = "hit-where";
      where.textContent = `${rel(hit.path)}:${hit.line}`;
      const text = document.createElement("div");
      text.className = "hit-text";
      const before = hit.text.slice(0, hit.start);
      const mark = document.createElement("mark");
      mark.textContent = hit.text.slice(hit.start, hit.end);
      text.append(before.length > 80 ? "…" + before.slice(-80) : before, mark,
        hit.text.slice(hit.end));
      row.append(where, text);
      row.addEventListener("click", async () => {
        await openFile(hit.path);
        editor.jumpToLine(hit.line);
      });
      return row;
    }),
  );
}

async function runSearch() {
  if (!root) return;
  const query = $<HTMLInputElement>("#search-input").value;
  if (!query.trim()) {
    $("#search-results").replaceChildren();
    return;
  }
  const hits = await api.searchText(root, query);
  renderHits($("#search-results"), hits, "no matches");
}

async function refreshBacklinks() {
  if (!$("#pane-links").classList.contains("active")) return;
  if (!root || !currentPath || !isNote(currentPath)) {
    $("#backlinks-title").textContent = "no note open";
    $("#backlinks-results").replaceChildren();
    return;
  }
  const name = stem(currentPath.split("/").pop()!);
  $("#backlinks-title").textContent = `links to [[${name}]]`;
  const hits = await api.findBacklinks(root, name);
  renderHits($("#backlinks-results"), hits.filter((h) => h.path !== currentPath),
    "nothing links here yet");
}

// ---------------------------------------------------------------- daily / theme / config

async function openDaily() {
  if (!root) return;
  const dir = `${root}/${config.daily_dir}`;
  const path = `${dir}/${today()}.md`;
  try {
    await api.createDir(dir);
    await api.createFile(path);
  } catch {
    // exists — fine
  }
  await refreshTree();
  await openFile(path);
  if (!editor.text) {
    editor.replaceContent(`# ${today()}\n\n`);
    editor.jumpToLine(3);
  }
}

async function pickTheme() {
  themes = await api.listThemes();
  const current = themes.find((t) => t.id === config.theme);
  const chosen = await pick(
    themes.map((t) => ({ label: t.name, detail: t.id, value: t.id })),
    {
      placeholder: "theme…",
      onHighlight: (item) => {
        const theme = themes.find((t) => t.id === item?.value);
        if (theme) applyTheme(theme);
      },
    },
  );
  if (chosen) {
    config.theme = chosen.value;
    await api.saveConfig(config);
  } else if (current) {
    applyTheme(current);
  }
}

let configFilePath = "";
let configSaveTimer: number | undefined;

function scheduleConfigSave() {
  window.clearTimeout(configSaveTimer);
  configSaveTimer = window.setTimeout(() => void api.saveConfig(config), 400);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function bumpEditorFont(delta: number) {
  config.font_size = clamp(config.font_size + delta, 9, 40);
  setFontSize(config.font_size);
  scheduleConfigSave();
}

function bumpUiFont(delta: number) {
  config.ui_font_size = clamp(config.ui_font_size + delta, 9, 28);
  setUiFontSize(config.ui_font_size);
  scheduleConfigSave();
}

async function applyConfigFromDisk() {
  config = await api.loadConfig();
  setFontSize(config.font_size);
  setUiFontSize(config.ui_font_size);
  editor.setVim(config.vim_mode);
  $("#sidebar").style.width = `${config.sidebar_width}px`;
  themes = await api.listThemes();
  const theme = themes.find((t) => t.id === config.theme) ?? themes[0];
  if (theme) applyTheme(theme);
}

async function openConfig() {
  await api.saveConfig(config); // make sure the file exists with current values
  await openFile(configFilePath);
}

// ---------------------------------------------------------------- root folder

async function openRoot(path: string) {
  root = path;
  $("#folder-name").textContent = path.split("/").pop() ?? path;
  await refreshTree();
  await api.watchRoot(path);
  if (config.root !== path) {
    config.root = path;
    await api.saveConfig(config);
  }
  const last = localStorage.getItem("text.lastFile");
  if (last && allFiles.some((f) => f.path === last)) await openFile(last);
  else if (notes.length) await openFile(notes[0].path);
  else if (allFiles.length) await openFile(allFiles[0].path);
  else $("#welcome").style.display = "";
}

async function chooseFolder() {
  const chosen = await openDialog({ directory: true, title: "Open notes folder" });
  if (typeof chosen === "string") await openRoot(chosen);
}

// ---------------------------------------------------------------- keyboard

function onKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) {
    if (e.key === "Escape") closeModal();
    return;
  }
  const key = e.key.toLowerCase();
  const run = (fn: () => void) => {
    e.preventDefault();
    fn();
  };
  // font size: Ctrl+= / Ctrl+- for the editor, Ctrl+Shift+= / Ctrl+Shift+-
  // for the UI (sidebar, status bar); Ctrl+0 resets both. Matched on e.code
  // so they work regardless of keyboard layout and shift state.
  if (e.code === "Equal" || e.code === "Minus" || e.code === "NumpadAdd" || e.code === "NumpadSubtract") {
    const delta = e.code === "Equal" || e.code === "NumpadAdd" ? 1 : -1;
    return run(() => (e.shiftKey ? bumpUiFont(delta) : bumpEditorFont(delta)));
  }
  if (e.code === "Digit0" && !e.shiftKey) {
    return run(() => {
      bumpEditorFont(15 - config.font_size);
      bumpUiFont(13 - config.ui_font_size);
    });
  }
  if (e.shiftKey) {
    if (key === "f") return run(() => showPane("search"));
    if (key === "b") return run(() => showPane("links"));
    if (key === "t") return run(() => void pickTheme());
    return;
  }
  if (key === "p") return run(() => void quickSwitch());
  if (key === "n") return run(() => void newNote());
  if (key === "t") return run(() => void openDaily());
  if (key === ",") return run(() => void openConfig());
  if (key === "o") return run(() => void chooseFolder());
  if (key === "\\") {
    return run(() => {
      const sb = $("#sidebar");
      const hidden = sb.style.display === "none";
      sb.style.display = hidden ? "" : "none";
      $("#resizer").style.display = hidden ? "" : "none";
    });
  }
}

// ---------------------------------------------------------------- resizer

function initResizer() {
  const resizer = $("#resizer");
  const sidebar = $("#sidebar");
  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => {
      const w = Math.min(Math.max(ev.clientX, 160), 480);
      sidebar.style.width = `${w}px`;
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      config.sidebar_width = sidebar.offsetWidth;
      void api.saveConfig(config);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

// ---------------------------------------------------------------- init

async function init() {
  config = await api.loadConfig();
  const themesDir = await api.themesDirPath();
  configFilePath = themesDir.replace(/themes$/, "config.toml");

  editor = new Editor($("#editor-host"), {
    onDocChanged: () => {
      dirty = true;
      updateStatus();
      scheduleAutosave();
    },
    onStatus: updateStatus,
    onSave: () => void save(),
    getNotes: () => notes,
    openWikilink,
    resolveImage,
  });

  await applyConfigFromDisk();

  $("#btn-open-folder").addEventListener("click", () => void chooseFolder());
  $("#folder-name").addEventListener("click", () => void chooseFolder());
  $("#btn-new-note").addEventListener("click", () => void newNote());
  $("#btn-new-folder").addEventListener("click", () => void newFolder());
  $("#btn-daily").addEventListener("click", () => void openDaily());
  $("#btn-theme").addEventListener("click", () => void pickTheme());
  $("#btn-config").addEventListener("click", () => void openConfig());
  $("#btn-config").addEventListener("contextmenu", (e) => {
    e.preventDefault();
    void openPath(themesDir);
  });
  for (const b of document.querySelectorAll<HTMLElement>("#sidebar-tabs button")) {
    b.addEventListener("click", () => showPane(b.dataset.tab as never));
  }
  $<HTMLInputElement>("#search-input").addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => void runSearch(), 250);
  });
  window.addEventListener("keydown", onKeydown);
  initResizer();

  await listen<string[]>("fs:changed", (event) => void onFsChanged(event.payload));

  if (config.root) {
    try {
      await openRoot(config.root);
    } catch {
      config.root = null;
    }
  }
}

window.addEventListener("DOMContentLoaded", () => void init());
