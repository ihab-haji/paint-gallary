/* Balloon Panic: AudioManager. Everything is made with Web Audio (no sound files), except the recorded voice.
     BP.Sound.unlock()                 call from a tap: browsers only allow sound after one
     BP.Sound.sfx.<name>(...)          short effects; most pick a slightly different pitch each time
     BP.Sound.music(on, {soft})        the party tune (soft = the menu version, no drums)
     BP.Sound.tension(0..1)            how close the pop is: the tune gets faster and busier
     BP.Sound.say(key)                 a recorded sentence from words.js (SAY), the device voice as a last resort
     BP.Sound.quiet = true             the demo behind the menus plays without effects
   Sound on/off and the language are shared with the rest of the app (localStorage). */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});

	const state = {
		sound: localStorage.getItem('paint-sound') !== 'off',
		music: localStorage.getItem('bp-music') !== 'off', // music is on unless turned off
		voice: localStorage.getItem('bp-voice') === 'on', // the spoken voice is off unless turned on
		lang: localStorage.getItem('paint-lang-v2') || 'ar'
	};
	const A = {ctx: null, sfx: null, music: null, voice: null, noise: null, timer: 0, step: 0, next: 0, playing: false, soft: false, tension: 0};

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
			// one second of white noise, reused by every noisy effect
			A.noise = A.ctx.createBuffer(1, A.ctx.sampleRate, A.ctx.sampleRate);
			const d = A.noise.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		}
		// 'suspended' (Chrome) or 'interrupted' (iPad Safari after a call, the lock screen or another app): wake it up
		if (A.ctx.state !== 'running' && A.ctx.state !== 'closed') A.ctx.resume().catch(() => {});

		return A.ctx;
	}

	/* ---------- keep the sound alive ----------
	   An iPad pauses web sound when the app is left, the screen locks or something interrupts it, and only lets it
	   start again from a tap. Most taps in a game land on the play area, not on a button, so EVERY tap or key press
	   anywhere wakes the sound up (it costs nothing when it is already running). */
	(function keepAlive() {
		let primed = false;
		const wake = () => {
			const ac = ctx();
			if (!ac || primed) return;
			// older iPads only truly unlock after something has played inside a tap: one silent sample
			primed = true;
			try {
				const src = ac.createBufferSource();
				src.buffer = ac.createBuffer(1, 1, ac.sampleRate);
				src.connect(ac.destination);
				src.start(0);
			} catch (err) {
				primed = false;
			}
		};
		['pointerdown', 'touchend', 'mousedown', 'keydown'].forEach((type) => document.addEventListener(type, wake, {capture: true, passive: true}));
		// coming back to the app: try straight away (works on most browsers; the next tap covers the rest)
		const back = () => {
			if (!document.hidden && A.ctx && A.ctx.state !== 'running') A.ctx.resume().catch(() => {});
		};
		document.addEventListener('visibilitychange', back);
		window.addEventListener('pageshow', back);
		window.addEventListener('focus', back);
		// play even when the iPad's ring/silent switch is on silent (Safari 16.4+)
		try {
			if (navigator.audioSession) navigator.audioSession.type = 'playback';
		} catch (err) {
			/* not supported */
		}
	})();

	// is the sound ready to play right now? (sounds made while it is paused would all burst out at once later)
	const live = () => A.ctx && A.ctx.state === 'running';

	const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
	const vary = (amount = 0.07) => 1 + (Math.random() * 2 - 1) * amount; // repeated sounds never sound identical
	const pick = (list) => list[Math.floor(Math.random() * list.length)];

	function tone({freq, at = 0, dur = 0.2, type = 'triangle', vol = 0.18, slide = 0, out = 'sfx', vib = 0, rate = 7, attack = 0.012}) {
		const ac = A.ctx;
		if (!ac || !live()) return;
		if (out === 'sfx' && (!state.sound || BP.Sound.quiet)) return;
		const start = ac.currentTime + at;
		const osc = ac.createOscillator();
		const gain = ac.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, start);
		if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + dur);
		if (vib) {
			const lfo = ac.createOscillator();
			const depth = ac.createGain();
			lfo.frequency.value = rate;
			depth.gain.value = vib;
			lfo.connect(depth).connect(osc.frequency);
			lfo.start(start);
			lfo.stop(start + dur + 0.05);
		}
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(vol, start + attack);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		osc.connect(gain).connect(out === 'sfx' ? A.sfx : A.music);
		osc.start(start);
		osc.stop(start + dur + 0.05);
	}

	function noise({at = 0, dur = 0.25, vol = 0.15, from = 600, to = 2400, type = 'bandpass', q = 1.4, out = 'sfx'}) {
		const ac = A.ctx;
		if (!ac || !live()) return;
		if (out === 'sfx' && (!state.sound || BP.Sound.quiet)) return;
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

	// rate limit: four kids tapping at the same moment must not become one loud blast
	const last = {};
	function limit(key, ms) {
		const now = performance.now();
		if (last[key] && now - last[key] < ms) return false;
		last[key] = now;

		return true;
	}

	const sfx = {
		tap: () => tone({freq: 660, dur: 0.08, slide: 990, vol: 0.12}),
		ready: () => [79, 86].forEach((n, i) => tone({freq: midi(n), at: i * 0.07, dur: 0.18, type: 'sine', vol: 0.14})),
		out: () => [79, 72].forEach((n, i) => tone({freq: midi(n), at: i * 0.08, dur: 0.16, type: 'sine', vol: 0.12})),
		nope: () => limit('nope', 250) && tone({freq: 240, dur: 0.14, slide: 180, type: 'square', vol: 0.05}),
		count: (n) => tone({freq: n ? 660 : 990, dur: n ? 0.18 : 0.5, type: 'triangle', vol: 0.2}),
		// musical passing: every quick pass in a row plays the next note up a happy scale
		note: (k = 1) => {
			const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
			const n = 72 + scale[Math.min(scale.length - 1, Math.max(0, k - 1))];
			tone({freq: midi(n), dur: 0.2, type: 'sine', vol: 0.16});
			tone({freq: midi(n + 12), at: 0.02, dur: 0.12, type: 'triangle', vol: 0.06});
		},
		// "phew!": the soft whoosh of a last-instant escape
		phew: () => {
			noise({dur: 0.5, vol: 0.12, from: 2600, to: 300, type: 'lowpass', q: 1.2});
			tone({freq: 880, dur: 0.45, slide: 330, type: 'sine', vol: 0.09});
		},
		sting: () => {
			[[60, 0], [64, 0.09], [67, 0.18], [72, 0.27]].forEach(([n, at]) => tone({freq: midi(n), at, dur: 0.22, type: 'square', vol: 0.055}));
			noise({at: 0.27, dur: 0.25, vol: 0.05, from: 6000, to: 9000, type: 'highpass', q: 0.5});
		},
		// the thing arrives: a slide whistle coming down
		drop: () => tone({freq: 1500 * vary(), dur: 0.5, slide: 520, type: 'sine', vol: 0.12, vib: 14}),
		whoosh: (power = 0.5) => {
			if (!limit('whoosh', 60)) return;
			const p = vary(0.12);
			noise({dur: 0.2 + (1 - power) * 0.14, vol: 0.13, from: 420 * p, to: 2600 * p * (0.8 + power * 0.5)});
			tone({freq: 300 * p, dur: 0.18, slide: 760 * p, type: 'sine', vol: 0.06});
		},
		catch: (stage = 1) => {
			if (!limit('catch', 50)) return;
			const base = pick([67, 69, 72, 74]) + (stage > 2 ? 5 : 0);
			tone({freq: midi(base), dur: 0.1, type: 'sine', vol: 0.2});
			tone({freq: midi(base + 7), at: 0.05, dur: 0.14, type: 'triangle', vol: 0.12});
			tone({freq: 880 * vary(0.2), at: 0.02, dur: 0.11, slide: 1320, type: 'sine', vol: 0.05, vib: 60, rate: 30}); // a rubbery squeak
			noise({dur: 0.06, vol: 0.1, from: 900, to: 300, type: 'lowpass', q: 0.8});
		},
		// air going in: a short puff that rises
		inflate: (v = 0.5) => {
			if (!limit('inflate', 240)) return;
			const p = (0.85 + v * 0.5) * vary();
			noise({dur: 0.3, vol: 0.06 + v * 0.04, from: 800 * p, to: 2300 * p, q: 2.2});
			tone({freq: 280 * p, dur: 0.28, slide: 520 * p, type: 'sine', vol: 0.05});
		},
		// rubber stretching: a creaky squeal
		creak: (v = 0.5) => {
			const p = (0.9 + v * 0.6) * vary(0.1);
			tone({freq: 420 * p, dur: 0.3, slide: 700 * p, type: 'sawtooth', vol: 0.035, vib: 50, rate: 24});
			tone({freq: 1250 * p, at: 0.05, dur: 0.22, slide: 1700 * p, type: 'sine', vol: 0.04, vib: 80, rate: 32});
		},
		// lub-dub: the balloon's heartbeat
		heart: (v = 0) => {
			tone({freq: 96, dur: 0.12, slide: 52, type: 'sine', vol: 0.22 + v * 0.22});
			tone({freq: 84, at: 0.13, dur: 0.1, slide: 48, type: 'sine', vol: 0.14 + v * 0.16});
		},
		// tick-tock: the bomb's clock
		tick: (hi, v = 0) => {
			tone({freq: (hi ? 1320 : 990) * (1 + v * 0.25), dur: 0.06, type: 'square', vol: 0.045 + v * 0.045});
			noise({dur: 0.03, vol: 0.05, from: 4000, to: 3000, type: 'highpass', q: 0.6});
		},
		fuse: () => limit('fuse', 110) && noise({dur: 0.09, vol: 0.035, from: 5000 * vary(0.2), to: 7000, type: 'highpass', q: 0.7}),
		alarm: () => {
			if (!limit('alarm', 700)) return;
			[0, 0.14, 0.28, 0.42].forEach((at, i) => tone({freq: i % 2 ? 740 : 988, at, dur: 0.12, type: 'square', vol: 0.06}));
		},
		pop: () => {
			const p = vary(0.1);
			noise({dur: 0.09, vol: 0.55, from: 3200, to: 700, type: 'highpass', q: 0.5});
			noise({dur: 0.22, vol: 0.3, from: 1400, to: 200, type: 'lowpass', q: 0.8});
			tone({freq: 230 * p, dur: 0.22, slide: 58, type: 'sine', vol: 0.42});
			tone({freq: 1300 * p, at: 0.03, dur: 0.3, slide: 280, type: 'triangle', vol: 0.09});
			[88, 93, 96, 100].forEach((n, i) => tone({freq: midi(n), at: 0.22 + i * 0.06, dur: 0.3, type: 'sine', vol: 0.06}));
		},
		// the silly bomb: a soft thump, a slide whistle and a boing (a toy, not a bang)
		boom: () => {
			tone({freq: 130, dur: 0.5, slide: 36, type: 'sine', vol: 0.5});
			noise({dur: 0.5, vol: 0.3, from: 900, to: 90, type: 'lowpass', q: 0.8});
			noise({dur: 0.1, vol: 0.3, from: 2600, to: 900, type: 'highpass', q: 0.5});
			tone({freq: 1500, at: 0.16, dur: 0.5, slide: 300, type: 'sine', vol: 0.1, vib: 20});
			tone({freq: 180, at: 0.62, dur: 0.3, slide: 520, type: 'sine', vol: 0.16, vib: 40, rate: 16});
		},
		boing: () => limit('boing', 80) && tone({freq: 170 * vary(0.15), dur: 0.3, slide: 540, type: 'sine', vol: 0.2, vib: 40, rate: 18}),
		honk: () => {
			const p = vary(0.08);
			tone({freq: 330 * p, dur: 0.17, type: 'square', vol: 0.06, vib: 8});
			tone({freq: 277 * p, dur: 0.17, type: 'square', vol: 0.05, vib: 8});
		},
		// a party horn: "pffffrrrt"
		horn: () => {
			tone({freq: 380, dur: 0.55, slide: 620, type: 'sawtooth', vol: 0.06, vib: 30, rate: 22});
			noise({dur: 0.5, vol: 0.05, from: 1500, to: 3200, q: 3});
			tone({freq: 620, at: 0.55, dur: 0.25, slide: 300, type: 'sawtooth', vol: 0.05, vib: 30, rate: 22});
		},
		fakeout: () => {
			noise({dur: 0.1, vol: 0.4, from: 2800, to: 800, type: 'highpass', q: 0.5});
			tone({freq: 200, dur: 0.16, slide: 80, type: 'sine', vol: 0.3});
			setTimeout(() => sfx.horn(), 260);
		},
		squelch: () => {
			const p = vary(0.2);
			noise({dur: 0.15, vol: 0.22, from: 380 * p, to: 1500 * p, type: 'lowpass', q: 5});
			tone({freq: 250 * p, dur: 0.14, slide: 120, type: 'sine', vol: 0.14});
		},
		unstick: () => {
			noise({dur: 0.2, vol: 0.2, from: 500, to: 3000, q: 3});
			tone({freq: 300, dur: 0.2, slide: 900, type: 'sine', vol: 0.14});
		},
		raspberry: () => {
			tone({freq: 120 * vary(0.1), dur: 0.42, slide: 80, type: 'sawtooth', vol: 0.09, vib: 26, rate: 34});
			noise({dur: 0.4, vol: 0.05, from: 500, to: 300, type: 'lowpass', q: 2});
		},
		laugh: (pitch = 1) => {
			if (!limit(`laugh${pitch}`, 500)) return;
			for (let i = 0; i < 5; i++) tone({freq: (640 - i * 34) * pitch, at: i * 0.11, dur: 0.09, slide: (520 - i * 30) * pitch, type: 'triangle', vol: 0.11, vib: 12});
		},
		cry: (pitch = 1) => {
			if (!limit(`cry${pitch}`, 700)) return;
			tone({freq: 760 * pitch, dur: 0.5, slide: 380 * pitch, type: 'sine', vol: 0.11, vib: 45, rate: 9});
			tone({freq: 700 * pitch, at: 0.55, dur: 0.6, slide: 330 * pitch, type: 'sine', vol: 0.1, vib: 50, rate: 9});
		},
		gasp: (pitch = 1) => limit(`gasp${pitch}`, 300) && tone({freq: 420 * pitch, dur: 0.16, slide: 980 * pitch, type: 'sine', vol: 0.12}),
		yip: (pitch = 1) => limit(`yip${pitch}`, 200) && tone({freq: 620 * pitch, dur: 0.12, slide: 1100 * pitch, type: 'triangle', vol: 0.11}),
		cheer: () => {
			[72, 76, 79, 84].forEach((n, i) => tone({freq: midi(n), at: i * 0.06, dur: 0.25, type: 'triangle', vol: 0.11}));
			noise({at: 0.1, dur: 0.5, vol: 0.05, from: 5000, to: 8000, type: 'highpass', q: 0.5});
		},
		shield: () => {
			[76, 83, 88, 95].forEach((n, i) => tone({freq: midi(n), at: i * 0.07, dur: 0.4, type: 'sine', vol: 0.09}));
		},
		shieldPop: () => {
			tone({freq: 900, dur: 0.14, slide: 1900, type: 'sine', vol: 0.16});
			noise({at: 0.03, dur: 0.2, vol: 0.12, from: 4000, to: 2000});
			tone({freq: 200, at: 0.08, dur: 0.3, slide: 600, type: 'sine', vol: 0.18, vib: 40, rate: 16});
		},
		fizzle: () => {
			noise({dur: 0.8, vol: 0.1, from: 2600, to: 500, q: 2});
			tone({freq: 900, dur: 0.8, slide: 180, type: 'sawtooth', vol: 0.04, vib: 70, rate: 26});
		},
		poof: () => {
			noise({dur: 0.28, vol: 0.22, from: 1300, to: 260, type: 'lowpass', q: 0.9});
			setTimeout(() => sfx.honk(), 120);
		},
		swap: () => {
			tone({freq: 400, dur: 0.3, slide: 1200, type: 'triangle', vol: 0.1});
			tone({freq: 1200, dur: 0.3, slide: 400, type: 'triangle', vol: 0.1});
		},
		zap: () => {
			for (let i = 0; i < 7; i++) tone({freq: 500 + Math.random() * 1600, at: i * 0.04, dur: 0.05, type: 'square', vol: 0.045});
		},
		spin: () => tone({freq: 380, dur: 0.9, slide: 1500, type: 'sine', vol: 0.1, vib: 30, rate: 12}),
		splat: () => {
			noise({dur: 0.32, vol: 0.24, from: 1600, to: 200, type: 'lowpass', q: 1});
			tone({freq: 220, dur: 0.24, slide: 90, type: 'sine', vol: 0.2});
		},
		grow: () => tone({freq: 160, dur: 0.6, slide: 620, type: 'sawtooth', vol: 0.05, vib: 16}),
		shrink: () => tone({freq: 900, dur: 0.5, slide: 1900, type: 'sine', vol: 0.09, vib: 30, rate: 20}),
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

	/* ---------- the party tune ----------
	   A bouncy two-part song (A A B A) in sixteenth-note steps: a bright lead, off-beat chord stabs,
	   a hopping bass, kick, snare and hats. The closer the pop, the faster it goes and the busier the hats. */
	const CH = {C: [60, 64, 67], Am: [57, 60, 64], F: [53, 57, 60], G: [55, 59, 62], Em: [52, 55, 59]};
	const bar = (chord, notes) => ({chord, notes}); // notes: [step, midi, length in steps]
	const PART_A = [
		bar('C', [[0, 76, 2], [2, 79, 2], [4, 84, 3], [8, 79, 2], [10, 76, 2], [12, 79, 3]]),
		bar('Am', [[0, 81, 2], [2, 84, 2], [4, 88, 3], [8, 84, 2], [10, 81, 2], [12, 84, 3]]),
		bar('F', [[0, 81, 2], [2, 84, 2], [4, 89, 3], [8, 88, 2], [10, 86, 2], [12, 84, 3]]),
		bar('G', [[0, 86, 2], [2, 83, 2], [4, 79, 2], [6, 83, 2], [8, 86, 3], [12, 79, 2], [14, 83, 2]])
	];
	const PART_B = [
		bar('F', [[0, 77, 3], [3, 81, 3], [6, 84, 2], [8, 81, 3], [12, 77, 3]]),
		bar('G', [[0, 79, 3], [3, 83, 3], [6, 86, 2], [8, 83, 3], [12, 79, 3]]),
		bar('Em', [[0, 79, 2], [2, 83, 2], [4, 88, 3], [8, 86, 2], [10, 83, 2], [12, 79, 3]]),
		bar('G', [[0, 81, 2], [2, 83, 2], [4, 84, 2], [6, 86, 2], [8, 88, 2], [10, 89, 2], [12, 91, 4]])
	];
	const SONG = [...PART_A, ...PART_A, ...PART_B, ...PART_A];

	function scheduleMusic() {
		const ac = A.ctx;
		if (!ac) return;
		while (A.next < ac.currentTime + 0.3) {
			const tense = A.soft ? 0 : A.tension;
			const bpm = A.soft ? 104 : 118 + tense * 58;
			const at = A.next - ac.currentTime;
			const s = A.step % 16;
			const b = SONG[Math.floor(A.step / 16) % SONG.length];
			const chord = CH[b.chord];
			const stepLen = 60 / bpm / 4;
			// lead: a soft square with a triangle underneath (bright but round)
			for (const [st, n, len] of b.notes) {
				if (st !== s) continue;
				const dur = len * stepLen * 0.92;
				tone({freq: midi(n), at, dur, type: 'square', vol: 0.16, out: 'music'});
				tone({freq: midi(n), at, dur: dur * 1.1, type: 'triangle', vol: 0.5, out: 'music'});
				tone({freq: midi(n + 12) * 1.003, at, dur: dur * 0.5, type: 'sine', vol: 0.12, out: 'music'});
			}
			// off-beat chord stabs
			if (s % 4 === 2) chord.forEach((n) => tone({freq: midi(n + 12), at, dur: stepLen * 1.3, type: 'triangle', vol: A.soft ? 0.16 : 0.22, out: 'music'}));
			// bass: root, octave, fifth, octave
			if (s % 4 === 0) {
				const n = chord[0] - 24 + [0, 12, 7, 12][s / 4];
				tone({freq: midi(n), at, dur: stepLen * 2.6, type: 'triangle', vol: 0.75, out: 'music'});
				tone({freq: midi(n), at, dur: stepLen * 1.5, type: 'sine', vol: 0.5, out: 'music'});
			}
			if (!A.soft) {
				if (s === 0 || s === 8 || (s === 10 && A.step % 64 >= 48)) tone({freq: 150, at, dur: 0.13, slide: 48, type: 'sine', vol: 0.95, out: 'music'}); // kick
				if (s === 4 || s === 12) {
					noise({at, dur: 0.11, vol: 0.45, from: 2400, to: 1100, q: 0.9, out: 'music'}); // snare
					tone({freq: 210, at, dur: 0.07, slide: 150, type: 'triangle', vol: 0.3, out: 'music'});
				}
				if (s % 2 === 0 || tense > 0.6) noise({at, dur: 0.035, vol: s % 4 === 2 ? 0.2 : 0.11, from: 8000, to: 9000, type: 'highpass', q: 0.7, out: 'music'}); // hats
				if (tense > 0.8 && s % 4 === 3) tone({freq: midi(96), at, dur: 0.04, type: 'square', vol: 0.09, out: 'music'});
			} else if (s % 4 === 0) {
				noise({at, dur: 0.04, vol: 0.08, from: 7000, to: 8000, type: 'highpass', q: 0.7, out: 'music'});
			}
			A.step++;
			A.next += stepLen;
		}
	}

	const musicLevel = () => (state.music && A.playing ? (A.soft ? 0.06 : 0.085) : 0);

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
		g.setTargetAtTime(0.018, ac.currentTime, 0.08);
		g.setTargetAtTime(musicLevel(), ac.currentTime + seconds, 0.5);
	}

	/* ---------- voice: recorded clips (audio/<lang>/), the device voice only as a last resort ---------- */
	const CLIPS = () => (state.lang === 'ar' ? window.BP_VOICE_AR : window.BP_VOICE_EN) || {};
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
			u.rate = 0.95;
			speechSynthesis.speak(u);
		} catch (err) {
			/* no voice on this device */
		}
	}

	function say(key) {
		if (!state.voice || BP.Sound.quiet) return; // the voice has its own switch: effects on/off never touches it
		const text = window.BP_WORDS.SAY[state.lang][key];
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
		duckMusic(1.8);
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

	// fetch the clips the match will need, so "Double trouble!" plays the moment it happens
	function preload() {
		if (!HTTP || !ctx()) return;
		const map = CLIPS();
		Object.values(window.BP_WORDS.SAY[state.lang]).forEach((text) => {
			if (map[text]) clipBuffer(`audio/${state.lang}/${map[text]}.mp3`).catch(() => {});
		});
	}

	BP.Sound = {
		state,
		sfx,
		say,
		stopVoice,
		preload,
		quiet: false,
		unlock: () => ctx(),
		music(on, {soft = false} = {}) {
			A.playing = on;
			A.soft = soft;
			if (!on) A.tension = 0;
			updateMusic();
		},
		tension(v) {
			A.tension += (Math.max(0, Math.min(1, v)) - A.tension) * 0.08;
		},
		setSound(on) {
			state.sound = on;
			localStorage.setItem('paint-sound', on ? 'on' : 'off');
			updateMusic();
		},
		setVoice(on) {
			state.voice = on;
			try {
				localStorage.setItem('bp-voice', on ? 'on' : 'off');
			} catch (err) {
				/* private mode */
			}
			if (!on) stopVoice();
		},
		setMusic(on) {
			state.music = on;
			localStorage.setItem('bp-music', on ? 'on' : 'off');
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
