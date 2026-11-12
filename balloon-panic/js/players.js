/* Balloon Panic: PlayerManager and the buddies.
   A Buddy is a cut-out puppet animated in code every frame (nothing is a fixed picture):
   it breathes, blinks, follows the balloon with its eyes, reaches for it with both arms, and acts out
   every feeling in the game: panic, laughing, shock, crying, dancing, celebrating, hiding and jumping.
     buddy.setBase(name)            the feeling it settles into (idle, worry, panic...)
     buddy.setExpr(name, seconds)   a feeling for a moment
     buddy.jump() .dance() .hide() .spin() .knock() .throwAt() .tease()
   Players lays the buddies out on their podiums and answers "who is next?" and "who was tapped?". */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});
	const lerp = (a, b, t) => a + (b - a) * t;

	// what a face does for each feeling. brow: + worried (inner ends up), - cheeky; arms: how the arms are held
	const EXPR = {
		idle: {eye: 'open', mouth: 'smile'},
		happy: {eye: 'happy', mouth: 'open', raise: 2},
		worry: {eye: 'open', mouth: 'o', brow: 0.32, raise: 4, wide: 1.1},
		panic: {eye: 'open', mouth: 'panic', brow: 0.5, raise: 8, wide: 1.32, pupil: 0.62, shake: 2.6},
		terror: {eye: 'open', mouth: 'wail', brow: 0.6, raise: 11, wide: 1.5, pupil: 0.45, shake: 4.5},
		shock: {eye: 'open', mouth: 'o', brow: 0.2, raise: 12, wide: 1.55, pupil: 0.42},
		cry: {eye: 'squeeze', mouth: 'wail', brow: 0.55, raise: 3, tears: true, bob: 0.6},
		laugh: {eye: 'happy', mouth: 'open', raise: 3, bob: 1},
		cheer: {eye: 'happy', mouth: 'open', raise: 3, arms: 'up'},
		tease: {eye: 'open', mouth: 'tongue', brow: -0.3, raise: 1, wink: true},
		smug: {eye: 'open', mouth: 'grin', brow: -0.34, raise: 0, lid: 0.62},
		hide: {eye: 'squeeze', mouth: 'panic', brow: 0.4, arms: 'cover'},
		dizzy: {eye: 'squeeze', mouth: 'o', brow: 0.2, raise: 4, sway: 1},
		sad: {eye: 'open', mouth: 'o', brow: 0.5, raise: 2, lid: 0.7}
	};
	const OPEN_BEAK = {open: 1, o: 1, panic: 1, wail: 1, tongue: 1};

	class Buddy {
		constructor(scene, {sp, idx = 0, person = null, seat, bot = false, scale = 1}) {
			const A = BP.Art;
			const R = A.RIG;
			this.scene = scene;
			this.sp = sp;
			this.spec = A.SPECIES[sp];
			this.idx = idx;
			this.bot = bot;
			this.seat = seat;
			this.scale = scale;
			this.phase = Math.random() * 10;
			this.obj = null; // what it is holding
			this.incoming = null; // what is flying towards it
			this.c = scene.add.container(seat.x, seat.y).setDepth(100 + seat.y / 10).setScale(scale);
			this.shadow = A.add(scene, 'bp-shadow', seat.x, seat.y + 4).setDepth(60);
			const g = (this.g = scene.add.container(0, 0));
			this.c.add(g);
			const part = (name, x, y) => A.add(scene, `bp-${sp}-${name}`, x, y);
			if (this.spec.tail) g.add((this.tail = part('tail', R.tail[0], R.tail[1])));
			this.footL = part('foot', -R.foot[0], R.foot[1]);
			this.footR = part('foot', R.foot[0], R.foot[1]);
			this.body = part('body', R.body[0], R.body[1]);
			this.scarf = A.add(scene, 'bp-scarf-p1', R.scarf[0], R.scarf[1]).setVisible(false);
			g.add([this.footL, this.footR, this.body, this.scarf]);
			// the head: ears behind, then the face, then anything that lands on it (paint, wigs, hats)
			const H = (this.H = scene.add.container(R.head[0], R.head[1]));
			g.add(H);
			const e = R.ears[this.spec.ear];
			this.ears = [];
			if (e && this.spec.ear !== 'tuft') {
				this.ears = [-1, 1].map((s) => {
					const ear = part('ear', s * e[0], e[1]).setFlipX(s > 0);
					ear.base = s * e[2];
					H.add(ear);

					return ear;
				});
			}
			H.add(part('head', 0, 0));
			if (this.spec.ear === 'tuft') {
				const tuft = part('ear', 0, e[1]);
				tuft.base = 0;
				H.add(tuft);
				this.ears = [tuft];
			}
			const [ex, ey] = this.spec.eye;
			this.eyes = [-1, 1].map((s) => A.add(scene, 'bp-eye', s * ex, ey));
			this.pupils = [-1, 1].map((s) => A.add(scene, 'bp-pupil', s * ex, ey));
			this.brows = [-1, 1].map((s) => A.add(scene, 'bp-brow', s * ex, ey - 34));
			const [mx, my] = this.spec.mouth;
			this.mouth = A.add(scene, 'bp-m-smile', mx, my);
			H.add([...this.eyes, ...this.pupils, ...this.brows, this.mouth]);
			if (this.spec.beak) {
				this.mouth.setVisible(false);
				this.beak = A.add(scene, 'bp-beak-0', mx, my);
				H.add(this.beak);
			}
			this.armL = part('arm', -R.shoulder[0], R.shoulder[1]);
			this.armR = part('arm', R.shoulder[0], R.shoulder[1]);
			g.add([this.armL, this.armR]);
			this.over = []; // paint, wigs and hats from the last pop
			// feelings and moves
			this.base = 'idle';
			this.tmp = null;
			this.tmpT = 0;
			this.act = null;
			this.actT = 0;
			this.actDur = 1;
			this.blink = 1 + Math.random() * 3;
			this.wide = 1;
			this.aL = 0.25;
			this.aR = -0.25;
			this.earKick = 0;
			this.kx = 0;
			this.ky = 0;
			this.tilt = 0;
			this.look = null;
			this.lookT = 0;
			this.tearT = 0;
			this.teaseI = Math.floor(Math.random() * 5);
			this.teaseAt = 0;
			this.shield = null;
			this.setPerson(person);
		}

		// which seat (colour) this buddy plays for; null = nobody picked it yet
		setPerson(person) {
			this.person = person;
			this.color = person ? person.color : '#ffffff';
			this.tint = BP.Art.num(this.color);
			this.scarf.setVisible(!!person);
			if (person) this.scarf.setTexture(`bp-scarf-${person.id}`);
		}

		get x() {
			return this.c.x;
		}

		get y() {
			return this.c.y;
		}

		// the middle of the buddy: what you tap, and where effects happen
		get mid() {
			return {x: this.seat.x, y: this.seat.y - 100 * this.scale};
		}

		get face() {
			return {x: this.c.x, y: this.c.y - 150 * this.scale};
		}

		get busy() {
			return !!(this.obj || this.incoming);
		}

		setBase(name) {
			this.base = name;
		}

		setExpr(name, seconds = 1) {
			this.tmp = name;
			this.tmpT = seconds;
		}

		start(act, seconds) {
			this.act = act;
			this.actT = 0;
			this.actDur = seconds;
		}

		jump(height = 44, seconds = 0.46) {
			if (this.act === 'spin' || this.act === 'fall') return;
			this.jumpH = height;
			this.start('jump', seconds);
			this.earKick = 0.5;
		}

		dance(seconds = 1.6) {
			this.start('dance', seconds);
		}

		hide(seconds = 1.2) {
			this.start('hide', seconds);
			this.setExpr('hide', seconds);
		}

		spin(seconds = 1.5) {
			this.start('spin', seconds);
		}

		// stiff as a board, then timber!
		fall(seconds = 2) {
			this.start('fall', seconds);
		}

		// pushed back by a pop, then springs home
		knock(dx, dy) {
			const tw = this.scene.tweens;
			tw.killTweensOf(this);
			this.kx = dx;
			this.ky = dy;
			tw.add({targets: this, kx: 0, ky: 0, duration: 700, ease: 'Elastic.easeOut', easeParams: [1.1, 0.4]});
			this.earKick = 0.8;
		}

		throwAt(x, y) {
			this.aim = Math.atan2(-(x - this.c.x), y - (this.c.y - 94 * this.scale));
			this.start('throw', 0.32);
		}

		// caught it! a little hop; the later the catch, the bigger the fright
		caught(stage) {
			this.jump(stage > 2 ? 34 : 20, 0.3);
			if (stage > 2) {
				this.setExpr('shock', 0.5);
				BP.Sound.sfx.gasp(this.spec.pitch);
			} else {
				this.setExpr('happy', 0.45);
			}
		}

		// a different silly move every time; returns its name
		tease() {
			const kind = ['tongue', 'dance', 'jump', 'hide', 'laugh'][this.teaseI++ % 5];
			const S = BP.Sound.sfx;
			if (kind === 'tongue') {
				this.setExpr('tease', 1);
				this.tilt = 0.22;
				S.raspberry();
			} else if (kind === 'dance') {
				this.dance(1.3);
				this.setExpr('cheer', 1.3);
				S.cheer();
			} else if (kind === 'jump') {
				this.jump(70, 0.55);
				this.setExpr('happy', 0.8);
				S.yip(this.spec.pitch);
			} else if (kind === 'hide') {
				this.hide(1.1);
				S.gasp(this.spec.pitch);
			} else {
				this.setExpr('laugh', 1.2);
				S.laugh(this.spec.pitch);
			}

			return kind;
		}

		glance(x, y, seconds = 0.9) {
			this.look = {x, y};
			this.lookT = seconds;
		}

		/* ---------- things that land on the head after a pop ---------- */
		wear(key, x, y, {tint, behind = false, scale = 1, angle = 0} = {}) {
			const img = BP.Art.add(this.scene, key, x, y).setAngle(angle);
			if (tint !== undefined) img.setTint(tint);
			if (behind) this.H.addAt(img, 0);
			else this.H.add(img);
			img.full = scale;
			BP.Art.sc(img, 0.05);
			this.scene.tweens.add({targets: img, scale: this.scene.k * scale, duration: 420, ease: 'Back.easeOut', easeParams: [2.4]});
			this.over.push(img);

			return img;
		}

		// tidy up before the next round
		clean() {
			this.over.forEach((img) => this.scene.tweens.add({targets: img, scale: 0, duration: 200, ease: 'Back.easeIn', onComplete: () => img.destroy()}));
			this.over = [];
			this.wideBoost = 0;
			if (this.act === 'spin' || this.act === 'fall' || this.act === 'dance') this.act = null;
			this.tmpT = 0;
		}

		giveShield() {
			if (this.shield) return;
			this.shield = BP.Art.add(this.scene, 'bp-shield', 0, -108);
			this.c.add(this.shield);
			BP.Art.sc(this.shield, 0.1);
			this.scene.tweens.add({targets: this.shield, scale: this.scene.k * 0.98, duration: 500, ease: 'Back.easeOut'});
		}

		popShield() {
			const s = this.shield;
			if (!s) return;
			this.shield = null;
			this.scene.tweens.add({targets: s, scale: this.scene.k * 1.5, alpha: 0, duration: 260, onComplete: () => s.destroy()});
		}

		// where a hand is right now, in the world (the balloon's string ends here)
		hand(side) {
			const R = BP.Art.RIG;
			const a = side < 0 ? this.aL : this.aR;
			const sx = side * R.shoulder[0] * (this.g.scaleX || 1);
			const sy = R.shoulder[1];

			return {x: this.c.x + (sx - Math.sin(a) * 70) * this.scale, y: this.c.y + (sy + Math.cos(a) * 70) * this.scale};
		}

		update(dt, t) {
			const A = BP.Art;
			const R = A.RIG;
			if (this.tmpT > 0) this.tmpT -= dt;
			const name = this.tmpT > 0 ? this.tmp : this.base;
			const E = EXPR[name] || EXPR.idle;
			const tt = t + this.phase;
			// a new feeling arrives with a little squash of the whole head, so faces never just switch
			if (name !== this.shownExpr) {
				this.shownExpr = name;
				this.facePop = 1;
			}
			this.facePop = (this.facePop || 0) * Math.pow(0.0006, dt);

			/* the move it is doing */
			let yOff = 0;
			let sx = 1;
			let sy = 1 + Math.sin(tt * 2.3) * 0.014; // breathing
			let rot = Math.sin(tt * 1.1) * 0.012;
			let arms = E.arms || (this.obj ? 'hold' : 'hang');
			if (this.act) {
				this.actT += dt;
				const p = Math.min(1, this.actT / this.actDur);
				if (this.act === 'jump') {
					yOff = -Math.sin(p * Math.PI) * this.jumpH;
					const squash = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 0;
					const air = Math.sin(p * Math.PI);
					sx = 1 + squash * 0.1 - air * 0.06;
					sy = 1 - squash * 0.12 + air * 0.08;
					if (!this.obj) arms = 'up';
				} else if (this.act === 'dance') {
					rot = Math.sin(this.actT * 11) * 0.16;
					yOff = -Math.abs(Math.sin(this.actT * 11)) * 16;
					if (!this.obj) arms = 'wave';
				} else if (this.act === 'hide') {
					const d = Math.min(1, p * 6, (1 - p) * 6);
					sy = 1 - d * 0.36;
					sx = 1 + d * 0.14;
					arms = 'cover';
				} else if (this.act === 'spin') {
					sx = Math.cos(this.actT * 15);
					if (Math.abs(sx) < 0.12) sx = 0.12 * Math.sign(sx || 1);
					yOff = -Math.sin(p * Math.PI) * 26;
					arms = 'up';
				} else if (this.act === 'fall') {
					const d = p < 0.3 ? 0 : p < 0.5 ? (p - 0.3) / 0.2 : p < 0.8 ? 1 : (1 - p) / 0.2;
					rot = d * d * 1.25;
					arms = 'stiff';
				} else if (this.act === 'throw') {
					arms = 'throw';
					sx = 1 + Math.sin(p * Math.PI) * 0.06;
				}
				if (p >= 1) {
					if (this.act === 'spin') this.setExpr('dizzy', 1.6);
					this.act = null;
				}
			}
			if (E.bob) yOff -= Math.abs(Math.sin(tt * 13)) * 7 * E.bob;
			if (E.sway) rot += Math.sin(tt * 6) * 0.14;
			const shake = E.shake || 0;
			const jx = shake ? (Math.sin(tt * 58) + Math.sin(tt * 36.4)) * shake * 0.6 : 0; // a shiver, not a flicker
			this.c.setPosition(this.seat.x + this.kx + jx, this.seat.y + this.ky + yOff);
			this.g.setScale(sx, sy);
			this.g.rotation = rot;
			this.shadow.setAlpha(1 + yOff / 140);
			this.tilt *= Math.pow(0.02, dt);
			this.H.rotation = this.tilt + Math.sin(tt * 1.7) * 0.02 + (E.bob ? Math.sin(tt * 13) * 0.05 : 0);
			this.H.y = R.head[1] + Math.sin(tt * 2.3 + 0.6) * 1.2;
			this.H.setScale(1 + this.facePop * 0.09, 1 - this.facePop * 0.07);

			/* eyes */
			this.blink -= dt;
			if (this.blink < -0.12) this.blink = 1.4 + Math.random() * 3.6;
			const open = E.eye === 'open';
			const wide = Math.min(1.75, (E.wide || 1) + (this.wideBoost || 0));
			const shut = open && this.blink < 0 && wide < 1.2; // eyes wide with fright do not blink
			this.wide = lerp(this.wide, wide, Math.min(1, dt * 14));
			const key = open ? 'bp-eye' : `bp-eye-${E.eye}`;
			let lx = 0;
			let ly = 0;
			if (this.lookT > 0) this.lookT -= dt;
			const target = this.lookT > 0 ? this.look : this.focus;
			if (target) {
				const f = this.face;
				const dx = target.x - f.x;
				const dy = target.y - f.y;
				const d = Math.hypot(dx, dy) || 1;
				const reach = Math.min(7.5, d / 30);
				lx = (dx / d) * reach;
				ly = (dy / d) * reach;
			}
			const [ex, ey] = this.spec.eye;
			this.eyes.forEach((eye, i) => {
				const s = i ? 1 : -1;
				if (eye.texture.key !== key) A.swap(eye, key);
				const winking = E.wink && i === 1;
				const lid = shut || winking ? 0.1 : E.lid || 1;
				A.sc(eye, (open ? this.wide : 1) * (E.eye === 'squeeze' ? -s : 1), (open ? this.wide : 1) * lid);
				const pupil = this.pupils[i];
				pupil.setVisible(open && lid > 0.5 && !winking);
				A.sc(pupil, E.pupil || 1);
				pupil.setPosition(s * ex + lx, ey + ly + (E.lid ? 3 : 0));
				const brow = this.brows[i];
				brow.rotation = s * (E.brow || 0); // inner ends up when worried
				brow.y = ey - 30 - (E.raise || 0) - (this.wide - 1) * 22;
			});

			/* mouth (the chick has a beak that opens instead) */
			if (this.beak) {
				const bk = OPEN_BEAK[E.mouth] ? 'bp-beak-1' : 'bp-beak-0';
				if (this.beak.texture.key !== bk) A.swap(this.beak, bk);
				A.sc(this.beak, 1, 1 + (OPEN_BEAK[E.mouth] && E.bob ? Math.sin(tt * 13) * 0.12 : 0));
			} else {
				const mk = `bp-m-${E.mouth}`;
				if (this.mouth.texture.key !== mk) A.swap(this.mouth, mk);
				const ms = this.spec.mouthScale || 1;
				A.sc(this.mouth, ms, ms * (E.bob ? 1 + Math.sin(tt * 13) * 0.1 : 1));
			}

			/* ears flop a beat behind the body */
			this.earKick *= Math.pow(0.01, dt);
			this.ears.forEach((ear, i) => {
				const s = this.ears.length === 1 ? 1 : i ? 1 : -1;
				const droop = name === 'cry' || name === 'sad' ? 0.5 : name === 'shock' || name === 'terror' ? -0.12 : 0;
				ear.rotation = ear.base + s * (droop + Math.sin(tt * 1.6 + i) * 0.04 + this.earKick * Math.sin(tt * 22) * 0.3) + shake * 0.01 * Math.sin(tt * 40);
			});

			/* arms */
			let tl;
			let tr;
			const sh = R.shoulder;
			const toward = (px, py, side) => Math.atan2(-(px - side * sh[0]), py - sh[1]);
			if (arms === 'hold' && this.obj) {
				const ox = (this.obj.x - this.c.x) / this.scale;
				const oy = (this.obj.y - this.c.y) / this.scale;
				tl = toward(ox, oy, -1);
				tr = toward(ox, oy, 1);
			} else if (arms === 'up') {
				tl = 2.55 + Math.sin(tt * 9) * 0.14;
				tr = -2.55 - Math.sin(tt * 9 + 1) * 0.14;
			} else if (arms === 'wave') {
				tl = 2.3 + Math.sin(this.actT * 11) * 0.5;
				tr = -2.3 + Math.sin(this.actT * 11) * 0.5;
			} else if (arms === 'cover') {
				tl = toward(-20, R.head[1] + ey - 6, -1);
				tr = toward(20, R.head[1] + ey - 6, 1);
			} else if (arms === 'stiff') {
				tl = 0.05;
				tr = -0.05;
			} else if (arms === 'throw') {
				const p = Math.min(1, this.actT / this.actDur);
				const swing = Math.sin(p * Math.PI) * 0.5;
				tl = this.aim + swing;
				tr = this.aim - swing;
			} else {
				tl = 0.26 + Math.sin(tt * 2.1) * 0.05;
				tr = -0.26 - Math.sin(tt * 2.1 + 0.8) * 0.05;
			}
			const turn = (from, to) => {
				let d = to - from;
				while (d > Math.PI) d -= Math.PI * 2;
				while (d < -Math.PI) d += Math.PI * 2;

				return from + d * Math.min(1, dt * 16);
			};
			this.aL = turn(this.aL, tl);
			this.aR = turn(this.aR, tr);
			this.armL.rotation = this.aL;
			this.armR.rotation = this.aR;
			// feet tap when dancing or in a panic
			const tap = this.act === 'dance' ? Math.sin(this.actT * 11) * 6 : shake ? Math.sin(tt * 30) * 2 : 0;
			this.footL.y = R.foot[1] - Math.max(0, tap);
			this.footR.y = R.foot[1] - Math.max(0, -tap);
			if (this.tail) this.tail.rotation = Math.sin(tt * (shake ? 14 : 2.6)) * (shake ? 0.2 : 0.12);

			/* crying: two fountains of tears */
			if (E.tears) {
				this.tearT -= dt;
				if (this.tearT <= 0) {
					this.tearT = 0.07;
					const f = this.face;
					this.scene.fx.burst('drop', f.x - ex * this.scale, f.y + ey * this.scale, 1);
					this.scene.fx.burst('drop', f.x + ex * this.scale, f.y + ey * this.scale, 1);
				}
			}
			if (this.shield) this.shield.setAlpha(0.8 + Math.sin(tt * 4) * 0.2).setAngle(tt * 20);
		}

		destroy() {
			this.c.destroy();
			this.shadow.destroy();
		}
	}

	/* ---------- the players of a match ---------- */
	class Players {
		// list: [{sp, person, bot}] in seat order
		constructor(scene, L, list, {buttons = true} = {}) {
			const A = BP.Art;
			this.scene = scene;
			this.L = L;
			this.dir = 1; // which way round a plain "pass" goes
			this.list = list.map((p, i) => {
				const seat = L.seats[i];
				const b = new Buddy(scene, {sp: p.sp, idx: i, person: p.person, seat, bot: p.bot});
				b.halo = A.add(scene, 'bp-glow', seat.x, seat.y - 96).setTint(b.tint).setAlpha(0.42).setDepth(20).setBlendMode('ADD');
				A.sc(b.halo, 2.5);
				b.podium = A.add(scene, `bp-podium-${p.person.id}`, seat.x, seat.y + 6).setDepth(50);
				// the pop count, on the front of the podium
				b.popIcon = A.add(scene, 'bp-pop', seat.x - 16, seat.y + 52).setDepth(52);
				A.sc(b.popIcon, 0.8);
				b.popText = scene.add.text(seat.x + 12, seat.y + 51, scene.num(0), {fontFamily: 'Fredoka, "Baloo Bhaijaan 2", sans-serif', fontSize: '30px', fontStyle: '700', color: '#ffffff', stroke: A.INK, strokeThickness: 6, resolution: BP.Z}).setOrigin(0.5).setDepth(52);
				[b.popIcon, b.popText].forEach((o) => o.setVisible(false)); // nothing to count yet
				// the prank button, on the outer side of the podium
				b.prank = {x: seat.x + seat.side * 164, y: seat.y - 4};
				if (buttons && !p.bot) {
					b.prankBtn = A.add(scene, `bp-prank-${p.person.id}`, b.prank.x, b.prank.y).setDepth(55);
				} else {
					b.prank = null;
				}

				return b;
			});
			// clockwise round the middle
			const ang = (b) => Math.atan2(b.seat.y - 105 - L.center.y, b.seat.x - L.center.x);
			this.order = this.list.slice().sort((a, b) => ang(a) - ang(b));
		}

		// the next buddy round the circle who can take it
		next(from, ok = (b) => !b.busy) {
			const n = this.order.length;
			const i = this.order.indexOf(from);
			for (let s = 1; s < n; s++) {
				const b = this.order[(i + this.dir * s + n * n) % n];
				if (ok(b)) return b;
			}

			return null;
		}

		random(not, ok = (b) => !b.busy) {
			const free = this.list.filter((b) => b !== not && ok(b));

			return free.length ? free[Math.floor(Math.random() * free.length)] : null;
		}

		// whose prank button is under the finger?
		prankAt(x, y) {
			return this.list.find((b) => b.prank && Math.hypot(x - b.prank.x, y - b.prank.y) < 62) || null;
		}

		// whose buddy is under the finger? (a generous circle: little fingers are not precise)
		at(x, y) {
			let best = null;
			let bestD = 150;
			for (const b of this.list) {
				const m = b.mid;
				const d = Math.hypot(x - m.x, (y - m.y) * 0.8);
				if (d < bestD) {
					best = b;
					bestD = d;
				}
			}

			return best;
		}

		setPops(b, n) {
			b.popText.setText(this.scene.num(n));
			[b.popIcon, b.popText].forEach((o) => o.setVisible(true));
			this.scene.tweens.add({targets: [b.popText, b.popIcon], scale: '*=1.7', duration: 160, yoyo: true, ease: 'Quad.easeOut'});
		}

		pressPrank(b) {
			if (b.prankBtn) this.scene.tweens.add({targets: b.prankBtn, scale: this.scene.k * 0.82, duration: 70, yoyo: true});
		}

		update(dt, t) {
			for (const b of this.list) b.update(dt, t);
		}
	}

	BP.Buddy = Buddy;
	BP.Players = Players;
	BP.EXPR = EXPR;
})();
