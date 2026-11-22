/**
 * DOCX in standard manuscript format (the Shunn layout agents and editors
 * expect):
 *
 *   - a cover page: contact block top-left, word count top-right, the title
 *     a third of the way down, "by Name" under it — and no page header;
 *   - 12pt Times New Roman (or Courier), double-spaced, ragged right, ½"
 *     first-line indents, no space between paragraphs, 1" margins;
 *   - every chapter on a new page, its heading a third of the way down;
 *   - a running header "Surname / Title / page" on every page after the cover;
 *   - scene breaks as a centered "#", and "END" after the last line.
 *
 * Chapter titles use Word's built-in Heading 1, so the navigation pane (and
 * an editor's table of contents) work out of the box.
 *
 * Input is the host renderer's HTML for each scene; this file walks that DOM
 * and writes WordprocessingML by hand — no library.
 */

import { approxWords, chapterHeading, type Chapter, type Settings } from "./model";
import { zip } from "./zip";

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface RunStyle {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  strike?: boolean;
  code?: boolean;
  sup?: boolean;
  sub?: boolean;
}

function runProps(st: RunStyle): string {
  let p = "";
  if (st.code) p += '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>';
  if (st.b) p += "<w:b/>";
  if (st.i) p += "<w:i/>";
  if (st.strike) p += "<w:strike/>";
  if (st.u) p += '<w:u w:val="single"/>';
  if (st.sup) p += '<w:vertAlign w:val="superscript"/>';
  else if (st.sub) p += '<w:vertAlign w:val="subscript"/>';
  return p ? `<w:rPr>${p}</w:rPr>` : "";
}

const run = (text: string, st: RunStyle = {}) =>
  text ? `<w:r>${runProps(st)}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>` : "";

const para = (style: string, body: string, extra = "") =>
  `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr>${body}</w:p>`;

/** A chapter opens on a fresh page, a third of the way down. Word and
 * LibreOffice both drop "space before" at the top of a page, so the drop is
 * an empty spacer paragraph of exact height instead (kept with the heading). */
const CHAPTER_OPEN =
  '<w:p><w:pPr><w:pageBreakBefore/><w:keepNext/><w:ind w:firstLine="0"/><w:spacing w:before="0" w:after="0" w:line="2880" w:lineRule="exact"/></w:pPr></w:p>';

/** Walks scene HTML → paragraphs. One instance per document (it accumulates
 * footnotes per chapter). */
class Writer {
  out: string[] = [];
  notes: string[] = [];

  constructor(private s: Settings) {}

