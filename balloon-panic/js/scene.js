/* Balloon Panic: GameScene. One Phaser scene, started in one of three ways (scene.restart(cfg)):
     attract  four buddies play by themselves behind the title
     lobby    the whole cast waits to be picked: tap a buddy to join or leave
     match    the real game
   Phaser cleans every tween, timer, emitter and input listener of the old scene on restart;
   nothing here lives outside the scene. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});

	class GameScene extends Phaser.Scene {
		constructor() {
			super('game');
		}

		init(cfg) {
			this.cfg = cfg && cfg.mode ? cfg : BP.attractConfig();
		}

		create() {
			const Z = (this.Z = BP.Z);
			this.k = 1 / Z;
			const cfg = this.cfg;
			const lobby = cfg.mode === 'lobby';
			const L = (this.L = BP.Layout.make(lobby ? 2 : cfg.players.length));
			if (lobby) L.center = {x: L.W / 2, y: L.H * 0.5};
			const cam = this.cameras.main;
			cam.setZoom(Z);
			cam.centerOn(L.W / 2, L.H / 2);
			cam.setBackgroundColor('#9fe0ff');
			this.input.addPointer(5);
			// a different happy place every time: meadow, forest, beach or rainbow park (never the same twice in a row)
			const themes = BP.Art.THEMES.filter((t) => t !== BP.lastTheme);
			this.theme = cfg.theme || themes[Math.floor(Math.random() * themes.length)];
			BP.lastTheme = this.theme;
			const room = BP.Art.build(this, L, this.theme);
			this.add.image(L.W / 2, L.H / 2, room).setScale(this.k * 1.06).setDepth(-100); // a little bigger than the screen, so a shake never shows its edge
			// two little clouds drift slowly across the sky
			if (!BP.reducedMotion) {
				[[0.1, 0.05, 0.7, 90000], [0.6, 0.2, 0.55, 120000]].forEach(([fx, fy, sc, ms]) => {
					const cl = this.add.image(L.W * fx, L.H * fy, 'bp-cloud').setDepth(-90).setScale(this.k * sc).setAlpha(0.95);
					this.tweens.add({targets: cl, x: {from: -200, to: L.W + 200}, duration: ms, repeat: -1, delay: -ms * fx});
				});
			}
			this.fx = new BP.Effects(this);
			// the scene object is reused on every restart: forget everything from last time
			this.input2 = null;
			this.round = null;
			this.cast = null;
			this.players = null;
			this.slow = 1; // 1 = normal speed; lower while a last-instant escape plays in slow motion
			this.slowT = 0;
			this.punch = 0;
			this.lean = 0;
			this.tweens.timeScale = 1;
			this.time.timeScale = 1;
			if (lobby) {
				this.buildLobby();
			} else {
				const attract = cfg.mode === 'attract';
				this.players = new BP.Players(this, L, cfg.players, {buttons: !attract});
				if (attract) this.players.list.forEach((b) => [b.popIcon, b.popText].forEach((o) => o.setVisible(false)));
				this.score = new BP.Score(this.players);
				this.pass = new BP.PassManager(this);
				this.explosion = new BP.Explosion(this);
				this.twists = new BP.Events(this);
				this.round = new BP.Round(this, {attract});
				if (!attract) this.input2 = new BP.Input(this);
				// "pass it this way": three chevrons marching from the balloon to whoever is next
				this.chevrons = [0, 1, 2].map(() => BP.Art.add(this, 'bp-arrow').setDepth(4985).setVisible(false));
				this.arrowKick = 0;
				this.round.begin();
			}
			this.events.once('shutdown', () => {
				if (this.input2) this.input2.destroy();
				this.input2 = null;
			});
			BP.events.emit('scene-ready', this);
		}

		// a number in the digits of the language being played
		num(n) {
			return BP.Sound.state.lang === 'ar' ? Number(n).toLocaleString('ar-EG') : String(n);
		}

		say(key) {
			if (this.round && this.round.quiet) return;
			BP.Sound.say(key);
		}

		// a last-instant escape: half a second of slow motion and a little camera punch
		slowmo() {
			if (BP.reducedMotion) return;
			this.slowT = 0.5;
			this.punch = 0.07;
			BP.Sound.sfx.phew();
		}

		spinArrows() {
			this.arrowKick = 1;
		}

		/* ---------- the lobby: tap a buddy to join ---------- */
		buildLobby() {
			const A = BP.Art;
			const L = this.L;
			const lang = BP.Sound.state.lang;
			this.cast = A.CAST.map((sp, i) => {
				const seat = L.lobby[i];
				const s = seat.scale;
				const b = new BP.Buddy(this, {sp, idx: i, seat: {x: seat.x, y: seat.y, side: 1, dir: {x: 0, y: -1}}, scale: s});
				b.halo = A.add(this, 'bp-glow', seat.x, seat.y - 96 * s).setAlpha(0).setDepth(20).setBlendMode('ADD');
				A.sc(b.halo, 2.4 * s);
				b.podium = A.add(this, 'bp-podium-off', seat.x, seat.y + 6 * s).setDepth(50);
				A.sc(b.podium, s * 0.7, s * 0.8);
				b.label = this.add.text(seat.x, seat.y + 84 * s, window.BP_WORDS.UI[lang][`n_${sp}`], {
					fontFamily: lang === 'ar' ? '"Baloo Bhaijaan 2", Fredoka, sans-serif' : 'Fredoka, "Baloo Bhaijaan 2", sans-serif',
					fontSize: `${Math.round(34 * s)}px`, fontStyle: lang === 'ar' ? '800' : '700', color: '#ffffff', stroke: A.INK, strokeThickness: 7, resolution: BP.Z, padding: {x: 6, y: 8}
				}).setOrigin(0.5).setDepth(56);
				// picked: a glowing ring round the podium and a big ✓ badge, both in the player's colour
				b.ring = this.add.graphics().setDepth(49).setAlpha(0);
				b.badge = this.add.container(seat.x + 74 * s, seat.y - 168 * s).setDepth(300).setScale(0);
				b.badgeBg = this.add.graphics();
				b.badge.add([b.badgeBg, this.add.text(0, -2, '✓', {fontFamily: 'Fredoka, sans-serif', fontSize: '40px', fontStyle: '700', color: '#ffffff', stroke: A.INK, strokeThickness: 6, resolution: BP.Z}).setOrigin(0.5)]);
				b.lobbyScale = s;

				return b;
			});
			this.input.on('pointerdown', (ptr) => {
				let best = null;
				let bestD = 150;
				for (const b of this.cast) {
					const m = b.mid;
					const d = Math.hypot(ptr.worldX - m.x, (ptr.worldY - m.y) * 0.75);
					if (d < bestD) {
						best = b;
						bestD = d;
					}
				}
				if (best) BP.events.emit('pick', best.sp);
			});
			// now and then one of them shows off, so the lobby never stands still
			this.time.addEvent({
				delay: 2600, loop: true, callback: () => {
					const b = this.cast[Math.floor(Math.random() * this.cast.length)];
					const was = BP.Sound.quiet;
					BP.Sound.quiet = true;
					try {
						b.tease();
					} finally {
						BP.Sound.quiet = was; // never leave the effects switched off, even if something goes wrong
					}
				}
			});
			this.setPicks(this.cfg.picks || []);
		}

		// picks: four seats, each a species name or null. changed/on: who just joined or left (for the little show)
		setPicks(picks, changed, on) {
			if (!this.cast) return;
			const A = BP.Art;
			this.cast.forEach((b) => {
				const slot = picks.indexOf(b.sp);
				const person = slot >= 0 ? BP.PEOPLE[slot] : null;
				b.setPerson(person);
				b.podium.setTexture(person ? `bp-podium-${person.id}` : 'bp-podium-off');
				this.tweens.add({targets: b.halo, alpha: person ? 0.5 : 0, duration: 250});
				if (person) b.halo.setTint(b.tint);
				// picked buddies stand tall and bright; the others step back and fade, so the choice is clear at a glance
				const sc = b.lobbyScale;
				this.tweens.killTweensOf([b.c, b.ring, b.badge, b.label]);
				this.tweens.add({targets: b.c, scale: sc * (person ? 1.1 : 0.9), duration: 280, ease: 'Back.easeOut'});
				this.dim(b, !person);
				this.tweens.add({targets: b.label, alpha: person ? 1 : 0.5, duration: 250});
				b.label.setColor('#ffffff').setStroke(person ? b.color : A.INK, person ? 9 : 7);
				b.ring.clear();
				if (person) {
					b.ring.lineStyle(10 * sc, b.tint, 1).strokeEllipse(b.seat.x, b.seat.y + 6 * sc, 230 * sc, 74 * sc);
					b.ring.lineStyle(4 * sc, 0xffffff, 0.9).strokeEllipse(b.seat.x, b.seat.y + 6 * sc, 230 * sc, 74 * sc);
					b.ring.setAlpha(1);
					this.tweens.add({targets: b.ring, alpha: 0.55, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
					b.badgeBg.clear().fillStyle(0x000000, 0.25).fillCircle(0, 4, 30).fillStyle(b.tint, 1).fillCircle(0, 0, 30).lineStyle(5, BP.Art.num(A.INK), 1).strokeCircle(0, 0, 30);
					this.tweens.add({targets: b.badge, scale: sc * 1.1, duration: 360, ease: 'Back.easeOut'});
					this.tweens.add({targets: b.badge, y: b.seat.y - 168 * sc - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 360});
				} else {
					b.ring.setAlpha(0);
					b.badge.setScale(0).setY(b.seat.y - 168 * sc);
				}
				b.setBase(person ? 'happy' : 'idle');
				if (b.sp === changed) {
					const m = b.mid;
					if (on) {
						b.jump(60, 0.5);
						b.setExpr('cheer', 1.2);
						this.fx.burst('star', m.x, m.y - 40, 12, b.tint);
						this.fx.ring(m.x, b.seat.y, b.tint, 1.6, 400);
					} else {
						b.setExpr('sad', 1);
					}
				}
			});
		}

		// a buddy nobody picked: solid but dusky (a see-through buddy shows its own insides); the canvas renderer can't tint, so it fades
		dim(b, on) {
			if (this.game.renderer.type !== Phaser.WEBGL) {
				b.c.setAlpha(on ? 0.5 : 1);

				return;
			}
			b.c.setAlpha(1);
			const walk = (list) => list.forEach((o) => {
				if (o.list) walk(o.list);
				else if (o.setTint) on ? o.setTint(0xb4b4c4) : o.clearTint();
			});
			walk(b.c.list);
		}

		// "all four seats are taken": the buddy shakes its head
		lobbyNo(sp) {
			const b = this.cast && this.cast.find((x) => x.sp === sp);
			if (!b) return;
			b.setExpr('sad', 0.8);
			this.tweens.add({targets: b, kx: {from: -12, to: 12}, duration: 70, yoyo: true, repeat: 2, onComplete: () => (b.kx = 0)});
		}

		/* ---------- every frame ---------- */
		update(time, delta) {
			const real = Math.min(delta / 1000, 0.05);
			// slow motion eases in and out, and slows the tweens and timers with it
			this.slowT -= real;
			this.slow += ((this.slowT > 0 ? 0.3 : 1) - this.slow) * Math.min(1, real * 12);
			this.tweens.timeScale = this.slow;
			this.time.timeScale = this.slow;
			const dt = real * this.slow;
			this.clock = (this.clock || 0) + dt;
			const t = this.clock;
			if (this.cast) {
				const ptr = this.input.activePointer;
				const look = ptr && ptr.isDown ? {x: ptr.worldX, y: ptr.worldY} : null;
				for (const b of this.cast) {
					b.focus = look;
					b.update(dt, t);
				}

				return;
			}
			if (this.input2) this.input2.update();
			this.round.update(dt, t);
			this.players.update(dt, t);
			this.hint(dt, t);
			this.fx.ribbon(this.round.objs, this.time.now, this.round.combo);
			// the camera leans in a touch as the pop gets close, and punches on a close escape
			const main = this.round.state === 'play' ? this.round.main() : null;
			const tense = main && !BP.reducedMotion ? Math.max(0, main.shown - 0.6) / 0.4 : 0;
			this.lean += (tense * 0.035 - this.lean) * Math.min(1, real * 3);
			this.punch *= Math.pow(0.004, real);
			this.cameras.main.setZoom(this.Z * (1 + this.lean + this.punch));
		}

		// the marching chevrons: from the most urgent balloon in a child's hands to the buddy it would go to
		hint(dt, t) {
			const r = this.round;
			const aim = this.input2 && this.input2.aim;
			let o = aim ? aim.obj : null;
			let target = aim ? aim.target : null;
			if (!o && r.state === 'play') {
				o = r.objs.filter((x) => x.state === 'held' && !x.holder.bot).sort((a, b) => a.left - b.left)[0] || null;
				target = o ? this.pass.next(o) : null;
			}
			this.arrowKick *= Math.pow(0.02, dt);
			const show = !!(o && target && o.state === 'held' && r.state === 'play');
			if (!show) {
				this.chevrons.forEach((c) => c.setVisible(false));

				return;
			}
			const m = target.mid;
			const dx = m.x - o.x;
			const dy = m.y - o.y;
			const d = Math.hypot(dx, dy) || 1;
			this.chevrons.forEach((c, i) => {
				const at = o.r + 46 + i * 42;
				if (at > d - 110) {
					c.setVisible(false);

					return;
				}
				const wave = (Math.sin(t * 9 - i * 1.2) + 1) / 2;
				c.setVisible(true).setPosition(o.x + (dx / d) * at, o.y + (dy / d) * at).setRotation(Math.atan2(dy, dx) + this.arrowKick * 6).setTint(target.tint).setAlpha(0.45 + wave * 0.55);
				BP.Art.sc(c, 0.8 + wave * 0.25 + this.arrowKick);
			});
		}
	}

	BP.GameScene = GameScene;
})();
