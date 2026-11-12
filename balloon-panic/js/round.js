/* Balloon Panic: RoundManager. Runs a match from "3, 2, 1, GO!" to the awards:
     count   the countdown
     play    someone holds it, it is passed around, maybe a twist happens
     boom    it popped: the show, the score, a breath... and the next round starts by itself
     over    all rounds played
   Rules it guards:
     - exactly one pop per round (the first one wins; anything else in the air fizzles away)
     - no pop while it is flying, or in the first moment after a catch
     - every timer of a round carries the round's token: when the round ends they simply do nothing */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const rand = (a, b) => a + Math.random() * (b - a);
	const MOODS = ['idle', 'idle', 'worry', 'panic', 'terror'];

	class Round {
		constructor(scene, {attract = false} = {}) {
			this.scene = scene;
			this.quiet = attract; // the demo behind the menus: no voice, no banners, no score
			this.cfg = BP.CONFIG[scene.cfg.speed];
			this.kind = scene.cfg.object;
			this.total = attract ? Infinity : this.cfg.rounds;
			this.index = 0;
			this.state = 'idle';
			this.objs = [];
			this.mods = {speed: false, bounce: false};
			this.token = 0;
			this.tickT = 0;
			this.tickHi = false;
			this.lastT = 0;
			this.lastVictim = null;
			this.variant = Math.floor(Math.random() * 4);
			this.combo = 0; // quick passes in a row: each one plays the next note up
			this.comboAt = 0;
		}

		// a timer that belongs to this round only
		later(ms, fn) {
			const token = this.token;
			this.scene.time.delayedCall(ms, () => token === this.token && fn());
		}

		begin() {
			const sc = this.scene;
			if (this.quiet) {
				sc.time.delayedCall(500, () => this.next());

				return;
			}
			this.state = 'count';
			BP.Sound.music(false);
			const lang = BP.Sound.state.lang;
			[['three', 3], ['two', 2], ['one', 1], ['go', 0]].forEach(([key, n], i) => {
				sc.time.delayedCall(500 + i * 850, () => {
					BP.events.emit('count', n ? sc.num(n) : window.BP_WORDS.SAY[lang].go);
					BP.Sound.sfx.count(n);
					sc.say(key);
					sc.players.list.forEach((b) => b.jump(n ? 16 : 46, 0.3));
					if (!n) {
						BP.Sound.music(true);
						BP.events.emit('playing');
						sc.time.delayedCall(650, () => this.next());
					}
				});
			});
		}

		// the object the round is about: the real one closest to popping
		main() {
			return this.objs.filter((o) => !o.fake && o.state !== 'gone').sort((a, b) => a.left - b.left)[0] || null;
		}

		spawn(T, {fake = false, variant = this.variant} = {}) {
			const Kind = this.kind === 'bomb' ? BP.Bomb : BP.Balloon;
			const o = new Kind(this.scene, {T, fake, variant: variant || 0});
			this.objs.push(o);

			return o;
		}

		// it drops in from above, into this buddy's hands
		deliver(o, b) {
			const sc = this.scene;
			b.incoming = o;
			o.target = b;
			const a = o.anchor(b);
			o.x = a.x;
			o.y = -160;
			BP.Sound.sfx.drop();
			o.tween = sc.tweens.add({
				targets: o, y: a.y, duration: 560, ease: 'Bounce.easeOut',
				onComplete: () => {
					o.tween = null;
					if (o.state !== 'drop') return;
					o.attach(b);
					o.grace = Math.max(o.grace, 1.2);
					BP.Sound.sfx.catch(1);
					sc.fx.burst('sparkle', o.x, o.y, 8, b.tint);
					b.caught(1);
					this.onHold(o);
				}
			});
		}

		// a throw just left someone's hands
		onPass(obj, from, target, close) {
			const sc = this.scene;
			const now = sc.time.now;
			this.combo = now - this.comboAt < 1700 ? this.combo + 1 : 1;
			this.comboAt = now;
			if (this.quiet) return;
			BP.Sound.sfx.note(this.combo);
			// every few quick passes: a cheer and a shower of stars
			if (this.combo > 3 && this.combo % 4 === 0) {
				sc.fx.burst('star', obj.x, obj.y, 10 + this.combo, 0xffd23f);
				sc.fx.ring(sc.L.center.x, sc.L.center.y + 40, 0xffd23f, 2.6, 520);
				BP.Sound.sfx.cheer();
			}
			if (close) {
				// phew! the world slows down for a heartbeat
				sc.slowmo();
				from.setExpr('cheer', 1.2);
				sc.fx.ring(from.mid.x, from.mid.y, 0xffffff, 2.2, 500);
			}
		}

		// someone just got it: a computer buddy decides how long to hang on
		onHold(o) {
			const [a, b] = BP.CONFIG.bot;
			o.botT = (this.quiet ? rand(0.45, 1.3) : rand(a, b)) * (o.stage >= 3 ? 0.5 : 1);
		}

		next() {
			const sc = this.scene;
			this.token++;
			this.index++;
			if (this.index > this.total) {
				this.finish();

				return;
			}
			this.objs.forEach((o) => o.vanish());
			this.objs = [];
			this.mods.speed = this.mods.bounce = false;
			this.combo = 0;
			sc.players.dir = 1;
			sc.players.list.forEach((b) => {
				b.clean();
				b.setBase('idle');
			});
			BP.events.emit('round', this.index, this.total);
			if (!this.quiet && this.index === this.total) sc.say('lastRound');
			// a random starter; whoever has been popped most is a little less likely, and never the same buddy twice running
			const pool = sc.players.list.filter((b) => b !== this.lastVictim || sc.players.list.length < 3);
			const weights = pool.map((b) => 1 / (1 + (this.quiet ? 0 : sc.score.row(b).pops)));
			let pick = Math.random() * weights.reduce((a, b) => a + b, 0);
			const starter = pool.find((b, i) => (pick -= weights[i]) <= 0) || pool[0];
			// a new pop time, never close to the last one: no two rounds feel the same
			const [lo, hi] = this.quiet ? [4, 9] : this.cfg.fuse;
			let T = rand(lo, hi);
			for (let i = 0; i < 8 && Math.abs(T - this.lastT) < (hi - lo) * 0.2; i++) T = rand(lo, hi);
			this.lastT = T;
			this.variant = (this.variant + 1 + Math.floor(Math.random() * 2)) % 4;
			this.state = 'play';
			this.deliver(this.spawn(T), starter);
			this.tickT = 0.8;
			sc.twists.plan(T, !this.quiet && this.index === 1);
			if (!this.quiet) this.gift();
		}

		// forgiving fun: whoever has been popped far more than the others sometimes gets a magic shield
		gift() {
			const sc = this.scene;
			if (this.index < 3) return;
			const rows = sc.score.rows;
			const least = Math.min(...rows.map((r) => r.pops));
			const worst = rows.slice().sort((a, b) => b.pops - a.pops)[0];
			if (worst.pops - least < 2 || worst.b.shield || Math.random() > 0.65) return;
			this.later(250, () => {
				worst.b.giveShield();
				BP.Sound.sfx.shield();
				const m = worst.b.mid;
				sc.fx.burst('sparkle', m.x, m.y, 14, 0x9fe6ff);
				BP.events.emit('banner', 'shield');
				sc.say('shield');
			});
		}

		update(dt, t) {
			const sc = this.scene;
			for (const o of this.objs) o.update(dt, t);
			if (this.state !== 'play') {
				BP.Sound.tension(0);

				return;
			}
			const main = this.main();
			const v = main ? main.shown : 0;
			if (!this.quiet) BP.Sound.tension(v);
			// the heartbeat (balloon) or the tick-tock (bomb): faster and louder as the pop comes closer
			this.tickT -= dt;
			if (this.tickT <= 0 && main && main.state !== 'drop') {
				this.tickT = 0.95 - 0.78 * Math.pow(v, 1.4);
				if (!this.quiet) {
					if (this.kind === 'bomb') BP.Sound.sfx.tick((this.tickHi = !this.tickHi), v);
					else BP.Sound.sfx.heart(v);
				}
				main.kick(1.5 + v * 4);
			}
			// how everyone feels about it
			const top = this.objs.reduce((m, o) => Math.max(m, o.stage), 1);
			for (const b of sc.players.list) {
				if (b.obj) b.setBase(MOODS[b.obj.stage]);
				else b.setBase(b.incoming || top >= 4 ? 'worry' : 'idle');
				b.focus = b.obj || b.incoming || main;
			}
			// computer buddies pass by themselves
			for (const o of this.objs) {
				if (o.state !== 'held' || !o.holder.bot) continue;
				o.botT -= dt;
				if (o.botT <= 0) {
					o.botT = 0.28;
					const to = Math.random() < 0.65 ? sc.pass.next(o) : sc.players.random(o.holder);
					sc.pass.pass(o, to, rand(0.3, 0.9));
				}
			}
			for (const o of this.objs) {
				if (!o.due || o.locked > 0) continue;
				if (o.fake) this.poof(o);
				else this.explode(o);
				break;
			}
		}

		// the fake one from "Balloon Clone": just a puff and a honk
		poof(o) {
			const sc = this.scene;
			sc.fx.burst('puff', o.x, o.y, 14, 0xffffff);
			sc.fx.burst('star', o.x, o.y, 8, 0xffd23f);
			sc.fx.ring(o.x, o.y, 0xffffff, 1.8);
			BP.Sound.sfx.poof();
			if (o.holder) {
				o.holder.setExpr('laugh', 1.2);
				o.holder.jump(30, 0.34);
			}
			o.vanish();
			this.objs = this.objs.filter((x) => x !== o);
		}

		explode(o) {
			const sc = this.scene;
			if (this.state !== 'play') return; // one pop per round
			const holder = o.holder;
			if (holder.shield) {
				// saved! the shield bursts instead, and the thing bounces away with a little more time
				holder.popShield();
				BP.Sound.sfx.shieldPop();
				const m = holder.mid;
				sc.fx.ring(m.x, m.y, 0x9fe6ff, 3, 520);
				sc.fx.burst('sparkle', m.x, m.y, 18, 0x9fe6ff);
				holder.setExpr('cheer', 1.4);
				holder.jump(50, 0.45);
				sc.score.saved(holder);
				sc.say('saved');
				o.extend(rand(2.4, 3.6));
				o.sticky = 0;
				o.grace = 0.6;
				o.kick(10);
				const to = sc.players.random(holder);
				if (to) {
					o.detach();
					sc.pass.launch(o, to, 1);
				}

				return;
			}
			this.state = 'boom';
			this.token++;
			o.state = 'burst';
			o.locked = 99;
			if (sc.input2) sc.input2.releaseAll();
			// one last blink of warning: it flashes white and swells
			o.body.setTintFill(0xffffff);
			o.mulTo = o.mul * 1.25;
			holder.setExpr('terror', 0.4);
			sc.time.delayedCall(190, () => this.boom(o, holder));
		}

		boom(o, victim) {
			const sc = this.scene;
			if (this.state !== 'boom') return;
			// anything else still around loses its air and floats off
			this.objs.filter((x) => x !== o).forEach((x) => {
				sc.fx.burst('puff', x.x, x.y, 10, 0xffffff);
				BP.Sound.sfx.fizzle();
				x.vanish();
			});
			const look = sc.explosion.fire(o, victim);
			o.vanish();
			this.objs = [];
			this.lastVictim = victim;
			sc.players.list.forEach((b) => {
				b.setBase('idle');
				b.focus = victim.face;
			});
			if (!this.quiet) {
				sc.score.pop(victim, look);
				sc.players.setPops(victim, sc.score.row(victim).pops);
				BP.events.emit('popped', this.index, this.total);
			}
			sc.time.delayedCall((this.quiet ? 2.6 : BP.CONFIG.between) * 1000, () => this.state === 'boom' && this.next());
		}

		finish() {
			const sc = this.scene;
			this.state = 'over';
			BP.Sound.music(false);
			const res = sc.score.results();
			sc.players.list.forEach((b) => {
				b.clean();
				b.focus = null;
				const row = res.rows.find((r) => r.sp === b.sp);
				if (row.win) {
					b.setBase('cheer');
					b.dance(6);
				} else {
					b.setBase('happy');
				}
			});
			sc.time.delayedCall(1000, () => BP.events.emit('over', res));
		}

		stop() {
			this.token++;
			this.state = 'idle';
		}
	}

	BP.Round = Round;
})();
