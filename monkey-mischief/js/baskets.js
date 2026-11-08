/* Monkey Mischief: baskets and scoring. A monkey's score is the bananas in their basket.
   - Deposit: stand at your own basket and the bananas on your head hop in one by one.
   - Steal: stand at someone else's basket; after a short moment one banana hops onto your head.
     At most 2 per visit, then that basket "snaps shut" for you for a few seconds (nobody loses everything).
     The owner hears an alarm, their corner flashes, and an arrow on their monkey points at the thief.
   - Catch: if the owner touches the thief, every banana stolen from them flies straight back home. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const REACH = 82; // how close to a basket counts as "at the basket"
	const STEAL_WAIT = 0.55;
	const STEAL_MAX = 2;
	const STEAL_COOL = 4.5;
	// banana pile on top of a basket: up to 12 small bananas in a little mound
	const PILE = [[-26, -4], [-9, -6], [9, -6], [26, -4], [-18, -14], [0, -16], [18, -14], [-9, -24], [9, -24], [0, -32], [-28, -16], [28, -16]];

	class Baskets {
		constructor(scene, L, monkeys, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.list = monkeys.map((m) => {
				const c = L.corners[m.slot];
				const b = {
					owner: m, x: c.basket.x, y: c.basket.y + 18, corner: c,
					img: scene.add.image(c.basket.x, c.basket.y + 18, `basket-${m.player.id}`).setOrigin(0.5, 0.92).setScale(k).setDepth(c.basket.y + 18),
					pile: PILE.map(([dx, dy]) => scene.add.image(c.basket.x + dx, c.basket.y + 18 - 52 + dy, 'mini-banana').setScale(k).setRotation(dx * 0.012).setDepth(c.basket.y + 19).setVisible(false)),
					alert: scene.add.image(c.basket.x, c.basket.y - 70, 'alert').setScale(k).setDepth(c.basket.y + 200).setVisible(false),
					visits: new Map(), // thief idx -> {wait, taken, cool}
					depositT: 0,
					alertT: 0,
					shown: 0
				};

				return b;
			});
			this.flyers = Array.from({length: 24}, () => scene.add.image(0, 0, 'mini-banana').setScale(k * 1.3).setDepth(7000).setVisible(false));
			this.fi = 0;
			this.lastThiefVoice = -99;
		}

		of(m) {
			return this.list.find((b) => b.owner === m);
		}

		// a banana hops in an arc from one place to another (deposits, thefts, the gorilla's snack)
		fly(x0, y0, x1, y1, done, delay = 0) {
			const f = this.flyers[this.fi++ % this.flyers.length];
			this.scene.tweens.killTweensOf(f);
			f.setVisible(true).setPosition(x0, y0).setAlpha(1).setScale(this.k * 1.3);
			const h = Math.min(160, 60 + Math.hypot(x1 - x0, y1 - y0) * 0.3);
			const o = {t: 0};
			this.scene.tweens.add({
				targets: o, t: 1, duration: 380, delay, ease: 'Sine.easeInOut',
				onUpdate: () => {
					const t = o.t;
					f.setPosition(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * h).setRotation(t * 6);
				},
				onComplete: () => {
					f.setVisible(false);
					if (done) done();
				}
			});
		}

		addScore(m, n, fromX, fromY) {
			const b = this.of(m);
			for (let i = 0; i < n; i++) {
				this.fly(fromX, fromY, b.x, b.y - 46, () => {
					m.score++;
					MM.Sound.sfx.deposit(m.score);
					this.bump(b);
					this.scene.hud.score(m);
				}, i * 70);
			}
		}

		bump(b) {
			this.scene.tweens.killTweensOf(b.img);
			b.img.setScale(this.k);
			this.scene.tweens.add({targets: b.img, scaleX: this.k * 1.12, scaleY: this.k * 0.9, duration: 90, yoyo: true, ease: 'Quad.easeOut'});
		}

		shake(b) {
			this.scene.tweens.add({targets: b.img, angle: {from: -8, to: 8}, duration: 70, yoyo: true, repeat: 3, onComplete: () => b.img.setAngle(0)});
		}

		returnStolen(owner, thief) {
			const back = thief.carry.filter((from) => from === owner.idx).length;
			if (!back) return false;
			thief.carry = thief.carry.filter((from) => from !== owner.idx);
			thief.setExpr('oops', 1.2);
			owner.setExpr('happy', 1.2);
			owner.chase = null;
			this.addScore(owner, back, thief.x, thief.y - 120);
			MM.Sound.sfx.gotBack();
			this.scene.fx.burst(thief.x, thief.y - 60, 'star', 12, owner.color);
			this.scene.fx.pop(thief.x, thief.y - 150, `+${back}`, owner.player.color, 40, owner.top);
			this.scene.say('caught');

			return true;
		}

		update(dt, monkeys, playing) {
			for (const b of this.list) {
				// the banana pile shows the score (up to 12 bananas, then it is simply full)
				const show = Math.min(PILE.length, b.owner.score);
				if (show !== b.shown) {
					b.pile.forEach((p, i) => p.setVisible(i < show));
					b.shown = show;
				}
				if (b.alertT > 0) {
					b.alertT -= dt;
					b.alert.setVisible(true).setScale(this.k * (1 + Math.abs(Math.sin(b.alertT * 9)) * 0.25));
					if (b.alertT <= 0) b.alert.setVisible(false);
				}
				if (!playing) continue;
				for (const m of monkeys) {
					const d = Math.hypot(m.x - b.x, m.y - (b.y - 20));
					if (m === b.owner) {
						// deposit, one banana every 0.1 s
						if (d < REACH && m.carry.length && m.canAct) {
							b.depositT -= dt;
							if (b.depositT <= 0) {
								b.depositT = 0.1;
								m.carry.pop();
								m.setExpr('happy', 0.8);
								this.fly(m.x, m.y - 110, b.x, b.y - 46, () => {
									m.score++;
									MM.Sound.sfx.deposit(m.score);
									this.bump(b);
									this.scene.hud.score(m);
									if (!m.carry.length) {
										this.scene.fx.burst(b.x, b.y - 50, 'sparkle', 10, m.color);
										MM.Sound.sfx.monkey(m.pitch, 2);
									}
								});
							}
						} else {
							b.depositT = 0;
						}
						continue;
					}
					// stealing
					let v = b.visits.get(m.idx);
					if (!v) {
						v = {wait: 0, taken: 0, cool: 0};
						b.visits.set(m.idx, v);
					}
					if (v.cool > 0) {
						v.cool -= dt;
						continue;
					}
					if (d < REACH && b.owner.score > 0 && !m.full && m.canAct && !m.air) {
						v.wait += dt;
						if (v.wait >= STEAL_WAIT) {
							v.wait = 0.2; // the next one comes a little quicker
							v.taken++;
							b.owner.score--;
							this.scene.hud.score(b.owner, true);
							m.addCarry(b.owner.idx);
							m.setExpr('happy', 0.8);
							this.fly(b.x, b.y - 46, m.x, m.y - 110);
							MM.Sound.sfx.steal();
							this.alarm(b, m);
							if (v.taken >= STEAL_MAX) {
								v.cool = STEAL_COOL;
								v.taken = 0;
								v.wait = 0;
								this.shake(b);
							}
						}
					} else if (d >= REACH) {
						v.wait = 0;
						v.taken = 0;
					}
				}
			}
		}

		alarm(b, thief) {
			b.alertT = 2.6;
			this.shake(b);
			b.owner.chase = {target: thief, t: 6};
			b.owner.setExpr('oops', 1);
			MM.Sound.sfx.alarm();
			this.scene.hud.flash(b.owner.slot);
			const now = this.scene.time.now / 1000;
			if (now - this.lastThiefVoice > 9) {
				this.lastThiefVoice = now;
				this.scene.say('thief');
			}
		}
	}

	MM.Baskets = Baskets;
})();
