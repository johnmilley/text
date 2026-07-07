/**
 * Client-side port of src-tauri/src/query.rs `parse_note`: one pass over a
 * note collecting flat frontmatter scalars, #tags, and task items, feeding
 * dataview/calendar on the web build. Keep the two in sync.
 */

import type { TaskItem } from "../api";

const TAG_RE = /(?:^|[\s([{])#([\p{L}\p{N}/_-]*\p{L}[\p{L}\p{N}/_-]*)/gu;
const TASK_RE = /^\s*(?:[-*+]|\d+[.)])\s+\[( |x|X)\]\s+(.*)$/;

export interface ParsedNote {
  fields: Record<string, string>;
  tags: string[];
  tasks: TaskItem[];
}

export function parseNote(text: string): ParsedNote {
  const fields: Record<string, string> = {};
  const tags: string[] = [];
  const tasks: TaskItem[] = [];

  const lines = text.split("\n");
  let i = 0;

  // frontmatter: flat `key: value` scalars only
  if (lines[0]?.trim() === "---") {
    i = 1;
    for (; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t === "---" || t === "...") {
        i++;
        break;
      }
      const colon = t.indexOf(":");
      if (colon < 0) continue;
      const key = t.slice(0, colon).trim().toLowerCase();
      const val = t
        .slice(colon + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!key || key.includes(" ")) continue;
      if (key === "tags") {
        for (const raw of val.split(/[, ]/)) {
          const tag = raw.trim().replace(/^#/, "").toLowerCase();
          if (tag && !tags.includes(tag)) tags.push(tag);
        }
      }
      fields[key] = val;
    }
  }

  let fence: string | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trimStart();
    if (fence) {
      if (t.startsWith(fence)) fence = null;
      continue; // no tags/tasks inside code blocks
    }
    if (t.startsWith("```") || t.startsWith("~~~")) {
      fence = t.slice(0, 3);
      continue;
    }
    for (const m of line.matchAll(TAG_RE)) {
      const tag = m[1].toLowerCase();
      if (!tags.includes(tag)) tags.push(tag);
    }
    const task = TASK_RE.exec(line);
    if (task) {
      tasks.push({ text: task[2].trim(), done: task[1] !== " ", line: i + 1 });
    }
  }
  return { fields, tags, tasks };
}

export const isMdName = (name: string): boolean => /\.(md|markdown|mdown)$/i.test(name);
