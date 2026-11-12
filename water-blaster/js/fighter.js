/* Water Blaster Arena: one splasher (PlayerController + WetnessManager for one player).
   Arcade physics moves an invisible round "feet" zone; four picture layers (legs, body, face, blaster), the
   shadow, the colour ring, the wet meter, drips and power-up bubbles all follow it every frame.
     wet   0..100   25 / 50 / 75 change the picture (wet clothes, flat hair, drips, panic); 100 = TOTALLY SOAKED
     tank  0..100   spraying uses it; taps and bottles fill it; it trickles back slowly so nobody is ever stuck
   States: ok · out (soaked: flew into the pool and floats on a ring, cheering, until the round ends). */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const BASE_SPEED = 320;
	const ACCEL = 11; // gentle: the splasher eases up to speed and eases to a stop (no jerks under a small finger)
	const BRAKE = 13;
	const FEET = 14;
	const DRY_DELAY = 2.6; // seconds without a hit before you start to dry
	const DRY_RATE = 2.4; // % per second
	const TRICKLE = 2.2; // tank % per second while not spraying

	class Fighter {
		constructor(scene, {player, slot, idx, bot = false, char, weapon, team, x, y, k}) {
			this.scene = scene;
			this.player = player;
			this.slot = slot;
			this.idx = idx;
			this.bot = bot;
			this.char = char;
			this.weapon = weapon;
			this.team = team;
			this.k = k;
			this.color = Phaser.Display.Color.HexStringToColor(player.color).color;
			this.pitch = [1.05, 0.92, 1.18, 0.98, 1.1][idx % 5];
			const id = player.id;

			this.zone = scene.add.zone(x, y, 52, 52);
			scene.physics.add.existing(this.zone);
			this.body = this.zone.body;
			this.body.setCircle(26);
			this.body.setCollideWorldBounds(true);
			this.body.setBounce(0);
			this.zone.fighter = this;

			this.shadow = scene.add.image(x, y, 'shadow').setScale(k);
			this.ring = scene.add.image(x, y, `ring-${id}`).setScale(k * 0.62, k * 0.26).setAlpha(0.95);
			this.teamRing = team === null ? null : scene.add.ellipse(x, y, 92, 40).setStrokeStyle(4, team ? 0xffffff : 0xffd23f, 0.95);
			this.legs = scene.add.image(x, y, `legs-${id}-0`).setOrigin(0.5, 0.97).setScale(k);
			this.bodySpr = scene.add.image(x, y, `body-${id}-0`).setOrigin(0.5, 0.97).setScale(k);
			this.face = scene.add.image(x, y, `face-${id}-normal`).setOrigin(0.5, 0.97).setScale(k);
			this.gun = scene.add.image(x, y, `gun-${id}-${weapon}`).setOrigin(0.25, 0.5).setScale(k * 0.82);
			this.float = scene.add.image(x, y, `float-${id}`).setScale(k).setVisible(false);
			this.bubble = scene.add.image(x, y, 'shield-bubble').setOrigin(0.5, 0.9).setScale(k).setVisible(false).setAlpha(0.9);
			this.meter = scene.add.graphics();
			this.badge = scene.add.image(x, y, 'power-super').setScale(k * 0.5).setVisible(false);
			this.parts = [this.legs, this.bodySpr, this.face];
			this.reset();
		}

		reset() {
			this.vx = 0;
			this.vy = 0;
			this.wet = 0;
			this.tank = 100;
			this.state = 'ok';
			this.aim = this.slot === 0 || this.slot === 2 ? 0 : Math.PI; // start facing the middle
			this.want = this.aim;
			this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;
			this.spraying = false;
			this.fireT = 0;
			this.assist = 0;
			this.sinceHit = 99;
			this.hitT = 0;
			this.expr = 'normal';
			this.exprT = 0;
			this.blinkT = 2 + Math.random() * 3;
			this.walk = Math.random() * 6;
			this.dripT = 0;
			this.superT = 0;
			this.shieldT = 0;
			this.boostT = 0;
			this.reverseT = 0;
			this.slideT = 0;
			this.invuln = 0;
			this.panicked = false;
			this.warnedEmpty = false;
			this.wins = this.wins || 0;
			this.outAt = 0;
			this.hop = 0;
		}

		get x() {
			return this.body.center.x;
		}

		get y() {
			return this.body.center.y;
		}

		get out() {
			return this.state === 'out';
		}

		get tier() {
			return this.wet < 25 ? 0 : this.wet < 50 ? 1 : this.wet < 75 ? 2 : 3;
		}

		place(x, y) {
			this.body.reset(x, y);
			this.vx = 0;
			this.vy = 0;
		}

		setExpr(expr, t = 0.6) {
			this.expr = expr;
			this.exprT = t;
		}

		/* ---------- movement (dir from a joystick, keyboard or the bot) ---------- */
		move(dt, dir, slippery) {
			const b = this.body;
			if (this.out) return;
			// wet splashers (and a slippery floor) slide a little more: never slower, just skiddier
			const slip = Math.min(1, (this.wet >= 50 ? (this.wet - 40) / 90 : 0) + (slippery ? 0.55 : 0));
			const speed = BASE_SPEED * (this.bot ? 0.86 : 1) * (this.boostT > 0 ? 1.12 : 1);
			const tx = dir.x * dir.mag * speed;
			const ty = dir.y * dir.mag * speed;
			const a = 1 - Math.exp(-dt * (dir.mag > 0.05 ? ACCEL : BRAKE) * (1 - slip * 0.78));
			this.vx += (tx - this.vx) * a;
			this.vy += (ty - this.vy) * a;
			if (dir.mag > 0.05 && !this.aimLocked) this.want = Math.atan2(dir.y, dir.x);
			b.setVelocity(this.vx, this.vy);
			// sliding sideways on a wet floor: a little "wheee"
			if (slip > 0.3 && Math.hypot(this.vx - tx, this.vy - ty) > 160) {
				this.slideT -= dt;
				if (this.slideT <= 0) {
					this.slideT = 0.9;
					WB.Sound.sfx.slip();
					this.scene.fx.burst(this.x, this.y + FEET, 'splash', 3);
				}
			}
		}

		syncVelocity() {
			this.vx = this.body.velocity.x;
			this.vy = this.body.velocity.y;
		}

		/* ---------- getting wet ---------- */
		// a hit: returns true when it counted (no shield, not already out)
		soak(amount, fx, fy) {
			if (this.out || this.invuln > 0) return false;
			if (this.shieldT > 0) {
				WB.Sound.sfx.shieldBlock();
				this.scene.fx.burst(fx, fy, 'sparkle', 2, 0xbfe9ff);

				return false;
			}
			const before = this.tier;
			this.wet = Math.min(100, this.wet + amount);
			this.sinceHit = 0;
			this.hitT = 0.18;
			if (this.exprT <= 0.1 || this.expr !== 'hit') this.setExpr('hit', 0.35);
			WB.Sound.sfx.hit(this.wet);
			if (Math.random() < 0.18) WB.Sound.sfx.ouch(this.pitch);
			if (this.tier > before) {
				// a new wetness level: a bigger splash so everyone sees it
				this.scene.fx.burst(this.x, this.y - 70, 'splash', 10);
				this.scene.tweens.add({targets: this.parts, scaleX: this.k * 1.14, scaleY: this.k * 0.9, duration: 90, yoyo: true, ease: 'Quad.easeOut'});
				if (this.tier === 3 && !this.panicked) {
					this.panicked = true;
					WB.Sound.sfx.panic(this.pitch);
					this.scene.onCritical(this);
				}
			}
			if (this.wet >= 100) this.scene.soaked(this);

			return true;
		}

		/* ---------- soaked: spin, fly into the pool, land on a ring ---------- */
		goOut(spot) {
			if (this.out) return;
			this.state = 'out';
			this.outAt = this.scene.time.now;
			this.spraying = false;
			WB.Sound.spray(this.player.id, false);
			this.body.setVelocity(0, 0);
			this.body.enable = false;
			this.shieldT = this.superT = this.boostT = this.reverseT = 0;
			this.setExpr('soaked', 99);
			this.gun.setVisible(false);
			this.meter.clear();
			this.badge.setVisible(false);
			this.bubble.setVisible(false);
			const s = this.scene;
			const sx = this.x;
			const sy = this.y + FEET;
			this.flying = {t: 0, dur: 1.15, sx, sy, ex: spot.x, ey: spot.y, spin: 0};
			s.fx.burst(sx, sy - 70, 'big', 26);
			s.fx.burst(sx, sy - 70, 'bubble', 10);
			s.fx.ring(sx, sy, 1.6);
			s.fx.shake(0.008, 260);
			WB.Sound.sfx.soaked();
		}

		/* ---------- every frame ---------- */
		update(dt, scene) {
			if (this.invuln > 0) this.invuln -= dt;
			if (this.exprT > 0) {
				this.exprT -= dt;
				if (this.exprT <= 0) this.expr = 'normal';
			}
			if (this.hitT > 0) this.hitT -= dt;
			['superT', 'shieldT', 'boostT', 'reverseT'].forEach((key) => {
				if (this[key] > 0) this[key] = Math.max(0, this[key] - dt);
			});
			if (this.out) return;
			this.sinceHit += dt;
			// dry off slowly when nobody is hitting you (not in big splash time)
			if (this.sinceHit > DRY_DELAY && !scene.splashTime && this.wet > 0) {
				this.wet = Math.max(0, this.wet - DRY_RATE * dt);
				if (this.wet < 70) this.panicked = false;
			}
			if (!this.spraying && this.tank < 100) this.tank = Math.min(100, this.tank + TRICKLE * dt);
			// the aim swings smoothly toward where the splasher wants it
			let d = this.want + (this.assist || 0) - this.aim;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			this.aim += d * (1 - Math.exp(-dt * 12));
			if (Math.abs(Math.cos(this.aim)) > 0.2) this.facing = Math.cos(this.aim) > 0 ? 1 : -1;
		}

		render(dt, time) {
			const k = this.k;
			const id = this.player.id;
			if (this.out) return this.renderOut(dt, time);
			const x = this.x;
			const feet = this.y + FEET;
			const speed = Math.hypot(this.vx, this.vy);
			const moving = speed > 30;
			if (moving) this.walk += dt * (6 + speed * 0.03);
			const step = moving ? (Math.sin(this.walk) > 0 ? 1 : 2) : 0;
			// every footfall is heard: a pat when dry, a squelch when soaked
			if (step && step !== this.lastStep && !this.bot && this.scene.state !== 'attract') WB.Sound.sfx.step(this.wet, !!this.scene.slippery);
			this.lastStep = step;
			const bob = (moving ? Math.abs(Math.sin(this.walk)) * 5 : 0) + this.hop;
			const tier = this.tier;

			// face: blink now and then; worried when wet, panicking when nearly soaked
			this.blinkT -= dt;
			let expr = this.expr;
			if (expr === 'normal') {
				if (tier === 3) expr = 'panic';
				else if (tier === 2) expr = 'worried';
				if (this.blinkT < 0.12 && expr === 'normal') expr = 'blink';
				if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 3;
			}
			const set = (spr, key) => spr.texture.key !== key && spr.setTexture(key);
			set(this.legs, `legs-${id}-${step}`);
			set(this.bodySpr, `body-${id}-${tier}`);
			set(this.face, `face-${id}-${expr}`);

			// panicking: a little shake; hit: a flinch
			const shiver = tier === 3 ? Math.sin(time * 40) * 1.6 : 0;
			const flinch = this.hitT > 0 ? 3 : 0;
			const lean = moving ? Math.sin(this.walk) * 0.07 + (this.vx / 320) * 0.08 : 0;
			const breathe = 1 + Math.sin(time * 3 + this.idx) * 0.02;
			this.parts.forEach((p) => {
				p.setPosition(x + shiver - this.facing * flinch, feet - bob).setDepth(feet + 1).setFlipX(this.facing < 0).setRotation(lean);
				if (!this.scene.tweens.isTweening(p)) p.setScale(k * (moving ? 1 + bob * 0.006 : 1), k * (moving ? 1 - bob * 0.006 : breathe));
			});
			this.legs.setDepth(feet);
			this.face.setDepth(feet + 2);
			this.shadow.setPosition(x, feet).setDepth(feet - 3);
			this.ring.setPosition(x, feet).setDepth(feet - 2).setAlpha(this.invuln > 0 ? 0.4 + 0.4 * Math.sin(time * 30) : 0.95);
			if (this.teamRing) this.teamRing.setPosition(x, feet).setDepth(feet - 2);

			// the blaster turns to where the water goes; behind the body when aiming up
			const gx = x + Math.cos(this.aim) * 6;
			const gy = feet - 50 - bob;
			const up = Math.sin(this.aim) < -0.35;
			this.gun.setPosition(gx, gy).setRotation(this.aim).setFlipY(Math.cos(this.aim) < 0).setDepth(up ? feet : feet + 3);
			if (this.gun.texture.key !== `gun-${id}-${this.weapon}`) this.gun.setTexture(`gun-${id}-${this.weapon}`);
			const kick = this.spraying && this.tank > 0 ? Math.sin(time * 60) * 0.03 : 0;
			this.gun.setScale(k * (0.82 + (this.superT > 0 ? 0.18 : 0) + kick));

			// drips: more and faster the wetter you are
			if (tier) {
				this.dripT -= dt;
				if (this.dripT <= 0) {
					this.dripT = [0, 0.5, 0.22, 0.09][tier];
					this.scene.fx.drip(x, feet - 70 - Math.random() * 40);
					if (tier === 3 && Math.random() < 0.15) this.scene.fx.puddle(x + (Math.random() - 0.5) * 20, feet + 4, 0.45);
				}
			}

			// shield bubble
			this.bubble.setVisible(this.shieldT > 0);
			if (this.shieldT > 0) this.bubble.setPosition(x, feet + 6).setDepth(feet + 5).setAlpha(this.shieldT < 1.2 ? 0.4 + 0.5 * Math.abs(Math.sin(time * 14)) : 0.85).setScale(k * (1 + Math.sin(time * 5) * 0.03));
			// what power you have, above your head
			const pw = this.superT > 0 ? 'power-super' : this.reverseT > 0 ? 'power-reverse' : this.boostT > 0 ? 'gold-tank' : null;
			this.badge.setVisible(!!pw);
			if (pw) {
				if (this.badge.texture.key !== pw) this.badge.setTexture(pw);
				this.badge.setPosition(x, feet - 182 - bob + Math.sin(time * 6) * 4).setDepth(feet + 6).setRotation(this.reverseT > 0 ? time * 4 : 0);
			}
			this.drawMeter(x, feet - 158 - bob, time);
		}

		// the wet meter over the head: a water drop and a bar that fills blue, then orange, then red and wobbly
		drawMeter(x, y, time) {
			const g = this.meter;
			const f = this.wet / 100;
			const w = 76;
			const h = 14;
			const crit = this.wet >= 75;
			const col = this.wet < 50 ? 0x3ec5ff : this.wet < 75 ? 0xffa53d : 0xff4757;
			const pulse = crit ? Math.abs(Math.sin(time * 9)) : 0;
			g.clear().setDepth(this.y + 9000 - 1000);
			g.fillStyle(0x163552, 0.35).fillRoundedRect(x - w / 2 - 3, y - h / 2 + 3, w + 6, h + 6, 10);
			g.fillStyle(0xffffff, 1).fillRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 10);
			g.fillStyle(0xd6eef7, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 7);
			if (f > 0.02) g.fillStyle(col, 1).fillRoundedRect(x - w / 2, y - h / 2, Math.max(h, w * f), h, 7);
			if (crit) g.lineStyle(3 + pulse * 3, 0xff4757, 0.5 + pulse * 0.5).strokeRoundedRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, 12);
			g.lineStyle(3, 0x163552, 1).strokeRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 10);
			// a little drop at the start of the bar
			g.fillStyle(col, 1).fillCircle(x - w / 2 - 10, y + 2, 9);
			g.fillTriangle(x - w / 2 - 18, y, x - w / 2 - 2, y, x - w / 2 - 10, y - 14);
			g.lineStyle(2.5, 0x163552, 1).strokeCircle(x - w / 2 - 10, y + 2, 9);
			g.fillStyle(0xffffff, 0.9).fillCircle(x - w / 2 - 13, y, 2.5);
		}

		// soaked: the flight into the pool, then bobbing on a ring and cheering
		renderOut(dt, time) {
			const k = this.k;
			const id = this.player.id;
			const F = this.flying;
			let x;
			let y;
			let rot = 0;
			if (F && F.t < F.dur) {
				F.t += dt;
				const t = Math.min(1, F.t / F.dur);
				x = F.sx + (F.ex - F.sx) * t;
				y = F.sy + (F.ey - F.sy) * t - Math.sin(t * Math.PI) * 260;
				rot = t * Math.PI * 4;
				this.shadow.setPosition(F.sx + (F.ex - F.sx) * t, F.sy + (F.ey - F.sy) * t).setDepth(-100).setScale(k * (1 - Math.sin(t * Math.PI) * 0.5));
				if (F.t >= F.dur) this.landed(F.ex, F.ey);
			} else {
				x = F ? F.ex : this.x;
				y = (F ? F.ey : this.y) + Math.sin(time * 2.4 + this.idx) * 5;
				rot = Math.sin(time * 1.8 + this.idx) * 0.12;
				// after a moment the soaked splasher cheers for whoever is still playing
				if (this.expr === 'soaked' && time * 1000 - this.outAt > 2600) this.setExpr('cheer', 99);
			}
			const set = (spr, key) => spr.texture.key !== key && spr.setTexture(key);
			set(this.bodySpr, `body-${id}-3`);
			set(this.face, `face-${id}-${this.expr}`);
			const landed = !F || F.t >= F.dur;
			this.legs.setVisible(!landed);
			this.float.setVisible(landed).setPosition(x, y + 2).setRotation(rot * 0.5);
			this.parts.forEach((p) => p.setPosition(x, y + (landed ? 10 : 0)).setRotation(rot));
			this.float.setDepth(y + 3);
			this.bodySpr.setDepth(y + 1);
			this.face.setDepth(y + 2);
			this.legs.setDepth(y);
			this.ring.setVisible(false);
			if (this.teamRing) this.teamRing.setVisible(false);
			if (landed) this.shadow.setVisible(false);
			// the ring sits in front of the belly: crop the body by drawing the ring over it
			this.float.setDepth(y + 2.5);
			this.face.setDepth(y + 3);
		}

		landed(x, y) {
			const s = this.scene;
			s.fx.burst(x, y, 'big', 22);
			s.fx.burst(x, y, 'bubble', 12);
			s.fx.ring(x, y + 10, 1.8);
			s.fx.shake(0.006, 200);
			WB.Sound.sfx.plunge();
			WB.Sound.sfx.giggle(this.pitch);
			this.parts.forEach((p) => p.setScale(this.k));
		}

		destroy() {
			WB.Sound.spray(this.player.id, false);
		}
	}

	WB.Fighter = Fighter;
})();
