/* Balloon Panic: EventManager. The funny twists.
   At most one twist per round, never two at once (little ones must be able to follow), each one short,
   shown with a picture and said out loud:
     double   Double Trouble: a second one appears; pass both
     giant    it swells up huge and flies slowly
     tiny     it shrinks: where did it go?
     fake     a bang, a flash, confetti... and nothing popped
     speed    throws fly much faster for a while
     sticky   it sticks to whoever has it: tap, tap, tap to shake it loose
     reverse  a plain pass now goes the other way round
     clone    a second, fake one appears: it only goes "poof"
     lastsec  it starts swelling fast with an alarm: seconds left
     bounce   throws bounce off the edges of the screen for a while */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const rand = (a, b) => a + Math.random() * (b - a);

	class Events {
		constructor(scene) {
			this.scene = scene;
			this.recent = [];
		}

		// called when a round starts: maybe line up a twist
		plan(T, firstRound) {
			const sc = this.scene;
			const r = sc.round;
			if (firstRound) return; // the first round is always plain: learn the game first
			if (Math.random() > BP.CONFIG[sc.cfg.speed].eventChance) return;
			const delay = rand(...BP.CONFIG.eventDelay);
			if (delay > T - 2.2) return;
			r.later(delay * 1000, () => this.fire());
		}

		fire(force) {
			const sc = this.scene;
			const r = sc.round;
			if (r.state !== 'play') return;
			const main = r.main();
			if (!main) return;
			const n = sc.players.list.length;
			const room = n >= 3 && r.objs.length === 1 && main.left > 3.5 && !!sc.players.random(main.holder || main.target);
			const ok = {
				double: room, clone: room, giant: true, tiny: true, speed: true, bounce: true, reverse: n >= 3,
				fake: main.left > 2.5, sticky: main.left > 4.5 && main.state === 'held', lastsec: main.left > 4.5
			};
			const keys = Object.keys(ok).filter((k) => ok[k] && !this.recent.includes(k));
			const key = force && ok[force] !== undefined ? force : keys[Math.floor(Math.random() * keys.length)];
			if (!key) return;
			this.recent.push(key);
			if (this.recent.length > 4) this.recent.shift();
			this[key](main);
			if (!r.quiet) {
				BP.events.emit('banner', key);
				BP.Sound.sfx.sting();
				sc.say(key);
			}
		}

		double(main) {
			const r = this.scene.round;
			const to = this.scene.players.random(main.holder || main.target);
			if (!to) return;
			const o = r.spawn(Math.max(3.5, main.left + rand(-1, 3)), {variant: main.variant + 1});
			r.deliver(o, to);
		}

		clone(main) {
			const r = this.scene.round;
			const to = this.scene.players.random(main.holder || main.target);
			if (!to) return;
			const T = rand(4, 6.5);
			const o = r.spawn(T, {variant: main.variant, fake: true});
			// it looks exactly like the real one, size and all
			o.pts = [[0, main.v], [T, Math.min(1, main.v + 0.3)]];
			o.v = o.shown = main.v;
			r.deliver(o, to);
		}

		giant() {
			const r = this.scene.round;
			r.objs.forEach((o) => {
				o.mulTo = 1.55;
				o.kick(8);
			});
			BP.Sound.sfx.grow();
			r.later(5000, () => r.objs.forEach((o) => (o.mulTo = 1)));
		}

		tiny() {
			const r = this.scene.round;
			r.objs.forEach((o) => (o.mulTo = 0.4));
			BP.Sound.sfx.shrink();
			r.later(4500, () => r.objs.forEach((o) => (o.mulTo = 1)));
		}

		fake(main) {
			const sc = this.scene;
			sc.fx.flash(0.65, 260);
			sc.fx.pow(main.x, main.y, 0.95);
			sc.fx.burst('confetti', main.x, main.y, 24);
			sc.fx.ring(main.x, main.y, 0xffffff, 2.6);
			sc.fx.shake(0.01, 240);
			BP.Sound.sfx.fakeout();
			main.kick(11);
			sc.players.list.forEach((b) => {
				b.setExpr('shock', 0.9);
				b.jump(42, 0.42);
			});
			sc.round.later(900, () => sc.players.list.forEach((b) => !b.obj && b.setExpr('laugh', 1.2)));
			sc.score.fakeout();
		}

		speed() {
			const r = this.scene.round;
			r.mods.speed = true;
			r.later(BP.CONFIG.eventTime * 1000, () => (r.mods.speed = false));
		}

		bounce() {
			const r = this.scene.round;
			r.mods.bounce = true;
			r.later(BP.CONFIG.eventTime * 1000, () => (r.mods.bounce = false));
		}

		sticky(main) {
			main.sticky = BP.CONFIG[this.scene.cfg.speed].stickyTaps;
			main.kick(8);
			BP.Sound.sfx.squelch();
			this.scene.fx.burst('goo', main.x, main.y, 12);
		}

		reverse() {
			const sc = this.scene;
			sc.players.dir *= -1;
			BP.Sound.sfx.swap();
			sc.fx.ring(sc.L.center.x, sc.L.center.y + 40, 0xffd23f, 3.2, 600);
			sc.spinArrows();
		}

		lastsec(main) {
			const r = this.scene.round;
			main.rush(rand(...BP.CONFIG[this.scene.cfg.speed].lastSecond));
			main.kick(10);
			[0, 800, 1600, 2400].forEach((ms) => r.later(ms, () => main.state !== 'gone' && BP.Sound.sfx.alarm()));
		}
	}

	BP.Events = Events;
})();
