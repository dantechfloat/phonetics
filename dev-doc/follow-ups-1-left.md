# Follow-ups 1: what's left

Written 2026-10-21 against branch `follow-ups-1` (27 commits on top of `master`, up to `e33e753`). This is a companion to `follow-ups-1.md`. Item numbers refer to that document.

Everything else in `follow-ups-1.md` is done. The items below need recordings, artwork or a decision, or they were deliberately left as they are.

## Summary

| # | Item | Blocked on | Priority |
|---|------|------------|----------|
| 2.1 | 60 of 120 words have no UK recording | Someone recording them | P1 |
| 2.1a | Only 3 of 14 minimal pairs have UK recordings for both words | Same as 2.1 | P1 |
| — | Review the new content (names, pairs, spellings, highlights) | A teacher | P1 |
| 2.2 | No recording of each sound by itself | 90 recorded clips | P2 |
| 3.6 | Mouth pictures | Illustrations | P3 |
| 5.3 | Hosting | Choosing a host | P2 |
| 6.3 | Browser smoke test | Deciding on a dev dependency | P3 |
| 7.1 | Third notation (modern British IPA) | Audience decision | — |
| 7.2 | Chinese UI and tips | Audience decision | — |
| 2.4 | Sentences use the computer voice | Nothing (left as is) | P3 |

---

## Needs recordings or artwork

### 2.1 UK recordings

The infrastructure is done: `tools/build_recordings.py` prefers `audio/<uk|us>/<word>.mp3`, with credits in `audio/credits.json`. `audio/README.md` explains the format. No clips are recorded yet.

Current coverage, from `node tools/check_data.js`. There are now 120 words, because the minimal pairs added 15.

| Accent | Have | Missing |
|--------|------|---------|
| UK (DJ) | 60 / 120 | 60 |
| US (KK) | 116 / 120 | 4 |

- **Missing UK:** ball, bath, bear, bike, bird, boat, box, boy, bus, cap, chips, coin, cut, deer, duck, father, five, fox, gift, girl, goat, heel, hill, ice, juice, kite, leaf, lion, lock, measure, nine, nurse, nut, pan, panda, park, pen, pig, pin, ring, rock, ships, shoe, sock, sure, ten, this, three, thumb, tiger, tour, tourist, toy, treasure, van, vest, vote, web, yo-yo, zoo
- **Missing US:** lemon, orange, school, tourist

Option 2 from the original doc (Lingua Libre files, where the accent comes from metadata) was not investigated.

### 2.1a Minimal pairs in DJ mode

The "Which Word?" game (3.4) only works well when both words use a real voice, because a computer voice may not make the difference clearly. That holds for every pair in US English, but in UK English only for **ship/sheep, hat/hot and mouse/mouth**. The other 11 pairs fall back to the computer voice in DJ mode.

Options:

1. Record the 22 missing UK pair words first, as part of 2.1.
2. Until then, in DJ mode only offer pairs where both words have a UK recording. That leaves 3 pairs, fewer than one 10-question round, so the round would need to be shorter or repeat pairs.

The UK clips for ship and sheep are phrases ("a ship", "a sheep"). That's fine for this game, because both have the same lead-in.

### 2.2 Each sound by itself

Unchanged: it needs 90 short clips (45 sounds × 2 accents), most likely self-recorded. The suggested data shape is still an optional `sound: { uk, us }` per phoneme. The "🔊 Listen" button in the dialog head would then play it, falling back to the first word.

### 3.6 Mouth pictures

Unchanged: needs a simple illustration or animation per sound (or per group of similar sounds). The other 3.6 items are done.

---

## Needs review

This content was written during the implementation, not taken from a source. `node tools/check_data.js` checks that it is consistent (unique names, highlight words in the sentence, spellings in their example word, pairs differing in exactly one sound), not that it is good teaching material:

- the speakable `name` of each sound ("short i", "buzzy th"), which screen readers say
- the 14 `MINIMAL_PAIRS`, their emoji and transcriptions
- the `spellings` for all 45 sounds
- the `highlight` words in 20 example sentences

---

## Needs a decision

### 5.3 Hosting

The site is still static and works on GitHub Pages with no changes. The service worker needs http(s), so hosting also turns on offline use and installing as an app.

### 6.3 Browser smoke test

Testing was done with throwaway scripts that drive headless Chromium over the DevTools protocol, which aren't in the repo. A committed Playwright test would catch UI regressions, but it adds a dev dependency, against the no-tooling goal.

### 7.1 / 7.2 and the open questions

Still open, with no work done:

- **Who is the main audience (age, region)?** Decides 7.1 (modern British IPA as a third notation) and 7.2 (Chinese UI and tips). For 7.1, `NOTATIONS` (6.4) now makes a third notation a data change: a `NOTATIONS` entry, a third symbol per phoneme and a third transcription for all 120 words and the `LEAD_INS`.
- **Is self-recording audio an option?** Decides 2.1, 2.1a and 2.2.
- **Is Node acceptable as a dev-only tool?** It was assumed so: `tools/check_data.js` and `tools/check_links.js` need Node 18+, and CI runs them.

---

## Left as is

- **2.4:** sentences still always use the computer voice. The original doc rated it fine for now.
- **5.2 fonts:** not self-hosted. Noto Sans (latin-ext subset, which the page already loads) covers `ː`, `ˈ` and the IPA symbols, and the service worker caches the fonts.
- **6.2:** `words_from_data()` still scrapes `word: "..."` with a regex. Fine while that format is kept (CLAUDE.md says so).

## Other notes

- The header changed from white text on orange to dark text on orange (4.1), a visible design change.
- Best scores saved before this branch are ignored, because they are now kept per notation (`<notation>:<mode>`).
- Nothing is pushed or merged yet. `dev-doc/` is not committed.
