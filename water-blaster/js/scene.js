/* Water Blaster Arena: the Phaser scene (GameScene + RoundManager). Builds the arena, the splashers and every
   system, then runs one round:
     attract  Ducky-style bots splash each other behind the start menu (nobody gets soaked)
     ready    everyone can already run and spray; each player presses their water button (✓) → 3 · 2 · 1 · SPLASH
     play     Last one dry (or Teams): soaked players fly into the pool; surprises every ~15 s;
              after 70 s it is BIG SPLASH TIME (nobody dries off any more, water soaks more) so rounds stay short
     over     the winner celebrates; main.js shows the stars and starts the next round by itself
   Started with scene.restart(cfg). Phaser removes every tween, timer, emitter, object and input listener of the old
   round on restart; the blaster hiss loops are stopped in shutdown(). Nothing lives outside the scene. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const SPLASH_TIME = 70;
	const TAP_RATE = 48;

	class GameScene extends Phaser.Scene {
		constructor() {
			super('game');
		}

		init(cfg) {
			this.cfg = cfg && cfg.fighters ? cfg : WB.attractConfig();
		}

		get live() {
			return this.state === 'play';
		}

		create() {
			const Z = WB.Z;
			const k = 1 / Z;
			this.k = k;
			const cfg = this.cfg;
			const cam = this.cameras.main;
			cam.setZoom(Z);
			cam.centerOn(WB.Layout.W / 2, WB.Layout.H / 2);
			cam.setBackgroundColor(cfg.theme === 'beach' ? '#f6cf87' : '#bfe6f5');
			this.input.addPointer(5);
			this.teams = !!cfg.teams;
			this.slippery = false;
			this.splashTime = false;
			this.clock = 0;
			this.voiceAt = -10;

			const slotPlayers = [null, null, null, null];
			cfg.fighters.forEach((f) => (slotPlayers[f.slot] = f.player));
			const L = (this.L = WB.Layout.make(slotPlayers));
			this.physics.world.setBounds(0, 0, L.W, L.H);
			WB.Art.build(this, Z, cfg.fighters, cfg.theme);
			WB.Art.ground(this, Z, L, cfg.theme);
			cfg.fighters.forEach((f) => {
				const img = WB.faces && WB.faces[f.player.id];
				const key = `sticker-${f.player.id}`;
				if (f.bot || !img || !img.complete || !img.naturalWidth) return;
				// the hero may have changed since the last game: always take the fresh picture
				if (this.textures.exists(key)) this.textures.remove(key);
				this.textures.addImage(key, img);
			});
			this.add.image(0, 0, 'ground').setOrigin(0).setScale(k).setDepth(-10000);
			this.fx = new WB.Fx(this, k, Z);
			this.buildArena();

			// splashers
			const wins = cfg.wins || {};
			this.fighters = cfg.fighters.map((p, i) => {
				const c = L.corners[p.slot];
				const f = new WB.Fighter(this, {
					player: p.player, slot: p.slot, idx: i, bot: !!p.bot, char: p.char, weapon: p.weapon,
					team: this.teams ? (p.slot % 2) : null, x: c.start.x, y: c.start.y, k
				});
				f.top = c.top;
				f.wins = wins[p.player.id] || 0;

				return f;
			});
			const zones = this.fighters.map((f) => f.zone);
			const solids = [];
			const solid = (x, y, r) => {
				const z = this.add.zone(x, y, r * 2, r * 2);
				this.physics.add.existing(z, true);
				z.body.setCircle(r);
				solids.push(z);
			};
			L.corners.forEach((c) => solid(c.cx, c.cy, c.r));
			L.solids.forEach((o) => solid(o.x, o.y, o.r));
			this.physics.add.collider(zones, solids);
			this.physics.add.collider(zones, zones, (a, b) => this.onBump(a.fighter, b.fighter));

			// systems
			this.water = new WB.Water(this, L, k);
			this.pickups = new WB.Pickups(this, L, k);
			this.surprises = new WB.Events(this, L, k);

			if (cfg.attract) {
				this.state = 'attract';
				this.hud = {update() {}, announce() {}, event() {}, shout() {}, countdown() {}, markReady() {}};
				this.surprises.t = 5;
			} else {
				this.hud = new WB.Hud(this, L, this.fighters, k, Z, cfg.round || 1);
				const humans = this.fighters.filter((f) => !f.bot).map((f) => ({slot: f.slot, fighter: f}));
				this.input2 = new WB.Input(this, L, humans, {k});
				this.state = 'ready';
				this.hud.showReady(this.input2.pads);
				this.time.delayedCall(500, () => this.say(cfg.round > 1 ? 'next' : 'ready'));
				WB.Sound.music(true, {menu: true}); // the soft tune while everyone gets ready
				// bots are ready at once
				if (!humans.length) this.time.delayedCall(800, () => this.countdown());
			}
			this.events.once('shutdown', () => this.shutdown());
			WB.events.emit('scene-ready', this);
		}

		/* ---------- the arena: cover, umbrellas, taps, slide, toys ---------- */
		buildArena() {
			const L = this.L;
			const k = this.k;
			const P = L.pool;
			L.solids.forEach((o) => {
				let s = null;
				if (o.kind === 'wall') s = this.add.image(o.x, o.y + 4, 'wall').setOrigin(0.5, 0.75).setScale(k).setDepth(o.y + 20);
				else if (o.kind === 'barrel') s = this.add.image(o.x, o.y + 18, 'barrel').setOrigin(0.5, 0.9).setScale(k).setDepth(o.y + 18);
				else if (o.kind === 'duck') s = this.add.image(o.x, o.y + 30, 'duck').setOrigin(0.5, 0.85).setScale(k * 1.05).setDepth(o.y + 30);
				else if (o.kind === 'donut') s = this.add.image(o.x, o.y + 22, 'donut').setOrigin(0.5, 0.8).setScale(k * 1.05).setDepth(o.y + 22);
				else if (o.kind === 'palm') {
					s = this.add.image(o.x, o.y, 'palm').setOrigin(0.5, 236 / 240).setScale(k).setDepth(o.y);
					this.tweens.add({targets: s, angle: {from: -2, to: 2}, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
				}
				o.sprite = s;
			});
			// the wall parts share the middle one's picture
			L.solids.filter((o) => o.kind === 'wall-part').forEach((o) => (o.sprite = L.solids.find((m) => m.kind === 'wall' && m.wall === o.wall).sprite));
			// inflatables bob gently
			L.solids.filter((o) => o.kind === 'duck' || o.kind === 'donut').forEach((o, i) =>
				this.tweens.add({targets: o.sprite, scaleY: k * 1.0, duration: 1400 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'}));
			this.umbrellas = L.umbrellas.map((u) => ({...u, s: this.add.image(u.x + 6, u.y - 70, `umbrella-${u.v}`).setScale(k).setDepth(u.y + 260)}));
			// refill taps
			this.taps = L.taps.map((t) => {
				const s = this.add.image(t.x, t.y - (t.top ? 12 : -32), 'tap').setScale(k).setDepth(t.y + 20);
				if (!t.top) s.setFlipY(false);

				return {...t, s, spot: {x: t.x, y: t.y + (t.top ? 66 : -66)}, busyT: 0};
			});
			// the slide on the pool's edge, a beach ball floating
			this.add.image(P.x - P.rx - 34, P.y + 30, 'slide').setOrigin(0.27, 0.9).setScale(k * 0.6).setDepth(P.y - 60);
			const ball = this.add.image(P.x + P.rx * 0.45, P.y + P.ry * 0.25, 'toy-ball').setScale(k).setDepth(P.y - 50);
			this.tweens.add({targets: ball, y: ball.y - 6, angle: 20, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
			// beach toys by the taps (decoration only)
			[[-120, 'toy-bucket'], [120, 'toy-starfish']].forEach(([dx, key], i) => {
				L.taps.forEach((t) => this.add.image(t.x + dx * (i ? 1 : 1), t.y + (t.top ? 18 : -18), key).setScale(k * 0.9).setDepth(t.y));
			});
			// splash pads: little fountains now and then
			this.pads = L.pads.map((p, i) => ({...p, t: 3 + i * 1.7, on: 0}));
			// glints on the water
			for (let i = 0; i < 6; i++) {
				const a = Math.random() * Math.PI * 2;
				const r = 0.4 + Math.random() * 0.45;
				const g = this.add.image(P.x + Math.cos(a) * P.rx * r, P.y + Math.sin(a) * P.ry * r, 'sparkle').setScale(k * 0.8).setDepth(P.y - 200).setAlpha(0);
				this.tweens.add({targets: g, alpha: 0.9, scale: k, duration: 700, yoyo: true, repeat: -1, delay: i * 500, repeatDelay: 1500});
			}
		}

		/* ---------- helpers the systems call ---------- */
		num(n) {
			return WB.Sound.state.lang === 'ar' ? Number(n).toLocaleString('ar-EG') : String(n);
		}

		say(key, low = false) {
			if (this.state === 'attract') return;
			const now = this.time.now / 1000;
			if (low && now - this.voiceAt < 2.4) return;
			this.voiceAt = now;
			WB.Sound.say(key);
		}

		announce(key, icon) {
			if (this.state === 'attract') return;
			this.hud.announce(window.WB_WORDS.SAY[WB.Sound.state.lang][key], icon);
			WB.Sound.sfx.sting();
			this.say(key);
		}

		onBump(a, b) {
			if (this.state === 'attract') return;
			if (Math.hypot(a.vx - b.vx, a.vy - b.vy) > 260) WB.Sound.sfx.thud();
		}

		onCritical(f) {
			if (this.state !== 'play') return;
			this.fx.burst(f.x, f.y - 180, 'sparkle', 6, 0xff4757);
			if (!f.bot) this.say('almost', true);
		}

		onEmpty(f) {
			if (this.state === 'play' && !f.bot) this.say('empty', true);
		}

		// someone reached 100%
		soaked(f) {
			if (f.out) return;
			if (this.state !== 'play') {
				// warming up or behind the menu: nobody leaves, they just drip a lot
				f.wet = 72;

				return;
			}
			const used = this.fighters.filter((o) => o.out).map((o) => o.floatSpot);
			const spot = this.L.floats.find((p) => !used.includes(p)) || this.L.floats[0];
			f.floatSpot = spot;
			f.goOut(spot);
			this.hud.shout(f, window.WB_WORDS.SAY[WB.Sound.state.lang].soaked, '#bff0ff');
			this.say('soaked');
		}

		/* ---------- starting and ending ---------- */
		forceStart() {
			if (this.state !== 'ready') return;
			this.input2.pads.forEach((p) => this.hud.markReady(p.slot));
			this.countdown();
		}

		countdown() {
			if (this.state !== 'ready') return;
			this.state = 'count';
			WB.events.emit('counting');
			this.time.delayedCall(500, () => this.hud.hideReady && this.hud.hideReady());
			// the warm-up wet goes away: everybody starts dry
			this.fighters.forEach((f) => {
				f.wet = 0;
				f.tank = 100;
				f.panicked = false;
			});
			this.water.clear();
			const steps = [['three', '3', 3], ['two', '2', 2], ['one', '1', 1], ['go', null, 0]];
			steps.forEach(([key, n, v], i) => {
				this.time.delayedCall(700 + i * 1000, () => {
					const lang = WB.Sound.state.lang;
					this.hud.countdown(n ? this.num(n) : window.WB_WORDS.SAY[lang].go);
					WB.Sound.sfx.count(v);
					this.say(key);
					if (!v) this.go();
				});
			});
		}

		go() {
			this.state = 'play';
			this.clock = 0;
			this.fighters.forEach((f) => {
				f.wet = 0;
				f.tank = 100;
				f.invuln = 0.6;
			});
			WB.Sound.music(true);
			WB.events.emit('playing');
			this.fighters.forEach((f, i) => this.time.delayedCall(i * 120, () => WB.Sound.sfx.giggle(f.pitch)));
			this.time.delayedCall(1300, () => this.hud.announce(window.WB_WORDS.SAY[WB.Sound.state.lang].fight, 'icon-drop'));
			this.time.delayedCall(4000, () => this.pickups.spawn('bottle'));
		}

		checkEnd() {
			const alive = this.fighters.filter((f) => !f.out);
			let done = alive.length <= 1;
			if (this.teams) done = new Set(alive.map((f) => f.team)).size <= 1;
			if (!done) return;
			this.state = 'over';
			WB.Sound.stopSprays();
			WB.Sound.music(false);
			WB.Sound.sfx.whistle();
			this.surprises.clear();
			this.fighters.forEach((f) => {
				f.spraying = false;
			});
			const winners = alive;
			winners.forEach((f) => {
				f.wins++;
				f.setExpr('cheer', 99);
			});
			// let the last flight land, then celebrate
			this.time.delayedCall(1300, () => {
				winners.forEach((f) => {
					this.fx.burst(f.x, f.y - 120, 'star', 18, 0xffd23f);
					this.tweens.add({targets: f, hop: 40, duration: 260, yoyo: true, repeat: 4, ease: 'Quad.easeOut'});
				});
				WB.events.emit('over', {
					teams: this.teams,
					team: winners.length ? winners[0].team : null,
					list: this.fighters.map((f) => ({player: f.player, bot: f.bot, char: f.char, wins: f.wins, wet: f.wet, out: f.out, win: winners.includes(f), team: f.team}))
				});
			});
		}

		/* ---------- every frame ---------- */
		update(time, delta) {
			const dt = Math.min(delta / 1000, 0.05);
			const t = time / 1000;
			const L = this.L;
			const st = this.state;
			const canSpray = st === 'play' || st === 'ready' || st === 'attract';
			if (this.input2) this.input2.update();
			if (st === 'play') {
				this.clock += dt;
				if (!this.splashTime && this.clock > SPLASH_TIME) {
					this.splashTime = true;
					this.announce('splashTime', 'icon-drop');
					WB.Sound.music(true, {fast: true});
				}
			}

			for (const f of this.fighters) {
				let dir = {x: 0, y: 0, mag: 0};
				let spray = false;
				if (!f.out && st !== 'over' && st !== 'count') {
					if (f.bot) {
						dir = WB.Bot.think(f, this, dt);
						spray = f.botSpray;
					} else {
						dir = this.input2.dir(f.slot);
						spray = this.input2.held(f.slot);
						if (this.input2.takePress(f.slot) && st === 'ready' && this.hud.markReady(f.slot)) {
							WB.Sound.sfx.ready();
							WB.Sound.sfx.giggle(f.pitch);
							f.setExpr('happy', 1.5);
							this.fx.burst(f.x, f.y - 80, 'star', 10, f.color);
							if (this.hud.allReady) this.countdown();
						}
					}
				}
				f.move(dt, dir, this.slippery);
				this.keepDry(f, dt);
				f.update(dt, this);
				f.spraying = spray && canSpray && !f.out;
				if (!f.out) {
					this.water.assist(f, this.water.target(f, this.fighters, this.teams));
					if (f.spraying) this.water.fire(f, dt);
				}
				const hiss = f.spraying && f.tank > 0 && st !== 'attract';
				if (hiss !== !!f.hissing && !f.bot) WB.Sound.sfx[hiss ? 'trigger' : 'release']();
				f.hissing = hiss;
				WB.Sound.spray(f.player.id, hiss, f.weapon, f.tank);
			}

			this.refill(dt, t);
			this.splashPads(dt, t);
			this.water.update(dt, this.fighters, this.teams, this.live);
			this.pickups.update(dt, t, this.fighters, st === 'play' || st === 'attract');
			this.surprises.update(dt, t, this.fighters, this.live);
			for (const f of this.fighters) f.render(dt, t);
			this.sceneryLife(dt);
			this.hud.update(t);
			if (st === 'play') this.checkEnd();
		}

		// nobody walks into the pool: slide along its edge
		keepDry(f, dt) {
			if (f.out) return;
			const L = this.L;
			const P = L.pool;
			const pad = 26;
			if (L.inPool(f.x, f.y, pad - 6)) {
				const p = L.nearestFree(f.x, f.y, 28);
				f.place(p.x, p.y);

				return;
			}
			const nx = f.x + f.vx * dt * 1.5;
			const ny = f.y + f.vy * dt * 1.5;
			if (!L.inPool(nx, ny, pad)) return;
			const ax = (f.x - P.x) / ((P.rx + pad) * (P.rx + pad));
			const ay = (f.y - P.y) / ((P.ry + pad) * (P.ry + pad));
			const al = Math.hypot(ax, ay) || 1;
			const into = (f.vx * ax + f.vy * ay) / al;
			if (into < 0) {
				f.vx -= (into * ax) / al;
				f.vy -= (into * ay) / al;
				f.body.setVelocity(f.vx, f.vy);
			}
		}

		// standing at a tap fills the tank; the tap pours a stream into the blaster
		refill(dt, t) {
			for (const tp of this.taps) {
				let busy = false;
				for (const f of this.fighters) {
					if (f.out || Math.hypot(f.x - tp.spot.x, f.y - tp.spot.y) > 92) continue;
					if (f.tank < 100) {
						f.tank = Math.min(100, f.tank + TAP_RATE * dt);
						busy = true;
						if (Math.random() < dt * 14) this.fx.burst(f.x + (Math.random() - 0.5) * 20, f.y - 90, 'bubble', 1);
						if (f.tank >= 100) {
							this.fx.pop(f.x, f.y - 190, '100%', '#bff0ff', 34, f.top);
							WB.Sound.sfx.gulp();
						}
					}
				}
				if (busy) {
					WB.Sound.sfx.refill(this.fighters.reduce((m, f) => (!f.out && Math.hypot(f.x - tp.spot.x, f.y - tp.spot.y) <= 92 ? Math.max(m, f.tank / 100) : m), 0));
					if (Math.random() < dt * 20) this.fx.burst(tp.x + 30, tp.y + (tp.top ? 30 : -50), 'splash', 1);
					if (!this.tweens.isTweening(tp.s)) this.tweens.add({targets: tp.s, scaleY: this.k * 1.05, duration: 120, yoyo: true});
				}
			}
		}

		// splash pads pop a fountain for a moment; standing in it makes you a little wet
		splashPads(dt, t) {
			for (const p of this.pads) {
				p.t -= dt;
				if (p.on > 0) {
					p.on -= dt;
					if (Math.random() < dt * 30) this.fx.burst(p.x + (Math.random() - 0.5) * 50, p.y - 4, 'splash', 2);
					if (Math.random() < dt * 6) this.fx.burst(p.x, p.y - 30, 'mist', 1);
					for (const f of this.fighters) {
						if (!f.out && Math.hypot(f.x - p.x, (f.y - p.y) * 1.5) < 60) f.soak(dt * (this.live ? 7 : 2), f.x, f.y - 50);
					}
				} else if (p.t <= 0) {
					p.t = 6 + Math.random() * 3;
					p.on = 1.6;
					this.fx.ring(p.x, p.y, 1);
					if (this.state !== 'attract') WB.Sound.sfx.splash();
				}
			}
		}

		sceneryLife() {
			// umbrella tops turn see-through when someone stands under them (never lose your splasher)
			for (const u of this.umbrellas) {
				const under = this.fighters.some((f) => Math.hypot(f.x - u.x, f.y - (u.y - 40)) < 90);
				const a = u.s.alpha + ((under ? 0.4 : 1) - u.s.alpha) * 0.2;
				u.s.setAlpha(a);
			}
		}

		shutdown() {
			WB.Sound.stopSprays();
			if (this.input2) this.input2.destroy();
			this.input2 = null;
		}
	}

	WB.GameScene = GameScene;
})();
