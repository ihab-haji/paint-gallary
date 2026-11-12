/* Water Blaster Arena: sound (AudioManager). Everything is made with Web Audio (no sound files), except the recorded voice.
     WB.Sound.unlock()             call from a tap: browsers only allow sound after one
     WB.Sound.spray(id, on, kind)  a looping hiss per player while their blaster is held (kind: standard | rapid | power)
     WB.Sound.sfx.<name>(...)      short effects; most have a few random variations so 4 kids never hear the same sound twice in a row
     WB.Sound.music(on, {fast, menu})  "Splash Party": soft on the menus, the full band in a round, faster in big splash time
     WB.Sound.say(key)             a recorded sentence from words.js (SAY), the device voice as a last resort (only when the voice is switched on: off by default)
   Sound on/off and the language are shared with the rest of the app (localStorage); music and volume are this game's own. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});

	const read = (k) => {
		try {
			return localStorage.getItem(k);
		} catch (err) {
			return null;
		}
	};
	const write = (k, v) => {
		try {
			localStorage.setItem(k, v);
		} catch (err) {
			/* private mode */
		}
	};

	const state = {
		sound: read('paint-sound') !== 'off',
		music: read('wb-music') !== 'off', // music is on unless turned off
		voice: read('wb-voice') === 'on', // the spoken voice is off unless turned on
		volume: Math.max(0, Math.min(1, Number(read('wb-volume') || 0.8))),
		lang: read('paint-lang-v2') || 'ar'
	};
	const A = {ctx: null, master: null, sfx: null, music: null, voice: null, noise: null, timer: 0, step: 0, next: 0, fast: false, playing: false, sprays: new Map()};

	function ctx() {
		if (!A.ctx) {
			const Ctx = window.AudioContext || window.webkitAudioContext;
			if (!Ctx) return null;
			A.ctx = new Ctx();
			A.master = A.ctx.createGain();
			A.master.gain.value = state.volume;
			A.master.connect(A.ctx.destination);
			const comp = A.ctx.createDynamicsCompressor(); // 4 kids spraying at once: keep it from clipping
			comp.threshold.value = -16;
			comp.ratio.value = 6;
			comp.connect(A.master);
			A.sfx = A.ctx.createGain();
			A.sfx.gain.value = 0.85;
			A.sfx.connect(comp);
			A.music = A.ctx.createGain();
			A.music.gain.value = 0;
			A.music.connect(comp);
			// a soft slap-back echo for the steel pans (the sound bounces off the pool)
			A.echo = A.ctx.createGain();
			A.echo.gain.value = 0.35;
			const delay = A.ctx.createDelay(1);
			delay.delayTime.value = 0.29;
			const fb = A.ctx.createGain();
			fb.gain.value = 0.3;
			const tint = A.ctx.createBiquadFilter();
			tint.type = 'lowpass';
			tint.frequency.value = 3200;
			A.echo.connect(delay).connect(tint).connect(fb).connect(delay);
			tint.connect(A.music);
			A.voice = A.ctx.createGain();
			A.voice.gain.value = 1.1;
			A.voice.connect(A.master);
			// one second of white noise, reused by every watery effect (no new buffers while playing)
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

	// sfx, music, or music with echo
	function route(node, out) {
		if (out === 'sfx') return node.connect(A.sfx);
		node.connect(A.music);
		if (out === 'echo') node.connect(A.echo);
	}

	const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
	const pick = (list) => list[Math.floor(Math.random() * list.length)];
	const vary = (v, f = 0.12) => v * (1 - f + Math.random() * f * 2);

	function tone({freq, at = 0, dur = 0.2, type = 'triangle', vol = 0.18, slide = 0, out = 'sfx', vib = 0}) {
		const ac = A.ctx;
		if (!ac || !live() || (out === 'sfx' && !state.sound)) return;
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
		route(osc.connect(gain), out);
		osc.start(start);
		osc.stop(start + dur + 0.05);
	}

	function noise({at = 0, dur = 0.25, vol = 0.15, from = 600, to = 2400, type = 'bandpass', q = 1.4, out = 'sfx'}) {
		const ac = A.ctx;
		if (!ac || !live() || (out === 'sfx' && !state.sound)) return;
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
		route(src.connect(filter).connect(gain), out);
		src.start(start, Math.random() * 0.5);
		src.stop(start + dur + 0.05);
	}

	// a bubbly "bloop": a sine that jumps up fast (the sound of a drop landing in water)
	const bloop = (f, at = 0, vol = 0.14) => tone({freq: f, slide: f * 2.4, at, dur: 0.07, type: 'sine', vol});

	// rate limit: 4 kids hitting each other at the same moment must not become one loud blast
	const last = {};
	function limit(key, ms) {
		const now = performance.now();
		if (last[key] && now - last[key] < ms) return false;
		last[key] = now;

		return true;
	}

	/* ---------- the blaster hiss: one looping noise per player while the button is held ---------- */
	const SPRAY = {standard: {f: 2600, q: 0.9, v: 0.09}, rapid: {f: 3600, q: 1.3, v: 0.08}, power: {f: 1400, q: 0.8, v: 0.07}};

	function spray(id, on, kind = 'standard', tank = 100) {
		const ac = A.ctx;
		let s = A.sprays.get(id);
		if (!ac) return;
		// pressure: a full tank hisses high and bright, a nearly empty one sinks to a tired gurgle
		if (on && s) {
			const p = 0.62 + 0.38 * Math.max(0, Math.min(1, tank / 100));
			s.filter.frequency.setTargetAtTime(s.f * p, ac.currentTime, 0.12);
		}
		if (on && state.sound && !s) {
			const k = SPRAY[kind] || SPRAY.standard;
			const src = ac.createBufferSource();
			src.buffer = A.noise;
			src.loop = true;
			const filter = ac.createBiquadFilter();
			filter.type = 'bandpass';
			filter.frequency.value = vary(k.f, 0.08);
			filter.Q.value = k.q;
			// a fast wobble: water comes out in spurts, not as a flat hiss
			const lfo = ac.createOscillator();
			lfo.frequency.value = kind === 'power' ? 3.2 : kind === 'rapid' ? 22 : 13;
			const depth = ac.createGain();
			depth.gain.value = k.v * 0.45;
			const gain = ac.createGain();
			gain.gain.value = 0.0001;
			gain.gain.setTargetAtTime(k.v, ac.currentTime, 0.03);
			lfo.connect(depth).connect(gain.gain);
			src.connect(filter).connect(gain).connect(A.sfx);
			// under the hiss: the low rush of water leaving the nozzle
			const gush = ac.createBiquadFilter();
			gush.type = 'lowpass';
			gush.frequency.value = vary(520, 0.15);
			const gushGain = ac.createGain();
			gushGain.gain.value = 1.5;
			src.connect(gush).connect(gushGain).connect(gain);
			src.start(ac.currentTime, Math.random() * 0.5);
			lfo.start();
			s = {src, lfo, gain, filter, f: filter.frequency.value};
			A.sprays.set(id, s);
		} else if ((!on || !state.sound) && s) {
			s.gain.gain.cancelScheduledValues(ac.currentTime);
			s.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.04);
			s.src.stop(ac.currentTime + 0.2);
			s.lfo.stop(ac.currentTime + 0.2);
			A.sprays.delete(id);
		}
	}

	const stopSprays = () => [...A.sprays.keys()].forEach((id) => spray(id, false));

	/* ---------- the pool: water lapping quietly, and now and then a bubble, while a round is on ---------- */
	function ambience(on) {
		const ac = A.ctx;
		if (!ac) return;
		on = on && state.sound;
		if (on && !A.pool) {
			const src = ac.createBufferSource();
			src.buffer = A.noise;
			src.loop = true;
			const filter = ac.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = 520;
			filter.Q.value = 0.6;
			const gain = ac.createGain();
			gain.gain.value = 0.0001;
			gain.gain.setTargetAtTime(0.028, ac.currentTime, 0.8);
			// two slow waves that drift apart, so the lapping never repeats
			const waves = [0.21, 0.34].map((hz) => {
				const lfo = ac.createOscillator();
				lfo.frequency.value = hz;
				const depth = ac.createGain();
				depth.gain.value = 0.011;
				lfo.connect(depth).connect(gain.gain);
				lfo.start();

				return lfo;
			});
			const sweep = ac.createOscillator();
			sweep.frequency.value = 0.13;
			const sweepDepth = ac.createGain();
			sweepDepth.gain.value = 220;
			sweep.connect(sweepDepth).connect(filter.frequency);
			sweep.start();
			src.connect(filter).connect(gain).connect(A.sfx);
			src.start(ac.currentTime, Math.random() * 0.5);
			const timer = setInterval(() => {
				if (Math.random() < 0.55) bloop(vary(480, 0.5), 0, 0.022);
				if (Math.random() < 0.2) bloop(vary(760, 0.4), vary(0.12, 0.4), 0.016);
			}, 1300);
			A.pool = {src, gain, timer, lfos: [...waves, sweep]};
		} else if (!on && A.pool) {
			const p = A.pool;
			A.pool = null;
			clearInterval(p.timer);
			p.gain.gain.cancelScheduledValues(ac.currentTime);
			p.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.25);
			p.src.stop(ac.currentTime + 1.2);
			p.lfos.forEach((l) => l.stop(ac.currentTime + 1.2));
		}
	}

	const sfx = {
		tap: () => tone({freq: 660, dur: 0.08, slide: 990, vol: 0.12}),
		// a drop hits someone: a wet slap plus a little bubble, pitch varied every time
		hit: (wet = 0) => {
			if (!limit('hit', 70)) return;
			const kind = Math.floor(Math.random() * 3);
			if (kind === 0) {
				// a slap
				noise({dur: vary(0.09), vol: 0.13, from: vary(2200), to: 700, type: 'bandpass', q: 1.1});
				bloop(vary(380 + wet * 3, 0.2), 0.01, 0.1);
			} else if (kind === 1) {
				// a splat: lower and wetter
				noise({dur: vary(0.14), vol: 0.14, from: vary(1500), to: 320, type: 'lowpass', q: 1.4});
				bloop(vary(300 + wet * 2, 0.2), 0.02, 0.08);
			} else {
				// a spatter of little drops
				noise({dur: 0.05, vol: 0.1, from: vary(3400), to: 1400, q: 0.9});
				[0.01, vary(0.05, 0.3), vary(0.09, 0.3)].forEach((at) => bloop(vary(560 + wet * 3, 0.3), at, 0.05));
			}
			// soaked clothes sound heavier
			if (wet > 60) tone({freq: vary(150, 0.15), dur: 0.08, slide: 90, type: 'sine', vol: 0.07});
		},
		// a drop lands on the ground or a wall
		drip: () => limit('drip', 90) && bloop(vary(700, 0.25), 0, 0.045),
		// water pattering on the floor: a tiny tick and a plip, never twice the same
		floor: () => {
			if (!limit('floor', 55)) return;
			noise({dur: vary(0.035, 0.3), vol: vary(0.05, 0.3), from: vary(5200, 0.25), to: 2600, type: 'highpass', q: 0.7});
			if (Math.random() < 0.6) bloop(vary(900, 0.35), 0.01, 0.035);
		},
		// a drop falls into the pool: a round "plink" with a second, softer one after it
		pool: () => {
			if (!limit('pool', 70)) return;
			const f = vary(620, 0.4);
			bloop(f, 0, 0.07);
			bloop(f * 1.5, vary(0.06, 0.3), 0.035);
		},
		// water slaps a barrel or a wall: a hollow knock under the splat
		cover: () => {
			if (!limit('cover', 80)) return;
			tone({freq: vary(210, 0.25), dur: 0.07, slide: 120, type: 'sine', vol: 0.12});
			noise({dur: vary(0.07), vol: 0.09, from: vary(3000, 0.2), to: 900, q: 1});
		},
		// a step: a soft pat when dry, a squelch when your shoes are full of water
		step: (wet = 0, puddle = false) => {
			if (!limit('step', 95)) return;
			if (wet < 25 && !puddle) {
				noise({dur: 0.04, vol: 0.022, from: vary(900, 0.3), to: 400, type: 'lowpass', q: 0.8});

				return;
			}
			noise({dur: vary(0.09, 0.25), vol: 0.05 + wet * 0.0005, from: vary(500, 0.3), to: vary(1700, 0.2), type: 'lowpass', q: 4});
			if (puddle || Math.random() < 0.4) bloop(vary(520, 0.4), 0.03, 0.04);
		},
		// the trigger: a little pump click as the water starts
		trigger: () => {
			if (!limit('trigger', 110)) return;
			tone({freq: vary(1500, 0.1), dur: 0.03, type: 'square', vol: 0.035});
			noise({dur: 0.09, vol: 0.07, from: 700, to: vary(3200, 0.15), q: 1.2});
		},
		// letting go: the last drops dribble out of the nozzle
		release: () => {
			if (!limit('release', 140)) return;
			[0, vary(0.07, 0.3), vary(0.17, 0.3)].forEach((at, i) => bloop(vary(820 - i * 90, 0.2), at, 0.045 - i * 0.01));
		},
		// an empty blaster coughs air
		sputter: () => {
			if (!limit('sputter', 260)) return;
			[0, 0.07, 0.15].forEach((at) => noise({at, dur: 0.045, vol: 0.06, from: vary(1400, 0.3), to: 600, q: 2.5}));
		},
		// filling up at a tap: glug, glug, higher and higher as the tank fills (like a bottle under a tap)
		fill: (level = 0.5) => {
			if (!limit('fill', 170)) return;
			const base = 300 + level * 520;
			[0, 0.07].forEach((at, i) => bloop(vary(base + i * 90, 0.08), at, 0.1));
			noise({dur: 0.16, vol: 0.035, from: 1200 + level * 1400, to: 2400 + level * 1400, q: 2});
		},
		// someone lands in the pool: a deep "ker-plunk", water thrown up, then it all rains back down
		plunge: () => {
			tone({freq: 130, dur: 0.38, slide: 44, type: 'sine', vol: 0.42});
			noise({dur: 0.7, vol: 0.3, from: 2600, to: 180, type: 'lowpass', q: 0.8});
			noise({at: 0.05, dur: 0.5, vol: 0.12, from: 5200, to: 1500, type: 'highpass', q: 0.6});
			for (let i = 0; i < 9; i++) bloop(vary(700, 0.6), 0.45 + Math.random() * 0.75, 0.03 + Math.random() * 0.04);
			for (let i = 0; i < 6; i++) bloop(vary(300, 0.4), 0.15 + i * 0.06, 0.06);
		},
		// drops raining back down after a big splash
		drizzle: (n = 7) => {
			if (!limit('drizzle', 200)) return;
			for (let i = 0; i < n; i++) bloop(vary(850, 0.5), 0.12 + Math.random() * 0.6, 0.02 + Math.random() * 0.03);
		},
		// a stream of bubbles coming up
		bubbles: () => {
			if (!limit('bubbles', 300)) return;
			for (let i = 0; i < 6; i++) bloop(vary(420 + i * 60, 0.25), i * vary(0.055, 0.3), 0.05);
		},
		// a wet shoe squeaks on the tiles
		squeak: () => limit('squeak', 500) && tone({freq: vary(1900, 0.15), dur: 0.12, slide: vary(2700, 0.1), type: 'sine', vol: 0.045, vib: 90}),
		big: () => {
			// a power shot lands: a plop with weight
			noise({dur: 0.28, vol: 0.22, from: 1600, to: 220, type: 'lowpass', q: 1});
			tone({freq: vary(200), dur: 0.22, slide: 80, type: 'sine', vol: 0.22});
		},
		pow: () => {
			if (!limit('pow', 60)) return;
			tone({freq: vary(180), dur: 0.12, slide: 520, type: 'sine', vol: 0.2});
			noise({dur: 0.12, vol: 0.1, from: 900, to: 3000});
		},
		splash: () => {
			if (!limit('splash', 160)) return;
			noise({dur: vary(0.35), vol: 0.2, from: vary(2400, 0.2), to: 300, type: 'lowpass', q: 0.9});
			noise({at: 0.02, dur: vary(0.22), vol: 0.07, from: vary(5000, 0.2), to: 2000, type: 'highpass', q: 0.6});
			[0, 0.05, 0.11, vary(0.2, 0.3), vary(0.32, 0.3)].forEach((at, i) => bloop(vary(500, 0.35), at, 0.08 - i * 0.012));
		},
		// the giant "TOTALLY SOAKED" splash: a whoosh up, a huge plop, then bubbles and a giggle
		soaked: () => {
			duckMusic(2.5);
			tone({freq: 300, dur: 0.55, slide: 1500, type: 'sine', vol: 0.16, vib: 30});
			noise({at: 0.5, dur: 0.8, vol: 0.32, from: 3000, to: 160, type: 'lowpass', q: 0.8});
			tone({freq: 150, at: 0.5, dur: 0.4, slide: 55, type: 'sine', vol: 0.4});
			for (let i = 0; i < 7; i++) bloop(400 + Math.random() * 600, 0.7 + i * 0.07, 0.07);
			[0, 0.12, 0.24].forEach((at, i) => tone({freq: 700 + i * 80, at: 1.2 + at, dur: 0.1, slide: 980 + i * 80, type: 'triangle', vol: 0.07, vib: 50}));
		},
		ouch: (pitch = 1) => {
			if (!limit(`ouch${pitch}`, 650)) return;
			// a funny "eep!" squeak, different per character
			const f = pick([880, 990, 1040]) * pitch;
			tone({freq: f, dur: 0.14, slide: f * 1.5, type: 'sine', vol: 0.12, vib: 40});
			tone({freq: f * 1.4, at: 0.12, dur: 0.12, slide: f * 0.9, type: 'triangle', vol: 0.06});
		},
		panic: (pitch = 1) => {
			if (!limit(`panic${pitch}`, 1600)) return;
			[0, 0.1, 0.2, 0.3].forEach((at, i) => tone({freq: (i % 2 ? 1100 : 900) * pitch, at, dur: 0.09, type: 'sine', vol: 0.09, vib: 70}));
		},
		giggle: (pitch = 1) => {
			if (!limit(`giggle${pitch}`, 900)) return;
			[0, 0.11, 0.22, 0.33].forEach((at, i) => tone({freq: (760 - i * 40) * pitch, at, dur: 0.09, slide: (900 - i * 40) * pitch, type: 'triangle', vol: 0.08, vib: 60}));
		},
		refill: (level) => {
			if (level !== undefined) return sfx.fill(level);
			if (!limit('refill', 220)) return;
			[0, 0.06, 0.12].forEach((at, i) => bloop(500 + i * 180, at, 0.1));
		},
		gulp: () => [0, 0.09, 0.18, 0.27].forEach((at, i) => bloop(380 + i * 120, at, 0.13)),
		empty: () => limit('empty', 500) && [0, 0.09].forEach((at) => tone({freq: 260, at, dur: 0.07, slide: 180, type: 'square', vol: 0.05})),
		slip: () => {
			if (!limit('slip', 400)) return;
			tone({freq: 1300, dur: 0.45, slide: 260, type: 'sine', vol: 0.13});
			noise({at: 0.03, dur: 0.3, vol: 0.06, from: 3000, to: 700});
			sfx.squeak();
		},
		thud: () => {
			if (!limit('thud', 300)) return;
			tone({freq: 140, dur: 0.16, slide: 60, type: 'sine', vol: 0.26});
			noise({dur: 0.12, vol: 0.1, from: 700, to: 150, type: 'lowpass', q: 0.7});
		},
		power: () => [72, 76, 79, 84, 88].forEach((n, i) => tone({freq: midi(n), at: i * 0.05, dur: 0.22, type: 'square', vol: 0.05})),
		shieldPop: () => {
			tone({freq: 900, dur: 0.12, slide: 1800, type: 'sine', vol: 0.15});
			noise({at: 0.03, dur: 0.18, vol: 0.12, from: 4000, to: 2000});
		},
		shieldBlock: () => limit('block', 120) && tone({freq: vary(1500), dur: 0.06, slide: 2100, type: 'sine', vol: 0.06}),
		golden: () => [84, 88, 91, 96, 100].forEach((n, i) => tone({freq: midi(n), at: i * 0.06, dur: 0.5, type: 'sine', vol: 0.11})),
		reverse: () => [0, 0.12, 0.24].forEach((at, i) => tone({freq: 900 - i * 200, at, dur: 0.14, slide: 500 - i * 100, type: 'triangle', vol: 0.1})),
		balloon: () => limit('balloon', 80) && tone({freq: vary(1700), dur: 0.35, slide: 500, type: 'sine', vol: 0.05}),
		wave: () => {
			noise({dur: 2.2, vol: 0.18, from: 300, to: 1400, type: 'lowpass', q: 0.6});
			noise({at: 1.4, dur: 1.2, vol: 0.14, from: 2400, to: 400, type: 'bandpass', q: 0.7});
		},
		cannon: () => {
			tone({freq: 90, dur: 0.4, slide: 45, type: 'sine', vol: 0.4});
			noise({dur: 0.5, vol: 0.2, from: 1200, to: 200, type: 'lowpass', q: 0.9});
		},
		sting: () => {
			[[60, 0], [64, 0.1], [67, 0.2], [72, 0.3]].forEach(([n, at]) => tone({freq: midi(n), at, dur: 0.25, type: 'square', vol: 0.06}));
			noise({at: 0.3, dur: 0.25, vol: 0.06, from: 6000, to: 9000, type: 'highpass', q: 0.5});
		},
		count: (n) => tone({freq: n ? 660 : 990, dur: n ? 0.18 : 0.5, type: 'triangle', vol: 0.2}),
		ready: () => [79, 86].forEach((n, i) => tone({freq: midi(n), at: i * 0.07, dur: 0.18, type: 'sine', vol: 0.14})),
		whistle: () => tone({freq: 1800, dur: 0.6, slide: 500, type: 'sine', vol: 0.07}),
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

	/* ---------- music: "Splash Party", a sunny calypso in C ----------
	   Steel-pan melody with an echo, a bouncy bass, off-beat ukulele strums, kick, clap, shaker and bubbles.
	   The song is 4 parts of 4 bars (A A B A'), 8 steps (eighth notes) a bar.
	   Three moods: menu (soft: pads, pans and shaker, no drums), play (the full band), fast (big splash time:
	   quicker, extra hats and a sparkle an octave up). */
	const _ = null;
	const MEL = {
		A: [72, _, 76, 79, 81, 79, 76, _, 74, _, 79, _, 83, 81, 79, _, 76, _, 72, 76, 81, _, 79, 76, 77, 76, 74, 72, 74, _, _, _],
		A2: [72, _, 76, 79, 81, 79, 76, _, 74, _, 79, _, 83, 81, 79, _, 76, _, 72, 76, 81, _, 79, 76, 77, 79, 76, 74, 72, _, _, _],
		B: [81, _, 81, 79, 77, _, 76, 77, 79, _, 79, 77, 76, _, 74, 76, 79, _, 83, _, 81, 79, 76, _, 74, 76, 77, 79, 74, _, 71, _]
	};
	const CH = {C: [60, 64, 67], G: [59, 62, 67], Am: [57, 60, 64], F: [57, 60, 65], Em: [59, 64, 67]};
	const ROOT = {C: 48, G: 43, Am: 45, F: 41, Em: 40};
	const PROG = {A: ['C', 'G', 'Am', 'F'], A2: ['C', 'G', 'Am', 'C'], B: ['F', 'G', 'Em', 'Am']};
	const FORM = ['A', 'A', 'B', 'A2'];
	// a third below each melody note that stays in C major (the harmony line)
	const THIRD = {0: 3, 2: 3, 4: 4, 5: 3, 7: 3, 9: 4, 11: 4};

	// a steel pan: a sine with a bright, fast-fading overtone, into the echo
	function pan(n, at, vol) {
		tone({freq: midi(n), at, dur: 0.34, type: 'sine', vol, out: 'echo'});
		tone({freq: midi(n) * 2, at, dur: 0.16, type: 'triangle', vol: vol * 0.25, out: 'echo'});
		tone({freq: midi(n) * 2.98, at, dur: 0.07, type: 'sine', vol: vol * 0.18, out: 'music'});
	}

	// a ukulele strum: the chord's notes a hair apart, short and plucky
	function strum(notes, at, vol) {
		notes.forEach((n, i) => tone({freq: midi(n + 12), at: at + i * 0.012, dur: 0.14, type: 'triangle', vol, out: 'music'}));
	}

	const kick = (at, vol = 0.55) => tone({freq: 150, slide: 42, at, dur: 0.16, type: 'sine', vol, out: 'music'});
	const clap = (at) => {
		noise({at, dur: 0.12, vol: 0.18, from: 1600, to: 1200, type: 'bandpass', q: 0.9, out: 'music'});
		noise({at: at + 0.012, dur: 0.08, vol: 0.12, from: 2400, to: 1800, type: 'bandpass', q: 1.2, out: 'music'});
	};
	const hat = (at, vol) => noise({at, dur: 0.035, vol, from: 8000, to: 9000, type: 'highpass', q: 0.7, out: 'music'});

	function scheduleMusic() {
		const ac = A.ctx;
		if (!ac) return;
		const bpm = A.fast ? 138 : A.menu ? 104 : 116;
		const step = 60 / bpm / 2;
		// a busy moment held the timer up: skip the missed notes instead of piling them all into one instant
		if (A.next < ac.currentTime - 0.05) A.next = ac.currentTime + 0.05;
		while (A.next < ac.currentTime + 1) {
			const at = A.next - ac.currentTime;
			const s = A.step;
			const part = FORM[Math.floor(s / 32) % FORM.length];
			const i = s % 32; // step in the part
			const b = i % 8; // step in the bar
			const chord = PROG[part][Math.floor(i / 8)];
			const note = MEL[part][i];
			const menu = A.menu;

			// melody (with a soft third below in the B part), and in big splash time a sparkle an octave up
			if (note) {
				pan(note, at, menu ? 0.3 : 0.38);
				if (part === 'B' && !menu) pan(note - THIRD[note % 12], at, 0.13);
				if (A.fast) pan(note + 12, at + step / 2, 0.1);
			}
			// bass: root, octave, fifth: a bouncy calypso line
			const r = ROOT[chord];
			const bassAt = {0: r, 3: r + 12, 4: r + 7, 6: r};
			if (bassAt[b] !== undefined) tone({freq: midi(bassAt[b]), at, dur: menu ? 0.4 : 0.24, type: 'triangle', vol: menu ? 0.32 : 0.5, out: 'music'});
			if (menu) {
				// a warm pad on the first beat of each bar
				if (b === 0) CH[chord].forEach((n) => tone({freq: midi(n), at, dur: step * 7.5, type: 'sine', vol: 0.06, out: 'music'}));
				if (b % 2 === 1) strum(CH[chord], at, 0.05);
				hat(at, b % 2 ? 0.05 : 0.025);
			} else {
				if (b % 2 === 1) strum(CH[chord], at, 0.07); // off-beat ukulele
				if (b === 0 || b === 4 || (A.fast && b === 6)) kick(at);
				if (b === 2 || b === 6) clap(at);
				hat(at, b % 2 ? 0.08 : 0.04);
				if (A.fast) hat(at + step / 2, 0.035);
			}
			// bubbles at the end of every second bar
			if (i % 16 === 15) [0, 0.06, 0.12].forEach((d, k) => tone({freq: 480 + k * 160, slide: 1100 + k * 200, at: at + d, dur: 0.06, type: 'sine', vol: 0.12, out: 'music'}));
			// a little "whoop" slide into the B part
			if (s % 128 === 63 && !menu) tone({freq: 300, slide: 900, at, dur: step * 1.6, type: 'sine', vol: 0.1, out: 'echo'});
			A.step++;
			A.next += step;
		}
	}

	const musicLevel = () => (state.music && A.playing ? (A.menu ? 0.07 : 0.1) : 0);

	function updateMusic() {
		const ac = A.ctx;
		if (!ac) return;
		const level = musicLevel();
		A.music.gain.cancelScheduledValues(ac.currentTime);
		A.music.gain.setTargetAtTime(level, ac.currentTime, 0.3);
		if (level && !A.timer) {
			A.next = ac.currentTime + 0.1;
			A.timer = setInterval(scheduleMusic, 60);
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
	const CLIPS = () => (state.lang === 'ar' ? window.WB_VOICE_AR : window.WB_VOICE_EN) || {};
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
			u.volume = state.volume;
			speechSynthesis.speak(u);
		} catch (err) {
			/* no voice on this device */
		}
	}

	function say(key) {
		if (!state.voice) return; // the voice has its own switch: effects on/off never touches it
		const text = window.WB_WORDS.SAY[state.lang][key];
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
			el.volume = state.volume;
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

	// fetch the clips the match will need, so "Big wave!" plays the moment it happens
	function preload() {
		if (!HTTP || !ctx()) return;
		const map = CLIPS();
		Object.values(window.WB_WORDS.SAY[state.lang]).forEach((text) => {
			if (map[text]) clipBuffer(`audio/${state.lang}/${map[text]}.mp3`).catch(() => {});
		});
	}

	WB.Sound = {
		state,
		sfx,
		say,
		spray,
		ambience,
		stopSprays,
		stopVoice,
		preload,
		unlock: () => ctx(),
		// for testing: what the music is doing right now
		status: () => {
			if (A.music && !A.probe) {
				A.probe = A.ctx.createAnalyser();
				A.music.connect(A.probe);
			}
			let rms = 0;
			if (A.probe) {
				const b = new Float32Array(A.probe.fftSize);
				A.probe.getFloatTimeDomainData(b);
				rms = Math.sqrt(b.reduce((t, v) => t + v * v, 0) / b.length);
			}

			return {rms, next: A.next - (A.ctx ? A.ctx.currentTime : 0), step: A.step, playing: A.playing, menu: A.menu, fast: A.fast, running: !!A.timer, level: musicLevel(), gain: A.music ? A.music.gain.value : 0};
		},
		music(on, {fast = false, menu = false} = {}) {
			// a new mood starts the song from the top (so the menu tune and the round tune feel different)
			if (on && (A.menu !== menu || !A.playing)) A.step = 0;
			A.playing = on;
			A.fast = fast;
			A.menu = menu;
			updateMusic();
			ambience(on && !menu); // the pool is heard whenever a round is on
		},
		setSound(on) {
			state.sound = on;
			write('paint-sound', on ? 'on' : 'off');
			if (!on) {
				stopSprays();
				ambience(false);
			} else {
				ambience(A.playing && !A.menu);
			}
			updateMusic();
		},
		setVoice(on) {
			state.voice = on;
			write('wb-voice', on ? 'on' : 'off');
			if (!on) stopVoice();
		},
		setMusic(on) {
			state.music = on;
			write('wb-music', on ? 'on' : 'off');
			updateMusic();
		},
		setVolume(v) {
			state.volume = Math.max(0, Math.min(1, v));
			write('wb-volume', String(state.volume));
			if (A.master) A.master.gain.setTargetAtTime(state.volume, A.ctx.currentTime, 0.05);
		},
		setLang(lang) {
			state.lang = lang;
			write('paint-lang-v2', lang);
			stopVoice();
			preload();
		}
	};
})();
