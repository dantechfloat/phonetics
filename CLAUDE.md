# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sound Explorer: a kid-friendly static web page for learning English phonetic symbols (45 sounds) in two notations, **DJ** (Daniel Jones, British) and **KK** (Kenyon & Knott, American). Plain HTML/CSS/vanilla JS with no build step, no package manager, no framework, and no test suite. The only check is a dependency-free data validator (Node).

## Commands

```sh
python3 -m http.server 8000           # serve locally, then open http://localhost:8000
python3 tools/build_recordings.py     # regenerate js/recordings.js from words in js/data.js (needs network)
node tools/check_data.js              # validate js/data.js + js/recordings.js, print recording coverage
```

The page needs internet access for the Wikimedia recordings and Google Fonts.

## Architecture

Scripts are plain globals loaded in a fixed order by `index.html` (order matters):

1. `js/data.js` defines `NOTATIONS`, `LEAD_INS`, `CATEGORIES`, `GROUPS`, `PHONEMES`, the single source of content.
2. `js/recordings.js` defines `RECORDINGS` (word → `{uk, us}` → `{ file, urls: [mp3Url, originalUrl], page, author, license, licenseUrl?, says? }`; the author and license feed the Credits dialog). `says` is set when the clip is a phrase such as "a cat"; the build script only accepts the lead-in words in its `LEAD_INS`. **Generated; do not edit by hand.**
3. `js/audio.js` defines the `SoundPlayer` IIFE (`playWord`, `playSentence`, `preload`, `stop`).
4. `js/app.js` is an IIFE holding all UI state and rendering.

### Data model (`PHONEMES`)

Each phoneme has `id`, `name` (speakable, e.g. "short i"; used in `aria-label`s because screen readers read IPA poorly), `category` (`vowel` | `diphthong` | `consonant`), `group` (a key of `GROUPS`), `dj` and `kk` symbols, `tip`, `sentence`, optional `note`, and exactly 3 `words`, each `{ word, emoji, dj, kk }` with a full transcription in **both** notations. Consonants in the `pair` group also have `voicing` (`voiced` | `voiceless`) and `pair` (the partner's `id`); pairs must point at each other because the pair grid is built from the voiceless side.

When you add or change words, keep both transcriptions consistent with the phoneme symbols, because the app tokenizes transcriptions using the set of `PHONEMES` symbols. Then rerun `tools/build_recordings.py` and `node tools/check_data.js` (it uses the same tokenizer and reports transcriptions missing their sound, unknown characters, inconsistent repeated words and broken pairs). The build script scrapes `word: "..."` with a regex, so keep that literal format.

### Notation ↔ accent

`NOTATIONS` lists each notation's `id` (also the key used on phonemes and words), `label`, `accent` (`uk` / `us`), `accentName` and `alsoHas` (symbols that also contain another sound, e.g. KK `ɚ` contains an audible r; used for quiz distractors). The header radio buttons are built from it, and app.js never hard-codes `dj` / `kk` apart from the default. `state.notation` drives everything: displayed symbols (`p[state.notation]`), transcriptions, and audio accent. Changing notation re-renders the view and any open detail dialog. The dialog has its own notation switch, because `showModal()` makes the header switch inert.

### Rendering (`js/app.js`)

- Full re-render via `render()` into `<main id="view">` using the small `el(tag, attrs, children)` DOM helper (no innerHTML templating).
- `tokenize()` splits a transcription by longest-match against the current notation's symbols, so multi-character symbols like `tʃ` and `ai` stay whole. It is used to highlight the target sound and to pick quiz distractors that don't occur in the word.
- Tabs: one per category, `compare` (DJ vs KK table; "tricky" symbols are computed as symbols that different notations use for disjoint sets of sounds) and `quiz`.
- The detail view is a native `<dialog>`. The Sound Game (`MODES`, `GAME_GROUPS`, `QUIZ_LENGTH = 10`) keeps its state in `state.quiz`. Each mode has a question `type`: `hear` (hear a word, pick its sound), `find` (see a symbol, pick the picture with that sound) or `read` (see a transcription, pick the picture). All questions of a round are made in `startQuiz`, each with `answer` and `options` (sound ids for `hear`, word texts otherwise).
- Settings (notation, slow, tab, best scores, ears-only) persist to `localStorage` key `soundExplorer.v1`, wrapped in try/catch so the page still works without storage.

### Audio fallback (`js/audio.js`)

`playWord` tries, in order: a real recording in the selected accent (MP3 transcode, then the original file), then the browser `speechSynthesis` voice in that accent, then a recording in the other accent, then any speech voice. It returns `"recorded" | "computer" | "recorded-other" | "skipped"`, and app.js shows a toast for each. A `playToken` counter cancels stale plays. Sentences always use speech synthesis. Slow mode sets `playbackRate` to 0.7 for recordings and the speech rate to 0.6.

### Styling

`css/style.css` uses CSS custom properties on `:root`. Cards are colored by the `data-cat` / `data-voicing` attributes (vowel, diphthong, voiced, voiceless). Bright colors are only for borders and backgrounds; text uses the darker `--*-ink` / `--brand-strong` tokens, which meet WCAG AA contrast.
