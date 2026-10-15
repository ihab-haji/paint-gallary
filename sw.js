/* Lets the installed app open fast and keep working without internet.
   Pages, code and styles: always try the newest version first, fall back to the saved copy when offline.
   Pictures: use the saved copy (they rarely change). */
const CACHE = 'paint-studio-v1';
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'images.js', 'images-list.js', 'manifest.webmanifest',
	'assets/album.svg', 'assets/board.svg', 'assets/coloring.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
	if (request.url.endsWith('images-data.js')) return; // only needed when opened as a file, never online

	const isPicture = request.destination === 'image';
	const save = (response) => {
		if (response.ok) {
			const copy = response.clone();
			caches.open(CACHE).then((cache) => cache.put(request, copy));
		}

		return response;
	};

	event.respondWith(
		isPicture
			? caches.match(request).then((saved) => saved || fetch(request).then(save))
			: fetch(request).then(save).catch(() => caches.match(request).then((saved) => saved || caches.match('index.html')))
	);
});
