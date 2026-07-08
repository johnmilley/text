# text

A markdown editor that points at a folder of plain files and gets out of the
way. Desktop app (Tauri 2: Rust backend, CodeMirror 6 frontend, no framework)
and a web/PWA build of the same frontend backed by Dropbox.

**This app — and this README — were written by an LLM.** If you're new to
that: a large language model is a neural network trained on a huge amount of
text to predict what comes next; trained further to follow instructions, it
can plan, write, and debug software. This project was built by giving one
(Claude, made by Anthropic) a terminal — it wrote the Rust and TypeScript,
ran the builds, and fixed its own bugs, with a human directing and reviewing.

## Installing

**Desktop** — grab an installer from
[Releases](https://github.com/johnmilley/text/releases):
`.rpm` / `.deb` / `.AppImage` (Linux), `.dmg` (macOS), `.msi` (Windows).
On first run, point it at a folder — your notes are ordinary `.md` files in
ordinary directories, nothing is imported or locked in. On macOS, `Cmd`
plays the `Ctrl` role in every shortcut.

**Web / phone** — <https://johnmilley.github.io/text/> is the same editor in
a browser, storing notes in your Dropbox (OAuth, static files, no server —
threat model in [docs/SECURITY.md](docs/SECURITY.md)). Add it to your home
screen for an installable PWA with a quick-capture shortcut; phones get a
single-pane layout with an edit/preview toggle and a markdown key row above
the on-screen keyboard.

**From source** — Rust + Node, plus on Linux the Tauri system libraries
(Fedora: `webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel
librsvg2-devel dbus-devel`):

```sh
npm install
npm run tauri dev      # run
npm run tauri build    # installers land in src-tauri/target/release/bundle/
```

From a terminal: `text` reopens the last session, `text notes.md` opens (or
creates) that file, `text ~/dir` opens that folder. On Wayland the binary
disables WebKitGTK's DMA-BUF renderer (crashes on some compositor/driver
combos); `WEBKIT_DISABLE_DMABUF_RENDERER=0` overrides.

## Features

- **Editing** — GFM markdown with live styling: tables (Tab/Enter navigate
  cells and auto-format the pipes), clickable task lists, foldable headings,
  `[[wikilinks]]` with autocomplete across the folder (Ctrl+Enter or
  Ctrl+Click follows, creating the note if missing), Mermaid diagrams
  rendered in place, optional vim mode. `Ctrl+Shift+M` opens a rendered
  preview beside the editor.
- **Daily notes** — a calendar (`Ctrl+Shift+C`) marks and opens daily notes
  (`daily/YYYY/MM/YYYY-MM-DD.md`) and shows "on this day" entries from past
  years. Quick capture (`Ctrl+Shift+J`, or the pencil in the top bar)
  appends a timestamped line to today's note from anywhere.
- **Search** — `Ctrl+P` fuzzy-switches files (type a new name to create),
  `Ctrl+Shift+F` greps the folder, `Ctrl+Shift+B` lists backlinks to the
  open note.
- **Dataview** — a ` ```dataview ` block renders a live list/table/task
  roll-up of your notes (a subset of the Obsidian plugin):
  [docs/DATAVIEW.md](docs/DATAVIEW.md).
- **Export** — `Ctrl+Shift+S` turns the folder (or one note) into a
  textbook-style document: standalone HTML with the folder tree as a table
  of contents, or PDF via the print dialog. Wikilinks, embeds, and Mermaid
  diagrams survive the trip ([docs/EXPORT_STYLE.md](docs/EXPORT_STYLE.md)).
- **Tabs, splits, windows** — each tab keeps its own history, cursor, and
  undo; `Ctrl+Shift+\` splits the editor; drag a tab out of the window to
  detach it. Windows are independent (even different folders) and sync
  through the file watcher.
- **Beyond markdown** — images view inline and in a viewer (rotate, zoom,
  pan; paste a screenshot and it's saved and embedded), audio plays in-app,
  CSV/TSV render as tables, PDFs open in a viewer with selectable text.
- **Sync-safe** — writes are atomic (temp file + rename), external changes
  reload clean buffers silently, and a file edited both on disk and in the
  editor prompts keep-mine/take-theirs. Dropbox `(conflicted copy)` files
  are flagged in the tree. Autosave ~1s after you stop typing.
- **Themes** — 30+ built-in, one TOML file each in `~/.config/text/themes/`;
  copy one and edit it, or add a `.css` beside it for anything the tokens
  miss ([docs/THEMES.md](docs/THEMES.md)). A dozen curated editor fonts
  (all SIL OFL) ship inside the app.
- **Mods** — export, dataview, daily notes, and TOC generation aren't built
  in; they're mods under `src/mods/`, written against a small JS API
  (commands, toolbar buttons, block renderers, filesystem access). Write
  your own: [MOD_API.md](MOD_API.md).

## Configuration

`Ctrl+,` opens settings: theme and font with live preview, sizes, margins,
line width, vim mode, daily/image folders, and every shortcut (click a
binding, press new keys). It persists to `~/.config/text/config.toml`,
which stays hand-editable and documents every field in its comment header.

## Shortcuts

`Ctrl+/` shows this list in-app; the app-level block is rebindable in
settings or `[keys]` in config.toml.

| Key | Action |
| --- | --- |
| `Ctrl+P` | quick switcher (type a new name + Enter to create) |
| `Ctrl+N` | new note |
| `Ctrl+Shift+J` | quick capture into today's daily note |
| `Ctrl+Shift+C` | calendar |
| `Ctrl+S` | save now (autosave runs anyway) |
| `Ctrl+F` / `Ctrl+Shift+F` | find in file / search the folder |
| `Ctrl+Shift+B` | backlinks to the open note |
| `Ctrl+Shift+M` | rendered preview beside the editor |
| `Ctrl+Shift+S` | export the folder (HTML / PDF) |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+Shift+X` | bold / italic / strikethrough |
| `Ctrl+1` … `Ctrl+6` | heading level (again clears it) |
| `Ctrl+K` | markdown link from the selection |
| `Ctrl+Enter` or `Ctrl+Click` | follow `[[wikilink]]` (creates if missing) |
| `Alt+←` / `Alt+→` | back / forward through opened files (per tab) |
| `Ctrl+T` / `Ctrl+W` | new / close tab (middle-click a file opens a tab) |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | next / previous tab |
| `Ctrl+Shift+N` | new window |
| `Ctrl+Shift+\` | split editor (vertical → horizontal → off) |
| `Alt+Z` or `F11` | zen mode: fullscreen, centered column, typewriter scroll |
| `Ctrl+E` | focus the file tree |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | editor font size (`+Shift` for UI font; `0` resets) |
| `Ctrl+Shift+T` / `Ctrl+Shift+E` | theme / editor font picker (live preview) |
| `Ctrl+,` | settings |
| `Ctrl+O` / `Ctrl+Shift+O` | open a folder / switch recent folders |
| `Ctrl+/` | shortcut reference |
| `Ctrl+\` | toggle sidebar |

## Code map

```
src-tauri/src/     Rust backend: files.rs (atomic writes, conflicts),
                   search.rs, watch.rs, windows.rs, themes.rs, config.rs,
                   render.rs (markdown → HTML)
src/               frontend (vanilla TS): main.ts (app shell), editor.ts
                   (CodeMirror 6), tables.ts, settings.ts, mdstyle.ts,
                   pdf.ts, theme.ts, dropbox/ (web backend)
src/mods/          the extension system + reference mods
                   (ssg, dataview, daily, toc) — see MOD_API.md
```

MIT licensed.
