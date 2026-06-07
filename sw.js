const CACHE_NAME = "floramind-v1c-light-glass";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=light-glass-20260607",
  "./app.js",
  "./app.js?v=light-glass-20260607",
  "./manifest.json",
  "./vendor/lucide.min.js",
  "./assets/plan_p28_img6.jpg",
  "./assets/plan_p29_img6.jpg",
  "./assets/plan_p30_img6.jpg",
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
