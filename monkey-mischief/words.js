/* Monkey Mischief: every word the game shows or says, in Arabic (with full harakat) and English.
   SAY = spoken by the recorded kids' voice (audio/<lang>/) and shown on screen.
   UI  = shown only (buttons, labels).
   After changing any SAY text, record the voice again: python3 tools/make_voice.py */
(() => {
	const SAY = {
		ar: {
			welcome: 'يَا هَلَا بِالْقُرُودِ الْمُشَاغِبَةِ! مَنْ سَيَجْمَعُ أَكْثَرَ مَوْزٍ؟',
			who: 'مَنْ يَلْعَبُ؟ اِضْغَطْ عَلَى صُورَتِكَ!',
			coco: 'سَتَلْعَبُ مَعَ الْقِرْدِ كُوكُو!',
			ready: 'اِبْحَثْ عَنْ زَاوِيَتِكَ، وَاضْغَطْ زِرَّكَ!',
			three: 'ثَلَاثَة!',
			two: 'اِثْنَان!',
			one: 'وَاحِد!',
			go: 'اِنْطَلِقُوا!',
			hunt: 'هَيَّا! صَيْدُ الْمَوْزِ بَدَأَ!',
			chaos: 'اِنْتَبِهُوا! فَوْضَى الْغَابَةِ!',
			frenzy: 'يَا سَلَام! جُنُونُ الْمَوْزِ!',
			golden: 'مَوْزَةٌ ذَهَبِيَّةٌ! مَنْ يَأْخُذُهَا أَوَّلًا؟',
			coconuts: 'اِحْذَرُوا! جَوْزُ الْهِنْدِ يَتَسَاقَطُ!',
			gorilla: 'اُنْظُرُوا! الْغُورِيلَّا قَادِمَةٌ! اُهْرُبُوا!',
			gorillaBye: 'مَعَ السَّلَامَةِ يَا غُورِيلَّا!',
			rain: 'مَطَرُ الْمَوْزِ! اِجْمَعُوا، اِجْمَعُوا!',
			twenty: 'عِشْرُونَ ثَانِيَةً فَقَطْ! أَسْرِعُوا!',
			timeUp: 'اِنْتَهَى الْوَقْتُ! مَنْ فَازَ يَا تُرَى؟',
			thief: 'لِصٌّ! لِصٌّ! اِمْسِكُوهُ!',
			caught: 'أَمْسَكْتَهُ! رَجَعَ الْمَوْزُ!',
			speed: 'سُرْعَةٌ خَارِقَةٌ!',
			shield: 'دِرْعُ الْمَوْزِ!',
			jump: 'قَفْزَةٌ خَارِقَةٌ!',
			magnet: 'مِغْنَاطِيسُ الْمَوْزِ!',
			bomb: 'قُنْبُلَةُ الزَّلَقِ!',
			winner: 'مَرْحَى! عِنْدَنَا بَطَلٌ!',
			tie: 'تَعَادُلٌ! كُلُّكُمْ أَبْطَالٌ!',
			paused: 'اِسْتِرَاحَةٌ قَصِيرَةٌ!',
			again: 'هَيَّا نَلْعَبُ مَرَّةً أُخْرَى!'
		},
		en: {
			welcome: 'Hello, mischief monkeys! Who will grab the most bananas?',
			who: "Who's playing? Tap your picture!",
			coco: 'You play with Coco the monkey!',
			ready: 'Find your corner, and press your button!',
			three: 'Three!',
			two: 'Two!',
			one: 'One!',
			go: 'Go!',
			hunt: 'Go go go! The banana hunt is on!',
			chaos: 'Uh oh! Jungle chaos!',
			frenzy: 'Woohoo! Banana frenzy!',
			golden: 'A golden banana! Who will get it first?',
			coconuts: 'Look out! Coconuts are falling!',
			gorilla: 'Oh no! The big gorilla is coming! Run!',
			gorillaBye: 'Bye bye, gorilla!',
			rain: "It's raining bananas! Grab them, grab them!",
			twenty: 'Only twenty seconds left! Hurry, hurry!',
			timeUp: "Time's up! Who won?",
			thief: 'Thief! Thief! Catch them!',
			caught: 'Got it back!',
			speed: 'Super speed!',
			shield: 'Banana shield!',
			jump: 'Super jump!',
			magnet: 'Banana magnet!',
			bomb: 'Slippery bomb!',
			winner: 'Hooray! We have a champion!',
			tie: "It's a tie! You are all champions!",
			paused: 'Quick break!',
			again: "Let's play again!"
		}
	};

	// how each line is spoken: hype = quicker, brighter, louder (events, thrills); calm = slow and clear (instructions)
	const MOOD = {who: 'calm', ready: 'calm', coco: 'calm', paused: 'calm', again: 'calm'};

	const UI = {
		ar: {
			title: 'قُرُودٌ مُشَاغِبَةٌ',
			tagline: 'اِجْمَعِ الْمَوْزَ، اِخْطَفْ، وَازْلِقْ أَصْحَابَكَ!',
			play: 'اِلْعَبْ',
			next: 'التَّالِي',
			controls: 'كَيْفَ يَتَحَرَّكُ الْقِرْدُ؟',
			joy: 'عَصَا التَّحَكُّمِ',
			finger: 'اِتْبَعْ إِصْبَعِي',
			length: 'مُدَّةُ اللُّعْبَةِ',
			short: 'دَقِيقَتَان',
			long: '٣ دَقَائِق',
			readyHint: 'كُلُّ لَاعِبٍ يَضْغَطُ زِرَّهُ',
			startNow: 'اِبْدَأِ الْآنَ',
			resume: 'أَكْمِلْ',
			restart: 'مِنَ الْبِدَايَةِ',
			home: 'الْقَائِمَةُ',
			results: 'النَّتِيجَةُ',
			again: 'مَرَّةً أُخْرَى',
			players: 'اللَّاعِبُونَ',
			bot: 'كُوكُو',
			pause: 'اِسْتِرَاحَةٌ',
			together: '{n} لَاعِبِينَ · الْكُلُّ يَلْعَبُ مَعًا',
			solo: 'لَاعِبٌ وَاحِدٌ · كُوكُو يَلْعَبُ مَعَكَ',
			bananas: 'مَوْزَة'
		},
		en: {
			title: 'Monkey Mischief',
			tagline: 'Grab bananas, sneak, steal and slip your friends!',
			play: 'Play',
			next: 'Next',
			controls: 'How does your monkey move?',
			joy: 'Joystick',
			finger: 'Follow my finger',
			length: 'Game length',
			short: '2 minutes',
			long: '3 minutes',
			readyHint: 'Everyone press your button',
			startNow: 'Start now',
			resume: 'Keep playing',
			restart: 'Start over',
			home: 'Menu',
			results: 'Results',
			again: 'Play again',
			players: 'Players',
			bot: 'Coco',
			pause: 'Break',
			together: '{n} players · everyone plays at once',
			solo: '1 player · Coco the monkey joins you',
			bananas: 'bananas'
		}
	};

	window.MM_WORDS = {
		SAY,
		UI,
		MOOD,
		// every sentence the voice can say, with its mood, for tools/make_voice.py
		phrases: (lang) => Object.keys(SAY[lang]).map((k) => [SAY[lang][k], MOOD[k] || 'hype'])
	};
})();
