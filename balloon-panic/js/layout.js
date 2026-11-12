/* Balloon Panic: where everyone stands, in game units. The short side of the screen is always 900 units,
   the long side follows the screen's shape, so the party fills a phone, a tablet and a desktop window alike.
     2 players face each other · 3 make a triangle · 4 stand around the middle
   BP.Layout.make(n) -> {W, H, seats: [{x, y, side, dir, hold}], center, lobby: [...]}
   A seat's x, y is where the buddy's feet are. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const SHORT = 900;

	function size() {
		const a = Math.min(2.3, Math.max(0.42, innerWidth / Math.max(1, innerHeight)));

		return a >= 1 ? {W: Math.round(SHORT * a), H: SHORT} : {W: SHORT, H: Math.round(SHORT / a)};
	}

	let cur = size();

	// fractions of the width and height; landscape first, portrait second
	const SEATS = {
		land: {
			2: [[0.2, 0.66], [0.8, 0.66]],
			3: [[0.19, 0.45], [0.81, 0.45], [0.5, 0.9]],
			4: [[0.17, 0.42], [0.83, 0.42], [0.17, 0.9], [0.83, 0.9]]
		},
		port: {
			2: [[0.5, 0.32], [0.5, 0.88]],
			3: [[0.26, 0.34], [0.74, 0.34], [0.5, 0.88]],
			4: [[0.26, 0.34], [0.74, 0.34], [0.26, 0.88], [0.74, 0.88]]
		}
	};

	function make(n) {
		const {W, H} = cur;
		const land = W >= H;
		const raw = SEATS[land ? 'land' : 'port'][Math.max(2, Math.min(4, n))];
		const pts = raw.map(([fx, fy]) => ({x: Math.round(fx * W), y: Math.round(fy * H)}));
		// the middle of the party: where everyone looks and where the thing is held towards
		const center = {x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length - 105};
		const seats = pts.map((p) => {
			const dx = center.x - p.x;
			const dy = center.y - (p.y - 105);
			const d = Math.hypot(dx, dy) || 1;
			// the prank button sits on the outer side of the podium, away from the middle
			const side = Math.abs(p.x - W / 2) < 8 ? 1 : Math.sign(p.x - W / 2);

			return {...p, side, dir: {x: dx / d, y: dy / d}};
		});
		// the buddies waiting to be picked: one row on a wide screen, two rows on a tall one
		const lobby = [];
		if (land) {
			const step = Math.min(215, (W - 150) / 6);
			// keep the name tags clear of the options bar along the bottom (about 100 screen pixels tall)
			const y = Math.min(H * 0.69, H - 100 * (SHORT / Math.max(1, innerHeight)) - 105);
			for (let i = 0; i < 6; i++) lobby.push({x: W / 2 + (i - 2.5) * step, y, scale: Math.min(1, step / 195)});
		} else {
			for (let i = 0; i < 6; i++) lobby.push({x: W * [0.2, 0.5, 0.8][i % 3], y: H * (i < 3 ? 0.47 : 0.7), scale: 0.92});
		}

		return {W, H, land, seats, center, lobby};
	}

	BP.Layout = {
		get W() {
			return cur.W;
		},
		get H() {
			return cur.H;
		},
		make,
		// the screen changed shape: true when the party should be rebuilt at the new size
		refit() {
			const next = size();
			if (Math.abs(next.W - cur.W) < 24 && Math.abs(next.H - cur.H) < 24) return false;
			cur = next;

			return true;
		}
	};
})();
