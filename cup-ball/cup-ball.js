/* Find the Ball — a cup and ball memory game for little kids (Arabic first, English too).
   Flow of a round: Play → the ball hops under a cup → the cups shuffle → the child taps a cup →
   found: win music, confetti, a star and a surprise prize (5 stars = a golden trophy);
   missed: easy mode gives a second try, otherwise the ball shows where it was hiding.
   Play together: 2-4 players (the family, ../assets/players/players.js) take turns on one device, a find is a ⭐, the winner gets a gift.
   Sounds and music are made with Web Audio (no files). The voice is recorded (ar-SA Zariyah / en-US Ana, audio/<lang>/). */
(() => {
	const SAVE_KEY = 'cupball-v1';
	const STARS_FOR_TROPHY = 5;

	// easy is made for a 3 year old: 3 cups, slow swaps, two tries. expert: lightning fast, up to 3 pairs swap at once
	const LEVELS = {
		easy: {cups: 3, swaps: [2, 5], speed: [1.05, 0.8], double: 0, triple: 0, tries: 2, peek: 900, animal: '🐣'},
		mid: {cups: 4, swaps: [5, 9], speed: [0.62, 0.46], double: 0, triple: 0, tries: 1, peek: 500, animal: '🐰'},
		hard: {cups: 6, swaps: [9, 15], speed: [0.42, 0.28], double: 0.4, triple: 0, tries: 1, peek: 500, animal: '🦊'},
		expert: {cups: 6, swaps: [14, 20], speed: [0.27, 0.2], double: 0.6, triple: 0.25, tries: 1, peek: 300, animal: '🐲'}
	};
	// all cups share one color, picked at random every round: [main, dark, light]
	const CUP_COLORS = {
		red: ['#f2272f', '#c81824', '#ff6b6b'],
		orange: ['#ff8a1f', '#d9650a', '#ffb66b'],
		yellow: ['#ffd21f', '#e0a800', '#fff08a'],
		lime: ['#8ed61f', '#62a80f', '#c3f27a'],
		green: ['#1fbf4a', '#128a33', '#7ae69a'],
		mint: ['#06d6a0', '#03a379', '#a3f5df'],
		teal: ['#14b8c4', '#0c8791', '#7ee3ea'],
		sky: ['#2ea8ff', '#1478d0', '#8fd2ff'],
		blue: ['#2d5bff', '#1a3cc4', '#8aa4ff'],
		purple: ['#8a3ffc', '#6224c9', '#c4a0ff'],
		pink: ['#ff4fa3', '#d12a7e', '#ff9ccb'],
		brown: ['#b5652a', '#86461a', '#e3a272']
	};
	const COLOR_NAMES = Object.keys(CUP_COLORS);

	const {PRIZES, T, speechKey} = window.CUPBALL_WORDS;
	const PP = window.PartyPlayers;
	let picker = null;

	const $ = (id) => document.getElementById(id);
	const els = {
		menu: $('menu'), game: $('game'), levels: $('levels'), stage: $('stage'), ball: $('ball'),
		bubble: $('bubble'), bubbleText: $('bubbleText'), playBtn: $('playBtn'),
		homeBtn: $('homeBtn'), langBtn: $('langBtn'), musicBtn: $('musicBtn'), soundBtn: $('soundBtn'),
		levelChip: $('levelChip'), stars: $('stars'), chestBtn: $('chestBtn'), chestCount: $('chestCount'),
		menuPrizesBtn: $('menuPrizesBtn'), menuPrizeCount: $('menuPrizeCount'),
		prizeOverlay: $('prizeOverlay'), prizeHead: $('prizeHead'), gift: $('gift'), prizeEmoji: $('prizeEmoji'),
		newTag: $('newTag'), prizeName: $('prizeName'), collectBtn: $('collectBtn'),
		superOverlay: $('superOverlay'), superBtn: $('superBtn'),
		shelfOverlay: $('shelfOverlay'), shelf: $('shelf'), shelfCount: $('shelfCount'), shelfClose: $('shelfClose'), trophies: $('trophies'),
		modeSwitch: $('modeSwitch'), multiSetup: $('multiSetup'), turnChoices: $('turnChoices'),
		scoreboard: $('scoreboard'), playWho: $('playWho'),
		resultOverlay: $('resultOverlay'), podium: $('podium'), winnerGiftBtn: $('winnerGiftBtn'), againBtn: $('againBtn'), resultMenuBtn: $('resultMenuBtn')
	};

	const saved = (() => {
		try {
			return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
		} catch (err) {
			return {};
		}
	})();
	// language and sound are shared with the Paint Studio home screen
	const state = {
		lang: localStorage.getItem('paint-lang-v2') || 'ar',
		sound: localStorage.getItem('paint-sound') !== 'off',
		music: saved.music !== false,
		prizes: saved.prizes || {}, // emoji -> how many times it was won
		trophies: saved.trophies || 0,
		stars: saved.stars || 0,
		wins: {easy: 0, mid: 0, hard: 0, expert: 0, ...saved.wins},
		mode: saved.mode === 'multi' ? 'multi' : 'solo',
		players: saved.players || 2, // play together: how many players
		turns: saved.turns || 3, // play together: turns for each player
		level: 'easy'
	};

	const game = {phase: 'menu', cups: [], ballCup: null, color: 'ocean', triesLeft: 1, idleTimer: 0, idleCount: 0, run: 0, players: [], turn: 0};
	const geo = {w: 0, h: 0, spacing: 0, cupW: 0, cupH: 0, base: 0, ballSize: 0};

	const t = (key) => T[state.lang][key];
	const wait = (ms) => new Promise((done) => setTimeout(done, ms));
	const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
	const lerp = (a, b, k) => a + (b - a) * k;

	function persist() {
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify({music: state.music, prizes: state.prizes, trophies: state.trophies, stars: state.stars, wins: state.wins, mode: state.mode, players: state.players, turns: state.turns}));
		} catch (err) {
			/* private mode: the game still works, it just forgets */
		}
	}

	/* ================= sound: Web Audio, no files ================= */
	const audio = {ctx: null, sfx: null, music: null, voice: null, timer: 0, step: 0, next: 0};

	function ctx() {
		if (!audio.ctx) {
			const Ctx = window.AudioContext || window.webkitAudioContext;
			if (!Ctx) return null;
			audio.ctx = new Ctx();
			audio.sfx = audio.ctx.createGain();
			audio.sfx.gain.value = 0.9;
			audio.sfx.connect(audio.ctx.destination);
			audio.music = audio.ctx.createGain();
			audio.music.gain.value = 0;
			audio.music.connect(audio.ctx.destination);
			audio.voice = audio.ctx.createGain();
			audio.voice.gain.value = 1;
			audio.voice.connect(audio.ctx.destination);
		}
		if (audio.ctx.state === 'suspended') audio.ctx.resume();

		return audio.ctx;
	}

	const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

	function tone({freq, at = 0, dur = 0.2, type = 'triangle', vol = 0.18, slide = 0, out = 'sfx'}) {
		const ac = ctx();
		if (!ac || (out === 'sfx' && !state.sound)) return;
		const start = ac.currentTime + at;
		const osc = ac.createOscillator();
		const gain = ac.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, start);
		if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + dur);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		osc.connect(gain).connect(out === 'sfx' ? audio.sfx : audio.music);
		osc.start(start);
		osc.stop(start + dur + 0.05);
	}

	function noise({at = 0, dur = 0.25, vol = 0.15, from = 600, to = 2400}) {
		const ac = ctx();
		if (!ac || !state.sound) return;
		const start = ac.currentTime + at;
		const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		const src = ac.createBufferSource();
		src.buffer = buffer;
		const filter = ac.createBiquadFilter();
		filter.type = 'bandpass';
		filter.Q.value = 1.4;
		filter.frequency.setValueAtTime(from, start);
		filter.frequency.exponentialRampToValueAtTime(to, start + dur);
		const gain = ac.createGain();
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(vol, start + dur * 0.35);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		src.connect(filter).connect(gain).connect(audio.sfx);
		src.start(start);
	}

	const sfx = {
		tap: () => tone({freq: 660, dur: 0.08, slide: 990, vol: 0.12}),
		lift: () => tone({freq: 320, dur: 0.22, slide: 760, type: 'sine', vol: 0.22}),
		drop: () => tone({freq: 190, dur: 0.18, slide: 90, type: 'sine', vol: 0.3}),
		hop: () => tone({freq: 420, dur: 0.25, slide: 980, type: 'square', vol: 0.06}),
		swoosh: (speed) => noise({dur: Math.max(0.16, speed * 0.7), vol: 0.12, from: 500, to: 2600}),
		found: () => [84, 88, 91, 96].forEach((n, i) => tone({freq: midi(n), at: i * 0.07, dur: 0.35, vol: 0.14})),
		wrong: () => {
			tone({freq: 360, dur: 0.35, slide: 210, type: 'sine', vol: 0.22});
			tone({freq: midi(67), at: 0.32, dur: 0.22, vol: 0.12});
			tone({freq: midi(63), at: 0.52, dur: 0.4, vol: 0.12});
		},
		chime: () => [79, 83, 86, 91, 95, 98].forEach((n, i) => tone({freq: midi(n), at: i * 0.05, dur: 0.5, type: 'sine', vol: 0.1})),
		collect: () => [72, 79, 84].forEach((n, i) => tone({freq: midi(n), at: i * 0.08, dur: 0.25, vol: 0.14})),
		star: () => tone({freq: midi(88), dur: 0.3, slide: midi(100), type: 'sine', vol: 0.12})
	};

	// a short happy fanfare: melody + chords, like a winning jingle
	function winMusic({big = false} = {}) {
		if (!state.sound) return;
		duckMusic(big ? 4.2 : 2.6);
		const melody = big
			? [[67, 0, 0.14], [72, 0.15, 0.14], [76, 0.3, 0.14], [79, 0.45, 0.3], [76, 0.78, 0.14], [79, 0.93, 0.5], [81, 1.5, 0.14], [79, 1.65, 0.14], [81, 1.8, 0.14], [84, 1.95, 0.9]]
			: [[67, 0, 0.13], [72, 0.14, 0.13], [76, 0.28, 0.13], [79, 0.42, 0.3], [76, 0.74, 0.13], [79, 0.88, 0.7]];
		melody.forEach(([n, at, dur]) => {
			tone({freq: midi(n), at, dur: dur + 0.1, type: 'square', vol: 0.07});
			tone({freq: midi(n), at, dur: dur + 0.15, type: 'triangle', vol: 0.16});
		});
		const chords = big ? [[[48, 60, 64, 67], 0.45, 0.6], [[53, 60, 65, 69], 1.5, 0.45], [[48, 60, 64, 67, 72], 1.95, 1.4]] : [[[48, 60, 64, 67], 0.42, 0.3], [[48, 60, 64, 67, 72], 0.88, 1.1]];
		chords.forEach(([notes, at, dur]) => notes.forEach((n) => tone({freq: midi(n), at, dur, type: 'sine', vol: 0.06})));
		const end = big ? 2.4 : 1.4;
		[96, 100, 103, 108].forEach((n, i) => tone({freq: midi(n), at: end + i * 0.06, dur: 0.4, type: 'sine', vol: 0.05}));
		if (big) for (let i = 0; i < 10; i++) noise({at: i * 0.04, dur: 0.06, vol: 0.06, from: 2000, to: 3000});
	}

	/* soft music-box loop while playing */
	const SONG = [72, null, 76, 79, 81, null, 79, 76, 74, null, 77, 81, 79, null, 76, null, 72, null, 76, 79, 84, null, 81, 79, 77, 76, 74, null, 72, null, null, null];
	const BASS = [48, 55, 53, 55, 50, 55, 48, 43];
	const STEP = 60 / 112 / 2; // eighth notes at 112 bpm

	function scheduleMusic() {
		const ac = audio.ctx;
		if (!ac) return;
		while (audio.next < ac.currentTime + 0.25) {
			const at = audio.next - ac.currentTime;
			const note = SONG[audio.step % SONG.length];
			if (note) tone({freq: midi(note), at, dur: 0.45, type: 'sine', vol: 0.5, out: 'music'});
			if (audio.step % 4 === 0) tone({freq: midi(BASS[(audio.step / 4) % BASS.length]), at, dur: 0.5, type: 'triangle', vol: 0.45, out: 'music'});
			audio.step++;
			audio.next += STEP;
		}
	}

	function musicLevel() {
		return state.music && state.sound && game.phase !== 'menu' ? 0.09 : 0;
	}

	function updateMusic() {
		const ac = ctx();
		if (!ac) return;
		const level = musicLevel();
		audio.music.gain.cancelScheduledValues(ac.currentTime);
		audio.music.gain.setTargetAtTime(level, ac.currentTime, 0.3);
		if (level && !audio.timer) {
			audio.next = ac.currentTime + 0.1;
			audio.timer = setInterval(scheduleMusic, 100);
		} else if (!level && audio.timer) {
			setTimeout(() => {
				if (musicLevel()) return;
				clearInterval(audio.timer);
				audio.timer = 0;
			}, 1200);
		}
	}

	function duckMusic(seconds) {
		const ac = audio.ctx;
		if (!ac || !musicLevel()) return;
		const g = audio.music.gain;
		g.cancelScheduledValues(ac.currentTime);
		g.setTargetAtTime(0.012, ac.currentTime, 0.08);
		g.setTargetAtTime(musicLevel(), ac.currentTime + seconds, 0.5);
	}

	/* ================= voice: recorded clips, read with full harakat ================= */
	// audio/<lang>/index.js maps each sentence (speechKey) to its clip; the device voice is only a last resort
	const CLIPS = {ar: window.CUPBALL_VOICE_AR || {}, en: window.CUPBALL_VOICE_EN || {}};
	const HTTP = location.protocol.startsWith('http');
	const buffers = new Map();
	const voicePlayer = {id: 0, node: null};
	let deviceVoice = null;

	const clipUrl = (lang, clip) => `audio/${lang}/${clip}.mp3`;

	// online: fetched once and played through Web Audio (instant, no autoplay trouble after the first tap)
	function clipBuffer(url) {
		if (!buffers.has(url)) {
			const ac = ctx();
			const load = fetch(url)
				.then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
				.then((data) => new Promise((done, fail) => ac.decodeAudioData(data, done, fail)));
			load.catch(() => buffers.delete(url));
			buffers.set(url, load);
		}

		return buffers.get(url);
	}

	function preloadVoice() {
		if (!HTTP || !ctx()) return;
		['ready', 'watch', 'shuffle', 'where', 'yay', 'miss', 'was', 'surprise'].forEach((key) => {
			const clip = CLIPS[state.lang][speechKey(t(key))];
			if (clip) clipBuffer(clipUrl(state.lang, clip)).catch(() => {});
		});
	}

	function stopVoice() {
		voicePlayer.id++;
		try {
			if (voicePlayer.node) voicePlayer.node.stop ? voicePlayer.node.stop() : voicePlayer.node.pause();
		} catch (err) {
			/* already finished */
		}
		voicePlayer.node = null;
		if ('speechSynthesis' in window) speechSynthesis.cancel();
	}

	function playElement(url, id) {
		if (id !== voicePlayer.id) return;
		const el = new Audio(url);
		voicePlayer.node = el;
		el.addEventListener('loadedmetadata', () => duckMusic(el.duration + 0.3));
		el.play().catch(() => {});
	}

	function speak(text) {
		if (!state.sound) return;
		const key = speechKey(text);
		if (!key) return;
		stopVoice();
		const id = voicePlayer.id;
		const clip = CLIPS[state.lang][key];
		if (!clip) {
			(window.__missingVoice = window.__missingVoice || []).push([state.lang, key]);
			deviceSpeak(key);

			return;
		}
		const url = clipUrl(state.lang, clip);
		if (!HTTP || !ctx()) {
			playElement(url, id);

			return;
		}
		clipBuffer(url)
			.then((buffer) => {
				if (id !== voicePlayer.id) return;
				const src = audio.ctx.createBufferSource();
				src.buffer = buffer;
				src.connect(audio.voice);
				src.start();
				voicePlayer.node = src;
				duckMusic(buffer.duration + 0.3);
			})
			.catch(() => playElement(url, id));
	}

	function deviceSpeak(text) {
		if (!('speechSynthesis' in window)) return;
		try {
			const all = speechSynthesis.getVoices();
			if (!deviceVoice || !deviceVoice.lang.startsWith(state.lang)) {
				deviceVoice = state.lang === 'ar' ? all.find((v) => /Zariyah/i.test(v.name)) || all.find((v) => /^ar/i.test(v.lang)) : all.find((v) => /^en/i.test(v.lang));
			}
			const u = new SpeechSynthesisUtterance(text);
			u.lang = deviceVoice ? deviceVoice.lang : state.lang === 'ar' ? 'ar-SA' : 'en-US';
			if (deviceVoice) u.voice = deviceVoice;
			u.rate = 0.85;
			speechSynthesis.speak(u);
		} catch (err) {
			/* no voice on this device */
		}
	}

	// quiet: only the bubble (playing together, a win or a miss gets music, not the voice)
	function say(key, {voiceOnly = false, quiet = false} = {}) {
		const text = typeof key === 'string' && T[state.lang][key] ? t(key) : key;
		if (!voiceOnly) {
			els.bubbleText.textContent = text;
			gsap.fromTo(els.bubble, {scale: 0.85, rotation: -2}, {scale: 1, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)'});
		}
		if (!quiet) speak(text);
	}

	/* ================= drawing: cups and ball ================= */
	// a cartoon cup upside down: bold outline, shiny top, light left edge, shaded right edge, white rim
	function cupSvg(color) {
		const [main, dark, light] = CUP_COLORS[color];
		const ink = '#2b1210';

		return `<svg viewBox="0 0 120 150" aria-hidden="true">
			<ellipse cx="60" cy="131" rx="54" ry="14" fill="#fff" stroke="${ink}" stroke-width="3.5"/>
			<path d="M8 133 Q60 156 112 133 Q60 150 8 133 Z" fill="#e4e4e4"/>
			<path d="M30 26 L14 128 Q60 146 106 128 L90 26 Z" fill="${main}"/>
			<path d="M79 36 L91 30 L104 128 Q99 131 93 133 Z" fill="${dark}" opacity=".55"/>
			<path d="M27 44 Q30 40 34 44 L27 123 Q24 128 20 124 Z" fill="${light}" opacity=".7"/>
			<path d="M30 26 L14 128 Q60 146 106 128 L90 26" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
			<ellipse cx="60" cy="26" rx="30" ry="12" fill="${main}" stroke="${ink}" stroke-width="3.5"/>
			<ellipse cx="60" cy="25" rx="27" ry="9.5" fill="${light}" opacity=".35"/>
			<path d="M37 25 Q41 17 53 15" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
		</svg>`;
	}

	els.ball.innerHTML = `<svg viewBox="0 0 100 100">
		<defs><radialGradient id="ballg" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd84a"/><stop offset="1" stop-color="#ff9a1f"/></radialGradient></defs>
		<circle cx="50" cy="50" r="46" fill="url(#ballg)"/>
		<path d="M8 58 Q50 76 92 58" stroke="#ff6b8b" stroke-width="7" fill="none" opacity=".75"/>
		<g class="eyes"><ellipse cx="36" cy="44" rx="6" ry="8" fill="#3a2152"/><ellipse cx="64" cy="44" rx="6" ry="8" fill="#3a2152"/>
		<circle cx="38" cy="41" r="2.3" fill="#fff"/><circle cx="66" cy="41" r="2.3" fill="#fff"/></g>
		<path d="M40 58 Q50 68 60 58" stroke="#3a2152" stroke-width="4" fill="none" stroke-linecap="round"/>
		<ellipse cx="25" cy="56" rx="7" ry="4" fill="#ff7aa8" opacity=".55"/><ellipse cx="75" cy="56" rx="7" ry="4" fill="#ff7aa8" opacity=".55"/>
		<ellipse cx="32" cy="22" rx="12" ry="6" fill="#fff" opacity=".75" transform="rotate(-28 32 22)"/>
	</svg>`;

	function buildCups() {
		els.stage.querySelectorAll('.cup').forEach((cup) => cup.remove());
		const level = LEVELS[state.level];
		game.color = randomColor();
		game.cups = Array.from({length: level.cups}, (_, i) => {
			const color = game.color;
			const el = document.createElement('button');
			el.type = 'button';
			el.className = 'cup';
			el.setAttribute('aria-label', `${state.lang === 'ar' ? 'كُوب' : 'Cup'} ${i + 1}`);
			el.innerHTML = `<div class="shadow"></div><div class="lift"><div class="wig">${cupSvg(color)}</div></div>`;
			const cup = {el, lift: el.querySelector('.lift'), shadow: el.querySelector('.shadow'), slot: i, x: 0, y: 0, s: 1};
			el.addEventListener('click', () => pickCup(cup));
			els.stage.appendChild(el);

			return cup;
		});
		layout();
	}

	const slotX = (slot) => geo.spacing * (slot + 0.5);

	function renderCup(cup) {
		cup.el.style.transform = `translate3d(${cup.x}px, ${cup.y}px, 0) scale(${cup.s})`;
	}

	// a different color than the one before
	function randomColor() {
		const others = COLOR_NAMES.filter((name) => name !== game.color);

		return others[randInt(0, others.length - 1)];
	}

	// a new round, a new color: every cup pops into it together
	function recolorCups() {
		game.color = randomColor();
		game.cups.forEach((cup, i) => {
			cup.lift.querySelector('.wig').innerHTML = cupSvg(game.color);
			gsap.fromTo(cup.lift, {scaleX: 1.12, scaleY: 0.9}, {scaleX: 1, scaleY: 1, duration: 0.5, delay: i * 0.04, ease: 'elastic.out(1, 0.4)'});
		});
	}

	function layout() {
		const rect = els.stage.getBoundingClientRect();
		const n = game.cups.length || 3;
		geo.w = rect.width;
		geo.h = rect.height;
		geo.spacing = geo.w / n;
		geo.cupW = Math.min(geo.spacing * 0.8, geo.h * 0.36, 170);
		geo.cupH = geo.cupW * 1.25;
		geo.base = Math.min(geo.h * 0.8, geo.h - geo.cupH * 0.42);
		geo.ballSize = geo.cupW * 0.52;
		els.stage.style.setProperty('--base', `${geo.base}px`);
		els.stage.style.setProperty('--cupH', `${geo.cupH}px`);
		game.cups.forEach((cup) => {
			Object.assign(cup.el.style, {width: `${geo.cupW}px`, height: `${geo.cupH}px`, top: `${geo.base - geo.cupH}px`});
			cup.x = slotX(cup.slot) - geo.cupW / 2;
			cup.y = 0;
			cup.s = 1;
			renderCup(cup);
			const lifted = gsap.getProperty(cup.lift, 'y');
			if (lifted) gsap.set(cup.lift, {y: -geo.cupH * 0.62});
		});
		Object.assign(els.ball.style, {width: `${geo.ballSize}px`, height: `${geo.ballSize}px`});
		if (game.ballCup && game.phase !== 'idle') gsap.set(els.ball, ballUnder(game.ballCup));
		else gsap.set(els.ball, ballFront());
	}

	const ballFront = () => ({x: geo.w / 2 - geo.ballSize / 2, y: geo.base - geo.ballSize * 0.35, scale: 1, rotation: 0});
	const ballUnder = (cup) => ({x: slotX(cup.slot) - geo.ballSize / 2, y: geo.base - geo.ballSize - 2, scale: 1, rotation: 0});

	function lift(cup, {high = 0.62} = {}) {
		sfx.lift();
		gsap.to(cup.shadow, {scaleX: 0.6, opacity: 0.4, duration: 0.35});

		return gsap.to(cup.lift, {y: -geo.cupH * high, rotation: -6, duration: 0.42, ease: 'back.out(2)'}).then();
	}

	function lower(cup) {
		gsap.to(cup.shadow, {scaleX: 1, opacity: 1, duration: 0.3});

		return gsap.to(cup.lift, {y: 0, rotation: 0, duration: 0.32, ease: 'bounce.out', onStart: () => setTimeout(sfx.drop, 180)}).then();
	}

	// the ball jumps in a little arc, squashing when it lands
	function hopBall(to, {height = geo.cupH * 0.9, duration = 0.6} = {}) {
		sfx.hop();
		const from = {x: gsap.getProperty(els.ball, 'x'), y: gsap.getProperty(els.ball, 'y')};
		const o = {p: 0};

		return gsap
			.to(o, {
				p: 1,
				duration,
				ease: 'power1.inOut',
				onUpdate: () => gsap.set(els.ball, {x: lerp(from.x, to.x, o.p), y: lerp(from.y, to.y, o.p) - Math.sin(Math.PI * o.p) * height, rotation: o.p * 360})
			})
			.then(() => gsap.fromTo(els.ball, {scaleX: 1.25, scaleY: 0.78}, {scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)'}).then());
	}

	/* ================= one round ================= */
	function difficulty() {
		const level = LEVELS[state.level];
		// solo: a little harder with every win, up to 8 wins; together: the same for every player
		const k = state.mode === 'multi' ? 0.4 : Math.min(1, state.wins[state.level] / 8);
		const swaps = Math.round(lerp(level.swaps[0], level.swaps[1], k)) + randInt(0, 1);

		return {level, swaps, speed: lerp(level.speed[0], level.speed[1], k)};
	}

	function pairs({count, allowFar}) {
		const n = game.cups.length;
		const bySlot = [];
		game.cups.forEach((cup) => (bySlot[cup.slot] = cup));
		const used = new Set();
		const out = [];
		for (let tries = 0; out.length < count && tries < 30; tries++) {
			const a = randInt(0, n - 1);
			const b = allowFar && Math.random() < 0.45 ? randInt(0, n - 1) : a + (Math.random() < 0.5 ? -1 : 1);
			if (b < 0 || b >= n || a === b || used.has(a) || used.has(b)) continue;
			used.add(a).add(b);
			out.push([bySlot[a], bySlot[b]]);
		}

		return out;
	}

	// two cups trade places: one passes in front (bigger, lower), the other behind (smaller, higher)
	function swapCups(front, back, speed) {
		const fromF = front.x;
		const fromB = back.x;
		const distance = Math.abs(front.slot - back.slot);
		[front.slot, back.slot] = [back.slot, front.slot];
		const toF = slotX(front.slot) - geo.cupW / 2;
		const toB = slotX(back.slot) - geo.cupW / 2;
		const amp = geo.cupH * (0.14 + 0.05 * distance);
		front.el.style.zIndex = 5;
		back.el.style.zIndex = 2;
		const o = {p: 0};

		return gsap
			.to(o, {
				p: 1,
				duration: speed * (0.85 + 0.2 * distance),
				ease: 'sine.inOut',
				onUpdate: () => {
					const arc = Math.sin(Math.PI * o.p);
					Object.assign(front, {x: lerp(fromF, toF, o.p), y: arc * amp * 0.45, s: 1 + 0.1 * arc});
					Object.assign(back, {x: lerp(fromB, toB, o.p), y: -arc * amp, s: 1 - 0.1 * arc});
					renderCup(front);
					renderCup(back);
				}
			})
			.then(() => {
				front.el.style.zIndex = back.el.style.zIndex = '';
			});
	}

	async function playRound() {
		if (game.phase !== 'idle') return;
		const run = ++game.run;
		const alive = () => run === game.run && game.phase !== 'menu';
		ctx();
		updateMusic();
		sfx.tap();
		const {level, swaps, speed} = difficulty();
		game.phase = 'peek';
		game.triesLeft = level.tries;
		els.playBtn.classList.add('gone');
		game.cups.forEach((cup) => cup.el.classList.remove('tried'));
		recolorCups();
		await wait(350);
		if (!alive()) return;

		// the ball hops under a cup while everyone watches
		const target = game.cups[randInt(0, game.cups.length - 1)];
		game.ballCup = target;
		say('watch');
		await lift(target);
		if (!alive()) return;
		els.ball.style.zIndex = 6;
		await hopBall(ballUnder(target));
		if (!alive()) return;
		els.ball.style.zIndex = 1;
		await wait(level.peek);
		if (!alive()) return;
		await lower(target);
		gsap.set(els.ball, {autoAlpha: 0});
		await wait(state.level === 'easy' ? 700 : 400);
		if (!alive()) return;

		game.phase = 'shuffle';
		say('shuffle');
		for (let i = 0; i < swaps && alive(); i++) {
			const roll = Math.random();
			const count = roll < level.triple ? 3 : game.cups.length >= 4 && roll < level.triple + level.double ? 2 : 1;
			const moves = pairs({count, allowFar: game.cups.length > 3});
			sfx.swoosh(speed);
			await Promise.all(moves.map(([a, b]) => swapCups(a, b, speed)));
			await wait(state.level === 'easy' ? 220 : 60);
		}
		if (!alive()) return;
		startGuess();
	}

	function startGuess() {
		if (state.mode === 'multi') {
			startDragging();

			return;
		}
		game.phase = 'guess';
		game.idleCount = 0;
		els.stage.classList.add('pickable');
		say('where');
		armIdleHint();
	}

	// nobody tapped for a while: the cups wiggle and the question is asked again
	function armIdleHint() {
		clearTimeout(game.idleTimer);
		game.idleTimer = setTimeout(() => {
			if (game.phase !== 'guess' || game.idleCount >= 3) return;
			game.idleCount++;
			game.cups.filter((cup) => !cup.el.classList.contains('tried')).forEach((cup, i) => {
				setTimeout(() => {
					cup.el.classList.add('wiggle');
					setTimeout(() => cup.el.classList.remove('wiggle'), 950);
				}, i * 120);
			});
			say('where');
			armIdleHint();
		}, 7000);
	}

	async function pickCup(cup) {
		if (game.phase !== 'guess' || cup.el.classList.contains('tried')) return;
		clearTimeout(game.idleTimer);
		game.phase = 'reveal';
		els.stage.classList.remove('pickable');
		const run = game.run;

		if (cup === game.ballCup) {
			gsap.set(els.ball, {...ballUnder(cup), autoAlpha: 1});
			els.ball.style.zIndex = 6; // in front, so it can jump for joy
			await lift(cup, {high: 0.75});
			if (run !== game.run) return;
			celebrate(cup);

			return;
		}

		// an empty cup
		cup.el.classList.add('tried');
		game.triesLeft--;
		await lift(cup);
		if (run !== game.run) return;
		sfx.wrong();
		gsap.fromTo(cup.lift, {x: -8}, {x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.2)'});
		if (game.triesLeft > 0) {
			say('miss', {quiet: state.mode === 'multi'});
			await wait(900);
			await lower(cup);
			if (run !== game.run) return;
			game.phase = 'guess';
			els.stage.classList.add('pickable');
			armIdleHint();

			return;
		}

		// show where the ball was hiding, then get ready for the next round
		say('was', {quiet: state.mode === 'multi'});
		await wait(500);
		gsap.set(els.ball, {...ballUnder(game.ballCup), autoAlpha: 1});
		await lift(game.ballCup);
		gsap.fromTo(els.ball, {rotation: -15}, {rotation: 15, duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut'});
		await wait(2000);
		if (run !== game.run) return;
		await backToIdle([cup, game.ballCup]);
		if (state.mode === 'multi' && run === game.run) nextTurn();
	}

	async function backToIdle(liftedCups) {
		els.ball.style.zIndex = 6;
		gsap.set(els.ball, {rotation: 0});
		await hopBall(ballFront(), {height: geo.cupH * 0.5, duration: 0.5});
		await Promise.all(liftedCups.map(lower));
		game.cups.forEach((cup) => cup.el.classList.remove('tried'));
		game.ballCup = null;
		game.phase = 'idle';
		els.playBtn.classList.remove('gone');
		gsap.fromTo(els.playBtn, {scale: 0.4}, {scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'});
		if (state.mode === 'solo') els.bubbleText.textContent = t('ready');
	}

	function confettiAt(el, {count = 120, spread = 80} = {}) {
		if (!window.confetti) return;
		const r = el.getBoundingClientRect();
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.confetti({
			particleCount: reduced ? 25 : count,
			spread,
			startVelocity: 42,
			origin: {x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight},
			colors: ['#ff4d6d', '#ffc93c', '#7b5cff', '#34c46a', '#4aa8ff', '#ff8a3d'],
			shapes: ['star', 'circle'],
			scalar: 1.2,
			zIndex: 70
		});
	}

	async function celebrate(cup) {
		const run = game.run;
		sfx.found();
		winMusic();
		say('yay', {quiet: state.mode === 'multi'});
		// the ball jumps for joy
		gsap.timeline()
			.to(els.ball, {y: `-=${geo.cupH * 0.35}`, scaleY: 1.1, scaleX: 0.92, duration: 0.25, ease: 'power2.out'})
			.to(els.ball, {y: `+=${geo.cupH * 0.35}`, scaleY: 1, scaleX: 1, duration: 0.3, ease: 'bounce.out'})
			.to(els.ball, {y: `-=${geo.cupH * 0.2}`, duration: 0.2, ease: 'power2.out'})
			.to(els.ball, {y: `+=${geo.cupH * 0.2}`, duration: 0.3, ease: 'bounce.out'});
		confettiAt(els.ball);
		if (state.mode === 'multi') {
			// the star flies from the ball to the player who found it
			party.addStar(els.ball);
			await wait(1900);
			if (run !== game.run) return;
			await backToIdle([cup]);
			if (run === game.run) nextTurn();

			return;
		}
		state.wins[state.level]++;
		state.stars = Math.min(STARS_FOR_TROPHY, state.stars + 1);
		persist();
		renderStars({popIndex: state.stars - 1});
		await wait(1700);
		if (run !== game.run) return;
		await showPrize();
		if (run !== game.run) return;
		if (state.stars >= STARS_FOR_TROPHY) await showSuper();
		if (run !== game.run) return;
		await backToIdle([cup]);
	}

	/* ================= prizes ================= */
	const prizeCount = () => Object.keys(state.prizes).length;

	function choosePrize() {
		const missing = PRIZES.filter(([emoji]) => !state.prizes[emoji]);
		const pool = missing.length ? missing : PRIZES;

		return pool[randInt(0, pool.length - 1)];
	}

	function showPrize() {
		return new Promise((done) => {
			const [emoji, ar, en] = choosePrize();
			const isNew = !state.prizes[emoji];
			const name = state.lang === 'ar' ? ar : en;
			let opened = false;
			els.prizeHead.textContent = t('surprise');
			els.prizeEmoji.textContent = emoji;
			els.prizeName.textContent = '';
			els.newTag.classList.add('hidden');
			els.collectBtn.classList.add('hidden');
			gsap.set(els.gift, {autoAlpha: 1, scale: 1, rotation: 0});
			gsap.set(els.prizeEmoji, {autoAlpha: 0, scale: 0});
			els.prizeOverlay.classList.remove('hidden');
			gsap.fromTo('#prizeOverlay .prize-card', {scale: 0.3, rotation: -8}, {scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.55)'});
			sfx.chime();
			speak(t('surprise'));

			const open = () => {
				if (opened) return;
				opened = true;
				clearTimeout(autoOpen);
				sfx.chime();
				gsap.to(els.gift, {scale: 1.6, rotation: 20, autoAlpha: 0, duration: 0.35, ease: 'power2.in'});
				gsap.to(els.prizeEmoji, {autoAlpha: 1, scale: 1, duration: 0.9, delay: 0.25, ease: 'elastic.out(1, 0.45)'});
				gsap.fromTo(els.prizeEmoji, {rotation: -30}, {rotation: 0, duration: 0.9, delay: 0.25, ease: 'elastic.out(1, 0.45)'});
				setTimeout(() => {
					confettiAt(els.prizeEmoji, {count: 90, spread: 360});
					els.prizeName.textContent = `${emoji} ${name}`;
					gsap.from(els.prizeName, {y: 20, autoAlpha: 0, duration: 0.4});
					els.newTag.classList.toggle('hidden', !isNew);
					if (isNew) gsap.from(els.newTag, {scale: 0, duration: 0.5, ease: 'back.out(3)'});
					els.collectBtn.classList.remove('hidden');
					gsap.from(els.collectBtn, {scale: 0, duration: 0.5, ease: 'back.out(2)'});
					speak(T[state.lang].got(name));
				}, 450);
			};
			const autoOpen = setTimeout(open, 1800);
			els.gift.onclick = open;

			els.collectBtn.onclick = () => {
				els.collectBtn.onclick = null;
				state.prizes[emoji] = (state.prizes[emoji] || 0) + 1;
				persist();
				flyToChest(emoji, els.prizeEmoji);
				gsap.to('#prizeOverlay .prize-card', {
					scale: 0.6,
					autoAlpha: 0,
					duration: 0.3,
					ease: 'power2.in',
					onComplete: () => {
						els.prizeOverlay.classList.add('hidden');
						gsap.set('#prizeOverlay .prize-card', {clearProps: 'all'});
						setTimeout(done, 650);
					}
				});
			};
		});
	}

	// the prize flies into the 🎁 chest in the top bar
	function flyToChest(emoji, fromEl) {
		const from = fromEl.getBoundingClientRect();
		const to = els.chestBtn.getBoundingClientRect();
		const flyer = document.createElement('div');
		flyer.className = 'flyer';
		flyer.textContent = emoji;
		Object.assign(flyer.style, {left: `${from.left}px`, top: `${from.top}px`});
		document.body.appendChild(flyer);
		const dx = to.left + to.width / 2 - (from.left + from.width / 2);
		const dy = to.top + to.height / 2 - (from.top + from.height / 2);
		gsap.timeline({onComplete: () => flyer.remove()})
			.to(flyer, {x: dx * 0.5, y: dy * 0.5 - 80, scale: 0.7, rotation: 180, duration: 0.4, ease: 'power1.out'})
			.to(flyer, {x: dx, y: dy, scale: 0.15, rotation: 360, duration: 0.4, ease: 'power2.in'})
			.add(() => {
				sfx.collect();
				renderChest();
				gsap.fromTo(els.chestBtn, {scale: 1.35}, {scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', clearProps: 'transform'});
			});
	}

	// confetti fireworks from both sides
	function fireworks() {
		if (!window.confetti) return;
		let bursts = 0;
		const fire = setInterval(() => {
			window.confetti({particleCount: 70, angle: 60, spread: 70, origin: {x: 0, y: 0.7}, zIndex: 70, shapes: ['star', 'circle']});
			window.confetti({particleCount: 70, angle: 120, spread: 70, origin: {x: 1, y: 0.7}, zIndex: 70, shapes: ['star', 'circle']});
			if (++bursts >= 4) clearInterval(fire);
		}, 420);
	}

	/* ================= play together ================= */
	// the scoreboard under the top bar: whose turn it is (highlighted) and a ⭐ count for each player
	const party = PP.board($('partyBoard'), {lang: state.lang, star: () => sfx.star()});

	function renderTurnChip() {
		const round = Math.min(state.turns, game.turn + 1);
		const shown = state.lang === 'ar' ? `${round}/${state.turns}`.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) : `${round}/${state.turns}`;
		els.levelChip.innerHTML = `<span>${LEVELS[state.level].animal}</span><span class="lvl-name">${t(state.level)}</span><span class="round">🔁 ${shown}</span>`;
	}

	function bubble(text) {
		els.bubbleText.textContent = text;
		gsap.fromTo(els.bubble, {scale: 0.85, rotation: -2}, {scale: 1, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)'});
	}

	// a new round: everybody watches together, then everybody guesses
	function announceRound() {
		party.setTurn(-1);
		renderTurnChip();
		els.playWho.textContent = '';
		bubble(t('readyAll'));
		sfx.chime();
	}

	/* everyone drags their picture onto the cup they think hides the ball;
	   when the last one is placed the cups lift and whoever was right gets a star */
	const dock = $('dock');
	let tokens = [];

	function startDragging() {
		game.phase = 'drag';
		dock.innerHTML = '';
		dock.classList.remove('hidden');
		tokens = game.players.map((p, i) => {
			const el = document.createElement('div');
			el.className = 'token';
			el.style.setProperty('--c', p.color);
			el.setAttribute('aria-label', PP.nameOf(p, state.lang));
			el.innerHTML = `<img src="${PP.img(p)}" alt="" draggable="false">`;
			const tok = {p, i, el, cup: null};
			el.addEventListener('pointerdown', (e) => drag(tok, e));
			dock.appendChild(el);

			return tok;
		});
		gsap.from(dock.children, {y: 60, scale: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(2)'});
		bubble(t('dragAll'));
	}

	// the cup under the finger (a little above it counts too: that is where the pictures sit)
	function cupAt(x, y) {
		return game.cups.find((cup) => {
			const r = cup.el.getBoundingClientRect();

			return x > r.left - 8 && x < r.right + 8 && y > r.top - r.height * 0.5 && y < r.bottom + 10;
		});
	}

	function drag(tok, e) {
		if (game.phase !== 'drag') return;
		e.preventDefault();
		const r = tok.el.getBoundingClientRect();
		const offX = r.width / 2;
		const offY = r.height / 2;
		const from = tok.cup;
		if (from) from.el.classList.remove('target');
		gsap.killTweensOf(tok.el);
		document.body.appendChild(tok.el);
		tok.el.classList.add('dragging');
		Object.assign(tok.el.style, {position: 'fixed', left: '0', top: '0', width: `${r.width}px`, height: `${r.height}px`, animation: 'none'});
		gsap.set(tok.el, {x: r.left, y: r.top, rotation: 0, scale: 1});
		// the picture glides after the finger and leans into the movement
		const toX = gsap.quickTo(tok.el, 'x', {duration: 0.18, ease: 'power3.out'});
		const toY = gsap.quickTo(tok.el, 'y', {duration: 0.18, ease: 'power3.out'});
		const tilt = gsap.quickTo(tok.el, 'rotation', {duration: 0.3, ease: 'power2.out'});
		gsap.to(tok.el, {scale: 1.25, duration: 0.25, ease: 'back.out(3)'});
		toX(e.clientX - offX);
		toY(e.clientY - offY);
		sfx.tap();
		tok.el.setPointerCapture(e.pointerId);
		let over = null;
		let lastX = e.clientX;
		const move = (ev) => {
			toX(ev.clientX - offX);
			toY(ev.clientY - offY);
			tilt(Math.max(-22, Math.min(22, (ev.clientX - lastX) * 1.5)));
			lastX = ev.clientX;
			const cup = cupAt(ev.clientX, ev.clientY);
			if (cup !== over) {
				if (over) over.el.classList.remove('target');
				over = cup;
				if (cup) {
					cup.el.classList.add('target');
					sfx.hop();
				}
			}
		};
		const up = () => {
			tok.el.removeEventListener('pointermove', move);
			tok.el.removeEventListener('pointerup', up);
			tok.el.removeEventListener('pointercancel', up);
			if (over) over.el.classList.remove('target');
			if (game.phase !== 'drag') {
				tok.el.remove();

				return;
			}
			seat(tok, over);
			if (over) sfx.drop();
			if (tokens.every((t) => t.cup)) {
				game.phase = 'reveal';
				const run = game.run;
				setTimeout(() => run === game.run && revealAll(), 700);
			}
		};
		tok.el.addEventListener('pointermove', move);
		tok.el.addEventListener('pointerup', up);
		tok.el.addEventListener('pointercancel', up);
	}

	// the picture flies smoothly from where it is to its seat on a cup (or home to the dock)
	function seat(tok, cup) {
		const first = tok.el.getBoundingClientRect();
		tok.cup = cup;
		tok.el.classList.remove('dragging');
		tok.el.removeAttribute('style');
		tok.el.style.setProperty('--c', tok.p.color);
		gsap.set(tok.el, {clearProps: 'transform'});
		if (cup) {
			if (!cup.seats) {
				cup.seats = document.createElement('div');
				cup.seats.className = 'seats';
				cup.lift.appendChild(cup.seats);
			}
			cup.seats.appendChild(tok.el);
		} else {
			const after = tokens.slice(tok.i + 1).find((t) => t.el.parentNode === dock);
			dock.insertBefore(tok.el, after ? after.el : null);
		}
		const last = tok.el.getBoundingClientRect();
		gsap.fromTo(tok.el,
			{x: first.left - last.left + (first.width - last.width) / 2, y: first.top - last.top + (first.height - last.height) / 2, scale: first.width / last.width, rotation: 0},
			{x: 0, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.8)', clearProps: 'transform'});
	}

	async function revealAll() {
		const run = game.run;
		const names = (list) => list.map((t) => PP.nameOf(t.p, state.lang)).join(state.lang === 'ar' ? ' وَ' : ' & ');
		tokens.forEach((t) => t.el.classList.add('locked'));
		const winners = tokens.filter((t) => t.cup === game.ballCup);
		const lifted = [...new Set([...tokens.map((t) => t.cup), game.ballCup])];
		gsap.set(els.ball, {...ballUnder(game.ballCup), autoAlpha: 1});
		els.ball.style.zIndex = 6;
		await Promise.all(lifted.map((cup) => lift(cup, {high: cup === game.ballCup ? 0.75 : 0.62})));
		if (run !== game.run) return;
		tokens.forEach((t) => t.el.classList.add(winners.includes(t) ? 'win' : 'lose'));
		if (winners.length) {
			// music, not the voice: a happy jingle, confetti, the ball jumps and each winner's star flies home
			sfx.found();
			winMusic();
			confettiAt(els.ball);
			gsap.timeline()
				.to(els.ball, {y: `-=${geo.cupH * 0.35}`, scaleY: 1.1, scaleX: 0.92, duration: 0.25, ease: 'power2.out'})
				.to(els.ball, {y: `+=${geo.cupH * 0.35}`, scaleY: 1, scaleX: 1, duration: 0.3, ease: 'bounce.out'});
			winners.forEach((t, k) => setTimeout(() => run === game.run && party.addStar(t.el, t.i), 500 + k * 180));
			bubble(t('foundBy')(names(winners), winners.length > 1));
		} else {
			sfx.wrong();
			gsap.fromTo(els.ball, {rotation: -15}, {rotation: 15, duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut'});
			bubble(t('nobody'));
		}
		await wait(3000);
		if (run !== game.run) return;
		// everybody goes home, the cups come down, next round
		tokens.forEach((t) => {
			t.el.classList.remove('win', 'lose', 'locked');
			seat(t, null);
		});
		await wait(450);
		dock.classList.add('hidden');
		await backToIdle(lifted);
		if (run === game.run) nextTurn();
	}

	function nextTurn() {
		game.turn++;
		if (game.turn >= state.turns) {
			els.playBtn.classList.add('gone');
			showResults();

			return;
		}
		announceRound();
	}

	function showResults() {
		game.phase = 'results';
		PP.results(els.podium, party, state.lang);
		els.winnerGiftBtn.classList.remove('hidden');
		els.resultOverlay.classList.remove('hidden');
		gsap.fromTo('#resultOverlay .prize-card', {scale: 0.3, rotation: -6}, {scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.55)'});
		winMusic({big: true});
		fireworks();
	}

	function startTogether() {
		// playing together needs two: with one picked, the next family member joins
		const picked = PP.active();
		game.players = picked.length > 1 ? picked : [picked[0], PP.PEOPLE.find((p) => p !== picked[0])];
		game.turn = 0;
		party.start(game.players, state.turns);
	}

	function renderModeMenu() {
		els.modeSwitch.querySelectorAll('.mode').forEach((btn) => btn.classList.toggle('on', btn.dataset.mode === state.mode));
		els.multiSetup.classList.toggle('hidden', state.mode !== 'multi');
		if (picker) picker.setLang(state.lang);
		party.setLang(state.lang);
		els.turnChoices.innerHTML = '';
		[3, 5].forEach((n) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = n === state.turns ? 'choice on' : 'choice';
			btn.textContent = t('turnsN')(n);
			btn.addEventListener('click', () => {
				state.turns = n;
				persist();
				sfx.tap();
				renderModeMenu();
			});
			els.turnChoices.appendChild(btn);
		});
	}

	function showSuper() {
		return new Promise((done) => {
			state.trophies++;
			state.stars = 0;
			persist();
			els.superOverlay.classList.remove('hidden');
			gsap.fromTo('#superOverlay .prize-card', {scale: 0.2, rotation: 15}, {scale: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)'});
			winMusic({big: true});
			speak(t('superSay'));
			fireworks();
			els.superBtn.onclick = () => {
				els.superBtn.onclick = null;
				sfx.collect();
				renderStars();
				gsap.to('#superOverlay .prize-card', {
					scale: 0.6,
					autoAlpha: 0,
					duration: 0.3,
					onComplete: () => {
						els.superOverlay.classList.add('hidden');
						gsap.set('#superOverlay .prize-card', {clearProps: 'all'});
						done();
					}
				});
			};
		});
	}

	function openShelf() {
		sfx.tap();
		els.shelf.innerHTML = '';
		// the prizes already won come first
		const sorted = [...PRIZES].sort((a, b) => !state.prizes[a[0]] - !state.prizes[b[0]]);
		sorted.forEach(([emoji, ar, en], i) => {
			const count = state.prizes[emoji] || 0;
			const item = document.createElement('button');
			item.type = 'button';
			item.className = count ? 'shelf-item' : 'shelf-item locked';
			item.style.animationDelay = `${i * 25}ms`;
			item.innerHTML = count ? `${emoji}${count > 1 ? `<b>×${count}</b>` : ''}` : '?';
			if (count) {
				item.setAttribute('aria-label', state.lang === 'ar' ? ar : en);
				item.addEventListener('click', () => {
					sfx.star();
					speak(state.lang === 'ar' ? ar : en);
					gsap.fromTo(item, {scale: 1.3, rotation: -10}, {scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)'});
				});
			}
			els.shelf.appendChild(item);
		});
		els.shelfCount.textContent = `${prizeCount()} / ${PRIZES.length}`;
		els.trophies.textContent = state.trophies ? `${'🏆'.repeat(Math.min(state.trophies, 12))}${state.trophies > 12 ? ` ×${state.trophies}` : ''}` : '';
		els.shelfOverlay.classList.remove('hidden');
		gsap.fromTo('#shelfOverlay .shelf-card', {y: 60, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.6)'});
	}

	function closeShelf() {
		sfx.tap();
		els.shelfOverlay.classList.add('hidden');
	}

	/* ================= screens and buttons ================= */
	function renderStars({popIndex = -1} = {}) {
		els.stars.innerHTML = '';
		for (let i = 0; i < STARS_FOR_TROPHY; i++) {
			const star = document.createElement('span');
			star.className = i < state.stars ? 'st on' : 'st';
			star.textContent = '⭐';
			els.stars.appendChild(star);
			if (i === popIndex) {
				sfx.star();
				gsap.fromTo(star, {scale: 2.4, rotation: -180}, {scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)'});
			}
		}
	}

	function renderChest() {
		els.chestCount.textContent = prizeCount();
		els.menuPrizeCount.textContent = `${prizeCount()} / ${PRIZES.length}`;
	}

	function renderLevels() {
		els.levels.innerHTML = '';
		Object.entries(LEVELS).forEach(([id, level]) => {
			const card = document.createElement('button');
			card.type = 'button';
			card.className = `level-card level-${id}`;
			const color = COLOR_NAMES[Object.keys(LEVELS).indexOf(id) % COLOR_NAMES.length];
			const minis = Array.from({length: level.cups}, () => cupSvg(color)).join('');
			card.innerHTML = `<span class="icon"><span class="animal">${level.animal}</span></span>
				<span class="info"><b>${t(id)}</b><small>${t(`${id}Sub`)}</small></span>
				<div class="mini-cups">${minis}</div>
				<span class="speed">${t(`${id}Speed`)}</span>
				${state.wins[id] && state.mode === 'solo' ? `<span class="won">⭐ ${state.wins[id]}</span>` : ''}`;
			card.addEventListener('click', () => startLevel(id));
			els.levels.appendChild(card);
		});
	}

	function applyLanguage() {
		document.documentElement.lang = state.lang;
		document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
		document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t)));
		document.title = state.lang === 'ar' ? 'أين الكرة؟' : 'Find the Ball';
		renderLevels();
		renderModeMenu();
		renderChest();
		if (game.phase !== 'menu') state.mode === 'multi' ? renderTurnChip() : renderLevelChip();
	}

	function renderLevelChip() {
		els.levelChip.innerHTML = `<span>${LEVELS[state.level].animal}</span><span class="lvl-name">${t(state.level)}</span>`;
	}

	function showScreen(name) {
		els.menu.classList.toggle('active', name === 'menu');
		els.game.classList.toggle('active', name === 'game');
		els.levelChip.classList.toggle('hidden', name !== 'game');
		els.stars.classList.toggle('hidden', name !== 'game' || state.mode === 'multi');
		els.scoreboard.classList.add('hidden');
		if (name !== 'game' || state.mode !== 'multi') party.hide();
		document.body.classList.toggle('solo-game', name === 'game' && state.mode === 'solo');
		document.body.classList.toggle('multi-game', name === 'game' && state.mode === 'multi');
		els.langBtn.classList.toggle('hidden', name === 'game');
	}

	function startLevel(id) {
		state.level = id;
		ctx();
		sfx.tap();
		showScreen('game');
		game.phase = 'idle';
		game.ballCup = null;
		game.run++;
		els.resultOverlay.classList.add('hidden');
		clearDock();
		if (state.mode === 'multi') startTogether(); // before the cups: the scoreboard takes some height
		renderLevelChip();
		renderStars();
		buildCups();
		preloadVoice();
		gsap.set(els.ball, {...ballFront(), autoAlpha: 1});
		els.ball.style.zIndex = 6;
		els.playBtn.classList.remove('gone');
		els.playWho.textContent = '';
		els.playBtn.style.removeProperty('--pc');
		if (state.mode === 'multi') {
			announceRound();
		} else {
			say('ready');
		}
		updateMusic();
		// the cups drop onto the table one by one, the ball bounces in
		game.cups.forEach((cup, i) => {
			gsap.fromTo(cup.lift, {y: -geo.h}, {y: 0, duration: 0.7, delay: 0.1 + i * 0.1, ease: 'bounce.out', onComplete: i === game.cups.length - 1 ? sfx.drop : null});
		});
		gsap.from(els.ball, {scale: 0, duration: 0.8, delay: 0.3 + game.cups.length * 0.1, ease: 'elastic.out(1, 0.4)'});
	}

	function clearDock() {
		tokens.forEach((t) => t.el.remove());
		tokens = [];
		dock.classList.add('hidden');
	}

	function goMenu() {
		game.run++;
		game.phase = 'menu';
		clearDock();
		clearTimeout(game.idleTimer);
		gsap.killTweensOf(els.ball);
		els.stage.classList.remove('pickable');
		stopVoice();
		showScreen('menu');
		renderLevels();
		updateMusic();
	}

	function renderToggles() {
		els.soundBtn.textContent = state.sound ? '🔊' : '🔇';
		els.soundBtn.classList.toggle('off', !state.sound);
		els.musicBtn.classList.toggle('off', !state.music || !state.sound);
	}

	els.homeBtn.addEventListener('click', () => {
		if (game.phase === 'menu') {
			location.href = '../index.html';

			return;
		}
		sfx.tap();
		goMenu();
	});
	els.langBtn.addEventListener('click', () => {
		state.lang = state.lang === 'ar' ? 'en' : 'ar';
		localStorage.setItem('paint-lang-v2', state.lang);
		sfx.tap();
		applyLanguage();
		speak(t('pick'));
	});
	els.soundBtn.addEventListener('click', () => {
		state.sound = !state.sound;
		localStorage.setItem('paint-sound', state.sound ? 'on' : 'off');
		if (!state.sound) stopVoice();
		renderToggles();
		sfx.tap();
		updateMusic();
	});
	els.musicBtn.addEventListener('click', () => {
		state.music = !state.music;
		persist();
		renderToggles();
		sfx.tap();
		updateMusic();
	});
	els.playBtn.addEventListener('click', playRound);
	els.modeSwitch.addEventListener('click', (e) => {
		const btn = e.target.closest('.mode');
		if (!btn || btn.dataset.mode === state.mode) return;
		state.mode = btn.dataset.mode;
		persist();
		sfx.tap();
		renderModeMenu();
		renderLevels();
		if (state.mode === 'multi') {
			speak(t('together'));
			gsap.from(els.multiSetup, {y: -16, autoAlpha: 0, duration: 0.45, ease: 'back.out(2)'});
		}
	});
	els.winnerGiftBtn.addEventListener('click', async () => {
		els.winnerGiftBtn.classList.add('hidden');
		els.resultOverlay.classList.add('hidden');
		await showPrize();
		els.resultOverlay.classList.remove('hidden');
	});
	els.againBtn.addEventListener('click', () => startLevel(state.level));
	els.resultMenuBtn.addEventListener('click', () => {
		els.resultOverlay.classList.add('hidden');
		goMenu();
	});
	els.chestBtn.addEventListener('click', openShelf);
	els.menuPrizesBtn.addEventListener('click', openShelf);
	els.shelfClose.addEventListener('click', closeShelf);
	els.shelfOverlay.addEventListener('click', (e) => e.target === els.shelfOverlay && closeShelf());

	let resizeFrame = 0;
	addEventListener('resize', () => {
		cancelAnimationFrame(resizeFrame);
		resizeFrame = requestAnimationFrame(() => game.phase !== 'menu' && game.phase !== 'shuffle' && layout());
	});
	// quiet when the app goes to the background
	document.addEventListener('visibilitychange', () => {
		if (!audio.ctx) return;
		if (document.hidden) audio.ctx.suspend();
		else audio.ctx.resume();
	});
	addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			if (!els.shelfOverlay.classList.contains('hidden')) closeShelf();
			else if (game.phase !== 'menu') goMenu();
		}
	});

	picker = PP.picker($('players'), {lang: state.lang, tap: (on) => (on ? sfx.chime() : sfx.tap())});
	applyLanguage();
	renderToggles();
	showScreen('menu');
})();
