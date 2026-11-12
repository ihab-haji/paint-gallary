/* The Hero Squad: six original chibi superheroes, drawn here as layered SVG so every part can move.
   Each player wears their own colour (the suit), whichever hero they pick.
     PartyHeroes.LIST                              the hero ids: comet luna splash blaze sprout bolt
     PartyHeroes.svg(id, color, {bust, mood})      inline markup (animated by the page's CSS, moods can change live)
     PartyHeroes.url(id, color, {bust, mood})      the same as an image URL (for <img> and for game canvases)
     PartyHeroes.react(svgEl, mood, ms)            play a mood, then go back to how it was
   Moods: idle (default) · turn (hop + wave) · cheer (jump, arms up, power burst) · win (victory dance, loops)
          oops (a gentle "aww") · sleep (not playing) · pop (arrive) */
(function () {
	'use strict';
	const O = '#3d2b45'; // the outline: a deep plum, softer than black
	const SUN = '#ffd23f';
	const CREAM = '#fff3d9';

	/* ---------- colour helpers ---------- */
	const rgb = (hex) => {
		const h = hex.replace('#', '');
		const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;

		return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
	};
	const mix = (a, b, t) => {
		const A = rgb(a), B = rgb(b);

		return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
	};
	const dark = (c, t = 0.28) => mix(c, '#2a1740', t);
	const light = (c, t = 0.45) => mix(c, '#ffffff', t);

	/* ---------- drawing helpers ---------- */
	const S = (w = 4) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
	const P = (d, fill, w = 4, more = '') => `<path d="${d}" fill="${fill}" ${S(w)} ${more}/>`;
	const F = (d, fill, more = '') => `<path d="${d}" fill="${fill}" ${more}/>`; // no outline
	const L = (d, color = O, w = 4, more = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${more}/>`;
	const C = (x, y, r, fill, w = 4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${w ? S(w) : ''}/>`;
	const E = (x, y, rx, ry, fill, w = 4, more = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${w ? S(w) : ''} ${more}/>`;
	const R = (x, y, w, h, r, fill, sw = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${sw ? S(sw) : ''}/>`;
	const flip = (s) => `<g transform="translate(200 0) scale(-1 1)">${s}</g>`;
	const both = (s) => s + flip(s);

	/* ---------- the parts every hero shares ---------- */
	const legs = (leg, boot) => both(R(78, 164, 19, 36, 8, leg) + P('M71 207 q0 -14 14 -14 h8 q6 0 6 6 v8 q0 5 -5 5 h-18 q-5 0 -5 -5z', boot));
	const torso = (fill) => P('M73 130 Q73 114 100 114 Q127 114 127 130 L131 166 Q132 182 100 182 Q68 182 69 166 Z', fill);
	const belt = (fill, buckle) => P('M70 158 Q100 167 130 158 L131 167 Q100 177 69 167 Z', fill, 3.5) + C(100, 168.5, 5.5, buckle, 3);
	// an arm hangs from the shoulder; the outer group is what the animation turns
	const arm = (side, sleeve, hand, extra = '') => {
		const x = side === 'L' ? 72 : 128, rot = side === 'L' ? 24 : -24;

		return `<g class="h-arm${side}"><g transform="rotate(${rot} ${x} 128)">${extra}${R(x - 9.5, 120, 19, 38, 9.5, sleeve)}${C(x, 159, 10, hand)}</g></g>`;
	};
	const ears = (skin) => both(C(47, 82, 9, skin));
	const skull = (skin) => E(100, 72, 55, 49, skin);

	// the face: big shiny eyes, a blush and a little smile; other moods swap the eyes and mouth
	function face({iris = '#6b4226', blush = '#ff8fa3', y = 0} = {}) {
		const eye = (x) => E(x, 84, 10.5, 13, '#fff', 3) + E(x, 85.5, 8, 10.5, iris, 0) + E(x, 86, 4.8, 7, '#2a1a22', 0) +
			C(x - 3.2, 80, 3.4, '#fff', 0) + C(x + 3.6, 91, 1.7, '#fff', 0);

		return `<g transform="translate(0 ${y})">
			<g class="h-blush">${E(62, 99, 8.5, 5, blush, 0, 'opacity=".6"')}${E(138, 99, 8.5, 5, blush, 0, 'opacity=".6"')}</g>
			<g class="h-eyes-open">${eye(78)}${eye(122)}</g>
			<g class="h-eyes-happy">${L('M67 88 Q78 73 89 88', O, 4.5)}${L('M111 88 Q122 73 133 88', O, 4.5)}</g>
			<g class="h-eyes-shut">${L('M68 84 Q78 92 88 84', O, 4)}${L('M112 84 Q122 92 132 84', O, 4)}</g>
			<g class="h-mouth-smile">${L('M92 102 Q100 109 108 102', O, 3.5)}</g>
			<g class="h-mouth-open">${P('M89 100 Q100 119 111 100 Z', '#7a2238', 3.5)}${F('M94 108 Q100 103 106 108 Q100 114 94 108Z', '#ff8fa3')}</g>
			<g class="h-mouth-o">${E(100, 105, 4.2, 5, '#7a2238', 3)}</g>
		</g>`;
	}

	/* ---------- the little things that burst out when a hero cheers ---------- */
	const BITS = {
		spark: P('M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10Z', SUN, 2.5),
		moon: P('M4 -9 A9.5 9.5 0 1 0 4 9 A7.4 7.4 0 1 1 4 -9Z', '#ffe27a', 2.5),
		drop: P('M0 -10 Q8 0 5.5 5 A6 6 0 0 1 -5.5 5 Q-8 0 0 -10Z', '#8fdcff', 2.5) + F('M-2.5 2 a2 3 0 0 1 2 -4', '#fff'),
		flame: P('M0 -11 Q9 -2 5.5 5 A6.2 6.2 0 0 1 -5.5 5 Q-8 0 -2.5 -3 Q-1 -7 0 -11Z', '#ff8a1f', 2.5) + F('M0 -2 Q4 2 2 5.5 A2.6 2.6 0 0 1 -2.5 5 Q-3 2 0 -2Z', SUN),
		leaf: P('M0 -10 Q10 -2 0 10 Q-10 -2 0 -10Z', '#58c66b', 2.5) + L('M0 -5 V6', '#2f8f45', 1.6),
		bolt: P('M2.5 -11 L-7 1.5 H-1 L-3.5 11 L7 -2.5 H1Z', SUN, 2.5)
	};
	const SPOTS = [[36, 46, -26, -24, -50], [164, 46, 26, -24, 50], [22, 96, -30, -4, -90], [178, 96, 30, -4, 90], [70, 14, -10, -30, -30], [130, 14, 10, -30, 30]];
	const fx = (bit) => `<g class="h-fx">${SPOTS.map(([x, y, dx, dy, r], i) =>
		`<g transform="translate(${x} ${y})"><g class="h-p" style="--x:${dx}px;--y:${dy}px;--r:${r}deg;animation-delay:${(i % 3) * 70}ms">${BITS[bit]}</g></g>`).join('')}</g>`;
	const zz = `<g class="h-zz">${L('M150 30 h9 l-9 10 h9', '#8a7aa6', 3)}${L('M166 12 h12 l-12 13 h12', '#8a7aa6', 3.5)}</g>`;

	/* ---------- the six heroes: each returns its layers, back to front ---------- */
	const HEROES = {
		// Comet: sunny swept-back hair with a comet tail, racing goggles and a flying scarf
		comet(c) {
			const skin = '#ffd9b8';

			return {
				bit: 'spark', top: '152px 46px',
				back: `<g class="h-top">${P('M136 36 Q166 10 194 16 Q178 26 172 38 Q186 36 196 48 Q176 48 160 64 Z', SUN)}${L('M150 40 Q166 26 180 24', '#fff7c2', 3)}</g>`,
				legs: legs(dark(c), SUN),
				body: torso(c) + belt(dark(c), SUN) +
					L('M103 134 L116 127 M106 141 L121 139 M104 147 L116 152', '#fff', 3.4) + C(97, 141, 7.5, '#fff', 3),
				scarf: `<g class="h-cape" style="transform-origin:124px 124px">${P('M122 121 Q150 114 170 130 Q160 133 164 147 Q144 138 124 133Z', CREAM)}</g>` +
					P('M70 117 Q100 132 130 117 L129 128 Q100 143 71 128Z', CREAM),
				armL: arm('L', c, SUN), armR: arm('R', c, SUN),
				head: ears(skin) + skull(skin) +
					P('M46 72 Q42 22 100 20 Q158 22 154 72 Q147 55 134 61 Q131 46 116 57 Q108 42 94 57 Q84 44 73 61 Q60 54 46 72Z', SUN) +
					L('M48 55 Q100 34 152 55', O, 11) + L('M48 55 Q100 34 152 55', dark(c, 0.1), 6) +
					both(C(79, 44, 12, '#bdf0ff') + L('M73 41 q4 -5 9 -3', '#fff', 2.5)) + R(92, 39, 16, 8, 4, c, 3),
				face: face({iris: '#6b4226'})
			};
		},

		// Luna: long midnight hair, a moon tiara, a starry cape and a twinkling wand
		luna(c) {
			const skin = '#f3c6a5', hair = '#3b2f6b', night = mix(c, '#1d1640', 0.62);
			const star = (x, y, r) => F(`M${x} ${y - r} l${r * 0.3} ${r * 0.7} l${r * 0.7} ${r * 0.3} l-${r * 0.7} ${r * 0.3} l-${r * 0.3} ${r * 0.7} l-${r * 0.3} -${r * 0.7} l-${r * 0.7} -${r * 0.3} l${r * 0.7} -${r * 0.3}z`, '#ffe27a');
			const wand = L('M128 160 L128 196', O, 7) + L('M128 160 L128 196', '#fff', 3) +
				`<g class="h-twinkle" style="transform-origin:128px 198px">${P('M128 184 l4.4 9 l9.6 1.4 l-7 6.8 l1.7 9.6 l-8.7 -4.6 l-8.7 4.6 l1.7 -9.6 l-7 -6.8 l9.6 -1.4z', '#ffe27a', 3)}</g>`;

			return {
				bit: 'moon', top: '100px 30px',
				back: `<g class="h-cape">${P('M70 120 Q38 150 42 202 Q72 192 100 202 Q128 192 158 202 Q162 150 130 120Z', night)}${star(58, 170, 6)}${star(142, 160, 5)}${star(150, 186, 4)}${star(52, 190, 3.5)}</g>` +
					P('M43 76 Q38 16 100 16 Q162 16 157 76 L162 126 Q151 139 138 127 L136 96 L64 96 L62 127 Q49 139 38 126 Z', hair),
				legs: legs(light(c, 0.75), '#fff'),
				body: torso(c) + P('M71 156 Q100 166 129 156 L141 184 Q100 198 59 184Z', light(c, 0.35)) + belt('#ffe27a', '#fff') + star(100, 138, 9),
				armL: arm('L', c, skin), armR: arm('R', c, skin, wand),
				head: ears(skin) + skull(skin) +
					P('M46 68 Q50 22 100 21 Q150 22 154 68 Q141 49 122 53 Q112 64 100 51 Q85 64 70 55 Q56 53 46 68Z', hair) +
					L('M52 45 Q100 26 148 45', O, 10) + L('M52 45 Q100 26 148 45', c, 5.5) +
					`<g class="h-top">${P('M106 8 A13 13 0 1 0 106 32 A10 10 0 1 1 106 8Z', '#ffe27a', 3.5)}</g>`,
				face: face({iris: '#7a4bd6'})
			};
		},

		// Splash: a deep-sea diver in a bubble helmet with a fin on top and big flippers
		splash(c) {
			const skin = '#b9794f', hair = '#2b2233';
			const flipper = P('M62 208 q2 -15 22 -15 h9 q6 0 6 6 v7 q0 6 -6 6 h-25 q-6 0 -6 -4z', SUN);

			return {
				bit: 'drop', top: '104px 14px',
				back: R(82, 128, 36, 44, 12, dark(c, 0.4)),
				legs: both(R(78, 164, 19, 36, 8, dark(c)) + flipper),
				body: torso(c) + P('M84 124 Q100 118 116 124 L118 160 Q100 168 82 160Z', light(c, 0.55), 3.5) + belt(dark(c), SUN) +
					P('M100 130 Q109 142 106 148 A6.6 6.6 0 0 1 94 148 Q91 142 100 130Z', '#fff', 3),
				armL: arm('L', c, SUN), armR: arm('R', c, SUN),
				head: ears(skin) + skull(skin) +
					P('M47 66 Q46 24 100 22 Q154 24 153 66 Q146 50 136 56 Q130 42 118 52 Q110 38 98 51 Q88 40 78 53 Q66 44 60 58 Q52 56 47 66Z', hair),
				face: face({iris: '#4a2f1c', blush: '#ff7a8a'}),
				over: `<g class="h-top">${P('M90 14 Q102 -2 126 4 Q114 10 114 20 Z', c)}</g>` +
					E(100, 68, 61, 57, '#e9f9ff', 4, 'fill-opacity=".2"') + L('M56 44 Q70 22 92 18', '#fff', 5, 'opacity=".85"') + L('M50 62 q1 -6 3 -9', '#fff', 5, 'opacity=".85"') +
					E(100, 122, 33, 8, c, 3.5) +
					`<g class="h-bubs">${C(166, 60, 5, '#eafaff', 2.5)}${C(176, 40, 3.5, '#eafaff', 2.5)}${C(30, 52, 4, '#eafaff', 2.5)}</g>`
			};
		},

		// Blaze: a fox-eared hood, a flame of hair and a big swishy tail
		blaze(c) {
			const skin = '#ffe0c2';
			const ear = (side) => `<g class="h-ear${side}">${P('M54 46 L50 4 L90 27 Z', c)}${P('M60 37 L58 16 L78 28 Z', CREAM, 3)}</g>`;

			return {
				bit: 'flame', top: '100px 40px',
				back: `<g class="h-cape" style="transform-origin:128px 166px">${P('M124 174 Q170 176 174 132 Q178 110 165 102 Q150 118 150 140 Q146 158 120 160Z', c)}${P('M165 102 Q178 110 174 132 Q164 128 154 124 Q156 110 165 102Z', CREAM, 3.5)}</g>`,
				legs: legs(dark(c), CREAM),
				body: torso(c) + P('M82 117 Q100 152 118 117 Q100 112 82 117Z', CREAM, 3.5) + belt(dark(c), SUN),
				armL: arm('L', c, CREAM), armR: arm('R', c, CREAM),
				head: ear('L') + flip(ear('R')) + E(100, 72, 58, 52, c) +
					P('M57 82 Q56 46 100 45 Q144 46 143 82 Q143 113 100 115 Q57 113 57 82Z', skin, 3.5) +
					P('M82 52 Q88 30 100 46 Q106 32 118 52 Q100 62 82 52Z', SUN, 3.5) +
					L('M62 92 l-9 -2 M63 99 l-9 3 M138 92 l9 -2 M137 99 l9 3', dark(c, 0.45), 2.6),
				face: face({iris: '#b5541c'})
			};
		},

		// Sprout: a leaf cape, a cap with two leaves growing on top, curls and freckles
		sprout(c) {
			const skin = '#d99a6c', hair = '#5a3423', green = '#58c66b', deep = '#2f8f45';

			return {
				bit: 'leaf', top: '100px 20px',
				back: `<g class="h-cape">${P('M72 120 Q34 140 44 198 Q76 186 100 198 Q124 186 156 198 Q166 140 128 120Z', green)}${L('M100 126 V190 M100 150 Q80 158 62 176 M100 150 Q120 158 138 176', deep, 2.6)}</g>`,
				legs: legs(dark(c), '#8a5a3c'),
				body: torso(c) + belt('#8a5a3c', green) +
					[0, 72, 144, 216, 288].map((a) => `<ellipse cx="100" cy="131" rx="5" ry="7" fill="#fff" ${S(2.5)} transform="rotate(${a} 100 139)"/>`).join('') + C(100, 139, 4.6, SUN, 2.5),
				armL: arm('L', c, skin), armR: arm('R', c, skin),
				head: ears(skin) + both(C(52, 66, 11, hair) + C(48, 80, 8, hair)) + skull(skin) +
					both(C(60, 62, 9, hair, 0)) +
					P('M45 66 Q44 21 100 19 Q156 21 155 66 Q128 50 100 52 Q72 50 45 66Z', c) + L('M56 52 Q100 36 144 52', light(c, 0.5), 3) +
					`<g class="h-top">${L('M100 21 Q98 14 100 9', O, 7)}${L('M100 21 Q98 14 100 9', deep, 3)}${P('M100 10 Q84 -1 70 9 Q84 20 100 10Z', green, 3.5)}${P('M100 10 Q116 -1 130 9 Q116 20 100 10Z', green, 3.5)}</g>` +
					F('M66 96 h.1 M72 92 h.1 M128 92 h.1 M134 96 h.1', 'none', `stroke="#a8683f" stroke-width="3.4" stroke-linecap="round"`),
				face: face({iris: '#2f7d4a'})
			};
		},

		// Bolt: a friendly little robot with a glowing antenna and bright screen eyes
		bolt(c) {
			const metal = '#e9eef5', shade = '#b9c4d4', glow = '#7ef0ff', screen = '#22304a';

			return {
				bit: 'bolt', top: '100px 26px',
				back: '',
				legs: legs(shade, c),
				body: torso(metal) + P('M82 122 Q100 116 118 122 L120 156 Q100 164 80 156Z', c, 3.5) + belt(shade, SUN) +
					P('M103 124 L91 141 H99 L96 156 L110 137 H102Z', SUN, 3),
				armL: arm('L', shade, c), armR: arm('R', shade, c),
				head: both(R(36, 66, 16, 24, 7, c)) + R(45, 24, 110, 97, 34, metal) +
					P('M50 52 Q52 26 100 26 Q148 26 150 52 Q100 42 50 52Z', c, 3.5) + R(57, 54, 86, 56, 24, screen, 3.5) +
					`<g class="h-top">${L('M100 26 V12', O, 8)}${L('M100 26 V12', shade, 4)}<g class="h-glow">${C(100, 9, 7, SUN, 3.5)}</g></g>`,
				face: `<g class="h-blush">${E(68, 97, 6, 3.5, '#ff8fb5', 0, 'opacity=".75"')}${E(132, 97, 6, 3.5, '#ff8fb5', 0, 'opacity=".75"')}</g>
					<g class="h-eyes-open">${both(E(80, 78, 9, 12, glow, 0) + C(77, 73, 3, '#fff', 0))}</g>
					<g class="h-eyes-happy">${L('M70 82 Q80 68 90 82', glow, 5)}${L('M110 82 Q120 68 130 82', glow, 5)}</g>
					<g class="h-eyes-shut">${L('M71 79 h18 M111 79 h18', glow, 5)}</g>
					<g class="h-mouth-smile">${L('M92 96 Q100 103 108 96', glow, 3.5)}</g>
					<g class="h-mouth-open">${F('M90 94 Q100 110 110 94 Z', glow)}</g>
					<g class="h-mouth-o">${E(100, 98, 4, 4.6, 'none', 0, `stroke="${glow}" stroke-width="3"`)}</g>`
			};
		}
	};
	const LIST = Object.keys(HEROES);

	/* ---------- how they move ---------- */
	const css = `
.hero{overflow:visible;display:block}
.hero .h-eyes-happy,.hero .h-eyes-shut,.hero .h-mouth-open,.hero .h-mouth-o,.hero .h-zz{display:none}
.hero .h-p{opacity:0}
.hero .h-all{transform-origin:100px 212px;animation:hk-breathe 3.2s ease-in-out infinite}
.hero .h-head{transform-origin:100px 120px;animation:hk-nod 4.4s ease-in-out infinite}
.hero .h-eyes-open{transform-origin:100px 85px;animation:hk-blink 4.8s infinite}
.hero .h-cape{transform-origin:100px 122px;animation:hk-flutter 2.4s ease-in-out infinite}
.hero .h-top{animation:hk-wig 2.8s ease-in-out infinite}
.hero .h-earL{transform-origin:70px 40px;animation:hk-ear 3.6s ease-in-out infinite}
.hero .h-earR{transform-origin:70px 40px;animation:hk-ear 3.6s ease-in-out -1.2s infinite}
.hero .h-armL{transform-origin:72px 126px;transition:transform .28s cubic-bezier(.3,1.5,.5,1);animation:hk-swayL 3.2s ease-in-out infinite}
.hero .h-armR{transform-origin:128px 126px;transition:transform .28s cubic-bezier(.3,1.5,.5,1);animation:hk-swayR 3.2s ease-in-out infinite}
.hero .h-shadow{transform-origin:100px 214px}
.hero .h-glow{animation:hk-glow 1.6s ease-in-out infinite}
.hero .h-twinkle{animation:hk-twinkle 2.2s ease-in-out infinite}
.hero .h-bubs circle{animation:hk-bub 3s ease-in infinite}
.hero .h-bubs circle:nth-child(2){animation-delay:-1s}.hero .h-bubs circle:nth-child(3){animation-delay:-2s}

.hero.is-turn .h-all{animation:hk-hop .62s cubic-bezier(.3,.6,.4,1) infinite}
.hero.is-turn .h-shadow{animation:hk-shade .62s ease-in-out infinite}
.hero.is-turn .h-armR{animation:hk-wave .34s ease-in-out infinite}

.hero.is-cheer .h-all{animation:hk-jump .78s cubic-bezier(.3,.7,.4,1) 2}
.hero.is-cheer .h-shadow{animation:hk-shade .78s ease-in-out 2}
.hero.is-win .h-all{animation:hk-dance 1s cubic-bezier(.3,.7,.4,1) infinite}
.hero.is-win .h-shadow{animation:hk-shade 1s ease-in-out infinite}
.hero.is-cheer .h-armL,.hero.is-win .h-armL{animation:hk-yayL .3s ease-in-out infinite}
.hero.is-cheer .h-armR,.hero.is-win .h-armR{animation:hk-yayR .3s ease-in-out -.15s infinite}
.hero.is-cheer .h-p{animation:hk-burst .8s cubic-bezier(.2,.8,.3,1) both}
.hero.is-win .h-p{animation:hk-burst 1s cubic-bezier(.2,.8,.3,1) infinite}
.hero.is-cheer .h-cape,.hero.is-win .h-cape{animation-duration:.5s}
.hero.is-cheer .h-top,.hero.is-win .h-top,.hero.is-turn .h-top{animation-duration:.5s}
.hero.is-cheer .h-eyes-open,.hero.is-win .h-eyes-open,.hero.is-cheer .h-mouth-smile,.hero.is-win .h-mouth-smile{display:none}
.hero.is-cheer .h-eyes-happy,.hero.is-win .h-eyes-happy,.hero.is-cheer .h-mouth-open,.hero.is-win .h-mouth-open,.hero.is-turn .h-mouth-open{display:inline}
.hero.is-turn .h-mouth-smile{display:none}

.hero.is-oops .h-all{animation:hk-shake .5s ease-in-out}
.hero.is-oops .h-head{animation:none;transform:rotate(7deg) translateY(3px)}
.hero.is-oops .h-eyes-open{animation:none;transform:translateY(3px)}
.hero.is-oops .h-armL{animation:none;transform:rotate(-14deg)}
.hero.is-oops .h-armR{animation:none;transform:rotate(14deg)}
.hero.is-oops .h-top,.hero.is-oops .h-earL,.hero.is-oops .h-earR{animation:none;transform:rotate(14deg)}
.hero.is-oops .h-mouth-smile{display:none}.hero.is-oops .h-mouth-o{display:inline}

.hero.is-sleep .h-all{animation:hk-breathe 4.6s ease-in-out infinite}
.hero.is-sleep .h-head{animation:none;transform:rotate(6deg) translateY(2px)}
.hero.is-sleep .h-eyes-open{display:none}.hero.is-sleep .h-eyes-shut{display:inline}
.hero.is-sleep .h-zz{display:inline}
.hero.is-sleep .h-zz path{animation:hk-zz 2.6s ease-in-out infinite}.hero.is-sleep .h-zz path:nth-child(2){animation-delay:-1.3s}
.hero.is-sleep .h-cape,.hero.is-sleep .h-top,.hero.is-sleep .h-earL,.hero.is-sleep .h-earR,.hero.is-sleep .h-armL,.hero.is-sleep .h-armR,.hero.is-sleep .h-twinkle,.hero.is-sleep .h-glow,.hero.is-sleep .h-bubs circle{animation-play-state:paused}

.hero.is-pop .h-all{animation:hk-pop .6s cubic-bezier(.3,1.7,.5,1) both}
.hero.is-pop .h-p{animation:hk-burst .7s cubic-bezier(.2,.8,.3,1) .1s both}
.hero.is-pop .h-eyes-open{display:none}.hero.is-pop .h-eyes-happy{display:inline}

@keyframes hk-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.014,.984)}}
@keyframes hk-nod{0%,100%{transform:rotate(0)}50%{transform:rotate(-2.6deg)}}
@keyframes hk-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}
@keyframes hk-flutter{0%,100%{transform:skewX(0) rotate(0)}50%{transform:skewX(-5deg) rotate(2.5deg)}}
@keyframes hk-wig{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}
@keyframes hk-ear{0%,84%,100%{transform:rotate(0)}90%{transform:rotate(-9deg)}95%{transform:rotate(4deg)}}
@keyframes hk-swayL{0%,100%{transform:rotate(0)}50%{transform:rotate(5deg)}}
@keyframes hk-swayR{0%,100%{transform:rotate(0)}50%{transform:rotate(-5deg)}}
@keyframes hk-glow{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes hk-twinkle{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.22) rotate(18deg)}}
@keyframes hk-bub{0%{transform:translateY(8px);opacity:0}25%{opacity:1}100%{transform:translateY(-22px);opacity:0}}
@keyframes hk-hop{0%,100%{transform:translateY(0) scale(1,1)}14%{transform:translateY(0) scale(1.07,.92)}50%{transform:translateY(-15px) scale(.97,1.04)}86%{transform:translateY(0) scale(1.05,.95)}}
@keyframes hk-jump{0%,100%{transform:translateY(0) scale(1,1)}13%{transform:translateY(0) scale(1.13,.84)}42%{transform:translateY(-34px) scale(.92,1.1)}55%{transform:translateY(-37px) scale(1,1)}80%{transform:translateY(0) scale(1.11,.87)}91%{transform:translateY(0) scale(.97,1.04)}}
@keyframes hk-dance{0%,100%{transform:translateY(0) rotate(0) scale(1,1)}14%{transform:translateY(0) rotate(0) scale(1.1,.88)}45%{transform:translateY(-27px) rotate(-7deg) scale(.95,1.07)}72%{transform:translateY(0) rotate(4deg) scale(1.08,.9)}}
@keyframes hk-shade{0%,100%{transform:scale(1);opacity:1}48%{transform:scale(.62);opacity:.45}}
@keyframes hk-wave{0%,100%{transform:rotate(-92deg)}50%{transform:rotate(-122deg)}}
@keyframes hk-yayL{0%,100%{transform:rotate(94deg)}50%{transform:rotate(112deg)}}
@keyframes hk-yayR{0%,100%{transform:rotate(-94deg)}50%{transform:rotate(-112deg)}}
@keyframes hk-burst{0%{opacity:0;transform:translate(0,0) scale(.2) rotate(0)}22%{opacity:1}70%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1.3) rotate(var(--r))}}
@keyframes hk-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
@keyframes hk-zz{0%{transform:translate(-4px,8px);opacity:0}30%{opacity:1}100%{transform:translate(6px,-8px);opacity:0}}
@keyframes hk-pop{0%{transform:scale(0) rotate(-18deg)}60%{transform:scale(1.12) rotate(4deg)}100%{transform:scale(1) rotate(0)}}
@media (prefers-reduced-motion:reduce){.hero *{animation:none!important;transition:none!important}
  .hero.is-cheer .h-armL,.hero.is-win .h-armL{transform:rotate(104deg)}.hero.is-cheer .h-armR,.hero.is-win .h-armR,.hero.is-turn .h-armR{transform:rotate(-104deg)}
  .hero.is-cheer .h-p,.hero.is-win .h-p{opacity:1;transform:translate(var(--x),var(--y))}}`;

	/* ---------- putting a hero together ---------- */
	const FULL = '0 0 200 224', BUST = '20 0 160 160';
	function inner(id, color) {
		const h = (HEROES[id] || HEROES[LIST[0]])(color);
		const top = h.top ? `<style>.hero-${id} .h-top{transform-origin:${h.top}}</style>` : '';

		return `${top}<ellipse class="h-shadow" cx="100" cy="214" rx="46" ry="7.5" fill="#2a1740" fill-opacity=".16"/>
			<g class="h-all">${h.back || ''}${h.legs}${h.body}${h.scarf || ''}<g class="h-head">${h.head}${h.face}${h.over || ''}</g>${h.armL}${h.armR}${fx(h.bit)}${zz}</g>`;
	}
	const cls = (id, mood) => `hero hero-${id}${mood && mood !== 'idle' ? ` is-${mood}` : ''}`;

	function svg(id, color, {bust = false, mood = '', className = ''} = {}) {
		return `<svg class="${cls(id, mood)}${className ? ` ${className}` : ''}" viewBox="${bust ? BUST : FULL}" aria-hidden="true" focusable="false">${inner(id, color)}</svg>`;
	}

	// as an image: the styles travel inside, so it keeps blinking in an <img>; a canvas takes its calm first frame
	const urls = {};
	function url(id, color, {bust = false, mood = ''} = {}) {
		const key = [id, color, bust, mood].join('|');
		if (!urls[key]) {
			const size = bust ? 'width="480" height="480"' : 'width="500" height="560"';
			urls[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
				`<svg xmlns="http://www.w3.org/2000/svg" ${size} class="${cls(id, mood)}" viewBox="${bust ? BUST : FULL}"><style>${css}</style>${inner(id, color)}</svg>`);
		}

		return urls[key];
	}

	// play a mood for a moment (ms = 0: keep it), then go back to the mood it had
	const MOODS = ['turn', 'cheer', 'win', 'oops', 'sleep', 'pop'];
	const timers = new WeakMap();
	function setMood(el, mood) {
		MOODS.forEach((m) => el.classList.remove(`is-${m}`));
		if (mood && mood !== 'idle') {
			void el.getBoundingClientRect(); // so the same mood can play again
			el.classList.add(`is-${mood}`);
		}
	}
	function react(el, mood, ms = 1600) {
		if (!el) return;
		if (el.dataset.base === undefined) el.dataset.base = MOODS.find((m) => el.classList.contains(`is-${m}`)) || '';
		clearTimeout(timers.get(el));
		setMood(el, mood);
		if (ms > 0) timers.set(el, setTimeout(() => setMood(el, el.dataset.base), ms));
		else el.dataset.base = mood;
	}

	if (typeof document !== 'undefined' && !document.getElementById('party-heroes-css')) {
		const style = document.createElement('style');
		style.id = 'party-heroes-css';
		style.textContent = css;
		document.head.appendChild(style);
	}

	window.PartyHeroes = {LIST, svg, url, react, setMood, css};
})();
