# Export style guide

How published HTML and PDF exports look, why, and how to restyle them.
(App themes are a different surface — see THEMES.md. This document covers
only what `publish…` produces.)

## The design

Textbook rules, applied without decoration:

- **One column of serif text** at a 65-character measure, centered. Nothing
  competes with the content — there is no sidebar.
- **The exported tree is the table of contents.** The site root is a
  contents page mirroring your folder nesting; every folder gets a contents
  page of its own subtree (unless a `README`/`index` note claims it).
- **Every page knows where it is.** The running head is a breadcrumb —
  `contents › folder › page` — and its first crumb always returns to the
  ToC. The foot of every page links the previous and next page along the
  reading order.
- **Reading order** is the ToC top-to-bottom: notes in a folder first, then
  its subfolders, both alphabetical (date-named files newest-first, same as
  the app sidebar). Number your files (`01 intro.md`, `02 limits.md`) to
  order chapters explicitly.
- **The PDF is the same book**: title page, linked contents, then every page
  in the same reading order, one section per page break, printed through the
  same stylesheet.

## Restyling an export

Put an `_export.css` file in the folder you publish. It is loaded after the
built-in stylesheet on every page (and inlined into PDFs), so anything you
declare wins. The built-in sheet keeps every design decision in a CSS token,
so most restyles are a few lines:

```css
/* _export.css */
:root {
  --paper: #fbf8f2;              /* warm page background */
  --accent: #7a1f1f;             /* links in the school color */
  --font-text: "Palatino", serif;
  --measure: 70ch;               /* a wider column */
}
```

### Tokens

| token | default | what it controls |
|---|---|---|
| `--paper` | `#ffffff` | page background |
| `--ink` | `#1c2024` | body text color |
| `--muted` | `#5b6470` | breadcrumbs, captions, prev/next labels |
| `--accent` | `#17569b` | links (used nowhere else) |
| `--rule` | `#d8dbdf` | hairlines: heading rules, table borders |
| `--code-bg` | `#f4f5f6` | code block / inline code background |
| `--image-bg` | `transparent` | matte painted behind every image |
| `--image-pad` | `0px` | padding inside that matte |
| `--font-text` | Charter/Georgia stack | body font |
| `--font-heading` | `var(--font-text)` | heading font |
| `--font-mono` | ui-monospace stack | code font |
| `--text-size` | `18px` | base size (print uses 11pt regardless) |
| `--line-height` | `1.65` | leading |
| `--measure` | `65ch` | column width |
| `--hl-*` | (github-ish) | code highlighting colors |

### Dark mode

Readers get light by default, dark if their system asks for it, and a ◐
toggle to override. To retune the dark palette, scope overrides both ways:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --paper: #101418; }
}
:root[data-theme="dark"] { --paper: #101418; }
```

### Image mattes

Transparent PNGs (plots, diagrams, dark-mode screenshots) can become
unreadable on the "wrong" background. Give every image a white matte:

```css
:root { --image-bg: #fff; --image-pad: 8px; }
```

or only in dark mode, using the block above. To matte a single image
instead, wrap it in a div in your note and target it from `_export.css`.

### Print / PDF

The `@media print` block in the built-in sheet forces black-on-white and
strips navigation; `_export.css` can extend it the same way:

```css
@media print {
  article { font-size: 10pt; }        /* denser handout */
  .pdf-title { padding-top: 20vh; }   /* higher title */
}
```

## What ships in an export

```
index.html            the contents page (contents.html if a root README
                      claimed index.html — the breadcrumb still finds it)
<folder>/index.html   per-folder contents (or the folder's README note)
<note>.html           one page per note
_assets/style.css     the built-in sheet (do not edit — override instead)
_assets/custom.css    your _export.css, verbatim (empty if none)
_assets/highlight.*   code highlighting
```

Assets referenced by notes are copied alongside, keeping the folder
structure. Wikilinks resolve exactly as in the editor; links to notes that
weren't exported render as dashed non-links rather than dead links.

Single-note publish ("publish…" on one note) emits just that page and the
assets it references, with the navigation chrome omitted.
