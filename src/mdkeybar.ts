/**
 * Mobile markdown accessory bar (the "markdown keyboard"): a thumb row that
 * floats directly on top of the on-screen keyboard while the editor has focus
 * on a phone, iA-Writer-style. Plain-character buttons wrap the selection or
 * prefix the current line(s); `#` stacks (tap again to deepen the heading); a
 * contextual "open →" chip appears when the caret sits inside a [[wikilink]],
 * which is how links are followed on touch (a plain tap only moves the
 * caret). The ⌘ button opens a small sheet with the second-string actions
 * (search, link, quote, strikethrough, hide keyboard).
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
  ["#", "Heading (tap again to deepen)", heading],
  ["B", "Bold", (v) => wrap(v, "**"), "mk-b"],
  ["I", "Italic", (v) => wrap(v, "*"), "mk-i"],
  ["`", "Code", (v) => wrap(v, "`")],
  ["A", "Highlight", (v) => wrap(v, "=="), "mk-hl"],
  ["[[ ]]", "Wikilink", (v) => wrap(v, "[[", "]]")],
  ["•", "Bullet list", (v) => linePrefix(v, "- ")],
  ["☑", "Task", (v) => linePrefix(v, "- [ ] ")],
  ["↺", "Undo", (v) => void undo(v)],
  ["↻", "Redo", (v) => void redo(v)],
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
  const scroller = document.createElement("div");
  scroller.className = "mk-scroll";
  bar.appendChild(scroller);

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
  scroller.appendChild(openBtn);

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
    scroller.appendChild(
      mkBtn(label, title, cls, () => {
        const v = opts.activeView();
        if (v) action(v);
      }),
    );
  }

  // ---- the ⌘ sheet: second-string actions, iA-style
  const sheet = document.createElement("div");
  sheet.className = "mk-sheet";
  sheet.hidden = true;
  const closeSheet = () => {
    sheet.hidden = true;
  };
  const SHEET: [string, (v: EditorView) => void][] = [
    ["search", () => opts.openSearch()],
    ["link  [](url)", (v) => wrap(v, "[", "](url)")],
    ["quote  >", (v) => linePrefix(v, "> ")],
    ["strikethrough  ~~", (v) => wrap(v, "~~")],
    ["hide keyboard", (v) => v.contentDOM.blur()],
  ];
  for (const [label, action] of SHEET) {
    const b = document.createElement("button");
    b.className = "mk-cmd";
    b.textContent = label;
    b.tabIndex = -1;
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      closeSheet();
      const v = opts.activeView();
      if (v) action(v);
    });
    sheet.appendChild(b);
  }
  bar.appendChild(sheet);

  scroller.appendChild(
    mkBtn("⌘", "More", undefined, () => {
      sheet.hidden = !sheet.hidden;
    }),
  );

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
