/* Monkey Mischief: power-up bubbles. Touch one to get its power; a little icon with a shrinking ring
   floats by your monkey's head so everyone can see what you have and for how long.
     speed   run much faster (6 s)            shield  the next trap or bonk just pops the bubble (15 s)
     magnet  nearby bananas fly to you (7 s)  jump    your button becomes a jump: over water, rocks, peels (9 s)
     bomb    your button throws a slippery bomb (once, within 14 s) */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const KINDS = ['speed', 'shield', 'magnet', 'jump', 'bomb'];
	const TIME = {speed: 6, shield: 15, magnet: 7, jump: 9, bomb: 14};
	const LIFE = 14;

	class PowerUps {
		constructor(scene, L, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.list = Array.from({length: 3}, () => ({
				on: false, kind: 'speed', x: 0, y: 0, t: 0,
				img: scene.add.image(0, 0, 'power-speed').setScale(k).setVisible(false),
				sh: scene.add.image(0, 0, 'shadow').setScale(k * 0.6).setVisible(false)
			}));
			this.bag = [];
		}

		get active() {
			return this.list.filter((p) => p.on).length;
		}

		spawn(monkeys) {
			const p = this.list.find((q) => !q.on);
			if (!p) return;
			// a shuffled bag: every power shows up before any repeats
			if (!this.bag.length) this.bag = Phaser.Utils.Array.Shuffle(KINDS.slice());
			const kind = this.bag.pop();
			let spot = null;
			for (let i = 0; i < 20 && !spot; i++) {
				const s = this.L.randomFree(Math.random, 46);
				if (monkeys.every((m) => Math.hypot(m.x - s.x, m.y - s.y) > 160)) spot = s;
			}
			spot = spot || this.L.randomFree(Math.random, 46);
			Object.assign(p, {on: true, kind, x: spot.x, y: spot.y, t: LIFE});
			p.img.setTexture(`power-${kind}`).setVisible(true).setScale(0).setAlpha(1).setPosition(spot.x, spot.y - 40);
			p.sh.setVisible(true).setPosition(spot.x, spot.y).setDepth(spot.y - 3);
			this.scene.tweens.add({targets: p.img, scale: this.k, duration: 450, ease: 'Back.easeOut'});
			this.scene.fx.burst(spot.x, spot.y - 40, 'sparkle', 8, 0xffffff);
		}

		apply(m, kind) {
			m.givePower(kind, TIME[kind]);
			if (kind === 'shield') m.shield = true;
			MM.Sound.sfx.power();
			this.scene.say(kind, true);
			this.scene.fx.burst(m.x, m.y - 60, 'star', 12, m.color);
			this.scene.fx.pop(m.x, m.y - 160, '★', '#ffe14d', 46, m.top);
			m.setExpr('happy', 1);
		}

		clearAll() {
			this.list.forEach((p) => {
				p.on = false;
				p.img.setVisible(false);
				p.sh.setVisible(false);
			});
		}

		update(dt, time, monkeys) {
			for (const p of this.list) {
				if (!p.on) continue;
				p.t -= dt;
				if (p.t <= 0) {
					p.on = false;
					this.scene.fx.burst(p.x, p.y - 40, 'puff', 6, 0xffffff);
					p.img.setVisible(false);
					p.sh.setVisible(false);
					continue;
				}
				p.img.setPosition(p.x, p.y - 40 + Math.sin(time * 3 + p.x) * 7).setDepth(p.y);
				p.img.setAlpha(p.t < 3 ? 0.5 + 0.5 * Math.sin(time * 20) : 1);
				for (const m of monkeys) {
					if (m.state !== 'ok' || Math.hypot(m.x - p.x, m.y - p.y) > 50) continue;
					p.on = false;
					p.img.setVisible(false);
					p.sh.setVisible(false);
					this.apply(m, p.kind);
					break;
				}
			}
		}
	}

	PowerUps.KINDS = KINDS;
	MM.PowerUps = PowerUps;
})();