  /** Inline content of `node` as runs. `atStart` trims leading whitespace. */
  private inline(node: Node, st: RunStyle, acc: { text: string[]; start: boolean }) {
    if (node.nodeType === Node.TEXT_NODE) {
      let t = (node.textContent ?? "").replace(/\s+/g, " ");
      if (acc.start) t = t.replace(/^ /, "");
      if (t) {
        acc.text.push(run(t, st));
        acc.start = false;
      }
      return;
    }
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      acc.text.push("<w:r><w:br/></w:r>");
      acc.start = true;
      return;
    }
    if (tag === "img") {
      const alt = node.getAttribute("alt") || node.getAttribute("data-embed") || "image";
      acc.text.push(run(`[image: ${alt}]`, { i: true }));
      acc.start = false;
      return;
    }
    if (tag === "input") return; // task checkbox
    const next: RunStyle = { ...st };
    if (tag === "strong" || tag === "b") next.b = true;
    if (tag === "em" || tag === "i" || tag === "cite") next.i = true;
    if (tag === "u" || tag === "ins") next.u = true;
    if (tag === "del" || tag === "s" || tag === "strike") next.strike = true;
    if (tag === "code" || tag === "kbd") next.code = true;
    if (tag === "sup") next.sup = true;
    if (tag === "sub") next.sub = true;
    // ==highlights== are notes to self — the manuscript prints them plain
    for (const c of Array.from(node.childNodes)) this.inline(c, next, acc);
  }

  private runsOf(node: Node, st: RunStyle = {}): string {
    const acc = { text: [] as string[], start: true };
    this.inline(node, st, acc);
    return acc.text.join("");
  }

  /** Block-level walk. `quote` = inside a blockquote. */
  block(node: Node, quote = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? "").trim();
      if (t) this.out.push(para(quote ? "Quote" : "Normal", run(t)));
      return;
    }
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    const style = quote ? "Quote" : "Normal";
    switch (tag) {
      case "p":
        if (node.textContent?.trim() || node.querySelector("img")) {
          this.out.push(para(style, this.runsOf(node)));
        }
        return;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        this.out.push(para("Heading2", this.runsOf(node)));
        return;
      case "hr":
        this.sceneBreak();
        return;
      case "img": // an embed on its own line arrives as a bare block
        this.out.push(para("SceneBreak", this.runsOf(node)));
        return;
      case "blockquote":
        for (const c of Array.from(node.childNodes)) this.block(c, true);
        return;
      case "ul":
      case "ol": {
        let n = Number(node.getAttribute("start") ?? 1) || 1;
        for (const li of Array.from(node.children)) {
          if (li.tagName.toLowerCase() !== "li") continue;
          const marker = tag === "ol" ? `${n++}.\t` : "•\t";
          // a list item's own text (nested lists follow as their own items)
          const own = document.createElement("span");
          const nested: Element[] = [];
          for (const c of Array.from(li.childNodes)) {
            if (c instanceof Element && /^(ul|ol)$/i.test(c.tagName)) nested.push(c);
            else own.appendChild(c.cloneNode(true));
          }
          this.out.push(para("ListParagraph", run(marker) + this.runsOf(own)));
          for (const sub of nested) this.block(sub, quote);
        }
        return;
      }
      case "pre": {
        const lines = (node.textContent ?? "").replace(/\n$/, "").split("\n");
        for (const line of lines) this.out.push(para("Code", run(line, { code: true })));
        return;
      }
      case "table":
        for (const tr of Array.from(node.querySelectorAll("tr"))) {
          const cells = Array.from(tr.children).map((td) => this.runsOf(td));
          this.out.push(para("Plain", cells.join(run("\t"))));
        }
        return;
      case "div":
        if (node.classList.contains("footnote-definition")) {
          const label = node.querySelector(".footnote-definition-label")?.textContent ?? "";
          node.querySelector(".footnote-definition-label")?.remove();
          this.notes.push(para("Plain", run(label ? `${label}. ` : "") + this.runsOf(node)));
          return;
        }
        for (const c of Array.from(node.childNodes)) this.block(c, quote);
        return;
      case "section":
        // marked/pulldown footnote containers
        if (node.classList.contains("footnotes")) {
          for (const li of Array.from(node.querySelectorAll("li"))) {
            this.notes.push(para("Plain", this.runsOf(li)));
          }
          return;
        }
        for (const c of Array.from(node.childNodes)) this.block(c, quote);
        return;
      default:
        // anything else block-ish: treat its text as a paragraph
        if (node.textContent?.trim() || node.querySelector("img")) {
          this.out.push(para(style, this.runsOf(node)));
        }
    }
  }

  sceneBreak() {
    this.out.push(para("SceneBreak", run(this.s.sceneBreak || "#")));
  }

  /** Close a chapter: its footnotes (if any) as a short "Notes" list. */
  flushNotes() {
    if (!this.notes.length) return;
    this.out.push(para("Heading2", run("Notes")));
    this.out.push(...this.notes);
    this.notes = [];
  }
}

// ------------------------------------------------------------ package parts

function stylesXml(s: Settings): string {
  const f = xml(s.font);
  const lang = xml(s.language || "en");
  const pStyle = (id: string, name: string, ppr: string, rpr = "", extra = "") =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>${extra}<w:basedOn w:val="Normal"/><w:qFormat/><w:pPr>${ppr}</w:pPr>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ""}</w:style>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}" w:cs="${f}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="${lang}"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="480" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:widowControl/><w:ind w:firstLine="720"/></w:pPr></w:style>
