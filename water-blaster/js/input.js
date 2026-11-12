/* Water Blaster Arena: controls (InputManager). Up to 4 children touch the same screen at once.
   Every finger (pointer) is owned by exactly one control from touch-down to lift, so hands never fight:
     - the joystick: a finger that lands near a player's joystick steers that splasher (the knob follows)
     - the water button: hold it to spray (a finger that lands on it sprays until it lifts); one tap is a full squirt
     - follow my finger: a finger that lands on or near a splasher drags it; it runs to the finger and eases to a stop
     - tap your splasher (the one holding the blaster): a squirt, aimed by itself at whoever is closest
   One child can move and spray at the same time with two thumbs; four children can all do both at once.
   Keyboard for testing on a computer: P1 WASD + Space/E · P2 arrows + Enter · P3 IJKL + O · P4 TFGH + Y.
     const input = new WB.Input(scene, layout, humans, {k})
     input.dir(slot) -> {x, y, mag}   input.held(slot) -> spraying?   input.takePress(slot) -> true once per press */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const JOY_GRAB = 150;
	const JOY_MAX = 70;
	const DEAD = 0.14;
	const FULL = 0.6;
	const BTN_GRAB = 100; // the water button is big and forgiving
	const FINGER_GRAB = 150; // a finger this close to a splasher takes it
	const FINGER_FAR = 420; // ...or, on open floor, the closest splasher this near runs to the finger
	const TAP_MS = 280; // shorter than this, and barely moved: that was a tap on the blaster
	const SQUIRT = {tap: 950, button: 600}; // how long one tap sprays (ms)
	const KEYS = [
		{up: 'W', left: 'A', down: 'S', right: 'D', act: 'E', act2: 'SPACE'},
		{up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT', act: 'ENTER', act2: 'SHIFT'},
		{up: 'I', left: 'J', down: 'K', right: 'L', act: 'O', act2: 'U'},
		{up: 'T', left: 'F', down: 'G', right: 'H', act: 'Y', act2: 'R'}
	];

	class Input {
		constructor(scene, L, slots, {k = 1} = {}) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.pads = slots.map(({slot, fighter}) => ({
				slot, fighter, corner: L.corners[slot],
				joyPointer: null, btnPointer: null, dragPointer: null, target: null, burst: 0, knobX: 0, knobY: 0, presses: 0, keys: null
			}));
			this.owner = new Map(); // pointer id -> {pad, kind}
			this.enabled = true;
			this.buildVisuals();
			this.bindPointers();
			this.bindKeys();
		}

		buildVisuals() {
			const s = this.scene;
			const k = this.k;
			this.pads.forEach((p) => {
				const c = p.corner;
				const id = p.fighter.player.id;
				p.base = s.add.image(c.joy.x, c.joy.y, `joy-base-${id}`).setScale(k).setDepth(9000);
				p.knob = s.add.image(c.joy.x, c.joy.y, `joy-knob-${id}`).setScale(k).setDepth(9002);
				p.tank = s.add.graphics().setDepth(8999); // the water left, as a ring round the button (drawn by the HUD)
				p.btn = s.add.image(c.button.x, c.button.y, `button-${id}`).setScale(k).setDepth(9000);
				p.btnIcon = s.add.image(c.button.x, c.button.y, 'icon-drop').setScale(k).setDepth(9001).setRotation(c.top ? Math.PI : 0);
				// where the finger is leading the splasher: a little ring in the player's colour
				p.mark = s.add.image(0, 0, `ring-${id}`).setScale(k * 0.5, k * 0.24).setDepth(3).setAlpha(0.85).setVisible(false);
			});
		}

		bindPointers() {
			const s = this.scene;
			this.onDown = (ptr) => this.down(ptr);
			this.onMove = (ptr) => this.move(ptr);
			this.onUp = (ptr) => this.up(ptr);
			this.onOut = () => this.releaseAll();
			s.input.on('pointerdown', this.onDown);
			s.input.on('pointermove', this.onMove);
			s.input.on('pointerup', this.onUp);
			s.input.on('pointerupoutside', this.onUp);
			s.input.on('gameout', this.onOut);
		}

		bindKeys() {
			const kb = this.scene.input.keyboard;
			if (!kb) return;
			this.pads.forEach((p, i) => {
				const map = KEYS[p.slot] || KEYS[i];
				p.keys = kb.addKeys(map, true, false);
				['act', 'act2'].forEach((a) => p.keys[a].on('down', () => {
					if (this.enabled) p.presses++;
				}));
			});
		}

		down(ptr) {
			if (!this.enabled || this.owner.has(ptr.id)) return;
			const x = ptr.worldX;
			const y = ptr.worldY;
			// 1) a water button?
			for (const p of this.pads) {
				if (p.btnPointer === null && Math.hypot(x - p.corner.button.x, y - p.corner.button.y) < BTN_GRAB) {
					this.owner.set(ptr.id, {pad: p, kind: 'btn'});
					p.btnPointer = ptr.id;
					p.presses++;
					p.burst = Math.max(p.burst, this.scene.time.now + SQUIRT.button); // even the quickest tap is a real squirt
					this.scene.tweens.killTweensOf([p.btn, p.btnIcon]);
					this.scene.tweens.add({targets: [p.btn, p.btnIcon], scale: this.k * 0.86, duration: 70, ease: 'Quad.easeOut'});

					return;
				}
			}
			// 2) a joystick? (closest free one)
			let best = null;
			let bestD = JOY_GRAB;
			for (const p of this.pads) {
				const d = Math.hypot(x - p.corner.joy.x, y - p.corner.joy.y);
				if (d < bestD && p.joyPointer === null) {
					best = p;
					bestD = d;
				}
			}
			if (best) {
				best.joyPointer = ptr.id;
				this.owner.set(ptr.id, {pad: best, kind: 'joy'});
				this.setKnob(best, x, y);

				return;
			}
			// 3) follow my finger: the splasher under the finger, or the closest one on open floor
			let who = null;
			let whoD = FINGER_FAR;
			for (const p of this.pads) {
				const f = p.fighter;
				if (f.out || p.dragPointer !== null) continue;
				const d = Math.hypot(x - f.x, y - (f.y - 40));
				if (d < whoD) {
					who = p;
					whoD = d;
				}
			}
			if (who) {
				who.dragPointer = ptr.id;
				who.target = {x, y};
				this.owner.set(ptr.id, {pad: who, kind: 'drag', x0: x, y0: y, t0: this.scene.time.now, onGun: whoD < FINGER_GRAB, moved: 0});
			}
		}

		move(ptr) {
			const own = this.owner.get(ptr.id);
			if (!own) return;
			if (own.kind === 'joy') {
				this.setKnob(own.pad, ptr.worldX, ptr.worldY);
			} else if (own.kind === 'drag') {
				own.pad.target = {x: ptr.worldX, y: ptr.worldY};
				own.moved = Math.max(own.moved, Math.hypot(ptr.worldX - own.x0, ptr.worldY - own.y0));
			}
		}

		up(ptr) {
			const own = this.owner.get(ptr.id);
			if (!own) return;
			this.owner.delete(ptr.id);
			// a quick tap on your own splasher: squirt!
			if (own.kind === 'drag' && own.onGun && own.moved < 30 && this.scene.time.now - own.t0 < TAP_MS) {
				own.pad.burst = Math.max(own.pad.burst, this.scene.time.now + SQUIRT.tap);
				own.pad.presses++;
			}
			this.release(own);
		}

		release({pad, kind}) {
			if (kind === 'drag') {
				pad.dragPointer = null;
				pad.target = null;
				pad.mark.setVisible(false);
			} else if (kind === 'joy') {
				pad.joyPointer = null;
				pad.knobX = 0;
				pad.knobY = 0;
				this.scene.tweens.add({targets: pad.knob, x: pad.corner.joy.x, y: pad.corner.joy.y, duration: 160, ease: 'Back.easeOut'});
			} else {
				pad.btnPointer = null;
				this.scene.tweens.killTweensOf([pad.btn, pad.btnIcon]);
				this.scene.tweens.add({targets: [pad.btn, pad.btnIcon], scale: this.k, duration: 160, ease: 'Back.easeOut'});
			}
		}

		releaseAll() {
			this.owner.forEach((own) => this.release(own));
			this.owner.clear();
		}

		setKnob(p, x, y) {
			let dx = x - p.corner.joy.x;
			let dy = y - p.corner.joy.y;
			const d = Math.hypot(dx, dy);
			if (d > JOY_MAX) {
				dx = (dx / d) * JOY_MAX;
				dy = (dy / d) * JOY_MAX;
			}
			p.knobX = dx;
			p.knobY = dy;
			p.knob.setPosition(p.corner.joy.x + dx, p.corner.joy.y + dy);
		}

		// every frame: drop fingers the browser lost (touchcancel, app switch) so no joystick or spray ever sticks
		update() {
			const mgr = this.scene.input.manager;
			this.owner.forEach((own, id) => {
				const ptr = mgr.pointers.find((q) => q && q.id === id);
				if (!ptr || !ptr.isDown) {
					this.owner.delete(id);
					this.release(own);
				}
			});
		}

		dir(slot) {
			const p = this.pads.find((q) => q.slot === slot);
			const out = {x: 0, y: 0, mag: 0};
			if (!p || !this.enabled) return out;
			const K = p.keys;
			if (K) {
				const kx = (K.right.isDown ? 1 : 0) - (K.left.isDown ? 1 : 0);
				const ky = (K.down.isDown ? 1 : 0) - (K.up.isDown ? 1 : 0);
				if (kx || ky) {
					const n = Math.hypot(kx, ky);

					return {x: kx / n, y: ky / n, mag: 1};
				}
			}
			if (p.joyPointer !== null) {
				const m = Math.hypot(p.knobX, p.knobY) / JOY_MAX;
				if (m < DEAD) return out;
				const n = Math.hypot(p.knobX, p.knobY);

				// full speed from just past half-way: small hands rarely push to the rim
				return {x: p.knobX / n, y: p.knobY / n, mag: Math.min(1, 0.35 + (0.65 * (m - DEAD)) / (FULL - DEAD))};
			}
			if (p.target) {
				// run to a spot just under the finger (so the finger does not hide the splasher), easing in to land softly
				const f = p.fighter;
				const dx = p.target.x - f.x;
				const dy = p.target.y + 36 - f.y;
				const d = Math.hypot(dx, dy);
				p.mark.setVisible(d > 30).setPosition(p.target.x, p.target.y + 50);
				if (d < 12) return out;

				return {x: dx / d, y: dy / d, mag: Math.min(1, 0.18 + d / 110)};
			}

			return out;
		}

		held(slot) {
			const p = this.pads.find((q) => q.slot === slot);
			if (!p || !this.enabled) return false;

			return p.btnPointer !== null || this.scene.time.now < p.burst || !!(p.keys && (p.keys.act.isDown || p.keys.act2.isDown));
		}

		takePress(slot) {
			const p = this.pads.find((q) => q.slot === slot);
			if (!p || !p.presses) return false;
			p.presses = 0;

			return true;
		}

		destroy() {
			const s = this.scene;
			s.input.off('pointerdown', this.onDown);
			s.input.off('pointermove', this.onMove);
			s.input.off('pointerup', this.onUp);
			s.input.off('pointerupoutside', this.onUp);
			s.input.off('gameout', this.onOut);
			this.owner.clear();
		}
	}

	WB.Input = Input;
})();
