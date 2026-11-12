/* Balloon Panic: BombManager. The silly bomb: a round toy with a face that gets more and more worried.
   The fuse burns with sparks and smoke, the toy shakes and hops, it glows warmer as the pop gets close.
   The fuse length follows the same unpredictable story as the balloon (hot.js), so a different length is
   left every round when it goes: a quick flash is the only warning. Nothing here looks like a real explosive. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const MOUTHS = ['', 'bp-m-smile', 'bp-m-o', 'bp-m-panic', 'bp-m-wail'];

	class Bomb extends BP.Hot {
		constructor(scene, opts) {
			super(scene, {...opts, kind: 'bomb'});
			const A = BP.Art;
			this.tint = 0xb39bff;
			this.variant = 0;
			this.body = A.add(scene, 'bp-bomb');
			this.heat = A.add(scene, 'bp-heat').setAlpha(0);
			this.eyes = [-1, 1].map((s) => A.add(scene, 'bp-eye', s * 30, -4));
			this.pupils = [-1, 1].map((s) => A.add(scene, 'bp-pupil', s * 30, -4));
			this.mouth = A.add(scene, 'bp-m-smile', 0, 40);
			this.goo = A.add(scene, 'bp-goo', 0, 6).setVisible(false);
			this.in.add([this.body, this.heat, ...this.eyes, ...this.pupils, this.mouth, this.goo]);
			this.glow = A.add(scene, 'bp-glow').setDepth(5090).setBlendMode('ADD').setTint(0xffc24d);
			this.spark = A.add(scene, 'bp-spark').setDepth(5100).setTint(0xfff3a0);
			this.sparkT = 0;
		}

		get r() {
			return 72 * this.mul * (1 + this.shown * 0.12);
		}

		extras() {
			return [this.glow, this.spark];
		}

		onStage(stage) {
			this.kick(6);
			if (this.holder && stage >= 3) this.holder.setExpr('shock', 0.4);
		}

		draw(dt, t) {
			const A = BP.Art;
			const stage = this.stage;
			const s = this.r / 100;
			const over = Math.max(0, this.shown - 0.78) / 0.22;
			let jx = 0;
			let jy = 0;
			if (this.state === 'fly') {
				this.c.rotation = this.flightAngle;
				this.c.setScale(1.14, 0.9);
				this.in.rotation = this.spin - this.flightAngle;
				this.in.setScale(s * (1 + this.sq), s * (1 - this.sq));
			} else {
				// it rocks, then hops, then rattles
				const rock = [0, 0.04, 0.09, 0.16, 0.24][stage];
				this.in.rotation = Math.sin(t * (4 + stage * 3)) * rock;
				this.in.setScale(s * (1 + this.sq), s * (1 - this.sq));
				const shake = [0, 0, 0.6, 2, 4 + over * 5][stage];
				jx = (Math.sin(t * 61) + Math.sin(t * 37.7)) * shake * 0.55;
				jy = (Math.sin(t * 53 + 1) + Math.sin(t * 29.3)) * shake * 0.55 - Math.abs(Math.sin(t * (3 + stage * 2.5))) * stage * 2.2;
			}
			this.c.setPosition(this.x + jx, this.y + jy);
			this.heat.setAlpha(Math.max(0, (this.shown - 0.35) / 0.65) * (0.55 + Math.sin(t * 12) * 0.2));
			this.goo.setVisible(this.sticky > 0);
			// the face
			const mk = MOUTHS[stage];
			if (this.mouth.texture.key !== mk) A.swap(this.mouth, mk);
			const wide = 1 + this.shown * 0.45;
			this.eyes.forEach((e) => A.sc(e, wide));
			this.pupils.forEach((p, i) => {
				A.sc(p, stage >= 3 ? 0.6 : 1);
				p.setPosition((i ? 30 : -30) + (stage >= 3 ? Math.sin(t * 34) * 2.6 : Math.sin(t * 1.3) * 4), -4 + (stage >= 3 ? Math.sin(t * 27 + 1) * 2.6 : 0));
			});
			this.fuse(dt, t, s);
		}

		// the burning fuse: a curl of rope from the cap, shorter and shorter, with a spark at its tip
		fuse(dt, t, s) {
			const g = this.line;
			g.clear();
			if (this.state === 'burst') {
				this.spark.setVisible(false);
				this.glow.setVisible(false);

				return;
			}
			const rot = this.c.rotation + this.in.rotation;
			const cos = Math.cos(rot);
			const sin = Math.sin(rot);
			const at = (lx, ly) => ({x: this.x + (lx * cos - ly * sin) * s, y: this.y + (lx * sin + ly * cos) * s});
			const len = 22 + 130 * (1 - this.shown);
			const a = at(46, -112);
			const m = at(46 + len * 0.5, -112 - len * 0.75);
			const e = at(46 + len * 0.95 + Math.sin(t * 5) * 5, -112 - len * 0.55);
			const path = (width, color) => {
				g.lineStyle(width, color, 1);
				g.beginPath();
				g.moveTo(a.x, a.y);
				for (let i = 1; i <= 10; i++) {
					const u = i / 10;
					const p = (1 - u) * (1 - u);
					const q = 2 * u * (1 - u);
					g.lineTo(p * a.x + q * m.x + u * u * e.x, p * a.y + q * m.y + u * u * e.y);
				}
				g.strokePath();
			};
			path(10 * s + 4, 0x24124d);
			path(6 * s + 1.5, 0xffe9b0);
			const flick = 0.8 + Math.random() * 0.5;
			this.spark.setVisible(true).setPosition(e.x, e.y).setAngle(t * 400);
			A_sc(this.spark, flick * 1.3);
			this.glow.setVisible(true).setPosition(e.x, e.y).setAlpha(0.7);
			A_sc(this.glow, 0.5 + flick * 0.2);
			if (this.state === 'held' || this.state === 'fly') {
				this.sparkT -= dt;
				if (this.sparkT <= 0) {
					this.sparkT = 0.045;
					this.scene.fx.burst('spark', e.x, e.y, 2);
					if (Math.random() < 0.3) this.scene.fx.burst('puff', e.x, e.y - 6, 1, 0xd9d2ff);
					if (!this.scene.round.quiet) BP.Sound.sfx.fuse();
				}
			}
		}
	}

	const A_sc = (img, v) => BP.Art.sc(img, v);

	BP.Bomb = Bomb;
})();
