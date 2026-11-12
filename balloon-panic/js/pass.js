/* Balloon Panic: PassManager. Throwing, flying and catching: the heart of the game.
     pass.pass(obj, target, power)   throw obj to that buddy (power 0..1 = how hard the swipe was)
     pass.next(obj)                  who a plain "pass" goes to (round the circle; Reverse Chaos flips it)
     pass.fake(buddy)                a pretend throw: it lunges out and snaps back
   One throw per object at a time, never to a buddy who is already busy, never after the round has ended. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});

	class PassManager {
		constructor(scene) {
			this.scene = scene;
		}

		can(obj) {
			return !!obj && obj.state === 'held' && obj.locked <= 0 && this.scene.round.state === 'play';
		}

		next(obj) {
			return this.scene.players.next(obj.holder);
		}

		pass(obj, target, power = 0.5) {
			const sc = this.scene;
			if (!this.can(obj)) return false;
			const from = obj.holder;
			if (!target || target === from || target.busy) {
				obj.kick(3);
				BP.Sound.sfx.nope();

				return false;
			}
			// sticky: it takes a few tugs before it lets go
			if (obj.sticky > 1) {
				obj.sticky--;
				obj.kick(8);
				BP.Sound.sfx.squelch();
				sc.fx.burst('goo', obj.x, obj.y, 6);
				from.setExpr('panic', 0.4);

				return false;
			}
			if (obj.sticky === 1) {
				obj.sticky = 0;
				BP.Sound.sfx.unstick();
				sc.fx.burst('goo', obj.x, obj.y, 14);
			}
			const close = !obj.fake && obj.left < 0.75; // away at the very last instant
			sc.score.pass(from, obj);
			from.throwAt(target.mid.x, target.mid.y);
			obj.detach();
			obj.pull = {x: 0, y: 0};
			this.launch(obj, target, power);
			BP.Sound.sfx.whoosh(power);
			sc.round.onPass(obj, from, target, close);

			return true;
		}

		// the flight: a curved path (or a zig-zag off the walls), sampled into points and followed at an even pace
		launch(obj, target, power = 0.5) {
			const sc = this.scene;
			const mods = sc.round.mods;
			const cfg = BP.CONFIG[sc.cfg.speed];
			obj.state = 'fly';
			obj.target = target;
			obj.ribbonTint = target.tint; // the ribbon wears the colour of whoever it is flying to
			target.incoming = obj;
			const S = {x: obj.x, y: obj.y};
			const E = obj.anchor(target);
			const dist = Math.hypot(E.x - S.x, E.y - S.y) || 1;
			const pts = [];
			const corners = [];
			if (mods.bounce) {
				const {W, H} = sc.L;
				const pad = obj.r + 14;
				const nodes = [S];
				// off the top or the bottom, whichever is farther from the straight line, and sometimes a side wall too
				const midY = (S.y + E.y) / 2;
				nodes.push({x: S.x + (E.x - S.x) * (0.3 + Math.random() * 0.4), y: midY > H / 2 ? pad : H - pad});
				if (Math.random() < 0.4) nodes.push({x: Math.random() < 0.5 ? pad : W - pad, y: H * (0.3 + Math.random() * 0.4)});
				nodes.push(E);
				for (let i = 1; i < nodes.length; i++) {
					for (let j = i === 1 ? 0 : 1; j <= 8; j++) pts.push({x: nodes[i - 1].x + ((nodes[i].x - nodes[i - 1].x) * j) / 8, y: nodes[i - 1].y + ((nodes[i].y - nodes[i - 1].y) * j) / 8});
					if (i < nodes.length - 1) corners.push(pts.length - 1);
				}
			} else {
				const side = Math.random() < 0.5 ? -1 : 1;
				const nx = (-(E.y - S.y) / dist) * side;
				const ny = ((E.x - S.x) / dist) * side;
				const cx = (S.x + E.x) / 2 + nx * dist * 0.26;
				const cy = (S.y + E.y) / 2 + ny * dist * 0.26 - dist * 0.1;
				for (let i = 0; i <= 24; i++) {
					const u = i / 24;
					const a = (1 - u) * (1 - u);
					const b = 2 * u * (1 - u);
					pts.push({x: a * S.x + b * cx + u * u * E.x, y: a * S.y + b * cy + u * u * E.y});
				}
			}
			const len = [0];
			for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
			const total = len[len.length - 1];
			const cornerAt = corners.map((i) => len[i]);
			let duration = cfg.flight * (0.55 + dist / 1500) * (1.3 - power * 0.6) * (total / dist);
			if (mods.speed) duration *= 0.42;
			if (obj.mul > 1.2) duration *= 1.45; // a giant one is heavy
			let seg = 1;
			let hit = 0;
			obj.kick(6);
			obj.tween = sc.tweens.addCounter({
				from: 0, to: total, duration: duration * 1000, ease: mods.bounce ? 'Linear' : 'Sine.easeInOut',
				onUpdate: (tw) => {
					const d = tw.getValue();
					while (seg < pts.length - 1 && len[seg] < d) seg++;
					const a = pts[seg - 1];
					const b = pts[seg];
					const u = (d - len[seg - 1]) / Math.max(0.001, len[seg] - len[seg - 1]);
					obj.fly(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, Math.atan2(b.y - a.y, b.x - a.x), sc.game.loop.delta / 1000);
					while (hit < cornerAt.length && d >= cornerAt[hit]) {
						hit++;
						obj.kick(12);
						BP.Sound.sfx.boing();
						sc.fx.ring(obj.x, obj.y, 0xffffff, 1.2, 320);
						sc.fx.burst('star', obj.x, obj.y, 5, 0xffd23f);
					}
					if (mods.speed) sc.fx.burst('dot', obj.x, obj.y, 1, obj.tint);
				},
				onComplete: () => this.land(obj, target)
			});
		}

		land(obj, target) {
			const sc = this.scene;
			if (obj.state !== 'fly') return;
			obj.tween = null;
			obj.attach(target);
			BP.Sound.sfx.catch(obj.stage);
			sc.fx.burst('sparkle', obj.x, obj.y, 8, target.tint);
			sc.fx.ring(target.mid.x, target.seat.y, target.tint, 1.5, 380);
			target.caught(obj.stage);
			sc.round.onHold(obj);
		}

		// "ha, made you look!": the holder pretends to throw
		fake(b) {
			const sc = this.scene;
			const obj = b.obj;
			if (!this.can(obj)) return false;
			const target = this.next(obj) || sc.players.random(b, () => true);
			if (!target) return false;
			const a = obj.anchor(target);
			obj.locked = 0.5;
			sc.tweens.add({targets: obj.lunge, x: (a.x - obj.x) * 0.6, y: (a.y - obj.y) * 0.6, duration: 210, ease: 'Quad.easeOut', yoyo: true});
			b.throwAt(target.mid.x, target.mid.y);
			b.setExpr('smug', 1.1);
			target.setExpr('shock', 0.8);
			target.jump(30, 0.36);
			BP.Sound.sfx.whoosh(0.8);
			sc.time.delayedCall(170, () => BP.Sound.sfx.honk());
			sc.score.prank(b, 'fake');

			return true;
		}
	}

	BP.PassManager = PassManager;
})();
