/* Monkey Mischief: all the pictures, drawn in code (no image files) at the screen's real pixel density.
     MM.Art.build(scene, TS)          makes every texture once (TS = pixels per game unit, e.g. 1.6 on an iPad)
     MM.Art.ground(scene, TS, slots)  the jungle floor for this match (decks only in the corners that have a player)
     MM.Art.face(id, color, acc)      a monkey face as a data URL (for the results screen)
   Every texture is drawn TS times bigger than its game size; sprites show it at scale 1/TS, so it stays sharp.
   Style: chunky cartoon, warm dark-brown outlines (#3b2416), bright tropical colours. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const INK = '#3b2416';
	const FUR = '#8a5a33';
	const FUR_LIGHT = '#a8703f';
	const SKIN = '#f3cf9b';

	/* ---------- small drawing helpers ---------- */
	function canvas(w, h, TS) {
		const c = document.createElement('canvas');
		c.width = Math.ceil(w * TS);
		c.height = Math.ceil(h * TS);
		const g = c.getContext('2d');
		g.scale(TS, TS);
		g.lineJoin = 'round';
		g.lineCap = 'round';

		return {c, g};
	}

	function ellipse(g, x, y, rx, ry, fill, stroke = INK, lw = 3, rot = 0) {
		g.beginPath();
		g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
		if (fill) {
			g.fillStyle = fill;
			g.fill();
		}
		if (stroke) {
			g.lineWidth = lw;
			g.strokeStyle = stroke;
			g.stroke();
		}
	}

	const circle = (g, x, y, r, fill, stroke, lw) => ellipse(g, x, y, r, r, fill, stroke, lw);

	function radial(g, x, y, r, stops) {
		const gr = g.createRadialGradient(x, y, 0, x, y, r);
		stops.forEach(([o, c]) => gr.addColorStop(o, c));

		return gr;
	}

	function linear(g, x0, y0, x1, y1, stops) {
		const gr = g.createLinearGradient(x0, y0, x1, y1);
		stops.forEach(([o, c]) => gr.addColorStop(o, c));

		return gr;
	}

	function star(g, x, y, r1, r2, n, fill, stroke, lw = 2) {
		g.beginPath();
		for (let i = 0; i < n * 2; i++) {
			const a = -Math.PI / 2 + (i * Math.PI) / n;
			const r = i % 2 ? r2 : r1;
			g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
		}
		g.closePath();
		g.fillStyle = fill;
		g.fill();
		if (stroke) {
			g.lineWidth = lw;
			g.strokeStyle = stroke;
			g.stroke();
		}
	}

	function roundRect(g, x, y, w, h, r) {
		g.beginPath();
		g.moveTo(x + r, y);
		g.arcTo(x + w, y, x + w, y + h, r);
		g.arcTo(x + w, y + h, x, y + h, r);
		g.arcTo(x, y + h, x, y, r);
		g.arcTo(x, y, x + w, y, r);
		g.closePath();
	}

	// a seeded random, so the jungle floor looks the same every match
	function rng(seed) {
		let s = seed >>> 0;

		return () => {
			s = (s * 1664525 + 1013904223) >>> 0;

			return s / 4294967296;
		};
	}

	const shade = (hex, amt) => {
		const n = parseInt(hex.slice(1), 16);
		const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));

		return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
	};

	/* ---------- a banana (used everywhere: ground, hands, baskets, icons) ---------- */
	function banana(g, x, y, s, rot, gold = false, rim = false) {
		g.save();
		g.translate(x, y);
		g.rotate(rot);
		g.scale(s, s);
		g.beginPath();
		g.moveTo(-17, -10);
		g.quadraticCurveTo(-8, 19, 18, 4);
		g.quadraticCurveTo(22, 1, 19, -3);
		g.quadraticCurveTo(0, 5, -11, -14);
		g.closePath();
		if (rim) {
			// a white rim under the ink line: the banana pops off the grass, the sand and the bridge
			g.lineWidth = 8;
			g.strokeStyle = '#ffffff';
			g.stroke();
		}
		g.fillStyle = gold ? linear(g, 0, -12, 0, 12, [[0, '#fff7c2'], [0.45, '#ffd23f'], [1, '#e89a00']]) : linear(g, 0, -12, 0, 12, [[0, '#fff27a'], [0.5, '#ffd84a'], [1, '#f2b318']]);
		g.fill();
		g.lineWidth = 2.6;
		g.strokeStyle = gold ? '#8a4b00' : INK;
		g.stroke();
		// a soft shine line along the back
		g.beginPath();
		g.moveTo(-11, -3);
		g.quadraticCurveTo(-3, 9, 12, 4);
		g.lineWidth = 2.4;
		g.strokeStyle = '#ffffffb0';
		g.stroke();
		// brown tips
		circle(g, -14.2, -12, 2.8, '#6b4423', null);
		circle(g, 20, -1, 2.2, '#6b4423', null);
		g.restore();
	}

	/* ---------- monkeys ---------- */
	// acc: bow | crown | cap | band | leaf (each player has a different hat, so colour is never the only clue)
	function drawMonkey(g, {color, acc, expr = 'normal'}) {
		const cx = 60;
		// tail
		g.beginPath();
		g.moveTo(80, 112);
		g.bezierCurveTo(112, 112, 112, 78, 98, 76);
		g.bezierCurveTo(88, 75, 88, 88, 97, 88);
		g.lineWidth = 10;
		g.strokeStyle = INK;
		g.stroke();
		g.lineWidth = 5.5;
		g.strokeStyle = FUR;
		g.stroke();
		// feet
		ellipse(g, 45, 131, 12, 7, '#e9b97a');
		ellipse(g, 75, 131, 12, 7, '#e9b97a');
		// body
		ellipse(g, cx, 108, 27, 25, radial(g, 52, 98, 34, [[0, FUR_LIGHT], [1, FUR]]));
		ellipse(g, cx, 113, 17, 15, SKIN, null);
		// arms + hands
		ellipse(g, 35, 108, 8, 15, FUR, INK, 3, 0.5);
		ellipse(g, 85, 108, 8, 15, FUR, INK, 3, -0.5);
		circle(g, 30, 119, 7, '#e9b97a');
		circle(g, 90, 119, 7, '#e9b97a');
		// bandana in the player's colour
		g.beginPath();
		g.moveTo(37, 86);
		g.quadraticCurveTo(cx, 97, 83, 86);
		g.lineTo(80, 94);
		g.quadraticCurveTo(cx, 104, 40, 94);
		g.closePath();
		g.fillStyle = color;
		g.fill();
		g.lineWidth = 2.6;
		g.strokeStyle = INK;
		g.stroke();
		g.beginPath();
		g.moveTo(cx - 6, 99);
		g.lineTo(cx, 110);
		g.lineTo(cx + 6, 99);
		g.closePath();
		g.fillStyle = color;
		g.fill();
		g.stroke();
		// ears
		circle(g, 24, 54, 13, FUR);
		circle(g, 96, 54, 13, FUR);
		circle(g, 24, 54, 7.5, '#f0b98e', null);
		circle(g, 96, 54, 7.5, '#f0b98e', null);
		// head
		circle(g, cx, 52, 34, radial(g, 50, 36, 44, [[0, FUR_LIGHT], [1, FUR]]));
		// face mask: two eye lobes + muzzle, one shape
		g.beginPath();
		g.arc(48, 49, 15, Math.PI * 0.55, Math.PI * 2.05);
		g.arc(72, 49, 15, Math.PI * 0.95, Math.PI * 2.45);
		g.ellipse(cx, 68, 22, 15, 0, -0.2, Math.PI + 0.2);
		g.closePath();
		g.fillStyle = SKIN;
		g.fill();
		g.lineWidth = 2.4;
		g.strokeStyle = INK;
		g.stroke();
		// cheeks
		g.globalAlpha = 0.45;
		ellipse(g, 39, 66, 6, 4, '#ff8f8f', null);
		ellipse(g, 81, 66, 6, 4, '#ff8f8f', null);
		g.globalAlpha = 1;
		// eyes
		g.lineWidth = 3;
		g.strokeStyle = INK;
		if (expr === 'happy') {
			[[48, 52], [72, 52]].forEach(([x, y]) => {
				g.beginPath();
				g.arc(x, y + 2, 6, Math.PI * 1.1, Math.PI * 1.9);
				g.stroke();
			});
		} else if (expr === 'dizzy') {
			[[48, 50], [72, 50]].forEach(([x, y]) => {
				g.beginPath();
				for (let a = 0; a < Math.PI * 5; a += 0.2) g.lineTo(x + Math.cos(a) * a * 0.55, y + Math.sin(a) * a * 0.55);
				g.lineWidth = 2;
				g.stroke();
			});
		} else {
			const big = expr === 'oops';
			[[48, 50], [72, 50]].forEach(([x, y]) => {
				ellipse(g, x, y, big ? 8.5 : 7, big ? 10 : 9, '#fff', INK, 2.2);
				circle(g, x + 1, y + 2, big ? 3 : 4.6, INK, null);
				circle(g, x + 2.6, y - 0.5, 1.7, '#fff', null);
			});
		}
		// nose
		circle(g, 56.5, 63, 1.8, INK, null);
		circle(g, 63.5, 63, 1.8, INK, null);
		// mouth
		g.lineWidth = 2.6;
		if (expr === 'happy') {
			g.beginPath();
			g.moveTo(49, 69);
			g.quadraticCurveTo(cx, 86, 71, 69);
			g.closePath();
			g.fillStyle = '#7a2a1f';
			g.fill();
			g.stroke();
			ellipse(g, cx, 76, 5, 3, '#ff7a85', null);
		} else if (expr === 'dizzy') {
			g.beginPath();
			g.moveTo(50, 73);
			g.quadraticCurveTo(54, 69, 57, 73);
			g.quadraticCurveTo(61, 77, 64, 73);
			g.quadraticCurveTo(67, 69, 70, 73);
			g.stroke();
		} else if (expr === 'oops') {
			ellipse(g, cx, 74, 5, 6.5, '#7a2a1f');
		} else {
			g.beginPath();
			g.arc(cx, 67, 9, Math.PI * 0.18, Math.PI * 0.82);
			g.stroke();
		}
		// hats
		if (acc === 'bow') {
			g.save();
			g.translate(82, 24);
			g.rotate(0.35);
			[[-1], [1]].forEach(([d]) => {
				g.beginPath();
				g.moveTo(0, 0);
				g.lineTo(d * 15, -9);
				g.quadraticCurveTo(d * 19, 0, d * 15, 9);
				g.closePath();
				g.fillStyle = color;
				g.fill();
				g.lineWidth = 2.4;
				g.strokeStyle = INK;
				g.stroke();
			});
			circle(g, 0, 0, 4.5, shade(color, -0.2));
			g.restore();
		} else if (acc === 'crown') {
			g.beginPath();
			g.moveTo(40, 28);
			g.lineTo(42, 10);
			g.lineTo(51, 20);
			g.lineTo(60, 6);
			g.lineTo(69, 20);
			g.lineTo(78, 10);
			g.lineTo(80, 28);
			g.quadraticCurveTo(60, 33, 40, 28);
			g.closePath();
			g.fillStyle = linear(g, 0, 6, 0, 30, [[0, '#ffe680'], [1, '#f5b700']]);
			g.fill();
			g.lineWidth = 2.6;
			g.strokeStyle = INK;
			g.stroke();
			circle(g, 60, 23, 3.6, color, INK, 1.8);
			circle(g, 47, 25, 2.6, color, INK, 1.6);
			circle(g, 73, 25, 2.6, color, INK, 1.6);
		} else if (acc === 'cap') {
			g.beginPath();
			g.arc(60, 32, 25, Math.PI, 0);
			g.closePath();
			g.fillStyle = color;
			g.fill();
			g.lineWidth = 2.6;
			g.strokeStyle = INK;
			g.stroke();
			g.beginPath();
			g.ellipse(80, 31, 17, 5, -0.1, 0, Math.PI * 2);
			g.fillStyle = shade(color, -0.25);
			g.fill();
			g.stroke();
			circle(g, 60, 8, 3.5, '#fff', INK, 2);
			g.beginPath();
			g.moveTo(60, 8);
			g.lineTo(60, 31);
			g.lineWidth = 1.6;
			g.stroke();
		} else if (acc === 'band') {
			g.beginPath();
			g.arc(60, 52, 34, Math.PI * 1.12, Math.PI * 1.88);
			g.lineWidth = 9;
			g.strokeStyle = INK;
			g.stroke();
			g.lineWidth = 5.5;
			g.strokeStyle = color;
			g.stroke();
			// a flower on the side
			for (let i = 0; i < 5; i++) {
				const a = (i / 5) * Math.PI * 2;
				circle(g, 86 + Math.cos(a) * 6, 24 + Math.sin(a) * 6, 5, '#fff', INK, 1.8);
			}
			circle(g, 86, 24, 4, '#ffd23f', INK, 1.8);
		} else if (acc === 'leaf') {
			g.save();
			g.translate(60, 20);
			g.rotate(-0.3);
			g.beginPath();
			g.moveTo(-16, 4);
			g.quadraticCurveTo(0, -18, 18, 0);
			g.quadraticCurveTo(0, 14, -16, 4);
			g.closePath();
			g.fillStyle = '#34c759';
			g.fill();
			g.lineWidth = 2.4;
			g.strokeStyle = INK;
			g.stroke();
			g.beginPath();
			g.moveTo(-14, 4);
			g.quadraticCurveTo(2, 0, 16, 0);
			g.lineWidth = 1.6;
			g.stroke();
			g.restore();
		}
	}

	/* ---------- the big (friendly, silly) gorilla ---------- */
	function drawGorilla(g, expr) {
		const DARK = '#4a4763';
		const MID = '#6a6688';
		const FACE = '#c9b8d6';
		// legs
		ellipse(g, 78, 206, 26, 14, DARK);
		ellipse(g, 142, 206, 26, 14, DARK);
		// body
		ellipse(g, 110, 150, 72, 60, radial(g, 92, 120, 90, [[0, MID], [1, DARK]]));
		ellipse(g, 110, 160, 42, 38, '#9d97b8', null);
		// arms (long, knuckles on the ground)
		ellipse(g, 40, 160, 22, 44, DARK, INK, 3, 0.25);
		ellipse(g, 180, 160, 22, 44, DARK, INK, 3, -0.25);
		circle(g, 32, 200, 17, MID);
		circle(g, 188, 200, 17, MID);
		// head
		circle(g, 110, 76, 50, radial(g, 96, 52, 60, [[0, MID], [1, DARK]]));
		ellipse(g, 110, 88, 36, 30, FACE);
		ellipse(g, 110, 62, 34, 14, FACE, null);
		// brows
		g.lineWidth = 7;
		g.strokeStyle = INK;
		g.beginPath();
		if (expr === 'chase') {
			g.moveTo(84, 52);
			g.lineTo(104, 60);
			g.moveTo(136, 52);
			g.lineTo(116, 60);
		} else {
			g.moveTo(84, 56);
			g.quadraticCurveTo(94, 48, 104, 56);
			g.moveTo(116, 56);
			g.quadraticCurveTo(126, 48, 136, 56);
		}
		g.stroke();
		// eyes
		ellipse(g, 96, 68, 8, 9, '#fff', INK, 2.5);
		ellipse(g, 124, 68, 8, 9, '#fff', INK, 2.5);
		circle(g, 98, 70, 4.5, INK, null);
		circle(g, 122, 70, 4.5, INK, null);
		circle(g, 99.5, 68, 1.6, '#fff', null);
		circle(g, 123.5, 68, 1.6, '#fff', null);
		// nose
		ellipse(g, 110, 82, 10, 6, '#7d6a8f', INK, 2.2);
		circle(g, 106, 82, 2, INK, null);
		circle(g, 114, 82, 2, INK, null);
		// mouth
		if (expr === 'chase') {
			ellipse(g, 110, 101, 15, 10, '#7a2a1f');
			g.fillStyle = '#fff';
			g.fillRect(100, 92, 8, 5);
			g.fillRect(112, 92, 8, 5);
		} else {
			g.beginPath();
			g.moveTo(92, 96);
			g.quadraticCurveTo(110, 116, 128, 96);
			g.closePath();
			g.fillStyle = '#7a2a1f';
			g.fill();
			g.lineWidth = 2.6;
			g.strokeStyle = INK;
			g.stroke();
			banana(g, 110, 100, 0.8, 0.1);
		}
		// leafy crown
		for (let i = 0; i < 5; i++) {
			g.save();
			g.translate(84 + i * 13, 30 + Math.abs(i - 2) * 3);
			g.rotate((i - 2) * 0.35);
			g.beginPath();
			g.moveTo(0, 8);
			g.quadraticCurveTo(-9, -6, 0, -16);
			g.quadraticCurveTo(9, -6, 0, 8);
			g.fillStyle = i % 2 ? '#2fb55a' : '#5bd66f';
			g.fill();
			g.lineWidth = 2;
			g.strokeStyle = INK;
			g.stroke();
			g.restore();
		}
	}

	/* ---------- power-up icons (also the trick-button icons) ---------- */
	const POWER = {
		speed: {bubble: '#ff7a3d'},
		shield: {bubble: '#2fb3ff'},
		jump: {bubble: '#2fcf6f'},
		magnet: {bubble: '#a46bff'},
		bomb: {bubble: '#ff5da8'}
	};

	function icon(g, kind, x, y, s) {
		g.save();
		g.translate(x, y);
		g.scale(s, s);
		g.lineWidth = 2.6;
		g.strokeStyle = INK;
		if (kind === 'speed') {
			g.beginPath();
			g.moveTo(4, -20);
			g.lineTo(-12, 3);
			g.lineTo(-1, 3);
			g.lineTo(-5, 20);
			g.lineTo(13, -5);
			g.lineTo(2, -5);
			g.closePath();
			g.fillStyle = '#ffe14d';
			g.fill();
			g.stroke();
		} else if (kind === 'shield') {
			g.beginPath();
			g.moveTo(0, -19);
			g.quadraticCurveTo(10, -14, 17, -14);
			g.quadraticCurveTo(17, 10, 0, 20);
			g.quadraticCurveTo(-17, 10, -17, -14);
			g.quadraticCurveTo(-10, -14, 0, -19);
			g.closePath();
			g.fillStyle = linear(g, 0, -19, 0, 20, [[0, '#ffffff'], [1, '#bfe9ff']]);
			g.fill();
			g.stroke();
			banana(g, 0, 0, 0.55, -0.4);
		} else if (kind === 'jump') {
			for (let i = 0; i < 4; i++) {
				g.beginPath();
				g.ellipse(0, 12 - i * 7, 12, 3.5, 0, 0, Math.PI * 2);
				g.lineWidth = 3.4;
				g.strokeStyle = INK;
				g.stroke();
				g.lineWidth = 1.8;
				g.strokeStyle = '#d6dde6';
				g.stroke();
			}
			g.beginPath();
			g.moveTo(0, -22);
			g.lineTo(-9, -12);
			g.lineTo(9, -12);
			g.closePath();
			g.fillStyle = '#fff';
			g.fill();
			g.lineWidth = 2.4;
			g.strokeStyle = INK;
			g.stroke();
		} else if (kind === 'magnet') {
			g.beginPath();
			g.arc(0, -2, 13, Math.PI, 0);
			g.lineTo(13, 14);
			g.lineTo(5, 14);
			g.lineTo(5, -2);
			g.arc(0, -2, 5, 0, Math.PI, true);
			g.lineTo(-5, 14);
			g.lineTo(-13, 14);
			g.closePath();
			g.fillStyle = '#ff4757';
			g.fill();
			g.stroke();
			g.fillStyle = '#e8edf2';
			g.fillRect(-13, 8, 8, 6);
			g.fillRect(5, 8, 8, 6);
			g.strokeRect(-13, 8, 8, 6);
			g.strokeRect(5, 8, 8, 6);
		} else if (kind === 'bomb') {
			circle(g, -2, 4, 14, radial(g, -7, -2, 18, [[0, '#6b6f80'], [1, '#22232b']]), INK, 2.6);
			g.fillStyle = '#5a5e70';
			g.fillRect(-5, -14, 8, 6);
			g.strokeRect(-5, -14, 8, 6);
			g.beginPath();
			g.moveTo(-1, -14);
			g.quadraticCurveTo(4, -22, 11, -19);
			g.lineWidth = 2.2;
			g.stroke();
			star(g, 12, -19, 6, 2.5, 5, '#ffd23f', '#e2591b', 1.4);
			banana(g, -2, 6, 0.42, -0.3);
		} else if (kind === 'peel') {
			peel(g, 0, -6, 0.95);
		}
		g.restore();
	}

	// an open banana peel: a stem on top, three long floppy flaps hanging down and out
	function peel(g, x, y, s) {
		g.save();
		g.translate(x, y);
		g.scale(s, s);
		g.lineWidth = 2.6;
		g.strokeStyle = INK;
		const flap = (rot, len) => {
			g.save();
			g.rotate(rot);
			g.beginPath();
			g.moveTo(-6, -4);
			g.quadraticCurveTo(-9, len * 0.6, -2, len);
			g.quadraticCurveTo(3, len + 3, 6, len - 2);
			g.quadraticCurveTo(8, len * 0.5, 6, -4);
			g.closePath();
			g.fillStyle = linear(g, -8, 0, 8, 0, [[0, '#ffe25a'], [1, '#f2b318']]);
			g.fill();
			g.stroke();
			// pale inside
			g.beginPath();
			g.moveTo(-1, 0);
			g.quadraticCurveTo(-3, len * 0.55, 0, len - 4);
			g.lineWidth = 3;
			g.strokeStyle = '#fff6cf';
			g.stroke();
			g.lineWidth = 2.6;
			g.strokeStyle = INK;
			circle(g, 0, len - 0.5, 1.8, '#6b4423', null);
			g.restore();
		};
		flap(0.95, 22);
		flap(-0.95, 22);
		flap(0.05, 25);
		// the top where the flaps meet, and the stem
		ellipse(g, 0, -5, 9, 6, '#ffd84a', INK, 2.6);
		g.fillStyle = '#7a5230';
		roundRect(g, -3, -19, 6, 12, 2);
		g.fill();
		g.stroke();
		g.restore();
	}

	/* ---------- scenery ---------- */
	function leaf(g, len, wid, fill) {
		g.beginPath();
		g.moveTo(0, 0);
		g.quadraticCurveTo(len * 0.5, -wid, len, 0);
		g.quadraticCurveTo(len * 0.5, wid, 0, 0);
		g.closePath();
		g.fillStyle = fill;
		g.fill();
		g.lineWidth = 2.6;
		g.strokeStyle = INK;
		g.stroke();
		g.beginPath();
		g.moveTo(4, 0);
		g.lineTo(len - 6, 0);
		g.lineWidth = 1.6;
		g.strokeStyle = '#1d6b34';
		g.stroke();
	}

	function bananaTree(g) {
		// short trunk, origin at its foot (100, 214)
		g.beginPath();
		g.moveTo(88, 214);
		g.lineTo(93, 120);
		g.lineTo(107, 120);
		g.lineTo(112, 214);
		g.closePath();
		g.fillStyle = linear(g, 88, 0, 112, 0, [[0, '#8fae4a'], [1, '#6d8c35']]);
		g.fill();
		g.lineWidth = 3;
		g.strokeStyle = INK;
		g.stroke();
		for (let y = 130; y < 210; y += 16) {
			g.beginPath();
			g.moveTo(91, y);
			g.lineTo(109, y + 4);
			g.lineWidth = 1.6;
			g.stroke();
		}
		// big leaves
		const L = [[-2.6, 88], [-2.1, 96], [-1.55, 84], [-1.05, 96], [-0.5, 88], [-3.0, 70], [0.0, 70]];
		L.forEach(([a, len], i) => {
			g.save();
			g.translate(100, 118);
			g.rotate(a);
			leaf(g, len, 24, i % 2 ? '#3fbf55' : '#5bd66f');
			g.restore();
		});
		// hanging bunch
		for (let i = 0; i < 6; i++) banana(g, 88 + (i % 3) * 11, 136 + Math.floor(i / 3) * 12, 0.62, 1.1 + (i % 3) * 0.2);
	}

	function palm(g) {
		// curved ringed trunk, origin at foot (100, 236)
		g.beginPath();
		g.moveTo(92, 236);
		g.quadraticCurveTo(80, 160, 98, 96);
		g.lineTo(110, 98);
		g.quadraticCurveTo(94, 160, 108, 236);
		g.closePath();
		g.fillStyle = linear(g, 80, 0, 110, 0, [[0, '#c48a52'], [1, '#9a6535']]);
		g.fill();
		g.lineWidth = 3;
		g.strokeStyle = INK;
		g.stroke();
		for (let y = 108; y < 230; y += 13) {
			g.beginPath();
			const x = 92 + ((y - 236) * (y - 236)) / 3000 - 6;
			g.moveTo(x, y);
			g.lineTo(x + 14, y + 2);
			g.lineWidth = 1.6;
			g.stroke();
		}
		// fronds
		for (let i = 0; i < 8; i++) {
			g.save();
			g.translate(104, 96);
			g.rotate(-Math.PI + (i / 7) * Math.PI * 1.15 - 0.1);
			leaf(g, 80, 16, i % 2 ? '#2fa84f' : '#46c463');
			g.restore();
		}
		// coconuts
		[[96, 104], [110, 106], [103, 114]].forEach(([x, y]) => circle(g, x, y, 8, radial(g, x - 3, y - 3, 10, [[0, '#9b6a3d'], [1, '#5e3a1c']])));
	}

	function bigTree(g, r) {
		// a round jungle canopy for empty corners, seen from above
		const R = rng(r);
		const greens = ['#2e9e4f', '#38b25b', '#45c46a', '#2a8f48'];
		for (let i = 0; i < 16; i++) {
			const a = R() * Math.PI * 2;
			const d = 20 + R() * 70;
			circle(g, 130 + Math.cos(a) * d, 130 + Math.sin(a) * d, 30 + R() * 22, greens[i % 4], INK, 3);
		}
		for (let i = 0; i < 10; i++) {
			const a = R() * Math.PI * 2;
			const d = R() * 60;
			circle(g, 130 + Math.cos(a) * d, 130 + Math.sin(a) * d, 18 + R() * 12, '#5bd66f', null);
		}
		for (let i = 0; i < 7; i++) circle(g, 60 + R() * 140, 60 + R() * 140, 5, ['#ff5d73', '#ffd23f', '#ff9417'][i % 3], INK, 1.8);
	}

	function rock(g, v) {
		g.beginPath();
		if (v) {
			g.moveTo(10, 50);
			g.quadraticCurveTo(4, 22, 26, 14);
			g.quadraticCurveTo(46, 2, 62, 16);
			g.quadraticCurveTo(78, 30, 70, 50);
		} else {
			g.moveTo(8, 52);
			g.quadraticCurveTo(10, 18, 36, 12);
			g.quadraticCurveTo(66, 10, 72, 38);
			g.quadraticCurveTo(74, 50, 70, 52);
		}
		g.closePath();
		g.fillStyle = linear(g, 0, 8, 0, 54, [[0, '#c3ccd8'], [1, '#8592a6']]);
		g.fill();
		g.lineWidth = 3;
		g.strokeStyle = INK;
		g.stroke();
		g.beginPath();
		g.moveTo(24, 24);
		g.quadraticCurveTo(34, 18, 46, 20);
		g.lineWidth = 3;
		g.strokeStyle = '#ffffff90';
		g.stroke();
		// moss
		ellipse(g, 30, 50, 16, 5, '#5bbf4a', null);
		ellipse(g, 56, 51, 10, 4, '#4aa83c', null);
	}

	function bush(g, v) {
		const blobs = v ? [[30, 50, 24], [56, 40, 28], [84, 52, 22], [56, 60, 24]] : [[28, 54, 22], [50, 38, 24], [76, 44, 26], [60, 60, 22]];
		blobs.forEach(([x, y, r]) => circle(g, x, y, r, '#2f9e4c', INK, 3));
		blobs.forEach(([x, y, r]) => circle(g, x - 4, y - 6, r * 0.62, '#46c463', null));
		const dots = v ? [[40, 36], [70, 34], [80, 56], [30, 58]] : [[38, 40], [64, 32], [84, 46], [50, 60]];
		dots.forEach(([x, y], i) => circle(g, x, y, 4.2, i % 2 ? '#ff5d73' : '#ffd23f', INK, 1.6));
	}

	/* ---------- build every texture ---------- */
	const PLAYER_ACC = {p1: 'bow', p2: 'crown', p3: 'cap', p4: 'band', p5: 'cap', p6: 'bow', bot: 'leaf'};

	function add(scene, key, w, h, TS, draw) {
		const {c, g} = canvas(w, h, TS);
		draw(g);
		if (scene.textures.exists(key)) scene.textures.remove(key);
		scene.textures.addCanvas(key, c);
	}

	function build(scene, TS, players) {
		players.forEach((p) => {
			['normal', 'happy', 'dizzy', 'oops'].forEach((expr) =>
				add(scene, `monkey-${p.id}-${expr}`, 120, 140, TS, (g) => drawMonkey(g, {color: p.color, acc: PLAYER_ACC[p.id], expr})));
			add(scene, `basket-${p.id}`, 120, 100, TS, (g) => drawBasket(g, p.color));
			// coloured controls are their own textures (tint does not work in the canvas renderer used for file://)
			add(scene, `joy-base-${p.id}`, 172, 172, TS, (g) => drawJoyBase(g, p.color));
			add(scene, `joy-knob-${p.id}`, 92, 92, TS, (g) => drawKnob(g, p.color, 46, 40));
			add(scene, `button-${p.id}`, 116, 116, TS, (g) => drawKnob(g, p.color, 58, 50));
			add(scene, `ring-${p.id}`, 120, 120, TS, (g) => {
				circle(g, 60, 60, 54, null, INK, 10);
				circle(g, 60, 60, 54, null, p.color, 6);
			});
			add(scene, `arrow-${p.id}`, 60, 40, TS, (g) => drawArrow(g, p.color));
		});
		if (scene.textures.exists('banana')) return; // the rest never changes
		add(scene, 'gorilla-chase', 220, 224, TS, (g) => drawGorilla(g, 'chase'));
		add(scene, 'gorilla-eat', 220, 224, TS, (g) => drawGorilla(g, 'eat'));
		add(scene, 'banana', 68, 60, TS, (g) => banana(g, 34, 30, 1.3, -0.2, false, true));
		add(scene, 'banana-gold', 72, 64, TS, (g) => {
			g.fillStyle = radial(g, 36, 32, 34, [[0, '#fff6b0cc'], [0.5, '#ffd23f55'], [1, '#ffd23f00']]);
			g.fillRect(0, 0, 72, 64);
			banana(g, 36, 32, 1.25, -0.2, true);
			star(g, 52, 16, 6, 2.2, 4, '#fff', null);
			star(g, 18, 44, 4, 1.6, 4, '#fff', null);
		});
		add(scene, 'peel', 64, 56, TS, (g) => peel(g, 32, 22, 1));
		add(scene, 'coconut', 44, 44, TS, (g) => {
			circle(g, 22, 22, 17, radial(g, 16, 15, 22, [[0, '#a8744a'], [1, '#5e3a1c']]), INK, 3);
			g.lineWidth = 1.4;
			g.strokeStyle = '#3b241680';
			for (let i = 0; i < 7; i++) {
				g.beginPath();
				g.moveTo(10 + i * 4, 9 + (i % 2) * 3);
				g.lineTo(8 + i * 4.5, 32 - (i % 3) * 2);
				g.stroke();
			}
			[[17, 16], [25, 15], [21, 22]].forEach(([x, y]) => circle(g, x, y, 2.2, '#2a170a', null));
		});
		add(scene, 'coco-half', 44, 30, TS, (g) => {
			ellipse(g, 22, 18, 17, 10, '#5e3a1c', INK, 3);
			ellipse(g, 22, 15, 13, 6, '#fffaf0', INK, 2);
		});
		add(scene, 'shadow', 64, 24, TS, (g) => {
			g.fillStyle = radial(g, 32, 12, 32, [[0, 'rgba(20,40,10,0.42)'], [0.7, 'rgba(20,40,10,0.22)'], [1, 'rgba(20,40,10,0)']]);
			g.save();
			g.scale(1, 24 / 64);
			g.beginPath();
			g.arc(32, 32, 32, 0, Math.PI * 2);
			g.fill();
			g.restore();
		});
		add(scene, 'target', 104, 104, TS, (g) => {
			circle(g, 52, 52, 46, 'rgba(255,72,48,0.22)', null);
			g.setLineDash([10, 8]);
			circle(g, 52, 52, 46, null, '#ff4830', 5);
			g.setLineDash([]);
			circle(g, 52, 52, 20, null, '#ffffffcc', 4);
			circle(g, 52, 52, 6, '#ff4830', null);
		});
		add(scene, 'slick', 260, 200, TS, (g) => {
			g.beginPath();
			const R = rng(7);
			for (let i = 0; i <= 18; i++) {
				const a = (i / 18) * Math.PI * 2;
				const r = 0.82 + R() * 0.18;
				g.lineTo(130 + Math.cos(a) * 122 * r, 100 + Math.sin(a) * 92 * r);
			}
			g.closePath();
			g.fillStyle = radial(g, 130, 100, 130, [[0, 'rgba(255,236,120,0.85)'], [1, 'rgba(240,205,60,0.65)']]);
			g.fill();
			g.lineWidth = 4;
			g.strokeStyle = 'rgba(190,140,20,0.7)';
			g.stroke();
			for (let i = 0; i < 6; i++) {
				g.beginPath();
				g.ellipse(70 + i * 24, 70 + (i % 3) * 26, 16, 5, -0.4, 0, Math.PI * 2);
				g.fillStyle = 'rgba(255,255,255,0.6)';
				g.fill();
			}
		});
		Object.keys(POWER).forEach((k) =>
			add(scene, `power-${k}`, 84, 84, TS, (g) => {
				circle(g, 42, 42, 36, radial(g, 32, 30, 44, [[0, '#ffffff'], [0.35, shade(POWER[k].bubble, 0.45)], [1, POWER[k].bubble]]), INK, 3);
				icon(g, k, 42, 44, 1.2);
				g.beginPath();
				g.ellipse(30, 24, 11, 6, -0.6, 0, Math.PI * 2);
				g.fillStyle = 'rgba(255,255,255,0.75)';
				g.fill();
			}));
		['peel', 'jump', 'bomb'].forEach((k) => add(scene, `icon-${k}`, 64, 64, TS, (g) => icon(g, k, 32, 32, 1.25)));
		add(scene, 'shield-bubble', 120, 120, TS, (g) => {
			circle(g, 60, 60, 54, radial(g, 60, 60, 56, [[0, 'rgba(160,230,255,0.05)'], [0.8, 'rgba(120,210,255,0.25)'], [1, 'rgba(90,190,255,0.6)']]), 'rgba(255,255,255,0.9)', 3);
			g.beginPath();
			g.ellipse(40, 34, 14, 7, -0.6, 0, Math.PI * 2);
			g.fillStyle = 'rgba(255,255,255,0.85)';
			g.fill();
		});
		add(scene, 'banana-tree', 200, 220, TS, bananaTree);
		add(scene, 'palm', 200, 240, TS, palm);
		add(scene, 'big-tree-a', 260, 260, TS, (g) => bigTree(g, 11));
		add(scene, 'big-tree-b', 260, 260, TS, (g) => bigTree(g, 29));
		add(scene, 'rock-a', 80, 58, TS, (g) => rock(g, 0));
		add(scene, 'rock-b', 80, 58, TS, (g) => rock(g, 1));
		add(scene, 'bush-a', 110, 84, TS, (g) => bush(g, 0));
		add(scene, 'bush-b', 110, 84, TS, (g) => bush(g, 1));
		add(scene, 'frog', 44, 36, TS, (g) => {
			ellipse(g, 22, 24, 16, 10, '#5bd66f');
			circle(g, 14, 12, 6, '#5bd66f');
			circle(g, 30, 12, 6, '#5bd66f');
			circle(g, 14, 12, 3, '#fff', INK, 1.4);
			circle(g, 30, 12, 3, '#fff', INK, 1.4);
			circle(g, 14.5, 12.5, 1.5, INK, null);
			circle(g, 30.5, 12.5, 1.5, INK, null);
			g.beginPath();
			g.arc(22, 22, 6, 0.2, Math.PI - 0.2);
			g.lineWidth = 1.8;
			g.strokeStyle = INK;
			g.stroke();
		});
		add(scene, 'parrot', 56, 60, TS, (g) => {
			ellipse(g, 28, 34, 13, 18, '#ff4757');
			g.save();
			g.translate(28, 30);
			leaf(g, 22, 8, '#2fb3ff');
			g.restore();
			circle(g, 28, 16, 11, '#ff4757');
			circle(g, 31, 14, 3.4, '#fff', INK, 1.4);
			circle(g, 32, 14.5, 1.6, INK, null);
			g.beginPath();
			g.moveTo(36, 16);
			g.quadraticCurveTo(46, 18, 38, 26);
			g.closePath();
			g.fillStyle = '#ffd23f';
			g.fill();
			g.lineWidth = 2;
			g.strokeStyle = INK;
			g.stroke();
			g.beginPath();
			g.moveTo(24, 50);
			g.lineTo(20, 58);
			g.moveTo(32, 50);
			g.lineTo(34, 58);
			g.lineWidth = 3;
			g.strokeStyle = '#ffd23f';
			g.stroke();
		});
		add(scene, 'butterfly', 36, 28, TS, (g) => {
			ellipse(g, 11, 10, 9, 8, '#ff9417', INK, 2);
			ellipse(g, 25, 10, 9, 8, '#ff9417', INK, 2);
			ellipse(g, 12, 20, 6, 5, '#ffd23f', INK, 2);
			ellipse(g, 24, 20, 6, 5, '#ffd23f', INK, 2);
			ellipse(g, 18, 14, 2.4, 9, INK, null);
		});
		add(scene, 'dot', 16, 16, TS, (g) => circle(g, 8, 8, 7, '#ffffff', null));
		add(scene, 'puff', 40, 40, TS, (g) => {
			g.fillStyle = radial(g, 20, 20, 20, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
			g.fillRect(0, 0, 40, 40);
		});
		add(scene, 'star', 30, 30, TS, (g) => star(g, 15, 15, 13, 6, 5, '#ffe14d', INK, 2));
		add(scene, 'sparkle', 28, 28, TS, (g) => star(g, 14, 14, 13, 3.2, 4, '#ffffff', null));
		add(scene, 'drop', 14, 18, TS, (g) => {
			g.beginPath();
			g.moveTo(7, 1);
			g.quadraticCurveTo(14, 11, 7, 16);
			g.quadraticCurveTo(0, 11, 7, 1);
			g.fillStyle = '#9fe0ff';
			g.fill();
		});
		add(scene, 'leaf', 22, 12, TS, (g) => {
			g.translate(1, 6);
			leaf(g, 20, 6, '#46c463');
		});
		add(scene, 'alert', 44, 44, TS, (g) => {
			circle(g, 22, 22, 19, '#ff4757', INK, 3);
			g.fillStyle = '#fff';
			roundRect(g, 19, 9, 6, 17, 3);
			g.fill();
			circle(g, 22, 32, 3.4, '#fff', null);
		});
		add(scene, 'bot-face', 80, 80, TS, (g) => {
			g.translate(-20, -10);
			drawMonkey(g, {color: '#22c55e', acc: 'leaf', expr: 'happy'});
		});
		add(scene, 'mini-banana', 26, 22, TS, (g) => banana(g, 13, 11, 0.55, -0.2));
		// a stolen banana on a thief's head glows red, so everyone sees who to chase
		add(scene, 'mini-banana-stolen', 34, 30, TS, (g) => {
			g.fillStyle = radial(g, 17, 15, 17, [[0, 'rgba(255,71,87,0.75)'], [1, 'rgba(255,71,87,0)']]);
			g.fillRect(0, 0, 34, 30);
			banana(g, 17, 15, 0.55, -0.2);
		});
	}

	function drawJoyBase(g, color) {
		circle(g, 86, 86, 80, radial(g, 86, 86, 82, [[0, 'rgba(255,255,255,0.12)'], [0.75, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0.55)']]), null);
		circle(g, 86, 86, 79, null, INK, 8);
		circle(g, 86, 86, 79, null, color, 5);
		for (let i = 0; i < 4; i++) {
			g.save();
			g.translate(86, 86);
			g.rotate((i * Math.PI) / 2);
			g.beginPath();
			g.moveTo(0, -68);
			g.lineTo(-11, -55);
			g.lineTo(11, -55);
			g.closePath();
			g.fillStyle = '#ffffff';
			g.fill();
			g.lineWidth = 2;
			g.strokeStyle = INK;
			g.stroke();
			g.restore();
		}
	}

	// a glossy round knob in the player's colour (joystick knob and trick button)
	function drawKnob(g, color, c, r) {
		circle(g, c, c + 6, r, 'rgba(0,0,0,0.22)', null);
		circle(g, c, c, r, radial(g, c - r * 0.3, c - r * 0.35, r * 1.3, [[0, shade(color, 0.55)], [0.55, color], [1, shade(color, -0.25)]]), INK, 3.5);
		g.beginPath();
		g.ellipse(c - r * 0.3, c - r * 0.45, r * 0.38, r * 0.2, -0.6, 0, Math.PI * 2);
		g.fillStyle = 'rgba(255,255,255,0.75)';
		g.fill();
	}

	function drawArrow(g, color) {
		g.beginPath();
		g.moveTo(4, 12);
		g.lineTo(34, 12);
		g.lineTo(34, 2);
		g.lineTo(56, 20);
		g.lineTo(34, 38);
		g.lineTo(34, 28);
		g.lineTo(4, 28);
		g.closePath();
		g.fillStyle = color;
		g.fill();
		g.lineWidth = 3;
		g.strokeStyle = INK;
		g.stroke();
	}

	function drawBasket(g, color) {
		// woven basket, origin at its foot (60, 92)
		ellipse(g, 60, 90, 46, 9, 'rgba(0,0,0,0.18)', null);
		g.beginPath();
		g.moveTo(12, 40);
		g.lineTo(22, 86);
		g.quadraticCurveTo(60, 96, 98, 86);
		g.lineTo(108, 40);
		g.closePath();
		g.fillStyle = linear(g, 0, 40, 0, 92, [[0, '#d9a066'], [1, '#a8703f']]);
		g.fill();
		g.save();
		g.clip();
		g.strokeStyle = '#8a5a3399';
		g.lineWidth = 3;
		for (let y = 48; y < 92; y += 9) {
			for (let x = 10 + ((y / 9) % 2) * 9; x < 110; x += 18) {
				g.beginPath();
				g.moveTo(x, y);
				g.quadraticCurveTo(x + 9, y + 5, x + 18, y);
				g.stroke();
			}
		}
		// ribbon in the player's colour
		g.fillStyle = color;
		g.fillRect(0, 58, 120, 14);
		g.restore();
		g.beginPath();
		g.moveTo(12, 40);
		g.lineTo(22, 86);
		g.quadraticCurveTo(60, 96, 98, 86);
		g.lineTo(108, 40);
		g.lineWidth = 3;
		g.strokeStyle = INK;
		g.stroke();
		g.beginPath();
		g.moveTo(15, 58);
		g.lineTo(105, 58);
		g.moveTo(18, 72);
		g.lineTo(102, 72);
		g.lineWidth = 2;
		g.stroke();
		// rim
		ellipse(g, 60, 40, 49, 13, '#c48a52', INK, 3);
		ellipse(g, 60, 40, 40, 8, '#6b4423', null);
	}

	/* ---------- the jungle floor for one match ---------- */
	// L = layout from the scene (pond, island, bridges, puddles, paths, decks)
	function ground(scene, TS, L) {
		const {W, H} = L;
		const {c, g} = canvas(W, H, TS);
		const R = rng(42);
		// grass
		g.fillStyle = linear(g, 0, 0, 0, H, [[0, '#86d861'], [1, '#64c24c']]);
		g.fillRect(0, 0, W, H);
		for (let i = 0; i < 40; i++) {
			const x = R() * W, y = R() * H, r = 60 + R() * 140;
			g.fillStyle = radial(g, x, y, r, [[0, i % 2 ? 'rgba(170,235,110,0.35)' : 'rgba(60,150,50,0.22)'], [1, 'rgba(0,0,0,0)']]);
			g.fillRect(x - r, y - r, r * 2, r * 2);
		}
		// paths: darker edge first, then sand, then pebbles
		const pathStroke = (w, col) => {
			L.paths.forEach((p) => {
				g.beginPath();
				g.moveTo(p[0], p[1]);
				g.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]);
				g.lineWidth = w;
				g.strokeStyle = col;
				g.stroke();
			});
		};
		pathStroke(82, '#d9b46f');
		pathStroke(68, '#f2d59b');
		pathStroke(30, '#f7e2b5');
		for (let i = 0; i < 160; i++) {
			const p = L.paths[i % L.paths.length];
			const t = R();
			const u = 1 - t;
			const x = u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6] + (R() - 0.5) * 50;
			const y = u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7] + (R() - 0.5) * 50;
			circle(g, x, y, 1.5 + R() * 2.5, R() > 0.5 ? '#d9b46f' : '#c9a061', null);
		}
		// grass tufts + flowers (not on the pond)
		const inPond = (x, y) => ((x - L.pond.x) / (L.pond.rx + 30)) ** 2 + ((y - L.pond.y) / (L.pond.ry + 30)) ** 2 < 1;
		g.lineWidth = 2.2;
		g.strokeStyle = '#3f9a36';
		for (let i = 0; i < 420; i++) {
			const x = R() * W, y = R() * H;
			if (inPond(x, y)) continue;
			g.beginPath();
			g.moveTo(x - 4, y - 7);
			g.lineTo(x, y);
			g.lineTo(x + 1, y - 9);
			g.moveTo(x, y);
			g.lineTo(x + 5, y - 6);
			g.stroke();
		}
		for (let i = 0; i < 90; i++) {
			const x = R() * W, y = R() * H;
			if (inPond(x, y)) continue;
			const col = ['#ffffff', '#ffe14d', '#ff9ec7', '#c9a7ff'][i % 4];
			for (let k = 0; k < 5; k++) {
				const a = (k / 5) * Math.PI * 2;
				circle(g, x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.6, col, null);
			}
			circle(g, x, y, 2, '#ffb000', null);
		}
		// puddles (slow, splashy)
		L.puddles.forEach((p) => {
			ellipse(g, p.x, p.y, p.r + 6, p.r * 0.62 + 5, '#9a7a4a', null);
			ellipse(g, p.x, p.y, p.r, p.r * 0.62, radial(g, p.x - 8, p.y - 6, p.r, [[0, '#9fdcff'], [1, '#4aa7e0']]), '#6b4f2a', 2.5);
			g.beginPath();
			g.ellipse(p.x - 6, p.y - 4, p.r * 0.45, p.r * 0.18, 0, Math.PI * 1.1, Math.PI * 1.9);
			g.lineWidth = 2.4;
			g.strokeStyle = 'rgba(255,255,255,0.7)';
			g.stroke();
		});
		// pond: sandy shore, water, ripples, lily pads, reeds
		const P = L.pond;
		ellipse(g, P.x, P.y, P.rx + 18, P.ry + 16, '#f2d59b', '#d9b46f', 4);
		ellipse(g, P.x, P.y, P.rx, P.ry, radial(g, P.x, P.y + 20, P.rx, [[0, '#62d0ff'], [0.7, '#2fa5ef'], [1, '#1f86d6']]), '#1d5f99', 4);
		g.save();
		g.beginPath();
		g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, Math.PI * 2);
		g.clip();
		g.fillStyle = 'rgba(10,60,110,0.22)';
		g.beginPath();
		g.ellipse(P.x, P.y - P.ry + 10, P.rx, 26, 0, 0, Math.PI * 2);
		g.fill();
		g.lineWidth = 3;
		g.strokeStyle = 'rgba(255,255,255,0.45)';
		for (let i = 0; i < 14; i++) {
			const x = P.x + (R() - 0.5) * P.rx * 1.6;
			const y = P.y + (R() - 0.5) * P.ry * 1.5;
			g.beginPath();
			g.ellipse(x, y, 14 + R() * 16, 4, 0, Math.PI * 1.15, Math.PI * 1.85);
			g.stroke();
		}
		g.restore();
		L.lilies.forEach(([x, y, r]) => {
			g.beginPath();
			g.arc(x, y, r, 0.35, Math.PI * 2 - 0.05);
			g.lineTo(x, y);
			g.closePath();
			g.fillStyle = '#4cc35a';
			g.fill();
			g.lineWidth = 2.4;
			g.strokeStyle = '#1d6b34';
			g.stroke();
		});
		circle(g, L.lilies[0][0] + 6, L.lilies[0][1] - 4, 6, '#ff9ec7', '#c2457b', 2);
		// island
		circle(g, P.x, P.y, L.island + 10, '#f2d59b', '#d9b46f', 4);
		circle(g, P.x, P.y, L.island - 2, radial(g, P.x, P.y, L.island, [[0, '#8fdf66'], [1, '#64c24c']]), null);
		// bridges
		L.bridges.forEach((b) => {
			g.fillStyle = 'rgba(0,0,0,0.18)';
			g.fillRect(b.x, b.y - b.h / 2 + 8, b.w, b.h);
			for (let x = b.x; x < b.x + b.w; x += 16) {
				g.fillStyle = (x / 16) % 2 ? '#c98b4b' : '#b97a3e';
				g.fillRect(x, b.y - b.h / 2, 15, b.h);
				g.lineWidth = 1.5;
				g.strokeStyle = INK;
				g.strokeRect(x, b.y - b.h / 2, 15, b.h);
				circle(g, x + 7.5, b.y - b.h / 2 + 6, 1.4, INK, null);
				circle(g, x + 7.5, b.y + b.h / 2 - 6, 1.4, INK, null);
			}
			[-1, 1].forEach((s) => {
				g.beginPath();
				g.moveTo(b.x - 6, b.y + s * (b.h / 2 + 2));
				g.lineTo(b.x + b.w + 6, b.y + s * (b.h / 2 + 2));
				g.lineWidth = 6;
				g.strokeStyle = INK;
				g.stroke();
				g.lineWidth = 3;
				g.strokeStyle = '#d9b46f';
				g.stroke();
				[b.x - 6, b.x + b.w / 2, b.x + b.w + 6].forEach((px) => circle(g, px, b.y + s * (b.h / 2 + 2), 6, '#8a5a33', INK, 2.4));
			});
		});
		// corner decks: wooden platforms with a rim in the owner's colour; empty corners are dense jungle
		L.corners.forEach((k) => {
			g.save();
			g.beginPath();
			g.arc(k.cx, k.cy, k.r, 0, Math.PI * 2);
			g.clip();
			if (k.player) {
				g.fillStyle = '#d39a5f';
				g.fillRect(k.cx - k.r, k.cy - k.r, k.r * 2, k.r * 2);
				for (let y = k.cy - k.r; y < k.cy + k.r; y += 30) {
					g.fillStyle = (Math.round(y / 30) % 2) ? '#c98b4b' : '#dca56b';
					g.fillRect(k.cx - k.r, y, k.r * 2, 28);
					g.fillStyle = 'rgba(59,36,22,0.55)';
					g.fillRect(k.cx - k.r, y + 28, k.r * 2, 2);
					for (let x = k.cx - k.r + ((y / 30) % 2) * 60; x < k.cx + k.r; x += 120) {
						g.fillRect(x, y, 2, 28);
						circle(g, x + 8, y + 14, 1.6, INK, null);
					}
				}
			} else {
				g.fillStyle = '#3f9a43';
				g.fillRect(k.cx - k.r, k.cy - k.r, k.r * 2, k.r * 2);
			}
			g.restore();
			g.beginPath();
			g.arc(k.cx, k.cy, k.r, 0, Math.PI * 2);
			if (k.player) {
				g.lineWidth = 16;
				g.strokeStyle = INK;
				g.stroke();
				g.lineWidth = 10;
				g.strokeStyle = k.player.color;
				g.stroke();
				g.beginPath();
				g.arc(k.cx, k.cy, k.r - 11, 0, Math.PI * 2);
				g.lineWidth = 3;
				g.strokeStyle = 'rgba(255,255,255,0.55)';
				g.stroke();
			} else {
				g.lineWidth = 4;
				g.strokeStyle = '#2e7d35';
				g.stroke();
			}
		});
		// soft dark frame so the eye stays in the middle
		const v = 70;
		[[0, 0, W, v, 0, 0, 0, v], [0, H - v, W, v, 0, H, 0, H - v], [0, 0, v, H, 0, 0, v, 0], [W - v, 0, v, H, W, 0, W - v, 0]].forEach(([x, y, w, h, x0, y0, x1, y1]) => {
			g.fillStyle = linear(g, x0, y0, x1, y1, [[0, 'rgba(20,70,25,0.35)'], [1, 'rgba(20,70,25,0)']]);
			g.fillRect(x, y, w, h);
		});
		if (scene.textures.exists('ground')) scene.textures.remove('ground');
		scene.textures.addCanvas('ground', c);
	}

	function face(id, color) {
		const {c, g} = canvas(120, 140, 2);
		drawMonkey(g, {color, acc: PLAYER_ACC[id] || 'leaf', expr: 'happy'});

		return c.toDataURL();
	}

	MM.Art = {build, ground, face, PLAYER_ACC, POWER};
})();
