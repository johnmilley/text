import type { Theme } from "./api";

/**
 * Themes are applied by setting CSS custom properties on :root; both the UI
 * stylesheet and the CodeMirror theme read everything through var(--token).
 * A theme's optional raw CSS rides along in a dedicated <style> tag.
 */
const TOKEN_DEFAULTS: Record<string, string> = {
  bg: "#151618",
  "bg-panel": "#1b1d20",
  "bg-hover": "#222428",
  fg: "#d4d4d0",
  "fg-muted": "#84878c",
  accent: "#8fb4d8",
  heading: "#e8e6e0",
  link: "#8fb4d8",
  tag: "#a8a3c7",
  quote: "#9aa3a8",
  code: "#c9b99a",
  "code-bg": "#1f2125",
  border: "#26282c",
  cursor: "#d4d4d0",
  selection: "#2c3a48",
};

const FONT_DEFAULTS: Record<string, string> = {
  editor: "ui-monospace, monospace",
  ui: "system-ui, sans-serif",
};

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [token, fallback] of Object.entries(TOKEN_DEFAULTS)) {
    root.style.setProperty(`--${token}`, theme.colors[token] ?? fallback);
  }
  for (const [token, fallback] of Object.entries(FONT_DEFAULTS)) {
    root.style.setProperty(`--font-${token}`, theme.fonts[token] ?? fallback);
  }
  root.dataset.dark = String(theme.dark);

  let style = document.getElementById("theme-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "theme-css";
    document.head.appendChild(style);
  }
  style.textContent = theme.css ?? "";
}

export function setFontSize(px: number) {
  document.documentElement.style.setProperty("--editor-font-size", `${px}px`);
}

export function setUiFontSize(px: number) {
  document.documentElement.style.setProperty("--ui-font-size", `${px}px`);
}
