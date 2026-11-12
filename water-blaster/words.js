/* Water Blaster Arena: every word the game shows or says, in Arabic (with full harakat) and English.
   SAY = spoken by the recorded kids' voice (audio/<lang>/) and shown on screen.
   UI  = shown only (buttons, labels).
   After changing any SAY text, record the voice again: python3 tools/make_voice.py */
(() => {
	const SAY = {
		ar: {
			welcome: 'أَهْلًا فِي مَعْرَكَةِ الْمَاءِ! مَنْ سَيَبْقَى نَاشِفًا؟',
			who: 'مَنْ يَلْعَبُ؟ اِضْغَطْ عَلَى صُورَتِكَ!',
			pick: 'اِخْتَرْ بَطَلَكَ وَمُسَدَّسَ الْمَاءِ!',
			ducky: 'سَتَلْعَبُ مَعَ الْبَطَّةِ بَطْبُوطَة!',
			ready: 'اِبْحَثْ عَنْ زَاوِيَتِكَ، وَاضْغَطْ زِرَّ الْمَاءِ!',
			three: 'ثَلَاثَة!',
			two: 'اِثْنَان!',
			one: 'وَاحِد!',
			go: 'رُشُّوا!',
			fight: 'هَيَّا! رُشُّوا أَصْحَابَكُمْ بِالْمَاءِ!',
			soaked: 'مُبَلَّلٌ تَمَامًا!',
			almost: 'اِنْتَبِهْ! أَنْتَ مُبَلَّلٌ جِدًّا!',
			empty: 'الْمَاءُ خَلَصَ! اِذْهَبْ إِلَى الصُّنْبُورِ!',
			storm: 'رَشَّاشٌ عِمْلَاقٌ!',
			cannon: 'مِدْفَعُ الْمَاءِ!',
			slippery: 'الْأَرْضُ تَزْلَقُ!',
			balloons: 'مَطَرُ الْبَالُونَاتِ!',
			rush: 'زُجَاجَاتُ الْمَاءِ! أَسْرِعُوا!',
			wave: 'مَوْجَةٌ كَبِيرَةٌ! اُهْرُبُوا!',
			super: 'الْمُسَدَّسُ الْخَارِقُ!',
			shield: 'فُقَاعَةُ الْحِمَايَةِ!',
			reverse: 'الْمَاءُ يَرُشُّ لِلْخَلْفِ!',
			golden: 'الْخَزَّانُ الذَّهَبِيُّ!',
			splashTime: 'وَقْتُ الرَّشِّ الْكَبِيرِ!',
			winner: 'مَرْحَى! أَنْتَ النَّاشِفُ الْأَخِيرُ!',
			teamWin: 'مَرْحَى! الْفَرِيقُ فَازَ!',
			tie: 'الْكُلُّ مُبَلَّلٌ! تَعَادُلٌ!',
			next: 'جَوْلَةٌ جَدِيدَةٌ!',
			paused: 'اِسْتِرَاحَةٌ قَصِيرَةٌ!'
		},
		en: {
			welcome: 'Welcome to the water battle! Who will stay dry?',
			who: "Who's playing? Tap your picture!",
			pick: 'Pick your splasher and your blaster!',
			ducky: 'You play with Ducky the duck!',
			ready: 'Find your corner, and press your water button!',
			three: 'Three!',
			two: 'Two!',
			one: 'One!',
			go: 'Splash!',
			fight: 'Go go go! Soak your friends!',
			soaked: 'Totally soaked!',
			almost: 'Watch out! You are super wet!',
			empty: 'Out of water! Go to the tap!',
			storm: 'Giant sprinkler!',
			cannon: 'Water cannon!',
			slippery: 'Slippery floor!',
			balloons: 'Water balloon shower!',
			rush: 'Water bottles! Hurry, hurry!',
			wave: 'Big wave! Run away!',
			super: 'Super soaker!',
			shield: 'Bubble shield!',
			reverse: 'Oops! Backwards water!',
			golden: 'Golden water tank!',
			splashTime: 'Big splash time!',
			winner: 'Hooray! The last one dry wins!',
			teamWin: 'Hooray! The team wins!',
			tie: 'Everybody is soaked! A tie!',
			next: 'Next round!',
			paused: 'Quick break!'
		}
	};

	// how each line is spoken: hype = quicker, brighter, louder (events, thrills); calm = slow and clear (instructions)
	const MOOD = {who: 'calm', pick: 'calm', ready: 'calm', ducky: 'calm', paused: 'calm', empty: 'calm'};

	const UI = {
		ar: {
			title: 'مَعْرَكَةُ الْمَاءِ',
			tagline: 'رُشَّ أَصْحَابَكَ، وَابْقَ نَاشِفًا!',
			play: 'اِلْعَبْ',
			next: 'التَّالِي',
			back: 'رُجُوع',
			pickTitle: 'اِخْتَرْ بَطَلَكَ',
			mode: 'اللُّعْبَةُ',
			dry: 'آخِرُ نَاشِفٍ',
			teams: 'فَرِيقَانِ',
			arena: 'الْمَلْعَبُ',
			pool: 'الْمَسْبَحُ',
			beach: 'الشَّاطِئُ',
			standard: 'عَادِيٌّ',
			rapid: 'سَرِيعٌ',
			power: 'قَوِيٌّ',
			startNow: 'اِبْدَأِ الْآنَ',
			resume: 'أَكْمِلْ',
			restart: 'مِنَ الْبِدَايَةِ',
			home: 'الْقَائِمَةُ',
			again: 'جَوْلَةٌ أُخْرَى',
			pause: 'اِسْتِرَاحَةٌ',
			volume: 'الصَّوْتُ',
			round: 'الْجَوْلَةُ {n}',
			nextIn: 'الْجَوْلَةُ التَّالِيَةُ بَعْدَ {n}',
			together: '{n} لَاعِبِينَ · الْكُلُّ يَلْعَبُ مَعًا',
			solo: 'لَاعِبٌ وَاحِدٌ · بَطْبُوطَةُ تَلْعَبُ مَعَكَ',
			teamsHint: 'فَرِيقُ الْيَسَارِ ضِدَّ فَرِيقِ الْيَمِينِ',
			left: 'الْيَسَارُ',
			right: 'الْيَمِينُ'
		},
		en: {
			title: 'Water Blaster Arena',
			tagline: 'Soak your friends, stay dry!',
			play: 'Play',
			next: 'Next',
			back: 'Back',
			pickTitle: 'Pick your splasher',
			mode: 'Game',
			dry: 'Last one dry',
			teams: 'Teams',
			arena: 'Arena',
			pool: 'Pool party',
			beach: 'Sunny beach',
			standard: 'Standard',
			rapid: 'Rapid',
			power: 'Power',
			startNow: 'Start now',
			resume: 'Keep playing',
			restart: 'Start over',
			home: 'Menu',
			again: 'Next round',
			pause: 'Break',
			volume: 'Volume',
			round: 'Round {n}',
			nextIn: 'Next round in {n}',
			together: '{n} players · everyone plays at once',
			solo: '1 player · Ducky the duck joins you',
			teamsHint: 'Left team against right team',
			left: 'Left',
			right: 'Right'
		}
	};

	window.WB_WORDS = {
		SAY,
		UI,
		MOOD,
		// every sentence the voice can say, with its mood, for tools/make_voice.py
		phrases: (lang) => Object.keys(SAY[lang]).map((k) => [SAY[lang][k], MOOD[k] || 'hype'])
	};
})();
