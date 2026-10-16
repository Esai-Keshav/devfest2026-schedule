// DevFest Chennai '26 — offline service worker.
// Cache-first with stale-while-revalidate refresh for same-origin GET requests.
const CACHE = "df26-v1";
const ASSETS = [
    "index.html",
    "config.json",
    "events.json",
    "manifest.webmanifest",
    "assets/icon.svg",
    "assets/icon-192.png",
    "assets/icon-512.png",
    "assets/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
            )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET") return;
    if (new URL(e.request.url).origin !== location.origin) return;
    e.respondWith(
        caches.match(e.request).then((hit) => {
            const refresh = fetch(e.request)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(e.request, copy));
                    return res;
                })
                .catch(() => hit);
            return hit || refresh;
        })
    );
});
