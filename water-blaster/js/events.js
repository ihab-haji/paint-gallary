/* Water Blaster Arena: surprises (EventManager). One short event at a time, announced with a card, a sting and
   the voice, with a quiet gap after it, so the youngest are never swamped.
     storm     a giant sprinkler pops up and sprays round and round
     cannon    a water cannon on the pool sweeps a thick stream across the arena
     slippery  the whole floor gets wet: everyone slides
     balloons  water balloons fall on circles that show where they will land
     rush      water bottles everywhere
     wave      a big wave crosses the top or the bottom half (shown first): run to the other half!
   Everything an event makes is removed when it ends, and all of it lives in the scene (a restart cleans up). */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const ORDER = ['storm', 'wave', 'rush', 'balloons', 'cannon', 'slippery'];

	class Events {
		constructor(scene, L, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.cur = null;
			this.t = 11; // the first surprise comes a little after the start
			this.deck = [];
			this.objs = [];
		}

		get active() {
			return this.cur ? this.cur.key : null;
		}

		next() {
			if (!this.deck.length) this.deck = Phaser.Utils.Array.Shuffle(ORDER.slice());

			return this.deck.pop();
		}

		update(dt, t, fighters, live) {
			const s = this.scene;
			if (this.cur) {
				this.cur.t -= dt;
				this.cur.tick(dt, t, fighters, live);
				if (this.cur.t <= 0) this.stop();

				return;
			}
			if (s.state !== 'play' && s.state !== 'attract') return;
			this.t -= dt;
			if (this.t <= 0) this.start(this.next());
		}

		start(key) {
			const s = this.scene;
			const ev = this[key]();
			ev.key = key;
			this.cur = ev;
			s.announce(key, ev.icon);
			s.hud.event(key, ev.icon, ev.t);
		}

		stop() {
			if (!this.cur) return;
			if (this.cur.end) this.cur.end();
			this.objs.forEach((o) => {
				this.scene.tweens.killTweensOf(o);
				o.destroy();
			});
			this.objs = [];
			this.cur = null;
			this.scene.slippery = false;
			this.scene.hud.event(null);
			this.t = (this.scene.splashTime ? 9 : 14) + Math.random() * 4;
		}

		keep(o) {
			this.objs.push(o);

			return o;
		}

		/* ---------- the events ---------- */
		storm() {
			const s = this.scene;
			const k = this.k;
			// somewhere open, away from everybody's deck
			const p = this.L.randomFree(70);
			const base = this.keep(s.add.image(p.x, p.y, 'sprinkler').setScale(0).setDepth(p.y));
			const arm = this.keep(s.add.image(p.x, p.y - 8, 'sprinkler-arm').setScale(0).setDepth(p.y + 1));
			s.tweens.add({targets: [base, arm], scale: k, duration: 420, ease: 'Back.easeOut'});
			let ang = 0;
			let acc = 0;

			return {
				t: 7.5, icon: 'sprinkler',
				tick: (dt, time, fighters, live) => {
					ang += dt * 2.4;
					arm.setRotation(ang);
					acc += dt * 22;
					while (acc >= 1) {
						acc -= 1;
						[0, Math.PI].forEach((o) => {
							const a = ang + o + (Math.random() - 0.5) * 0.25;
							s.water.spawn({x: p.x + Math.cos(a) * 56, y: p.y + Math.sin(a) * 22 - 8, a, speed: 560, range: 230 + Math.random() * 90, dmg: 1.2, z: 30});
						});
					}
					if (Math.random() < dt * 3) WB.Sound.sfx.splash();
				}
			};
		}

		cannon() {
			const s = this.scene;
			const k = this.k;
			const P = this.L.pool;
			const gun = this.keep(s.add.image(P.x, P.y, 'cannon').setOrigin(54 / 160, 56 / 110).setScale(0).setDepth(P.y + 40));
			s.tweens.add({targets: gun, scale: k * 1.1, duration: 500, ease: 'Back.easeOut'});
			WB.Sound.sfx.cannon();
			let ang = Math.random() * Math.PI * 2;
			const dirSpin = Math.random() < 0.5 ? 1 : -1;
			let acc = 0;
			let warm = 1.2; // turns a little before it sprays

			return {
				t: 8, icon: 'cannon',
				tick: (dt) => {
					ang += dt * 0.8 * dirSpin;
					gun.setRotation(ang).setFlipY(Math.cos(ang) < 0);
					if (warm > 0) {
						warm -= dt;

						return;
					}
					acc += dt * 30;
					while (acc >= 1) {
						acc -= 1;
						const a = ang + (Math.random() - 0.5) * 0.16;
						s.water.spawn({x: P.x + Math.cos(ang) * 100, y: P.y + Math.sin(ang) * 46, a, speed: 820, range: 520 + Math.random() * 60, dmg: 1.15, size: 1.4, z: 40});
					}
					if (Math.random() < dt * 2) WB.Sound.sfx.splash();
				}
			};
		}

		slippery() {
			const s = this.scene;
			s.slippery = true;
			// a shiny film all over the floor
			const sheen = this.keep(s.add.rectangle(this.L.W / 2, this.L.H / 2, this.L.W, this.L.H, 0x7fd8ff, 0).setDepth(-7000));
			s.tweens.add({targets: sheen, fillAlpha: 0.2, duration: 600});
			for (let i = 0; i < 14; i++) {
				const p = this.L.randomFree(30);
				s.fx.puddle(p.x, p.y, 1.4);
			}
			WB.Sound.sfx.slip();

			return {
				t: 8, icon: 'puddle-a',
				tick: (dt, time) => {
					sheen.fillAlpha = 0.14 + Math.sin(time * 4) * 0.05;
				}
			};
		}

		balloons() {
			const s = this.scene;
			const k = this.k;
			let next = 0.2;
			let n = 0;

			return {
				t: 7.5, icon: 'balloon-0',
				tick: (dt, time, fighters, live) => {
					next -= dt;
					if (next > 0 || n >= 12) return;
					next = 0.45;
					n++;
					// half of them aim near someone, the rest anywhere (so standing still never works)
					const alive = fighters.filter((f) => !f.out);
					let p = this.L.randomFree(40);
					if (alive.length && Math.random() < 0.5) {
						const f = alive[Math.floor(Math.random() * alive.length)];
						p = {x: f.x + (Math.random() - 0.5) * 160, y: f.y + (Math.random() - 0.5) * 100};
					}
					const mark = this.keep(s.add.image(p.x, p.y, 'target').setScale(k * 0.3).setDepth(-60).setAlpha(0));
					s.tweens.add({targets: mark, scale: k, alpha: 1, duration: 300});
					const b = this.keep(s.add.image(p.x, p.y - 620, `balloon-${n % 5}`).setScale(k * 1.4).setDepth(p.y + 600));
					WB.Sound.sfx.balloon();
					s.tweens.add({
						targets: b, y: p.y - 20, duration: 1100, ease: 'Quad.easeIn',
						onUpdate: () => b.setRotation(Math.sin(b.y * 0.03) * 0.2),
						onComplete: () => {
							b.setVisible(false);
							mark.setVisible(false);
							WB.Sound.sfx.splash();
							s.fx.burst(p.x, p.y - 10, 'big', 16);
							s.fx.ring(p.x, p.y, 1.3);
							s.fx.puddle(p.x, p.y, 1.3);
							s.fighters.forEach((f) => {
								if (!f.out && Math.hypot(f.x - p.x, (f.y - p.y) * 1.3) < 84) f.soak(s.live ? 9 : 3, f.x, f.y - 60);
							});
						}
					});
				}
			};
		}

		rush() {
			for (let i = 0; i < 6; i++) this.scene.time.delayedCall(i * 160, () => this.scene.pickups.spawn('bottle'));

			return {t: 4, icon: 'bottle', tick() {}};
		}

		wave() {
			const s = this.scene;
			const k = this.k;
			const L = this.L;
			const topHalf = Math.random() < 0.5;
			const y0 = topHalf ? 0 : L.H / 2;
			const fromLeft = Math.random() < 0.5;
			// first: the half that will be hit flashes, with arrows pointing the way the wave goes
			const warn = this.keep(s.add.rectangle(L.W / 2, y0 + L.H / 4, L.W, L.H / 2, 0x1f86d6, 0.0).setDepth(-6000));
			s.tweens.add({targets: warn, fillAlpha: 0.22, duration: 300, yoyo: true, repeat: 2});
			const arrows = [0.3, 0.5, 0.7].map((f) => this.keep(s.add.image(L.W * f, y0 + L.H / 4, 'arrow-wave').setScale(k * 1.6).setDepth(8600).setFlipX(!fromLeft)));
			arrows.forEach((a, i) => s.tweens.add({targets: a, x: a.x + (fromLeft ? 40 : -40), alpha: {from: 1, to: 0.3}, duration: 400, yoyo: true, repeat: 3, delay: i * 80}));
			const img = this.keep(s.add.image(fromLeft ? -200 : L.W + 200, y0 + L.H / 4, 'wave').setScale(k, k).setDepth(7000).setFlipX(!fromLeft).setVisible(false));
			const hit = new Set();
			let delay = 1.7;
			let x = fromLeft ? -200 : L.W + 200;
			const speed = (L.W + 400) / 2.6;
			let started = false;

			return {
				t: 1.7 + 2.9, icon: 'icon-wave', topHalf,
				tick: (dt, time, fighters, live) => {
					if (delay > 0) {
						delay -= dt;

						return;
					}
					if (!started) {
						started = true;
						arrows.forEach((a) => a.setVisible(false));
						img.setVisible(true);
						WB.Sound.sfx.wave();
					}
					x += speed * dt * (fromLeft ? 1 : -1);
					img.setPosition(x, y0 + L.H / 4 + Math.sin(time * 8) * 6);
					const front = x + (fromLeft ? -100 : 100);
					if (Math.random() < dt * 30) s.fx.burst(front + (fromLeft ? 20 : -20), y0 + Math.random() * L.H / 2, 'splash', 2);
					for (const f of fighters) {
						if (f.out || hit.has(f)) continue;
						const inHalf = topHalf ? f.y < L.H / 2 + 10 : f.y > L.H / 2 - 10;
						if (inHalf && Math.abs(f.x - front) < 70) {
							hit.add(f);
							f.soak(live ? 14 : 4, f.x, f.y - 60);
							f.vx += (fromLeft ? 1 : -1) * 520;
							s.fx.burst(f.x, f.y - 60, 'big', 14);
							WB.Sound.sfx.ouch(f.pitch);
						}
					}
				}
			};
		}

		clear() {
			if (this.cur) this.stop();
		}
	}

	WB.Events = Events;
})();
