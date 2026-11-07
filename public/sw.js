/* Service worker: lets the app install, open offline, and load fast.
   It deliberately does NOT touch API calls, so orders and payments are always live. */
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API and payment pages go straight to the network

  // Full page loads: network first, fall back to the last copy, then the offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline")) || Response.error())
    );
    return;
  }

  // Hashed build files and icons never change for a given URL: cache first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            if (res.ok) caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
  // Everything else (including Next's data requests) is left alone
});
