/* Water Blaster Arena: the page (menus + ScoreManager). Starts Phaser and runs the screens:
     start → who plays (+ game mode, arena) → pick your splasher and blaster → ready → play → round winner → next round …
   Pause, language, sound, music and volume. The arena scene is always running: behind the menus the splashers
   play by themselves; Play restarts the same scene with the chosen players. Round wins are kept per player
   until you go back to the menu. */
(function () {
	'use strict';
	const WB = window.WB;
	const W = window.WB_WORDS;
	const S = WB.Sound;
	const PP = window.PartyPlayers;
	const $ = (id) => document.getElementById(id);
	const HTTP = location.protocol.startsWith('http');
	WB.events = new Phaser.Events.EventEmitter();
	WB.reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

	const dpr = window.devicePixelRatio || 1;
	const zoom = () => Math.max(1, Math.min(2, Math.round(Math.min((innerWidth * dpr) / WB.Layout.W, (innerHeight * dpr) / WB.Layout.H) * 10) / 10));
	WB.Z = zoom();

	function refit() {
		if (!WB.game || !WB.Layout.refit()) return false;
		WB.Z = zoom();
		WB.game.scale.resize(Math.round(WB.Layout.W * WB.Z), Math.round(WB.Layout.H * WB.Z));

		return true;
	}

	const BOTS = [
		{id: 'bot', color: '#22c55e', name: {ar: 'بَطْبُوطَة', en: 'Ducky'}},
		{id: 'bot2', color: '#14b8a6', name: {ar: 'بُقْبُق', en: 'Puddles'}}
	];
	const WEAPONS = ['standard', 'rapid', 'power'];
	const KEY = 'wb-settings-v1';
	const saved = (() => {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || {};
		} catch (err) {
			return {};
		}
	})();
	const settings = {
		mode: saved.mode === 'teams' ? 'teams' : 'dry',
		theme: saved.theme === 'beach' ? 'beach' : 'pool',
		picks: saved.picks && typeof saved.picks === 'object' ? saved.picks : {}
	};
	const persist = () => {
		try {
			localStorage.setItem(KEY, JSON.stringify(settings));
		} catch (err) {
			/* private mode */
		}
	};
	const defaultChar = (p) => WB.CHARS[Math.max(0, PP.PEOPLE.findIndex((q) => q.id === p.id)) % 4];
	const pickOf = (p) => {
		const v = settings.picks[p.id] || {};

		return {char: WB.CHARS.includes(v.char) ? v.char : defaultChar(p), weapon: WEAPONS.includes(v.weapon) ? v.weapon : 'standard'};
	};

	// the family stickers, loaded as plain images (works from a website and from a double-clicked file)
	WB.faces = {};
	const loadFaces = () => PP.PEOPLE.forEach((p) => {
		const img = new Image();
		img.src = PP.img(p);
		WB.faces[p.id] = img;
	});
	loadFaces();
	window.addEventListener('pp-hero', loadFaces); // someone changed hero in "Who's playing?"

	WB.attractConfig = () => ({
		attract: true,
		theme: settings.theme,
		fighters: PP.PEOPLE.slice(0, 4).map((p, i) => ({player: p, slot: i, bot: true, char: WB.CHARS[i % 4], weapon: WEAPONS[i % 3]}))
	});

	/* ---------- words ---------- */
	const ui = (key) => W.UI[S.state.lang][key] || W.UI.en[key] || '';
	WB.WORD = ui;
	const num = (n) => (S.state.lang === 'ar' ? Number(n).toLocaleString('ar-EG') : String(n));

	function applyLang() {
		const lang = S.state.lang;
		document.documentElement.lang = lang;
		document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
		document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = ui(el.dataset.t)));
		document.querySelectorAll('[data-label]').forEach((el) => el.setAttribute('aria-label', ui(el.dataset.label)));
		document.title = `${W.UI.ar.title} · ${W.UI.en.title}`;
		if (picker) picker.setLang(lang);
		if (document.body.classList.contains('at-pick')) buildPick();
	}

	function applyToggles() {
		$('soundBtn').classList.toggle('off', !S.state.sound);
		$('musicBtn').classList.toggle('off', !S.state.music);
		$('voiceBtn').classList.toggle('off', !S.state.voice);
		document.querySelectorAll('#modeSeg .seg-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === settings.mode)));
		document.querySelectorAll('#arenaSeg .seg-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === settings.theme)));
		$('volume').value = String(Math.round(S.state.volume * 100));
		$('teamsHint').classList.toggle('hidden', settings.mode !== 'teams');
	}

	/* ---------- screens ---------- */
	function phase(name) {
		document.body.className = name;
		$('start').classList.toggle('active', name === 'at-start');
		$('setup').classList.toggle('active', name === 'at-setup');
		$('pick').classList.toggle('active', name === 'at-pick');
	}

	const scene = () => WB.game && WB.game.scene.getScene('game');
	const match = {cfg: null, round: 1, wins: {}};
	let picker = null;
	let nextTimer = 0;

	function restartScene(cfg) {
		refit();
		const sc = scene();
		if (WB.game.scene.isPaused('game')) WB.game.scene.resume('game');
		sc.scene.restart(cfg);
	}

	function startRound() {
		clearInterval(nextTimer);
		$('pauseOverlay').classList.add('hidden');
		$('resultOverlay').classList.add('hidden');
		phase('ready');
		S.preload();
		restartScene({...match.cfg, round: match.round, wins: {...match.wins}});
	}

	function buildConfig() {
		const humans = PP.active(4);
		const fighters = humans.map((p, i) => ({player: p, slot: i, bot: false, ...pickOf(p)}));
		const bot = (slot, i) => ({player: BOTS[i], slot, bot: true, char: 'duck', weapon: WEAPONS[(slot + i) % 3]});
		if (settings.mode === 'teams') {
			let b = 0;
			for (let slot = fighters.length; slot < 4; slot++) fighters.push(bot(slot, b++ % 2));
		} else if (fighters.length === 1) {
			fighters.push(bot(1, 0));
		}

		return {attract: false, teams: settings.mode === 'teams', theme: settings.theme, fighters};
	}

	function toMenu() {
		clearInterval(nextTimer);
		$('pauseOverlay').classList.add('hidden');
		$('resultOverlay').classList.add('hidden');
		S.music(true, {menu: true});
		S.stopVoice();
		S.stopSprays();
		match.wins = {};
		match.round = 1;
		restartScene(WB.attractConfig());
		phase('at-setup');
	}

	function pause() {
		const b = document.body.classList;
		if (!b.contains('playing') && !b.contains('ready')) return;
		const sc = scene();
		if (sc.input2) sc.input2.releaseAll();
		WB.game.scene.pause('game');
		S.stopSprays();
		S.music(false);
		b.add('paused');
		$('pauseOverlay').classList.remove('hidden');
		S.say('paused');
	}

	function resume() {
		$('pauseOverlay').classList.add('hidden');
		document.body.classList.remove('paused');
		WB.game.scene.resume('game');
		const sc = scene();
		if (sc.state === 'play') S.music(true, {fast: !!sc.splashTime});
		else if (sc.state === 'ready') S.music(true, {menu: true});
	}

	/* ---------- pick your splasher and blaster ---------- */
	function buildPick() {
		const lang = S.state.lang;
		const humans = PP.active(4);
		const list = $('pickList');
		list.innerHTML = '';
		humans.forEach((p) => {
			const cur = pickOf(p);
			const row = document.createElement('div');
			row.className = 'pick-row';
			row.style.setProperty('--c', p.color);
			const who = document.createElement('div');
			who.className = 'pick-who';
			who.innerHTML = `<img src="${PP.img(p)}" alt=""><b></b>`;
			who.querySelector('b').textContent = PP.nameOf(p, lang);
			const chars = document.createElement('div');
			chars.className = 'pick-chars';
			chars.setAttribute('role', 'radiogroup');
			WB.CHARS.forEach((ch) => {
				const b = document.createElement('button');
				b.type = 'button';
				b.className = 'char-btn';
				b.setAttribute('role', 'radio');
				b.setAttribute('aria-checked', String(cur.char === ch));
				b.setAttribute('aria-label', ch);
				b.innerHTML = `<img src="${WB.Art.portrait(ch, p.color)}" alt="">`;
				b.addEventListener('click', () => {
					settings.picks[p.id] = {...pickOf(p), char: ch};
					persist();
					S.sfx.tap();
					buildPick();
				});
				chars.appendChild(b);
			});
			const guns = document.createElement('div');
			guns.className = 'pick-guns';
			guns.setAttribute('role', 'radiogroup');
			WEAPONS.forEach((w) => {
				const b = document.createElement('button');
				b.type = 'button';
				b.className = `gun-btn gun-${w}`;
				b.setAttribute('role', 'radio');
				b.setAttribute('aria-checked', String(cur.weapon === w));
				b.innerHTML = `<img src="${WB.Art.blasterIcon(w, p.color)}" alt=""><span class="meter" aria-hidden="true"><i></i><i></i><i></i></span><span class="lbl"></span>`;
				b.querySelector('.lbl').textContent = ui(w);
				b.addEventListener('click', () => {
					settings.picks[p.id] = {...pickOf(p), weapon: w};
					persist();
					S.sfx.tap();
					buildPick();
				});
				guns.appendChild(b);
			});
			row.append(who, chars, guns);
			list.appendChild(row);
		});
	}

	/* ---------- round results ---------- */
	function showResults({teams, team, list}) {
		const lang = S.state.lang;
		const winners = list.filter((r) => r.win);
		list.forEach((r) => (match.wins[r.player.id] = r.wins));
		let title;
		let sayKey;
		if (!winners.length) {
			title = W.SAY[lang].tie;
			sayKey = 'tie';
		} else if (teams) {
			title = `${W.SAY[lang].teamWin} (${ui(team === 0 ? 'left' : 'right')})`;
			sayKey = 'teamWin';
		} else {
			title = W.SAY[lang].winner;
			sayKey = 'winner';
		}
		$('resultTitle').textContent = title;
		const order = list.slice().sort((a, b) => (b.win - a.win) || (b.wins - a.wins));
		$('podium').innerHTML = order.map((r, i) => {
			const p = r.player;
			const pic = WB.Art.portrait(r.char, p.color, r.win ? 'cheer' : 'soaked');
			const sticker = r.bot ? '' : `<img class="st" src="${PP.img(p)}" alt="">`;
			const stars = Array.from({length: Math.min(r.wins, 5)}, () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>').join('');
			const more = r.wins > 5 ? `<span class="more">+${num(r.wins - 5)}</span>` : '';

			return `<li class="res${r.win ? ' win' : ''}" style="--c:${p.color};animation-delay:${200 + i * 140}ms">
				<span class="who"><img class="mk" src="${pic}" alt="">${sticker}</span>
				<b></b><span class="stars" aria-label="${num(r.wins)}">${stars}${more}</span></li>`;
		}).join('');
		$('podium').querySelectorAll('.res b').forEach((el, i) => (el.textContent = PP.nameOf(order[i].player, lang)));
		$('resultOverlay').classList.remove('hidden');
		phase('over');
		S.sfx.fanfare();
		S.say(sayKey);
		// after the fanfare, the soft tune comes back while the next round gets ready
		setTimeout(() => {
			if (document.body.classList.contains('over')) S.music(true, {menu: true});
		}, 3400);
		if (window.confetti && !WB.reducedMotion) {
			const shot = (x) => window.confetti({particleCount: 80, angle: x < 0.5 ? 60 : 120, spread: 70, origin: {x, y: 0.7}, zIndex: 70, colors: ['#3ec5ff', '#ffffff', '#ff5d73', '#9b6bff', '#1fa8ff', '#ff9417', '#ffd23f'], shapes: ['circle']});
			shot(0);
			shot(1);
			setTimeout(() => shot(0.5), 500);
		}
		// the next round starts by itself
		let left = 7;
		const tick = () => {
			$('nextIn').textContent = ui('nextIn').replace('{n}', num(left));
			$('nextRing').style.setProperty('--f', String(left / 7));
		};
		tick();
		clearInterval(nextTimer);
		nextTimer = setInterval(() => {
			if (document.body.classList.contains('paused')) return;
			left--;
			tick();
			if (left <= 0) nextRound();
		}, 1000);
	}

	function nextRound() {
		clearInterval(nextTimer);
		match.round++;
		startRound();
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
		$('voiceBtn').addEventListener('click', () => {
			S.unlock();
			S.setVoice(!S.state.voice);
			applyToggles();
			S.sfx.tap();
		});
		$('musicBtn').addEventListener('click', () => {
			S.unlock();
			S.setMusic(!S.state.music);
			if (S.state.music && !document.body.classList.contains('playing')) S.music(true, {menu: true});
			applyToggles();
			S.sfx.tap();
		});
		$('volume').addEventListener('input', (e) => {
			S.unlock();
			S.setVolume(Number(e.target.value) / 100);
		});
		$('volume').addEventListener('change', () => S.sfx.tap());
		$('playBtn').addEventListener('click', () => {
			S.unlock();
			S.music(true, {menu: true});
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
		document.querySelectorAll('#arenaSeg .seg-btn').forEach((b) =>
			b.addEventListener('click', () => {
				if (settings.theme === b.dataset.theme) return;
				settings.theme = b.dataset.theme;
				persist();
				applyToggles();
				S.sfx.tap();
				restartScene(WB.attractConfig()); // the arena behind the menu changes too
			}));
		$('nextBtn').addEventListener('click', () => {
			S.unlock();
			S.sfx.ready();
			buildPick();
			phase('at-pick');
			S.say('pick');
		});
		$('backBtn').addEventListener('click', () => {
			S.sfx.tap();
			phase('at-setup');
		});
		$('goBtn').addEventListener('click', () => {
			S.unlock();
			match.cfg = buildConfig();
			match.round = 1;
			match.wins = {};
			startRound();
			if (match.cfg.fighters.some((f) => f.bot)) setTimeout(() => S.say('ducky'), 2600);
		});
		$('pauseBtn').addEventListener('click', pause);
		$('resumeBtn').addEventListener('click', resume);
		$('restartBtn').addEventListener('click', () => {
			document.body.classList.remove('paused');
			match.round = 1;
			match.wins = {};
			startRound();
		});
		$('menuBtn').addEventListener('click', () => {
			document.body.classList.remove('paused');
			toMenu();
		});
		$('againBtn').addEventListener('click', () => {
			S.sfx.tap();
			nextRound();
		});
		$('resultMenuBtn').addEventListener('click', toMenu);
		$('startNowBtn').addEventListener('click', () => {
			const sc = scene();
			if (sc && sc.state === 'ready') sc.forceStart();
		});
		document.addEventListener('visibilitychange', () => {
			if (document.hidden && document.body.classList.contains('playing')) pause();
		});
		let resizeT = 0;
		addEventListener('resize', () => {
			clearTimeout(resizeT);
			resizeT = setTimeout(() => {
				const b = document.body.classList;
				if ((b.contains('at-start') || b.contains('at-setup') || b.contains('at-pick')) && scene() && WB.Layout.refit()) {
					WB.Z = zoom();
					WB.game.scale.resize(Math.round(WB.Layout.W * WB.Z), Math.round(WB.Layout.H * WB.Z));
					scene().scene.restart(WB.attractConfig());
				}
			}, 250);
		});

		WB.events.on('counting', () => document.body.classList.remove('ready'));
		WB.events.on('playing', () => phase('playing'));
		WB.events.on('over', (res) => setTimeout(() => showResults(res), 500));
	}

	/* ---------- start ---------- */
	function boot() {
		picker = PP.picker($('players'), {lang: S.state.lang, max: 4, tap: (on) => (on ? S.sfx.ready() : S.sfx.tap())});
		// the shared picker says "take turns"; here everyone plays at once (it re-renders on every tap, so watch it)
		const fixSub = () => {
			const sub = $('players').querySelector('.pp-sub');
			const n = PP.active(4).length;
			const text = n > 1 ? ui('together').replace('{n}', num(n)) : ui('solo');
			if (sub && sub.textContent !== text) sub.textContent = text;
		};
		new MutationObserver(fixSub).observe($('players'), {childList: true, subtree: true, characterData: true});
		applyLang();
		applyToggles();
		fixSub();
		$('troop').innerHTML = PP.PEOPLE.slice(0, 4).map((p, i) => `<img src="${WB.Art.portrait(WB.CHARS[i % 4], p.color)}" alt="">`).join('');
		wire();
		WB.game = new Phaser.Game({
			// WebGL online; a page opened as a file can't send images to WebGL, so it draws with canvas
			type: HTTP ? Phaser.AUTO : Phaser.CANVAS,
			parent: 'stage',
			width: Math.round(WB.Layout.W * WB.Z),
			height: Math.round(WB.Layout.H * WB.Z),
			backgroundColor: '#bfe6f5',
			banner: false,
			scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
			physics: {default: 'arcade', arcade: {gravity: {x: 0, y: 0}, fixedStep: false}},
			audio: {noAudio: true},
			input: {activePointers: 8},
			render: {antialias: true, powerPreference: 'high-performance'},
			scene: [WB.GameScene]
		});
	}

	const fonts = document.fonts
		? Promise.race([Promise.all([document.fonts.load('800 40px "Baloo Bhaijaan 2"'), document.fonts.load('700 40px Fredoka')]), new Promise((r) => setTimeout(r, 1800))])
		: Promise.resolve();
	fonts.then(boot, boot);
})();
