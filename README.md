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

## Keys

| Key | Action |
| --- | --- |
| `Ctrl+P` | quick switcher (type a new name + Enter to create) |
| `Ctrl+N` | new note |
| `Ctrl+T` | today's daily note (`daily/YYYY-MM-DD.md`) |
| `Ctrl+S` | save now |
| `Ctrl+F` | find in file |
| `Ctrl+Shift+F` | search the whole folder |
| `Ctrl+Shift+B` | backlinks to the open note |
| `Ctrl+Shift+T` | theme picker (live preview) |
| `Ctrl+B` / `Ctrl+I` | bold / italic |
| `Ctrl+Enter` or `Ctrl+Click` | follow `[[wikilink]]` (creates the note if missing) |
| `Ctrl+,` | open `config.toml` in the editor |
| `Ctrl+O` | open a different folder |
| `Ctrl+\` | toggle sidebar |

Typing `[[` autocompletes against every note in the folder.

## Configuration

`~/.config/text/config.toml` — editable in-app with `Ctrl+,`; changes apply
when you save the file.

```toml
theme = "text-dark"   # a file stem from the themes folder
font_size = 15
vim_mode = false      # modal editing via codemirror-vim
daily_dir = "daily"   # daily notes folder, relative to the notes root
```

## Themes

Themes live in `~/.config/text/themes/`, one TOML file each (the six built-in
themes are written there on first run — edit them freely). Copy any file,
change the colors, and it appears in the picker. An optional `<name>.css`
beside the TOML is injected verbatim for anything the tokens don't cover.
The token reference is documented at the top of `text-dark.toml`.

Built-in: Text Dark · Text Light · Night Owl · Monokai Calm · Rosewater · Fjord.

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
  watch.rs          notify watcher → debounced "fs:changed" events
  themes.rs         TOML theme loading; seeds bundled themes on first run
  config.rs         ~/.config/text/config.toml
src-tauri/themes/   the six bundled theme files (embedded at compile time)
src/                frontend (vanilla TS, no framework)
  main.ts           app shell: tree, panes, save/conflict flow, shortcuts
  editor.ts         CodeMirror 6 setup, language switching, vim compartment
  mdstyle.ts        markdown line/inline styling, wikilinks, tags, frontmatter
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
