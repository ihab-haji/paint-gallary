/* Water Blaster Arena: Ducky, the computer splasher. Joins when only one child plays, fills empty team seats,
   and plays behind the start menu. Ducky is deliberately beatable: a bit slower, a wobbly aim, short bursts,
   and sometimes busy with something else. think() returns a direction and sets f.botSpray / f.want. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});

	// a straight line through the pool? go round it
	function route(L, f, gx, gy) {
		let wet = false;
		for (let i = 1; i <= 8 && !wet; i++) {
			const t = i / 9;
			if (L.inPool(f.x + (gx - f.x) * t, f.y + (gy - f.y) * t, 30)) wet = true;
		}
		if (!wet) return {x: gx, y: gy};
		const P = L.pool;
		const ways = [
			{x: P.x - P.rx - 70, y: P.y}, {x: P.x + P.rx + 70, y: P.y},
			{x: P.x - P.rx * 0.7, y: P.y - P.ry - 70}, {x: P.x + P.rx * 0.7, y: P.y - P.ry - 70},
			{x: P.x - P.rx * 0.7, y: P.y + P.ry + 70}, {x: P.x + P.rx * 0.7, y: P.y + P.ry + 70}
		];
		let best = ways[0];
		let bd = Infinity;
		for (const w of ways) {
			if (Math.hypot(w.x - f.x, w.y - f.y) < 30) continue;
			const d = Math.hypot(w.x - f.x, w.y - f.y) + Math.hypot(gx - w.x, gy - w.y);
			if (d < bd) {
				bd = d;
				best = w;
			}
		}

		return best;
	}

	function think(f, scene, dt) {
		const L = scene.L;
		const ai = f.ai || (f.ai = {t: 0, goal: null, foe: null, stuckT: 0, lx: f.x, ly: f.y, dodge: 0, dodgeA: 0, burst: 0, rest: 0, side: Math.random() < 0.5 ? 1 : -1, jitter: 0});
		ai.t -= dt;
		if (ai.t <= 0) {
			ai.t = 0.4 + Math.random() * 0.3;
			ai.jitter = (Math.random() - 0.5) * 0.5;
			if (Math.random() < 0.15) ai.side *= -1;
			choose(f, scene, ai);
		}
		// spray in short bursts with little rests (beatable)
		if (ai.burst > 0) ai.burst -= dt;
		else if (ai.rest > 0) ai.rest -= dt;
		f.botSpray = false;
		if (ai.foe && !ai.foe.out && f.tank > 4) {
			const d = Math.hypot(ai.foe.x - f.x, ai.foe.y - f.y);
			const w = WB.WEAPONS[f.weapon];
			f.aimLocked = true;
			f.want = Math.atan2(ai.foe.y - f.y, ai.foe.x - f.x) + ai.jitter;
			if (d < w.range * 0.95) {
				if (ai.burst <= 0 && ai.rest <= 0) {
					ai.burst = 0.8 + Math.random() * 0.9;
					ai.rest = 0.5 + Math.random() * 0.9;
				}
				f.botSpray = ai.burst > 0;
			}
		} else {
			f.aimLocked = false;
		}
		// stuck against something? sidestep for a moment
		const moved = Math.hypot(f.x - ai.lx, f.y - ai.ly);
		ai.lx = f.x;
		ai.ly = f.y;
		if (moved < 40 * dt && ai.goal && Math.hypot(ai.goal.x - f.x, ai.goal.y - f.y) > 40) ai.stuckT += dt;
		else ai.stuckT = Math.max(0, ai.stuckT - dt);
		if (ai.stuckT > 0.5) {
			ai.stuckT = 0;
			ai.dodge = 0.5;
			ai.dodgeA = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
		}
		if (!ai.goal) return {x: 0, y: 0, mag: 0};
		const way = route(L, f, ai.goal.x, ai.goal.y);
		let dx = way.x - f.x;
		let dy = way.y - f.y;
		const d = Math.hypot(dx, dy);
		if (d < 18) return {x: 0, y: 0, mag: 0};
		dx /= d;
		dy /= d;
		if (ai.dodge > 0) {
			ai.dodge -= dt;
			const c = Math.cos(ai.dodgeA);
			const s = Math.sin(ai.dodgeA);
			const rx = dx * c - dy * s;
			const ry = dx * s + dy * c;
			dx = rx;
			dy = ry;
		}

		return {x: dx, y: dy, mag: ai.goal.slow ? 0.6 : 1};
	}

	function choose(f, scene, ai) {
		const L = scene.L;
		const foes = scene.fighters.filter((o) => o !== f && !o.out && (!scene.teams || o.team !== f.team));
		// the wave is coming: go to the other half
		const ev = scene.surprises && scene.surprises.cur;
		if (ev && ev.key === 'wave' && ev.topHalf !== undefined) {
			ai.goal = {x: f.x, y: ev.topHalf ? L.H * 0.75 : L.H * 0.25};
		}
		// nearest foe
		let foe = null;
		let fd = Infinity;
		for (const o of foes) {
			const d = Math.hypot(o.x - f.x, o.y - f.y);
			if (d < fd) {
				fd = d;
				foe = o;
			}
		}
		ai.foe = foe;
		// low on water: go to a tap or a bottle
		if (f.tank < 22) {
			const bottle = scene.pickups.items.find((it) => it.kind === 'bottle');
			const tap = L.taps.reduce((a, b) => (Math.hypot(a.x - f.x, a.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? a : b));
			const tapSpot = {x: tap.x, y: tap.y + (tap.top ? 70 : -70)};
			ai.goal = bottle && Math.hypot(bottle.x - f.x, bottle.y - f.y) < Math.hypot(tapSpot.x - f.x, tapSpot.y - f.y) ? {x: bottle.x, y: bottle.y} : tapSpot;

			return;
		}
		// a pickup close by
		const near = scene.pickups.items.find((it) => Math.hypot(it.x - f.x, it.y - f.y) < 280);
		if (near && Math.random() < 0.7) {
			ai.goal = {x: near.x, y: near.y};

			return;
		}
		if (!foe) {
			ai.goal = L.randomFree(30);

			return;
		}
		// very wet: keep away a bit; otherwise circle the foe at about two-thirds of the range
		const w = WB.WEAPONS[f.weapon];
		const want = f.wet > 75 ? w.range * 1.05 : w.range * 0.62;
		const a = Math.atan2(f.y - foe.y, f.x - foe.x) + ai.side * 0.5;
		let gx = foe.x + Math.cos(a) * want;
		let gy = foe.y + Math.sin(a) * want;
		if (!L.isFree(gx, gy, 30)) {
			const p = L.nearestFree(gx, gy, 30);
			gx = p.x;
			gy = p.y;
		}
		ai.goal = {x: gx, y: gy, slow: fd < want * 0.9};
	}

	WB.Bot = {think};
})();
