# Sound Explorer

[日本語](README.md) | **English**

A kid-friendly web page for learning English phonetic symbols.

- 45 sounds: short and long vowels, double vowels, and consonants
- Switch between **DJ** (British) and **KK** (American) symbols at the top of the page
- Every sound has a mouth tip, common spellings (e.g. "ee" as in tree), 3 picture words with full transcriptions, and an example sentence with every word that has the sound highlighted
- Real voice recordings (UK for DJ, US for KK) from Wiktionary / Wikimedia Commons, with the browser's computer voice as a fallback
- "Slow" mode for slower playback
- "Say it yourself": record your own voice and compare it with the real recording (the recording stays on your device and is never uploaded)
- DJ vs KK tab: the same sounds side by side, plus "tricky symbols" that look the same in both but mean different sounds
- Printable flashcards for each group of sounds
- Sound Game (10 questions, best scores are saved for each game and notation):
  - Hear it: listen to a word and pick its sound (vowels, consonants or a mix), or tell two words apart in "Which Word?" (ship or sheep?). An "ears only" option hides the word so you have to listen
  - Read it: "Find the Sound" (see a symbol, pick the picture with that sound) and "Read It!" (read a transcription, pick the picture)
  - Progress is tracked per sound (not tried yet, still learning, I know it!), and sounds you miss come up more often

## Run

No build step. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

An internet connection is needed for the recordings and web fonts. When the page is served over http(s) (not opened from disk), it works offline after the first visit, can be installed as an app, and the footer has a button to save all recordings for offline use, e.g. before a class with poor Wi-Fi.

## Files

- `js/data.js` - all sounds, words, transcriptions and sentences
- `js/recordings.js` - recording URLs (generated)
- `js/audio.js` - playback and fallbacks
- `js/app.js` - page logic and the Sound Game
- `tools/build_recordings.py` - regenerates `js/recordings.js` after you change the words in `js/data.js`
- `tools/check_data.js` - checks `js/data.js` and `js/recordings.js` for mistakes (`node tools/check_data.js`)
- `tools/check_links.js` - checks that every recording still exists on Wikimedia Commons (`node tools/check_links.js`)
