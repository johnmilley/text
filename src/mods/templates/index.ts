/**
 * Templates mod — a template is just text: any file in a `templates/` folder
 * at the root of the open notes. "insert template" (Ctrl+Shift+I) drops one
 * at the cursor of the open note; right-click a folder (or the tree
 * background) → "new file from template" starts a fresh file from one. No
 * placeholder syntax, no magic — what's in the template is what you get.
 */

import type { Entry } from "../../api";
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

const SAMPLE = `# meeting — topic

date:
attendees:

## agenda

-

## notes

## next steps

- [ ]
`;

interface Tpl {
  /** path relative to templates/, shown in the picker */
  name: string;
  path: string;
}

/** Every file under `<root>/templates`, flattened ("weekly/review.md"). */
async function listTemplates(app: TextAPI): Promise<Tpl[]> {
  const root = app.currentRoot();
  if (!root) return [];
  let tree: Entry[];
  try {
    tree = await app.fs.listTree(`${root}/templates`);
  } catch {
    return []; // no templates/ folder yet
  }
  const out: Tpl[] = [];
  const walk = (entries: Entry[], prefix: string) => {
    for (const e of entries) {
      if (e.is_dir) walk(e.children ?? [], `${prefix}${e.name}/`);
      else out.push({ name: `${prefix}${e.name}`, path: e.path });
    }
  };
  walk(tree, "");
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Seed templates/ with one sample so the feature explains itself. */
async function seedSample(app: TextAPI) {
  const root = app.currentRoot();
  if (!root) return;
  const path = `${root}/templates/meeting.md`;
  try {
    await app.fs.createFile(path); // rejects if it already exists
    await app.fs.writeText(path, SAMPLE);
  } catch {
    /* already there — leave it alone */
  }
  app.ui.close();
  app.openNote(path);
}

/** List templates in a modal; `onPick` runs after the modal closes. */
function pickTemplate(app: TextAPI, caption: string, onPick: (t: Tpl) => void) {
  void listTemplates(app).then((tpls) => {
    app.ui.info((box) => {
      box.classList.add("tpl-box");
      box.append(el("div", "modal-caption", caption));
      if (tpls.length === 0) {
        box.append(
          el(
            "div",
            "tpl-empty",
            "no templates yet — any file in a templates/ folder at the root of your notes becomes one.",
          ),
        );
        const row = el("div", "modal-buttons");
        const seed = el("button", "", "create templates/ with a sample");
        seed.addEventListener("click", () => void seedSample(app));
        row.append(seed);
        box.append(row);
        return;
      }
      const list = el("div", "tpl-list");
      for (const t of tpls) {
        const b = el("button", "tpl-item", t.name);
        b.addEventListener("click", () => {
          app.ui.close();
          onPick(t);
        });
        list.append(b);
      }
      box.append(list);
    });
  });
}

function insertTemplate(app: TextAPI) {
  if (!app.editor.currentNote()) {
    app.ui.info((box) => {
      box.append(
        el("div", "modal-caption", "insert template"),
        el("div", "tpl-empty", "open a note first — the template is inserted at the cursor."),
      );
    });
    return;
  }
  pickTemplate(app, "insert template", (t) => {
    void app.fs.readText(t.path).then((text) => app.editor.insertAtCursor(text));
  });
}

function newFromTemplate(app: TextAPI, dir: string) {
  pickTemplate(app, "new file from template", (t) => {
    void (async () => {
      const name = (await app.ui.prompt("name the new file", t.name))?.trim();
      if (!name) return;
      const dest = `${dir}/${name}`;
      try {
        await app.fs.createFile(dest); // rejects if it already exists
      } catch {
        app.ui.info((box) => {
          box.append(
            el("div", "modal-caption", "new file from template"),
            el("div", "tpl-empty", `${name} already exists here — nothing was overwritten.`),
          );
        });
        return;
      }
      await app.fs.writeText(dest, await app.fs.readText(t.path));
      app.openNote(dest);
    })();
  });
}

export const templatesMod: Mod = {
  id: "templates",
  name: "Templates",
  activate(app: TextAPI) {
    app.registerCommand({
      id: "insert_template",
      title: "insert template at cursor",
      combo: "ctrl+shift+i",
      run: () => insertTemplate(app),
    });
    app.addContextMenuItem({
      label: "new file from template",
      scope: ["folder", "root"],
      run: ({ path }) => newFromTemplate(app, path),
    });
  },
};
