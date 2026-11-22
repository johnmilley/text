/**
 * Manuscript compile: turn a book folder into a submission-ready manuscript
 * (.docx in standard manuscript format), an EPUB, print-ready PDF pages, or
 * one Markdown file — in the order the sidebar shows (corkboard arrangement
 * included). See model.ts for how notes and folders map to chapters/scenes.
 */

import type { Mod, TextAPI } from "../types";
import { openCompileDialog } from "./ui";

const LAST = "manuscript.lastFolder";

export const manuscriptMod: Mod = {
  id: "manuscript",
  name: "Manuscript compile",
  activate(app: TextAPI) {
    const open = (folder: string | null) => {
      if (!folder) return;
      localStorage.setItem(LAST, folder);
      void openCompileDialog(app, folder);
    };
    /** The command compiles the folder compiled last (when it's still under
     * the open root), else the root itself. */
    const defaultFolder = () => {
      const root = app.currentRoot();
      const last = localStorage.getItem(LAST);
      return last && root && (last === root || last.startsWith(root + "/")) ? last : root;
    };

    app.registerCommand({
      id: "compile_manuscript",
      title: "compile manuscript (Word / EPUB / PDF / Markdown)",
      combo: "ctrl+alt+b",
      run: () => open(defaultFolder()),
    });
    app.addContextMenuItem({
      label: "compile manuscript…",
      scope: ["folder", "root"],
      run: (target) => open(target.path),
    });
    app.addHelpItem({
      label: "compile manuscript",
      button: "compile…",
      hint:
        "a book folder → Word (manuscript format), EPUB, PDF or one Markdown file, in sidebar order. " +
        "Notes and subfolders are chapters (a subfolder's notes are its scenes); names starting " +
        "with _ and notes with `compile: false` are left out; <!-- --> and %% %% comments never print",
      run: () => open(defaultFolder()),
    });
  },
};
