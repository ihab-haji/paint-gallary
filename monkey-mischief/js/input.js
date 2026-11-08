/* Monkey Mischief: controls. Up to 4 children touch the same screen at once.
   Every finger (pointer) is owned by exactly one control, from touch-down to lift, so hands never fight:
     - joystick mode: a finger that lands on a player's joystick steers that monkey (the knob follows, max ~70 units)
     - finger mode:   a finger that lands on or near a monkey drags it; the monkey runs to the finger
     - the trick button: one press = one trick (a finger sliding onto it does nothing; no double fires)
   Keyboard for testing on a computer: P1 WASD + E · P2 arrows + Enter · P3 IJKL + O · P4 TFGH + Y.
     const input = new MM.Input(scene, layout, humans, {mode})
     input.dir(slot) -> {x, y, mag}   input.takePress(slot) -> true once per press   input.destroy() */
(function () {
	'use strict';
	const MM = (window.MM = window.MM || {});
	const JOY_GRAB = 150; // a finger this close to the joystick centre takes it
	const JOY_MAX = 70; // how far the knob travels
	const BTN_GRAB = 78;
	const FINGER_GRAB = 120;
	const KEYS = [
		{up: 'W', left: 'A', down: 'S', right: 'D', act: 'E'},
		{up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT', act: 'ENTER'},
		{up: 'I', left: 'J', down: 'K', right: 'L', act: 'O'},
		{up: 'T', left: 'F', down: 'G', right: 'H', act: 'Y'}
	];

	class Input {
		constructor(scene, L, slots, {mode = 'joy', k = 1} = {}) {
			this.scene = scene;
			this.L = L;
			this.mode = mode;
			this.k = k;
			// slots: [{slot, monkey}] humans only
			this.pads = slots.map(({slot, monkey}) => ({
				slot, monkey, corner: L.corners[slot],
				joyPointer: null, dragPointer: null, knobX: 0, knobY: 0, target: null,
				presses: 0, btnDown: false, keys: null
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
				const id = p.monkey.player.id;
				p.base = s.add.image(c.joy.x, c.joy.y, `joy-base-${id}`).setScale(k).setDepth(9000);
				p.knob = s.add.image(c.joy.x, c.joy.y, `joy-knob-${id}`).setScale(k).setDepth(9002);
				p.btn = s.add.image(c.button.x, c.button.y, `button-${id}`).setScale(k).setDepth(9000);
				p.btnIcon = s.add.image(c.button.x, c.button.y, 'icon-peel').setScale(k).setDepth(9001);
				if (c.top) {
					p.btnIcon.setRotation(Math.PI);
				}
				// little pips around the button: how many peels are left
				p.pips = [0, 1, 2].map((i) => s.add.image(0, 0, 'dot').setScale(k * 0.9).setDepth(9001));
				this.placePips(p);
				const showJoy = this.mode === 'joy';
				p.base.setVisible(showJoy);
				p.knob.setVisible(showJoy);
			});
		}

		placePips(p) {
			const c = p.corner;
			// arc of three dots on the inner side of the button
			const ang = Math.atan2(c.joy.y - c.button.y, c.joy.x - c.button.x);
			p.pips.forEach((d, i) => {
				const a = ang + Math.PI + (i - 1) * 0.42;
				d.setPosition(c.button.x + Math.cos(a) * 62, c.button.y + Math.sin(a) * 62);
			});
		}

		setMode(mode) {
			this.mode = mode;
			this.pads.forEach((p) => {
				p.base.setVisible(mode === 'joy');
				p.knob.setVisible(mode === 'joy');
			});
		}

		bindPointers() {
			const s = this.scene;
			this.onDown = (ptr) => this.down(ptr);
			this.onMove = (ptr) => this.move(ptr);
			this.onUp = (ptr) => this.up(ptr);
			s.input.on('pointerdown', this.onDown);
			s.input.on('pointermove', this.onMove);
			s.input.on('pointerup', this.onUp);
			s.input.on('pointerupoutside', this.onUp);
			s.input.on('gameout', () => this.releaseAll());
		}

		bindKeys() {
			const kb = this.scene.input.keyboard;
			if (!kb) return;
			this.pads.forEach((p, i) => {
				const map = KEYS[p.slot] || KEYS[i];
				p.keys = kb.addKeys(map, true, false);
				p.keys.act.on('down', () => {
					if (this.enabled) p.presses++;
				});
			});
		}

		down(ptr) {
			if (!this.enabled || this.owner.has(ptr.id)) return;
			const x = ptr.worldX;
			const y = ptr.worldY;
			// 1) a trick button?
			for (const p of this.pads) {
				if (Math.hypot(x - p.corner.button.x, y - p.corner.button.y) < BTN_GRAB) {
					this.owner.set(ptr.id, {pad: p, kind: 'btn'});
					p.presses++;
					p.btnDown = true;
					this.scene.tweens.add({targets: [p.btn, p.btnIcon], scale: this.k * 0.84, duration: 70, yoyo: true, ease: 'Quad.easeOut'});

					return;
				}
			}
			if (this.mode === 'joy') {
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
				}

				return;
			}
			// 3) finger mode: grab the closest monkey near the finger
			let best = null;
			let bestD = FINGER_GRAB;
			for (const p of this.pads) {
				const m = p.monkey;
				const d = Math.hypot(x - m.x, y - (m.y - 30));
				if (d < bestD && p.dragPointer === null) {
					best = p;
					bestD = d;
				}
			}
			if (best) {
				best.dragPointer = ptr.id;
				best.target = {x, y};
				this.owner.set(ptr.id, {pad: best, kind: 'drag'});
			}
		}

		move(ptr) {
			const own = this.owner.get(ptr.id);
			if (!own) return;
			if (own.kind === 'joy') this.setKnob(own.pad, ptr.worldX, ptr.worldY);
			else if (own.kind === 'drag') own.pad.target = {x: ptr.worldX, y: ptr.worldY};
		}

		up(ptr) {
			const own = this.owner.get(ptr.id);
			if (!own) return;
			this.owner.delete(ptr.id);
			this.release(own);
		}

		release({pad, kind}) {
			if (kind === 'joy') {
				pad.joyPointer = null;
				pad.knobX = 0;
				pad.knobY = 0;
				this.scene.tweens.add({targets: pad.knob, x: pad.corner.joy.x, y: pad.corner.joy.y, duration: 160, ease: 'Back.easeOut'});
			} else if (kind === 'drag') {
				pad.dragPointer = null;
				pad.target = null;
			} else {
				pad.btnDown = false;
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

		// every frame: drop fingers the browser lost (touchcancel, app switch) so no joystick ever sticks
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
			if (this.mode === 'joy' && p.joyPointer !== null) {
				const m = Math.hypot(p.knobX, p.knobY) / JOY_MAX;
				if (m < 0.18) return out; // dead zone: a resting thumb does not creep
				const n = Math.hypot(p.knobX, p.knobY);

				return {x: p.knobX / n, y: p.knobY / n, mag: Math.min(1, (m - 0.18) / 0.62)};
			}
			if (this.mode === 'finger' && p.target) {
				const dx = p.target.x - p.monkey.x;
				const dy = p.target.y - p.monkey.y;
				const d = Math.hypot(dx, dy);
				if (d < 14) return out;

				return {x: dx / d, y: dy / d, mag: Math.min(1, d / 70)};
			}

			return out;
		}

		takePress(slot) {
			const p = this.pads.find((q) => q.slot === slot);
			if (!p || !p.presses) return false;
			p.presses = 0; // several taps in one frame still make one trick

			return true;
		}

		pad(slot) {
			return this.pads.find((q) => q.slot === slot);
		}

		destroy() {
			const s = this.scene;
			s.input.off('pointerdown', this.onDown);
			s.input.off('pointermove', this.onMove);
			s.input.off('pointerup', this.onUp);
			s.input.off('pointerupoutside', this.onUp);
			this.owner.clear();
		}
	}

	MM.Input = Input;
})();
