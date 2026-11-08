/* Monkey Mischief: juice. Particle bursts, speed trails, floating "+1"s and screen shakes.
   Emitters and text are made once and reused, so nothing new is created in the middle of a match. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});

	class Fx {
		constructor(scene, k, Z) {
			this.scene = scene;
			this.k = k;
			const mk = (tex, cfg) =>
				scene.add.particles(0, 0, tex, {emitting: false, ...cfg}).setDepth(5000);
			this.em = {
				puff: mk('puff', {lifespan: 520, speed: {min: 40, max: 140}, scale: {start: 0.9 * k, end: 0.2 * k}, alpha: {start: 0.8, end: 0}, gravityY: -60}),
				sparkle: mk('sparkle', {lifespan: 700, speed: {min: 80, max: 260}, scale: {start: 0.9 * k, end: 0}, rotate: {min: 0, max: 360}, gravityY: 200}),
				star: mk('star', {lifespan: 800, speed: {min: 120, max: 300}, scale: {start: 0.9 * k, end: 0.1 * k}, rotate: {min: 0, max: 360}, gravityY: 500}),
				leaf: mk('leaf', {lifespan: 900, speed: {min: 60, max: 180}, scale: {start: 1.1 * k, end: 0.6 * k}, rotate: {min: 0, max: 360}, gravityY: 160, alpha: {start: 1, end: 0}}),
				drop: mk('drop', {lifespan: 500, speed: {min: 90, max: 220}, angle: {min: 200, max: 340}, scale: {start: 1.1 * k, end: 0.4 * k}, gravityY: 700}),
				dot: mk('dot', {lifespan: 420, speed: {min: 10, max: 40}, scale: {start: 0.9 * k, end: 0}, alpha: {start: 0.9, end: 0}})
			};
			// floating texts ("+1", "+5"): a small reusable pool
			this.texts = Array.from({length: 14}, () =>
				scene.add.text(0, 0, '', {fontFamily: 'Fredoka, "Baloo Bhaijaan 2", sans-serif', fontSize: '34px', fontStyle: '700', color: '#ffffff', stroke: '#3b2416', strokeThickness: 7, resolution: Z})
					.setOrigin(0.5).setDepth(8000).setVisible(false));
			this.ti = 0;
			this.canTint = scene.game.renderer.type === Phaser.WEBGL;
		}

		burst(x, y, tex, n = 8, tint = 0xffffff) {
			const e = this.em[tex] || this.em.puff;
			if (this.canTint) e.particleTint = tint;
			e.explode(n, x, y);
		}

		trail(x, y, tint) {
			const e = this.em.dot;
			if (this.canTint) e.particleTint = tint;
			e.explode(1, x + (Math.random() - 0.5) * 16, y);
		}

		pop(x, y, text, color = '#ffffff', size = 34, flip = false) {
			const t = this.texts[this.ti++ % this.texts.length];
			this.scene.tweens.killTweensOf(t);
			t.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setVisible(true).setAlpha(1).setScale(0.4).setRotation(flip ? Math.PI : 0);
			this.scene.tweens.add({targets: t, scale: 1, duration: 260, ease: 'Back.easeOut'});
			this.scene.tweens.add({targets: t, y: y + (flip ? 50 : -50), alpha: 0, delay: 450, duration: 450, ease: 'Quad.easeIn', onComplete: () => t.setVisible(false)});
		}

		shake(power = 0.006, ms = 220) {
			this.scene.cameras.main.shake(ms, power);
		}
	}

	MM.Fx = Fx;
})();
