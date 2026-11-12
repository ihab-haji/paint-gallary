/* Water Blaster Arena: the water (WaterGunManager + WaterStreamManager + CollisionManager).
   A blaster held down fires drops from its nozzle many times a second. Each drop is a real little object:
   it flies along the aim, arcs down under gravity (z = height above the floor), stretches with its speed,
   and ends in exactly one place: on a splasher (wetness), on cover (a splash on the barrel), or on the floor
   (a splash and a puddle). A drop is used up on its first hit, so nothing is ever counted twice.
   Power shots are big blobs that burst and soak everyone near where they land.
   Aim assist: the water goes where you walk, gently bending toward the nearest opponent in front of you. */
(function () {
	'use strict';
	const WB = (window.WB = window.WB || {});
	const GRAV = 620;
	const NOZZLE_Z = 52;
	const HIT_R = 44; // generous: if it looks like it hit, it hit
	const BODY_TOP = 120; // a drop higher than this flies over your head
	const ASSIST = 0.62; // how far (radians) the aim may bend toward someone
	const MAX = 260;

	// keep the three blasters simple and fair: same soaking power per second of hitting, different feel
	const WEAPONS = {
		standard: {rate: 13, speed: 860, range: 440, spread: 0.05, dmg: 1.55, cost: 0.46, size: 1},
		rapid: {rate: 24, speed: 980, range: 310, spread: 0.1, dmg: 0.95, cost: 0.4, size: 0.8},
		power: {rate: 3.1, speed: 720, range: 470, spread: 0.02, dmg: 5.5, cost: 2.6, size: 1, blob: true, splashR: 78, splashDmg: 3.2}
	};
	WB.WEAPONS = WEAPONS;

	class Water {
		constructor(scene, L, k) {
			this.scene = scene;
			this.L = L;
			this.k = k;
			this.drops = [];
			this.free = [];
			for (let i = 0; i < MAX; i++) {
				const s = scene.add.image(0, 0, 'drop').setScale(k).setVisible(false);
				this.free.push({s, on: false});
			}
			// every drop draws a glossy streak behind it, so a held blaster reads as one stream of water
			this.trail = scene.add.graphics().setDepth(4000);
			this.mist = scene.add.particles(0, 0, 'spray', {emitting: false, lifespan: 260, speed: {min: 30, max: 120}, scale: {start: 0.7 * k, end: 1.5 * k}, alpha: {start: 0.6, end: 0}}).setDepth(5200);
		}

		get count() {
			return this.drops.length;
		}

		/* ---------- aiming ---------- */
		// where does f's water go this frame? (aim assist toward the nearest opponent in front)
		target(f, fighters, teams) {
			const w = this.stats(f);
			let best = null;
			let bestScore = Infinity;
			for (const o of fighters) {
				if (o === f || o.out || (teams && o.team === f.team)) continue;
				// aim where they will be when the water arrives, not where they are now
				const lead = Math.min(0.5, Math.hypot(o.x - f.x, o.y - f.y) / w.speed) * 0.85;
				const dx = o.x + (o.vx || 0) * lead - f.x;
				const dy = o.y + (o.vy || 0) * lead - f.y;
				const d = Math.hypot(dx, dy);
				if (d > w.range * 1.15) continue;
				let da = Math.atan2(dy, dx) - f.want;
				da = Math.atan2(Math.sin(da), Math.cos(da));
				// children get a full auto-aim: anyone in reach, whichever way they are walking. Computer players keep the narrow one.
				if (f.bot && Math.abs(da) > ASSIST * 1.6) continue;
				const score = d + Math.abs(da) * (f.bot ? 260 : 70);
				if (score < bestScore) {
					bestScore = score;
					best = {o, da};
				}
			}

			return best;
		}

		stats(f) {
			const base = WEAPONS[f.weapon] || WEAPONS.standard;
			if (f.superT <= 0 && f.boostT <= 0) return base;
			const sup = f.superT > 0;

			return {
				...base,
				rate: base.rate * (sup ? 1.6 : 1.3),
				range: base.range * (sup ? 1.25 : 1.1),
				dmg: base.dmg * (sup ? 1.25 : 1),
				size: base.size * (sup ? 1.3 : 1),
				cost: 0
			};
		}

		/* ---------- firing ---------- */
		// the aim bend toward a target (fighter.update swings the aim to want + assist)
		assist(f, to) {
			if (!to) f.assist = 0;
			else f.assist = f.bot ? Math.max(-ASSIST, Math.min(ASSIST, to.da)) * 0.85 : to.da; // a child's blaster points straight at them
		}

		fire(f, dt) {
			const w = this.stats(f);
			if (f.tank <= 0) {
				f.spraying = false;
				f.fireT = 0;
				// a dry blaster just dribbles
				if (Math.random() < dt * 4) {
					this.scene.fx.drip(f.x + Math.cos(f.aim) * 60, f.y - 30);
					if (!f.bot) WB.Sound.sfx.sputter();
				}

				return false;
			}
			f.fireT += dt * w.rate;
			let shots = 0;
			while (f.fireT >= 1) {
				f.fireT -= 1;
				shots++;
				const back = f.reverseT > 0;
				const a = f.aim + (back ? Math.PI : 0) + (Math.random() - 0.5) * 2 * w.spread;
				const nx = f.x + Math.cos(f.aim) * (back ? -30 : 70);
				const ny = f.y + Math.sin(f.aim) * (back ? -14 : 30);
				const speed = w.speed * (0.94 + Math.random() * 0.12);
				const range = w.range * (0.92 + Math.random() * 0.16);
				this.spawn({x: nx, y: ny, a, speed, range, owner: f, dmg: w.dmg, blob: !!w.blob, splashR: w.splashR, splashDmg: w.splashDmg, size: w.size, tex: shots % 3 === 0 ? `drop-${f.player.id}` : 'drop'});
				f.tank = Math.max(0, f.tank - w.cost);
				if (w.blob) {
					WB.Sound.sfx.pow();
					f.fireT = 0;
					this.scene.tweens.add({targets: f.gun, x: f.gun.x - Math.cos(f.aim) * 10, duration: 60, yoyo: true});
				}
			}
			if (shots && Math.random() < 0.5) this.mist.explode(1, f.x + Math.cos(f.aim) * 74, f.y - 36 + Math.sin(f.aim) * 30);
			if (f.tank <= 0 && !f.warnedEmpty) {
				f.warnedEmpty = true;
				WB.Sound.sfx.empty();
				this.scene.onEmpty(f);
			}
			if (f.tank > 30) f.warnedEmpty = false;

			return true;
		}

		// a drop (or blob) from anywhere: blasters, the sprinkler, the cannon
		spawn({x, y, a, speed, range, owner = null, dmg = 1, blob = false, splashR = 0, splashDmg = 0, size = 1, tex = 'drop', z = NOZZLE_Z}) {
			const d = this.free.pop();
			if (!d) return;
			const t = range / speed;
			d.on = true;
			d.x = x;
			d.y = y;
			d.z = z;
			d.vx = Math.cos(a) * speed;
			d.vy = Math.sin(a) * speed;
			d.vz = (0.5 * GRAV * t * t - z) / t; // lands exactly at the end of its range
			d.owner = owner;
			d.dmg = dmg;
			d.blob = blob;
			d.splashR = splashR;
			d.splashDmg = splashDmg;
			d.size = size;
			d.s.setTexture(blob ? 'blob' : tex).setVisible(true).setAlpha(1);
			this.drops.push(d);
		}

		/* ---------- every frame ---------- */
		update(dt, fighters, teams, live) {
			const L = this.L;
			const k = this.k;
			const tr = this.trail;
			tr.clear();
			for (let i = this.drops.length - 1; i >= 0; i--) {
				const d = this.drops[i];
				d.x += d.vx * dt;
				d.y += d.vy * dt;
				d.vz -= GRAV * dt;
				d.z += d.vz * dt;
				let end = null;
				// cover blocks low water
				if (d.z < 90) {
					const s = L.blocksWater(d.x, d.y);
					if (s) end = {kind: 'cover', s};
				}
				// a splasher?
				if (!end && d.z < BODY_TOP) {
					for (const f of fighters) {
						if (f === d.owner || f.out) continue;
						if (teams && d.owner && d.owner.team === f.team) continue;
						const dx = d.x - f.x;
						const dy = d.y - (f.y - 6);
						if (dx * dx + dy * dy * 1.4 < HIT_R * HIT_R) {
							end = {kind: 'hit', f};
							break;
						}
					}
				}
				if (!end && d.z <= 0) end = {kind: 'floor'};
				if (!end && (d.x < -40 || d.x > L.W + 40 || d.y < -40 || d.y > L.H + 40)) end = {kind: 'gone'};
				if (end) {
					this.land(d, end, fighters, teams, live);
					this.drops.splice(i, 1);
					d.on = false;
					d.s.setVisible(false);
					this.free.push(d);
					continue;
				}
				// draw: stretched along its on-screen motion, lifted by its height
				const sx = d.vx;
				const sy = d.vy - d.vz;
				const sp = Math.hypot(sx, sy);
				if (!d.blob) {
					const tx = d.x - d.vx * 0.045;
					const ty = d.y - d.vy * 0.045 - (d.z - d.vz * 0.045);
					tr.lineStyle(11 * d.size, 0x2fa5ef, 0.28).lineBetween(tx, ty, d.x, d.y - d.z);
					tr.lineStyle(4 * d.size, 0xe9fbff, 0.75).lineBetween(tx, ty, d.x, d.y - d.z);
				}
				d.s.setPosition(d.x, d.y - d.z).setDepth(d.y + 30).setRotation(Math.atan2(sy, sx) + Math.PI / 2);
				if (d.blob) d.s.setScale(k * d.size).setRotation(0);
				else d.s.setScale(k * 0.95 * d.size, k * 1.1 * d.size * Math.min(1.7, 0.7 + sp / 900));
			}
		}

		land(d, end, fighters, teams, live) {
			const fx = this.scene.fx;
			if (end.kind === 'hit') {
				const f = end.f;
				const amt = live ? d.dmg : d.dmg * 0.35;
				f.soak(amt, d.x, d.y - d.z);
				// a little push in the water's direction
				f.vx += d.vx * 0.012;
				f.vy += d.vy * 0.012;
				fx.splash(d.x, f.y - 40 - Math.random() * 30, d.blob ? 10 : 3);
				if (d.blob) this.burst(d, fighters, teams, live, f);
			} else if (end.kind === 'cover') {
				fx.splash(d.x, d.y - d.z, 3);
				if (this.scene.state !== 'attract') WB.Sound.sfx.cover();
				const s = end.s;
				if (s.sprite && !this.scene.tweens.isTweening(s.sprite)) this.scene.tweens.add({targets: s.sprite, scaleX: s.sprite.scaleX * 1.06, scaleY: s.sprite.scaleY * 0.95, duration: 70, yoyo: true});
				if (d.blob) this.burst(d, fighters, teams, live, null);
			} else if (end.kind === 'floor') {
				if (this.L.inPool(d.x, d.y)) {
					fx.ring(d.x, d.y, d.blob ? 0.9 : 0.35);
					if (this.scene.state !== 'attract' && Math.random() < 0.45) WB.Sound.sfx.pool();
				} else {
					fx.splash(d.x, d.y, d.blob ? 12 : 2);
					if (d.blob || Math.random() < 0.18) fx.puddle(d.x, d.y, d.blob ? 1.1 : 0.6);
					if (this.scene.state !== 'attract' && Math.random() < 0.35) WB.Sound.sfx.floor();
				}
				if (d.blob) this.burst(d, fighters, teams, live, null);
			}
		}

		// a power blob bursts: everyone close by gets a splash (the one it hit already got the full drop)
		burst(d, fighters, teams, live, hitOne) {
			WB.Sound.sfx.big();
			WB.Sound.sfx.drizzle();
			this.scene.fx.ring(d.x, d.y, 1.2);
			this.scene.fx.burst(d.x, d.y - 10, 'big', 12);
			for (const f of fighters) {
				if (f === hitOne || f === d.owner || f.out) continue;
				if (teams && d.owner && d.owner.team === f.team) continue;
				if (Math.hypot(f.x - d.x, f.y - d.y) < d.splashR) f.soak(live ? d.splashDmg : d.splashDmg * 0.35, f.x, f.y - 60);
			}
		}

		clear() {
			this.trail.clear();
			this.drops.forEach((d) => {
				d.on = false;
				d.s.setVisible(false);
				this.free.push(d);
			});
			this.drops = [];
		}
	}

	WB.Water = Water;
})();
