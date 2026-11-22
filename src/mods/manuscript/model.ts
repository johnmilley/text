/**
 * The manuscript model: a folder, read in sidebar order, as a list of
 * chapters made of scenes.
 *
 * Structure rules (what a writer would expect from a "binder"):
 *   - every top-level note in the folder is a chapter;
 *   - every top-level subfolder is a chapter too — its notes (recursively, in
 *     sidebar order) are the chapter's scenes, joined with a scene break;
 *   - names starting with `_` or `.` are left out (research, notes, trash),
 *     as is any note whose frontmatter says `compile: false`;
 *   - a leading "01 " / "01-" / "01." number prefix is ordering, not title.
 *
 * Titles: a chapter note's title is its first line when that is a heading
 * (the heading is then lifted out of the text), else frontmatter `title:`,
 * else the file name. A folder chapter takes the folder name. In a folder
 * chapter a scene's leading heading is a label for the writer, not prose,
 * so it is dropped.
 */

import type { Entry } from "../../api";
import type { TextAPI } from "../types";

export interface Settings {
  title: string;
  author: string;
  /** Name on the byline ("by …"); defaults to `author`. */
  penName: string;
  /** Contact block for the manuscript's first page (address, email, phone). */
  contact: string;
  numbering: "none" | "numeric" | "words";
  sceneBreak: string;
  font: "Times New Roman" | "Courier New";
  paper: "letter" | "a4";
  language: string;
  /** Stable book identifier for EPUB (generated once, then kept). */
  uuid: string;
  /** Top-level items (rel paths) unticked in the compile dialog. */
  excluded: string[];
  /** Desktop: the folder the last compile was saved into. */
  lastDir: string;
}

export const SETTINGS_FILE = ".manuscript.json";

export function defaultSettings(folderName: string): Settings {
  return {
    title: displayName(folderName),
    author: "",
    penName: "",
    contact: "",
    numbering: "none",
    sceneBreak: "#",
    font: "Times New Roman",
    paper: "letter",
    language: (navigator.language || "en").split("-")[0],
    uuid: crypto.randomUUID(),
    excluded: [],
    lastDir: "",
  };
}

export interface Scene {
  path: string;
  /** Markdown body: frontmatter, private comments, and (for folder-chapter
   * scenes) the leading label heading removed. */
  body: string;
  words: number;
}

export interface Chapter {
  /** Path relative to the manuscript folder (the exclusion key). */
  rel: string;
  title: string;
  isFolder: boolean;
  scenes: Scene[];
  words: number;
}

// ------------------------------------------------------------ text helpers

const NOTE_RE = /\.(md|markdown|mdown)$/i;
const stemOf = (name: string) => name.replace(/\.[^.]+$/, "");

/** "01 The Storm.md" → "The Storm" (ordering prefixes are not the title). */
export function displayName(name: string): string {
  const s = stemOf(name).trim();
  const stripped = s.replace(/^\d+(\s*[-._)]\s*|\s+)/, "").trim();
  return stripped || s;
}

/** Split YAML-style frontmatter off the top: simple `key: value` lines. */
export function splitFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: text.slice(m[0].length) };
}

/** Private notes never reach the manuscript: `<!-- … -->` and `%% … %%`. */
export const stripComments = (text: string) =>
  text.replace(/[ \t]*<!--[\s\S]*?-->/g, "").replace(/[ \t]*%%[\s\S]*?%%/g, "");

/** Remove a leading ATX heading line; returns its text when there was one. */
function liftHeading(body: string): { heading: string | null; rest: string } {
  const m = /^\s*#{1,6}[ \t]+(.+?)[ \t#]*(?:\r?\n|$)/.exec(body);
  if (!m) return { heading: null, rest: body };
  return { heading: m[1].trim(), rest: body.slice(m[0].length) };
}

/** Words as a reader would count them — markup, link targets, and embeds
 * excluded. */
