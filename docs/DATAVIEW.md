# Dataview queries

A `dataview` code block renders a live list, table, or task roll-up of your
notes right where the block sits. It's a deliberately small subset of the
Obsidian Dataview plugin — enough to answer "what's in this folder / tagged
this / still open", without a query language to learn.

The block stays plain text on disk: the results are drawn as a widget *below*
the fence, so sync and export never touch your source.

````markdown
```dataview
LIST FROM "projects"
```
````

## Query shape

```
<KIND> [columns] [FROM <sources>] [SORT <field> [ASC|DESC]] [LIMIT <n>]
```

Only `<KIND>` is required. Order matters: columns come first, then `FROM`,
then `SORT`, then `LIMIT`. Keywords are case-insensitive.

### Kinds

| kind    | renders                                                      |
|---------|--------------------------------------------------------------|
| `LIST`  | a bullet list of matching notes                              |
| `TABLE` | a table; the first column is always the note, then your columns |
| `TASK`  | every open `- [ ]` task in matching notes, linked to its line |

```dataview
TABLE status, due FROM #course SORT due
```

`TABLE` needs at least one column:

```
TABLE field1, field2 FROM …
```

### FROM — choosing notes

`FROM` takes any mix of `"folder"` and `#tag` terms; **all** terms must match.

```dataview
LIST FROM "daily" #review
```

- `"folder"` — notes in that folder (relative to your notes root) or any
  subfolder. Quotes are required.
- `#tag` — notes carrying that tag. Tags come from `#tags` in the body **and**
  a frontmatter `tags:` list. A tag also matches its nested children, so
  `#project` matches `#project/text`.

Omit `FROM` entirely to query every note in the folder.

### SORT

```
SORT name           # A→Z (default ascending)
SORT mtime DESC      # most recently modified first
SORT due             # by a frontmatter field
```

Sort by `name`, `mtime` (last modified), `path`, or any frontmatter field.
Numbers inside text sort naturally (`note2` before `note10`). Unknown fields
sort as empty.

### LIMIT

```
LIMIT 20
```

Keep only the first *n* results (applied after sorting).

## Fields and columns

Column names and sort fields resolve in this order:

1. `name` / `file.name` — the note's title
2. `mtime` / `file.mtime` — last-modified date (`YYYY-MM-DD`)
3. `path` / `file.path` — path relative to the root
4. otherwise, a key from the note's YAML frontmatter

```markdown
---
status: active
due: 2026-07-01
tags: [course, math]
---
```

```dataview
TABLE status, due FROM #course SORT due ASC LIMIT 10
```

A field a note doesn't have renders blank.

## Live updates

Results refresh as you type and whenever files in the folder change — add a
note, check off a task, edit frontmatter, and every visible query reflects it.
Note links in results open the note (tasks open at their exact line).

## What it doesn't do (yet)

This is a subset by design. It doesn't have `WHERE`, expressions, implicit
fields beyond the few above, inline `key:: value` fields, `GROUP BY`, or
`FLATTEN`. If you hit a query you miss, jot it in `changes.txt`.
