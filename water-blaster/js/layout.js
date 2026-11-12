/* Water Blaster Arena: where everything is (ArenaManager geometry). Game units: H = 1040 high, W as wide as the
   screen's shape (never narrower than the 1440 design). Every player owns a corner deck with their joystick and
   water button; the middle is a pool with a slide (nobody walks in it; soaked players float in it on a ring).
     WB.Layout.make(slotPlayers) -> {W, H, pool, corners, solids, umbrellas, pads, taps, floats, inPool, blocksWater, isFree, randomFree, nearestFree}
   A solid is a circle that blocks both feet and water (barrels, sand walls, inflatables, palm trunks). */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const H = 1040;
	const wanted = () => Math.round(Math.min(2400, Math.max(1440, H * (innerWidth / Math.max(1, innerHeight)))));
	let W = wanted();
	const mid = (x) => x + (W - 1440) / 2;

	// slot 0 bottom-left, 1 bottom-right, 2 top-left, 3 top-right (2 players sit side by side at the bottom)
	const corners0 = () => [
		{cx: 0, cy: H, sx: 1, sy: -1, top: false},
		{cx: W, cy: H, sx: -1, sy: -1, top: false},
		{cx: 0, cy: 0, sx: 1, sy: 1, top: true},
		{cx: W, cy: 0, sx: -1, sy: 1, top: true}
	];
	const PAUSE = {x: 120, y: 604, h: 50};
	const DECK_R = 290;
	const EMPTY_R = 230;
	// where things sit on a deck, in corner-local units
	const LOCAL = {joy: [108, 108], button: [258, 66], avatar: [62, 258], start: [330, 330]};

	function make(slotPlayers) {
		const pool = {x: W / 2, y: H / 2, rx: 214, ry: 124};
		const corners = corners0().map((c, i) => {
			const player = slotPlayers[i] || null;
			const at = ([lx, ly]) => ({x: c.cx + c.sx * lx, y: c.cy + c.sy * ly});

			return {...c, slot: i, player, r: player ? DECK_R : EMPTY_R, at, joy: at(LOCAL.joy), button: at(LOCAL.button), avatar: at(LOCAL.avatar), start: at(LOCAL.start)};
		});

		// cover: things to hide behind (block feet and water). Mirrored, so every corner has the same chances.
		const solids = [];
		const add = (x, y, r, kind, extra = {}) => solids.push({x, y, r, kind, ...extra});
		// sand walls above and below the pool: three circles each, drawn as one wall
		[270, H - 270].forEach((y, i) => {
			[-62, 0, 62].forEach((dx, j) => add(mid(720) + dx, y, 30, j === 1 ? 'wall' : 'wall-part', {wall: i}));
		});
		add(mid(430), 240, 30, 'barrel');
		add(mid(1010), 240, 30, 'barrel');
		add(mid(430), H - 240, 30, 'barrel');
		add(mid(1010), H - 240, 30, 'barrel');
		add(mid(720) - pool.rx - 150, H / 2 - 40, 42, 'duck');
		add(mid(720) + pool.rx + 150, H / 2 + 40, 42, 'donut');
		add(96, 470, 18, 'palm');
		add(W - 96, 570, 18, 'palm');

		// umbrellas: only the pole is solid; the canopy turns see-through when someone stands under it
		const umbrellas = [
			{x: mid(520), y: 168, v: 0}, {x: mid(920), y: 168, v: 1},
			{x: mid(520), y: H - 168, v: 1}, {x: mid(920), y: H - 168, v: 0}
		];
		umbrellas.forEach((u) => add(u.x, u.y, 9, 'pole'));
		// splash pads: little fountains that pop up now and then
		const pads = [{x: mid(300), y: 300}, {x: W - mid(300), y: H - 300}, {x: mid(300), y: H - 300}, {x: W - mid(300), y: 300}].filter((p) => p.x > 330 && p.x < W - 330);
		// refill taps: one above the pool and one below it, the same distance from every deck
		const taps = [{x: W / 2, y: 92, top: true}, {x: W / 2, y: H - 92, top: false}];
		taps.forEach((t) => add(t.x, t.y - (t.top ? 22 : -22), 26, 'tap'));
		// where soaked players float in the pool
		const floats = [[-70, -40], [110, 30], [-40, 55], [100, -50]].map(([dx, dy]) => ({x: pool.x + dx, y: pool.y + dy}));

		const inPool = (x, y, pad = 0) => ((x - pool.x) / (pool.rx + pad)) ** 2 + ((y - pool.y) / (pool.ry + pad)) ** 2 < 1;
		// does a drop at (x, y) hit cover? (returns the solid, so a barrel can wobble)
		const blocksWater = (x, y) => {
			for (const s of solids) if (s.kind !== 'pole' && Math.abs(x - s.x) < s.r + 4 && Math.hypot(x - s.x, y - s.y) < s.r + 4) return s;

			return null;
		};

		function isFree(x, y, r = 30) {
			if (x < 40 + r || y < 40 + r || x > W - 40 - r || y > H - 40 - r) return false;
			if (x < PAUSE.x + r && Math.abs(y - PAUSE.y) < PAUSE.h + r) return false;
			if (inPool(x, y, r + 14)) return false;
			if (corners.some((c) => Math.hypot(x - c.cx, y - c.cy) < c.r + r + 10)) return false;
			if (solids.some((o) => Math.hypot(x - o.x, y - o.y) < o.r + r + 8)) return false;

			return true;
		}

		function randomFree(r = 30, tries = 80) {
			for (let i = 0; i < tries; i++) {
				const x = 60 + Math.random() * (W - 120);
				const y = 60 + Math.random() * (H - 120);
				if (isFree(x, y, r)) return {x, y};
			}

			return {x: pool.x, y: pool.y + pool.ry + 90};
		}

		function nearestFree(x, y, r = 30) {
			for (let rad = 0; rad < 600; rad += 16) {
				for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
					const px = x + Math.cos(a) * rad;
					const py = y + Math.sin(a) * rad;
					if (isFree(px, py, r)) return {x: px, y: py};
				}
			}

			return randomFree(r);
		}

		return {W, H, pool, corners, solids, umbrellas, pads, taps, floats, inPool, blocksWater, isFree, randomFree, nearestFree};
	}

	WB.Layout = {
		W, H, make, LOCAL,
		// the screen changed shape: true when the arena should be rebuilt at the new width
		refit() {
			const w = wanted();
			if (Math.abs(w - W) < 24) return false;
			W = WB.Layout.W = w;

			return true;
		}
	};
})();
