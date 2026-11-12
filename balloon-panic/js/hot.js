/* Balloon Panic: the thing being passed, and its unpredictable fuse (shared by the balloon and the bomb).

   THE FUSE. Every round draws a new pop time T from the configured window (BP.CONFIG.<mode>.fuse), and a new
   growth story: a handful of stretches that crawl, hurry, stop dead or surge. Growth v runs from 0 to a
   random end somewhere in BP.CONFIG.popAt (0.7..1), so nobody can read the pop off the size, yet it never
   pops while it still looks calm: surprising, but fair.

     hot.t / hot.T      seconds lived / the second it pops
     hot.v              how far it has grown (0..1) -> hot.stage 1..4
     hot.state          'drop' arriving · 'held' · 'fly' · 'burst' popping · 'gone'
     hot.grace          after a catch it cannot pop for this long
     hot.rush(sec)      "last second": it will pop in sec, and swells fast
     hot.extend(sec)    the shield bought more time */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const rand = (a, b) => a + Math.random() * (b - a);

	// the growth story: [[time, growth], ...] from 0,0 to T,end
	function story(T, end) {
		const n = 3 + Math.floor(Math.random() * 4);
		const cuts = Array.from({length: n}, () => 0.4 + Math.random());
		const total = cuts.reduce((a, b) => a + b, 0);
		const rates = cuts.map((_, i) => (i === 0 ? [0.5, 1, 1] : [0.04, 0.04, 0.5, 1, 1, 2.6, 2.6])[Math.floor(Math.random() * (i === 0 ? 3 : 7))]);
		const grow = cuts.map((c, i) => c * rates[i]);
		const sum = grow.reduce((a, b) => a + b, 0);
		const pts = [[0, 0]];
		let t = 0;
		let v = 0;
		cuts.forEach((c, i) => {
			t += (c / total) * T;
			v += (grow[i] / sum) * end;
			pts.push([t, v]);
		});

		return pts;
	}

	class Hot {
		constructor(scene, {kind, T, fake = false}) {
			this.scene = scene;
			this.kind = kind;
			this.fake = fake;
			this.T = T;
			this.t = 0;
			const [lo, hi] = BP.CONFIG.popAt;
			this.pts = story(T, rand(lo, hi));
			this.v = 0;
			this.shown = 0; // what you see follows v a moment behind, so surges look like air rushing in
			this.rate = 0;
			this.state = 'drop';
			this.holder = null;
			this.target = null;
			this.grace = 0;
			this.locked = 0;
			this.held = 0;
			this.sticky = 0;
			this.mul = 1; // giant / tiny
			this.mulTo = 1;
			this.sq = 0; // squash and stretch, on a spring
			this.sqV = 0;
			this.x = scene.L.center.x;
			this.y = -200;
			this.pull = {x: 0, y: 0}; // a finger dragging it
			this.lunge = {x: 0, y: 0}; // a fake throw
			this.spin = 0;
			this.vx = 0; // it follows its holder on a spring, so it settles with a soft overshoot
			this.vy = 0;
			this.trail = []; // where it has just flown: the ribbon is drawn through these
			this.lastStage = 1;
			this.c = scene.add.container(this.x, this.y).setDepth(5000);
			this.in = scene.add.container(0, 0);
			this.c.add(this.in);
			this.line = scene.add.graphics().setDepth(4990);
		}

		get stage() {
			const s = BP.CONFIG.stages;

			return this.shown < s[0] ? 1 : this.shown < s[1] ? 2 : this.shown < s[2] ? 3 : 4;
		}

		get left() {
			return this.T - this.t;
		}

		get due() {
			return this.state === 'held' && this.t >= this.T && this.grace <= 0;
		}

		growth(t) {
			const p = this.pts;
			if (t >= p[p.length - 1][0]) return p[p.length - 1][1];
			for (let i = 1; i < p.length; i++) {
				if (t <= p[i][0]) {
					const [t0, v0] = p[i - 1];
					const [t1, v1] = p[i];

					return v0 + ((v1 - v0) * (t - t0)) / Math.max(0.001, t1 - t0);
				}
			}

			return 0;
		}

		rush(seconds) {
			this.pts = [[this.t, this.v], [this.t + seconds, Math.max(this.v + 0.2, rand(0.9, 1))]];
			this.T = this.t + seconds;
		}

		extend(seconds) {
			this.pts = [[this.t, this.v], [this.t + seconds, Math.min(1, this.v + 0.06)]];
			this.T = this.t + seconds;
		}

		kick(power = 5) {
			this.sqV += power;
		}

		// where it rests when this buddy holds it: out towards the middle of the party
		anchor(b = this.holder) {
			const m = b.mid;
			const reach = 108 + this.r * 0.95; // far enough out that even a huge one does not hide the holder's face

			return {x: m.x + b.seat.dir.x * reach, y: m.y - 8 + b.seat.dir.y * reach};
		}

		attach(b) {
			this.holder = b;
			this.target = null;
			b.obj = this;
			b.incoming = null;
			this.state = 'held';
			this.held = 0;
			this.grace = Math.max(this.grace, BP.CONFIG[this.scene.cfg.speed].grace);
			this.c.rotation = 0;
			this.c.setScale(1);
			this.kick(-7);
		}

		detach() {
			if (this.holder) this.holder.obj = null;
			this.holder = null;
		}

		update(dt, t) {
			if (this.state === 'gone') return;
			if (this.state === 'held' || this.state === 'fly') {
				this.t += dt;
				this.grace -= dt;
			}
			if (this.locked > 0) this.locked -= dt;
			const v = this.growth(this.t);
			this.rate = (v - this.v) / Math.max(0.001, dt);
			this.v = v;
			this.shown += (v - this.shown) * Math.min(1, dt * 5);
			this.mul += (this.mulTo - this.mul) * Math.min(1, dt * 6);
			// the squash spring
			this.sqV += (-this.sq * 260 - this.sqV * 13) * dt;
			this.sq += this.sqV * dt;
			this.sq = Math.max(-0.45, Math.min(0.45, this.sq));
			if (this.state === 'held') {
				this.held += dt;
				const a = this.anchor();
				const tx = a.x + this.pull.x + this.lunge.x;
				const ty = a.y + this.pull.y + this.lunge.y;
				this.vx += ((tx - this.x) * 190 - this.vx * 21) * dt;
				this.vy += ((ty - this.y) * 190 - this.vy * 21) * dt;
				this.x += this.vx * dt;
				this.y += this.vy * dt;
			}
			if (this.stage !== this.lastStage) {
				if (this.stage > this.lastStage) this.onStage(this.stage);
				this.lastStage = this.stage;
			}
			this.draw(dt, t);
		}

		// a throw is in the air: PassManager moves it, this keeps it stretched along its path and spinning
		fly(x, y, angle, dt) {
			// remember how fast it was going, so the catch carries the throw's swing
			if (dt > 0) {
				this.vx = (x - this.x) / dt * 0.35;
				this.vy = (y - this.y) / dt * 0.35;
			}
			this.x = x;
			this.y = y;
			this.trail.push({x, y, t: this.scene.time.now});
			if (this.trail.length > 60) this.trail.shift();
			this.flightAngle = angle;
			this.spin += dt * 9;
		}

		onStage() {}

		draw() {}

		// off it goes: no pop, no harm
		vanish() {
			this.state = 'gone';
			this.detach();
			if (this.target) this.target.incoming = null;
			this.target = null;
			if (this.tween) this.tween.stop();
			this.c.destroy();
			this.line.destroy();
			this.extras().forEach((o) => o.destroy());
		}

		extras() {
			return [];
		}
	}

	BP.Hot = Hot;
})();
