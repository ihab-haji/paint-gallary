/* Balloon Panic: the page. Starts Phaser and runs the screens around the game:
   title (the buddies play by themselves behind it) -> who plays -> 3, 2, 1, GO -> the match -> the awards.
   Also pause, language, sound and music. */
(function () {
	'use strict';
	const BP = window.BP;
	const W = window.BP_WORDS;
	const S = BP.Sound;
	const PEOPLE = BP.PEOPLE;
	const CAST = BP.Art.CAST;
	const $ = (id) => document.getElementById(id);
	BP.events = new Phaser.Events.EventEmitter();
	BP.reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

	// pixels per game unit: sharp on a Retina iPad, never more than 2x (keeps the GPU happy)
	const dpr = window.devicePixelRatio || 1;
	const zoom = () => Math.max(1, Math.min(2, Math.round(Math.min((innerWidth * dpr) / BP.Layout.W, (innerHeight * dpr) / BP.Layout.H) * 10) / 10));
	BP.Z = zoom();

	function refit() {
		if (!BP.game || !BP.Layout.refit()) return false;
		BP.Z = zoom();
		BP.game.scale.resize(Math.round(BP.Layout.W * BP.Z), Math.round(BP.Layout.H * BP.Z));

		return true;
	}

	/* ---------- what the family chose last time ---------- */
	const KEY = 'bp-settings-v1';
	const saved = (() => {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || {};
		} catch (err) {
			return {};
		}
	})();
	const okPicks = Array.isArray(saved.picks) && saved.picks.length === 4 && saved.picks.every((p) => p === null || CAST.includes(p));
	const settings = {
		picks: okPicks ? saved.picks : ['bunny', 'fox', null, null], // one buddy per seat (colour)
		object: saved.object === 'bomb' ? 'bomb' : 'balloon',
		speed: saved.speed === 'fast' ? 'fast' : 'easy'
	};
	const persist = () => {
		try {
			localStorage.setItem(KEY, JSON.stringify(settings));
		} catch (err) {
			/* private mode */
		}
	};

	const shuffled = (list) => list.slice().sort(() => Math.random() - 0.5);
	BP.attractConfig = () => ({
		mode: 'attract', object: Math.random() < 0.75 ? 'balloon' : 'bomb', speed: 'fast',
		players: shuffled(CAST).slice(0, 4).map((sp, i) => ({sp, person: PEOPLE[i], bot: true}))
	});
	const lobbyConfig = () => ({mode: 'lobby', picks: settings.picks, object: settings.object, speed: settings.speed});

	function matchConfig() {
		const players = settings.picks.map((sp, i) => (sp ? {sp, person: PEOPLE[i], bot: false} : null)).filter(Boolean);
		if (players.length === 1) {
			// playing alone: a computer buddy takes the next free seat
			const seat = PEOPLE.find((p) => p !== players[0].person);
			players.push({sp: shuffled(CAST.filter((sp) => sp !== players[0].sp))[0], person: seat, bot: true});
		}

		return {mode: 'match', players, object: settings.object, speed: settings.speed};
	}

	/* ---------- words ---------- */
	const lang = () => S.state.lang;
	const ui = (key) => W.UI[lang()][key] || W.UI.en[key] || '';
	const num = (n) => (lang() === 'ar' ? Number(n).toLocaleString('ar-EG') : String(n));

	function applyLang() {
		document.documentElement.lang = lang();
		document.documentElement.dir = lang() === 'ar' ? 'rtl' : 'ltr';
		document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = ui(el.dataset.t)));
		document.title = `${W.UI.ar.title} · ${W.UI.en.title}`;
		applyPicks();
	}

	function applyToggles() {
		$('soundBtn').classList.toggle('off', !S.state.sound);
		$('musicBtn').classList.toggle('off', !S.state.music);
		$('voiceBtn').classList.toggle('off', !S.state.voice);
		document.querySelectorAll('#objSeg .seg-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.object === settings.object)));
		document.querySelectorAll('#speedSeg .seg-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.speed === settings.speed)));
	}

	function applyPicks() {
		const n = settings.picks.filter(Boolean).length;
		$('pickSub').textContent = n > 1 ? ui('pickMany').replace('{n}', num(n)) : n === 1 ? ui('pickOne') : ui('pickNone');
		$('goBtn').disabled = n === 0;
	}

	/* ---------- screens ---------- */
	function phase(name) {
		document.body.className = name;
		$('start').classList.toggle('active', name === 'at-start');
		$('lobby').classList.toggle('active', name === 'at-lobby');
	}

	const scene = () => BP.game && BP.game.scene.getScene('game');
	let lastCfg = null;

	function restart(cfg) {
		$('pauseOverlay').classList.add('hidden');
		$('resultOverlay').classList.add('hidden');
		$('banner').classList.remove('show');
		refit();
		if (BP.game.scene.isPaused('game')) BP.game.scene.resume('game');
		S.quiet = cfg.mode === 'attract';
		scene().scene.restart(cfg);
	}

	function toLobby() {
		S.stopVoice();
		restart(lobbyConfig());
		phase('at-lobby');
		S.music(true, {soft: true});
	}

	function startMatch(cfg) {
		lastCfg = cfg;
		S.preload();
		phase('ready');
		pips(0, BP.CONFIG[cfg.speed].rounds);
		restart(cfg);
	}

	function pause() {
		const b = document.body.classList;
		if (!b.contains('playing') && !b.contains('ready')) return;
		const sc = scene();
		if (sc.input2) sc.input2.releaseAll();
		BP.game.scene.pause('game');
		S.music(false);
		b.add('paused');
		$('pauseOverlay').classList.remove('hidden');
		S.say('paused');
	}

	function resume() {
		$('pauseOverlay').classList.add('hidden');
		document.body.classList.remove('paused');
		BP.game.scene.resume('game');
		const sc = scene();
		if (sc.round && (sc.round.state === 'play' || sc.round.state === 'boom')) S.music(true);
	}

	/* ---------- the little things over the game: rounds, countdown, twist banner ---------- */
	function pips(done, total) {
		$('pips').innerHTML = Array.from({length: total}, (_, i) => `<i class="${i < done ? 'done' : i === done ? 'now' : ''}"></i>`).join('');
	}

	const stroke = 'stroke="#24124d" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
	const loon = (x, y, s, fill, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-2 8.5L-3 12L3 12L2 8.5Z" fill="${fill}" ${stroke}/><path d="M0 -10C6 -10 9 -6 9 -1C9 4 5 8 0 9C-5 8 -9 4 -9 -1C-9 -6 -6 -10 0 -10Z" fill="${fill}" ${stroke} ${extra}/><path d="M-4.5 -5.5C-3.5 -7 -2.5 -7.5 -1.5 -7.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
	const svg = (body) => `<svg viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
	const ICONS = {
		double: svg(loon(10.5, 14, 0.95, '#ffc928') + loon(21.5, 16, 0.95, '#ff5fd2')),
		giant: svg(loon(16, 15, 1.35, '#7be04b')),
		tiny: svg(`<path d="M4 9V4H9M23 4H28V9M28 23V28H23M9 28H4V23" fill="none" stroke="#24124d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${loon(16, 16, 0.5, '#2fe0c0')}`),
		fake: svg(`<circle cx="16" cy="16" r="12" fill="#ffd23f" ${stroke}/><path d="M9.5 13.5C10.5 11.5 13 11.5 14 13.5M18.5 13H23.5" fill="none" ${stroke} stroke-width="2"/><path d="M10 19C13 23.5 19 23.5 22 19Z" fill="#fff" ${stroke}/><rect x="14" y="21" width="5" height="6.5" rx="2.5" fill="#ff6f91" ${stroke}/>`),
		speed: svg(`<path d="M18.5 3L7 18H15L12.5 29L25 13H17Z" fill="#ffd23f" ${stroke} stroke-width="2"/>`),
		sticky: svg(`<path d="M4 9C4 5 28 5 28 9V13C28 16 25 16 25 13.5C25 12 23 12 23 14V22C23 25.5 18.5 25.5 18.5 22V15C18.5 13 16 13 16 15V18C16 21 12 21 12 18V14C12 12 9.5 12 9.5 14C9.5 17 4 17 4 13Z" fill="#9be33a" ${stroke} stroke-width="2"/><circle cx="20.7" cy="28" r="1.8" fill="#9be33a" ${stroke}/>`),
		reverse: svg(`<path d="M25 13A9.5 9.5 0 0 0 8 10M7 19A9.5 9.5 0 0 0 24 22" fill="none" stroke="#24124d" stroke-width="5.4" stroke-linecap="round"/><path d="M25 13A9.5 9.5 0 0 0 8 10M7 19A9.5 9.5 0 0 0 24 22" fill="none" stroke="#ffd23f" stroke-width="2.6" stroke-linecap="round"/><path d="M4 5L8.5 11.5L13 6.5Z M28 27L23.5 20.5L19 25.5Z" fill="#ffd23f" ${stroke}/>`),
		clone: svg(loon(11, 15, 0.95, '#ff5fd2') + loon(22, 15, 0.95, '#fff8ff', 'stroke-dasharray="2.6 2.6"')),
		lastsec: svg(`<path d="M6 7L10.5 4M26 7L21.5 4M9.5 26L7 29M22.5 26L25 29" fill="none" ${stroke} stroke-width="2.4"/><circle cx="16" cy="17" r="10.5" fill="#fff8ff" ${stroke} stroke-width="2"/><path d="M16 10.5V17L20.5 20" fill="none" stroke="#ff5d73" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`),
		bounce: svg(`<path d="M3 23L10 9L17 23L24 9" fill="none" stroke="#24124d" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 23L10 9L17 23L24 9" fill="none" stroke="#34e0b0" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="7" r="4" fill="#ffd23f" ${stroke}/>`),
		shield: svg(`<circle cx="16" cy="16" r="12.5" fill="#bdf1ff" ${stroke} stroke-width="2"/><path d="M16 8.5L18.2 13.4L23.5 14L19.6 17.6L20.7 22.8L16 20.2L11.3 22.8L12.4 17.6L8.5 14L13.8 13.4Z" fill="#ffd23f" ${stroke}/>`)
	};
	let bannerT = 0;

	function banner(key) {
		const el = $('banner');
		el.innerHTML = `${ICONS[key] || ''}<span></span>`;
		el.querySelector('span').textContent = W.SAY[lang()][key] || '';
		el.classList.remove('show');
		void el.offsetWidth;
		el.classList.add('show');
		clearTimeout(bannerT);
		bannerT = setTimeout(() => el.classList.remove('show'), 2000);
	}

	function count(text) {
		const el = $('count');
		el.textContent = text;
		el.classList.remove('show');
		void el.offsetWidth;
		el.classList.add('show');
	}

	/* ---------- the awards ---------- */
	const STAT = {
		passes: svg(`<path d="M5 22C9 12 17 9 24 11" fill="none" stroke="#24124d" stroke-width="5.4" stroke-linecap="round"/><path d="M5 22C9 12 17 9 24 11" fill="none" stroke="#34e0b0" stroke-width="2.6" stroke-linecap="round"/><path d="M20.5 4.5L28 12L19 15.5Z" fill="#34e0b0" ${stroke}/>`),
		survived: ICONS.shield,
		pops: svg(`<path d="M16 2.5L19.6 9.6L27 6.5L24.6 14L31 17.5L24 20L26 28L19 24.4L16 30.5L12.6 24.4L5.5 27.5L7.8 20L1.5 16.5L8.5 13.6L6.5 6L13.2 9.4Z" fill="#ffd23f" ${stroke} stroke-width="1.8"/>`)
	};
	const portraits = {};

	function showResults(res) {
		const L = lang();
		const medals = ['1', '2', '3', '4'];
		let place = -1;
		let last = null;
		$('resultTitle').textContent = W.SAY[L][res.tie ? 'tie' : 'winner'];
		$('podium').innerHTML = res.rows.map((r, i) => {
			if (r.pops !== last) place++;
			last = r.pops;
			const key = `${r.sp}-${r.person.id}`;
			portraits[key] = portraits[key] || BP.Art.portrait(r.sp, r.person.color);
			const stat = (name, n) => `<span class="stat" title="${ui(name)}">${STAT[name]}<b>${num(n)}</b></span>`;

			return `<li class="res${r.win ? ' win' : ''}" style="--c:${r.person.color};animation-delay:${200 + i * 160}ms">
				<span class="place">${num(medals[place])}</span>
				<img class="who" src="${portraits[key]}" alt="">
				<span class="name"><b></b><em></em></span>
				<span class="stats">${stat('passes', r.passes)}${stat('survived', r.survived)}${stat('pops', r.pops)}</span></li>`;
		}).join('');
		$('podium').querySelectorAll('.res').forEach((el, i) => {
			el.querySelector('.name b').textContent = ui(`n_${res.rows[i].sp}`);
			el.querySelector('.name em').textContent = ui(`t_${res.rows[i].title}`);
		});
		const f = res.funniest;
		$('funniest').querySelector('b').textContent = ui('funniest');
		$('funniest').querySelector('span').textContent = ui(`m_${f.key}`).replace('{n}', f.sp ? ui(`n_${f.sp}`) : '').replace('{k}', num(f.k || 0));
		$('resultOverlay').classList.remove('hidden');
		phase('over');
		S.sfx.fanfare();
		S.say(res.tie ? 'tie' : 'winner');
		if (window.confetti && !BP.reducedMotion) {
			const shot = (x) => window.confetti({particleCount: 80, angle: x < 0.5 ? 60 : 120, spread: 70, origin: {x, y: 0.7}, zIndex: 70, colors: ['#ffd23f', '#ff5d73', '#9b6bff', '#1fa8ff', '#ff9417', '#34e0b0'], shapes: ['star', 'circle']});
			shot(0);
			shot(1);
			setTimeout(() => shot(0.5), 500);
		}
	}

	/* ---------- picking buddies ---------- */
	function pick(sp) {
		S.unlock();
		const at = settings.picks.indexOf(sp);
		const sc = scene();
		if (at >= 0) {
			settings.picks[at] = null;
			S.sfx.out();
		} else {
			const free = settings.picks.indexOf(null);
			if (free < 0) {
				// all four seats are taken
				S.sfx.nope();
				if (sc.lobbyNo) sc.lobbyNo(sp);

				return;
			}
			settings.picks[free] = sp;
			S.sfx.ready();
		}
		persist();
		applyPicks();
		sc.setPicks(settings.picks, sp, at < 0);
	}

	/* ---------- wiring ---------- */
	function wire() {
		$('homeBtn').addEventListener('click', () => {
			S.sfx.tap();
			location.href = '../index.html';
		});
		$('langBtn').addEventListener('click', () => {
			S.unlock();
			S.setLang(lang() === 'ar' ? 'en' : 'ar');
			applyLang();
			S.sfx.tap();
			// the buddies' name tags are painted in the game: paint them again in the new language
			if (document.body.classList.contains('at-lobby')) restart(lobbyConfig());
		});
		$('soundBtn').addEventListener('click', () => {
			S.unlock();
			S.setSound(!S.state.sound);
			applyToggles();
			S.sfx.tap();
		});
		$('voiceBtn').addEventListener('click', () => {
			S.unlock();
			S.setVoice(!S.state.voice);
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
			toLobby();
			S.say('who');
		});
		document.querySelectorAll('#objSeg .seg-btn').forEach((b) =>
			b.addEventListener('click', () => {
				settings.object = b.dataset.object;
				persist();
				applyToggles();
				S.sfx.tap();
			}));
		document.querySelectorAll('#speedSeg .seg-btn').forEach((b) =>
			b.addEventListener('click', () => {
				settings.speed = b.dataset.speed;
				persist();
				applyToggles();
				S.sfx.tap();
			}));
		$('goBtn').addEventListener('click', () => {
			S.unlock();
			if (!settings.picks.some(Boolean)) return;
			startMatch(matchConfig());
		});
		$('pauseBtn').addEventListener('click', pause);
		$('resumeBtn').addEventListener('click', resume);
		$('restartBtn').addEventListener('click', () => {
			document.body.classList.remove('paused');
			startMatch(lastCfg);
		});
		$('menuBtn').addEventListener('click', () => {
			document.body.classList.remove('paused');
			toLobby();
		});
		$('againBtn').addEventListener('click', () => {
			S.say('again');
			startMatch(lastCfg);
		});
		$('resultMenuBtn').addEventListener('click', toLobby);
		// leaving the app mid-game pauses it
		document.addEventListener('visibilitychange', () => {
			if (document.hidden && document.body.classList.contains('playing')) pause();
		});

		let resizeT = 0;
		addEventListener('resize', () => {
			clearTimeout(resizeT);
			resizeT = setTimeout(() => {
				const b = document.body.classList;
				if (!scene()) return;
				if (b.contains('at-start') && refit()) restart(BP.attractConfig());
				else if (b.contains('at-lobby') && refit()) restart(lobbyConfig());
			}, 250);
		});

		BP.events.on('pick', pick);
		BP.events.on('count', count);
		BP.events.on('playing', () => phase('playing'));
		BP.events.on('round', (i, total) => total !== Infinity && pips(i - 1, total));
		BP.events.on('popped', (i, total) => pips(i, total));
		BP.events.on('banner', banner);
		BP.events.on('over', (res) => showResults(res));
	}

	/* ---------- start ---------- */
	function boot() {
		applyLang();
		applyToggles();
		wire();
		phase('at-start');
		S.quiet = true;
		BP.game = new Phaser.Game({
			type: Phaser.AUTO,
			parent: 'stage',
			width: Math.round(BP.Layout.W * BP.Z),
			height: Math.round(BP.Layout.H * BP.Z),
			backgroundColor: '#2a1470',
			banner: false,
			scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
			audio: {noAudio: true},
			input: {activePointers: 6},
			render: {antialias: true, powerPreference: 'high-performance'},
			scene: [BP.GameScene]
		});
	}

	// wait (briefly) for the fonts, so the first texts are drawn in the right face
	const fonts = document.fonts
		? Promise.race([Promise.all([document.fonts.load('800 40px "Baloo Bhaijaan 2"'), document.fonts.load('700 40px Fredoka')]), new Promise((r) => setTimeout(r, 1800))])
		: Promise.resolve();
	fonts.then(boot, boot);
})();
