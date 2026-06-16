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
  dirOf,
  encodeHref,
  nameOrder,
  relHref,
  resolve,
  resolveNote,
  rootPrefix,
  type Site,
  type SrcFile,
  sanitizeComponent,
  slugify,
  stemOf,
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

async function renderNote(app: TextAPI, site: Site, file: SrcFile): Promise<string> {
  const text = await app.fs.readText(file.path);
  const html = await app.render.markdownToHtml(text);
  const pageOut = site.outOf.get(file.rel)!;
  const srcDir = dirOf(file.rel);

  const doc = new DOMParser().parseFromString(html, "text/html");
  resolveLinks(site, doc.body, pageOut, srcDir);

  const title = stemOf(baseOf(file.rel));
  return assemble(site, title, doc.body.innerHTML, pageOut);
}

function assemble(site: Site, title: string, content: string, pageOut: string): string {
  let out = pageTemplate;
  out = fill(out, "root", rootPrefix(pageOut));
  out = fill(out, "title", htmlEscape(title));
  out = fill(out, "share_title", htmlEscape(site.title));
  out = fill(out, "nav", navHtml(site, pageOut));
  out = fill(out, "comments", "");
  out = fill(out, "content", content); // last: content may contain "{{...}}"
  return out;
}

// ------------------------------------------------------------ nav + listings

interface NavNode {
  dirs: Map<string, NavNode>;
  files: [string, string][]; // [display, output rel]
}

const newNode = (): NavNode => ({ dirs: new Map(), files: [] });

function navTree(site: Site): NavNode {
  const root = newNode();
  for (const f of site.files) {
    if (!f.note) continue; // nav lists folders + note pages only, not assets
    const out = site.outOf.get(f.rel)!;
    const parts = f.rel.split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let child = node.dirs.get(part);
      if (!child) node.dirs.set(part, (child = newNode()));
      node = child;
    }
    node.files.push([stemOf(parts[parts.length - 1]), out]);
  }
  return root;
}

const sortedEntries = <T>(m: Map<string, T>): [string, T][] =>
  [...m.entries()].sort((a, b) => nameOrder(a[0], b[0]));

function holdsCurrent(node: NavNode, current: string): boolean {
  return (
    node.files.some(([, out]) => out === current) ||
    [...node.dirs.values()].some((d) => holdsCurrent(d, current))
  );
}

function navHtml(site: Site, current: string): string {
  const tree = navTree(site);
  const prefix = rootPrefix(current);
  const render = (node: NavNode): string => {
    let out = "<ul>";
    for (const [name, child] of sortedEntries(node.dirs)) {
      const open = holdsCurrent(child, current) ? " open" : "";
      out += `<li><details${open}><summary>${htmlEscape(name)}</summary>`;
      out += render(child);
      out += "</details></li>";
    }
    for (const [display, outRel] of [...node.files].sort((a, b) => nameOrder(a[0], b[0]))) {
      const cls = outRel === current ? ' class="current"' : "";
      out += `<li><a${cls} href="${prefix}${encodeHref(outRel)}">${htmlEscape(display)}</a></li>`;
    }
    out += "</ul>";
    return out;
  };
  return render(tree);
}

/** Generated listing for a folder that has no index page of its own. */
function listingHtml(dirOut: string, node: NavNode, title: string): string {
  let body = `<h1>${htmlEscape(title)}</h1><ul class="listing">`;
  for (const [name] of sortedEntries(node.dirs)) {
    body += `<li class="dir"><a href="${encodeHref(`${name}/index.html`)}">${htmlEscape(name)}</a></li>`;
  }
  const dirPrefix = dirOut === "" ? "" : `${dirOut}/`;
  for (const [display, outRel] of [...node.files].sort((a, b) => nameOrder(a[0], b[0]))) {
    const href = outRel.startsWith(dirPrefix) ? outRel.slice(dirPrefix.length) : outRel;
    body += `<li><a href="${encodeHref(href)}">${htmlEscape(display)}</a></li>`;
  }
  body += "</ul>";
  return body;
}

function listingPages(site: Site): OutputFile[] {
  const pages: OutputFile[] = [];
  const haveIndex = new Set(site.outOf.values());
  const visit = (dirOut: string, node: NavNode) => {
    const indexRel = dirOut === "" ? "index.html" : `${dirOut}/index.html`;
    if (!haveIndex.has(indexRel)) {
      const title = dirOut === "" ? site.title : (dirOut.split("/").pop() ?? dirOut);
      pages.push({ path: indexRel, text: assemble(site, title, listingHtml(dirOut, node, title), indexRel) });
    }
    for (const [name, child] of node.dirs) {
      const clean = sanitizeComponent(name);
      visit(dirOut === "" ? clean : `${dirOut}/${clean}`, child);
    }
  };
  visit("", navTree(site));
  return pages;
}

// ------------------------------------------------------------ whole site

/** Build every output file for the site (pages, listings, assets, copies). */
export async function generateSite(app: TextAPI, site: Site): Promise<OutputFile[]> {
  const out: OutputFile[] = [
    { path: "_assets/style.css", text: siteCss },
    { path: "_assets/highlight.css", text: hljsCss },
    { path: "_assets/highlight.min.js", text: hljsJs },
  ];

  for (const f of site.files) {
    const outRel = site.outOf.get(f.rel)!;
    if (f.note) {
      out.push({ path: outRel, text: await renderNote(app, site, f) });
    } else {
      out.push({ path: outRel, copyFrom: f.path });
    }
  }

  out.push(...listingPages(site));
  return out;
}
