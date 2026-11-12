/* Balloon Panic: EffectsManager. Confetti, stars, rainbow smoke, shockwaves, flashes and screen shakes.
   Emitters and sprites are made once and reused, so nothing new is created in the middle of a round. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const PARTY = [0xff5d73, 0xffd23f, 0x34e0b0, 0x1fa8ff, 0x9b6bff, 0xff9417, 0xffffff, 0xff5fd2];
	const RAINBOW = [0xff7a8a, 0xffc24d, 0xfff07a, 0x7de38a, 0x6ccbff, 0xb08cff, 0xff8fe0];

	class Effects {
		constructor(scene) {
			this.scene = scene;
			const k = (this.k = scene.k);
			const mk = (tex, cfg, depth = 6000) => scene.add.particles(0, 0, tex, {emitting: false, ...cfg}).setDepth(depth);
			this.em = {
				confetti: mk('bp-conf', {lifespan: {min: 1000, max: 1900}, speed: {min: 180, max: 640}, scale: {start: 1.4 * k, end: 0.9 * k}, rotate: {start: 0, end: 620}, gravityY: 620, tint: PARTY}),
				rain: mk('bp-conf', {lifespan: {min: 1100, max: 1700}, speedX: {min: -60, max: 60}, speedY: {min: 60, max: 200}, scale: {start: 1.3 * k, end: 1 * k}, rotate: {start: 0, end: 500}, gravityY: 260, tint: PARTY}),
				star: mk('bp-star', {lifespan: {min: 600, max: 1000}, speed: {min: 140, max: 420}, scale: {start: 1.1 * k, end: 0.1 * k}, rotate: {start: 0, end: 360}, gravityY: 480}),
				smoke: mk('bp-puff', {lifespan: {min: 900, max: 1600}, speed: {min: 30, max: 190}, scale: {start: 1.2 * k, end: 3.4 * k}, alpha: {start: 0.8, end: 0}, gravityY: -50, tint: RAINBOW}, 5900),
				puff: mk('bp-puff', {lifespan: {min: 400, max: 700}, speed: {min: 20, max: 110}, scale: {start: 0.7 * k, end: 1.6 * k}, alpha: {start: 0.7, end: 0}, gravityY: -40}),
				spark: mk('bp-spark', {lifespan: {min: 260, max: 560}, speed: {min: 60, max: 260}, scale: {start: 0.9 * k, end: 0}, rotate: {min: 0, max: 360}, gravityY: 320, tint: [0xfff07a, 0xffb02e, 0xffffff], blendMode: 'ADD'}),
				sparkle: mk('bp-spark', {lifespan: {min: 400, max: 750}, speed: {min: 70, max: 240}, scale: {start: 1 * k, end: 0}, rotate: {min: 0, max: 360}, gravityY: 120}),
				shred: mk('bp-shred', {lifespan: {min: 700, max: 1200}, speed: {min: 260, max: 760}, scale: {start: 1.5 * k, end: 0.7 * k}, rotate: {start: 0, end: 760}, gravityY: 900}),
				drop: mk('bp-drop', {lifespan: 620, speed: {min: 170, max: 290}, angle: {min: 205, max: 335}, scale: {start: 1.1 * k, end: 0.6 * k}, gravityY: 760}),
				zig: mk('bp-zig', {lifespan: {min: 260, max: 420}, speed: {min: 90, max: 230}, scale: {start: 1.1 * k, end: 0.4 * k}, rotate: {min: -40, max: 40}, tint: [0xfff07a, 0xffffff]}),
				goo: mk('bp-dot', {lifespan: 600, speed: {min: 80, max: 260}, scale: {start: 1.8 * k, end: 0.5 * k}, gravityY: 700, tint: [0x9be33a, 0x6fc41f]}),
				dot: mk('bp-dot', {lifespan: 360, speed: {min: 4, max: 30}, scale: {start: 1.3 * k, end: 0}, alpha: {start: 0.8, end: 0}}, 4980)
			};
			// shockwave rings and the comic burst: a small pool
			this.rings = Array.from({length: 5}, () => scene.add.image(0, 0, 'bp-ring').setDepth(5950).setVisible(false));
			this.ri = 0;
			this.burstImg = scene.add.image(0, 0, 'bp-burst').setDepth(5960).setVisible(false);
			this.ribbons = scene.add.graphics().setDepth(4970);
			this.white = scene.add.rectangle(scene.L.W / 2, scene.L.H / 2, scene.L.W + 40, scene.L.H + 40, 0xffffff).setDepth(9000).setAlpha(0);
		}

		burst(kind, x, y, n = 8, tint) {
			const e = this.em[kind];
			if (!e) return;
			if (tint !== undefined) e.particleTint = tint;
			e.explode(n, x, y);
		}

		// the ribbon behind every throw: it follows the path, tapers and fades. A long combo turns it into a rainbow.
		ribbon(objs, now, combo) {
			const g = this.ribbons;
			g.clear();
			const LIFE = 460;
			for (const o of objs) {
				const tr = o.trail;
				while (tr.length && now - tr[0].t > LIFE) tr.shift();
				for (let i = 1; i < tr.length; i++) {
					const a = tr[i - 1];
					const b = tr[i];
					const life = 1 - (now - b.t) / LIFE;
					if (life <= 0) continue;
					const color = combo >= 4 ? Phaser.Display.Color.HSVToRGB(((b.t / 700) % 1 + 1) % 1, 0.62, 1).color : o.ribbonTint || 0xffffff;
					g.lineStyle(Math.max(1, o.r * 0.4 * life), color, 0.5 * life);
					g.lineBetween(a.x, a.y, b.x, b.y);
					g.lineStyle(Math.max(1, o.r * 0.12 * life), 0xffffff, 0.7 * life);
					g.lineBetween(a.x, a.y, b.x, b.y);
				}
			}
		}

		// an expanding circle of light
		ring(x, y, tint = 0xffffff, size = 2.4, ms = 480) {
			const r = this.rings[this.ri++ % this.rings.length];
			this.scene.tweens.killTweensOf(r);
			r.setPosition(x, y).setTint(tint).setVisible(true).setAlpha(0.95).setScale(this.k * 0.2);
			this.scene.tweens.add({targets: r, scale: this.k * size, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => r.setVisible(false)});
		}

		pow(x, y, size = 1) {
			const b = this.burstImg;
			this.scene.tweens.killTweensOf(b);
			b.setPosition(x, y).setVisible(true).setAlpha(1).setScale(this.k * 0.2).setAngle(Math.random() * 40 - 20);
			this.scene.tweens.add({targets: b, scale: this.k * size * 1.25, duration: 200, ease: 'Back.easeOut'});
			this.scene.tweens.add({targets: b, alpha: 0, scale: this.k * size * 1.6, delay: 330, duration: 240, onComplete: () => b.setVisible(false)});
		}

		flash(strength = 0.7, ms = 260) {
			this.scene.tweens.killTweensOf(this.white);
			this.white.setAlpha(strength);
			this.scene.tweens.add({targets: this.white, alpha: 0, duration: ms, ease: 'Quad.easeOut'});
		}

		shake(power = 0.008, ms = 260) {
			if (BP.reducedMotion) return;
			this.scene.cameras.main.shake(ms, power);
		}

		// confetti falling over one spot for a while
		shower(x, y, seconds = 2, width = 150) {
			this.scene.time.addEvent({delay: 70, repeat: Math.round(seconds / 0.07), callback: () => this.em.rain.explode(2, x + (Math.random() - 0.5) * width * 2, y)});
		}

		// a rainbow cloud that hangs about
		cloud(x, y, seconds = 2, spread = 70) {
			this.scene.time.addEvent({delay: 110, repeat: Math.round(seconds / 0.11), callback: () => this.em.smoke.explode(2, x + (Math.random() - 0.5) * spread * 2, y + (Math.random() - 0.5) * spread)});
		}
	}

	Effects.PARTY = PARTY;
	BP.Effects = Effects;
})();
