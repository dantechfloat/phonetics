#!/usr/bin/env node
/*
 * Check js/data.js (and js/recordings.js) for mistakes the page can't catch.
 *
 * Usage: node tools/check_data.js
 *
 * Exits with status 1 if there are errors. Also prints a recording coverage
 * report. Needs only Node: the data files are evaluated as-is with `vm`.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function loadGlobals(files) {
  // Top-level const declarations stay in the script scope, so expose them.
  const context = {};
  vm.createContext(context);
  for (const file of files) {
    const code = fs.readFileSync(path.join(ROOT, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }
  return vm.runInContext(
    "({ NOTATIONS, LEAD_INS, CATEGORIES, GROUPS, PHONEMES, RECORDINGS })", context
  );
}

const { NOTATIONS, LEAD_INS, CATEGORIES, GROUPS, PHONEMES, RECORDINGS } =
  loadGlobals(["js/data.js", "js/recordings.js"]);

const errors = [];
const error = (message) => errors.push(message);

// ---------- Tokenizer (same longest-match rule as js/app.js) ----------
const symbolLists = Object.fromEntries(NOTATIONS.map((n) => [
  n.id, [...new Set(PHONEMES.map((p) => p[n.id]))].sort((a, b) => b.length - a.length),
]));
const MARKS = new Set(["ˈ", "ˌ"]);

function tokenize(transcription, notation) {
  const tokens = [];
  let i = 0;
  while (i < transcription.length) {
    const match = symbolLists[notation].find((s) => transcription.startsWith(s, i));
    const token = match || transcription[i];
    tokens.push(token);
    i += token.length;
  }
  return tokens;
}

/** Check that a transcription is made only of known symbols and stress marks. */
function checkTranscription(where, transcription, notation) {
  if (typeof transcription !== "string" || !transcription) {
    error(`${where}: missing ${notation} transcription`);
    return [];
  }
  const tokens = tokenize(transcription, notation);
  const leftovers = tokens.filter((t) => !symbolLists[notation].includes(t) && !MARKS.has(t));
  if (leftovers.length) {
    error(`${where}: unknown ${notation} characters ${leftovers.map((t) => `"${t}"`).join(", ")} in /${transcription}/`);
  }
  return tokens;
}

// ---------- Phonemes ----------
const ids = new Set();
const categories = new Set(CATEGORIES.map((c) => c.id));
const byId = Object.fromEntries(PHONEMES.map((p) => [p.id, p]));
const wordsSeen = new Map(); // word -> { where, entry }

function checkSameWord(where, w) {
  const seen = wordsSeen.get(w.word);
  if (!seen) {
    wordsSeen.set(w.word, { where, entry: w });
    return;
  }
  for (const key of ["emoji", ...NOTATIONS.map((n) => n.id)]) {
    if (seen.entry[key] !== w[key]) {
      error(`"${w.word}": ${key} differs between ${seen.where} ("${seen.entry[key]}") and ${where} ("${w[key]}")`);
    }
  }
}

for (const p of PHONEMES) {
  const where = p.id || "(phoneme without id)";
  if (!p.id) error("a phoneme has no id");
  else if (ids.has(p.id)) error(`${p.id}: duplicate id`);
  ids.add(p.id);

  if (!categories.has(p.category)) error(`${where}: unknown category "${p.category}"`);
  if (!(p.group in GROUPS)) error(`${where}: unknown group "${p.group}"`);
  for (const key of ["name", "tip", "sentence"]) {
    if (!p[key]) error(`${where}: missing ${key}`);
  }
  for (const n of NOTATIONS) {
    if (!p[n.id]) error(`${where}: missing ${n.id} symbol`);
  }

  if (p.voicing && !["voiced", "voiceless"].includes(p.voicing)) {
    error(`${where}: voicing must be "voiced" or "voiceless"`);
  }
  if (p.group === "pair") {
    const partner = byId[p.pair];
    if (!p.voicing) error(`${where}: pair sounds need a voicing`);
    if (!partner) error(`${where}: pair "${p.pair}" doesn't exist`);
    else if (partner.pair !== p.id) error(`${where}: pair "${p.pair}" doesn't point back (it points at "${partner.pair}")`);
    else if (partner.voicing === p.voicing) error(`${where}: pair "${p.pair}" has the same voicing`);
  } else if (p.pair) {
    error(`${where}: only "pair" group sounds can have a pair`);
  }

  if (!Array.isArray(p.words) || p.words.length !== 3) {
    error(`${where}: needs exactly 3 words, has ${p.words ? p.words.length : 0}`);
  }
  for (const w of p.words || []) {
    const wWhere = `${where} / "${w.word}"`;
    if (!w.word) error(`${where}: a word has no text`);
    if (!w.emoji) error(`${wWhere}: missing emoji`);
    for (const n of NOTATIONS) {
      const tokens = checkTranscription(wWhere, w[n.id], n.id);
      if (tokens.length && !tokens.includes(p[n.id])) {
        error(`${wWhere}: /${w[n.id]}/ doesn't contain the sound /${p[n.id]}/ (${n.label})`);
      }
    }
    checkSameWord(where, w);
  }
}

