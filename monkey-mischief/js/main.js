/* Monkey Mischief: the page. Starts Phaser, runs the menus (start → who plays → ready → play → results),
   pause, language, sound and music. The jungle scene is always running: behind the menus the
   monkeys play by themselves; Play restarts the same scene with the chosen players. */
(function () {
	'use strict';
	const MM = window.MM;
	const W = window.MM_WORDS;
	const S = MM.Sound;
	const PP = window.PartyPlayers;
	const $ = (id) => document.getElementById(id);
	const HTTP = location.protocol.startsWith('http');
	MM.events = new Phaser.Events.EventEmitter();

	// pixels per game unit: sharp on a Retina iPad, never more than 2× (keeps the GPU happy)
	const dpr = window.devicePixelRatio || 1;
	const zoom = () => Math.max(1, Math.min(2, Math.round(Math.min((innerWidth * dpr) / MM.Layout.W, (innerHeight * dpr) / MM.Layout.H) * 10) / 10));
	MM.Z = zoom();

	// the screen changed shape (rotated, window resized, toolbar hid): widen or narrow the jungle to fill it again.
	// Only between matches; during one the arena keeps its size and just scales to fit.
	function refit() {
		if (!MM.game || !MM.Layout.refit()) return false;
		MM.Z = zoom();
		MM.game.scale.resize(Math.round(MM.Layout.W * MM.Z), Math.round(MM.Layout.H * MM.Z));

		return true;
	}

	const BOT = {id: 'bot', color: '#22c55e', name: {ar: 'كُوكُو', en: 'Coco'}};
	const KEY = 'mm-settings-v1';
	const saved = (() => {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || {};
		} catch (err) {
			return {};
		}
	})();
	const settings = {mode: saved.mode === 'finger' ? 'finger' : 'joy', duration: saved.duration === 180 ? 180 : 120};
	const persist = () => {
		try {
			localStorage.setItem(KEY, JSON.stringify(settings));
		} catch (err) {
			/* private mode */
		}
	};

	// the family stickers, loaded as plain images (works from a website and from a double-clicked file)
	MM.faces = {};
	PP.PEOPLE.forEach((p) => {
		const img = new Image();
		img.src = PP.img(p);
		MM.faces[p.id] = img;
	});

	MM.attractConfig = () => ({attract: true, players: PP.PEOPLE.map((p, i) => ({player: p, slot: i, bot: true}))});

	/* ---------- words ---------- */
	const ui = (key) => W.UI[S.state.lang][key] || W.UI.en[key] || '';

	function applyLang() {
		const lang = S.state.lang;
		document.documentElement.lang = lang;
		document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
		document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = ui(el.dataset.t)));
		document.title = `${W.UI.ar.title} · ${W.UI.en.title}`;
		if (picker) picker.setLang(lang);
	}

	function applyToggles() {
		$('soundBtn').classList.toggle('off', !S.state.sound);
		$('musicBtn').classList.toggle('off', !S.state.music);
		document.querySelectorAll('#modeSeg .seg-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === settings.mode)));
		document.querySelectorAll('#lenSeg .seg-btn').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.len) === settings.duration)));
	}

	/* ---------- screens ---------- */
	function phase(name) {
		document.body.className = name;
		$('start').classList.toggle('active', name === 'at-start');
		$('setup').classList.toggle('active', name === 'at-setup');
	}

	const scene = () => MM.game && MM.game.scene.getScene('game');
	let lastCfg = null;
	let picker = null;

	function startMatch(cfg) {
		lastCfg = cfg;
		$('pauseOverlay').classList.add('hidden');
		$('resultOverlay').classList.add('hidden');
		phase('ready');
		S.preload();
		refit();
		const sc = scene();
		if (MM.game.scene.isPaused('game')) MM.game.scene.resume('game');
		sc.scene.restart(cfg);
	}

	function buildConfig() {
		const humans = PP.active();
		const players = humans.map((p, i) => ({player: p, slot: i, bot: false}));
		if (players.length === 1) players.push({player: BOT, slot: 1, bot: true});

		return {attract: false, players, mode: settings.mode, duration: settings.duration};
	}

	function toMenu() {
		$('pauseOverlay').classList.add('hidden');
		$('resultOverlay').classList.add('hidden');
		S.music(false);
		S.stopVoice();
		refit();
		if (MM.game.scene.isPaused('game')) MM.game.scene.resume('game');
		scene().scene.restart(MM.attractConfig());
		phase('at-setup');
	}

	function pause() {
		if (!document.body.classList.contains('playing') && !document.body.classList.contains('ready')) return;
		const sc = scene();
		if (sc.input2) sc.input2.releaseAll();
		MM.game.scene.pause('game');
		S.music(false);
		document.body.classList.add('paused');
		$('pauseOverlay').classList.remove('hidden');
		S.say('paused');
	}

	function resume() {
		$('pauseOverlay').classList.add('hidden');
		document.body.classList.remove('paused');
		MM.game.scene.resume('game');
		const sc = scene();
		if (sc.state === 'play') S.music(true, {fast: !!(sc.director && sc.director.twenty)});
	}

	/* ---------- results ---------- */
	const BANANA_SVG = '<svg viewBox="0 0 48 40" aria-hidden="true"><path d="M7 11Q20 34 42 22Q45 20 43 17Q22 25 12 7Z" fill="#ffd84a" stroke="#3b2416" stroke-width="2.6" stroke-linejoin="round"/><circle cx="9.5" cy="9" r="2.6" fill="#6b4423"/></svg>';
	const faceCache = {};

	function showResults(list) {
		const lang = S.state.lang;
		const best = Math.max(...list.map((r) => r.score));
		const winners = list.filter((r) => r.score === best);
		const order = list.slice().sort((a, b) => b.score - a.score);
		const medals = ['🥇', '🥈', '🥉', '🎖️'];
		let place = -1;
		let last = null;
		$('resultTitle').textContent = winners.length > 1 ? W.SAY[lang].tie : W.SAY[lang].winner;
		$('podium').innerHTML = order.map((r, i) => {
			if (r.score !== last) place++;
			last = r.score;
			const p = r.player;
			faceCache[p.id] = faceCache[p.id] || MM.Art.face(p.id, p.color);
			const name = PP.nameOf(p, lang);
			const sticker = r.bot ? '' : `<img class="st" src="${PP.img(p)}" alt="">`;
			const n = lang === 'ar' ? r.score.toLocaleString('ar-EG') : r.score;

			return `<li class="res${r.score === best ? ' win' : ''}" style="--c:${p.color};animation-delay:${200 + i * 160}ms">
				<span class="medal">${medals[place]}</span>
				<span class="who">${r.score === best ? '<span class="crown">👑</span>' : ''}<img class="mk" src="${faceCache[p.id]}" alt="">${sticker}</span>
				<b></b><span class="count">${BANANA_SVG}<span>${n}</span></span></li>`;
		}).join('');
		// names go in as text (a parent may have typed anything)
		$('podium').querySelectorAll('.res b').forEach((el, i) => (el.textContent = PP.nameOf(order[i].player, lang)));
		$('resultOverlay').classList.remove('hidden');
		phase('over');
		S.sfx.fanfare();
		S.say(winners.length > 1 ? 'tie' : 'winner');
		if (window.confetti) {
			const shot = (x) => window.confetti({particleCount: 80, angle: x < 0.5 ? 60 : 120, spread: 70, origin: {x, y: 0.7}, zIndex: 70, colors: ['#ffd23f', '#ff5d73', '#9b6bff', '#1fa8ff', '#ff9417', '#34c759'], shapes: ['star', 'circle']});
			shot(0);
			shot(1);
			setTimeout(() => shot(0.5), 500);
		}
	}

	/* ---------- wiring ---------- */
	function wire() {
		$('homeBtn').addEventListener('click', () => {
			S.sfx.tap();
			location.href = '../index.html';
		});
		$('langBtn').addEventListener('click', () => {
			S.unlock();
			S.setLang(S.state.lang === 'ar' ? 'en' : 'ar');
			applyLang();
			S.sfx.tap();
		});
		$('soundBtn').addEventListener('click', () => {
			S.unlock();
			S.setSound(!S.state.sound);
			applyToggles();
			S.sfx.tap();
		});
		$('musicBtn').addEventListener('click', () => {
			S.unlock();
			S.setMusic(!S.state.music);
			applyToggles();
			S.sfx.tap();
		});
		$('playBtn').addEventListener('click', () => {
			S.unlock();
			S.sfx.ready();
			phase('at-setup');
			S.say('who');
		});
		document.querySelectorAll('#modeSeg .seg-btn').forEach((b) =>
			b.addEventListener('click', () => {
				settings.mode = b.dataset.mode;
				persist();
				applyToggles();
				S.sfx.tap();
			}));
		document.querySelectorAll('#lenSeg .seg-btn').forEach((b) =>
			b.addEventListener('click', () => {
				settings.duration = Number(b.dataset.len);
				persist();
				applyToggles();
				S.sfx.tap();
			}));
		$('goBtn').addEventListener('click', () => {
			S.unlock();
			const cfg = buildConfig();
			startMatch(cfg);
			if (cfg.players.some((p) => p.bot)) setTimeout(() => S.say('coco'), 2600);
		});
		$('pauseBtn').addEventListener('click', pause);
		$('resumeBtn').addEventListener('click', resume);
		$('restartBtn').addEventListener('click', () => {
			document.body.classList.remove('paused');
			startMatch(lastCfg);
		});
		$('menuBtn').addEventListener('click', () => {
			document.body.classList.remove('paused');
			toMenu();
		});
		$('againBtn').addEventListener('click', () => {
			S.say('again');
			startMatch(lastCfg);
		});
		$('resultMenuBtn').addEventListener('click', toMenu);
		$('startNowBtn').addEventListener('click', () => {
			const sc = scene();
			if (sc && sc.state === 'ready') sc.forceStart();
		});
		// leaving the app mid-game pauses it
		document.addEventListener('visibilitychange', () => {
			if (document.hidden && document.body.classList.contains('playing')) pause();
		});

		let resizeT = 0;
		addEventListener('resize', () => {
			clearTimeout(resizeT);
			resizeT = setTimeout(() => {
				const b = document.body.classList;
				if ((b.contains('at-start') || b.contains('at-setup')) && scene() && refit()) scene().scene.restart(MM.attractConfig());
			}, 250);
		});

		MM.events.on('counting', () => document.body.classList.remove('ready'));
		MM.events.on('playing', () => phase('playing'));
		MM.events.on('over', (list) => setTimeout(() => showResults(list), 600));
	}

	/* ---------- start ---------- */
	function boot() {
		applyLang();
		applyToggles();
		picker = PP.picker($('players'), {lang: S.state.lang, tap: (on) => (on ? S.sfx.ready() : S.sfx.tap())});
		// the shared picker says "take turns"; here everyone plays at once (it re-renders on every tap, so watch it)
		const fixSub = () => {
			const sub = $('players').querySelector('.pp-sub');
			const n = PP.active().length;
			const text = n > 1 ? ui('together').replace('{n}', S.state.lang === 'ar' ? n.toLocaleString('ar-EG') : n) : ui('solo');
			if (sub && sub.textContent !== text) sub.textContent = text;
		};
		new MutationObserver(fixSub).observe($('players'), {childList: true, subtree: true, characterData: true});
		fixSub();
		$('troop').innerHTML = PP.PEOPLE.map((p) => `<img src="${MM.Art.face(p.id, p.color)}" alt="">`).join('');
		wire();
		MM.game = new Phaser.Game({
			// WebGL online; a page opened as a file can't send images to WebGL, so it draws with canvas
			type: HTTP ? Phaser.AUTO : Phaser.CANVAS,
			parent: 'stage',
			width: Math.round(MM.Layout.W * MM.Z),
			height: Math.round(MM.Layout.H * MM.Z),
			backgroundColor: '#2e7d35',
			banner: false,
			scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
			// physics steps with every drawn frame (not a fixed 60 a second), so running is just as smooth on a 120 Hz iPad
			physics: {default: 'arcade', arcade: {gravity: {x: 0, y: 0}, fixedStep: false}},
			audio: {noAudio: true},
			input: {activePointers: 6},
			render: {antialias: true, powerPreference: 'high-performance'},
			scene: [MM.GameScene]
		});
	}

	// wait (briefly) for the fonts, so the first texts are drawn in the right face
	const fonts = document.fonts
		? Promise.race([Promise.all([document.fonts.load('800 40px "Baloo Bhaijaan 2"'), document.fonts.load('700 40px Fredoka')]), new Promise((r) => setTimeout(r, 1800))])
		: Promise.resolve();
	fonts.then(boot, boot);
})();
