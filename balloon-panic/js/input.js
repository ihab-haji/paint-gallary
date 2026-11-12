/* Balloon Panic: InputManager. Up to 4 children touch the same screen at once.
   Every finger is owned by exactly one thing from touch-down to lift, so hands never fight:
     - tap another buddy                     -> the balloon flies to that buddy
     - tap the balloon (or your own buddy)   -> PASS: it goes to the next buddy round the circle
     - drag or swipe the balloon             -> it is thrown that way; a faster swipe is a faster throw
     - tap your prank button                 -> a silly face or dance; while you hold the balloon: a fake throw
   Keyboard for testing on a computer:
     1 2 3 4  throw to that player · Space  pass to the next
     pass / prank per player:  P1 A / S · P2 L / K · P3 T / Y · P4 Up / Down */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const TAP = 34; // a finger that moved less than this (game units) was a tap
	const KEYS = [{pass: 'A', prank: 'S'}, {pass: 'L', prank: 'K'}, {pass: 'T', prank: 'Y'}, {pass: 'UP', prank: 'DOWN'}];

	class Input {
		constructor(scene) {
			this.scene = scene;
			this.owner = new Map(); // pointer id -> the gesture it started
			this.aim = null; // {obj, target}: where a drag is pointing right now
			this.onDown = (ptr) => this.down(ptr);
			this.onMove = (ptr) => this.move(ptr);
			this.onUp = (ptr) => this.up(ptr);
			scene.input.on('pointerdown', this.onDown);
			scene.input.on('pointermove', this.onMove);
			scene.input.on('pointerup', this.onUp);
			scene.input.on('pointerupoutside', this.onUp);
			this.keys();
		}

		// the objects someone is holding, the most urgent first
		held(ok = () => true) {
			return this.scene.round.objs.filter((o) => o.state === 'held' && ok(o)).sort((a, b) => a.left - b.left);
		}

		keys() {
			const kb = this.scene.input.keyboard;
			if (!kb) return;
			const sc = this.scene;
			const list = sc.players.list;
			['ONE', 'TWO', 'THREE', 'FOUR'].forEach((name, i) => kb.addKey(name).on('down', () => {
				const o = this.held((h) => h.holder !== list[i])[0];
				if (o && list[i]) sc.pass.pass(o, list[i], 0.6);
			}));
			kb.addKey('SPACE').on('down', () => {
				const o = this.held()[0];
				if (o) sc.pass.pass(o, sc.pass.next(o), 0.6);
			});
			list.forEach((b, i) => {
				if (b.bot) return;
				kb.addKey(KEYS[i].pass).on('down', () => b.obj && sc.pass.pass(b.obj, sc.pass.next(b.obj), 0.6));
				kb.addKey(KEYS[i].prank).on('down', () => this.prank(b));
			});
		}

		prank(b) {
			const sc = this.scene;
			if (sc.round.state !== 'play') return;
			const now = sc.time.now;
			if (now < b.teaseAt) return;
			b.teaseAt = now + 900;
			sc.players.pressPrank(b);
			if (b.obj) {
				sc.pass.fake(b);

				return;
			}
			b.tease();
			sc.score.prank(b, 'tease');
			sc.fx.burst('star', b.face.x, b.face.y - 70, 5, b.tint);
			// everyone glances over: that is the distraction
			sc.players.list.forEach((o) => o !== b && o.glance(b.face.x, b.face.y, 0.8));
		}

		down(ptr) {
			if (this.owner.has(ptr.id)) return;
			const sc = this.scene;
			const x = ptr.worldX;
			const y = ptr.worldY;
			const P = sc.players;
			// 1) a prank button
			const joker = P.prankAt(x, y);
			if (joker) {
				this.owner.set(ptr.id, {kind: 'btn'});
				this.prank(joker);

				return;
			}
			if (sc.round.state !== 'play') return;
			// 2) the balloon itself, or the buddy holding it: the start of a pass, a drag or a swipe
			let obj = this.held((o) => !o.holder.bot).find((o) => Math.hypot(x - o.x, y - o.y) < o.r + 36);
			const b = P.at(x, y);
			if (!obj && b && b.obj && !b.bot && b.obj.state === 'held') obj = b.obj;
			if (obj) {
				this.owner.set(ptr.id, {kind: 'obj', obj, holder: obj.holder, x0: x, y0: y, x, y, trail: [{x, y, t: ptr.downTime}]});

				return;
			}
			// 3) another buddy: "throw it to them!"
			if (b) {
				const o = this.held((h) => h.holder !== b && !h.holder.bot)[0];
				this.owner.set(ptr.id, {kind: 'tap'});
				if (o) sc.pass.pass(o, b, 0.55);
				else b.jump(14, 0.24);
			}
		}

		move(ptr) {
			const g = this.owner.get(ptr.id);
			if (!g || g.kind !== 'obj') return;
			g.x = ptr.worldX;
			g.y = ptr.worldY;
			g.trail.push({x: g.x, y: g.y, t: ptr.event.timeStamp});
			if (g.trail.length > 8) g.trail.shift();
			const o = g.obj;
			if (o.state !== 'held' || o.holder !== g.holder) return;
			// the balloon leans after the finger, like pulling on rubber
			const dx = g.x - g.x0;
			const dy = g.y - g.y0;
			const d = Math.hypot(dx, dy);
			const lean = Math.min(52, d * 0.4);
			o.pull = d > 1 ? {x: (dx / d) * lean, y: (dy / d) * lean} : {x: 0, y: 0};
			this.aim = d > TAP ? {obj: o, target: this.pick(g)} : null;
		}

		// who a drag is pointing at: the buddy under the finger, else the closest one in that direction
		pick(g) {
			const P = this.scene.players;
			const under = P.at(g.x, g.y);
			if (under && under !== g.holder && !under.busy) return under;
			const from = g.holder.mid;
			const ang = Math.atan2(g.y - g.y0, g.x - g.x0);
			let best = null;
			let bestD = 1.25;
			for (const b of P.list) {
				if (b === g.holder || b.busy) continue;
				const m = b.mid;
				const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(m.y - from.y, m.x - from.x) - ang), Math.cos(Math.atan2(m.y - from.y, m.x - from.x) - ang)));
				if (diff < bestD) {
					best = b;
					bestD = diff;
				}
			}

			return best;
		}

		up(ptr) {
			const g = this.owner.get(ptr.id);
			if (!g) return;
			this.owner.delete(ptr.id);
			if (g.kind !== 'obj') return;
			this.finish(g, ptr.event ? ptr.event.timeStamp : performance.now());
		}

		finish(g, now) {
			const sc = this.scene;
			const o = g.obj;
			if (this.aim && this.aim.obj === o) this.aim = null;
			o.pull = {x: 0, y: 0};
			if (o.state !== 'held' || o.holder !== g.holder) return;
			const moved = Math.hypot(g.x - g.x0, g.y - g.y0);
			if (moved < TAP) {
				sc.pass.pass(o, sc.pass.next(o), 0.5);

				return;
			}
			// how fast was the finger going at the end? (game units a second)
			const old = g.trail.find((p) => now - p.t < 130) || g.trail[0];
			const dt = Math.max(16, now - old.t) / 1000;
			const speed = Math.hypot(g.x - old.x, g.y - old.y) / dt;
			const power = Math.max(0.25, Math.min(1, speed / 2400));
			sc.pass.pass(o, this.pick(g) || sc.pass.next(o), power);
		}

		// every frame: drop fingers the browser lost (touchcancel, app switch) so no drag ever sticks
		update() {
			const mgr = this.scene.input.manager;
			this.owner.forEach((g, id) => {
				const ptr = mgr.pointers.find((q) => q && q.id === id);
				if (!ptr || !ptr.isDown) {
					this.owner.delete(id);
					if (g.kind === 'obj') {
						g.obj.pull = {x: 0, y: 0};
						if (this.aim && this.aim.obj === g.obj) this.aim = null;
					}
				}
			});
		}

		releaseAll() {
			this.owner.forEach((g) => {
				if (g.kind === 'obj') g.obj.pull = {x: 0, y: 0};
			});
			this.owner.clear();
			this.aim = null;
		}

		destroy() {
			const s = this.scene;
			s.input.off('pointerdown', this.onDown);
			s.input.off('pointermove', this.onMove);
			s.input.off('pointerup', this.onUp);
			s.input.off('pointerupoutside', this.onUp);
			this.owner.clear();
		}
	}

	BP.Input = Input;
})();
