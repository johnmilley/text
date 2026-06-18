/**
 * Daily-notes mod — "today's note" + a month calendar over the daily folder.
 * The fourth reference mod, and the one that motivated growing the API:
 * it reads `config().daily_dir` and creates files, so it exercises
 * `config()`, `fs.createDir/createFile`, and `ui.close`.
 *
 * Daily notes live at daily_dir/YYYY/MM/YYYY-MM-DD.md.
 */

import type { Entry } from "../../api";
import type { Mod, TextAPI } from "../types";
import { openCalendar } from "./calendar";

const pad = (n: number) => String(n).padStart(2, "0");

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dailyDir = (app: TextAPI) => app.config().daily_dir.replace(/^\/+|\/+$/g, "");

async function openDailyFor(app: TextAPI, date: string) {
  const root = app.currentRoot();
  if (!root) return;
  const dir = `${root}/${dailyDir(app)}/${date.slice(0, 4)}/${date.slice(5, 7)}`;
  const path = `${dir}/${date}.md`;
  let fresh = false;
  await app.fs.createDir(dir);
  try {
    await app.fs.createFile(path); // throws if it already exists
    await app.fs.writeText(path, `# ${date}\n\n`); // seed a fresh note
    fresh = true;
  } catch {
    // already exists — leave its content alone
  }
  app.openNote(path, fresh ? 3 : undefined); // new note: cursor under the heading
}

function flatten(entries: Entry[], out: string[] = []): string[] {
  for (const e of entries) {
    if (e.is_dir) {
      if (e.children) flatten(e.children, out);
    } else {
      out.push(e.path);
    }
  }
  return out;
}

async function openDailyCalendar(app: TextAPI) {
  const root = app.currentRoot();
  if (!root) return;
  const base = root.endsWith("/") ? root : root + "/";
  const rels = new Set(
    flatten(await app.fs.listTree(root)).map((p) => (p.startsWith(base) ? p.slice(base.length) : p)),
  );
  const dir = dailyDir(app);
  // index existing daily notes by month-day, so "on this day" can list the
  // same date across other years
  const prefix = dir ? `${dir}/` : "";
  const dateRe = new RegExp(
    `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d{4}/\\d{2}/(\\d{4}-\\d{2}-\\d{2})\\.md$`,
  );
  const byMonthDay = new Map<string, string[]>();
  for (const r of rels) {
    const m = r.match(dateRe);
    if (!m) continue;
    const date = m[1];
    const key = date.slice(5); // MM-DD
    (byMonthDay.get(key) ?? byMonthDay.set(key, []).get(key)!).push(date);
  }
  for (const list of byMonthDay.values()) list.sort((a, b) => (a < b ? 1 : -1)); // newest first

  openCalendar(app, {
    hasNote: (date) => rels.has(`${dir}/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.md`),
    open: (date) => {
      app.ui.close();
      void openDailyFor(app, date);
    },
    anniversaries: (date) => (byMonthDay.get(date.slice(5)) ?? []).filter((d) => d !== date),
  });
}

export const dailyMod: Mod = {
  id: "daily",
  name: "Daily notes + calendar",
  activate(app: TextAPI) {
    const openToday = () => void openDailyFor(app, today());
    const openCal = () => void openDailyCalendar(app);

    app.registerCommand({
      id: "daily_note",
      title: "today's daily note",
      combo: "ctrl+shift+d",
      run: openToday,
    });
    app.registerCommand({
      id: "calendar",
      title: "daily-note calendar",
      combo: "ctrl+shift+c",
      run: openCal,
    });
    app.addToolbarButton({
      id: "btn-daily",
      label: "today",
      title: "Today's daily note (Ctrl+Shift+D)",
      run: openToday,
    });
    app.addToolbarButton({
      id: "btn-calendar",
      label: "calendar",
      title: "Daily-note calendar (Ctrl+Shift+C)",
      run: openCal,
    });
  },
};
