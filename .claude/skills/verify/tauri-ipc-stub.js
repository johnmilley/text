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
  const FILES = {
    "/vault/notes.md": NOTES_MD,
    "/vault/other.md": OTHER_MD,
    "/vault/stuff/inside.md": "# Inside\n\nhello from a subfolder.\n",
  };

  const CONFIG = {
    theme: "text-dark",
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
    keys: {},
  };

  const TREE = [
    { name: "stuff", path: "/vault/stuff", is_dir: true, mtime: 1, children: [
      { name: "inside.md", path: "/vault/stuff/inside.md", is_dir: false, mtime: 1, children: null },
    ]},
    { name: "notes.md", path: "/vault/notes.md", is_dir: false, mtime: 2, children: null },
    { name: "other.md", path: "/vault/other.md", is_dir: false, mtime: 1, children: null },
  ];

  const THEME = { id: "text-dark", name: "text dark", dark: true, colors: {}, fonts: {}, css: null };

  let cbId = 0;
  const handlers = {
    load_config: () => ({ ...CONFIG }),
    save_config: () => null,
    list_themes: () => [THEME],
    themes_dir_path: () => "/vault/.themes",
    window_init_params: () => null,
    list_tree: () => TREE,
    watch_root: () => null,
    read_file: ({ path }) => {
      if (!(path in FILES)) throw new Error(`no such file: ${path}`);
      return { content: FILES[path], mtime: 2 };
    },
    stat_mtime: () => 2,
    write_file: ({ path, content }) => { FILES[path] = content; return { mtime: 3, conflict: false }; },
    write_text_file: () => null,
    create_file: ({ path }) => { FILES[path] = ""; },
    create_dir: () => null,
    collect_notes: () => [],
    search_text: () => [],
    find_backlinks: () => [],
    render_preview: ({ text }) => `<p>${(text || "").slice(0, 40)}</p>`,
    read_image: () => ({ base64: "", mtime: 1 }),
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