${pStyle("Plain", "Plain", '<w:ind w:firstLine="0"/><w:spacing w:line="240" w:lineRule="auto"/>')}
${pStyle("Quote", "Quote", '<w:ind w:left="720" w:right="720" w:firstLine="0"/>')}
${pStyle("ListParagraph", "List Paragraph", '<w:tabs><w:tab w:val="left" w:pos="1080"/></w:tabs><w:ind w:left="1080" w:hanging="360"/>')}
${pStyle("Code", "Code", '<w:ind w:firstLine="0"/><w:spacing w:line="240" w:lineRule="auto"/>', '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="20"/>')}
${pStyle("SceneBreak", "Scene Break", '<w:jc w:val="center"/><w:ind w:firstLine="0"/>')}
${pStyle("ChapterNumber", "Chapter Number", '<w:keepNext/><w:jc w:val="center"/><w:ind w:firstLine="0"/>')}
${pStyle("Heading1", "heading 1", '<w:keepNext/><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:after="480"/><w:outlineLvl w:val="0"/>')}
${pStyle("Heading2", "heading 2", '<w:keepNext/><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:outlineLvl w:val="1"/>', "<w:b/>")}
${pStyle("TitleLine", "Title", '<w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="3600"/>')}
${pStyle("Byline", "Byline", '<w:jc w:val="center"/><w:ind w:firstLine="0"/>')}
${pStyle("Header", "header", '<w:jc w:val="right"/><w:ind w:firstLine="0"/><w:spacing w:line="240" w:lineRule="auto"/>')}
</w:styles>`;
}

const surnameOf = (name: string) => name.trim().split(/\s+/).pop() ?? "";

function headerXml(s: Settings): string {
  const who = surnameOf(s.author || s.penName);
  const parts = [who, s.title.toUpperCase()].filter(Boolean).map(xml).join(" / ");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr><w:r><w:t xml:space="preserve">${parts} / </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:hdr>`;
}

function coverXml(s: Settings, words: number): string {
  const name = s.author || s.penName;
  const lines = [name, ...s.contact.split(/\r?\n/)].map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  // first line: legal name on the left, the word count flush right
  const tabs = '<w:tabs><w:tab w:val="right" w:pos="9360"/></w:tabs>';
  out.push(para("Plain", run(lines[0] ?? "") + run("\t") + run(approxWords(words)), tabs));
  for (const l of lines.slice(1)) out.push(para("Plain", run(l)));
  out.push(para("TitleLine", run(s.title)));
  const by = s.penName || s.author;
  if (by) out.push(para("Byline", run(`by ${by}`)));
  return out.join("");
}

function sectPr(s: Settings): string {
  const [w, h] = s.paper === "a4" ? [11906, 16838] : [12240, 15840];
  return `<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:pgSz w:w="${w}" w:h="${h}"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:titlePg/></w:sectPr>`;
}

/** Build the .docx. `html` holds each chapter's scenes, rendered. */
export function buildDocx(s: Settings, chapters: Chapter[], html: string[][]): Uint8Array {
  const words = chapters.reduce((n, c) => n + c.words, 0);
  const w = new Writer(s);
  w.out.push(coverXml(s, words));

  const parser = new DOMParser();
  chapters.forEach((ch, ci) => {
    const { label, title } = chapterHeading(ch, ci + 1, s);
    w.out.push(CHAPTER_OPEN);
    if (label && title) {
      w.out.push(para("ChapterNumber", run(label)));
      w.out.push(para("Heading1", run(title)));
    } else {
      // a lone label ("Chapter 3") is the heading itself
      w.out.push(para("Heading1", run(title ?? label ?? "")));
    }
    html[ci].forEach((sceneHtml, si) => {
      if (si > 0) w.sceneBreak();
      const body = parser.parseFromString(sceneHtml, "text/html").body;
      for (const node of Array.from(body.childNodes)) w.block(node);
    });
    w.flushNotes();
  });
  w.out.push(para("SceneBreak", run("END")));

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${w.out.join("")}${sectPr(s)}</w:body></w:document>`;

  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(s.title)}</dc:title><dc:creator>${xml(s.author || s.penName)}</dc:creator><dc:language>${xml(s.language)}</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;

  return zip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`,
    },
    { name: "word/document.xml", data: document },
    { name: "word/styles.xml", data: stylesXml(s) },
    {
      name: "word/settings.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
    },
    { name: "word/header1.xml", data: headerXml(s) },
    { name: "docProps/core.xml", data: core },
  ]);
}
