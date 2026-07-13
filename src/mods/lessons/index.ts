/**
 * Lessons mod — writes a bundled `lessons/` folder into the open root, once.
 * Each file is only created if it doesn't already exist (same seed-once
 * pattern as the daily mod's notes and the demo note in main.ts), so
 * re-running it after a student has edited a lesson never clobbers their
 * changes.
 */

import type { Mod, TextAPI } from "../types";
import readme from "./assets/00-readme.md?raw";
import usingText from "./assets/01-using-text.md?raw";
import markdownLesson from "./assets/02-markdown-lesson.md?raw";
import bookLesson from "./assets/03-illustrated-book/00-lesson.md?raw";
import bookCh1 from "./assets/03-illustrated-book/01-the-hare-boasts.md?raw";
import bookCh2 from "./assets/03-illustrated-book/02-the-race.md?raw";
import bookCh3 from "./assets/03-illustrated-book/03-the-moral.md?raw";
import academicBook from "./assets/04-academic-book.md?raw";
import presentation from "./assets/05-presentation.md?raw";
import mermaidLesson from "./assets/06-mermaid.md?raw";
import latexLesson from "./assets/07-latex-graph-theory.tex?raw";
import dataviewLesson from "./assets/08-dataview.md?raw";
import corkboardLesson from "./assets/09-corkboard.md?raw";

const FILES: [string, string][] = [
  ["00-readme.md", readme],
  ["01-using-text.md", usingText],
  ["02-markdown-lesson.md", markdownLesson],
  ["03-illustrated-book/00-lesson.md", bookLesson],
  ["03-illustrated-book/01-the-hare-boasts.md", bookCh1],
  ["03-illustrated-book/02-the-race.md", bookCh2],
  ["03-illustrated-book/03-the-moral.md", bookCh3],
  ["04-academic-book.md", academicBook],
  ["05-presentation.md", presentation],
  ["06-mermaid.md", mermaidLesson],
  ["07-latex-graph-theory.tex", latexLesson],
  ["08-dataview.md", dataviewLesson],
  ["09-corkboard.md", corkboardLesson],
];

async function generateLessons(app: TextAPI) {
  const root = app.currentRoot();
  if (!root) return;
  const dir = `${root}/lessons`;
  for (const [rel, content] of FILES) {
    const path = `${dir}/${rel}`;
    try {
      await app.fs.createFile(path); // rejects if it already exists
      await app.fs.writeText(path, content);
    } catch {
      // already there — a student's edits win, leave it alone
    }
  }
  app.openNote(`${dir}/00-readme.md`);
}

export const lessonsMod: Mod = {
  id: "lessons",
  name: "Lessons",
  activate(app: TextAPI) {
    app.registerCommand({
      id: "generate_lessons",
      title: "generate lessons folder",
      run: () => void generateLessons(app),
    });
    app.addContextMenuItem({
      // root scope only — this always seeds lessons/ at the open root, never
      // inside whichever folder happens to be right-clicked
      label: "generate lessons folder",
      scope: ["root"],
      run: () => void generateLessons(app),
    });
    app.addHelpItem({
      label: "lessons folder",
      button: "generate",
      hint: "write a lessons/ folder into the open notes — a self-contained course in text",
      run: () => {
        app.ui.close(); // the lessons readme opens behind the settings modal
        void generateLessons(app);
      },
    });
  },
};
