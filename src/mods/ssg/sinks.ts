/**
 * Sinks: where a generated site goes. Both consume the same
 * {@link OutputFile}[] from render.ts — they differ only in the destination.
 *
 *   local  → write the tree into a folder the user picks
 *   pdf    → assemble one self-contained page and open the print dialog
 */

import type { TextAPI } from "../types";
import type { OutputFile } from "./render";
import { buildToc, readingOrder, type Site, sortedDirs, sortedNotes, type TocNode } from "./site";

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
 * Build one self-contained HTML document — title page, linked contents, then
 * every note in reading order (the same spine the HTML site uses), CSS
 * inlined, images as data URIs, cross-note links turned into in-document
 * anchors — and hand it to the browser's print dialog (→ "Save as PDF").
 */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The contents as nested lists of in-document anchors. */
function tocAnchorsHtml(node: TocNode): string {
  let out = "<ol class=\"toc\">";
  for (const nt of sortedNotes(node)) {
    out += `<li><a href="#${anchorId(nt.out)}">${escapeHtml(nt.title)}</a></li>`;
  }
  for (const [name, child] of sortedDirs(node)) {
    out += `<li class="toc-section"><span>${escapeHtml(name)}</span>`;
    out += tocAnchorsHtml(child);
    out += "</li>";
  }
  return out + "</ol>";
}

export async function emitPdf(
  app: TextAPI,
  files: OutputFile[],
  site: Site,
  title: string,
): Promise<void> {
  // inline the generated stylesheets (the user's _export.css included)
  const css =
    (files.find((f) => f.path === "_assets/style.css")?.text ?? "") +
    "\n" +
    (files.find((f) => f.path === "_assets/custom.css")?.text ?? "");
  const byPath = new Map(files.map((f) => [f.path, f] as const));

  // the front contents and the section order both come from the shared spine
  const tocHtml = tocAnchorsHtml(buildToc(site));
  const order = readingOrder(site).map((p) => p.out);

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

  const date = new Date().toISOString().slice(0, 10);
  const docHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>${css}
main{max-width:none}
</style></head><body><main><article>
<section class="pdf-title"><h1>${escapeHtml(title)}</h1><p class="pdf-date">${date}</p></section>
<section class="pdf-toc"><h2>Contents</h2>${tocHtml}</section>
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
