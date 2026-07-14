/**
 * Service worker for the installed PWA: cache-first for the app shell
 * (same-origin GET requests — the hashed build assets never change under a
 * URL), network passthrough for everything else (Dropbox). A new deploy
 * changes asset URLs, so stale HTML is the only risk: the shell HTML itself
 * is served network-first with cache fallback, which keeps the app loadable
 * offline yet fresh after deploys.
 */

const CACHE = "pt-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  const isShellDoc = event.request.mode === "navigate";
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (isShellDoc) {
        try {
          const fresh = await fetch(event.request);
          void cache.put(event.request, fresh.clone());
          return fresh;
        } catch {
          const hit = await cache.match(event.request);
          if (hit) return hit;
          throw new Error("offline and not cached");
        }
      }
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const fresh = await fetch(event.request);
      if (fresh.ok) void cache.put(event.request, fresh.clone());
      return fresh;
    })(),
  );
});
