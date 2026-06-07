const CACHE_NAME = "floramind-v1e-generated-device";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=generated-device-20260607b",
  "./app.js",
  "./app.js?v=generated-device-20260607b",
  "./manifest.json",
  "./vendor/lucide.min.js",
  "./assets/floramind-device-3d-hero.png",
  "./assets/floramind-device-3d-detail.png",
  "./assets/floramind-icon-192.png",
  "./assets/floramind-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
