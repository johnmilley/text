/**
 * LaTeX mod — right-click a .tex file to compile it with the system's
 * pdflatex and open the resulting PDF in the built-in viewer. Desktop only:
 * compiling needs a real filesystem and a `pdflatex` on PATH, neither of
 * which exist in the web build (see TextAPI.system.compileLatex).
 */

import type { Mod, TextAPI } from "../types";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function compileAndOpen(app: TextAPI, path: string) {
  const name = path.split("/").pop() ?? path;
  const status = el("div", "latex-status", `compiling ${name}…`);
  app.ui.info((box) => {
    box.classList.add("latex-box");
    box.append(el("div", "modal-caption", "compile LaTeX"), status);
  });
  try {
    const result = await app.system.compileLatex(path);
    if (result.ok) {
      app.ui.close();
      app.openNote(result.pdfPath);
      return;
    }
    status.textContent = "pdflatex failed:";
    status.after(el("pre", "latex-log", result.log || "(no output)"));
  } catch (err) {
    status.textContent = `${err}`;
  }
}

export const latexMod: Mod = {
  id: "latex",
  name: "LaTeX compile",
  activate(app: TextAPI) {
    app.addContextMenuItem({
      label: "compile LaTeX → PDF",
      scope: ["file"],
      when: ({ path }) => path.toLowerCase().endsWith(".tex"),
      run: ({ path }) => void compileAndOpen(app, path),
    });
  },
};
