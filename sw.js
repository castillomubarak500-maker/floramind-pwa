/* Each release installs a complete, coherent app shell before it can become active. */
const VERSION = "vision-v2-20260904-1";
const BASE = new URL("./", self.location.href);
const PREFIX = "floramind:" + BASE.pathname + ":";
const CACHE_NAME = PREFIX + VERSION;
const FILES = [
  "./", "index.html", "product/", "product/index.html", "404.html", "product.html", "web/index.html",
  "css/tokens.css", "css/app.css", "css/product.css", "manifest.json",
  "js/icons.js", "js/config.js", "js/storage.js", "js/mock-data.js", "js/api-service.js", "js/core.js",
  "js/charts.js", "js/renderers.js", "js/ui.js", "js/router.js", "js/actions.js", "js/app.js", "js/product.js", "js/pwa.js",
  "assets/floramind-icon-192.png", "assets/floramind-icon-512.png", "assets/plant-system.svg", "qr/floramind-v2.png"
];
const URLS = FILES.map(file => new URL(file, BASE).href);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(URLS.map(url => new Request(url, { cache: "reload" })))));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.indexOf(PREFIX) === 0 && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept writes, another app, cross-origin services, or any API request.
  if (request.method !== "GET" || url.origin !== BASE.origin || url.pathname.indexOf(BASE.pathname) !== 0 || /\/api\//.test(url.pathname)) return;
  url.search = "";
  const known = URLS.indexOf(url.href) >= 0;
  if (!known && request.mode !== "navigate") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Static assets and HTML use the same release cache, avoiding mixed-version modules.
    if (known) {
      const cached = await cache.match(url.href);
      if (cached) return cached;
    }
    try { return await fetch(request); }
    catch (error) {
      if (request.mode === "navigate") return (await cache.match(new URL("404.html", BASE).href)) || Response.error();
      return Response.error();
    }
  })());
});
