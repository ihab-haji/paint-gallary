/* Balloon Panic: every word the game shows or says, in Arabic (with full harakat) and English.
   SAY = spoken by the recorded kids' voice (audio/<lang>/) and shown on screen.
   UI  = shown only (buttons, labels, the awards at the end).
   After changing any SAY text, record the voice again: python3 tools/make_voice.py */
(() => {
	const SAY = {
		ar: {
			who: 'مَنْ يَلْعَبُ؟ اِخْتَرْ صَدِيقَكَ!',
			ready: 'أَسْرِعُوا! مَرِّرُوا قَبْلَ الْفَرْقَعَةِ!',
			three: 'ثَلَاثَة!',
			two: 'اِثْنَان!',
			one: 'وَاحِد!',
			go: 'اِنْطَلِقُوا!',
			double: 'اِثْنَانِ مَعًا! يَا لَلْوَرْطَةِ!',
			giant: 'عِمْلَاقٌ! عِمْلَاقٌ!',
			tiny: 'صَغِيرٌ جِدًّا! أَيْنَ هُوَ؟',
			fake: 'خَدَعْتُكُمْ! لَا فَرْقَعَةَ!',
			speed: 'سُرْعَةٌ خَارِقَةٌ!',
			sticky: 'لَزِجٌ! اِضْغَطْ، اِضْغَطْ، اِضْغَطْ!',
			reverse: 'اِنْعَكَسَ الِاتِّجَاهُ!',
			clone: 'اِنْتَبِهُوا! وَاحِدٌ مِنْهُمَا مُزَيَّفٌ!',
			lastsec: 'بِسُرْعَةٍ! الْفَرْقَعَةُ قَرِيبَةٌ!',
			bounce: 'قَفَزَاتٌ مَجْنُونَةٌ!',
			shield: 'دِرْعٌ سِحْرِيٌّ!',
			saved: 'أَنْقَذَكَ الدِّرْعُ!',
			lastRound: 'الْجَوْلَةُ الْأَخِيرَةُ!',
			winner: 'مَرْحَى! عِنْدَنَا بَطَلٌ!',
			tie: 'تَعَادُلٌ! كُلُّكُمْ أَبْطَالٌ!',
			paused: 'اِسْتِرَاحَةٌ قَصِيرَةٌ!',
			again: 'هَيَّا نَلْعَبُ مَرَّةً أُخْرَى!'
		},
		en: {
			who: "Who's playing? Pick your buddy!",
			ready: 'Quick! Pass it before it pops!',
			three: 'Three!',
			two: 'Two!',
			one: 'One!',
			go: 'Go!',
			double: 'Double trouble!',
			giant: 'Giant size!',
			tiny: 'So tiny! Where is it?',
			fake: 'Just kidding! No pop!',
			speed: 'Super speed!',
			sticky: 'Sticky! Tap, tap, tap!',
			reverse: 'Switch! The other way!',
			clone: 'Look out! One of them is a fake!',
			lastsec: 'Hurry! It is about to pop!',
			bounce: 'Crazy bounce!',
			shield: 'A magic shield!',
			saved: 'Saved by the shield!',
			lastRound: 'Last round!',
			winner: 'Hooray! We have a champion!',
			tie: "It's a tie! You are all champions!",
			paused: 'Quick break!',
			again: "Let's play again!"
		}
	};

	// how each line is spoken: hype = quicker, brighter, louder (thrills); calm = slow and clear (instructions)
	const MOOD = {who: 'calm', paused: 'calm', again: 'calm'};

	const UI = {
		ar: {
			title: 'فَرْقَعَةُ الْبَالُونِ',
			tagline: 'مَرِّرْهُ بِسُرْعَةٍ قَبْلَ أَنْ يُفَرْقِعَ!',
			play: 'اِلْعَبْ',
			who: 'مَنْ يَلْعَبُ؟',
			pickMany: '{n} لَاعِبِينَ · الْكُلُّ يَلْعَبُ مَعًا',
			pickOne: 'لَاعِبٌ وَاحِدٌ · صَدِيقٌ يَنْضَمُّ إِلَيْكَ',
			pickNone: 'اِضْغَطْ عَلَى صَدِيقٍ لِيَلْعَبَ',
			balloon: 'بَالُون',
			bomb: 'قُنْبُلَةٌ مُضْحِكَةٌ',
			easy: 'هَادِئ',
			fast: 'سَرِيع',
			resume: 'أَكْمِلْ',
			restart: 'مِنَ الْبِدَايَةِ',
			home: 'الْقَائِمَةُ',
			again: 'مَرَّةً أُخْرَى',
			pause: 'اِسْتِرَاحَةٌ',
			passes: 'تَمْرِيرَات',
			survived: 'نَجَاة',
			pops: 'فَرْقَعَات',
			funniest: 'أَطْرَفُ لَحْظَةٍ',
			t_lucky: 'النَّاجِي الْمَحْظُوظُ',
			t_panic: 'مَلِكُ اللَّحْظَةِ الْأَخِيرَةِ',
			t_fast: 'أَسْرَعُ يَدَيْنِ',
			t_prank: 'مَلِكُ الْمَقَالِبِ',
			t_magnet: 'مِغْنَاطِيسُ الْفَرْقَعَةِ',
			t_star: 'نَجْمُ الْحَفْلَةِ',
			m_close: '{n} مَرَّرَ فِي آخِرِ لَحْظَةٍ!',
			m_streak: '{n} تَفَرْقَعَ {k} مَرَّاتٍ مُتَتَالِيَةٍ!',
			m_saved: 'الدِّرْعُ السِّحْرِيُّ أَنْقَذَ {n}!',
			m_fake: 'الْخُدْعَةُ أَفْزَعَتِ الْجَمِيعَ!',
			m_prank: '{n} خَدَعَ الْجَمِيعَ بِرَمْيَةٍ وَهْمِيَّةٍ!',
			m_afro: '{n} وَالشَّعْرُ الْعِمْلَاقُ!',
			m_pop: 'يَا لَهَا مِنْ فَرْقَعَةٍ!',
			n_bunny: 'لُولُو', n_bear: 'دَبْدُوب', n_frog: 'نَطَّاط', n_fox: 'فُلْفُل', n_panda: 'بَنْدُق', n_chick: 'كَتْكُوت'
		},
		en: {
			title: 'Balloon Panic',
			tagline: 'Pass it quick, before it pops!',
			play: 'Play',
			who: "Who's playing?",
			pickMany: '{n} players · everyone plays at once',
			pickOne: '1 player · a buddy joins you',
			pickNone: 'Tap a buddy to play',
			balloon: 'Balloon',
			bomb: 'Silly bomb',
			easy: 'Gentle',
			fast: 'Fast',
			resume: 'Keep playing',
			restart: 'Start over',
			home: 'Menu',
			again: 'Play again',
			pause: 'Break',
			passes: 'passes',
			survived: 'escapes',
			pops: 'pops',
			funniest: 'Funniest moment',
			t_lucky: 'Lucky Survivor',
			t_panic: 'Panic Master',
			t_fast: 'Fastest Hands',
			t_prank: 'Master Prankster',
			t_magnet: 'Explosion Magnet',
			t_star: 'Party Star',
			m_close: '{n} passed it at the very last blink!',
			m_streak: '{n} got popped {k} times in a row!',
			m_saved: 'The magic shield saved {n}!',
			m_fake: 'The fake pop scared everyone!',
			m_prank: '{n} fooled everyone with a fake throw!',
			m_afro: '{n} and the giant hairdo!',
			m_pop: 'What a pop!',
			n_bunny: 'Lulu', n_bear: 'Bobo', n_frog: 'Hoppy', n_fox: 'Pepper', n_panda: 'Dumpling', n_chick: 'Peep'
		}
	};

	window.BP_WORDS = {
		SAY,
		UI,
		MOOD,
		// every sentence the voice can say, with its mood, for tools/make_voice.py
		phrases: (lang) => Object.keys(SAY[lang]).map((k) => [SAY[lang][k], MOOD[k] || 'hype'])
	};
})();
