// Bump CACHE on each shell change so old assets are evicted.
const CACHE = "swell-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Live marine data: always go to the network (never serve a stale forecast).
  if (url.hostname.endsWith("open-meteo.com")) {
    return; // default browser fetch
  }

  // App shell: cache-first so it opens offline.
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
