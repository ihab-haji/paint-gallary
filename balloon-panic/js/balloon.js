/* Balloon Panic: BalloonManager. How the crazy balloon looks, swells and squeaks.
   Four stages, read from how big it has grown (hot.js decides when it pops):
     1 normal         small, a gentle bob
     2 getting bigger a soft wobble, the rubber starts to creak
     3 danger         a strong wobble, the rubber turns pale where it is stretched thin
     4 extreme panic  enormous, lopsided, shaking, a warning sign above it
   It never grows at one speed: hot.js makes it crawl, stop and surge. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

	class Balloon extends BP.Hot {
		constructor(scene, opts) {
			super(scene, {...opts, kind: 'balloon'});
			const A = BP.Art;
			this.variant = opts.variant % A.BALLOONS.length;
			this.tint = A.num(A.BALLOONS[this.variant].col);
			this.body = A.add(scene, `bp-balloon-${this.variant}`);
			this.strain = A.add(scene, 'bp-strain').setAlpha(0);
			this.goo = A.add(scene, 'bp-goo').setVisible(false);
			this.in.add([this.body, this.strain, this.goo]);
			this.warn = A.add(scene, 'bp-warn').setDepth(5100).setVisible(false);
			this.puffT = 0;
		}

		get r() {
			return (44 + 104 * Math.pow(this.shown, 0.85)) * this.mul;
		}

		extras() {
			return [this.warn];
		}

		onStage(stage) {
			BP.Sound.sfx.creak(this.shown);
			this.kick(6);
			this.scene.fx.burst('sparkle', this.x, this.y, 5 + stage * 2, 0xffffff);
			if (this.holder && stage >= 3) this.holder.setExpr('shock', 0.4);
		}

		draw(dt, t) {
			const stage = this.stage;
			const s = this.r / 100;
			const over = Math.max(0, this.shown - 0.78) / 0.22; // how deep into "extreme panic"
			let jx = 0;
			let jy = 0;
			if (this.state === 'fly') {
				// stretched along the throw, tumbling
				this.c.rotation = this.flightAngle;
				this.c.setScale(1.18, 0.86);
				this.in.rotation = Math.sin(this.spin) * 0.5 - this.flightAngle;
				this.in.setScale(s * (1 + this.sq), s * (1 - this.sq));
			} else {
				const amp = [0, 0.01, 0.028, 0.055, 0.085][stage] + over * 0.04;
				const wob = Math.sin(t * (5 + stage * 3.2)) * amp;
				// stage 4: the rubber bulges unevenly, as if it cannot hold the air
				const bulge = over * Math.sin(t * 23) * 0.035;
				this.in.setScale(s * (1 + this.sq + wob + bulge), s * (1 - this.sq - wob + bulge * 0.4));
				this.in.rotation = wrap(this.in.rotation) * Math.pow(0.001, dt) + Math.sin(t * 2.4) * 0.002 * (1 + stage * 4);
				const shake = stage === 4 ? 2 + over * 7 : stage === 3 ? 0.8 : 0;
				// a tremble made of two waves: it shivers without flickering
				jx = (Math.sin(t * 61) + Math.sin(t * 37.7)) * shake * 0.55;
				jy = (Math.sin(t * 53 + 1) + Math.sin(t * 29.3)) * shake * 0.55;
			}
			this.c.setPosition(this.x + jx, this.y + jy);
			this.strain.setAlpha(Math.max(0, Math.min(0.95, (this.shown - 0.42) / 0.5)));
			this.goo.setVisible(this.sticky > 0);
			// air rushing in: a puff of sound whenever it surges
			if (this.state === 'held' && this.rate > 0.1 && !this.scene.round.quiet) {
				this.puffT -= dt;
				if (this.puffT <= 0) {
					this.puffT = 0.34;
					BP.Sound.sfx.inflate(this.shown);
					this.kick(2.5);
				}
			}
			// the warning sign
			const warn = stage === 4 && this.state !== 'burst' && !this.fake;
			this.warn.setVisible(warn);
			if (warn) {
				const pulse = 1 + Math.abs(Math.sin(t * 9)) * 0.25;
				BP.Art.sc(this.warn, pulse);
				this.warn.setPosition(this.x, this.y - this.r * 1.15 - 44);
			}
			this.string(t);
		}

		// the string: from the knot to a hand while held, a wiggly tail while flying
		string(t) {
			const g = this.line;
			g.clear();
			const rot = this.c.rotation + this.in.rotation;
			const kr = this.r * 1.24;
			const kx = this.x - Math.sin(rot) * kr;
			const ky = this.y + Math.cos(rot) * kr;
			let ex;
			let ey;
			if (this.state === 'held' && this.holder) {
				const hand = this.holder.hand(this.holder.seat.dir.x >= 0 ? 1 : -1);
				ex = hand.x;
				ey = hand.y;
			} else {
				ex = kx - Math.sin(rot) * 60 + Math.sin(t * 20) * 8;
				ey = ky + Math.cos(rot) * 60;
			}
			const mx = (kx + ex) / 2 + Math.sin(t * 3) * 6;
			const my = (ky + ey) / 2 + 22;
			g.lineStyle(3.5, 0xffffff, 0.9);
			g.beginPath();
			g.moveTo(kx, ky);
			for (let i = 1; i <= 10; i++) {
				const u = i / 10;
				const a = (1 - u) * (1 - u);
				const b = 2 * u * (1 - u);
				g.lineTo(a * kx + b * mx + u * u * ex, a * ky + b * my + u * u * ey);
			}
			g.strokePath();
		}
	}

	BP.Balloon = Balloon;
})();
