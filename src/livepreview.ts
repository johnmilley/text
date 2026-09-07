import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import {
  type EditorState,
  type Extension,
  type Range,
  StateField,
} from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { frontmatterLines } from "./mdstyle";
import { type Align, alignOf, isSepRow, isTableLine } from "./tables";

/**
 * Live preview: the markdown syntax is *hidden* rather than merely styled, on
 * every line the cursor isn't on. Move onto a line and its real source comes
 * back, ready to edit — the way Obsidian's Live Preview and Typora behave.
 *
 * The document is never rewritten. Everything here is a `Decoration.replace`
 * over marker characters, so what's on disk, what a mod reads, what export
 * renders, and what a copy/paste yields are all still plain markdown. Turning
 * live preview off just stops drawing the decorations.
 *
 * This complements `mdstyle.ts` rather than replacing it: that file gives the
 * *content* its typography (a heading is big, `**bold**` is bold), this one
 * takes the *punctuation* away once you've stopped looking at it. With live
 * preview off, mdstyle alone is the old source-with-styling behaviour.
 *
 * The work is split in two because CodeMirror is: a view plugin may not emit a
 * decoration that replaces across a line boundary, so anything spanning lines
 * — frontmatter, tables — lives in the `liveBlocks` state field below, and
 * everything within a line lives in the `livePlugin` view plugin. Fenced
 * blocks a mod renders (mermaid, dataview) are the same idea and are handled
 * in `blockrender.ts`, next to the widget lifecycle they need.
 */

// ------------------------------------------------------------------ reveal

/**
 * Line numbers holding (or touched by) a cursor or selection. Those lines
 * render as raw source; everything else is decorated.
 *
 * An **unfocused** editor reveals nothing: a note you have only opened, or one
 * sitting behind a dialog or the file tree, reads as a finished page. The
 * source comes back when you click into it, which is also when you want it.
 */
export function revealedLines(view: EditorView): Set<number> {
  const lines = new Set<number>();
  if (!view.hasFocus) return lines;
  const { state } = view;
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) lines.add(n);
  }
  return lines;
}

/** True when `[from,to)` sits on a line the user is working on. */
export function isRevealed(view: EditorView, from: number, to: number): boolean {
  if (!view.hasFocus) return false;
  const lines = revealedLines(view);
  const first = view.state.doc.lineAt(from).number;
  const last = view.state.doc.lineAt(to).number;
  for (let n = first; n <= last; n++) if (lines.has(n)) return true;
  return false;
}

// ------------------------------------------------------------------ widgets

/** A real checkbox in place of `[ ]` / `[x]`. Clicking it edits the source,
 * so undo/redo and the file on disk behave exactly as if you typed the x. */
class TaskWidget extends WidgetType {
  constructor(private readonly checked: boolean) {
    super();
  }

  eq(other: TaskWidget) {
    return other.checked === this.checked;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "cm-task-box";
    box.checked = this.checked;
    box.addEventListener("mousedown", (e) => {
      e.preventDefault(); // don't move the caret onto the line (which would
      // reveal the source and swap the widget out from under the click)
      const pos = view.posAtDOM(box);
      const line = view.state.doc.lineAt(pos);
      const m = /\[[ xX]\]/.exec(line.text);
      if (!m) return;
      const at = line.from + m.index + 1;
      view.dispatch({ changes: { from: at, to: at + 1, insert: this.checked ? " " : "x" } });
    });
    return box;
  }

  ignoreEvent() {
    return false;
  }
}

/** `---` drawn as an actual rule. Inline (it never crosses a line break), so
 * a view plugin may provide it; the CSS gives it block layout. */
class RuleWidget extends WidgetType {
  eq() {
    return true; // every rule is the same rule
  }
  toDOM() {
    const hr = document.createElement("span");
    hr.className = "cm-hr";
    return hr;
  }
}

/** The collapsed stand-in for a frontmatter block: one line naming the keys
 * it holds. Clicking it puts the caret inside, which expands it again. */
class FrontmatterWidget extends WidgetType {
  constructor(private readonly keys: string) {
    super();
  }
  eq(other: FrontmatterWidget) {
    return other.keys === this.keys;
  }
  toDOM(view: EditorView) {
    const chip = document.createElement("span");
    chip.className = "cm-frontmatter-chip";
    chip.textContent = this.keys || "frontmatter";
    chip.title = "Frontmatter — click to edit";
    chip.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = view.posAtDOM(chip);
      // land on the first key, not on the opening `---`
      const line = view.state.doc.lineAt(pos);
      const target = Math.min(line.number + 1, view.state.doc.lines);
      view.dispatch({ selection: { anchor: view.state.doc.line(target).from } });
      view.focus();
    });
    return chip;
  }
  ignoreEvent() {
    return false;
  }
}

