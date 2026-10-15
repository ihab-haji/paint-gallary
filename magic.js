/*
 * 🪄 Magic brush — every kind behaves differently:
 *   🌈 rainbow ribbon · 🫧 bubbles · 🌸 flowers · ⭐ stars · ✨ fireflies · 🐾 tiny animals
 *
 * While the child draws, decorations POP in with a little bounce (drawn on the effects layer),
 * then settle into the painting (the paint layer), so Undo, Save, the eraser and the hint all keep working.
 * Sparkles, rising bubbles and blinking fireflies fly around the stroke and fade away (effects layer only).
 */
(() => {
	'use strict';

	const RAINBOW = ['#ef4444', '#ff8c42', '#fde047', '#3ddc84', '#3bb2ff', '#9b5cff'];
	const ANIMALS = ['🐥', '🐞', '🐟', '🐰', '🐢', '🦋', '🐝', '🐌', '🐤', '🐠'];
	const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319];
	const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
	const POP_TIME = 320; // ms for a decoration to pop in
	const KINDS = [
		{id: 'rainbow', icon: '🌈', usesColor: false},
		{id: 'bubbles', icon: '🫧', usesColor: true},
		{id: 'flowers', icon: '🌸', usesColor: true},
		{id: 'stars', icon: '⭐', usesColor: true},
		{id: 'fireflies', icon: '✨', usesColor: true},
		{id: 'animals', icon: '🐾', usesColor: false}
	];
	// distance between two decorations, as a part of their size
	const SPACING = {bubbles: 0.75, flowers: 0.85, stars: 0.9, fireflies: 0.42, animals: 1.05};

	function hexToRgb(hex) {
		const n = parseInt(hex.slice(1), 16);

		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	const rgba = (hex, alpha) => `rgba(${hexToRgb(hex).join(', ')}, ${alpha})`;

	// mix a color with white (amount 0..1), for lighter shades
	function lighter(hex, amount) {
		const [r, g, b] = hexToRgb(hex);
		const mixWith = (c) => Math.round(c + (255 - c) * amount);

		return `rgb(${mixWith(r)}, ${mixWith(g)}, ${mixWith(b)})`;
	}

	const random = (min, max) => min + Math.random() * (max - min);
	const pick = (list) => list[Math.floor(Math.random() * list.length)];

	function starPath(ctx, outer, inner, points = 5) {
		ctx.beginPath();
		for (let i = 0; i < points * 2; i++) {
			const radius = i % 2 === 0 ? outer : inner;
			const angle = -Math.PI / 2 + (i * Math.PI) / points;
			ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
		}
		ctx.closePath();
	}

	/* ---------- how each decoration looks (drawn around 0,0 with size s) ---------- */
	const PAINTERS = {
		flowers(ctx, s, item) {
			const light = lighter(item.color, 0.6);
			for (let i = 0; i < 5; i++) {
				ctx.save();
				ctx.rotate((i * 2 * Math.PI) / 5);
				const petal = ctx.createRadialGradient(0, -s * 0.1, s * 0.02, 0, -s * 0.28, s * 0.3);
				petal.addColorStop(0, light);
				petal.addColorStop(1, item.color);
				ctx.fillStyle = petal;
				ctx.beginPath();
				ctx.ellipse(0, -s * 0.27, s * 0.17, s * 0.26, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
			const middle = ctx.createRadialGradient(-s * 0.03, -s * 0.03, 0, 0, 0, s * 0.15);
			middle.addColorStop(0, '#fff3a3');
			middle.addColorStop(1, '#f5b014');
			ctx.fillStyle = middle;
			ctx.beginPath();
			ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
			ctx.fill();
		},

		stars(ctx, s, item) {
			const shine = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
			shine.addColorStop(0, lighter(item.color, 0.65));
			shine.addColorStop(1, item.color);
			starPath(ctx, s * 0.5, s * 0.23);
			ctx.fillStyle = shine;
			ctx.fill();
			ctx.lineWidth = s * 0.05;
			ctx.lineJoin = 'round';
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
			ctx.stroke();
			ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
			ctx.beginPath();
			ctx.ellipse(-s * 0.1, -s * 0.12, s * 0.06, s * 0.035, -0.6, 0, Math.PI * 2);
			ctx.fill();
		},

		bubbles(ctx, s, item) {
			const r = s * 0.45;
			const body = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
			body.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
			body.addColorStop(0.7, rgba(item.color, 0.16));
			body.addColorStop(1, rgba(item.color, 0.55));
			ctx.fillStyle = body;
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.lineWidth = Math.max(1.5, s * 0.035);
			ctx.strokeStyle = rgba(item.color, 0.8);
			ctx.stroke();
			ctx.lineCap = 'round';
			ctx.lineWidth = s * 0.06;
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
			ctx.beginPath();
			ctx.arc(0, 0, r * 0.68, Math.PI * 1.1, Math.PI * 1.45);
			ctx.stroke();
			ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
			ctx.beginPath();
			ctx.arc(r * 0.35, -r * 0.42, s * 0.04, 0, Math.PI * 2);
			ctx.fill();
		},

		fireflies(ctx, s, item) {
			const r = s * 0.5;
			const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
			glow.addColorStop(0, '#ffffff');
			glow.addColorStop(0.18, lighter(item.color, 0.35));
			glow.addColorStop(0.45, rgba(item.color, 0.55));
			glow.addColorStop(1, rgba(item.color, 0));
			ctx.fillStyle = glow;
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.fill();
		},

		animals(ctx, s, item) {
			ctx.font = `${s}px ${EMOJI_FONT}`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			if (item.flip) ctx.scale(-1, 1); // face the way the finger is moving
			const box = ctx.measureText(item.emoji);
			ctx.fillText(item.emoji, 0, (box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2);
		}
	};

	/* ---------- little flying effects (only on the effects layer, they fade away) ---------- */
	const PARTICLES = {
		sparkle(ctx, p, life) {
			const twinkle = 0.6 + 0.4 * Math.sin(life * 20);
			ctx.globalAlpha = (1 - life) * twinkle;
			ctx.fillStyle = p.color;
			ctx.translate(p.x, p.y);
			ctx.rotate(life * 3);
			starPath(ctx, p.size, p.size * 0.25, 4);
			ctx.fill();
		},
		bubble(ctx, p, life) {
			ctx.globalAlpha = 1 - life;
			ctx.strokeStyle = rgba(p.color, 0.8);
			ctx.lineWidth = Math.max(1, p.size * 0.15);
			ctx.beginPath();
			ctx.arc(p.x + Math.sin(life * 12 + p.seed) * p.size, p.y, p.size, 0, Math.PI * 2);
			ctx.stroke();
		},
		firefly(ctx, p, life) {
			const blink = 0.35 + 0.65 * Math.abs(Math.sin(life * 9 + p.seed));
			ctx.globalAlpha = (1 - life) * blink;
			const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
			glow.addColorStop(0, '#ffffff');
			glow.addColorStop(0.3, lighter(p.color, 0.4));
			glow.addColorStop(1, rgba(p.color, 0));
			ctx.fillStyle = glow;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	window.createMagicBrush = ({paintCtx, fxCanvas, play, onChange}) => {
		const fx = fxCanvas.getContext('2d');
		let pops = []; // decorations popping in
		let particles = []; // sparkles & co. flying around
		let running = false;
		let stroke = null;
		let lastNote = 0;
		let noteIndex = 0;

		function sing() {
			const now = performance.now();
			if (now - lastNote < 70) return;
			lastNote = now;
			play(NOTES[noteIndex++ % NOTES.length]);
		}

		function drawDecoration({ctx, item, scale}) {
			ctx.save();
			ctx.translate(item.x, item.y);
			ctx.rotate(item.rotation);
			ctx.scale(scale, scale);
			PAINTERS[item.kind](ctx, item.size, item);
			ctx.restore();
		}

		function commit(item) {
			drawDecoration({ctx: paintCtx, item, scale: 1});
		}

		function addParticles({x, y, type, color, count, s}) {
			for (let i = 0; i < count; i++) {
				particles.push({
					type,
					color,
					x: x + random(-s, s),
					y: y + random(-s, s),
					vx: random(-0.5, 0.5) * s * 0.03,
					vy: (type === 'bubble' ? random(-1.6, -0.8) : random(-0.6, 0.6)) * s * 0.03,
					size: type === 'firefly' ? random(0.12, 0.22) * s : type === 'bubble' ? random(0.06, 0.13) * s : random(0.07, 0.14) * s,
					seed: random(0, 6),
					born: performance.now(),
					lifetime: type === 'firefly' ? random(900, 1500) : random(500, 900)
				});
			}
			wake();
		}

		function tick() {
			const now = performance.now();
			fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

			particles = particles.filter((p) => {
				const life = (now - p.born) / p.lifetime;
				if (life >= 1) return false;
				p.x += p.vx;
				p.y += p.vy;
				if (p.type === 'firefly') {
					p.vx += random(-0.08, 0.08);
					p.vy += random(-0.08, 0.08);
				}
				fx.save();
				PARTICLES[p.type](fx, p, life);
				fx.restore();

				return true;
			});

			let committed = false;
			pops = pops.filter((item) => {
				const t = Math.min(1, (now - item.born) / POP_TIME);
				if (t >= 1) {
					commit(item);
					committed = true;

					return false;
				}
				// grow with a little bounce: 0 → 1.15 → 1
				const bounce = 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
				drawDecoration({ctx: fx, item, scale: Math.max(0.01, bounce)});

				return true;
			});
			if (committed) onChange();

			if (pops.length || particles.length) {
				requestAnimationFrame(tick);
			} else {
				running = false;
				fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
			}
		}

		function wake() {
			if (running) return;
			running = true;
			requestAnimationFrame(tick);
		}

		function placeDecoration({x, y, angle}) {
			const {kind, size, color, direction} = stroke;
			const s = size * random(0.75, 1.15);
			const item = {kind, color, x, y, size: s, born: performance.now(), rotation: 0};
			if (kind === 'flowers' || kind === 'stars') item.rotation = random(-0.5, 0.5);
			if (kind === 'bubbles') item.size = size * random(0.55, 1.1);
			if (kind === 'fireflies') {
				item.x += random(-0.6, 0.6) * size;
				item.y += random(-0.6, 0.6) * size;
				item.size = size * random(0.5, 0.95);
			}
			if (kind === 'animals') {
				item.emoji = pick(ANIMALS);
				item.flip = direction.x > 0;
				item.rotation = Math.max(-0.4, Math.min(0.4, item.flip ? angle : angle - Math.PI)) * 0.6;
			}
			pops.push(item);
			sing();

			if (kind === 'bubbles') addParticles({x, y, type: 'bubble', color, count: 2, s: size});
			else if (kind === 'fireflies') addParticles({x, y, type: 'firefly', color, count: 2, s: size});
			else addParticles({x, y, type: 'sparkle', color: pick(['#ffffff', '#ffd23f', lighter(color, 0.5)]), count: 2, s: size * 0.6});
			wake();
		}

		/* 🌈 the rainbow ribbon: six colored bands that follow the finger, with splashes */
		function ribbonSegment({from, to}) {
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const length = Math.hypot(dx, dy);
			if (length < 0.5) return;
			const d = stroke.direction;
			const nx = dx / length;
			const ny = dy / length;
			const mx = d.x * 0.65 + nx * 0.35;
			const my = d.y * 0.65 + ny * 0.35;
			const m = Math.hypot(mx, my) || 1;
			stroke.direction = {x: mx / m, y: my / m};
			const normal = {x: -stroke.direction.y, y: stroke.direction.x};
			const band = stroke.size * 0.3;
			if (!stroke.bands) {
				stroke.bands = RAINBOW.map((_, i) => ({x: from.x + normal.x * (i - 2.5) * band, y: from.y + normal.y * (i - 2.5) * band}));
			}
			paintCtx.save();
			paintCtx.lineCap = 'round';
			paintCtx.lineJoin = 'round';
			paintCtx.lineWidth = band * 1.3;
			RAINBOW.forEach((color, i) => {
				const next = {x: to.x + normal.x * (i - 2.5) * band, y: to.y + normal.y * (i - 2.5) * band};
				paintCtx.strokeStyle = color;
				paintCtx.shadowColor = color;
				paintCtx.shadowBlur = band * 0.35;
				paintCtx.beginPath();
				paintCtx.moveTo(stroke.bands[i].x, stroke.bands[i].y);
				paintCtx.lineTo(next.x, next.y);
				paintCtx.stroke();
				stroke.bands[i] = next;
			});
			// little paint splashes next to the ribbon, like a happy messy brush
			if (Math.random() < 0.14) {
				const side = Math.random() < 0.5 ? -1 : 1;
				const index = side < 0 ? Math.floor(random(0, 2)) : Math.floor(random(4, 6));
				const away = (3 + random(0.4, 1.6)) * band * side;
				paintCtx.fillStyle = RAINBOW[index];
				paintCtx.shadowBlur = 0;
				paintCtx.beginPath();
				paintCtx.arc(to.x + normal.x * away + random(-band, band), to.y + normal.y * away + random(-band, band), band * random(0.25, 0.6), 0, Math.PI * 2);
				paintCtx.fill();
			}
			paintCtx.restore();
			stroke.travelled += length;
			if (stroke.travelled > stroke.size * 0.8) {
				stroke.travelled = 0;
				sing();
				addParticles({x: to.x, y: to.y, type: 'sparkle', color: pick(['#ffffff', '#ffd23f']), count: 1, s: stroke.size});
			}
			onChange({soon: true});
		}

		return {
			kinds: KINDS,

			usesColor(kind) {
				return (KINDS.find((k) => k.id === kind) || KINDS[0]).usesColor;
			},

			start({p, kind, color, size}) {
				stroke = {kind, color, size: size * p.scale, last: p, travelled: 0, direction: {x: 1, y: 0}, bands: null};
				if (kind !== 'rainbow') placeDecoration({x: p.x, y: p.y, angle: 0});
			},

			move({p}) {
				if (!stroke) return;
				const from = stroke.last;
				stroke.last = p;
				if (stroke.kind === 'rainbow') {
					ribbonSegment({from, to: p});

					return;
				}
				const dx = p.x - from.x;
				const dy = p.y - from.y;
				const length = Math.hypot(dx, dy);
				if (length < 0.5) return;
				stroke.direction = {x: dx / length, y: dy / length};
				const gap = stroke.size * SPACING[stroke.kind];
				let walked = 0;
				while (stroke.travelled + (length - walked) >= gap) {
					walked += gap - stroke.travelled;
					stroke.travelled = 0;
					const t = walked / length;
					placeDecoration({x: from.x + dx * t, y: from.y + dy * t, angle: Math.atan2(dy, dx)});
				}
				stroke.travelled += length - walked;
			},

			end() {
				stroke = null;
				onChange();
			},

			// put every decoration that is still popping into the painting right now (before Undo / Save / leaving)
			flush() {
				if (!pops.length) return;
				pops.forEach(commit);
				pops = [];
				onChange();
			},

			// a new picture: forget everything that was flying
			clear() {
				pops = [];
				particles = [];
				stroke = null;
				fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
			}
		};
	};
})();
