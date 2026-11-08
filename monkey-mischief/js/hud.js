/* Monkey Mischief: what everyone sees around the play.
   - The jungle clock on the island in the middle: a ring that empties; the last 10 seconds as big numbers.
   - Each corner: the player's face sticker and their banana count (upside down for the two players
     sitting across the table, so everybody reads their own).
   - Announcements ("Coconut rain!") as a big card; when someone sits at the top, a second card faces them.
   - The ready check: every player presses their own button, gets a ✓, and the countdown starts. */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const INK = 0x3b2416;

	const font = () => (MM.Sound.state.lang === 'ar' ? '"Baloo Bhaijaan 2", Fredoka, sans-serif' : 'Fredoka, "Baloo Bhaijaan 2", sans-serif');

	class Hud {
		constructor(scene, L, monkeys, k, Z) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.Z = Z;
			this.monkeys = monkeys;
			this.top = monkeys.some((m) => m.top);
			const txt = (size, extra = {}) =>
				scene.add.text(0, 0, '', {fontFamily: font(), fontSize: `${size}px`, fontStyle: '800', color: '#ffffff', stroke: '#3b2416', strokeThickness: Math.round(size / 5), resolution: Z, rtl: MM.Sound.state.lang === 'ar', ...extra}).setOrigin(0.5);
			this.txt = txt;

			// the jungle clock
			const P = L.pond;
			this.clock = scene.add.graphics().setDepth(P.y + 2);
			this.clockIcon = scene.add.image(P.x, P.y - 4, 'banana').setScale(k * 1.15).setDepth(P.y + 3);
			this.clockNums = [txt(56), txt(56)];
			this.clockNums.forEach((t, i) => t.setPosition(P.x, P.y + (this.top ? (i ? -24 : 24) : 0)).setRotation(i ? Math.PI : 0).setDepth(P.y + 4).setVisible(false));

			// corners
			this.corners = monkeys.map((m) => {
				const c = L.corners[m.slot];
				const g = scene.add.graphics().setDepth(9500);
				const faceKey = scene.textures.exists(`face-${m.player.id}`) ? `face-${m.player.id}` : 'bot-face';
				const face = scene.add.image(c.avatar.x, c.avatar.y, faceKey).setDepth(9501);
				const src = scene.textures.get(faceKey).getSourceImage();
				face.setScale(76 / Math.max(src.width, src.height));
				if (c.top) face.setRotation(Math.PI);
				const pillAt = c.at([118, 214]);
				const num = txt(40).setPosition(pillAt.x, pillAt.y).setDepth(9503).setRotation(c.top ? Math.PI : 0);
				const icon = scene.add.image(0, 0, 'mini-banana').setScale(k * 1.25).setDepth(9503).setRotation(c.top ? Math.PI : 0);
				const flash = scene.add.graphics().setDepth(2).setAlpha(0);
				flash.lineStyle(26, 0xff3b30, 1).strokeCircle(c.cx, c.cy, c.r);
				const corner = {m, c, g, face, num, icon, pillAt, flash, check: null, ring: null};
				this.drawCorner(corner);

				return corner;
			});

			// announcement cards (one for the bottom, one turned around for the top)
			this.cards = (this.top ? [false, true] : [false]).map((flip) => {
				const y = flip ? P.y - P.ry - 120 : P.y + P.ry + 120;
				const ct = scene.add.container(P.x, y).setDepth(9800).setVisible(false).setRotation(flip ? Math.PI : 0);
				const bg = scene.add.graphics();
				const ic = scene.add.image(0, 0, 'banana').setScale(k);
				const tx = txt(46);
				ct.add([bg, ic, tx]);

				return {ct, bg, ic, tx};
			});
			this.score(null);
		}

		drawCorner(o) {
			const {g, c, m} = o;
			g.clear();
			// face badge
			g.fillStyle(0x000000, 0.18).fillCircle(c.avatar.x, c.avatar.y + 5, 46);
			g.fillStyle(0xffffff, 1).fillCircle(c.avatar.x, c.avatar.y, 46);
			g.lineStyle(8, m.color, 1).strokeCircle(c.avatar.x, c.avatar.y, 44);
			g.lineStyle(3, INK, 1).strokeCircle(c.avatar.x, c.avatar.y, 49);
		}

		// redraw a player's banana count (pop = it just changed)
		score(m, lost = false) {
			this.corners.forEach((o) => {
				if (m && o.m !== m) return;
				const s = String(o.m.score);
				o.num.setText(MM.Sound.state.lang === 'ar' ? Number(s).toLocaleString('ar-EG') : s);
				const w = Math.max(92, o.num.width / this.Z + 64);
				const {x, y} = o.pillAt;
				const flip = o.c.top ? -1 : 1;
				if (!o.pill) o.pill = this.scene.add.graphics().setDepth(9502);
				o.pill.clear();
				o.pill.fillStyle(0x000000, 0.2).fillRoundedRect(x - w / 2, y - 27 + 5, w, 54, 27);
				o.pill.fillStyle(o.m.color, 1).fillRoundedRect(x - w / 2, y - 27, w, 54, 27);
				o.pill.lineStyle(3, INK, 1).strokeRoundedRect(x - w / 2, y - 27, w, 54, 27);
				o.num.setPosition(x + flip * 14, y);
				o.icon.setPosition(x - flip * (w / 2 - 22), y);
				if (m) {
					this.scene.tweens.killTweensOf(o.num);
					o.num.setScale(1);
					this.scene.tweens.add({targets: o.num, scale: lost ? 0.75 : 1.35, duration: 110, yoyo: true, ease: 'Quad.easeOut'});
					if (lost) o.num.setColor('#ffd1d1');
					else o.num.setColor('#ffffff');
				}
			});
		}

		flash(slot) {
			const o = this.corners.find((q) => q.m.slot === slot);
			if (!o) return;
			this.scene.tweens.killTweensOf(o.flash);
			o.flash.setAlpha(0);
			this.scene.tweens.add({targets: o.flash, alpha: {from: 0, to: 0.9}, duration: 180, yoyo: true, repeat: 2});
		}

		/* ---------- announcements ---------- */
		announce(text, iconKey) {
			const s = this.scene;
			this.cards.forEach(({ct, bg, ic, tx}) => {
				s.tweens.killTweensOf(ct);
				tx.setFontFamily(font()).setFontSize(46).setText(text);
				// long (exciting) lines shrink to fit, so the card never covers the whole arena
				if (tx.width / this.Z > 760) tx.setFontSize(Math.floor((46 * 760 * this.Z) / tx.width));
				const tw = tx.width / this.Z;
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
				bg.fillStyle(0xfffaf0, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, 34);
				bg.lineStyle(5, INK, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
				const rtl = MM.Sound.state.lang === 'ar';
				const iconX = (rtl ? 1 : -1) * (w / 2 - 54);
				ic.setPosition(iconX, 0);
				tx.setPosition(hasIcon ? (rtl ? -32 : 32) : 0, -3).setColor('#ffffff');
				ct.setVisible(true).setScale(0.3).setAlpha(1);
				s.tweens.add({targets: ct, scale: 1, duration: 420, ease: 'Back.easeOut'});
				s.tweens.add({targets: ct, alpha: 0, scale: 0.85, delay: 2100, duration: 380, ease: 'Quad.easeIn', onComplete: () => ct.setVisible(false)});
			});
		}

		/* ---------- the clock ---------- */
		clockTick(left, total, time) {
			const P = this.L.pond;
			const g = this.clock;
			const f = Math.max(0, left / total);
			const col = f > 0.5 ? 0x34c759 : f > 0.2 ? 0xffc23d : 0xff4757;
			const pulse = left <= 10 && left > 0 ? 1 + Math.abs(Math.sin(time * Math.PI)) * 0.06 : 1;
			g.clear();
			g.fillStyle(0x000000, 0.2).fillCircle(P.x, P.y + 7, 62 * pulse);
			g.fillStyle(0xc98b4b, 1).fillCircle(P.x, P.y, 62 * pulse);
			g.lineStyle(4, INK, 1).strokeCircle(P.x, P.y, 62 * pulse);
			g.fillStyle(0xfff3d6, 1).fillCircle(P.x, P.y, 44 * pulse);
			g.lineStyle(3, INK, 1).strokeCircle(P.x, P.y, 44 * pulse);
			g.lineStyle(13, 0x8a5a33, 1).beginPath().arc(P.x, P.y, 53 * pulse, 0, Math.PI * 2).strokePath();
			if (f > 0) {
				g.lineStyle(10, col, 1).beginPath();
				g.arc(P.x, P.y, 53 * pulse, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
				g.strokePath();
			}
			const big = left <= 10 && left > 0;
			this.clockIcon.setVisible(!big).setRotation(Math.sin(time * 2) * 0.15);
			this.clockNums.forEach((t, i) => {
				t.setVisible(big && (i === 0 || this.top));
				if (big) {
					const n = Math.ceil(left);
					t.setText(MM.Sound.state.lang === 'ar' ? n.toLocaleString('ar-EG') : String(n)).setFontSize(this.top ? 40 : 56).setColor(n <= 3 ? '#ff4757' : '#ffffff');
				}
			});
		}

		/* ---------- ready check ---------- */
		showReady(pads) {
			const s = this.scene;
			this.ready = pads.map((p) => {
				const c = p.corner;
				const ring = s.add.image(c.button.x, c.button.y, `ring-${p.monkey.player.id}`).setScale(this.k * 1.1).setDepth(9004);
				s.tweens.add({targets: ring, scale: this.k * 1.5, alpha: {from: 1, to: 0}, duration: 900, repeat: -1});
				// a bouncing arrow on the arena side of the button, pointing at it
				const a = Math.atan2(c.button.y - c.cy, c.button.x - c.cx);
				const ox = Math.cos(a);
				const oy = Math.sin(a);
				const arrow = s.add.image(c.button.x + ox * 112, c.button.y + oy * 112, `arrow-${p.monkey.player.id}`)
					.setScale(this.k).setDepth(9004).setRotation(a + Math.PI);
				s.tweens.add({targets: arrow, x: arrow.x - ox * 26, y: arrow.y - oy * 26, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});

				return {pad: p, ring, arrow, done: false};
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

		/* ---------- 3 · 2 · 1 · GO ---------- */
		countdown(text) {
			const P = this.L.pond;
			(this.top ? [false, true] : [false]).forEach((flip) => {
				const t = this.txt(130).setText(text).setPosition(P.x, flip ? P.y - P.ry - 110 : P.y + P.ry + 110).setDepth(9900).setRotation(flip ? Math.PI : 0).setScale(0.2);
				this.scene.tweens.add({targets: t, scale: 1, duration: 300, ease: 'Back.easeOut'});
				this.scene.tweens.add({targets: t, alpha: 0, scale: 1.4, delay: 600, duration: 300, onComplete: () => t.destroy()});
			});
		}
	}

	MM.Hud = Hud;
})();
