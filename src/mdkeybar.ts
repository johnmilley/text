/**
 * Mobile markdown accessory bar (the "markdown keyboard"): a thumb row that
 * floats directly on top of the on-screen keyboard while the editor has focus
 * on a phone, 1Writer-style. Buttons wrap the selection or prefix the current
 * line(s) with markdown; a contextual "open →" chip appears when the caret
 * sits inside a [[wikilink]], which is how links are followed on touch (a
 * plain tap only moves the caret).
 *
 * Web build only, and only when a soft keyboard is plausible (coarse pointer).
 * Positioning tracks window.visualViewport so the bar rides the top of the
 * keyboard as it opens, closes, or resizes.
 */

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

/** Toggle a line prefix ("# ", "- ", "> ", "- [ ] ") over the selected lines. */
function linePrefix(view: EditorView, prefix: string): void {
  const { doc, selection } = view.state;
  const first = doc.lineAt(selection.main.from).number;
  const last = doc.lineAt(selection.main.to).number;
  const changes: { from: number; to?: number; insert?: string }[] = [];
  for (let n = first; n <= last; n++) {
    const line = doc.line(n);
    if (line.text.startsWith(prefix)) {
      changes.push({ from: line.from, to: line.from + prefix.length });
    } else {
      changes.push({ from: line.from, insert: prefix });
    }
  }
  view.dispatch({ changes });
  view.focus();
}

/** [label, tooltip, action] — label is shown on the button. */
const BUTTONS: [string, string, (v: EditorView) => void][] = [
  ["H", "Heading", (v) => linePrefix(v, "# ")],
  ["B", "Bold", (v) => wrap(v, "**")],
  ["I", "Italic", (v) => wrap(v, "*")],
  ["`", "Code", (v) => wrap(v, "`")],
  ["•", "Bullet list", (v) => linePrefix(v, "- ")],
  ["☑", "Task", (v) => linePrefix(v, "- [ ] ")],
  ["❝", "Quote", (v) => linePrefix(v, "> ")],
  ["[[ ]]", "Wikilink", (v) => wrap(v, "[[", "]]")],
  ["🔗", "Link", (v) => wrap(v, "[", "](url)")],
];

export interface KeyBarOptions {
  /** The editor view that currently holds focus, or null. */
  activeView: () => EditorView | null;
  /** Follow a wikilink target (same handler the desktop Ctrl+click uses). */
  openWikilink: (target: string) => void;
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

  for (const [label, title, action] of BUTTONS) {
    const b = document.createElement("button");
    b.className = "mk-btn";
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.tabIndex = -1;
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      const v = opts.activeView();
      if (v) action(v);
    });
    scroller.appendChild(b);
  }

  document.body.appendChild(bar);

  const vv = window.visualViewport;
  const place = (): void => {
    if (!vv) return;
    // gap = layout-viewport height not covered by the visual viewport = the
    // keyboard's height; lift the bar by that much to ride its top edge
    const gap = window.innerHeight - vv.height - vv.offsetTop;
    bar.style.transform = `translateY(${-Math.max(0, gap)}px)`;
  };

  const updateOpen = (): void => {
    const v = opts.activeView();
    openTarget = v ? wikilinkAt(v, v.state.selection.main.head) : null;
    openBtn.hidden = !openTarget;
  };

  const show = (): void => {
    if (!opts.enabled()) return;
    bar.hidden = false;
    place();
    updateOpen();
  };
  const hide = (): void => {
    bar.hidden = true;
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

  if (vv) {
    const onViewport = () => {
      if (!bar.hidden) place();
    };
    vv.addEventListener("resize", onViewport);
    vv.addEventListener("scroll", onViewport);
  }

  let raf = 0;
  document.addEventListener("selectionchange", () => {
    if (bar.hidden) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateOpen);
  });
}
