/**
 * Corkboard mod — a Scrivener-style index-card view of a folder. Each note is
 * a card: title (the filename) over a synopsis, which is the note's
 * `synopsis:` frontmatter when present or the first words of its body
 * otherwise. The pencil on a card edits the synopsis in place (written back
 * to the note's frontmatter); clicking a card opens the note; folder cards
 * drill down, with a breadcrumb to climb back out. Cards drag to reorder —
 * the order lives in a hidden `.corkboard` file in the folder, never in the
 * notes themselves. The sidebar tree follows it too (core reads the same
 * files via folderOrders — see sortTree in main.ts), so rearranging cards
 * rearranges the file browser.
 *
 * Open it from a folder's right-click menu, the tree background, or
 * Ctrl+Shift+D (the folder of the open note, or the root — K would be the
 * natural key, but CodeMirror's delete-line owns it in the editor).
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

/** Extensions that get a synopsis card (notes, not media). */
const NOTE_EXTS = new Set(["md", "markdown", "mdown", "txt", "text"]);

const isNote = (name: string) => NOTE_EXTS.has(name.split(".").pop()?.toLowerCase() ?? "");
const stem = (name: string) => name.replace(/\.[^.]+$/, "");

interface Card {
  name: string; // entry name (order key)
  path: string;
  isDir: boolean;
}

// ---------------------------------------------------------------- synopsis

/** Split a note into [frontmatter block incl. delimiters (or null), body]. */
function splitFrontmatter(text: string): [string | null, string] {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/);
  return m ? [m[0], text.slice(m[0].length)] : [null, text];
}

/** The `synopsis:` value from a frontmatter block, or null. */
function synopsisField(fm: string | null): string | null {
  const m = fm?.match(/^synopsis:[ \t]*(.*)$/m);
  if (!m) return null;
  const raw = m[1].trim();
  const q = raw.match(/^"(.*)"$/) ?? raw.match(/^'(.*)'$/);
  return (q ? q[1].replace(/\\(["\\])/g, "$1") : raw) || null;
}

/** First ~40 words of the body with markdown syntax thinned out. */
function excerpt(body: string): string {
  const plain = body
    .replace(/^```[\s\S]*?^```/gm, " ") // fenced blocks
    .replace(/!?\[\[([^\]]*)\]\]/g, "$1") // wikilinks / embeds
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // md links / images
    .replace(/^#{1,6}[ \t]+/gm, "") // heading markers
    .replace(/^[ \t]*(?:[-*+]|\d+\.)[ \t]+(?:\[[ xX]\][ \t]*)?/gm, "") // list bullets
    .replace(/[*_`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = plain.split(" ");
  return words.slice(0, 40).join(" ") + (words.length > 40 ? " …" : "");
}

/** Write `synopsis: "…"` into a note's frontmatter (adding a block if none). */
function withSynopsis(text: string, synopsis: string): string {
  const value = synopsis.replace(/\s+/g, " ").trim();
  const line = value ? `synopsis: "${value.replace(/([\\"])/g, "\\$1")}"` : null;
  const [fm, body] = splitFrontmatter(text);
  if (fm === null) return line ? `---\n${line}\n---\n\n${text}` : text;
  const lines = fm.split("\n");
  const at = lines.findIndex((l) => /^synopsis:/.test(l));
  if (at >= 0) {
    if (line) lines[at] = line;
    else lines.splice(at, 1);
  } else if (line) {
    lines.splice(lines.length - 2, 0, line); // before the closing ---
  }
  return lines.join("\n") + body;
}

// ------------------------------------------------------------------ order

/** Hidden per-folder card order; names absent from it sort alphabetically last. */
const orderPath = (dir: string) => `${dir}/.corkboard`;

async function readOrder(app: TextAPI, dir: string): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse(await app.fs.readText(orderPath(dir)));
    const names = (parsed as { order?: unknown }).order;
    return Array.isArray(names) ? names.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return []; // no .corkboard yet (or unreadable) — alphabetical
  }
}

function sortCards(cards: Card[], order: string[]): Card[] {
  const rank = new Map(order.map((n, i) => [n, i]));
  return [...cards].sort((a, b) => {
    const ra = rank.get(a.name) ?? Infinity;
    const rb = rank.get(b.name) ?? Infinity;
    return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
  });
}

// ------------------------------------------------------------------- view

async function loadCards(app: TextAPI, dir: string): Promise<Card[]> {
  const entries: Entry[] = await app.fs.listTree(dir);
  const cards: Card[] = entries
    .filter((e) => e.is_dir || isNote(e.name))
    .map((e) => ({ name: e.name, path: e.path, isDir: e.is_dir }));
  return sortCards(cards, await readOrder(app, dir));
}

function openCorkboard(app: TextAPI, dir: string) {
  const root = app.currentRoot() ?? dir;
  app.ui.info((box) => {
    box.classList.add("cork-box");
    void renderBoard(app, box, root, dir);
  });
}

