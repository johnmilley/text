import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder, type Extension } from "@codemirror/state";
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
  /** Subscribe to "the folder changed"; returns an unsubscribe. */
  onInvalidate(cb: () => void): () => void;
  /** Ask the editor to re-measure after async/layout changes. */
  requestMeasure(): void;
}

export interface BlockRendererSpec {
  /** Fenced-code language this renderer handles, e.g. `"dataview"`. */
  lang: string;
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

class BlockWidget extends WidgetType {
  constructor(
    private readonly lang: string,
    private readonly src: string,
    private readonly rt: BlockRenderRuntime,
  ) {
    super();
  }

  eq(other: BlockWidget) {
    return other.lang === this.lang && other.src === this.src;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("div");
    box.className = "block-widget";
    const spec = this.rt.specs.get(this.lang);
    if (!spec) return box;
    const ctx: BlockRenderContext = {
      el: box,
      source: this.src,
      onInvalidate: this.rt.onInvalidate,
      requestMeasure: () => view.requestMeasure(),
    };
    const cleanup = spec.render(ctx);
    if (cleanup) box.addEventListener("block-destroy", cleanup as EventListener);
    return box;
  }

  destroy(dom: HTMLElement) {
    dom.dispatchEvent(new Event("block-destroy"));
  }
}

function buildBlocks(view: EditorView, rt: BlockRenderRuntime): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  for (const range of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from: range.from,
      to: range.to,
      enter(node) {
        if (node.name !== "FencedCode") return;
        const open = doc.lineAt(node.from).text.trim();
        const m = FENCE_LANG.exec(open);
        const lang = m?.[2].toLowerCase();
        if (!lang || !rt.specs.has(lang)) return;
        const src = doc.sliceString(
          Math.min(doc.lineAt(node.from).to + 1, node.to),
          doc.lineAt(node.to).from,
        );
        // inline widget styled display:block (like image embeds) — view
        // plugins may not contribute true block decorations
        builder.add(
          node.to,
          node.to,
          Decoration.widget({ widget: new BlockWidget(lang, src.trim(), rt), side: 1 }),
        );
      },
    });
  }
  return builder.finish();
}

/** CodeMirror extension that renders every registered block language. */
export function blockRenderers(rt: BlockRenderRuntime): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildBlocks(view, rt);
      }
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          syntaxTree(update.state) !== syntaxTree(update.startState)
        ) {
          this.decorations = buildBlocks(update.view, rt);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}
