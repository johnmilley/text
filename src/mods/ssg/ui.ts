/** The "publish" dialog: pick a destination (local HTML folder or PDF),
 * set options, and run. UI only — the work lives in render.ts (build) and
 * sinks.ts (emit). */

import type { TextAPI } from "../types";
import { baseOf, buildSite, dirOf, gather, resolve, stemOf, type Site } from "./site";
import { generateSite, type OutputFile } from "./render";
import { emitLocal, emitPdf } from "./sinks";

type Sink = "local" | "pdf";

const LS = {
  get: (k: string) => localStorage.getItem(`ssg.${k}`) ?? "",
  set: (k: string, v: string) => localStorage.setItem(`ssg.${k}`, v),
};

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

/** Gather → name → render the whole site for `folder`. */
async function build(
  app: TextAPI,
  folder: string,
): Promise<{ site: Site; files: OutputFile[] }> {
  const tree = await app.fs.listTree(folder);
  const src = gather(folder, tree);
  if (src.length === 0) throw new Error("this folder has no files to publish");
  const site = buildSite(folder, folder.split("/").pop() || "site", src);
  return { site, files: await generateSite(app, site) };
}

/** Build a one-note site: just the chosen note plus the assets it actually
 * embeds/links. Assets are located against the whole vault (`root`) so a note
 * that pulls images from a central folder still bundles them. Wikilinks to
 * other notes aren't published, so they fall back to broken-link styling. */
async function buildOne(
  app: TextAPI,
  root: string,
  file: string,
): Promise<{ site: Site; files: OutputFile[] }> {
  const all = gather(root, await app.fs.listTree(root));
  const note = all.find((f) => f.path === file);
  if (!note) throw new Error("that note is not inside the open folder");
  if (!note.note) throw new Error("only markdown notes can be published this way");

  // resolve the note's embeds/links against the full vault, keep only the
  // (non-note) asset files they point at
  const full = buildSite(root, "", all);
  const srcByOut = new Map([...full.outOf].map(([src, out]) => [out, src]));
  const html = await app.render.markdownToHtml(await app.fs.readText(note.path));
  const doc = new DOMParser().parseFromString(html, "text/html");
  const noteDir = dirOf(note.rel);
  const assetRels = new Set<string>();
  for (const node of Array.from(
    doc.querySelectorAll<HTMLElement>("img[data-embed], a[data-path]"),
  )) {
    const target = node.dataset.embed ?? node.dataset.path ?? "";
    const out = resolve(full, target, noteDir);
    const src = out ? srcByOut.get(out) : undefined;
    if (src) assetRels.add(src);
  }
  const assets = all.filter((f) => !f.note && assetRels.has(f.rel));

  const site = buildSite(root, stemOf(baseOf(note.rel)), [note, ...assets]);
  return { site, files: await generateSite(app, site, { listings: false }) };
}

/**
 * The publish dialog. With `onlyFile` set (an absolute note path), it publishes
 * just that note; otherwise it publishes everything under `folder`.
 */
export function openPublishDialog(app: TextAPI, folder: string, onlyFile?: string) {
  const doBuild = () => (onlyFile ? buildOne(app, folder, onlyFile) : build(app, folder));
  const label = onlyFile ? baseOf(onlyFile) : folder.split("/").pop();
  app.ui.info((box) => {
    box.classList.add("ssg-box");
    box.append(el("div", "modal-caption", `publish "${label}"`));

    const tabs = el("div", "ssg-tabs");
    const opts = el("div", "ssg-opts");
    const status = el("div", "ssg-status");
    box.append(tabs, opts, status);

    let stored = LS.get("sink") as Sink;
    if (stored !== "local" && stored !== "pdf") stored = "local"; // "pages" retired
    let sink: Sink = stored;
    const setBusy = (busy: boolean) =>
      box.querySelectorAll("button").forEach((b) => ((b as HTMLButtonElement).disabled = busy));
    const say = (msg: string, err = false) => {
      status.replaceChildren(el("span", err ? "ssg-error" : "", msg));
    };

    const run = async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
      } catch (e) {
        say(String(e instanceof Error ? e.message : e), true);
      } finally {
        setBusy(false);
      }
    };

    // -------- per-sink option panels --------
    const renderOpts = () => {
      opts.replaceChildren();
      status.replaceChildren();
      if (sink === "local") renderLocal();
      else renderPdf();
    };

    const renderLocal = () => {
      opts.append(
        el("div", "ssg-note", "write the generated website into a folder on this computer."),
      );
      const row = el("div", "modal-buttons");
      const go = el("button", "", "choose folder & publish");
      row.append(go);
      opts.append(row);
      go.addEventListener("click", () =>
        run(async () => {
          const dest = await app.fs.pickDirectory({ title: "publish into folder" });
          if (!dest) return;
          say("building…");
          const { files } = await doBuild();
          await emitLocal(app, files, dest, say);
          say(`done — ${files.length} files written to ${dest}`);
        }),
      );
    };

    const renderPdf = () => {
      opts.append(
        el(
          "div",
          "ssg-note",
          "assemble the whole folder into one document and open the print dialog — choose " +
            "“Save as PDF” there. Images are embedded; notes follow the sidebar order.",
        ),
      );
      const row = el("div", "modal-buttons");
      const go = el("button", "", "create PDF");
      row.append(go);
      opts.append(row);
      go.addEventListener("click", () =>
        run(async () => {
          say("building…");
          const { site, files } = await doBuild();
          await emitPdf(app, files, site, label || "site");
          say("opening the print dialog…");
        }),
      );
    };

    // -------- sink tabs --------
    const mkTab = (id: Sink, label: string) => {
      const b = el("button", id === sink ? "selected" : "", label);
      b.addEventListener("click", () => {
        sink = id;
        LS.set("sink", id);
        for (const t of tabs.children) t.classList.remove("selected");
        b.classList.add("selected");
        renderOpts();
      });
      return b;
    };
    tabs.append(mkTab("local", "local folder"), mkTab("pdf", "PDF"));
    renderOpts();
  });
}
