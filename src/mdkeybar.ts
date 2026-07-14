/**
 * Mobile markdown accessory bar (the "markdown keyboard"): a thumb row that
 * floats directly on top of the on-screen keyboard while the editor has focus
 * on a phone, iA-Writer-style. The bar keeps only the essentials — undo/redo,
 * `#` (tap again to deepen the heading), bold, italic — spread edge to edge
 * so nothing scrolls; every other formatting action lives behind the ⌘
 * button in a grid sheet above the bar (code/highlight/strike, wikilink/link,
 * list/task/quote, search/hide keyboard). A contextual "open →" chip appears
 * when the caret sits inside a [[wikilink]], which is how links are followed
 * on touch (a plain tap only moves the caret).
 *
 * Web build only, and only when a soft keyboard is plausible (coarse pointer).
 * Positioning tracks window.visualViewport every animation frame while the
 * bar is visible — event-driven updates proved to miss iOS keyboard
 * transitions, leaving the bar stranded mid-screen or under the keyboard.
 */

import { redo, undo } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import { wikilinkAt } from "./mdstyle";

/** Wrap the selection in `left`…`right`, or drop an empty pair at the caret. */
function wrap(view: EditorView, left: string, right = left): void {
  const { from, to } = view.state.selection.main;
  if (from === to) {
    view.dispatch({
      changes: { from, insert: left + right },
      selection: { anchor: from + left.length },
    });
  } else {
    view.dispatch({
      changes: [
        { from, insert: left },
        { from: to, insert: right },
      ],
      selection: { anchor: from + left.length, head: to + left.length },
    });
  }
  view.focus();
}

/** Toggle a line prefix ("- ", "> ", "- [ ] ") over the selected lines. */
function linePrefix(view: EditorView, prefix: string): void {
  const { doc, selection } = view.state;
  const first = doc.lineAt(selection.main.from).number;
  const last = doc.lineAt(selection.main.to).number;
  const specs: { from: number; to?: number; insert?: string }[] = [];
  for (let n = first; n <= last; n++) {
    const line = doc.line(n);
    if (line.text.startsWith(prefix)) {
      specs.push({ from: line.from, to: line.from + prefix.length });
    } else {
      specs.push({ from: line.from, insert: prefix });
    }
  }
  // map the caret with assoc +1 so an insertion at the line start pushes it
  // *after* the marker (ready to type), not behind it
  const changes = view.state.changes(specs);
  view.dispatch({ changes, selection: selection.map(changes, 1) });
  view.focus();
}

/** Each tap adds one `#`: plain line → "# ", "# " → "## ", … capped at 6. */
function heading(view: EditorView): void {
  const { doc, selection } = view.state;
  const first = doc.lineAt(selection.main.from).number;
  const last = doc.lineAt(selection.main.to).number;
  const specs: { from: number; insert: string }[] = [];
  for (let n = first; n <= last; n++) {
    const line = doc.line(n);
    if (line.text.startsWith("#")) {
      const hashes = /^#+/.exec(line.text)![0].length;
      if (hashes < 6) specs.push({ from: line.from, insert: "#" });
    } else {
      specs.push({ from: line.from, insert: "# " });
    }
  }
  if (!specs.length) return view.focus();
  const changes = view.state.changes(specs);
  view.dispatch({ changes, selection: selection.map(changes, 1) });
  view.focus();
}

/** [label, tooltip, action, extra class] — label is shown on the button. */
type Btn = [string, string, (v: EditorView) => void, string?];

const BUTTONS: Btn[] = [
  ["↺", "Undo", (v) => void undo(v)],
  ["↻", "Redo", (v) => void redo(v)],
  ["#", "Heading (tap again to deepen)", heading],
  ["B", "Bold", (v) => wrap(v, "**"), "mk-b"],
  ["I", "Italic", (v) => wrap(v, "*"), "mk-i"],
];

export interface KeyBarOptions {
  /** The editor view that currently holds focus, or null. */
  activeView: () => EditorView | null;
  /** Follow a wikilink target (same handler the desktop Ctrl+click uses). */
  openWikilink: (target: string) => void;
  /** Open the search pane (lives in the ⌘ sheet, iA-style). */
  openSearch: () => void;
  /** Whether to mount at all — web build on a touch device. */
  enabled: () => boolean;
}

