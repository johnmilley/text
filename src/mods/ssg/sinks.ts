/**
 * Sinks: where a generated site goes. Both consume the same
 * {@link OutputFile}[] from render.ts — they differ only in the destination.
 *
 *   local  → write the tree into a folder the user picks
 *   pdf    → assemble one self-contained page and open the print dialog
 */

import type { TextAPI } from "../types";
import type { OutputFile } from "./render";
import { nameOrder, type Site, stemOf } from "./site";

export type Progress = (msg: string) => void;

const join = (dir: string, rel: string) => `${dir.replace(/\/$/, "")}/${rel}`;



// ------------------------------------------------------------ local folder

export async function emitLocal(
  app: TextAPI,
  files: OutputFile[],
  destRoot: string,
  progress?: Progress,
): Promise<void> {
  let n = 0;
  for (const f of files) {
    const dest = join(destRoot, f.path);
    if (f.text !== undefined) await app.fs.writeText(dest, f.text);
    else if (f.copyFrom) await app.fs.copyFile(f.copyFrom, dest);
    progress?.(`writing ${++n}/${files.length}…`);
  }
}

// ------------------------------------------------------------ pdf (print)

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  avif: "image/avif",
};

/**
 * Build one self-contained HTML document — every note in nav order, the CSS
 * inlined, images as data URIs, cross-note wikilinks turned into in-document
 * anchors — then hand it to the browser's print dialog (→ "Save as PDF").
 */
interface TocNode {
  dirs: Map<string, TocNode>;
  notes: { title: string; out: string }[];
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Folder → note structure for the table of contents (notes only — no assets,
 * no generated listing pages). */
function buildToc(site: Site): TocNode {
  const root: TocNode = { dirs: new Map(), notes: [] };
  for (const f of site.files) {
    if (!f.note) continue;
    const out = site.outOf.get(f.rel)!;
    const parts = f.rel.split("/");
    let node = root;
    for (const seg of parts.slice(0, -1)) {
      let child = node.dirs.get(seg);
      if (!child) node.dirs.set(seg, (child = { dirs: new Map(), notes: [] }));
      node = child;
    }
    node.notes.push({ title: stemOf(parts[parts.length - 1]), out });
  }
  return root;
}

/** Render the ToC as nested lists and collect the note reading order. */
function renderToc(node: TocNode, html: string[], order: string[]) {
  for (const nt of [...node.notes].sort((a, b) => nameOrder(a.title, b.title))) {
    html.push(`<li><a href="#${anchorId(nt.out)}">${escapeHtml(nt.title)}</a></li>`);
    order.push(nt.out);
  }
  for (const [name, child] of [...node.dirs.entries()].sort((a, b) => nameOrder(a[0], b[0]))) {
    html.push(`<li class="toc-dir">${escapeHtml(name)}<ul>`);
    renderToc(child, html, order);
    html.push("</ul></li>");
  }
}

export async function emitPdf(
  app: TextAPI,
  files: OutputFile[],
  site: Site,
  title: string,
): Promise<void> {
  // pull the inlined stylesheet out of the generated assets
  const css = files.find((f) => f.path === "_assets/style.css")?.text ?? "";
  const byPath = new Map(files.map((f) => [f.path, f] as const));

  // a front table of contents (folders → note filenames) sets the order; the
  // generated folder-listing pages and copied assets are left out entirely
  const tocHtml: string[] = [];
  const order: string[] = [];
  renderToc(buildToc(site), tocHtml, order);

  const parser = new DOMParser();
  const sections: string[] = [];
  for (const out of order) {
    const f = byPath.get(out);
    if (!f?.text) continue;
    const doc = parser.parseFromString(f.text, "text/html");
    const article = doc.querySelector("article");
    if (!article) continue;
    // inline images as data URIs so the print has no external dependencies
    for (const img of Array.from(article.querySelectorAll("img"))) {
      const src = img.getAttribute("src") ?? "";
      const copy = resolveCopy(files, out, src);
      if (copy) {
        const ext = (copy.split(".").pop() ?? "").toLowerCase();
        try {
          const b64 = await app.fs.readBase64(copy);
          img.setAttribute("src", `data:${MIME[ext] ?? "application/octet-stream"};base64,${b64}`);
        } catch {
          /* drop unreadable image */
        }
      }
    }
    // internal page links → in-document anchors
    for (const a of Array.from(article.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
      const href = a.getAttribute("href") ?? "";
      if (/^[a-z]+:|^#|^\/\//i.test(href)) continue; // external / in-page
      const target = resolveOut(out, href.split("#")[0]);
      a.setAttribute("href", `#${anchorId(target)}`);
    }
    sections.push(`<section id="${anchorId(out)}" class="pdf-page">${article.innerHTML}</section>`);
  }

  const docHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>${css}
.pdf-page{break-after:page;padding:0 0 2rem}
.pdf-toc{break-after:page;padding:0 0 2rem}
.pdf-toc h1{margin-top:0}
.pdf-toc ul{list-style:none;padding-left:1.2em}
.pdf-toc > ul{padding-left:0}
.pdf-toc .toc-dir{font-weight:600;margin-top:.35em}
.pdf-toc .toc-dir > ul{font-weight:400}
.pdf-toc a{text-decoration:none}
main{max-width:none}
@media print{#sidebar,#nav-button,#theme-toggle{display:none}}
</style></head><body><main><article>
<section class="pdf-toc"><h1>${escapeHtml(title)}</h1><h2>Contents</h2><ul>${tocHtml.join("")}</ul></section>
${sections.join("\n")}</article></main></body></html>`;

  printViaIframe(docHtml);
}

/** Map an output href (relative to the page at `from`) back to an output rel. */
function resolveOut(from: string, href: string): string {
  const fromDir = from.includes("/") ? from.slice(0, from.lastIndexOf("/")) : "";
  const parts = (fromDir ? `${fromDir}/${href}` : href).split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(decodeURIComponent(p));
  }
  return stack.join("/");
}

/** Find the absolute source path that an output image href copies from. */
function resolveCopy(files: OutputFile[], from: string, src: string): string | null {
  const outRel = resolveOut(from, src);
  return files.find((f) => f.path === outRel && f.copyFrom)?.copyFrom ?? null;
}

const anchorId = (outRel: string) => "p-" + outRel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

function printViaIframe(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;");
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument!;
  idoc.open();
  idoc.write(html);
  idoc.close();
  // give the webview a tick to lay out images before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 2000);
    }
  }, 300);
}
