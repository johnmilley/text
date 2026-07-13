import type { NoteMeta } from "../../api";

/**
 * Dataview-inspired query parsing + rendering. Pure logic + DOM building; the
 * editor/CodeMirror lifecycle lives in core (blockrender.ts) and the mod entry
 * (index.ts). See the block syntax in index.ts / MOD_API.md.
 */

export interface Query {
  kind: "list" | "table" | "task";
  columns: string[];
  folders: string[];
  tags: string[];
  where: Condition[];
  sort: { field: string; desc: boolean } | null;
  limit: number | null;
}

export interface Condition {
  field: string;
  op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains";
  value: string;
}

export function parseQuery(src: string): Query | string {
  const text = src.trim().replace(/\s+/g, " ");
  if (!text) return 'empty query — try: LIST FROM "folder" or TASK FROM #tag';
  const m = /^(list|table|task)\b\s*(.*)$/i.exec(text);
  if (!m) return `unknown query type — expected LIST, TABLE, or TASK`;
  const kind = m[1].toLowerCase() as Query["kind"];
  let rest = m[2];

  const query: Query = {
    kind,
    columns: [],
    folders: [],
    tags: [],
    where: [],
    sort: null,
    limit: null,
  };

  const limitMatch = /\blimit\s+(\d+)\s*$/i.exec(rest);
  if (limitMatch) {
    query.limit = Number(limitMatch[1]);
    rest = rest.slice(0, limitMatch.index).trim();
  }
  const sortMatch = /\bsort\s+([\w.-]+)(?:\s+(asc|desc))?\s*$/i.exec(rest);
  if (sortMatch) {
    query.sort = { field: sortMatch[1].toLowerCase(), desc: sortMatch[2]?.toLowerCase() === "desc" };
    rest = rest.slice(0, sortMatch.index).trim();
  }
  // WHERE field op value [AND …] — ops: = != > < >= <= contains
  const whereMatch = /\bwhere\b\s*(.*)$/i.exec(rest);
  if (whereMatch) {
    const COND = /^([\w.-]+)\s*(!=|>=|<=|=|>|<|contains)\s*("[^"]*"|\S+)$/i;
    for (const clause of whereMatch[1].split(/\s+and\s+/i)) {
      const c = COND.exec(clause.trim());
      if (!c) return `WHERE expects: field (=, !=, >, <, >=, <=, contains) value — got "${clause.trim()}"`;
      const raw = c[3].startsWith('"') ? c[3].slice(1, -1) : c[3];
      query.where.push({
        field: c[1].toLowerCase(),
        op: c[2].toLowerCase() as Condition["op"],
        value: raw,
      });
    }
    rest = rest.slice(0, whereMatch.index).trim();
  }
  const fromMatch = /\bfrom\b\s*(.*)$/i.exec(rest);
  if (fromMatch) {
    for (const term of fromMatch[1].match(/"[^"]*"|#[^\s]+/g) ?? []) {
      if (term.startsWith('"')) query.folders.push(term.slice(1, -1).replace(/^\/+|\/+$/g, ""));
      else query.tags.push(term.slice(1).toLowerCase());
    }
    if (!query.folders.length && !query.tags.length) {
      return `FROM expects "folder" or #tag terms`;
    }
    rest = rest.slice(0, fromMatch.index).trim();
  }
  if (kind === "table") {
    query.columns = rest
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    if (!query.columns.length) return "TABLE needs columns: TABLE field1, field2 FROM …";
  } else if (rest) {
    return `unexpected: "${rest}"`;
  }
  return query;
}

function fieldOf(note: NoteMeta, field: string): string {
  if (field === "name" || field === "file.name") return note.name;
  if (field === "mtime" || field === "file.mtime") {
    return new Date(note.mtime * 1000).toISOString().slice(0, 10);
  }
  if (field === "path" || field === "file.path") return note.rel;
  return note.fields[field] ?? "";
}

