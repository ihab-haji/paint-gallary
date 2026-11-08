/* ==========================================================
   Puzzle Time
   Two kinds of puzzle, one engine:
   · picture puzzles: a picture is cut into real jigsaw pieces (4, 6, 12 or 20) that are dragged onto the board
   · build the animal: an animal in parts, each dragged onto its shadow
   Many hands can drag at once (brothers and sisters together). A piece snaps when it is dropped near its place,
   and stays where it is dropped when it is not: nothing is ever lost.
   ========================================================== */
(() => {
	'use strict';

	const {PICTURES, ANIMALS} = window.PUZZLE_ART;
	const WORDS = window.PUZZLE_WORDS;
	const $ = (id) => document.getElementById(id);
	const els = {
		title: $('title'), counter: $('counter'), counterText: $('counterText'),
		homeBtn: $('homeBtn'), hintBtn: $('hintBtn'), bgSwitch: $('bgSwitch'), bgPicture: $('bgPicture'), bgWhite: $('bgWhite'), bgThumb: $('bgThumb'), langBtn: $('langBtn'), soundBtn: $('soundBtn'),
		menu: $('menu'), game: $('game'), stage: $('stage'), board: $('board'),
		pictureCards: $('pictureCards'), animalCards: $('animalCards'),
		finish: $('finish'), againBtn: $('againBtn'), nextBtn: $('nextBtn'), nextThumb: $('nextThumb'), menuBtn: $('menuBtn'),
		sheet: $('levelSheet'), sheetPreview: $('sheetPreview'), sheetClose: $('sheetClose'), levels: $('levels')
	};

	const SAVE_KEY = 'puzzle-v1';
	// how hard each level is: about how many pieces, how strong the guide picture is, how near a piece must be to snap
	const LEVELS = [
		{n: 4, guide: 0.5, snap: 0.62, tilt: 0},
		{n: 6, guide: 0.42, snap: 0.52, tilt: 0},
		{n: 12, guide: 0.3, snap: 0.44, tilt: 10},
		{n: 20, guide: 0.2, snap: 0.38, tilt: 14}
	];
	const DPR = Math.min(2, window.devicePixelRatio || 1);
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

	function loadSave() {
		try {
			const saved = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};

			return {pics: saved.pics || {}, animals: saved.animals || {}};
		} catch (err) {
			return {pics: {}, animals: {}};
		}
	}

	const state = {
		lang: localStorage.getItem('paint-lang-v2') || 'ar',
		sound: localStorage.getItem('paint-sound') !== 'off',
		save: loadSave(),
		guide: localStorage.getItem('puzzle-board') !== 'white' // the faded picture on the board (or plain white)
	};

	const persist = () => {
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify(state.save));
		} catch (err) {
			/* private mode: progress lives only for this visit */
		}
	};

	const t = (key, ...args) => {
		const value = WORDS.T[state.lang][key];

		return typeof value === 'function' ? value(...args) : value;
	};
	const num = (n) => (state.lang === 'ar' ? String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n));
	const rand = (a, b) => a + Math.random() * (b - a);
	const shuffle = (list) => {
		for (let i = list.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[list[i], list[j]] = [list[j], list[i]];
		}

		return list;
	};

	/* ================= sound: tiny synthesized effects ================= */
	let audioCtx = null;

	function ctx() {
		if (!audioCtx) {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return null;
			audioCtx = new AC();
		}
		if (audioCtx.state === 'suspended') audioCtx.resume();

		return audioCtx;
	}

	function tone({freq, to = freq, dur = 0.12, type = 'sine', vol = 0.14, delay = 0}) {
		if (!state.sound) return;
		const ac = ctx();
		if (!ac) return;
		const start = ac.currentTime + delay;
		const osc = ac.createOscillator();
		const gain = ac.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, start);
		osc.frequency.exponentialRampToValueAtTime(to, start + dur);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		osc.connect(gain).connect(ac.destination);
		osc.start(start);
		osc.stop(start + dur + 0.02);
	}

	// a short wooden "tock": filtered noise
	function tock(delay = 0) {
		if (!state.sound) return;
		const ac = ctx();
		if (!ac) return;
		const length = Math.floor(ac.sampleRate * 0.05);
		const buffer = ac.createBuffer(1, length, ac.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
		const src = ac.createBufferSource();
		const filter = ac.createBiquadFilter();
		const gain = ac.createGain();
		src.buffer = buffer;
		filter.type = 'bandpass';
		filter.frequency.value = 1500;
		filter.Q.value = 1.4;
		gain.gain.value = 0.5;
		src.connect(filter).connect(gain).connect(ac.destination);
		src.start(ac.currentTime + delay);
	}

	const sfx = {
		pick: () => tone({freq: 520, to: 780, dur: 0.09, type: 'sine', vol: 0.1}),
		drop: () => tone({freq: 300, to: 190, dur: 0.12, type: 'triangle', vol: 0.12}),
		snap: () => {
			tock();
			tone({freq: 880, dur: 0.16, type: 'triangle', vol: 0.12, delay: 0.03});
			tone({freq: 1320, dur: 0.22, type: 'triangle', vol: 0.1, delay: 0.09});
		},
		hint: () => tone({freq: 660, to: 990, dur: 0.3, type: 'sine', vol: 0.1}),
		win: () => [523, 659, 784, 1047, 1319].forEach((freq, i) => tone({freq, dur: 0.32, type: 'triangle', vol: 0.13, delay: i * 0.11}))
	};

	/* ================= voice: recorded clips (tools/make_voice.py), device voice as a fallback ================= */
	const CLIPS = {ar: window.PUZZLE_VOICE_AR || {}, en: window.PUZZLE_VOICE_EN || {}};
	let voice = null;

	function stopVoice() {
		if (voice) voice.pause();
		voice = null;
		if ('speechSynthesis' in window) speechSynthesis.cancel();
	}

	function speak(text) {
		if (!state.sound || !text) return;
		const key = WORDS.speechKey(text);
		stopVoice();
		const clip = CLIPS[state.lang][key];
		if (clip) {
			voice = new Audio(`audio/${state.lang}/${clip}.mp3`);
			voice.play().catch(() => {});

			return;
		}
		if (!('speechSynthesis' in window)) return;
		try {
			const u = new SpeechSynthesisUtterance(key);
			u.lang = state.lang === 'ar' ? 'ar-SA' : 'en-US';
			u.rate = 0.85;
			speechSynthesis.speak(u);
		} catch (err) {
			/* no voice on this device */
		}
	}

	/* ================= the puzzles ================= */
	const svgUrl = (markup) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

	const pictures = PICTURES.map((pic) => ({
		id: pic.id,
		src: pic.file || svgUrl(pic.draw()),
		name: () => t('name', pic.id)
	}));

	const animalSvg = (animal) => `<svg viewBox="0 0 400 400" aria-hidden="true">${animal.parts.map((part) => part.svg).join('')}</svg>`;

	const images = new Map();

	function loadImage(src) {
		if (!images.has(src)) {
			images.set(src, new Promise((done, fail) => {
				const img = new Image();
				img.decoding = 'async';
				img.onload = () => done(img);
				img.onerror = () => {
					images.delete(src);
					fail(new Error(`no picture: ${src}`));
				};
				img.src = src;
			}));
		}

		return images.get(src);
	}

	const aspectOf = (img) => Math.min(3.3, Math.max(0.7, img.naturalWidth / img.naturalHeight));

	// the grid for about n pieces whose cells are the most square
	function gridFor(n, aspect) {
		let best = null;
		for (let rows = 1; rows <= n; rows++) {
			const cols = Math.max(1, Math.round(n / rows));
			const score = Math.abs(Math.log((aspect / cols) * rows)) + Math.abs(cols * rows - n) * 0.35;
			if (!best || score < best.score) best = {cols, rows, score};
		}

		return best;
	}

	/* ================= jigsaw shapes ================= */
	// one edge from A to B; s = +1 knob out, -1 knob in, 0 flat; m = knob size
	function edge(ax, ay, bx, by, s, m) {
		if (!s) return `L${bx.toFixed(2)} ${by.toFixed(2)}`;
		const length = Math.hypot(bx - ax, by - ay);
		const ux = (bx - ax) / length;
		const uy = (by - ay) / length;
		// the outside of a piece traced clockwise (screen y points down)
		const nx = uy;
		const ny = -ux;
		const P = (u, v) => {
			const along = length / 2 + u * m;
			const off = v * m * s;

			return `${(ax + ux * along + nx * off).toFixed(2)} ${(ay + uy * along + ny * off).toFixed(2)}`;
		};

		return `L${P(-0.16, 0)} C${P(-0.1, 0)} ${P(-0.06, 0.06)} ${P(-0.09, 0.12)} C${P(-0.15, 0.22)} ${P(-0.1, 0.31)} ${P(0, 0.31)} C${P(0.1, 0.31)} ${P(0.15, 0.22)} ${P(0.09, 0.12)} C${P(0.06, 0.06)} ${P(0.1, 0)} ${P(0.16, 0)} L${bx.toFixed(2)} ${by.toFixed(2)}`;
	}

	// random knobs for a cols × rows puzzle: h[r][c] = the edge under piece (r,c), v[r][c] = the edge right of it
	function makeKnobs(cols, rows) {
		const flip = () => (Math.random() < 0.5 ? 1 : -1);

		return {
			h: Array.from({length: rows}, () => Array.from({length: cols}, flip)),
			v: Array.from({length: rows}, () => Array.from({length: cols}, flip))
		};
	}

	function piecePath(knobs, cols, rows, c, r, x0, y0, cw, ch) {
		const m = Math.min(cw, ch);
		const x1 = x0 + cw;
		const y1 = y0 + ch;
		const top = r === 0 ? 0 : -knobs.h[r - 1][c];
		const right = c === cols - 1 ? 0 : knobs.v[r][c];
		const bottom = r === rows - 1 ? 0 : knobs.h[r][c];
		const left = c === 0 ? 0 : -knobs.v[r][c - 1];

		return `M${x0.toFixed(2)} ${y0.toFixed(2)} ${edge(x0, y0, x1, y0, top, m)} ${edge(x1, y0, x1, y1, right, m)} ${edge(x1, y1, x0, y1, bottom, m)} ${edge(x0, y1, x0, y0, left, m)} Z`;
	}

	// the jigsaw lines printed over the menu cards
	function cutLines(cols, rows, w, h) {
		const knobs = makeKnobs(cols, rows);
		const cw = w / cols;
		const ch = h / rows;
		const m = Math.min(cw, ch);
		let d = '';
		for (let r = 0; r < rows - 1; r++) {
			for (let c = 0; c < cols; c++) d += `M${c * cw} ${(r + 1) * ch} ${edge(c * cw, (r + 1) * ch, (c + 1) * cw, (r + 1) * ch, knobs.h[r][c], m)} `;
		}
		for (let c = 0; c < cols - 1; c++) {
			for (let r = 0; r < rows; r++) d += `M${(c + 1) * cw} ${r * ch} ${edge((c + 1) * cw, r * ch, (c + 1) * cw, (r + 1) * ch, knobs.v[r][c], m)} `;
		}

		return `<svg class="cut" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>`;
	}

	/* ================= menu ================= */
	function gemsFor(id) {
		const won = state.save.pics[id] || [];

		return `<span class="gems">${LEVELS.map((_, i) => `<i class="gem l${i}${won.includes(i) ? ' won' : ''}"></i>`).join('')}</span>`;
	}

	function pictureCard(pic, i) {
		const card = document.createElement('button');
		card.type = 'button';
		card.className = 'card';
		card.style.animationDelay = `${i * 50}ms`;
		card.innerHTML = `<span class="card-art"><img src="${pic.src}" alt="" loading="lazy">${cutLines(3, 2, 300, 200)}</span><span class="card-name"></span>${gemsFor(pic.id)}`;
		card.querySelector('.card-name').textContent = pic.name();
		card.addEventListener('click', () => openSheet(pic));

		return card;
	}

	function animalCard(animal, i) {
		const card = document.createElement('button');
		card.type = 'button';
		card.className = 'card';
		card.style.animationDelay = `${i * 50}ms`;
		card.innerHTML = `<span class="animal-art" style="background:${animal.bg}">${animalSvg(animal)}${state.save.animals[animal.id] ? '<span class="done-star">⭐</span>' : ''}</span><span class="card-name"></span>`;
		card.querySelector('.card-name').textContent = t('name', animal.id);
		card.addEventListener('click', () => {
			tone({freq: 560, dur: 0.1, type: 'triangle'});
			startBuild(animal);
		});

		return card;
	}

	function renderMenu() {
		els.pictureCards.replaceChildren(...pictures.map(pictureCard));
		els.animalCards.replaceChildren(...ANIMALS.map(animalCard));
	}

	/* ================= how many pieces? ================= */
	let sheetPic = null;

	async function openSheet(pic) {
		sheetPic = pic;
		tone({freq: 560, dur: 0.1, type: 'triangle'});
		const img = document.createElement('img');
		img.src = pic.src;
		img.alt = '';
		els.sheetPreview.replaceChildren(img);
		els.levels.replaceChildren();
		els.sheet.classList.remove('hidden');
		if (!reduced) gsap.fromTo('.sheet-card', {scale: 0.9, opacity: 0}, {scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)'});
		speak(t('howMany'));

		let aspect = 1.5;
		try {
			aspect = aspectOf(await loadImage(pic.src));
		} catch (err) {
			/* the picture is missing: the levels still show */
		}
		if (sheetPic !== pic) return;
		const won = state.save.pics[pic.id] || [];
		els.levels.replaceChildren(...LEVELS.map((level, i) => {
			const grid = gridFor(level.n, aspect);
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `level l${i}`;
			button.style.animationDelay = `${i * 60}ms`;
			button.innerHTML = `<span class="level-grid" style="grid-template-columns:repeat(${grid.cols},1fr);--ar:${aspect}">${'<i></i>'.repeat(grid.cols * grid.rows)}</span>
				<span class="level-name">${t(`lv${i + 1}`)}</span><span class="level-count">${t('pieces', grid.cols * grid.rows)}</span>${won.includes(i) ? '<span class="won-mark">⭐</span>' : ''}`;
			button.addEventListener('click', () => {
				closeSheet();
				startJigsaw(pic, i);
			});

			return button;
		}));
	}

	function closeSheet() {
		sheetPic = null;
		els.sheet.classList.add('hidden');
	}

	/* ================= the play area ================= */
	const game = {
		kind: null, // 'jigsaw' | 'build'
		item: null, // the picture or the animal
		level: 0,
		pieces: [],
		drags: new Map(),
		zTop: 100,
		placed: 0,
		done: false,
		lastAction: 0,
		token: 0 // a newer game cancels a picture still loading for an older one
	};

	const hitCtx = document.createElement('canvas').getContext('2d');

	// where things go: the board in the middle, the loose pieces in the space beside it (or under it)
	function geometry(aspect, share = 0.56) {
		const W = els.stage.clientWidth;
		const H = els.stage.clientHeight;
		const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 76;
		const top = els.counter.getBoundingClientRect().bottom + 22 || safeTop + 12;
		const bottom = 20;
		const m = 16;
		const availH = H - top - bottom;
		const side = W >= H * 1.05 && aspect < 1.9;
		let bw;
		let bh;
		if (side) {
			bw = Math.min(W * share, availH * aspect);
			bh = bw / aspect;
		} else {
			bw = Math.min(W - 2 * m - 24, availH * (share + 0.02) * aspect);
			bh = bw / aspect;
		}
		const bx = (W - bw) / 2;
		const by = side ? top + (availH - bh) / 2 : top;
		const gap = 26;
		const trays = side
			? [{x: m, y: top, w: bx - gap - m, h: availH}, {x: bx + bw + gap, y: top, w: W - (bx + bw + gap) - m, h: availH}]
			: [{x: m, y: by + bh + gap, w: W - 2 * m, h: H - bottom - (by + bh + gap)}];

		return {W, H, bx, by, bw, bh, trays};
	}

	// spread the loose pieces over the trays: a loose grid with a little jitter, shuffled
	function scatter(count, cellW, cellH, trays) {
		const area = trays.reduce((sum, tray) => sum + Math.max(1, tray.w * tray.h), 0);
		const slots = [];
		let left = count;
		trays.forEach((tray, i) => {
			const want = i === trays.length - 1 ? left : Math.round((count * Math.max(1, tray.w * tray.h)) / area);
			left -= want;
			if (want <= 0) return;
			const cols = Math.max(1, Math.min(want, Math.floor(tray.w / (cellW * 1.05)) || 1));
			const rows = Math.ceil(want / cols);
			// centres stay half a piece inside the tray, so no piece starts off the screen
			const spanX = Math.max(0, tray.w - cellW);
			const spanY = Math.max(0, tray.h - cellH);
			const stepX = cols > 1 ? spanX / (cols - 1) : 0;
			const stepY = rows > 1 ? spanY / (rows - 1) : 0;
			for (let k = 0; k < want; k++) {
				const col = k % cols;
				const row = Math.floor(k / cols);
				slots.push({
					x: tray.x + cellW / 2 + (cols > 1 ? stepX * col : spanX / 2) + rand(-0.08, 0.08) * cellW,
					y: tray.y + cellH / 2 + (rows > 1 ? stepY * row : spanY / 2) + rand(-0.08, 0.08) * cellH
				});
			}
		});

		return shuffle(slots);
	}

	function draw(piece) {
		piece.el.style.transform = `translate3d(${piece.x.toFixed(1)}px, ${piece.y.toFixed(1)}px, 0) rotate(${piece.r.toFixed(2)}deg) scale(${piece.s.toFixed(3)})`;
	}

	const dirty = new Set();
	let frame = 0;

	function schedule(piece) {
		dirty.add(piece);
		if (!frame) {
			frame = requestAnimationFrame(() => {
				frame = 0;
				dirty.forEach(draw);
				dirty.clear();
			});
		}
	}

	function clearStage() {
		game.pieces.forEach((piece) => {
			gsap.killTweensOf(piece);
			piece.el.remove();
		});
		game.pieces = [];
		game.drags.clear();
		els.stage.querySelectorAll('.hint-glow, .spark, .ring').forEach((node) => node.remove());
		els.board.replaceChildren();
		els.board.className = 'board';
		gsap.killTweensOf(els.board);
		gsap.set(els.board, {clearProps: 'transform'});
	}

	function showGame() {
		els.menu.classList.remove('active');
		els.game.classList.add('active');
		els.finish.classList.add('hidden');
		els.counter.classList.remove('hidden');
		els.hintBtn.classList.remove('hidden');
		els.bgSwitch.classList.toggle('hidden', game.kind !== 'jigsaw');
		if (game.kind === 'jigsaw') els.bgThumb.style.backgroundImage = `url("${game.item.src}")`;
		showBoardChoice();
	}

	function showMenu() {
		game.token++;
		game.kind = null;
		clearStage();
		closeSheet();
		stopVoice();
		els.game.classList.remove('active');
		els.menu.classList.add('active');
		[els.counter, els.hintBtn, els.bgSwitch].forEach((el) => el.classList.add('hidden'));
		els.title.textContent = t('title');
		renderMenu();
	}

	function updateCounter(pop = false) {
		els.counterText.textContent = `${num(game.placed)} / ${num(game.pieces.length)}`;
		if (pop && !reduced) {
			els.counter.classList.remove('pop');
			void els.counter.offsetWidth;
			els.counter.classList.add('pop');
		}
	}

	/* ---------- picture puzzle ---------- */
	async function startJigsaw(pic, level) {
		const token = ++game.token;
		clearStage();
		game.kind = 'jigsaw';
		game.item = pic;
		game.level = level;
		game.done = false;
		els.title.textContent = pic.name();
		showGame();
		let img;
		try {
			img = await loadImage(pic.src);
		} catch (err) {
			showMenu();

			return;
		}
		if (token !== game.token) return;
		const aspect = aspectOf(img);
		const grid = gridFor(LEVELS[level].n, aspect);
		game.jig = {img, aspect, cols: grid.cols, rows: grid.rows, knobs: makeKnobs(grid.cols, grid.rows)};
		layoutJigsaw(false);
		speak(t('start'));
		game.lastAction = performance.now();
	}

	// the picture, cropped to the board and drawn once at screen resolution
	function boardImage(img, bw, bh) {
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bw * DPR);
		canvas.height = Math.round(bh * DPR);
		const c = canvas.getContext('2d');
		c.imageSmoothingQuality = 'high';
		const iw = img.naturalWidth;
		const ih = img.naturalHeight;
		const want = bw / bh;
		let sw = iw;
		let sh = ih;
		if (iw / ih > want) sw = ih * want;
		else sh = iw / want;
		c.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);

		return canvas;
	}

	function layoutJigsaw(keep) {
		const jig = game.jig;
		const previous = new Map(game.pieces.map((piece) => [piece.key, piece]));
		const g = geometry(jig.aspect);
		const {cols, rows, knobs} = jig;
		const cw = g.bw / cols;
		const ch = g.bh / rows;
		const m = Math.min(cw, ch);
		const pad = Math.ceil(m * 0.31) + 10;
		const level = LEVELS[game.level];
		jig.g = g;
		jig.cw = cw;
		jig.ch = ch;
		jig.src = boardImage(jig.img, g.bw, g.bh);

		// the board
		// left/top, not a transform: the board's own pop and bounce animate its transform
		Object.assign(els.board.style, {width: `${g.bw}px`, height: `${g.bh}px`, left: `${g.bx}px`, top: `${g.by}px`});
		const boardCanvas = document.createElement('canvas');
		boardCanvas.width = Math.round(g.bw * DPR);
		boardCanvas.height = Math.round(g.bh * DPR);
		const shine = document.createElement('div');
		shine.className = 'shine';
		els.board.replaceChildren(boardCanvas, shine);
		jig.boardCtx = boardCanvas.getContext('2d');

		game.pieces.forEach((piece) => piece.el.remove());
		const slots = scatter(cols * rows, cw + pad * 0.6, ch + pad * 0.6, g.trays);
		const pieces = [];
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const key = `${r}-${c}`;
				const old = previous.get(key);
				const ew = cw + pad * 2;
				const eh = ch + pad * 2;
				const path = new Path2D(piecePath(knobs, cols, rows, c, r, pad, pad, cw, ch));
				const boardPath = new Path2D(piecePath(knobs, cols, rows, c, r, c * cw, r * ch, cw, ch));
				const canvas = document.createElement('canvas');
				canvas.width = Math.round(ew * DPR);
				canvas.height = Math.round(eh * DPR);
				const pc = canvas.getContext('2d');
				pc.scale(DPR, DPR);
				// a soft shadow under the piece, then the picture, then a light bevel on the cut
				pc.save();
				pc.shadowColor = 'rgba(16, 60, 70, 0.34)';
				pc.shadowBlur = 7;
				pc.shadowOffsetY = 3;
				pc.fillStyle = '#fff';
				pc.fill(path);
				pc.restore();
				pc.save();
				pc.clip(path);
				pc.drawImage(jig.src, pad - c * cw, pad - r * ch, g.bw, g.bh);
				pc.lineWidth = 3;
				pc.translate(1.2, 1.4);
				pc.strokeStyle = 'rgba(0, 0, 0, 0.22)';
				pc.stroke(path);
				pc.translate(-2.4, -2.8);
				pc.strokeStyle = 'rgba(255, 255, 255, 0.7)';
				pc.stroke(path);
				pc.restore();

				const el = document.createElement('div');
				el.className = 'piece';
				el.style.width = `${ew}px`;
				el.style.height = `${eh}px`;
				el.appendChild(canvas);

				const piece = {
					key, el, path, boardPath, w: ew, h: eh,
					tx: g.bx + c * cw - pad, ty: g.by + r * ch - pad,
					snap: m * level.snap + 8,
					placed: old ? old.placed : false,
					z: old ? old.z : 100 + pieces.length,
					x: 0, y: 0, r: 0, s: 1,
					hit: (lx, ly) => hitCtx.isPointInPath(path, lx, ly)
				};
				if (!piece.placed) {
					const slot = slots.pop() || {x: rand(0.1, 0.9) * g.W, y: rand(0.3, 0.9) * g.H};
					piece.x = slot.x - ew / 2;
					piece.y = slot.y - eh / 2;
					piece.r = old ? old.r : level.tilt ? rand(-level.tilt, level.tilt) : rand(-3, 3);
				}
				if (piece.placed) el.style.display = 'none';
				el.style.zIndex = piece.z;
				pieces.push(piece);
			}
		}
		game.pieces = pieces;
		game.placed = pieces.filter((piece) => piece.placed).length;
		pieces.forEach((piece) => {
			if (!piece.placed) {
				clampToStage(piece);
				draw(piece);
				els.stage.appendChild(piece.el);
			}
		});
		paintBoard(game.done);
		updateCounter();
		if (!keep && !reduced) {
			// the pieces tumble out of the middle of the board
			pieces.forEach((piece, i) => {
				const from = {x: g.bx + g.bw / 2 - piece.w / 2, y: g.by + g.bh / 2 - piece.h / 2, s: 0.3, r: rand(-40, 40)};
				gsap.from(piece, {...from, duration: 0.7, delay: 0.12 + i * 0.03, ease: 'back.out(1.25)', onUpdate: () => draw(piece)});
			});
			gsap.fromTo(els.board, {opacity: 0, scale: 0.94}, {opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out', transformOrigin: '50% 50%', clearProps: 'opacity,scale'});
		}
	}

	function paintBoard(final) {
		const jig = game.jig;
		const c = jig.boardCtx;
		const {bw, bh} = jig.g;
		c.setTransform(DPR, 0, 0, DPR, 0, 0);
		c.clearRect(0, 0, bw, bh);
		c.fillStyle = '#fffdf8';
		c.fillRect(0, 0, bw, bh);
		if (final) {
			c.drawImage(jig.src, 0, 0, bw, bh);

			return;
		}
		if (state.guide) {
			c.globalAlpha = LEVELS[game.level].guide;
			c.drawImage(jig.src, 0, 0, bw, bh);
			c.globalAlpha = 1;
		}
		c.lineWidth = 1.6;
		c.setLineDash([7, 6]);
		c.strokeStyle = 'rgba(24, 59, 70, 0.3)';
		game.pieces.forEach((piece) => {
			if (!piece.placed) c.stroke(piece.boardPath);
		});
		c.setLineDash([]);
		game.pieces.forEach((piece) => {
			if (!piece.placed) return;
			c.save();
			c.clip(piece.boardPath);
			c.drawImage(jig.src, 0, 0, bw, bh);
			c.restore();
		});
		// the thin seams between pieces already in place
		c.lineWidth = 1.1;
		c.strokeStyle = 'rgba(20, 40, 50, 0.2)';
		game.pieces.forEach((piece) => {
			if (piece.placed) c.stroke(piece.boardPath);
		});
	}

	/* ---------- build the animal ---------- */
	const measure = (() => {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 400 400');
		svg.setAttribute('aria-hidden', 'true');
		// a 1px window at the corner: an element far off-screen would stretch the page sideways in right-to-left mode
		Object.assign(svg.style, {position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none'});
		document.body.appendChild(svg);

		return (markup) => {
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			g.innerHTML = markup;
			svg.appendChild(g);
			const box = g.getBBox();
			g.remove();
			const p = 7;

			return {x: box.x - p, y: box.y - p, w: box.width + p * 2, h: box.height + p * 2};
		};
	})();

	function startBuild(animal) {
		++game.token;
		clearStage();
		game.kind = 'build';
		game.item = animal;
		game.level = 0;
		game.done = false;
		els.title.textContent = t('name', animal.id);
		showGame();
		animal.parts.forEach((part) => {
			if (!part.box) part.box = measure(part.svg);
		});
		layoutBuild(false);
		speak(t('build', animal.id));
		game.lastAction = performance.now();
	}

	function layoutBuild(keep) {
		const animal = game.item;
		const previous = new Map(game.pieces.map((piece) => [piece.key, piece]));
		// a smaller board than the pictures: the loose parts are big and need room beside it
		const g = geometry(1, 0.42);
		const size = Math.min(g.bw, g.bh);
		const k = size / 400;
		const bx = g.bx + (g.bw - size) / 2;
		const by = g.by + (g.bh - size) / 2;
		game.build = {g, k};

		els.board.className = `board build${game.done ? ' done' : ''}`;
		Object.assign(els.board.style, {width: `${size}px`, height: `${size}px`, left: `${bx}px`, top: `${by}px`});
		els.board.innerHTML = `<div class="plate" style="background:radial-gradient(circle at 50% 45%, #fff 0, ${animal.bg} 70%)"></div>
			<svg class="ghost" viewBox="0 0 400 400" aria-hidden="true">${animal.parts.map((part) => `<g data-id="${part.id}">${part.svg}</g>`).join('')}</svg>`;

		game.pieces.forEach((piece) => piece.el.remove());
		const avg = animal.parts.reduce((sum, part) => sum + Math.max(part.box.w, part.box.h), 0) / animal.parts.length;
		const slots = scatter(animal.parts.length, avg * k, avg * k, g.trays);
		game.pieces = animal.parts.map((part, order) => {
			const old = previous.get(part.id);
			const box = part.box;
			const w = box.w * k;
			const h = box.h * k;
			const el = document.createElement('div');
			el.className = 'piece part';
			el.style.width = `${w}px`;
			el.style.height = `${h}px`;
			el.innerHTML = `<svg viewBox="${box.x} ${box.y} ${box.w} ${box.h}" aria-hidden="true">${part.svg}</svg>`;
			const svg = el.firstElementChild;
			const shapes = [...svg.querySelectorAll('path, circle, ellipse, rect, polygon')];
			const point = svg.createSVGPoint();
			const piece = {
				key: part.id, el, order, w, h,
				tx: bx + box.x * k, ty: by + box.y * k,
				snap: Math.max(52, Math.min(w, h) * 0.5),
				placed: old ? old.placed : false,
				z: old ? old.z : 100 + order,
				x: 0, y: 0, r: 0, s: 1,
				hit: (lx, ly) => {
					point.x = box.x + lx / k;
					point.y = box.y + ly / k;

					return shapes.some((shape) => (shape.isPointInFill ? shape.isPointInFill(point) || shape.isPointInStroke(point) : true));
				}
			};
			if (piece.placed) {
				piece.x = piece.tx;
				piece.y = piece.ty;
				piece.z = 10 + order;
				el.classList.add('placed');
			} else {
				const slot = slots.pop() || {x: rand(0.1, 0.9) * g.W, y: rand(0.3, 0.9) * g.H};
				piece.x = slot.x - w / 2;
				piece.y = slot.y - h / 2;
				piece.r = old ? old.r : rand(-12, 12);
			}
			el.style.zIndex = piece.z;
			if (!piece.placed) clampToStage(piece);
			draw(piece);
			els.stage.appendChild(el);

			return piece;
		});
		game.placed = game.pieces.filter((piece) => piece.placed).length;
		updateCounter();
		if (!keep && !reduced) {
			game.pieces.forEach((piece, i) => gsap.from(piece, {s: 0, r: rand(-60, 60), duration: 0.6, delay: 0.1 + i * 0.07, ease: 'back.out(1.7)', onUpdate: () => draw(piece)}));
			gsap.fromTo(els.board, {opacity: 0, scale: 0.9}, {opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', clearProps: 'opacity,scale'});
		}
	}

	const ghostOf = (piece) => els.board.querySelector(`.ghost [data-id="${piece.key}"]`);

	/* ---------- dragging: every finger drags its own piece ---------- */
	function clampToStage(piece) {
		const W = els.stage.clientWidth;
		const H = els.stage.clientHeight;
		const keepIn = 0.45;
		piece.x = Math.min(W - piece.w * keepIn, Math.max(-piece.w * (1 - keepIn), piece.x));
		piece.y = Math.min(H - piece.h * keepIn, Math.max(-piece.h * (1 - keepIn) + 60, piece.y));
	}

	function pieceAt(x, y) {
		const loose = game.pieces.filter((piece) => !piece.placed && !piece.dragging).sort((a, b) => b.z - a.z);
		const exact = loose.find((piece) => piece.hit(x - piece.x, y - piece.y));
		if (exact) return exact;
		// little fingers miss by a bit: try around the touch
		const near = [[14, 0], [-14, 0], [0, 14], [0, -14], [10, 10], [-10, -10], [10, -10], [-10, 10]];

		return loose.find((piece) => near.some(([dx, dy]) => piece.hit(x + dx - piece.x, y + dy - piece.y))) || null;
	}

	function onDown(event) {
		if (!game.kind || game.done || !game.pieces.length) return;
		const x = event.clientX;
		const y = event.clientY;
		const piece = pieceAt(x, y);
		if (!piece) return;
		event.preventDefault();
		gsap.killTweensOf(piece);
		piece.dragging = true;
		piece.z = ++game.zTop;
		piece.el.style.zIndex = piece.z;
		piece.el.classList.add('lifted');
		game.drags.set(event.pointerId, {piece, dx: x - piece.x, dy: y - piece.y});
		gsap.to(piece, {s: 1.08, r: 0, duration: 0.2, ease: 'back.out(2)', onUpdate: () => schedule(piece)});
		if (game.kind === 'build') {
			const ghost = ghostOf(piece);
			if (ghost) ghost.classList.add('want');
		}
		sfx.pick();
		game.lastAction = performance.now();
	}

	function onMove(event) {
		const drag = game.drags.get(event.pointerId);
		if (!drag) return;
		event.preventDefault();
		drag.piece.x = event.clientX - drag.dx;
		drag.piece.y = event.clientY - drag.dy;
		schedule(drag.piece);
	}

	function onUp(event) {
		const drag = game.drags.get(event.pointerId);
		if (!drag) return;
		game.drags.delete(event.pointerId);
		const piece = drag.piece;
		piece.dragging = false;
		piece.el.classList.remove('lifted');
		if (game.kind === 'build') {
			const ghost = ghostOf(piece);
			if (ghost) ghost.classList.remove('want');
		}
		game.lastAction = performance.now();
		if (Math.hypot(piece.x - piece.tx, piece.y - piece.ty) <= piece.snap) {
			place(piece);

			return;
		}
		clampToStage(piece);
		gsap.to(piece, {s: 1, duration: 0.25, ease: 'power2.out', onUpdate: () => schedule(piece)});
		sfx.drop();
	}

	els.stage.addEventListener('pointerdown', onDown);
	window.addEventListener('pointermove', onMove, {passive: false});
	window.addEventListener('pointerup', onUp);
	window.addEventListener('pointercancel', onUp);

	function place(piece) {
		piece.placed = true;
		game.placed++;
		const left = game.pieces.length - game.placed;
		sfx.snap();
		updateCounter(true);
		gsap.to(piece, {
			x: piece.tx, y: piece.ty, r: 0, s: 1, duration: 0.2, ease: 'power3.out',
			onUpdate: () => schedule(piece),
			onComplete: () => {
				burst(piece.tx + piece.w / 2, piece.ty + piece.h / 2, piece.w);
				if (game.kind === 'jigsaw') {
					piece.el.style.display = 'none';
					paintBoard(false);
				} else {
					piece.z = 10 + piece.order;
					piece.el.style.zIndex = piece.z;
					piece.el.classList.add('placed');
					if (!reduced) gsap.fromTo(piece, {s: 1.12}, {s: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)', onUpdate: () => schedule(piece)});
				}
				if (!left) win();
			}
		});
		if (!left) return;
		if (left === 1 && game.pieces.length >= 4) speak(t('last'));
		else if (Math.random() < 0.34) speak(t('great')[Math.floor(Math.random() * 4)]);
	}

	// a ring and a few stars where a piece clicks in
	function burst(x, y, size) {
		if (reduced) return;
		const ring = document.createElement('div');
		ring.className = 'ring';
		els.stage.appendChild(ring);
		const d = Math.min(180, size * 0.8);
		gsap.fromTo(ring, {x: x - d / 2, y: y - d / 2, width: d, height: d, scale: 0.3, opacity: 0.95}, {scale: 1.35, opacity: 0, duration: 0.55, ease: 'power2.out', onComplete: () => ring.remove()});
		const colors = ['#ffc93c', '#ff5d73', '#12b5a0', '#2f9bff', '#fff'];
		for (let i = 0; i < 7; i++) {
			const spark = document.createElement('div');
			spark.className = 'spark';
			spark.style.background = colors[i % colors.length];
			els.stage.appendChild(spark);
			const angle = (i / 7) * Math.PI * 2 + rand(-0.3, 0.3);
			const dist = rand(50, 90);
			gsap.fromTo(spark, {x, y, scale: rand(0.8, 1.3), rotation: 0, opacity: 1}, {
				x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, rotation: rand(90, 220), opacity: 0, scale: 0.3,
				duration: rand(0.5, 0.75), ease: 'power2.out', onComplete: () => spark.remove()
			});
		}
	}

	/* ---------- help ---------- */
	function hint() {
		if (!game.kind || game.done) return;
		const loose = game.pieces.filter((piece) => !piece.placed && !piece.dragging);
		if (!loose.length) return;
		const piece = loose[Math.floor(Math.random() * loose.length)];
		sfx.hint();
		speak(t('hint'));
		game.lastAction = performance.now();
		wiggle(piece);
		// bring it to the top, so it is easy to grab
		piece.z = ++game.zTop;
		piece.el.style.zIndex = piece.z;
		if (game.kind === 'build') {
			const ghost = ghostOf(piece);
			if (!ghost) return;
			ghost.classList.add('want');
			setTimeout(() => {
				if (!piece.dragging) ghost.classList.remove('want');
			}, 2600);

			return;
		}
		const glow = document.createElement('canvas');
		glow.className = 'hint-glow';
		glow.width = Math.round(piece.w * DPR);
		glow.height = Math.round(piece.h * DPR);
		Object.assign(glow.style, {width: `${piece.w}px`, height: `${piece.h}px`, transform: `translate(${piece.tx}px, ${piece.ty}px)`});
		const c = glow.getContext('2d');
		c.scale(DPR, DPR);
		c.fillStyle = 'rgba(255, 255, 255, 0.72)';
		c.fill(piece.path);
		c.lineWidth = 5;
		c.strokeStyle = '#ffc93c';
		c.stroke(piece.path);
		els.stage.appendChild(glow);
		gsap.fromTo(glow, {opacity: 0}, {opacity: 1, duration: 0.35, yoyo: true, repeat: 5, ease: 'sine.inOut', onComplete: () => glow.remove()});
	}

	function wiggle(piece) {
		if (reduced) return;
		gsap.killTweensOf(piece);
		gsap.fromTo(piece, {r: piece.r}, {
			keyframes: [{r: piece.r - 9, s: 1.06, duration: 0.12}, {r: piece.r + 9, duration: 0.14}, {r: piece.r - 6, duration: 0.12}, {r: piece.r, s: 1, duration: 0.14}],
			onUpdate: () => schedule(piece)
		});
	}

	// nobody has touched anything for a while: one piece wiggles to say "pick me"
	setInterval(() => {
		if (!game.kind || game.done || game.drags.size || els.sheet.classList.contains('hidden') === false) return;
		if (performance.now() - game.lastAction < 12000) return;
		const loose = game.pieces.filter((piece) => !piece.placed);
		if (!loose.length) return;
		wiggle(loose[Math.floor(Math.random() * loose.length)]);
		game.lastAction = performance.now() - 5000;
	}, 1000);

	/* ---------- finished ---------- */
	function win() {
		game.done = true;
		els.hintBtn.classList.add('hidden');
		els.bgSwitch.classList.add('hidden');
		if (game.kind === 'jigsaw') {
			const won = state.save.pics[game.item.id] || [];
			if (!won.includes(game.level)) won.push(game.level);
			state.save.pics[game.item.id] = won;
			paintBoard(true);
			els.board.classList.add('done');
			if (!reduced) gsap.fromTo(els.board, {scale: 1}, {scale: 1.035, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '50% 50%'});
		} else {
			state.save.animals[game.item.id] = 1;
			const ghost = els.board.querySelector('.ghost');
			if (ghost) gsap.to(ghost, {opacity: 0, duration: 0.4});
			if (!reduced) {
				game.pieces.forEach((piece) => gsap.to(piece, {
					keyframes: [{y: piece.ty - 34, duration: 0.24, ease: 'power2.out'}, {y: piece.ty, duration: 0.3, ease: 'bounce.out'}],
					repeat: 1, delay: 0.1, onUpdate: () => schedule(piece)
				}));
			}
		}
		persist();
		sfx.win();
		speak(t('win'));
		confettiFrom(els.board);
		setTimeout(showFinish, 1100);
	}

	function confettiFrom(el) {
		if (!window.confetti) return;
		const r = el.getBoundingClientRect();
		const origin = {x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight};
		const base = {spread: 90, startVelocity: 46, origin, colors: ['#ff5d73', '#ffc93c', '#12b5a0', '#2f9bff', '#9b6bff'], shapes: ['star', 'circle'], scalar: 1.15, zIndex: 970};
		window.confetti({...base, particleCount: reduced ? 25 : 110});
		if (!reduced) setTimeout(() => window.confetti({...base, particleCount: 60, spread: 140, startVelocity: 34}), 300);
	}

	function nextItem() {
		if (game.kind === 'build') return ANIMALS[(ANIMALS.indexOf(game.item) + 1) % ANIMALS.length];
		return pictures[(pictures.indexOf(game.item) + 1) % pictures.length];
	}

	function showFinish() {
		if (!game.done) return;
		const next = nextItem();
		if (game.kind === 'build') {
			els.nextThumb.style.backgroundImage = '';
			els.nextThumb.style.backgroundColor = next.bg;
			els.nextThumb.innerHTML = animalSvg(next);
		} else {
			els.nextThumb.innerHTML = '';
			els.nextThumb.style.backgroundColor = '';
			els.nextThumb.style.backgroundImage = `url("${next.src}")`;
		}
		els.finish.classList.remove('hidden');
		if (!reduced) gsap.fromTo(els.finish, {y: 120, opacity: 0}, {y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.5)'});
	}

	function again() {
		if (game.kind === 'build') startBuild(game.item);
		else startJigsaw(game.item, game.level);
	}

	function next() {
		const item = nextItem();
		if (game.kind === 'build') startBuild(item);
		else startJigsaw(item, game.level);
	}

	/* ================= buttons ================= */
	function applyLang() {
		document.documentElement.lang = state.lang;
		document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
		document.querySelectorAll('[data-t]').forEach((el) => {
			el.textContent = t(el.dataset.t);
		});
		if (!game.kind) els.title.textContent = t('title');
		else els.title.textContent = game.kind === 'build' ? t('name', game.item.id) : game.item.name();
		if (game.kind) updateCounter();
		renderMenu();
	}

	function applySound() {
		els.soundBtn.textContent = state.sound ? '🔊' : '🔇';
		els.soundBtn.classList.toggle('off', !state.sound);
	}

	els.homeBtn.addEventListener('click', () => {
		if (game.kind) {
			tone({freq: 440, dur: 0.1, type: 'triangle'});
			showMenu();

			return;
		}
		location.href = '../index.html';
	});
	els.menuBtn.addEventListener('click', showMenu);
	els.againBtn.addEventListener('click', again);
	els.nextBtn.addEventListener('click', next);
	els.hintBtn.addEventListener('click', hint);
	function showBoardChoice() {
		els.bgPicture.classList.toggle('on', state.guide);
		els.bgWhite.classList.toggle('on', !state.guide);
		els.bgPicture.setAttribute('aria-pressed', String(state.guide));
		els.bgWhite.setAttribute('aria-pressed', String(!state.guide));
	}

	function setBoard(guide) {
		tone({freq: guide ? 660 : 520, dur: 0.1, type: 'triangle'});
		if (state.guide === guide) return;
		state.guide = guide;
		try {
			localStorage.setItem('puzzle-board', guide ? 'picture' : 'white');
		} catch (err) {
			/* private mode: the choice lasts for this visit */
		}
		showBoardChoice();
		if (game.kind === 'jigsaw' && game.jig && game.jig.boardCtx) paintBoard(game.done);
	}

	els.bgPicture.addEventListener('click', () => setBoard(true));
	els.bgWhite.addEventListener('click', () => setBoard(false));
	els.sheetClose.addEventListener('click', closeSheet);
	els.sheet.addEventListener('click', (event) => {
		if (event.target === els.sheet) closeSheet();
	});
	els.langBtn.addEventListener('click', () => {
		state.lang = state.lang === 'ar' ? 'en' : 'ar';
		localStorage.setItem('paint-lang-v2', state.lang);
		applyLang();
		speak(game.kind ? (game.kind === 'build' ? t('build', game.item.id) : t('start')) : t('pick'));
	});
	els.soundBtn.addEventListener('click', () => {
		state.sound = !state.sound;
		localStorage.setItem('paint-sound', state.sound ? 'on' : 'off');
		if (!state.sound) stopVoice();
		applySound();
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			if (!els.sheet.classList.contains('hidden')) closeSheet();
			else if (game.kind) showMenu();
		}
	});

	// turning the iPad: lay everything out again; placed pieces stay placed, loose ones spread over the new space
	let resizeTimer = 0;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			if (!game.kind || !game.pieces.length) return;
			game.drags.clear();
			game.pieces.forEach((piece) => gsap.killTweensOf(piece));
			if (game.kind === 'jigsaw') layoutJigsaw(true);
			else layoutBuild(true);
		}, 160);
	});

	applyLang();
	applySound();
	els.title.textContent = t('title');
})();
