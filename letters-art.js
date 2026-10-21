/* 🎨 Letters Adventure characters: every animal on the map, the world guides and the little explorer,
   drawn as small SVG pictures in one soft, round style. Their eyes blink, tails wag and wings flap with CSS
   (see "Characters" in letters.css), so they stay alive without costing anything while the map scrolls.
   Each picture sits in a 100 × 100 box with its feet at the bottom middle. */
(() => {
	'use strict';

	const INK = '#2b1d14';

	// big shiny eyes; when the animal is happy (tapped) they turn into ^ ^
	function eyes(x1, x2, y, r = 4.4, {white = false} = {}) {
		const one = (x) => (white ? `<circle cx="${x}" cy="${y}" r="${r * 1.45}" fill="#fff"/>` : '') +
			`<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.42}" fill="#fff"/><circle cx="${x - r * 0.4}" cy="${y + r * 0.45}" r="${r * 0.18}" fill="#fff" opacity=".8"/>`;
		const joy = (x) => `<path d="M${x - r} ${y + r * 0.3}Q${x} ${y - r * 1.2} ${x + r} ${y + r * 0.3}" stroke="${INK}" stroke-width="${r * 0.6}" fill="none" stroke-linecap="round"/>`;

		return `<g class="la-eyes">${one(x1)}${one(x2)}</g><g class="la-joy">${joy(x1)}${joy(x2)}</g>`;
	}

	const cheeks = (x1, x2, y, r = 4.2) =>
		`<ellipse cx="${x1}" cy="${y}" rx="${r}" ry="${r * 0.62}" fill="#ff7c9c" opacity=".5"/><ellipse cx="${x2}" cy="${y}" rx="${r}" ry="${r * 0.62}" fill="#ff7c9c" opacity=".5"/>`;

	const smile = (x, y, w = 5, color = INK) =>
		`<path d="M${x - w} ${y}Q${x - w / 2} ${y + w * 0.7} ${x} ${y}Q${x + w / 2} ${y + w * 0.7} ${x + w} ${y}" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

	// a soft white shine on the top-left of a round shape
	const shine = (cx, cy, rx, ry, op = 0.35) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}"/>`;

	const ART = {
		fox: () => `
			<g class="la-tail" style="transform-origin:64px 80px">
				<path d="M60 84C82 88 98 72 94 50C92 38 82 36 79 45C84 60 75 72 60 72Z" fill="#ff8a3d"/>
				<path d="M94 50C92 38 82 36 79 45C83 50 88 52 94 50Z" fill="#fff6ea"/>
			</g>
			<rect x="37" y="82" width="9" height="14" rx="4.5" fill="#7a3b17"/><rect x="54" y="82" width="9" height="14" rx="4.5" fill="#7a3b17"/>
			<ellipse cx="50" cy="76" rx="20" ry="16" fill="#ff8a3d"/>
			<ellipse cx="50" cy="80" rx="10" ry="11" fill="#fff6ea"/>
			<g class="la-ear" style="transform-origin:34px 34px"><path d="M29 38L27 13L47 28Z" fill="#ff8a3d"/><path d="M31.5 33L30.5 19L42 28Z" fill="#7a3b17"/></g>
			<g class="la-ear la-ear2" style="transform-origin:66px 34px"><path d="M71 38L73 13L53 28Z" fill="#ff8a3d"/><path d="M68.5 33L69.5 19L58 28Z" fill="#7a3b17"/></g>
			<path d="M25 42Q50 18 75 42Q73 63 50 67Q27 63 25 42Z" fill="#ff8a3d"/>
			${shine(40, 34, 9, 5, 0.25)}
			<path d="M35 50Q50 43 65 50Q61 65 50 67Q39 65 35 50Z" fill="#fff6ea"/>
			<ellipse cx="50" cy="53" rx="3.6" ry="2.7" fill="${INK}"/>
			${eyes(40.5, 59.5, 44, 3.9)}${cheeks(34, 66, 53, 3.6)}${smile(50, 58, 3.6)}`,

		squirrel: () => `
			<g class="la-tail" style="transform-origin:60px 86px">
				<path d="M56 90C88 92 100 60 88 34C80 16 58 20 62 36C67 48 80 56 70 72C66 80 60 82 56 90Z" fill="#b8642c"/>
				<path d="M66 32C70 26 80 26 84 34C88 44 84 54 80 50C78 42 72 36 66 32Z" fill="#d98a4a"/>
			</g>
			<ellipse cx="38" cy="94" rx="8" ry="3.6" fill="#8f4a1f"/><ellipse cx="54" cy="94" rx="8" ry="3.6" fill="#8f4a1f"/>
			<ellipse cx="46" cy="74" rx="16" ry="19" fill="#c8763a"/>
			<ellipse cx="44" cy="79" rx="9" ry="12" fill="#fbe3c2"/>
			<g class="la-acorn"><ellipse cx="44" cy="72" rx="6" ry="7" fill="#b07a40"/><path d="M37.5 69Q44 61 50.5 69Z" fill="#7a4a24"/><path d="M44 63V60" stroke="#7a4a24" stroke-width="2" stroke-linecap="round"/>
			<ellipse cx="36" cy="74" rx="4" ry="3" fill="#c8763a"/><ellipse cx="52" cy="74" rx="4" ry="3" fill="#c8763a"/></g>
			<g class="la-ear" style="transform-origin:35px 36px"><ellipse cx="33" cy="30" rx="6" ry="8" transform="rotate(-18 33 30)" fill="#c8763a"/><ellipse cx="33" cy="31" rx="3" ry="5" transform="rotate(-18 33 31)" fill="#ffc9a0"/></g>
			<g class="la-ear la-ear2" style="transform-origin:53px 36px"><ellipse cx="55" cy="30" rx="6" ry="8" transform="rotate(18 55 30)" fill="#c8763a"/><ellipse cx="55" cy="31" rx="3" ry="5" transform="rotate(18 55 31)" fill="#ffc9a0"/></g>
			<circle cx="44" cy="45" r="15" fill="#c8763a"/>${shine(38, 38, 6, 4)}
			<ellipse cx="44" cy="51" rx="8" ry="6" fill="#fbe3c2"/>
			<ellipse cx="44" cy="48.5" rx="2.6" ry="2" fill="${INK}"/>
			${eyes(38, 50, 43, 3.4)}${cheeks(33, 55, 50, 3)}${smile(44, 52, 2.8)}`,

		rabbit: () => `
			<g class="la-ear" style="transform-origin:40px 34px"><ellipse cx="39" cy="20" rx="7" ry="18" transform="rotate(-10 39 20)" fill="#f6f1f8"/><ellipse cx="39" cy="21" rx="3.5" ry="13" transform="rotate(-10 39 21)" fill="#ffb3c8"/></g>
			<g class="la-ear la-ear2" style="transform-origin:60px 34px"><ellipse cx="61" cy="20" rx="7" ry="18" transform="rotate(12 61 20)" fill="#f6f1f8"/><ellipse cx="61" cy="21" rx="3.5" ry="13" transform="rotate(12 61 21)" fill="#ffb3c8"/></g>
			<circle class="la-tail" style="transform-origin:69px 82px" cx="69" cy="82" r="7" fill="#fff"/>
			<ellipse cx="50" cy="76" rx="18" ry="17" fill="#f6f1f8"/>
			<ellipse cx="50" cy="80" rx="10" ry="11" fill="#fff"/>
			<ellipse cx="40" cy="94" rx="9" ry="4" fill="#e6dcef"/><ellipse cx="60" cy="94" rx="9" ry="4" fill="#e6dcef"/>
			<circle cx="50" cy="48" r="18" fill="#f6f1f8"/>${shine(43, 40, 7, 4, 0.6)}
			<path d="M47.5 52L52.5 52L50 55Z" fill="#ff7c9c"/>
			<path d="M50 55V57M50 57Q47 60 45 58M50 57Q53 60 55 58" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
			${eyes(43, 57, 46, 3.8)}${cheeks(37, 63, 53, 3.6)}`,

		frog: () => `
			<ellipse cx="30" cy="92" rx="11" ry="5" fill="#3fa53d"/><ellipse cx="70" cy="92" rx="11" ry="5" fill="#3fa53d"/>
			<ellipse cx="50" cy="78" rx="27" ry="17" fill="#5cc85a"/>
			<ellipse cx="50" cy="82" rx="16" ry="11" fill="#c9f2a0"/>
			<ellipse cx="50" cy="60" rx="25" ry="16" fill="#5cc85a"/>
			<circle cx="35" cy="47" r="10.5" fill="#5cc85a"/><circle cx="65" cy="47" r="10.5" fill="#5cc85a"/>
			${shine(32, 42, 4, 2.6, 0.4)}${shine(62, 42, 4, 2.6, 0.4)}
			${eyes(35, 65, 47, 4.4, {white: true})}
			<path d="M36 64Q50 74 64 64" stroke="#2c7a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
			${cheeks(30, 70, 62, 4)}
			<ellipse cx="38" cy="90" rx="6" ry="4" fill="#5cc85a"/><ellipse cx="62" cy="90" rx="6" ry="4" fill="#5cc85a"/>`,

		swan: () => `
			<ellipse cx="50" cy="91" rx="38" ry="6" fill="#bdf0ff" opacity=".8"/>
			<path d="M16 80Q18 62 44 64Q70 66 84 54Q84 80 62 88Q34 93 16 80Z" fill="#fff"/>
			<path class="la-wing" style="transform-origin:46px 72px" d="M38 70Q58 60 76 64Q70 80 52 82Q42 80 38 70Z" fill="#eef4fb"/>
			<path d="M30 74C16 54 42 46 36 32" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/>
			<circle cx="36" cy="28" r="8.5" fill="#fff"/>
			<path d="M42 26.5L54 30L42 33.5Z" fill="#ff9f1c"/><path d="M42 26.5L45 27.4V32.6L42 33.5Z" fill="${INK}"/>
			${eyes(37, 37, 26, 2.4)}
			<ellipse cx="34" cy="31" rx="2.6" ry="1.6" fill="#ff7c9c" opacity=".5"/>`,

		butterfly: () => `
			<g class="la-wing" style="transform-origin:50px 54px">
				<path d="M50 52C32 18 6 24 12 46C16 60 36 60 50 54Z" fill="#ff6fa8"/>
				<path d="M50 56C34 60 20 76 30 84C42 90 48 72 50 58Z" fill="#ffb44d"/>
				<circle cx="26" cy="40" r="5" fill="#fff" opacity=".75"/><circle cx="35" cy="74" r="3.4" fill="#fff" opacity=".75"/>
			</g>
			<g class="la-wing la-wing2" style="transform-origin:50px 54px">
				<path d="M50 52C68 18 94 24 88 46C84 60 64 60 50 54Z" fill="#ff6fa8"/>
				<path d="M50 56C66 60 80 76 70 84C58 90 52 72 50 58Z" fill="#ffb44d"/>
				<circle cx="74" cy="40" r="5" fill="#fff" opacity=".75"/><circle cx="65" cy="74" r="3.4" fill="#fff" opacity=".75"/>
			</g>
			<ellipse cx="50" cy="60" rx="4.2" ry="17" fill="#5a3a78"/>
			<path d="M48 36Q42 24 38 22M52 36Q58 24 62 22" stroke="#5a3a78" stroke-width="2" fill="none" stroke-linecap="round"/>
			<circle cx="38" cy="22" r="2.6" fill="#ff6fa8"/><circle cx="62" cy="22" r="2.6" fill="#ff6fa8"/>
			<circle cx="50" cy="40" r="7" fill="#5a3a78"/>
			${eyes(47.4, 52.6, 39.5, 1.9)}`,

		cow: () => `
			<g class="la-tail" style="transform-origin:81px 66px"><path d="M81 64Q92 72 88 86" stroke="#f3ece4" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="88" cy="88" rx="4" ry="5" fill="#4a3a3a"/></g>
			<rect x="34" y="78" width="8" height="18" rx="4" fill="#f3ece4"/><rect x="46" y="80" width="8" height="16" rx="4" fill="#e3d9cf"/>
			<rect x="64" y="78" width="8" height="18" rx="4" fill="#f3ece4"/><rect x="74" y="80" width="8" height="16" rx="4" fill="#e3d9cf"/>
			<rect x="33" y="92" width="10" height="5" rx="2" fill="#4a3a3a"/><rect x="63" y="92" width="10" height="5" rx="2" fill="#4a3a3a"/>
			<ellipse cx="58" cy="68" rx="27" ry="16" fill="#fffaf4"/>
			<path d="M48 54Q60 52 62 62Q58 72 48 68Q42 60 48 54Z" fill="#4a3a3a"/><path d="M74 60Q84 62 84 72Q78 78 72 72Q68 64 74 60Z" fill="#4a3a3a"/>
			<ellipse cx="60" cy="82" rx="6" ry="4" fill="#ffb3c0"/>
			<path d="M14 40Q10 34 14 30M40 40Q44 34 40 30" stroke="#f3dca8" stroke-width="4" fill="none" stroke-linecap="round"/>
			<g class="la-ear" style="transform-origin:16px 46px"><ellipse cx="9" cy="46" rx="8" ry="4" transform="rotate(-20 9 46)" fill="#fffaf4"/></g>
			<g class="la-ear la-ear2" style="transform-origin:38px 46px"><ellipse cx="45" cy="46" rx="8" ry="4" transform="rotate(20 45 46)" fill="#fffaf4"/></g>
			<ellipse cx="27" cy="50" rx="15" ry="14" fill="#fffaf4"/>
			<path d="M20 38Q27 34 32 40Q28 46 22 44Z" fill="#4a3a3a"/>
			<ellipse cx="27" cy="62" rx="13" ry="8.5" fill="#ffc2c7"/>
			<ellipse cx="22" cy="62" rx="2" ry="2.6" fill="#d97a88"/><ellipse cx="32" cy="62" rx="2" ry="2.6" fill="#d97a88"/>
			${eyes(21, 33, 49, 3.2)}${cheeks(16, 38, 55, 2.8)}`,

		sheep: () => `
			<rect x="34" y="78" width="7" height="18" rx="3.5" fill="#4a3a3a"/><rect x="45" y="80" width="7" height="16" rx="3.5" fill="#3a2c2c"/>
			<rect x="62" y="78" width="7" height="18" rx="3.5" fill="#4a3a3a"/><rect x="72" y="80" width="7" height="16" rx="3.5" fill="#3a2c2c"/>
			<g class="la-wool" fill="#fffaf2">
				<circle cx="42" cy="62" r="12"/><circle cx="56" cy="56" r="13"/><circle cx="70" cy="62" r="12"/><circle cx="78" cy="72" r="10"/>
				<circle cx="62" cy="76" r="12"/><circle cx="46" cy="76" r="12"/><circle cx="36" cy="70" r="9"/>
			</g>
			<circle cx="52" cy="52" r="5" fill="#fff" opacity=".9"/>
			<g class="la-ear" style="transform-origin:22px 50px"><ellipse cx="15" cy="52" rx="8" ry="4" transform="rotate(-25 15 52)" fill="#3a2c2c"/></g>
			<g class="la-ear la-ear2" style="transform-origin:38px 50px"><ellipse cx="44" cy="52" rx="7" ry="3.6" transform="rotate(25 44 52)" fill="#3a2c2c"/></g>
			<ellipse cx="29" cy="58" rx="12" ry="14" fill="#4a3a3a"/>
			<g fill="#fffaf2"><circle cx="23" cy="44" r="6"/><circle cx="30" cy="41" r="6.5"/><circle cx="36" cy="45" r="5.5"/></g>
			${eyes(24.5, 33.5, 56, 2.6, {white: true})}
			<path d="M29 66V67M26 68Q29 71 32 68" stroke="#fffaf2" stroke-width="1.6" fill="none" stroke-linecap="round"/>
			${cheeks(21, 37, 63, 2.6)}`,

		deer: () => `
			<rect x="38" y="74" width="6" height="22" rx="3" fill="#a96d38"/><rect x="47" y="76" width="6" height="20" rx="3" fill="#92592a"/>
			<rect x="64" y="74" width="6" height="22" rx="3" fill="#a96d38"/><rect x="73" y="76" width="6" height="20" rx="3" fill="#92592a"/>
			<ellipse cx="80" cy="60" rx="5" ry="4" fill="#fff"/>
			<ellipse cx="58" cy="66" rx="24" ry="14" fill="#c98a4f"/>
			<ellipse cx="58" cy="72" rx="16" ry="6" fill="#f2d3ae"/>
			<g fill="#fff4e0"><circle cx="54" cy="60" r="2.2"/><circle cx="64" cy="57" r="2"/><circle cx="72" cy="63" r="2.2"/><circle cx="62" cy="65" r="1.8"/></g>
			<path d="M34 64Q30 50 34 42" stroke="#c98a4f" stroke-width="11" fill="none" stroke-linecap="round"/>
			<path d="M26 22L24 12M26 22L18 16M26 22Q28 28 30 30M42 22L44 12M42 22L50 16M42 22Q40 28 38 30" stroke="#8a5a2b" stroke-width="3" fill="none" stroke-linecap="round"/>
			<g class="la-ear" style="transform-origin:26px 36px"><ellipse cx="20" cy="34" rx="8" ry="4" transform="rotate(-25 20 34)" fill="#c98a4f"/><ellipse cx="20" cy="34" rx="4.5" ry="2" transform="rotate(-25 20 34)" fill="#ffc9b0"/></g>
			<g class="la-ear la-ear2" style="transform-origin:42px 36px"><ellipse cx="48" cy="34" rx="8" ry="4" transform="rotate(25 48 34)" fill="#c98a4f"/><ellipse cx="48" cy="34" rx="4.5" ry="2" transform="rotate(25 48 34)" fill="#ffc9b0"/></g>
			<ellipse cx="34" cy="40" rx="11" ry="12" fill="#c98a4f"/>${shine(30, 34, 4, 3, 0.3)}
			<ellipse cx="34" cy="48" rx="7" ry="5.5" fill="#f2d3ae"/>
			<ellipse cx="34" cy="46" rx="2.6" ry="2" fill="${INK}"/>
			${eyes(29.5, 38.5, 39, 2.9)}${cheeks(26, 42, 45, 2.4)}`,

		rooster: () => `
			<path d="M44 84V95M40 95H48M56 84V95M52 95H60" stroke="#ff9f1c" stroke-width="3" fill="none" stroke-linecap="round"/>
			<g class="la-tail" style="transform-origin:66px 64px">
				<path d="M64 66Q74 34 90 40Q78 48 76 66Z" fill="#2f9e6b"/>
				<path d="M66 68Q84 44 96 56Q84 60 78 72Z" fill="#3b6fd6"/>
				<path d="M66 70Q88 62 94 76Q82 76 74 78Z" fill="#e2453c"/>
			</g>
			<circle cx="50" cy="68" r="20" fill="#fff6e8"/>
			<path class="la-wing" style="transform-origin:54px 64px" d="M44 64Q58 56 66 66Q62 80 50 78Q44 72 44 64Z" fill="#f3e3c8"/>
			<g fill="#e2453c"><circle cx="35" cy="27" r="4.5"/><circle cx="41" cy="24" r="5"/><circle cx="47" cy="27" r="4.5"/></g>
			<circle cx="41" cy="40" r="12.5" fill="#fff6e8"/>${shine(37, 35, 4, 3, 0.6)}
			<path d="M29 39L21 42L29 45Z" fill="#ffb020"/>
			<path d="M30 46Q28 54 32 54Q35 52 33 46Z" fill="#e2453c"/>
			${eyes(37, 46, 38, 2.6)}${cheeks(34, 49, 44, 2.4)}`,

		owl: () => `
			<path d="M38 93Q36 97 40 97M44 93Q44 97 47 96M56 93Q56 97 53 96M62 93Q64 97 60 97" stroke="#ff9f1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
			<path class="la-wing" style="transform-origin:28px 56px" d="M28 50Q14 64 22 84Q30 82 32 66Z" fill="#7a5236"/>
			<path class="la-wing la-wing2" style="transform-origin:72px 56px" d="M72 50Q86 64 78 84Q70 82 68 66Z" fill="#7a5236"/>
			<path d="M50 20Q78 20 76 58Q74 92 50 93Q26 92 24 58Q22 20 50 20Z" fill="#9a6b4a"/>
			<path d="M26 24L32 12L40 22Z" fill="#9a6b4a"/><path d="M74 24L68 12L60 22Z" fill="#9a6b4a"/>
			<ellipse cx="50" cy="70" rx="15" ry="18" fill="#f2d9b8"/>
			<path d="M43 64l2.5 3 2.5-3M52 64l2.5 3 2.5-3M47 72l2.5 3 2.5-3M43 80l2.5 3 2.5-3M52 80l2.5 3 2.5-3" stroke="#c9a37a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
			<circle cx="39" cy="42" r="11" fill="#fff6dc"/><circle cx="61" cy="42" r="11" fill="#fff6dc"/>
			<circle cx="39" cy="42" r="11" fill="none" stroke="#7a5236" stroke-width="2"/><circle cx="61" cy="42" r="11" fill="none" stroke="#7a5236" stroke-width="2"/>
			${eyes(39, 61, 42, 5.6)}
			<path d="M46 50L54 50L50 57Z" fill="#ffb020"/>
			${cheeks(30, 70, 54, 3)}`,

		bat: () => `
			<path class="la-wing" style="transform-origin:42px 50px" d="M42 46Q24 28 4 36Q10 44 8 52Q16 50 20 58Q26 52 32 60Q36 54 42 56Z" fill="#6b58a6"/>
			<path class="la-wing la-wing2" style="transform-origin:58px 50px" d="M58 46Q76 28 96 36Q90 44 92 52Q84 50 80 58Q74 52 68 60Q64 54 58 56Z" fill="#6b58a6"/>
			<path d="M38 36L36 20L46 30Z" fill="#5b4a8a"/><path d="M62 36L64 20L54 30Z" fill="#5b4a8a"/>
			<path d="M39 32L38 24L43 29Z" fill="#ffb3c8"/><path d="M61 32L62 24L57 29Z" fill="#ffb3c8"/>
			<ellipse cx="50" cy="52" rx="13" ry="16" fill="#5b4a8a"/>${shine(45, 42, 4, 3, 0.25)}
			<ellipse cx="50" cy="58" rx="7" ry="8" fill="#8a78c4"/>
			${eyes(45, 55, 45, 2.8, {white: true})}
			<path d="M46.5 51L48 54L49.5 51M50.5 51L52 54L53.5 51" fill="#fff"/>
			${cheeks(41, 59, 50, 2.4)}`,

		gem: () => `
			<path d="M50 14L74 36L50 92L26 36Z" fill="#b57bff"/>
			<path d="M50 14L26 36L50 92Z" fill="#cf9fff"/><path d="M50 14L62 36H38Z" fill="#e6ccff"/>
			<path d="M26 36H74L50 92Z" fill="#9b5cff" opacity=".35"/>
			<path d="M34 30L40 24" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
			<g class="la-sparkle" fill="#fff"><path d="M78 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><path d="M20 58l1.4 3.6 3.6 1.4-3.6 1.4L20 68l-1.4-3.6L15 63l3.6-1.4Z"/></g>
			${eyes(43, 57, 48, 3.2)}${cheeks(38, 62, 55, 2.8)}${smile(50, 57, 3)}`,

		mushroom: () => `
			<path d="M38 96Q34 70 40 58H60Q66 70 62 96Z" fill="#fff4e2"/>
			<path d="M38 96Q34 70 40 58H46Q42 72 44 96Z" fill="#f0dcc0"/>
			<path d="M8 58Q12 16 50 14Q88 16 92 58Q50 68 8 58Z" fill="#ef4a40"/>
			${shine(32, 28, 10, 5, 0.35)}
			<g fill="#fff"><circle cx="28" cy="42" r="6"/><circle cx="52" cy="28" r="7"/><circle cx="74" cy="44" r="6"/><circle cx="48" cy="50" r="4"/><circle cx="84" cy="54" r="3"/></g>
			${eyes(44, 56, 74, 2.8)}${cheeks(40, 60, 80, 2.6)}${smile(50, 81, 2.6)}`,

		snowman: () => `
			<path class="la-wave" style="transform-origin:30px 62px" d="M30 62L12 50M18 54L14 46" stroke="#8a5a2b" stroke-width="3" fill="none" stroke-linecap="round"/>
			<path d="M70 62L88 54M82 57L86 49" stroke="#8a5a2b" stroke-width="3" fill="none" stroke-linecap="round"/>
			<circle cx="50" cy="74" r="22" fill="#fff"/><path d="M62 56A22 22 0 0 1 50 96A22 22 0 0 0 62 56Z" fill="#dce9f7"/>
			<circle cx="50" cy="70" r="2.4" fill="#3a3a4a"/><circle cx="50" cy="80" r="2.4" fill="#3a3a4a"/>
			<circle cx="50" cy="40" r="16" fill="#fff"/><path d="M58 27A16 16 0 0 1 50 56A16 16 0 0 0 58 27Z" fill="#dce9f7"/>
			<path d="M33 52Q50 60 67 52L66 58Q50 65 34 58Z" fill="#e2453c"/><path d="M58 56L64 72L56 72L54 58Z" fill="#c8342c"/>
			<path d="M36 26H64L62 24H38Z" fill="#3a3a4a"/><rect x="40" y="8" width="20" height="17" rx="3" fill="#3a3a4a"/><rect x="40" y="18" width="20" height="4" fill="#e2453c"/>
			<path d="M50 42L62 45L50 47Z" fill="#ff8a3d"/>
			${eyes(44.5, 55.5, 37, 2.4)}${cheeks(41, 59, 44, 2.6)}`,

		goat: () => `
			<rect x="38" y="76" width="6" height="20" rx="3" fill="#e0d6ca"/><rect x="47" y="78" width="6" height="18" rx="3" fill="#cfc3b5"/>
			<rect x="64" y="76" width="6" height="20" rx="3" fill="#e0d6ca"/><rect x="73" y="78" width="6" height="18" rx="3" fill="#cfc3b5"/>
			<rect x="37" y="92" width="8" height="5" rx="2" fill="#6b5a4a"/><rect x="63" y="92" width="8" height="5" rx="2" fill="#6b5a4a"/>
			<g class="la-tail" style="transform-origin:80px 60px"><path d="M80 60Q88 54 86 48" stroke="#f6f0e8" stroke-width="5" fill="none" stroke-linecap="round"/></g>
			<ellipse cx="58" cy="66" rx="24" ry="14" fill="#f6f0e8"/>
			<path d="M34 66Q30 52 34 44" stroke="#f6f0e8" stroke-width="12" fill="none" stroke-linecap="round"/>
			<path d="M28 30Q22 18 30 14M40 30Q46 18 38 14" stroke="#b8a48a" stroke-width="4" fill="none" stroke-linecap="round"/>
			<g class="la-ear" style="transform-origin:26px 38px"><ellipse cx="19" cy="40" rx="8" ry="3.6" transform="rotate(-15 19 40)" fill="#f6f0e8"/></g>
			<g class="la-ear la-ear2" style="transform-origin:42px 38px"><ellipse cx="49" cy="40" rx="8" ry="3.6" transform="rotate(15 49 40)" fill="#f6f0e8"/></g>
			<path d="M24 36Q34 26 44 36Q44 52 34 56Q24 52 24 36Z" fill="#f6f0e8"/>
			<path d="M31 55Q34 66 37 55Z" fill="#cfc3b5"/>
			<ellipse cx="34" cy="50" rx="2.4" ry="1.8" fill="${INK}"/>
			${eyes(29.5, 38.5, 41, 2.8)}${cheeks(26.5, 41.5, 47, 2.4)}`,

		eagle: () => `
			<path class="la-wing" style="transform-origin:42px 54px" d="M42 50Q22 30 2 38Q12 42 8 48Q18 46 16 54Q26 50 26 58Q34 54 40 60Z" fill="#7a4a24"/>
			<path class="la-wing la-wing2" style="transform-origin:58px 54px" d="M58 50Q78 30 98 38Q88 42 92 48Q82 46 84 54Q74 50 74 58Q66 54 60 60Z" fill="#7a4a24"/>
			<path d="M44 72L50 86L56 72Z" fill="#f2f2f2"/>
			<ellipse cx="50" cy="60" rx="11" ry="15" fill="#8a5a2b"/>
			<circle cx="50" cy="40" r="11" fill="#fff"/>${shine(46, 35, 4, 3, 0.8)}
			<path d="M46 44Q50 41 54 44Q53 52 50 53Q48 49 46 44Z" fill="#ffb020"/>
			${eyes(45.5, 54.5, 39, 2.5)}${cheeks(42, 58, 44, 2.2)}`,

		penguin: () => `
			<ellipse cx="40" cy="94" rx="8" ry="3.6" fill="#ff9f1c"/><ellipse cx="60" cy="94" rx="8" ry="3.6" fill="#ff9f1c"/>
			<path class="la-wing" style="transform-origin:28px 54px" d="M28 50Q16 62 20 78Q28 72 30 62Z" fill="#2c3446"/>
			<path class="la-wing la-wing2" style="transform-origin:72px 54px" d="M72 50Q84 62 80 78Q72 72 70 62Z" fill="#2c3446"/>
			<path d="M50 14Q74 14 74 50Q76 92 50 93Q24 92 26 50Q26 14 50 14Z" fill="#2c3446"/>${shine(40, 26, 6, 4, 0.18)}
			<path d="M50 40Q66 46 64 70Q60 90 50 90Q40 90 36 70Q34 46 50 40Z" fill="#fff"/>
			<path d="M50 30Q36 22 34 36Q36 46 50 46Q64 46 66 36Q64 22 50 30Z" fill="#fff"/>
			<path d="M45 42L55 42L50 49Z" fill="#ff9f1c"/>
			${eyes(43, 57, 36, 3)}${cheeks(39, 61, 44, 3)}`,

		turtle: () => `
			<ellipse cx="38" cy="88" rx="8" ry="5" fill="#7ccf6b"/><ellipse cx="78" cy="88" rx="8" ry="5" fill="#7ccf6b"/>
			<path d="M92 78Q99 78 97 72" stroke="#7ccf6b" stroke-width="5" fill="none" stroke-linecap="round"/>
			<path d="M30 82Q30 42 61 42Q92 42 92 82Z" fill="#3fae5a"/>
			<path d="M30 82Q30 42 61 42Q92 42 92 82" fill="none" stroke="#2c8a44" stroke-width="3"/>
			<path d="M61 48L71 56L67 68H55L51 56Z M43 62L51 56L55 68L47 78H35Q35 68 43 62Z M79 62L71 56L67 68L75 78H87Q87 68 79 62Z" fill="#6ccf6b"/>
			<rect x="28" y="80" width="66" height="7" rx="3.5" fill="#f2d98a"/>
			${shine(51, 50, 8, 3, 0.35)}
			<g class="la-head" style="transform-origin:30px 72px">
				<path d="M24 76Q30 70 36 76L34 84H26Z" fill="#8fdc7c"/>
				<circle cx="20" cy="62" r="14" fill="#8fdc7c"/>${shine(15, 55, 5, 3, 0.45)}
				${eyes(15, 25, 60, 3)}${cheeks(11, 29, 67, 2.8)}${smile(20, 68, 3)}
			</g>`,

		// the explorer in the round pin and the top bar (head and shoulders)
		kid: () => `
			<path d="M18 100Q20 74 50 72Q80 74 82 100Z" fill="#3bb2ff"/>
			<path d="M30 78Q32 92 34 100M70 78Q68 92 66 100" stroke="#ff8a3d" stroke-width="5" fill="none" stroke-linecap="round"/>
			<path d="M42 72L50 82L58 72Z" fill="#fff"/>
			<circle cx="50" cy="48" r="24" fill="#f7c9a1"/>
			<circle cx="26" cy="52" r="5" fill="#f2b98e"/><circle cx="74" cy="52" r="5" fill="#f2b98e"/>
			<path d="M27 42Q30 22 52 22Q72 22 74 42Q64 34 52 36Q38 30 27 42Z" fill="#5a3418"/>
			<path d="M14 36Q50 26 86 36Q82 40 50 36Q18 40 14 36Z" fill="#e6a83a"/>
			<path d="M26 34Q28 10 50 10Q72 10 74 34Q50 28 26 34Z" fill="#f2c24a"/>
			<path d="M27 29Q50 23 73 29L74 34Q50 28 26 34Z" fill="#c8342c"/>
			${shine(40, 18, 8, 3, 0.45)}
			${eyes(41, 59, 50, 3.6)}${cheeks(35, 65, 58, 4)}
			<path d="M44 61Q50 67 56 61" stroke="#a8432a" stroke-width="2.4" fill="#fff" stroke-linecap="round"/>`
	};

	let blink = 0;

	function art(id, className = '') {
		const draw = ART[id];
		if (!draw) return '';
		blink = (blink + 1.37) % 5; // every character blinks at its own moment

		return `<svg class="la la-${id} ${className}" viewBox="0 0 100 100" style="--blink:${-blink.toFixed(2)}s" aria-hidden="true">${draw()}</svg>`;
	}

	window.LettersArt = {art, has: (id) => Boolean(ART[id])};
})();
