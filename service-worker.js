// Bump CACHE on each shell change so old assets are evicted.
const CACHE = "swell-shell-v5";
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
  const req = e.request;
  const url = new URL(req.url);

  // Live marine/weather data: always go to the network (never serve a stale forecast).
  if (url.hostname.endsWith("open-meteo.com")) {
    return; // default browser fetch
  }

  // Page navigations: network-first so a refresh always picks up the latest
  // deploy (and its version footer). Falls back to cache when offline/slow.
  if (req.mode === "navigate") {
    e.respondWith(navFirst(req));
    return;
  }

  // Other shell assets (manifest, icon): cache-first so they open offline.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

// Network-first with a short timeout, cache fallback keyed to the app shell.
function navFirst(req){
  const shell = () => caches.match(req).then((hit) => hit || caches.match("./index.html"));
  return new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled && r) { settled = true; resolve(r); } };

    // If the network is dragging, fall back to cache after 3s (but keep fetching
    // in the background so the cache is refreshed for next time).
    const timer = setTimeout(() => shell().then(done), 3000);

    fetch(req)
      .then((res) => {
        clearTimeout(timer);
        caches.open(CACHE).then((c) => c.put("./index.html", res.clone()));
        done(res);
      })
      .catch(() => {
        clearTimeout(timer);
        shell().then((hit) => done(hit || Response.error()));
      });
  });
}
