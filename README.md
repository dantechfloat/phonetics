# Sound Explorer

A kid-friendly web page for learning English phonetic symbols.

- 45 sounds: short and long vowels, double vowels, and consonants
- Switch between **DJ** (British) and **KK** (American) symbols at the top of the page
- Every sound has a mouth tip, 3 picture words with full transcriptions, and an example sentence
- Real voice recordings (UK for DJ, US for KK) from Wiktionary / Wikimedia Commons, with the browser's computer voice as a fallback
- "Slow" mode for slower playback
- Sound Game: listen to a word and pick its sound (10 questions, best scores are saved)

## Run

No build step. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

An internet connection is needed for the recordings and web fonts.

## Files

- `js/data.js` - all sounds, words, transcriptions and sentences
- `js/recordings.js` - recording URLs (generated)
- `js/audio.js` - playback and fallbacks
- `js/app.js` - page logic and the Sound Game
- `tools/build_recordings.py` - regenerates `js/recordings.js` after you change the words in `js/data.js`
- `tools/check_data.js` - checks `js/data.js` and `js/recordings.js` for mistakes (`node tools/check_data.js`)
