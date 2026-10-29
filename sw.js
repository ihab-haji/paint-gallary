/* Lets the installed app (iPad / Android home screen) open fast and work WITHOUT internet.
   - The first time it opens online, it saves the whole app: pages, code, every picture, your photos and the fonts.
   - Pages, code and styles: always try the newest version first, fall back to the saved copy when offline.
   - Pictures and fonts: use the saved copy (they rarely change). */
const CACHE = 'paint-studio-players-02';
const CORE = ['./', 'index.html', 'style.css', 'letters.css', 'magic.js', 'letters-art.js', 'letters.js', 'app.js', 'images.js', 'images-list.js', 'manifest.webmanifest',
	'assets/album.svg', 'assets/board.svg', 'assets/coloring.svg', 'assets/level2.svg', 'assets/letters.svg', 'assets/blockmath.svg', 'block-math/index.html', 'block-math/vendor/three.min.js',
	'assets/cupball.svg', 'cup-ball/index.html', 'cup-ball/cup-ball.css', 'cup-ball/cup-ball.js', 'cup-ball/words.js', 'cup-ball/audio/ar/index.js', 'cup-ball/audio/en/index.js',
	'assets/memory.svg', 'memory-game/index.html', 'memory-game/cards.js',
	'assets/players/players.js', 'assets/players/p1.png', 'assets/players/p2.png', 'assets/players/p3.png', 'assets/players/p4.png',
	'assets/vendor/gsap.min.js', 'assets/vendor/confetti.js',
	'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png'];
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@500;700;800&family=Fredoka:wght@500;600;700&display=swap';

// read the picture lists (they are written for the page, so give them a "window" to write into)
self.window = self;
try {
	importScripts('images.js', 'images-list.js');
} catch (err) {
	/* no lists: only the core is saved */
}
try {
	importScripts('memory-game/cards.js');
} catch (err) {
	/* no memory game cards: its voice is saved when first played */
}

// the memory game's recorded voice (memory-game/tools/make_voice.py): every card name and phrase, in both languages
function memoryVoice() {
	const keys = ['title', 'look', 'go', 'great1', 'great2', 'great3', 'great4', 'win', 'open', 'prize'];
	(self.MEMORY_THEMES || []).forEach((theme) => keys.push(`th_${theme.id}`, ...theme.items.map((item) => item.id)));

	return ['ar', 'en'].flatMap((lang) => keys.map((key) => `memory-game/audio/${lang}/${key}.mp3`));
}

function allPictures() {
	const config = self.PAINT_CONFIG || {};
	const listed = [...(config.album || []), ...(config.coloring || config.images || []), ...(config.level2 || [])];
	const found = self.PAINT_FOUND_IMAGES || [];
	const files = [...listed, ...found].map((entry) => (typeof entry === 'string' ? entry : entry.file));

	return [...new Set(files)];
}

async function saveFonts(cache) {
	try {
		const css = await fetch(FONTS_CSS);
		await cache.put(FONTS_CSS, css.clone());
		const files = (await css.text()).match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [];
		await Promise.all(files.map((url) => cache.add(url).catch(() => {})));
	} catch (err) {
		/* fonts are nice to have; the app still works with the device font */
	}
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then(async (cache) => {
			// "reload" = always download a fresh copy from the website, never an old one the browser kept
			const fresh = (file) => new Request(file, {cache: 'reload'});
			await cache.addAll(CORE.map(fresh));
			// one missing picture must not stop the rest from being saved
			await Promise.all([...allPictures(), ...memoryVoice()].map((file) => cache.add(fresh(file)).catch(() => {})));
			await saveFonts(cache);
			// tell the open page that everything is saved
			const pages = await self.clients.matchAll({includeUncontrolled: true});
			pages.forEach((page) => page.postMessage('offline-ready'));
		}).then(() => self.skipWaiting())
	);
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
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
	if (url.origin !== self.location.origin && !isFont) return;
	if (url.pathname.endsWith('images-data.js')) return; // only needed when opened as a file, never online

	const save = (response) => {
		if (response.ok || response.type === 'opaque') {
			const copy = response.clone();
			caches.open(CACHE).then((cache) => cache.put(request, copy));
		}

		return response;
	};
	const savedFirst = () => caches.match(request).then((saved) => saved || fetch(request).then(save));
	// "no-cache" = ask the website if there is something newer (cheap when nothing changed)
	const networkFirst = () =>
		fetch(request, {cache: 'no-cache'})
			.then(save)
			.catch(() => caches.match(request, {ignoreSearch: true}).then((saved) => saved || caches.match('index.html')));

	event.respondWith(request.destination === 'image' || isFont ? savedFirst() : networkFirst());
});
