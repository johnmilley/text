/**
 * Table-of-contents mod — the third reference mod, and the simplest: a folder
 * right-click action that writes a nested `TOC.md` of wikilinks and opens it.
 *
 * It needs no new API surface — it reaches the app only through the existing
 * TextAPI seams (addContextMenuItem + fs.listTree + fs.writeText + openNote),
 * which is exactly why "generate TOC" was a clean thing to lift out of core.
 */

import type { Entry } from "../../api";
import type { Mod, TextAPI } from "../types";

const stem = (name: string) => name.replace(/\.[^.]+$/, "");
const isNote = (name: string) => /\.(md|markdown|mdown)$/i.test(name);

async function generateToc(app: TextAPI, dir: string) {
  const entries = await app.fs.listTree(dir);
  const title = dir.split("/").pop() ?? "notes";
  const lines: string[] = [`# ${title} — contents`, ""];
  const walk = (items: Entry[], depth: number) => {
    for (const item of items) {
      const indent = "  ".repeat(depth);
      if (item.is_dir) {
        lines.push(`${indent}- **${item.name}**`);
        if (item.children) walk(item.children, depth + 1);
      } else if (depth > 0 || item.name !== "TOC.md") {
        lines.push(`${indent}- [[${isNote(item.name) ? stem(item.name) : item.name}]]`);
      }
    }
  };
  walk(entries, 0);
  const path = `${dir}/TOC.md`;
  await app.fs.writeText(path, lines.join("\n") + "\n");
  app.openNote(path);
}

export const tocMod: Mod = {
  id: "toc",
  name: "Table of contents",
  activate(app: TextAPI) {
    app.addContextMenuItem({
      label: "generate table of contents",
      scope: ["folder", "root"],
      run: (target) => void generateToc(app, target.path),
    });
  },
};
