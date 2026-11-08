/* Monkey Mischief: traps and hazards.
   - Banana peels: dropped behind a monkey by its trick button (3 at a time, one comes back every 7 s).
     Anyone else who steps on one slips, spins, and drops up to 2 bananas. Your own peels never trip you.
   - Slippery bomb (a power-up): thrown ahead, it bursts into a big slippery puddle for 6 seconds.
   - Coconuts: a red target appears, beeps, then a coconut drops there. Bonk = a short dizzy moment, 1 banana dropped.
   Every hazard is forgiving: after a slip or a bonk the monkey blinks and is safe for a moment. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const PEEL_LIFE = 28;
	const SLICK_LIFE = 6;
	const WARN = 1.3;
	const FALL = 0.36;

	class Traps {
		constructor(scene, L, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.peels = Array.from({length: 18}, () => ({on: false, owner: null, x: 0, y: 0, age: 0, img: scene.add.image(0, 0, 'peel').setScale(k).setVisible(false)}));
			this.slicks = Array.from({length: 4}, () => ({on: false, owner: null, x: 0, y: 0, t: 0, img: scene.add.image(0, 0, 'slick').setScale(k).setVisible(false)}));
			this.bombs = Array.from({length: 4}, () => scene.add.image(0, 0, 'icon-bomb').setScale(k).setVisible(false).setDepth(6000));
			this.coconuts = Array.from({length: 14}, () => ({
				on: false, x: 0, y: 0, t: 0, phase: 'warn', beep: 0,
				target: scene.add.image(0, 0, 'target').setScale(k).setVisible(false),
				nut: scene.add.image(0, 0, 'coconut').setScale(k * 1.2).setVisible(false),
				sh: scene.add.image(0, 0, 'shadow').setScale(k * 0.6).setVisible(false)
			}));
		}

		/* ---------- peels ---------- */
		dropPeel(m) {
			if (m.peels <= 0) {
				MM.Sound.sfx.full();

				return false;
			}
			const mine = this.peels.filter((p) => p.on && p.owner === m);
			if (mine.length >= 3) this.removePeel(mine.sort((a, b) => b.age - a.age)[0]);
			const p = this.peels.find((q) => !q.on);
			if (!p) return false;
			m.peels--;
			m.peelT = 0;
			let x = m.x - m.facing * 34;
			let y = m.y + 10;
			if (this.L.inWater(x, y)) {
				x = m.x;
				y = m.y + 10;
			}
			Object.assign(p, {on: true, owner: m, x, y, age: 0});
			p.img.setVisible(true).setPosition(m.x, m.y - 60).setScale(this.k * 0.5).setAlpha(1).setDepth(y - 4).setRotation(Math.random() * 0.6 - 0.3);
			this.scene.tweens.add({targets: p.img, x, y, scale: this.k, duration: 260, ease: 'Back.easeOut'});
			MM.Sound.sfx.peel();
			m.setExpr('happy', 0.6);

			return true;
		}

		removePeel(p, fling = false) {
			p.on = false;
			if (fling) {
				this.scene.tweens.add({
					targets: p.img, y: p.y - 90, angle: 540, alpha: 0, scale: this.k * 0.6, duration: 600, ease: 'Quad.easeOut',
					onComplete: () => p.img.setVisible(false)
				});
			} else {
				p.img.setVisible(false);
			}
		}

		/* ---------- slippery bomb ---------- */
		throwBomb(m) {
			const s = this.slicks.find((q) => !q.on) || this.slicks[0];
			const bomb = this.bombs.find((b) => !b.visible) || this.bombs[0];
			const sp = Math.hypot(m.vx, m.vy);
			const dx = sp > 40 ? m.vx / sp : m.facing;
			const dy = sp > 40 ? m.vy / sp : 0;
			const tx = Math.max(140, Math.min(this.L.W - 140, m.x + dx * 190));
			const ty = Math.max(120, Math.min(this.L.H - 120, m.y + dy * 190));
			bomb.setVisible(true).setPosition(m.x, m.y - 90).setScale(this.k);
			MM.Sound.sfx.throwIt();
			const o = {t: 0};
			const x0 = m.x;
			const y0 = m.y - 90;
			this.scene.tweens.add({
				targets: o, t: 1, duration: 520, ease: 'Sine.easeIn',
				onUpdate: () => bomb.setPosition(x0 + (tx - x0) * o.t, y0 + (ty - y0) * o.t - Math.sin(o.t * Math.PI) * 150).setRotation(o.t * 9),
				onComplete: () => {
					bomb.setVisible(false);
					Object.assign(s, {on: true, owner: m, x: tx, y: ty, t: SLICK_LIFE});
					s.img.setVisible(true).setPosition(tx, ty).setScale(0).setAlpha(1).setDepth(ty - 60);
					this.scene.tweens.add({targets: s.img, scale: this.k, duration: 380, ease: 'Back.easeOut'});
					MM.Sound.sfx.splat();
					this.scene.fx.burst(tx, ty, 'drop', 16, 0xffe14d);
					this.scene.fx.shake(0.004, 160);
				}
			});
		}

		/* ---------- coconuts ---------- */
		coconut(x, y, warn = WARN) {
			const c = this.coconuts.find((q) => !q.on);
			if (!c) return;
			Object.assign(c, {on: true, x, y, t: warn, phase: 'warn', beep: 0});
			c.target.setVisible(true).setPosition(x, y).setScale(0).setAlpha(1).setDepth(y - 5);
			this.scene.tweens.add({targets: c.target, scale: this.k, duration: 300, ease: 'Back.easeOut'});
			c.sh.setVisible(true).setPosition(x, y).setScale(this.k * 0.1).setDepth(y - 4).setAlpha(0.8);
			c.nut.setVisible(false).setAlpha(1).setTexture('coconut').setRotation(0);
		}

		clearAll() {
			this.peels.forEach((p) => this.removePeel(p));
			this.slicks.forEach((s) => {
				s.on = false;
				s.img.setVisible(false);
			});
			this.coconuts.forEach((c) => {
				c.on = false;
				c.target.setVisible(false);
				c.nut.setVisible(false);
				c.sh.setVisible(false);
			});
		}

		/* ---------- every frame ---------- */
		update(dt, time, monkeys) {
			const scene = this.scene;
			for (const p of this.peels) {
				if (!p.on) continue;
				p.age += dt;
				if (p.age > PEEL_LIFE) {
					this.scene.tweens.add({targets: p.img, alpha: 0, duration: 400, onComplete: () => p.img.setVisible(false)});
					p.on = false;
					continue;
				}
				if (p.age < 0.35) continue;
				for (const m of monkeys) {
					if (m === p.owner || !m.canAct || m.air) continue;
					if (Math.hypot(m.x - p.x, m.y + 10 - p.y) < 32) {
						const slipped = m.slip();
						if (slipped) {
							scene.dropFrom(m, 2);
							scene.fx.pop(m.x, m.y - 150, '!', '#ffe14d', 52, m.top);
						}
						if (slipped || m.invuln > 0) this.removePeel(p, true);
						break;
					}
				}
			}
			for (const s of this.slicks) {
				if (!s.on) continue;
				s.t -= dt;
				if (s.t < 1) s.img.setAlpha(Math.max(0, s.t));
				if (s.t <= 0) {
					s.on = false;
					s.img.setVisible(false);
					continue;
				}
				for (const m of monkeys) {
					if (m === s.owner || !m.canAct || m.air || m.slickT > 0) continue;
					if (((m.x - s.x) / 115) ** 2 + ((m.y - s.y) / 85) ** 2 < 1 && m.slip()) {
						m.slickT = 1.8;
						scene.dropFrom(m, 1);
					}
				}
			}
			for (const c of this.coconuts) {
				if (!c.on) continue;
				c.t -= dt;
				if (c.phase === 'warn') {
					c.beep -= dt;
					const urgency = 1 - Math.max(0, c.t) / WARN;
					if (c.beep <= 0) {
						c.beep = 0.32 - urgency * 0.2;
						MM.Sound.sfx.warn();
					}
					c.target.setAlpha(0.6 + 0.4 * Math.sin(time * (10 + urgency * 20))).setAngle(time * 90);
					c.sh.setScale(this.k * (0.1 + urgency * 0.6));
					if (c.t <= 0) {
						c.phase = 'fall';
						c.t = FALL;
						c.nut.setVisible(true).setDepth(c.y + 500);
						MM.Sound.sfx.whistle();
					}
				} else if (c.phase === 'fall') {
					const f = Math.max(0, c.t / FALL);
					c.nut.setPosition(c.x, c.y - 14 - f * f * 700).setRotation(f * 6);
					if (c.t <= 0) {
						c.phase = 'done';
						c.t = 1.4;
						c.target.setVisible(false);
						c.sh.setVisible(false);
						c.nut.setTexture('coco-half').setPosition(c.x, c.y - 6).setDepth(c.y).setRotation(0);
						MM.Sound.sfx.bonk();
						scene.fx.burst(c.x, c.y, 'puff', 10, 0xf2d59b);
						scene.fx.shake(0.003, 120);
						for (const m of monkeys) {
							if (m.air || Math.hypot(m.x - c.x, m.y - c.y) > 54) continue;
							if (m.stun(1.0)) {
								scene.dropFrom(m, 1);
								scene.fx.burst(m.x, m.y - 110, 'star', 8, 0xffe14d);
								MM.Sound.sfx.monkey(m.pitch * 1.3, 1);
							}
						}
					}
				} else {
					if (c.t < 0.4) c.nut.setAlpha(c.t / 0.4);
					if (c.t <= 0) {
						c.on = false;
						c.nut.setVisible(false);
					}
				}
			}
		}

		// where the next coconuts will land (the bot steers away)
		danger(x, y, r = 70) {
			return this.coconuts.some((c) => c.on && c.phase !== 'done' && Math.hypot(c.x - x, c.y - y) < r);
		}
	}

	MM.Traps = Traps;
})();
