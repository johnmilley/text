---
title: dataview
kind: lesson
status: unread
---

# dataview — your notes as a database

A fenced code block whose language is `dataview` runs a live query over
every note in the open folder and renders the results below the fence — in
the editor and in preview. The block's source text is never rewritten, so a
query survives sync, publishing, and other editors: they just see a small
code block.

Three query shapes. Every block below is live right now, in this note.

## LIST — which notes?

```dataview
LIST FROM "lessons"
```

`FROM "folder"` scopes a query to a folder (subfolders included); `FROM
#tag` scopes it to a tag — inline `#tags` and frontmatter `tags:` both
count. Combine them (`FROM "projects" #draft` means both), or drop `FROM`
entirely to query every note in the open folder.

## TABLE — frontmatter as columns

Any flat `key: value` line in a note's frontmatter is a **field** you can
show, filter, and sort by. This note's own frontmatter says `kind: lesson`
and `status: unread`, so it shows up below; notes without a field show a
blank cell:

```dataview
TABLE status FROM "lessons" WHERE kind = lesson
```

Change `status: unread` at the top of this file to `status: done` and watch
the table follow.

## TASK — every open checkbox

```dataview
TASK FROM "lessons"
```

That gathers the unticked `- [ ]` items from every note in this folder —
including the two below and the sample ones in [[02-markdown-lesson]].
Tick one and it drops out of the results.

- [ ] edit this task's text and watch the query above follow
- [ ] add a `- [ ]` of your own in any lesson

## sharpening a query

After the `FROM`, in this order (each part optional):

| clause  | example                                      | notes                                                |
| ------- | -------------------------------------------- | ---------------------------------------------------- |
| `WHERE` | `WHERE status != done AND due <= 2026-08-01` | ops: `=` `!=` `>` `<` `>=` `<=` `contains`; chain with `AND` |
| `SORT`  | `SORT due` or `SORT mtime DESC`              | notes missing the field sort last                    |
| `LIMIT` | `LIMIT 5`                                    | cap the result count                                 |

Three fields exist for every note without any frontmatter: `name` (the file
name), `mtime` (last edited, as a YYYY-MM-DD date), and `path`.

## ways to actually use it

- **a reading list that maintains itself** — give each book note `author:`
  and `status:` frontmatter, then keep
  `TABLE author, status FROM #book WHERE status != finished` at the top of
  a `reading.md`.
- **one inbox for scattered TODOs** — `TASK FROM "daily"` in a `todo.md`
  pulls every unticked checkbox out of your daily notes.
- **a chapter status board** — chapters carry `status: outline`, `draft`,
  or `revised`; the book's index note shows
  `TABLE status FROM "book" SORT status`.
- **"what was I just working on?"** — `LIST SORT mtime DESC LIMIT 10` is a
  recently-edited panel for the whole folder.
- **a deadline dashboard** — assignments carry `due:` dates;
  `TABLE due FROM #assignment WHERE due >= 2026-01-01 SORT due` stays
  sorted as you add more.

A query is just text, so the ones you reuse belong in a template
(`templates/` folder — `Ctrl+Shift+I` inserts one at the cursor).
