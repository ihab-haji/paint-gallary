/* Balloon Panic: ExplosionManager. The pop, and what it does to whoever was holding on.
   Every pop is a show: a flash, a comic burst, shockwaves, confetti, stars, rainbow smoke, a screen shake and a
   knock-back. Then the buddy gets one of seven silly looks, dealt like cards so two pops in a row never match:
     paint · spiky hair · giant afro · frozen in shock · rainbow smoke · party hat and confetti · spinning top
   Nothing hurts and nothing is scary: the looks are gone when the next round starts. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const LOOKS = ['paint', 'spiky', 'afro', 'shock', 'smoke', 'confetti', 'spin'];
	const WIGS = [0xff5fd2, 0x34e0b0, 0xffd23f, 0x6ccbff, 0xff9417];

	class Explosion {
		constructor(scene) {
			this.scene = scene;
			this.bag = [];
			this.lastLook = null;
		}

		deal() {
			if (!this.bag.length) {
				this.bag = LOOKS.slice().sort(() => Math.random() - 0.5);
				if (this.bag[this.bag.length - 1] === this.lastLook) this.bag.reverse();
			}
			this.lastLook = this.bag.pop();

			return this.lastLook;
		}

		// returns the look the buddy got
		fire(obj, victim) {
			const sc = this.scene;
			const fx = sc.fx;
			const S = BP.Sound.sfx;
			const {x, y} = obj;
			if (obj.kind === 'bomb') S.boom();
			else S.pop();
			fx.flash(0.8, 300);
			fx.shake(0.015, 380);
			fx.pow(x, y, 1.15);
			fx.ring(x, y, 0xffffff, 3.4, 520);
			sc.time.delayedCall(90, () => fx.ring(x, y, obj.tint, 4.6, 640));
			fx.burst('confetti', x, y, 48);
			fx.burst('star', x, y, 18, 0xffd23f);
			fx.burst('smoke', x, y, 16);
			if (obj.kind === 'bomb') fx.burst('spark', x, y, 26);
			else fx.burst('shred', x, y, 20, obj.tint);
			// knocked back, away from the pop
			const m = victim.mid;
			const d = Math.hypot(m.x - x, m.y - y) || 1;
			victim.knock(((m.x - x) / d) * 52, ((m.y - y) / d) * 30);
			const look = this.deal();
			this[look](victim);
			// everyone else thinks it is hilarious
			sc.players.list.forEach((b, i) => {
				if (b === victim) return;
				sc.time.delayedCall(260 + i * 120, () => {
					if (Math.random() < 0.6) {
						b.setExpr('laugh', 2.2);
						S.laugh(b.spec.pitch);
					} else {
						b.setExpr('cheer', 2.2);
						b.dance(1.5);
					}
				});
			});

			return look;
		}

		later(ms, fn) {
			const token = this.scene.round.token;
			this.scene.time.delayedCall(ms, () => token === this.scene.round.token && fn());
		}

		// a face full of colourful paint
		paint(b) {
			const tints = BP.Effects.PARTY.filter((t) => t !== 0xffffff).sort(() => Math.random() - 0.5);
			[[-34, -20, 0.9], [30, -30, 0.75], [4, 26, 1], [-44, 30, 0.6], [44, 18, 0.7], [0, -52, 0.65]].forEach(([x, y, s], i) => {
				this.scene.time.delayedCall(i * 60, () => {
					b.wear('bp-splat', x, y, {tint: tints[i % tints.length], scale: s, angle: Math.random() * 360});
					BP.Sound.sfx.splat();
				});
			});
			b.setExpr('shock', 1.1);
			this.later(1100, () => {
				b.setExpr('cry', 2);
				BP.Sound.sfx.cry(b.spec.pitch);
			});
		}

		// hair standing straight up
		spiky(b) {
			b.wear('bp-spikes', 0, -34, {tint: BP.Art.num(b.spec.dark)});
			b.wideBoost = 0.25;
			b.setExpr('shock', 2.8);
			const f = b.face;
			this.scene.fx.burst('zig', f.x, f.y - 60, 9);
			BP.Sound.sfx.zap();
			this.later(700, () => this.scene.fx.burst('zig', b.face.x, b.face.y - 70, 6));
		}

		// a giant fluffy wig
		afro(b) {
			b.wear('bp-afro', 0, -30, {tint: WIGS[Math.floor(Math.random() * WIGS.length)], behind: true, scale: 1.08});
			BP.Sound.sfx.boing();
			b.setExpr('shock', 0.8);
			this.later(800, () => {
				b.setExpr('smug', 2.2);
				b.dance(1.2);
			});
		}

		// eyes like saucers, stiff as a board, then... timber
		shock(b) {
			b.wideBoost = 0.4;
			b.setExpr('shock', 2.9);
			b.fall(2.4);
			BP.Sound.sfx.gasp(b.spec.pitch);
			this.later(1100, () => BP.Sound.sfx.splat());
		}

		// lost in a rainbow cloud
		smoke(b) {
			const f = b.face;
			this.scene.fx.cloud(f.x, f.y, 2.3, 80);
			b.setExpr('dizzy', 1.4);
			this.later(1400, () => {
				b.setExpr('cry', 1.6);
				BP.Sound.sfx.cry(b.spec.pitch);
			});
		}

		// a party hat lands on its head and it rains confetti
		confetti(b) {
			b.wear('bp-hat', 6, -52, {angle: 10});
			const f = b.face;
			this.scene.fx.shower(f.x, f.y - 190, 2.4, 120);
			BP.Sound.sfx.horn();
			b.setExpr('shock', 0.5);
			this.later(500, () => {
				b.setExpr('laugh', 2.4);
				BP.Sound.sfx.laugh(b.spec.pitch);
			});
		}

		// round and round like a spinning top, then dizzy
		spin(b) {
			b.spin(1.6);
			b.setExpr('shock', 1.6);
			BP.Sound.sfx.spin();
			this.later(1600, () => {
				const f = b.face;
				this.scene.fx.burst('star', f.x, f.y - 70, 8, 0xffd23f);
			});
		}
	}

	BP.Explosion = Explosion;
})();
