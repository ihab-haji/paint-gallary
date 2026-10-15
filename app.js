(() => {
	'use strict';

	// ---------------- Settings ----------------
	const CONFIG = window.PAINT_CONFIG || {title: 'My Paint Studio', images: []};
	// rainbow order, each color dark → bright → light, then skin & browns, then black / grays / white
	const COLORS = [
		'#7f1d1d', '#b91c1c', '#ef4444', '#ff6f61', '#fca5a5', // reds & coral
		'#c2410c', '#ff8c42', '#ffb347', '#fed7aa', // oranges & peach
		'#b8860b', '#d49b14', '#f5c242', '#fde047', '#fef3a0', // golds & yellows
		'#556b2f', '#84cc16', '#bef264', // olive & limes
		'#14532d', '#166534', '#2f8a3c', '#3ddc84', '#86efac', '#d1fae5', // greens & mint
		'#0f766e', '#14b8a6', '#22c3c3', '#a5f3fc', // teals & aqua
		'#0c1e5b', '#1e3a8a', '#2563eb', '#4a5cff', '#3bb2ff', '#7dd3fc', '#bae6fd', // navy & blues & sky
		'#3b0764', '#6b21a8', '#9b5cff', '#c4b5fd', '#ddd6fe', // purples & lavender
		'#86198f', '#d946ef', '#f0abfc', // magentas
		'#9d174d', '#be185d', '#ff5fa2', '#f9a8d4', '#fbcfe8', // pinks
		'#3e2412', '#5b3a1e', '#8b5a2b', '#a0522d', '#c68642', '#d2a679', '#e0ac69', '#f5c9a0', '#fde3cf', '#f5f0e1', // browns, skin, beige
		'#111111', '#374151', '#4b5563', '#9ca3af', '#d1d5db', '#e5e7eb', '#ffffff' // black, grays, white
	];
	const DEFAULT_COLOR = '#ef4444';
	const SIZES = [8, 18, 32, 54];
	const STICKER_SIZES = [40, 70, 110, 160]; // the same 4 size buttons, used for stickers
	const PEN_SIZES = [3, 6, 10, 16]; // the pen draws thin lines
	const TOOL_ICONS = {pen: '✏️', brush: '🖌️', rainbow: '🖌️', fill: '🪣', eraser: '🧽'};
	const BOARD_FILE = 'magic-board';
	const SECTIONS = [
		{id: 'album', cover: 'assets/album.svg', icon: '📸'},
		{id: 'board', cover: 'assets/board.svg', icon: '🪄'},
		{id: 'coloring', cover: 'assets/coloring.svg', icon: '🖍️'}
	];
	const STICKERS = [
		'⭐', '❤️', '🌈', '🦄', '🐶', '🐱', '🌸', '🦋', '☀️', '🌙', '🍦', '🚀', '👑', '🎈', '🍓', '🐠',
		// wild animals
		'🦁', '🐯', '🐒', '🦒', '🐘', '🦓', '🐊', '🐍', '🦎', '🦘', '🐻‍❄️', '🐆', '🦌', '🦅', '🦉', '🐧'
	];
	const TILTS = [-2, 1.5, -1, 2, -1.5, 1];
	const MAX_SIDE = 1400;
	const MIN_SIDE = 900;
	const MAX_HISTORY = 10;

	const TEXT = {
		en: {
			badge: 'Coloring time for little artists',
			heroLine1: "Let's paint",
			heroLine2: '& have fun!',
			subtitle: 'Where do you want to start today? ✨',
			sec_album: 'My Album',
			sec_album_sub: 'Paint on my photos',
			sec_board: 'Magic Board',
			sec_board_sub: 'Draw anything I like',
			sec_coloring: 'Coloring Book',
			sec_coloring_sub: 'Color fun pictures',
			emptyAlbum: 'No photos yet — add one with the ➕ button!',
			pen: 'Pen',
			pictures: 'Pictures',
			colors: 'Colors',
			stickers: 'Stickers',
			addPhoto: 'Add a photo',
			back: 'Back',
			brush: 'Brush',
			rainbow: 'Rainbow',
			fill: 'Fill',
			eraser: 'Eraser',
			undo: 'Undo',
			clear: 'Clean',
			save: 'Save',
			lines: 'Lines on top',
			cleaned: 'All clean! Press Undo to bring it back ↩️',
			saved: 'Wow! Your painting is saved 🌟',
			openFail: 'Oops! This picture could not open 🙈',
			fillOffline: '🙈 🪣',
			nothingToUndo: 'Nothing to undo 🙂',
			switchLang: 'عربي',
			fullscreen: 'Full screen',
			exitFullscreen: 'Exit',
			install: 'Install the app',
			guideTitle: 'Make it a real app',
			guideSub: 'Full screen with nothing to tap by mistake — perfect for little hands.',
			guideStep1: 'Tap the Share button in Safari',
			guideStep2: 'Choose “Add to Home Screen”',
			guideStep3: 'Open “مرسمي” from the home screen',
			guideOk: 'Got it 👍'
		},
		ar: {
			badge: 'وقت التلوين للفنانين الصغار',
			heroLine1: 'هيا نرسم',
			heroLine2: 'ونستمتع!',
			subtitle: 'من أين تحب أن تبدأ اليوم؟ ✨',
			sec_album: 'ألبومي',
			sec_album_sub: 'لوّن على صوري',
			sec_board: 'اللوح السحري',
			sec_board_sub: 'ارسم ما تحب',
			sec_coloring: 'كتاب التلوين',
			sec_coloring_sub: 'لوّن صورًا ممتعة',
			emptyAlbum: 'لا توجد صور بعد — أضف صورة بزر ➕',
			pen: 'قلم',
			pictures: 'صورة',
			colors: 'لون',
			stickers: 'ملصقات',
			addPhoto: 'أضف صورة',
			back: 'رجوع',
			brush: 'فرشاة',
			rainbow: 'قوس قزح',
			fill: 'تعبئة',
			eraser: 'ممحاة',
			undo: 'تراجع',
			clear: 'مسح',
			save: 'حفظ',
			lines: 'الخطوط فوق',
			cleaned: 'أصبحت نظيفة! اضغط تراجع لإعادتها ↩️',
			saved: 'رائع! تم حفظ لوحتك 🌟',
			openFail: 'عذرًا! لم تفتح الصورة 🙈',
			fillOffline: '🙈 🪣',
			nothingToUndo: 'لا يوجد شيء للتراجع 🙂',
			switchLang: 'English',
			fullscreen: 'ملء الشاشة',
			exitFullscreen: 'خروج',
			install: 'ثبّت التطبيق',
			guideTitle: 'اجعله تطبيقًا حقيقيًا',
			guideSub: 'ملء الشاشة بدون أي شيء يُضغط بالخطأ — مثالي للأيدي الصغيرة.',
			guideStep1: 'اضغط زر المشاركة في سفاري',
			guideStep2: 'اختر «إضافة إلى الشاشة الرئيسية»',
			guideStep3: 'افتح «مرسمي» من الشاشة الرئيسية',
			guideOk: 'فهمت 👍'
		}
	};

	// ---------------- Elements & state ----------------
	const $ = (id) => document.getElementById(id);
	const els = {
		gallery: $('gallery'),
		studio: $('studio'),
		grid: $('grid'),
		sections: $('sections'),
		listHeader: $('listHeader'),
		sectionsBtn: $('sectionsBtn'),
		sectionIcon: $('sectionIcon'),
		sectionTitle: $('sectionTitle'),
		emptyAlbum: $('emptyAlbum'),
		toolIcon: $('toolIcon'),
		emptyAddBtn: $('emptyAddBtn'),
		brandName: $('brandName'),
		langBtn: $('langBtn'),
		langLabel: $('langLabel'),
		picName: $('pictureName'),
		home: $('homeBtn'),
		undo: $('undoBtn'),
		clear: $('clearBtn'),
		save: $('saveBtn'),
		sound: $('soundBtn'),
		tools: $('tools'),
		stage: $('stage'),
		wrap: $('canvasWrap'),
		photo: $('photoCanvas'),
		paint: $('paintCanvas'),
		stickerLayer: $('stickerCanvas'),
		cursor: $('brushCursor'),
		stickerPreview: $('stickerPreview'),
		palette: $('palette'),
		sizes: $('sizes'),
		stickers: $('stickers'),
		lines: $('linesBtn'),
		toast: $('toast'),
		confetti: $('confetti'),
		file: $('fileInput')
	};

	const photoCtx = els.photo.getContext('2d');
	const paintCtx = els.paint.getContext('2d');
	const stickerCtx = els.stickerLayer.getContext('2d'); // stickers sit above the picture lines
	const scratch = document.createElement('canvas');

	const state = {
		lang: localStorage.getItem('paint-lang-v2') || 'ar', // Arabic first; the عربي / English button switches
		tool: 'brush',
		color: DEFAULT_COLOR,
		size: SIZES[1],
		sticker: STICKERS[0],
		linesOnTop: true,
		sound: localStorage.getItem('paint-sound') !== 'off',
		hue: 0,
		drawing: false,
		stickerDrag: null, // a new sticker being placed (and grown)
		stickerItems: [], // stickers on the picture: {emoji, x, y, size, rotation} in canvas pixels
		moving: null, // a sticker the child picked up and is dragging
		stickerHintShown: false,
		pointerId: null,
		last: null,
		item: null,
		view: 'sections', // 'sections' | 'album' | 'coloring'
		history: [],
		uploaded: [],
		saved: new Map() // picture file -> canvas with the child's painting (kept while the page is open)
	};

	// ---------------- Helpers ----------------
	const t = (key) => TEXT[state.lang][key] || TEXT.en[key] || key;

	function localized(value) {
		if (value && typeof value === 'object') return value[state.lang] || value.en || Object.values(value)[0];

		return value || '';
	}

	function nameFromFile(file) {
		const base = decodeURIComponent(file.split('/').pop().replace(/\.[^.]+$/, ''));

		return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function normalizeItem(item) {
		if (typeof item === 'string') return {file: item, name: nameFromFile(item)};

		return {file: item.file, name: item.name || nameFromFile(item.file)};
	}

	function hexToRgb(hex) {
		const n = parseInt(hex.slice(1), 16);

		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	let toastTimer = null;

	function toast(message) {
		els.toast.textContent = message;
		els.toast.classList.add('show');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
	}

	// ---------------- Sounds (tiny, generated — no files needed) ----------------
	let audioCtx = null;

	function beep({freq = 600, duration = 0.09, type = 'sine', volume = 0.12} = {}) {
		if (!state.sound) return;
		try {
			audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
			const now = audioCtx.currentTime;
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = type;
			osc.frequency.setValueAtTime(freq, now);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + duration);
			gain.gain.setValueAtTime(volume, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
			osc.connect(gain).connect(audioCtx.destination);
			osc.start(now);
			osc.stop(now + duration);
		} catch (err) {
			/* sound is optional */
		}
	}

	function melody(notes) {
		notes.forEach((freq, i) => setTimeout(() => beep({freq, duration: 0.16, type: 'triangle'}), i * 120));
	}

	// ---------------- Language ----------------
	function applyLanguage() {
		document.documentElement.lang = state.lang;
		document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
		document.querySelectorAll('[data-i18n]').forEach((el) => {
			el.textContent = t(el.dataset.i18n);
		});
		const title = localized(CONFIG.title) || 'My Paint Studio';
		els.brandName.textContent = title;
		document.title = `${title} 🎨`;
		els.langLabel.textContent = t('switchLang');
		renderFullscreenButtons();
		if (state.item) els.picName.textContent = localized(state.item.name);
		buildGallery();
	}

	// ---------------- Gallery ----------------
	function itemsOf({section}) {
		const configured = section === 'album' ? CONFIG.album : CONFIG.coloring || CONFIG.images;
		const listed = (configured || []).map(normalizeItem);
		const known = new Set(listed.map((item) => item.file));
		const found = (window.PAINT_FOUND_IMAGES || [])
			.map((entry) => (typeof entry === 'string' ? {file: entry, section: 'coloring'} : entry))
			.filter((entry) => entry.section === section && !known.has(entry.file))
			.map((entry) => normalizeItem(entry.file));
		const uploaded = section === 'album' ? state.uploaded : [];

		return [...listed, ...found, ...uploaded].map((item) => ({...item, section}));
	}

	function boardItem() {
		return {file: BOARD_FILE, name: {en: TEXT.en.sec_board, ar: TEXT.ar.sec_board}, section: 'board'};
	}

	let boardDataUrl = null;

	function blankBoard() {
		if (!boardDataUrl) {
			const c = document.createElement('canvas');
			c.width = 1400;
			c.height = 1000;
			const ctx = c.getContext('2d');
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, c.width, c.height);
			boardDataUrl = c.toDataURL('image/png');
		}

		return boardDataUrl;
	}

	/* Pictures packed by update-pictures.command, so Fill & Save work even when opened by double-click. */
	function pictureSource(file) {
		if (file === BOARD_FILE) return blankBoard();

		return (window.PAINT_IMAGE_DATA || {})[file] || file;
	}

	function loadScript(src) {
		return new Promise((resolve) => {
			const script = document.createElement('script');
			script.src = src;
			script.onload = resolve;
			script.onerror = resolve;
			document.head.appendChild(script);
		});
	}

	function buildGallery() {
		const inSection = state.view !== 'sections';
		els.gallery.classList.toggle('list-view', inSection);
		els.sections.classList.toggle('hidden', inSection);
		els.listHeader.classList.toggle('hidden', !inSection);
		els.grid.classList.toggle('hidden', !inSection);

		if (!inSection) {
			buildSections();
			els.emptyAlbum.classList.add('hidden');

			return;
		}

		const section = SECTIONS.find((sec) => sec.id === state.view);
		els.sectionIcon.textContent = section.icon;
		els.sectionTitle.textContent = t(`sec_${section.id}`);
		const items = itemsOf({section: state.view});
		els.grid.innerHTML = '';
		items.forEach((item, i) => els.grid.appendChild(makeCard({item, index: i})));
		const albumIsEmpty = state.view === 'album' && items.length === 0;
		if (state.view === 'album' && !albumIsEmpty) els.grid.appendChild(makeAddCard({index: items.length}));
		els.emptyAlbum.classList.toggle('hidden', !albumIsEmpty);
		els.grid.classList.toggle('hidden', albumIsEmpty);
	}

	function buildSections() {
		els.sections.innerHTML = '';
		SECTIONS.forEach((section, i) => {
			const tile = document.createElement('button');
			tile.type = 'button';
			tile.className = `section-tile tile-${section.id}`;
			tile.style.animationDelay = `${i * 90}ms`;

			const cover = document.createElement('div');
			cover.className = 'section-cover';
			const img = document.createElement('img');
			img.src = section.cover;
			img.alt = '';
			cover.appendChild(img);

			const count = section.id === 'board' ? 0 : itemsOf({section: section.id}).length;
			if (count > 0) {
				const bubble = document.createElement('span');
				bubble.className = 'section-count';
				bubble.textContent = count;
				cover.appendChild(bubble);
			}
			if (section.id === 'board' && state.saved.has(BOARD_FILE)) {
				const badge = document.createElement('span');
				badge.className = 'painted-badge';
				badge.textContent = '🎨';
				tile.appendChild(badge);
			}

			const label = document.createElement('div');
			label.className = 'section-label';
			const name = document.createElement('b');
			name.textContent = `${section.icon} ${t(`sec_${section.id}`)}`;
			const sub = document.createElement('small');
			sub.textContent = t(`sec_${section.id}_sub`);
			label.append(name, sub);

			tile.append(cover, label);
			tile.addEventListener('click', () => openSection({id: section.id}));
			els.sections.appendChild(tile);
		});
	}

	function openSection({id}) {
		if (id === 'board') {
			openPicture({item: boardItem()});

			return;
		}
		state.view = id;
		beep({freq: 560, type: 'triangle'});
		buildGallery();
		els.gallery.scrollTo(0, 0);
	}

	els.emptyAddBtn.addEventListener('click', () => els.file.click());

	els.sectionsBtn.addEventListener('click', () => {
		state.view = 'sections';
		beep({freq: 440});
		buildGallery();
		els.gallery.scrollTo(0, 0);
	});

	function makeCard({item, index}) {
		const card = document.createElement('button');
		card.type = 'button';
		card.className = 'card';
		card.style.setProperty('--tilt', `${TILTS[index % TILTS.length]}deg`);
		card.style.animationDelay = `${Math.min(index, 8) * 60}ms`;

		const thumb = document.createElement('div');
		thumb.className = 'thumb';
		const img = document.createElement('img');
		img.src = item.file;
		img.alt = localized(item.name);
		img.loading = 'lazy';
		img.onerror = () => {
			thumb.textContent = '🙈';
		};
		thumb.appendChild(img);

		const label = document.createElement('div');
		label.className = 'label';
		const text = document.createElement('span');
		text.textContent = localized(item.name);
		const go = document.createElement('span');
		go.className = 'go';
		go.textContent = '🖌️';
		label.append(text, go);

		card.append(thumb, label);

		if (state.saved.has(item.file)) {
			const badge = document.createElement('span');
			badge.className = 'painted-badge';
			badge.textContent = '🎨';
			card.appendChild(badge);
		}

		card.addEventListener('click', () => openPicture({item}));

		return card;
	}

	function makeAddCard({index}) {
		const card = document.createElement('button');
		card.type = 'button';
		card.className = 'card add';
		card.style.setProperty('--tilt', `${TILTS[index % TILTS.length]}deg`);
		card.style.animationDelay = `${Math.min(index, 8) * 60}ms`;
		card.innerHTML = '<div class="thumb"><span class="plus">+</span><span>📷</span></div>';
		const label = document.createElement('div');
		label.className = 'label';
		label.textContent = t('addPhoto');
		card.appendChild(label);
		card.addEventListener('click', () => els.file.click());

		return card;
	}

	els.file.addEventListener('change', () => {
		const files = [...els.file.files];
		const added = files.map((f) => ({file: URL.createObjectURL(f), name: nameFromFile(f.name), section: 'album'}));
		state.uploaded.push(...added);
		els.file.value = '';
		state.view = 'album';
		buildGallery();
		if (added.length === 1) openPicture({item: added[0]});
	});

	// ---------------- Screens ----------------
	function showScreen({name}) {
		els.gallery.classList.toggle('active', name === 'gallery');
		els.studio.classList.toggle('active', name === 'studio');
		if (name === 'studio') requestAnimationFrame(fitCanvas);
	}

	function rememberPainting() {
		if (!state.item || !els.paint.width) return;
		const copyOf = (canvas) => {
			const copy = document.createElement('canvas');
			copy.width = canvas.width;
			copy.height = canvas.height;
			copy.getContext('2d').drawImage(canvas, 0, 0);

			return copy;
		};
		state.saved.set(state.item.file, {paint: copyOf(els.paint), stickers: state.stickerItems.map((st) => ({...st}))});
	}

	function goHome() {
		rememberPainting();
		if (state.item && state.item.section === 'board') state.view = 'sections';
		state.item = null;
		beep({freq: 440});
		buildGallery();
		showScreen({name: 'gallery'});
	}

	function openPicture({item}) {
		beep({freq: 520});
		const img = new Image();
		img.onload = () => {
			setupCanvases({img, item});
			state.item = item;
			els.picName.textContent = localized(item.name);
			els.lines.classList.toggle('hidden', item.section === 'board');
			showScreen({name: 'studio'});
		};
		img.onerror = () => toast(t('openFail'));
		img.src = pictureSource(item.file);
	}

	function setupCanvases({img, item}) {
		const nw = img.naturalWidth || 1000;
		const nh = img.naturalHeight || 800;
		const long = Math.max(nw, nh);
		const k = Math.min(MAX_SIDE, Math.max(MIN_SIDE, long)) / long;
		const w = Math.round(nw * k);
		const h = Math.round(nh * k);

		[els.photo, els.paint, els.stickerLayer].forEach((c) => {
			c.width = w;
			c.height = h;
		});
		photoCtx.fillStyle = '#fff';
		photoCtx.fillRect(0, 0, w, h);
		photoCtx.drawImage(img, 0, 0, w, h);
		paintCtx.clearRect(0, 0, w, h);
		const previous = state.saved.get(item.file);
		if (previous) paintCtx.drawImage(previous.paint, 0, 0, w, h);
		state.stickerItems = previous ? previous.stickers.map((st) => ({...st})) : [];
		state.moving = null;
		renderStickers();

		state.history = [];
		updateUndo();
	}

	function fitCanvas() {
		if (!els.photo.width || !els.studio.classList.contains('active')) return;
		const border = 20;
		const sw = els.stage.clientWidth - border;
		const sh = els.stage.clientHeight - border;
		const k = Math.min(sw / els.photo.width, sh / els.photo.height);
		els.wrap.style.width = `${Math.floor(els.photo.width * k) + border}px`;
		els.wrap.style.height = `${Math.floor(els.photo.height * k) + border}px`;
	}

	if ('ResizeObserver' in window) new ResizeObserver(fitCanvas).observe(els.stage);
	window.addEventListener('resize', fitCanvas);

	// ---------------- Toolbox UI ----------------
	function buildPalette() {
		COLORS.forEach((color) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'swatch';
			b.style.setProperty('--swatch', color);
			b.dataset.color = color;
			b.setAttribute('aria-label', color);
			b.addEventListener('click', () => pickColor({color, button: b}));
			els.palette.appendChild(b);
		});

		const custom = document.createElement('label');
		custom.className = 'swatch custom';
		custom.title = '🎨';
		const input = document.createElement('input');
		input.type = 'color';
		input.value = '#ff66cc';
		input.addEventListener('input', () => pickColor({color: input.value, button: custom}));
		custom.appendChild(input);
		els.palette.appendChild(custom);

		els.palette.querySelector(`[data-color='${DEFAULT_COLOR}']`).classList.add('active');
	}

	function pickColor({color, button}) {
		button.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'}); // glide the chosen color to the middle
		state.color = color;
		els.palette.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s === button));
		if (['eraser', 'rainbow', 'sticker'].includes(state.tool)) setTool({tool: 'brush'});
		refreshToolIcon();
		beep({freq: 660 + Math.random() * 300, type: 'triangle'});
	}

	function buildSizes() {
		SIZES.forEach((size, i) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'size' + (size === state.size ? ' active' : '');
			b.style.setProperty('--d', `${Math.min(10 + i * 10, 40)}px`);
			b.style.setProperty('--e', `${14 + i * 8}px`);
			b.innerHTML = `<i></i><em>${state.sticker}</em>`;
			b.addEventListener('click', () => {
				state.size = size;
				els.sizes.querySelectorAll('.size').forEach((s) => s.classList.toggle('active', s === b));
				beep({freq: 900 - i * 150});
			});
			els.sizes.appendChild(b);
		});
	}

	function buildStickers() {
		STICKERS.forEach((sticker, i) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'sticker' + (i === 0 ? ' active' : '');
			b.textContent = sticker;
			b.addEventListener('click', () => {
				state.sticker = sticker;
				els.stickers.querySelectorAll('.sticker').forEach((s) => s.classList.toggle('active', s === b));
				els.sizes.querySelectorAll('em').forEach((em) => {
					em.textContent = sticker;
				});
				refreshToolIcon();
				beep({freq: 880, type: 'triangle'});
			});
			els.stickers.appendChild(b);
		});
	}

	function setTool({tool, silent = false}) {
		state.tool = tool;
		els.tools.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
		els.sizes.classList.toggle('hidden', tool === 'fill');
		els.stickers.classList.toggle('hidden', tool !== 'sticker');
		const stickerGroup = els.stickers.closest('.scroll-group');
		if (stickerGroup) stickerGroup.classList.toggle('hidden', tool !== 'sticker');
		els.sizes.classList.toggle('sticker-mode', tool === 'sticker');
		if (tool === 'sticker' && !silent && !state.stickerHintShown) {
			state.stickerHintShown = true;
			toast('👆 ↔️ ⭐');
		}
		els.palette.classList.toggle('dim', ['eraser', 'rainbow', 'sticker'].includes(tool));
		els.paint.dataset.tool = tool;
		refreshToolIcon();
		if (!silent) beep({freq: 720});
	}

	els.tools.addEventListener('click', (e) => {
		const b = e.target.closest('[data-tool]');
		if (b) setTool({tool: b.dataset.tool});
	});

	// ---------------- Drawing ----------------
	function toCanvasPoint(e) {
		const r = els.paint.getBoundingClientRect();
		const scale = els.paint.width / r.width;

		return {x: (e.clientX - r.left) * scale, y: (e.clientY - r.top) * scale, scale};
	}

	// the pen draws thin crisp lines, the brush paints thick soft strokes
	function lineSize() {
		return state.tool === 'pen' ? PEN_SIZES[Math.max(0, SIZES.indexOf(state.size))] : state.size;
	}

	function applyStrokeStyle({ctx, scale}) {
		ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
		ctx.lineWidth = lineSize() * scale;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		let color = state.color;
		if (state.tool === 'rainbow') {
			state.hue = (state.hue + 2) % 360;
			color = `hsl(${state.hue}, 95%, 58%)`;
		}
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = state.tool === 'brush' ? lineSize() * scale * 0.45 : 0;
	}

	// brushes paint on the paint layer; the eraser also removes any sticker it rubs over
	function strokeLayers() {
		return [paintCtx];
	}

	function eraseStickers({p}) {
		const reach = (lineSize() * p.scale) / 2;
		const before = state.stickerItems.length;
		state.stickerItems = state.stickerItems.filter((st) => Math.hypot(p.x - st.x, p.y - st.y) > st.size * 0.4 + reach);
		if (state.stickerItems.length !== before) {
			renderStickers();
			beep({freq: 300, duration: 0.12, type: 'triangle'});
		}
	}

	function drawDot({p}) {
		if (state.tool === 'eraser') eraseStickers({p});
		strokeLayers().forEach((ctx) => {
			applyStrokeStyle({ctx, scale: p.scale});
			ctx.beginPath();
			ctx.arc(p.x, p.y, (lineSize() * p.scale) / 2, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalCompositeOperation = 'source-over';
			ctx.shadowBlur = 0;
		});
	}

	function drawSegment({from, to}) {
		if (state.tool === 'eraser') eraseStickers({p: to});
		strokeLayers().forEach((ctx) => {
			applyStrokeStyle({ctx, scale: to.scale});
			ctx.beginPath();
			ctx.moveTo(from.x, from.y);
			ctx.lineTo(to.x, to.y);
			ctx.stroke();
			ctx.globalCompositeOperation = 'source-over';
			ctx.shadowBlur = 0;
		});
	}

	/* Stickers are kept as objects (not pixels), so the child can pick one up and move it later. */
	const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

	function renderStickers() {
		const ctx = stickerCtx;
		ctx.clearRect(0, 0, els.stickerLayer.width, els.stickerLayer.height);
		state.stickerItems.forEach((st) => {
			const lifted = state.moving && state.moving.item === st;
			ctx.save();
			ctx.font = `${st.size * (lifted ? 1.15 : 1)}px ${EMOJI_FONT}`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			if (lifted) {
				// a picked-up sticker floats a little above the picture
				ctx.shadowColor = 'rgba(29, 59, 42, 0.35)';
				ctx.shadowBlur = st.size * 0.25;
				ctx.shadowOffsetY = st.size * 0.1;
			}
			ctx.translate(st.x, st.y);
			ctx.rotate((st.rotation * Math.PI) / 180);
			// center the emoji on its real shape (fonts draw emoji a bit low), so it sits right under the finger
			const box = ctx.measureText(st.emoji);
			ctx.fillText(st.emoji, 0, (box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2);
			ctx.restore();
		});
	}

	function stickerAt({p}) {
		for (let i = state.stickerItems.length - 1; i >= 0; i--) {
			const st = state.stickerItems[i];
			if (Math.hypot(p.x - st.x, p.y - st.y) < st.size * 0.5) return st;
		}

		return null;
	}

	function placeSticker({p, size, rotation}) {
		state.stickerItems.push({emoji: state.sticker, x: p.x, y: p.y, size: size * p.scale, rotation});
		renderStickers();
	}

	/* Press on a sticker and drag = move it. Drop it outside the picture = it goes away. */
	function startMove({e, item, p}) {
		pushHistory();
		state.stickerItems = state.stickerItems.filter((st) => st !== item).concat(item); // bring it to the front
		state.moving = {item, pointerId: e.pointerId, dx: item.x - p.x, dy: item.y - p.y, moved: false};
		els.paint.setPointerCapture(e.pointerId);
		hideCursor();
		renderStickers();
		beep({freq: 620, duration: 0.06, type: 'triangle'});
	}

	function moveSticker({e}) {
		const m = state.moving;
		const p = toCanvasPoint(e);
		m.item.x = p.x + m.dx;
		m.item.y = p.y + m.dy;
		m.moved = true;
		renderStickers();
	}

	function dropSticker({cancel}) {
		const m = state.moving;
		if (!m) return;
		state.moving = null;
		const {item} = m;
		const outside = item.x < 0 || item.y < 0 || item.x > els.stickerLayer.width || item.y > els.stickerLayer.height;
		if (outside && !cancel) {
			state.stickerItems = state.stickerItems.filter((st) => st !== item);
			melody([520, 380]); // "poof"
		} else if (!m.moved) {
			dropLastHistory();
		} else {
			beep({freq: 880, type: 'triangle'});
		}
		renderStickers();
	}

	/* Stickers: tap = normal size; press and drag away = the sticker grows with the finger; let go = stuck. */
	function startSticker({e}) {
		const index = Math.max(0, SIZES.indexOf(state.size));
		state.stickerDrag = {
			pointerId: e.pointerId,
			clientX: e.clientX,
			clientY: e.clientY,
			size: STICKER_SIZES[index],
			rotation: (Math.random() - 0.5) * 28,
			resizing: false,
			step: 0
		};
		els.paint.setPointerCapture(e.pointerId);
		els.stickerPreview.firstElementChild.textContent = state.sticker;
		showStickerPreview();
		beep({freq: 700, duration: 0.05, type: 'triangle'});
	}

	function showStickerPreview() {
		const d = state.stickerDrag;
		const r = els.stage.getBoundingClientRect();
		const preview = els.stickerPreview;
		preview.style.left = `${d.clientX - r.left}px`;
		preview.style.top = `${d.clientY - r.top}px`;
		preview.style.setProperty('--s', `${d.size}px`);
		preview.style.setProperty('--rot', `${d.rotation}deg`);
		preview.classList.toggle('resizing', d.resizing);
		preview.style.display = 'block';
	}

	function resizeSticker({e}) {
		const d = state.stickerDrag;
		const distance = Math.hypot(e.clientX - d.clientX, e.clientY - d.clientY);
		if (!d.resizing && distance < 14) return;
		d.resizing = true;
		const box = els.paint.getBoundingClientRect();
		const biggest = Math.min(box.width, box.height) * 0.9;
		d.size = Math.min(biggest, Math.max(24, distance * 2));
		showStickerPreview();

		// a little "squeak" that goes higher as the sticker grows
		const step = Math.round(d.size / 24);
		if (step !== d.step) {
			d.step = step;
			beep({freq: 260 + d.size * 3, duration: 0.05, type: 'triangle', volume: 0.06});
		}
	}

	function finishSticker({cancel}) {
		const d = state.stickerDrag;
		if (!d) return;
		state.stickerDrag = null;
		els.stickerPreview.style.display = 'none';
		if (cancel) return;
		pushHistory();
		placeSticker({p: toCanvasPoint({clientX: d.clientX, clientY: d.clientY}), size: d.size, rotation: d.rotation});
		beep({freq: 990, type: 'triangle'});
	}

	/* Magic bucket: fills the area the child taps, stopping at the lines of the picture. */
	function floodFill({p}) {
		const w = els.paint.width;
		const h = els.paint.height;
		let x0 = Math.floor(p.x);
		let y0 = Math.floor(p.y);
		if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return false;

		scratch.width = w;
		scratch.height = h;
		const s = scratch.getContext('2d');
		s.drawImage(els.photo, 0, 0);
		s.globalCompositeOperation = state.linesOnTop ? 'multiply' : 'source-over';
		s.drawImage(els.paint, 0, 0);
		s.globalCompositeOperation = 'source-over';

		let data;
		let drawing;
		try {
			data = s.getImageData(0, 0, w, h).data;
			drawing = photoCtx.getImageData(0, 0, w, h).data; // the original picture, without the child's colors
		} catch (err) {
			toast(t('fillOffline'));

			return false;
		}

		const total = w * h;
		const TOL = 64;
		const stack = new Int32Array(total);
		const [fr, fg, fb] = hexToRgb(state.color);
		// a "line" is dark in the original picture — a shape already filled with a dark color is not a line
		const lightAt = (n) => drawing[n * 4] + drawing[n * 4 + 1] + drawing[n * 4 + 2] > 420;
		const light = (x, y) => lightAt(y * w + x);

		// the shape around pixel (x, y): every connected pixel with a similar color
		const regionAt = (x, y) => {
			const seed = y * w + x;
			const r0 = data[seed * 4];
			const g0 = data[seed * 4 + 1];
			const b0 = data[seed * 4 + 2];
			const mask = new Uint8Array(total);
			let sp = 0;
			let count = 1;
			const visit = (n) => {
				const j = n * 4;
				if (mask[n] || Math.abs(data[j] - r0) > TOL || Math.abs(data[j + 1] - g0) > TOL || Math.abs(data[j + 2] - b0) > TOL) return;
				if (!lightAt(n)) return; // the picture's own lines are always walls, whatever color is next to them
				mask[n] = 1;
				count++;
				stack[sp++] = n;
			};
			mask[seed] = 1;
			stack[sp++] = seed;
			while (sp > 0) {
				const i = stack[--sp];
				const px = i % w;
				if (px > 0) visit(i - 1);
				if (px < w - 1) visit(i + 1);
				if (i >= w) visit(i - w);
				if (i < total - w) visit(i + w);
			}

			return {mask, count, color: [r0, g0, b0]};
		};

		// tapped on a black line (or a tiny gap inside one)? look a little way in 8 directions and fill the
		// biggest shape next to it, instead of recoloring the lines themselves
		const MIN_SHAPE = 60; // smaller than this is just a gap inside a line; anything bigger is a real (maybe tiny) shape
		let region = light(x0, y0) ? regionAt(x0, y0) : null;
		if (!region || region.count < MIN_SHAPE) {
			const tried = region ? [region] : [];
			const distance = new Map(); // how far from the tap each shape was found
			const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
			const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
			directions.forEach(([dx, dy]) => {
				for (let k = 1; k <= 24; k++) {
					const x = x0 + dx * k;
					const y = y0 + dy * k;
					if (!inside(x + dx * 2, y + dy * 2)) return;
					if (tried.some((r) => r.mask[y * w + x])) continue;
					// three light pixels in a row, so tiny gaps inside a line do not count
					if (light(x, y) && light(x + dx, y + dy) && light(x + dx * 2, y + dy * 2)) {
						const found = regionAt(x, y);
						tried.push(found);
						distance.set(found, k);

						return;
					}
				}
			});
			// fill the NEAREST real shape (what the child aimed at, even a tiny one);
			// hairline gaps inside the line are skipped, and if nothing else is near, take the biggest
			const real = tried.filter((r) => r.count >= MIN_SHAPE && distance.has(r));
			region = real.length
				? real.reduce((best, r) => (distance.get(r) < distance.get(best) || (distance.get(r) === distance.get(best) && r.count > best.count) ? r : best))
				: tried.reduce((best, r) => (!best || r.count > best.count ? r : best), null);
		}
		if (!region) return false;

		const [r0, g0, b0] = region.color;
		if (Math.abs(r0 - fr) < 6 && Math.abs(g0 - fg) < 6 && Math.abs(b0 - fb) < 6) return false;
		const mask = region.mask;

		// grow the filled area a little so no white halo is left next to the lines
		const grow = state.linesOnTop ? 2 : 1;
		for (let g = 0; g < grow; g++) {
			const copy = mask.slice();
			for (let i = 0; i < total; i++) {
				if (!copy[i]) continue;
				const x = i % w;
				if (x > 0) mask[i - 1] = 1;
				if (x < w - 1) mask[i + 1] = 1;
				if (i >= w) mask[i - w] = 1;
				if (i < total - w) mask[i + w] = 1;
			}
		}

		const out = s.createImageData(w, h);
		const o = out.data;
		for (let i = 0; i < total; i++) {
			if (!mask[i]) continue;
			const j = i * 4;
			o[j] = fr;
			o[j + 1] = fg;
			o[j + 2] = fb;
			o[j + 3] = 255;
		}
		s.clearRect(0, 0, w, h);
		s.putImageData(out, 0, 0);
		paintCtx.drawImage(scratch, 0, 0);

		return true;
	}

	/* A real pen / brush / bucket / sponge follows the mouse or finger, so the child sees which tool is in the hand. */
	function refreshToolIcon() {
		const icon = els.toolIcon;
		icon.textContent = state.tool === 'sticker' ? state.sticker : TOOL_ICONS[state.tool];
		icon.dataset.tool = state.tool;
	}

	function updateCursor(e, {pressed = false} = {}) {
		const r = els.stage.getBoundingClientRect();
		const x = `${e.clientX - r.left}px`;
		const y = `${e.clientY - r.top}px`;
		const isMouse = e.pointerType === 'mouse';
		const isFill = state.tool === 'fill';
		const showRing = (isMouse && ['pen', 'brush', 'rainbow', 'eraser'].includes(state.tool)) || (isFill && (isMouse || pressed));
		const showIcon = (isMouse || pressed || state.drawing) && !state.stickerDrag && !state.moving;

		els.cursor.style.display = showRing ? 'block' : 'none';
		if (showRing) {
			els.cursor.style.left = x;
			els.cursor.style.top = y;
			// the bucket gets a small pin in the chosen color: paint lands exactly there
			els.cursor.classList.toggle('pin', isFill);
			els.cursor.style.background = isFill ? state.color : 'transparent';
			els.cursor.style.width = isFill ? '' : `${lineSize()}px`;
			els.cursor.style.height = isFill ? '' : `${lineSize()}px`;
		}
		els.toolIcon.style.display = showIcon ? 'block' : 'none';
		if (showIcon) {
			els.toolIcon.style.left = x;
			els.toolIcon.style.top = y;
		}
	}

	function hideCursor() {
		els.cursor.style.display = 'none';
		els.toolIcon.style.display = 'none';
	}

	els.paint.addEventListener('pointerdown', (e) => {
		if (e.button > 0 || state.drawing || state.stickerDrag || state.moving) return;
		e.preventDefault();
		const p = toCanvasPoint(e);

		if (state.tool === 'fill') {
			updateCursor(e, {pressed: true});
			els.toolIcon.classList.remove('pour');
			void els.toolIcon.offsetWidth; // restart the "pour" wiggle
			els.toolIcon.classList.add('pour');
			pushHistory();
			if (floodFill({p})) beep({freq: 500, duration: 0.18, type: 'triangle'});
			else dropLastHistory();
			if (e.pointerType !== 'mouse') setTimeout(hideCursor, 450);

			return;
		}

		if (state.tool === 'sticker') {
			const item = stickerAt({p});
			if (item) startMove({e, item, p});
			else startSticker({e});

			return;
		}

		pushHistory();
		state.drawing = true;
		state.pointerId = e.pointerId;
		state.last = p;
		els.paint.setPointerCapture(e.pointerId);
		updateCursor(e, {pressed: true});
		drawDot({p});
	});

	els.paint.addEventListener('pointermove', (e) => {
		if (state.moving && e.pointerId === state.moving.pointerId) {
			moveSticker({e});

			return;
		}
		updateCursor(e);
		if (state.tool === 'sticker' && !state.stickerDrag && e.pointerType === 'mouse') {
			// a hand shows that the sticker under the mouse can be picked up
			els.toolIcon.textContent = stickerAt({p: toCanvasPoint(e)}) ? '✋' : state.sticker;
		}
		if (state.stickerDrag && e.pointerId === state.stickerDrag.pointerId) {
			resizeSticker({e});

			return;
		}
		if (!state.drawing || e.pointerId !== state.pointerId) return;
		const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
		const events = coalesced.length ? coalesced : [e];
		events.forEach((ev) => {
			const p = toCanvasPoint(ev);
			drawSegment({from: state.last, to: p});
			state.last = p;
		});
	});

	const stopDrawing = (e) => {
		if (e.pointerId !== state.pointerId) return;
		state.drawing = false;
		state.pointerId = null;
		if (e.pointerType !== 'mouse') hideCursor();
	};

	els.paint.addEventListener('pointerup', (e) => {
		if (state.stickerDrag && e.pointerId === state.stickerDrag.pointerId) finishSticker({cancel: false});
		if (state.moving && e.pointerId === state.moving.pointerId) dropSticker({cancel: false});
		stopDrawing(e);
	});
	els.paint.addEventListener('pointercancel', (e) => {
		if (state.stickerDrag && e.pointerId === state.stickerDrag.pointerId) finishSticker({cancel: true});
		if (state.moving && e.pointerId === state.moving.pointerId) dropSticker({cancel: true});
		stopDrawing(e);
	});
	els.paint.addEventListener('pointerleave', () => {
		if (!state.drawing) hideCursor();
	});

	// ---------------- Undo / clean / save ----------------
	function pushHistory() {
		try {
			const w = els.paint.width;
			const h = els.paint.height;
			state.history.push({paint: paintCtx.getImageData(0, 0, w, h), stickers: state.stickerItems.map((st) => ({...st}))});
			if (state.history.length > MAX_HISTORY) state.history.shift();
		} catch (err) {
			/* ignore */
		}
		updateUndo();
	}

	function dropLastHistory() {
		state.history.pop();
		updateUndo();
	}

	function updateUndo() {
		els.undo.disabled = state.history.length === 0;
	}

	function undo() {
		const snapshot = state.history.pop();
		if (!snapshot) {
			toast(t('nothingToUndo'));

			return;
		}
		paintCtx.putImageData(snapshot.paint, 0, 0);
		state.stickerItems = snapshot.stickers;
		renderStickers();
		updateUndo();
		beep({freq: 380});
	}

	function clean() {
		pushHistory();
		paintCtx.clearRect(0, 0, els.paint.width, els.paint.height);
		state.stickerItems = [];
		renderStickers();
		melody([660, 520, 400]);
		toast(t('cleaned'));
	}

	function save() {
		const out = document.createElement('canvas');
		out.width = els.photo.width;
		out.height = els.photo.height;
		const ctx = out.getContext('2d');
		ctx.drawImage(els.photo, 0, 0);
		ctx.globalCompositeOperation = state.linesOnTop ? 'multiply' : 'source-over';
		ctx.drawImage(els.paint, 0, 0);
		ctx.globalCompositeOperation = 'source-over';
		ctx.drawImage(els.stickerLayer, 0, 0);

		try {
			out.toBlob((blob) => {
				if (!blob) return toast(t('fillOffline'));
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				const name = String(localized(state.item && state.item.name) || 'painting').replace(/[^\p{L}\p{N}]+/gu, '-');
				a.href = url;
				a.download = `${name}-painting.png`;
				document.body.appendChild(a);
				a.click();
				a.remove();
				setTimeout(() => URL.revokeObjectURL(url), 5000);
				celebrate();
			}, 'image/png');
		} catch (err) {
			toast(t('fillOffline'));
		}
	}

	function celebrate() {
		const colors = ['#ef5a4a', '#f5c242', '#2f8a3c', '#3bb2ff', '#ff5fa2', '#9b5cff'];
		for (let i = 0; i < 90; i++) {
			const piece = document.createElement('i');
			piece.style.left = `${Math.random() * 100}vw`;
			piece.style.background = colors[i % colors.length];
			piece.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
			piece.style.animationDelay = `${Math.random() * 0.4}s`;
			piece.style.setProperty('--x', `${Math.random() * 200 - 100}px`);
			piece.style.setProperty('--r', `${Math.random() * 720}deg`);
			els.confetti.appendChild(piece);
			setTimeout(() => piece.remove(), 4200);
		}
		melody([523, 659, 784, 1047]);
		toast(t('saved'));
	}

	// ---------------- Buttons & keys ----------------
	els.home.addEventListener('click', goHome);
	els.undo.addEventListener('click', undo);
	els.clear.addEventListener('click', clean);
	els.save.addEventListener('click', save);

	els.lines.addEventListener('click', () => {
		state.linesOnTop = !state.linesOnTop;
		els.lines.classList.toggle('on', state.linesOnTop);
		els.paint.classList.toggle('multiply', state.linesOnTop);
		beep({freq: 600});
	});

	// ---------------- Installed app (home screen) ----------------
	// Installed, it opens full screen like a real app: no browser bars, no "exit full screen" messages.
	function isInstalledApp() {
		return (
			window.matchMedia('(display-mode: fullscreen)').matches ||
			window.matchMedia('(display-mode: standalone)').matches ||
			window.navigator.standalone === true
		);
	}

	function isAppleTouchDevice() {
		const ua = navigator.userAgent;

		return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	}

	const guide = $('installGuide');

	function showInstallGuide() {
		guide.classList.remove('hidden');
		localStorage.setItem('paint-guide-shown', 'yes');
		beep({freq: 700, type: 'triangle'});
	}

	function hideInstallGuide() {
		guide.classList.add('hidden');
	}

	$('guideOk').addEventListener('click', hideInstallGuide);
	guide.addEventListener('click', (e) => {
		if (e.target === guide) hideInstallGuide();
	});

	// Android / Chrome: offer a one-tap "Install the app" button
	let installPrompt = null;
	const installBtn = $('installBtn');
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installPrompt = e;
		installBtn.classList.toggle('hidden', isInstalledApp());
	});
	installBtn.addEventListener('click', async () => {
		if (!installPrompt) return;
		installPrompt.prompt();
		await installPrompt.userChoice.catch(() => null);
		installPrompt = null;
		installBtn.classList.add('hidden');
	});
	window.addEventListener('appinstalled', () => installBtn.classList.add('hidden'));

	function startAppMode() {
		document.documentElement.classList.toggle('installed-app', isInstalledApp());
		// works offline once installed (only when served from a web address, e.g. GitHub Pages)
		if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
			navigator.serviceWorker.register('sw.js').catch(() => {});
		}
		// show the iPad / iPhone guide once, so the parent sees how to make it a real app
		if (isAppleTouchDevice() && !isInstalledApp() && !localStorage.getItem('paint-guide-shown')) {
			setTimeout(showInstallGuide, 1500);
		}
	}

	// ---------------- Full screen ----------------
	const root = document.documentElement;
	const canFullscreen = Boolean(root.requestFullscreen || root.webkitRequestFullscreen);

	function isFullscreen() {
		return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
	}

	function renderFullscreenButtons() {
		document.querySelectorAll('.fs-btn').forEach((button) => {
			// opened as the installed app: it already fills the screen, so no button is needed
			button.classList.toggle('hidden', isInstalledApp() || !(canFullscreen || isAppleTouchDevice()));
			button.classList.toggle('on', isFullscreen());
			const label = button.querySelector('.fs-label');
			if (label) label.textContent = t(isFullscreen() ? 'exitFullscreen' : 'fullscreen');
		});
	}

	function toggleFullscreen() {
		// iPad / iPhone Safari drops its full screen as soon as the child swipes or writes; installing the app is the real fix
		if (isAppleTouchDevice()) {
			showInstallGuide();

			return;
		}
		beep({freq: isFullscreen() ? 500 : 800, type: 'triangle'});
		try {
			const result = isFullscreen()
				? (document.exitFullscreen || document.webkitExitFullscreen).call(document)
				: (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
			if (result && result.catch) result.catch(() => {});
		} catch (err) {
			/* the browser said no — nothing to do */
		}
	}

	document.querySelectorAll('.fs-btn').forEach((button) => button.addEventListener('click', toggleFullscreen));
	['fullscreenchange', 'webkitfullscreenchange'].forEach((name) =>
		document.addEventListener(name, () => {
			renderFullscreenButtons();
			fitCanvas();
		})
	);

	function renderSoundButton() {
		els.sound.textContent = state.sound ? '🔊' : '🔇';
	}

	els.sound.addEventListener('click', () => {
		state.sound = !state.sound;
		localStorage.setItem('paint-sound', state.sound ? 'on' : 'off');
		renderSoundButton();
		beep({freq: 700});
	});

	els.langBtn.addEventListener('click', () => {
		state.lang = state.lang === 'ar' ? 'en' : 'ar';
		localStorage.setItem('paint-lang-v2', state.lang);
		applyLanguage();
		beep({freq: 620});
	});

	document.addEventListener('keydown', (e) => {
		if (!els.studio.classList.contains('active')) return;
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			undo();
		} else if (e.key === 'Escape') {
			goHome();
		}
	});

	/* Smooth sideways scrolling for the color and sticker rows: finger swipe (built in), mouse wheel, and mouse drag. */
	function makeKidScroller(row) {
		addKidScrollbar(row);

		row.addEventListener(
			'wheel',
			(e) => {
				if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || row.scrollWidth <= row.clientWidth) return;
				e.preventDefault();
				const forward = document.documentElement.dir === 'rtl' ? -1 : 1; // in Arabic the row runs right → left
				row.scrollBy({left: e.deltaY * forward, behavior: 'smooth'});
			},
			{passive: false}
		);

		let drag = null;
		row.addEventListener('pointerdown', (e) => {
			if (e.pointerType !== 'mouse' || e.button !== 0) return;
			drag = {x: e.clientX, left: row.scrollLeft, moved: false};
		});
		window.addEventListener('pointermove', (e) => {
			if (!drag) return;
			const dx = e.clientX - drag.x;
			if (!drag.moved && Math.abs(dx) < 8) return;
			drag.moved = true;
			row.classList.add('dragging');
			row.scrollLeft = drag.left - dx;
		});
		window.addEventListener('pointerup', () => {
			if (drag && drag.moved) {
				// a drag is not a tap: do not pick the color / sticker under the mouse
				row.addEventListener('click', (ev) => ev.stopPropagation(), {capture: true, once: true});
			}
			drag = null;
			row.classList.remove('dragging');
		});
	}

	/* A big scrollbar that is always visible (phones and iPads hide normal ones): drag the gold handle, or tap the track. */
	function addKidScrollbar(row) {
		const group = document.createElement('div');
		group.className = `scroll-group ${row.id}-group`;
		row.replaceWith(group);
		group.appendChild(row);
		const track = document.createElement('div');
		track.className = 'kid-scrollbar';
		const thumb = document.createElement('div');
		thumb.className = 'kid-scrollbar-thumb';
		track.appendChild(thumb);
		group.appendChild(track);

		const update = () => {
			const max = row.scrollWidth - row.clientWidth;
			track.classList.toggle('hidden', max <= 2);
			if (max <= 2) return;
			const trackWidth = track.clientWidth;
			const thumbWidth = Math.max(44, (trackWidth * row.clientWidth) / row.scrollWidth);
			const progress = Math.min(1, Math.abs(row.scrollLeft) / max);
			const rtl = document.documentElement.dir === 'rtl'; // in Arabic the row starts on the right
			thumb.style.width = `${thumbWidth}px`;
			thumb.style.transform = `translateX(${(trackWidth - thumbWidth) * (rtl ? 1 - progress : progress)}px)`;
		};
		row.addEventListener('scroll', update, {passive: true});
		if ('ResizeObserver' in window) new ResizeObserver(update).observe(row);
		window.addEventListener('resize', update);

		let grab = null;
		thumb.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			thumb.setPointerCapture(e.pointerId);
			grab = {x: e.clientX, left: row.scrollLeft, scale: row.scrollWidth / track.clientWidth};
			row.classList.add('dragging');
		});
		thumb.addEventListener('pointermove', (e) => {
			if (grab) row.scrollLeft = grab.left + (e.clientX - grab.x) * grab.scale;
		});
		const release = () => {
			grab = null;
			row.classList.remove('dragging');
		};
		thumb.addEventListener('pointerup', release);
		thumb.addEventListener('pointercancel', release);
		track.addEventListener('pointerdown', (e) => {
			if (e.target !== track) return;
			const box = thumb.getBoundingClientRect();
			row.scrollBy({left: (e.clientX < box.left ? -1 : 1) * row.clientWidth * 0.8, behavior: 'smooth'});
		});

		requestAnimationFrame(update);

		return {group, update};
	}

	/* Keep the page still on tablets & phones: no pinch / double-tap zoom, no long-press menus, no dragging pictures.
	   (iPhone & iPad Safari ignore "user-scalable=no", so the zoom gestures are stopped here too.) */
	function lockPageSize() {
		['gesturestart', 'gesturechange', 'gestureend'].forEach((name) =>
			document.addEventListener(name, (e) => e.preventDefault(), {passive: false})
		);
		document.addEventListener(
			'touchmove',
			(e) => {
				if (e.touches.length > 1) e.preventDefault(); // two fingers = pinch zoom
			},
			{passive: false}
		);
		let lastTouchEnd = 0;
		document.addEventListener(
			'touchend',
			(e) => {
				const now = Date.now();
				if (now - lastTouchEnd < 320 && !e.target.closest('button, label, input')) e.preventDefault(); // double-tap zoom
				lastTouchEnd = now;
			},
			{passive: false}
		);
		// trackpad pinch / ctrl + mouse wheel zoom on laptops
		document.addEventListener(
			'wheel',
			(e) => {
				if (e.ctrlKey) e.preventDefault();
			},
			{passive: false}
		);
		document.addEventListener('contextmenu', (e) => {
			if (!e.target.closest('input')) e.preventDefault();
		});
		document.addEventListener('dragstart', (e) => e.preventDefault());
	}

	// ---------------- Start ----------------
	lockPageSize();
	buildPalette();
	makeKidScroller(els.palette);
	makeKidScroller(els.stickers);
	buildSizes();
	buildStickers();
	setTool({tool: 'brush', silent: true});
	renderSoundButton();
	startAppMode();
	renderFullscreenButtons();
	applyLanguage();
	if (location.protocol === 'file:') loadScript('images-data.js').then(buildGallery);
})();
