# Follow-ups 1: Sound Explorer

Written 2026-10-21 against commit `6b74353` (initial commit).

Everything below comes from reading the code and running throwaway checks against `js/data.js` and `js/recordings.js` (evaluated in Node). Numbers are from those checks, not estimates, unless marked otherwise.

## Summary

| # | Item | Kind | Priority |
|---|------|------|----------|
| 1.1 | Quiz can mark /r/ wrong in American words that have an audible r | Bug | P1 |
| 1.2 | Some UK clips say "a cat" / "the king", so a "wrong" option is audible | Bug | P1 |
| 1.3 | Quiz rounds usually repeat a sound (66–92% of rounds) | Bug | P1 |
| 1.4 | Notation can't be switched while the detail dialog is open | Bug / UX | P1 |
| 2.1 | 49 of 105 words have no UK recording | Audio | P1 |
| 4.1 | Most theme colors fail WCAG contrast | Accessibility | P1 |
| 5.1 | Recording credits don't meet CC BY-SA attribution | Licensing | P1 |
| 6.1 | Add a data validator script | Tooling | P2 |
| 3.x | New learning features (comparison view, listening-only mode, minimal pairs, ...) | Feature | P2–P3 |

---

## 1. Bugs and correctness

### 1.1 Quiz offers /r/ as a wrong answer when the American word has an r sound

`makeQuestion` (`js/app.js:347`) excludes a distractor if its symbol is one of the word's tokens. In KK, `tokenize()` keeps `ɪr`, `ɛr` and `ʊr` as single tokens, and `ɚ` is its own symbol. So the word never "contains" `r`, and /r/ can appear as a wrong option even though the US recording clearly has an r sound.

Affected consonant questions (KK mode):

| Target | Word | KK |
|--------|------|----|
| c-ch | chair | /tʃɛr/ |
| c-dh | mother | /ˈmʌðɚ/ |
| c-dh | father | /ˈfɑðɚ/ |
| c-zh | measure | /ˈmɛʒɚ/ |
| c-w | water | /ˈwɔtɚ/ |

A child who hears the r and picks /r/ is told they're wrong.

**Fix:** when building `inWord`, expand tokens that also contain another sound. Strictly, `ɚ` is an r-colored vowel and not /r/, but for a kids' quiz it's safest never to offer /r/ when an r is audible.

```js
// Tokens that also contain another sound, for picking distractors.
const ALSO_HAS = { kk: { "ɪr": ["r"], "ɛr": ["r"], "ʊr": ["r"], "ɚ": ["r"], "ɝ": ["r"] }, dj: {} };
const soundsIn = (t, n) => new Set(tokenize(t, n).flatMap((x) => [x, ...(ALSO_HAS[n][x] || [])]));
```

### 1.2 Some UK clips contain an extra word, so a "wrong" option is audible

14 recordings aren't the bare word: `En-uk-a cat.ogg`, `En-uk-the king.ogg`, `En-uk-to cook.ogg`, and so on. `pick()` in `tools/build_recordings.py:77` accepts them on purpose (the `stem.endswith(" " + target)` branch). The child hears "ə kæt", but the quiz treats the word as /kæt/ only.

11 quiz questions (DJ mode, or KK mode when it falls back to the UK clip) can offer an option that is actually audible:

- /ə/ for **a** cat, **a** cup, **a** car, **a** horse, **a** fork, **a** train, **a** cow, **a** mouse, **a** year
- /ð/ for **the** king
- /uː/ for **to** cook (often said /tə/, but still risky)

**Fix options:**

1. *(Recommended)* Have `build_recordings.py` also write what each clip says (for example a `says: "a cat"` entry, or a separate `RECORDING_PHRASES` map), and let `makeQuestion` add the extra word's sounds to `inWord`. Real voices stay in the quiz.
2. Simpler: the quiz never uses phrase clips and falls through to the next audio source. This loses real voices for 14 words.

### 1.3 Quiz rounds repeat sounds most of the time

`makeQuestion` picks the target at random with replacement on every question. Probability that a 10-question round repeats at least one sound:

| Mode | Pool | Rounds with a repeat |
|------|------|----------------------|
| Vowel Sounds | 21 | 92% |
| Consonant Sounds | 24 | 89% |
| Mix It Up | 45 | 66% |

