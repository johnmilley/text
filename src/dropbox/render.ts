/**
 * Client-side markdown → HTML for the web build, mirroring the contract of
 * src-tauri/src/render.rs: wikilinks come out as `<a data-wikilink>`, local
 * link targets as `<a data-path>`, embeds as `<img data-embed>` or
 * `data-path` attachment links, and headings get slugified ids so
 * [[note#section]] anchors land. The consumer (preview pane, mods) resolves
 * the data-* placeholders against the open folder, same as on desktop.
 */

import { Marked, type RendererThis, type Tokens, type TokenizerThis } from "marked";

let singleLineBreaks = false;
export const setSingleLineBreaks = (v: boolean): void => {
  singleLineBreaks = v;
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|ico|avif|tiff?|svg)$/i;

/** Same rules as render.rs slugify: alphanumerics keep, runs of the rest → -. */
export function slugify(text: string): string {
  let out = "";
  let dash = true; // suppress leading dashes
  for (const c of text) {
    if (/[\p{L}\p{N}]/u.test(c)) {
      out += c.toLowerCase();
      dash = false;
    } else if (!dash) {
      out += "-";
      dash = true;
    }
  }
  return out.replace(/-+$/, "");
}

/** Port of render.rs preview_embed_html — see there for the contract. */
function embedHtml(dest: string, alt: string, wiki: boolean): string {
  let target = dest.trim();
  let width: string | null = null;
  if (wiki) {
    // wikilink embeds carry a |modifier: a number is a width, otherwise alt
    const w = alt.trim();
    if (w && /^[0-9]+$/.test(w)) width = w;
  }
  if (target.startsWith("http:") || target.startsWith("https:") || target.startsWith("data:")) {
    return `<img src="${esc(target)}" alt="${esc(alt)}" loading="lazy">`;
  }
  if (IMAGE_RE.test(target)) {
    const style = width ? ` style="max-width:${width}px"` : "";
    return `<img data-embed="${esc(target)}" alt="${esc(alt)}"${style}>`;
  }
  const label =
    alt === "" || /^[0-9]+$/.test(alt) ? (target.split("/").pop() ?? target) : alt;
  return `<a class="wikilink attachment" href="#" data-path="${esc(target)}">${esc(label)}</a>`;
}

interface WikiToken extends Tokens.Generic {
  target: string;
  label: string;
}

const wikiEmbed = {
  name: "wikiembed",
  level: "inline" as const,
  start: (src: string) => src.indexOf("!["),
  tokenizer(src: string): WikiToken | undefined {
    const m = /^!\[\[([^\][|]+?)(?:\|([^\][]*))?\]\]/.exec(src);
    if (!m) return undefined;
    return { type: "wikiembed", raw: m[0], target: m[1], label: m[2] ?? "" };
  },
  renderer: (t: Tokens.Generic) => embedHtml((t as WikiToken).target, (t as WikiToken).label, true),
};

const wikiLink = {
  name: "wikilink",
  level: "inline" as const,
  start: (src: string) => src.indexOf("[["),
  tokenizer(src: string): WikiToken | undefined {
    const m = /^\[\[([^\][|]+?)(?:\|([^\][]*))?\]\]/.exec(src);
    if (!m) return undefined;
    const target = m[1].trim();
    return { type: "wikilink", raw: m[0], target, label: (m[2] ?? m[1]).trim() || target };
  },
  renderer: (t: Tokens.Generic) => {
    const { target, label } = t as WikiToken;
    // keep the whole `target#anchor` so consumers can deep-link
    return `<a class="wikilink" href="#" data-wikilink="${esc(target)}">${esc(label)}</a>`;
  },
};

// ==highlighted== → <mark>, mirroring render.rs's add_highlights: the markers
// must hug the content (`a == b` stays literal), inline formatting nests.
const mdHighlight = {
  name: "mdhighlight",
  level: "inline" as const,
  start: (src: string) => src.indexOf("=="),
  tokenizer(this: TokenizerThis, src: string): Tokens.Generic | undefined {
    const m = /^==(\S(?:[^=\n]*\S)?)==/.exec(src);
    if (!m) return undefined;
    return { type: "mdhighlight", raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
  },
  renderer(this: RendererThis, t: Tokens.Generic): string {
    return `<mark>${this.parser.parseInline(t.tokens ?? [])}</mark>`;
  },
};

const md = new Marked({ gfm: true });
md.use({
  extensions: [wikiEmbed, wikiLink, mdHighlight],
  renderer: {
    image({ href, text }: Tokens.Image): string {
      return embedHtml(href, text, false);
    },
    link(token: Tokens.Link): string {
      const dest = token.href;
      const inner = this.parser.parseInline(token.tokens);
      const external = dest.startsWith("#") || dest.includes(":") || dest.startsWith("//");
      if (external) {
        const title = token.title ? ` title="${esc(token.title)}"` : "";
        return `<a href="${esc(dest)}"${title}>${inner}</a>`;
      }
      return `<a class="wikilink" href="#" data-path="${esc(dest)}">${inner}</a>`;
    },
    heading(token: Tokens.Heading): string {
      const inner = this.parser.parseInline(token.tokens);
      return `<h${token.depth} id="${slugify(token.text)}">${inner}</h${token.depth}>\n`;
    },
  },
});

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/;

export function renderPreview(text: string): string {
  const body = text.replace(FRONTMATTER_RE, "");
  return md.parse(body, { breaks: singleLineBreaks, async: false });
}
