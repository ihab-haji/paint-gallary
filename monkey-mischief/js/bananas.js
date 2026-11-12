/* Monkey Mischief: bananas. A fixed pool (no new objects while playing).
   A banana can be in the air (falling from a tree or the sky, or knocked out of a monkey's hands: it arcs,
   bounces and lands on dry ground) or lying on the ground, bobbing, waiting to be grabbed.
   The golden banana is special: it glows, has a countdown ring, and goes straight into the basket (+5). */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const POOL = 64;
	const GRAVITY = 1700;
	const GOLD_LIFE = 9;
	const SIZE = 1.12; // a banana on the ground, compared with the drawing
	const REACH = 104; // a banana this close to a monkey with free hands slides to it

	class Bananas {
		constructor(scene, L, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.list = Array.from({length: POOL}, () => ({
				on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, phase: Math.random() * 6,
				img: scene.add.image(0, 0, 'banana').setScale(k).setVisible(false),
				sh: scene.add.image(0, 0, 'shadow').setScale(k * 0.5).setVisible(false)
			}));
			this.gold = {
				on: false, x: 0, y: 0, t: 0,
				img: scene.add.image(0, 0, 'banana-gold').setScale(k).setVisible(false),
				sh: scene.add.image(0, 0, 'shadow').setScale(k * 0.7).setVisible(false),
				ring: scene.add.graphics(),
				beam: scene.add.rectangle(0, 0, 70, 900, 0xfff3a0, 0.0).setOrigin(0.5, 1).setVisible(false)
			};
		}

		get count() {
			let n = 0;
			for (const b of this.list) if (b.on) n++;

			return n;
		}

		spawn(x, y, {z = 0, vx = 0, vy = 0, vz = 0} = {}) {
			const b = this.list.find((q) => !q.on);
			if (!b) return null;
			Object.assign(b, {on: true, x, y, z, vx, vy, vz});
			b.img.setVisible(true).setAlpha(1).setScale(this.k * SIZE);
			b.sh.setVisible(true);

			return b;
		}

		// from the sky: a banana falls on a random dry spot
		fromSky(spot) {
			const p = spot || this.L.randomFree();

			return this.spawn(p.x, p.y, {z: 520 + Math.random() * 200, vz: -200});
		}

		// knocked out of a monkey's arms: they fly up and outward
		scatter(x, y, n) {
			for (let i = 0; i < n; i++) {
				const a = Math.random() * Math.PI * 2;
				const sp = 120 + Math.random() * 120;
				this.spawn(x, y, {z: 60, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, vz: 420 + Math.random() * 200});
			}
		}

		remove(b) {
			b.on = false;
			b.img.setVisible(false);
			b.sh.setVisible(false);
		}

		clearAll() {
			this.list.forEach((b) => this.remove(b));
			this.endGold(false);
		}

		/* ---------- the golden banana ---------- */
		startGold() {
			const g = this.gold;
			const p = this.L.randomFree(Math.random, 50);
			Object.assign(g, {on: true, x: p.x, y: p.y, t: GOLD_LIFE});
			g.img.setVisible(true).setScale(0).setAlpha(1);
			g.sh.setVisible(true);
			this.scene.tweens.add({targets: g.img, scale: this.k * 1.15, duration: 600, ease: 'Back.easeOut'});
			g.beam.setVisible(true).setPosition(p.x, p.y).setAlpha(0.55).setScale(1, 1);
			this.scene.tweens.add({targets: g.beam, alpha: 0, scaleX: 0.2, duration: 1600, ease: 'Quad.easeIn'});
			this.scene.fx.burst(p.x, p.y - 30, 'sparkle', 18, 0xffe14d);
			MM.Sound.sfx.golden();

			return g;
		}

		endGold(poof = true) {
			const g = this.gold;
			if (!g.on) return;
			g.on = false;
			if (poof) this.scene.fx.burst(g.x, g.y - 20, 'puff', 10, 0xfff3a0);
			g.img.setVisible(false);
			g.sh.setVisible(false);
			g.beam.setVisible(false);
			g.ring.clear();
		}

		/* ---------- every frame ---------- */
		update(dt, time, monkeys) {
			const L = this.L;
			// magnets pull nearby bananas lying on the ground
			const magnets = monkeys.filter((m) => m.power && m.power.kind === 'magnet' && !m.full);
			// a banana right next to a monkey slides the last little bit: no pixel-perfect steering needed
			const st = this.scene.state;
			const hands = st === 'play' || st === 'attract' ? monkeys.filter((m) => m.canAct && !m.full && !m.air) : [];
			for (const b of this.list) {
				if (!b.on) continue;
				if (b.z > 0 || b.vz > 0) {
					b.vz -= GRAVITY * dt;
					b.z += b.vz * dt;
					b.x += b.vx * dt;
					b.y += b.vy * dt;
					if (b.z <= 0) {
						b.z = 0;
						if (b.vz < -260) {
							b.vz = -b.vz * 0.35; // bounce
							b.vx *= 0.6;
							b.vy *= 0.6;
						} else {
							b.vz = 0;
							b.vx = 0;
							b.vy = 0;
							// landed in water or on a rock? hop to the nearest dry spot
							if (!L.isFree(b.x, b.y, 14)) {
								const p = L.nearestFree(b.x, b.y, 18);
								b.vx = (p.x - b.x) * 2.2;
								b.vy = (p.y - b.y) * 2.2;
								b.vz = 380;
								b.z = 1;
								if (L.inPond(b.x, b.y)) MM.Sound.sfx.splash();
							}
						}
					}
				} else {
					for (const m of hands) {
						const dx = m.x - b.x;
						const dy = m.y + 6 - b.y;
						const d = Math.hypot(dx, dy);
						if (d < REACH && d > 1) {
							const pull = (160 + 260 * (1 - d / REACH)) * dt;
							b.x += (dx / d) * pull;
							b.y += (dy / d) * pull;
						}
					}
					for (const m of magnets) {
						const dx = m.x - b.x;
						const dy = m.y - b.y;
						const d = Math.hypot(dx, dy);
						if (d < 240 && d > 1) {
							const pull = 520 * dt;
							b.x += (dx / d) * pull;
							b.y += (dy / d) * pull;
						}
					}
				}
				// keep inside the arena
				b.x = Math.max(50, Math.min(L.W - 50, b.x));
				b.y = Math.max(50, Math.min(L.H - 50, b.y));
				const bob = b.z > 0 ? 0 : Math.sin(time * 3 + b.phase) * 3;
				b.img.setPosition(b.x, b.y - 14 - b.z - bob).setDepth(b.y).setRotation(b.z > 0 ? b.vz * 0.004 : Math.sin(time * 2 + b.phase) * 0.12);
				// a slow "look at me" pulse while it waits on the ground
				b.img.setScale(this.k * SIZE * (b.z > 0 ? 1 : 1 + Math.sin(time * 4 + b.phase) * 0.06));
				b.sh.setPosition(b.x, b.y).setDepth(b.y - 3).setScale(this.k * Math.max(0.2, 0.72 - b.z / 1100));
			}
			const g = this.gold;
			if (g.on) {
				g.t -= dt;
				const s = this.k * (1.1 + Math.sin(time * 6) * 0.07);
				g.img.setPosition(g.x, g.y - 22 + Math.sin(time * 4) * 5).setDepth(g.y).setScale(s).setRotation(Math.sin(time * 3) * 0.15);
				g.img.setAlpha(g.t < 2.5 ? 0.55 + 0.45 * Math.sin(time * 24) : 1);
				g.sh.setPosition(g.x, g.y).setDepth(g.y - 3);
				g.ring.clear().setDepth(g.y - 2);
				g.ring.lineStyle(7, 0x3b2416, 0.8).strokeCircle(g.x, g.y - 20, 50);
				g.ring.lineStyle(5, 0xffd23f, 1).beginPath();
				g.ring.arc(g.x, g.y - 20, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (g.t / GOLD_LIFE));
				g.ring.strokePath();
				if (Math.random() < 0.12) this.scene.fx.burst(g.x + (Math.random() - 0.5) * 50, g.y - 30, 'sparkle', 1, 0xffe14d);
				if (g.t <= 0) this.endGold(true);
			}
		}

		// bananas a monkey can grab right now (on or near the ground)
		near(x, y, r) {
			const out = [];
			for (const b of this.list) if (b.on && b.z < 24 && Math.hypot(b.x - x, b.y - y) < r) out.push(b);

			return out;
		}

		nearest(x, y, avoid) {
			let best = null;
			let bd = Infinity;
			for (const b of this.list) {
				if (!b.on || b.z > 200) continue;
				if (avoid && avoid(b)) continue;
				const d = Math.hypot(b.x - x, b.y - y);
				if (d < bd) {
					bd = d;
					best = b;
				}
			}

			return best;
		}
	}

	MM.Bananas = Bananas;
})();
