/* Harbour service worker
   App-shell caching + offline fallback.
   Articles themselves are stored in IndexedDB by the app.
*/

const VERSION = "harbour-v1";
const SHELL = [
	"/",
	"/reading",
	"/highlights",
	"/archive",
	"/tags",
	"/collections",
	"/settings",
	"/manifest.webmanifest",
	"/favicon.svg",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => null))
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET") return;
	const url = new URL(req.url);

	// Don't intercept API extract (we want fresh fetches, and they fail offline gracefully)
	if (url.pathname.startsWith("/api/")) return;

	// Same-origin: stale-while-revalidate
	if (url.origin === location.origin) {
		event.respondWith(
			caches.open(VERSION).then(async (cache) => {
				const cached = await cache.match(req);
				const fetchPromise = fetch(req)
					.then((res) => {
						if (res.ok) cache.put(req, res.clone());
						return res;
					})
					.catch(() => cached || cache.match("/") || Response.error());
				return cached || fetchPromise;
			})
		);
	}
});
