/**
 * Mermaid mod — diagrams from ```mermaid fences, rendered as SVG below the
 * fence in the editor and the preview pane (via registerBlockRenderer; the
 * source text is never rewritten). The ssg mod calls {@link renderMermaidSvg}
 * at export time, so published HTML/PDF carry static SVG with no script.
 *
 * The mermaid library is heavy, so it loads on demand the first time a
 * diagram actually renders and lands in its own lazy chunk.
 */

import type { Mod, TextAPI } from "../types";

type MermaidApi = typeof import("mermaid").default;

let lib: Promise<MermaidApi> | null = null;
const mermaid = (): Promise<MermaidApi> => {
  lib ??= import("mermaid").then((m) => {
    m.default.initialize({ startOnLoad: false, securityLevel: "strict" });
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
  m.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: theme ?? (uiIsDark() ? "dark" : "default"),
  });
  const { svg } = await m.render(`mermaid-${++seq}`, source);
  return svg;
}

export const mermaidMod: Mod = {
  id: "mermaid",
  name: "Mermaid diagrams",
  activate(app: TextAPI) {
    app.registerBlockRenderer({
      lang: "mermaid",
      render(ctx) {
        ctx.el.classList.add("mermaid-block");
        let alive = true;
        void renderMermaidSvg(ctx.source)
          .then((svg) => {
            if (!alive) return;
            ctx.el.innerHTML = svg;
            ctx.requestMeasure();
          })
          .catch((err: unknown) => {
            if (!alive) return;
            const box = document.createElement("div");
            box.className = "mermaid-error";
            box.textContent = `mermaid: ${err instanceof Error ? err.message : err}`;
            ctx.el.replaceChildren(box);
            ctx.requestMeasure();
          });
        return () => {
          alive = false;
        };
      },
    });
  },
};