export function initMdKeyBar(opts: KeyBarOptions): void {
  if (!opts.enabled()) return;

  const bar = document.createElement("div");
  bar.id = "md-keybar";
  bar.hidden = true;
  const row = document.createElement("div");
  row.className = "mk-row";
  bar.appendChild(row);

  // contextual "open link" chip, at the left edge when a wikilink is under the
  // caret; hidden otherwise
  const openBtn = document.createElement("button");
  openBtn.className = "mk-btn mk-open";
  openBtn.hidden = true;
  openBtn.tabIndex = -1;
  openBtn.textContent = "open →";
  let openTarget: string | null = null;
  // pointerdown-preventDefault keeps the editor's selection/focus while tapping
  openBtn.addEventListener("pointerdown", (e) => e.preventDefault());
  openBtn.addEventListener("click", () => {
    if (openTarget) opts.openWikilink(openTarget);
  });
  row.appendChild(openBtn);

  const mkBtn = (label: string, title: string, cls: string | undefined, run: () => void) => {
    const b = document.createElement("button");
    b.className = "mk-btn" + (cls ? ` ${cls}` : "");
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.tabIndex = -1;
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", run);
    return b;
  };

  for (const [label, title, action, cls] of BUTTONS) {
    row.appendChild(
      mkBtn(label, title, cls, () => {
        const v = opts.activeView();
        if (v) action(v);
      }),
    );
  }

  // ---- the ⌘ sheet: everything that isn't a thumb essential, as a grid of
  // glyph-over-label buttons sized for thumbs
  const sheet = document.createElement("div");
  sheet.className = "mk-sheet";
  sheet.hidden = true;
  const closeSheet = () => {
    sheet.hidden = true;
    moreBtn.classList.remove("mk-on");
  };
  // rows of [glyph, label, action, extra class]
  const SHEET: [string, string, (v: EditorView) => void, string?][][] = [
    [
      ["`…`", "code", (v) => wrap(v, "`")],
      ["A", "highlight", (v) => wrap(v, "=="), "mk-hl"],
      ["S", "strike", (v) => wrap(v, "~~"), "mk-s"],
    ],
    [
      ["[[ ]]", "wikilink", (v) => wrap(v, "[[", "]]")],
      ["[](url)", "link", (v) => wrap(v, "[", "](url)")],
    ],
    [
      ["•", "list", (v) => linePrefix(v, "- ")],
      ["☑", "task", (v) => linePrefix(v, "- [ ] ")],
      [">", "quote", (v) => linePrefix(v, "> ")],
    ],
    [
      ["⌕", "search", () => opts.openSearch()],
      ["⌄", "hide keyboard", (v) => v.contentDOM.blur()],
    ],
  ];
  for (const group of SHEET) {
    const r = document.createElement("div");
    r.className = "mk-sheet-row";
    for (const [glyph, label, action, cls] of group) {
      const b = document.createElement("button");
      b.className = "mk-cmd" + (cls ? ` ${cls}` : "");
      b.tabIndex = -1;
      const g = document.createElement("span");
      g.className = "mk-cmd-glyph";
      g.textContent = glyph;
      const l = document.createElement("span");
      l.className = "mk-cmd-label";
      l.textContent = label;
      b.append(g, l);
      b.addEventListener("pointerdown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        closeSheet();
        const v = opts.activeView();
        if (v) action(v);
      });
      r.appendChild(b);
    }
    sheet.appendChild(r);
  }
  bar.appendChild(sheet);

  const moreBtn = mkBtn("⌘", "More", "mk-more", () => {
    sheet.hidden = !sheet.hidden;
    moreBtn.classList.toggle("mk-on", !sheet.hidden);
  });
  row.appendChild(moreBtn);

  // a tap anywhere outside the bar (back into the text, usually) dismisses
  // the sheet without needing a second ⌘ tap
  document.addEventListener("pointerdown", (e) => {
    if (!sheet.hidden && !bar.contains(e.target as Node)) closeSheet();
  });

  document.body.appendChild(bar);

  const vv = window.visualViewport;
  const place = (): void => {
    if (!vv) return;
    // gap = layout-viewport height not covered by the visual viewport = the
    // keyboard's height; lift the bar by that much to ride its top edge
    const gap = window.innerHeight - vv.height - vv.offsetTop;
    bar.style.transform = `translateY(${-Math.max(0, gap)}px)`;
  };

  // track the keyboard every frame while visible: iOS animates the viewport
  // without firing enough resize/scroll events to follow it reliably
  let raf = 0;
  const track = (): void => {
    place();
    raf = requestAnimationFrame(track);
  };

  const updateOpen = (): void => {
    const v = opts.activeView();
    openTarget = v ? wikilinkAt(v, v.state.selection.main.head) : null;
    openBtn.hidden = !openTarget;
  };

  const show = (): void => {
    if (!opts.enabled()) return;
    if (bar.hidden) {
      bar.hidden = false;
      cancelAnimationFrame(raf);
      track();
    }
    updateOpen();
  };
  const hide = (): void => {
    bar.hidden = true;
    closeSheet();
    cancelAnimationFrame(raf);
  };

  document.addEventListener("focusin", (e) => {
    if ((e.target as HTMLElement)?.closest?.(".cm-editor")) show();
  });
  document.addEventListener("focusout", () => {
    // let focus settle: a bar tap preventDefaults so focus stays in the
    // editor, but a tap elsewhere (tree, another control) should dismiss
    setTimeout(() => {
      if (!(document.activeElement as HTMLElement | null)?.closest?.(".cm-editor")) hide();
    }, 0);
  });

  let selRaf = 0;
  document.addEventListener("selectionchange", () => {
    if (bar.hidden) return;
    cancelAnimationFrame(selRaf);
    selRaf = requestAnimationFrame(updateOpen);
  });
}
