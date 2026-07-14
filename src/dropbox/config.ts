/**
 * Config for the web build: same shape and defaults as the desktop
 * config.toml (src-tauri/src/config.rs), stored as JSON in localStorage —
 * per-browser, like the desktop config is per-machine. `root` holds a
 * Dropbox folder path ("/Notes") instead of a filesystem one.
 */

import type { Config } from "../api";

const KEY = "pt.config";
const OLD_KEY = "text.config"; // pre-rename key, migrated in loadConfigLocal

const defaultKeys = (): Record<string, string> => ({
  quick_switch: "ctrl+p",
  new_note: "ctrl+n",
  daily_note: "ctrl+shift+d",
  open_folder: "ctrl+o",
  switch_folder: "ctrl+shift+o",
  search: "ctrl+shift+f",
  backlinks: "ctrl+shift+b",
  theme: "ctrl+shift+t",
  editor_font: "ctrl+shift+e",
  share: "ctrl+shift+s",
  config: "ctrl+,",
  shortcuts: "ctrl+/",
  toggle_sidebar: "ctrl+\\",
  new_tab: "ctrl+t",
  close_tab: "ctrl+w",
  next_tab: "ctrl+tab",
  prev_tab: "ctrl+shift+tab",
  new_window: "ctrl+shift+n",
  split: "ctrl+shift+\\",
  preview: "ctrl+shift+m",
  focus_tree: "ctrl+e",
  calendar: "ctrl+shift+c",
  zen: "alt+z",
});

export const defaultConfig = (): Config => ({
  theme: "pt-dark",
  font_size: 15,
  ui_font_size: 13,
  editor_font: "",
  editor_margin: 24,
  line_width: 80,
  line_numbers: false,
  highlight_line: true,
  vim_mode: false,
  single_line_breaks: false,
  root: null,
  recent_roots: [],
  pinned_roots: [],
  daily_dir: "daily",
  image_dir: "",
  sidebar_width: 240,
  sidebar_right: false,
  zen_sidebar: false,
  zen_typewriter: true,
  typewriter_anchor: "top",
  spellcheck: false,
  preview_replaces_editor: false,
  toolbar_capture: true,
  toolbar_calendar: true,
  toolbar_corkboard: true,
  toolbar_scratchpad: true,
  toolbar_preview: true,
  toolbar_order: ["capture", "calendar", "corkboard", "scratchpad"],
  keys: defaultKeys(),
});

export function loadConfigLocal(): Config {
  const base = defaultConfig();
  try {
    // one-time migration from the pre-rename key, so an already-installed
    // PWA doesn't appear to lose its theme/root/settings after the rename
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (!raw) return base;
    const stored = JSON.parse(raw) as Partial<Config>;
    return { ...base, ...stored, keys: { ...base.keys, ...(stored.keys ?? {}) } };
  } catch {
    return base;
  }
}

export function saveConfigLocal(config: Config): void {
  localStorage.setItem(KEY, JSON.stringify(config));
}
