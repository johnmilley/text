import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import {
  type EditorState,
  type Extension,
  type Range,
  StateField,
} from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

/**
 * Generic fenced-code **block renderer** plumbing.
 *
 * A mod registers a renderer for a fenced-code language (e.g. `dataview`,
 * `mermaid`). When a note contains such a block, its live output is shown as a
 * widget right below the fence — the source text is never rewritten, so it
 * survives sync/export untouched. This file owns only the CodeMirror lifecycle;
 * the actual rendering is whatever the mod's `render` does.
 *
 * See MOD_API.md and `src/mods/dataview` for a worked example.
 */

export interface BlockRenderContext {
  /** Container element to render into (already attached when `render` runs). */
  el: HTMLElement;
  /** The fenced block's source, without the ``` fences. */
  source: string;
  /** True when this render replaces earlier output in the same `el` — i.e. the
   * user edited the block. Renderers use it to debounce expensive work. */
  rerender: boolean;
  /** Subscribe to "the folder changed"; returns an unsubscribe. */
  onInvalidate(cb: () => void): () => void;
  /** Ask the editor to re-measure after async/layout changes. */
  requestMeasure(): void;
}

export interface BlockRendererSpec {
  /** Fenced-code language this renderer handles, e.g. `"dataview"`. */
  lang: string;
  /**
   * Leave the previous output in `ctx.el` when re-rendering an edited block,
   * instead of clearing it first. For a renderer that resolves asynchronously
   * this keeps the old output on screen until the new one is ready, so the
   * block does not collapse and re-expand on every keystroke — at the cost of
   * having to replace its own content rather than append to it.
   */
  retain?: boolean;
  /** Fill `ctx.el`; optionally return a cleanup run when the widget is torn down. */
  render(ctx: BlockRenderContext): void | (() => void);
}

/** Host-side state the editor extension reads: the registered renderers and a
 * single folder-change subscription shared by every widget. */
export interface BlockRenderRuntime {
  specs: Map<string, BlockRendererSpec>; // lowercase lang → spec
  onInvalidate(cb: () => void): () => void;
}

