---
name: verify
description: Drive the pt editor's frontend headlessly (no Xvfb needed) to verify UI changes end-to-end.
---

# Verifying frontend changes in `pt`

The app is Tauri (webkit2gtk) and this machine has no Xvfb/xdotool, but every
frontend change can be verified by booting the **real app** in headless
Chromium with the Tauri IPC layer stubbed — the same seam (`window.__TAURI_INTERNALS__`)
the Rust core fills in production.

## Recipe

1. `npm run dev` in the repo root (vite on **http://localhost:1420**, strict port).
2. In a scratch dir: `npm i puppeteer-core`, launch with
   `executablePath: "/usr/bin/chromium-browser"`, `headless: "new"`, `--no-sandbox`.
3. `page.evaluateOnNewDocument(<contents of tauri-ipc-stub.js>)` **before** `goto`
   — `main.ts` reads `getCurrentWindow().label` at module scope, so the metadata
   must exist first. The stub (in this dir) answers `load_config`, `list_tree`,
   `read_file`, `list_themes`, etc. with a fake `/vault` of markdown files, and
   no-ops `plugin:window|*` / `plugin:event|*`.
4. Wait for `.cm-editor .cm-content`, then drive and `page.screenshot()`.

## Web/mobile variant (PWA path: markdown keybar, body.web, Dropbox backend)

Anything gated on `!platform.isTauri` never runs under the Tauri stub. To test
it, inject **dropbox-fetch-stub.js** (in this dir) instead: it seeds a fake
Dropbox token + `pt.config` in localStorage and answers the Dropbox HTTP API
at the `window.fetch` level with an in-memory `/notes` vault, so the real web
boot path (auth gate → Dropbox backend) runs for real. Add
`page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })`
so `(pointer: coarse)` matches and the markdown keybar mounts. There is no
soft keyboard headless, so the keybar sits at the bottom edge (visualViewport
gap = 0) — correct for screenshots.

## Gotchas

- **Use real input** (`page.mouse.click(x, y)`, `page.keyboard`): synthetic
  `dispatchEvent` clicks don't move the CodeMirror cursor and don't open tree rows.
- Clicking a tree row opens the file **in the current tab**; to get a second tab
  click `#tab-new` first.
- Session tabs restore from `localStorage` (`pt.tabs`) — a fresh headless
  profile starts clean, no stubbing needed.
- To test a light theme, edit the stub's `THEME` colors (copy tokens from
  `src-tauri/themes/*.toml`).
- The web backend in `src/api.ts` rejects everything by design — don't try to
  boot the app in a browser without *one of* the stubs above.
- Kill vite when done: `pkill -f vite`.
