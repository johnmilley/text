import * as api from "./api";

/**
 * Rendered-markdown preview (Ctrl+Shift+M): a pane beside the editor, laid
 * out by the same flex row as the split pane. Markdown is rendered by the
 * backend (pulldown-cmark — also the host renderer mods use), then local
 * targets are resolved here: `data-embed` images through the app's image
 * resolver, `data-wikilink` / `data-path` links back into the app.
 */

export interface PreviewHost {
  getText: () => string;
  getPath: () => string | null;
  isMarkdownish: (path: string) => boolean;
  resolveImage: (target: string) => Promise<string | null>;
  openWikilink: (target: string) => void;
  /** open a relative link target ("dir/note.md") from the current note */
  openRelPath: (target: string) => void;
  openExternal: (url: string) => void;
  /**
   * Render mod block widgets (e.g. dataview) in place of their fenced-code
   * blocks within `root`. Returns a disposer to tear those widgets down before
   * the next render. The same renderers the editor uses, run on the preview.
   */
  renderBlocks: (root: HTMLElement) => () => void;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

let host: PreviewHost;
let on = false;
let timer: number | undefined;
let renderSeq = 0;
let disposeBlocks: (() => void) | null = null;

export const previewOn = () => on;

export function initPreview(h: PreviewHost, onClose: () => void) {
  host = h;
  $("#preview-close").addEventListener("click", onClose);
  $("#preview-body").addEventListener("keydown", onDeckKey);
  $("#preview-body").addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    e.preventDefault();
    const wiki = a.dataset.wikilink;
    const rel = a.dataset.path;
    if (wiki) host.openWikilink(wiki.split("#")[0]);
    else if (rel) host.openRelPath(rel);
    else if (/^https?:/i.test(a.href)) host.openExternal(a.href);
    else if (a.getAttribute("href")?.startsWith("#")) {
      document.getElementById(a.getAttribute("href")!.slice(1))?.scrollIntoView();
    }
  });
}

export function setPreview(v: boolean) {
  on = v;
  $("#preview").hidden = !v;
  if (v) void render();
  else {
    disposeBlocks?.();
    disposeBlocks = null;
  }
}

/** Re-render soon (debounced — called on every keystroke while editing). */
export function schedulePreview() {
  if (!on) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void render(), 300);
}

/** Re-render now (file switched). */
export function refreshPreview() {
  if (!on) return;
  window.clearTimeout(timer);
  void render();
}

// ---------------------------------------------------------------- slide deck
// `slides: true` in the frontmatter turns the preview into a flip-through
// deck — the same split-at-`---` rule the published deck uses (see
// mods/ssg/render.ts) — so a deck can be stepped through while writing it.

let slideIdx = 0;
let slidePath: string | null = null;

/** Same detection as the ssg mod: a leading frontmatter block with a
 * top-level `slides: true`. */
function hasSlidesFlag(text: string): boolean {
  const m = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)\r?\n/.exec(text);
  return !!m && /^\s*slides\s*:\s*true\s*$/im.test(m[1]);
}

/** Show slide `n` (clamped) of whatever deck is currently in the pane. */
function showSlide(n: number) {
  const body = $("#preview-body");
  const slides = Array.from(body.querySelectorAll<HTMLElement>(".pv-slide"));
  if (slides.length === 0) return;
  slideIdx = Math.max(0, Math.min(slides.length - 1, n));
  slides.forEach((s, j) => s.classList.toggle("active", j === slideIdx));
  const count = body.querySelector(".pv-slide-count");
  if (count) count.textContent = `${slideIdx + 1} / ${slides.length}`;
}

/** Deck keys — installed once (initPreview) on the pane, so keydowns from
 * the viewport and the focused ‹/› buttons are both caught. */
function onDeckKey(e: KeyboardEvent) {
  if (!$("#preview-body").classList.contains("preview-slides")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
    e.preventDefault();
    showSlide(slideIdx + 1);
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault();
    showSlide(slideIdx - 1);
  } else if (e.key === "Home") {
    showSlide(0);
  } else if (e.key === "End") {
    showSlide(Number.MAX_SAFE_INTEGER);
  }
}

function buildPreviewDeck(body: HTMLElement, path: string) {
  // keep the slide position across the debounced re-renders while typing,
  // reset it when a different note comes up
  if (path !== slidePath) {
    slidePath = path;
    slideIdx = 0;
  }
  const slides: HTMLElement[] = [];
  let current = document.createElement("section");
  current.className = "pv-slide";
  for (const node of Array.from(body.childNodes)) {
    if (node instanceof HTMLElement && node.tagName === "HR") {
      slides.push(current);
      current = document.createElement("section");
      current.className = "pv-slide";
    } else {
      current.appendChild(node);
    }
  }
  slides.push(current);

  const viewport = document.createElement("div");
  viewport.className = "pv-slide-viewport";
  viewport.tabIndex = 0; // so arrow keys work once the deck is clicked
  viewport.append(...slides);

  const prev = document.createElement("button");
  prev.type = "button";
  prev.textContent = "‹";
  prev.setAttribute("aria-label", "previous slide");
  const count = document.createElement("span");
  count.className = "pv-slide-count";
  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "›";
  next.setAttribute("aria-label", "next slide");
  const controls = document.createElement("div");
  controls.className = "pv-slide-controls";
  controls.append(prev, count, next);

  prev.addEventListener("click", () => showSlide(slideIdx - 1));
  next.addEventListener("click", () => showSlide(slideIdx + 1));
  // click the left/right half to step — unless the click hit something
  // interactive inside the slide
  viewport.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a, button, input, textarea, select, label")) return;
    const rect = viewport.getBoundingClientRect();
    showSlide(e.clientX < rect.left + rect.width / 2 ? slideIdx - 1 : slideIdx + 1);
  });

  body.replaceChildren(viewport, controls);
  showSlide(slideIdx);
}

async function render() {
  const body = $("#preview-body");
  const path = host.getPath();
  // the bar names the note being previewed (mirrors the split pane's bar)
  $("#preview-name").textContent = path ? (path.split("/").pop() ?? "preview") : "preview";
  if (!path || !host.isMarkdownish(path)) {
    disposeBlocks?.();
    disposeBlocks = null;
    body.classList.remove("preview-slides");
    body.replaceChildren();
    const hint = document.createElement("div");
    hint.className = "preview-hint";
    hint.textContent = path ? "not a markdown file" : "no note open";
    body.appendChild(hint);
    return;
  }
  const mine = ++renderSeq;
  const html = await api.renderPreview(host.getText()).catch(() => null);
  if (mine !== renderSeq || html === null) return;
  const scroll = body.scrollTop;
  disposeBlocks?.(); // tear down the previous render's block widgets
  body.innerHTML = html;
  const deck = hasSlidesFlag(host.getText());
  body.classList.toggle("preview-slides", deck);
  if (deck) buildPreviewDeck(body, path);
  disposeBlocks = host.renderBlocks(body);
  if (!deck) body.scrollTop = scroll;
  for (const img of body.querySelectorAll<HTMLImageElement>("img[data-embed]")) {
    void host.resolveImage(img.dataset.embed!).then((src) => {
      if (src && mine === renderSeq) img.src = src;
      else if (mine === renderSeq) {
        const missing = document.createElement("span");
        missing.className = "preview-missing";
        missing.textContent = `missing image: ${img.dataset.embed}`;
        img.replaceWith(missing);
      }
    });
  }
}
