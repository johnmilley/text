/**
 * EPUB 3 (with an EPUB 2 NCX for older readers): a title page, one XHTML
 * file per chapter, a navigation document, embedded images, and a small book
 * stylesheet — indented paragraphs, the first after a heading or scene break
 * flush left.
 *
 * Input is the host renderer's HTML per scene; links between notes are
 * unwrapped to plain text (they mean nothing in a book) and image embeds are
 * resolved through `loadImage` and packed into the archive.
 */

import { chapterHeading, type Chapter, type Settings } from "./model";
import { zip, type ZipEntry } from "./zip";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface LoadedImage {
  name: string;
  bytes: Uint8Array;
  mime: string;
}

/** Resolve an embed target (`pic.png`, `art/pic.png`) to its bytes. */
export type ImageLoader = (target: string) => Promise<LoadedImage | null>;

export const BOOK_CSS = `
body { font-family: serif; line-height: 1.45; margin: 0 5%; }
p { margin: 0; text-indent: 1.5em; text-align: justify; hyphens: auto; -webkit-hyphens: auto; }
h1, h2, h3, h4, h5, h6, .chapter-number { text-align: center; font-weight: normal; text-indent: 0; hyphens: none; }
.chapter-number { margin: 3em 0 0.4em; font-size: 0.95em; letter-spacing: 0.12em; text-transform: uppercase; }
h1 { margin: 0.2em 0 2em; font-size: 1.5em; }
.chapter-number + h1 { margin-top: 0; }
h1:first-child { margin-top: 3em; }
h2, h3, h4, h5, h6 { margin: 1.5em 0 0.8em; font-size: 1.1em; font-weight: bold; }
.scene-break { text-align: center; text-indent: 0; margin: 1em 0; }
h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p, .scene-break + p, blockquote + p, ul + p, ol + p, pre + p { text-indent: 0; }
blockquote { margin: 1em 2em; }
blockquote p { text-indent: 0; margin-bottom: 0.5em; }
ul, ol { margin: 0.8em 0 0.8em 2em; padding: 0; }
pre { font-family: monospace; font-size: 0.85em; white-space: pre-wrap; margin: 1em 0; }
code { font-family: monospace; }
img { max-width: 100%; height: auto; }
.title-page { text-align: center; margin-top: 30%; }
.title-page h1 { font-size: 2em; margin: 0 0 1em; }
.title-page .by { text-indent: 0; text-align: center; font-size: 1.1em; }
.footnotes { margin-top: 2em; font-size: 0.85em; }
.footnotes p { text-indent: 0; }
`;

const xhtml = (title: string, lang: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(lang)}" lang="${esc(lang)}">
<head><meta charset="UTF-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>`;

const unwrap = (el: Element) => el.replaceWith(...Array.from(el.childNodes));

/** Clean one scene's renderer HTML into well-formed XHTML: note links
 * unwrapped, checkboxes and editor attributes dropped, each image's `src`
 * replaced by `srcFor(embed target)` (null drops the image). */
export async function cleanScene(
  html: string,
  srcFor: (target: string) => Promise<string | null>,
): Promise<string> {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  // links between notes / to local files are meaningless in a book
  for (const a of Array.from(body.querySelectorAll("a[data-wikilink], a[data-path]"))) unwrap(a);
  for (const a of Array.from(body.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("#")) continue; // footnote refs stay in-document
    if (!/^(https?:|mailto:)/i.test(href)) unwrap(a);
  }
  for (const input of Array.from(body.querySelectorAll("input"))) input.remove();
  // ==highlights== are notes to self, not typography
  for (const mark of Array.from(body.querySelectorAll("mark"))) unwrap(mark);
  for (const img of Array.from(body.querySelectorAll("img"))) {
    const target = img.getAttribute("data-embed") ?? img.getAttribute("src") ?? "";
    const src = target && !/^[a-z]+:/i.test(target) ? await srcFor(target) : null;
    if (!src) {
      img.remove();
      continue;
    }
    img.setAttribute("src", src);
    if (!img.getAttribute("alt")) img.setAttribute("alt", "");
    img.removeAttribute("data-embed");
  }
  // strip attributes readers choke on / that carry editor plumbing
  for (const el of Array.from(body.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("data-") || attr.name === "contenteditable") el.removeAttribute(attr.name);
    }
  }
  const ser = new XMLSerializer();
  return Array.from(body.childNodes)
    .map((n) => ser.serializeToString(n))
    .join("")
    // XMLSerializer stamps the namespace on every top-level element; the
    // document already declares it
    .replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
}

