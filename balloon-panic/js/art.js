/* Balloon Panic: all the artwork, drawn in code (no picture files).
   Everything is painted once onto small canvases at the screen's sharpness (BP.Z) and handed to Phaser as textures.
   The buddies are cut-out puppets: every part (ear, head, eye, arm...) is its own texture, so the rig in
   players.js can move them freely.
     BP.Art.build(scene, L)            make every texture (again only when the screen's sharpness changed)
     BP.Art.add(scene, key, x, y)      an image with the part's own pivot, at game-unit size
     BP.Art.sc(img, sx, sy)            scale an image made by add()
     BP.Art.portrait(species, color)   a still picture of a buddy (a data URL) for the results card
     BP.Art.SPECIES                    the cast */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const INK = '#24124d';
	const TAU = Math.PI * 2;

	/* ---------- colour helpers ---------- */
	const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	const mix = (a, b, t) => {
		const A = rgb(a);
		const B = rgb(b);

		return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
	};
	const lighten = (c, t) => mix(c, '#ffffff', t);
	const darken = (c, t) => mix(c, '#1a0b3d', t);
	const num = (hex) => parseInt(hex.slice(1), 16);

	// a soft "lit from the top left" fill for a round form
	function lit(c, col, x, y, r) {
		const g = c.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.08, x, y, r * 1.15);
		g.addColorStop(0, lighten(col, 0.38));
		g.addColorStop(0.55, col);
		g.addColorStop(1, darken(col, 0.2));

		return g;
	}

	const ell = (c, x, y, rx, ry, rot = 0) => {
		c.beginPath();
		c.ellipse(x, y, rx, ry, rot, 0, TAU);
	};
	const ink = (c, w = 5) => {
		c.lineWidth = w;
		c.strokeStyle = INK;
		c.stroke();
	};
	// fill a shape, paint things inside it (clipped), then ink its outline
	function form(c, trace, fill, inside, w = 5) {
		trace();
		c.fillStyle = fill;
		c.fill();
		if (inside) {
			c.save();
			c.clip();
			inside();
			c.restore();
			trace();
		}
		if (w) ink(c, w);
	}

	function rrect(c, x, y, w, h, r) {
		c.beginPath();
		c.roundRect(x, y, w, h, r);
	}

	// one silhouette made of several shapes: outline them all first, then fill them all, so the ink runs only round the outside
	function union(c, shapes, fill, w = 5) {
		c.lineWidth = w * 2;
		c.strokeStyle = INK;
		shapes.forEach((s) => {
			s();
			c.stroke();
		});
		c.fillStyle = fill;
		shapes.forEach((s) => {
			s();
			c.fill();
		});
	}

	function star(c, x, y, R, r, n = 5, rot = -Math.PI / 2) {
		c.beginPath();
		for (let i = 0; i < n * 2; i++) {
			const a = rot + (i * Math.PI) / n;
			const d = i % 2 ? r : R;
			c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * d, y + Math.sin(a) * d);
		}
		c.closePath();
	}

	// a small repeatable random, so the background looks the same every time
	function seeded(seed) {
		let s = seed;

		return () => {
			s = (s * 16807) % 2147483647;

			return (s - 1) / 2147483646;
		};
	}

	/* ---------- the cast ---------- */
	const SPECIES = {
		bunny: {main: '#ff8fc0', dark: '#e2559b', light: '#fff1f7', ear: 'long', eye: [29, -8], mouth: [0, 34], pitch: 1.25},
		bear: {main: '#cf8f4f', dark: '#9a5f2a', light: '#f8dfb8', ear: 'round', eye: [29, -10], mouth: [0, 36], pitch: 0.8},
		frog: {main: '#62d65c', dark: '#2f9e3f', light: '#e6ffc2', ear: 'none', eye: [36, -34], mouth: [0, 32], mouthScale: 1.3, pitch: 0.95},
		fox: {main: '#ff8a3d', dark: '#d65c16', light: '#fff3e0', ear: 'point', eye: [29, -10], mouth: [0, 36], tail: true, pitch: 1.1},
		panda: {main: '#fbf9ff', dark: '#3d3557', light: '#ffffff', ear: 'round', eye: [30, -6], mouth: [0, 36], limb: '#3d3557', pitch: 0.9},
		chick: {main: '#ffd84a', dark: '#f0a31a', light: '#fff5bd', ear: 'tuft', eye: [27, -10], mouth: [0, 20], beak: true, foot: '#ff9a2e', pitch: 1.4}
	};
	const CAST = Object.keys(SPECIES);

	/* ---------- puppet parts: {w, h, ox, oy, draw(c, spec)}; drawn with the pivot at 0,0 ---------- */
	const PARTS = {
		body: {
			w: 132, h: 126, ox: 66, oy: 64,
			draw(c, sp) {
				form(c, () => {
					c.beginPath();
					c.moveTo(0, -54);
					c.bezierCurveTo(44, -54, 58, -10, 57, 18);
					c.bezierCurveTo(55, 46, 30, 55, 0, 55);
					c.bezierCurveTo(-30, 55, -55, 46, -57, 18);
					c.bezierCurveTo(-58, -10, -44, -54, 0, -54);
					c.closePath();
				}, lit(c, sp.main, 0, 0, 62), () => {
					ell(c, 0, 22, 33, 31);
					c.fillStyle = sp.light;
					c.fill();
				});
			}
		},
		arm: {
			w: 48, h: 96, ox: 24, oy: 14,
			draw(c, sp) {
				const col = sp.limb || sp.main;
				union(c, [() => rrect(c, -12, -8, 24, 66, 12), () => ell(c, 0, 62, 16, 16)], lit(c, col, 0, 30, 46));
				// the paw's little shine
				ell(c, -4, 57, 5, 4);
				c.fillStyle = 'rgba(255,255,255,.35)';
				c.fill();
			}
		},
		foot: {
			w: 72, h: 46, ox: 36, oy: 24,
			draw(c, sp) {
				ell(c, 0, 0, 29, 16);
				c.fillStyle = lit(c, sp.foot || sp.limb || sp.dark, 0, 0, 28);
				c.fill();
				ink(c);
			}
		},
		tail: {
			w: 104, h: 124, ox: 14, oy: 110,
			draw(c, sp) {
				form(c, () => {
					c.beginPath();
					c.moveTo(0, 0);
					c.bezierCurveTo(26, -14, 84, -30, 74, -86);
					c.bezierCurveTo(60, -112, 14, -70, 0, 0);
					c.closePath();
				}, lit(c, sp.main, 40, -50, 60), () => {
					ell(c, 70, -92, 30, 30);
					c.fillStyle = sp.light;
					c.fill();
				});
			}
		},
		ear: {
			w: 84, h: 150, ox: 42, oy: 138,
			draw(c, sp) {
				if (sp.ear === 'long') {
					ell(c, 0, -68, 21, 64);
					c.fillStyle = lit(c, sp.main, 0, -68, 60);
					c.fill();
					ink(c);
					ell(c, 0, -62, 10, 46);
					c.fillStyle = lighten(sp.dark, 0.45);
					c.fill();
				} else if (sp.ear === 'round') {
					const col = sp.limb || sp.main;
					ell(c, 0, -16, 29, 29);
					c.fillStyle = lit(c, col, 0, -16, 30);
					c.fill();
					ink(c);
					if (!sp.limb) {
						ell(c, 0, -14, 15, 15);
						c.fillStyle = sp.light;
						c.fill();
					}
				} else if (sp.ear === 'point') {
					form(c, () => {
						c.beginPath();
						c.moveTo(-30, 6);
						c.quadraticCurveTo(-28, -52, 2, -84);
						c.quadraticCurveTo(28, -46, 30, 6);
						c.closePath();
					}, lit(c, sp.main, 0, -30, 60), () => {
						ell(c, 2, -86, 22, 26);
						c.fillStyle = darken(sp.dark, 0.5);
						c.fill();
					});
					c.beginPath();
					c.moveTo(-13, 2);
					c.quadraticCurveTo(-10, -32, 2, -50);
					c.quadraticCurveTo(13, -30, 14, 2);
					c.closePath();
					c.fillStyle = sp.light;
					c.fill();
				} else if (sp.ear === 'tuft') {
					union(c, [-0.55, 0, 0.55].map((a) => () => ell(c, Math.sin(a) * 22, -20 - Math.cos(a) * 10, 9, 22, a)), sp.dark, 4.5);
				}
			}
		},
		head: {
			w: 204, h: 190, ox: 102, oy: 100,
			draw(c, sp, name) {
				const blush = (x, y, col = 'rgba(255,70,120,.32)') => {
					ell(c, x, y, 13, 8);
					c.fillStyle = col;
					c.fill();
					ell(c, -x, y, 13, 8);
					c.fill();
				};
				const nose = (y, rx = 10, ry = 7, col = INK) => {
					ell(c, 0, y, rx, ry);
					c.fillStyle = col;
					c.fill();
					ell(c, -rx * 0.3, y - ry * 0.35, rx * 0.3, ry * 0.25);
					c.fillStyle = 'rgba(255,255,255,.6)';
					c.fill();
				};
				if (name === 'frog') {
					const shapes = [() => ell(c, 0, 12, 80, 52), () => ell(c, -36, -32, 31, 31), () => ell(c, 36, -32, 31, 31)];
					union(c, shapes, lit(c, sp.main, 0, 0, 86));
					c.save();
					ell(c, 0, 12, 80, 52);
					c.clip();
					ell(c, 0, 58, 66, 30);
					c.fillStyle = sp.light;
					c.fill();
					c.restore();
					c.fillStyle = sp.dark;
					ell(c, -8, 6, 3, 2.4);
					c.fill();
					ell(c, 8, 6, 3, 2.4);
					c.fill();
					blush(54, 22, 'rgba(255,90,90,.3)');

					return;
				}
				const trace = () => {
					if (name === 'fox') {
						c.beginPath();
						c.moveTo(0, -60);
						c.bezierCurveTo(48, -60, 68, -28, 70, -2);
						c.lineTo(90, 24);
						c.quadraticCurveTo(58, 54, 0, 62);
						c.quadraticCurveTo(-58, 54, -90, 24);
						c.lineTo(-70, -2);
						c.bezierCurveTo(-68, -28, -48, -60, 0, -60);
						c.closePath();
					} else {
						const dims = {bunny: [72, 62], bear: [75, 64], panda: [76, 64], chick: [69, 64]}[name];
						ell(c, 0, 0, dims[0], dims[1]);
					}
				};
				trace();
				c.fillStyle = lit(c, sp.main, 0, 0, 78);
				c.fill();
				c.save();
				c.clip();
				if (name === 'bunny') {
					ell(c, 0, 30, 35, 25);
					c.fillStyle = sp.light;
					c.fill();
				} else if (name === 'bear') {
					ell(c, 0, 28, 37, 28);
					c.fillStyle = sp.light;
					c.fill();
				} else if (name === 'fox') {
					c.fillStyle = sp.light;
					ell(c, -50, 40, 50, 36, 0.35);
					c.fill();
					ell(c, 50, 40, 50, 36, -0.35);
					c.fill();
				} else if (name === 'panda') {
					c.fillStyle = sp.dark;
					ell(c, -31, -5, 22, 28, 0.38);
					c.fill();
					ell(c, 31, -5, 22, 28, -0.38);
					c.fill();
				}
				c.restore();
				trace();
				ink(c);
				if (name === 'bunny') {
					nose(15, 8, 6, sp.dark);
					blush(50, 20);
				} else if (name === 'bear') {
					nose(14, 12, 8.5, '#4a2a12');
					blush(54, 18, 'rgba(255,90,70,.28)');
				} else if (name === 'fox') {
					nose(16, 10, 7.5);
				} else if (name === 'panda') {
					nose(16, 9, 6.5);
					blush(52, 26, 'rgba(255,110,150,.4)');
				} else if (name === 'chick') {
					blush(46, 16, 'rgba(255,110,40,.4)');
				}
			}
		}
	};

	/* ---------- faces: eyes and mouths are shared by the whole cast (and by the silly bomb) ---------- */
	const FACE = {
		eye: {
			w: 54, h: 62, ox: 27, oy: 31,
			draw(c) {
				form(c, () => ell(c, 0, 0, 19, 24), '#fff', () => {
					ell(c, 0, -30, 30, 16);
					c.fillStyle = 'rgba(36,18,77,.12)';
					c.fill();
				}, 4);
			}
		},
		pupil: {
			w: 30, h: 30, ox: 15, oy: 15,
			draw(c) {
				ell(c, 0, 0, 10.5, 11.5);
				c.fillStyle = INK;
				c.fill();
				ell(c, -3.6, -4.2, 3.8, 3.8);
				c.fillStyle = '#fff';
				c.fill();
				ell(c, 3.4, 4, 1.7, 1.7);
				c.fillStyle = 'rgba(255,255,255,.7)';
				c.fill();
			}
		},
		'eye-happy': {
			w: 54, h: 40, ox: 27, oy: 24,
			draw(c) {
				c.beginPath();
				c.moveTo(-17, 8);
				c.quadraticCurveTo(0, -22, 17, 8);
				ink(c, 6.5);
			}
		},
		'eye-shut': {
			w: 54, h: 30, ox: 27, oy: 12,
			draw(c) {
				c.beginPath();
				c.moveTo(-17, -2);
				c.quadraticCurveTo(0, 13, 17, -2);
				ink(c, 6.5);
			}
		},
		// squeezed tight: > <
		'eye-squeeze': {
			w: 54, h: 44, ox: 27, oy: 22,
			draw(c) {
				c.beginPath();
				c.moveTo(-14, -13);
				c.lineTo(10, 0);
				c.lineTo(-14, 13);
				ink(c, 6.5);
			}
		},
		brow: {
			w: 40, h: 16, ox: 20, oy: 8,
			draw(c) {
				rrect(c, -15, -4.5, 30, 9, 4.5);
				c.fillStyle = INK;
				c.fill();
			}
		},
		'm-smile': {
			w: 60, h: 34, ox: 30, oy: 10,
			draw(c) {
				c.beginPath();
				c.moveTo(-19, -3);
				c.quadraticCurveTo(0, 19, 19, -3);
				ink(c, 5.5);
			}
		},
		'm-open': {
			w: 68, h: 54, ox: 34, oy: 14,
			draw(c) {
				form(c, () => {
					c.beginPath();
					c.moveTo(-25, -8);
					c.lineTo(25, -8);
					c.quadraticCurveTo(25, 30, 0, 30);
					c.quadraticCurveTo(-25, 30, -25, -8);
					c.closePath();
				}, '#7a1b3f', () => {
					ell(c, 0, 26, 15, 11);
					c.fillStyle = '#ff7a9c';
					c.fill();
					c.fillStyle = '#fff';
					c.fillRect(-18, -8, 36, 8);
				}, 4.5);
			}
		},
		'm-o': {
			w: 44, h: 50, ox: 22, oy: 20,
			draw(c) {
				ell(c, 0, 4, 12, 16);
				c.fillStyle = '#7a1b3f';
				c.fill();
				ink(c, 4.5);
			}
		},
		// teeth gritted in a wobbly panic
		'm-panic': {
			w: 76, h: 44, ox: 38, oy: 18,
			draw(c) {
				c.beginPath();
				c.moveTo(-28, -8);
				c.quadraticCurveTo(-14, -15, 0, -8);
				c.quadraticCurveTo(14, -1, 28, -8);
				c.lineTo(28, 10);
				c.quadraticCurveTo(14, 18, 0, 11);
				c.quadraticCurveTo(-14, 4, -28, 11);
				c.closePath();
				c.fillStyle = '#fff';
				c.fill();
				ink(c, 4.5);
				c.save();
				c.clip();
				c.lineWidth = 2.6;
				c.strokeStyle = INK;
				c.beginPath();
				for (let x = -19; x <= 19; x += 9.5) {
					c.moveTo(x, -16);
					c.lineTo(x, 20);
				}
				c.stroke();
				c.restore();
			}
		},
		'm-tongue': {
			w: 60, h: 56, ox: 30, oy: 12,
			draw(c) {
				rrect(c, -10, 0, 20, 30, 10);
				c.fillStyle = '#ff6f91';
				c.fill();
				ink(c, 4.5);
				c.beginPath();
				c.moveTo(0, 8);
				c.lineTo(0, 22);
				c.lineWidth = 2.6;
				c.strokeStyle = '#d94a70';
				c.stroke();
				c.beginPath();
				c.moveTo(-20, -4);
				c.quadraticCurveTo(0, 12, 20, -4);
				ink(c, 5.5);
			}
		},
		'm-wail': {
			w: 64, h: 66, ox: 32, oy: 22,
			draw(c) {
				form(c, () => {
					c.beginPath();
					c.moveTo(-18, -12);
					c.quadraticCurveTo(0, -20, 18, -12);
					c.quadraticCurveTo(30, 36, 0, 36);
					c.quadraticCurveTo(-30, 36, -18, -12);
					c.closePath();
				}, '#7a1b3f', () => {
					ell(c, 0, 34, 16, 12);
					c.fillStyle = '#ff7a9c';
					c.fill();
				}, 4.5);
			}
		},
		'm-grin': {
			w: 68, h: 44, ox: 34, oy: 14,
			draw(c) {
				c.beginPath();
				c.moveTo(-25, -7);
				c.quadraticCurveTo(0, 1, 25, -7);
				c.quadraticCurveTo(18, 22, 0, 22);
				c.quadraticCurveTo(-18, 22, -25, -7);
				c.closePath();
				c.fillStyle = '#fff';
				c.fill();
				ink(c, 4.5);
				c.beginPath();
				c.moveTo(-20, 7);
				c.quadraticCurveTo(0, 13, 20, 7);
				c.lineWidth = 2.4;
				c.stroke();
			}
		},
		'beak-0': {
			w: 52, h: 40, ox: 26, oy: 18,
			draw(c) {
				c.beginPath();
				c.moveTo(-18, 0);
				c.quadraticCurveTo(0, -15, 18, 0);
				c.quadraticCurveTo(0, 17, -18, 0);
				c.closePath();
				c.fillStyle = lit(c, '#ff9a2e', 0, 0, 20);
				c.fill();
				ink(c, 4.5);
				c.beginPath();
				c.moveTo(-14, 1);
				c.quadraticCurveTo(0, 6, 14, 1);
				c.lineWidth = 2.6;
				c.stroke();
			}
		},
		'beak-1': {
			w: 56, h: 64, ox: 28, oy: 24,
			draw(c) {
				ell(c, 0, 8, 14, 17);
				c.fillStyle = '#7a1b3f';
				c.fill();
				ink(c, 4.5);
				c.fillStyle = lit(c, '#ff9a2e', 0, 0, 22);
				c.beginPath();
				c.moveTo(-19, -4);
				c.quadraticCurveTo(0, -22, 19, -4);
				c.quadraticCurveTo(0, 2, -19, -4);
				c.closePath();
				c.fill();
				ink(c, 4.5);
				c.beginPath();
				c.moveTo(-16, 20);
				c.quadraticCurveTo(0, 40, 16, 20);
				c.quadraticCurveTo(0, 24, -16, 20);
				c.closePath();
				c.fill();
				ink(c, 4.5);
			}
		}
	};

	// each player's neckerchief, in their own colour: it is how you tell whose buddy is whose
	const SCARF = {
		w: 136, h: 62, ox: 68, oy: 12,
		draw(c, col) {
			const shapes = [
				() => {
					c.beginPath();
					c.moveTo(-52, -2);
					c.quadraticCurveTo(0, 22, 52, -2);
					c.lineTo(48, 15);
					c.quadraticCurveTo(0, 40, -48, 15);
					c.closePath();
				},
				() => {
					c.beginPath();
					c.moveTo(26, 16);
					c.lineTo(58, 44);
					c.lineTo(28, 40);
					c.closePath();
				}
			];
			union(c, shapes, lit(c, col, 0, 10, 60), 4.5);
			c.beginPath();
			c.moveTo(-40, 8);
			c.quadraticCurveTo(0, 28, 40, 8);
			c.lineWidth = 3;
			c.strokeStyle = 'rgba(255,255,255,.45)';
			c.stroke();
		}
	};

	/* ---------- the balloon ---------- */
	const BALLOONS = [
		{col: '#ffc928', pat: 'dots'},
		{col: '#7be04b', pat: 'stripes'},
		{col: '#2fe0c0', pat: 'stars'},
		{col: '#ff5fd2', pat: 'zig'}
	];

	function balloonPath(c) {
		c.beginPath();
		c.moveTo(0, 110);
		c.bezierCurveTo(-58, 100, -104, 42, -104, -8);
		c.bezierCurveTo(-104, -72, -56, -110, 0, -110);
		c.bezierCurveTo(56, -110, 104, -72, 104, -8);
		c.bezierCurveTo(104, 42, 58, 100, 0, 110);
		c.closePath();
	}

	function drawBalloon(c, {col, pat}) {
		// the knot first, so the body sits on top of it
		c.beginPath();
		c.moveTo(-5, 104);
		c.lineTo(-17, 132);
		c.quadraticCurveTo(0, 124, 17, 132);
		c.lineTo(5, 104);
		c.closePath();
		c.fillStyle = darken(col, 0.18);
		c.fill();
		ink(c);
		balloonPath(c);
		const g = c.createRadialGradient(-38, -48, 8, 0, 0, 132);
		g.addColorStop(0, lighten(col, 0.55));
		g.addColorStop(0.45, col);
		g.addColorStop(1, darken(col, 0.3));
		c.fillStyle = g;
		c.fill();
		c.save();
		c.clip();
		// the pattern, printed on the rubber
		c.fillStyle = 'rgba(255,255,255,.34)';
		c.strokeStyle = 'rgba(255,255,255,.34)';
		if (pat === 'dots') {
			for (let y = -100; y <= 110; y += 42) {
				for (let x = -110 + ((y / 42) % 2 ? 21 : 0); x <= 110; x += 42) {
					ell(c, x, y, 9, 9);
					c.fill();
				}
			}
		} else if (pat === 'stripes') {
			c.lineWidth = 18;
			for (let y = -90; y <= 100; y += 46) {
				c.beginPath();
				c.moveTo(-120, y + 14);
				c.quadraticCurveTo(0, y - 16, 120, y + 14);
				c.stroke();
			}
		} else if (pat === 'stars') {
			[[-52, -30], [30, -64], [56, 8], [-18, 36], [-66, 52], [26, 78], [-8, -84]].forEach(([x, y], i) => {
				star(c, x, y, 15, 7, 5, i);
				c.fill();
			});
		} else {
			c.lineWidth = 12;
			for (let y = -76; y <= 90; y += 50) {
				c.beginPath();
				for (let x = -120; x <= 120; x += 30) c[x === -120 ? 'moveTo' : 'lineTo'](x, y + ((x / 30) % 2 ? -14 : 14));
				c.stroke();
			}
		}
		// the darker edge on the shadow side
		const rim = c.createRadialGradient(-20, -24, 70, 0, 0, 128);
		rim.addColorStop(0, 'rgba(26,11,61,0)');
		rim.addColorStop(1, 'rgba(26,11,61,.38)');
		c.fillStyle = rim;
		c.fillRect(-120, -120, 240, 250);
		// light bouncing back from below
		ell(c, 46, 74, 46, 14, -0.6);
		c.fillStyle = 'rgba(255,255,255,.2)';
		c.fill();
		c.restore();
		balloonPath(c);
		ink(c);
		// the shine
		ell(c, -46, -54, 15, 30, 0.62);
		c.fillStyle = 'rgba(255,255,255,.82)';
		c.fill();
		ell(c, -68, -8, 5, 9, 0.2);
		c.fill();
	}

	// rubber stretched thin: paler in the middle, with stress lines (faded in as the balloon gets huge)
	function drawStrain(c) {
		balloonPath(c);
		c.save();
		c.clip();
		const g = c.createRadialGradient(0, -6, 10, 0, 0, 118);
		g.addColorStop(0, 'rgba(255,255,255,.62)');
		g.addColorStop(0.7, 'rgba(255,255,255,.3)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g;
		c.fillRect(-120, -120, 240, 250);
		c.lineWidth = 3;
		c.strokeStyle = 'rgba(255,255,255,.7)';
		for (let i = 0; i < 9; i++) {
			const a = (i / 9) * TAU + 0.3;
			c.beginPath();
			c.moveTo(Math.cos(a) * 52, Math.sin(a) * 52 - 4);
			c.lineTo(Math.cos(a + 0.08) * 92, Math.sin(a + 0.08) * 94 - 4);
			c.stroke();
		}
		c.restore();
	}

	// sticky slime dripping over the top
	function drawGoo(c) {
		const shapes = [() => {
			c.beginPath();
			c.moveTo(-100, -20);
			c.bezierCurveTo(-100, -80, -54, -116, 0, -116);
			c.bezierCurveTo(54, -116, 100, -80, 100, -20);
			c.quadraticCurveTo(60, -40, 0, -36);
			c.quadraticCurveTo(-60, -40, -100, -20);
			c.closePath();
		}, ...[[-78, -16, 15, 34], [-34, -24, 16, 50], [14, -26, 14, 30], [58, -22, 17, 46], [88, -12, 11, 22]].map(([x, y, w, h]) => () => rrect(c, x - w, y, w * 2, h + 20, w))];
		union(c, shapes, lit(c, '#9be33a', 0, -60, 110), 4.5);
		c.fillStyle = 'rgba(255,255,255,.55)';
		ell(c, -40, -84, 12, 6, -0.5);
		c.fill();
		ell(c, 58, 14, 5, 9);
		c.fill();
	}

	/* ---------- the silly bomb: a round toy with a worried face ---------- */
	function drawBomb(c) {
		// the cap
		c.save();
		c.rotate(0.38);
		rrect(c, -24, -122, 48, 36, 9);
		c.fillStyle = lit(c, '#a99bff', 0, -104, 34);
		c.fill();
		ink(c);
		c.restore();
		ell(c, 0, 0, 100, 100);
		const g = c.createRadialGradient(-36, -44, 8, 0, 0, 120);
		g.addColorStop(0, '#8d86c9');
		g.addColorStop(0.42, '#4a4488');
		g.addColorStop(1, '#231d55');
		c.fillStyle = g;
		c.fill();
		c.save();
		c.clip();
		// a cool light on the far edge, so the round shape reads against a dark room
		c.beginPath();
		c.arc(0, 0, 91, 0.2, 1.9);
		c.lineWidth = 12;
		c.strokeStyle = 'rgba(120,220,255,.45)';
		c.stroke();
		c.restore();
		ell(c, 0, 0, 100, 100);
		ink(c);
		ell(c, -44, -52, 14, 27, 0.66);
		c.fillStyle = 'rgba(255,255,255,.7)';
		c.fill();
		ell(c, -66, -10, 5, 8, 0.2);
		c.fill();
	}

	/* ---------- podiums, buttons and signs ---------- */
	function drawPodium(c, col) {
		// the side of the drum
		c.beginPath();
		c.moveTo(-122, 0);
		c.lineTo(-122, 34);
		c.bezierCurveTo(-122, 66, 122, 66, 122, 34);
		c.lineTo(122, 0);
		c.closePath();
		const side = c.createLinearGradient(-122, 0, 122, 0);
		side.addColorStop(0, darken(col, 0.42));
		side.addColorStop(0.5, darken(col, 0.18));
		side.addColorStop(1, darken(col, 0.48));
		c.fillStyle = side;
		c.fill();
		ink(c);
		// the top
		ell(c, 0, 0, 122, 40);
		const top = c.createLinearGradient(0, -40, 0, 40);
		top.addColorStop(0, lighten(col, 0.32));
		top.addColorStop(1, col);
		c.fillStyle = top;
		c.fill();
		ink(c);
		ell(c, 0, 0, 100, 30);
		c.setLineDash([2, 17]);
		c.lineWidth = 7;
		c.strokeStyle = 'rgba(255,255,255,.75)';
		c.stroke();
		c.setLineDash([]);
	}

	// the prank button: a cheeky face sticking its tongue out
	function drawPrank(c, col) {
		ell(c, 0, 5, 46, 46);
		c.fillStyle = darken(col, 0.45);
		c.fill();
		ink(c);
		ell(c, 0, -2, 46, 46);
		c.fillStyle = lit(c, col, 0, -2, 46);
		c.fill();
		ink(c);
		c.lineWidth = 5.5;
		c.strokeStyle = '#fff';
		c.beginPath();
		c.moveTo(-23, -14);
		c.quadraticCurveTo(-15, -24, -7, -14);
		c.stroke();
		c.beginPath();
		c.moveTo(8, -18);
		c.lineTo(23, -13);
		c.stroke();
		c.beginPath();
		c.moveTo(-20, 3);
		c.quadraticCurveTo(0, 20, 20, 3);
		c.stroke();
		rrect(c, -8, 8, 16, 21, 8);
		c.fillStyle = '#fff';
		c.fill();
	}

	function drawShield(c) {
		ell(c, 0, 0, 150, 150);
		const g = c.createRadialGradient(0, 0, 70, 0, 0, 150);
		g.addColorStop(0, 'rgba(140,235,255,.04)');
		g.addColorStop(0.8, 'rgba(140,235,255,.3)');
		g.addColorStop(1, 'rgba(255,255,255,.75)');
		c.fillStyle = g;
		c.fill();
		c.lineWidth = 5;
		c.strokeStyle = 'rgba(255,255,255,.9)';
		c.stroke();
		c.beginPath();
		c.arc(0, 0, 124, 3.5, 4.6);
		c.lineWidth = 12;
		c.strokeStyle = 'rgba(255,255,255,.85)';
		c.stroke();
		c.beginPath();
		c.arc(0, 0, 124, 0.5, 0.9);
		c.lineWidth = 8;
		c.stroke();
	}

	// the big comic "pow" shape
	function drawBurst(c) {
		const spiky = (R, r, n, rot) => {
			c.beginPath();
			for (let i = 0; i < n * 2; i++) {
				const a = rot + (i * Math.PI) / n;
				const d = i % 2 ? r : R * (i % 4 ? 1 : 0.86);
				c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * d, Math.sin(a) * d);
			}
			c.closePath();
		};
		spiky(150, 86, 12, 0.1);
		c.fillStyle = '#ff9417';
		c.fill();
		ink(c, 6);
		spiky(112, 62, 12, 0.3);
		c.fillStyle = '#ffd23f';
		c.fill();
		spiky(70, 36, 10, 0);
		c.fillStyle = '#fffbe0';
		c.fill();
	}

	function drawAfro(c) {
		const rnd = seeded(7);
		const puffs = [];
		for (let i = 0; i < 16; i++) {
			const a = Math.PI + (i / 15) * Math.PI;
			puffs.push([Math.cos(a) * 112, Math.sin(a) * 86 + 10, 40 + rnd() * 12]);
		}
		for (let i = 0; i < 9; i++) puffs.push([(i - 4) * 26, -40 - rnd() * 30, 46]);
		puffs.push([-118, 44, 34], [118, 44, 34], [0, 0, 74], [-62, -4, 60], [62, -4, 60]);
		union(c, puffs.map(([x, y, r]) => () => ell(c, x, y, r, r)), '#f4f1ff', 5);
		// curls: little shaded arcs, so the wig looks fluffy when it is tinted
		c.lineWidth = 5;
		c.strokeStyle = 'rgba(36,18,77,.2)';
		for (let i = 0; i < 26; i++) {
			const x = (rnd() - 0.5) * 230;
			const y = -92 + rnd() * 130;
			c.beginPath();
			c.arc(x, y, 12 + rnd() * 8, rnd() * TAU, rnd() * TAU + 2.4);
			c.stroke();
		}
		c.fillStyle = 'rgba(255,255,255,.7)';
		ell(c, -60, -70, 26, 12, -0.5);
		c.fill();
	}

	// hair standing on end
	function drawSpikes(c) {
		const shapes = [];
		for (let i = 0; i < 9; i++) {
			const a = -Math.PI / 2 + (i - 4) * 0.27;
			const len = 96 + (i % 2) * 34;
			shapes.push(() => {
				c.beginPath();
				c.moveTo(Math.cos(a - 0.2) * 44, Math.sin(a - 0.2) * 44);
				c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
				c.lineTo(Math.cos(a + 0.2) * 44, Math.sin(a + 0.2) * 44);
				c.closePath();
			});
		}
		shapes.push(() => ell(c, 0, -30, 62, 26));
		union(c, shapes, '#f4f1ff', 5);
	}

	function drawHat(c) {
		form(c, () => {
			c.beginPath();
			c.moveTo(-40, 0);
			c.lineTo(0, -92);
			c.lineTo(40, 0);
			c.quadraticCurveTo(0, 14, -40, 0);
			c.closePath();
		}, '#ff5fd2', () => {
			c.lineWidth = 11;
			c.strokeStyle = '#ffd23f';
			for (let y = -70; y < 20; y += 30) {
				c.beginPath();
				c.moveTo(-50, y + 14);
				c.lineTo(50, y - 14);
				c.stroke();
			}
		});
		ell(c, 0, -94, 13, 13);
		c.fillStyle = '#fff';
		c.fill();
		ink(c, 4.5);
	}

	/* ---------- the room: a bright, happy place outdoors, a different one each time ----------
	   meadow  a sunny field of flowers under a blue sky, rolling green hills
	   forest  a sunny glade: round trees, mushrooms and soft beams of sunlight
	   beach   blue sea, golden sand, palm trees and a beach umbrella
	   rainbow a pastel park with a big rainbow and lollipop trees
	   The buddies stand on the grass (or sand); the sky is behind the ones at the back. */
	const THEMES = ['meadow', 'forest', 'beach', 'rainbow'];

	function sky(c, W, top, mid, bottom, horizon) {
		const g = c.createLinearGradient(0, 0, 0, horizon);
		g.addColorStop(0, top);
		g.addColorStop(0.6, mid);
		g.addColorStop(1, bottom);
		c.fillStyle = g;
		c.fillRect(0, 0, W, horizon + 4);
	}

	function sun(c, x, y, r) {
		const halo = c.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
		halo.addColorStop(0, 'rgba(255,246,170,.75)');
		halo.addColorStop(1, 'rgba(255,246,170,0)');
		c.fillStyle = halo;
		c.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
		c.save();
		c.translate(x, y);
		c.strokeStyle = 'rgba(255,214,60,.55)';
		c.lineWidth = 9;
		c.lineCap = 'round';
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * TAU;
			c.beginPath();
			c.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
			c.lineTo(Math.cos(a) * r * 1.7, Math.sin(a) * r * 1.7);
			c.stroke();
		}
		c.restore();
		ell(c, x, y, r, r);
		c.fillStyle = '#ffe14d';
		c.fill();
		ink(c, 5);
		// a happy face on the sun
		c.fillStyle = INK;
		ell(c, x - r * 0.32, y - r * 0.1, r * 0.09, r * 0.13);
		c.fill();
		ell(c, x + r * 0.32, y - r * 0.1, r * 0.09, r * 0.13);
		c.fill();
		c.beginPath();
		c.arc(x, y + r * 0.1, r * 0.38, 0.15 * Math.PI, 0.85 * Math.PI);
		c.lineWidth = 5;
		c.strokeStyle = INK;
		c.stroke();
		ell(c, x - r * 0.55, y + r * 0.2, r * 0.14, r * 0.09);
		ell(c, x + r * 0.55, y + r * 0.2, r * 0.14, r * 0.09);
		c.fillStyle = 'rgba(255,120,120,.55)';
		c.fill();
	}

	// a puffy cartoon cloud (one path, filled once, outlined)
	function cloud(c, x, y, s, fill = '#ffffff') {
		c.beginPath();
		[[0, 0, 46], [-50, 12, 34], [50, 10, 36], [-22, -24, 32], [24, -22, 34]].forEach(([dx, dy, r]) => {
			c.moveTo(x + (dx + r) * s, y + dy * s);
			c.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
		});
		c.fillStyle = 'rgba(30,60,120,.12)';
		c.save();
		c.translate(0, 8 * s);
		c.fill();
		c.restore();
		c.fillStyle = fill;
		c.fill();
	}

	// a soft rolling hill line across the screen, filled down to the bottom
	function hills(c, W, H, y, amp, waves, phase, fill) {
		c.beginPath();
		c.moveTo(0, H);
		for (let x = 0; x <= W; x += 20) c.lineTo(x, y - Math.sin((x / W) * waves * TAU + phase) * amp - Math.sin((x / W) * waves * 2.3 * TAU) * amp * 0.25);
		c.lineTo(W, H);
		c.closePath();
		c.fillStyle = fill;
		c.fill();
	}

	function flower(c, x, y, s, petal) {
		for (let k = 0; k < 5; k++) {
			const a = (k / 5) * TAU;
			ell(c, x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, 5 * s, 5 * s);
			c.fillStyle = petal;
			c.fill();
		}
		ell(c, x, y, 4 * s, 4 * s);
		c.fillStyle = '#ffd23f';
		c.fill();
	}

	function grassTufts(c, W, H, top, rnd, col, n = 160) {
		c.strokeStyle = col;
		c.lineWidth = 3;
		c.lineCap = 'round';
		for (let i = 0; i < n; i++) {
			const x = rnd() * W;
			const y = top + rnd() * (H - top);
			c.beginPath();
			c.moveTo(x - 5, y - 9);
			c.lineTo(x, y);
			c.lineTo(x + 1, y - 12);
			c.moveTo(x, y);
			c.lineTo(x + 6, y - 8);
			c.stroke();
		}
	}

	function roundTree(c, x, y, s, leaf, dark) {
		ell(c, x, y + 4 * s, 60 * s, 14 * s);
		c.fillStyle = 'rgba(20,70,20,.22)';
		c.fill();
		rrect(c, x - 12 * s, y - 90 * s, 24 * s, 92 * s, 8 * s);
		c.fillStyle = '#9a6332';
		c.fill();
		ink(c, 4);
		c.beginPath();
		[[0, -150, 62], [-46, -112, 46], [46, -110, 48], [-20, -190, 40], [26, -186, 42]].forEach(([dx, dy, r]) => {
			c.moveTo(x + (dx + r) * s, y + dy * s);
			c.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
		});
		// ink first (twice as thick), then the leaves on top: only the outer outline shows, not every puff's
		ink(c, 8);
		c.fillStyle = leaf;
		c.fill();
		ell(c, x - 22 * s, y - 176 * s, 18 * s, 10 * s, -0.5);
		c.fillStyle = 'rgba(255,255,255,.3)';
		c.fill();
		[[-30, -120], [24, -140], [6, -100]].forEach(([dx, dy]) => {
			ell(c, x + dx * s, y + dy * s, 6 * s, 6 * s);
			c.fillStyle = dark;
			c.fill();
		});
	}

	function mushroom(c, x, y, s) {
		rrect(c, x - 9 * s, y - 26 * s, 18 * s, 28 * s, 6 * s);
		c.fillStyle = '#fff6e6';
		c.fill();
		ink(c, 3);
		c.beginPath();
		c.moveTo(x - 30 * s, y - 22 * s);
		c.quadraticCurveTo(x, y - 66 * s, x + 30 * s, y - 22 * s);
		c.closePath();
		c.fillStyle = '#ff5d73';
		c.fill();
		ink(c, 3);
		[[-12, -32, 5], [8, -40, 6], [16, -28, 4]].forEach(([dx, dy, r]) => {
			ell(c, x + dx * s, y + dy * s, r * s, r * s);
			c.fillStyle = '#fff';
			c.fill();
		});
	}

	function palm(c, x, y, s, lean) {
		c.save();
		c.translate(x, y);
		c.beginPath();
		c.moveTo(-10 * s, 0);
		c.quadraticCurveTo(lean * 40 * s, -120 * s, lean * 60 * s, -230 * s);
		c.lineTo(lean * 60 * s + 16 * s, -226 * s);
		c.quadraticCurveTo(lean * 40 * s + 18 * s, -118 * s, 12 * s, 0);
		c.closePath();
		c.fillStyle = '#b97a45';
		c.fill();
		ink(c, 4);
		c.translate(lean * 60 * s + 8 * s, -230 * s);
		[-2.8, -2.1, -1.4, -0.7, -0.1, 0.5].forEach((a, i) => {
			c.save();
			c.rotate(a);
			const len = (i % 2 ? 110 : 130) * s;
			c.beginPath();
			c.moveTo(0, 0);
			c.quadraticCurveTo(len * 0.5, -34 * s, len, 12 * s);
			c.quadraticCurveTo(len * 0.5, 6 * s, 0, 0);
			c.fillStyle = '#3fbf5a';
			c.fill();
			ink(c, 3.5);
			c.restore();
		});
		ell(c, -8 * s, 8 * s, 12 * s, 12 * s);
		c.fillStyle = '#7a4f2a';
		c.fill();
		ink(c, 3);
		c.restore();
	}

	function lollipopTree(c, x, y, s, col) {
		rrect(c, x - 6 * s, y - 110 * s, 12 * s, 112 * s, 5 * s);
		c.fillStyle = '#fff';
		c.fill();
		ink(c, 3.5);
		ell(c, x, y - 140 * s, 46 * s, 46 * s);
		c.fillStyle = col;
		c.fill();
		ink(c, 4);
		c.beginPath();
		for (let a = 0; a < TAU * 2.2; a += 0.2) {
			const r = (a / (TAU * 2.2)) * 40 * s;
			c.lineTo(x + Math.cos(a) * r, y - 140 * s + Math.sin(a) * r);
		}
		c.lineWidth = 6 * s;
		c.strokeStyle = 'rgba(255,255,255,.75)';
		c.stroke();
	}

	function drawRoom(c, W, H, L, theme = 'meadow') {
		const rnd = seeded(41);
		c.lineJoin = 'round';
		const horizon = Math.round(H * (L.land ? 0.31 : 0.24));
		const sunX = W * 0.86;
		const sunY = H * 0.12;
		if (theme === 'forest') {
			sky(c, W, '#7fd6ff', '#b6ecff', '#e2fbff', horizon);
			sun(c, sunX, sunY, 46);
			cloud(c, W * 0.2, H * 0.1, 1.1);
			cloud(c, W * 0.55, H * 0.16, 0.8);
			// a far line of round treetops, then the glade
			c.beginPath();
			for (let x = -40; x < W + 80; x += 70 + rnd() * 30) {
				const r = 50 + rnd() * 30;
				c.moveTo(x + r, horizon);
				c.arc(x, horizon - r * 0.35, r, 0, TAU);
			}
			c.fillStyle = '#4fb85a';
			c.fill();
			hills(c, W, H, horizon + 18, 10, 2, 0.4, '#7fd35c');
			const ground = c.createLinearGradient(0, horizon, 0, H);
			ground.addColorStop(0, 'rgba(255,255,255,0)');
			ground.addColorStop(1, 'rgba(60,140,40,.25)');
			c.fillStyle = ground;
			c.fillRect(0, horizon, W, H - horizon);
			// soft beams of sunlight falling through the trees
			c.save();
			c.globalAlpha = 0.16;
			c.fillStyle = '#fff8c0';
			[0.2, 0.42, 0.66].forEach((f) => {
				c.beginPath();
				c.moveTo(W * f, 0);
				c.lineTo(W * f + 120, 0);
				c.lineTo(W * f - 60, H);
				c.lineTo(W * f - 260, H);
				c.closePath();
				c.fill();
			});
			c.restore();
			grassTufts(c, W, H, horizon + 30, rnd, '#5cb845');
			roundTree(c, W * 0.06, horizon + 120, 1.2, '#4cc062', '#2f9e44');
			roundTree(c, W * 0.95, horizon + 140, 1.3, '#5ccf6d', '#2f9e44');
			roundTree(c, W * 0.3, horizon + 26, 0.62, '#62d277', '#2f9e44');
			roundTree(c, W * 0.72, horizon + 22, 0.58, '#55c66b', '#2f9e44');
			[[0.12, 0.88], [0.9, 0.84], [0.04, 0.6], [0.97, 0.66]].forEach(([fx, fy]) => mushroom(c, W * fx, H * fy, 1));
			for (let i = 0; i < 50; i++) flower(c, rnd() * W, horizon + 40 + rnd() * (H - horizon - 40), 0.8, ['#ffffff', '#ffe14d', '#ff9ec7'][i % 3]);
		} else if (theme === 'beach') {
			sky(c, W, '#5cc8ff', '#a8e6ff', '#dcf6ff', horizon - 40);
			sun(c, sunX, sunY, 48);
			cloud(c, W * 0.18, H * 0.12, 1.1);
			cloud(c, W * 0.5, H * 0.07, 0.8);
			// the sea: deep blue, lighter near the shore, little white waves
			const sea = c.createLinearGradient(0, horizon - 40, 0, horizon + 50);
			sea.addColorStop(0, '#1f9ee0');
			sea.addColorStop(1, '#5fd6f5');
			c.fillStyle = sea;
			c.fillRect(0, horizon - 40, W, 90);
			c.strokeStyle = 'rgba(255,255,255,.8)';
			c.lineWidth = 4;
			for (let i = 0; i < 18; i++) {
				const x = rnd() * W;
				const y = horizon - 30 + rnd() * 70;
				c.beginPath();
				c.moveTo(x, y);
				c.quadraticCurveTo(x + 14, y - 8, x + 28, y);
				c.stroke();
			}
			// a sailboat far away
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.moveTo(W * 0.36, horizon - 34);
			c.lineTo(W * 0.36, horizon - 84);
			c.lineTo(W * 0.36 + 34, horizon - 34);
			c.closePath();
			c.fill();
			ink(c, 3);
			rrect(c, W * 0.36 - 22, horizon - 34, 64, 12, 6);
			c.fillStyle = '#ff5d73';
			c.fill();
			ink(c, 3);
			// the sand, with a foamy edge
			hills(c, W, H, horizon + 42, 8, 3, 1, '#ffffff');
			hills(c, W, H, horizon + 50, 8, 3, 1, '#ffe3a3');
			const sand = c.createLinearGradient(0, horizon, 0, H);
			sand.addColorStop(0, 'rgba(255,255,255,0)');
			sand.addColorStop(1, 'rgba(230,170,80,.3)');
			c.fillStyle = sand;
			c.fillRect(0, horizon + 40, W, H);
			for (let i = 0; i < 70; i++) {
				ell(c, rnd() * W, horizon + 60 + rnd() * (H - horizon - 60), 2, 2);
				c.fillStyle = rnd() > 0.5 ? '#f2c779' : '#fff3d6';
				c.fill();
			}
			palm(c, W * 0.05, H * 0.95, 1.3, 0.6);
			palm(c, W * 0.96, H * 0.92, 1.2, -0.6);
			[[0.1, 0.62], [0.9, 0.58], [0.5, 0.97]].forEach(([fx, fy], i) => {
				star(c, W * fx, H * fy, 18, 8);
				c.fillStyle = ['#ff8a65', '#ffb74d', '#f48fb1'][i];
				c.fill();
				ink(c, 3);
			});
		} else if (theme === 'rainbow') {
			sky(c, W, '#a8e4ff', '#d6f1ff', '#fff0fa', horizon);
			// a big rainbow over the park
			const rc = ['#ff6b8b', '#ffa94d', '#ffe066', '#7ed957', '#4dc3ff', '#9b7bff'];
			c.save();
			c.globalAlpha = 0.7;
			rc.forEach((col, i) => {
				c.beginPath();
				c.arc(W * 0.5, horizon + 40, W * 0.36 - i * 22, Math.PI, TAU);
				c.lineWidth = 22;
				c.strokeStyle = col;
				c.stroke();
			});
			c.restore();
			cloud(c, W * 0.14, horizon - 10, 1.3);
			cloud(c, W * 0.86, horizon - 10, 1.3);
			cloud(c, W * 0.35, H * 0.08, 0.7);
			hills(c, W, H, horizon + 10, 26, 1.5, 0.3, '#ffc2e0');
			hills(c, W, H, horizon + 40, 20, 2, 2.2, '#a6ecc8');
			hills(c, W, H, horizon + 70, 10, 2.5, 4, '#bff5a8');
			grassTufts(c, W, H, horizon + 90, rnd, '#86d870', 120);
			lollipopTree(c, W * 0.05, H * 0.62, 1.2, '#ff7eb6');
			lollipopTree(c, W * 0.95, H * 0.66, 1.25, '#9b7bff');
			lollipopTree(c, W * 0.22, horizon + 70, 0.6, '#ffb74d');
			lollipopTree(c, W * 0.8, horizon + 76, 0.6, '#4dc3ff');
			for (let i = 0; i < 70; i++) flower(c, rnd() * W, horizon + 90 + rnd() * (H - horizon - 90), 0.85, ['#ffffff', '#ff9ec7', '#c9a7ff', '#ffd23f'][i % 4]);
		} else {
			// meadow
			sky(c, W, '#5ec6ff', '#9fe0ff', '#d9f5ff', horizon);
			sun(c, sunX, sunY, 50);
			cloud(c, W * 0.16, H * 0.11, 1.2);
			cloud(c, W * 0.48, H * 0.06, 0.8);
			cloud(c, W * 0.66, H * 0.18, 0.7);
			hills(c, W, H, horizon - 6, 30, 1.2, 0.8, '#9be27a');
			hills(c, W, H, horizon + 24, 18, 2, 2.5, '#7fd35c');
			const ground = c.createLinearGradient(0, horizon, 0, H);
			ground.addColorStop(0, 'rgba(255,255,255,0)');
			ground.addColorStop(1, 'rgba(60,150,40,.22)');
			c.fillStyle = ground;
			c.fillRect(0, horizon, W, H - horizon);
			grassTufts(c, W, H, horizon + 30, rnd, '#5cb845');
			for (let i = 0; i < 110; i++) flower(c, rnd() * W, horizon + 30 + rnd() * (H - horizon - 30), 0.9, ['#ffffff', '#ffe14d', '#ff9ec7', '#c9a7ff'][i % 4]);
			roundTree(c, W * 0.05, horizon + 90, 1, '#4cc062', '#2f9e44');
			roundTree(c, W * 0.95, horizon + 100, 1.05, '#5ccf6d', '#2f9e44');
		}
		// a soft sunny glow where the game happens, and the dotted ring the thing travels on
		const cx = L.center.x;
		const cy = L.center.y + 40;
		const glow = c.createRadialGradient(cx, cy, 10, cx, cy, Math.min(W, H) * 0.5);
		glow.addColorStop(0, 'rgba(255,255,230,.35)');
		glow.addColorStop(1, 'rgba(255,255,230,0)');
		c.fillStyle = glow;
		c.fillRect(0, 0, W, H);
		const ring = Math.min(W, H) * 0.3;
		ell(c, cx, cy, ring, ring * 0.72);
		c.fillStyle = 'rgba(255,255,255,.14)';
		c.fill();
		c.setLineDash([2, 26]);
		c.lineWidth = 8;
		c.lineCap = 'round';
		c.strokeStyle = 'rgba(255,255,255,.8)';
		c.stroke();
		c.setLineDash([]);
	}

	// the slow turning beams of light behind everything
	function drawRays(c, S) {
		c.translate(S / 2, S / 2);
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * TAU;
			const g = c.createRadialGradient(0, 0, 0, 0, 0, S / 2);
			g.addColorStop(0, 'rgba(255,255,255,.16)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.beginPath();
			c.moveTo(0, 0);
			c.arc(0, 0, S / 2, a, a + TAU / 24);
			c.closePath();
			c.fillStyle = g;
			c.fill();
		}
	}

	/* ---------- small bits for particles and signs (white, tinted in the game) ---------- */
	const BITS = {
		conf: [16, 10, (c) => {
			rrect(c, -7, -4, 14, 8, 2.5);
			c.fillStyle = '#fff';
			c.fill();
		}],
		star: [36, 36, (c) => {
			star(c, 0, 0, 15, 7);
			c.fillStyle = '#fff';
			c.fill();
			c.lineWidth = 2;
			c.strokeStyle = 'rgba(36,18,77,.35)';
			c.stroke();
		}],
		puff: [64, 64, (c) => {
			const g = c.createRadialGradient(0, 0, 2, 0, 0, 30);
			g.addColorStop(0, 'rgba(255,255,255,1)');
			g.addColorStop(0.6, 'rgba(255,255,255,.7)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = g;
			c.fillRect(-32, -32, 64, 64);
		}],
		glow: [256, 256, (c) => {
			const g = c.createRadialGradient(0, 0, 4, 0, 0, 126);
			g.addColorStop(0, 'rgba(255,255,255,.9)');
			g.addColorStop(0.45, 'rgba(255,255,255,.32)');
			g.addColorStop(1, 'rgba(255,255,255,0)');
			c.fillStyle = g;
			c.fillRect(-128, -128, 256, 256);
		}],
		spark: [40, 40, (c) => {
			star(c, 0, 0, 18, 4.5, 4);
			c.fillStyle = '#fff';
			c.fill();
		}],
		shred: [30, 30, (c) => {
			c.beginPath();
			c.moveTo(-12, -8);
			c.quadraticCurveTo(4, -12, 12, 2);
			c.quadraticCurveTo(0, 2, -6, 12);
			c.closePath();
			c.fillStyle = '#fff';
			c.fill();
		}],
		ring: [220, 220, (c) => {
			ell(c, 0, 0, 100, 100);
			c.lineWidth = 12;
			c.strokeStyle = '#fff';
			c.stroke();
		}],
		drop: [20, 26, (c) => {
			c.beginPath();
			c.moveTo(0, -11);
			c.bezierCurveTo(9, 0, 8, 10, 0, 10);
			c.bezierCurveTo(-8, 10, -9, 0, 0, -11);
			c.fillStyle = '#9fe6ff';
			c.fill();
			c.lineWidth = 2;
			c.strokeStyle = '#3aa8e0';
			c.stroke();
		}],
		dot: [16, 16, (c) => {
			ell(c, 0, 0, 6, 6);
			c.fillStyle = '#fff';
			c.fill();
		}],
		zig: [34, 60, (c) => {
			c.beginPath();
			c.moveTo(4, -26);
			c.lineTo(-10, 2);
			c.lineTo(0, 2);
			c.lineTo(-6, 26);
			c.lineTo(12, -6);
			c.lineTo(2, -6);
			c.closePath();
			c.fillStyle = '#fff';
			c.fill();
			ink(c, 3);
		}],
		splat: [110, 110, (c) => {
			const rnd = seeded(13);
			const blobs = [[0, 0, 30]];
			for (let i = 0; i < 9; i++) {
				const a = (i / 9) * TAU + rnd();
				const d = 22 + rnd() * 16;
				blobs.push([Math.cos(a) * d, Math.sin(a) * d, 9 + rnd() * 9]);
			}
			blobs.push([8, 40, 7], [-34, 30, 5]);
			union(c, blobs.map(([x, y, r]) => () => ell(c, x, y, r, r)), '#fff', 3.5);
			c.fillStyle = 'rgba(255,255,255,.01)';
			ell(c, -10, -12, 9, 5, -0.5);
			c.fillStyle = 'rgba(36,18,77,.1)';
			c.fill();
		}],
		// a chevron: "pass it this way"
		arrow: [56, 60, (c) => {
			c.beginPath();
			c.moveTo(-14, -22);
			c.lineTo(16, 0);
			c.lineTo(-14, 22);
			c.lineWidth = 19;
			c.strokeStyle = INK;
			c.stroke();
			c.lineWidth = 10;
			c.strokeStyle = '#fff';
			c.stroke();
		}],
		// the "it is about to pop!" sign
		warn: [84, 84, (c) => {
			c.beginPath();
			c.moveTo(0, -32);
			c.lineTo(34, 26);
			c.lineTo(-34, 26);
			c.closePath();
			c.lineJoin = 'round';
			c.lineWidth = 12;
			c.strokeStyle = INK;
			c.stroke();
			c.fillStyle = '#ffd23f';
			c.fill();
			c.lineWidth = 6;
			c.strokeStyle = '#ffd23f';
			c.stroke();
			rrect(c, -4.5, -15, 9, 24, 4.5);
			c.fillStyle = INK;
			c.fill();
			ell(c, 0, 17, 5, 5);
			c.fill();
		}],
		// the little "pop" mark beside each player's count
		pop: [44, 44, (c) => {
			star(c, 0, 0, 19, 10, 8, 0.2);
			c.fillStyle = '#ffd23f';
			c.fill();
			ink(c, 3.5);
		}],
		heat: [220, 220, (c) => {
			const g = c.createRadialGradient(0, 10, 10, 0, 0, 100);
			g.addColorStop(0, 'rgba(255,90,60,.95)');
			g.addColorStop(0.75, 'rgba(255,60,90,.55)');
			g.addColorStop(1, 'rgba(255,60,90,0)');
			ell(c, 0, 0, 98, 98);
			c.fillStyle = g;
			c.fill();
		}],
		shadow: [200, 60, (c) => {
			const g = c.createRadialGradient(0, 0, 4, 0, 0, 96);
			g.addColorStop(0, 'rgba(15,6,50,.5)');
			g.addColorStop(1, 'rgba(15,6,50,0)');
			c.save();
			c.scale(1, 0.28);
			ell(c, 0, 0, 96, 96);
			c.fillStyle = g;
			c.fill();
			c.restore();
		}]
	};

	/* ---------- turning drawings into textures ---------- */
	const ORIGIN = {};

	function tex(scene, key, w, h, ox, oy, draw) {
		const Z = BP.Z;
		if (scene.textures.exists(key)) scene.textures.remove(key);
		const t = scene.textures.createCanvas(key, Math.ceil(w * Z), Math.ceil(h * Z));
		const c = t.context;
		c.save();
		c.scale(Z, Z);
		c.translate(ox, oy);
		c.lineJoin = 'round';
		c.lineCap = 'round';
		draw(c);
		c.restore();
		t.refresh();
		ORIGIN[key] = [ox / w, oy / h];
	}

	const centered = (scene, key, w, h, draw) => tex(scene, key, w, h, w / 2, h / 2, draw);
	let stamp = '';

	function build(scene, L, theme = 'meadow') {
		const PEOPLE = BP.PEOPLE;
		const roomKey = `bp-room-${theme}-${L.W}x${L.H}-${Math.round(L.center.x)}-${Math.round(L.center.y)}`;
		if (stamp !== String(BP.Z) || !scene.textures.exists('bp-eye')) {
			stamp = String(BP.Z);
			Object.entries(FACE).forEach(([name, p]) => tex(scene, `bp-${name}`, p.w, p.h, p.ox, p.oy, (c) => p.draw(c)));
			CAST.forEach((name) => {
				const sp = SPECIES[name];
				Object.entries(PARTS).forEach(([part, p]) => {
					if (part === 'tail' && !sp.tail) return;
					if (part === 'ear' && sp.ear === 'none') return;
					tex(scene, `bp-${name}-${part}`, p.w, p.h, p.ox, p.oy, (c) => p.draw(c, sp, name));
				});
			});
			PEOPLE.forEach((p) => {
				tex(scene, `bp-scarf-${p.id}`, SCARF.w, SCARF.h, SCARF.ox, SCARF.oy, (c) => SCARF.draw(c, p.color));
				tex(scene, `bp-podium-${p.id}`, 256, 116, 128, 44, (c) => drawPodium(c, p.color));
				centered(scene, `bp-prank-${p.id}`, 104, 110, (c) => drawPrank(c, p.color));
			});
			tex(scene, 'bp-podium-off', 256, 116, 128, 44, (c) => drawPodium(c, '#6a55b8'));
			BALLOONS.forEach((b, i) => tex(scene, `bp-balloon-${i}`, 228, 262, 114, 118, (c) => drawBalloon(c, b)));
			tex(scene, 'bp-strain', 228, 262, 114, 118, drawStrain);
			tex(scene, 'bp-goo', 228, 262, 114, 118, drawGoo);
			tex(scene, 'bp-bomb', 232, 262, 116, 142, drawBomb);
			centered(scene, 'bp-shield', 310, 310, drawShield);
			centered(scene, 'bp-burst', 320, 320, drawBurst);
			tex(scene, 'bp-afro', 330, 250, 165, 150, drawAfro);
			tex(scene, 'bp-spikes', 300, 160, 150, 150, drawSpikes);
			tex(scene, 'bp-hat', 100, 124, 50, 112, drawHat);
			Object.entries(BITS).forEach(([name, [w, h, draw]]) => centered(scene, `bp-${name}`, w, h, draw));
			// the light beams are soft, so they are painted small and stretched
			if (scene.textures.exists('bp-rays')) scene.textures.remove('bp-rays');
			const rays = scene.textures.createCanvas('bp-rays', 512, 512);
			drawRays(rays.context, 512);
			rays.refresh();
		}
		if (!scene.textures.exists(roomKey)) {
			tex(scene, 'bp-cloud', 270, 160, 135, 95, (c) => cloud(c, 0, 0, 1.4));
			scene.textures.getTextureKeys().filter((k) => k.startsWith('bp-room-')).forEach((k) => scene.textures.remove(k));
			tex(scene, roomKey, L.W, L.H, 0, 0, (c) => drawRoom(c, L.W, L.H, L, theme));
		}

		return roomKey;
	}

	function add(scene, key, x = 0, y = 0) {
		const o = ORIGIN[key] || [0.5, 0.5];

		return scene.add.image(x, y, key).setOrigin(o[0], o[1]).setScale(scene.k);
	}

	// change an image's picture, keeping the new picture's own pivot
	function swap(img, key) {
		const o = ORIGIN[key] || [0.5, 0.5];

		return img.setTexture(key).setOrigin(o[0], o[1]);
	}

	const sc = (img, sx = 1, sy = sx) => img.setScale(img.scene.k * sx, img.scene.k * sy);

	// where each part sits on the puppet, measured from the feet (shared with the rig in players.js)
	const RIG = {
		foot: [26, -12], body: [0, -66], scarf: [0, -103], head: [0, -152], shoulder: [50, -94], tail: [38, -44],
		ears: {long: [30, -46, 0.14], round: [54, -38, 0.5], point: [45, -34, 0.42], tuft: [0, -54, 0]}
	};

	// a still picture of a buddy, for the results card
	function portrait(name, color) {
		const sp = SPECIES[name];
		const S = 2;
		const cv = document.createElement('canvas');
		cv.width = 230 * S;
		cv.height = 390 * S; // tall enough for the bunny's ears
		const c = cv.getContext('2d');
		c.scale(S, S);
		c.translate(115, 372);
		c.lineJoin = 'round';
		c.lineCap = 'round';
		const put = (x, y, rot, draw, flip = false) => {
			c.save();
			c.translate(x, y);
			c.rotate(rot);
			if (flip) c.scale(-1, 1);
			draw();
			c.restore();
		};
		const P = PARTS;
		if (sp.tail) put(RIG.tail[0], RIG.tail[1], 0, () => P.tail.draw(c, sp, name));
		put(-RIG.foot[0], RIG.foot[1], 0, () => P.foot.draw(c, sp, name));
		put(RIG.foot[0], RIG.foot[1], 0, () => P.foot.draw(c, sp, name));
		put(RIG.body[0], RIG.body[1], 0, () => P.body.draw(c, sp, name));
		put(RIG.scarf[0], RIG.scarf[1], 0, () => SCARF.draw(c, color));
		const [hx, hy] = RIG.head;
		const e = RIG.ears[sp.ear];
		if (e && sp.ear !== 'tuft') {
			put(hx - e[0], hy + e[1], -e[2], () => P.ear.draw(c, sp, name));
			put(hx + e[0], hy + e[1], e[2], () => P.ear.draw(c, sp, name), true);
		}
		put(hx, hy, 0, () => P.head.draw(c, sp, name));
		if (sp.ear === 'tuft') put(hx, hy + e[1], 0, () => P.ear.draw(c, sp, name));
		[-1, 1].forEach((s) => {
			put(hx + s * sp.eye[0], hy + sp.eye[1], 0, () => FACE.eye.draw(c));
			put(hx + s * sp.eye[0] + 1, hy + sp.eye[1] + 2, 0, () => FACE.pupil.draw(c));
		});
		put(hx + sp.mouth[0], hy + sp.mouth[1], 0, () => (sp.beak ? FACE['beak-1'] : FACE['m-open']).draw(c));
		// arms up: hooray
		put(-RIG.shoulder[0], RIG.shoulder[1], 2.5, () => P.arm.draw(c, sp, name));
		put(RIG.shoulder[0], RIG.shoulder[1], -2.5, () => P.arm.draw(c, sp, name));

		return cv.toDataURL();
	}

	BP.Art = {THEMES, build, add, sc, swap, portrait, draw: {balloon: drawBalloon, room: drawRoom}, SPECIES, CAST, BALLOONS, RIG, INK, num, lighten, darken};
})();
