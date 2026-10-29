/* Card pictures for Memory Match (viewBox 0 0 120 120): animals, vehicles and a fairy garden.
   Same style as the coloring pages: thick dark outline, soft colors, big head, tiny body.
   No pig on purpose: friendly for every family. */
(function () {
	const O = '#3b2416';
	const st = (w = 3) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
	const ST = st();
	const LINE = `fill="none" ${ST}`;

	// kawaii eyes: a dark oval with a white sparkle
	const eyes = (x1, x2, y) => [x1, x2].map((x) =>
		`<ellipse cx="${x}" cy="${y}" rx="3.6" ry="4.6" fill="${O}"/><circle cx="${x + 1.3}" cy="${y - 1.6}" r="1.5" fill="#fff"/>`).join('');
	const cheeks = (x1, x2, y) => [x1, x2].map((x) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.2" fill="#ff8fa3" opacity=".55"/>`).join('');
	const smile = (x, y, w = 4) => `<path d="M${x - w} ${y} Q${x} ${y + w} ${x + w} ${y}" ${LINE}/>`;
	const catMouth = (x, y) => `<path d="M${x - 5} ${y} Q${x - 2.5} ${y + 3.5} ${x} ${y} Q${x + 2.5} ${y + 3.5} ${x + 5} ${y}" ${LINE}/>`;
	// fluffy shapes (wool, mane, comb): outline every circle, then fill them all again so only the outside edge shows
	const fluff = (circles, fill) =>
		circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${O}" stroke-width="6"/>`).join('') +
		circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');
	// a thick outlined line (tails)
	const tube = (d, fill, w = 6) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="${w + 6}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;
	const feet = (fill) => `<ellipse cx="49" cy="107" rx="8" ry="5" fill="${fill}" ${ST}/><ellipse cx="71" cy="107" rx="8" ry="5" fill="${fill}" ${ST}/>`;
	const body = (fill) => `<ellipse cx="60" cy="91" rx="22" ry="16" fill="${fill}" ${ST}/>`;
	const whiskers = (y) => `<path d="M30 ${y} h11 M31 ${y + 7} l10 -3 M90 ${y} h-11 M89 ${y + 7} l-10 -3" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round"/>`;

	const ART = {
		sheep: () =>
			feet('#e8892e') +
			fluff([[44, 90, 13], [60, 86, 15], [76, 90, 13], [51, 101, 11], [69, 101, 11]], '#cdb6ea') +
			`<ellipse cx="33" cy="58" rx="12" ry="6" transform="rotate(-20 33 58)" fill="#f8dcc2" ${ST}/><ellipse cx="33" cy="58" rx="6" ry="2.5" transform="rotate(-20 33 58)" fill="#f7a8b6"/>` +
			`<ellipse cx="87" cy="58" rx="12" ry="6" transform="rotate(20 87 58)" fill="#f8dcc2" ${ST}/><ellipse cx="87" cy="58" rx="6" ry="2.5" transform="rotate(20 87 58)" fill="#f7a8b6"/>` +
			`<ellipse cx="60" cy="59" rx="19" ry="21" fill="#f8dcc2" ${ST}/>` +
			fluff([[46, 41, 9], [55, 35, 10], [66, 35, 10], [75, 41, 9], [60, 44, 8]], '#cdb6ea') +
			eyes(52, 68, 60) + cheeks(46, 74, 68) + `<ellipse cx="60" cy="67" rx="3.4" ry="2.2" fill="#e58a9a"/>` + smile(60, 71, 3.5),

		duck: () =>
			`<ellipse cx="48" cy="108" rx="10" ry="4.5" fill="#ff9a2e" ${ST}/><ellipse cx="72" cy="108" rx="10" ry="4.5" fill="#ff9a2e" ${ST}/>` +
			`<ellipse cx="60" cy="91" rx="24" ry="17" fill="#ffd23f" ${ST}/>` +
			`<ellipse cx="38" cy="88" rx="7" ry="12" transform="rotate(30 38 88)" fill="#ffc21a" ${ST}/><ellipse cx="82" cy="88" rx="7" ry="12" transform="rotate(-30 82 88)" fill="#ffc21a" ${ST}/>` +
			`<path d="M57 27 Q57 15 64 18 M61 27 Q67 14 72 22" ${LINE}/>` +
			`<circle cx="60" cy="50" r="25" fill="#ffd23f" ${ST}/>` +
			eyes(50, 70, 45) + cheeks(41, 79, 56) +
			`<ellipse cx="60" cy="60" rx="13" ry="6.5" fill="#ff9a2e" ${ST}/><path d="M49 60 Q60 63.5 71 60" ${LINE}/>`,

		dog: () =>
			feet('#f2cf9a') + body('#f2cf9a') + `<ellipse cx="70" cy="94" rx="7" ry="5" fill="#a0612f"/>` +
			`<rect x="42" y="74" width="36" height="8" rx="4" fill="#4aa3ff" ${ST}/><circle cx="60" cy="85" r="4" fill="#ffd23f" ${ST}/>` +
			`<circle cx="60" cy="52" r="25" fill="#f2cf9a" ${ST}/>` +
			`<ellipse cx="69" cy="45" rx="8" ry="9" fill="#a0612f"/>` +
			`<ellipse cx="35" cy="56" rx="9" ry="17" transform="rotate(18 35 56)" fill="#a0612f" ${ST}/><ellipse cx="85" cy="56" rx="9" ry="17" transform="rotate(-18 85 56)" fill="#a0612f" ${ST}/>` +
			eyes(51, 69, 47) +
			`<ellipse cx="60" cy="64" rx="12" ry="9" fill="#fff6e8" ${ST}/><ellipse cx="60" cy="59.5" rx="5" ry="3.6" fill="${O}"/>` +
			`<path d="M57 68 Q60 76 63 68 Z" fill="#ff7a8a" ${st(2)}/>` + catMouth(60, 66),

		cat: () =>
			tube('M78 98 Q100 98 97 76 Q95 66 102 62', '#f7953a') +
			feet('#f7953a') + body('#f7953a') +
			`<path d="M50 84 l3 6 M57 86 l1 6 M68 84 l-3 6" fill="none" stroke="#c9621a" stroke-width="3" stroke-linecap="round"/>` +
			`<path d="M38 44 L39 18 L58 32 Z" fill="#f7953a" ${ST}/><path d="M42 37 L43 25 L51 32 Z" fill="#f7a8b6"/>` +
			`<path d="M82 44 L81 18 L62 32 Z" fill="#f7953a" ${ST}/><path d="M78 37 L77 25 L69 32 Z" fill="#f7a8b6"/>` +
			`<circle cx="60" cy="54" r="25" fill="#f7953a" ${ST}/>` +
			`<path d="M60 31 v8 M53 33 l2 6 M67 33 l-2 6" fill="none" stroke="#c9621a" stroke-width="3" stroke-linecap="round"/>` +
			eyes(50, 70, 51) + cheeks(43, 77, 61) +
			`<path d="M56.5 59 L63.5 59 L60 63 Z" fill="#ff7a8a" ${st(2)}/>` + catMouth(60, 64) + whiskers(60) +
			`<rect x="44" y="76" width="32" height="6" rx="3" fill="#4aa3ff" ${ST}/><circle cx="60" cy="84" r="4.5" fill="#ffd23f" ${ST}/>`,

		bee: () =>
			`<ellipse cx="34" cy="72" rx="15" ry="10" transform="rotate(-30 34 72)" fill="#d4eeff" ${ST}/><ellipse cx="86" cy="72" rx="15" ry="10" transform="rotate(30 86 72)" fill="#d4eeff" ${ST}/>` +
			`<path d="M55 106 L60 115 L65 106 Z" fill="${O}" ${ST}/>` +
			`<defs><clipPath id="beeBody"><ellipse cx="60" cy="89" rx="23" ry="19"/></clipPath></defs>` +
			`<ellipse cx="60" cy="89" rx="23" ry="19" fill="#ffd23f"/>` +
			`<g clip-path="url(#beeBody)" fill="${O}"><rect x="30" y="85" width="60" height="7"/><rect x="30" y="99" width="60" height="7"/></g>` +
			`<ellipse cx="60" cy="89" rx="23" ry="19" fill="none" ${ST}/>` +
			`<path d="M52 30 Q47 17 41 15 M68 30 Q73 17 79 15" ${LINE}/><circle cx="41" cy="15" r="4.5" fill="${O}"/><circle cx="79" cy="15" r="4.5" fill="${O}"/>` +
			`<circle cx="60" cy="49" r="23" fill="#ffe08a" ${ST}/>` +
			eyes(51, 69, 48) + cheeks(44, 76, 57) + smile(60, 58, 5),

		horse: () =>
			feet('#7a3b17') + body('#e8823a') +
			`<path d="M42 36 L43 13 L56 30 Z" fill="#e8823a" ${ST}/><path d="M78 36 L77 13 L64 30 Z" fill="#e8823a" ${ST}/>` +
			`<ellipse cx="60" cy="53" rx="21" ry="26" fill="#e8823a" ${ST}/>` +
			`<path d="M45 33 Q49 18 60 24 Q69 15 75 31 Q67 30 63 40 Q57 30 45 33 Z" fill="#8a4a20" ${ST}/>` +
			eyes(51, 69, 50) +
			`<ellipse cx="60" cy="69" rx="15" ry="10" fill="#f8c99c" ${ST}/>` +
			`<ellipse cx="55" cy="67" rx="1.8" ry="2.6" fill="${O}"/><ellipse cx="65" cy="67" rx="1.8" ry="2.6" fill="${O}"/>` + smile(60, 72.5, 4),

		mouse: () =>
			tube('M78 100 Q103 104 100 84 Q98 74 107 70', '#f4a5b5', 4) +
			feet('#f4a5b5') + body('#a9c6ee') +
			`<circle cx="36" cy="35" r="16" fill="#a9c6ee" ${ST}/><circle cx="36" cy="35" r="9.5" fill="#f8b4c4"/>` +
			`<circle cx="84" cy="35" r="16" fill="#a9c6ee" ${ST}/><circle cx="84" cy="35" r="9.5" fill="#f8b4c4"/>` +
			`<circle cx="60" cy="58" r="24" fill="#a9c6ee" ${ST}/>` +
			eyes(51, 69, 55) + cheeks(44, 76, 65) +
			`<circle cx="60" cy="64" r="3.6" fill="${O}"/>` + catMouth(60, 68) + whiskers(63),

		chick: () =>
			`<path d="M48 104 v8 M44 113 l4 -3 l4 3 M72 104 v8 M68 113 l4 -3 l4 3" fill="none" stroke="#ff9a2e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` +
			fluff([[53, 37, 6], [61, 33, 7], [69, 37, 6]], '#ff5a4e') +
			`<ellipse cx="29" cy="76" rx="7" ry="11" transform="rotate(30 29 76)" fill="#ffc21a" ${ST}/><ellipse cx="91" cy="76" rx="7" ry="11" transform="rotate(-30 91 76)" fill="#ffc21a" ${ST}/>` +
			`<circle cx="60" cy="72" r="32" fill="#ffdd4a" ${ST}/>` +
			eyes(50, 70, 65) + cheeks(41, 79, 75) +
			`<path d="M53 73 L67 73 L60 81 Z" fill="#ff9a2e" ${ST}/>`,

		bunny: () =>
			`<ellipse cx="47" cy="26" rx="9" ry="22" transform="rotate(-8 47 26)" fill="#d3d4de" ${ST}/><ellipse cx="47" cy="27" rx="4.5" ry="15" transform="rotate(-8 47 27)" fill="#f8b4c4"/>` +
			`<ellipse cx="73" cy="26" rx="9" ry="22" transform="rotate(8 73 26)" fill="#d3d4de" ${ST}/><ellipse cx="73" cy="27" rx="4.5" ry="15" transform="rotate(8 73 27)" fill="#f8b4c4"/>` +
			feet('#ffffff') + body('#d3d4de') + `<ellipse cx="60" cy="95" rx="12" ry="9" fill="#fff"/>` +
			`<circle cx="60" cy="61" r="24" fill="#d3d4de" ${ST}/>` +
			eyes(50, 70, 57) + cheeks(43, 77, 67) +
			`<circle cx="55" cy="70" r="6" fill="#fff"/><circle cx="65" cy="70" r="6" fill="#fff"/>` +
			`<path d="M57 65 L63 65 L60 68.5 Z" fill="#ff7a8a" ${st(2)}/>` +
			`<rect x="57" y="74" width="6" height="5" rx="1" fill="#fff" ${st(2)}/>`,

		cow: () =>
			`<path d="M43 34 Q33 25 39 14 Q43 25 51 29 Z" fill="#f3e2b0" ${ST}/><path d="M77 34 Q87 25 81 14 Q77 25 69 29 Z" fill="#f3e2b0" ${ST}/>` +
			feet('#6b5a55') + body('#ffffff') + `<ellipse cx="51" cy="89" rx="6" ry="4.5" fill="${O}"/><ellipse cx="70" cy="96" rx="5" ry="4" fill="${O}"/>` +
			`<ellipse cx="33" cy="49" rx="11" ry="6" transform="rotate(-15 33 49)" fill="#fff" ${ST}/><ellipse cx="33" cy="49" rx="5.5" ry="2.6" transform="rotate(-15 33 49)" fill="#f7a8b6"/>` +
			`<ellipse cx="87" cy="49" rx="11" ry="6" transform="rotate(15 87 49)" fill="#fff" ${ST}/><ellipse cx="87" cy="49" rx="5.5" ry="2.6" transform="rotate(15 87 49)" fill="#f7a8b6"/>` +
			`<circle cx="60" cy="52" r="25" fill="#fff" ${ST}/><ellipse cx="70" cy="38" rx="7" ry="5" fill="${O}"/>` +
			eyes(50, 70, 47) +
			`<ellipse cx="60" cy="65" rx="16" ry="10" fill="#f7b6c2" ${ST}/>` +
			`<ellipse cx="54" cy="64" rx="2" ry="2.8" fill="#b0566a"/><ellipse cx="66" cy="64" rx="2" ry="2.8" fill="#b0566a"/>` + smile(60, 69.5, 4),

		frog: () =>
			feet('#5fb53f') + body('#7ccf5a') + `<ellipse cx="60" cy="95" rx="13" ry="9" fill="#c9f0a8"/>` +
			`<circle cx="43" cy="39" r="12" fill="#7ccf5a" ${ST}/><circle cx="77" cy="39" r="12" fill="#7ccf5a" ${ST}/>` +
			`<ellipse cx="60" cy="60" rx="31" ry="22" fill="#7ccf5a" ${ST}/>` +
			`<circle cx="43" cy="39" r="8.5" fill="#7ccf5a"/><circle cx="77" cy="39" r="8.5" fill="#7ccf5a"/>` +
			eyes(43, 77, 39) + cheeks(37, 83, 63) +
			`<path d="M45 62 Q60 76 75 62" ${LINE}/>`,

		lion: () =>
			feet('#f6c552') + body('#f6c552') +
			fluff(Array.from({length: 12}, (_, i) => {
				const a = (i / 12) * Math.PI * 2;
				return [+(60 + Math.cos(a) * 25).toFixed(1), +(54 + Math.sin(a) * 25).toFixed(1), 10];
			}), '#d77a2a') +
			`<circle cx="43" cy="37" r="6.5" fill="#f6c552" ${ST}/><circle cx="77" cy="37" r="6.5" fill="#f6c552" ${ST}/>` +
			`<circle cx="60" cy="55" r="22" fill="#f6c552" ${ST}/>` +
			eyes(52, 68, 51) + cheeks(45, 75, 61) +
			`<ellipse cx="60" cy="64" rx="10" ry="7" fill="#fde7b0"/>` +
			`<path d="M56 59.5 L64 59.5 L60 63.5 Z" fill="#7a3b17" ${st(2)}/>` + catMouth(60, 65)
	};

	/* ---------- vehicles (side view, like a picture book) ---------- */
	const wheel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#5b5b66" ${ST}/><circle cx="${x}" cy="${y}" r="${r * .45}" fill="#e9e9ef" ${st(2.5)}/><circle cx="${x}" cy="${y}" r="${r * .15}" fill="#e8452c"/>`;
	const portholes = (xs, y, r = 4) => xs.map((x) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${st(2.5)}/>`).join('');
	const waves = `<path d="M12 106 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#7cc4ff" stroke-width="4" stroke-linecap="round"/>`;
	const puff = (x, y, s = 1, fill = '#dbeeff') => fluff([[x, y, 7 * s], [x + 9 * s, y - 4 * s, 9 * s], [x + 19 * s, y, 7 * s]], fill);

	Object.assign(ART, {
		sailboat: () =>
			waves +
			`<rect x="57" y="14" width="5" height="70" rx="2" fill="#f29d0c" ${ST}/>` +
			`<path d="M62 14 L78 18 L62 23 Z" fill="#2c4a9e" ${ST}/>` +
			`<path d="M55 24 L24 76 H55 Z" fill="#e8452c" ${ST}/><path d="M64 32 V76 H90 Z" fill="#ff7a3d" ${ST}/>` +
			`<path d="M18 80 H102 L90 100 H30 Z" fill="#4a90e2" ${ST}/>` + portholes([40, 52, 64], 89),

		ship: () =>
			waves + puff(62, 20, 1) +
			`<rect x="66" y="30" width="13" height="26" fill="#e8452c" ${ST}/><rect x="66" y="30" width="13" height="7" fill="#3b2416"/><rect x="66" y="44" width="13" height="5" fill="#fff"/>` +
			`<rect x="44" y="40" width="10" height="16" fill="#fff" ${ST}/>` +
			`<rect x="32" y="54" width="56" height="20" rx="3" fill="#5aa0f0" ${ST}/>` + portholes([46, 60, 74], 64) +
			`<path d="M14 72 H106 L94 100 H26 Z" fill="#dbeaff" ${ST}/><path d="M18 81 H102" stroke="#e8452c" stroke-width="4"/>` +
			`<path d="M36 86 v8 M32 90 h8 M32 94 q4 3 8 0" fill="none" stroke="#2c4a9e" stroke-width="2.5" stroke-linecap="round"/>`,

		balloon: () =>
			`<path d="M50 80 L53 92 M70 80 L67 92" fill="none" ${st(2.5)}/>` +
			`<path d="M60 10 C30 10 18 40 36 62 L50 80 H70 L84 62 C102 40 90 10 60 10 Z" fill="#5cb85c" ${ST}/>` +
			`<path d="M60 10 C46 18 44 58 54 80 H66 C76 58 74 18 60 10 Z" fill="#ffc21a" ${ST}/>` +
			`<path d="M60 10 C38 16 32 46 44 72 M60 10 C82 16 88 46 76 72" fill="none" stroke="${O}" stroke-width="2.5"/>` +
			`<rect x="50" y="90" width="20" height="16" rx="3" fill="#d97a35" ${ST}/><path d="M50 97 H70 M57 90 V106 M63 90 V106" stroke="#8a4a20" stroke-width="2"/>`,

		helicopter: () =>
			`<rect x="22" y="30" width="66" height="6" rx="3" fill="#4aa3ff" ${ST}/><rect x="52" y="34" width="6" height="12" fill="#5b5b66" ${ST}/>` +
			`<path d="M34 96 H82 M44 84 V96 M70 84 V96" fill="none" stroke="#4aa3ff" stroke-width="5" stroke-linecap="round"/><path d="M28 92 Q30 98 36 97" fill="none" stroke="#4aa3ff" stroke-width="5" stroke-linecap="round"/>` +
			`<path d="M76 58 H102 V66 H76 Z" fill="#ff7a3d" ${ST}/>` +
			`<ellipse cx="104" cy="62" rx="3" ry="11" fill="#4aa3ff" ${ST}/>` +
			`<ellipse cx="56" cy="64" rx="30" ry="21" fill="#e8452c" ${ST}/>` +
			`<path d="M62 46 Q72 56 64 66 Q58 76 70 84" fill="none" stroke="#ffc21a" stroke-width="6" stroke-linecap="round"/>` +
			`<path d="M28 64 Q28 48 46 46 Q52 54 50 66 Q40 74 30 72 Z" fill="#cfe7ff" ${ST}/>`,

		plane: () =>
			`<path d="M50 70 L72 70 L60 96 H50 Z" fill="#3f9e3f" ${ST}/>` +
			`<path d="M14 62 Q14 48 32 46 H88 L100 26 H110 L106 58 Q104 72 88 72 H30 Q14 72 14 62 Z" fill="#6cc04a" ${ST}/>` +
			`<path d="M20 56 Q22 48 32 48 L34 58 Z" fill="#cfe7ff" ${st(2.5)}/>` + portholes([46, 56, 66, 76], 56, 3.5) +
			`<path d="M94 58 L112 54 L108 64 Z" fill="#3f9e3f" ${ST}/>`,

		bicycle: () =>
			`<circle cx="30" cy="80" r="20" fill="#fff" stroke="#5b5b66" stroke-width="5"/><circle cx="90" cy="80" r="20" fill="#fff" stroke="#5b5b66" stroke-width="5"/>` +
			`<path d="M30 62 V98 M12 80 H48 M17 67 L43 93 M43 67 L17 93 M90 62 V98 M72 80 H108 M77 67 L103 93 M103 67 L77 93" stroke="#c9c9d2" stroke-width="1.5"/>` +
			`<path d="M30 80 L54 80 L80 52 L46 52 Z M54 80 L42 40 M90 80 L76 34" fill="none" stroke="#3f9e3f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>` +
			`<path d="M70 34 Q76 26 86 30" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>` +
			`<ellipse cx="42" cy="38" rx="10" ry="4" fill="#5b5b66" ${ST}/><circle cx="54" cy="80" r="5" fill="#5b5b66" ${ST}/>`,

		rocket: () =>
			`<path d="M48 88 Q60 120 72 88 Z" fill="#ffc21a" ${ST}/><path d="M53 88 Q60 108 67 88 Z" fill="#ff7a3d"/>` +
			`<path d="M44 64 L26 92 L46 88 Z" fill="#a0441d" ${ST}/><path d="M76 64 L94 92 L74 88 Z" fill="#a0441d" ${ST}/>` +
			`<path d="M60 8 C80 24 82 58 76 90 H44 C38 58 40 24 60 8 Z" fill="#e8452c" ${ST}/>` +
			`<path d="M42 72 H78 L76 90 H44 Z" fill="#ffc21a" ${ST}/><path d="M60 72 V100" stroke="${O}" stroke-width="4"/>` +
			portholes([60], 36, 7) + portholes([60], 56, 6) +
			`<circle cx="60" cy="36" r="3" fill="#4aa3ff"/><circle cx="60" cy="56" r="2.6" fill="#4aa3ff"/>`,

		scooter: () =>
			`<path d="M50 30 L60 70" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M42 30 H58" stroke="${O}" stroke-width="6" stroke-linecap="round"/>` +
			`<circle cx="44" cy="30" r="4" fill="#a0441d" ${ST}/>` +
			`<path d="M30 86 Q32 70 48 66 L58 66 L62 80 H84 Q84 62 100 64 Q108 66 106 86 Z" fill="#ffc21a" ${ST}/>` +
			`<path d="M84 80 Q84 64 100 64 Q108 66 106 86 H90 Z" fill="#ff9a2e" ${ST}/>` +
			`<path d="M70 60 Q78 52 96 56 L94 64 H72 Z" fill="#a0441d" ${ST}/>` +
			wheel(32, 90, 13) + wheel(92, 90, 13),

		car: () =>
			`<path d="M12 84 V70 Q12 60 24 58 L38 40 Q42 34 50 34 H80 Q88 34 92 42 L100 58 Q110 60 110 72 V84 Z" fill="#e8452c" ${ST}/>` +
			`<path d="M42 56 L50 42 H62 V56 Z" fill="#cfe7ff" ${st(2.5)}/><path d="M68 42 H80 Q84 42 86 46 L91 56 H68 Z" fill="#cfe7ff" ${st(2.5)}/>` +
			`<path d="M65 60 V82 M56 66 h5" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>` +
			`<rect x="102" y="64" width="8" height="6" rx="2" fill="#ffe58a" ${st(2)}/>` +
			wheel(34, 86, 13) + wheel(88, 86, 13),

		bus: () =>
			`<rect x="10" y="30" width="100" height="56" rx="12" fill="#ffc21a" ${ST}/>` +
			[18, 38, 58, 78].map((x) => `<rect x="${x}" y="40" width="16" height="18" rx="3" fill="#cfe7ff" ${st(2.5)}/>`).join('') +
			`<rect x="96" y="40" width="10" height="34" rx="2" fill="#cfe7ff" ${st(2.5)}/>` +
			`<path d="M12 68 H94" stroke="#e8452c" stroke-width="5"/>` +
			wheel(32, 88, 12) + wheel(86, 88, 12),

		train: () =>
			`<path d="M8 104 H112" stroke="#8a6a55" stroke-width="5" stroke-linecap="round"/>` + puff(24, 18, .9, '#eef3f8') +
			`<rect x="30" y="26" width="12" height="20" fill="#3b2416" ${ST}/>` +
			`<rect x="18" y="46" width="52" height="40" rx="6" fill="#4aa3ff" ${ST}/>` +
			`<rect x="66" y="26" width="44" height="60" rx="6" fill="#e8452c" ${ST}/><rect x="62" y="20" width="52" height="10" rx="4" fill="#3b2416" ${ST}/>` +
			`<rect x="76" y="38" width="24" height="20" rx="3" fill="#cfe7ff" ${st(2.5)}/>` +
			`<path d="M10 86 L18 74 V86 Z" fill="#ffc21a" ${ST}/>` +
			wheel(34, 92, 10) + wheel(62, 92, 10) + wheel(92, 90, 13),

		truck: () =>
			`<rect x="8" y="34" width="66" height="50" rx="5" fill="#4aa3ff" ${ST}/>` +
			`<path d="M74 48 H96 L110 64 V84 H74 Z" fill="#ffc21a" ${ST}/><path d="M80 54 H94 L104 66 H80 Z" fill="#cfe7ff" ${st(2.5)}/>` +
			`<path d="M20 46 H62 M20 58 H62 M20 70 H62" stroke="#2f80d0" stroke-width="3" stroke-linecap="round"/>` +
			wheel(26, 88, 12) + wheel(56, 88, 12) + wheel(94, 88, 12)
	});

	/* ---------- fairy garden ---------- */
	Object.assign(ART, {
		cloud: () =>
			fluff([[36, 66, 18], [56, 52, 22], [80, 58, 19], [92, 74, 14], [64, 76, 18], [40, 82, 13]], '#bcd8ff') +
			`<path d="M50 58 a6 6 0 1 1 6 6 M74 66 a5 5 0 1 1 5 5 M44 76 a4 4 0 1 1 4 4" fill="none" stroke="#6f9ad8" stroke-width="2.5" stroke-linecap="round"/>` +
			eyes(56, 72, 66) + smile(64, 72, 4),

		leaf: () =>
			`<g transform="rotate(-35 60 60)"><path d="M60 8 C92 28 96 76 60 108 C24 76 28 28 60 8 Z" fill="#7ccf5a" ${ST}/>` +
			`<path d="M60 18 V116 M60 40 l-16 -10 M60 40 l16 -10 M60 58 l-20 -12 M60 58 l20 -12 M60 76 l-18 -11 M60 76 l18 -11" fill="none" stroke="#3f9e3f" stroke-width="3" stroke-linecap="round"/></g>`,

		ladybug: () =>
			`<path d="M50 30 Q44 16 36 16 M70 30 Q76 16 84 16" ${LINE}/><circle cx="36" cy="16" r="4" fill="${O}"/><circle cx="84" cy="16" r="4" fill="${O}"/>` +
			`<path d="M28 60 h-10 M28 78 h-10 M92 60 h10 M92 78 h10" ${LINE}/>` +
			`<circle cx="60" cy="40" r="17" fill="#3b2416" ${ST}/>` +
			`<circle cx="60" cy="70" r="33" fill="#ff4f3e" ${ST}/><path d="M60 38 V103" stroke="${O}" stroke-width="3"/>` +
			[[44, 58, 6], [76, 58, 6], [40, 80, 5], [80, 80, 5], [52, 94, 4], [68, 94, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${O}"/>`).join('') +
			`<circle cx="53" cy="36" r="4" fill="#fff"/><circle cx="67" cy="36" r="4" fill="#fff"/><circle cx="54" cy="37" r="2" fill="${O}"/><circle cx="68" cy="37" r="2" fill="${O}"/>`,

		butterfly: () =>
			`<path d="M56 34 Q46 16 38 20 M64 34 Q74 16 82 20" ${LINE}/><circle cx="38" cy="20" r="3.5" fill="${O}"/><circle cx="82" cy="20" r="3.5" fill="${O}"/>` +
			`<ellipse cx="36" cy="46" rx="24" ry="20" transform="rotate(-20 36 46)" fill="#ff9cc0" ${ST}/><ellipse cx="84" cy="46" rx="24" ry="20" transform="rotate(20 84 46)" fill="#ff9cc0" ${ST}/>` +
			`<ellipse cx="40" cy="82" rx="18" ry="15" transform="rotate(20 40 82)" fill="#c49cff" ${ST}/><ellipse cx="80" cy="82" rx="18" ry="15" transform="rotate(-20 80 82)" fill="#c49cff" ${ST}/>` +
			`<circle cx="34" cy="46" r="8" fill="#ffe08a"/><circle cx="86" cy="46" r="8" fill="#ffe08a"/><circle cx="40" cy="84" r="5" fill="#fff" opacity=".7"/><circle cx="80" cy="84" r="5" fill="#fff" opacity=".7"/>` +
			`<ellipse cx="60" cy="66" rx="7" ry="32" fill="#7a3b9e" ${ST}/>`,

		flower: () =>
			`<path d="M60 70 V112" stroke="#3f9e3f" stroke-width="6" stroke-linecap="round"/>` +
			`<path d="M60 96 Q40 80 30 90 Q42 104 60 96 Z" fill="#7ccf5a" ${ST}/><path d="M60 88 Q80 74 90 84 Q78 98 60 88 Z" fill="#7ccf5a" ${ST}/>` +
			fluff(Array.from({length: 6}, (_, i) => {
				const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
				return [+(60 + Math.cos(a) * 21).toFixed(1), +(46 + Math.sin(a) * 21).toFixed(1), 14];
			}), '#ff6f8e') +
			`<circle cx="60" cy="46" r="15" fill="#ffd23f" ${ST}/>` + eyes(54, 66, 44) + smile(60, 50, 3.5),

		mushroom: () =>
			`<path d="M44 66 Q40 104 50 106 H70 Q80 104 76 66 Z" fill="#fff1d6" ${ST}/>` +
			`<path d="M12 70 Q12 22 60 18 Q108 22 108 70 Q60 80 12 70 Z" fill="#ff4f3e" ${ST}/>` +
			[[38, 42, 7], [62, 32, 8], [84, 46, 6], [54, 56, 5], [26, 60, 4], [94, 62, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('') +
			eyes(53, 67, 86) + cheeks(47, 73, 94) + smile(60, 93, 3.5),

		snail: () =>
			`<path d="M16 100 Q14 86 30 86 H96 Q106 86 106 72 L104 58" fill="#d9f08c" ${ST}/>` +
			`<path d="M100 58 L96 40 M106 58 L110 42" ${LINE}/><circle cx="96" cy="40" r="4" fill="${O}"/><circle cx="110" cy="42" r="4" fill="${O}"/>` +
			`<circle cx="56" cy="62" r="30" fill="#f2a24a" ${ST}/>` +
			`<path d="M56 62 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0" fill="none" stroke="#a0441d" stroke-width="3.5" stroke-linecap="round"/>` +
			`<path d="M16 100 H104" stroke="${O}" stroke-width="3" stroke-linecap="round"/>` +
			`<ellipse cx="100" cy="70" rx="2.6" ry="3.4" fill="${O}"/>`,

		rainbow: () =>
			['#ff4f3e', '#ff9a2e', '#ffd23f', '#5cb85c', '#4aa3ff', '#8b6cff'].map((c, i) => {
				const r = 46 - i * 6;
				return `<path d="M${60 - r} 86 A${r} ${r} 0 0 1 ${60 + r} 86" fill="none" stroke="${c}" stroke-width="6.5"/>`;
			}).join('') +
			`<path d="M11 86 A49 49 0 0 1 109 86 M31 86 A29 29 0 0 1 89 86" fill="none" stroke="${O}" stroke-width="3"/>` +
			fluff([[14, 88, 10], [26, 84, 12], [36, 92, 9]], '#fff') + fluff([[84, 92, 9], [94, 84, 12], [106, 88, 10]], '#fff'),

		sun: () =>
			Array.from({length: 10}, (_, i) => {
				const a = (i / 10) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
				const p = (r, d) => `${(60 + Math.cos(a + d) * r).toFixed(1)} ${(60 + Math.sin(a + d) * r).toFixed(1)}`;
				return `<path d="M${p(32, -.2)} L${(60 + c * 52).toFixed(1)} ${(60 + s * 52).toFixed(1)} L${p(32, .2)} Z" fill="#ff9a2e" ${ST}/>`;
			}).join('') +
			`<circle cx="60" cy="60" r="32" fill="#ffd23f" ${ST}/>` + eyes(50, 70, 56) + cheeks(42, 78, 66) + smile(60, 66, 6),

		fairy: () =>
			`<ellipse cx="34" cy="70" rx="20" ry="12" transform="rotate(-30 34 70)" fill="#d4eeff" ${ST}/><ellipse cx="86" cy="70" rx="20" ry="12" transform="rotate(30 86 70)" fill="#d4eeff" ${ST}/>` +
			`<path d="M60 70 L38 108 H82 Z" fill="#b48cff" ${ST} />` +
			`<path d="M86 58 L96 34" stroke="#f29d0c" stroke-width="3.5" stroke-linecap="round"/>` +
			`<path d="M96 22 l3 7 7 1 -5 5 1.5 7 -6.5 -3.5 -6.5 3.5 1.5 -7 -5 -5 7 -1 Z" fill="#ffd23f" ${st(2)}/>` +
			`<path d="M34 50 Q30 18 60 16 Q90 18 86 50 Q88 70 80 74 L78 50 H42 L40 74 Q32 70 34 50 Z" fill="#8a4a20" ${ST}/>` +
			`<circle cx="60" cy="50" r="20" fill="#ffe0c4" ${ST}/>` +
			`<path d="M40 46 Q46 28 62 30 Q74 30 80 46 Q66 38 54 42 Q46 44 40 46 Z" fill="#8a4a20"/>` +
			`<circle cx="74" cy="32" r="6" fill="#ff6f8e" ${st(2)}/>` +
			eyes(52, 68, 52) + cheeks(46, 74, 59) + smile(60, 60, 3.5),

		tree: () =>
			`<path d="M52 108 L54 70 H66 L68 108 Z" fill="#a0612f" ${ST}/>` +
			fluff([[40, 56, 18], [60, 40, 22], [80, 56, 18], [60, 64, 18], [46, 34, 12], [76, 36, 12]], '#6cc04a') +
			[[46, 50], [70, 42], [80, 62], [56, 62], [62, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#ff4f3e" ${st(2)}/>`).join(''),

		caterpillar: () =>
			[[24, 82, 13, '#9ad86a'], [42, 78, 14, '#7ccf5a'], [60, 82, 13, '#9ad86a'], [78, 76, 14, '#7ccf5a']].map(([x, y, r, c]) =>
				`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${ST}/><path d="M${x - 3} ${y + r} v6 M${x + 3} ${y + r} v6" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`).join('') +
			`<path d="M90 44 Q86 30 80 28 M102 44 Q106 30 112 28" ${LINE}/><circle cx="80" cy="28" r="3.5" fill="#ff6f8e"/><circle cx="112" cy="28" r="3.5" fill="#ff6f8e"/>` +
			`<circle cx="96" cy="58" r="18" fill="#9ad86a" ${ST}/>` + eyes(90, 102, 55) + cheeks(85, 107, 63) + smile(96, 63, 4)
	});

	// Arabic names carry full harakat (pausal sukun on the last letter) so the voice reads them clearly for little ears
	const item = (id, tint, ar, en) => ({id, tint, name: {ar, en}});
	window.MEMORY_THEMES = [
		{
			id: 'animals', icon: '🐾', edge: '#c9573d', back: ['#8b6cff', '#4fb4ff'],
			name: {ar: 'عَالَمُ الْحَيَوَانَاتْ', en: 'Animal World'},
			items: [
				item('sheep', '#efe6ff', 'خَرُوفْ', 'Sheep'), item('duck', '#fff4c2', 'بَطَّةْ', 'Duck'),
				item('dog', '#ffe9cc', 'كَلْبْ', 'Dog'), item('cat', '#ffe2c9', 'قِطَّةْ', 'Cat'),
				item('bee', '#fff1b8', 'نَحْلَةْ', 'Bee'), item('horse', '#ffe0cc', 'حِصَانْ', 'Horse'),
				item('mouse', '#e3eeff', 'فَأْرْ', 'Mouse'), item('chick', '#fff6c9', 'كَتْكُوتْ', 'Chick'),
				item('bunny', '#ecedf5', 'أَرْنَبْ', 'Bunny'), item('cow', '#ffe6ec', 'بَقَرَةْ', 'Cow'),
				item('frog', '#e2f7d4', 'ضِفْدَعْ', 'Frog'), item('lion', '#fff0cf', 'أَسَدْ', 'Lion')
			]
		},
		{
			id: 'vehicles', icon: '🚗', edge: '#f2b01e', back: ['#ff8a3d', '#ffc83d'],
			name: {ar: 'وَسَائِلُ النَّقْلْ', en: 'Things That Go'},
			items: [
				item('sailboat', '#e3f1ff', 'قَارِبٌ شِرَاعِيّْ', 'Sailboat'), item('ship', '#e3f1ff', 'سَفِينَةْ', 'Ship'),
				item('balloon', '#e9f8e1', 'مِنْطَادْ', 'Hot-air balloon'), item('helicopter', '#ffe6dc', 'طَائِرَةٌ مَرْوَحِيَّةْ', 'Helicopter'),
				item('plane', '#e6f6dc', 'طَائِرَةْ', 'Airplane'), item('bicycle', '#eef7e6', 'دَرَّاجَةْ', 'Bicycle'),
				item('rocket', '#ffe6dc', 'صَارُوخْ', 'Rocket'), item('scooter', '#fff4cf', 'دَرَّاجَةٌ نَارِيَّةْ', 'Scooter'),
				item('car', '#ffe6e1', 'سَيَّارَةْ', 'Car'), item('bus', '#fff4cf', 'حَافِلَةْ', 'Bus'),
				item('train', '#e3f1ff', 'قِطَارْ', 'Train'), item('truck', '#e3f1ff', 'شَاحِنَةْ', 'Truck')
			]
		},
		{
			id: 'garden', icon: '🧚', edge: '#5f9a2e', back: ['#5cc87a', '#2fa8a0'],
			name: {ar: 'حَدِيقَةُ الْجِنِّيَّاتْ', en: 'Fairy Garden'},
			items: [
				item('cloud', '#eaf3ff', 'غَيْمَةْ', 'Cloud'), item('leaf', '#e9f8e1', 'وَرَقَةْ', 'Leaf'),
				item('ladybug', '#ffe6e1', 'دُعْسُوقَةْ', 'Ladybug'), item('butterfly', '#fbe8ff', 'فَرَاشَةْ', 'Butterfly'),
				item('flower', '#ffe8ef', 'زَهْرَةْ', 'Flower'), item('mushroom', '#ffe9e4', 'فُطْرْ', 'Mushroom'),
				item('snail', '#f6f9dc', 'حَلَزُونْ', 'Snail'), item('rainbow', '#eef4ff', 'قَوْسُ قُزَحْ', 'Rainbow'),
				item('sun', '#fff6d4', 'شَمْسْ', 'Sun'), item('fairy', '#f2eaff', 'جِنِّيَّةْ', 'Fairy'),
				item('tree', '#e9f8e1', 'شَجَرَةْ', 'Tree'), item('caterpillar', '#eef9e1', 'يَرَقَةْ', 'Caterpillar')
			]
		}
	];
	window.MEMORY_ART = {
		svg: (id) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${ART[id]()}</svg>`
	};
})();
