/* Balloon Panic: ScoreManager. Counts what happens and hands out the awards at the end.
   Fewest pops wins (a tie is a tie: everyone on top is a champion). Every player also gets a title,
   kind ones first, so the youngest goes home with something to be proud of:
     Panic Master (passed it in the danger zone most) · Fastest Hands (held it the shortest) ·
     Master Prankster · Lucky Survivor (fewest pops) · Explosion Magnet · Party Star (everyone else)
   It also remembers the funniest thing that happened. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});

	class Score {
		constructor(players) {
			this.rows = players.list.map((b) => ({b, passes: 0, pops: 0, survived: 0, saves: 0, pranks: 0, fakes: 0, hold: 0, late: 0, streak: 0}));
			this.moments = [];
		}

		row(b) {
			return this.rows.find((r) => r.b === b);
		}

		moment(weight, key, b, k) {
			this.moments.push({weight: weight + Math.random() * 0.4, key, sp: b ? b.sp : null, k});
		}

		pass(b, obj) {
			const r = this.row(b);
			r.passes++;
			r.hold += obj.held;
			if (obj.fake) return;
			if (obj.stage >= 3) r.late++;
			if (obj.left < 0.6) this.moment(5, 'close', b);
		}

		pop(victim, look) {
			this.rows.forEach((r) => {
				if (r.b === victim) {
					r.pops++;
					r.streak++;
					if (r.streak >= 2) this.moment(3 + r.streak, 'streak', victim, r.streak);
				} else {
					r.survived++;
					r.streak = 0;
				}
			});
			if (look === 'afro') this.moment(2.5, 'afro', victim);
		}

		saved(b) {
			this.row(b).saves++;
			this.moment(6, 'saved', b);
		}

		prank(b, kind) {
			const r = this.row(b);
			r.pranks++;
			if (kind === 'fake') {
				r.fakes++;
				this.moment(2 + r.fakes * 0.6, 'prank', b);
			}
		}

		fakeout() {
			this.moment(4, 'fake', null);
		}

		results() {
			const rows = this.rows;
			const best = Math.min(...rows.map((r) => r.pops));
			const taken = new Set();
			const titles = new Map();
			const give = (key, score, ok) => {
				let top = null;
				for (const r of rows) {
					if (taken.has(r) || !ok(r)) continue;
					if (!top || score(r) > score(top)) top = r;
				}
				if (top) {
					taken.add(top);
					titles.set(top, key);
				}
			};
			give('lucky', (r) => r.saves + r.passes * 0.001, (r) => r.pops === best);
			give('panic', (r) => r.late, (r) => r.late > 0);
			give('fast', (r) => -r.hold / r.passes, (r) => r.passes >= 3);
			give('prank', (r) => r.pranks, (r) => r.pranks > 0);
			give('magnet', (r) => r.pops, (r) => r.pops > best);
			const funniest = this.moments.sort((a, b) => b.weight - a.weight)[0] || {key: 'pop', sp: null};

			return {
				rows: rows.map((r) => ({sp: r.b.sp, person: r.b.person, bot: r.b.bot, passes: r.passes, survived: r.survived, pops: r.pops, win: r.pops === best, title: titles.get(r) || 'star'}))
					.sort((a, b) => a.pops - b.pops || b.passes - a.passes),
				tie: rows.filter((r) => r.pops === best).length > 1,
				funniest
			};
		}
	}

	BP.Score = Score;
})();