**Fix:** pick the 10 targets once in `startQuiz`, for example `state.quiz.queue = shuffle(pool).slice(0, QUIZ_LENGTH)`, and have `makeQuestion` take the next one. Every pool has at least 10 sounds.

### 1.4 Notation can't be changed while the detail dialog is open

The dialog uses `showModal()` (`js/app.js:318`), which makes the rest of the page inert, header toggle included. That means the `if (state.openId) openDetail(state.openId)` branch in `setNotation` (`js/app.js:144`) can't run from the UI. Comparing DJ and KK for one sound is the main thing this page teaches, so the dialog is the place it's most needed.

**Fix:** add a small DJ/KK toggle inside the dialog that calls `setNotation`, or show both transcriptions under each example word.

---

## 2. Audio

### 2.1 UK recording coverage is about half

| Accent | Words with a recording | Missing |
|--------|------------------------|---------|
| UK (DJ) | 56 / 105 | 49 |
| US (KK) | 101 / 105 | 4 |

- **Missing UK:** ball, bath, bear, bike, bird, boat, box, boy, bus, coin, deer, duck, father, five, fox, gift, girl, goat, ice, juice, kite, leaf, lion, measure, nine, nurse, nut, panda, park, pen, pig, ring, shoe, sock, sure, ten, this, three, thumb, tiger, tour, tourist, toy, treasure, van, vest, web, yo-yo, zoo
- **Missing US:** lemon, orange, school, tourist
- **Missing both:** tourist

In DJ mode almost every other word falls back to the computer voice, and how good that sounds depends on the device's en-GB voice. Options:

1. *(Recommended)* Record the missing clips yourself and store them in the repo (for example `audio/uk/<word>.mp3`). Make `build_recordings.py` prefer local files. This also helps offline use (5.2).
2. Look for other Commons sources, such as Lingua Libre (`LL-Q1860 (eng)-…`) files. Their file names don't encode the accent, so the speaker's region would have to come from file metadata. Needs investigation.
3. Swap a few words for ones that have UK clips. Each swap needs both transcriptions and the emoji updated, then a rebuild.

### 2.2 No recording of the sound by itself

The "🔊 Listen" button in the dialog head (`js/app.js:271`) plays the first example word, not the sound. Learners of symbols benefit from hearing /æ/ alone. This needs clips per phoneme and accent (90 short files), most likely self-recorded, because generic IPA-chart recordings aren't English pronunciations. It could be an optional `sound: { uk, us }` field per phoneme.

### 2.3 Preload upcoming audio

The first tap on a word waits on a network fetch. Two improvements:

- When the dialog opens, create `Audio` objects with `preload = "auto"` for its 3 words.
- In the quiz, preload the next question's clip while the child answers the current one.

### 2.4 Sentences always use the computer voice

This is fine for now, and quality varies by device. It's lower priority than 2.1.

---

## 3. Learning features

### 3.1 DJ ↔ KK comparison view (high value)

18 of the 45 sounds use different symbols in the two notations. Worse, 4 symbols mean **different sounds** depending on the notation:

| Symbol | In DJ | In KK |
|--------|-------|-------|
| i | short i (fish) | long ee (sea) |
| u | short u (book) | long oo (moon) |
| e | short e (bed) | ay (cake) |
| ɔ | short o (hot) | long aw (ball) |

A table or tab showing both columns side by side, with these four highlighted as "tricky", would directly address the main confusion of learning two notations.

### 3.2 Cards with the same symbol

In DJ mode the Vowels tab shows two `/ə/` cards (`schwa`, `schwa-r`). In KK mode it shows two `/ɑ/` cards (`short-o`, `long-ah`). They look like duplicates. Add a short subtitle on the card ("lazy sound at the end", "long ah"), or a badge explaining that this notation uses one symbol for both.

### 3.3 Listening-only quiz mode

The quiz prints the word (`js/app.js:448`), so many answers can be found from the spelling: the "p" in "pig", the "sh" in "ship". Add a mode, or a toggle, that shows only the emoji, so the child has to listen.

### 3.4 More game types

