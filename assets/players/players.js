/* Party players: pick who is playing (each seat wears a hero from the Hero Squad, heroes.js), then take turns.
   Shared by every multiplayer game. Brings its own styles; uses the page's font. Load heroes.js before this file.
     PartyPlayers.picker(el, {lang, tap, max})   "Who's playing?" — tap a hero to join / leave, ✏️ to rename, 🔄 to change hero
                                                 (six seats, one per hero; max: the most that can join, for games with four corners)
     PartyPlayers.img(p) / .hero(p, {bust, mood}) the player's hero as an image URL / as live animated SVG markup
     board.react(i, mood, ms)                    make player i's hero react: 'cheer' 'oops' 'turn' 'win'
     PartyPlayers.active(max)                    the players picked (in order), at least one, at most max
     PartyPlayers.board(el, {lang, star})        the in-game scoreboard: whose turn it is + each player's own row of ⭐ slots
     PartyPlayers.results(el, board, lang)       final ranking with a crown for the winner(s)
   Picked players, names and heroes are remembered for every game (localStorage 'party-players-v1').
   Changing a hero fires a 'pp-hero' event on window, so a game can redraw its own copies. */
(function () {
	'use strict';
	const KEY = 'party-players-v1';
	const PH = window.PartyHeroes;
	const PEOPLE = [
		{id: 'p1', color: '#ff5d73', hero: 'comet', name: {ar: 'نَجْم', en: 'Star'}},
		{id: 'p2', color: '#9b6bff', hero: 'luna', name: {ar: 'قَمَر', en: 'Moon'}},
		{id: 'p3', color: '#1fa8ff', hero: 'splash', name: {ar: 'إِيهَاب', en: 'Ihab'}},
		{id: 'p4', color: '#ff9417', hero: 'blaze', name: {ar: 'بَطَل', en: 'Hero'}},
		{id: 'p5', color: '#35b84a', hero: 'sprout', name: {ar: 'زَهْرَة', en: 'Bloom'}},
		{id: 'p6', color: '#e84ad1', hero: 'bolt', name: {ar: 'بَرْق', en: 'Flash'}}
	].filter((p) => !p.hidden); // hidden players don't appear anywhere
	const TEXT = {
		ar: {
			who: 'مَنْ يَلْعَبُ؟', solo: 'لَاعِبٌ وَاحِدٌ · اِخْتَرْ أَكْثَرَ لِلَّعِبِ مَعًا', many: '{n} لَاعِبِين · كُلُّ وَاحِدٍ فِي دَوْرِهِ',
			turn: (n) => `دَوْرُ ${n}!`, yours: 'دَوْرُكَ', rename: 'اُكْتُبِ الِاسْمَ:', edit: 'تَغْيِيرُ الِاسْم', swap: 'تَغْيِيرُ الْبَطَل',
			wins: (n) => `${n} هُوَ الْفَائِزُ!`, tie: 'تَعَادُل! كُلُّكُمْ أَبْطَال', stars: 'نُجُوم'
		},
		en: {
			who: "Who's playing?", solo: '1 player · pick more to play together', many: '{n} players · take turns',
			turn: (n) => `${n}'s turn!`, yours: 'Your turn', rename: 'Type the name:', edit: 'Rename', swap: 'Change hero',
			wins: (n) => `${n} wins!`, tie: "It's a tie! You're all champs", stars: 'stars'
		}
	};
	const tx = (lang) => TEXT[lang] || TEXT.en;
	const num = (n, lang) => (lang === 'ar' ? n.toLocaleString('ar-EG') : String(n));

	/* ---------- saved picks and names ---------- */
	const saved = (() => {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || {};
		} catch (err) {
			return {};
		}
	})();
	const savedOn = Array.isArray(saved.on) ? saved.on.filter((id) => PEOPLE.some((p) => p.id === id)) : [];
	const S = {on: savedOn.length ? savedOn : [PEOPLE[0].id], names: saved.names || {}, heroes: {}};
	// every seat wears a different hero: keep the saved ones that are still free, the rest get their own
	PEOPLE.forEach((p) => {
		const h = saved.heroes && saved.heroes[p.id];
		if (PH.LIST.includes(h) && !Object.values(S.heroes).includes(h)) S.heroes[p.id] = h;
	});
	PEOPLE.forEach((p) => {
		if (!S.heroes[p.id]) S.heroes[p.id] = [p.hero, ...PH.LIST].find((h) => !Object.values(S.heroes).includes(h));
	});
	function persist() {
		try {
			localStorage.setItem(KEY, JSON.stringify(S));
		} catch (err) {
			/* private mode: picks are forgotten on reload */
		}
	}
	const nameOf = (p, lang) => S.names[p.id] || p.name[lang] || p.name.en;
	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

	/* ---------- each player's hero ---------- */
	const heroOf = (p) => S.heroes[p.id] || p.hero || PH.LIST[0];
	const img = (p) => PH.url(heroOf(p), p.color, {bust: true}); // head and shoulders: reads well when small
	const hero = (p, opts) => PH.svg(heroOf(p), p.color, opts);
	// the next hero in the squad; if another seat wears it, the two trade
	function nextHero(p) {
		const next = PH.LIST[(PH.LIST.indexOf(heroOf(p)) + 1) % PH.LIST.length];
		const other = PEOPLE.find((q) => q !== p && heroOf(q) === next);
		if (other) S.heroes[other.id] = heroOf(p);
		S.heroes[p.id] = next;
		persist();
		window.dispatchEvent(new CustomEvent('pp-hero', {detail: {players: other ? [p, other] : [p]}}));
	}

	function active(max = PEOPLE.length) {
		const list = PEOPLE.filter((p) => S.on.includes(p.id)).slice(0, max);

		return list.length ? list : [PEOPLE[0]];
	}

	/* ---------- styles ---------- */
	const css = `
.pp-pick{width:100%;max-width:calc(var(--n,4)*150px + 80px);margin:0 auto;padding:12px 14px 14px;border-radius:30px;background:#ffffffb8;box-shadow:0 8px 0 #0000000f,0 14px 30px #3b24161a;
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);text-align:center;animation:pp-in .55s cubic-bezier(.3,1.6,.5,1) both}
.pp-pick h3{margin:0;font-size:clamp(22px,4.6vw,30px);font-weight:800;line-height:1.25}
.pp-pick .pp-sub{margin:0 0 8px;font-size:clamp(14px,3vw,17px);font-weight:700;opacity:.65}
.pp-row{display:grid;grid-template-columns:repeat(var(--n,4),1fr);gap:clamp(6px,2vw,14px)}
.pp-tile{position:relative;border:3px solid transparent;border-radius:24px;background:#ffffff80;padding:6px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;
  font:inherit;color:inherit;cursor:pointer;transition:transform .3s cubic-bezier(.3,1.6,.5,1),background .25s,border-color .25s,box-shadow .25s;-webkit-tap-highlight-color:transparent}
.pp-tile .pp-img{width:100%;max-width:128px;aspect-ratio:1;filter:grayscale(.85) opacity(.55);transition:filter .3s,transform .3s}
.pp-tile{min-width:0}
.pp-tile .pp-img{position:relative}.pp-tile .pp-img svg{position:absolute;inset:0;width:100%;height:100%}
.pp-tile b{font-size:clamp(14px,3.2vw,19px);font-weight:800;line-height:1.3;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.6}
.pp-tile.on{background:#fff;border-color:var(--c);transform:translateY(-4px);box-shadow:0 6px 0 var(--c),0 12px 24px color-mix(in srgb,var(--c) 35%,transparent)}
.pp-tile.on .pp-img{filter:none}
.pp-tile:nth-child(2) .hero *{animation-delay:-.7s}.pp-tile:nth-child(3) .hero *{animation-delay:-1.5s}.pp-tile:nth-child(4) .hero *{animation-delay:-2.2s}
.pp-tile:nth-child(5) .hero *{animation-delay:-2.9s}.pp-tile:nth-child(6) .hero *{animation-delay:-.3s}
.pp-tile.on b{opacity:1;color:color-mix(in srgb,var(--c) 70%,#000)}
.pp-tile:active{transform:scale(.94)}
.pp-check{position:absolute;top:-8px;inset-inline-end:-6px;width:32px;height:32px;border-radius:50%;background:var(--c);color:#fff;font-size:18px;font-weight:800;
  display:grid;place-items:center;box-shadow:0 3px 0 #0003;transform:scale(0);transition:transform .35s cubic-bezier(.3,1.8,.5,1)}
.pp-tile.on .pp-check{transform:scale(1)}
.pp-edit{position:absolute;top:-8px;inset-inline-start:-6px;width:30px;height:30px;border-radius:50%;border:0;background:#fff;box-shadow:0 3px 8px #0002;font-size:14px;
  display:grid;place-items:center;cursor:pointer;opacity:0;transform:scale(.6);transition:opacity .25s,transform .25s;padding:0}
.pp-swap{position:absolute;bottom:34px;inset-inline-end:-8px;width:40px;height:40px;border-radius:50%;background:var(--c);color:#fff;box-shadow:0 3px 0 #0003;
  display:grid;place-items:center;cursor:pointer;opacity:0;transform:scale(.6);pointer-events:none;transition:opacity .25s,transform .35s cubic-bezier(.3,1.8,.5,1)}
.pp-swap svg{width:22px;height:22px}
.pp-swap:active{transform:scale(.86) rotate(-90deg)!important}
.pp-tile.on .pp-edit,.pp-tile.on .pp-swap{opacity:1;transform:scale(1);pointer-events:auto}
.pp-tile.no{animation:pp-no .45s}

.pp-board{display:flex;justify-content:center;align-items:flex-end;gap:clamp(6px,1.6vw,14px);width:100%;max-width:980px;flex:none;padding-top:16px;direction:inherit}
.pp-chip{position:relative;display:flex;align-items:center;gap:8px;padding:5px 14px 5px 5px;border-radius:999px;background:#ffffffc7;
  box-shadow:0 4px 0 #0000000f,0 8px 18px #0000001a;opacity:.62;transform:scale(.9);filter:saturate(.6);
  transition:transform .45s cubic-bezier(.3,1.6,.5,1),opacity .3s,filter .3s,box-shadow .3s,background .3s}
[dir=rtl] .pp-chip{padding:5px 5px 5px 14px}
.pp-board.all .pp-chip{opacity:1;transform:none;filter:none}
.pp-chip.on{opacity:1;transform:scale(1.08);filter:none;background:#fff;box-shadow:0 0 0 4px var(--c),0 0 26px 6px color-mix(in srgb,var(--c) 55%,transparent),0 6px 0 #0000001a;animation:pp-glow 1.4s ease-in-out infinite}
.pp-av{position:relative;width:54px;height:54px;flex:none;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,color-mix(in srgb,var(--c) 45%,#fff));
  clip-path:inset(-60% -30% 0 -30% round 0 0 999px 999px)}
.pp-av::after{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid var(--c);pointer-events:none}
.pp-av svg{position:absolute;left:50%;bottom:0;width:108%;height:108%;translate:-50% 0}
.pp-meta{display:flex;flex-direction:column;align-items:flex-start;line-height:1.1;min-width:0}
.pp-meta b{font-size:17px;font-weight:800;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-stars{display:inline-flex;align-items:center;gap:3px;margin-top:2px;padding:1px 10px 1px 6px;border-radius:999px;background:linear-gradient(180deg,#fff6c8,#ffe27a);
  box-shadow:inset 0 -2px 0 #e9b520;font-weight:800;font-size:18px;color:#8a5200;direction:ltr}
.pp-stars i{font-style:normal;font-size:18px;filter:drop-shadow(0 1px 0 #c98a00)}
.pp-n.pop,.pp-stars.pop{animation:pp-pop .6s cubic-bezier(.3,1.8,.5,1)}
.pp-score{display:flex;align-items:center;gap:6px;margin-top:3px;direction:ltr}
.pp-slots{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:1px 2px}
.pp-slot{font-style:normal;font-size:21px;line-height:1;color:#e9dfd3;text-shadow:0 1px 0 #fff,0 -1px 0 #0000000d;transition:color .3s}
.pp-slot.on{color:#ffc21a;text-shadow:0 1px 0 #c98a00,0 0 6px #ffd54a99}
.pp-slot.pop{animation:pp-pop .6s cubic-bezier(.3,1.8,.5,1)}
.pp-n{min-width:26px;padding:0 7px;border-radius:999px;background:linear-gradient(180deg,#fff6c8,#ffe27a);box-shadow:inset 0 -2px 0 #e9b520;
  font-size:16px;font-weight:800;color:#8a5200;text-align:center;line-height:1.45}
.pp-tag{position:absolute;top:-17px;left:50%;translate:-50% 0;padding:1px 10px;border-radius:999px;background:var(--c);color:#fff;font-size:13px;font-weight:800;white-space:nowrap;
  box-shadow:0 3px 0 #0003;opacity:0;transform:translateY(6px) scale(.6);transition:opacity .25s,transform .35s cubic-bezier(.3,1.8,.5,1)}
.pp-chip.on .pp-tag{opacity:1;transform:none;animation:pp-nudge 1.1s ease-in-out infinite}
.pp-crown{position:absolute;top:-16px;inset-inline-start:12px;font-size:22px;rotate:-18deg;filter:drop-shadow(0 2px 0 #0003);animation:pp-in .5s cubic-bezier(.3,1.8,.5,1)}

.pp-banner{position:fixed;inset:0;z-index:45;display:grid;place-items:center;pointer-events:none}
.pp-banner .pp-card{display:flex;flex-direction:column;align-items:center;gap:0;padding:10px 34px 16px;border-radius:36px;background:#fff;
  box-shadow:0 0 0 6px var(--c),0 24px 60px #0004}
.pp-banner .pp-hero{width:clamp(140px,32vmin,220px);margin-top:-6px}
.pp-banner .pp-hero svg{width:100%;height:auto}
.pp-banner b{font-size:clamp(28px,6vw,44px);font-weight:800;line-height:1.2;color:#fff;-webkit-text-stroke:7px var(--c);paint-order:stroke fill}

.pp-results{display:flex;flex-direction:column;gap:8px;margin:6px auto 4px;max-width:340px}
.pp-results .pp-head{font-size:clamp(22px,5vw,28px);font-weight:800;line-height:1.25;margin-bottom:2px}
.pp-res{display:flex;align-items:center;gap:10px;padding:4px 14px 4px 6px;border-radius:999px;background:#fff;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 40%,transparent),0 4px 0 #0000000f;
  animation:pp-in .5s cubic-bezier(.3,1.6,.5,1) both}
[dir=rtl] .pp-res{padding:4px 6px 4px 14px}
.pp-res.win{box-shadow:0 0 0 4px var(--c),0 0 22px 4px color-mix(in srgb,var(--c) 50%,transparent);transform:scale(1.04)}
.pp-res .pp-av{width:54px;height:54px}.pp-res.win .pp-av{width:64px;height:64px}
.pp-res b{flex:1;text-align:start;font-size:19px;font-weight:800}
.pp-res .pp-medal{font-size:24px}

.pp-flyer{position:fixed;left:0;top:0;z-index:48;font-size:46px;line-height:1;pointer-events:none;filter:drop-shadow(0 4px 0 #c98a00) drop-shadow(0 0 12px #ffd54a)}

@keyframes pp-in{from{opacity:0;transform:scale(.5) translateY(14px)}}
@keyframes pp-glow{50%{box-shadow:0 0 0 5px var(--c),0 0 36px 10px color-mix(in srgb,var(--c) 45%,transparent),0 6px 0 #0000001a}}
@keyframes pp-pop{0%{transform:scale(1)}35%{transform:scale(1.55) rotate(-8deg)}100%{transform:scale(1)}}
@keyframes pp-nudge{50%{translate:-50% -4px}}
@keyframes pp-no{20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
@media (max-width:640px){.pp-many .pp-row{grid-template-columns:repeat(3,1fr);row-gap:14px}.pp-many .pp-tile .pp-img{max-width:96px}}
@media (max-width:600px){
  .pp-swap{width:32px;height:32px;bottom:26px;inset-inline-end:-6px}.pp-swap svg{width:17px;height:17px}
  .pp-chip{padding:4px!important;gap:0;flex-direction:column;border-radius:22px}
  .pp-meta{align-items:center}
  .pp-meta b{font-size:13px;max-width:70px}
  .pp-chip:not(.on) .pp-meta b{display:none}
  .pp-av{width:44px;height:44px}
  .pp-stars{font-size:15px;padding:0 7px 0 4px}.pp-stars i{font-size:14px}
  .pp-score{flex-direction:column;gap:2px}.pp-slot{font-size:14px}.pp-n{font-size:13px}
  .pp-tag{font-size:11px;top:-15px}
}
@media (min-width:601px){
  .pp-board.crowd .pp-chip{padding:5px 9px 6px;gap:1px;flex-direction:column;border-radius:24px}
  .pp-board.crowd .pp-meta{align-items:center}
  .pp-board.crowd .pp-meta b{font-size:15px;max-width:96px}
  .pp-board.crowd .pp-av{width:48px;height:48px}
  .pp-board.crowd .pp-slot{font-size:16px}.pp-board.crowd .pp-score{gap:4px}
}
@media (max-height:560px){.pp-board{padding-top:12px}.pp-av{width:40px;height:40px}.pp-meta b{font-size:14px}}
@media (prefers-reduced-motion:reduce){.pp-pick *,.pp-board *,.pp-chip{animation:none!important}}`;
	const style = document.createElement('style');
	style.textContent = css;
	document.head.appendChild(style);

	/* ---------- "Who's playing?" ---------- */
	const SWAP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
		'<path d="M20 11a8 8 0 0 0-14.3-4.4M4 13a8 8 0 0 0 14.3 4.4"/><path d="M5 3v4h4M19 21v-4h-4"/></svg>';
	function picker(el, {lang = 'ar', tap = () => {}, max = PEOPLE.length} = {}) {
		let L = lang;
		// arrive: the player whose hero should pop in (they just joined, or just changed hero)
		function render(arrive) {
			const T = tx(L);
			const playing = active(max);
			const n = playing.length;
			el.className = `pp-pick${PEOPLE.length > 4 ? ' pp-many' : ''}`;
			el.style.setProperty('--n', PEOPLE.length);
			el.innerHTML = `<h3>👨‍👩‍👦‍👦 ${T.who}</h3><p class="pp-sub">${n > 1 ? T.many.replace('{n}', num(n, L)) : T.solo}</p><div class="pp-row"></div>`;
			const row = el.querySelector('.pp-row');
			PEOPLE.forEach((p) => {
				const on = playing.includes(p);
				const tile = document.createElement('button');
				tile.type = 'button';
				tile.className = `pp-tile${on ? ' on' : ''}`;
				tile.style.setProperty('--c', p.color);
				tile.setAttribute('aria-pressed', on);
				tile.innerHTML = `<span class="pp-check">✓</span><span class="pp-edit" role="button" aria-label="${T.edit}">✏️</span>
					<span class="pp-img">${hero(p, {mood: on ? '' : 'sleep'})}</span><b>${esc(nameOf(p, L))}</b>
					<span class="pp-swap" role="button" aria-label="${T.swap}">${SWAP_ICON}</span>`;
				if (on && arrive === p) PH.react(tile.querySelector('.hero'), 'pop', 900);
				tile.addEventListener('click', (e) => {
					if (e.target.closest('.pp-swap')) {
						nextHero(p);
						tap(true);
						render(p);

						return;
					}
					if (e.target.closest('.pp-edit')) {
						const name = prompt(T.rename, nameOf(p, L));
						if (name && name.trim()) {
							S.names[p.id] = name.trim().slice(0, 16);
							persist();
							render();
						}

						return;
					}
					if (on ? n === 1 : n >= max) {
						// someone has to play, and a game with four corners is full at four
						tile.classList.remove('no');
						void tile.offsetWidth;
						tile.classList.add('no');

						return;
					}
					S.on = playing.filter((x) => x !== p).concat(on ? [] : p).map((x) => x.id);
					persist();
					tap(!on);
					render(on ? null : p);
				});
				row.appendChild(tile);
			});
		}
		render();

		return {
			setLang(l) {
				L = l;
				render();
			}
		};
	}

	/* ---------- the big "Ihab's turn!" banner ---------- */
	function announce(p, lang) {
		const el = document.createElement('div');
		el.className = 'pp-banner';
		el.style.setProperty('--c', p.color);
		el.innerHTML = `<div class="pp-card"><span class="pp-hero">${hero(p, {mood: 'turn'})}</span><b>${esc(tx(lang).turn(nameOf(p, lang)))}</b></div>`;
		document.body.appendChild(el);
		const card = el.firstChild;
		card.animate([
			{transform: 'scale(.2) rotate(-12deg)', opacity: 0},
			{transform: 'scale(1.08) rotate(3deg)', opacity: 1, offset: 0.22},
			{transform: 'scale(1) rotate(0)', opacity: 1, offset: 0.32},
			{transform: 'scale(1) rotate(0)', opacity: 1, offset: 0.82},
			{transform: 'scale(.6) translateY(-40px)', opacity: 0}
		], {duration: 1500, easing: 'ease-out'}).onfinish = () => el.remove();

		return new Promise((done) => setTimeout(done, 1250));
	}

	/* ---------- in-game scoreboard ---------- */
	function board(el, {lang = 'ar', star = () => {}} = {}) {
		const B = {players: [], scores: [], turn: 0, lang, moods: [], timers: []};
		el.classList.add('pp-board');

		// every player has their own row of star slots (as many as they could win), filled one per win, the number beside it
		function slotsHTML(score) {
			const n = Math.max(B.slots, score);
			const cols = n > 6 ? Math.ceil(n / 2) : n;

			return `<span class="pp-score"><span class="pp-slots" style="--cols:${cols}">${Array.from({length: n}, (_, k) => `<i class="pp-slot${k < score ? ' on' : ''}">★</i>`).join('')}</span>` +
				`<b class="pp-n">${num(score, B.lang)}</b></span>`;
		}

		function render() {
			const T = tx(B.lang);
			const best = Math.max(0, ...B.scores);
			el.innerHTML = '';
			B.players.forEach((p, i) => {
				const chip = document.createElement('div');
				chip.className = `pp-chip${i === B.turn ? ' on' : ''}`;
				chip.style.setProperty('--c', p.color);
				chip.innerHTML = `<span class="pp-tag">${T.yours}</span>
					${best && B.scores[i] === best ? '<span class="pp-crown">👑</span>' : ''}
					<span class="pp-av">${hero(p, {bust: true, mood: B.moods[i] || (i === B.turn ? 'turn' : '')})}</span>
					<span class="pp-meta"><b>${esc(nameOf(p, B.lang))}</b>${slotsHTML(B.scores[i])}</span>`;
				el.appendChild(chip);
			});
		}

		Object.assign(B, {
			// slots: the most stars one player can win (memory: the pairs, find the ball: the turns)
			start(players, slots = 5) {
				B.players = players;
				el.classList.toggle('crowd', players.length > 4); // five or six: each chip stacks, so the row still fits
				B.slots = slots;
				B.scores = players.map(() => 0);
				B.timers.forEach(clearTimeout);
				B.moods = [];
				B.turn = 0;
				el.classList.remove('hidden');
				render();
			},
			hide() {
				el.classList.add('hidden');
			},
			setLang(l) {
				B.lang = l;
				if (B.players.length) render();
			},
			// -1: everyone plays at once, nobody is dimmed
			setTurn(i) {
				B.turn = i < 0 ? -1 : i % B.players.length;
				el.classList.toggle('all', B.turn < 0);
				render();
			},
			// move to the next player and show the big banner
			next() {
				B.turn = (B.turn + 1) % B.players.length;
				render();

				return announce(B.current, B.lang);
			},
			announce() {
				return announce(B.current, B.lang);
			},
			// player i's hero reacts to what just happened in the game: 'cheer' 'oops' 'turn' 'win' (ms = 0: until told otherwise)
			react(i = B.turn, mood = 'cheer', ms = 1600) {
				if (!B.players[i]) return;
				clearTimeout(B.timers[i]);
				B.moods[i] = mood;
				const chip = el.children[i];
				if (chip) PH.setMood(chip.querySelector('.hero'), mood);
				if (ms > 0) B.timers[i] = setTimeout(() => {
					B.moods[i] = '';
					render();
				}, ms);
			},
			// a star pops out of `from` (a card, the ball) and flies to the player's count
			addStar(from, i = B.turn) {
				const target = el.children[i].querySelectorAll('.pp-slot')[B.scores[i]] || el.children[i].querySelector('.pp-n');
				const r = from.getBoundingClientRect();
				const fly = document.createElement('div');
				fly.className = 'pp-flyer';
				fly.textContent = '⭐';
				document.body.appendChild(fly);
				const t = target.getBoundingClientRect();
				const sx = r.left + r.width / 2 - 23, sy = r.top + r.height / 2 - 23;
				const ex = t.left + t.width / 2 - 23, ey = t.top + t.height / 2 - 23;
				const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 90;
				fly.animate([
					{transform: `translate(${sx}px,${sy}px) scale(0) rotate(-120deg)`},
					{transform: `translate(${sx}px,${sy - 40}px) scale(1.6) rotate(0)`, offset: 0.3},
					{transform: `translate(${mx}px,${my}px) scale(1.2) rotate(180deg)`, offset: 0.65},
					{transform: `translate(${ex}px,${ey}px) scale(.3) rotate(360deg)`}
				], {duration: 1100, easing: 'ease-in-out', fill: 'forwards'});

				return new Promise((done) => setTimeout(() => {
					fly.remove();
					B.scores[i]++;
					B.react(i, 'cheer');
					render();
					const chip = el.children[i];
					const slot = chip.querySelectorAll('.pp-slot')[B.scores[i] - 1];
					if (slot) slot.classList.add('pop');
					chip.querySelector('.pp-n').classList.add('pop');
					star();
					done();
				}, 1100));
			},
			winners() {
				const best = Math.max(...B.scores);

				return B.players.filter((_, i) => B.scores[i] === best);
			}
		});

		// a real getter (Object.assign would copy just today's value)
		Object.defineProperty(B, 'current', {get: () => B.players[B.turn]});

		return B;
	}

	/* ---------- final ranking ---------- */
	function results(el, B, lang) {
		const T = tx(lang);
		const best = Math.max(...B.scores);
		const win = B.winners();
		const order = B.players.map((p, i) => ({p, s: B.scores[i]})).sort((a, b) => b.s - a.s);
		const medals = ['🥇', '🥈', '🥉'];
		let place = -1, last = null;
		el.className = 'pp-results';
		el.innerHTML = `<div class="pp-head">${win.length > 1 ? T.tie : `👑 ${esc(T.wins(nameOf(win[0], lang)))}`}</div>` + order.map(({p, s}, k) => {
			if (s !== last) place++;
			last = s;

			return `<div class="pp-res${s === best ? ' win' : ''}" style="--c:${p.color};animation-delay:${k * 140}ms">
				<span class="pp-medal">${medals[place] || '🎖️'}</span><span class="pp-av">${hero(p, {bust: true, mood: s === best ? 'win' : ''})}</span><b>${esc(nameOf(p, lang))}</b>
				<span class="pp-stars"><i>⭐</i><span>${num(s, lang)}</span></span></div>`;
		}).join('');
	}

	const turnText = (p, lang) => tx(lang).turn(nameOf(p, lang));

	window.PartyPlayers = {PEOPLE, active, picker, board, results, announce, nameOf, turnText, img, hero, heroOf};
})();