const names = PHONEMES.map((p) => p.name).filter(Boolean);
for (const name of new Set(names.filter((n, i) => names.indexOf(n) !== i))) {
  error(`name "${name}" is used by more than one sound`);
}

// ---------- Lead-in words ----------
for (const [lead, forms] of Object.entries(LEAD_INS)) {
  forms.forEach((form, i) => {
    for (const n of NOTATIONS) checkTranscription(`LEAD_INS.${lead}[${i}]`, form[n.id], n.id);
  });
}
const buildScript = fs.readFileSync(path.join(ROOT, "tools/build_recordings.py"), "utf8");
const pyLeadIns = (buildScript.match(/^LEAD_INS = \(([^)]*)\)/m) || [, ""])[1]
  .match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) || [];
for (const lead of pyLeadIns) {
  if (!(lead in LEAD_INS)) error(`LEAD_INS: "${lead}" is in tools/build_recordings.py but not in js/data.js`);
}

// ---------- Recordings ----------
const accents = NOTATIONS.map((n) => n.accent);
const words = [...wordsSeen.keys()].sort();
const missing = Object.fromEntries(accents.map((a) => [a, []]));
const phrases = [];

for (const word of words) {
  const rec = RECORDINGS[word.toLowerCase()] || {};
  for (const accent of accents) {
    if (!rec[accent]) {
      missing[accent].push(word);
      continue;
    }
    if (!Array.isArray(rec[accent].urls) || !rec[accent].urls.length) {
      error(`RECORDINGS["${word}"].${accent}: no urls`);
    }
    for (const key of ["file", "page", "author", "license"]) {
      if (!rec[accent][key]) error(`RECORDINGS["${word}"].${accent}: missing ${key} (needed for the credits)`);
    }
    const says = rec[accent].says;
    if (says) {
      phrases.push(`${word} (${accent.toUpperCase()}: "${says}")`);
      const leads = says.split(" ").slice(0, -1);
      if (says.split(" ").at(-1) !== word.toLowerCase()) error(`RECORDINGS["${word}"].${accent}: says "${says}", which doesn't end with the word`);
      for (const lead of leads) {
        if (!(lead in LEAD_INS)) error(`RECORDINGS["${word}"].${accent}: lead-in "${lead}" is not in LEAD_INS`);
      }
    }
  }
}
const stale = Object.keys(RECORDINGS).filter((w) => !wordsSeen.has(w));
if (stale.length) error(`js/recordings.js has words that aren't in data.js (rerun tools/build_recordings.py): ${stale.join(", ")}`);

// ---------- Report ----------
console.log(`${PHONEMES.length} sounds, ${words.length} words`);
for (const n of NOTATIONS) {
  const have = words.length - missing[n.accent].length;
  console.log(`${n.accent.toUpperCase()} recordings (${n.label}): ${have} / ${words.length}`);
  if (missing[n.accent].length) console.log(`  missing: ${missing[n.accent].join(", ")}`);
}
console.log(`Phrase clips: ${phrases.join(", ") || "none"}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}
console.log("\nData OK.");
