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

## Development

Prerequisites: Rust, Node, and on Linux the Tauri system libraries
(Fedora: `webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel
librsvg2-devel dbus-devel`).

```sh
npm install
npm run tauri dev      # run
npm run tauri build    # bundle (.deb/.rpm/.AppImage; .dmg/.msi on those hosts)
```
