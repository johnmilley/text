---
title: presentation lesson
---

# writing a presentation

One frontmatter key turns any note into a slide deck when it's published:

```
---
slides: true
---
```

Every `---` after that point becomes a slide break instead of just a
horizontal rule. Right-click the note → **publish…** → **local folder**,
and the published page ships an actual click-through deck: arrow keys or
space to advance, click the left/right half of the slide, swipe on a
phone, `f` for fullscreen, a progress bar along the top. Nothing changes in
the editor itself — the deck only exists in the published output, so
writing and editing stay exactly like editing any other note.

## structure: one idea per section, `---` between them

```
---
slides: true
---

# my talk

## why this matters

one sentence. maybe a second.

---

## the numbers

| before | after |
| --- | --- |
| slow  | fast  |

---

## what to do next

- ship it
- tell people
```

That's the whole recipe. Keep each section to roughly what you'd say in the
time it takes to read it — one idea per slide, headings doing the work
titles do on a real slide. Images, tables, code blocks, mermaid diagrams —
anything a note can hold, a slide can hold.

## publishing it

- **local folder** → a real slide deck, as described above.
- **PDF** → every `---` still becomes a page break (this works whether or
  not `slides: true` is set), so you get one section per printed page —
  useful as a handout, or for presenting straight from a PDF reader's own
  fullscreen mode if you'd rather not rely on the browser.

## presenting live

Two ways, depending on the room:

1. **Publish, then open the page** and go fullscreen (`f`) — the deck
   handles everything: navigation, progress, no dependency on `text` itself
   once it's published.
2. **Zen mode** (`Alt+Z`) on the source note, scrolling section by
   section — no export step, good for an informal walkthrough where people
   are looking at your screen rather than a projected deck.

## try it

Add `slides: true` to a short note with a couple of `---` breaks, publish
it locally, and open the result. Resize the window, try it on a phone,
press `f`. The whole feature is under 100 lines of vanilla JS
(`src/mods/ssg/assets/slides.js` in the `text` repository) if you're
curious how little it takes.
