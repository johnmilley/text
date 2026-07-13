# Modding `text`

`text` can be extended with **mods**: small TypeScript modules that add
features through a stable, typed API (`TextAPI`) without touching the editor's
internals. A mod registers commands, right-click menu items, toolbar buttons,
and startup hooks, and reaches the filesystem / renderer / network through host
services.

Four mods ship as worked examples, deliberately different in shape:

- [`src/mods/ssg`](src/mods/ssg) — an **action** mod: publishes a folder as a
  website (a local folder, or PDF). It replaced the old hard-wired "share"
  feature. A note with `slides: true` in its frontmatter publishes as a
  click-through slide deck instead of an ordinary page.
- [`src/mods/dataview`](src/mods/dataview) — an **inline content** mod: renders
  live `​```dataview` query blocks in the editor via `registerBlockRenderer`.
- [`src/mods/toc`](src/mods/toc) — the simplest: a folder right-click action
  that writes a `TOC.md`. Needs **no** new API — pure existing seams.
- [`src/mods/daily`](src/mods/daily) — daily notes + a month calendar; the mod
  that motivated `config()`, `fs.createDir/createFile`, and `ui.close`.
- [`src/mods/latex`](src/mods/latex) — a **desktop-only host service** mod: a
  right-click item on `.tex` files that shells out to the system `pdflatex`
  via `system.compileLatex` and opens the resulting PDF. Motivated the
  `ContextItemSpec.when` filter (scope alone can't say "only .tex files").
- [`src/mods/lessons`](src/mods/lessons) — seeds a bundled `lessons/` folder
  (a short in-app course) into the open root, once, via `fs.createFile` +
  `fs.writeText`; the asset files are imported with `?raw` like `ssg`'s
  templates. No new API — a pure content mod.
- [`src/mods/corkboard`](src/mods/corkboard) — a **view** mod: a
  Scrivener-style index-card board for a folder. Synopses come from (and are
  edited back into) each note's `synopsis:` frontmatter; drag-to-reorder
  persists in a hidden `.corkboard` file, never in the notes — and the
  sidebar tree adopts that order too (the host reads the same files via
  `folderOrders`). Built entirely on existing seams (`ui.info` + `fs` +
  `openNote`) — proof a whole view fits the API.

Together they exercise both kinds of extension point: discrete commands / menu
items / toolbar buttons, and content rendered into the editor.

This guide is meant for **people and coding agents**. If you are an agent: the
whole API is the `TextAPI` interface in [`src/mods/types.ts`](src/mods/types.ts);
read that file and the `ssg` mod, then follow the recipe below.

---

## How mods load

Mods are **bundled at build time**. There is no runtime plugin loader (yet — a
deliberate future phase). The single source of truth is the registry:

```ts
// src/mods/registry.ts
import { ssgMod } from "./ssg";
export const MODS: Mod[] = [ssgMod];
```

At startup `main.ts` calls each mod's `activate(app)` (early, before keybindings
are bound), passing the host-backed `TextAPI`. A mod that throws during
`activate` is logged and skipped; it never takes down the app.

## Anatomy of a mod

A mod is an object implementing `Mod`:

```ts
import type { Mod, TextAPI } from "../types";

