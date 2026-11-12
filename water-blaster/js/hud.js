/* Water Blaster Arena: what everyone sees around the play (the gameplay HUD).
   - Each corner: the player's face sticker inside a wetness ring that fills with water (blue, orange, red and
     shaking when nearly soaked), the wet % in a pill, and a star for every round they have won. A soaked player's
     badge turns into a swim ring. Corners across the table are turned around, so everybody reads their own.
   - The water button wears a ring that shows how much water is left; when it runs dry, an arrow over the
     splasher points to the nearest tap.
   - Over the pool: the round number, who is still dry (faces), and the current surprise with its timer.
   - Announcements as big cards (a second one faces the players at the top), the ready check and 3 · 2 · 1. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const INK = 0x163552;
	const line = (text) => (WB.Sound.state.lang === 'ar' ? `‫${text}‬` : text);
	const font = () => (WB.Sound.state.lang === 'ar' ? '"Baloo Bhaijaan 2", Fredoka, sans-serif' : 'Fredoka, "Baloo Bhaijaan 2", sans-serif');
	const num = (n) => (WB.Sound.state.lang === 'ar' ? Number(n).toLocaleString('ar-EG') : String(n));

	class Hud {
		constructor(scene, L, fighters, k, Z, round) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.Z = Z;
			this.fighters = fighters;
			this.top = fighters.some((f) => f.top);
			const txt = (size, extra = {}) =>
				scene.add.text(0, 0, '', {fontFamily: font(), fontSize: `${size}px`, fontStyle: '800', color: '#ffffff', stroke: '#163552', strokeThickness: Math.round(size / 5), padding: {x: Math.round(size / 5), y: Math.round(size / 5)}, resolution: Z, ...extra}).setOrigin(0.5);
			this.txt = txt;

			// corners
			this.corners = fighters.map((f) => {
				const c = L.corners[f.slot];
				const g = scene.add.graphics().setDepth(9500);
				const faceKey = scene.textures.exists(`sticker-${f.player.id}`) ? `sticker-${f.player.id}` : 'bot-face';
				const face = scene.add.image(c.avatar.x, c.avatar.y, faceKey).setDepth(9501);
				const src = scene.textures.get(faceKey).getSourceImage();
				face.setScale((faceKey === 'bot-face' ? 104 : 74) / Math.max(src.width, src.height));
				if (faceKey === 'bot-face') face.setOrigin(0.5, 0.42);
				if (c.top) face.setRotation(Math.PI);
				const ring = scene.add.image(c.avatar.x, c.avatar.y, `float-${f.player.id}`).setScale(k * 0.9).setDepth(9502).setVisible(false);
				const pillAt = c.at([128, 230]);
				const pill = scene.add.graphics().setDepth(9502);
				const pct = txt(32).setPosition(pillAt.x, pillAt.y).setDepth(9503).setRotation(c.top ? Math.PI : 0);
				const stars = scene.add.container(0, 0).setDepth(9503);
				const arrow = scene.add.image(0, 0, `arrow-${f.player.id}`).setScale(k * 0.9).setDepth(8700).setVisible(false);

				return {f, c, g, face, ring, pill, pct, pillAt, stars, arrow, shown: -1, wins: -1};
			});

			// over the pool: round + who is still dry + the current surprise
			const P = L.pool;
			this.roundY = P.y - P.ry - 52;
			this.roundBg = scene.add.graphics().setDepth(9400);
			this.roundTxt = txt(26).setDepth(9401);
			this.roundFaces = fighters.map((f) => {
				const key = scene.textures.exists(`sticker-${f.player.id}`) ? `sticker-${f.player.id}` : 'bot-face';
				const img = scene.add.image(0, 0, key).setDepth(9402);
				const src = scene.textures.get(key).getSourceImage();
				img.setScale((key === 'bot-face' ? 46 : 34) / Math.max(src.width, src.height));
				if (key === 'bot-face') img.setOrigin(0.5, 0.42);

				return img;
			});
			this.round = round;
			this.layoutRound();

			this.evBg = scene.add.graphics().setDepth(9400);
			this.evIcon = scene.add.image(P.x, P.y + P.ry + 56, 'bottle').setDepth(9401).setVisible(false);
			this.ev = null;

			// announcement cards (one for the bottom, one turned around for the top)
			this.cards = (this.top ? [false, true] : [false]).map((flip) => {
				const y = flip ? 250 : L.H - 250;
				const ct = scene.add.container(P.x, y).setDepth(9800).setVisible(false).setRotation(flip ? Math.PI : 0);
				const bg = scene.add.graphics();
				const ic = scene.add.image(0, 0, 'bottle').setScale(k);
				const tx = txt(46);
				ct.add([bg, ic, tx]);

				return {ct, bg, ic, tx};
			});
		}

		layoutRound() {
			const P = this.L.pool;
			const s = this.scene;
			const label = line(WB.WORD('round').replace('{n}', num(this.round)));
			this.roundTxt.setFontFamily(font()).setText(label);
			const alive = this.fighters.length;
			const w = this.roundTxt.width + alive * 42 + 40;
			const x0 = P.x - w / 2;
			const y = this.roundY;
			const g = this.roundBg;
			g.clear();
			g.fillStyle(0x000000, 0.18).fillRoundedRect(x0, y - 26 + 5, w, 52, 26);
			g.fillStyle(0xffffff, 0.96).fillRoundedRect(x0, y - 26, w, 52, 26);
			g.lineStyle(4, INK, 1).strokeRoundedRect(x0, y - 26, w, 52, 26);
			const rtl = WB.Sound.state.lang === 'ar';
			const tx = rtl ? x0 + w - 20 - this.roundTxt.width / 2 : x0 + 20 + this.roundTxt.width / 2;
			this.roundTxt.setPosition(tx, y - 2).setColor('#1f86d6');
			this.roundFaces.forEach((img, i) => {
				const fx = rtl ? x0 + 30 + i * 42 : x0 + 20 + this.roundTxt.width + 22 + i * 42;
				img.setPosition(fx, y);
			});
			s.children.bringToTop(this.roundTxt);
		}

		/* ---------- every frame ---------- */
		update(time) {
			const s = this.scene;
			this.corners.forEach((o) => {
				const {f, c, g} = o;
				const w = Math.round(f.wet);
				// the wetness ring round the face
				const crit = f.wet >= 75 && !f.out;
				const shake = crit ? Math.sin(time * 40) * 2 : 0;
				const ax = c.avatar.x + shake;
				const ay = c.avatar.y;
				const col = f.wet < 50 ? 0x3ec5ff : f.wet < 75 ? 0xffa53d : 0xff4757;
				g.clear();
				g.fillStyle(0x000000, 0.18).fillCircle(ax, ay + 5, 54);
				g.fillStyle(f.out ? 0xbfe6f5 : 0xffffff, 1).fillCircle(ax, ay, 54);
				g.lineStyle(12, 0xd6eef7, 1).strokeCircle(ax, ay, 46);
				if (w > 0) {
					g.lineStyle(12, f.out ? 0x7fb8d0 : col, 1).beginPath();
					const a0 = c.top ? Math.PI / 2 : -Math.PI / 2;
					g.arc(ax, ay, 46, a0, a0 + (Math.PI * 2 * w) / 100);
					g.strokePath();
				}
				g.lineStyle(4, f.color, 1).strokeCircle(ax, ay, 54);
				g.lineStyle(3, INK, 1).strokeCircle(ax, ay, 57);
				if (crit) g.lineStyle(4, 0xff4757, 0.4 + 0.6 * Math.abs(Math.sin(time * 9))).strokeCircle(ax, ay, 64);
				o.face.setPosition(ax, ay).setAlpha(f.out ? 0.55 : 1);
				o.ring.setVisible(f.out).setPosition(ax, ay + (c.top ? -26 : 26)).setRotation(c.top ? Math.PI : 0);
				// the % pill
				if (o.shown !== w) {
					o.shown = w;
					o.pct.setFontFamily(font()).setText(line(`${num(w)}${WB.Sound.state.lang === 'ar' ? '٪' : '%'}`));
					const pw = Math.max(96, o.pct.width + 30);
					const {x, y} = o.pillAt;
					o.pill.clear();
					o.pill.fillStyle(0x000000, 0.2).fillRoundedRect(x - pw / 2, y - 24 + 5, pw, 48, 24);
					o.pill.fillStyle(f.out ? 0x7fb8d0 : col, 1).fillRoundedRect(x - pw / 2, y - 24, pw, 48, 24);
					o.pill.lineStyle(3, INK, 1).strokeRoundedRect(x - pw / 2, y - 24, pw, 48, 24);
				}
				o.pct.setScale(crit ? 1 + Math.abs(Math.sin(time * 9)) * 0.1 : 1);
				// stars for rounds won
				if (o.wins !== f.wins) {
					o.wins = f.wins;
					o.stars.removeAll(true);
					const n = Math.min(f.wins, 5);
					for (let i = 0; i < n; i++) {
						const p = c.at([30 + i * 34, 318]);
						o.stars.add(s.add.image(p.x, p.y, 'star').setScale(this.k));
					}
					if (f.wins > 5) {
						const p = c.at([30 + 5 * 34 + 12, 318]);
						o.stars.add(this.txt(24).setText(`+${num(f.wins - 5)}`).setPosition(p.x, p.y).setRotation(c.top ? Math.PI : 0));
					}
				}
				// the tank ring on the water button
				const pad = s.input2 && s.input2.pads.find((p) => p.fighter === f);
				if (pad) {
					const tg = pad.tank;
					const b = c.button;
					const low = f.tank < 20;
					tg.clear();
					tg.lineStyle(14, INK, 1).strokeCircle(b.x, b.y, 72);
					tg.lineStyle(9, 0xd6eef7, 1).strokeCircle(b.x, b.y, 72);
					if (f.tank > 0.5) {
						tg.lineStyle(9, low ? (Math.sin(time * 12) > 0 ? 0xff4757 : 0xffa53d) : 0x3ec5ff, 1).beginPath();
						const a0 = c.top ? Math.PI / 2 : -Math.PI / 2;
						tg.arc(b.x, b.y, 72, a0, a0 + (Math.PI * 2 * f.tank) / 100);
						tg.strokePath();
					}
					pad.btn.setAlpha(f.out ? 0.35 : 1);
					pad.btnIcon.setAlpha(f.out ? 0.35 : f.tank < 1 ? 0.5 + 0.5 * Math.abs(Math.sin(time * 6)) : 1);
				}
				// empty: an arrow over the splasher points to the nearest tap
				const show = !f.out && f.tank < 12 && !f.bot && s.state === 'play';
				o.arrow.setVisible(show);
				if (show) {
					const tap = this.L.taps.reduce((a, b) => (Math.hypot(a.x - f.x, a.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? a : b));
					const a = Math.atan2(tap.y - f.y, tap.x - f.x);
					const bounce = Math.sin(time * 8) * 8;
					o.arrow.setPosition(f.x + Math.cos(a) * (70 + bounce), f.y - 60 + Math.sin(a) * (70 + bounce)).setRotation(a);
				}
			});
			this.roundFaces.forEach((img, i) => img.setAlpha(this.fighters[i].out ? 0.25 : 1));
			this.drawEvent(time);
		}

		/* ---------- the current surprise ---------- */
		event(key, icon, dur) {
			this.ev = key ? {key, dur, start: this.scene.time.now / 1000} : null;
			this.evIcon.setVisible(!!key);
			if (key) {
				this.evIcon.setTexture(icon);
				const src = this.scene.textures.get(icon).getSourceImage();
				this.evIcon.setScale(52 / Math.max(src.width, src.height));
			} else {
				this.evBg.clear();
			}
		}

		drawEvent(time) {
			if (!this.ev) return;
			const P = this.L.pool;
			const x = P.x;
			const y = P.y + P.ry + 56;
			const f = Math.max(0, 1 - (time - this.ev.start) / this.ev.dur);
			const g = this.evBg;
			g.clear();
			g.fillStyle(0x000000, 0.18).fillCircle(x, y + 5, 40);
			g.fillStyle(0xffffff, 1).fillCircle(x, y, 40);
			g.lineStyle(7, 0xd6eef7, 1).strokeCircle(x, y, 33);
			g.lineStyle(7, 0xff9417, 1).beginPath().arc(x, y, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f).strokePath();
			g.lineStyle(3, INK, 1).strokeCircle(x, y, 40);
			this.evIcon.setPosition(x, y + Math.sin(time * 6) * 2);
		}

		/* ---------- announcements ---------- */
		announce(text, iconKey) {
			const s = this.scene;
			this.cards.forEach(({ct, bg, ic, tx}) => {
				s.tweens.killTweensOf(ct);
				tx.setFontFamily(font()).setFontSize(46).setText(line(text));
				const room = Math.min(760, this.L.W - 640) - (iconKey ? 130 : 70);
				if (tx.width > room) tx.setFontSize(Math.floor((46 * room) / tx.width));
				const tw = tx.width;
				const hasIcon = !!iconKey;
				if (hasIcon) {
					ic.setTexture(iconKey).setVisible(true);
					const src = s.textures.get(iconKey).getSourceImage();
					ic.setScale(64 / Math.max(src.width, src.height));
				} else {
					ic.setVisible(false);
				}
				const w = tw + (hasIcon ? 130 : 70);
				const h = 96;
				bg.clear();
				bg.fillStyle(0x000000, 0.22).fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 34);
				bg.fillStyle(0xf2fbff, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, 34);
				bg.lineStyle(5, INK, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
				const rtl = WB.Sound.state.lang === 'ar';
				ic.setPosition((rtl ? 1 : -1) * (w / 2 - 54), 0);
				tx.setPosition(hasIcon ? (rtl ? -32 : 32) : 0, -3).setColor('#ffffff');
				ct.setVisible(true).setScale(0.3).setAlpha(1);
				s.tweens.add({targets: ct, scale: 1, duration: 420, ease: 'Back.easeOut'});
				s.tweens.add({targets: ct, alpha: 0, scale: 0.85, delay: 2100, duration: 380, ease: 'Quad.easeIn', onComplete: () => ct.setVisible(false)});
			});
		}

		/* ---------- ready check ---------- */
		showReady(pads) {
			const s = this.scene;
			this.ready = pads.map((p) => {
				const c = p.corner;
				const ring = s.add.image(c.button.x, c.button.y, `ring-${p.fighter.player.id}`).setScale(this.k * 1.2).setDepth(9004);
				s.tweens.add({targets: ring, scale: this.k * 1.6, alpha: {from: 1, to: 0}, duration: 900, repeat: -1});
				const a = Math.atan2(c.button.y - c.cy, c.button.x - c.cx);
				const ox = Math.cos(a);
				const oy = Math.sin(a);
				const arrow = s.add.image(c.button.x + ox * 122, c.button.y + oy * 122, `arrow-${p.fighter.player.id}`).setScale(this.k).setDepth(9004).setRotation(a + Math.PI);
				s.tweens.add({targets: arrow, x: arrow.x - ox * 26, y: arrow.y - oy * 26, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});

				return {pad: p, ring, arrow, done: false, check: null};
			});
		}

		markReady(slot) {
			const r = this.ready && this.ready.find((q) => q.pad.slot === slot);
			if (!r || r.done) return false;
			r.done = true;
			const s = this.scene;
			s.tweens.killTweensOf([r.ring, r.arrow]);
			r.ring.destroy();
			r.arrow.destroy();
			const c = r.pad.corner;
			const check = this.txt(64).setText('✓').setPosition(c.avatar.x, c.avatar.y).setDepth(9600).setColor('#34c759').setScale(0);
			s.tweens.add({targets: check, scale: 1, duration: 380, ease: 'Back.easeOut'});
			r.check = check;

			return true;
		}

		get allReady() {
			return !this.ready || this.ready.every((r) => r.done);
		}

		hideReady() {
			if (!this.ready) return;
			this.ready.forEach((r) => {
				this.scene.tweens.killTweensOf([r.ring, r.arrow]);
				if (!r.done) {
					r.ring.destroy();
					r.arrow.destroy();
				}
				if (r.check) this.scene.tweens.add({targets: r.check, alpha: 0, duration: 300, onComplete: () => r.check.destroy()});
			});
			this.ready = null;
		}

		/* ---------- 3 · 2 · 1 · SPLASH ---------- */
		countdown(text) {
			const P = this.L.pool;
			(this.top ? [false, true] : [false]).forEach((flip) => {
				const t = this.txt(130).setText(line(text)).setPosition(P.x, flip ? P.y - 34 : P.y + 34).setDepth(9900).setRotation(flip ? Math.PI : 0).setScale(0.2);
				if (this.top) t.setFontSize(96);
				this.scene.tweens.add({targets: t, scale: 1, duration: 300, ease: 'Back.easeOut'});
				this.scene.tweens.add({targets: t, alpha: 0, scale: 1.4, delay: 600, duration: 300, onComplete: () => t.destroy()});
			});
		}

		// a big word over a splasher (TOTALLY SOAKED!), facing whoever sits on that side
		shout(f, text, color = '#ffffff') {
			const t = this.txt(54).setText(line(text)).setPosition(f.x, f.y - 210).setDepth(9700).setColor(color).setRotation(f.top ? Math.PI : 0).setScale(0.2);
			this.scene.tweens.add({targets: t, scale: 1, angle: f.top ? 180 + 4 : -4, duration: 360, ease: 'Back.easeOut'});
			this.scene.tweens.add({targets: t, y: t.y - 40, alpha: 0, delay: 1500, duration: 500, onComplete: () => t.destroy()});
		}
	}

	WB.Hud = Hud;
})();