- **Minimal pairs:** "ship or sheep?", "cat or cut?", "fan or van?". This is the classic way to train hearing similar sounds. It needs a small list of pairs in `data.js`.
- **Reading transcriptions:** show `/kæt/` and pick the picture. This is the skill these symbols exist for, which is reading dictionary entries.
- **Symbol → word:** show `/ʃ/` and pick which of four pictures has it.

### 3.5 Progress and adaptive practice

- Track right and wrong answers per sound in `localStorage`, show a "sounds I know" view, and pick missed sounds more often.
- Keep best scores per notation too. Today `state.best` is keyed by mode only, so DJ and KK share one score.

### 3.6 Smaller content additions

- **Stress mark:** transcriptions contain `ˈ` with no explanation. A one-line kid-friendly note ("the little mark means say this part louder") would help.
- **Sentence highlights:** `highlightSentence` only marks the 3 example words. In "Look at the good book." only "book" is marked, though "look" and "good" share the sound. An optional `highlight: [...]` list per phoneme would fix this.
- **Spelling patterns (phonics):** for example /iː/ is spelled ee, ea, e_e. This would be an optional `spellings` field.
- **Mouth pictures:** a simple illustration or animation per sound next to the text tip.
- **Record and compare:** record yourself with `MediaRecorder` and play it back after the model voice. Keep it local and never upload. This needs microphone permission, so it should be opt-in.
- **Printable flashcards:** a print stylesheet for the card grid.

---

## 4. Accessibility

### 4.1 Contrast

Computed WCAG contrast ratios. Large text means ≥24px, or ≥18.66px bold, and needs 3:1. Other text needs 4.5:1.

| Element | Ratio | Needs | Result |
|---------|-------|-------|--------|
| Header white text on #ffb347 / #ff8a3d | 1.78 / 2.35 | 3.0 | ❌ |
| `.play-btn` white on `--brand` (18px) | 2.35 | 4.5 | ❌ |
| Footer links / `.partner-link` `--brand-dark` on white | 3.33 | 4.5 | ❌ |
| Vowel card symbol on soft bg | 2.29 | 3.0 | ❌ |
| Voiceless card symbol | 2.49 | 3.0 | ❌ |
| Voiced card symbol | 2.29 | 3.0 | ❌ |
| Diphthong card symbol | 3.37 | 3.0 | ✅ |
| Quiz feedback good / bad on white | 2.61 / 2.78 | 3.0 | ❌ |
| `--ink-soft` on `--bg` | 5.92 | 4.5 | ✅ |

**Fix:** darken the strong colors (`--vowel`, `--voiced`, `--voiceless`, `--brand`, `--good`, `--bad`). Keep the bright tones for borders and backgrounds, where the requirement is only 3:1 against neighbors.

### 4.2 Focus management

- After **Next ➜**, `render()` removes the focused button and focus falls to `<body>`, so keyboard users have to tab from the top. Focus "Listen again" or the first option instead.
- Clicking the partner link in the dialog replaces the dialog content and loses focus in the same way.

### 4.3 Screen readers

- Options are labeled `Sound ɪ`, and screen readers read IPA characters poorly or not at all. Give each phoneme a speakable name (for example `name: "short i, as in fish"`) and use it in `aria-label`.
- The toast is a polite live region and announces "Real voice" on every tap. Only announce fallbacks.
- The quiz `.feedback` region is inserted already filled in, so some screen readers won't announce it. Keep one persistent live region and update its text.

### 4.4 Small layout items

- The dialog `max-height: calc(100vh - 32px)` (`css/style.css:248`) can overflow behind mobile browser toolbars. Use `dvh` with `vh` as a fallback.

---

## 5. Licensing, hosting and offline use

### 5.1 Per-file credits for recordings

The footer credits "Wiktionary and Wikimedia Commons (CC BY-SA)" in general. CC BY-SA asks for credit to each work's author plus the license, and some Commons files may use other licenses (CC BY, CC0, GFDL). The build script can request `iiprop=url|extmetadata` (`tools/build_recordings.py:109`) to get `Artist` and `LicenseShortName` for each file. It could then write a credits list that the page shows in a "Credits" dialog or on a separate page.

### 5.2 Offline and classroom use

The page needs the internet for fonts and every recording. For classrooms with poor Wi-Fi:

