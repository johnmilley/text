# text

A plain editor for a folder of plain files.

`text` points at a directory of notes — typically inside Dropbox — and stays
out of the way: a file tree, one buffer, markdown shown as source with
typographic styling, and search that covers the whole folder. No database,
no vault format; the folder is the whole truth.

Built with Tauri 2 (Rust) and CodeMirror 6.

## Folder behavior (Dropbox-friendly)

- Saves are atomic (temp file + rename), so a sync never sees a half-written note.
- External changes are watched; a clean buffer reloads silently.
- If a file changes on disk *and* in the editor, you choose: keep mine / take theirs.
- Dropbox `(conflicted copy)` files are flagged ⚠ in the tree.
- Notes autosave ~1s after you stop typing; `Ctrl+S` saves immediately.
- Problems (save conflicts, failed operations) surface in a status bar at
  the bottom of the editor; it stays hidden when everything is fine.

## Keys

| Key | Action |
| --- | --- |
| `Ctrl+P` | quick switcher (type a new name + Enter to create) |
| `Ctrl+N` | new note |
| `Ctrl+T` | today's daily note (`daily/YYYY/MM/YYYY-MM-DD.md`) |
| `Ctrl+S` | save now |
| `Ctrl+F` | find in file |
| `Ctrl+Shift+F` | search the whole folder |
| `Ctrl+Shift+B` | backlinks to the open note |
| `Ctrl+Shift+T` | theme picker (live preview) |
| `Ctrl+Shift+E` | editor font picker (live preview) |
| `Ctrl+Shift+S` | share the notes folder as a website |
| `Ctrl+B` / `Ctrl+I` | bold / italic |
| `Ctrl+Shift+X` | strikethrough |
| `Ctrl+1` … `Ctrl+6` | heading level (same level again clears it) |
| `Ctrl+K` | markdown link from the selection (selected URL → cursor in the text slot) |
| `Ctrl+Enter` or `Ctrl+Click` | follow `[[wikilink]]` (creates the note if missing) |
| `Ctrl+Click` on a URL | open it in the default browser |
| `Alt+←` / `Alt+→` | back / forward through previously opened files (per tab) |
| `Ctrl+Shift+N` | new tab (middle-click or Ctrl+click a file does the same) |
| `Ctrl+W` | close tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | next / previous tab |
| `Ctrl+Alt+N` | new window |
| `Ctrl+=` / `Ctrl+-` | editor font bigger / smaller |
| `Ctrl+Shift+=` / `Ctrl+Shift+-` | UI font (sidebar, dialogs) bigger / smaller |
| `Ctrl+0` | reset both font sizes |
| `Ctrl+,` | open `config.toml` in the editor |
| `Ctrl+O` | open a different folder |
| `Ctrl+Shift+O` | switch between recently opened folders |
| `Ctrl+/` | keyboard shortcut reference (also the `keys` button) |
| `Ctrl+\` | toggle sidebar |

Typing `[[` autocompletes against every note in the folder. Markdown is
parsed as GFM: tables, strikethrough, and task lists — clicking a `[ ]`
toggles it.

The app-level shortcuts (first block of `Ctrl+/`) are rebindable in the
`[keys]` section of config.toml; the file documents the format. Editor
formatting and font-size keys are fixed.

## Tabs and windows

Files open in tabs. Each tab keeps its own back/forward history and, when
backgrounded, its full editor state — cursor, scroll position, and undo
history survive switching away and back (unless the file changed on disk
meanwhile, in which case it reloads). Open a file in a new tab with
middle-click, Ctrl+click, or right-click → *open in new tab*; drag tabs to
reorder. The main window's tabs are restored on the next launch.

Drag a tab and drop it outside the window to detach it into its own window
(also: right-click the tab → *move to new window*). Windows are independent —
they can even show different folders — and edits sync between them through
the file watcher, with the usual conflict prompt if the same file is edited
in two places at once. Closing the last tab closes a spawned window; the
main window just shows an empty tab.

## Files beyond markdown

- **Images** (png/jpg/gif/webp/…) show in the tree, open in a viewer, and
  `![[image.png]]` / `![alt](path)` render inline in notes. Drag an image
  file onto a note to copy it into the folder and embed it; paste a
  screenshot from the clipboard and it's saved as `pasted-<date>.png`.
  Where copies land is set by `image_dir` (default: the folder root).
  The viewer's toolbar rotates and scales (aspect kept), then saves a copy
  or overwrites the original (overwrite for png/jpg only).
- **Audio** (mp3/wav/ogg/m4a/flac/opus/…) opens in a built-in player.
- **CSV/TSV** open as a read-only table (the "edit as text" button in the
  top-right corner toggles back to the raw file).
- **PDFs** open in a built-in viewer with zoom and lazy page rendering; the
  text is selectable, so you can copy a passage straight into a note.
  "open externally" hands the file to the system viewer.

In the tree: drag files or folders to move them, right-click for
rename / copy / paste / duplicate / reveal in file manager / delete
(copies that would collide get " copy" appended), ⊟ collapses all folders,
↕ cycles the sort (a–z · z–a · newest first; inside the daily folder,
date-named entries always show latest first). Clicking the folder name
switches between recently opened folders. Pasting a URL over selected
text turns it into a markdown link.

## Sharing (GitHub Pages)

The **share** button in the sidebar footer (or `Ctrl+Shift+S`) publishes the
whole notes folder as a static website; right-click any folder → **share…**
to publish just that part. The site is rendered markdown with working
wikilinks and embeds, syntax-highlighted code files, and downloadable
attachments (pdf/zip/anything), in a clean light/dark design with a toggle.
Nothing is shared unless you do this; each share lives at an unguessable URL
under
`https://<you>.github.io/text-shares/<slug>/` — public to anyone holding
the link, so don't share secrets.

The dialog offers expiry (1 day / week / month / never; expired links are
taken down automatically on launch), **update** (re-publish the folder's
current contents — "already up to date" when nothing changed), **copy
link**, and **destroy link**. Requires `git` and a signed-in GitHub CLI
(`gh auth login`); the `text-shares` repo is created on first share.
Renaming a shared folder orphans its share — the dialog lists orphans so
you can destroy them.

## Configuration

`~/.config/text/config.toml` — editable in-app with `Ctrl+,`; changes apply
when you save the file. The file carries a comment header documenting every
field.

```toml
theme = "text-dark"   # a file stem from the themes folder
font_size = 15        # editor text (Ctrl+= / Ctrl+-)
ui_font_size = 13     # sidebar, dialogs (Ctrl+Shift+= / Ctrl+Shift+-)
editor_font = ""      # editor font stack; "" follows the theme
                      # (Ctrl+Shift+E opens a curated picker)
vim_mode = false      # modal editing via codemirror-vim
daily_dir = "daily"   # daily notes folder, relative to the notes root
image_dir = ""        # where dropped/pasted images land, relative to the
                      # notes root ("" = the root itself)

[keys]                # rebind app shortcuts: modifiers + key
search = "ctrl+shift+f"
daily_note = "ctrl+t"
# … the default config lists all eighteen actions
```

## Themes

Themes live in `~/.config/text/themes/`, one TOML file each (the built-in
themes are written there on first run — edit them freely). Copy any file,
change the colors, and it appears in the picker. An optional `<name>.css`
beside the TOML is injected verbatim for anything the tokens don't cover.
The token reference is documented at the top of `text-dark.toml`.

Built-in: Text Dark · Text Light · Night Owl · Monokai Calm · Rosewater ·
Fjord · Solarized Light · Solarized Dark · Sepia · Nord · Everforest ·
Zenburn · Catppuccin (Latte · Frappé · Macchiato · Mocha) · Dracula ·
Gruvbox · GitHub Light · Tokyo Night · Oceanic Next · Ayu Mirage ·
Cobalt 2 · Midnight · Dawn · Classic Paper · Dark Academia · iA Writer ·
Terminal Amber · Cyberpunk Green.

## Installing

`npm run tauri build` drops packages in `src-tauri/target/release/bundle/`:

```sh
sudo dnf install ./src-tauri/target/release/bundle/rpm/text-0.1.0-1.x86_64.rpm   # Fedora
sudo apt install ./src-tauri/target/release/bundle/deb/text_0.1.0_amd64.deb     # Debian/Ubuntu
# or run the AppImage anywhere (no install, ~100MB — bundles its own WebKit)
```

Installs as `text` (app menu and terminal). On Wayland the binary disables
WebKitGTK's DMA-BUF renderer itself (it crashes with "Error 71" on some
compositor/driver combos) — set `WEBKIT_DISABLE_DMABUF_RENDERER=0` to override.

## Code map

```
src-tauri/src/      Rust backend (one module per concern)
  files.rs          tree walk, read, atomic write + conflict detection, trash
  search.rs         folder-wide grep + backlink scan
  watch.rs          notify watcher (one per root) → debounced "fs:changed" events
  windows.rs        extra app windows (new window / detached tabs)
  themes.rs         TOML theme loading; seeds bundled themes on first run
  config.rs         ~/.config/text/config.toml (incl. [keys] rebinding)
  export.rs         folder → static HTML site (markdown, code pages, nav)
  share.rs          share registry + git/gh publishing to GitHub Pages
src-tauri/templates/share/   page template, site CSS, vendored highlight.js
src-tauri/themes/   bundled theme files (embedded at compile time)
src/                frontend (vanilla TS, no framework)
  main.ts           app shell: tree, tabs, panes, save/conflict flow, shortcuts
  editor.ts         CodeMirror 6 setup, language switching, vim compartment
  mdstyle.ts        markdown line/inline styling, wikilinks, tags, frontmatter
  images.ts         image/audio loading (base64), inline image embeds
  pdf.ts            in-app PDF viewer (pdf.js, lazy-loaded, selectable text)
  share.ts          the share dialog (create/update/destroy links)
  theme.ts          theme tokens → CSS custom properties
  modal.ts          picker / prompt / confirm dialogs
  fuzzy.ts          subsequence scoring for the switcher
```

Everything is themed through CSS variables; the editor and UI share one
token set, so a theme TOML restyles both.

## Development

Prerequisites: Rust, Node, and on Linux the Tauri system libraries
(Fedora: `webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel
librsvg2-devel dbus-devel`).

```sh
npm install
npm run tauri dev      # run
npm run tauri build    # bundle (.deb/.rpm/.AppImage; .dmg/.msi on those hosts)
```

The AppImage step needs `NO_STRIP=true npm run tauri build -- --bundles appimage`
on recent Fedora — linuxdeploy's bundled `strip` can't read modern `.relr.dyn`
sections. The deb/rpm bundles are unaffected.
