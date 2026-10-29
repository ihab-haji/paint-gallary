/* Every word the game shows or says. Arabic is written with full harakat: the child sees it in the bubble
   and the recorded voice (ar-SA Zariyah, audio/ar/) reads exactly this text.
   After changing any spoken text, record the voice again: see tools/make_voice.py. */
(() => {
	// prize: [emoji, Arabic name (nominative, with tanween), English name]
	const PRIZES = [
		['🦄', 'حِصَانٌ وَحِيدُ الْقَرْنِ', 'a unicorn'], ['🐶', 'جَرْوٌ صَغِيرٌ', 'a puppy'], ['🐱', 'قِطَّةٌ لَطِيفَةٌ', 'a kitty'],
		['🐼', 'دُبُّ الْبَانْدَا', 'a panda'], ['🦁', 'أَسَدٌ', 'a lion'], ['🐸', 'ضِفْدَعٌ', 'a frog'],
		['🐧', 'بِطْرِيقٌ', 'a penguin'], ['🦋', 'فَرَاشَةٌ', 'a butterfly'], ['🐢', 'سُلَحْفَاةٌ', 'a turtle'],
		['🐬', 'دُلْفِينٌ', 'a dolphin'], ['🦖', 'دَيْنَاصُورٌ', 'a dinosaur'], ['🐙', 'أُخْطُبُوطٌ', 'an octopus'],
		['🍦', 'آيْس كْرِيم', 'an ice cream'], ['🍭', 'مَصَّاصَةٌ', 'a lollipop'], ['🧁', 'كَعْكَةٌ صَغِيرَةٌ', 'a cupcake'],
		['🍩', 'دُونَاتْ', 'a donut'], ['🍓', 'فَرَاوِلَةٌ', 'a strawberry'], ['🍉', 'بِطِّيخَةٌ', 'a watermelon'],
		['🚀', 'صَارُوخٌ', 'a rocket'], ['🚂', 'قِطَارٌ', 'a train'], ['🚁', 'طَائِرَةٌ مَرْوَحِيَّةٌ', 'a helicopter'],
		['🎈', 'بَالُونٌ', 'a balloon'], ['🧸', 'دُبٌّ لَطِيفٌ', 'a teddy bear'], ['🪁', 'طَائِرَةٌ وَرَقِيَّةٌ', 'a kite'],
		['🌈', 'قَوْسُ قُزَحَ', 'a rainbow'], ['⭐', 'نَجْمَةٌ', 'a star'], ['🌻', 'زَهْرَةُ عَبَّادِ الشَّمْسِ', 'a sunflower'],
		['👑', 'تَاجٌ', 'a crown'], ['💎', 'جَوْهَرَةٌ', 'a gem'], ['🎸', 'جِيتَارٌ', 'a guitar']
	];

	// players in "play together": each animal has its own turn, point and winner sentence
	const PLAYERS = [
		{emoji: '🦁', color: '#f59e0b',
			ar: {turn: 'دَوْرُ الْأَسَدِ!', point: 'نُقْطَةٌ لِلْأَسَدِ!', win: 'الْفَائِزُ هُوَ الْأَسَدُ! مَبْرُوكٌ!'},
			en: {turn: "Lion's turn!", point: 'A point for Lion!', win: 'Lion wins! Well done!'}},
		{emoji: '🐼', color: '#8b5cf6',
			ar: {turn: 'دَوْرُ الْبَانْدَا!', point: 'نُقْطَةٌ لِلْبَانْدَا!', win: 'الْفَائِزُ هُوَ الْبَانْدَا! مَبْرُوكٌ!'},
			en: {turn: "Panda's turn!", point: 'A point for Panda!', win: 'Panda wins! Well done!'}},
		{emoji: '🐸', color: '#10b981',
			ar: {turn: 'دَوْرُ الضِّفْدَعِ!', point: 'نُقْطَةٌ لِلضِّفْدَعِ!', win: 'الْفَائِزُ هُوَ الضِّفْدَعُ! مَبْرُوكٌ!'},
			en: {turn: "Frog's turn!", point: 'A point for Frog!', win: 'Frog wins! Well done!'}},
		{emoji: '🐰', color: '#ec4899',
			ar: {turn: 'دَوْرُ الْأَرْنَبِ!', point: 'نُقْطَةٌ لِلْأَرْنَبِ!', win: 'الْفَائِزُ هُوَ الْأَرْنَبُ! مَبْرُوكٌ!'},
			en: {turn: "Bunny's turn!", point: 'A point for Bunny!', win: 'Bunny wins! Well done!'}}
	];

	const AR_DIGITS = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

	const T = {
		ar: {
			title: 'أَيْنَ الْكُرَةُ؟',
			subtitle: 'رَاقِبِ الْكُرَةَ وَاعْثُرْ عَلَيْهَا!',
			myPrizes: 'هَدَايَايَ',
			play: 'اِلْعَبْ',
			new: 'جَدِيدٌ!',
			collect: '✨ خُذِ الْهَدِيَّةَ',
			champion: 'بَطَلٌ! 🎉',
			fiveStars: 'خَمْسُ نُجُومٍ = كَأْسٌ ذَهَبِيَّةٌ!',
			hooray: '🥳 مُمْتَازٌ!',
			easy: 'سَهْلٌ', mid: 'مُتَوَسِّطٌ', hard: 'صَعْبٌ', expert: 'خَارِقٌ',
			easySub: '٣ أَكْوَابٍ', midSub: '٤ أَكْوَابٍ', hardSub: '٦ أَكْوَابٍ', expertSub: '٦ أَكْوَابٍ',
			easySpeed: '🐢 بَطِيءٌ', midSpeed: '🐇 أَسْرَعُ', hardSpeed: '🚀 سَرِيعٌ جِدًّا', expertSpeed: '⚡ بِسُرْعَةِ الْبَرْقِ',
			solo: 'لَاعِبٌ وَاحِدٌ', multi: 'لَعِبٌ جَمَاعِيٌّ',
			playersLabel: 'اللَّاعِبُونَ', turnsLabel: 'الْجَوْلَاتُ',
			turnsN: (n) => `${AR_DIGITS(n)} جَوْلَاتٍ`,
			results: 'النَّتِيجَةُ 🏁',
			winnerGift: 'هَدِيَّةُ الْفَائِزِ',
			again: 'مَرَّةً أُخْرَى',
			menu: 'الْقَائِمَةُ',
			// spoken
			ready: 'هَيَّا نَلْعَبُ! اِضْغَطْ عَلَى زِرِّ اللَّعِبِ',
			watch: 'اُنْظُرْ إِلَى الْكُرَةِ!',
			shuffle: 'رَاقِبْ جَيِّدًا…',
			where: 'أَيْنَ الْكُرَةُ؟ اِضْغَطْ عَلَى الْكُوبِ!',
			yay: 'رَائِعٌ! وَجَدْتَهَا!',
			miss: 'لَيْسَتْ هُنَا! جَرِّبْ كُوبًا آخَرَ',
			was: 'الْكُرَةُ كَانَتْ هُنَا! لِنَلْعَبْ مَرَّةً أُخْرَى',
			surprise: 'مُفَاجَأَةٌ! 🎁',
			got: (name) => `لَكَ ${name}!`,
			pick: 'اِخْتَرْ لُعْبَتَكَ!',
			superSay: 'أَنْتَ بَطَلٌ! خَمْسُ نُجُومٍ! لَكَ كَأْسٌ ذَهَبِيَّةٌ!',
			together: 'اِلْعَبُوا مَعًا! اِخْتَارُوا عَدَدَ اللَّاعِبِينَ',
			tie: 'تَعَادُلٌ! كُلُّكُمْ أَبْطَالٌ!',
			// play together (shown, not spoken)
			readyAll: 'جَاهِزُونَ؟ اِضْغَطُوا زِرَّ اللَّعِبِ!', dragAll: 'كُلُّ وَاحِدٍ يَسْحَبُ صُورَتَهُ إِلَى كُوبٍ! 👆',
			foundBy: (names, many) => `${names} ${many ? 'وَجَدُوا' : 'وَجَدَ'} الْكُرَةَ! ⭐`, nobody: 'لَمْ يَجِدْهَا أَحَدٌ! 🙈'
		},
		en: {
			title: 'Find the Ball!',
			subtitle: 'Watch the ball and find it!',
			myPrizes: 'My prizes',
			play: 'Play',
			new: 'New!',
			collect: '✨ Take it!',
			champion: 'Champion! 🎉',
			fiveStars: '5 stars = a golden trophy!',
			hooray: '🥳 Hooray!',
			easy: 'Easy', mid: 'Medium', hard: 'Hard', expert: 'Expert',
			easySub: '3 cups', midSub: '4 cups', hardSub: '6 cups', expertSub: '6 cups',
			easySpeed: '🐢 slow', midSpeed: '🐇 faster', hardSpeed: '🚀 super fast', expertSpeed: '⚡ lightning fast',
			solo: '1 player', multi: 'Play together',
			playersLabel: 'Players', turnsLabel: 'Turns',
			turnsN: (n) => `${n} turns each`,
			results: 'Results 🏁',
			winnerGift: "Winner's gift",
			again: 'Again',
			menu: 'Menu',
			ready: "Let's play! Press the Play button.",
			watch: 'Watch the ball!',
			shuffle: 'Keep watching…',
			where: 'Where is the ball? Tap a cup!',
			yay: 'Yay! You found it!',
			miss: 'Not here! Try another cup.',
			was: "The ball was here! Let's play again.",
			surprise: 'Surprise! 🎁',
			got: (name) => `You got ${name}!`,
			pick: 'Choose your game!',
			superSay: 'Champion! Five stars! A golden trophy for you!',
			together: 'Play together! Choose how many players.',
			tie: "It's a tie! You are all champions!",
			// play together (shown, not spoken)
			readyAll: 'Ready? Press Play!', dragAll: 'Everyone, drag your picture onto a cup! 👆',
			foundBy: (names) => `${names} found it! ⭐`, nobody: 'Nobody found it! 🙈'
		}
	};

	const SPOKEN = ['ready', 'watch', 'shuffle', 'where', 'yay', 'miss', 'was', 'surprise', 'pick', 'superSay', 'together', 'tie'];

	// the text that is read aloud: no emoji, single spaces (the clip manifest uses the same key)
	const speechKey = (text) => text.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu, '').replace(/\s+/g, ' ').trim();

	// every sentence the game can say in one language: the list the voice is recorded from
	function phrases(lang) {
		const names = PRIZES.map((prize) => (lang === 'ar' ? prize[1] : prize[2]));
		const players = PLAYERS.flatMap((player) => [player[lang].turn, player[lang].point, player[lang].win]);
		const all = [...SPOKEN.map((key) => T[lang][key]), ...names.map((name) => T[lang].got(name)), ...names, ...players];

		return [...new Set(all.map(speechKey))];
	}

	window.CUPBALL_WORDS = {PRIZES, PLAYERS, T, speechKey, phrases};
})();