async function renderBoard(app: TextAPI, box: HTMLElement, root: string, dir: string) {
  const cards = await loadCards(app, dir);
  box.replaceChildren();

  // breadcrumb: root name, then each folder down to `dir`
  const crumbs = el("div", "cork-crumbs");
  const rel = dir === root ? "" : dir.slice(root.length + 1);
  const segs = rel ? rel.split("/") : [];
  const crumb = (label: string, target: string, last: boolean) => {
    const c = el(last ? "span" : "button", "cork-crumb", label);
    if (!last) c.addEventListener("click", () => void renderBoard(app, box, root, target));
    crumbs.append(c);
    if (!last) crumbs.append(el("span", "cork-crumb-sep", "›"));
  };
  crumb(root.split("/").pop() ?? root, root, segs.length === 0);
  segs.forEach((seg, i) => crumb(seg, `${root}/${segs.slice(0, i + 1).join("/")}`, i === segs.length - 1));
  box.append(crumbs);

  const grid = el("div", "cork-grid");
  box.append(grid);

  const persistOrder = () => {
    const names = [...grid.querySelectorAll<HTMLElement>(".cork-card[data-name]")].map(
      (c) => c.dataset.name!,
    );
    void app.fs.writeText(orderPath(dir), JSON.stringify({ order: names }, null, 2) + "\n");
  };

  let dragging: HTMLElement | null = null;
  const cardEl = (card: Card) => {
    const c = el("div", "cork-card" + (card.isDir ? " cork-folder" : ""));
    c.dataset.name = card.name;
    c.draggable = true;
    c.append(el("div", "cork-title", card.isDir ? card.name : stem(card.name)));
    const syn = el("div", "cork-syn");
    c.append(syn);

    if (card.isDir) {
      syn.textContent = "folder — click to open its board";
      c.addEventListener("click", () => void renderBoard(app, box, root, card.path));
    } else {
      void app.fs.readText(card.path).then((text) => {
        const [fm, body] = splitFrontmatter(text);
        syn.textContent = synopsisField(fm) ?? excerpt(body);

        const edit = el("button", "cork-edit", "✎");
        edit.title = "edit synopsis (saved to the note's frontmatter)";
        edit.addEventListener("click", (e) => {
          e.stopPropagation();
          const ta = el("textarea", "cork-syn-input");
          ta.value = synopsisField(fm) ?? "";
          ta.placeholder = "synopsis…";
          let finished = false; // replaceWith/rerender may fire a late blur
          const done = async (save: boolean) => {
            if (finished) return;
            finished = true;
            if (save) {
              const current = await app.fs.readText(card.path);
              await app.fs.writeText(card.path, withSynopsis(current, ta.value));
              await renderBoard(app, box, root, dir); // re-read fm for this card
            } else {
              ta.replaceWith(syn);
            }
          };
          ta.addEventListener("keydown", (e) => {
            e.stopPropagation(); // keep Escape from closing the whole board
            if (e.key === "Escape") void done(false);
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void done(true);
            }
          });
          ta.addEventListener("blur", () => void done(true));
          ta.addEventListener("click", (e) => e.stopPropagation());
          syn.replaceWith(ta);
          ta.focus();
        });
        c.append(edit);
      });
      c.addEventListener("click", () => {
        app.ui.close();
        app.openNote(card.path);
      });
    }

    c.addEventListener("dragstart", (e) => {
      dragging = c;
      c.classList.add("cork-dragging");
      e.dataTransfer?.setData("text/plain", card.name);
    });
    c.addEventListener("dragend", () => {
      dragging = null;
      c.classList.remove("cork-dragging");
      persistOrder(); // wherever the card landed is the new order
    });
    c.addEventListener("dragover", (e) => {
      if (!dragging || dragging === c) return;
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const before = e.clientX < r.left + r.width / 2;
      grid.insertBefore(dragging, before ? c : c.nextSibling);
    });
    c.addEventListener("drop", (e) => e.preventDefault());
    return c;
  };

  grid.append(...cards.map(cardEl));

  // trailing "+" card: start a new note in this folder
  const add = el("div", "cork-card cork-add");
  add.append(el("div", "cork-add-plus", "+"), el("div", "cork-syn", "new note"));
  add.addEventListener("click", () => {
    void (async () => {
      const name = (await app.ui.prompt("name the new note", "untitled.md"))?.trim();
      if (!name) return;
      const path = `${dir}/${name.includes(".") ? name : name + ".md"}`;
      try {
        await app.fs.createFile(path);
      } catch {
        /* exists — just open it */
      }
      app.ui.close();
      app.openNote(path);
    })();
  });
  grid.append(add);
}

// -------------------------------------------------------------------- mod

export const corkboardMod: Mod = {
  id: "corkboard",
  name: "Corkboard",
  activate(app: TextAPI) {
    const fromHere = () => {
      const root = app.currentRoot();
      if (!root) return;
      const note = app.editor.currentNote();
      const dir = note && note.startsWith(root + "/") ? note.slice(0, note.lastIndexOf("/")) : root;
      openCorkboard(app, dir);
    };
    app.registerCommand({
      id: "corkboard",
      title: "corkboard (index cards for the current folder)",
      combo: "ctrl+shift+d",
      run: fromHere,
    });
    app.addContextMenuItem({
      label: "corkboard",
      scope: ["folder", "root"],
      run: ({ path }) => openCorkboard(app, path),
    });
    app.addHelpItem({
      label: "corkboard",
      hint: "a folder as index cards — synopses on the cards, drag to reorder (Ctrl+Shift+D)",
      run: fromHere,
    });
  },
};
