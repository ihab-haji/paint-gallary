// Draws the home-screen cover (assets/memory.svg) from the real card art in ../cards.js.
// Usage: node make_cover.js
const fs = require('fs');
const path = require('path');

global.window = {};
require('../cards.js');
const THEMES = window.MEMORY_THEMES;
const art = (id) => window.MEMORY_ART.svg(id).replace('<svg ', '<svg width="100%" height="100%" ');
const edgeOf = (id) => THEMES.find((th) => th.items.some((it) => it.id === id)).edge;

const W = 140, GAP = 24, X0 = 400 - (4 * W + 3 * GAP) / 2, Y0 = 150;
// [column, row, picture or null for a face-down card, matched?, tilt]
const CARDS = [
	[0, 0, 'cat', true, -6], [1, 0, null, false, 4], [2, 0, 'car', false, -3], [3, 0, null, false, 5],
	[0, 1, null, false, 3], [1, 1, 'butterfly', false, -4], [2, 1, null, false, 6], [3, 1, 'cat', true, -5]
];

function card([c, r, id, done, tilt]) {
	const x = X0 + c * (W + GAP), y = Y0 + r * (W + GAP + 10), cx = x + W / 2, cy = y + W / 2;
	const shadow = `<rect x="${x}" y="${y + 9}" width="${W}" height="${W}" rx="30" fill="#00000026"/>`;
	if (!id) {
		return `<g transform="rotate(${tilt} ${cx} ${cy})">${shadow}
			<rect x="${x}" y="${y}" width="${W}" height="${W}" rx="30" fill="url(#back)" stroke="#fff" stroke-width="9"/>
			<rect x="${x}" y="${y}" width="${W}" height="${W}" rx="30" fill="url(#dots)"/>
			<circle cx="${cx}" cy="${cy}" r="42" fill="#fff"/>
			<text x="${cx}" y="${cy + 24}" font-size="68" font-weight="700" fill="#8b6cff" text-anchor="middle" font-family="Fredoka, sans-serif">?</text></g>`;
	}
	const glow = done ? `<rect x="${x - 10}" y="${y - 10}" width="${W + 20}" height="${W + 20}" rx="38" fill="#ffd54a" opacity=".55"/>` : '';
	return `<g transform="rotate(${tilt} ${cx} ${cy})">${glow}${shadow}
		<rect x="${x}" y="${y}" width="${W}" height="${W}" rx="30" fill="#fff" stroke="${done ? '#ffc83d' : edgeOf(id)}" stroke-width="8"/>
		<svg x="${x + 10}" y="${y + 10}" width="${W - 20}" height="${W - 20}" viewBox="0 0 120 120">${art(id).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
		${done ? `<text x="${x + W - 34}" y="${y + 44}" font-size="34" text-anchor="middle">⭐</text>` : ''}</g>`;
}

const sparkle = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" fill="#fff"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9f3"/><stop offset=".55" stop-color="#e6ecff"/><stop offset="1" stop-color="#d9f4ff"/></linearGradient>
		<linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b6cff"/><stop offset="1" stop-color="#4fb4ff"/></linearGradient>
		<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="3" fill="#ffffff40"/></pattern>
	</defs>
	<rect width="800" height="600" fill="url(#bg)"/>
	<circle cx="90" cy="520" r="120" fill="#ffd6e7" opacity=".7"/><circle cx="720" cy="60" r="110" fill="#d6e4ff" opacity=".8"/>
	${CARDS.map(card).join('\n\t')}
	<!-- the prize flying out of the matched pair -->
	<path d="M250 170 Q360 60 470 80" fill="none" stroke="#ffc83d" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round"/>
	<circle cx="490" cy="84" r="40" fill="#fff5c7" stroke="#ffc83d" stroke-width="6"/>
	<text x="490" y="102" font-size="50" text-anchor="middle">🎁</text>
	${sparkle(560, 70, 1.1)}${sparkle(430, 60, .7)}${sparkle(60, 300, .9)}${sparkle(760, 330, 1)}${sparkle(400, 560, .8)}
</svg>
`;
fs.writeFileSync(path.join(__dirname, '..', '..', 'assets', 'memory.svg'), svg);
console.log('assets/memory.svg written');
