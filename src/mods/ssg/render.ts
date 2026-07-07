/**
 * Turn a {@link Site} into a set of output files: rendered note pages (with
 * wikilinks/embeds resolved), copied assets, generated folder listings, and
 * the shared CSS/highlight assets.
 *
 * Markdown → HTML is done by the host renderer (TextAPI.render.markdownToHtml),
 * which hands back `data-wikilink` / `data-path` / `data-embed` placeholders.
 * We resolve those against the site map here, in the DOM.
 */

import type { TextAPI } from "../types";
import {
  baseOf,
  buildToc,
  dirOf,
  readingOrder,
  relHref,
  resolve,
  resolveNote,
  rootPrefix,
  type Site,
  type SrcFile,
  sanitizeComponent,
  slugify,
  sortedDirs,
  sortedNotes,
  stemOf,
  type TocNode,
  tocPath,
} from "./site";

import pageTemplate from "./assets/page.html?raw";
import siteCss from "./assets/style.css?raw";
import hljsCss from "./assets/highlight.css?raw";
import hljsJs from "./assets/highlight.min.js?raw";

export interface OutputFile {
  path: string; // output rel path
  text?: string; // text content, OR
  copyFrom?: string; // absolute source path to copy verbatim
}

const htmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Replace every `{{token}}` occurrence without touching the rest. */
const fill = (tpl: string, token: string, value: string) => tpl.split(`{{${token}}}`).join(value);

// ------------------------------------------------------------ note rendering

/** Resolve the renderer's placeholders to static links for one note page. */
function resolveLinks(site: Site, body: HTMLElement, pageOut: string, srcDir: string) {
  // [[wikilinks]] → relative page links (or a broken-link span)
  for (const a of Array.from(body.querySelectorAll<HTMLAnchorElement>("a[data-wikilink]"))) {
    const raw = a.dataset.wikilink ?? "";
    const [target, anchor] = raw.split("#", 2);
    const to = target.trim() === "" ? pageOut : resolveNote(site, target);
    if (to) {
      let href = relHref(pageOut, to);
      if (anchor) href += `#${slugify(anchor)}`;
      a.setAttribute("href", href);
      delete a.dataset.wikilink;
      a.classList.remove("wikilink");
    } else {
      const span = document.createElement("span");
      span.className = "broken-link";
      span.append(...Array.from(a.childNodes));
      a.replaceWith(span);
    }
  }
  // ordinary local links + attachment embeds carry data-path
  for (const a of Array.from(body.querySelectorAll<HTMLAnchorElement>("a[data-path]"))) {
    const dest = a.dataset.path ?? "";
    const to = resolve(site, dest, srcDir);
    a.setAttribute("href", to ? relHref(pageOut, to) : dest);
    if (to && a.classList.contains("attachment")) {
      // keep .attachment styling, drop the in-app wikilink class
      a.classList.remove("wikilink");
    } else {
      a.classList.remove("wikilink");
    }
    delete a.dataset.path;
  }
  // ![[image]] embeds
  for (const img of Array.from(body.querySelectorAll<HTMLImageElement>("img[data-embed]"))) {
    const target = img.dataset.embed ?? "";
    const to = resolve(site, target, srcDir);
    if (to) {
      img.setAttribute("src", relHref(pageOut, to));
      img.removeAttribute("data-embed");
    } else {
      const span = document.createElement("span");
      span.className = "broken-link";
      span.textContent = `missing: ${target}`;
      img.replaceWith(span);
    }
  }
}

async function renderNote(
  app: TextAPI,
  site: Site,
  file: SrcFile,
  nav: boolean,
): Promise<string> {
  const text = await app.fs.readText(file.path);
  const html = await app.render.markdownToHtml(text);
  const pageOut = site.outOf.get(file.rel)!;
  const srcDir = dirOf(file.rel);

  const doc = new DOMParser().parseFromString(html, "text/html");
  resolveLinks(site, doc.body, pageOut, srcDir);

  const title = stemOf(baseOf(file.rel));
  return assemble(site, title, doc.body.innerHTML, pageOut, nav);
}

/** Fill the page template: breadcrumb running head, content, prev/next.
 * `nav` off (single-note export) leaves only the content and theme toggle. */
function assemble(
  site: Site,
  title: string,
  content: string,
  pageOut: string,
  nav: boolean,
): string {
  let out = pageTemplate;
  out = fill(out, "root", rootPrefix(pageOut));
  out = fill(out, "title", htmlEscape(title));
  out = fill(out, "crumbs", nav ? crumbsHtml(site, title, pageOut) : htmlEscape(title));
  out = fill(out, "pagenav", nav ? pagenavHtml(site, pageOut) : "");
  out = fill(out, "content", content); // last: content may contain "{{...}}"
  return out;
}

// ------------------------------------------------- running head + spine

/** Breadcrumb trail: contents › folder › … › page. The first crumb is the
 * contents page, so the way back to the ToC is always in the running head. */
