# Local recordings

Recordings here are used instead of the Wikimedia Commons ones, for words
that have no Commons recording in an accent (or a poor one).

- Put each file at `audio/<accent>/<word>.mp3`, where accent is `uk` (used
  for DJ) or `us` (used for KK) and word is exactly as in `js/data.js`,
  e.g. `audio/uk/ball.mp3`, `audio/uk/yo-yo.mp3`.
- Say only the word, clearly, with a little silence before and after.
- Add the author and license to `audio/credits.json`; they are shown in the
  page's recording credits. A `"default"` entry covers every file without
  its own entry:

  ```json
  {
    "default": { "author": "Your name", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/" },
    "uk/ball.mp3": { "author": "Someone else", "license": "CC0" }
  }
  ```

- Then run `python3 tools/build_recordings.py` and `node tools/check_data.js`.

`node tools/check_data.js` lists the words that still have no recording in
each accent.