const FENCE_LANG = /^(`{3,}|~{3,})\s*([A-Za-z0-9_-]+)\s*$/;

/** Teardown for the renderer currently mounted in a widget's wrapper. Kept off
 * the element so a mod's `replaceChildren()` can never disturb it. */
const teardowns = new WeakMap<HTMLElement, () => void>();

class BlockWidget extends WidgetType {
  constructor(
    private readonly lang: string,
    private readonly src: string,
    private readonly rt: BlockRenderRuntime,
    /** true when this widget stands *in place of* the source (live preview),
     * which is the only case that needs a way back to the text */
    private readonly replacing = false,
  ) {
    super();
  }

  eq(other: BlockWidget) {
    return (
      other.lang === this.lang && other.src === this.src && other.replacing === this.replacing
    );
  }

  toDOM(view: EditorView) {
    const box = document.createElement("div");
    box.className = "block-widget";
    if (!this.rt.specs.has(this.lang)) return box;
    // the mod owns its own element and may replaceChildren() on it at any
    // time (dataview re-renders when its query resolves) — so the edit button
    // lives on the wrapper, out of reach
    const target = document.createElement("div");
    box.appendChild(target);
    this.mount(box, target, view, false);
    if (this.replacing) box.appendChild(this.editButton(view));
    return box;
  }

  /**
   * Adopt the DOM of the *same* block one edit ago instead of building a new
   * widget from scratch.
   *
   * Without this, typing inside a fence throws the rendered output away and
   * rebuilds it on every keystroke — a large mermaid diagram disappears,
   * relayouts and reappears each time. CodeMirror offers any unclaimed tile of
   * the same class, so this refuses anything that isn't the same language and
   * placement: a mermaid block must never inherit a dataview block's output.
   */
  updateDOM(dom: HTMLElement, view: EditorView, old: WidgetType) {
    if (!(old instanceof BlockWidget)) return false;
    if (old.lang !== this.lang || old.replacing !== this.replacing) return false;
    const target = dom.firstElementChild;
    if (!(target instanceof HTMLElement)) return false; // no renderer was mounted
    teardowns.get(dom)?.();
    teardowns.delete(dom);
    const spec = this.rt.specs.get(this.lang);
    if (!spec) return false;
    if (!spec.retain) target.replaceChildren();
    this.mount(dom, target, view, true);
    return true;
  }

  private mount(box: HTMLElement, target: HTMLElement, view: EditorView, rerender: boolean) {
    const spec = this.rt.specs.get(this.lang);
    if (!spec) return;
    const ctx: BlockRenderContext = {
      el: target,
      source: this.src,
      rerender,
      onInvalidate: this.rt.onInvalidate,
      requestMeasure: () => view.requestMeasure(),
    };
    const cleanup = spec.render(ctx);
    if (cleanup) teardowns.set(box, cleanup);
  }

  /**
   * The way back into a block whose source has been replaced.
   *
   * Without this a rendered block is a dead end: the lines are not drawn, so
   * there is nothing to click and arrow keys step over the whole thing. The
   * button drops the caret on the first line of the body, which reveals the
   * source (the field rebuilds on every selection change).
   */
  private editButton(view: EditorView): HTMLElement {
    const btn = document.createElement("button");
    btn.className = "block-edit";
    btn.type = "button";
    btn.textContent = this.lang;
    btn.title = `Edit this ${this.lang} block`;
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const at = view.posAtDOM(btn); // start of the opening fence line
      const doc = view.state.doc;
      const openLine = doc.lineAt(at);
      const body = Math.min(openLine.number + 1, doc.lines);
      view.dispatch({ selection: { anchor: doc.line(body).from }, scrollIntoView: true });
      view.focus();
    });
    return btn;
  }

  destroy(dom: HTMLElement) {
    teardowns.get(dom)?.();
    teardowns.delete(dom);
  }
}

/**
 * Where a mod-rendered fenced block sits, and whether the caret is in it.
 * `body` is the source between the fences; `from`/`to` span whole lines, which
 * is what a block-level replacement requires.
 */
interface FencedBlock {
  lang: string;
  body: string;
  from: number;
  to: number;
}

function findBlocks(state: EditorState, rt: BlockRenderRuntime): FencedBlock[] {
  const doc = state.doc;
  const out: FencedBlock[] = [];
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "FencedCode") return;
      const openLine = doc.lineAt(node.from);
      const m = FENCE_LANG.exec(openLine.text.trim());
      const lang = m?.[2].toLowerCase();
      if (!lang || !rt.specs.has(lang)) return false;
      const closeLine = doc.lineAt(node.to);
      const body = doc.sliceString(
        Math.min(openLine.to + 1, node.to),
        closeLine.from,
      );
      out.push({ lang, body: body.trim(), from: openLine.from, to: closeLine.to });
      return false; // nothing inside a fence needs visiting
    },
  });
  return out;
}

/**
 * Decorations for every registered block language in the document.
 *
 * Source mode hangs the rendered output *below* the fence, leaving the source
 * on screen. Live preview replaces the fence and its body outright, so a note
 * full of `mermaid`/`dataview` blocks reads as the diagrams and tables they
 * produce — until the caret moves into one, which brings its source back.
 */
function buildBlocks(state: EditorState, rt: BlockRenderRuntime, live: boolean): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const block of findBlocks(state, rt)) {
    const editing =
      live &&
      state.selection.ranges.some((sel) => sel.to >= block.from && sel.from <= block.to);
    if (live && !editing) {
      const widget = new BlockWidget(block.lang, block.body, rt, true);
      ranges.push(Decoration.replace({ widget, block: true }).range(block.from, block.to));
    } else {
      // inline widget styled display:block (like image embeds) — side 1 puts
      // it after the closing fence
      const widget = new BlockWidget(block.lang, block.body, rt);
      ranges.push(Decoration.widget({ widget, side: 1 }).range(block.to, block.to));
    }
  }
  return Decoration.set(ranges, true);
}

/**
 * CodeMirror extension that renders every registered block language.
 *
 * This is a `StateField` rather than a view plugin because a live-preview
 * replacement covers whole lines, and only a state field may provide those.
 * The cost is that it looks at the whole document instead of the viewport —
 * acceptable, since it stops at each fence rather than descending into it.
 */
export function blockRenderers(rt: BlockRenderRuntime, live = false): Extension {
  return StateField.define<DecorationSet>({
    create: (state) => buildBlocks(state, rt, live),
    update(deco, tr) {
      // a selection move matters in live mode: it decides whether the block
      // shows its source. The tree comparison catches background parsing
      // finishing a long document after the edit that triggered it.
      if (
        !tr.docChanged &&
        !tr.selection &&
        syntaxTree(tr.startState) === syntaxTree(tr.state)
      ) {
        return deco;
      }
      return buildBlocks(tr.state, rt, live);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
