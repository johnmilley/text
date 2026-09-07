/**
 * Mermaid mod — diagrams from ```mermaid fences, rendered as SVG below the
 * fence in the editor and the preview pane (via registerBlockRenderer; the
 * source text is never rewritten). The ssg mod calls {@link renderMermaidSvg}
 * at export time, so published HTML/PDF carry static SVG with no script.
 *
 * The mermaid library is heavy, so it loads on demand the first time a
 * diagram actually renders and lands in its own lazy chunk.
 */

import type { BlockRenderContext, Mod, TextAPI } from "../types";

type MermaidApi = typeof import("mermaid").default;

/**
 * Mermaid's own failure mode is a full-page "Syntax error in text" bomb: on a
 * parse error it draws that graphic into a temp div on `document.body` and
 * then throws *before* cleaning it up, so every keystroke of a half-typed
 * diagram leaves another one stuck to the page. This flag makes it clean up
 * and throw instead, which is all we want — the block renderer below reports
 * the error itself, at the size of a line of text.
 */
const BASE = { startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true } as const;

/** How long a diagram being typed sits still before it is re-rendered. Mermaid
 * parses and lays out from scratch, so a keystroke-for-keystroke re-render is
 * both slow and visually noisy. */
const RETYPE_MS = 400;

let lib: Promise<MermaidApi> | null = null;
const mermaid = (): Promise<MermaidApi> => {
  lib ??= import("mermaid").then((m) => {
    m.default.initialize({ ...BASE });
    return m.default;
  });
  return lib;
};

let seq = 0;

/** True when the surrounding UI is dark — picks the diagram theme. */
function uiIsDark(): boolean {
  const bg = getComputedStyle(document.body).backgroundColor;
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg);
  if (!m) return false;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/**
 * Render mermaid source to an SVG string. `theme` defaults to matching the
 * app UI; exports pass "neutral" for print-clean diagrams. Throws on invalid
 * diagrams — callers decide how to degrade.
 */
export async function renderMermaidSvg(
  source: string,
  theme?: "default" | "dark" | "neutral",
): Promise<string> {
  const m = await mermaid();
  m.initialize({ ...BASE, theme: theme ?? (uiIsDark() ? "dark" : "default") });
  const { svg } = await m.render(`mermaid-${++seq}`, source);
  return svg;
}

/**
 * Report a diagram that would not render, without losing the one that did.
 *
 * Mid-edit a diagram is usually just unfinished, so the last good render stays
 * up (dimmed) with the message beneath it. That keeps the block roughly its
 * own size while you type, instead of collapsing to a single line and shoving
 * the rest of the note up the screen on every incomplete keystroke.
 */
function showError(ctx: BlockRenderContext, err: unknown) {
  const msg = document.createElement("div");
  msg.className = "mermaid-error";
  msg.textContent = `mermaid: ${err instanceof Error ? err.message : String(err)}`;
  const last = ctx.el.querySelector("svg");
  ctx.el.classList.toggle("mermaid-stale", !!last);
  ctx.el.replaceChildren(...(last ? [last, msg] : [msg]));
  ctx.requestMeasure();
}

export const mermaidMod: Mod = {
  id: "mermaid",
  name: "Mermaid diagrams",
  activate(app: TextAPI) {
    app.registerBlockRenderer({
      lang: "mermaid",
      retain: true, // the previous diagram stays up until the next one renders
      render(ctx) {
        ctx.el.classList.add("mermaid-block");
        let alive = true;
        const draw = () => {
          void renderMermaidSvg(ctx.source)
            .then((svg) => {
              if (!alive) return;
              ctx.el.classList.remove("mermaid-stale");
              ctx.el.innerHTML = svg;
              ctx.requestMeasure();
            })
            .catch((err: unknown) => {
              if (alive) showError(ctx, err);
            });
        };
        // a diagram appearing for the first time draws at once; one being
        // typed into waits for a pause in the typing
        const timer = ctx.rerender ? window.setTimeout(draw, RETYPE_MS) : (draw(), 0);
        return () => {
          alive = false;
          clearTimeout(timer);
        };
      },
    });
  },
};
