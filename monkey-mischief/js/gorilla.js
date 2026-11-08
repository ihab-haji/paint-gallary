/* Monkey Mischief: the big gorilla. Goofy, not scary: he stomps in, chases whoever is carrying the most
   bananas, and if he catches them he gobbles up to 3 of the bananas on their head (never the basket),
   then waves goodbye after about 11 seconds. He wades straight through the pond, slower and splashing.
   He is a little slower than a monkey, so a child who runs always gets away. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const SPEED = 172;
	const LIFE = 11;

	class Gorilla {
		constructor(scene, L, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.on = false;
			this.sprite = scene.add.image(0, 0, 'gorilla-chase').setOrigin(0.5, 0.95).setScale(k).setVisible(false);
			this.shadow = scene.add.image(0, 0, 'shadow').setScale(k * 2.4, k * 2).setVisible(false);
		}

		start() {
			const L = this.L;
			const left = Math.random() < 0.5;
			this.x = left ? -140 : L.W + 140;
			this.y = L.H / 2 + (Math.random() < 0.5 ? -170 : 170);
			this.state = 'enter';
			this.t = LIFE;
			this.eatT = 0;
			this.stompT = 0;
			this.retarget = 0;
			this.target = null;
			this.facing = left ? 1 : -1;
			this.walk = 0;
			this.on = true;
			this.sprite.setVisible(true).setTexture('gorilla-chase');
			this.shadow.setVisible(true);
			MM.Sound.sfx.roar();
			this.scene.fx.shake(0.008, 500);
		}

		stop() {
			this.on = false;
			this.sprite.setVisible(false);
			this.shadow.setVisible(false);
		}

		pick(monkeys) {
			const ok = monkeys.filter((m) => m.state === 'ok');
			if (!ok.length) return null;
			const most = Math.max(...ok.map((m) => m.carry.length));
			const pool = most > 0 ? ok.filter((m) => m.carry.length === most) : ok.filter((m) => m.score === Math.max(...ok.map((q) => q.score)));
			// stay on the current target if it is still one of the best (no flip-flopping)
			if (this.target && pool.includes(this.target)) return this.target;

			return pool[Math.floor(Math.random() * pool.length)];
		}

		update(dt, time, monkeys) {
			if (!this.on) return;
			const L = this.L;
			this.t -= dt;
			if (this.t <= 0 && this.state !== 'leave') {
				this.state = 'leave';
				this.sprite.setTexture('gorilla-eat');
				this.scene.say('gorillaBye');
			}
			let tx;
			let ty;
			if (this.state === 'leave') {
				tx = this.x < L.W / 2 ? -200 : L.W + 200;
				ty = this.y;
				if (this.x < -160 || this.x > L.W + 160) {
					this.stop();

					return;
				}
			} else {
				this.retarget -= dt;
				if (this.retarget <= 0 || !this.target) {
					this.retarget = 1;
					this.target = this.pick(monkeys);
				}
				if (this.state === 'enter' && this.x > 120 && this.x < L.W - 120) this.state = 'chase';
				tx = this.target ? this.target.x : L.W / 2;
				ty = this.target ? this.target.y : L.H / 2;
			}

			if (this.eatT > 0) {
				this.eatT -= dt;
				if (this.eatT <= 0 && this.state !== 'leave') this.sprite.setTexture('gorilla-chase');
			} else {
				const dx = tx - this.x;
				const dy = ty - this.y;
				const d = Math.hypot(dx, dy);
				const wet = L.inPond(this.x, this.y, -10);
				const sp = SPEED * (wet ? 0.6 : 1) * (this.state === 'leave' ? 1.3 : 1);
				if (d > 4) {
					this.x += (dx / d) * sp * dt;
					this.y += (dy / d) * sp * dt;
					if (Math.abs(dx) > 8) this.facing = dx > 0 ? 1 : -1;
					this.walk += dt * 7;
				}
				this.stompT -= dt;
				if (this.stompT <= 0) {
					this.stompT = 0.48;
					MM.Sound.sfx.stomp();
					this.scene.fx.shake(0.0025, 90);
					this.scene.fx.burst(this.x, this.y, wet ? 'drop' : 'puff', wet ? 8 : 4, wet ? 0x9fe0ff : 0xf2d59b);
				}
				// catch!
				if (this.state === 'chase') {
					for (const m of monkeys) {
						if (m.air || m.invuln > 0 || Math.hypot(m.x - this.x, m.y - this.y) > 66) continue;
						this.grab(m);
						break;
					}
				}
			}

			const bob = Math.abs(Math.sin(this.walk)) * 8;
			this.sprite.setPosition(this.x, this.y - bob).setDepth(this.y).setFlipX(this.facing < 0);
			this.sprite.setScale(this.k * (1 + bob * 0.004), this.k * (1 - bob * 0.004));
			this.shadow.setPosition(this.x, this.y).setDepth(this.y - 2);
		}

		grab(m) {
			const scene = this.scene;
			const eaten = m.takeCarry(3);
			const a = Math.atan2(m.y - this.y, m.x - this.x);
			m.knock(Math.cos(a) * 520, Math.sin(a) * 520);
			m.invuln = 2.8;
			if (eaten.length) {
				m.stun(0.8);
				m.invuln = 2.8;
				this.eatT = 1.3;
				this.sprite.setTexture('gorilla-eat');
				eaten.forEach((_, i) => scene.baskets.fly(m.x, m.y - 110, this.x, this.y - 120, null, i * 90));
				MM.Sound.sfx.chomp();
				scene.fx.pop(this.x, this.y - 230, `-${eaten.length}`, '#ffffff', 44, m.top);
				this.target = null;
				this.retarget = 0;
			} else {
				m.setExpr('oops', 1);
				this.eatT = 0.5;
			}
			MM.Sound.sfx.roar();
			MM.Sound.sfx.monkey(m.pitch * 1.4, 3);
		}

		// how scary is this spot? (the bot keeps away)
		near(x, y, r) {
			return this.on && this.state !== 'leave' && Math.hypot(x - this.x, y - this.y) < r;
		}
	}

	MM.Gorilla = Gorilla;
})();
