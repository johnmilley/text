/** The "compile manuscript" dialog: the book's contents (in sidebar order,
 * each chapter tickable), the title-page details, layout options, and one
 * button per output format. Settings live in the book folder as
 * `.manuscript.json`, so they travel with the book (and sync to the phone). */

import type { Entry } from "../../api";
import type { TextAPI } from "../types";
import { buildDocx } from "./docx";
import { buildEpub, type LoadedImage } from "./epub";
import {
  SETTINGS_FILE,
  collectChapters,
  defaultSettings,
  type Chapter,
  type Settings,
} from "./model";
import { buildMarkdown, buildPrintHtml, printHtml } from "./other";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
};

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function loadSettings(app: TextAPI, folder: string): Promise<Settings> {
  const base = defaultSettings(folder.split(/[\\/]/).pop() || "Manuscript");
  try {
    const saved = JSON.parse(await app.fs.readText(`${folder}/${SETTINGS_FILE}`));
    return { ...base, ...saved };
  } catch {
    return base; // first compile of this book
  }
}

const saveSettings = (app: TextAPI, folder: string, s: Settings) =>
  app.fs.writeText(`${folder}/${SETTINGS_FILE}`, JSON.stringify(s, null, 2) + "\n");

/** Find embeds by file name anywhere in the open vault (images often live in
 * a shared attachments folder, outside the book folder). */
async function imageLoader(app: TextAPI, root: string) {
  const byName = new Map<string, string>();
  const byRel = new Map<string, string>();
  const walk = (entries: Entry[]) => {
    for (const e of entries) {
      if (e.is_dir) walk(e.children ?? []);
      else {
        if (!byName.has(e.name.toLowerCase())) byName.set(e.name.toLowerCase(), e.path);
        byRel.set(e.path.slice(root.length + 1).replace(/\\/g, "/").toLowerCase(), e.path);
      }
    }
  };
  walk(await app.fs.listTree(root));
  return async (target: string): Promise<LoadedImage | null> => {
    let t = target.split("|")[0].split("#")[0].trim();
    try {
      t = decodeURIComponent(t);
    } catch {
      /* keep */
    }
    const path =
      byRel.get(t.replace(/^\/+/, "").toLowerCase()) ??
      byName.get((t.split("/").pop() ?? t).toLowerCase());
    if (!path) return null;
    const name = path.split(/[\\/]/).pop()!;
    const mime = MIME[(name.split(".").pop() ?? "").toLowerCase()];
    if (!mime) return null;
    try {
      return { name, mime, bytes: b64ToBytes(await app.fs.readBase64(path)) };
    } catch {
      return null;
    }
  };
}

const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim() || "manuscript";

