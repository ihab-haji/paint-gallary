/* Every word the puzzle game shows or says. Arabic is written with full harakat: the recorded voice
   (ar-SA Zariyah, audio/ar/) reads exactly this text. After changing a spoken sentence, record the voice again:
   python3 tools/make_voice.py */
(() => {
	// picture and animal names: [Arabic, English]
	const NAMES = {
		puppy: ['الْجَرْوُ الْمَرِحُ', 'The happy puppy'],
		dino: ['الدَّيْنَاصُورُ الصَّغِيرُ', 'The little dinosaur'],
		turtle: ['السُّلَحْفَاةُ فِي الْبَحْرِ', 'The sea turtle'],
		farm: ['أَصْدِقَاءُ الْمَزْرَعَةِ', 'Farm friends'],
		ocean: ['أَصْدِقَاءُ الْبَحْرِ', 'Ocean friends'],
		picnic: ['نُزْهَةٌ فِي الْغَابَةِ', 'Picnic in the forest'],
		jungle: ['أَسَدُ الْغَابَةِ', 'The jungle lion'],
		space: ['صَارُوخٌ فِي الْفَضَاءِ', 'Rocket in space'],
		arctic: ['أَصْدِقَاءُ الثَّلْجِ', 'Snow friends'],
		dog: ['الْكَلْبُ', 'the dog'],
		cat: ['الْقِطَّةُ', 'the cat'],
		owl: ['الْبُومَةُ', 'the owl'],
		fish: ['السَّمَكَةُ', 'the fish'],
		bunny: ['الْأَرْنَبُ', 'the bunny']
	};

	// "build the dog!" needs the accusative in Arabic
	const BUILD = {
		dog: 'رَكِّبِ الْكَلْبَ!', cat: 'رَكِّبِ الْقِطَّةَ!', owl: 'رَكِّبِ الْبُومَةَ!', fish: 'رَكِّبِ السَّمَكَةَ!', bunny: 'رَكِّبِ الْأَرْنَبَ!'
	};

	const T = {
		ar: {
			title: 'لُعْبَةُ التَّرْكِيبِ',
			pictures: 'الصُّوَرُ',
			animals: 'رَكِّبِ الْحَيَوَانَ',
			pieces: (n) => `${String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])} قِطَع`,
			lv1: 'سَهْلٌ جِدًّا', lv2: 'سَهْلٌ', lv3: 'مُتَوَسِّطٌ', lv4: 'بَطَلٌ',
			// spoken
			pick: 'اِخْتَرْ صُورَةً!',
			howMany: 'كَمْ قِطْعَةً تُرِيدُ؟',
			start: 'ضَعْ كُلَّ قِطْعَةٍ فِي مَكَانِهَا!',
			great: ['رَائِعٌ!', 'نَعَمْ!', 'مُمْتَازٌ!', 'أَحْسَنْتَ!'],
			last: 'بَقِيَتْ قِطْعَةٌ وَاحِدَةٌ!',
			win: 'أَحْسَنْتَ! لَقَدْ أَكْمَلْتَهَا!',
			hint: 'اُنْظُرْ! هُنَا مَكَانُهَا.',
			build: (id) => BUILD[id],
			name: (id) => NAMES[id][0]
		},
		en: {
			title: 'Puzzle Time',
			pictures: 'Pictures',
			animals: 'Build an animal',
			pieces: (n) => `${n} pieces`,
			lv1: 'Tiny', lv2: 'Easy', lv3: 'Medium', lv4: 'Champion',
			pick: 'Choose a picture!',
			howMany: 'How many pieces?',
			start: 'Put every piece in its place!',
			great: ['Great!', 'Yes!', 'Super!', 'Well done!'],
			last: 'One more piece!',
			win: 'You did it! Amazing!',
			hint: 'Look! It goes here.',
			build: (id) => `Build ${NAMES[id][1]}!`,
			name: (id) => NAMES[id][1]
		}
	};

	// the text that is read aloud: no emoji, single spaces (the clip manifest uses the same key)
	const speechKey = (text) => text.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu, '').replace(/\s+/g, ' ').trim();

	// every sentence the game can say in one language: the list the voice is recorded from
	function phrases(lang) {
		const t = T[lang];
		const scenes = ['puppy', 'dino', 'turtle', 'farm', 'ocean', 'picnic', 'jungle', 'space', 'arctic'];
		const all = [t.pick, t.howMany, t.start, ...t.great, t.last, t.win, t.hint, ...scenes.map(t.name), ...Object.keys(BUILD).map(t.build)];

		return [...new Set(all.map(speechKey))];
	}

	window.PUZZLE_WORDS = {T, NAMES, speechKey, phrases};
})();
