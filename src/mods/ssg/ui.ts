/** The "publish as website" dialog: pick a destination (local folder, GitHub
 * Pages, or PDF), set options, and run. UI only — the work lives in
 * render.ts (build) and sinks.ts (emit). */

import type { TextAPI } from "../types";
import { buildSite, gather, type Site } from "./site";
import { generateSite, type OutputFile } from "./render";
import { emitLocal, emitPages, emitPdf } from "./sinks";

type Sink = "local" | "pages" | "pdf";

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

export function openPublishDialog(app: TextAPI, folder: string) {
  app.ui.info((box) => {
    box.classList.add("ssg-box");
    box.append(el("div", "modal-caption", `publish "${folder.split("/").pop()}"`));

    const tabs = el("div", "ssg-tabs");
    const opts = el("div", "ssg-opts");
    const status = el("div", "ssg-status");
    box.append(tabs, opts, status);

    let sink: Sink = (LS.get("sink") as Sink) || "local";
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
      else if (sink === "pages") renderPages();
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
          const { files } = await build(app, folder);
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
          const { site, files } = await build(app, folder);
          await emitPdf(app, files, site, folder.split("/").pop() || "site");
          say("opening the print dialog…");
        }),
      );
    };

    const renderPages = () => {
      opts.append(
        el(
          "div",
          "ssg-note",
          "publish to a GitHub repository's gh-pages branch via the GitHub API. " +
            "needs a personal access token with “Contents” write access to the repo.",
        ),
      );
      const repo = el("input", "ssg-input") as HTMLInputElement;
      repo.placeholder = "owner/repo";
      repo.value = LS.get("repo");
      const slug = el("input", "ssg-input") as HTMLInputElement;
      slug.placeholder = "subfolder (optional, e.g. course-name)";
      slug.value = LS.get("slug");
      const token = el("input", "ssg-input") as HTMLInputElement;
      token.type = "password";
      token.placeholder = "personal access token (ghp_…)";
      token.value = LS.get("token");
      const remember = el("input") as HTMLInputElement;
      remember.type = "checkbox";
      remember.id = "ssg-remember";
      remember.checked = !!LS.get("token");
      const rlabel = el("label", "ssg-note", " remember token on this device");
      rlabel.prepend(remember);

      opts.append(field("repository", repo), field("subfolder", slug), field("token", token), rlabel);

      const row = el("div", "modal-buttons");
      const go = el("button", "danger", "publish to GitHub Pages");
      row.append(go);
      opts.append(row);

      go.addEventListener("click", () =>
        run(async () => {
          if (!repo.value.includes("/")) throw new Error('repository must be "owner/repo"');
          if (!token.value) throw new Error("a personal access token is required");
          LS.set("repo", repo.value.trim());
          LS.set("slug", slug.value.trim());
          LS.set("token", remember.checked ? token.value : "");
          say("building…");
          const { files } = await build(app, folder);
          const result = await emitPages(
            app,
            files,
            { token: token.value.trim(), repo: repo.value.trim(), slug: slug.value.trim() },
            say,
          );
          status.replaceChildren();
          const done = el("div", "", `published (commit ${result.commit}). live in a minute or two:`);
          const link = el("a", "ssg-url", result.url);
          link.href = result.url;
          link.target = "_blank";
          status.append(done, link);
          void navigator.clipboard?.writeText(result.url).catch(() => {});
        }),
      );
    };

    const field = (label: string, input: HTMLElement) => {
      const wrap = el("label", "ssg-field");
      wrap.append(el("span", "ssg-caption", label), input);
      return wrap;
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
    tabs.append(
      mkTab("local", "local folder"),
      mkTab("pages", "GitHub Pages"),
      mkTab("pdf", "PDF"),
    );
    renderOpts();
  });
}