export async function buildEpub(
  s: Settings,
  chapters: Chapter[],
  html: string[][],
  loadImage: ImageLoader,
): Promise<Uint8Array> {
  const lang = s.language || "en";
  const author = s.penName || s.author;
  const breakText = !s.sceneBreak || s.sceneBreak === "#" ? "* * *" : s.sceneBreak;
  const images = new Map<string, LoadedImage>();
  // pack each embedded image once (by file name) and point at its copy
  const packImage = async (target: string) => {
    const loaded = await loadImage(target);
    if (!loaded) return null;
    if (!images.has(loaded.name)) images.set(loaded.name, loaded);
    return `images/${encodeURIComponent(loaded.name)}`;
  };

  const files: ZipEntry[] = [];
  const spine: { id: string; href: string; title: string }[] = [];

  const titleBody = `<section class="title-page" epub:type="titlepage"><h1>${esc(s.title)}</h1>${author ? `<p class="by">${esc(author)}</p>` : ""}</section>`;
  files.push({ name: "OEBPS/title.xhtml", data: xhtml(s.title, lang, titleBody) });

  for (const [ci, ch] of chapters.entries()) {
    const { label, title } = chapterHeading(ch, ci + 1, s);
    const navTitle = [label, title].filter(Boolean).join(": ") || `Chapter ${ci + 1}`;
    let body = `<section epub:type="chapter">`;
    if (label && title) body += `<p class="chapter-number">${esc(label)}</p>`;
    body += `<h1>${esc(title ?? label ?? navTitle)}</h1>`;
    for (const [si, sceneHtml] of html[ci].entries()) {
      if (si > 0) body += `<p class="scene-break">${esc(breakText)}</p>`;
      body += await cleanScene(sceneHtml, packImage);
    }
    body += "</section>";
    const id = `ch${String(ci + 1).padStart(3, "0")}`;
    const href = `${id}.xhtml`;
    files.push({ name: `OEBPS/${href}`, data: xhtml(navTitle, lang, body) });
    spine.push({ id, href, title: navTitle });
  }

  const nav = xhtml(
    "Contents",
    lang,
    `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${spine
      .map((c) => `<li><a href="${c.href}">${esc(c.title)}</a></li>`)
      .join("")}</ol></nav>`,
  );
  files.push({ name: "OEBPS/nav.xhtml", data: nav });

  const uid = `urn:uuid:${s.uuid}`;
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${uid}"/></head><docTitle><text>${esc(s.title)}</text></docTitle><navMap>${spine
    .map(
      (c, i) =>
        `<navPoint id="np${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(c.title)}</text></navLabel><content src="${c.href}"/></navPoint>`,
    )
    .join("")}</navMap></ncx>`;
  files.push({ name: "OEBPS/toc.ncx", data: ncx });
  files.push({ name: "OEBPS/style.css", data: BOOK_CSS });

  const imageItems: string[] = [];
  let n = 0;
  for (const img of images.values()) {
    files.push({ name: `OEBPS/images/${img.name}`, data: img.bytes });
    imageItems.push(
      `<item id="img${++n}" href="images/${esc(encodeURIComponent(img.name))}" media-type="${img.mime}"/>`,
    );
  }

  const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${esc(lang)}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${uid}</dc:identifier>
<dc:title>${esc(s.title)}</dc:title>
${author ? `<dc:creator>${esc(author)}</dc:creator>` : ""}
<dc:language>${esc(lang)}</dc:language>
<meta property="dcterms:modified">${modified}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="css" href="style.css" media-type="text/css"/>
<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
${spine.map((c) => `<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`).join("\n")}
${imageItems.join("\n")}
</manifest>
<spine toc="ncx">
<itemref idref="title"/>
<itemref idref="nav" linear="no"/>
${spine.map((c) => `<itemref idref="${c.id}"/>`).join("\n")}
</spine>
</package>`;

  return zip([
    { name: "mimetype", data: "application/epub+zip" }, // must be first, stored
    {
      name: "META-INF/container.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
    },
    { name: "OEBPS/content.opf", data: opf },
    ...files,
  ]);
}