export function countWords(md: string): number {
  const plain = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[\[[^\]]*\]\]/g, " ") // embeds
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\]\([^)]*\)/g, "]") // link targets
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2"); // wikilink → its label
  return (plain.match(/[\p{L}\p{N}'’-]+/gu) ?? []).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const skipName = (name: string) => name.startsWith("_") || name.startsWith(".");

const compiled = (meta: Record<string, string>) =>
  !/^(false|no|off)$/i.test(meta.compile ?? "") && !/^(true|yes|on)$/i.test(meta.exclude ?? "");

// ------------------------------------------------------------ collect

/** Read `folder` into chapters, in sidebar order. Excluded chapters are still
 * returned (the dialog lists them, unticked); callers filter with
 * `settings.excluded`. */
export async function collectChapters(app: TextAPI, folder: string): Promise<Chapter[]> {
  const tree = await app.fs.listTreeSorted(folder);
  const base = folder.replace(/\/$/, "") + "/";
  const relOf = (p: string) => (p.startsWith(base) ? p.slice(base.length) : p);

  const readScene = async (path: string, dropLabel: boolean): Promise<Scene | null> => {
    const { meta, body } = splitFrontmatter(await app.fs.readText(path));
    if (!compiled(meta)) return null;
    let text = stripComments(body);
    if (dropLabel) text = liftHeading(text).rest;
    return { path, body: text, words: countWords(text) };
  };

  const chapters: Chapter[] = [];
  for (const e of tree) {
    if (skipName(e.name)) continue;
    if (e.is_dir) {
      const scenes: Scene[] = [];
      const walk = async (entries: Entry[]) => {
        for (const c of entries) {
          if (skipName(c.name)) continue;
          if (c.is_dir) await walk(c.children ?? []);
          else if (NOTE_RE.test(c.name)) {
            const s = await readScene(c.path, true);
            if (s && s.body.trim()) scenes.push(s);
          }
        }
      };
      await walk(e.children ?? []);
      if (!scenes.length) continue; // an empty / all-excluded folder
      chapters.push({
        rel: relOf(e.path),
        title: displayName(e.name),
        isFolder: true,
        scenes,
        words: scenes.reduce((n, s) => n + s.words, 0),
      });
    } else if (NOTE_RE.test(e.name)) {
      const { meta, body } = splitFrontmatter(await app.fs.readText(e.path));
      if (!compiled(meta)) continue;
      const { heading, rest } = liftHeading(stripComments(body));
      const words = countWords(rest);
      chapters.push({
        rel: relOf(e.path),
        title: heading ?? meta.title ?? displayName(e.name),
        isFolder: false,
        scenes: [{ path: e.path, body: rest, words }],
        words,
      });
    }
  }
  return chapters;
}

// ------------------------------------------------------------ labels

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000) {
    const rest = n % 100;
    return ONES[Math.floor(n / 100)] + " hundred" + (rest ? " " + numberWords(rest) : "");
  }
  return String(n);
}

const titleCase = (s: string) => s.replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());

/** The heading lines a chapter prints: an optional "Chapter N" line, then the
 * title (left out when it would only repeat the number, e.g. "Chapter 3"). */
export function chapterHeading(ch: Chapter, n: number, s: Settings): { label: string | null; title: string | null } {
  if (s.numbering === "none") return { label: null, title: ch.title };
  const label = s.numbering === "numeric" ? `Chapter ${n}` : `Chapter ${titleCase(numberWords(n))}`;
  const generic = /^(chapter|ch\.?)\s*[\p{L}\p{N}-]*$/iu.test(ch.title) || /^\d+$/.test(ch.title);
  return { label, title: generic ? null : ch.title };
}

/** "about 84,000 words" — manuscript convention: nearest 100 for short work,
 * nearest 1,000 once it is novel-length. */
export function approxWords(n: number): string {
  const r = n < 10000 ? Math.round(n / 100) * 100 : Math.round(n / 1000) * 1000;
  return `about ${Math.max(r, n < 100 ? n : 100).toLocaleString("en-US")} words`;
}
