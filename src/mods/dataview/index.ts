/**
 * Dataview mod — live query blocks, the second reference mod and the example
 * of an *inline content* extension (vs. the action-shaped `ssg` mod).
 *
 * A fenced code block whose language is `dataview` renders its results below
 * the fence; the source text is never rewritten, so it survives sync/export:
 *
 *   ```dataview
 *   LIST FROM "projects"            — notes in a folder
 *   TABLE status, due FROM #course  — frontmatter fields as columns
 *   TASK FROM "daily"               — open `- [ ]` items
 *   ... WHERE status = active AND due <= 2026-08-01
 *   ... WHERE name contains draft   — ops: = != > < >= <= contains
 *   ... SORT name DESC  /  ... LIMIT 20
 *   ```
 *
 * It reaches the app only through TextAPI: `registerBlockRenderer` to hook the
 * editor, `notes.collect()` for data, `openNote()` to navigate.
 */

import type { Mod, TextAPI } from "../types";
import { dvNote, parseQuery, renderResults, runQuery } from "./query";

export const dataviewMod: Mod = {
  id: "dataview",
  name: "Dataview queries",
  activate(app: TextAPI) {
    app.registerBlockRenderer({
      lang: "dataview",
      render(ctx) {
        ctx.el.classList.add("dv-results");
        const parsed = parseQuery(ctx.source);
        if (typeof parsed === "string") {
          ctx.el.appendChild(dvNote(parsed));
          return;
        }
        let alive = true; // guards async resolves after the widget is torn down
        const refresh = () => {
          void app.notes.collect().then((notes) => {
            if (!alive) return;
            renderResults(ctx.el, parsed, runQuery(parsed, notes), app.openNote);
            ctx.requestMeasure();
          });
        };
        refresh();
        const unsub = ctx.onInvalidate(refresh);
        return () => {
          alive = false;
          unsub();
        };
      },
    });
  },
};
