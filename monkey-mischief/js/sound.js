/* Monkey Mischief: sound. Everything is made with Web Audio (no sound files), except the recorded voice.
     MM.Sound.unlock()             call from a tap: browsers only allow sound after one
     MM.Sound.sfx.<name>(...)      short effects (pickup, slip, bonk, ...)
     MM.Sound.music(on, {fast})    the jungle groove; fast = the last 20 seconds
     MM.Sound.say(key)             a recorded sentence from words.js (SAY), the device voice as a last resort
   Sound and music on/off and the language are shared with the rest of the app (localStorage). */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});

	const state = {
		sound: localStorage.getItem('paint-sound') !== 'off',
		music: localStorage.getItem('mm-music') !== 'off',
		lang: localStorage.getItem('paint-lang-v2') || 'ar'
	};
	const A = {ctx: null, sfx: null, music: null, voice: null, noise: null, timer: 0, step: 0, next: 0, fast: false, playing: false};

	function ctx() {
		if (!A.ctx) {
			const Ctx = window.AudioContext || window.webkitAudioContext;
			if (!Ctx) return null;
			A.ctx = new Ctx();
			const comp = A.ctx.createDynamicsCompressor(); // 4 kids, lots of sounds at once: keep it from clipping
			comp.threshold.value = -14;
			comp.ratio.value = 6;
			comp.connect(A.ctx.destination);
			A.sfx = A.ctx.createGain();
			A.sfx.gain.value = 0.85;
			A.sfx.connect(comp);
			A.music = A.ctx.createGain();
			A.music.gain.value = 0;
			A.music.connect(comp);
			A.voice = A.ctx.createGain();
			A.voice.gain.value = 1.1;
			A.voice.connect(A.ctx.destination);
			// one second of white noise, reused by every noisy effect (no new buffers while playing)
			A.noise = A.ctx.createBuffer(1, A.ctx.sampleRate, A.ctx.sampleRate);
			const d = A.noise.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		}
		if (A.ctx.state === 'suspended') A.ctx.resume();

		return A.ctx;
	}

	const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

	function tone({freq, at = 0, dur = 0.2, type = 'triangle', vol = 0.18, slide = 0, out = 'sfx', vib = 0}) {
		const ac = A.ctx;
		if (!ac || (out === 'sfx' && !state.sound)) return;
		const start = ac.currentTime + at;
		const osc = ac.createOscillator();
		const gain = ac.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, start);
		if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + dur);
		if (vib) {
			const lfo = ac.createOscillator();
			const depth = ac.createGain();
			lfo.frequency.value = 7;
			depth.gain.value = vib;
			lfo.connect(depth).connect(osc.frequency);
			lfo.start(start);
			lfo.stop(start + dur + 0.05);
		}
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		osc.connect(gain).connect(out === 'sfx' ? A.sfx : A.music);
		osc.start(start);
		osc.stop(start + dur + 0.05);
	}

	function noise({at = 0, dur = 0.25, vol = 0.15, from = 600, to = 2400, type = 'bandpass', q = 1.4, out = 'sfx'}) {
		const ac = A.ctx;
		if (!ac || (out === 'sfx' && !state.sound)) return;
		const start = ac.currentTime + at;
		const src = ac.createBufferSource();
		src.buffer = A.noise;
		const filter = ac.createBiquadFilter();
		filter.type = type;
		filter.Q.value = q;
		filter.frequency.setValueAtTime(from, start);
		filter.frequency.exponentialRampToValueAtTime(to, start + dur);
		const gain = ac.createGain();
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.02, dur * 0.3));
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		src.connect(filter).connect(gain).connect(out === 'sfx' ? A.sfx : A.music);
		src.start(start, Math.random() * 0.5);
		src.stop(start + dur + 0.05);
	}

	// a little "ooh-ooh" monkey call: vowel-ish sine glides with wobble; pitch varies per monkey
	function monkeyCall(pitch = 1, n = 2) {
		for (let i = 0; i < n; i++) {
			const at = i * 0.13;
			tone({freq: 520 * pitch, slide: 880 * pitch, at, dur: 0.11, type: 'sine', vol: 0.16, vib: 30});
			tone({freq: 1040 * pitch, slide: 1500 * pitch, at, dur: 0.09, type: 'triangle', vol: 0.04});
		}
		tone({freq: 900 * pitch, slide: 420 * pitch, at: n * 0.13, dur: 0.22, type: 'sine', vol: 0.15, vib: 45});
	}

	// rate limit: 4 kids grabbing bananas at the same moment must not become one loud blast
	const last = {};
	function limit(key, ms) {
		const now = performance.now();
		if (last[key] && now - last[key] < ms) return false;
		last[key] = now;

		return true;
	}

	const sfx = {
		tap: () => tone({freq: 660, dur: 0.08, slide: 990, vol: 0.12}),
		pick: (k = 0) => {
			if (!limit('pick', 45)) return;
			tone({freq: midi(76 + k * 2), dur: 0.12, slide: midi(83 + k * 2), type: 'sine', vol: 0.18});
			tone({freq: midi(88 + k * 2), at: 0.05, dur: 0.14, type: 'triangle', vol: 0.06});
		},
		deposit: (k = 0) => {
			if (!limit('dep', 40)) return;
			tone({freq: midi(67 + Math.min(k, 12)), dur: 0.16, type: 'triangle', vol: 0.16});
			tone({freq: midi(79 + Math.min(k, 12)), at: 0.04, dur: 0.18, type: 'sine', vol: 0.1});
		},
		full: () => limit('full', 600) && tone({freq: 300, dur: 0.18, slide: 240, type: 'square', vol: 0.05}),
		peel: () => {
			noise({dur: 0.12, vol: 0.12, from: 2600, to: 900});
			tone({freq: 260, at: 0.03, dur: 0.12, slide: 180, type: 'sine', vol: 0.12});
		},
		slip: () => {
			// slide whistle down + bonk + a giggle
			tone({freq: 1400, dur: 0.5, slide: 220, type: 'sine', vol: 0.18});
			noise({at: 0.05, dur: 0.35, vol: 0.08, from: 3000, to: 600});
			tone({freq: 160, at: 0.5, dur: 0.18, slide: 70, type: 'sine', vol: 0.32});
			tone({freq: 300, at: 0.52, dur: 0.3, slide: 600, type: 'triangle', vol: 0.08, vib: 60});
		},
		bonk: () => {
			tone({freq: 210, dur: 0.14, slide: 70, type: 'sine', vol: 0.38});
			noise({dur: 0.12, vol: 0.22, from: 900, to: 200, type: 'lowpass', q: 0.8});
			tone({freq: 820, at: 0.1, dur: 0.35, slide: 1200, type: 'sine', vol: 0.07, vib: 80});
		},
		thud: () => {
			tone({freq: 140, dur: 0.16, slide: 60, type: 'sine', vol: 0.3});
			noise({dur: 0.14, vol: 0.12, from: 700, to: 150, type: 'lowpass', q: 0.7});
		},
		warn: () => limit('warn', 120) && tone({freq: 1180, dur: 0.07, type: 'square', vol: 0.035}),
		whistle: () => tone({freq: 1800, dur: 0.6, slide: 500, type: 'sine', vol: 0.07}),
		power: () => [72, 76, 79, 84, 88].forEach((n, i) => tone({freq: midi(n), at: i * 0.05, dur: 0.22, type: 'square', vol: 0.05})),
		shieldPop: () => {
			tone({freq: 900, dur: 0.12, slide: 1800, type: 'sine', vol: 0.15});
			noise({at: 0.03, dur: 0.18, vol: 0.12, from: 4000, to: 2000});
		},
		jump: () => tone({freq: 260, dur: 0.32, slide: 900, type: 'sine', vol: 0.2, vib: 20}),
		land: () => tone({freq: 180, dur: 0.1, slide: 90, type: 'sine', vol: 0.18}),
		throwIt: () => noise({dur: 0.22, vol: 0.12, from: 400, to: 2400}),
		splat: () => {
			noise({dur: 0.35, vol: 0.25, from: 1600, to: 200, type: 'lowpass', q: 1});
			tone({freq: 220, dur: 0.25, slide: 90, type: 'sine', vol: 0.2});
		},
		stomp: () => {
			tone({freq: 70, dur: 0.3, slide: 40, type: 'sine', vol: 0.45});
			noise({dur: 0.2, vol: 0.12, from: 300, to: 80, type: 'lowpass', q: 0.7});
		},
		roar: () => {
			noise({dur: 0.9, vol: 0.2, from: 300, to: 160, type: 'lowpass', q: 4});
			tone({freq: 110, dur: 0.9, slide: 80, type: 'sawtooth', vol: 0.06, vib: 9});
		},
		chomp: () => [0, 0.14, 0.28].forEach((at) => noise({at, dur: 0.08, vol: 0.15, from: 1200, to: 500})),
		alarm: () => {
			if (!limit('alarm', 900)) return;
			[0, 0.18, 0.36].forEach((at, i) => tone({freq: i % 2 ? 660 : 880, at, dur: 0.16, type: 'square', vol: 0.06}));
		},
		steal: () => {
			if (!limit('steal', 90)) return;
			tone({freq: 600, dur: 0.1, slide: 1200, type: 'triangle', vol: 0.12});
			tone({freq: 400, at: 0.06, dur: 0.08, slide: 300, type: 'square', vol: 0.04});
		},
		gotBack: () => [79, 84, 88].forEach((n, i) => tone({freq: midi(n), at: i * 0.07, dur: 0.22, vol: 0.14})),
		golden: () => [84, 88, 91, 96, 100].forEach((n, i) => tone({freq: midi(n), at: i * 0.06, dur: 0.5, type: 'sine', vol: 0.11})),
		sting: () => {
			[[60, 0], [64, 0.1], [67, 0.2], [72, 0.3]].forEach(([n, at]) => tone({freq: midi(n), at, dur: 0.25, type: 'square', vol: 0.06}));
			noise({at: 0.3, dur: 0.25, vol: 0.06, from: 6000, to: 9000, type: 'highpass', q: 0.5});
		},
		tick: (hi) => tone({freq: hi ? 1320 : 990, dur: 0.07, type: 'square', vol: 0.06}),
		count: (n) => tone({freq: n ? 660 : 990, dur: n ? 0.18 : 0.5, type: 'triangle', vol: 0.2}),
		ready: () => [79, 86].forEach((n, i) => tone({freq: midi(n), at: i * 0.07, dur: 0.18, type: 'sine', vol: 0.14})),
		rustle: () => limit('rustle', 300) && noise({dur: 0.25, vol: 0.05, from: 3000, to: 5000, q: 0.6}),
		splash: () => limit('splash', 250) && noise({dur: 0.3, vol: 0.09, from: 1800, to: 500, q: 0.9}),
		monkey: (pitch, n) => limit(`monkey${pitch}`, 500) && monkeyCall(pitch, n),
		fanfare: () => {
			duckMusic(3);
			const melody = [[67, 0, 0.14], [72, 0.15, 0.14], [76, 0.3, 0.14], [79, 0.45, 0.3], [76, 0.78, 0.14], [79, 0.93, 0.5], [81, 1.5, 0.14], [79, 1.65, 0.14], [81, 1.8, 0.14], [84, 1.95, 0.9]];
			melody.forEach(([n, at, dur]) => {
				tone({freq: midi(n), at, dur: dur + 0.1, type: 'square', vol: 0.06});
				tone({freq: midi(n), at, dur: dur + 0.15, type: 'triangle', vol: 0.15});
			});
			[[[48, 60, 64, 67], 0.45, 0.6], [[53, 60, 65, 69], 1.5, 0.45], [[48, 60, 64, 67, 72], 1.95, 1.4]].forEach(([notes, at, dur]) =>
				notes.forEach((n) => tone({freq: midi(n), at, dur, type: 'sine', vol: 0.05})));
		}
	};

	/* ---------- jungle groove: marimba melody, bass, bongos and shaker ---------- */
	const SONG = [76, null, 79, 76, 72, null, 74, 76, 79, null, 81, 79, 76, null, 74, null, 72, null, 76, 72, 69, null, 72, 74, 76, null, 74, 72, 74, null, null, null];
	const BASS = [45, 45, 52, 45, 41, 41, 48, 43];
	const BONGO = [1, 0, 0, 1, 0, 1, 0, 0];

	function scheduleMusic() {
		const ac = A.ctx;
		if (!ac) return;
		const step = 60 / (A.fast ? 150 : 124) / 2;
		while (A.next < ac.currentTime + 0.3) {
			const at = A.next - ac.currentTime;
			const s = A.step;
			const note = SONG[s % SONG.length];
			if (note) {
				tone({freq: midi(note), at, dur: 0.22, type: 'sine', vol: 0.45, out: 'music'});
				tone({freq: midi(note + 12), at, dur: 0.07, type: 'triangle', vol: 0.12, out: 'music'});
			}
			if (s % 2 === 0) tone({freq: midi(BASS[(s / 2) % BASS.length]), at, dur: 0.28, type: 'triangle', vol: 0.5, out: 'music'});
			if (BONGO[s % 8]) tone({freq: s % 16 < 8 ? 300 : 220, at, dur: 0.12, slide: 140, type: 'sine', vol: 0.4, out: 'music'});
			noise({at, dur: 0.05, vol: s % 2 ? 0.1 : 0.05, from: 7000, to: 8000, type: 'highpass', q: 0.7, out: 'music'});
			if (A.fast && s % 4 === 2) tone({freq: midi(91), at, dur: 0.05, type: 'square', vol: 0.06, out: 'music'});
			A.step++;
			A.next += step;
		}
	}

	const musicLevel = () => (state.music && state.sound && A.playing ? 0.075 : 0);

	function updateMusic() {
		const ac = A.ctx;
		if (!ac) return;
		const level = musicLevel();
		A.music.gain.cancelScheduledValues(ac.currentTime);
		A.music.gain.setTargetAtTime(level, ac.currentTime, 0.3);
		if (level && !A.timer) {
			A.next = ac.currentTime + 0.1;
			A.timer = setInterval(scheduleMusic, 90);
		} else if (!level && A.timer) {
			clearInterval(A.timer);
			A.timer = 0;
		}
	}

	function duckMusic(seconds) {
		const ac = A.ctx;
		if (!ac || !musicLevel()) return;
		const g = A.music.gain;
		g.cancelScheduledValues(ac.currentTime);
		g.setTargetAtTime(0.015, ac.currentTime, 0.08);
		g.setTargetAtTime(musicLevel(), ac.currentTime + seconds, 0.5);
	}

	/* ---------- voice: recorded clips (audio/<lang>/), the device voice only as a last resort ---------- */
	const CLIPS = () => (state.lang === 'ar' ? window.MM_VOICE_AR : window.MM_VOICE_EN) || {};
	const HTTP = location.protocol.startsWith('http');
	const buffers = new Map();
	const voice = {id: 0, node: null};

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

	function stopVoice() {
		voice.id++;
		try {
			if (voice.node) voice.node.stop ? voice.node.stop() : voice.node.pause();
		} catch (err) {
			/* already finished */
		}
		voice.node = null;
		if ('speechSynthesis' in window) speechSynthesis.cancel();
	}

	function deviceSpeak(text) {
		if (!('speechSynthesis' in window)) return;
		try {
			const all = speechSynthesis.getVoices();
			const v = state.lang === 'ar' ? all.find((x) => /Zariyah/i.test(x.name)) || all.find((x) => /^ar/i.test(x.lang)) : all.find((x) => /^en/i.test(x.lang));
			const u = new SpeechSynthesisUtterance(text);
			u.lang = v ? v.lang : state.lang === 'ar' ? 'ar-SA' : 'en-US';
			if (v) u.voice = v;
			u.rate = 0.9;
			speechSynthesis.speak(u);
		} catch (err) {
			/* no voice on this device */
		}
	}

	function say(key) {
		if (!state.sound) return;
		const text = window.MM_WORDS.SAY[state.lang][key];
		if (!text) return;
		stopVoice();
		const id = voice.id;
		const clip = CLIPS()[text];
		if (!clip) {
			deviceSpeak(text);

			return;
		}
		const url = `audio/${state.lang}/${clip}.mp3`;
		const playElement = () => {
			if (id !== voice.id) return;
			const el = new Audio(url);
			voice.node = el;
			el.play().catch(() => {});
		};
		if (!HTTP || !ctx()) {
			playElement();

			return;
		}
		duckMusic(2.2);
		clipBuffer(url)
			.then((buffer) => {
				if (id !== voice.id) return;
				const src = A.ctx.createBufferSource();
				src.buffer = buffer;
				src.connect(A.voice);
				src.start();
				voice.node = src;
			})
			.catch(playElement);
	}

	// fetch the clips the match will need, so "Coconut rain!" plays the moment it happens
	function preload() {
		if (!HTTP || !ctx()) return;
		const map = CLIPS();
		Object.values(window.MM_WORDS.SAY[state.lang]).forEach((text) => {
			if (map[text]) clipBuffer(`audio/${state.lang}/${map[text]}.mp3`).catch(() => {});
		});
	}

	MM.Sound = {
		state,
		sfx,
		say,
		stopVoice,
		preload,
		unlock: () => ctx(),
		music(on, {fast = false} = {}) {
			A.playing = on;
			A.fast = fast;
			updateMusic();
		},
		setSound(on) {
			state.sound = on;
			localStorage.setItem('paint-sound', on ? 'on' : 'off');
			if (!on) stopVoice();
			updateMusic();
		},
		setMusic(on) {
			state.music = on;
			localStorage.setItem('mm-music', on ? 'on' : 'off');
			updateMusic();
		},
		setLang(lang) {
			state.lang = lang;
			localStorage.setItem('paint-lang-v2', lang);
			stopVoice();
			preload();
		}
	};
})();
