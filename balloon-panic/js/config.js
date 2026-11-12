/* Balloon Panic: the numbers you can tune. Times are in seconds. */
(function () {
	'use strict';
	const BP = (window.BP = window.BP || {});

	// the four seats: each player's colour follows them everywhere in the app
	BP.PEOPLE = [
		{id: 'p1', color: '#ff5d73'},
		{id: 'p2', color: '#9b6bff'},
		{id: 'p3', color: '#1fa8ff'},
		{id: 'p4', color: '#ff9417'}
	];

	BP.CONFIG = {
		// "easy" is the gentle mode for the youngest: longer fuses, slower throws, more time after a catch
		easy: {
			fuse: [7, 16], // the random window: a round's pop comes somewhere between these
			grace: 1.1, // after a catch, it can never pop sooner than this
			flight: 0.78, // how long a throw across the screen takes
			rounds: 8,
			eventChance: 0.6,
			stickyTaps: 2,
			lastSecond: [3.2, 4.2]
		},
		fast: {
			fuse: [4, 12],
			grace: 0.6,
			flight: 0.56,
			rounds: 9,
			eventChance: 0.8,
			stickyTaps: 3,
			lastSecond: [2.2, 3.2]
		},
		// the pop never comes while the thing still looks calm: it has grown at least this much (0..1) when it goes
		popAt: [0.7, 1],
		// how big it looks at each stage: below these it is calm, bigger, danger, then extreme panic
		stages: [0.3, 0.55, 0.78],
		between: 3.5, // from the pop to the next round
		eventDelay: [1.6, 3.4],
		eventTime: 7,
		bot: [0.7, 1.9] // how long a computer buddy holds on before passing
	};
})();