const hidden = Decoration.replace({});

// ------------------------------------------------------------------ build

const WIKILINK_RE = /\[\[([^[\]\n]+)\]\]/g;
const HIGHLIGHT_RE = /==(\S(?:[^=\n]*\S)?)==/g;

/**
 * Every range of markup to take off the screen for one viewport.
 *
 * Most of it comes from the syntax tree, which is what keeps it honest: the
 * `*` in `2 * 3` is not an EmphasisMark, so it stays. The two constructs the
 * grammar doesn't know about — `[[wikilinks]]` and `==highlights==` — are
 * matched by regex and screened against the code ranges collected on the way
 * past, so neither fires inside a code block.
 */
function buildLive(view: EditorView): DecorationSet {
  const { state } = view;
  const reveal = revealedLines(view);
  const fm = frontmatterLines(state);
  const ranges: Range<Decoration>[] = [];
  const codeRanges: [number, number][] = [];

  /** Queue a hide, unless it's empty or on a revealed line. */
  const hide = (from: number, to: number, deco: Decoration = hidden) => {
    if (to <= from) return;
    if (reveal.has(state.doc.lineAt(from).number)) return;
    if (reveal.has(state.doc.lineAt(to).number)) return;
    ranges.push(deco.range(from, to));
  };

  /** Extend past the spaces that follow a block marker, so hiding `##` does
   * not leave the heading indented by the space that came after it. */
  const eatSpace = (pos: number, limit: number) => {
    while (pos < limit && state.doc.sliceString(pos, pos + 1) === " ") pos++;
    return pos;
  };

  for (const { from: vFrom, to: vTo } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from: vFrom,
      to: vTo,
      enter(node) {
        const parent = node.node.parent?.name;
        switch (node.name) {
          case "FencedCode":
          case "CodeBlock":
            codeRanges.push([node.from, node.to]);
            return;

          case "InlineCode":
            codeRanges.push([node.from, node.to]);
            return;

          // the `#`s of an ATX heading (a setext heading's underline is its
          // own line — hiding that needs a block decoration, so it's phase 2)
          case "HeaderMark": {
            if (state.doc.sliceString(node.from, node.from + 1) !== "#") return;
            const line = state.doc.lineAt(node.from);
            if (node.from <= line.from + 3) {
              hide(node.from, eatSpace(node.to, line.to));
            } else {
              // closing `##` — swallow the space before it as well, or the
              // heading keeps a stray trailing gap
              let from = node.from;
              while (from > line.from && state.doc.sliceString(from - 1, from) === " ") from--;
              hide(from, node.to);
            }
            return;
          }

          case "EmphasisMark": // * _ around emphasis and strong emphasis
          case "StrikethroughMark": // ~~
            hide(node.from, node.to);
            return;

          case "CodeMark":
            // backticks around `inline code` only — never a fence line
            if (parent === "InlineCode") hide(node.from, node.to);
            return;

          case "QuoteMark": {
            const line = state.doc.lineAt(node.from);
            hide(node.from, eatSpace(node.to, line.to));
            return;
          }

          case "LinkMark": // [ ] ( ) around a link
          case "URL":
          case "LinkTitle":
            // an Image's markers belong to the embed widget in images.ts,
            // which replaces the whole `![alt](src)` in one go
            if (parent === "Link") hide(node.from, node.to);
            return;

          case "HorizontalRule": {
            // the `---` fences of a frontmatter block parse as a rule (and a
            // setext heading) — those belong to the frontmatter field below
            const n = state.doc.lineAt(node.from).number;
            if (fm && n >= fm.first && n <= fm.last) return;
            hide(node.from, node.to, Decoration.replace({ widget: new RuleWidget() }));
            return;
          }

          case "TaskMarker": {
            const checked = /[xX]/.test(state.doc.sliceString(node.from, node.to));
            hide(node.from, node.to, Decoration.replace({ widget: new TaskWidget(checked) }));
            return;
          }
        }
      },
    });
  }

  const inCode = (from: number, to: number) =>
    codeRanges.some(([a, b]) => from >= a && to <= b);

  for (const { from: vFrom, to: vTo } of view.visibleRanges) {
    const text = state.doc.sliceString(vFrom, vTo);
    for (const m of text.matchAll(WIKILINK_RE)) {
      const from = vFrom + m.index;
      const to = from + m[0].length;
      if (inCode(from, to)) continue;
      hide(from, from + 2);
      // `[[note|label]]` shows just the label; `[[note]]` shows the name
      const pipe = m[1].indexOf("|");
      if (pipe >= 0) hide(from + 2, from + 2 + pipe + 1);
      hide(to - 2, to);
    }
    for (const m of text.matchAll(HIGHLIGHT_RE)) {
      const from = vFrom + m.index;
      const to = from + m[0].length;
      if (inCode(from, to)) continue;
      hide(from, from + 2);
      hide(to - 2, to);
    }
  }

  // the tree walk and the two regex passes each emit in their own order
  return Decoration.set(ranges, true);
}

const livePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildLive(view);
    }
    update(update: ViewUpdate) {
      // selectionSet matters as much as docChanged here: moving the caret onto
      // a line is what brings that line's source back
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.focusChanged ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.decorations = buildLive(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    // treat each hidden run as one character for cursor motion, so arrowing
    // along a line steps over `**` instead of appearing to stall inside it
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
  },
);

// ------------------------------------------------------------ inline render
// Small markdown → DOM pass, for text that lives *inside* a widget (table
// cells) where the editor's own decorations cannot reach. It builds real
// nodes rather than assigning innerHTML, so note content is never parsed as
// markup. Deliberately limited to the inline constructs live preview hides.

const INLINE_RE =
  /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|~~(.+?)~~|==(.+?)==|`([^`]+)`|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\]]*)\]\(([^)]*)\)/g;

function renderInline(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index;
    if (at > last) frag.append(text.slice(last, at));
    let node: HTMLElement;
    if (m[2] !== undefined) {
      node = document.createElement("strong");
      node.append(renderInline(m[2]));
    } else if (m[4] !== undefined) {
      node = document.createElement("em");
      node.append(renderInline(m[4]));
    } else if (m[5] !== undefined) {
      node = document.createElement("del");
      node.append(renderInline(m[5]));
    } else if (m[6] !== undefined) {
      node = document.createElement("mark");
      node.append(renderInline(m[6]));
    } else if (m[7] !== undefined) {
      node = document.createElement("code");
      node.textContent = m[7];
    } else if (m[8] !== undefined) {
      node = document.createElement("span");
      node.className = "cm-wikilink";
      node.textContent = m[9] ?? m[8];
    } else {
      node = document.createElement("span");
      node.className = "cm-mdlink";
      node.textContent = m[10] ?? "";
      node.title = m[11] ?? "";
    }
    frag.append(node);
    last = at + m[0].length;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

// ------------------------------------------------------------ tables (block)

interface Cell {
  text: string;
  /** offset of the cell's text, relative to the start of the table */
  at: number;
}

/** Split one table line into cells, keeping each cell's source offset so a
 * click on a rendered cell can put the caret back in the right place. */
function splitRow(line: string, lineStart: number, tableStart: number): Cell[] {
  const cells: Cell[] = [];
  let i = 0;
  while (i < line.length && /\s/.test(line[i])) i++;
  if (line[i] === "|") i++;
  let cur = "";
  let curAt = i;
  for (; i < line.length; i++) {
    if (line[i] === "\\" && line[i + 1] === "|") {
      cur += "\\|";
      i++;
    } else if (line[i] === "|") {
      cells.push({ text: cur.trim(), at: lineStart + curAt - tableStart });
      cur = "";
      curAt = i + 1;
    } else {
      cur += line[i];
    }
  }
  if (cur.trim() || cells.length === 0) {
    cells.push({ text: cur.trim(), at: lineStart + curAt - tableStart });
  }
  return cells;
}

/** A rendered pipe table. Clicking a cell drops the caret into that cell's
 * source, which reveals the table and hands it back to tables.ts — so the
 * Tab/Enter cell editing is untouched, it just isn't what you look at. */
class TableWidget extends WidgetType {
  constructor(
    private readonly rows: Cell[][],
    private readonly aligns: Align[],
    private readonly headed: boolean,
    /** the table's source, so two different tables are never reused */
    private readonly key: string,
  ) {
    super();
  }

  eq(other: TableWidget) {
    return other.key === this.key;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement("div");
    wrap.className = "cm-table-wrap";
    const table = document.createElement("table");
    table.className = "cm-table";
    const put = (row: Cell[], tag: "th" | "td", parent: HTMLElement) => {
      const tr = document.createElement("tr");
      row.forEach((cell, c) => {
        const td = document.createElement(tag);
        if (this.aligns[c]) td.style.textAlign = this.aligns[c]!;
        td.append(renderInline(cell.text));
        td.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const at = view.posAtDOM(wrap) + cell.at;
          view.dispatch({
            selection: { anchor: Math.min(at, view.state.doc.length) },
            scrollIntoView: true,
          });
          view.focus();
        });
        tr.appendChild(td);
      });
      parent.appendChild(tr);
    };
    let body = this.rows;
    if (this.headed && body.length) {
      const head = document.createElement("thead");
      put(body[0], "th", head);
      table.appendChild(head);
      body = body.slice(1);
    }
    const tbody = document.createElement("tbody");
    for (const row of body) put(row, "td", tbody);
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

/** Replace each pipe table the caret is outside of with a rendered one. */
function tableDecorations(state: EditorState): Range<Decoration>[] {
  const out: Range<Decoration>[] = [];
  const doc = state.doc;
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return;
      const first = doc.lineAt(node.from);
      const last = doc.lineAt(node.to);
      const from = first.from;
      const to = last.to;
      // being edited — tables.ts owns it, leave the source alone
      if (state.selection.ranges.some((sel) => sel.to >= from && sel.from <= to)) return false;

      const rows: Cell[][] = [];
      let aligns: Align[] = [];
      let headed = false;
      for (let n = first.number; n <= last.number; n++) {
        const line = doc.line(n);
        if (!isTableLine(line.text)) continue;
        const cells = splitRow(line.text, line.from, from);
        if (isSepRow(cells.map((c) => c.text))) {
          aligns = cells.map((c) => alignOf(c.text));
          headed = rows.length === 1; // the row above the separator is the head
          continue;
        }
        rows.push(cells);
      }
      if (!rows.length) return false;
      const key = doc.sliceString(from, to);
      out.push(
        Decoration.replace({
          widget: new TableWidget(rows, aligns, headed, key),
          block: true,
        }).range(from, to),
      );
      return false; // nothing inside the table needs visiting
    },
  });
  return out;
}

// ------------------------------------------------------- frontmatter (block)

/**
 * Collapse a YAML frontmatter block to a single chip naming its keys, unless
 * the caret is inside it.
 *
 * This one has to be a `StateField`: the replacement covers whole lines, and a
 * view plugin may not emit a decoration that swallows a line break. Being a
 * state field also means it sees the whole document rather than the viewport,
 * which is fine here — frontmatter is always the first few lines.
 */
function frontmatterDecoration(state: EditorState): Range<Decoration> | null {
  const range = frontmatterLines(state);
  if (!range) return null;
  const from = state.doc.line(range.first).from;
  const to = state.doc.line(range.last).to;
  // editing it — leave the source alone
  for (const sel of state.selection.ranges) {
    if (sel.to >= from && sel.from <= to) return null;
  }
  const keys: string[] = [];
  for (let n = range.first + 1; n < range.last; n++) {
    const m = /^([A-Za-z_][\w-]*)\s*:/.exec(state.doc.line(n).text);
    if (m) keys.push(m[1]);
  }
  return Decoration.replace({
    widget: new FrontmatterWidget(keys.join(" · ")),
    block: true,
  }).range(from, to);
}

/**
 * The block half of live preview: replacements that swallow line breaks, which
 * only a state field may provide.
 *
 * Unlike the inline plugin this sees the whole document rather than the
 * viewport, so both passes stop as soon as they have what they need — the
 * frontmatter is the first few lines, and the table walk never descends into a
 * table it has already measured.
 */
function buildBlocks(state: EditorState): DecorationSet {
  const ranges = tableDecorations(state);
  const fm = frontmatterDecoration(state);
  if (fm) ranges.push(fm);
  return Decoration.set(ranges, true);
}

const liveBlocks = StateField.define<DecorationSet>({
  create: (state) => buildBlocks(state),
  update(deco, tr) {
    // the tree comparison catches background parsing finishing a document
    // that was too long to parse in one go
    if (
      !tr.docChanged &&
      !tr.selection &&
      syntaxTree(tr.startState) === syntaxTree(tr.state)
    ) {
      return deco;
    }
    return buildBlocks(tr.state);
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** Live preview for markdown documents (see the file comment). */
export function livePreview(): Extension {
  return [livePlugin, liveBlocks];
}
