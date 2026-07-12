/**
 * Static-site-generation mod — the reference example for the text mod API.
 *
 * Publishes a folder of notes as a website: rendered markdown with resolved
 * wikilinks/embeds, a sidebar nav, and three destinations (a local folder,
 * GitHub Pages, or a print-to-PDF page). It reaches the app only through
 * {@link TextAPI}; nothing here imports the editor's internals.
 *
 * This replaces the old built-in "share" feature, reborn as a removable mod.
 */

import type { Mod, TextAPI } from "../types";
import { openPublishDialog } from "./ui";

export const ssgMod: Mod = {
  id: "ssg",
  name: "Static site / publish",
  activate(app: TextAPI) {
    const publish = (folder: string | null) => {
      if (folder) openPublishDialog(app, folder);
    };
    // publish a single note: the open root anchors asset resolution
    const publishFile = (file: string) => {
      const root = app.currentRoot();
      if (root) openPublishDialog(app, root, file);
    };

    // Ctrl+Shift+S (rebindable in config.toml [keys] under "publish")
    app.registerCommand({
      id: "publish",
      title: "publish folder as a website",
      combo: "ctrl+shift+s",
      run: () => publish(app.currentRoot()),
    });

    app.addContextMenuItem({
      label: "publish…",
      scope: ["folder", "root"],
      run: (target) => publish(target.path),
    });
    app.addContextMenuItem({
      label: "publish…",
      scope: ["file"],
      run: (target) => publishFile(target.path),
    });

    // no toolbar button: publish is an occasional action, so it lives in the
    // right-click menu, the shortcut, and settings → help — not the file bar
    app.addHelpItem({
      label: "publish",
      button: "publish…",
      hint: "this folder as a website or PDF — also on any folder's right-click, or Ctrl+Shift+S",
      run: () => publish(app.currentRoot()),
    });
  },
};
