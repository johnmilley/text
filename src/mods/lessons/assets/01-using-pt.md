---
title: using pt
---

# using pt

`pt` is a local-first markdown editor: every note is a plain `.md` file on
disk (or in your Dropbox, on the mobile/web build), nothing is locked into a
database, and nothing leaves your machine unless you ask it to. This lesson
is a tour of what's here.

## the shape of the window

- **sidebar** (left by default — flip it in Settings → appearance) shows the
  folder you've opened as a tree. Click to open a note; right-click for new
  note / new folder / rename / move / delete / publish and anything mods add.
- **tabs** sit above the editor. `Ctrl+T` opens a new one, `Ctrl+W` closes the
  current one, `Ctrl+Tab` / `Ctrl+Shift+Tab` cycle. Each tab remembers its own
  scroll position, cursor, and split/preview state.
- **the editor** is a single pane by default. `Ctrl+Shift+\` splits it
  vertically, again for horizontal, again to turn the split off — the second
  pane can hold a different note, so you can read one while writing another.
- **preview** (`Ctrl+Shift+M`) renders the current note's markdown. On
  desktop it opens beside the editor by default; there's a setting to make it
  replace the editor instead (Settings → appearance), which is how it always
  behaves on a phone.

## writing and linking

Type `[[` in the editor and a fuzzy-matching autocomplete offers every note
in the folder — pick one (or type a new name) to create a link. `Ctrl+Enter`
with the cursor on a wikilink follows it; broken links render with a
different colour so they're easy to spot before publishing.

Images, audio, and PDFs embed the same way: `![[diagram.png]]`,
`![[diagram.png|400]]` to constrain the width. Drop a file onto the editor,
or paste an image straight from the clipboard, and it lands in your
configured images folder with an embed already written at the cursor.

## finding things again

| shortcut | what |
| --- | --- |
| `Ctrl+P` | quick switch — jump to any note, or type a name that doesn't exist yet to create it |
| `Ctrl+Shift+F` | search everywhere — full text, across the whole folder |
| `Ctrl+Shift+B` | backlinks — every note that links to this one |
| `Ctrl+E` | focus the file tree (arrow keys move, Enter opens, Esc returns) |

## daily notes and quick capture

`Ctrl+Shift+C` opens a month calendar over your daily notes folder (set in
Settings → files); click a date to open or create that day's note.
`Ctrl+Shift+J` is faster for a fleeting thought: it appends a timestamped
line to *today's* note without leaving whatever you're doing, then returns
focus to where you were.

## templates

A template is just a file in a `templates/` folder at the root of your
notes — no placeholder syntax, what's in the file is what you get.
`Ctrl+Shift+I` inserts one at the cursor; right-click a folder → **new file
from template** starts a fresh note from one. The picker offers to create
`templates/` with a sample the first time, so the feature explains itself.

## writing without the furniture

`Alt+Z` (or F11) is zen mode: fullscreen, chrome hidden. Turn on typewriter
scrolling in Settings → zen mode and the line you're editing stays pinned at
a fixed point on screen — upper third or dead centre, your call — instead of
crawling down the window as the note grows.

## making it yours

`Ctrl+,` opens Settings, now organized into tabs:

- **appearance** — theme, fonts, line width/margins, sidebar side, whether
  preview replaces the editor, and which icons show in the top bar.
- **editing** — vim mode, single-line-break rendering, spellcheck.
- **zen mode** — the options mentioned above.
- **files** — daily notes folder, images folder.
- **shortcuts** — every keybinding in the app, individually rebindable:
  click one, press the new combo (needs Ctrl or Alt), done. The reset arrow
  puts it back.

Prefer editing the raw file? "open config.toml" at the bottom of Settings
does exactly that — it's plain TOML, and every key is documented in a
comment block at the top.

## extending it

Everything past the core editor — publishing, the daily calendar, mermaid
diagrams, dataview queries, templates, the corkboard, LaTeX compiling, even
this lessons folder — is a **mod**: a small TypeScript module talking to a
stable `TextAPI`. See `MOD_API.md` at the root of the `text` repository if
you want to write your own; the [[06-mermaid]], [[08-dataview]], and
[[09-corkboard]] lessons are worked examples of mods in actual use.