- Self-host the two fonts as a subset that includes the IPA Extensions and Spacing Modifier ranges (so `ː` and `ˈ` render in Noto Sans and not a fallback font; worth checking in the browser today).
- Add a service worker that caches the page and recordings, and a web app manifest so it can be installed. Service workers don't run from `file://`, so this applies only when the page is served over HTTP(S). Opening `index.html` directly keeps working as it does now.
- Local clips from 2.1 option 1 make this simpler.

### 5.3 Hosting

The site is fully static, so GitHub Pages (or similar) works with no changes. A public URL also makes it easy to share with teachers and students.

---

## 6. Tooling and maintenance

### 6.1 Data validator

CLAUDE.md asks contributors to keep transcriptions consistent by hand. A small script could check:

- every phoneme has exactly 3 words
- `pair` links point at each other
- every word's transcription contains the phoneme's symbol in **both** notations, using the same longest-match tokenizer as the app
- no leftover characters after tokenizing (other than `ˈ ˌ`)
- a word that appears under several phonemes has identical `dj`, `kk` and `emoji` everywhere
- coverage report: words without a UK or US recording, and recordings that contain an extra word (1.2)

I ran these checks for this review. **The current data passes all of the structural checks.** The issues above are in quiz logic and audio, not in the data.

Node can evaluate `data.js` as-is with the built-in `vm` module (no dependencies), so `node tools/check_data.js` stays in the "no package manager" spirit. Doing it in Python would mean parsing JS with regexes. Node is available on the dev machine (v22).

### 6.2 `build_recordings.py` hardening

- The fallback `stem.startswith(target)` (`tools/build_recordings.py:89`) would accept a different word's clip, for example a hypothetical `En-us-icebox.ogg` for "ice". It doesn't happen today. Restricting the fallback to known lead-in words (`a`, `an`, `the`, `to`) is safer, and that list also feeds 1.2.
- Print the non-exact picks in the summary, so new phrase clips get noticed.
- `words_from_data()` scrapes `word: "..."` with a regex. Fine for now. If the validator from 6.1 is in Node, it could export the word list instead.

### 6.3 Link checking and CI

- Commons files get renamed or deleted occasionally. A periodic `HEAD` check over the URLs in `recordings.js` would catch broken links.
- A GitHub Actions workflow could run the validator on every push, plus the link check on a weekly schedule.
- Optional: a headless browser smoke test (Playwright). This adds a dev dependency, so it's a trade-off with the no-tooling goal.

### 6.4 Notation is hard-coded as two values

`dj`/`kk` are assumed to be the only two notations in `js/app.js` lines 36, 44, 131, 145, 256 and 357–358. Moving these into one `NOTATIONS` table (key, label, accent, toast text) would make 7.1 a data change rather than a refactor.

---

## 7. Bigger directions (decide before starting)

### 7.1 Third notation: modern British IPA

The DJ symbols here are the older school-dictionary style (`i`, `ou`, `əː`, `ɛə`). Current learner dictionaries (Cambridge, Oxford) and many textbooks use the Gimson-style set: `ɪ ʊ ɒ ɜː eɪ əʊ eə ʊə`, and so on. Adding it would need a third transcription for all 105 words plus 6.4. This is worth it if learners also use modern dictionaries.

### 7.2 Chinese UI and tips

KK is mainly taught in Taiwan, and DJ appears in textbooks across Taiwan, Hong Kong and mainland China. If young learners there are the audience, Chinese mouth tips and UI text (zh-TW and/or zh-CN) would help children who can't yet read English instructions. This means making `tip`, `note`, `INTROS` and button labels per-language.

---

## Suggested order

1. **Quick fixes:** 1.1, 1.3, 1.4, 4.2, then 1.2 together with the 6.2 build-script changes.
2. **Foundations:** 6.1 validator, 4.1 contrast pass, 5.1 credits.
3. **Audio:** 2.1 (record missing UK words), 2.3 preloading.
4. **Learning value:** 3.1 comparison view, 3.3 listening-only mode, 3.4 minimal pairs.
5. **Later:** 3.5 progress, 5.2 offline, 7.x depending on audience.

## Open questions

- Who is the main audience (age, region)? This decides 7.1 and 7.2.
- Is self-recording audio an option? It is the cleanest fix for 2.1 and 2.2.
- Is Node acceptable as a dev-only tool for the validator?
