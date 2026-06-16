/**
 * The mod (extension) API for `text`.
 *
 * A mod is a small TypeScript module that receives a {@link TextAPI} object and
 * registers commands, right-click items, toolbar buttons, and startup hooks
 * through it — without touching the editor's internals. The host implements
 * `TextAPI` in main.ts; mods only ever see this interface.
 *
 * Mods are loaded at build time from `src/mods/registry.ts`. See MOD_API.md for
 * the full guide and the static-site-generation mod (`src/mods/ssg`) for a
 * worked example.
 */

import type { Config, Entry, NoteMeta } from "../api";

// Block renderers hook into the editor; their types live with that plumbing.
export type { BlockRenderContext, BlockRendererSpec } from "../blockrender";
import type { BlockRendererSpec } from "../blockrender";

/** What was right-clicked: a file row, a folder row, or the tree background. */
export type ContextScope = "file" | "folder" | "root";

export interface ContextTarget {
  scope: ContextScope;
  /** Absolute path of the file/folder; the open root for `"root"`. */
  path: string;
}

export interface CommandSpec {
  id: string;
  title: string;
  /**
   * Optional default keybinding, e.g. `"ctrl+shift+s"` (use `ctrl` for
   * Cmd on macOS). Users can rebind it in config.toml's `[keys]` under this
   * command's `id`. Omit for commands invoked only via menu/button.
   */
  combo?: string;
  run: () => void;
}

export interface ContextItemSpec {
  label: string;
  /** Which right-click targets show this item. */
  scope: ContextScope[];
  run: (target: ContextTarget) => void;
}

export interface ToolbarButtonSpec {
  id: string;
  label: string;
  title?: string;
  run: () => void;
}

export interface PickDirOptions {
  title?: string;
}

export interface TextAPI {
  /** The app's version string (from package.json). */
  readonly appVersion: string;
  /** The folder currently open in this window, or `null`. */
  currentRoot(): string | null;
  /** A read-only snapshot of the app config (theme, daily_dir, fonts, …). */
  config(): Config;

  // ---- registration: call these from activate() ----
  registerCommand(cmd: CommandSpec): void;
  addContextMenuItem(item: ContextItemSpec): void;
  addToolbarButton(btn: ToolbarButtonSpec): void;
  /**
   * Render a fenced-code block of `spec.lang` as a live widget below the fence
   * (e.g. `dataview`, `mermaid`). The note's source text is never rewritten.
   */
  registerBlockRenderer(spec: BlockRendererSpec): void;
  /** Run `fn` once the app has finished starting up (root opened). */
  onStartup(fn: () => void): void;

  // ---- host services ----
  fs: {
    /** The folder tree the sidebar shows (text/image/av/pdf files only). */
    listTree(root: string): Promise<Entry[]>;
    /** Read a UTF-8 text file. */
    readText(path: string): Promise<string>;
    /** Read any file (incl. binaries) as base64. */
    readBase64(path: string): Promise<string>;
    /** Write text to an exact path, creating parent directories. */
    writeText(path: string, content: string): Promise<void>;
    /** Copy a file to an exact destination path, creating parent dirs. */
    copyFile(src: string, dest: string): Promise<void>;
    /** Create a directory (and any missing parents). */
    createDir(path: string): Promise<void>;
    /** Create an empty file; rejects if it already exists (callers may ignore). */
    createFile(path: string): Promise<void>;
    /** Native folder picker; resolves to the chosen path or `null`. */
    pickDirectory(opts?: PickDirOptions): Promise<string | null>;
  };
  render: {
    /**
     * Markdown → HTML using the host's renderer — the same one the editor
     * preview uses (pulldown-cmark). Wikilinks come back as
     * `<a data-wikilink="target#anchor">`, local links as `<a data-path>`,
     * and embeds as `<img data-embed>` / `<a data-path>` for the mod to
     * resolve against the folder.
     */
    markdownToHtml(text: string): Promise<string>;
  };
  notes: {
    /** Metadata (frontmatter, tags, tasks) for every note in the open folder,
     * cached by the host and refreshed after filesystem changes. */
    collect(): Promise<NoteMeta[]>;
  };
  /** Open a note in the editor, optionally jumping to a 1-based line. */
  openNote(path: string, line?: number): void;
  /** Network access (e.g. the GitHub API). Same signature as `window.fetch`. */
  http: typeof fetch;
  ui: {
    /** Open a modal; `build` populates its box element. */
    info(build: (box: HTMLElement) => void): void;
    /** Yes/no modal; resolves true if confirmed. */
    confirm(message: string, okLabel?: string): Promise<boolean>;
    /** Single-line text prompt; resolves to the value or `null` if cancelled. */
    prompt(label: string, initial?: string): Promise<string | null>;
    /** Close the modal opened via info/confirm/prompt. */
    close(): void;
  };
}

export interface Mod {
  id: string;
  name: string;
  /** Called once at startup — register commands/items/buttons here. */
  activate(app: TextAPI): void;
}
