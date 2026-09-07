// Injected before the app loads: a fake Tauri IPC layer so the real frontend
// boots in a plain browser. Mirrors the commands the Rust core answers.
(() => {
  const NOTES_MD = `# Alpha

intro paragraph under alpha with some words.

## Beta

beta body line one.
beta body line two.
beta body line three.

## Gamma

gamma body line one.
gamma body line two.

# Omega

omega body line one.

- a list item
- another list item

\`\`\`js
const x = 1;
const y = 2;
\`\`\`
`;
  const OTHER_MD = `# Other note

just a line here.

## Section two

more text.
`;
  // frontmatter fold, `---` rule, and a mod-rendered fenced block
  const BLOCKS_MD = `---
title: Block sampler
tags: [demo, live]
slides: false
---

Text above the rule.

---

Text below the rule, then a rendered block:

\`\`\`dataview
LIST
\`\`\`

| Feature | Status | Notes |
| --- | :---: | ---: |
| tables | **done** | click a cell |
| history | \`wip\` | ~~later~~ |

Done.
`;
  // exercises every construct live preview hides (livepreview.ts)
  const LIVE_MD = `# Live preview sampler

Some **bold text** and *italic text* and ~~struck out~~ and \`inline code\`
plus ==a highlight== in one paragraph.

A [[wikilink]] and a labelled [[other|by label]] and a
[markdown link](https://example.com) to finish.

> a block quote line
> and its second line

- [ ] an open task
- [x] a finished task
- a plain bullet

## Second heading ##

\`\`\`js
const notHidden = "** stays visible in code **";
\`\`\`
`;
  const FILES = {
    "/vault/live.md": LIVE_MD,
    "/vault/blocks.md": BLOCKS_MD,
    "/vault/notes.md": NOTES_MD,
    "/vault/other.md": OTHER_MD,
    "/vault/stuff/inside.md": "# Inside\n\nhello from a subfolder.\n",
    "/vault/paper.tex": "\\documentclass{article}\\begin{document}hi\\end{document}\n",
  };

  const CONFIG = {
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
    root: "/vault",
    recent_roots: ["/vault"],
    pinned_roots: [],
    daily_dir: "daily",
    image_dir: "",
    sidebar_width: 240,
    sidebar_right: false,
    zen_sidebar: false,
    zen_typewriter: true,
    typewriter_anchor: "top",
    spellcheck: false,
    live_preview: true,
    status_bar: true,
    preview_replaces_editor: false,
    toolbar_capture: true,
    toolbar_calendar: true,
    toolbar_corkboard: true,
    toolbar_scratchpad: true,
    toolbar_preview: true,
    toolbar_order: ["capture", "calendar", "corkboard", "scratchpad"],
    keys: {},
  };

  const TREE = [
    { name: "stuff", path: "/vault/stuff", is_dir: true, mtime: 1, children: [
      { name: "inside.md", path: "/vault/stuff/inside.md", is_dir: false, mtime: 1, children: null },
    ]},
    { name: "blocks.md", path: "/vault/blocks.md", is_dir: false, mtime: 4, children: null },
    { name: "live.md", path: "/vault/live.md", is_dir: false, mtime: 3, children: null },
    { name: "notes.md", path: "/vault/notes.md", is_dir: false, mtime: 2, children: null },
    { name: "other.md", path: "/vault/other.md", is_dir: false, mtime: 1, children: null },
    { name: "paper.tex", path: "/vault/paper.tex", is_dir: false, mtime: 1, children: null },
  ];

  // two stored versions of notes.md, for the file-history picker
  const NOW = Math.floor(Date.now() / 1000);
  const HISTORY = {
    "/vault/notes.md": [
      { ts: NOW - 600, text: "# Alpha\n\nthe version from ten minutes ago.\n" },
      { ts: NOW - 90000, text: "# Alpha\n\nthe version from yesterday.\n" },
    ],
  };

  const THEME = { id: "pt-dark", name: "pt dark", dark: true, colors: {}, fonts: {}, css: null };

  let cbId = 0;
  const handlers = {
    load_config: () => ({ ...CONFIG }),
    save_config: () => null,
    list_themes: () => [THEME],
    themes_dir_path: () => "/vault/.themes",
    window_init_params: () => null,
    list_tree: () => TREE,
    // real backend: dir path → order from that dir's .corkboard file
    folder_orders: () => {
      const out = {};
      for (const [path, text] of Object.entries(FILES)) {
        if (!path.endsWith("/.corkboard")) continue;
        try { out[path.slice(0, -"/.corkboard".length)] = JSON.parse(text).order; } catch {}
      }
      return out;
    },
    watch_root: () => null,
    read_file: ({ path }) => {
      if (!(path in FILES)) throw new Error(`no such file: ${path}`);
      return { content: FILES[path], mtime: 2 };
    },
    stat_mtime: () => 2,
    write_file: ({ path, content }) => { FILES[path] = content; return { mtime: 3, conflict: false }; },
    write_text_file: ({ path, content }) => { FILES[path] = content; },
    create_file: ({ path }) => { FILES[path] = ""; },
    create_dir: () => null,
    collect_notes: () => [],
    search_text: ({ query, opts }) => {
      const ci = !opts?.case_sensitive && !/[A-Z]/.test(query);
      let body = opts?.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (opts?.whole_word) body = `\\b(?:${body})\\b`;
      const re = new RegExp(body, ci ? "gi" : "g"); // throws on a bad pattern
      const hits = [];
      for (const [path, text] of Object.entries(FILES)) {
        text.split("\n").forEach((line, i) => {
          const matches = [];
          for (const m of line.matchAll(re)) {
            matches.push([m.index, m.index + m[0].length]);
            if (!m[0].length) break;
          }
          if (matches.length) hits.push({ path, line: i + 1, text: line.slice(0, 400), matches });
        });
      }
      return hits;
    },
    find_backlinks: () => [],
    snapshot_file: () => false,
    list_history: ({ path }) => (HISTORY[path] ?? []).map((v) => ({ ts: v.ts, bytes: v.text.length })),
    read_history: ({ path, ts }) => (HISTORY[path] ?? []).find((v) => v.ts === ts)?.text ?? "",
    render_preview: ({ text }) => `<p>${(text || "").slice(0, 40)}</p>`,
    read_image: () => ({ base64: "", mtime: 1 }),
    read_base64: () => "",
    copy_file: () => null,
    compile_latex: () => ({ ok: false, pdf_path: "", log: "! LaTeX Error: stub compile — pdflatex is not actually installed in this headless smoke test." }),
  };

  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main", windowLabel: "main" },
    },
    plugins: {},
    transformCallback: (cb) => {
      const id = ++cbId;
      window[`_cb_${id}`] = cb;
      return id;
    },
    convertFileSrc: (src) => src,
    invoke: async (cmd, args = {}) => {
      if (cmd.startsWith("plugin:event|")) return cbId + 1000;
      if (cmd.startsWith("plugin:window|")) {
        if (cmd.endsWith("is_maximized") || cmd.endsWith("is_fullscreen")) return false;
        if (cmd.endsWith("theme")) return "dark";
        if (cmd.endsWith("scale_factor")) return 1;
        return null;
      }
      if (cmd.startsWith("plugin:")) return null;
      const h = handlers[cmd];
      if (!h) {
        console.warn(`[stub] unhandled command: ${cmd}`, JSON.stringify(args).slice(0, 120));
        return null;
      }
      return h(args);
    },
  };
})();
