/* Water Blaster Arena: things to grab (PowerUpManager). Every few seconds something appears on a free spot,
   bouncing so little eyes find it; walk over it to take it.
     bottle   +55 water                       gold     full tank and a spray boost (rare)
     super    super soaker for 8 seconds       shield   bubble: no water gets through for 6 seconds
     reverse  everybody ELSE sprays backwards for 5 seconds (silly, never mean for long)
   At most 3 at once, so the arena never fills up. The refill rush event drops a handful of bottles. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const KINDS = [['bottle', 5], ['super', 2], ['shield', 2], ['reverse', 1.2], ['gold', 0.7]];
	const TEX = {bottle: 'bottle', gold: 'gold-tank', super: 'power-super', shield: 'power-shield', reverse: 'power-reverse'};
	const GRAB = 58;

	class Pickups {
		constructor(scene, L, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.items = [];
			this.t = 6;
		}

		pickKind() {
			const total = KINDS.reduce((s, [, w]) => s + w, 0);
			let r = Math.random() * total;
			for (const [kind, w] of KINDS) {
				r -= w;
				if (r <= 0) return kind;
			}

			return 'bottle';
		}

		spawn(kind = this.pickKind(), at = null) {
			const p = at || this.L.randomFree(40);
			const s = this.scene;
			const spr = s.add.image(p.x, p.y - 20, TEX[kind]).setScale(0).setDepth(p.y);
			const shadow = s.add.image(p.x, p.y + 10, 'shadow').setScale(this.k * 0.5).setDepth(-50).setAlpha(0.7);
			s.tweens.add({targets: spr, scale: this.k * (kind === 'bottle' ? 0.95 : 0.85), duration: 380, ease: 'Back.easeOut'});
			s.fx.burst(p.x, p.y - 20, 'sparkle', 6, 0xffffff);
			this.items.push({kind, x: p.x, y: p.y, spr, shadow, life: kind === 'bottle' ? 16 : 12, ph: Math.random() * 6});
		}

		remove(it) {
			this.scene.tweens.killTweensOf(it.spr);
			it.spr.destroy();
			it.shadow.destroy();
			this.items.splice(this.items.indexOf(it), 1);
		}

		update(dt, t, fighters, live) {
			if (live) {
				this.t -= dt;
				if (this.t <= 0) {
					this.t = 7 + Math.random() * 4;
					if (this.items.length < 3) this.spawn();
				}
			}
			for (let i = this.items.length - 1; i >= 0; i--) {
				const it = this.items[i];
				it.life -= dt;
				const bob = Math.abs(Math.sin(t * 4 + it.ph)) * 12;
				it.spr.setPosition(it.x, it.y - 20 - bob).setAlpha(it.life < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 12)) : 1);
				if (it.kind !== 'bottle') it.spr.setRotation(Math.sin(t * 3 + it.ph) * 0.15);
				it.shadow.setScale(this.k * (0.5 - bob * 0.01));
				if (it.life <= 0) {
					this.remove(it);
					continue;
				}
				const f = fighters.find((o) => !o.out && Math.hypot(o.x - it.x, o.y - it.y) < GRAB);
				if (f) {
					this.take(f, it.kind, fighters);
					this.remove(it);
				}
			}
		}

		take(f, kind, fighters) {
			const s = this.scene;
			const fx = s.fx;
			fx.burst(f.x, f.y - 80, 'sparkle', 10, 0xffffff);
			if (kind === 'bottle') {
				f.tank = Math.min(100, f.tank + 55);
				WB.Sound.sfx.gulp();
				fx.pop(f.x, f.y - 190, `+${s.num(55)}`, '#bff0ff', 38, f.top);
			} else if (kind === 'gold') {
				f.tank = 100;
				f.boostT = 6;
				WB.Sound.sfx.golden();
				fx.burst(f.x, f.y - 80, 'star', 16, 0xffd23f);
				s.say('golden', true);
			} else if (kind === 'super') {
				f.superT = 8;
				f.tank = Math.max(f.tank, 60);
				WB.Sound.sfx.power();
				s.say('super', true);
			} else if (kind === 'shield') {
				f.shieldT = 6;
				WB.Sound.sfx.shieldPop();
				s.say('shield', true);
			} else if (kind === 'reverse') {
				WB.Sound.sfx.reverse();
				fighters.forEach((o) => {
					if (o !== f && !o.out && (!s.teams || o.team !== f.team)) {
						o.reverseT = 5;
						s.fx.burst(o.x, o.y - 160, 'sparkle', 6, 0x9b6bff);
					}
				});
				s.say('reverse', true);
			}
			f.setExpr('happy', 0.9);
		}

		clear() {
			while (this.items.length) this.remove(this.items[0]);
		}
	}

	WB.Pickups = Pickups;
})();
