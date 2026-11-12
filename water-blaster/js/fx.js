/* Water Blaster Arena: juice (EffectsManager). Splashes, mist, drips, bubbles, stars, floating words, ground
   puddles that slowly dry, splash rings and screen shakes. Emitters, puddles and texts are made once and reused,
   so nothing new is created in the middle of a round. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});

	class Fx {
		constructor(scene, k, Z) {
			this.scene = scene;
			this.k = k;
			const mk = (tex, cfg, depth = 5000) => scene.add.particles(0, 0, tex, {emitting: false, ...cfg}).setDepth(depth);
			this.em = {
				// drops thrown up by a hit or a landing: they arc and fall
				splash: mk('drop', {lifespan: 520, speed: {min: 120, max: 320}, angle: {min: 200, max: 340}, scale: {start: 0.95 * k, end: 0.35 * k}, gravityY: 900, rotate: {min: -30, max: 30}}),
				big: mk('drop', {lifespan: 800, speed: {min: 220, max: 560}, angle: {min: 190, max: 350}, scale: {start: 1.5 * k, end: 0.4 * k}, gravityY: 1000, rotate: {min: -40, max: 40}}),
				mist: mk('spray', {lifespan: 380, speed: {min: 20, max: 90}, scale: {start: 0.9 * k, end: 1.8 * k}, alpha: {start: 0.7, end: 0}}),
				sparkle: mk('sparkle', {lifespan: 600, speed: {min: 60, max: 220}, scale: {start: 0.9 * k, end: 0}, rotate: {min: 0, max: 360}, gravityY: 120}),
				star: mk('star', {lifespan: 800, speed: {min: 120, max: 300}, scale: {start: 0.9 * k, end: 0.1 * k}, rotate: {min: 0, max: 360}, gravityY: 500}),
				bubble: mk('bubble', {lifespan: 900, speed: {min: 20, max: 80}, angle: {min: 240, max: 300}, scale: {start: 0.6 * k, end: 1.1 * k}, alpha: {start: 0.95, end: 0}, gravityY: -60}),
				drip: mk('drop', {lifespan: 420, speedY: {min: 40, max: 90}, speedX: {min: -12, max: 12}, scale: {start: 0.55 * k, end: 0.3 * k}, gravityY: 600, alpha: {start: 0.95, end: 0.3}})
			};
			// puddles left where the water lands: a pool of 40, each fades out by itself
			this.puddles = Array.from({length: 40}, (_, i) =>
				scene.add.image(0, 0, `puddle-${'abc'[i % 3]}`).setScale(k).setDepth(-9000).setVisible(false));
			this.pi = 0;
			this.rings = Array.from({length: 10}, () => scene.add.image(0, 0, 'ring-splash').setScale(k).setDepth(-8000).setVisible(false));
			this.ri = 0;
			// floating texts ("TOTALLY SOAKED!", "+50"): a small reusable pool
			this.texts = Array.from({length: 10}, () =>
				scene.add.text(0, 0, '', {fontFamily: 'Fredoka, "Baloo Bhaijaan 2", sans-serif', fontSize: '34px', fontStyle: '800', color: '#ffffff', stroke: '#163552', strokeThickness: 8, padding: {x: 8, y: 8}, resolution: Z})
					.setOrigin(0.5).setDepth(8000).setVisible(false));
			this.ti = 0;
			this.canTint = scene.game.renderer.type === Phaser.WEBGL;
		}

		burst(x, y, kind, n = 8, tint = 0xffffff) {
			const e = this.em[kind] || this.em.splash;
			if (this.canTint) e.particleTint = tint;
			e.explode(n, x, y);
		}

		// a drop hits: a crown of drops, a puff of mist
		splash(x, y, n = 5) {
			this.burst(x, y, 'splash', n);
			this.burst(x, y, 'mist', 2);
		}

		drip(x, y) {
			this.em.drip.explode(1, x + (Math.random() - 0.5) * 30, y);
		}

		puddle(x, y, size = 1) {
			const p = this.puddles[this.pi++ % this.puddles.length];
			this.scene.tweens.killTweensOf(p);
			p.setPosition(x, y).setVisible(true).setAlpha(0.95).setScale(this.k * size * 0.4).setRotation(Math.random() * 0.4 - 0.2);
			this.scene.tweens.add({targets: p, scale: this.k * size, duration: 220, ease: 'Quad.easeOut'});
			this.scene.tweens.add({targets: p, alpha: 0, delay: 2600, duration: 2400, onComplete: () => p.setVisible(false)});
		}

		ring(x, y, size = 1) {
			const r = this.rings[this.ri++ % this.rings.length];
			this.scene.tweens.killTweensOf(r);
			r.setPosition(x, y).setVisible(true).setAlpha(1).setScale(this.k * 0.3 * size);
			this.scene.tweens.add({targets: r, scale: this.k * 1.3 * size, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => r.setVisible(false)});
		}

		pop(x, y, text, color = '#ffffff', size = 34, flip = false) {
			const t = this.texts[this.ti++ % this.texts.length];
			this.scene.tweens.killTweensOf(t);
			const ar = WB.Sound.state.lang === 'ar';
			t.setFontFamily(ar ? '"Baloo Bhaijaan 2", Fredoka, sans-serif' : 'Fredoka, "Baloo Bhaijaan 2", sans-serif');
			t.setText(ar ? `‫${text}‬` : text).setColor(color).setFontSize(size).setPosition(x, y).setVisible(true).setAlpha(1).setScale(0.4).setRotation(flip ? Math.PI : 0);
			this.scene.tweens.add({targets: t, scale: 1, duration: 300, ease: 'Back.easeOut'});
			this.scene.tweens.add({targets: t, y: y + (flip ? 60 : -60), alpha: 0, delay: 900, duration: 500, ease: 'Quad.easeIn', onComplete: () => t.setVisible(false)});
		}

		shake(power = 0.005, ms = 200) {
			if (WB.reducedMotion) power *= 0.35;
			this.scene.cameras.main.shake(ms, power);
		}
	}

	WB.Fx = Fx;
})();
