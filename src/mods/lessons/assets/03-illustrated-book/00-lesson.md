---
title: illustrated chapter book — structure
---

# building a short illustrated chapter book

This folder is a worked example, not just an explanation: three short
chapters of a classic fable sit alongside this lesson, each with a small
illustration. Read the chapters first — [[01-the-hare-boasts]],
[[02-the-race]], [[03-the-moral]] — then come back here for how it's put
together.

## the structure

```
03-illustrated-book/
  00-lesson.md              ← you are here (not part of the book itself)
  01-the-hare-boasts.md
  02-the-race.md
  03-the-moral.md
```

A few deliberate choices worth copying for a book of your own:

- **numeric prefixes.** `pt`'s file tree sorts alphabetically, so `01-`,
  `02-`, `03-` keeps chapters in reading order without any extra tooling.
  Rename `04-the-next-one.md` in later and it slots in correctly.
- **one chapter per file.** Short files are easier to edit, easier to
  reorder, and — if you outgrow markdown for this — easier to move into a
  different tool later. A "book" is just a folder of chapters plus a
  convention for order, not a special document type.
- **frontmatter for metadata.** Each chapter opens with:

  ```
  ---
  title: the hare boasts
  chapter: 1
  ---
  ```

  Nothing in `pt` requires this, but it's picked up by the `dataview` mod
  if you want a query block elsewhere that lists chapters in order — see
  [[02-markdown-lesson]] for where dataview blocks are introduced.

## illustrations without external files

Each chapter embeds a small hand-drawn illustration as inline SVG, directly
in the markdown:

```html
<svg width="200" height="120" viewBox="0 0 200 120">
  <ellipse cx="100" cy="80" rx="70" ry="24" fill="none" stroke="currentColor" stroke-width="2"/>
</svg>
```

This works because `pt`'s renderer passes raw HTML straight through —
useful for anything markdown itself can't express. It also means the
illustration lives *in the note*, with no image file to lose, rename, or
forget to bundle when you copy the chapter elsewhere. `currentColor` picks
up the surrounding text colour, so the drawings stay legible in every theme,
light or dark.

For a real project you'd more likely embed actual image files —
`![[cover.png]]` — kept in an `images/` subfolder beside the chapters
(configurable in Settings → files). Inline SVG is the right tool
specifically when the "illustration" is simple enough to describe as a few
shapes, and you want zero extra files.

## a table of contents

Right-click this folder (or its parent) and look for **write TOC.md** — the
`toc` mod, one of the simplest mods there is, writes a `TOC.md` linking
every note in the folder in tree order. For a book, that gives you a
one-click, always-current table of contents.

## publishing it

Right-click the `03-illustrated-book` folder → **publish…**. Choose:

- **local folder** for a small website — one page per chapter, with
  navigation between them, exactly as read here.
- **PDF** to get the whole thing as a single print-ready document — the
  closest thing to an actual book file. Line width and margins (Settings →
  appearance) affect how it wraps, so it's worth tuning those first for a
  page rather than a screen.

That's the whole recipe: numbered chapter files, frontmatter if you want
queryable metadata, inline SVG or embedded images for illustration, `toc`
for navigation, `publish` for output. Nothing here is special-cased for
"book" — it's the same folder-of-notes model `pt` uses everywhere else.