export const helloMod: Mod = {
  id: "hello",
  name: "Hello example",
  activate(app: TextAPI) {
    app.registerCommand({
      id: "hello",
      title: "say hello",
      combo: "ctrl+shift+h",          // optional default keybinding
      run: () => app.ui.info((box) => (box.textContent = "hi!")),
    });
  },
};
```

### Recipe: add a new mod

1. Create `src/mods/<your-mod>/index.ts` exporting a `Mod`.
2. Register it in `src/mods/registry.ts` (import + add to `MODS`).
3. `npm run build` (or `npm run tauri dev`).

Keep everything the mod needs under its own folder. Import asset files (HTML
templates, CSS, JS) as strings with Vite's `?raw` suffix:

```ts
import template from "./assets/page.html?raw";
```

---

## `TextAPI` reference

The full, authoritative types are in [`src/mods/types.ts`](src/mods/types.ts).
Summary:

### Metadata
| Member | Description |
| --- | --- |
| `appVersion: string` | The app version. |
| `currentRoot(): string \| null` | The folder open in this window. |
| `config(): Config` | Read-only snapshot of app config (theme, `daily_dir`, fonts, …). |

### Registration — call these from `activate()`
| Method | What it does |
| --- | --- |
| `registerCommand({ id, title, combo?, run })` | Adds an action. With a `combo` it becomes keybindable and shows in the shortcuts list; users rebind it under `id` in `config.toml`'s `[keys]`. |
| `addContextMenuItem({ label, scope, when?, run })` | Adds a tree right-click item. `scope` is any of `"file"`, `"folder"`, `"root"` (the tree background). Optional `when(target)` narrows further (e.g. by extension) — omit to show whenever `scope` matches. `run` receives `{ scope, path }`. |
| `addToolbarButton({ id, label, title?, run })` | Adds a button to the sidebar footer. |
| `addHelpItem({ label, button?, hint?, run })` | Adds a row to the help tab of the settings panel (e.g. the lessons generator). |
| `registerBlockRenderer({ lang, render })` | Renders a fenced-code block of `lang` as a live widget below the fence. See [Block renderers](#block-renderers). |
| `onStartup(fn)` | Runs `fn` once the app has finished starting up (root opened). |

### Host services
| Member | Description |
| --- | --- |
| `fs.listTree(root)` | The sidebar's folder tree (text/image/audio/video/pdf files). |
| `fs.readText(path)` | Read a UTF-8 text file. |
| `fs.readBase64(path)` | Read any file (incl. binary) as base64. |
| `fs.writeText(path, content)` | Write text to an exact path, creating parent dirs. |
| `fs.copyFile(src, dest)` | Copy a file to an exact path, creating parent dirs. |
| `fs.createDir(path)` | Create a directory and any missing parents. |
| `fs.createFile(path)` | Create an empty file; rejects if it exists. |
| `fs.pickDirectory({ title? })` | Native folder picker → path or `null`. |
| `render.markdownToHtml(text)` | Markdown → HTML via the host renderer (see contract below). |
| `notes.collect()` | Metadata (frontmatter, tags, tasks) for every note in the open folder, cached and refreshed after fs changes. |
| `openNote(path, line?)` | Open a note in the editor, optionally jumping to a 1-based line. |
| `editor.currentNote()` | Path of the note in the focused editor pane, or `null` when media or nothing is open there. |
| `editor.insertAtCursor(text)` | Insert text at the cursor of the focused editor pane. |
| `http(input, init?)` | `window.fetch`, for network access (e.g. the GitHub API). |
| `ui.info(build)` | Open a modal; `build(box)` fills it. |
| `ui.confirm(message, okLabel?)` | Yes/no modal → boolean. |
| `ui.prompt(label, initial?)` | Single-line prompt → string or `null`. |
| `ui.close()` | Close the modal opened via info/confirm/prompt. |
| `system.compileLatex(path)` | Desktop-only: compile a `.tex` file with the system's `pdflatex` (run twice, so cross-references resolve). Resolves `{ ok, pdfPath, log }`; rejects on the web build. |

### The `render.markdownToHtml` contract

This is the same renderer the editor's live preview uses (Rust, pulldown-cmark).
It returns body-level HTML where app-specific targets are left as **placeholders
for the mod to resolve** against the folder:

| Source | Output placeholder |
| --- | --- |
| `[[note#section]]` | `<a class="wikilink" data-wikilink="note#section" href="#">…</a>` |
| `[text](dir/b.md)` (local) | `<a class="wikilink" data-path="dir/b.md" href="#">…</a>` |
| `![[pic.png\|200]]` (image) | `<img data-embed="pic.png" style="max-width:200px">` |
| `![[lecture.pdf]]` (other) | `<a class="wikilink attachment" data-path="lecture.pdf" href="#">…</a>` |
| external `http(s):` links/images | passed through unchanged |

Headings get derived `id`s (the slug of their text), so `#section` anchors land.
The `ssg` mod resolves these in the DOM — see
[`src/mods/ssg/render.ts`](src/mods/ssg/render.ts) (`resolveLinks`).

### Block renderers

`registerBlockRenderer({ lang, render })` makes a fenced-code block of language
`lang` render a **live widget below the fence** — the note's source text is
never rewritten, so it survives sync and export. The core CodeMirror plumbing
lives in [`src/blockrender.ts`](src/blockrender.ts); your `render(ctx)` only
fills an element:

```ts
app.registerBlockRenderer({
  lang: "dataview",
  render(ctx) {
    // ctx.el: container to fill   ctx.source: the block's text
    const draw = () =>
      app.notes.collect().then((notes) => {
        ctx.el.replaceChildren(/* …build from notes… */);
        ctx.requestMeasure(); // re-measure after async layout
      });
    draw();
    const unsub = ctx.onInvalidate(draw); // re-run when the folder changes
    return () => unsub();                  // optional cleanup on teardown
  },
});
```

`ctx.onInvalidate` fires (debounced) whenever the folder changes, so a renderer
can keep itself current. Return a cleanup function to release subscriptions.
See [`src/mods/dataview`](src/mods/dataview) for the full example.

The same renderers also run in the **markdown preview pane** (Ctrl+Shift+M):
each fenced block of a registered `lang` is replaced by your widget there too,
so `dataview` results (not the raw query) show up in the preview. `render(ctx)`
needs no changes; `ctx.requestMeasure()` is a no-op in the preview.

---

## Host commands (Rust)

Mod filesystem services map to these Tauri commands in
[`src-tauri/src/files.rs`](src-tauri/src/files.rs):
`read_base64`, `write_text_file`, `copy_file` (plus the pre-existing
`list_tree`, `read_file`). The markdown primitive is `render_preview` in
[`src-tauri/src/render.rs`](src-tauri/src/render.rs). If a mod needs a capability
the API doesn't expose yet, add a small, generic command there (named for the
capability, not the feature) and surface it on `TextAPI`.

## The `ssg` mod as a map

| File | Responsibility |
| --- | --- |
| `ssg/index.ts` | The `Mod`: registers the command, context item, and toolbar button. |
| `ssg/ui.ts` | The publish dialog (destination tabs + options). |
| `ssg/site.ts` | Pure path bookkeeping: gather files, compute output names, resolve links. |
| `ssg/render.ts` | Markdown → pages (resolving placeholders), nav, listings, asset bundling. |
| `ssg/sinks.ts` | Destinations: local folder, PDF (print). |
| `ssg/assets/` | Page template + site CSS + highlight.js, imported with `?raw`. |

A new "publish target" is just another function in `sinks.ts` consuming the same
`OutputFile[]` — adding one touches nothing else.

## The `dataview` mod as a map

| File | Responsibility |
| --- | --- |
| `dataview/index.ts` | The `Mod`: registers a block renderer for `lang: "dataview"`. |
| `dataview/query.ts` | Pure query parse/run + DOM rendering of results. |

The CodeMirror lifecycle it plugs into lives in core
[`src/blockrender.ts`](src/blockrender.ts) — the mod never imports CodeMirror.
