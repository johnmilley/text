// Injected before the app loads to boot the WEB build (mobile PWA path) in
// headless Chromium: seeds a fake Dropbox auth token + config in localStorage
// and answers the Dropbox HTTP API at the fetch level with an in-memory
// vault. Use this INSTEAD of tauri-ipc-stub.js — with no __TAURI_INTERNALS__
// the app takes the web path (body.web, markdown keybar, Dropbox backend).
// Pair with page.setViewport({ isMobile: true, hasTouch: true }) so
// (pointer: coarse) matches and the keybar mounts.
(() => {
  localStorage.setItem("pt.dropbox.manual_access_token", "sl.fake-token");
  localStorage.setItem(
    "pt.config",
    JSON.stringify({ root: "/notes", recent_roots: ["/notes"], theme: "pt-dark" }),
  );

  const FILES = {
    "/notes/welcome.md":
      "# Welcome\n\nTyping on a phone should feel good. Plain text to format.\n\nA line with a [[other]] wikilink.\n",
    "/notes/other.md": "# Other\n\nbody text.\n",
  };

  const fileMeta = (p) => ({
    ".tag": "file",
    name: p.split("/").pop(),
    id: "id:" + p,
    path_lower: p.toLowerCase(),
    path_display: p,
    client_modified: "2026-07-14T10:00:00Z",
    server_modified: "2026-07-14T10:00:00Z",
    rev: "015f0000000000000000000",
    size: (FILES[p] || "").length,
    is_downloadable: true,
  });
  const folderMeta = (p) => ({
    ".tag": "folder",
    name: p.split("/").pop(),
    id: "id:" + p,
    path_lower: p.toLowerCase(),
    path_display: p,
  });
  const json = (obj) =>
    new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } });

  const orig = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (!/dropboxapi\.com/.test(url)) return orig(input, init);
    const arg = new Headers(init.headers || {}).get("Dropbox-API-Arg");
    const argObj = arg ? JSON.parse(arg) : null;
    if (url.includes("files/list_folder/continue"))
      return json({ entries: [], cursor: "c0", has_more: false });
    if (url.includes("files/list_folder"))
      return json({
        entries: [folderMeta("/notes"), ...Object.keys(FILES).map(fileMeta)],
        cursor: "c0",
        has_more: false,
      });
    if (url.includes("files/download"))
      return new Response(FILES[argObj.path] ?? "", {
        status: 200,
        headers: { "Dropbox-API-Result": JSON.stringify(fileMeta(argObj.path)) },
      });
    if (url.includes("files/upload")) {
      if (typeof init.body === "string") FILES[argObj.path] = init.body;
      return json(fileMeta(argObj.path));
    }
    if (url.includes("files/get_metadata")) return json(fileMeta(JSON.parse(init.body).path));
    return json({});
  };
})();
