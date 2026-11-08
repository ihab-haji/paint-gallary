/* Monkey Mischief: the jungle arena's shape, in game units (1440 × 1040, an iPad held sideways).
   Four corners = four players. Each player sits at their corner: a wooden deck holds their joystick,
   their trick button and their basket. Corners without a player become thick jungle.
     MM.Layout.make(slotPlayers)  -> L (everything the scene needs to place things and test where a monkey may walk)
   Corner "local" coordinates: x and y measured from that corner into the arena, so every player's
   controls are in the same place relative to where they sit. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const W = 1440;
	const H = 1040;

	// slot 0 bottom-left, 1 bottom-right, 2 top-left, 3 top-right (2 players sit side by side at the bottom)
	const CORNERS = [
		{cx: 0, cy: H, sx: 1, sy: -1, top: false},
		{cx: W, cy: H, sx: -1, sy: -1, top: false},
		{cx: 0, cy: 0, sx: 1, sy: 1, top: true},
		{cx: W, cy: 0, sx: -1, sy: 1, top: true}
	];
	const DECK_R = 290;
	const JUNGLE_R = 230;
	// where things sit on a deck, in corner-local units
	const LOCAL = {joy: [104, 104], button: [252, 64], basket: [206, 206], avatar: [62, 252]};

	function make(slotPlayers) {
		const pond = {x: W / 2, y: H / 2, rx: 250, ry: 150};
		const island = 78;
		const bridges = [
			{x: pond.x - pond.rx - 22, y: pond.y, w: pond.rx - island + 34, h: 64},
			{x: pond.x + island - 12, y: pond.y, w: pond.rx - island + 34, h: 64}
		];
		const corners = CORNERS.map((c, i) => {
			const player = slotPlayers[i] || null;
			const at = ([lx, ly]) => ({x: c.cx + c.sx * lx, y: c.cy + c.sy * ly});

			return {...c, slot: i, player, r: player ? DECK_R : JUNGLE_R, at, joy: at(LOCAL.joy), button: at(LOCAL.button), basket: at(LOCAL.basket), avatar: at(LOCAL.avatar)};
		});
		// rocks block; bushes rustle; trees block at the trunk
		const obstacles = [
			{x: 440, y: 255, r: 30, kind: 'rock-a'},
			{x: 1000, y: 255, r: 30, kind: 'rock-b'},
			{x: 440, y: 790, r: 30, kind: 'rock-b'},
			{x: 1000, y: 790, r: 30, kind: 'rock-a'},
			{x: 720, y: 178, r: 20, kind: 'banana-tree'},
			{x: 720, y: 918, r: 20, kind: 'banana-tree'},
			{x: 96, y: 520, r: 18, kind: 'palm'},
			{x: W - 96, y: 520, r: 18, kind: 'palm'}
		];
		const bushes = [
			{x: 572, y: 262, kind: 'bush-a'}, {x: 868, y: 262, kind: 'bush-b'},
			{x: 572, y: 800, kind: 'bush-b'}, {x: 868, y: 800, kind: 'bush-a'},
			{x: 236, y: 640, kind: 'bush-a'}, {x: W - 236, y: 400, kind: 'bush-b'}
		];
		const puddles = [{x: 352, y: 392, r: 42}, {x: W - 352, y: H - 392, r: 42}, {x: 1080, y: 392, r: 34}, {x: 360, y: H - 392, r: 34}];
		const lilies = [[pond.x - 150, pond.y - 70, 18], [pond.x + 160, pond.y + 66, 16], [pond.x + 120, pond.y - 84, 13], [pond.x - 120, pond.y + 92, 14]];
		const paths = [
			[206, H - 206, 270, 720, 330, 580, bridges[0].x - 10, pond.y],
			[206, 206, 270, 320, 330, 460, bridges[0].x - 10, pond.y],
			[W - 206, H - 206, W - 270, 720, W - 330, 580, bridges[1].x + bridges[1].w + 10, pond.y],
			[W - 206, 206, W - 270, 320, W - 330, 460, bridges[1].x + bridges[1].w + 10, pond.y],
			[300, H - 70, 560, H - 150, 880, H - 150, W - 300, H - 70],
			[300, 70, 560, 150, 880, 150, W - 300, 70]
		];

		const inPond = (x, y, pad = 0) => ((x - pond.x) / (pond.rx + pad)) ** 2 + ((y - pond.y) / (pond.ry + pad)) ** 2 < 1;
		const onIsland = (x, y, pad = 0) => Math.hypot(x - pond.x, y - pond.y) < island + pad;
		const onBridge = (x, y) => bridges.some((b) => x > b.x && x < b.x + b.w && Math.abs(y - b.y) < b.h / 2 - 6);

		// water: inside the pond, but not on the island or a bridge
		const inWater = (x, y) => inPond(x, y, -8) && !onIsland(x, y, 4) && !onBridge(x, y);

		// a free spot: inside the arena, dry, not on a deck, rock or trunk
		function isFree(x, y, r = 30) {
			if (x < 40 + r || y < 40 + r || x > W - 40 - r || y > H - 40 - r) return false;
			if (inPond(x, y, r + 10) && !onIsland(x, y, -r)) return false;
			if (corners.some((c) => Math.hypot(x - c.cx, y - c.cy) < c.r + r + 10)) return false;
			if (obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < o.r + r + 8)) return false;

			return true;
		}

		function randomFree(R = Math.random, r = 30, tries = 60) {
			for (let i = 0; i < tries; i++) {
				const x = 60 + R() * (W - 120);
				const y = 60 + R() * (H - 120);
				if (isFree(x, y, r)) return {x, y};
			}

			return {x: pond.x, y: pond.y - 260};
		}

		// the closest dry spot to (x, y): walk outward in rings
		function nearestFree(x, y, r = 30) {
			if (isFree(x, y, r)) return {x, y};
			for (let d = 30; d < 600; d += 30) {
				for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
					const px = x + Math.cos(a) * d;
					const py = y + Math.sin(a) * d;
					if (isFree(px, py, r)) return {x: px, y: py};
				}
			}

			return randomFree();
		}

		return {W, H, pond, island, bridges, corners, obstacles, bushes, puddles, lilies, paths, inPond, onIsland, onBridge, inWater, isFree, randomFree, nearestFree};
	}

	MM.Layout = {W, H, make, CORNERS, LOCAL};
})();
