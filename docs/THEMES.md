# Writing your own theme

A theme is one TOML file in your themes folder. Drop a file in, and it shows
up in the theme picker (`Ctrl+Shift+T`) immediately — no rebuild, no restart
beyond reopening the picker.

## Where themes live

```
~/.config/pt/themes/        Linux
~/Library/Application Support/pt/themes/   macOS
```

Every bundled theme is written here on first run, so the folder is full of
working examples you can copy and edit. Editing a bundled file is fine — your
changes stick, and the app only re-creates a bundled file if it's missing.
"open themes folder" in the settings panel (`Ctrl+,`) jumps straight here.

## The smallest theme

```toml
name = "My Theme"     # the label shown in the picker
dark = false          # true = grouped under dark, flips UI affordances

[colors]
bg = "#faf9f6"        # editor background
fg = "#2c2c2a"        # body text
accent = "#4a6e8a"    # interactive highlights, the active line, the caret
```

Anything you leave out falls back to a sane default, so you can start with a
handful of colors and fill the rest in as you go. To start from a complete
file, copy `pt-dark.toml` (it carries the full token reference in comments)
and recolor it.

## Color tokens

| token       | what it paints                                  |
|-------------|-------------------------------------------------|
| `bg`        | editor background                               |
| `bg-panel`  | sidebar / panel background                      |
| `bg-hover`  | hovered or active rows                          |
| `fg`        | body text                                       |
| `fg-muted`  | secondary text, syntax marks, the file tree     |
| `accent`    | interactive highlights, cursor-line tint        |
| `heading`   | markdown headings                               |
| `link`      | links and `[[wikilinks]]`                       |
| `tag`       | `#tags`                                          |
| `quote`     | blockquotes                                     |
| `code`      | inline code / monospans                         |
| `code-bg`   | code-block background                           |
| `border`    | hairlines and separators                        |
| `cursor`    | the caret                                       |
| `selection` | the text selection                              |

Colors are any CSS color string — `#rrggbb`, `#rgb`, `rgb(...)`, or a named
color. Everything in the app (editor *and* chrome) is themed through this one
token set, so a single file restyles the whole window.

### Picking `dark`

`dark = true` / `dark = false` does two things: it groups the theme under the
right heading in the picker (type "light" or "dark" to filter), and it tells
the app which built-in affordances (scrollbars, shadows, the transparency
checkerboard) to lean light or dark. Set it to match your `bg`.

## Fonts (optional)

```toml
[fonts]
editor = "ui-monospace, 'JetBrains Mono', monospace"
ui = "system-ui, sans-serif"
```

`editor` sets the editor typeface; `ui` sets the sidebar and dialogs. Omit the
table to inherit the app defaults. The curated editor fonts listed in the
README ship inside the app, so naming one always works; any locally installed
family works too.

> The editor-font picker (`Ctrl+Shift+E`) and the `editor_font` config key
> override a theme's `editor` font per your preference, so a theme's font is a
> suggestion, not a lock-in.

## The CSS escape hatch

For anything the tokens don't reach, drop a `<name>.css` file next to the
`<name>.toml` (same stem). It's injected verbatim whenever the theme is
active. Use it sparingly — token changes are portable across app updates,
hand-written CSS may not be.

```css
/* my-theme.css — paired with my-theme.toml */
.cm-editor .cm-content { letter-spacing: 0.01em; }
```

## Sharing a theme

A theme is just its `.toml` (plus an optional `.css`). Send those file(s) to
someone and they drop them in their themes folder. That's the whole install.