function crumbsHtml(site: Site, title: string, pageOut: string): string {
  const toc = tocPath(site);
  const parts: string[] = [];
  if (pageOut === toc) return `<span class="here">${htmlEscape(site.title)}</span>`;
  parts.push(`<a href="${relHref(pageOut, toc)}">${htmlEscape(site.title)}</a>`);
  const dirs = dirOf(pageOut) === "" ? [] : dirOf(pageOut).split("/");
  for (let i = 0; i < dirs.length; i++) {
    const sectionIndex = `${dirs.slice(0, i + 1).join("/")}/index.html`;
    const label = htmlEscape(dirs[i]);
    // don't link a folder crumb to the page it's already on
    parts.push(
      sectionIndex === pageOut
        ? `<span class="here">${label}</span>`
        : `<a href="${relHref(pageOut, sectionIndex)}">${label}</a>`,
    );
  }
  if (!pageOut.endsWith("/index.html") || dirs.length === 0) {
    parts.push(`<span class="here">${htmlEscape(title)}</span>`);
  }
  return parts.join('<span class="sep">›</span>');
}

/** Previous/next along the reading order (the ToC top to bottom). */
function pagenavHtml(site: Site, pageOut: string): string {
  const order = readingOrder(site);
  const i = order.findIndex((p) => p.out === pageOut);
  if (i < 0 || order.length < 2) return "";
  const prev = order[i - 1];
  const next = order[i + 1];
  let out = '<nav class="pagenav">';
  if (prev) {
    out += `<a class="prev" href="${relHref(pageOut, prev.out)}"><span class="dir">previous</span>${htmlEscape(prev.title)}</a>`;
  }
  if (next) {
    out += `<a class="next" href="${relHref(pageOut, next.out)}"><span class="dir">next</span>${htmlEscape(next.title)}</a>`;
  }
  return out + "</nav>";
}

// ---------------------------------------------------------- contents pages

/** The exported tree as a linked, nested contents list. Folders link to
 * their section page (a README-claimed index or the generated one). */
function tocListHtml(node: TocNode, fromOut: string, dirOut: string): string {
  let out = '<ol class="toc">';
  for (const nt of sortedNotes(node)) {
    if (nt.out === fromOut) {
      // the section page itself (README-as-index) — no self link
      continue;
    }
    out += `<li><a href="${relHref(fromOut, nt.out)}">${htmlEscape(nt.title)}</a></li>`;
  }
  for (const [name, child] of sortedDirs(node)) {
    const childDir = dirOut === "" ? sanitizeComponent(name) : `${dirOut}/${sanitizeComponent(name)}`;
    out += `<li class="toc-section"><a href="${relHref(fromOut, `${childDir}/index.html`)}">${htmlEscape(name)}</a>`;
    out += tocListHtml(child, fromOut, childDir);
    out += "</li>";
  }
  return out + "</ol>";
}

/** Contents pages: the root ToC always exists (index.html, or contents.html
 * when a root README claimed index.html); folders without an index note get
 * a section contents page of their own subtree. */
function contentsPages(site: Site): OutputFile[] {
  const pages: OutputFile[] = [];
  const taken = new Set(site.outOf.values());
  const root = buildToc(site);

  const rootOut = tocPath(site);
  const rootBody =
    `<h1>${htmlEscape(site.title)}</h1>` + tocListHtml(root, rootOut, "");
  pages.push({ path: rootOut, text: assemble(site, site.title, rootBody, rootOut, true) });

  const visit = (dirOut: string, name: string, node: TocNode) => {
    const indexRel = `${dirOut}/index.html`;
    if (!taken.has(indexRel)) {
      const body = `<h1>${htmlEscape(name)}</h1>` + tocListHtml(node, indexRel, dirOut);
      pages.push({ path: indexRel, text: assemble(site, name, body, indexRel, true) });
    }
    for (const [child, childNode] of node.dirs) {
      const clean = sanitizeComponent(child);
      visit(`${dirOut}/${clean}`, child, childNode);
    }
  };
  for (const [name, node] of root.dirs) visit(sanitizeComponent(name), name, node);
  return pages;
}

// ------------------------------------------------------------ whole site

/** Build every output file for the site (pages, contents pages, assets).
 * `listings` (default true) adds the ToC page, per-folder contents pages,
 * breadcrumbs, and prev/next; a single-note export turns it all off. */
export async function generateSite(
  app: TextAPI,
  site: Site,
  opts: { listings?: boolean } = {},
): Promise<OutputFile[]> {
  const nav = opts.listings !== false;

  // an _export.css at the vault root restyles the whole export — the page
  // template always links _assets/custom.css, empty when the file is absent
  let custom = "";
  try {
    custom = await app.fs.readText(`${site.root}/_export.css`);
  } catch {
    /* none — ship the default look */
  }

  const out: OutputFile[] = [
    { path: "_assets/style.css", text: siteCss },
    { path: "_assets/custom.css", text: custom },
    { path: "_assets/highlight.css", text: hljsCss },
    { path: "_assets/highlight.min.js", text: hljsJs },
  ];

  for (const f of site.files) {
    const outRel = site.outOf.get(f.rel)!;
    if (f.note) {
      out.push({ path: outRel, text: await renderNote(app, site, f, nav) });
    } else {
      out.push({ path: outRel, copyFrom: f.path });
    }
  }

  if (nav) out.push(...contentsPages(site));
  return out;
}
