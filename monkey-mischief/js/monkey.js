/* Monkey Mischief: one monkey. Arcade physics moves an invisible round "feet" zone; the picture, shadow,
   colour ring, banana tower, dizzy stars, shield bubble and power timer all follow it every frame.
   States: ok · slip (spinning on a peel) · stun (bonked) . Jumping is separate (jumpT > 0: flying over things). */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const BASE_SPEED = 265;
	const CARRY_MAX = 5;
	const JUMP_TIME = 0.62;
	const FEET = 14; // from the physics circle's centre down to the feet

	class Monkey {
		constructor(scene, {player, slot, idx, bot = false, x, y, k}) {
			this.scene = scene;
			this.player = player;
			this.slot = slot;
			this.idx = idx;
			this.bot = bot;
			this.k = k;
			this.color = Phaser.Display.Color.HexStringToColor(player.color).color;
			this.pitch = [1.05, 0.92, 1.18, 0.98, 1.1][idx % 5];

			this.zone = scene.add.zone(x, y, 52, 52);
			scene.physics.add.existing(this.zone);
			this.body = this.zone.body;
			this.body.setCircle(26);
			this.body.setCollideWorldBounds(true);
			this.body.setBounce(0.2);
			this.zone.monkey = this;

			this.shadow = scene.add.image(x, y, 'shadow').setScale(k * 0.95, k * 0.95);
			this.ring = scene.add.image(x, y, `ring-${player.id}`).setScale(k * 0.6, k * 0.24).setAlpha(0.95);
			this.sprite = scene.add.image(x, y, `monkey-${player.id}-normal`).setOrigin(0.5, 0.93).setScale(k);
			this.stack = Array.from({length: CARRY_MAX}, () => scene.add.image(x, y, 'mini-banana').setScale(k).setVisible(false));
			this.stars = [0, 1, 2].map(() => scene.add.image(x, y, 'star').setScale(k * 0.75).setVisible(false));
			this.bubble = scene.add.image(x, y, 'shield-bubble').setScale(k * 1.05).setVisible(false).setAlpha(0.9);
			this.powerIcon = scene.add.image(x, y, 'power-speed').setScale(k * 0.42).setVisible(false);
			this.powerRing = scene.add.graphics();
			this.arrow = scene.add.image(x, y, `arrow-${player.id}`).setScale(k * 0.9).setVisible(false);

			this.reset();
		}

		reset() {
			this.vx = 0;
			this.vy = 0;
			this.carry = []; // each banana remembers whose basket it came from (-1 = the wild)
			this.score = 0;
			this.state = 'ok';
			this.stateT = 0;
			this.jumpT = 0;
			this.invuln = 0;
			this.power = null; // {kind, t, dur}
			this.shield = false;
			this.peels = 3;
			this.peelT = 0;
			this.facing = 1;
			this.walk = Math.random() * 6;
			this.expr = 'normal';
			this.exprT = 0;
			this.chase = null; // {target, t}: an arrow points at the thief
			this.spin = 0;
			this.slickT = 0;
			this.speedMul = this.bot ? 0.86 : 1;
			this.stack.forEach((s) => s.setVisible(false));
			this.stars.forEach((s) => s.setVisible(false));
			this.bubble.setVisible(false);
			this.powerIcon.setVisible(false);
			this.powerRing.clear();
			this.arrow.setVisible(false);
		}

		get x() {
			return this.body.center.x;
		}

		get y() {
			return this.body.center.y;
		}

		get full() {
			return this.carry.length >= CARRY_MAX;
		}

		get air() {
			return this.jumpT > 0;
		}

		get canAct() {
			return this.state === 'ok';
		}

		place(x, y) {
			this.body.reset(x, y);
			this.vx = 0;
			this.vy = 0;
		}

		/* ---------- movement (dir from a joystick, finger, keyboard or the bot) ---------- */
		move(dt, dir, slow) {
			const b = this.body;
			if (this.state === 'ok') {
				let speed = BASE_SPEED * this.speedMul * (1 - 0.05 * this.carry.length);
				if (this.power && this.power.kind === 'speed') speed *= 1.55;
				if (slow && !this.air) speed *= 0.62;
				const tx = dir.x * dir.mag * speed;
				const ty = dir.y * dir.mag * speed;
				const a = 1 - Math.exp(-dt * 13);
				this.vx += (tx - this.vx) * a;
				this.vy += (ty - this.vy) * a;
			} else {
				// sliding on a peel keeps going, a bonk stops you
				const f = Math.exp(-dt * (this.state === 'slip' ? 2.2 : 9));
				this.vx *= f;
				this.vy *= f;
			}
			if (Math.abs(this.vx) > 25) this.facing = this.vx > 0 ? 1 : -1;
			b.setVelocity(this.vx, this.vy);
		}

		// after physics bumped us into a rock, keep our own speed in step with the body's
		syncVelocity() {
			this.vx = this.body.velocity.x;
			this.vy = this.body.velocity.y;
		}

		/* ---------- what happens to a monkey ---------- */
		slip() {
			if (this.state !== 'ok' || this.air || this.invuln > 0) return false;
			if (this.useShield()) return false;
			this.state = 'slip';
			this.stateT = 1.15;
			this.spin = 0;
			const sp = Math.max(160, Math.hypot(this.vx, this.vy));
			this.vx = this.facing * sp * 0.9;
			this.vy = (this.vy >= 0 ? 1 : -1) * sp * 0.25;
			this.setExpr('dizzy', 1.4);
			MM.Sound.sfx.slip();

			return true;
		}

		stun(t = 1.0) {
			if (this.air || this.invuln > 0) return false;
			if (this.useShield()) return false;
			this.state = 'stun';
			this.stateT = t;
			this.setExpr('dizzy', t + 0.3);
			this.scene.tweens.add({targets: this.sprite, scaleY: this.k * 0.62, scaleX: this.k * 1.25, duration: 90, yoyo: true, ease: 'Quad.easeOut'});

			return true;
		}

		knock(vx, vy) {
			this.vx = vx;
			this.vy = vy;
		}

		useShield() {
			if (!this.shield) return false;
			this.shield = false;
			if (this.power && this.power.kind === 'shield') this.power = null;
			this.invuln = 0.8;
			MM.Sound.sfx.shieldPop();
			this.scene.fx.burst(this.x, this.y - 40, 'sparkle', 10, 0xbfe9ff);
			this.bubble.setVisible(false);

			return true;
		}

		jump() {
			if (this.air || this.state !== 'ok') return false;
			this.jumpT = JUMP_TIME;
			MM.Sound.sfx.jump();
			this.scene.fx.burst(this.x, this.y + FEET, 'puff', 6, 0xffffff);

			return true;
		}

		setExpr(expr, t = 0.6) {
			this.expr = expr;
			this.exprT = t;
		}

		addCarry(from) {
			if (this.full) return false;
			this.carry.push(from);

			return true;
		}

		// take up to n bananas off the tower (top first), returning where each came from
		takeCarry(n) {
			const out = [];
			while (n-- > 0 && this.carry.length) out.push(this.carry.pop());

			return out;
		}

		givePower(kind, dur) {
			this.power = {kind, t: dur, dur};
			this.shield = kind === 'shield';
		}

		/* ---------- every frame ---------- */
		update(dt) {
			if (this.invuln > 0) this.invuln -= dt;
			if (this.stateT > 0) {
				this.stateT -= dt;
				if (this.stateT <= 0) {
					this.state = 'ok';
					this.invuln = Math.max(this.invuln, 0.9); // a moment to get away before the next trap
					this.sprite.setRotation(0);
				}
			}
			if (this.jumpT > 0) {
				this.jumpT -= dt;
				if (this.jumpT <= 0) {
					this.jumpT = 0;
					MM.Sound.sfx.land();
					this.scene.fx.burst(this.x, this.y + FEET, 'puff', 5, 0xffffff);
				}
			}
			if (this.exprT > 0) {
				this.exprT -= dt;
				if (this.exprT <= 0) this.expr = 'normal';
			}
			if (this.power) {
				this.power.t -= dt;
				if (this.power.t <= 0) {
					if (this.power.kind === 'shield') this.shield = false;
					this.power = null;
				}
			}
			if (this.peels < 3) {
				this.peelT += dt;
				if (this.peelT > 7) {
					this.peelT = 0;
					this.peels++;
				}
			}
			if (this.chase) {
				this.chase.t -= dt;
				if (this.chase.t <= 0 || !this.chase.target.carry.includes(this.idx)) this.chase = null;
			}
			if (this.slickT > 0) this.slickT -= dt;
		}

		render(dt, time) {
			const k = this.k;
			const x = this.x;
			const feet = this.y + FEET;
			const speed = Math.hypot(this.vx, this.vy);
			const moving = this.state === 'ok' && speed > 30;
			if (moving) this.walk += dt * (6 + speed * 0.035);
			const bob = moving ? Math.abs(Math.sin(this.walk)) * 6 : 0;
			const z = this.jumpT > 0 ? Math.sin((1 - this.jumpT / JUMP_TIME) * Math.PI) * 70 : 0;
			const key = `monkey-${this.player.id}-${this.state === 'ok' ? this.expr : 'dizzy'}`;
			if (this.sprite.texture.key !== key) this.sprite.setTexture(key);

			this.shadow.setPosition(x, feet).setDepth(feet - 2).setScale(k * (0.95 - z / 220), k * (0.95 - z / 220));
			this.ring.setPosition(x, feet).setDepth(feet - 1).setAlpha(this.invuln > 0 ? 0.4 + 0.4 * Math.sin(time * 30) : 0.95);
			this.sprite.setPosition(x, feet - bob - z).setDepth(feet + (z ? 400 : 0));
			this.sprite.setFlipX(this.facing > 0);
			if (this.state === 'slip') {
				this.spin += dt * 16;
				this.sprite.setRotation(this.spin);
			} else if (this.state === 'ok') {
				const breathe = 1 + Math.sin(time * 3 + this.idx) * 0.02;
				this.sprite.setRotation(moving ? Math.sin(this.walk) * 0.09 : 0);
				if (!this.scene.tweens.isTweening(this.sprite)) this.sprite.setScale(k * (moving ? 1 + bob * 0.006 : 1), k * (moving ? 1 - bob * 0.006 : breathe));
			}
			this.sprite.setAlpha(this.invuln > 0 && this.state === 'ok' ? 0.65 + 0.35 * Math.sin(time * 30) : 1);

			// banana tower on the head
			const top = feet - bob - z - 116;
			for (let i = 0; i < this.stack.length; i++) {
				const s = this.stack[i];
				const on = i < this.carry.length;
				s.setVisible(on && this.state !== 'slip');
				if (on) {
					const sway = Math.sin(time * 5 + i * 0.8) * (moving ? 3 : 1) * (i / 2);
					s.setPosition(x + (i % 2 ? 5 : -5) + sway, top - i * 9).setRotation(i % 2 ? 0.25 : -0.2).setDepth(feet + 1 + i + (z ? 400 : 0));
					// a stolen banana glows red: everyone can see who to chase
					const from = this.carry[i];
					const tex = from >= 0 && from !== this.idx ? 'mini-banana-stolen' : 'mini-banana';
					if (s.texture.key !== tex) s.setTexture(tex);
				}
			}

			// dizzy stars
			const dizzy = this.state !== 'ok';
			this.stars.forEach((s, i) => {
				s.setVisible(dizzy);
				if (dizzy) {
					const a = time * 6 + (i * Math.PI * 2) / 3;
					s.setPosition(x + Math.cos(a) * 32, feet - 112 + Math.sin(a) * 9).setDepth(feet + (Math.sin(a) > 0 ? 10 : -10)).setRotation(a);
				}
			});

			// shield bubble
			this.bubble.setVisible(this.shield);
			if (this.shield) this.bubble.setPosition(x, feet - 58 - z).setDepth(feet + 20).setScale(k * (1.05 + Math.sin(time * 4) * 0.03));

			// power timer: a small icon with a ring that empties
			this.powerRing.clear();
			if (this.power) {
				const px = x + 40;
				const py = feet - 104 - z;
				this.powerIcon.setTexture(`power-${this.power.kind}`).setVisible(true).setPosition(px, py).setDepth(feet + 30);
				const left = Math.max(0, this.power.t / this.power.dur);
				this.powerRing.setDepth(feet + 31);
				this.powerRing.lineStyle(5, 0xffffff, 1);
				this.powerRing.beginPath();
				this.powerRing.arc(px, py, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
				this.powerRing.strokePath();
				if (this.power.kind === 'speed' && moving && Math.random() < 0.5) this.scene.fx.trail(x, feet - 10, this.color);
				if (this.power.kind === 'magnet') {
					this.powerRing.lineStyle(3, 0xc9a7ff, 0.35 + 0.25 * Math.sin(time * 8));
					this.powerRing.strokeEllipse(x, feet, 2 * (110 + 20 * Math.sin(time * 5)), 2 * (40 + 8 * Math.sin(time * 5)));
				}
			} else {
				this.powerIcon.setVisible(false);
			}

			// "catch the thief!" arrow
			// "catch the thief!", or, with full hands, "home to your basket!"
			const goal = this.chase ? this.chase.target : this.full && this.home && !this.bot ? this.home : null;
			if (goal && Math.hypot(goal.x - this.x, goal.y - this.y) > 110) {
				const t = goal;
				const a = Math.atan2(t.y - this.y, t.x - this.x);
				const r = 64 + Math.sin(time * 10) * 6;
				this.arrow.setVisible(true).setPosition(x + Math.cos(a) * r, feet - 30 + Math.sin(a) * r * 0.7).setRotation(a).setDepth(feet + 40);
			} else {
				this.arrow.setVisible(false);
			}
		}

		destroy() {
			[this.zone, this.shadow, this.ring, this.sprite, this.bubble, this.powerIcon, this.powerRing, this.arrow, ...this.stack, ...this.stars].forEach((o) => o.destroy());
		}
	}

	Monkey.CARRY_MAX = CARRY_MAX;
	Monkey.FEET = FEET;
	MM.Monkey = Monkey;
})();