export async function openCompileDialog(app: TextAPI, folder: string) {
  const s = await loadSettings(app, folder);
  let chapters: Chapter[] = [];

  app.ui.info((box) => {
    box.classList.add("ssg-box", "ms-box");
    const caption = el("div", "modal-caption", `compile manuscript — ${folder.split(/[\\/]/).pop()}`);
    const summary = el("div", "ssg-note", "reading the folder…");
    const list = el("div", "ms-list");
    const form = el("div", "ms-form");
    const formats = el("div", "ms-formats");
    const dest = el("div", "ms-dest");
    const status = el("div", "ssg-status");
    box.append(caption, summary, list, form, dest, formats, status);

    const say = (msg: string, err = false) =>
      status.replaceChildren(el("span", err ? "ssg-error" : "", msg));

    // ---------------------------------------------------------- contents
    const included = () => chapters.filter((c) => !s.excluded.includes(c.rel));
    const updateSummary = () => {
      const inc = included();
      const words = inc.reduce((n, c) => n + c.words, 0);
      summary.textContent = chapters.length
        ? `${inc.length} of ${chapters.length} chapters · ${words.toLocaleString()} words`
        : "no notes found — chapters are the notes and subfolders in this folder";
    };
    const renderList = () => {
      list.replaceChildren(
        ...chapters.map((ch) => {
          const row = el("label", "ms-row");
          const box = el("input");
          box.type = "checkbox";
          box.checked = !s.excluded.includes(ch.rel);
          box.addEventListener("change", () => {
            s.excluded = box.checked
              ? s.excluded.filter((r) => r !== ch.rel)
              : [...s.excluded, ch.rel];
            updateSummary();
          });
          const scenes = ch.isFolder ? ` · ${ch.scenes.length} scenes` : "";
          row.append(
            box,
            el("span", "ms-title", ch.title),
            el("span", "ms-words", `${ch.words.toLocaleString()}${scenes}`),
          );
          row.title = ch.rel;
          return row;
        }),
      );
      updateSummary();
    };

    // ---------------------------------------------------------- fields
    const field = (label: string, input: HTMLElement, hint?: string) => {
      const f = el("label", "ssg-field");
      f.append(el("span", "ssg-caption", label), input);
      if (hint) f.append(el("span", "ms-hint", hint));
      return f;
    };
    const text = (key: "title" | "author" | "penName" | "sceneBreak", placeholder = "") => {
      const i = el("input", "ssg-input");
      i.value = s[key];
      i.placeholder = placeholder;
      i.addEventListener("input", () => (s[key] = i.value));
      return i;
    };
    const select = <K extends "numbering" | "font" | "paper">(key: K, options: [Settings[K], string][]) => {
      const sel = el("select", "ssg-input");
      for (const [v, label] of options) {
        const o = el("option", "", label);
        o.value = v;
        sel.append(o);
      }
      sel.value = s[key];
      sel.addEventListener("change", () => (s[key] = sel.value as Settings[K]));
      return sel;
    };
    const contact = el("textarea", "ssg-input ms-contact");
    contact.value = s.contact;
    contact.rows = 3;
    contact.placeholder = "street address\ncity, region, postcode\nemail · phone";
    contact.addEventListener("input", () => (s.contact = contact.value));

    const two = (a: HTMLElement, b: HTMLElement) => {
      const r = el("div", "ms-two");
      r.append(a, b);
      return r;
    };
    form.append(
      field("title", text("title")),
      two(field("author (legal name)", text("author")), field("pen name", text("penName", "optional"))),
      field("contact", contact, "top-left of the manuscript's first page"),
      two(
        field(
          "chapter numbers",
          select("numbering", [
            ["none", "titles only"],
            ["numeric", "Chapter 1"],
            ["words", "Chapter One"],
          ]),
        ),
        field("scene break", text("sceneBreak", "#")),
      ),
      two(
        field("manuscript font", select("font", [["Times New Roman", "Times New Roman"], ["Courier New", "Courier New"]])),
        field("paper", select("paper", [["letter", "US Letter"], ["a4", "A4"]])),
      ),
    );

    // ---------------------------------------------------------- destination
    const renderDest = () => {
      if (!app.platform.desktop) {
        dest.replaceChildren(el("span", "ms-hint", "files download to this device"));
        return;
      }
      const change = el("button", "ms-link", s.lastDir ? "change…" : "choose…");
      change.addEventListener("click", async () => {
        const d = await app.fs.pickDirectory({ title: "save compiled manuscripts into" });
        if (d) {
          s.lastDir = d;
          renderDest();
        }
      });
      dest.replaceChildren(el("span", "ssg-caption", "save to"), el("span", "ms-path", s.lastDir || "—"), change);
    };

    // ---------------------------------------------------------- compile
    const setBusy = (busy: boolean) =>
      box.querySelectorAll<HTMLButtonElement>(".ms-formats button").forEach((b) => (b.disabled = busy));

    const renderAll = async (chs: Chapter[]) => {
      const html: string[][] = [];
      for (const [i, ch] of chs.entries()) {
        say(`rendering ${i + 1}/${chs.length}…`);
        html.push(await Promise.all(ch.scenes.map((sc) => app.render.markdownToHtml(sc.body))));
      }
      return html;
    };

    const deliver = async (name: string, bytes: Uint8Array, mime: string) => {
      if (!app.platform.desktop) {
        app.ui.download(name, bytes, mime);
        return `downloaded ${name}`;
      }
      if (!s.lastDir) {
        const d = await app.fs.pickDirectory({ title: "save compiled manuscripts into" });
        if (!d) throw new Error("no folder chosen");
        s.lastDir = d;
        renderDest();
      }
      const path = `${s.lastDir.replace(/\/$/, "")}/${name}`;
      await app.fs.writeBinary(path, bytes);
      return `saved ${path}`;
    };

    const compile = (kind: "docx" | "epub" | "pdf" | "md") => async () => {
      const chs = included();
      if (!chs.length) return say("nothing to compile — tick at least one chapter", true);
      if (!s.title.trim()) return say("the book needs a title", true);
      setBusy(true);
      try {
        void saveSettings(app, folder, s).catch(() => {});
        const base = fileSafe(s.title);
        const enc = new TextEncoder();
        if (kind === "md") {
          say(await deliver(`${base}.md`, enc.encode(buildMarkdown(s, chs)), "text/markdown"));
          return;
        }
        const html = await renderAll(chs);
        if (kind === "docx") {
          say("building the .docx…");
          const bytes = buildDocx(s, chs, html);
          say(
            await deliver(
              `${base}.docx`,
              bytes,
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
          );
        } else if (kind === "epub") {
          say("building the EPUB…");
          const load = await imageLoader(app, app.currentRoot() ?? folder);
          const bytes = await buildEpub(s, chs, html, load);
          say(await deliver(`${base}.epub`, bytes, "application/epub+zip"));
        } else {
          say("laying out pages…");
          const load = await imageLoader(app, app.currentRoot() ?? folder);
          const dataUri = async (t: string) => {
            const img = await load(t);
            if (!img) return null;
            let bin = "";
            for (let i = 0; i < img.bytes.length; i += 0x8000) {
              bin += String.fromCharCode(...img.bytes.subarray(i, i + 0x8000));
            }
            return `data:${img.mime};base64,${btoa(bin)}`;
          };
          printHtml(await buildPrintHtml(s, chs, html, dataUri));
          say("opening the print dialog — choose “Save as PDF”");
        }
      } catch (e) {
        say(String(e instanceof Error ? e.message : e), true);
      } finally {
        setBusy(false);
      }
    };

    const fmt = (label: string, hint: string, kind: "docx" | "epub" | "pdf" | "md") => {
      const b = el("button", "ms-format");
      b.append(el("span", "ms-format-name", label), el("span", "ms-format-hint", hint));
      b.addEventListener("click", () => void compile(kind)());
      return b;
    };
    formats.append(
      fmt("Word", "manuscript format .docx", "docx"),
      fmt("EPUB", "e-book", "epub"),
      fmt("PDF", "book pages, via print", "pdf"),
      fmt("Markdown", "one .md file", "md"),
    );
    setBusy(true);
    renderDest();

    collectChapters(app, folder)
      .then((chs) => {
        chapters = chs;
        // forget exclusions for chapters that no longer exist
        s.excluded = s.excluded.filter((r) => chs.some((c) => c.rel === r));
        renderList();
        setBusy(false);
      })
      .catch((e) => say(`couldn't read the folder: ${e instanceof Error ? e.message : e}`, true));
  });
}
