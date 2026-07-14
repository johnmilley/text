/**
 * Themes for the web build: the same TOML files the desktop app seeds into
 * ~/.config/pt/themes are bundled into the web bundle at build time (via
 * vite glob imports) and parsed here. No custom-themes folder on the web —
 * the bundled set is the whole set.
 */

import type { Theme } from "../api";

const tomls = import.meta.glob("../../src-tauri/themes/*.toml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const csses = import.meta.glob("../../src-tauri/themes/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const stem = (path: string): string => {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.[^.]*$/, "");
};

/**
 * Just enough TOML for the theme files: top-level `name`/`dark`, [colors]
 * and [fonts] sections of `key = "value"` pairs, # comments. Values may
 * contain '#' inside quotes (hex colors), so comments are only stripped
 * outside strings.
 */
function parseThemeToml(src: string): {
  name: string;
  dark: boolean;
  colors: Record<string, string>;
  fonts: Record<string, string>;
} {
  let name = "";
  let dark = false;
  const sections: Record<string, Record<string, string>> = { colors: {}, fonts: {} };
  let section: Record<string, string> | null = null;

  for (const rawLine of src.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sec = /^\[([A-Za-z0-9_-]+)\]$/.exec(line);
    if (sec) {
      section = sections[sec[1]] ?? (sections[sec[1]] = {});
      continue;
    }
    const kv = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let raw = kv[2].trim();
    let value: string;
    const quoted = /^"((?:[^"\\]|\\.)*)"|^'([^']*)'/.exec(raw);
    if (quoted) {
      value = quoted[1] !== undefined ? quoted[1].replace(/\\(.)/g, "$1") : quoted[2];
    } else {
      value = raw.split("#")[0].trim();
    }
    if (section) {
      section[key] = value;
    } else if (key === "name") {
      name = value;
    } else if (key === "dark") {
      dark = value === "true";
    }
  }
  return { name, dark, colors: sections.colors, fonts: sections.fonts };
}

let cache: Theme[] | null = null;

export function bundledThemes(): Theme[] {
  if (cache) return cache;
  const cssById = new Map(Object.entries(csses).map(([p, s]) => [stem(p), s]));
  const out: Theme[] = [];
  for (const [path, src] of Object.entries(tomls)) {
    const id = stem(path);
    try {
      const t = parseThemeToml(src);
      out.push({
        id,
        name: t.name || id,
        dark: t.dark,
        colors: t.colors,
        fonts: t.fonts,
        css: cssById.get(id) ?? null,
      });
    } catch (e) {
      console.error(`theme ${id}:`, e);
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  cache = out;
  return out;
}
