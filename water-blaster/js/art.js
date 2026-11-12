/* Water Blaster Arena: all the pictures, drawn in code (no image files) at the screen's real pixel density.
     WB.Art.build(scene, TS, fighters, theme)   makes every texture for this match (TS = pixels per game unit)
     WB.Art.ground(scene, TS, L, theme)         the arena floor (pool tiles or beach sand) as one big texture
     WB.Art.portrait(charId, color)             a character's head and shoulders as a data URL (menus, results)
   Every texture is drawn TS times bigger than its game size; sprites show it at scale 1/TS, so it stays sharp.
   A splasher is four layers in the same 120 x 150 frame (feet at y 146): legs, body (gets wetter in 4 steps),
   face (expressions) and the blaster, which turns to where the water goes.
   Style: the app's chunky cartoon family (thick round outlines, glossy highlights), in pool blues with a deep navy ink. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const INK = '#163552';
	const WATER = '#3ec5ff';

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
		g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
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

	function radial(g, x, y, r, stops, x0 = x, y0 = y) {
		const gr = g.createRadialGradient(x0, y0, 0, x, y, r);
		stops.forEach(([o, c]) => gr.addColorStop(o, c));

		return gr;
	}

	function linear(g, x0, y0, x1, y1, stops) {
		const gr = g.createLinearGradient(x0, y0, x1, y1);
		stops.forEach(([o, c]) => gr.addColorStop(o, c));

		return gr;
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

	function fillStroke(g, fill, stroke = INK, lw = 3) {
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

	function star(g, x, y, r1, r2, n, fill, stroke, lw = 2) {
		g.beginPath();
		for (let i = 0; i < n * 2; i++) {
			const a = -Math.PI / 2 + (i * Math.PI) / n;
			const r = i % 2 ? r2 : r1;
			g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
		}
		g.closePath();
		fillStroke(g, fill, stroke, lw);
	}

	// a seeded random, so the floor looks the same every match
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

	// a glossy water drop (pointing up), centre (x, y), height h
	function drop(g, x, y, h, fill = WATER, stroke = INK, lw = 2) {
		const w = h * 0.62;
		g.beginPath();
		g.moveTo(x, y - h / 2);
		g.bezierCurveTo(x + w * 0.2, y - h * 0.2, x + w / 2, y, x + w / 2, y + h * 0.15);
		g.arc(x, y + h * 0.15, w / 2, 0, Math.PI);
		g.bezierCurveTo(x - w / 2, y, x - w * 0.2, y - h * 0.2, x, y - h / 2);
		g.closePath();
		fillStroke(g, fill, stroke, lw);
		ellipse(g, x - w * 0.16, y + h * 0.08, w * 0.12, h * 0.16, 'rgba(255,255,255,0.85)', null, 0, 0.3);
	}

	/* ---------- the four splashers (+ Ducky the bot) ---------- */
	// each character: skin, hair colour and a silhouette of their own, so colour is never the only clue
	const CHARS = {
		c1: {skin: '#f7cfa6', hair: '#5a3220', kind: 'pigtails'},
		c2: {skin: '#c68a5c', hair: '#1e1a2e', kind: 'spiky'},
		c3: {skin: '#8a573a', hair: '#1c1410', kind: 'cap'},
		c4: {skin: '#f3d3b5', hair: '#e2702a', kind: 'curly'},
		duck: {skin: '#ffd23f', hair: '#ffd23f', kind: 'duck'}
	};
	WB.CHARS = ['c1', 'c2', 'c3', 'c4'];

	const HX = 60;
	const HY = 52;
	const HR = 32;

	function drawHair(g, ch, color, flat, back) {
		const hair = ch.hair;
		const wetHair = flat > 0.5 ? shade(hair, -0.25) : hair;
		if (ch.kind === 'pigtails') {
			if (back) {
				// two big puffs on the sides: they droop as they get wet
				[-1, 1].forEach((s) => {
					const px = HX + s * (HR + 12 - flat * 6);
					const py = HY - 8 + flat * 22;
					ellipse(g, px, py, 17 - flat * 4, 19 + flat * 6, wetHair, INK, 3, s * flat * 0.4);
					circle(g, HX + s * (HR - 2), HY - 14 + flat * 8, 6, color, INK, 2.5);
				});
			} else {
				g.beginPath();
				g.moveTo(HX - HR - 1, HY + 2);
				g.quadraticCurveTo(HX - HR + 2, HY - HR - 6 + flat * 8, HX, HY - HR - 4 + flat * 6);
				g.quadraticCurveTo(HX + HR - 2, HY - HR - 6 + flat * 8, HX + HR + 1, HY + 2);
				g.quadraticCurveTo(HX + 18, HY - 18 + flat * 6, HX + 2, HY - 16 + flat * 6);
				g.quadraticCurveTo(HX - 18, HY - 20 + flat * 6, HX - HR - 1, HY + 2);
				fillStroke(g, wetHair);
				// swim goggles pushed up on the forehead
				g.lineWidth = 4;
				g.strokeStyle = INK;
				g.beginPath();
				g.moveTo(HX - HR, HY - 14 + flat * 4);
				g.lineTo(HX + HR, HY - 14 + flat * 4);
				g.stroke();
				[-1, 1].forEach((s) => {
					ellipse(g, HX + s * 11, HY - 16 + flat * 4, 10, 7, radial(g, HX + s * 11, HY - 16, 10, [[0, '#bff2ff'], [1, '#47b9e8']]), INK, 2.5);
					ellipse(g, HX + s * 11 - 3, HY - 18 + flat * 4, 3, 2, 'rgba(255,255,255,0.9)', null);
				});
			}
		} else if (ch.kind === 'spiky') {
			if (back) return;
			// spikes stand up dry and flop sideways when soaked
			g.beginPath();
			g.moveTo(HX - HR - 2, HY + 2);
			const n = 7;
			for (let i = 0; i <= n; i++) {
				const t = i / n;
				const a = Math.PI + t * Math.PI;
				const bx = HX + Math.cos(a) * (HR + 2);
				const by = HY - 6 + Math.sin(a) * (HR + 2);
				const tip = 16 - flat * 12;
				const lean = (t - 0.5) * 10 + flat * 12;
				if (i < n) {
					const a2 = Math.PI + (t + 0.5 / n) * Math.PI;
					g.lineTo(HX + Math.cos(a2) * (HR + 2 + tip) + lean, HY - 6 + Math.sin(a2) * (HR + 2 + tip) + flat * 6);
				}
				g.lineTo(bx, by);
			}
			g.quadraticCurveTo(HX + 6, HY - 20 + flat * 6, HX - HR - 2, HY + 2);
			fillStroke(g, wetHair);
			// a snorkel on the side of the head
			g.lineWidth = 7;
			g.strokeStyle = INK;
			g.beginPath();
			g.moveTo(HX + HR - 2, HY + 4);
			g.lineTo(HX + HR + 8, HY - 30);
			g.stroke();
			g.lineWidth = 4;
			g.strokeStyle = color;
			g.stroke();
			circle(g, HX + HR + 8, HY - 32, 4.5, '#ffe14d', INK, 2);
		} else if (ch.kind === 'cap') {
			if (back) return;
			// a cap worn backwards in the player's colour, little tufts underneath
			g.beginPath();
			g.arc(HX, HY - 4, HR + 2, Math.PI * 1.02, Math.PI * 1.98);
			g.quadraticCurveTo(HX, HY - 12, HX - HR - 1, HY - 3);
			fillStroke(g, color);
			g.beginPath();
			g.arc(HX - 6, HY - 26, 12, Math.PI * 1.1, Math.PI * 1.7);
			g.lineWidth = 3.5;
			g.strokeStyle = 'rgba(255,255,255,0.6)';
			g.stroke();
			// the brim sticks out the back (to one side)
			ellipse(g, HX + HR + 6, HY - 12, 15, 6, shade(color, -0.15), INK, 3, -0.25);
			circle(g, HX, HY - HR - 5, 4, shade(color, -0.2), INK, 2);
			[-1, 1].forEach((s) => {
				g.beginPath();
				g.moveTo(HX + s * (HR - 4), HY - 4);
				g.quadraticCurveTo(HX + s * (HR + 2), HY + 2 + flat * 6, HX + s * (HR - 2), HY + 8 + flat * 6);
				fillStroke(g, wetHair, INK, 2.5);
			});
		} else if (ch.kind === 'curly') {
			// a big cloud of curls: shrinks and drips when soaked
			const puff = 1 - flat * 0.45;
			const bumps = back ? 9 : 6;
			for (let i = 0; i < bumps; i++) {
				const a = back ? Math.PI * 0.85 + (i / (bumps - 1)) * Math.PI * 1.3 : Math.PI * 1.08 + (i / (bumps - 1)) * Math.PI * 0.84;
				const r = back ? HR + 4 * puff : HR - 4;
				const bx = HX + Math.cos(a) * r;
				const by = HY - 2 + flat * 6 + Math.sin(a) * r;
				circle(g, bx, by, (back ? 14 : 11) * (0.7 + puff * 0.3), wetHair, INK, 2.5);
			}
			if (!back) {
				// swim-ring floaties on the shoulders are drawn with the body; here a headband
				g.lineWidth = 5;
				g.strokeStyle = INK;
				g.beginPath();
				g.arc(HX, HY + 4, HR + 1, Math.PI * 1.15, Math.PI * 1.85);
				g.stroke();
				g.lineWidth = 3;
				g.strokeStyle = color;
				g.stroke();
			}
		}
	}

	// the body without a face: tier 0 dry ... 3 dripping (clothes darker, hair flatter, more drops)
	function drawBody(g, charId, color, tier) {
		const ch = CHARS[charId];
		const flat = [0, 0.15, 0.6, 1][tier];
		const cloth = shade(color, -0.12 * tier);
		const clothHi = shade(color, 0.35 - 0.1 * tier);
		if (ch.kind === 'duck') return drawDuck(g, tier);

		drawHair(g, ch, color, flat, true);
		// torso: a swimsuit / rash vest in the player's colour with a white stripe
		g.beginPath();
		g.moveTo(HX - 24, 84);
		g.quadraticCurveTo(HX - 28, 112, HX - 22, 122);
		g.lineTo(HX + 22, 122);
		g.quadraticCurveTo(HX + 28, 112, HX + 24, 84);
		g.quadraticCurveTo(HX, 76, HX - 24, 84);
		fillStroke(g, linear(g, 0, 80, 0, 122, [[0, clothHi], [0.35, cloth], [1, shade(color, -0.25 - 0.08 * tier)]]));
		g.save();
		g.clip();
		g.fillStyle = tier >= 2 ? 'rgba(255,255,255,0.55)' : '#ffffff';
		g.fillRect(HX - 30, 100, 60, 7);
		// wet patches spread over the clothes
		if (tier) {
			const R = rng(7 + tier);
			for (let i = 0; i < tier * 3; i++) ellipse(g, HX - 22 + R() * 44, 86 + R() * 34, 6 + R() * 7 * tier, 4 + R() * 5 * tier, 'rgba(10,40,90,0.16)', null);
		}
		g.restore();
		// shoulders + arm stubs reaching to the blaster
		[-1, 1].forEach((s) => {
			g.beginPath();
			g.moveTo(HX + s * 22, 88);
			g.quadraticCurveTo(HX + s * 32, 98, HX + s * 18, 106);
			g.lineWidth = 12;
			g.strokeStyle = INK;
			g.stroke();
			g.lineWidth = 7;
			g.strokeStyle = ch.skin;
			g.stroke();
			if (ch.kind === 'curly') {
				// arm floaties
				ellipse(g, HX + s * 28, 94, 9, 7, '#ffe14d', INK, 2.5, s * 0.5);
				ellipse(g, HX + s * 26, 91, 3, 2, 'rgba(255,255,255,0.9)', null);
			}
		});
		// neck + head
		ellipse(g, HX, 80, 10, 6, ch.skin, null);
		circle(g, HX, HY, HR, radial(g, HX, HY, HR + 6, [[0, shade(ch.skin, 0.25)], [0.7, ch.skin], [1, shade(ch.skin, -0.12)]], HX - 10, HY - 12), INK, 3);
		// ears
		[-1, 1].forEach((s) => {
			if (ch.kind === 'pigtails' || ch.kind === 'curly') return;
			circle(g, HX + s * (HR + 1), HY + 4, 7, ch.skin, INK, 2.5);
		});
		// cheeks
		ellipse(g, HX - 19, HY + 12, 6, 4, 'rgba(255,110,120,0.35)', null);
		ellipse(g, HX + 19, HY + 12, 6, 4, 'rgba(255,110,120,0.35)', null);
		drawHair(g, ch, color, flat, false);
		wetDrops(g, tier);
	}

	function drawDuck(g, tier) {
		const yel = shade('#ffd23f', -0.08 * tier);
		// a round rubber-duck body with a little wing and a sailor collar
		ellipse(g, HX, 106, 34, 26, radial(g, HX, 106, 40, [[0, '#fff3a0'], [0.6, yel], [1, shade('#ffd23f', -0.25)]], HX - 10, 96), INK, 3);
		g.beginPath();
		g.moveTo(HX + 26, 100);
		g.quadraticCurveTo(HX + 44, 92, HX + 40, 108);
		g.quadraticCurveTo(HX + 36, 118, HX + 24, 112);
		fillStroke(g, yel);
		g.beginPath();
		g.moveTo(HX - 18, 84);
		g.lineTo(HX, 96);
		g.lineTo(HX + 18, 84);
		g.lineWidth = 7;
		g.strokeStyle = INK;
		g.stroke();
		g.lineWidth = 4;
		g.strokeStyle = '#22c55e';
		g.stroke();
		circle(g, HX, HY + 2, HR - 1, radial(g, HX, HY, HR + 6, [[0, '#fff6b8'], [0.7, yel], [1, shade('#ffd23f', -0.2)]], HX - 10, HY - 12), INK, 3);
		// a tuft that flattens
		g.beginPath();
		g.moveTo(HX - 4, HY - HR + 2);
		g.quadraticCurveTo(HX - 2 + tier * 4, HY - HR - 16 + tier * 7, HX + 8 + tier * 3, HY - HR - 6 + tier * 5);
		g.quadraticCurveTo(HX + 4, HY - HR, HX + 4, HY - HR + 3);
		fillStroke(g, yel, INK, 2.5);
		// a little sailor hat in green
		ellipse(g, HX - 4, HY - HR + 4, 18, 6, '#ffffff', INK, 2.5, -0.15);
		ellipse(g, HX - 4, HY - HR + 1, 12, 7, '#22c55e', INK, 2.5, -0.15);
		wetDrops(g, tier);
	}

	function wetDrops(g, tier) {
		if (!tier) return;
		const R = rng(31 + tier);
		const n = [0, 3, 7, 12][tier];
		for (let i = 0; i < n; i++) {
			const onHead = i % 2 === 0;
			const x = onHead ? HX - 26 + R() * 52 : HX - 22 + R() * 44;
			const y = onHead ? HY - 24 + R() * 40 : 88 + R() * 30;
			drop(g, x, y, 7 + R() * 4, 'rgba(120,215,255,0.9)', 'rgba(22,53,82,0.7)', 1.4);
		}
		if (tier >= 2) {
			// shiny wet sheen over the head
			g.beginPath();
			g.arc(HX - 6, HY - 6, HR - 8, Math.PI * 1.05, Math.PI * 1.55);
			g.lineWidth = 4;
			g.strokeStyle = 'rgba(255,255,255,0.65)';
			g.stroke();
		}
	}

	// legs: 0 standing, 1 and 2 two running steps
	function drawLegs(g, charId, color, frame) {
		const ch = CHARS[charId];
		if (ch.kind === 'duck') {
			// orange feet
			const off = frame === 0 ? [0, 0] : frame === 1 ? [-5, 4] : [4, -5];
			[-1, 1].forEach((s, i) => ellipse(g, HX + s * 14, 140 + off[i], 12, 6, '#ff9a2e', INK, 2.5));

			return;
		}
		const lift = frame === 0 ? [0, 0] : frame === 1 ? [-7, 3] : [3, -7];
		[-1, 1].forEach((s, i) => {
			const fx = HX + s * 11 + (frame ? s * -2 : 0);
			const fy = 144 + lift[i];
			g.beginPath();
			g.moveTo(HX + s * 11, 118);
			g.lineTo(fx, fy - 4);
			g.lineWidth = 13;
			g.strokeStyle = INK;
			g.stroke();
			g.lineWidth = 8;
			g.strokeStyle = ch.skin;
			g.stroke();
			// a flip-flop
			ellipse(g, fx + s * 2, fy, 10, 5, color, INK, 2.5);
		});
		// shorts
		g.beginPath();
		g.moveTo(HX - 24, 116);
		g.lineTo(HX - 25, 128);
		g.lineTo(HX - 3, 128);
		g.lineTo(HX, 122);
		g.lineTo(HX + 3, 128);
		g.lineTo(HX + 25, 128);
		g.lineTo(HX + 24, 116);
		g.closePath();
		fillStroke(g, '#ffffff', INK, 3);
		g.fillStyle = color;
		g.fillRect(HX - 23, 120, 46, 3);
	}

	// faces sit on the head; expressions: normal blink happy hit worried panic soaked cheer
	function drawFace(g, expr, duck) {
		const ex = 12;
		const ey = HY + (duck ? -2 : 0);
		const eyes = (draw) => [-1, 1].forEach((s) => draw(HX + s * ex, ey, s));
		const bigEye = (r, pr, look = 0) => eyes((x, y) => {
			ellipse(g, x, y, r * 0.86, r, '#ffffff', INK, 2.5);
			circle(g, x + look, y + 1.5, pr, INK, null);
			circle(g, x + look - pr * 0.35, y - pr * 0.3, pr * 0.38, '#ffffff', null);
		});
		const arcEye = (up) => eyes((x, y) => {
			g.beginPath();
			if (up) g.arc(x, y + 3, 6, Math.PI * 1.1, Math.PI * 1.9);
			else g.arc(x, y - 2, 6, Math.PI * 0.1, Math.PI * 0.9);
			g.lineWidth = 3.2;
			g.strokeStyle = INK;
			g.stroke();
		});
		const brows = (tilt, lift = 0) => eyes((x, y, s) => {
			g.beginPath();
			g.moveTo(x - 6, y - 12 - lift + s * tilt);
			g.lineTo(x + 6, y - 12 - lift - s * tilt);
			g.lineWidth = 3;
			g.strokeStyle = INK;
			g.stroke();
		});
		const my = HY + 15;
		const mouth = (kind) => {
			if (duck) {
				// the beak: shut, or open wide
				const open = kind === 'open' || kind === 'wide' ? (kind === 'wide' ? 9 : 6) : 0;
				ellipse(g, HX, my - 1, 15, 6, '#ff9a2e', INK, 2.5);
				if (open) ellipse(g, HX, my + 5 + open / 2, 12, 3 + open / 2, '#ff9a2e', INK, 2.5);
				if (kind === 'wavy') {
					g.beginPath();
					g.moveTo(HX - 8, my);
					g.quadraticCurveTo(HX - 4, my - 3, HX, my);
					g.quadraticCurveTo(HX + 4, my + 3, HX + 8, my);
					g.lineWidth = 2;
					g.strokeStyle = INK;
					g.stroke();
				}

				return;
			}
			g.beginPath();
			if (kind === 'smile') {
				g.arc(HX, my - 4, 8, Math.PI * 0.15, Math.PI * 0.85);
				g.lineWidth = 3;
				g.strokeStyle = INK;
				g.stroke();
			} else if (kind === 'grin') {
				g.moveTo(HX - 11, my - 3);
				g.quadraticCurveTo(HX, my + 14, HX + 11, my - 3);
				g.closePath();
				fillStroke(g, '#8a2232', INK, 2.6);
				ellipse(g, HX, my + 4, 5, 2.6, '#ff8a9a', null);
			} else if (kind === 'open') {
				ellipse(g, HX, my + 1, 6, 7.5, '#8a2232', INK, 2.6);
			} else if (kind === 'wide') {
				ellipse(g, HX, my + 2, 10, 9, '#8a2232', INK, 2.6);
				ellipse(g, HX, my + 7, 6, 3, '#ff8a9a', null);
			} else if (kind === 'wavy') {
				g.moveTo(HX - 10, my);
				g.quadraticCurveTo(HX - 5, my - 5, HX, my);
				g.quadraticCurveTo(HX + 5, my + 5, HX + 10, my);
				g.lineWidth = 3;
				g.strokeStyle = INK;
				g.stroke();
			} else if (kind === 'tongue') {
				g.moveTo(HX - 10, my - 2);
				g.quadraticCurveTo(HX, my + 6, HX + 10, my - 2);
				g.lineWidth = 3;
				g.strokeStyle = INK;
				g.stroke();
				ellipse(g, HX + 3, my + 5, 4.5, 5.5, '#ff6b81', INK, 2);
			}
		};
		if (expr === 'normal') {
			bigEye(7.5, 4.2);
			mouth('smile');
		} else if (expr === 'blink') {
			arcEye(false);
			mouth('smile');
		} else if (expr === 'happy') {
			arcEye(true);
			mouth('grin');
		} else if (expr === 'hit') {
			// > <  squeezed shut, mouth an "o!"
			eyes((x, y, s) => {
				g.beginPath();
				g.moveTo(x - 6 * s, y - 5);
				g.lineTo(x + 4 * s, y);
				g.lineTo(x - 6 * s, y + 5);
				g.lineWidth = 3.2;
				g.strokeStyle = INK;
				g.stroke();
			});
			mouth('open');
		} else if (expr === 'worried') {
			bigEye(7.5, 3.6);
			brows(-3);
			mouth('wavy');
		} else if (expr === 'panic') {
			bigEye(9.5, 2.6);
			brows(-4, 3);
			mouth('wide');
			// a nervous sweat drop
			drop(g, HX + HR - 6, HY - 16, 10, '#bff0ff', INK, 1.6);
		} else if (expr === 'soaked') {
			// swirly eyes, tongue out
			eyes((x, y) => {
				g.beginPath();
				for (let a = 0; a < Math.PI * 5; a += 0.3) {
					const r = 1 + a * 0.45;
					g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
				}
				g.lineWidth = 2.2;
				g.strokeStyle = INK;
				g.stroke();
			});
			mouth('tongue');
		} else if (expr === 'cheer') {
			arcEye(true);
			mouth('wide');
		}
	}

	// the blaster with two little hands, pointing right; pivot at (30, 30) in a 120 x 60 frame
	function drawBlaster(g, kind, color, skin) {
		const dark = shade(color, -0.3);
		if (kind === 'rapid') {
			// a long slim blaster with a round drum tank on top
			roundRect(g, 26, 22, 66, 16, 8);
			fillStroke(g, linear(g, 0, 22, 0, 38, [[0, shade(color, 0.4)], [1, color]]));
			roundRect(g, 88, 25, 22, 10, 4);
			fillStroke(g, '#ffe14d');
			circle(g, 54, 18, 11, radial(g, 54, 18, 12, [[0, '#d9f6ff'], [1, '#56c8f5']], 50, 14), INK, 3);
			ellipse(g, 50, 14, 4, 2.5, 'rgba(255,255,255,0.9)', null);
			[0, 1, 2].forEach((i) => circle(g, 40 + i * 14, 30, 2.4, dark, null));
		} else if (kind === 'power') {
			// a chunky bazooka-style soaker with a big tank and a wide nozzle
			roundRect(g, 20, 20, 64, 24, 11);
			fillStroke(g, linear(g, 0, 20, 0, 44, [[0, shade(color, 0.4)], [1, dark]]));
			g.beginPath();
			g.moveTo(82, 18);
			g.lineTo(106, 12);
			g.lineTo(106, 48);
			g.lineTo(82, 42);
			g.closePath();
			fillStroke(g, '#ffe14d');
			ellipse(g, 106, 30, 5, 18, '#ffb000', INK, 3);
			roundRect(g, 32, 4, 38, 18, 9);
			fillStroke(g, radial(g, 51, 13, 24, [[0, '#d9f6ff'], [1, '#3eb3ea']], 44, 8));
			ellipse(g, 44, 10, 7, 3, 'rgba(255,255,255,0.85)', null);
		} else {
			// the classic: a pump-action soaker with a clear tank
			roundRect(g, 24, 22, 58, 18, 9);
			fillStroke(g, linear(g, 0, 22, 0, 40, [[0, shade(color, 0.4)], [1, color]]));
			roundRect(g, 80, 25, 18, 12, 5);
			fillStroke(g, '#ffe14d');
			roundRect(g, 36, 6, 30, 18, 8);
			fillStroke(g, radial(g, 51, 15, 22, [[0, '#d9f6ff'], [1, '#56c8f5']], 44, 10));
			ellipse(g, 44, 11, 6, 3, 'rgba(255,255,255,0.85)', null);
			roundRect(g, 54, 38, 20, 8, 4);
			fillStroke(g, dark);
		}
		// grip + hands
		roundRect(g, 26, 34, 12, 20, 5);
		fillStroke(g, shade(color, -0.2));
		circle(g, 32, 44, 7.5, skin, INK, 2.5);
		circle(g, kind === 'power' ? 66 : 62, 36, 7, skin, INK, 2.5);
		// a shiny streak on the barrel
		g.beginPath();
		g.moveTo(32, 26);
		g.lineTo(kind === 'power' ? 74 : 76, 26);
		g.lineWidth = 2.5;
		g.strokeStyle = 'rgba(255,255,255,0.7)';
		g.stroke();
	}

	/* ---------- controls (each player's colour) ---------- */
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
			fillStroke(g, '#ffffff', INK, 2);
			g.restore();
		}
	}

	function drawKnob(g, color, c, r) {
		circle(g, c, c + 6, r, 'rgba(0,0,0,0.22)', null);
		circle(g, c, c, r, radial(g, c - r * 0.3, c - r * 0.35, r * 1.3, [[0, shade(color, 0.55)], [0.55, color], [1, shade(color, -0.25)]]), INK, 3.5);
		ellipse(g, c - r * 0.3, c - r * 0.45, r * 0.38, r * 0.2, 'rgba(255,255,255,0.75)', null, 0, -0.6);
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
		fillStroke(g, color);
	}

	/* ---------- props ---------- */
	function barrel(g) {
		// a blue water barrel with hoops, a cap and a sloshing window
		ellipse(g, 40, 92, 30, 9, 'rgba(0,0,0,0.2)', null);
		g.beginPath();
		g.moveTo(12, 30);
		g.quadraticCurveTo(6, 60, 12, 88);
		g.quadraticCurveTo(40, 98, 68, 88);
		g.quadraticCurveTo(74, 60, 68, 30);
		g.closePath();
		fillStroke(g, linear(g, 10, 0, 70, 0, [[0, '#1c7fd0'], [0.35, '#4bb4f5'], [1, '#155fa6']]));
		ellipse(g, 40, 30, 28, 10, linear(g, 0, 20, 0, 40, [[0, '#7fd3ff'], [1, '#2f97e3']]), INK, 3);
		circle(g, 40, 29, 6, '#ffe14d', INK, 2.5);
		[50, 72].forEach((y) => {
			g.beginPath();
			g.moveTo(9, y);
			g.quadraticCurveTo(40, y + 9, 71, y);
			g.lineWidth = 5;
			g.strokeStyle = INK;
			g.stroke();
			g.lineWidth = 2.5;
			g.strokeStyle = '#ffe14d';
			g.stroke();
		});
		g.beginPath();
		g.moveTo(20, 38);
		g.quadraticCurveTo(18, 60, 21, 82);
		g.lineWidth = 4;
		g.strokeStyle = 'rgba(255,255,255,0.55)';
		g.stroke();
	}

	function wall(g, theme) {
		// a low wall, 196 x 90: pool foam blocks, or a sandcastle wall on the beach
		ellipse(g, 98, 76, 92, 12, 'rgba(0,0,0,0.18)', null);
		if (theme === 'beach') {
			roundRect(g, 8, 34, 180, 40, 10);
			fillStroke(g, linear(g, 0, 34, 0, 74, [[0, '#ffe4a8'], [1, '#e2b35f']]));
			for (let i = 0; i < 6; i++) {
				roundRect(g, 10 + i * 30, 20, 22, 22, 4);
				fillStroke(g, i % 2 ? '#f6d48c' : '#ffe1a0');
			}
			const R = rng(5);
			for (let i = 0; i < 30; i++) circle(g, 14 + R() * 168, 40 + R() * 30, 1.4, '#c9974a', null);
			star(g, 150, 56, 9, 4, 5, '#ff8a65', INK, 2);
			circle(g, 46, 56, 6, '#ffffff', INK, 2);
		} else {
			const cols = ['#ff5d73', '#ffd23f', '#3ec5ff', '#7ed957', '#9b6bff', '#ff9417'];
			for (let i = 0; i < 6; i++) {
				roundRect(g, 8 + i * 30, 24, 28, 48, 9);
				fillStroke(g, linear(g, 0, 24, 0, 72, [[0, shade(cols[i], 0.35)], [1, cols[i]]]));
				ellipse(g, 16 + i * 30, 34, 4, 7, 'rgba(255,255,255,0.6)', null);
			}
		}
	}

	function duck(g) {
		// a giant inflatable rubber duck, 120 x 120
		ellipse(g, 60, 100, 50, 14, 'rgba(0,0,0,0.2)', null);
		ellipse(g, 58, 78, 48, 30, radial(g, 58, 78, 52, [[0, '#fff4a6'], [0.6, '#ffd23f'], [1, '#e8a800']], 46, 64), INK, 3.5);
		g.beginPath();
		g.moveTo(90, 66);
		g.quadraticCurveTo(116, 50, 108, 76);
		g.quadraticCurveTo(100, 90, 88, 84);
		fillStroke(g, '#ffd23f');
		circle(g, 42, 40, 25, radial(g, 42, 40, 28, [[0, '#fff6b8'], [0.7, '#ffd23f'], [1, '#e8a800']], 34, 30), INK, 3.5);
		g.beginPath();
		g.moveTo(16, 42);
		g.quadraticCurveTo(2, 40, 4, 50);
		g.quadraticCurveTo(14, 56, 24, 50);
		fillStroke(g, '#ff9a2e');
		circle(g, 38, 34, 5.5, '#ffffff', INK, 2);
		circle(g, 37, 35, 2.8, INK, null);
		ellipse(g, 50, 68, 16, 7, 'rgba(255,255,255,0.55)', null, 0, -0.3);
		ellipse(g, 48, 28, 8, 4, 'rgba(255,255,255,0.7)', null, 0, -0.5);
	}

	function donut(g, color = '#ff7eb6') {
		// an inflatable donut ring with sprinkles, 110 x 100
		ellipse(g, 55, 82, 48, 13, 'rgba(0,0,0,0.2)', null);
		ellipse(g, 55, 56, 48, 34, radial(g, 55, 56, 50, [[0, shade(color, 0.4)], [0.7, color], [1, shade(color, -0.2)]], 40, 40), INK, 3.5);
		ellipse(g, 55, 56, 18, 11, '#1aa0e6', INK, 3);
		const R = rng(9);
		const cols = ['#ffffff', '#ffe14d', '#7ed957', '#3ec5ff'];
		for (let i = 0; i < 16; i++) {
			const a = R() * Math.PI * 2;
			const r = 26 + R() * 12;
			g.save();
			g.translate(55 + Math.cos(a) * r, 56 + Math.sin(a) * r * 0.7);
			g.rotate(R() * 3);
			roundRect(g, -4, -1.5, 8, 3, 1.5);
			g.fillStyle = cols[i % 4];
			g.fill();
			g.restore();
		}
		ellipse(g, 36, 40, 12, 5, 'rgba(255,255,255,0.6)', null, 0, -0.4);
	}

	function palm(g) {
		// 160 x 240, trunk base at (80, 236)
		ellipse(g, 80, 234, 34, 8, 'rgba(0,0,0,0.2)', null);
		g.beginPath();
		g.moveTo(72, 236);
		g.quadraticCurveTo(66, 150, 84, 70);
		g.lineTo(96, 72);
		g.quadraticCurveTo(82, 150, 90, 236);
		g.closePath();
		fillStroke(g, linear(g, 66, 0, 96, 0, [[0, '#b97a45'], [1, '#8a5a33']]));
		for (let y = 90; y < 230; y += 16) {
			g.beginPath();
			g.moveTo(72 + (230 - y) * 0.02, y);
			g.quadraticCurveTo(82, y + 5, 92 - (230 - y) * 0.03, y);
			g.lineWidth = 2;
			g.strokeStyle = INK;
			g.stroke();
		}
		const leaf = (a, len) => {
			g.save();
			g.translate(88, 70);
			g.rotate(a);
			g.beginPath();
			g.moveTo(0, 0);
			g.quadraticCurveTo(len * 0.5, -22, len, 8);
			g.quadraticCurveTo(len * 0.5, 4, 0, 0);
			fillStroke(g, linear(g, 0, -20, 0, 10, [[0, '#5fd36a'], [1, '#2f9e44']]));
			g.beginPath();
			g.moveTo(4, 0);
			g.quadraticCurveTo(len * 0.5, -8, len - 6, 6);
			g.lineWidth = 1.6;
			g.strokeStyle = '#1d6b34';
			g.stroke();
			g.restore();
		};
		[-2.9, -2.2, -1.5, -0.9, -0.25, 0.35].forEach((a, i) => leaf(a, 70 + (i % 2) * 14));
		circle(g, 82, 76, 8, '#6b4423', INK, 2);
		circle(g, 94, 78, 8, '#7a4f2a', INK, 2);
	}

	function umbrella(g, v, theme) {
		// a top-down beach umbrella, 160 x 160
		const a = theme === 'beach' ? ['#ff5d73', '#ffffff'] : v ? ['#3ec5ff', '#ffffff'] : ['#ffd23f', '#ff9417'];
		ellipse(g, 86, 92, 66, 60, 'rgba(0,0,0,0.16)', null);
		for (let i = 0; i < 8; i++) {
			g.beginPath();
			g.moveTo(80, 80);
			g.arc(80, 80, 70, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4);
			g.closePath();
			g.fillStyle = a[i % 2];
			g.fill();
		}
		circle(g, 80, 80, 70, null, INK, 3.5);
		for (let i = 0; i < 8; i++) {
			g.beginPath();
			g.moveTo(80, 80);
			g.lineTo(80 + Math.cos((i * Math.PI) / 4) * 70, 80 + Math.sin((i * Math.PI) / 4) * 70);
			g.lineWidth = 1.5;
			g.strokeStyle = 'rgba(22,53,82,0.35)';
			g.stroke();
		}
		g.fillStyle = radial(g, 66, 62, 70, [[0, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
		g.beginPath();
		g.arc(80, 80, 70, 0, Math.PI * 2);
		g.fill();
		circle(g, 80, 80, 7, '#ffffff', INK, 2.5);
	}

	function tap(g) {
		// a refill station: a blue tank on legs with a big tap and a dripping spout, 120 x 120
		ellipse(g, 60, 108, 46, 10, 'rgba(0,0,0,0.2)', null);
		roundRect(g, 22, 10, 76, 66, 18);
		fillStroke(g, linear(g, 22, 0, 98, 0, [[0, '#1c7fd0'], [0.4, '#5cc4ff'], [1, '#1662ad']]));
		roundRect(g, 32, 20, 22, 46, 10);
		fillStroke(g, 'rgba(210,245,255,0.85)', INK, 2);
		roundRect(g, 34, 36, 18, 28, 8);
		g.fillStyle = WATER;
		g.fill();
		[30, 90].forEach((x) => {
			roundRect(g, x - 5, 70, 10, 34, 4);
			fillStroke(g, '#cfd8e3');
		});
		roundRect(g, 64, 60, 28, 12, 5);
		fillStroke(g, '#dfe7ef');
		roundRect(g, 84, 66, 12, 18, 4);
		fillStroke(g, '#dfe7ef');
		circle(g, 76, 50, 9, '#ff5d73', INK, 3);
		g.lineWidth = 5;
		g.strokeStyle = INK;
		g.beginPath();
		g.moveTo(70, 50);
		g.lineTo(82, 50);
		g.stroke();
		drop(g, 90, 96, 12);
		ellipse(g, 30, 22, 6, 12, 'rgba(255,255,255,0.4)', null, 0, 0.2);
	}

	function slide(g) {
		// a curly water slide from a little tower into the pool, 260 x 220
		ellipse(g, 70, 200, 52, 12, 'rgba(0,0,0,0.2)', null);
		[[40, 120], [100, 120]].forEach(([x]) => {
			roundRect(g, x - 5, 70, 10, 130, 4);
			fillStroke(g, '#dfe7ef');
		});
		roundRect(g, 26, 56, 88, 20, 8);
		fillStroke(g, '#ff9417');
		for (let y = 90; y < 196; y += 22) {
			g.beginPath();
			g.moveTo(40, y);
			g.lineTo(100, y);
			g.lineWidth = 5;
			g.strokeStyle = INK;
			g.stroke();
			g.lineWidth = 3;
			g.strokeStyle = '#dfe7ef';
			g.stroke();
		}
		const tube = (lw, col) => {
			g.beginPath();
			g.moveTo(96, 62);
			g.bezierCurveTo(200, 40, 240, 110, 180, 140);
			g.bezierCurveTo(140, 160, 150, 196, 230, 204);
			g.lineWidth = lw;
			g.strokeStyle = col;
			g.stroke();
		};
		tube(40, INK);
		tube(33, '#ffd23f');
		tube(18, '#7fdcff');
		tube(5, 'rgba(255,255,255,0.8)');
		roundRect(g, 30, 20, 80, 40, 12);
		fillStroke(g, '#ff5d73');
		roundRect(g, 40, 6, 60, 18, 9);
		fillStroke(g, '#ffffff');
	}

	function floatRing(g, color) {
		// an inflatable swim ring in the player's colour with white stripes, 120 x 80 (top-down-ish)
		ellipse(g, 60, 44, 54, 30, radial(g, 60, 44, 58, [[0, shade(color, 0.45)], [0.7, color], [1, shade(color, -0.2)]], 46, 32), INK, 3.5);
		g.save();
		g.beginPath();
		g.ellipse(60, 44, 54, 30, 0, 0, Math.PI * 2);
		g.clip();
		g.fillStyle = 'rgba(255,255,255,0.9)';
		for (let i = 0; i < 4; i++) {
			g.save();
			g.translate(60, 44);
			g.rotate((i * Math.PI) / 2 + 0.4);
			g.fillRect(-6, -60, 12, 60);
			g.restore();
		}
		g.restore();
		ellipse(g, 60, 44, 54, 30, null, INK, 3.5);
		ellipse(g, 60, 42, 26, 13, 'rgba(30,120,200,0.95)', INK, 3);
		ellipse(g, 40, 30, 12, 5, 'rgba(255,255,255,0.7)', null, 0, -0.2);
	}

	function beachToy(g, kind) {
		if (kind === 'ball') {
			circle(g, 30, 30, 24, '#ffffff', INK, 3);
			['#ff5d73', '#3ec5ff', '#ffd23f'].forEach((c, i) => {
				g.beginPath();
				g.moveTo(30, 30);
				g.arc(30, 30, 24, (i * 2 * Math.PI) / 3, (i * 2 * Math.PI) / 3 + Math.PI / 3);
				g.closePath();
				g.fillStyle = c;
				g.fill();
			});
			circle(g, 30, 30, 24, null, INK, 3);
			circle(g, 30, 30, 5, '#ffffff', INK, 2);
			ellipse(g, 22, 20, 7, 4, 'rgba(255,255,255,0.8)', null, 0, -0.5);
		} else if (kind === 'bucket') {
			g.beginPath();
			g.moveTo(12, 18);
			g.lineTo(18, 52);
			g.lineTo(42, 52);
			g.lineTo(48, 18);
			g.closePath();
			fillStroke(g, '#ff9417');
			ellipse(g, 30, 18, 18, 6, '#ffd08a', INK, 3);
			g.beginPath();
			g.arc(30, 20, 18, Math.PI, 0);
			g.lineWidth = 2.5;
			g.strokeStyle = INK;
			g.stroke();
			star(g, 30, 36, 7, 3, 5, '#ffe14d', INK, 1.5);
		} else {
			star(g, 30, 30, 22, 10, 5, '#ff8a65', INK, 3);
			for (let i = 0; i < 10; i++) circle(g, 30 + Math.cos(i) * 8, 30 + Math.sin(i * 1.3) * 8, 1.6, '#ffd0b8', null);
		}
	}

	/* ---------- pickups and event props ---------- */
	function bottle(g) {
		// a water bottle (refill), 50 x 70
		ellipse(g, 25, 64, 16, 5, 'rgba(0,0,0,0.2)', null);
		roundRect(g, 18, 4, 14, 10, 3);
		fillStroke(g, '#3ec5ff');
		g.beginPath();
		g.moveTo(16, 14);
		g.lineTo(34, 14);
		g.quadraticCurveTo(42, 20, 42, 30);
		g.lineTo(42, 58);
		g.quadraticCurveTo(42, 64, 36, 64);
		g.lineTo(14, 64);
		g.quadraticCurveTo(8, 64, 8, 58);
		g.lineTo(8, 30);
		g.quadraticCurveTo(8, 20, 16, 14);
		g.closePath();
		fillStroke(g, 'rgba(215,245,255,0.95)');
		roundRect(g, 10, 32, 30, 30, 6);
		g.fillStyle = WATER;
		g.fill();
		roundRect(g, 8, 38, 34, 12, 2);
		fillStroke(g, '#ffffff', INK, 2);
		drop(g, 25, 44, 9, WATER, INK, 1.4);
		ellipse(g, 15, 30, 3, 10, 'rgba(255,255,255,0.8)', null);
	}

	function goldTank(g) {
		// a golden water tank with a glow, 80 x 80
		g.fillStyle = radial(g, 40, 40, 40, [[0, 'rgba(255,240,150,0.85)'], [0.6, 'rgba(255,210,63,0.3)'], [1, 'rgba(255,210,63,0)']]);
		g.fillRect(0, 0, 80, 80);
		roundRect(g, 18, 18, 44, 48, 14);
		fillStroke(g, linear(g, 18, 0, 62, 0, [[0, '#e89a00'], [0.4, '#fff1a6'], [1, '#d48800']]));
		roundRect(g, 32, 10, 16, 10, 3);
		fillStroke(g, '#ffd23f');
		drop(g, 40, 44, 22, '#5fd0ff', INK, 2.5);
		star(g, 62, 18, 7, 2.6, 4, '#ffffff', null);
		star(g, 18, 62, 5, 2, 4, '#ffffff', null);
	}

	function powerIcon(g, kind) {
		// a round token, 76 x 76
		const col = {super: '#ff5d73', shield: '#3ec5ff', reverse: '#9b6bff'}[kind];
		circle(g, 38, 42, 32, 'rgba(0,0,0,0.2)', null);
		circle(g, 38, 38, 32, radial(g, 38, 38, 36, [[0, shade(col, 0.45)], [0.7, col], [1, shade(col, -0.25)]], 28, 26), INK, 3.5);
		circle(g, 38, 38, 25, null, 'rgba(255,255,255,0.75)', 2.5);
		if (kind === 'super') {
			// a blaster with a lightning bolt
			drawMini(g, 38, 40);
			g.beginPath();
			g.moveTo(42, 12);
			g.lineTo(34, 30);
			g.lineTo(41, 30);
			g.lineTo(35, 44);
			g.lineTo(48, 25);
			g.lineTo(41, 25);
			g.closePath();
			fillStroke(g, '#ffe14d', INK, 2);
		} else if (kind === 'shield') {
			circle(g, 38, 38, 17, 'rgba(220,250,255,0.7)', '#ffffff', 3);
			ellipse(g, 32, 31, 5, 3, '#ffffff', null, 0, -0.6);
		} else {
			// two curved arrows chasing each other
			g.lineWidth = 5;
			g.strokeStyle = '#ffffff';
			g.beginPath();
			g.arc(38, 38, 14, Math.PI * 1.1, Math.PI * 1.9);
			g.stroke();
			g.beginPath();
			g.arc(38, 38, 14, Math.PI * 0.1, Math.PI * 0.9);
			g.stroke();
			[[52, 34, 0], [24, 42, Math.PI]].forEach(([x, y, r]) => {
				g.save();
				g.translate(x, y);
				g.rotate(r);
				g.beginPath();
				g.moveTo(-6, -4);
				g.lineTo(0, 6);
				g.lineTo(6, -4);
				g.closePath();
				g.fillStyle = '#ffffff';
				g.fill();
				g.restore();
			});
		}
		ellipse(g, 26, 22, 9, 5, 'rgba(255,255,255,0.55)', null, 0, -0.6);
	}

	function drawMini(g, x, y) {
		roundRect(g, x - 16, y - 4, 26, 9, 4);
		fillStroke(g, '#ffffff', INK, 2);
		roundRect(g, x - 14, y + 2, 6, 10, 2);
		fillStroke(g, '#ffffff', INK, 2);
	}

	function balloon(g, color) {
		// a water balloon falling (40 x 52)
		ellipse(g, 20, 22, 16, 19, radial(g, 20, 22, 22, [[0, shade(color, 0.6)], [0.6, color], [1, shade(color, -0.2)]], 14, 14), INK, 3);
		g.beginPath();
		g.moveTo(16, 41);
		g.lineTo(20, 46);
		g.lineTo(24, 41);
		g.closePath();
		fillStroke(g, color, INK, 2);
		ellipse(g, 13, 14, 4, 6, 'rgba(255,255,255,0.8)', null, 0, 0.4);
	}

	function sprinkler(g) {
		// the giant sprinkler: a round base with a spinning arm, 120 x 120 (arm drawn separately)
		ellipse(g, 60, 70, 46, 14, 'rgba(0,0,0,0.2)', null);
		ellipse(g, 60, 62, 42, 22, linear(g, 0, 40, 0, 84, [[0, '#7ed957'], [1, '#2f9e44']]), INK, 3.5);
		ellipse(g, 60, 56, 18, 10, '#ffe14d', INK, 3);
	}

	function sprinklerArm(g) {
		roundRect(g, 4, 14, 112, 12, 6);
		fillStroke(g, '#ffffff');
		[10, 110].forEach((x) => circle(g, x, 20, 7, '#3ec5ff', INK, 2.5));
		circle(g, 60, 20, 9, '#ff5d73', INK, 3);
	}

	function cannon(g) {
		// a big water cannon on wheels, barrel pointing right, 160 x 110; pivot at (54, 56)
		ellipse(g, 70, 96, 64, 12, 'rgba(0,0,0,0.2)', null);
		roundRect(g, 40, 34, 112, 40, 18);
		fillStroke(g, linear(g, 0, 34, 0, 74, [[0, '#7fd3ff'], [1, '#1c7fd0']]));
		ellipse(g, 150, 54, 10, 22, '#ffe14d', INK, 3.5);
		roundRect(g, 60, 34, 14, 40, 3);
		g.fillStyle = '#ffd23f';
		g.fill();
		[44, 96].forEach((x) => {
			circle(g, x, 82, 18, '#ff5d73', INK, 3.5);
			circle(g, x, 82, 6, '#ffffff', INK, 2);
		});
		ellipse(g, 96, 42, 40, 5, 'rgba(255,255,255,0.6)', null);
	}

	function waveTex(g, w, h) {
		// a curling cartoon wave seen from above: deep blue body, foam crest along the leading edge (left)
		// a wavy outline: a curling front on the left, rippled top and bottom edges, fading out behind
		g.beginPath();
		g.moveTo(w, 14);
		for (let x = w; x > 30; x -= 26) g.quadraticCurveTo(x - 13, 0, x - 26, 14);
		for (let y = 14; y < h - 14; y += 40) g.quadraticCurveTo(-6, y + 20, 20 + (y % 80 ? 8 : 0), y + 40);
		for (let x = 30; x < w; x += 26) g.quadraticCurveTo(x + 13, h, x + 26, h - 14);
		g.closePath();
		g.save();
		g.clip();
		g.fillStyle = linear(g, 0, 0, w, 0, [[0, 'rgba(255,255,255,0.95)'], [0.12, '#7fe0ff'], [0.4, '#2fa5ef'], [1, 'rgba(31,134,214,0)']]);
		g.fillRect(0, 0, w, h);
		const R = rng(3);
		for (let y = 0; y < h; y += 26) {
			circle(g, 10 + R() * 14, y + R() * 10, 12 + R() * 10, '#ffffff', null);
			circle(g, 30 + R() * 30, y + R() * 20, 4 + R() * 5, 'rgba(255,255,255,0.8)', null);
		}
		g.lineWidth = 3;
		g.strokeStyle = 'rgba(255,255,255,0.6)';
		for (let i = 0; i < 12; i++) {
			const y = R() * h;
			g.beginPath();
			g.moveTo(60 + R() * 40, y);
			g.quadraticCurveTo(120, y + 10, 170 + R() * 60, y);
			g.stroke();
		}
		g.restore();
	}

	function add(scene, key, w, h, TS, draw) {
		const {c, g} = canvas(w, h, TS);
		draw(g);
		if (scene.textures.exists(key)) scene.textures.remove(key);
		scene.textures.addCanvas(key, c);
	}

	const EXPRS = ['normal', 'blink', 'happy', 'hit', 'worried', 'panic', 'soaked', 'cheer'];

	// fighters: [{player:{id,color}, char, weapon}]
	function build(scene, TS, fighters, theme) {
		fighters.forEach((f) => {
			const id = f.player.id;
			const color = f.player.color;
			const ch = f.char;
			for (let t = 0; t < 4; t++) add(scene, `body-${id}-${t}`, 120, 150, TS, (g) => drawBody(g, ch, color, t));
			for (let s = 0; s < 3; s++) add(scene, `legs-${id}-${s}`, 120, 150, TS, (g) => drawLegs(g, ch, color, s));
			EXPRS.forEach((e) => add(scene, `face-${id}-${e}`, 120, 150, TS, (g) => drawFace(g, e, ch === 'duck')));
			['standard', 'rapid', 'power'].forEach((w) => add(scene, `gun-${id}-${w}`, 120, 60, TS, (g) => drawBlaster(g, w, color, CHARS[ch].skin)));
			add(scene, `joy-base-${id}`, 172, 172, TS, (g) => drawJoyBase(g, color));
			add(scene, `joy-knob-${id}`, 92, 92, TS, (g) => drawKnob(g, color, 46, 40));
			add(scene, `button-${id}`, 132, 132, TS, (g) => drawKnob(g, color, 66, 56));
			add(scene, `ring-${id}`, 120, 120, TS, (g) => {
				circle(g, 60, 60, 54, null, INK, 10);
				circle(g, 60, 60, 54, null, color, 6);
			});
			add(scene, `arrow-${id}`, 60, 40, TS, (g) => drawArrow(g, color));
			add(scene, `float-${id}`, 120, 80, TS, (g) => floatRing(g, color));
			add(scene, `drop-${id}`, 16, 26, TS, (g) => drop(g, 8, 14, 22, shade(color, 0.55), shade(color, -0.35), 1.6));
		});
		add(scene, 'wall', 196, 90, TS, (g) => wall(g, theme));
		add(scene, 'umbrella-0', 160, 160, TS, (g) => umbrella(g, 0, theme));
		add(scene, 'umbrella-1', 160, 160, TS, (g) => umbrella(g, 1, theme));
		if (scene.textures.exists('drop')) return; // the rest never changes
		add(scene, 'drop', 16, 26, TS, (g) => drop(g, 8, 14, 22));
		add(scene, 'drop-white', 16, 26, TS, (g) => drop(g, 8, 14, 22, '#e9fbff', '#7fc8ef', 1.4));
		add(scene, 'blob', 40, 40, TS, (g) => {
			circle(g, 20, 20, 16, radial(g, 20, 20, 18, [[0, '#e9fbff'], [0.5, '#7fdcff'], [1, '#2fa5ef']], 14, 13), INK, 2.5);
			ellipse(g, 14, 13, 5, 3, '#ffffff', null, 0, -0.6);
		});
		add(scene, 'spray', 24, 24, TS, (g) => circle(g, 12, 12, 9, radial(g, 12, 12, 10, [[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(160,230,255,0.8)'], [1, 'rgba(62,197,255,0)']]), null));
		add(scene, 'sparkle', 24, 24, TS, (g) => star(g, 12, 12, 11, 3, 4, '#ffffff', null));
		add(scene, 'star', 34, 34, TS, (g) => star(g, 17, 17, 15, 7, 5, '#ffe14d', INK, 2.5));
		add(scene, 'bubble', 24, 24, TS, (g) => {
			circle(g, 12, 12, 9, 'rgba(200,240,255,0.35)', 'rgba(255,255,255,0.95)', 2);
			ellipse(g, 9, 8, 3, 2, '#ffffff', null);
		});
		add(scene, 'ring-splash', 120, 70, TS, (g) => {
			ellipse(g, 60, 35, 54, 28, null, 'rgba(255,255,255,0.95)', 5);
			ellipse(g, 60, 35, 40, 19, null, 'rgba(160,230,255,0.8)', 3);
		});
		['a', 'b', 'c'].forEach((v, i) => add(scene, `puddle-${v}`, 90, 50, TS, (g) => {
			const R = rng(11 + i);
			for (let k = 0; k < 4; k++) ellipse(g, 30 + R() * 30, 20 + R() * 12, 14 + R() * 12, 8 + R() * 6, 'rgba(62,170,240,0.42)', null);
			ellipse(g, 38, 20, 10, 3, 'rgba(255,255,255,0.55)', null);
		}));
		add(scene, 'shadow', 90, 36, TS, (g) => ellipse(g, 45, 18, 40, 14, 'rgba(10,40,70,0.25)', null));
		add(scene, 'bottle', 50, 70, TS, bottle);
		add(scene, 'gold-tank', 80, 80, TS, goldTank);
		['super', 'shield', 'reverse'].forEach((k) => add(scene, `power-${k}`, 76, 80, TS, (g) => powerIcon(g, k)));
		add(scene, 'shield-bubble', 130, 150, TS, (g) => {
			ellipse(g, 65, 78, 58, 70, radial(g, 65, 78, 72, [[0, 'rgba(200,245,255,0.05)'], [0.8, 'rgba(160,230,255,0.25)'], [1, 'rgba(120,210,255,0.6)']]), 'rgba(255,255,255,0.95)', 3);
			ellipse(g, 44, 40, 14, 8, 'rgba(255,255,255,0.85)', null, 0, -0.6);
		});
		['#ff5d73', '#3ec5ff', '#ffd23f', '#7ed957', '#9b6bff'].forEach((c, i) => add(scene, `balloon-${i}`, 40, 52, TS, (g) => balloon(g, c)));
		add(scene, 'target', 160, 100, TS, (g) => {
			ellipse(g, 80, 50, 74, 44, 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.9)', 4);
			g.setLineDash([10, 8]);
			ellipse(g, 80, 50, 56, 33, null, 'rgba(255,255,255,0.8)', 3);
		});
		add(scene, 'barrel', 80, 100, TS, barrel);
		add(scene, 'duck', 120, 120, TS, duck);
		add(scene, 'donut', 110, 100, TS, (g) => donut(g));
		add(scene, 'palm', 160, 240, TS, palm);
		add(scene, 'tap', 120, 120, TS, tap);
		add(scene, 'slide', 260, 220, TS, slide);
		['ball', 'bucket', 'starfish'].forEach((k) => add(scene, `toy-${k}`, 60, 60, TS, (g) => beachToy(g, k)));
		add(scene, 'sprinkler', 120, 100, TS, sprinkler);
		add(scene, 'sprinkler-arm', 120, 40, TS, sprinklerArm);
		add(scene, 'cannon', 160, 110, TS, cannon);
		add(scene, 'wave', 260, 520, TS, (g) => waveTex(g, 260, 520));
		add(scene, 'bot-face', 120, 150, TS, (g) => {
			drawBody(g, 'duck', '#22c55e', 0);
			drawFace(g, 'happy', true);
		});
		add(scene, 'arrow-wave', 60, 40, TS, (g) => drawArrow(g, '#ffffff'));
		add(scene, 'icon-wave', 80, 70, TS, (g) => {
			// a curling wave
			g.beginPath();
			g.moveTo(4, 62);
			g.quadraticCurveTo(10, 14, 46, 10);
			g.quadraticCurveTo(76, 10, 74, 34);
			g.quadraticCurveTo(62, 22, 50, 32);
			g.quadraticCurveTo(42, 44, 60, 62);
			g.closePath();
			fillStroke(g, linear(g, 0, 10, 0, 62, [[0, '#7fe0ff'], [1, '#1f86d6']]));
			g.beginPath();
			g.moveTo(18, 50);
			g.quadraticCurveTo(22, 24, 46, 18);
			g.lineWidth = 4;
			g.strokeStyle = 'rgba(255,255,255,0.8)';
			g.stroke();
			circle(g, 70, 30, 5, '#ffffff', INK, 2);
		});
		// the spray-button icon: a fat drop
		add(scene, 'icon-drop', 60, 60, TS, (g) => drop(g, 30, 32, 44, linear(g, 0, 10, 0, 54, [[0, '#d9f6ff'], [1, '#2fa5ef']]), INK, 3));
	}

	/* ---------- the floor ---------- */
	function ground(scene, TS, L, theme) {
		const {W, H, pool: P} = L;
		const {c, g} = canvas(W, H, TS);
		const R = rng(42);
		const beach = theme === 'beach';
		if (beach) {
			// warm sand with ripples, shells and footprints
			g.fillStyle = linear(g, 0, 0, 0, H, [[0, '#ffe7b0'], [1, '#f6cf87']]);
			g.fillRect(0, 0, W, H);
			for (let i = 0; i < 50; i++) {
				const x = R() * W, y = R() * H, r = 60 + R() * 160;
				g.fillStyle = radial(g, x, y, r, [[0, i % 2 ? 'rgba(255,248,220,0.4)' : 'rgba(220,170,90,0.2)'], [1, 'rgba(0,0,0,0)']]);
				g.fillRect(x - r, y - r, r * 2, r * 2);
			}
			g.lineWidth = 2;
			g.strokeStyle = 'rgba(200,150,80,0.35)';
			for (let i = 0; i < 70; i++) {
				const x = R() * W, y = R() * H, w = 30 + R() * 50;
				g.beginPath();
				g.moveTo(x, y);
				g.quadraticCurveTo(x + w / 2, y - 6, x + w, y);
				g.stroke();
			}
			for (let i = 0; i < 70; i++) circle(g, R() * W, R() * H, 1.5 + R() * 2, R() > 0.5 ? '#fff6e0' : '#e8b86a', null);
		} else {
			// pale pool-deck tiles with grout lines and a few sunny highlights
			g.fillStyle = '#e3f3f8';
			g.fillRect(0, 0, W, H);
			const T = 64;
			for (let y = 0; y < H; y += T) {
				for (let x = 0; x < W; x += T) {
					const k = ((x / T) + (y / T)) % 2;
					g.fillStyle = k ? '#d5edf5' : '#e9f7fb';
					g.fillRect(x, y, T, T);
				}
			}
			g.lineWidth = 2;
			g.strokeStyle = 'rgba(120,170,195,0.35)';
			for (let x = 0; x <= W; x += T) {
				g.beginPath();
				g.moveTo(x, 0);
				g.lineTo(x, H);
				g.stroke();
			}
			for (let y = 0; y <= H; y += T) {
				g.beginPath();
				g.moveTo(0, y);
				g.lineTo(W, y);
				g.stroke();
			}
			for (let i = 0; i < 26; i++) {
				const x = R() * W, y = R() * H, r = 90 + R() * 160;
				g.fillStyle = radial(g, x, y, r, [[0, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
				g.fillRect(x - r, y - r, r * 2, r * 2);
			}
		}
		// splash pads: painted rings with little nozzles
		L.pads.forEach((p) => {
			ellipse(g, p.x, p.y, 62, 40, beach ? 'rgba(80,190,240,0.25)' : '#bfe9f7', beach ? null : '#7cc6e0', 3);
			ellipse(g, p.x, p.y, 44, 27, null, '#ffffff', 4);
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2;
				circle(g, p.x + Math.cos(a) * 28, p.y + Math.sin(a) * 17, 4, '#ffffff', INK, 1.6);
			}
			circle(g, p.x, p.y, 7, '#ffe14d', INK, 2);
		});
		// refill puddles under the taps
		L.taps.forEach((t) => {
			ellipse(g, t.x, t.y + (t.top ? 54 : -54), 76, 30, 'rgba(62,197,255,0.25)', null);
			ellipse(g, t.x, t.y + (t.top ? 54 : -54), 58, 22, null, 'rgba(255,255,255,0.7)', 3);
		});
		// the pool / lagoon
		if (beach) {
			ellipse(g, P.x, P.y, P.rx + 30, P.ry + 26, '#fff1c8', '#e6bd70', 4);
			ellipse(g, P.x, P.y, P.rx + 10, P.ry + 8, '#bff0ff', null);
			ellipse(g, P.x, P.y, P.rx, P.ry, radial(g, P.x, P.y + 20, P.rx, [[0, '#7fe6ff'], [0.6, '#33c3f0'], [1, '#1594d8']]), '#127ab8', 4);
		} else {
			roundRect(g, P.x - P.rx - 26, P.y - P.ry - 26, (P.rx + 26) * 2, (P.ry + 26) * 2, P.ry + 26);
			fillStroke(g, '#ffffff', '#9cc9da', 4);
			roundRect(g, P.x - P.rx - 8, P.y - P.ry - 8, (P.rx + 8) * 2, (P.ry + 8) * 2, P.ry + 8);
			fillStroke(g, '#5bc0e8', null);
			// the pool walks are ellipse-shaped for the game; drawn as an ellipse with a tiled rim
			ellipse(g, P.x, P.y, P.rx, P.ry, radial(g, P.x, P.y + 20, P.rx, [[0, '#6fe0ff'], [0.6, '#2bb7f0'], [1, '#1488d0']]), '#0f6aa8', 4);
		}
		g.save();
		g.beginPath();
		g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, Math.PI * 2);
		g.clip();
		// caustics: soft wobbly light lines
		g.lineWidth = 3;
		g.strokeStyle = 'rgba(255,255,255,0.35)';
		for (let i = 0; i < 26; i++) {
			const x = P.x - P.rx + R() * P.rx * 2;
			const y = P.y - P.ry + R() * P.ry * 2;
			g.beginPath();
			g.moveTo(x, y);
			g.bezierCurveTo(x + 14, y - 10, x + 26, y + 8, x + 40, y - 2);
			g.stroke();
		}
		if (!beach) {
			// a lane line on the bottom
			roundRect(g, P.x - P.rx * 0.7, P.y - 5, P.rx * 1.4, 10, 5);
			g.fillStyle = 'rgba(15,80,140,0.3)';
			g.fill();
		}
		g.fillStyle = 'rgba(10,60,110,0.18)';
		g.beginPath();
		g.ellipse(P.x, P.y - P.ry + 8, P.rx, 22, 0, 0, Math.PI * 2);
		g.fill();
		g.restore();
		// corner decks: a wooden deck (pool) or a big striped towel (beach) for each player; empty corners are planted
		L.corners.forEach((cn) => {
			const col = cn.player ? cn.player.color : null;
			if (col) {
				g.save();
				g.beginPath();
				g.arc(cn.cx, cn.cy, cn.r, 0, Math.PI * 2);
				g.clip();
				if (beach) {
					g.fillStyle = '#ffffff';
					g.fillRect(cn.cx - cn.r, cn.cy - cn.r, cn.r * 2, cn.r * 2);
					g.fillStyle = col;
					for (let k = -cn.r; k < cn.r; k += 56) g.fillRect(cn.cx + k, cn.cy - cn.r, 28, cn.r * 2);
					g.fillStyle = 'rgba(255,255,255,0.25)';
					g.fillRect(cn.cx - cn.r, cn.cy - cn.r, cn.r * 2, cn.r * 2);
				} else {
					g.fillStyle = '#d9a066';
					g.fillRect(cn.cx - cn.r, cn.cy - cn.r, cn.r * 2, cn.r * 2);
					g.lineWidth = 3;
					g.strokeStyle = '#a8703f';
					for (let k = -cn.r; k < cn.r; k += 30) {
						g.beginPath();
						g.moveTo(cn.cx - cn.r, cn.cy + k);
						g.lineTo(cn.cx + cn.r, cn.cy + k);
						g.stroke();
					}
					for (let k = 0; k < 40; k++) circle(g, cn.cx - cn.r + R() * cn.r * 2, cn.cy - cn.r + Math.floor(R() * 20) * 30 + 15, 1.6, '#8a5a33', null);
				}
				g.restore();
				circle(g, cn.cx, cn.cy, cn.r, null, col, 14);
				circle(g, cn.cx, cn.cy, cn.r + 7, null, INK, 4);
				circle(g, cn.cx, cn.cy, cn.r - 7, null, 'rgba(255,255,255,0.7)', 3);
			} else {
				circle(g, cn.cx, cn.cy, cn.r, beach ? '#9be27a' : '#8fdc79', INK, 4);
				for (let k = 0; k < 30; k++) {
					const a = R() * Math.PI * 2;
					const r = R() * cn.r * 0.9;
					circle(g, cn.cx + Math.cos(a) * r, cn.cy + Math.sin(a) * r, 2 + R() * 3, ['#ffffff', '#ffe14d', '#ff9ec7'][k % 3], null);
				}
			}
		});
		const key = 'ground';
		if (scene.textures.exists(key)) scene.textures.remove(key);
		scene.textures.addCanvas(key, c);
	}

	/* ---------- a portrait for the menus: head and shoulders with a blaster ---------- */
	const portraits = {};
	function portrait(charId, color, expr = 'happy') {
		const key = `${charId}${color}${expr}`;
		if (portraits[key]) return portraits[key];
		const {c, g} = canvas(120, 150, 2);
		drawLegs(g, charId, color, 0);
		drawBody(g, charId, color, 0);
		drawFace(g, expr, charId === 'duck');
		g.save();
		g.translate(60, 104);
		g.rotate(-0.35);
		g.translate(-30, -30);
		drawBlaster(g, 'standard', color, CHARS[charId].skin);
		g.restore();
		portraits[key] = c.toDataURL();

		return portraits[key];
	}

	function blasterIcon(kind, color = '#3ec5ff') {
		const key = `gun${kind}${color}`;
		if (portraits[key]) return portraits[key];
		const {c, g} = canvas(120, 60, 2);
		drawBlaster(g, kind, color, '#f3d3b5');
		portraits[key] = c.toDataURL();

		return portraits[key];
	}

	WB.Art = {build, ground, portrait, blasterIcon, EXPRS};
})();
