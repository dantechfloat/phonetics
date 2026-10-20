#!/usr/bin/env node
/*
 * Check that every recording in js/recordings.js still exists on Wikimedia
 * Commons at the same URL. Commons files get renamed or deleted now and then.
 *
 * Usage: node tools/check_links.js
 *
 * Asks the Commons API about 50 files per request instead of fetching every
 * URL (upload.wikimedia.org rate-limits that quickly). Local recordings
 * (audio/...) are checked on disk. Exits with status 1 if anything is broken.
 * Needs network access and Node 18+ (for fetch).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "SoundExplorer/1.0 (educational phonetics page; link check)";

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/recordings.js"), "utf8"), context);
const RECORDINGS = vm.runInContext("RECORDINGS", context);

const recs = Object.entries(RECORDINGS).flatMap(([word, byAccent]) =>
  Object.entries(byAccent).map(([accent, rec]) => ({ where: `${word} (${accent.toUpperCase()})`, ...rec })));

const normalize = (title) => title.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

async function fileInfo(files) {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2",
    prop: "imageinfo", iiprop: "url",
    titles: files.map((f) => `File:${f}`).join("|"),
  });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) return (await res.json()).query;
    if (attempt === 2) throw new Error(`Commons API: HTTP ${res.status}`);
    await new Promise((resolve) => setTimeout(resolve, 5000 * (attempt + 1)));
  }
}

(async () => {
  const broken = [];
  const remote = [];
  for (const rec of recs) {
    if (/^https?:/.test(rec.urls[0])) remote.push(rec);
    else if (!fs.existsSync(path.join(ROOT, rec.urls[0]))) broken.push(`${rec.where}: missing file ${rec.urls[0]}`);
  }

  for (let i = 0; i < remote.length; i += 50) {
    const batch = remote.slice(i, i + 50);
    const query = await fileInfo(batch.map((rec) => rec.file));
    // The API reports titles normalized ("en-us-x.ogg" -> "En-us-x.ogg").
    const renamed = Object.fromEntries((query.normalized || []).map((n) => [n.from, n.to]));
    const pages = Object.fromEntries(query.pages.map((p) => [p.title, p]));
    for (const rec of batch) {
      const title = renamed[`File:${rec.file}`] || normalize(`File:${rec.file}`);
      const page = pages[title];
      const url = page && page.imageinfo && page.imageinfo[0].url.split("?")[0];
      if (!url) broken.push(`${rec.where}: ${rec.file} no longer exists on Commons`);
      else if (!rec.urls.includes(url)) broken.push(`${rec.where}: ${rec.file} moved to ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`Checked ${recs.length} recordings (${remote.length} on Commons).`);
  if (broken.length) {
    console.error(`${broken.length} broken (rerun tools/build_recordings.py):`);
    for (const line of broken) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log("All OK.");
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