/** One WHERE condition against a note; numbers compare numerically. */
function matches(note: NoteMeta, cond: Condition): boolean {
  const actual = fieldOf(note, cond.field);
  const a = actual.toLowerCase();
  const b = cond.value.toLowerCase();
  if (cond.op === "contains") return a.includes(b);
  const na = Number(actual);
  const nb = Number(cond.value);
  const numeric = actual !== "" && !Number.isNaN(na) && !Number.isNaN(nb);
  const cmp = numeric ? na - nb : a.localeCompare(b, undefined, { numeric: true });
  switch (cond.op) {
    case "=": return cmp === 0;
    case "!=": return cmp !== 0;
    case ">": return cmp > 0;
    case "<": return cmp < 0;
    case ">=": return cmp >= 0;
    case "<=": return cmp <= 0;
  }
}

export function runQuery(query: Query, notes: NoteMeta[]): NoteMeta[] {
  let hits = notes.filter((n) => {
    const inFolder =
      !query.folders.length || query.folders.some((f) => n.rel === f || n.rel.startsWith(f + "/"));
    const hasTags = query.tags.every((t) => n.tags.some((x) => x === t || x.startsWith(t + "/")));
    return inFolder && hasTags && query.where.every((c) => matches(n, c));
  });
  if (query.kind === "task") hits = hits.filter((n) => n.tasks.some((t) => !t.done));
  const sort = query.sort;
  if (sort) {
    hits.sort((a, b) => {
      const ka = fieldOf(a, sort.field);
      const kb = fieldOf(b, sort.field);
      // notes missing the field sort last in either direction, instead of
      // flooding the top of every ascending sort
      if (!ka || !kb) return Number(!ka) - Number(!kb);
      const cmp =
        sort.field === "mtime" || sort.field === "file.mtime"
          ? a.mtime - b.mtime
          : ka.localeCompare(kb, undefined, { numeric: true });
      return sort.desc ? -cmp : cmp;
    });
  }
  if (query.limit !== null) hits = hits.slice(0, query.limit);
  return hits;
}

// ---------------------------------------------------------------- rendering

export type OpenNote = (path: string, line?: number) => void;

export function dvNote(text: string): HTMLElement {
  const div = document.createElement("div");
  div.className = "dv-note";
  div.textContent = text;
  return div;
}

export function renderResults(box: HTMLElement, query: Query, hits: NoteMeta[], openNote: OpenNote) {
  box.replaceChildren();
  if (!hits.length) {
    box.appendChild(dvNote("no results"));
    return;
  }
  const link = (n: NoteMeta, line?: number) => {
    const a = document.createElement("a");
    a.className = "dv-link";
    a.textContent = n.name;
    a.addEventListener("mousedown", (e) => {
      e.preventDefault();
      openNote(n.path, line);
    });
    return a;
  };
  if (query.kind === "list") {
    const ul = document.createElement("ul");
    for (const n of hits) {
      const li = document.createElement("li");
      li.appendChild(link(n));
      ul.appendChild(li);
    }
    box.appendChild(ul);
  } else if (query.kind === "table") {
    const table = document.createElement("table");
    const head = document.createElement("tr");
    for (const col of ["note", ...query.columns]) {
      const th = document.createElement("th");
      th.textContent = col;
      head.appendChild(th);
    }
    table.appendChild(head);
    for (const n of hits) {
      const tr = document.createElement("tr");
      const first = document.createElement("td");
      first.appendChild(link(n));
      tr.appendChild(first);
      for (const col of query.columns) {
        const td = document.createElement("td");
        td.textContent = fieldOf(n, col);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    box.appendChild(table);
  } else {
    // task
    const ul = document.createElement("ul");
    ul.className = "dv-tasks";
    for (const n of hits) {
      for (const t of n.tasks) {
        if (t.done) continue;
        const li = document.createElement("li");
        li.append("◻ ", t.text, " — ");
        li.appendChild(link(n, t.line));
        ul.appendChild(li);
      }
    }
    box.appendChild(ul);
  }
}
