---
title: markdown lesson
---

# markdown, interactively

Open preview now — `Ctrl+Shift+M` — and put it beside this note. Everything
below is meant to be edited, not just read: change a line, watch the
rendered side update a moment later. (There's also a full syntax reference
under Settings → "markdown reference", if you want every detail in one
place. This note is the shorter, hands-on version.)

## 1. paragraphs and emphasis

A blank line separates paragraphs. Within one, `*this*` becomes *this*,
`**this**` becomes **this**, and `~~this~~` becomes ~~this~~ (strikethrough
needs Ctrl+Shift+X selected first, or just type the tildes by hand).
`==this==` becomes ==this== — a highlight, like running a marker pen over
the words (on a phone, it's the marker key on the keyboard bar).

> Try it: put your cursor in the word "interactively" in the title above,
> press `Ctrl+B`. `pt` wraps the whole word for you without needing a
> selection.

## 2. headings

`#` through `######` for six heading levels — `Ctrl+1` through `Ctrl+6` set
the current line's heading level directly, toggling it off if it's already
that level. Headings fold: hover the gutter next to one and click the
chevron to collapse everything under it.

## 3. lists

```
- an unordered item
- another
  - nested one level in

1. an ordered item
2. the next one (renumbers itself if you insert above it)
```

Task lists are the same, prefixed `- [ ]`:

- [ ] an open task
- [x] a done one — click the checkbox in preview, or in the editor itself

## 4. links

Two kinds. An external link: `[text](https://example.com)`. A link to
another note in this folder: `[[note name]]`, or `[[note name#a heading]]` to
land on a specific section. Type `[[` right now on a blank line below this
paragraph and watch the autocomplete offer every note in `lessons/`.

## 5. code

Inline: `` `code` ``. A fenced block gets syntax highlighting from the
language you name after the three backticks:

```python
def greet(name):
    return f"hello, {name}"
```

Some languages render as *more* than highlighted text — a fenced
` ```mermaid ` block becomes a live diagram, ` ```dataview ` becomes a live
query result. See [[06-mermaid]] for the former.

## 6. tables

```
| left | center | right |
| :--- | :----: | ----: |
| a    |   b    |     c |
```

renders as:

| left | center | right |
| :--- | :----: | ----: |
| a    |   b    |     c |

Tab and Shift+Tab hop between cells while editing one; Enter adds a row.

## 7. footnotes

A claim needing a source can carry one[^1] without breaking the sentence up.

[^1]: Definitions go wherever's convenient — usually the bottom of the note,
    like this one. See [[04-academic-book]] for a longer worked example with
    a full bibliography.

## 8. images and embeds

`![alt text](path/to/image.png)` for a normal markdown image, or
`![[image.png]]` / `![[image.png|300]]` (the second constrains width) to
embed a file from this folder by name — the same syntax wikilinks use,
extended to non-note files. `![[some.pdf]]` embeds a link to a PDF rather
than trying to inline it.

## try it yourself

Turn this into a short note of your own below the line — a paragraph, a
list, one link, one piece of code. Watch the preview the whole time; that
feedback loop *is* the lesson.

---
