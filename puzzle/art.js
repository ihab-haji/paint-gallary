/* Puzzle art, all drawn in code (no downloads, works offline).
   PICTURES: 1200×800 scenes for the picture puzzles (they are cut into jigsaw pieces).
   ANIMALS: 400×400 animals made of parts for "build the animal" (each part is dragged onto its shadow).
   Every scene is a plain SVG string; puzzle.js turns it into an image. */
(() => {
	// the same "random" every time, so a scene never changes between visits
	function seeded(seed) {
		let a = seed;

		return () => {
			a = (a + 0x6d2b79f5) | 0;
			let r = Math.imul(a ^ (a >>> 15), 1 | a);
			r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;

			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};
	}

	const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

	/* ---------- little helpers shared by the scenes ---------- */
	const eye = (x, y, r = 14) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 0.15}" cy="${y + r * 0.1}" r="${r * 0.62}" fill="#1d1b38"/><circle cx="${x - r * 0.1}" cy="${y - r * 0.18}" r="${r * 0.24}" fill="#fff"/>`;


	const fish = (x, y, s, body, fin, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
		<path d="M-42 0 L-82 -30 Q-70 0 -82 30 Z" fill="${fin}"/>
		<path d="M-10 -30 Q10 -58 34 -28 Z" fill="${fin}"/>
		<ellipse cx="0" cy="0" rx="52" ry="34" fill="${body}"/>
		<path d="M-14 -32 Q-26 0 -14 32" stroke="#fff" stroke-width="9" fill="none" opacity=".7"/>
		<path d="M6 8 Q14 22 28 12" stroke="${fin}" stroke-width="5" fill="none" stroke-linecap="round"/>
		${eye(24, -8, 11)}
		<path d="M38 12 Q44 18 50 12" stroke="#1d1b38" stroke-width="3.5" fill="none" stroke-linecap="round"/>
	</g>`;


	const flower = (x, y, s, petal, middle = '#ffd43b') => {
		const petals = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-15" rx="10" ry="15" fill="${petal}" transform="rotate(${a})"/>`).join('');

		return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q4 30 0 60" stroke="#2f9e44" stroke-width="5" fill="none"/>${petals}<circle r="9" fill="${middle}"/></g>`;
	};

	const butterfly = (x, y, s, a, b) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(-12)">
		<ellipse cx="-20" cy="-14" rx="22" ry="18" fill="${a}"/><ellipse cx="20" cy="-14" rx="22" ry="18" fill="${a}"/>
		<ellipse cx="-16" cy="14" rx="14" ry="12" fill="${b}"/><ellipse cx="16" cy="14" rx="14" ry="12" fill="${b}"/>
		<circle cx="-20" cy="-14" r="7" fill="#fff" opacity=".7"/><circle cx="20" cy="-14" r="7" fill="#fff" opacity=".7"/>
		<rect x="-4" y="-24" width="8" height="46" rx="4" fill="#3b2f63"/>
		<path d="M-2 -22 Q-10 -40 -16 -42 M2 -22 Q10 -40 16 -42" stroke="#3b2f63" stroke-width="3" fill="none" stroke-linecap="round"/>
	</g>`;

	const sparkles = (rand, n, w, h, color = '#fff', maxR = 4) => Array.from({length: n}, () => {
		const r = 1 + rand() * maxR;

		return `<circle cx="${(rand() * w).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${(0.4 + rand() * 0.6).toFixed(2)}"/>`;
	}).join('');

	const twinkle = (x, y, s, color = '#fff') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" fill="${color}"/>`;

	/* =====================================================================
	   DRAWN SCENE · the jungle lion
	   ===================================================================== */
	function jungle() {
		const mane = Array.from({length: 16}, (_, i) => {
			const a = (i / 16) * Math.PI * 2;

			return `<circle cx="${(Math.cos(a) * 118).toFixed(1)}" cy="${(Math.sin(a) * 112).toFixed(1)}" r="50"/>`;
		}).join('');
		const leaves = (x, y, s, r, c) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" fill="${c}"><path d="M0 0 C40 -30 90 -20 120 0 C90 20 40 30 0 0Z"/><path d="M0 0 C30 -10 80 -10 120 0" stroke="#1b5e20" stroke-opacity=".25" stroke-width="4" fill="none"/></g>`;

		return svg(1200, 800, `
		<defs>
			<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".6" stop-color="#c8f2a8"/><stop offset="1" stop-color="#8ed96b"/></linearGradient>
			<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffe066" stop-opacity=".9"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>
			<linearGradient id="fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd25e"/><stop offset="1" stop-color="#f7b733"/></linearGradient>
		</defs>
		<rect width="1200" height="800" fill="url(#sky)"/>
		<circle cx="980" cy="150" r="170" fill="url(#sun)"/><circle cx="980" cy="150" r="66" fill="#ffe066"/>
		<!-- far trees -->
		<g fill="#7bc96f" opacity=".75"><circle cx="80" cy="420" r="120"/><circle cx="240" cy="380" r="110"/><circle cx="960" cy="420" r="120"/><circle cx="1130" cy="380" r="120"/><circle cx="600" cy="470" r="110"/></g>
		<g fill="#4caf50"><rect x="140" y="140" width="46" height="560" rx="18" fill="#8d5a3b"/><circle cx="160" cy="150" r="130"/><circle cx="60" cy="230" r="100"/><circle cx="270" cy="210" r="100"/></g>
		<g fill="#43a047"><rect x="1010" y="180" width="50" height="520" rx="18" fill="#7a4a2e"/><circle cx="1040" cy="170" r="130"/><circle cx="1150" cy="250" r="100"/><circle cx="930" cy="250" r="96"/></g>
		<!-- vines -->
		<g stroke="#2e7d32" stroke-width="7" fill="none" stroke-linecap="round"><path d="M330 0 C320 120 350 200 330 300"/><path d="M860 0 C880 100 850 180 870 250"/></g>
		${leaves(330, 140, 0.45, 30, '#66bb6a')}${leaves(334, 220, 0.42, 150, '#81c784')}${leaves(330, 290, 0.4, 40, '#66bb6a')}
		${leaves(866, 110, 0.45, 150, '#66bb6a')}${leaves(870, 200, 0.42, 30, '#81c784')}
		${leaves(-10, 60, 1.3, 20, '#2e7d32')}${leaves(1210, 40, 1.3, 160, '#2e7d32')}
		<!-- ground -->
		<path d="M0 600 C200 560 420 600 600 580 C800 560 1000 590 1200 570 V800 H0Z" fill="#6cc04a"/>
		<path d="M0 680 C220 650 440 690 640 670 C860 650 1020 680 1200 660 V800 H0Z" fill="#58b039"/>
		<g fill="#3f9b2a">${Array.from({length: 26}, (_, i) => `<path d="M${i * 48 + 10} 800 l10 -46 l10 46Z"/>`).join('')}</g>
		<!-- lion: tail, body, mane, head -->
		<g transform="translate(600 450)">
			<path d="M120 170 C210 180 250 120 240 60" stroke="#f7b733" stroke-width="22" fill="none" stroke-linecap="round"/>
			<path d="M240 66 C214 40 226 6 254 18 C280 30 270 70 240 66Z" fill="#b8541c"/>
			<path d="M-130 230 C-140 110 -80 60 0 60 C80 60 140 110 130 230 Z" fill="url(#fur)"/>
			<path d="M-60 230 C-60 150 60 150 60 230Z" fill="#fff1c4"/>
			<g fill="#ffd25e"><ellipse cx="-80" cy="232" rx="42" ry="24"/><ellipse cx="80" cy="232" rx="42" ry="24"/></g>
			<g stroke="#d9951e" stroke-width="4" stroke-linecap="round"><path d="M-92 220 V236 M-78 218 V236 M68 218 V236 M82 220 V236"/></g>
			<g fill="#c4621d" transform="translate(0 -60)">${mane}<circle r="120"/></g>
			<g fill="#e07b29" transform="translate(0 -60)"><circle cx="-60" cy="-92" r="30"/><circle cx="60" cy="-92" r="30"/></g>
			<g transform="translate(0 -60)">
				<circle cx="-78" cy="-74" r="26" fill="#ffd25e"/><circle cx="78" cy="-74" r="26" fill="#ffd25e"/>
				<circle cx="-78" cy="-74" r="13" fill="#ffa8a8"/><circle cx="78" cy="-74" r="13" fill="#ffa8a8"/>
				<ellipse cx="0" cy="0" rx="100" ry="94" fill="url(#fur)"/>
				${eye(-38, -18, 20)}${eye(38, -18, 20)}
				<path d="M-58 -46 Q-38 -58 -20 -48 M20 -48 Q38 -58 58 -46" stroke="#8a3d12" stroke-width="7" fill="none" stroke-linecap="round"/>
				<ellipse cx="0" cy="40" rx="50" ry="36" fill="#fff1c4"/>
				<path d="M-18 18 Q0 10 18 18 Q12 34 0 36 Q-12 34 -18 18Z" fill="#8a3d12"/>
				<path d="M0 36 V48 M-24 48 Q0 74 24 48" stroke="#8a3d12" stroke-width="6" fill="none" stroke-linecap="round"/>
				<path d="M-14 54 Q0 70 14 54Z" fill="#ff6b6b"/>
				<ellipse cx="-66" cy="22" rx="16" ry="10" fill="#ff922b" opacity=".55"/><ellipse cx="66" cy="22" rx="16" ry="10" fill="#ff922b" opacity=".55"/>
			</g>
		</g>
		${flower(110, 690, 1, '#ff6b8b')}${flower(220, 730, 0.8, '#ffffff')}${flower(1010, 700, 1, '#b197fc')}${flower(1110, 730, 0.85, '#ff922b')}${flower(420, 740, 0.7, '#ffd43b', '#ff922b')}
		${butterfly(330, 420, 1, '#ff8fab', '#ffd43b')}${butterfly(880, 380, 0.85, '#74c0fc', '#b197fc')}
		<!-- parrot -->
		<g transform="translate(800 120)">
			<path d="M-10 40 C-30 90 -20 140 -40 170 C0 150 20 100 18 50Z" fill="#1c7ed6"/>
			<ellipse cx="0" cy="20" rx="34" ry="46" fill="#fa5252"/>
			<path d="M-30 10 C-60 40 -50 80 -20 90 C-10 60 -10 30 -30 10Z" fill="#fab005"/>
			<circle cx="8" cy="-20" r="30" fill="#fa5252"/>
			${eye(14, -26, 9)}
			<path d="M30 -24 C54 -20 52 4 34 6 Q40 -6 26 -10Z" fill="#ffd43b"/>
			<path d="M-14 66 L-24 82 M6 66 L4 84" stroke="#495057" stroke-width="5" stroke-linecap="round"/>
		</g>
		<path d="M720 186 C780 192 860 190 920 184" stroke="#8d5a3b" stroke-width="12" stroke-linecap="round"/>
		`);
	}

	/* =====================================================================
	   DRAWN SCENE · rocket in space
	   ===================================================================== */
	function space() {
		const rand = seeded(42);
		const stars = Array.from({length: 14}, () => twinkle((rand() * 1200).toFixed(0), (rand() * 800).toFixed(0), (0.3 + rand() * 0.5).toFixed(2), rand() > 0.5 ? '#fff' : '#ffe066')).join('');

		return svg(1200, 800, `
		<defs>
			<radialGradient id="sp" cx=".35" cy=".3" r="1"><stop offset="0" stop-color="#3b2d8f"/><stop offset=".55" stop-color="#1e1b5e"/><stop offset="1" stop-color="#0c0f33"/></radialGradient>
			<radialGradient id="neb" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f783ac" stop-opacity=".45"/><stop offset="1" stop-color="#f783ac" stop-opacity="0"/></radialGradient>
			<radialGradient id="neb2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#4dabf7" stop-opacity=".4"/><stop offset="1" stop-color="#4dabf7" stop-opacity="0"/></radialGradient>
			<linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc078"/><stop offset="1" stop-color="#f76707"/></linearGradient>
			<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3bf"/><stop offset=".4" stop-color="#ffd43b"/><stop offset="1" stop-color="#ff6b35" stop-opacity="0"/></linearGradient>
		</defs>
		<rect width="1200" height="800" fill="url(#sp)"/>
		<ellipse cx="300" cy="560" rx="420" ry="260" fill="url(#neb)"/><ellipse cx="900" cy="200" rx="420" ry="240" fill="url(#neb2)"/>
		${sparkles(rand, 120, 1200, 800, '#fff', 2.4)}${stars}
		<!-- ringed planet -->
		<g transform="translate(220 210) rotate(-18)">
			<ellipse cx="0" cy="0" rx="190" ry="44" fill="none" stroke="#ffe8a3" stroke-width="16" opacity=".9"/>
			<circle r="110" fill="url(#pl)"/>
			<path d="M-104 -30 C-40 -10 40 -50 106 -24" stroke="#ffa94d" stroke-width="16" fill="none"/>
			<path d="M-96 40 C-30 60 40 24 100 44" stroke="#e8590c" stroke-width="12" fill="none" opacity=".6"/>
			<path d="M-190 0 A190 44 0 0 0 190 0" fill="none" stroke="#ffe8a3" stroke-width="16"/>
			${eye(-36, -2, 14)}${eye(30, -2, 14)}
			<path d="M-20 30 Q0 46 20 30" stroke="#862e0a" stroke-width="5" fill="none" stroke-linecap="round"/>
		</g>
		<!-- moon -->
		<g transform="translate(1010 610)">
			<circle r="120" fill="#e9ecef"/><circle r="120" fill="#ced4da" opacity=".35" transform="translate(16 12) scale(.9)"/>
			<g fill="#ced4da"><circle cx="-50" cy="-56" r="20"/><circle cx="52" cy="-40" r="14"/><circle cx="56" cy="56" r="22"/><circle cx="-60" cy="50" r="12"/></g>
			<path d="M-34 -6 Q-22 -16 -10 -6 M10 -6 Q22 -16 34 -6" stroke="#495057" stroke-width="6" fill="none" stroke-linecap="round"/>
			<path d="M-20 20 Q0 38 20 20" stroke="#495057" stroke-width="6" fill="none" stroke-linecap="round"/>
			<ellipse cx="-50" cy="14" rx="14" ry="8" fill="#ffa8a8" opacity=".8"/><ellipse cx="50" cy="14" rx="14" ry="8" fill="#ffa8a8" opacity=".8"/>
		</g>
		<!-- little green planet -->
		<g transform="translate(1040 150)"><circle r="56" fill="#63e6be"/><path d="M-50 -10 C-20 -30 20 0 54 -16 M-44 26 C-10 12 20 34 50 20" stroke="#20c997" stroke-width="10" fill="none"/></g>
		<!-- rocket -->
		<g transform="translate(610 420) rotate(28)">
			<path d="M-34 150 C-30 230 -10 270 0 300 C10 270 30 230 34 150Z" fill="url(#fl)"/>
			<path d="M-20 150 C-18 200 -6 230 0 250 C6 230 18 200 20 150Z" fill="#fff9db"/>
			<path d="M-60 60 C-110 90 -120 150 -100 170 L-54 140Z" fill="#e03131"/>
			<path d="M60 60 C110 90 120 150 100 170 L54 140Z" fill="#e03131"/>
			<path d="M0 -200 C70 -130 76 -10 60 150 L-60 150 C-76 -10 -70 -130 0 -200Z" fill="#f8f9fa"/>
			<path d="M0 -200 C34 -166 54 -120 62 -80 L-62 -80 C-54 -120 -34 -166 0 -200Z" fill="#fa5252"/>
			<path d="M60 -40 C70 40 66 100 60 150 L40 150 C46 90 46 30 40 -40Z" fill="#dee2e6"/>
			<rect x="-64" y="120" width="128" height="34" rx="10" fill="#fa5252"/>
			<circle cx="0" cy="-10" r="42" fill="#74c0fc" stroke="#adb5bd" stroke-width="12"/>
			<path d="M-18 -30 A26 26 0 0 1 14 -36" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>
			<rect x="-7" y="150" width="14" height="80" rx="7" fill="#e03131"/>
		</g>
		<!-- shooting star -->
		<path d="M760 90 L940 30" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"/>${twinkle(944, 28, 0.9, '#ffe066')}
		<!-- flying saucer with a friendly alien -->
		<g transform="translate(240 620) rotate(-8)">
			<path d="M-46 -20 C-46 -80 46 -80 46 -20Z" fill="#a5d8ff" opacity=".8"/>
			<circle cx="0" cy="-34" r="24" fill="#69db7c"/>${eye(-9, -38, 8)}${eye(9, -38, 8)}
			<path d="M-8 -24 Q0 -18 8 -24" stroke="#2b8a3e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
			<path d="M-12 -56 L-20 -76 M12 -56 L20 -76" stroke="#69db7c" stroke-width="4"/><circle cx="-20" cy="-78" r="6" fill="#ffd43b"/><circle cx="20" cy="-78" r="6" fill="#ffd43b"/>
			<ellipse cx="0" cy="-12" rx="120" ry="36" fill="#9775fa"/><ellipse cx="0" cy="-20" rx="90" ry="20" fill="#b197fc"/>
			<g fill="#ffe066"><circle cx="-80" cy="-6" r="9"/><circle cx="-40" cy="4" r="9"/><circle cx="0" cy="8" r="9"/><circle cx="40" cy="4" r="9"/><circle cx="80" cy="-6" r="9"/></g>
		</g>
		`);
	}

	/* =====================================================================
	   DRAWN SCENE · the snowy north
	   ===================================================================== */
	function arctic() {
		const rand = seeded(11);
		const flakes = Array.from({length: 26}, () => `<circle cx="${(rand() * 1200).toFixed(0)}" cy="${(rand() * 470).toFixed(0)}" r="${(2 + rand() * 4).toFixed(1)}" fill="#fff" opacity=".9"/>`).join('');
		const penguin = (x, y, s, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
			<path d="M-40 60 L-60 20 L-34 0Z" fill="#212f45"/>
			<ellipse cx="0" cy="0" rx="50" ry="74" fill="#26355a"/>
			<ellipse cx="0" cy="16" rx="36" ry="56" fill="#fff"/>
			<path d="M-36 -46 C-40 -10 -10 -14 0 -30 C10 -14 40 -10 36 -46 C26 -66 -26 -66 -36 -46Z" fill="#fff"/>
			${eye(-14, -42, 9)}${eye(14, -42, 9)}
			<path d="M-10 -26 L10 -26 L0 -12Z" fill="#ff922b"/>
			<ellipse cx="-26" cy="-26" rx="8" ry="5" fill="#ffa8a8"/><ellipse cx="26" cy="-26" rx="8" ry="5" fill="#ffa8a8"/>
			<path d="M46 -6 C70 10 70 30 54 40 Z" fill="#212f45"/>
			<ellipse cx="-18" cy="74" rx="18" ry="8" fill="#ff922b"/><ellipse cx="18" cy="74" rx="18" ry="8" fill="#ff922b"/>
		</g>`;

		return svg(1200, 800, `
		<defs>
			<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5d8ff"/><stop offset="1" stop-color="#e7f5ff"/></linearGradient>
			<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4dabf7"/><stop offset="1" stop-color="#1c7ed6"/></linearGradient>
			<linearGradient id="ice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d0ebff"/></linearGradient>
			<linearGradient id="aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#63e6be" stop-opacity="0"/><stop offset=".5" stop-color="#63e6be" stop-opacity=".55"/><stop offset="1" stop-color="#b197fc" stop-opacity="0"/></linearGradient>
		</defs>
		<rect width="1200" height="800" fill="url(#sky)"/>
		<path d="M0 150 C300 60 600 220 900 110 C1020 70 1120 90 1200 70" stroke="url(#aur)" stroke-width="60" fill="none" stroke-linecap="round"/>
		${flakes}
		<path d="M0 470 L120 300 L210 400 L330 220 L470 420 L560 330 L700 470Z" fill="#dbe4ff"/>
		<path d="M330 220 L380 290 L350 280 L330 310 L300 270 L280 290Z M120 300 L150 340 L120 336 L100 350 L90 340Z" fill="#fff"/>
		<path d="M600 470 L800 260 L920 380 L1040 240 L1200 420 V470Z" fill="#c5d4fb"/>
		<path d="M800 260 L850 316 L816 306 L790 330 L770 300Z M1040 240 L1090 296 L1054 288 L1030 310 L1010 280Z" fill="#fff"/>
		<rect y="460" width="1200" height="340" fill="url(#sea)"/>
		<g stroke="#a5d8ff" stroke-width="5" stroke-linecap="round" opacity=".7"><path d="M80 560 h80 M460 520 h60 M760 600 h90 M1080 540 h70 M300 760 h60"/></g>
		<!-- big ice floe with the igloo and penguins -->
		<path d="M-20 640 C100 590 300 580 520 610 L540 680 C380 700 160 700 -20 690Z" fill="url(#ice)"/>
		<path d="M-20 690 C160 700 380 700 540 680 L530 712 C360 730 160 730 -20 720Z" fill="#91c4f2"/>
		<g transform="translate(150 600)">
			<path d="M-110 10 C-110 -110 110 -110 110 10Z" fill="#f8f9fa" stroke="#bcd7f5" stroke-width="4"/>
			<g stroke="#bcd7f5" stroke-width="4" fill="none"><path d="M-104 -30 H104 M-80 -66 H80 M-30 -96 V-66 M30 -96 V-66 M-60 -66 V-30 M0 -66 V-30 M60 -66 V-30 M-30 -30 V10 M30 -30 V10"/></g>
			<path d="M-34 10 C-34 -40 34 -40 34 10Z" fill="#1864ab"/>
		</g>
		${penguin(360, 560, 0.85)}${penguin(450, 580, 0.6, true)}
		<!-- polar bear on its floe -->
		<path d="M640 560 C760 520 980 520 1140 550 L1150 610 C980 630 780 630 630 610Z" fill="url(#ice)"/>
		<path d="M630 610 C780 630 980 630 1150 610 L1146 640 C980 660 780 660 634 640Z" fill="#91c4f2"/>
		<g transform="translate(900 470)">
			<ellipse cx="0" cy="40" rx="150" ry="80" fill="#fff" stroke="#d0ebff" stroke-width="4"/>
			<g fill="#fff" stroke="#d0ebff" stroke-width="4"><rect x="-120" y="60" width="54" height="74" rx="24"/><rect x="-40" y="70" width="54" height="66" rx="24"/><rect x="50" y="70" width="54" height="66" rx="24"/><rect x="100" y="56" width="50" height="74" rx="24"/></g>
			<g transform="translate(-150 -10)">
				<circle cx="-50" cy="-60" r="22" fill="#fff" stroke="#d0ebff" stroke-width="4"/><circle cx="50" cy="-60" r="22" fill="#fff" stroke="#d0ebff" stroke-width="4"/>
				<circle cx="-50" cy="-60" r="10" fill="#ffc9c9"/><circle cx="50" cy="-60" r="10" fill="#ffc9c9"/>
				<ellipse cx="0" cy="0" rx="80" ry="72" fill="#fff" stroke="#d0ebff" stroke-width="4"/>
				${eye(-28, -14, 12)}${eye(28, -14, 12)}
				<ellipse cx="0" cy="26" rx="34" ry="24" fill="#f1f3f5"/>
				<ellipse cx="0" cy="14" rx="14" ry="10" fill="#343a40"/>
				<path d="M-14 36 Q0 48 14 36" stroke="#343a40" stroke-width="5" fill="none" stroke-linecap="round"/>
				<ellipse cx="-50" cy="18" rx="12" ry="7" fill="#ffa8a8" opacity=".7"/><ellipse cx="50" cy="18" rx="12" ry="7" fill="#ffa8a8" opacity=".7"/>
			</g>
		</g>
		<!-- seal and a jumping fish -->
		<g transform="translate(640 720)"><path d="M-80 10 C-80 -40 40 -50 70 -10 C90 20 60 30 20 30 L-70 30Z" fill="#868e96"/><path d="M-80 10 L-120 -10 L-110 20 L-120 40Z" fill="#868e96"/>${eye(46, -14, 8)}<ellipse cx="74" cy="-4" rx="9" ry="6" fill="#343a40"/></g>
		<path d="M560 740 C560 700 600 690 620 680" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/>
		${fish(1060, 700, 0.7, '#ff922b', '#e8590c', true).replace('<g ', '<g opacity="1" ')}
		`);
	}

	/* =====================================================================
	   BUILD THE ANIMAL: each part is drawn where it belongs in a 400×400 box.
	   The order of the parts = the order they stack (first is at the back).
	   ===================================================================== */
	const eyeDog = (x, y) => `<circle cx="${x}" cy="${y}" r="20" fill="#fff"/><circle cx="${x}" cy="${y + 1}" r="15" fill="#151515"/><circle cx="${x + 5}" cy="${y - 5}" r="5.5" fill="#fff"/>`;

	const ANIMALS = [
		{
			id: 'dog', color: '#d27d3e', bg: '#ffe8cc',
			parts: [
				{id: 'tail', svg: `<path d="M268 300 C312 300 340 268 344 222 C346 206 364 206 364 226 C362 286 322 330 268 334 Z" fill="#b5642b"/>`},
				{id: 'body', svg: `<path d="M150 214 L250 214 C262 260 274 318 280 352 Q200 370 120 352 C126 318 138 260 150 214 Z" fill="#d27d3e" stroke="#a9592a" stroke-width="4"/>
					<path d="M178 220 L222 220 C228 270 232 320 234 352 Q200 362 166 352 C168 320 172 270 178 220 Z" fill="#fff"/>
					<ellipse cx="156" cy="356" rx="32" ry="18" fill="#fff" stroke="#c9c9c9" stroke-width="3"/><ellipse cx="244" cy="356" rx="32" ry="18" fill="#fff" stroke="#c9c9c9" stroke-width="3"/>
					<path d="M146 362 v8 M160 362 v8 M234 362 v8 M248 362 v8" stroke="#c9c9c9" stroke-width="3" stroke-linecap="round"/>`},
				{id: 'collar', svg: `<path d="M140 218 Q200 240 260 218 L264 240 Q200 264 136 240 Z" fill="#8aa6ff" stroke="#3b5bdb" stroke-width="3"/>
					<path d="M146 232 Q200 252 254 232" stroke="#1c3fae" stroke-width="2.5" stroke-dasharray="7 6" fill="none"/>
					<circle cx="200" cy="262" r="12" fill="#ffd34d" stroke="#e8a400" stroke-width="3"/><circle cx="196" cy="258" r="3" fill="#fff"/>`},
				{id: 'earL', svg: `<path d="M140 78 C104 84 86 134 90 196 C93 228 120 238 136 222 C152 186 160 126 152 84 Z" fill="#b5642b"/>`},
				{id: 'earR', svg: `<path d="M260 78 C296 84 314 134 310 196 C307 228 280 238 264 222 C248 186 240 126 248 84 Z" fill="#b5642b"/>`},
				{id: 'head', svg: `<path d="M200 44 C256 44 282 80 282 126 C282 160 274 180 264 196 C246 218 224 226 200 226 C176 226 154 218 136 196 C126 180 118 160 118 126 C118 80 144 44 200 44 Z" fill="#d27d3e" stroke="#a9592a" stroke-width="4"/>
					<path d="M188 46 L212 46 C214 86 222 124 240 156 C252 176 250 208 230 218 Q200 230 170 218 C150 208 148 176 160 156 C178 124 186 86 188 46 Z" fill="#fff"/>
					<path d="M146 112 Q166 98 186 110 M214 110 Q234 98 254 112" stroke="#8e2020" stroke-width="12" stroke-linecap="round" fill="none"/>
					${eyeDog(166, 140)}${eyeDog(234, 140)}
					<ellipse cx="200" cy="180" rx="22" ry="14" fill="#151515"/><ellipse cx="194" cy="175" rx="6" ry="3" fill="#fff" opacity=".7"/>
					<path d="M182 204 Q200 216 218 204" stroke="#9a9a9a" stroke-width="4" fill="none" stroke-linecap="round"/>`}
			]
		},
		{
			id: 'cat', color: '#ff922b', bg: '#fff0e0',
			parts: [
				{id: 'tail', svg: `<path d="M272 330 C334 330 352 280 338 230 C332 212 348 202 356 218 C376 280 348 352 276 354 Z" fill="#ff922b"/><path d="M342 244 L360 238 M344 276 L364 276 M330 312 L348 324" stroke="#e8590c" stroke-width="7" stroke-linecap="round"/>`},
				{id: 'body', svg: `<path d="M200 200 C256 200 286 258 290 328 C292 354 270 364 200 364 C130 364 108 354 110 328 C114 258 144 200 200 200 Z" fill="#ff922b"/>
					<ellipse cx="200" cy="300" rx="44" ry="54" fill="#fff4e6"/>
					<path d="M122 280 L148 286 M118 310 L146 312 M278 280 L252 286 M282 310 L254 312" stroke="#e8590c" stroke-width="7" stroke-linecap="round"/>
					<ellipse cx="164" cy="362" rx="30" ry="15" fill="#fff4e6"/><ellipse cx="236" cy="362" rx="30" ry="15" fill="#fff4e6"/>`},
				{id: 'earL', svg: `<path d="M120 124 L112 34 L190 82 Z" fill="#ff922b" stroke="#e8590c" stroke-width="4" stroke-linejoin="round"/><path d="M132 106 L128 60 L170 86 Z" fill="#ffa8c5"/>`},
				{id: 'earR', svg: `<path d="M280 124 L288 34 L210 82 Z" fill="#ff922b" stroke="#e8590c" stroke-width="4" stroke-linejoin="round"/><path d="M268 106 L272 60 L230 86 Z" fill="#ffa8c5"/>`},
				{id: 'head', svg: `<ellipse cx="200" cy="140" rx="92" ry="80" fill="#ff922b"/>
					<path d="M186 66 L190 92 M200 62 V94 M214 66 L210 92" stroke="#e8590c" stroke-width="7" stroke-linecap="round"/>
					<ellipse cx="200" cy="176" rx="46" ry="30" fill="#fff4e6"/>
					<ellipse cx="164" cy="136" rx="16" ry="20" fill="#51cf66"/><ellipse cx="236" cy="136" rx="16" ry="20" fill="#51cf66"/>
					<ellipse cx="164" cy="138" rx="6" ry="15" fill="#151515"/><ellipse cx="236" cy="138" rx="6" ry="15" fill="#151515"/>
					<circle cx="159" cy="128" r="4.5" fill="#fff"/><circle cx="231" cy="128" r="4.5" fill="#fff"/>
					<path d="M190 162 L210 162 L200 174 Z" fill="#f06595" stroke="#f06595" stroke-width="4" stroke-linejoin="round"/>
					<path d="M200 174 V182 M184 186 Q192 194 200 182 Q208 194 216 186" stroke="#862e0a" stroke-width="4" fill="none" stroke-linecap="round"/>
					<path d="M150 170 L104 160 M150 180 L102 184 M250 170 L296 160 M250 180 L298 184" stroke="#862e0a" stroke-width="3" stroke-linecap="round"/>
					<ellipse cx="140" cy="164" rx="12" ry="7" fill="#ff6b8b" opacity=".5"/><ellipse cx="260" cy="164" rx="12" ry="7" fill="#ff6b8b" opacity=".5"/>`},
				{id: 'bow', svg: `<path d="M200 226 L162 206 L166 248 Z M200 226 L238 206 L234 248 Z" fill="#cc5de8" stroke="#9c36b5" stroke-width="4" stroke-linejoin="round"/><circle cx="200" cy="226" r="12" fill="#e599f7" stroke="#9c36b5" stroke-width="4"/>`}
			]
		},
		{
			id: 'owl', color: '#845ef7', bg: '#efe8ff',
			parts: [
				{id: 'branch', svg: `<path d="M50 330 C150 318 250 318 350 330 L350 352 C250 342 150 342 50 352 Z" fill="#a0522d"/><path d="M320 332 C330 300 360 296 372 310 C356 326 340 330 320 332Z" fill="#51cf66"/><path d="M80 334 C66 306 40 306 30 320 C46 334 62 336 80 334Z" fill="#69db7c"/>`},
				{id: 'body', svg: `<path d="M200 76 C276 76 302 156 302 226 C302 296 262 334 200 334 C138 334 98 296 98 226 C98 156 124 76 200 76 Z" fill="#845ef7"/>
					<path d="M122 110 L112 54 L166 86 Z M278 110 L288 54 L234 86 Z" fill="#7048e8"/>
					<ellipse cx="200" cy="262" rx="62" ry="66" fill="#e5dbff"/>
					<path d="M176 236 q8 10 16 0 M208 236 q8 10 16 0 M160 266 q8 10 16 0 M192 266 q8 10 16 0 M224 266 q8 10 16 0 M176 296 q8 10 16 0 M208 296 q8 10 16 0" stroke="#b197fc" stroke-width="4" fill="none" stroke-linecap="round"/>`},
				{id: 'wingL', svg: `<path d="M106 176 C64 210 62 290 112 326 C128 282 132 222 122 184 Z" fill="#6741d9"/><path d="M98 230 q10 6 18 0 M96 262 q10 6 18 0" stroke="#9775fa" stroke-width="4" fill="none"/>`},
				{id: 'wingR', svg: `<path d="M294 176 C336 210 338 290 288 326 C272 282 268 222 278 184 Z" fill="#6741d9"/><path d="M284 230 q10 6 18 0 M286 262 q10 6 18 0" stroke="#9775fa" stroke-width="4" fill="none"/>`},
				{id: 'feet', svg: `<g fill="#ff922b"><ellipse cx="160" cy="338" rx="9" ry="14"/><ellipse cx="174" cy="340" rx="9" ry="14"/><ellipse cx="188" cy="338" rx="9" ry="14"/><ellipse cx="212" cy="338" rx="9" ry="14"/><ellipse cx="226" cy="340" rx="9" ry="14"/><ellipse cx="240" cy="338" rx="9" ry="14"/></g>`},
				{id: 'face', svg: `<circle cx="160" cy="160" r="48" fill="#d0bfff"/><circle cx="240" cy="160" r="48" fill="#d0bfff"/>
					<circle cx="160" cy="160" r="36" fill="#fff" stroke="#ffd43b" stroke-width="7"/><circle cx="240" cy="160" r="36" fill="#fff" stroke="#ffd43b" stroke-width="7"/>
					<circle cx="164" cy="164" r="18" fill="#151515"/><circle cx="236" cy="164" r="18" fill="#151515"/>
					<circle cx="158" cy="156" r="6" fill="#fff"/><circle cx="230" cy="156" r="6" fill="#fff"/>
					<path d="M200 188 L216 206 L200 226 L184 206 Z" fill="#ff922b" stroke="#e8590c" stroke-width="3" stroke-linejoin="round"/>`}
			]
		},
		{
			id: 'fish', color: '#ff922b', bg: '#e3fafc',
			parts: [
				{id: 'tail', svg: `<path d="M124 200 L36 112 C62 166 62 234 36 288 Z" fill="#f76707"/><path d="M60 150 L104 196 M60 250 L104 204" stroke="#ffa94d" stroke-width="6" stroke-linecap="round"/>`},
				{id: 'finTop', svg: `<path d="M160 136 C178 72 250 60 288 132 Z" fill="#ffd43b" stroke="#fab005" stroke-width="4" stroke-linejoin="round"/><path d="M196 124 L210 88 M230 126 L238 86" stroke="#fab005" stroke-width="4" stroke-linecap="round"/>`},
				{id: 'finBottom', svg: `<path d="M184 270 C196 330 246 344 262 278 Z" fill="#ffd43b" stroke="#fab005" stroke-width="4" stroke-linejoin="round"/>`},
				{id: 'body', svg: `<path d="M108 200 C140 118 240 98 302 138 C342 162 360 188 360 204 C360 220 342 246 302 270 C240 310 140 290 108 200 Z" fill="#ff922b"/>
					<path d="M180 126 C162 170 162 236 180 282 L206 286 C188 236 188 170 206 120 Z" fill="#fff"/>
					<path d="M252 120 C238 160 238 248 252 290 L270 282 C258 244 258 166 270 126 Z" fill="#fff"/>
					<circle cx="306" cy="184" r="20" fill="#fff"/><circle cx="310" cy="186" r="12" fill="#151515"/><circle cx="305" cy="180" r="4.5" fill="#fff"/>
					<path d="M326 222 Q338 230 348 220" stroke="#862e0a" stroke-width="4.5" fill="none" stroke-linecap="round"/>`},
				{id: 'finSide', svg: `<path d="M216 210 C236 180 276 190 270 226 C254 240 232 236 216 210 Z" fill="#ffd43b" stroke="#fab005" stroke-width="4" stroke-linejoin="round"/>`}
			]
		},
		{
			id: 'bunny', color: '#b197fc', bg: '#fff0f6',
			parts: [
				{id: 'tail', svg: `<circle cx="290" cy="318" r="28" fill="#fff" stroke="#d6cbe8" stroke-width="4"/><circle cx="282" cy="310" r="8" fill="#f3f0ff"/>`},
				{id: 'body', svg: `<ellipse cx="200" cy="292" rx="86" ry="80" fill="#f8f5ff" stroke="#d6cbe8" stroke-width="4"/>
					<ellipse cx="200" cy="304" rx="50" ry="52" fill="#fff"/>
					<ellipse cx="146" cy="364" rx="38" ry="18" fill="#f8f5ff" stroke="#d6cbe8" stroke-width="4"/><ellipse cx="254" cy="364" rx="38" ry="18" fill="#f8f5ff" stroke="#d6cbe8" stroke-width="4"/>
					<g fill="#ffc9de"><circle cx="134" cy="364" r="5"/><circle cx="148" cy="360" r="5"/><circle cx="162" cy="364" r="5"/><circle cx="238" cy="364" r="5"/><circle cx="252" cy="360" r="5"/><circle cx="266" cy="364" r="5"/></g>`},
				{id: 'earL', svg: `<path d="M158 132 C126 96 120 24 148 14 C176 6 188 76 188 128 Z" fill="#f8f5ff" stroke="#d6cbe8" stroke-width="4"/><path d="M164 118 C146 90 142 40 152 32 C166 28 174 78 174 116 Z" fill="#ffc9de"/>`},
				{id: 'earR', svg: `<path d="M242 132 C274 96 280 24 252 14 C224 6 212 76 212 128 Z" fill="#f8f5ff" stroke="#d6cbe8" stroke-width="4"/><path d="M236 118 C254 90 258 40 248 32 C234 28 226 78 226 116 Z" fill="#ffc9de"/>`},
				{id: 'head', svg: `<ellipse cx="200" cy="168" rx="76" ry="64" fill="#f8f5ff" stroke="#d6cbe8" stroke-width="4"/>
					<path d="M156 160 Q168 146 180 160 M220 160 Q232 146 244 160" stroke="#3b2f63" stroke-width="6" fill="none" stroke-linecap="round"/>
					<ellipse cx="152" cy="186" rx="16" ry="10" fill="#ffa8c5"/><ellipse cx="248" cy="186" rx="16" ry="10" fill="#ffa8c5"/>
					<path d="M190 178 L210 178 L200 190 Z" fill="#f06595" stroke="#f06595" stroke-width="4" stroke-linejoin="round"/>
					<path d="M184 196 Q200 214 216 196" stroke="#3b2f63" stroke-width="4.5" fill="#ff8fab" stroke-linecap="round"/>
					<rect x="193" y="194" width="14" height="12" rx="3" fill="#fff" stroke="#d6cbe8" stroke-width="2"/>`},
				{id: 'carrot', svg: `<path d="M236 262 C262 250 286 256 290 268 L222 330 C214 316 216 282 236 262 Z" fill="#ff922b" stroke="#e8590c" stroke-width="4" stroke-linejoin="round"/>
					<path d="M240 286 L252 290 M234 306 L244 310" stroke="#e8590c" stroke-width="4" stroke-linecap="round"/>
					<path d="M282 262 C290 236 306 232 312 240 C304 248 296 258 288 266 M286 266 C304 256 320 262 320 272 C306 272 296 270 288 270" fill="#51cf66" stroke="#2f9e44" stroke-width="3"/>`}
			]
		}
	];

	// picture puzzles, in the order they appear: the family's illustrations first, then the scenes drawn above
	const PICTURES = [
		{id: 'puppy', file: 'pictures/puppy-garden.jpg'},
		{id: 'dino', file: 'pictures/dino-valley.jpg'},
		{id: 'turtle', file: 'pictures/sea-turtle.jpg'},
		{id: 'farm', file: 'pictures/farm-friends.jpg'},
		{id: 'ocean', file: 'pictures/ocean-friends.jpg'},
		{id: 'picnic', file: 'pictures/forest-picnic.jpg'},
		{id: 'jungle', draw: jungle},
		{id: 'space', draw: space},
		{id: 'arctic', draw: arctic}
	];

	window.PUZZLE_ART = {PICTURES, ANIMALS};
})();
