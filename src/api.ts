import { invoke } from "@tauri-apps/api/core";

export interface Entry {
  name: string;
  path: string;
  is_dir: boolean;
  children: Entry[] | null;
}

export interface FileContent {
  content: string;
  mtime: number;
}

export interface WriteResult {
  mtime: number;
  conflict: boolean;
}

export interface Hit {
  path: string;
  line: number;
  text: string;
  start: number;
  end: number;
}

export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  css: string | null;
}

export interface Config {
  theme: string;
  font_size: number;
  ui_font_size: number;
  vim_mode: boolean;
  root: string | null;
  daily_dir: string;
  image_dir: string;
  sidebar_width: number;
}

export interface ImageContent {
  base64: string;
  mtime: number;
}

export const listTree = (root: string) => invoke<Entry[]>("list_tree", { root });
export const readFile = (path: string) => invoke<FileContent>("read_file", { path });
export const readImage = (path: string) => invoke<ImageContent>("read_image", { path });
export const writeFile = (path: string, content: string, expectedMtime: number | null) =>
  invoke<WriteResult>("write_file", { path, content, expectedMtime });
export const statMtime = (path: string) => invoke<number>("stat_mtime", { path });
export const createFile = (path: string) => invoke<void>("create_file", { path });
export const createDir = (path: string) => invoke<void>("create_dir", { path });
export const renamePath = (from: string, to: string) => invoke<void>("rename_path", { from, to });
export const importFile = (src: string, destDir: string) =>
  invoke<string>("import_file", { src, destDir });
export const writeBase64 = (destDir: string, name: string, base64: string) =>
  invoke<string>("write_base64", { destDir, name, base64 });
export const trashPath = (path: string) => invoke<void>("trash_path", { path });
export const searchText = (root: string, query: string) =>
  invoke<Hit[]>("search_text", { root, query });
export const findBacklinks = (root: string, target: string) =>
  invoke<Hit[]>("find_backlinks", { root, target });
export const listThemes = () => invoke<Theme[]>("list_themes");
export const themesDirPath = () => invoke<string>("themes_dir_path");
export const loadConfig = () => invoke<Config>("load_config");
export const saveConfig = (config: Config) => invoke<void>("save_config", { config });
export const watchRoot = (root: string) => invoke<void>("watch_root", { root });
