/* Monkey Mischief: Coco, the computer monkey. Plays when only one child picks a player, and runs the
   monkeys behind the start menu. Coco is deliberately beatable: a bit slower, a bit forgetful,
   and only sometimes sneaky. Each think() returns a direction; pressing the trick button sets m.botPress. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});

	function route(L, m, gx, gy) {
		// straight line crosses the pond? go via the bridge or around the pond, whichever is shorter
		let wet = false;
		for (let i = 1; i <= 8 && !wet; i++) {
			const t = i / 9;
			if (L.inWater(m.x + (gx - m.x) * t, m.y + (gy - m.y) * t)) wet = true;
		}
		if (!wet) return {x: gx, y: gy};
		const P = L.pond;
		const ways = [
			{x: P.x - P.rx - 40, y: P.y}, {x: P.x + P.rx + 40, y: P.y},
			{x: P.x, y: P.y - P.ry - 60}, {x: P.x, y: P.y + P.ry + 60},
			{x: P.x - P.rx * 0.8, y: P.y - P.ry - 20}, {x: P.x + P.rx * 0.8, y: P.y - P.ry - 20},
			{x: P.x - P.rx * 0.8, y: P.y + P.ry + 20}, {x: P.x + P.rx * 0.8, y: P.y + P.ry + 20}
		];
		let best = ways[0];
		let bd = Infinity;
		for (const w of ways) {
			if (Math.hypot(w.x - m.x, w.y - m.y) < 30) continue;
			const d = Math.hypot(w.x - m.x, w.y - m.y) + Math.hypot(gx - w.x, gy - w.y);
			if (d < bd) {
				bd = d;
				best = w;
			}
		}

		return best;
	}

	function think(m, scene, dt) {
		const L = scene.L;
		const ai = m.ai || (m.ai = {t: 0, goal: null, stuckT: 0, lx: m.x, ly: m.y, dodge: 0, dodgeA: 0});
		ai.t -= dt;
		if (ai.t <= 0) {
			ai.t = 0.35 + Math.random() * 0.25;
			ai.goal = choose(m, scene);
			// sneaky: drop a peel when someone is right behind
			if (m.peels > 0 && scene.monkeys.some((o) => o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 150 && (o.x - m.x) * m.facing < 0) && Math.random() < 0.3) m.botPress = true;
			// use a power that needs the button
			if (m.power && m.power.kind === 'bomb' && Math.random() < 0.25) m.botPress = true;
		}
		// stuck against a rock? sidestep for a moment
		const moved = Math.hypot(m.x - ai.lx, m.y - ai.ly);
		ai.lx = m.x;
		ai.ly = m.y;
		if (moved < 40 * dt && ai.goal && Math.hypot(ai.goal.x - m.x, ai.goal.y - m.y) > 40) ai.stuckT += dt;
		else ai.stuckT = Math.max(0, ai.stuckT - dt);
		if (ai.stuckT > 0.5) {
			ai.stuckT = 0;
			ai.dodge = 0.5;
			ai.dodgeA = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
		}
		if (!ai.goal) return {x: 0, y: 0, mag: 0};
		const w = route(L, m, ai.goal.x, ai.goal.y);
		let dx = w.x - m.x;
		let dy = w.y - m.y;
		const d = Math.hypot(dx, dy);
		if (d < 12) return {x: 0, y: 0, mag: 0};
		dx /= d;
		dy /= d;
		if (ai.dodge > 0) {
			ai.dodge -= dt;
			const c = Math.cos(ai.dodgeA);
			const s = Math.sin(ai.dodgeA);
			[dx, dy] = [dx * c - dy * s, dx * s + dy * c];
		}
		// step around coconut targets
		if (scene.traps.danger(m.x + dx * 50, m.y + dy * 50, 70)) [dx, dy] = [-dy, dx];

		return {x: dx, y: dy, mag: Math.min(1, d / 60)};
	}

	function choose(m, scene) {
		const basket = scene.baskets.of(m);
		const left = scene.director ? scene.director.left : 99;
		const g = scene.gorilla;
		// run from the gorilla
		if (g.near(m.x, m.y, 300) && g.target === m) {
			const a = Math.atan2(m.y - g.y, m.x - g.x);
			const p = scene.L.nearestFree(m.x + Math.cos(a) * 220, m.y + Math.sin(a) * 220, 30);

			return p;
		}
		// go home to bank bananas
		if (basket && (m.carry.length >= 3 || (m.carry.length && left < 12) || (m.full))) return {x: basket.x, y: basket.y - 30};
		const gold = scene.bananas.gold;
		if (gold.on && Math.hypot(gold.x - m.x, gold.y - m.y) < 650) return {x: gold.x, y: gold.y};
		const pu = scene.powerups.list.find((p) => p.on && Math.hypot(p.x - m.x, p.y - m.y) < 300);
		if (pu) return {x: pu.x, y: pu.y};
		// sometimes: sneak to the leader's basket
		if (scene.state === 'play' && scene.director && scene.director.phase !== 'hunt' && Math.random() < 0.06) {
			const rich = scene.baskets.list.filter((b) => b.owner !== m && b.owner.score >= 3).sort((a, b) => b.owner.score - a.owner.score)[0];
			if (rich) return {x: rich.x, y: rich.y - 30};
		}
		const b = scene.bananas.nearest(m.x, m.y, (q) => scene.traps.danger(q.x, q.y, 60));
		if (b) return {x: b.x, y: b.y};
		if (m.carry.length && basket) return {x: basket.x, y: basket.y - 30};

		return scene.L.randomFree();
	}

	MM.Bot = {think};
})();
