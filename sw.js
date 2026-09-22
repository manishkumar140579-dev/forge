// sw.js — cache-first offline shell. Bump CACHE to ship an update.
const CACHE = "forge-v6";
const ASSETS = [
  "./", "./index.html", "./app.css",
  "./qrcode.js", "./calc.js", "./store.js", "./app.js",
  "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Cross-origin (e.g. Open Food Facts API) → straight to network, never cached.
  if (url.origin !== location.origin) return;

  // Navigations: network-first so a new deploy shows without a hard refresh.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate (fast, but refreshes in background).
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {});
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
