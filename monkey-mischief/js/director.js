/* Monkey Mischief: the match director. Runs the clock, the three phases and every surprise.
     Phase 1 Banana Hunt (first ~30%)   lots of bananas, the first power-ups
     Phase 2 Jungle Chaos (to ~72%)     golden bananas, coconut rain, the gorilla, coconuts from the palms
     Phase 3 Banana Frenzy (the rest)   banana rain, more of everything; the last 20 s speed up the music
   Events are planned at the start from the match length, with a little randomness, so two events
   never land on top of each other and every match has the same good rhythm. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});

	class Director {
		constructor(scene, total) {
			this.scene = scene;
			this.total = total;
			this.t = 0;
			this.phase = 'hunt';
			this.spawnT = 0;
			this.powerT = 7;
			this.palmT = 9;
			this.rain = 0;
			this.rainT = 0;
			this.lastTick = 99;
			this.twenty = false;
			const T = total;
			const c0 = T * 0.3;
			const f0 = T * 0.72;
			const C = f0 - c0;
			const F = T - f0;
			const j = () => (Math.random() - 0.5) * 2;
			this.events = [
				{at: c0, fn: () => this.setPhase('chaos')},
				{at: c0 + 3, fn: () => this.golden()},
				{at: c0 + C * 0.22 + j(), fn: () => this.coconutRain()},
				{at: c0 + C * 0.45 + j(), fn: () => this.gorilla()},
				{at: c0 + C * 0.78 + j(), fn: () => this.golden()},
				{at: f0, fn: () => this.setPhase('frenzy')},
				{at: f0 + 0.6, fn: () => this.bananaRain(5)},
				{at: f0 + Math.min(F * 0.3, 9), fn: () => this.coconutRain()},
				{at: T - 20, fn: () => this.lastTwenty()},
				{at: T - 13, fn: () => this.golden()}
			];
			if (T >= 160) {
				this.events.push({at: c0 + C * 0.62, fn: () => this.coconutRain()});
				this.events.push({at: f0 + F * 0.45, fn: () => this.gorilla()});
			}
			this.events.sort((a, b) => a.at - b.at);
		}

		get left() {
			return Math.max(0, this.total - this.t);
		}

		setPhase(p) {
			this.phase = p;
			const icon = {hunt: 'banana', chaos: 'coconut', frenzy: 'banana-gold'}[p];
			this.scene.announce(p, icon);
		}

		golden() {
			if (this.scene.bananas.gold.on) return;
			this.scene.bananas.startGold();
			this.scene.announce('golden', 'banana-gold');
		}

		coconutRain() {
			const s = this.scene;
			s.announce('coconuts', 'coconut');
			// 3 waves; each wave aims near the monkeys (never exactly on them) plus a few random spots
			for (let w = 0; w < 3; w++) {
				s.time.delayedCall(900 + w * 1300, () => {
					if (s.state !== 'play') return;
					s.monkeys.forEach((m) => {
						const a = Math.random() * Math.PI * 2;
						const r = 50 + Math.random() * 60;
						const x = m.x + Math.cos(a) * r;
						const y = m.y + Math.sin(a) * r;
						if (s.L.isFree(x, y, 20)) s.traps.coconut(x, y);
					});
					for (let i = 0; i < 2; i++) {
						const p = s.L.randomFree(Math.random, 30);
						s.traps.coconut(p.x, p.y);
					}
				});
			}
		}

		gorilla() {
			if (this.scene.gorilla.on) return;
			this.scene.announce('gorilla', 'gorilla-chase');
			this.scene.time.delayedCall(1200, () => {
				if (this.scene.state === 'play') this.scene.gorilla.start();
			});
		}

		bananaRain(seconds) {
			this.rain = seconds;
			this.rainT = 0;
			this.scene.announce('rain', 'banana');
		}

		lastTwenty() {
			this.twenty = true;
			MM.Sound.music(true, {fast: true});
			this.scene.time.delayedCall(2600, () => this.bananaRain(4));
			this.scene.announce('twenty', null);
		}

		update(dt) {
			const s = this.scene;
			this.t += dt;
			while (this.events.length && this.events[0].at <= this.t) this.events.shift().fn();

			// keep enough bananas around: most fall from the two banana trees, the rest from above
			const n = s.monkeys.length;
			const want = {hunt: 9 + n * 2, chaos: 7 + n * 2, frenzy: 10 + n * 2}[this.phase];
			this.spawnT -= dt;
			if (this.spawnT <= 0 && s.bananas.count < want) {
				this.spawnT = this.phase === 'frenzy' ? 0.35 : 0.6;
				if (Math.random() < 0.6) s.treeDrop();
				else s.bananas.fromSky();
			}
			if (this.rain > 0) {
				this.rain -= dt;
				this.rainT -= dt;
				if (this.rainT <= 0) {
					this.rainT = 0.16;
					s.bananas.fromSky();
				}
			}
			// power-up bubbles
			this.powerT -= dt;
			if (this.powerT <= 0) {
				this.powerT = (this.phase === 'hunt' ? 12 : 10) + Math.random() * 4;
				if (s.powerups.active < 2) s.powerups.spawn(s.monkeys);
			}
			// the palms drop the odd coconut once the chaos starts
			if (this.phase !== 'hunt') {
				this.palmT -= dt;
				if (this.palmT <= 0) {
					this.palmT = 5 + Math.random() * 4;
					const m = s.monkeys[Math.floor(Math.random() * n)];
					const a = Math.random() * Math.PI * 2;
					const x = m.x + Math.cos(a) * 80;
					const y = m.y + Math.sin(a) * 80;
					if (s.L.isFree(x, y, 20)) s.traps.coconut(x, y, 1.5);
				}
			}
			// the last 5 seconds tick
			const left = Math.ceil(this.left);
			if (left <= 5 && left !== this.lastTick && left > 0) {
				this.lastTick = left;
				MM.Sound.sfx.tick(left <= 3);
			}

			return this.t >= this.total;
		}
	}

	MM.Director = Director;
})();
