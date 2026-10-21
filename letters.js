/* 🔤 Letters Adventure (رحلة الحروف): learn the Arabic alphabet on a journey across 5 worlds.
   20 levels on a big scrolling map. Each level is 6 short games: pick the word, find the letter,
   trace it with a finger, pop the bubbles, sort the pictures. Stars, and the game a level was left at, are kept on this device.
   Uses GSAP (animations) and canvas-confetti, both saved in assets/vendor so it works offline.
   The animals, guides and the explorer are drawn in letters-art.js. */
(() => {
	'use strict';

	const gsap = window.gsap;
	const art = (id, className) => (window.LettersArt ? window.LettersArt.art(id, className) : '');
	const W = 5000; // the map is drawn in a 5000 × 1000 world, then scaled to the screen height
	const H = 1000;
	const STORE = 'letters-progress-v1';
	const FONT = '"Baloo Bhaijaan 2", "Geeza Pro", sans-serif';
	const CONFETTI = ['#ffd23f', '#ff5fa2', '#3ddc84', '#3bb2ff', '#9b5cff', '#ff8c42'];

	// ---------------- The alphabet: letter, its name, and words that start with it ----------------
	const LETTERS = [
		['أ', 'ألف', 'Alif', [['أسد', '🦁'], ['أرنب', '🐰'], ['أناناس', '🍍']]],
		['ب', 'باء', 'Baa', [['بطة', '🦆'], ['بقرة', '🐄'], ['بطيخ', '🍉']]],
		['ت', 'تاء', 'Taa', [['تفاحة', '🍎'], ['تمساح', '🐊'], ['تاج', '👑']]],
		['ث', 'ثاء', 'Thaa', [['ثعلب', '🦊'], ['ثوم', '🧄'], ['ثلج', '❄️']]],
		['ج', 'جيم', 'Jeem', [['جمل', '🐫'], ['جزر', '🥕'], ['جبل', '⛰️']]],
		['ح', 'حاء', 'Haa', [['حصان', '🐴'], ['حوت', '🐳'], ['حلزون', '🐌']]],
		['خ', 'خاء', 'Khaa', [['خروف', '🐑'], ['خيار', '🥒'], ['خبز', '🍞']]],
		['د', 'دال', 'Daal', [['دب', '🐻'], ['دجاجة', '🐔'], ['دلفين', '🐬']]],
		['ذ', 'ذال', 'Thaal', [['ذرة', '🌽'], ['ذئب', '🐺'], ['ذبابة', '🪰']]],
		['ر', 'راء', 'Raa', [['ريشة', '🪶'], ['روبوت', '🤖'], ['رسام', '🧑‍🎨']]],
		['ز', 'زاي', 'Zay', [['زرافة', '🦒'], ['زهرة', '🌸'], ['زيتون', '🫒']]],
		['س', 'سين', 'Seen', [['سمكة', '🐟'], ['سيارة', '🚗'], ['سلحفاة', '🐢']]],
		['ش', 'شين', 'Sheen', [['شمس', '☀️'], ['شجرة', '🌳'], ['شمعة', '🕯️']]],
		['ص', 'صاد', 'Saad', [['صقر', '🦅'], ['صاروخ', '🚀'], ['صوص', '🐥']]],
		['ض', 'ضاد', 'Daad', [['ضفدع', '🐸'], ['ضرس', '🦷'], ['ضباب', '🌫️']]],
		['ط', 'طاء', 'Taa', [['طائرة', '✈️'], ['طماطم', '🍅'], ['طاووس', '🦚']]],
		['ظ', 'ظاء', 'Dhaa', [['ظرف', '✉️'], ['ظبي', '🦌']]],
		['ع', 'عين', 'Ayn', [['عنب', '🍇'], ['عصفور', '🐦'], ['عسل', '🍯']]],
		['غ', 'غين', 'Ghayn', [['غيمة', '☁️'], ['غوريلا', '🦍']]],
		['ف', 'فاء', 'Faa', [['فيل', '🐘'], ['فراشة', '🦋'], ['فطر', '🍄']]],
		['ق', 'قاف', 'Qaaf', [['قطة', '🐱'], ['قمر', '🌙'], ['قرد', '🐒']]],
		['ك', 'كاف', 'Kaaf', [['كلب', '🐶'], ['كعكة', '🎂'], ['كرة', '⚽']]],
		['ل', 'لام', 'Laam', [['ليمون', '🍋'], ['لاما', '🦙'], ['لعبة', '🧸']]],
		['م', 'ميم', 'Meem', [['موز', '🍌'], ['مفتاح', '🔑'], ['مظلة', '☂️']]],
		['ن', 'نون', 'Noon', [['نحلة', '🐝'], ['نمر', '🐯'], ['نجمة', '⭐']]],
		['ه', 'هاء', 'Haa', [['هدية', '🎁'], ['هاتف', '📱']]],
		['و', 'واو', 'Waw', [['وردة', '🌹'], ['وحيد القرن', '🦏'], ['ورقة', '🍃']]],
		['ي', 'ياء', 'Yaa', [['يد', '✋'], ['يقطين', '🎃'], ['يخت', '🛥️']]]
	].map(([ch, name, en, words]) => ({ch, name, the: `ال${name}`, en, words: words.map(([word, emoji]) => ({word, emoji}))}));

	// letters that look alike: the best "wrong answers" to learn the dots
	const SIMILAR = ['ب ت ث ن ي', 'ج ح خ', 'د ذ', 'ر ز', 'س ش', 'ص ض', 'ط ظ', 'ع غ', 'ف ق'].map((group) => group.split(' '));
	// these letters never join the next one (used to color the first letter without breaking the word)
	const NON_JOINING = new Set(['ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ة', 'ء']);

	const WORLDS = [
		{id: 'forest', ar: 'الغابة السحرية', en: 'Magic Forest', guide: 'fox', decor: ['🍄', '🌿', '🍃', '✨', '🌼']},
		{id: 'river', ar: 'نهر الفراشات', en: 'Butterfly River', guide: 'turtle', decor: ['🦋', '💧', '🪷', '🫧', '🌸']},
		{id: 'meadow', ar: 'مرج الحيوانات', en: 'Animal Meadow', guide: 'deer', decor: ['🌼', '🌻', '🐞', '🦋', '🌷']},
		{id: 'cave', ar: 'كهف النجوم', en: 'Star Cave', guide: 'owl', decor: ['💎', '✨', '⭐', '🔮', '🌟']},
		{id: 'mountain', ar: 'جبل الحروف', en: 'Letter Mountain', guide: 'rabbit', decor: ['❄️', '☁️', '⭐', '✨', '🏔️']}
	];

	const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
	// levels 1–14 teach two new letters each, 15–20 mix them for practice
	const LEVELS = [
		...range(0, 13).map((i) => ({letters: [i * 2, i * 2 + 1]})),
		{letters: range(0, 6), review: true},
		{letters: range(7, 13), review: true},
		{letters: range(14, 20), review: true},
		{letters: range(21, 27), review: true},
		{letters: range(0, 27), review: true},
		{letters: range(0, 27), review: true, final: true}
	].map((level, i) => ({...level, n: i + 1, world: Math.floor(i / 4)}));

	// the dirt path the explorer walks on (map units)
	const TRAIL = [
		[40, 780], [190, 810], [330, 760], [470, 800], [620, 830], [780, 780], [900, 720], [1040, 740], [1180, 790],
		[1300, 760], [1420, 726], [1600, 736], [1740, 790], [1860, 830], [2000, 790], [2140, 730], [2300, 760],
		[2440, 820], [2600, 800], [2760, 740], [2900, 770], [3040, 820], [3180, 780], [3320, 720], [3460, 700],
		[3610, 690], [3740, 730], [3860, 790], [3990, 760], [4120, 700], [4250, 720], [4380, 650], [4480, 580],
		[4600, 600], [4700, 520], [4780, 450], [4850, 400]
	];
	const RIVER = [[1475, 515], [1440, 600], [1495, 700], [1560, 800], [1525, 900], [1580, 1020]];
	const RIVER_WIDTH = [60, 92, 112, 124, 140, 170];

	// friends living on the map: tap them to hear their name and see its first letter
	const ANIMALS = [
		{art: 'fox', word: 'ثعلب', x: 265, y: 955, s: 78, idle: 'bob'},
		{art: 'squirrel', word: 'سنجاب', x: 690, y: 640, s: 56, idle: 'hop'},
		{art: 'mushroom', word: 'فطر', x: 420, y: 925, s: 54, idle: 'sway'},
		{art: 'rabbit', word: 'أرنب', x: 945, y: 905, s: 64, idle: 'hop'},
		{art: 'frog', word: 'ضفدع', x: 1470, y: 612, s: 50, idle: 'hop'},
		{art: 'swan', word: 'بجعة', x: 1530, y: 915, s: 66, idle: 'swim'},
		{art: 'butterfly', word: 'فراشة', x: 1245, y: 560, s: 54, idle: 'flutter'},
		{art: 'cow', word: 'بقرة', x: 2170, y: 650, s: 74, idle: 'bob'},
		{art: 'sheep', word: 'خروف', x: 2420, y: 650, s: 66, idle: 'bob'},
		{art: 'deer', word: 'غزال', x: 2490, y: 960, s: 80, idle: 'sway'},
		{art: 'rooster', word: 'ديك', x: 2870, y: 650, s: 60, idle: 'hop'},
		{art: 'owl', word: 'بومة', x: 3255, y: 560, s: 68, idle: 'sway'},
		{art: 'bat', word: 'خفاش', x: 3470, y: 330, s: 56, idle: 'flutter'},
		{art: 'gem', word: 'جوهرة', x: 3820, y: 905, s: 60, idle: 'glow'},
		{art: 'snowman', word: 'رجل الثلج', x: 4150, y: 880, s: 80, idle: 'sway'},
		{art: 'goat', word: 'ماعز', x: 4330, y: 520, s: 62, idle: 'hop'},
		{art: 'eagle', word: 'نسر', x: 4560, y: 250, s: 64, idle: 'flutter'},
		{art: 'penguin', word: 'بطريق', x: 4700, y: 870, s: 62, idle: 'bob'}
	];

	const SIGNS = [{x: 250, y: 430}, {x: 1170, y: 430}, {x: 2440, y: 420}, {x: 3330, y: 450}, {x: 4290, y: 330}];

	const TEXT = {
		ar: {
			title: 'رحلة الحروف',
			journey: 'مستوى الرحلة',
			meet: 'تعرّف على الحروف الجديدة',
			review: 'هيا نراجع الحروف',
			finalIntro: 'التحدي الكبير: كل الحروف!',
			letterOf: (l) => `حرف ${l.the}`,
			pick: (l) => `أي كلمة تبدأ بحرف ${l.the}؟`,
			find: (l) => `أين حرف ${l.the}؟`,
			trace: (l) => `ارسم حرف ${l.the} بإصبعك`,
			pop: (l) => `فرقع فقاعات حرف ${l.the}`,
			drag: () => 'ضع كل صورة عند حرفها',
			play: 'هيا نلعب',
			next: 'المتابعة',
			again: 'مرة أخرى',
			praise: ['ممتاز!', 'رائع!', 'أحسنت!', 'مذهل!', 'بطل!'],
			tryAgain: 'حاول مرة أخرى',
			doneTitle: 'أحسنت!',
			doneSub: 'لقد أكملت التحدي',
			finalTitle: 'بطل الحروف!',
			finalSub: 'لقد أكملت الرحلة كلها',
			locked: 'أكمل المستوى السابق أولًا',
			newWorld: 'عالم جديد!',
			welcome: 'هيا نبدأ رحلة الحروف'
		},
		en: {
			title: 'Letters Adventure',
			journey: 'Journey',
			meet: 'Meet the new letters',
			review: "Let's practice the letters",
			finalIntro: 'The big challenge: all the letters!',
			letterOf: (l) => `The letter ${l.en}`,
			pick: (l) => `Which word starts with ${l.en}?`,
			find: (l) => `Where is ${l.en}?`,
			trace: (l) => `Trace ${l.en} with your finger`,
			pop: (l) => `Pop the ${l.en} bubbles`,
			drag: () => 'Put each picture by its letter',
			play: "Let's play",
			next: 'Continue',
			again: 'Again',
			praise: ['Great!', 'Awesome!', 'Well done!', 'Amazing!', 'Super!'],
			tryAgain: 'Try again',
			doneTitle: 'Well done!',
			doneSub: 'You finished the challenge',
			finalTitle: 'Letter Champion!',
			finalSub: 'You finished the whole journey',
			locked: 'Finish the level before first',
			newWorld: 'New world!',
			welcome: "Let's start the letters journey"
		}
	};

	// ---------------- Small helpers ----------------
	const state = {
		lang: 'ar',
		sound: true,
		u: 1, // screen pixels per map unit
		progress: null,
		heroS: 0,
		walk: null,
		game: null,
		onClose: null
	};
	const ui = {};
	let root = null;
	let trail = null;
	let nodes = [];

	const t = (key, ...args) => {
		const value = TEXT[state.lang][key] ?? TEXT.ar[key];

		return typeof value === 'function' ? value(...args) : value;
	};
	const sayAr = (key, ...args) => TEXT.ar[key](...args);
	const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
	const rand = (a, b) => a + Math.random() * (b - a);
	const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
	const letterOf = (ch) => LETTERS.find((l) => l.ch === ch);

	function shuffle(list) {
		const copy = [...list];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}

		return copy;
	}

	function similarTo(ch) {
		const group = SIMILAR.find((g) => g.includes(ch)) || [];

		return group.filter((other) => other !== ch);
	}

	function html(tag, className, inner = '') {
		const el = document.createElement(tag);
		if (className) el.className = className;
		el.innerHTML = inner;
		if (tag === 'button') el.type = 'button';

		return el;
	}

	// colors the first letter; the invisible "joiner" keeps the Arabic word connected
	function wordHtml(word) {
		const first = word[0];
		const joiner = NON_JOINING.has(first) ? '' : '‍';

		return `<span class="ag-first">${first}${joiner}</span>${joiner}${word.slice(1)}`;
	}

	// ---------------- Progress ----------------
	function loadProgress() {
		try {
			const data = JSON.parse(localStorage.getItem(STORE));
			if (data && Array.isArray(data.stars)) return {stars: LEVELS.map((_, i) => data.stars[i] | 0), resume: validResume(data.resume)};
		} catch (err) {
			/* nothing saved yet */
		}

		return {stars: LEVELS.map(() => 0), resume: null};
	}

	// a level left in the middle: {i, index, mistakes, rounds: [{type, l, m}]} with letters as numbers
	function validResume(r) {
		const okLetter = (n) => n === null || (Number.isInteger(n) && n >= 0 && n < LETTERS.length);
		if (!r || !LEVELS[r.i] || !Array.isArray(r.rounds) || !r.rounds.length) return null;
		if (!(r.index > 0 && r.index < r.rounds.length) || !r.rounds.every((x) => typeof x.type === 'string' && okLetter(x.l) && okLetter(x.m))) return null;

		return r;
	}

	function saveResume(g) {
		state.progress.resume = {
			i: g.i, index: g.index, mistakes: g.mistakes,
			rounds: g.rounds.map(({type, l, m}) => ({type, l: LETTERS.indexOf(l), m: m ? LETTERS.indexOf(m) : null}))
		};
		saveProgress();
	}

	function saveProgress() {
		try {
			localStorage.setItem(STORE, JSON.stringify(state.progress));
		} catch (err) {
			/* private mode: progress lasts until the page closes */
		}
	}

	const totalStars = () => state.progress.stars.reduce((sum, s) => sum + s, 0);
	const finishedCount = () => state.progress.stars.filter(Boolean).length;

	function currentLevel() {
		const i = state.progress.stars.findIndex((s) => !s);

		return i === -1 ? LEVELS.length - 1 : i;
	}

	const isOpen = (i) => i <= currentLevel() || state.progress.stars[i] > 0;

	// ---------------- Sounds & voice ----------------
	let audioCtx = null;

	function tone({freq, to = freq, dur = 0.15, type = 'sine', vol = 0.12, at = 0}) {
		if (!state.sound) return;
		try {
			audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
			if (audioCtx.state === 'suspended') audioCtx.resume();
			const t0 = audioCtx.currentTime + at;
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = type;
			osc.frequency.setValueAtTime(freq, t0);
			osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
			gain.gain.setValueAtTime(0.0001, t0);
			gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
			osc.connect(gain).connect(audioCtx.destination);
			osc.start(t0);
			osc.stop(t0 + dur + 0.02);
		} catch (err) {
			/* sound is optional */
		}
	}

	const sfx = {
		tap: () => tone({freq: 620, to: 840, dur: 0.08, type: 'triangle', vol: 0.1}),
		right: () => [523, 659, 784, 1047].forEach((freq, i) => tone({freq, dur: 0.22, type: 'triangle', vol: 0.12, at: i * 0.08})),
		wrong: () => {
			tone({freq: 300, to: 220, dur: 0.16, type: 'triangle', vol: 0.12});
			tone({freq: 240, to: 170, dur: 0.22, type: 'triangle', vol: 0.12, at: 0.13});
		},
		pop: () => tone({freq: 700 + Math.random() * 400, to: 160, dur: 0.12, vol: 0.18}),
		star: (i) => tone({freq: 880 * 1.26 ** i, to: 1760 * 1.26 ** i, dur: 0.32, type: 'triangle', vol: 0.12}),
		step: () => tone({freq: 320, to: 250, dur: 0.05, vol: 0.05}),
		unlock: () => [784, 988, 1175, 1568].forEach((freq, i) => tone({freq, dur: 0.2, vol: 0.1, at: i * 0.07})),
		whoosh: () => tone({freq: 260, to: 900, dur: 0.28, vol: 0.06}),
		chime: () => [1319, 1568, 1976].forEach((freq, i) => tone({freq, dur: 0.5, vol: 0.07, at: i * 0.07})),
		lock: () => tone({freq: 190, to: 140, dur: 0.15, type: 'square', vol: 0.05})
	};

	let voice = null;

	function pickVoice() {
		const voices = window.speechSynthesis.getVoices().filter((v) => /^ar/i.test(v.lang));
		voice = voices.find((v) => /maged|majed|tarik|laila|mariam|google/i.test(v.name)) || voices[0] || null;
	}

	if ('speechSynthesis' in window) {
		pickVoice();
		window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
	}

	// the letters and words are always spoken in Arabic (that is what we are learning)
	function say(text) {
		if (!state.sound || !('speechSynthesis' in window)) return;
		try {
			window.speechSynthesis.cancel();
			const line = new SpeechSynthesisUtterance(text);
			line.lang = voice ? voice.lang : 'ar-SA';
			if (voice) line.voice = voice;
			line.rate = 0.85;
			line.pitch = 1.15;
			window.speechSynthesis.speak(line);
		} catch (err) {
			/* no voice on this device */
		}
	}

	function burst({el, x = 0.5, y = 0.5, count = 50, spread = 70, scalar = 1, velocity = 30, shapes}) {
		if (!window.confetti) return;
		if (el) {
			const box = el.getBoundingClientRect();
			x = (box.left + box.width / 2) / window.innerWidth;
			y = (box.top + box.height / 2) / window.innerHeight;
		}
		window.confetti({
			particleCount: count, spread, scalar, shapes, startVelocity: velocity, ticks: 170,
			origin: {x, y}, colors: CONFETTI, zIndex: 9999, disableForReducedMotion: true
		});
	}

	// ---------------- Map geometry ----------------
	const f = (n) => Math.round(n * 10) / 10;

	// smooth curve through points (Catmull-Rom → Bézier)
	function segments(points) {
		const out = [];
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i - 1] || points[i];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[i + 2] || p2;
			out.push([p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2]);
		}

		return out;
	}

	function curve(points) {
		return `M${f(points[0][0])} ${f(points[0][1])}` + segments(points).map(([, c1, c2, p]) => `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p[0])} ${f(p[1])}`).join('');
	}

	// a closed shape: smooth top edge, straight down to the bottom of the map
	const hill = (points, bottom = H + 10) => `${curve(points)}L${points[points.length - 1][0]} ${bottom}L${points[0][0]} ${bottom}Z`;

	// the trail as many little points, so we can walk along it and find where things are
	function sampleTrail() {
		const pts = [];
		segments(TRAIL).forEach(([p0, c1, c2, p1]) => {
			for (let i = pts.length ? 1 : 0; i <= 32; i++) {
				const k = i / 32;
				const m = 1 - k;
				pts.push([
					m * m * m * p0[0] + 3 * m * m * k * c1[0] + 3 * m * k * k * c2[0] + k * k * k * p1[0],
					m * m * m * p0[1] + 3 * m * m * k * c1[1] + 3 * m * k * k * c2[1] + k * k * k * p1[1]
				]);
			}
		});
		const len = [0];
		for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
		const total = len[len.length - 1];

		const index = (s) => {
			let lo = 0;
			let hi = len.length - 1;
			while (hi - lo > 1) {
				const mid = (lo + hi) >> 1;
				if (len[mid] < s) lo = mid;
				else hi = mid;
			}

			return lo;
		};

		return {
			pts,
			total,
			at(s) {
				s = clamp(s, 0, total);
				const i = index(s);
				const j = Math.min(i + 1, pts.length - 1);
				const k = len[j] === len[i] ? 0 : (s - len[i]) / (len[j] - len[i]);
				const [ax, ay] = pts[i];
				const [bx, by] = pts[j];

				return {x: ax + (bx - ax) * k, y: ay + (by - ay) * k, angle: Math.atan2(by - ay, bx - ax)};
			},
			sAtX(x) {
				const i = pts.findIndex((p) => p[0] >= x);
				if (i <= 0) return i === 0 ? 0 : total;
				const k = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);

				return len[i - 1] + (len[i] - len[i - 1]) * k;
			},
			distance(x, y) {
				let best = Infinity;
				for (let i = 0; i < pts.length; i += 3) best = Math.min(best, Math.hypot(pts[i][0] - x, pts[i][1] - y));

				return best;
			}
		};
	}

	function riverEdges() {
		const left = [];
		const right = [];
		RIVER.forEach(([x, y], i) => {
			const [ax, ay] = RIVER[Math.max(0, i - 1)];
			const [bx, by] = RIVER[Math.min(RIVER.length - 1, i + 1)];
			const l = Math.hypot(bx - ax, by - ay) || 1;
			const nx = -(by - ay) / l;
			const ny = (bx - ax) / l;
			const w = RIVER_WIDTH[i] / 2;
			left.push([x + nx * w, y + ny * w]);
			right.push([x - nx * w, y - ny * w]);
		});

		return {left, right: right.reverse()};
	}

	function nearRiver(x, y, pad) {
		for (let i = 0; i < RIVER.length - 1; i++) {
			const [ax, ay] = RIVER[i];
			const [bx, by] = RIVER[i + 1];
			if (y < Math.min(ay, by) - pad || y > Math.max(ay, by) + pad) continue;
			const k = clamp((y - ay) / (by - ay || 1), 0, 1);
			if (Math.abs(x - (ax + (bx - ax) * k)) < RIVER_WIDTH[i + 1] / 2 + pad) return true;
		}

		return false;
	}

	// ---------------- The world picture (one static SVG: drawn once, so scrolling stays smooth) ----------------
	function seeded(seed) {
		return () => {
			seed = (seed + 0x6d2b79f5) | 0;
			let v = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;

			return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
		};
	}

	// every symbol is drawn in a 120 × 150 box whose bottom-center is the "feet"
	const use = (id, x, y, s, color = '') =>
		`<use href="#${id}" x="${f(x - 60 * s)}" y="${f(y - 150 * s)}" width="${f(120 * s)}" height="${f(150 * s)}"${color ? ` color="${color}"` : ''}/>`;

	const SYMBOLS = `
		<symbol id="sTree" viewBox="-60 -150 120 150"><rect x="-8" y="-62" width="16" height="62" rx="6" fill="#7a4a24"/><circle cy="-98" r="44" fill="currentColor"/><circle cx="-30" cy="-70" r="30" fill="currentColor"/><circle cx="30" cy="-72" r="30" fill="currentColor"/><circle cx="-16" cy="-116" r="20" fill="#fff" opacity=".16"/><circle cx="-36" cy="-78" r="12" fill="#fff" opacity=".12"/><circle cx="22" cy="-82" r="30" fill="#000" opacity=".09"/></symbol>
		<symbol id="sPine" viewBox="-60 -150 120 150"><rect x="-7" y="-32" width="14" height="32" fill="#6b4122"/><path d="M0-148L36-92H18L46-56H22L54-24H-54L-22-56H-46L-18-92H-36Z" fill="currentColor"/><path d="M0-148L-36-92H-18L-46-56H-22L-54-24H0Z" fill="#fff" opacity=".13"/></symbol>
		<symbol id="sSnowPine" viewBox="-60 -150 120 150"><rect x="-7" y="-32" width="14" height="32" fill="#6b4122"/><path d="M0-148L36-92H18L46-56H22L54-24H-54L-22-56H-46L-18-92H-36Z" fill="#2f7a5a"/><path d="M0-148L16-122L6-118L-2-126L-10-118L-16-122ZM-18-92H18L28-80L12-84L0-78L-14-85L-28-80ZM-22-56H22L34-44L16-48L2-42L-14-49L-34-44ZM-22-24H54L40-14L20-18L4-12L-16-18L-40-14L-54-24Z" fill="#fff"/></symbol>
		<symbol id="sBush" viewBox="-60 -150 120 150"><circle cx="-28" cy="-26" r="28" fill="currentColor"/><circle cx="26" cy="-28" r="30" fill="currentColor"/><circle cy="-46" r="34" fill="currentColor"/><circle cx="-10" cy="-60" r="13" fill="#fff" opacity=".18"/><rect x="-56" y="-14" width="112" height="14" rx="7" fill="#000" opacity=".1"/></symbol>
		<symbol id="sFlower" viewBox="-60 -150 120 150"><path d="M0 0V-80" stroke="#3f9a3a" stroke-width="9"/><ellipse cx="-16" cy="-38" rx="16" ry="7" fill="#4bb04a" transform="rotate(-30 -16 -38)"/><g fill="currentColor"><circle cy="-118" r="18"/><circle cx="21" cy="-102" r="18"/><circle cx="13" cy="-78" r="18"/><circle cx="-13" cy="-78" r="18"/><circle cx="-21" cy="-102" r="18"/></g><circle cy="-96" r="14" fill="#ffd23f"/><circle cx="-4" cy="-100" r="5" fill="#fff" opacity=".7"/></symbol>
		<symbol id="sMushroom" viewBox="-60 -150 120 150"><path d="M-16 0Q-20-40-12-62H12Q20-40 16 0Z" fill="#fbeedd"/><path d="M-58-58Q-50-122 0-126Q50-122 58-58Q0-46-58-58Z" fill="currentColor"/><g fill="#fff"><circle cx="-28" cy="-88" r="10"/><circle cx="8" cy="-106" r="9"/><circle cx="32" cy="-76" r="8"/><circle cx="-4" cy="-72" r="6"/></g></symbol>
		<symbol id="sCrystal" viewBox="-60 -150 120 150"><g transform="rotate(-18 -20 0)"><path d="M-20-100L-6-84V-6L-20 0L-34-6V-84Z" fill="currentColor"/><path d="M-20-100L-34-84V-6L-20 0Z" fill="#fff" opacity=".35"/></g><g transform="rotate(16 22 0)"><path d="M22-88L36-72V-6L22 0L8-6V-72Z" fill="currentColor"/><path d="M22-88L8-72V-6L22 0Z" fill="#fff" opacity=".35"/></g><path d="M0-148L18-124V-4L0 4L-18-4V-124Z" fill="currentColor"/><path d="M0-148L-18-124V-4L0 4Z" fill="#fff" opacity=".42"/><path d="M0-148L18-124L0-116L-18-124Z" fill="#fff" opacity=".6"/></symbol>
		<symbol id="sRock" viewBox="-60 -150 120 150"><path d="M-58 0Q-54-46-14-58Q34-64 58 0Z" fill="currentColor"/><path d="M-40-20Q-36-44-10-50Q-26-36-24-16Z" fill="#fff" opacity=".22"/></symbol>
		<symbol id="sLily" viewBox="-60 -150 120 150"><path d="M0-30A52 22 0 1 0 10-30L0-14Z" fill="#3fae5a"/><path d="M0-30A52 22 0 1 0 10-30L0-14Z" fill="none" stroke="#2c8a44" stroke-width="3"/></symbol>
		<symbol id="sLotus" viewBox="-60 -150 120 150"><path d="M0-90Q-26-60 0-30Q26-60 0-90Z" fill="#ff8fc8"/><path d="M-6-36Q-46-60-40-80Q-14-62-6-36ZM6-36Q46-60 40-80Q14-62 6-36Z" fill="#ffb3da"/></symbol>
	`;

	function sceneSvg() {
		const r = seeded(11);
		const out = [];
		const add = (s) => out.push(s);
		const free = (x, y, pad = 50) => trail.distance(x, y) > pad && !nearRiver(x, y, 26);

		// sky, sun, stars, faraway mountains
		add(`<rect width="${W}" height="${H}" fill="url(#gSky)"/><rect width="${W}" height="${H}" fill="url(#gHaze)"/>`);
		add('<circle cx="330" cy="150" r="190" fill="url(#gSun)"/><circle cx="330" cy="150" r="58" fill="#fff6c4"/>');
		for (let i = 0; i < 70; i++) {
			const x = 2960 + r() * 1100;
			const y = 30 + r() * 330;
			add(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 3.2)}" fill="#fff" opacity="${f(0.45 + r() * 0.55)}"/>`);
		}
		add(`<path d="${hill([[-40, 470], [180, 360], [420, 420], [700, 330], [980, 410], [1250, 300], [1560, 380], [1850, 320], [2150, 400], [2450, 310], [2800, 390], [3050, 330], [3350, 250], [3650, 300], [3950, 240], [4300, 200], [4650, 260], [5040, 220]])}" fill="url(#gFar)"/>`);
		add(`<path d="${hill([[-40, 520], [260, 450], [560, 480], [880, 420], [1200, 470], [1500, 410], [1800, 460], [2100, 420], [2400, 470], [2700, 430], [3000, 470]])}" fill="url(#gFar2)"/>`);

		// big snowy mountain with the castle of letters
		add(`<path d="M3880 760L4060 560L4180 430L4290 360L4390 405L4520 280L4640 175L4760 92L4880 165L4990 250L5040 290V760Z" fill="url(#gSnow)"/>`);
		add('<path d="M4760 92L4880 165L4990 250L5040 290V560L4900 440L4840 300Z" fill="#b8cdea" opacity=".75"/><path d="M4520 280L4640 175L4600 330L4520 420Z" fill="#c7d8ef" opacity=".8"/><path d="M4290 360L4390 405L4330 520L4250 470Z" fill="#c7d8ef" opacity=".8"/>');
		add('<path d="M4600 330L4640 360L4580 420Z M4840 300L4880 340L4830 380Z M4380 470L4420 500L4360 520Z" fill="#8f9fb8" opacity=".6"/>');
		add(`<g transform="translate(4790 250)">
			<rect x="-82" y="-92" width="164" height="92" fill="#f2f0fb"/><rect x="20" y="-92" width="62" height="92" fill="#dcd8f0"/>
			<path d="M-82-92v-14h18v14h16v-14h18v14h16v-14h18v14h16v-14h18v14h16v-14h18v14h16v-14h18v14Z" fill="#f2f0fb"/>
			<rect x="-110" y="-150" width="46" height="150" fill="#f7f5ff"/><rect x="-80" y="-150" width="16" height="150" fill="#dcd8f0"/><path d="M-118-148L-87-222L-56-148Z" fill="#4f7de0"/><path d="M-87-222L-56-148H-87Z" fill="#3a63c4"/>
			<rect x="64" y="-150" width="46" height="150" fill="#f7f5ff"/><rect x="94" y="-150" width="16" height="150" fill="#dcd8f0"/><path d="M56-148L87-222L118-148Z" fill="#4f7de0"/><path d="M87-222L118-148H87Z" fill="#3a63c4"/>
			<rect x="-34" y="-186" width="68" height="186" fill="#fbfaff"/><rect x="10" y="-186" width="24" height="186" fill="#e4e0f5"/><path d="M-44-184L0-276L44-184Z" fill="#5a88ee"/><path d="M0-276L44-184H0Z" fill="#3f6bd0"/>
			<path d="M0-276V-318" stroke="#7a4a24" stroke-width="5"/><path d="M2-318L46-305L2-292Z" fill="#ff5f6d"/>
			<rect x="-26" y="-160" width="52" height="58" rx="10" fill="#ffcf3f" stroke="#e0a106" stroke-width="5"/>
			<text x="0" y="-116" text-anchor="middle" font-family='"Baloo Bhaijaan 2", sans-serif' font-weight="800" font-size="46" fill="#8a3b00">أ</text>
			<path d="M-22 0V-44A22 22 0 0 1 22-44V0Z" fill="#8a5a2b"/><path d="M0 0V-66" stroke="#6b4122" stroke-width="3"/>
			<path d="M-96-112v-18a9 9 0 0 1 18 0v18Z M78-112v-18a9 9 0 0 1 18 0v18Z M-8-60v-14a8 8 0 0 1 16 0v14Z" fill="#ffd96b"/>
		</g>`);
		add('<g fill="#d8c8a8" opacity=".9"><rect x="4818" y="372" width="34" height="9" rx="4"/><rect x="4808" y="352" width="34" height="9" rx="4"/><rect x="4800" y="332" width="34" height="9" rx="4"/><rect x="4794" y="312" width="34" height="9" rx="4"/><rect x="4790" y="292" width="34" height="9" rx="4"/><rect x="4788" y="272" width="30" height="9" rx="4"/></g>');

		// the crystal cave: a purple rock hill with a glowing doorway
		add(`<path d="M2940 740L3010 560L3080 470L3150 360L3240 270L3330 205L3420 240L3500 160L3580 118L3680 150L3770 220L3860 300L3930 400L3990 520L4060 740Z" fill="url(#gRock)"/>`);
		add('<path d="M3330 205L3420 240L3380 360L3300 330Z M3580 118L3680 150L3620 260L3550 230Z M3860 300L3930 400L3860 430L3820 350Z M3150 360L3240 270L3230 390Z" fill="#a58ae6" opacity=".45"/>');
		add('<path d="M3420 240L3500 160L3480 300Z M3770 220L3860 300L3780 360Z M3010 560L3080 470L3090 600Z" fill="#2a1d5e" opacity=".35"/>');
		add('<path d="M3510 712C3505 560 3552 462 3610 458C3670 462 3716 560 3712 712Z" fill="#2a1559" stroke="#24184f" stroke-width="16"/>');
		add('<path d="M3528 712C3524 578 3562 482 3610 478C3660 482 3696 578 3694 712Z" fill="url(#gCaveGlow)"/>');
		[[3300, 715, 0.9, '#b57bff'], [3450, 705, 0.7, '#6fe3ff'], [3770, 712, 0.85, '#ff7bd8'], [3920, 700, 0.7, '#8f7bff'],
			[3245, 420, 0.5, '#6fe3ff'], [3720, 340, 0.55, '#ff9be6'], [3450, 300, 0.45, '#b57bff'], [3880, 470, 0.5, '#6fe3ff']]
			.forEach(([x, y, s, c]) => add(use('sCrystal', x, y, s, c)));

		// cliff and waterfall source
		add('<path d="M1290 560C1290 470 1320 380 1360 330C1390 260 1440 230 1480 240C1530 220 1600 250 1630 320C1670 380 1690 470 1690 560Z" fill="#a08c78"/>');
		add('<path d="M1360 330C1390 260 1440 230 1480 240C1460 300 1420 340 1400 420C1380 470 1330 500 1300 520C1300 450 1330 380 1360 330Z" fill="#c0ad98" opacity=".7"/><path d="M1630 320C1670 380 1690 470 1690 560H1600C1630 480 1640 400 1630 320Z" fill="#7d6b5b" opacity=".6"/>');
		add('<path d="M1360 330C1390 260 1440 230 1480 240C1530 220 1600 250 1630 320C1580 300 1540 290 1500 300C1450 290 1400 300 1360 330Z" fill="#5aa94a"/>');
		add('<path d="M1446 286H1506V520H1446Z" fill="#7fd6f5"/>');

		// meadow hills
		add(`<path d="${hill([[1880, 560], [2050, 480], [2250, 500], [2450, 455], [2650, 480], [2850, 450], [3000, 520]])}" fill="#8fd05a"/>`);
		add(`<path d="${hill([[-40, 560], [120, 500], [330, 520], [560, 470], [800, 510], [1000, 490], [1200, 540]])}" fill="#3d8a3c"/>`);

		// back rows of trees
		for (let x = -20; x < 1260; x += 46 + r() * 30) add(use('sTree', x, 545 + r() * 30, 1.05 + r() * 0.5, pickColor(r, ['#2f7a35', '#3a8a3a', '#2a6e33'])));
		for (let x = 1700; x < 2000; x += 60 + r() * 40) add(use('sTree', x, 555 + r() * 25, 1 + r() * 0.4, pickColor(r, ['#4b9e3f', '#5aae46'])));
		[2080, 2470, 2960].forEach((x) => add(use('sTree', x, 540, 1.3 + r() * 0.3, '#56ad43')));
		for (let x = 3960; x < 4420; x += 50 + r() * 40) add(use('sSnowPine', x, 640 + r() * 40, 0.9 + r() * 0.5));

		// the treehouse ("House of Wisdom")
		add(`<g transform="translate(600 0)">
			<path d="M-34 580C-30 470-26 380-20 300H20C26 380 30 470 34 580Z" fill="#8a5a2b"/><path d="M6 580C10 480 14 380 20 300L4 300C2 380 -2 480 -6 580Z" fill="#6b4122"/>
			<path d="M-20 420C-60 400-90 380-110 350" stroke="#8a5a2b" stroke-width="16" fill="none" stroke-linecap="round"/>
			<circle cx="-40" cy="230" r="110" fill="#2f7a35"/><circle cx="70" cy="250" r="100" fill="#3a8a3a"/><circle cx="10" cy="160" r="100" fill="#3f9440"/><circle cx="-120" cy="320" r="60" fill="#348238"/>
			<circle cx="-30" cy="140" r="40" fill="#fff" opacity=".12"/>
			<rect x="-86" y="300" width="172" height="16" rx="6" fill="#7a4a24"/>
			<rect x="-62" y="226" width="124" height="76" rx="8" fill="#c98f4e"/><path d="M-62 248H62M-62 270H62" stroke="#a8703c" stroke-width="4"/>
			<path d="M-80 230L0 170L80 230Z" fill="#c8402f"/><path d="M0 170L80 230H0Z" fill="#a8322a"/>
			<rect x="-36" y="246" width="30" height="30" rx="6" fill="#ffd96b"/><rect x="12" y="250" width="26" height="52" rx="6" fill="#6b4122"/>
			<path d="M-70 316V560M-50 316V560" stroke="#a8703c" stroke-width="6"/><path d="M-70 350H-50M-70 390H-50M-70 430H-50M-70 470H-50M-70 510H-50" stroke="#a8703c" stroke-width="5"/>
		</g>`);

		// farm house and windmill tower (its sails spin in a separate layer)
		add(`<g transform="translate(2230 560)">
			<rect x="-74" y="-96" width="148" height="96" fill="#f6e3c4"/><rect x="20" y="-96" width="54" height="96" fill="#e6cfa8"/>
			<path d="M-92-92L0-162L92-92Z" fill="#d9493b"/><path d="M0-162L92-92H0Z" fill="#b8392e"/><rect x="40" y="-162" width="18" height="40" fill="#a8322a"/>
			<rect x="-16" y="-54" width="32" height="54" rx="4" fill="#8a5a2b"/><rect x="-60" y="-70" width="30" height="28" rx="4" fill="#9ad7ff" stroke="#fff" stroke-width="4"/><rect x="34" y="-70" width="30" height="28" rx="4" fill="#9ad7ff" stroke="#fff" stroke-width="4"/>
		</g>`);
		add('<g transform="translate(2730 600)"><path d="M-40 0L-22-150H22L40 0Z" fill="#f3e7d3"/><path d="M8 0L6-150H22L40 0Z" fill="#dccbb0"/><path d="M-30-150Q0-196 30-150Z" fill="#c0563f"/><rect x="-12" y="-46" width="24" height="46" rx="10" fill="#8a5a2b"/><circle cy="-100" r="10" fill="#9ad7ff" stroke="#fff" stroke-width="3"/></g>');
		add('<g stroke="#b88a4a" stroke-width="8" stroke-linecap="round"><path d="M2040 610H2330M2040 632H2330"/></g>');
		for (let x = 2040; x <= 2330; x += 32) add(`<rect x="${x - 5}" y="594" width="10" height="50" rx="3" fill="#a8703c"/>`);

		// the ground: grass → meadow → cave stone → snow
		add(`<path d="${hill([[-40, 575], [250, 562], [520, 580], [800, 560], [1100, 560], [1300, 545], [1500, 530], [1750, 548], [2000, 565], [2250, 552], [2500, 572], [2800, 556], [3000, 610], [3200, 668], [3500, 690], [3800, 682], [4000, 640], [4250, 640], [4500, 690], [4800, 700], [5040, 690]])}" fill="url(#gGround)"/>`);
		add(`<rect y="560" width="${W}" height="${H - 560}" fill="url(#gShade)"/>`);

		// the river with its banks
		const {left, right} = riverEdges();
		add(`<ellipse cx="1476" cy="522" rx="78" ry="26" fill="#bdf0ff"/>`);
		add(`<path d="${curve(left)}L${f(right[0][0])} ${f(right[0][1])}${curve(right).replace(/^M[^C]+/, '')}Z" fill="url(#gRiver)" stroke="#d6f7ff" stroke-width="10" stroke-linejoin="round"/>`);
		add('<path d="M1440 640Q1470 650 1500 640M1500 760Q1540 772 1580 760M1500 880Q1540 892 1570 880" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>');
		[[1470, 640, 0.75], [1540, 860, 0.6], [1585, 980, 0.8], [1500, 812, 0.5]].forEach(([x, y, s]) => add(use('sLily', x, y, s)));
		[[1488, 860, 0.45], [1572, 986, 0.4]].forEach(([x, y, s]) => add(use('sLotus', x, y, s)));
		[[1390, 600, 0.45], [1640, 700, 0.5], [1370, 820, 0.4], [1660, 900, 0.55]].forEach(([x, y, s]) => add(use('sRock', x, y, s, '#9a8f86')));

		// the trail: shadow, dirt, light middle, pebbles, and the gold "done" part
		const d = curve(TRAIL);
		add(`<path d="${d}" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="62" stroke-linecap="round" transform="translate(0 8)"/>`);
		add(`<path d="${d}" fill="none" stroke="#b07a40" stroke-width="56" stroke-linecap="round"/>`);
		add(`<path d="${d}" fill="none" stroke="#e8c48a" stroke-width="42" stroke-linecap="round"/>`);
		add(`<path d="${d}" fill="none" stroke="#f7e2b8" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 30"/>`);
		add(`<path id="advTrailGlow" d="${d}" pathLength="${f(trail.total)}" fill="none" stroke="#fff2a8" stroke-opacity=".55" stroke-width="26" stroke-linecap="round" stroke-dasharray="0 ${W * 3}"/>`);
		add(`<path id="advTrailDone" d="${d}" pathLength="${f(trail.total)}" fill="none" stroke="#ffc21a" stroke-width="10" stroke-linecap="round" stroke-dasharray="0 ${W * 3}"/>`);

		// the wooden bridge over the river
		const s0 = trail.sAtX(1402);
		const s1 = trail.sAtX(1606);
		const rails = [[], []];
		for (let s = s0; s <= s1; s += 14) {
			const p = trail.at(s);
			const nx = -Math.sin(p.angle);
			const ny = Math.cos(p.angle);
			add(`<path d="M${f(p.x + nx * 40)} ${f(p.y + ny * 40)}L${f(p.x - nx * 40)} ${f(p.y - ny * 40)}" stroke="${Math.round((s - s0) / 14) % 2 ? '#a8703c' : '#b97f45'}" stroke-width="11" stroke-linecap="round"/>`);
			rails[0].push([p.x + nx * 40, p.y + ny * 40 - 26]);
			rails[1].push([p.x - nx * 40, p.y - ny * 40 - 26]);
		}
		rails.forEach((rail) => {
			add(`<path d="${curve(rail)}" stroke="#7a4a24" stroke-width="8" fill="none" stroke-linecap="round"/>`);
			rail.filter((_, i) => i % 4 === 0 || i === rail.length - 1).forEach(([x, y]) => add(`<path d="M${f(x)} ${f(y)}V${f(y + 28)}" stroke="#6b3f1d" stroke-width="9" stroke-linecap="round"/>`));
		});

		// scattered flowers, mushrooms, glowing cave mushrooms, crystals, rocks
		const flowerColors = ['#ff6fa8', '#ffd23f', '#b07bff', '#ff7a59', '#ffffff', '#5cc8ff'];
		for (let i = 0; i < 260; i++) {
			const x = 20 + r() * 3000;
			const y = 600 + r() * 380;
			if (!free(x, y)) continue;
			const meadow = x > 1950;
			if (!meadow && r() < 0.15) add(use('sMushroom', x, y, 0.22 + r() * 0.12, pickColor(r, ['#e2453c', '#ff7a3d'])));
			else if (meadow || r() < 0.6) add(use('sFlower', x, y, 0.2 + r() * 0.14, pickColor(r, flowerColors)));
		}
		for (let i = 0; i < 40; i++) {
			const x = 3020 + r() * 960;
			const y = 720 + r() * 260;
			if (!free(x, y)) continue;
			if (r() < 0.55) add(use('sCrystal', x, y, 0.2 + r() * 0.2, pickColor(r, ['#b57bff', '#6fe3ff', '#ff7bd8'])));
			else add(use('sMushroom', x, y, 0.2 + r() * 0.1, '#5ad1ff'));
		}
		for (let i = 0; i < 26; i++) {
			const x = 4000 + r() * 1000;
			const y = 720 + r() * 260;
			if (free(x, y, 60)) add(use(r() < 0.6 ? 'sSnowPine' : 'sRock', x, y, 0.35 + r() * 0.35, '#b9c6d8'));
		}

		// front edge: bushes, big crystals, snow mounds
		for (let x = -20; x < 2980; x += 70 + r() * 50) add(use('sBush', x, 1012 + r() * 12, 0.9 + r() * 0.6, x < 1100 ? pickColor(r, ['#2f7a35', '#3f9440']) : pickColor(r, ['#4fa443', '#62b84a'])));
		[[3080, 1015, 1.1, '#b57bff'], [3560, 1020, 0.9, '#6fe3ff'], [3960, 1015, 1.05, '#ff7bd8']].forEach(([x, y, s, c]) => add(use('sCrystal', x, y, s, c)));
		for (let x = 4000; x < 5040; x += 120 + r() * 60) add(`<ellipse cx="${f(x)}" cy="${f(1000 + r() * 10)}" rx="${f(90 + r() * 50)}" ry="${f(36 + r() * 16)}" fill="#fff"/>`);

		const defs = `
			<linearGradient id="gSky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
				<stop offset="0" stop-color="#86d4ff"/><stop offset=".2" stop-color="#93dbff"/><stop offset=".4" stop-color="#9fdfff"/>
				<stop offset=".56" stop-color="#8fb4f0"/><stop offset=".61" stop-color="#4a3a9c"/><stop offset=".7" stop-color="#2a1d68"/>
				<stop offset=".77" stop-color="#3b2d82"/><stop offset=".82" stop-color="#a6c6f2"/><stop offset="1" stop-color="#e4f2ff"/>
			</linearGradient>
			<linearGradient id="gHaze" x1="0" y1="0" x2="0" y2="1"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".35"/></linearGradient>
			<radialGradient id="gSun"><stop offset=".25" stop-color="#fff3b0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient>
			<linearGradient id="gFar" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
				<stop offset="0" stop-color="#9cc8e6"/><stop offset=".55" stop-color="#a6b4e6"/><stop offset=".61" stop-color="#4a3c8e"/>
				<stop offset=".77" stop-color="#4d3f94"/><stop offset=".82" stop-color="#c2d4ee"/><stop offset="1" stop-color="#d4e2f4"/>
			</linearGradient>
			<linearGradient id="gFar2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6fae8a"/><stop offset="1" stop-color="#8cc47c"/></linearGradient>
			<linearGradient id="gSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#e6f0fb"/><stop offset="1" stop-color="#c8daf0"/></linearGradient>
			<linearGradient id="gRock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8064d0"/><stop offset=".55" stop-color="#55409e"/><stop offset="1" stop-color="#33256e"/></linearGradient>
			<radialGradient id="gCaveGlow" cx=".5" cy=".85" r=".8"><stop offset="0" stop-color="#fff0ff"/><stop offset=".25" stop-color="#e59bff"/><stop offset=".6" stop-color="#8a45dc"/><stop offset="1" stop-color="#2b1460"/></radialGradient>
			<linearGradient id="gRiver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fdcff"/><stop offset=".5" stop-color="#36b2ec"/><stop offset="1" stop-color="#1f8fd6"/></linearGradient>
			<linearGradient id="gGround" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
				<stop offset="0" stop-color="#5aab3e"/><stop offset=".2" stop-color="#6cbd48"/><stop offset=".4" stop-color="#86cf4f"/>
				<stop offset=".58" stop-color="#8bd152"/><stop offset=".615" stop-color="#5d5a96"/><stop offset=".78" stop-color="#584f92"/>
				<stop offset=".81" stop-color="#e8f2fd"/><stop offset="1" stop-color="#f6faff"/>
			</linearGradient>
			<linearGradient id="gShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
			${SYMBOLS}`;

		return `<svg class="adv-world" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>${defs}</defs>${out.join('')}</svg>`;
	}

	function pickColor(r, list) {
		return list[Math.floor(r() * list.length)];
	}

	// a little white bird gliding across the sky, flapping its wings
	const BIRD = '<svg class="la" viewBox="0 0 100 100"><g class="la-wing" style="transform-origin:50px 52px"><path d="M50 52Q34 30 8 38Q30 40 44 58Z" fill="#fff"/></g><g class="la-wing la-wing2" style="transform-origin:50px 52px"><path d="M50 52Q66 30 92 38Q70 40 56 58Z" fill="#f1f6fb"/></g><ellipse cx="50" cy="56" rx="9" ry="7" fill="#fff"/><path d="M58 54L66 56L58 58Z" fill="#ffb020"/><circle cx="55" cy="53" r="1.6" fill="#2b1d14"/></svg>';

	// living things on top of the picture (each one moves on its own layer, so it costs almost nothing)
	function effectsHtml() {
		const at = (x, y, extra = '') => `style="--x:${x};--y:${y};${extra}"`;
		const parts = [];
		[[180, 90, 1.1, 46], [820, 60, 0.8, 58], [1650, 120, 1, 52], [2350, 70, 1.2, 64], [2850, 150, 0.7, 40], [4180, 120, 1, 50], [4560, 440, 1.4, 70], [4950, 520, 1.1, 60], [3950, 600, 1.2, 56]]
			.forEach(([x, y, s, d], i) => parts.push(`<i class="fx-cloud" ${at(x, y, `--s:${s};--d:${d}s;--delay:${-i * 7}s`)}></i>`));
		parts.push(`<div class="fx-waterfall" ${at(1446, 286)}><i></i><i></i></div><i class="fx-splash" ${at(1476, 522)}></i>`);
		parts.push(`<div class="fx-mill" ${at(2730, 452)}><svg viewBox="-100 -100 200 200"><g fill="#fff8ec" stroke="#b07a40" stroke-width="5">${[0, 90, 180, 270].map((a) => `<path transform="rotate(${a})" d="M-6-8L-14-96H14L6-8Z"/>`).join('')}</g><circle r="14" fill="#c0563f"/></svg></div>`);
		[[300, 640], [470, 520], [760, 600], [880, 470], [150, 520], [560, 700], [990, 610], [3120, 560], [3400, 640], [3880, 600], [3700, 420], [3300, 400]]
			.forEach(([x, y], i) => parts.push(`<i class="fx-firefly" ${at(x, y, `--delay:${-i * 0.7}s;--dx:${(i % 3) * 16 - 16}`)}></i>`));
		[[548, 334], [652, 334]].forEach(([x, y]) => parts.push(`<i class="fx-lantern" ${at(x, y)}></i>`));
		[[3300, 690, 90], [3450, 680, 70], [3770, 690, 80], [3610, 600, 150], [3080, 950, 120], [3560, 960, 110], [3960, 950, 120]]
			.forEach(([x, y, s], i) => parts.push(`<i class="fx-glow" ${at(x, y, `--s:${s};--delay:${-i * 0.6}s`)}></i>`));
		[[1470, 700], [1530, 820], [1560, 940], [1450, 610]].forEach(([x, y], i) => parts.push(`<i class="fx-glint" ${at(x, y, `--delay:${-i * 0.8}s`)}></i>`));
		[[3060, 120], [3200, 300], [3640, 60], [3900, 160], [3360, 90], [3780, 330], [4020, 60]].forEach(([x, y], i) => parts.push(`<i class="fx-star" ${at(x, y, `--delay:${-i * 0.45}s`)}>✦</i>`));
		parts.push(`<span class="fx-emoji fx-moon" ${at(3180, 110)}>🌙</span>`);
		[[1720, 560, 0], [2320, 520, 1], [1900, 680, 2], [2650, 560, 3], [860, 640, 4]].forEach(([x, y, i]) => parts.push(`<span class="fx-emoji fx-fly" ${at(x, y, `--delay:${-i * 1.3}s`)}>${art('butterfly')}</span>`));
		[[900, 200, 0], [2100, 160, 1], [4400, 160, 2]].forEach(([x, y, i]) => parts.push(`<span class="fx-emoji fx-bird" ${at(x, y, `--delay:${-i * 4}s`)}>${BIRD}</span>`));
		for (let i = 0; i < 14; i++) parts.push(`<i class="fx-snow" ${at(4050 + ((i * 71) % 950), 0, `--delay:${-i * 0.9}s;--d:${7 + (i % 4)}s`)}></i>`);

		return parts.join('');
	}

	// ---------------- Build the screen ----------------
	function build() {
		root = document.getElementById('adventure');
		trail = sampleTrail();
		nodes = LEVELS.map((level, i) => {
			const x = level.world * 1000 + 150 + (i % 4) * 230;
			const s = Math.min(trail.sAtX(x), trail.total);

			return {s, ...trail.at(s)};
		});

		root.innerHTML = `
			<div class="adv-scroller" dir="ltr">
				<div class="adv-map">
					${sceneSvg()}
					<div class="adv-layer adv-fx">${effectsHtml()}</div>
					<div class="adv-layer adv-things"></div>
					<div class="adv-hero"><div class="adv-hero-pin"><span>${art('kid')}</span></div><i class="adv-hero-shadow"></i></div>
				</div>
			</div>
			<header class="adv-hud">
				<button class="adv-btn adv-home" type="button" aria-label="Home">🏠</button>
				<div class="adv-player">
					<span class="adv-avatar">${art('kid')}</span>
					<div class="adv-player-info">
						<span class="adv-stars">⭐ <b></b></span>
						<span class="adv-journey"><small></small><i><b></b></i><em></em></span>
					</div>
				</div>
				<h1 class="adv-title"></h1>
				<button class="adv-btn adv-sound" type="button" aria-label="Sound"></button>
			</header>
			<div class="adv-mini" dir="ltr">
				<button class="adv-mini-arrow" data-dir="-1" type="button" aria-label="Back">‹</button>
				<div class="adv-mini-track"><div class="adv-mini-dots"></div><i class="adv-mini-hero"></i><div class="adv-mini-view"></div></div>
				<button class="adv-mini-arrow" data-dir="1" type="button" aria-label="Next">›</button>
				<button class="adv-mini-center" type="button" aria-label="Where am I">🧭</button>
			</div>
			<div class="adv-banner"><span class="adv-banner-guide"></span><div><small></small><b></b></div></div>
			<div class="adv-game" hidden>
				<div class="ag-bg"><div class="ag-decor"></div></div>
				<div class="ag-wrap">
					<div class="ag-board">
						<button class="ag-close" type="button" aria-label="Close">✕</button>
						<button class="ag-say" type="button" aria-label="Listen">🔊</button>
						<div class="ag-dots"></div>
						<div class="ag-stage"></div>
						<button class="ag-cheer" type="button"></button>
					</div>
					<div class="ag-guide"><div class="ag-bubble"></div><span class="ag-guide-body"><span class="ag-guide-emoji"></span></span></div>
				</div>
			</div>`;

		const $ = (sel) => root.querySelector(sel);
		Object.assign(ui, {
			scroller: $('.adv-scroller'), map: $('.adv-map'), things: $('.adv-things'), hero: $('.adv-hero'), heroPin: $('.adv-hero-pin'),
			stars: $('.adv-stars b'), starsBox: $('.adv-stars'), journeyLabel: $('.adv-journey small'), journeyBar: $('.adv-journey i b'), journeyText: $('.adv-journey em'),
			title: $('.adv-title'), sound: $('.adv-sound'), home: $('.adv-home'),
			mini: $('.adv-mini'), miniTrack: $('.adv-mini-track'), miniDots: $('.adv-mini-dots'), miniView: $('.adv-mini-view'), miniHero: $('.adv-mini-hero'),
			banner: $('.adv-banner'), game: $('.adv-game'), decor: $('.ag-decor'), board: $('.ag-board'), stage: $('.ag-stage'), dots: $('.ag-dots'),
			cheer: $('.ag-cheer'), close: $('.ag-close'), sayBtn: $('.ag-say'), guide: $('.ag-guide'), guideBody: $('.ag-guide-body'), guideEmoji: $('.ag-guide-emoji'), bubble: $('.ag-bubble'),
			trailDone: $('#advTrailDone'), trailGlow: $('#advTrailGlow')
		});

		buildThings();
		bindMap();
		bindGame();
		window.addEventListener('resize', () => {
			if (root.classList.contains('active')) layout({keep: true});
		});
	}

	function buildThings() {
		// signposts
		ui.signs = SIGNS.map((pos, w) => {
			const sign = html('button', 'adv-sign', `<span class="adv-sign-board"><b></b></span><i class="adv-sign-post"></i>`);
			sign.style.cssText = `--x:${pos.x};--y:${pos.y}`;
			sign.addEventListener('click', () => {
				sfx.tap();
				say(WORLDS[w].ar);
				gsap.fromTo(sign.firstElementChild, {rotate: -8}, {rotate: 0, duration: 0.9, ease: 'elastic.out(1.2, 0.3)'});
			});
			ui.things.appendChild(sign);

			return sign;
		});

		// animals
		ANIMALS.forEach((animal, i) => {
			const btn = html('button', `adv-animal idle-${animal.idle}`, `<span class="adv-animal-jump"><span class="adv-animal-idle" style="animation-delay:${-i * 0.37}s">${art(animal.art)}</span></span>`);
			btn.style.cssText = `--x:${animal.x};--y:${animal.y};--s:${animal.s}`;
			btn.addEventListener('click', () => tapAnimal(animal, btn));
			ui.things.appendChild(btn);
		});

		// level stones
		ui.nodes = nodes.map((node, i) => {
			const btn = html('button', 'adv-node', `<span class="adv-node-ring"></span><span class="adv-node-face"><b>${i + 1}</b></span><span class="adv-node-stars"></span><span class="adv-node-lock">🔒</span><span class="adv-node-resume" dir="ltr"></span>`);
			btn.style.cssText = `--x:${f(node.x)};--y:${f(node.y)}`;
			if (LEVELS[i].final) btn.classList.add('final');
			btn.addEventListener('click', () => tapNode(i));
			ui.things.appendChild(btn);

			return btn;
		});

		ui.miniDots.innerHTML = nodes.map((n) => `<i style="left:${(n.x / W) * 100}%;top:${(n.y / H) * 100}%"></i>`).join('');
	}

	function applyTexts() {
		root.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
		ui.title.textContent = t('title');
		ui.journeyLabel.textContent = t('journey');
		ui.signs.forEach((sign, w) => {
			sign.querySelector('b').textContent = WORLDS[w][state.lang] || WORLDS[w].ar;
		});
		ui.sound.textContent = state.sound ? '🔊' : '🔇';
	}

	// ---------------- Map: size, scrolling, hero ----------------
	function layout({keep = false} = {}) {
		const sc = ui.scroller;
		const center = keep && sc.scrollWidth ? (sc.scrollLeft + sc.clientWidth / 2) / sc.scrollWidth : null;
		state.u = Math.max(sc.clientHeight, 420) / H;
		ui.map.style.setProperty('--u', state.u);
		placeHero(state.heroS);
		if (center !== null) sc.scrollLeft = center * sc.scrollWidth - sc.clientWidth / 2;
		updateMini();
	}

	function placeHero(s, follow = false) {
		state.heroS = s;
		const p = trail.at(s);
		gsap.set(ui.hero, {x: p.x * state.u, y: p.y * state.u});
		ui.miniHero.style.left = `${(p.x / W) * 100}%`;
		ui.miniHero.style.top = `${(p.y / H) * 100}%`;
		if (follow) {
			const sc = ui.scroller;
			const want = p.x * state.u - sc.clientWidth / 2;
			sc.scrollLeft += (want - sc.scrollLeft) * 0.12;
		}
	}

	function scrollToX(x, smooth = true) {
		const sc = ui.scroller;
		sc.scrollTo({left: x * state.u - sc.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto'});
	}

	function updateMini() {
		const sc = ui.scroller;
		if (!sc.scrollWidth) return;
		ui.miniView.style.left = `${(sc.scrollLeft / sc.scrollWidth) * 100}%`;
		ui.miniView.style.width = `${(sc.clientWidth / sc.scrollWidth) * 100}%`;
	}

	function walkTo(i) {
		const target = nodes[i].s;
		const from = state.heroS;
		if (state.walk) state.walk.kill();

		return new Promise((resolve) => {
			const dist = Math.abs(target - from);
			if (dist < 4) {
				gsap.fromTo(ui.heroPin, {y: 0}, {y: -28, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out', onComplete: resolve});

				return;
			}
			ui.hero.classList.add('walking');
			ui.hero.classList.toggle('left', target < from);
			const walker = {s: from};
			let lastStep = from;
			state.walk = gsap.to(walker, {
				s: target,
				duration: clamp(dist / 620, 0.7, 3.4),
				ease: 'power1.inOut',
				onUpdate: () => {
					placeHero(walker.s, true);
					if (Math.abs(walker.s - lastStep) > 64) {
						lastStep = walker.s;
						sfx.step();
					}
				},
				onComplete: () => {
					ui.hero.classList.remove('walking');
					state.walk = null;
					resolve();
				}
			});
		});
	}

	function bindMap() {
		const sc = ui.scroller;
		let ticking = false;
		sc.addEventListener('scroll', () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				ticking = false;
				updateMini();
			});
		}, {passive: true});

		// mouse wheel scrolls sideways; a mouse can drag the map like a finger
		sc.addEventListener('wheel', (e) => {
			if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
			e.preventDefault();
			sc.scrollLeft += e.deltaY;
		}, {passive: false});
		let drag = null;
		sc.addEventListener('pointerdown', (e) => {
			if (e.pointerType !== 'mouse' || e.button !== 0) return;
			drag = {x: e.clientX, y: e.clientY, left: sc.scrollLeft, top: sc.scrollTop, moved: false};
		});
		window.addEventListener('pointermove', (e) => {
			if (!drag) return;
			const dx = e.clientX - drag.x;
			if (!drag.moved && Math.abs(dx) < 8) return;
			drag.moved = true;
			sc.classList.add('dragging');
			sc.scrollLeft = drag.left - dx;
			sc.scrollTop = drag.top - (e.clientY - drag.y);
		});
		window.addEventListener('pointerup', () => {
			if (drag && drag.moved) sc.addEventListener('click', (ev) => ev.stopPropagation(), {capture: true, once: true});
			drag = null;
			sc.classList.remove('dragging');
		});

		// the little map: tap or drag to fly there
		let miniDrag = false;
		const miniGo = (e, smooth) => {
			const box = ui.miniTrack.getBoundingClientRect();
			scrollToX(clamp((e.clientX - box.left) / box.width, 0, 1) * W, smooth);
		};
		ui.miniTrack.addEventListener('pointerdown', (e) => {
			miniDrag = true;
			ui.miniTrack.setPointerCapture(e.pointerId);
			miniGo(e, true);
		});
		ui.miniTrack.addEventListener('pointermove', (e) => miniDrag && miniGo(e, false));
		ui.miniTrack.addEventListener('pointerup', () => (miniDrag = false));
		ui.miniTrack.addEventListener('pointercancel', () => (miniDrag = false));
		root.querySelectorAll('.adv-mini-arrow').forEach((btn) =>
			btn.addEventListener('click', () => {
				const middle = (sc.scrollLeft + sc.clientWidth / 2) / state.u;
				const world = clamp(Math.floor(middle / 1000) + Number(btn.dataset.dir), 0, WORLDS.length - 1);
				sfx.whoosh();
				scrollToX(world * 1000 + 500);
			})
		);
		root.querySelector('.adv-mini-center').addEventListener('click', () => {
			sfx.tap();
			scrollToX(trail.at(state.heroS).x);
			gsap.fromTo(ui.heroPin, {y: 0}, {y: -34, duration: 0.2, yoyo: true, repeat: 3, ease: 'power2.out'});
		});

		ui.home.addEventListener('click', close);
		ui.sound.addEventListener('click', () => {
			state.sound = !state.sound;
			try {
				localStorage.setItem('paint-sound', state.sound ? 'on' : 'off');
			} catch (err) {
				/* keep it for now */
			}
			if (!state.sound && 'speechSynthesis' in window) window.speechSynthesis.cancel();
			applyTexts();
			sfx.tap();
		});
	}

	function renderNodes() {
		const current = currentLevel();
		ui.nodes.forEach((btn, i) => {
			const stars = state.progress.stars[i];
			btn.classList.toggle('done', stars > 0);
			btn.classList.toggle('current', i === current && !(stars > 0 && i === LEVELS.length - 1));
			btn.classList.toggle('locked', !isOpen(i));
			btn.querySelector('.adv-node-stars').innerHTML = stars ? [0, 1, 2].map((k) => `<i class="${k < stars ? 'on' : ''}">★</i>`).join('') : '';
			const resume = state.progress.resume && state.progress.resume.i === i ? state.progress.resume : null;
			btn.classList.toggle('resume', Boolean(resume));
			btn.querySelector('.adv-node-resume').textContent = resume ? `▶ ${resume.index}/${resume.rounds.length}` : '';
		});
		ui.miniDots.querySelectorAll('i').forEach((dot, i) => {
			dot.className = state.progress.stars[i] ? 'done' : i === current ? 'current' : '';
		});
	}

	function setTrailDone(level, animate) {
		const len = level >= LEVELS.length - 1 && state.progress.stars[level] ? trail.total : nodes[level].s;
		const apply = (v) => [ui.trailDone, ui.trailGlow].forEach((p) => p.setAttribute('stroke-dasharray', `${f(v)} ${W * 3}`));
		if (!animate) {
			state.trailLen = len;
			apply(len);

			return;
		}
		const obj = {v: state.trailLen || 0};
		gsap.to(obj, {v: len, duration: 1.4, ease: 'power2.inOut', onUpdate: () => apply(obj.v)});
		state.trailLen = len;
	}

	function updateHud({bump = false} = {}) {
		ui.stars.textContent = totalStars();
		ui.journeyBar.style.width = `${(finishedCount() / LEVELS.length) * 100}%`;
		ui.journeyText.textContent = `${finishedCount()}/${LEVELS.length}`;
		if (bump) gsap.fromTo(ui.starsBox, {scale: 1.5}, {scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.35)'});
	}

	function tip(text, x, y) {
		const old = ui.things.querySelector('.adv-tip');
		if (old) old.remove();
		const bubble = html('div', 'adv-tip', text);
		bubble.style.cssText = `--x:${x};--y:${y}`;
		ui.things.appendChild(bubble);
		gsap.fromTo(bubble, {scale: 0.3, opacity: 0}, {scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)'});
		gsap.to(bubble, {opacity: 0, y: -20, delay: 1.8, duration: 0.4, onComplete: () => bubble.remove()});
	}

	function tapNode(i) {
		if (state.busy) return;
		const btn = ui.nodes[i];
		if (!isOpen(i)) {
			sfx.lock();
			gsap.fromTo(btn, {x: -8}, {x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.25)'});
			tip(`🔒 ${t('locked')}`, f(nodes[i].x), f(nodes[i].y - 70));

			return;
		}
		sfx.tap();
		state.busy = true;
		gsap.fromTo(btn.querySelector('.adv-node-face'), {scale: 0.8}, {scale: 1, duration: 0.5, ease: 'back.out(3)'});
		walkTo(i).then(() => {
			state.busy = false;
			openLevel(i);
		});
	}

	// a drawn character smiles with ^ ^ eyes for a moment
	function beHappy(holder, ms = 1600) {
		const svg = holder && holder.querySelector('.la');
		if (!svg) return;
		svg.classList.add('happy');
		clearTimeout(svg.happyTimer);
		svg.happyTimer = setTimeout(() => svg.classList.remove('happy'), ms);
	}

	function tapAnimal(animal, btn) {
		sfx.tap();
		say(animal.word);
		beHappy(btn);
		const body = btn.firstElementChild;
		gsap.timeline()
			.to(body, {y: -animal.s * 0.7 * state.u, scaleY: 1.12, scaleX: 0.92, duration: 0.22, ease: 'power2.out'})
			.to(body, {y: 0, scaleY: 1, scaleX: 1, duration: 0.6, ease: 'bounce.out'});
		const old = btn.querySelector('.adv-say');
		if (old) old.remove();
		const bubble = html('span', 'adv-say', `<b>${animal.word[0]}</b><span>${wordHtml(animal.word)}</span>`);
		btn.appendChild(bubble);
		gsap.fromTo(bubble, {scale: 0, opacity: 0}, {scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)'});
		gsap.to(bubble, {opacity: 0, scale: 0.8, delay: 2, duration: 0.3, onComplete: () => bubble.remove()});
		burst({el: btn, count: 14, spread: 80, scalar: 0.7, velocity: 18, shapes: ['star']});
	}

	function showBanner(world) {
		ui.banner.querySelector('.adv-banner-guide').innerHTML = art(world.guide);
		ui.banner.querySelector('small').textContent = t('newWorld');
		ui.banner.querySelector('b').textContent = world[state.lang] || world.ar;
		sfx.chime();
		say(world.ar);
		gsap.timeline()
			.fromTo(ui.banner, {yPercent: -160, opacity: 0}, {yPercent: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.6)'})
			.to(ui.banner, {yPercent: -160, opacity: 0, duration: 0.5, ease: 'power2.in'}, '+=2.4');
	}

	function unlockNode(i) {
		const btn = ui.nodes[i];
		const lock = html('span', 'adv-node-lock adv-lock-fall', '🔒');
		btn.appendChild(lock);
		sfx.unlock();
		gsap.timeline()
			.to(lock, {rotate: 25, duration: 0.15, yoyo: true, repeat: 3})
			.to(lock, {y: 80, rotate: 120, opacity: 0, duration: 0.6, ease: 'power2.in', onComplete: () => lock.remove()})
			.fromTo(btn.querySelector('.adv-node-face'), {scale: 0.4}, {scale: 1, duration: 0.9, ease: 'elastic.out(1.2, 0.35)'}, '-=0.4');
		setTimeout(() => burst({el: btn, count: 40, spread: 100, scalar: 0.8, shapes: ['star', 'circle']}), 450);
	}

	// ---------------- Opening & closing the adventure ----------------
	function open({lang = 'ar', onClose = null} = {}) {
		if (!gsap) return;
		if (!root) build();
		state.lang = lang;
		state.onClose = onClose;
		try {
			state.sound = localStorage.getItem('paint-sound') !== 'off';
		} catch (err) {
			state.sound = true;
		}
		state.progress = loadProgress();
		root.classList.add('active');
		applyTexts();
		renderNodes();
		updateHud();
		const current = currentLevel();
		state.heroS = nodes[current].s;
		layout();
		setTrailDone(current, false);
		scrollToX(nodes[current].x, false);
		updateMini();

		const visible = ui.nodes.filter((btn) => {
			const box = btn.getBoundingClientRect();

			return box.right > 0 && box.left < window.innerWidth;
		});
		gsap.fromTo(visible, {scale: 0, opacity: 0}, {scale: 1, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(2.5)', clearProps: 'transform,opacity'});
		gsap.fromTo(ui.heroPin, {y: -240 * state.u, opacity: 0}, {y: 0, opacity: 1, duration: 0.9, delay: 0.25, ease: 'bounce.out'});
		gsap.fromTo(root.querySelector('.adv-hud'), {y: -90}, {y: 0, duration: 0.6, ease: 'back.out(1.5)'});
		gsap.fromTo(ui.mini, {y: 120}, {y: 0, duration: 0.6, delay: 0.1, ease: 'back.out(1.5)'});
		say(TEXT.ar.welcome);
	}

	function close() {
		sfx.tap();
		if ('speechSynthesis' in window) window.speechSynthesis.cancel();
		if (state.walk) state.walk.kill();
		state.walk = null;
		state.busy = false;
		if (state.game) endGame({instant: true});
		root.classList.remove('active');
		if (state.onClose) state.onClose({sound: state.sound});
	}

	// ---------------- A level: intro, 6 games, stars ----------------
	function makeRounds(level) {
		const letters = level.letters.map((i) => LETTERS[i]);
		if (!level.review) {
			const [a, b] = letters;

			return [{type: 'pick', l: a}, {type: 'find', l: b}, {type: 'trace', l: a}, {type: 'pop', l: b}, {type: 'drag', l: a, m: b}, {type: 'trace', l: b}];
		}
		const types = level.final ? ['find', 'pick', 'pop', 'drag', 'trace', 'pick'] : ['pick', 'find', ...shuffle(['trace', 'pop', 'drag']), 'pick'];

		return types.map((type) => {
			const [l, m] = shuffle(letters);

			return {type, l, m};
		});
	}

	function openLevel(i, {fresh = false} = {}) {
		const level = LEVELS[i];
		const world = WORLDS[level.world];
		const saved = state.progress.resume;
		const resume = !fresh && saved && saved.i === i ? saved : null;
		if (fresh && saved && saved.i === i) {
			state.progress.resume = null;
			saveProgress();
		}
		const rounds = resume ? resume.rounds.map(({type, l, m}) => ({type, l: LETTERS[l], m: m === null ? undefined : LETTERS[m]})) : makeRounds(level);
		state.game = {i, level, world, rounds, index: resume ? resume.index - 1 : -1, mistakes: resume ? resume.mistakes : 0, roundMistakes: 0, won: false, cleanup: null, prompt: ''};
		ui.game.className = `adv-game w-${world.id}`;
		ui.guideEmoji.innerHTML = art(world.guide);
		ui.decor.innerHTML = Array.from({length: 14}, (_, k) =>
			`<span style="left:${(k * 37) % 100}%;top:${(k * 53) % 100}%;--d:${8 + (k % 5) * 2}s;--delay:${-k * 1.3}s;font-size:${1.4 + (k % 3) * 0.8}rem">${world.decor[k % world.decor.length]}</span>`
		).join('');
		ui.dots.innerHTML = state.game.rounds.map(() => '<i></i>').join('');
		ui.cheer.classList.remove('show');
		ui.bubble.classList.remove('show');
		ui.game.hidden = false;
		sfx.whoosh();
		gsap.fromTo(ui.game, {opacity: 0}, {opacity: 1, duration: 0.3, onComplete: () => (ui.scroller.style.visibility = 'hidden')});
		gsap.fromTo(ui.board, {scale: 0.6, y: 60, opacity: 0}, {scale: 1, y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.5)'});
		gsap.fromTo(ui.guide, {x: state.lang === 'ar' ? 200 : -200, opacity: 0}, {x: 0, opacity: 1, duration: 0.7, delay: 0.2, ease: 'back.out(1.4)'});
		// left in the middle last time: carry on from the same game
		if (resume) nextRound();
		else showIntro();
	}

	function endGame({instant = false, then = null} = {}) {
		cleanupRound();
		clearTimeout(state.game && state.game.timer);
		state.game = null;
		ui.scroller.style.visibility = '';
		if ('speechSynthesis' in window) window.speechSynthesis.cancel();
		if (instant) {
			ui.game.hidden = true;
			if (then) then();

			return;
		}
		gsap.to(ui.board, {scale: 0.7, y: 40, opacity: 0, duration: 0.3, ease: 'power2.in'});
		gsap.to(ui.game, {opacity: 0, duration: 0.35, delay: 0.1, onComplete: () => {
			ui.game.hidden = true;
			if (then) then();
		}});
	}

	function bindGame() {
		ui.close.addEventListener('click', () => {
			sfx.tap();
			endGame({then: renderNodes});
		});
		ui.sayBtn.addEventListener('click', () => {
			if (state.game && state.game.prompt) say(state.game.prompt);
			gsap.fromTo(ui.sayBtn, {scale: 1.3}, {scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)'});
		});
		ui.cheer.addEventListener('click', () => {
			if (!state.game || !state.game.won) return;
			clearTimeout(state.game.timer);
			nextRound();
		});
		ui.guide.addEventListener('click', () => {
			sfx.tap();
			guideJump();
			if (state.game && state.game.prompt) say(state.game.prompt);
		});
	}

	function cleanupRound() {
		const g = state.game;
		if (g && g.cleanup) {
			g.cleanup();
			g.cleanup = null;
		}
	}

	function updateDots() {
		const g = state.game;
		[...ui.dots.children].forEach((dot, k) => {
			dot.className = k < g.index ? 'done' : k === g.index ? 'now' : '';
		});
	}

	// swap the board content: the old one slides away, the new one pops in
	function mount(round) {
		const old = ui.stage.firstElementChild;
		const back = state.lang === 'ar' ? 1 : -1;
		if (old) {
			gsap.to(old, {x: 80 * back, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: () => old.remove()});
		}
		round.style.opacity = '0';
		ui.stage.appendChild(round);
		gsap.fromTo(round, {x: -80 * back, opacity: 0}, {x: 0, opacity: 1, duration: 0.35, delay: old ? 0.18 : 0, ease: 'power2.out'});
		gsap.from(round.querySelectorAll('.pop-in'), {scale: 0.4, opacity: 0, duration: 0.5, stagger: 0.07, delay: old ? 0.25 : 0.1, ease: 'back.out(2)', clearProps: 'transform,opacity'});
	}

	function roundFrame({letter, prompt, speak}) {
		const round = html('div', 'ag-round');
		round.innerHTML = `<div class="ag-head pop-in">${letter ? `<span class="ag-badge">${letter}</span>` : ''}<h2 class="ag-q">${prompt}</h2></div><div class="ag-body"></div>`;
		state.game.prompt = speak;
		mount(round);
		setTimeout(() => {
			if (state.game && state.game.prompt === speak) say(speak);
		}, 420);

		return {round, body: round.querySelector('.ag-body')};
	}

	function guideJump() {
		gsap.timeline()
			.to(ui.guideBody, {y: -50, rotate: -10, scaleY: 1.1, duration: 0.22, ease: 'power2.out'})
			.to(ui.guideBody, {y: 0, rotate: 0, scaleY: 1, duration: 0.55, ease: 'bounce.out'});
	}

	function guideSays(text, mood) {
		ui.bubble.textContent = text;
		ui.bubble.classList.add('show');
		gsap.fromTo(ui.bubble, {scale: 0.4}, {scale: 1, duration: 0.45, ease: 'back.out(2.5)'});
		clearTimeout(state.bubbleTimer);
		state.bubbleTimer = setTimeout(() => ui.bubble.classList.remove('show'), 1800);
		if (mood === 'happy') {
			guideJump();
			beHappy(ui.guideEmoji, 1800);
		}
		else gsap.fromTo(ui.guideBody, {rotate: -14}, {rotate: 0, duration: 0.8, ease: 'elastic.out(1.2, 0.3)'});
	}

	function roundWin({el}) {
		const g = state.game;
		if (!g || g.won) return;
		g.won = true;
		sfx.right();
		if (el) burst({el, count: 60, spread: 90, shapes: ['star', 'circle']});
		const praise = pickOne(t('praise'));
		guideSays(praise, 'happy');
		ui.cheer.textContent = `${praise} 🎉`;
		ui.cheer.classList.add('show');
		gsap.fromTo(ui.cheer, {scale: 0.3, y: 30}, {scale: 1, y: 0, duration: 0.55, ease: 'back.out(2.2)'});
		setTimeout(() => state.game === g && say(pickOne(TEXT.ar.praise)), 700);
		g.timer = setTimeout(() => state.game === g && nextRound(), 2000);
	}

	function roundMiss(el) {
		const g = state.game;
		sfx.wrong();
		g.roundMistakes++;
		if (g.roundMistakes <= 2) g.mistakes++;
		if (el) gsap.fromTo(el, {x: -14}, {x: 0, duration: 0.6, ease: 'elastic.out(1.4, 0.2)'});
		guideSays(`${t('tryAgain')} 💪`, 'sad');
	}

	function nextRound() {
		const g = state.game;
		if (!g) return;
		cleanupRound();
		g.index++;
		g.won = false;
		g.roundMistakes = 0;
		ui.cheer.classList.remove('show');
		updateDots();
		if (g.index >= g.rounds.length) {
			finishLevel();

			return;
		}
		if (g.index > 0) saveResume(g);
		const r = g.rounds[g.index];
		({pick: pickRound, find: findRound, trace: traceRound, pop: popRound, drag: dragRound})[r.type](r);
	}

	// ---- Intro: meet the letters ----
	function showIntro() {
		const g = state.game;
		const letters = g.level.letters.map((i) => LETTERS[i]);
		const round = html('div', 'ag-round ag-intro');
		g.prompt = '';
		if (!g.level.review) {
			round.innerHTML = `<h2 class="ag-q pop-in">${t('meet')}</h2>
				<div class="ag-meet">${letters.map((l) => `
					<div class="ag-meet-card pop-in">
						<button class="ag-big-letter" type="button" data-ch="${l.ch}"><i class="ag-rays"></i><b>${l.ch}</b></button>
						<div class="ag-meet-name">${t('letterOf', l)}</div>
						<div class="ag-meet-words">${l.words.map((w) => `<button class="ag-chip" type="button" data-word="${w.word}"><span class="ag-chip-emoji">${w.emoji}</span><span>${wordHtml(w.word)}</span></button>`).join('')}</div>
					</div>`).join('')}
				</div>
				<button class="ag-go pop-in" type="button">${t('play')} <span>▶</span></button>`;
			g.prompt = `هيا نتعلم ${letters.map((l) => `حرف ${l.the}`).join(' و')}`;
		} else {
			round.innerHTML = `<h2 class="ag-q pop-in">${g.level.final ? `🏆 ${t('finalIntro')}` : t('review')}</h2>
				<div class="ag-review">${letters.map((l) => `<button class="ag-mini-letter pop-in" type="button" data-ch="${l.ch}">${l.ch}</button>`).join('')}</div>
				<button class="ag-go pop-in" type="button">${t('play')} <span>▶</span></button>`;
			g.prompt = g.level.final ? TEXT.ar.finalIntro : TEXT.ar.review;
		}
		round.querySelectorAll('[data-ch]').forEach((btn) =>
			btn.addEventListener('click', () => {
				sfx.tap();
				say(`${letterOf(btn.dataset.ch).name}`);
				gsap.fromTo(btn, {scale: 0.8, rotate: -6}, {scale: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1.3, 0.3)'});
			})
		);
		round.querySelectorAll('[data-word]').forEach((btn) =>
			btn.addEventListener('click', () => {
				sfx.tap();
				say(btn.dataset.word);
				gsap.fromTo(btn, {scale: 0.85}, {scale: 1, duration: 0.6, ease: 'elastic.out(1.3, 0.35)'});
			})
		);
		round.querySelector('.ag-go').addEventListener('click', () => {
			sfx.tap();
			nextRound();
		});
		ui.dots.querySelectorAll('i').forEach((dot) => (dot.className = ''));
		mount(round);
		const speak = g.prompt;
		setTimeout(() => state.game === g && g.index < 0 && say(speak), 500);
	}

	// ---- Game 1: which word starts with the letter? ----
	function pickRound({l}) {
		const right = pickOne(l.words);
		const others = shuffle(LETTERS.filter((x) => x !== l)).slice(0, 2).map((x) => pickOne(x.words));
		const {body} = roundFrame({letter: l.ch, prompt: t('pick', l), speak: sayAr('pick', l)});
		const row = html('div', 'ag-choices');
		shuffle([right, ...others]).forEach((w) => {
			const card = html('button', 'ag-card pop-in', `<span class="ag-emoji">${w.emoji}</span><span class="ag-word">${wordHtml(w.word)}</span><i class="ag-check">✓</i>`);
			card.addEventListener('click', () => {
				if (state.game.won || card.classList.contains('wrong')) return;
				say(w.word);
				if (w === right) {
					card.classList.add('right');
					row.classList.add('solved');
					gsap.fromTo(card, {scale: 1.15}, {scale: 1, duration: 0.7, ease: 'elastic.out(1.2, 0.35)'});
					roundWin({el: card});
				} else {
					card.classList.add('wrong');
					roundMiss(card);
				}
			});
			row.appendChild(card);
		});
		body.appendChild(row);
	}

	// ---- Game 2: where is the letter? ----
	function findRound({l}) {
		const count = state.game.level.n > 6 ? 4 : 3;
		const look = shuffle(similarTo(l.ch));
		const rest = shuffle(LETTERS.map((x) => x.ch).filter((ch) => ch !== l.ch && !look.includes(ch)));
		const choices = shuffle([l.ch, ...[...look, ...rest].slice(0, count - 1)]);
		const {body} = roundFrame({letter: '', prompt: t('find', l), speak: sayAr('find', l)});
		const row = html('div', 'ag-choices ag-letters');
		choices.forEach((ch) => {
			const tile = html('button', 'ag-tile pop-in', `<b>${ch}</b><i class="ag-check">✓</i>`);
			tile.addEventListener('click', () => {
				if (state.game.won || tile.classList.contains('wrong')) return;
				say(letterOf(ch).name);
				if (ch === l.ch) {
					tile.classList.add('right');
					row.classList.add('solved');
					gsap.fromTo(tile, {rotateY: 0}, {rotateY: 360, duration: 0.8, ease: 'back.out(1.4)'});
					roundWin({el: tile});
				} else {
					tile.classList.add('wrong');
					roundMiss(tile);
				}
			});
			row.appendChild(tile);
		});
		body.appendChild(row);
	}

	// ---- Game 3: trace the letter with a finger ----
	function traceRound({l}) {
		const {body} = roundFrame({letter: '', prompt: t('trace', l), speak: sayAr('trace', l)});
		body.innerHTML = `
			<div class="ag-trace pop-in">
				<div class="ag-pad"><canvas class="ag-cv-guide"></canvas><canvas class="ag-cv-paint"></canvas><canvas class="ag-cv-gold"></canvas><span class="ag-hand">👆</span></div>
				<div class="ag-trace-side">
					<div class="ag-meter"><i></i><span>⭐</span></div>
					<button class="ag-wipe" type="button" aria-label="Clean">🧽</button>
				</div>
			</div>`;
		const pad = body.querySelector('.ag-pad');
		const [guideCv, paintCv, goldCv] = pad.querySelectorAll('canvas');
		const hand = pad.querySelector('.ag-hand');
		const meter = body.querySelector('.ag-meter i');
		const GRID = 96;
		const GOAL = 0.6;
		const mask = document.createElement('canvas');
		const cover = document.createElement('canvas');
		mask.width = mask.height = cover.width = cover.height = GRID;
		const maskCtx = mask.getContext('2d', {willReadFrequently: true});
		const coverCtx = cover.getContext('2d', {willReadFrequently: true});
		let size = 0;
		let dpr = 1;
		let glyph = null;
		let maskBits = null;
		let maskCount = 1;
		let pointer = null;
		let hue = Math.random() * 360;
		let moves = 0;
		let lastSpark = 0;
		let done = false;
		let handTween = null;

		const ctxOf = (cv) => {
			const ctx = cv.getContext('2d');
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.direction = 'ltr';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			return ctx;
		};

		function fitGlyph() {
			maskCtx.direction = 'ltr';
			maskCtx.textAlign = 'left';
			maskCtx.textBaseline = 'alphabetic';
			maskCtx.font = `800 100px ${FONT}`;
			const m = maskCtx.measureText(l.ch);
			const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || 60;
			const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 80;
			const k = Math.min((size * 0.62) / w, (size * 0.72) / h);

			return {
				px: 100 * k,
				x: size / 2 + ((m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2) * k,
				y: size / 2 + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2) * k
			};
		}

		function setup() {
			size = pad.clientWidth;
			if (!size) return;
			dpr = Math.min(2, window.devicePixelRatio || 1);
			[guideCv, paintCv, goldCv].forEach((cv) => {
				cv.width = cv.height = Math.round(size * dpr);
			});
			glyph = fitGlyph();
			const g = ctxOf(guideCv);
			g.font = `800 ${glyph.px}px ${FONT}`;
			g.fillStyle = 'rgba(176, 122, 64, 0.16)';
			g.fillText(l.ch, glyph.x, glyph.y);
			g.setLineDash([size * 0.022, size * 0.02]);
			g.lineWidth = Math.max(2.5, size * 0.009);
			g.strokeStyle = 'rgba(150, 100, 50, 0.6)';
			g.strokeText(l.ch, glyph.x, glyph.y);

			const k = GRID / size;
			maskCtx.setTransform(k, 0, 0, k, 0, 0);
			maskCtx.clearRect(0, 0, size, size);
			maskCtx.font = `800 ${glyph.px}px ${FONT}`;
			maskCtx.fillStyle = '#000';
			maskCtx.fillText(l.ch, glyph.x, glyph.y);
			const data = maskCtx.getImageData(0, 0, GRID, GRID).data;
			maskBits = new Uint8Array(GRID * GRID);
			maskCount = 0;
			for (let i = 0; i < maskBits.length; i++) {
				if (data[i * 4 + 3] > 110) {
					maskBits[i] = 1;
					maskCount++;
				}
			}
			maskCount = Math.max(1, maskCount);
			coverCtx.setTransform(k, 0, 0, k, 0, 0);
			coverCtx.lineCap = 'round';
			coverCtx.lineJoin = 'round';
			wipe(false);
			if (!handTween) {
				hand.style.left = `${(glyph.x / size) * 100}%`;
				hand.style.top = `${(glyph.y / size) * 100}%`;
				handTween = gsap.to(hand, {x: size * 0.12, y: -size * 0.1, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut'});
			}
		}

		function wipe(withSound = true) {
			ctxOf(paintCv).clearRect(0, 0, size, size);
			coverCtx.clearRect(0, 0, size, size);
			setMeter(0);
			if (withSound) sfx.whoosh();
		}

		function setMeter(percent) {
			meter.style.height = `${percent}%`;
			meter.style.setProperty('--fill', `${percent}%`);
		}

		function coverage() {
			const data = coverCtx.getImageData(0, 0, GRID, GRID).data;
			let hit = 0;
			for (let i = 0; i < maskBits.length; i++) if (maskBits[i] && data[i * 4 + 3] > 0) hit++;

			return hit / maskCount;
		}

		function stroke(from, to) {
			const ctx = ctxOf(paintCv);
			const bw = glyph.px * 0.13;
			hue = (hue + 4) % 360;
			ctx.strokeStyle = `hsla(${hue}, 95%, 60%, 0.28)`;
			ctx.lineWidth = bw * 1.7;
			ctx.beginPath();
			ctx.moveTo(from.x, from.y);
			ctx.lineTo(to.x, to.y);
			ctx.stroke();
			ctx.strokeStyle = `hsl(${hue}, 92%, 55%)`;
			ctx.lineWidth = bw;
			ctx.stroke();
			ctx.strokeStyle = 'rgba(255,255,255,0.55)';
			ctx.lineWidth = bw * 0.28;
			ctx.stroke();
			coverCtx.strokeStyle = '#000';
			coverCtx.lineWidth = glyph.px * 0.2;
			coverCtx.beginPath();
			coverCtx.moveTo(from.x, from.y);
			coverCtx.lineTo(to.x, to.y);
			coverCtx.stroke();
		}

		function spark(p) {
			const now = performance.now();
			if (now - lastSpark < 70) return;
			lastSpark = now;
			const star = html('i', 'ag-spark', pickOne(['✦', '★', '✧', '•']));
			star.style.left = `${p.x}px`;
			star.style.top = `${p.y}px`;
			star.style.color = `hsl(${hue}, 95%, 60%)`;
			pad.appendChild(star);
			gsap.fromTo(star, {scale: 0.4, opacity: 1}, {x: rand(-30, 30), y: rand(-50, -15), scale: 1.2, opacity: 0, rotate: rand(-90, 90), duration: 0.7, ease: 'power2.out', onComplete: () => star.remove()});
		}

		function check(final) {
			const value = coverage();
			setMeter(Math.min(100, (value / GOAL) * 100));
			if (value >= GOAL && !done) {
				done = true;
				win();
			} else if (final && value < GOAL * 0.5 && value > 0.05) {
				guideSays(`${t('tryAgain')} ✏️`, 'sad');
			}
		}

		function win() {
			const ctx = ctxOf(goldCv);
			const grad = ctx.createLinearGradient(0, glyph.y - glyph.px * 0.6, 0, glyph.y + glyph.px * 0.3);
			grad.addColorStop(0, '#fff3a0');
			grad.addColorStop(0.5, '#ffc21a');
			grad.addColorStop(1, '#ff8a00');
			ctx.font = `800 ${glyph.px}px ${FONT}`;
			ctx.lineWidth = size * 0.02;
			ctx.strokeStyle = '#fff';
			ctx.strokeText(l.ch, glyph.x, glyph.y);
			ctx.fillStyle = grad;
			ctx.fillText(l.ch, glyph.x, glyph.y);
			gsap.to(paintCv, {opacity: 0.25, duration: 0.5});
			gsap.fromTo(goldCv, {opacity: 0, scale: 0.85}, {opacity: 1, scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.45)'});
			setTimeout(() => say(l.name), 150);
			roundWin({el: pad});
		}

		const point = (e) => {
			const box = paintCv.getBoundingClientRect();

			return {x: ((e.clientX - box.left) / box.width) * size, y: ((e.clientY - box.top) / box.height) * size};
		};
		paintCv.addEventListener('pointerdown', (e) => {
			if (done || !glyph) return;
			e.preventDefault();
			paintCv.setPointerCapture(e.pointerId);
			pointer = point(e);
			stroke(pointer, pointer);
			if (handTween) {
				handTween.kill();
				gsap.to(hand, {opacity: 0, scale: 0.5, duration: 0.25});
			}
		});
		paintCv.addEventListener('pointermove', (e) => {
			if (!pointer || done) return;
			const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
			(events.length ? events : [e]).forEach((ev) => {
				const p = point(ev);
				stroke(pointer, p);
				pointer = p;
			});
			spark(pointer);
			if (++moves % 6 === 0) check(false);
		});
		const lift = () => {
			if (!pointer) return;
			pointer = null;
			if (!done) check(true);
		};
		paintCv.addEventListener('pointerup', lift);
		paintCv.addEventListener('pointercancel', lift);
		body.querySelector('.ag-wipe').addEventListener('click', () => !done && wipe());

		const onResize = () => !done && setup();
		window.addEventListener('resize', onResize);
		state.game.cleanup = () => {
			window.removeEventListener('resize', onResize);
			if (handTween) handTween.kill();
		};
		const ready = document.fonts && document.fonts.load ? document.fonts.load(`800 100px ${FONT}`, l.ch).catch(() => {}) : Promise.resolve();
		ready.then(() => requestAnimationFrame(() => requestAnimationFrame(setup)));
	}

	// ---- Game 4: pop the bubbles with the letter ----
	function popRound({l}) {
		const NEED = 4;
		const {body} = roundFrame({letter: '', prompt: t('pop', l), speak: sayAr('pop', l)});
		body.innerHTML = `<div class="ag-pop pop-in"><div class="ag-pop-goal"><b>${l.ch}</b>${'<i></i>'.repeat(NEED)}</div></div>`;
		const area = body.querySelector('.ag-pop');
		const slots = area.querySelectorAll('.ag-pop-goal i');
		const others = [...similarTo(l.ch), ...shuffle(LETTERS.map((x) => x.ch).filter((ch) => ch !== l.ch)).slice(0, 3)];
		const bubbles = [];
		let got = 0;
		let sinceTarget = 0;
		let last = performance.now();
		let raf = 0;
		let spawner = 0;
		let finished = false;

		function spawn() {
			if (finished || bubbles.length >= 7 || !area.clientHeight) return;
			const w = area.clientWidth;
			const h = area.clientHeight;
			const size = clamp(Math.min(w, h) * 0.22, 64, 118);
			const isTarget = sinceTarget >= 2 || Math.random() < 0.4;
			sinceTarget = isTarget ? 0 : sinceTarget + 1;
			const ch = isTarget ? l.ch : pickOne(others);
			const el = html('button', 'ag-ball', `<span class="ag-ball-skin"><b>${ch}</b></span>`);
			el.style.width = el.style.height = `${size}px`;
			el.style.setProperty('--size', `${size}px`);
			el.style.setProperty('--h', Math.floor(Math.random() * 360));
			const ball = {el, ch, size, x: rand(size / 2 + 6, w - size / 2 - 6), y: h + size / 2, vy: h / rand(4.6, 6.2), phase: Math.random() * 6.3, amp: rand(8, 22)};
			el.addEventListener('pointerdown', (e) => {
				e.preventDefault();
				hit(ball);
			});
			area.appendChild(el);
			bubbles.push(ball);
		}

		function drop(ball) {
			const i = bubbles.indexOf(ball);
			if (i >= 0) bubbles.splice(i, 1);
		}

		function popFx(ball, big = true) {
			drop(ball);
			const skin = ball.el.firstElementChild;
			gsap.to(skin, {scale: 1.5, opacity: 0, duration: 0.2, ease: 'power2.out', onComplete: () => ball.el.remove()});
			if (!big) return;
			const cx = ball.x;
			const cy = ball.y;
			for (let k = 0; k < 10; k++) {
				const dot = html('i', 'ag-drop');
				dot.style.left = `${cx}px`;
				dot.style.top = `${cy}px`;
				dot.style.background = `hsl(${(k * 36) % 360}, 90%, 65%)`;
				area.appendChild(dot);
				const a = (k / 10) * Math.PI * 2;
				gsap.fromTo(dot, {x: 0, y: 0, scale: 1}, {x: Math.cos(a) * ball.size * 0.9, y: Math.sin(a) * ball.size * 0.9, scale: 0, duration: 0.55, ease: 'power2.out', onComplete: () => dot.remove()});
			}
		}

		function hit(ball) {
			if (finished || !bubbles.includes(ball)) return;
			if (ball.ch === l.ch) {
				sfx.pop();
				popFx(ball);
				const slot = slots[got];
				slot.classList.add('on');
				gsap.fromTo(slot, {scale: 2}, {scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)'});
				got++;
				if (got >= NEED) {
					finished = true;
					clearInterval(spawner);
					[...bubbles].forEach((other, k) => setTimeout(() => {
						sfx.pop();
						popFx(other);
					}, 120 + k * 90));
					roundWin({el: area});
				} else {
					say(l.name);
				}
			} else {
				say(letterOf(ball.ch).name);
				roundMiss(null);
				gsap.fromTo(ball.el.firstElementChild, {rotate: -18, scale: 0.85}, {rotate: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1.3, 0.3)'});
			}
		}

		function tick(now) {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			for (let i = bubbles.length - 1; i >= 0; i--) {
				const ball = bubbles[i];
				ball.y -= ball.vy * dt;
				ball.phase += dt * 1.7;
				const x = ball.x + Math.sin(ball.phase) * ball.amp;
				ball.el.style.transform = `translate3d(${x - ball.size / 2}px, ${ball.y - ball.size / 2}px, 0)`;
				if (ball.y < -ball.size) {
					ball.el.remove();
					bubbles.splice(i, 1);
				}
			}
			raf = requestAnimationFrame(tick);
		}

		raf = requestAnimationFrame(tick);
		[300, 750, 1200].forEach((ms) => setTimeout(spawn, ms));
		spawner = setInterval(spawn, 880);
		state.game.cleanup = () => {
			finished = true;
			cancelAnimationFrame(raf);
			clearInterval(spawner);
		};
	}

	// ---- Game 5: drag each picture to the basket of its first letter ----
	function dragRound({l, m}) {
		if (!m || m === l) m = pickOne(LETTERS.filter((x) => x !== l));
		const items = shuffle([
			...shuffle(l.words).slice(0, 2).map((w) => ({w, to: l})),
			...shuffle(m.words).slice(0, 2).map((w) => ({w, to: m}))
		]);
		const {body} = roundFrame({letter: '', prompt: t('drag'), speak: TEXT.ar.drag()});
		body.innerHTML = `
			<div class="ag-drag">
				<div class="ag-baskets">${shuffle([l, m]).map((x) => `
					<div class="ag-basket pop-in" data-ch="${x.ch}"><span class="ag-basket-sign">${x.ch}</span><span class="ag-basket-in"></span><span class="ag-basket-body">🧺</span></div>`).join('')}
				</div>
				<div class="ag-tray">${items.map((it) => `<button class="ag-item pop-in" type="button"><span class="ag-emoji">${it.w.emoji}</span><span class="ag-word">${wordHtml(it.w.word)}</span></button>`).join('')}</div>
			</div>`;
		const baskets = [...body.querySelectorAll('.ag-basket')];
		const buttons = [...body.querySelectorAll('.ag-item')];
		let placed = 0;

		const basketAt = (x, y) => baskets.find((b) => {
			const box = b.getBoundingClientRect();

			return x > box.left - 24 && x < box.right + 24 && y > box.top - 24 && y < box.bottom + 24;
		});
		const highlight = (target) => baskets.forEach((b) => b.classList.toggle('over', b === target));

		buttons.forEach((btn, k) => {
			const item = items[k];
			let drag = null;
			btn.addEventListener('pointerdown', (e) => {
				if (item.done || !state.game || state.game.won) return;
				e.preventDefault();
				btn.setPointerCapture(e.pointerId);
				drag = {x: e.clientX, y: e.clientY, moved: false};
				btn.classList.add('lifted');
				gsap.to(btn, {scale: 1.14, rotate: -5, duration: 0.2, ease: 'power2.out'});
			});
			btn.addEventListener('pointermove', (e) => {
				if (!drag) return;
				const dx = e.clientX - drag.x;
				const dy = e.clientY - drag.y;
				if (Math.hypot(dx, dy) > 8) drag.moved = true;
				gsap.set(btn, {x: dx, y: dy});
				highlight(basketAt(e.clientX, e.clientY));
			});
			const back = () => gsap.to(btn, {x: 0, y: 0, scale: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)', onComplete: () => btn.classList.remove('lifted')});
			const end = (e) => {
				if (!drag) return;
				const moved = drag.moved;
				drag = null;
				highlight(null);
				const basket = moved ? basketAt(e.clientX, e.clientY) : null;
				if (!moved) {
					sfx.tap();
					say(item.w.word);
					back();

					return;
				}
				if (!basket) {
					back();

					return;
				}
				if (basket.dataset.ch !== item.to.ch) {
					roundMiss(basket);
					back();

					return;
				}
				item.done = true;
				placed++;
				const from = btn.getBoundingClientRect();
				const to = basket.getBoundingClientRect();
				sfx.pop();
				say(item.w.word);
				gsap.to(btn, {
					x: `+=${to.left + to.width / 2 - (from.left + from.width / 2)}`,
					y: `+=${to.top + to.height * 0.55 - (from.top + from.height / 2)}`,
					scale: 0.3, opacity: 0, duration: 0.35, ease: 'power2.in',
					onComplete: () => {
						btn.style.visibility = 'hidden';
						const mini = html('span', '', item.w.emoji);
						basket.querySelector('.ag-basket-in').appendChild(mini);
						gsap.from(mini, {y: -30, scale: 0, duration: 0.5, ease: 'back.out(3)'});
						gsap.fromTo(basket, {scaleY: 0.8, scaleX: 1.15}, {scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.3, 0.35)'});
						if (placed === items.length) roundWin({el: body.querySelector('.ag-baskets')});
					}
				});
			};
			btn.addEventListener('pointerup', end);
			btn.addEventListener('pointercancel', end);
		});
	}

	// ---- The end of a level: stars! ----
	function finishLevel() {
		const g = state.game;
		const stars = g.mistakes <= 1 ? 3 : g.mistakes <= 4 ? 2 : 1;
		const before = state.progress.stars[g.i];
		const firstTime = !before;
		state.progress.stars[g.i] = Math.max(before, stars);
		if (state.progress.resume && state.progress.resume.i === g.i) state.progress.resume = null;
		saveProgress();
		const final = g.level.final;
		g.prompt = final ? TEXT.ar.finalTitle : `${TEXT.ar.doneTitle} ${TEXT.ar.doneSub}`;

		const round = html('div', 'ag-round ag-done');
		round.innerHTML = `
			<div class="ag-done-stars">${[0, 1, 2].map((k) => `<span class="ag-star ${k < stars ? 'on' : ''}">★</span>`).join('')}</div>
			<h2 class="ag-done-title">${final ? t('finalTitle') : t('doneTitle')}</h2>
			<p class="ag-done-sub">${final ? `${t('finalSub')} 🏆` : t('doneSub')}</p>
			<div class="ag-done-loot"><span class="ag-chest">${final ? '🏆' : '🎁'}</span><b>+${stars} ⭐</b></div>
			<div class="ag-done-btns">
				<button class="ag-btn ag-again" type="button">↻ ${t('again')}</button>
				<button class="ag-btn ag-next" type="button">${t('next')} <span>❯</span></button>
			</div>`;
		ui.dots.querySelectorAll('i').forEach((dot) => (dot.className = 'done'));
		mount(round);
		say(g.prompt);
		guideJump();

		const starEls = round.querySelectorAll('.ag-star');
		const tl = gsap.timeline({delay: 0.45});
		starEls.forEach((star, k) => {
			tl.fromTo(star, {scale: 0, rotate: -200}, {scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.4)', onStart: () => {
				if (k < stars) {
					sfx.star(k);
					burst({el: star, count: 26, spread: 70, scalar: 0.8, shapes: ['star']});
				}
			}}, k * 0.32);
		});
		gsap.to(round.querySelector('.ag-chest'), {rotate: 10, duration: 0.18, yoyo: true, repeat: 7, ease: 'sine.inOut', delay: 1.4});
		setTimeout(() => {
			burst({x: 0.1, y: 0.9, count: 90, spread: 60, velocity: 55});
			burst({x: 0.9, y: 0.9, count: 90, spread: 60, velocity: 55});
		}, 1100);

		round.querySelector('.ag-again').addEventListener('click', () => {
			sfx.tap();
			openLevel(g.i, {fresh: true});
		});
		round.querySelector('.ag-next').addEventListener('click', () => {
			sfx.tap();
			endGame({then: () => afterLevel(g.i, firstTime)});
		});
	}

	function afterLevel(i, firstTime) {
		renderNodes();
		updateHud({bump: true});
		setTrailDone(currentLevel(), true);
		const next = i + 1;
		if (!firstTime) return;
		if (next < LEVELS.length) {
			setTimeout(() => {
				unlockNode(next);
				if (LEVELS[next].world !== LEVELS[i].world) showBanner(WORLDS[LEVELS[next].world]);
			}, 500);
			setTimeout(() => {
				state.busy = true;
				walkTo(next).then(() => (state.busy = false));
			}, 1300);
		} else {
			setTimeout(() => {
				[0.2, 0.5, 0.8].forEach((x, k) => setTimeout(() => burst({x, y: 0.6, count: 120, spread: 120, velocity: 45, shapes: ['star', 'circle']}), k * 350));
				sfx.chime();
				gsap.fromTo(ui.heroPin, {y: 0}, {y: -60, duration: 0.3, yoyo: true, repeat: 5, ease: 'power2.out'});
			}, 400);
		}
	}

	window.LettersAdventure = {
		open,
		stars: () => loadProgress().stars.reduce((sum, s) => sum + s, 0)
	};
})();
