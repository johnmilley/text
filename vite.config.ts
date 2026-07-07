import { defineConfig, type Plugin } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

/**
 * Web-deploy hardening: GitHub Pages can't send HTTP headers, so the CSP
 * ships as a meta tag — but only in plain-web production builds. Rendered
 * markdown passes raw HTML through to the preview (a feature, matching the
 * desktop renderer); with the Dropbox refresh token in localStorage, an
 * injected <script>/onerror in a note must never execute. script-src 'self'
 * blocks every inline or remote script. Tauri builds (TAURI_ENV_PLATFORM
 * set) and dev (HMR needs inline/ws) are left alone.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // themes + CodeMirror inject <style>
  "img-src 'self' data: blob: https:", // note embeds may point anywhere
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.dropboxapi.com https://content.dropboxapi.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

const webCsp = (): Plugin => ({
  name: "web-csp",
  apply: "build",
  transformIndexHtml(html) {
    // @ts-expect-error process is a nodejs global
    if (process.env.TAURI_ENV_PLATFORM) return html;
    return html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    );
  },
});

// https://vite.dev/config/
export default defineConfig(async () => ({
  // GitHub Pages serves the web build from /<repo>/, so plain-web builds use
  // relative asset URLs; Tauri builds keep the default absolute root.
  // @ts-expect-error process is a nodejs global
  base: process.env.TAURI_ENV_PLATFORM ? "/" : "./",
  plugins: [webCsp()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
