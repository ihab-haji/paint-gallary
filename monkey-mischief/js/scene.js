/* Monkey Mischief: the Phaser scene. Builds the jungle, the monkeys and every system, then runs a match:
     attract  monkeys play by themselves behind the start menu
     ready    everyone can already run around; each player presses their button (✓) → 3 · 2 · 1 · GO
     play     Banana Rush: the director runs the clock and the events
     over     time's up: bananas on heads go home to their baskets, then the results
   Started with scene.start('game', cfg) / scene.restart(cfg). Phaser cleans every tween, timer, emitter and
   input listener of the old match on restart; nothing here lives outside the scene. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});

	class GameScene extends Phaser.Scene {
		constructor() {
			super('game');
		}

		init(cfg) {
			this.cfg = cfg && cfg.players ? cfg : MM.attractConfig();
		}

		create() {
			const Z = MM.Z;
			const k = 1 / Z;
			this.k = k;
			this.Z = Z;
			const cfg = this.cfg;
			const cam = this.cameras.main;
			cam.setZoom(Z);
			cam.centerOn(MM.Layout.W / 2, MM.Layout.H / 2);
			cam.setBackgroundColor('#2e7d35');
			this.input.addPointer(5);

			const slotPlayers = [null, null, null, null];
			cfg.players.forEach((p) => (slotPlayers[p.slot] = p.player));
			const L = (this.L = MM.Layout.make(slotPlayers));
			this.physics.world.setBounds(0, 0, L.W, L.H);
			MM.Art.build(this, Z, cfg.players.map((p) => p.player));
			MM.Art.ground(this, Z, L);
			cfg.players.forEach((p) => {
				const img = MM.faces && MM.faces[p.player.id];
				const key = `face-${p.player.id}`;
				if (!img || !img.complete || !img.naturalWidth) return;
				// the hero may have changed since the last game: always take the fresh picture
				if (this.textures.exists(key)) this.textures.remove(key);
				this.textures.addImage(key, img);
			});
			this.add.image(0, 0, 'ground').setOrigin(0).setScale(k).setDepth(-10000);
			this.fx = new MM.Fx(this, k, Z);
			this.buildScenery();

			// monkeys
			this.monkeys = cfg.players.map((p, i) => {
				const c = L.corners[p.slot];
				const start = c.at([318, 318]);
				const m = new MM.Monkey(this, {player: p.player, slot: p.slot, idx: i, bot: !!p.bot, x: start.x, y: start.y, k});
				m.top = c.top;
				m.home = c.basket;

				return m;
			});
			const zones = this.monkeys.map((m) => m.zone);
			const solids = [];
			const solid = (x, y, r) => {
				const z = this.add.zone(x, y, r * 2, r * 2);
				this.physics.add.existing(z, true);
				z.body.setCircle(r);
				solids.push(z);
			};
			L.corners.forEach((c) => solid(c.cx, c.cy, c.r));
			L.obstacles.forEach((o) => solid(o.x, o.y, o.r));
			this.physics.add.collider(zones, solids, null, (mz) => !mz.monkey.air);
			this.physics.add.collider(zones, zones, (a, b) => this.onBump(a.monkey, b.monkey), (a, b) => !a.monkey.air && !b.monkey.air);

			// systems
			this.bananas = new MM.Bananas(this, L, k);
			this.baskets = new MM.Baskets(this, L, this.monkeys, k);
			this.traps = new MM.Traps(this, L, k);
			this.powerups = new MM.PowerUps(this, L, k);
			this.gorilla = new MM.Gorilla(this, L, k);
			this.director = null;
			this.voiceAt = -10;
			this.bumpAt = 0;
			this.spawnT = 0;

			if (cfg.attract) {
				this.state = 'attract';
				this.hud = {score() {}, flash() {}, announce() {}, clockTick() {}, markReady() {}};
				for (let i = 0; i < 10; i++) this.bananas.fromSky();
			} else {
				this.hud = new MM.Hud(this, L, this.monkeys, k, Z);
				const humans = this.monkeys.filter((m) => !m.bot).map((m) => ({slot: m.slot, monkey: m}));
				this.input2 = new MM.Input(this, L, humans, {mode: cfg.mode, k});
				this.state = 'ready';
				this.hud.showReady(this.input2.pads);
				this.hud.clockTick(cfg.duration, cfg.duration, 0);
				this.time.delayedCall(500, () => this.say('ready'));
				MM.Sound.music(false);
			}
			this.events.once('shutdown', () => this.shutdown());
			MM.events.emit('scene-ready', this);
		}

		/* ---------- the jungle: trees, rocks, bushes, animals ---------- */
		buildScenery() {
			const L = this.L;
			const k = this.k;
			this.tall = [];
			L.obstacles.forEach((o) => {
				let s;
				if (o.kind === 'banana-tree') {
					s = this.add.image(o.x, o.y, 'banana-tree').setOrigin(0.5, 214 / 220).setScale(k).setDepth(o.y);
					this.tall.push({s, x: o.x, y: o.y, h: 200});
					this.tweens.add({targets: s, angle: {from: -1.5, to: 1.5}, duration: 2200 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
				} else if (o.kind === 'palm') {
					s = this.add.image(o.x, o.y, 'palm').setOrigin(0.5, 236 / 240).setScale(k).setDepth(o.y);
					this.tall.push({s, x: o.x, y: o.y, h: 220});
					this.tweens.add({targets: s, angle: {from: -2, to: 2}, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
					const parrot = this.add.image(o.x + 18, o.y - 150, 'parrot').setScale(k * 0.9).setDepth(o.y + 1);
					this.tweens.add({targets: parrot, y: parrot.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
					this.time.addEvent({delay: 3000 + Math.random() * 3000, loop: true, callback: () => this.tweens.add({targets: parrot, scaleY: k * 0.7, duration: 90, yoyo: true, repeat: 3})});
				} else {
					s = this.add.image(o.x, o.y + 12, o.kind).setOrigin(0.5, 0.82).setScale(k).setDepth(o.y + 12);
				}
				o.sprite = s;
			});
			this.bushes = L.bushes.map((b) => ({...b, cool: 0, s: this.add.image(b.x, b.y, b.kind).setOrigin(0.5, 0.8).setScale(k).setDepth(b.y)}));
			// empty corners: thick jungle
			L.corners.filter((c) => !c.player).forEach((c, i) => {
				const p = c.at([100, 100]);
				const t = this.add.image(p.x, p.y, i % 2 ? 'big-tree-a' : 'big-tree-b').setScale(k * 1.25).setDepth(p.y + 300);
				this.tweens.add({targets: t, scale: k * 1.28, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
				[[40, 230, 'bush-a'], [230, 40, 'bush-b'], [190, 180, 'bush-a']].forEach(([lx, ly, key]) => {
					const q = c.at([lx, ly]);
					this.add.image(q.x, q.y, key).setOrigin(0.5, 0.8).setScale(k * 1.1).setDepth(q.y);
				});
			});
			// a frog that hops between lily pads
			const lil = L.lilies;
			const frog = this.add.image(lil[0][0], lil[0][1] - 4, 'frog').setScale(k).setDepth(L.pond.y);
			let fi = 0;
			this.time.addEvent({
				delay: 3200, loop: true, callback: () => {
					fi = (fi + 1) % lil.length;
					this.tweens.add({targets: frog, x: lil[fi][0], duration: 600, ease: 'Sine.easeInOut'});
					this.tweens.add({targets: frog, y: {from: frog.y, to: lil[fi][1] - 4}, duration: 600, ease: 'Sine.easeInOut'});
					this.tweens.add({targets: frog, scale: k * 1.4, duration: 300, yoyo: true, ease: 'Quad.easeOut'});
				}
			});
			// butterflies drifting about
			for (let i = 0; i < 3; i++) {
				const b = this.add.image(L.randomFree().x, L.randomFree().y, 'butterfly').setScale(k).setDepth(8500).setAlpha(0.95);
				this.tweens.add({targets: b, scaleX: k * 0.3, duration: 140, yoyo: true, repeat: -1});
				const fly = () => {
					const p = L.randomFree();
					this.tweens.add({targets: b, x: p.x, y: p.y - 60, duration: 4000 + Math.random() * 3000, ease: 'Sine.easeInOut', onComplete: fly});
				};
				fly();
			}
			// glints on the pond
			for (let i = 0; i < 6; i++) {
				const a = Math.random() * Math.PI * 2;
				const r = 0.55 + Math.random() * 0.35;
				const g = this.add.image(L.pond.x + Math.cos(a) * L.pond.rx * r, L.pond.y + Math.sin(a) * L.pond.ry * r, 'sparkle').setScale(k * 0.8).setDepth(L.pond.y - 200).setAlpha(0);
				this.tweens.add({targets: g, alpha: 0.9, scale: k, duration: 700, yoyo: true, repeat: -1, delay: i * 500, repeatDelay: 1500});
			}
		}

		/* ---------- helpers the systems call ---------- */
		// a number in the digits of the language being played
		num(n) {
			return MM.Sound.state.lang === 'ar' ? Number(n).toLocaleString('ar-EG') : String(n);
		}

		// the star goes to whoever is ahead (nobody while it is a tie); taking the lead gets a little cheer
		crown() {
			const best = Math.max(...this.monkeys.map((m) => m.score));
			const top = this.monkeys.filter((m) => m.score === best);
			const leader = best > 0 && top.length === 1 ? top[0] : null;
			for (const m of this.monkeys) {
				if (m === leader && !m.leader && this.state === 'play') {
					this.fx.burst(m.x, m.y - 150, 'star', 8, 0xffd23f);
					MM.Sound.sfx.ready();
				}
				m.leader = m === leader;
			}
		}

		say(key, low = false) {
			const now = this.time.now / 1000;
			if (low && now - this.voiceAt < 2.2) return;
			this.voiceAt = now;
			MM.Sound.say(key);
		}

		announce(key, icon) {
			const text = window.MM_WORDS.SAY[MM.Sound.state.lang][key];
			this.hud.announce(text, icon);
			MM.Sound.sfx.sting(); // a little fanfare before every big moment
			this.say(key);
		}

		dropFrom(m, n) {
			const items = m.takeCarry(n);
			if (!items.length) return;
			this.bananas.scatter(m.x, m.y, items.length);
			this.fx.pop(m.x, m.y - 150, `-${items.length}`, '#ffffff', 40, m.top);
		}

		treeDrop() {
			const trees = this.L.obstacles.filter((o) => o.kind === 'banana-tree');
			const t = trees[Math.floor(Math.random() * trees.length)];
			this.tweens.add({targets: t.sprite, scaleX: this.k * 1.06, scaleY: this.k * 0.95, duration: 90, yoyo: true, repeat: 1});
			this.fx.burst(t.x, t.y - 120, 'leaf', 3, 0xffffff);
			const a = Math.random() * Math.PI * 2;
			const sp = 90 + Math.random() * 90;
			this.bananas.spawn(t.x + Math.cos(a) * 40, t.y - 30, {z: 120, vx: Math.cos(a) * sp, vy: 40 + Math.abs(Math.sin(a)) * sp * (t.y < this.L.H / 2 ? 1 : -1), vz: 250});
			MM.Sound.sfx.rustle();
		}

		trick(m) {
			if (m.power && m.power.kind === 'jump') {
				m.jump();
			} else if (m.power && m.power.kind === 'bomb') {
				this.traps.throwBomb(m);
				m.power = null;
			} else {
				this.traps.dropPeel(m);
			}
		}

		onBump(a, b) {
			if (this.state !== 'play') return;
			if (this.baskets.returnStolen(a, b) || this.baskets.returnStolen(b, a)) return;
			const now = this.time.now;
			if (now - this.bumpAt > 350) {
				this.bumpAt = now;
				MM.Sound.sfx.thud();
				this.fx.burst((a.x + b.x) / 2, (a.y + b.y) / 2 - 40, 'star', 3, 0xffffff);
			}
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
			MM.events.emit('counting');
			this.time.delayedCall(500, () => this.hud.hideReady());
			const steps = [['three', '3', 3], ['two', '2', 2], ['one', '1', 1], ['go', null, 0]];
			steps.forEach(([key, n, v], i) => {
				this.time.delayedCall(700 + i * 1000, () => {
					const lang = MM.Sound.state.lang;
					this.hud.countdown(n ? (lang === 'ar' ? Number(n).toLocaleString('ar-EG') : n) : window.MM_WORDS.SAY[lang].go);
					MM.Sound.sfx.count(v);
					this.say(key);
					if (!v) this.go();
				});
			});
		}

		go() {
			this.state = 'play';
			this.director = new MM.Director(this, this.cfg.duration);
			MM.Sound.music(true);
			MM.events.emit('playing');
			// a shower of bananas from the trees to start
			for (let i = 0; i < 6; i++) this.time.delayedCall(i * 110, () => this.treeDrop());
			for (let i = 0; i < 8; i++) this.bananas.fromSky();
			this.monkeys.forEach((m) => MM.Sound.sfx.monkey(m.pitch, 2));
			this.time.delayedCall(1300, () => this.hud.announce(window.MM_WORDS.SAY[MM.Sound.state.lang].hunt, 'banana'));
		}

		timeUp() {
			this.state = 'over';
			MM.Sound.music(false);
			this.say('timeUp');
			MM.Sound.sfx.whistle();
			this.gorilla.t = 0;
			this.hud.announce(window.MM_WORDS.SAY[MM.Sound.state.lang].timeUp, null);
			// forgiving: whatever is on your head still goes home
			this.monkeys.forEach((m, i) => {
				const n = m.carry.length;
				m.carry = [];
				if (n) this.time.delayedCall(400 + i * 150, () => this.baskets.addScore(m, n, m.x, m.y - 110));
			});
			this.time.delayedCall(2600, () => {
				const best = Math.max(...this.monkeys.map((m) => m.score));
				this.monkeys.forEach((m) => {
					if (m.score === best) {
						m.setExpr('happy', 99);
						this.time.addEvent({delay: 700, repeat: 4, callback: () => m.jump()});
					}
				});
				MM.events.emit('over', this.monkeys.map((m) => ({player: m.player, bot: m.bot, score: m.score})));
			});
		}

		/* ---------- every frame ---------- */
		update(time, delta) {
			const dt = Math.min(delta / 1000, 0.05);
			const t = time / 1000;
			const L = this.L;
			const play = this.state === 'play';
			if (this.input2) this.input2.update();

			for (const m of this.monkeys) {
				let dir;
				let press = false;
				if (m.bot) {
					dir = this.state === 'over' || this.state === 'count' ? {x: 0, y: 0, mag: 0} : MM.Bot.think(m, this, dt);
					press = m.botPress;
					m.botPress = false;
				} else {
					dir = this.state === 'over' ? {x: 0, y: 0, mag: 0} : this.input2.dir(m.slot);
					press = this.input2.takePress(m.slot);
				}
				if (press && this.state === 'ready' && !m.bot && this.hud.markReady(m.slot)) {
					MM.Sound.sfx.ready();
					MM.Sound.sfx.monkey(m.pitch, 2);
					m.setExpr('happy', 1.5);
					m.jumpT = 0;
					m.jump();
					this.fx.burst(m.x, m.y - 60, 'star', 10, m.color);
					if (this.hud.allReady) this.countdown();
				} else if (press && (play || this.state === 'attract') && m.canAct) {
					this.trick(m);
				}
				// puddles slow you down (and splash)
				let slow = false;
				for (const p of L.puddles) {
					if (((m.x - p.x) / (p.r + 8)) ** 2 + ((m.y - p.y) / (p.r * 0.62 + 8)) ** 2 < 1) {
						slow = true;
						if (Math.hypot(m.vx, m.vy) > 60 && Math.random() < 0.15) {
							this.fx.burst(m.x, m.y + 10, 'drop', 2, 0x9fe0ff);
							MM.Sound.sfx.splash();
						}
					}
				}
				m.move(dt, dir, slow);
				this.keepDry(m, dt);
				m.update(dt);
			}

			if (play || this.state === 'attract') this.pickups();
			this.bananas.update(dt, t, this.monkeys);
			this.baskets.update(dt, this.monkeys, play || this.state === 'attract');
			this.traps.update(dt, t, this.monkeys);
			this.powerups.update(dt, t, this.monkeys);
			this.gorilla.update(dt, t, this.monkeys);

			this.crown();
			for (const m of this.monkeys) m.render(dt, t);
			this.sceneryLife(dt);
			this.updateButtons(t);

			if (this.state === 'attract') {
				this.spawnT -= dt;
				if (this.spawnT <= 0 && this.bananas.count < 12) {
					this.spawnT = 0.8;
					this.treeDrop();
				}
			}
			if (play && this.director) {
				const done = this.director.update(dt);
				this.hud.clockTick(this.director.left, this.cfg.duration, t);
				if (done) this.timeUp();
			}
		}

		// monkeys can't swim: block the step that would go into the pond; a jump that ends over water floats to shore
		keepDry(m, dt) {
			const L = this.L;
			if (m.air) {
				if (m.jumpT < 0.1 && L.inWater(m.x, m.y)) {
					m.jumpT = 0.1;
					const p = L.nearestFree(m.x, m.y, 28);
					const d = Math.hypot(p.x - m.x, p.y - m.y) || 1;
					m.vx = ((p.x - m.x) / d) * 320;
					m.vy = ((p.y - m.y) / d) * 320;
					m.body.setVelocity(m.vx, m.vy);
				}

				return;
			}
			if (L.inWater(m.x, m.y)) {
				const p = L.nearestFree(m.x, m.y, 28);
				m.place(p.x, p.y);
				this.fx.burst(p.x, p.y, 'drop', 8, 0x9fe0ff);
				MM.Sound.sfx.splash();

				return;
			}
			let nx = m.x + m.vx * dt * 1.5;
			let ny = m.y + m.vy * dt * 1.5;
			let changed = false;
			// about to step into the water: keep the part of the run that goes along the bank, so the monkey
			// slides round the pond (and along a bridge) instead of stopping dead
			if (L.inWater(nx, ny) || L.inWater(nx, m.y) || L.inWater(m.x, ny)) {
				const P = L.pond;
				let ax = (m.x - P.x) / (P.rx * P.rx);
				let ay = (m.y - P.y) / (P.ry * P.ry);
				if (L.onIsland(m.x, m.y, 6)) {
					ax = P.x - m.x;
					ay = P.y - m.y;
				} else if (L.onBridge(m.x, m.y) && L.inPond(m.x, m.y, -8)) {
					ax = 0; // on a bridge: the water is above and below
					ay = P.y - m.y;
				}
				const al = Math.hypot(ax, ay);
				if (al > 0.0001) {
					const into = (m.vx * ax + m.vy * ay) / al;
					if (into < 0) {
						m.vx -= (into * ax) / al;
						m.vy -= (into * ay) / al;
						changed = true;
						nx = m.x + m.vx * dt * 1.5;
						ny = m.y + m.vy * dt * 1.5;
					}
				}
			}
			if (L.inWater(nx, m.y)) {
				m.vx = 0;
				changed = true;
			}
			if (L.inWater(m.x, ny)) {
				m.vy = 0;
				changed = true;
			}
			if (!changed && L.inWater(nx, ny)) {
				m.vx = 0;
				m.vy = 0;
				changed = true;
			}
			if (changed) m.body.setVelocity(m.vx, m.vy);
		}

		pickups() {
			const gold = this.bananas.gold;
			for (const m of this.monkeys) {
				if (!m.canAct) continue;
				if (gold.on && Math.hypot(m.x - gold.x, m.y - gold.y) < 56) {
					this.bananas.endGold(false);
					this.baskets.addScore(m, 5, gold.x, gold.y - 30);
					this.fx.burst(gold.x, gold.y - 30, 'star', 20, 0xffd23f);
					this.fx.pop(gold.x, gold.y - 120, '+5', '#ffd23f', 56, m.top);
					this.fx.shake(0.004, 200);
					MM.Sound.sfx.golden();
					MM.Sound.sfx.monkey(m.pitch, 3);
					m.setExpr('happy', 1.5);
				}
				if (m.full) continue;
				const near = this.bananas.near(m.x, m.y + 6, 54);
				for (const b of near) {
					if (!m.addCarry(-1)) break;
					this.bananas.remove(b);
					MM.Sound.sfx.pick(m.carry.length);
					this.fx.burst(b.x, b.y - 14, 'sparkle', 6, 0xffe14d);
					this.baskets.fly(b.x, b.y - 14, m.x, m.y - 100 - m.carry.length * 9); // it hops up onto the tower
					m.hop();
					m.setExpr('happy', 0.5);
					if (m.full) {
						// hands full: a happy shout and a ring of stars (the arrow then points home)
						MM.Sound.sfx.monkey(m.pitch, 1);
						this.fx.burst(m.x, m.y - 120, 'star', 8, m.color);
						this.fx.pop(m.x, m.y - 175, this.num(5), '#ffe14d', 44, m.top);
					}
				}
			}
		}

		sceneryLife(dt) {
			// tree tops turn see-through when a monkey walks behind them (never lose your monkey)
			for (const tr of this.tall) {
				const behind = this.monkeys.some((m) => m.y < tr.y - 6 && m.y > tr.y - tr.h && Math.abs(m.x - tr.x) < 105);
				const a = tr.s.alpha + ((behind ? 0.45 : 1) - tr.s.alpha) * Math.min(1, dt * 10);
				tr.s.setAlpha(a);
			}
			for (const b of this.bushes) {
				if (b.cool > 0) {
					b.cool -= dt;
					continue;
				}
				for (const m of this.monkeys) {
					if (Math.hypot(m.x - b.x, m.y - b.y) < 50 && Math.hypot(m.vx, m.vy) > 60 && !m.air) {
						b.cool = 0.6;
						MM.Sound.sfx.rustle();
						this.fx.burst(b.x, b.y - 30, 'leaf', 4, 0xffffff);
						this.tweens.add({targets: b.s, scaleX: this.k * 1.1, scaleY: this.k * 0.92, duration: 100, yoyo: true, repeat: 1});
						break;
					}
				}
			}
		}

		// each trick button shows what it will do right now: peel (with how many left), jump or bomb
		updateButtons(t) {
			if (!this.input2) return;
			this.input2.pads.forEach((p) => {
				const m = p.monkey;
				const kind = m.power && (m.power.kind === 'jump' || m.power.kind === 'bomb') ? m.power.kind : 'peel';
				const key = `icon-${kind}`;
				if (p.btnIcon.texture.key !== key) {
					p.btnIcon.setTexture(key);
					this.tweens.add({targets: p.btnIcon, scale: {from: this.k * 1.6, to: this.k}, duration: 380, ease: 'Back.easeOut'});
				}
				const special = kind !== 'peel';
				if (!this.tweens.isTweening(p.btn)) p.btn.setScale(this.k * (special ? 1 + Math.abs(Math.sin(t * 5)) * 0.1 : 1));
				p.pips.forEach((d, i) => d.setVisible(!special).setAlpha(i < m.peels ? 1 : 0.25));
			});
		}

		shutdown() {
			if (this.input2) this.input2.destroy();
			this.input2 = null;
		}
	}

	MM.GameScene = GameScene;
})();
