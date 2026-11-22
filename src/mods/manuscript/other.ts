/**
 * The two simple outputs:
 *
 *   markdown — the whole book as one .md file (frontmatter + `#` chapters,
 *              `* * *` scene breaks): hand it to pandoc, an editor, an LLM…
 *   print    — the book laid out as pages (title page, each chapter on a new
 *              page) through the system print dialog → "Save as PDF".
 */

import { chapterHeading, type Chapter, type Settings } from "./model";
import { BOOK_CSS, cleanScene } from "./epub";

/** Obsidian-isms → plain CommonMark: note links become their text, embeds
 * become standard images. */
const portable = (md: string) =>
  md
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_m, t: string) => `![](${encodeURI(t.trim())})`)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]#|]+)(#[^\]]*)?\]\]/g, "$1");

const yamlStr = (s: string) => JSON.stringify(s); // JSON strings are valid YAML

export function buildMarkdown(s: Settings, chapters: Chapter[]): string {
  const author = s.penName || s.author;
  const out: string[] = ["---", `title: ${yamlStr(s.title)}`];
  if (author) out.push(`author: ${yamlStr(author)}`);
  out.push(`lang: ${yamlStr(s.language || "en")}`, "---", "");
  chapters.forEach((ch, ci) => {
    const { label, title } = chapterHeading(ch, ci + 1, s);
    out.push(`# ${[label, title].filter(Boolean).join(": ")}`, "");
    ch.scenes.forEach((sc, si) => {
      if (si > 0) out.push("* * *", "");
      out.push(portable(sc.body.trim()), "");
    });
  });
  return out.join("\n");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Book pages for the print dialog. Images are inlined as data URIs so the
 * printed document has nothing to fetch. */
export async function buildPrintHtml(
  s: Settings,
  chapters: Chapter[],
  html: string[][],
  dataUri: (target: string) => Promise<string | null>,
): Promise<string> {
  const author = s.penName || s.author;
  const breakText = !s.sceneBreak || s.sceneBreak === "#" ? "* * *" : s.sceneBreak;
  const size = s.paper === "a4" ? "A4" : "letter";
  let body = `<section class="title-page"><h1>${esc(s.title)}</h1>${author ? `<p class="by">${esc(author)}</p>` : ""}</section>`;
  for (const [ci, ch] of chapters.entries()) {
    const { label, title } = chapterHeading(ch, ci + 1, s);
    body += `<section class="chapter">`;
    if (label && title) body += `<p class="chapter-number">${esc(label)}</p>`;
    body += `<h1>${esc(title ?? label ?? "")}</h1>`;
    for (const [si, sceneHtml] of html[ci].entries()) {
      if (si > 0) body += `<p class="scene-break">${esc(breakText)}</p>`;
      body += await cleanScene(sceneHtml, dataUri);
    }
    body += "</section>";
  }
  return `<!doctype html><html lang="${esc(s.language || "en")}"><head><meta charset="utf-8"><title>${esc(s.title)}</title><style>
${BOOK_CSS}
@page { size: ${size}; margin: 0.9in 0.85in; }
body { margin: 0; font-family: "${s.font === "Courier New" ? "Georgia" : s.font}", Georgia, serif; font-size: 11.5pt; color: #000; }
.title-page { break-after: page; }
.chapter { break-before: page; }
.chapter > h1:first-child, .chapter > .chapter-number:first-child { margin-top: 2.2in; }
p { orphans: 2; widows: 2; }
h1, h2, h3, .chapter-number { break-after: avoid; }
</style></head><body>${body}</body></html>`;
}

/** Hand an HTML document to the print dialog via a hidden iframe. */
export function printHtml(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;");
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument!;
  idoc.open();
  idoc.write(html);
  idoc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 2000);
    }
  }, 400);
}
