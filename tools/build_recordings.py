#!/usr/bin/env python3
"""Find real UK and US voice recordings for every example word.

Reads the words from js/data.js, looks up the audio files used on each
English Wiktionary page, and writes js/recordings.js with direct
Wikimedia Commons URLs (an MP3 transcode for wide browser support, plus
the original file as a backup).

Some clips say a short phrase such as "a cat" instead of the bare word.
Those are kept (a real voice is better than none) and their entry gets a
"says" field, so the quiz can avoid offering a sound that is audible in
the lead-in word. Only the lead-in words in LEAD_INS are accepted; keep
that list in sync with LEAD_INS in js/data.js.

Usage: python3 tools/build_recordings.py
"""

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "js" / "data.js"
OUT_JS = ROOT / "js" / "recordings.js"

API = "https://en.wiktionary.org/w/api.php"
USER_AGENT = "SoundExplorer/1.0 (educational phonetics page)"
AUDIO_EXT = (".ogg", ".oga", ".mp3", ".wav", ".flac")

# File name prefixes for each accent, best first.
ACCENT_PREFIXES = {
    "uk": ("en-uk-", "en-gb-"),
    "us": ("en-us-",),
}

# Words a clip may say before the target word, e.g. "En-uk-a cat.ogg".
LEAD_INS = ("a", "an", "the", "to")
# Name suffixes that still mean the bare word, e.g. "En-us-house-noun.ogg"
# (the verb "house" sounds different).
WORD_SUFFIXES = ("-noun",)


def api_get(params, retries=5):
    params = {**params, "format": "json", "formatversion": "2"}
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.load(res)
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == retries - 1:
                raise
            time.sleep(10 * (attempt + 1))


def words_from_data():
    text = DATA_JS.read_text(encoding="utf-8")
    return sorted(set(re.findall(r'word:\s*"([^"]+)"', text)))


def audio_files(words):
    """word -> list of audio file titles on its Wiktionary page."""
    found = {}
    for i in range(0, len(words), 40):
        batch = words[i:i + 40]
        data = api_get({
            "action": "query",
            "titles": "|".join(batch),
            "prop": "images",
            "imlimit": "max",
        })
        for page in data["query"]["pages"]:
            files = [img["title"] for img in page.get("images", [])
                     if img["title"].lower().endswith(AUDIO_EXT)]
            found[page["title"]] = files
        time.sleep(1)
    return found


def normalize(name):
    return re.sub(r"[\s_]+", " ", name.lower())


def pick(word, files, accent):
    """Choose the best file for an accent: exact word match first, then a
    known suffix, then the word after a known lead-in word.

    Returns (title, says), where says is the phrase the clip says, or None
    when it says the bare word.
    """
    target = normalize(word)
    candidates = []
    for title in files:
        name = normalize(title.removeprefix("File:"))
        for rank, prefix in enumerate(ACCENT_PREFIXES[accent]):
            if not name.startswith(prefix):
                continue
            stem = name[len(prefix):].rsplit(".", 1)[0]
            if stem == target:
                candidates.append((0, rank, title, None))
            elif stem in {target + suffix for suffix in WORD_SUFFIXES}:
                candidates.append((1, rank, title, None))
            elif stem in {f"{lead} {target}" for lead in LEAD_INS}:
                candidates.append((2, rank, title, stem))
    return min(candidates)[2:] if candidates else (None, None)


def guessed_names(word, accent):
    """Common Commons file names for a word, used when its Wiktionary page lacks one."""
    return [f"File:{prefix.capitalize()}{word}.ogg" for prefix in ACCENT_PREFIXES[accent]]


def file_urls(titles):
    """file title -> original URL on upload.wikimedia.org."""
    urls = {}
    titles = list(titles)
    for i in range(0, len(titles), 40):
        data = api_get({
            "action": "query",
            "titles": "|".join(titles[i:i + 40]),
            "prop": "imageinfo",
            "iiprop": "url",
        })
        for page in data["query"]["pages"]:
            info = page.get("imageinfo")
            if info:
                urls[page["title"]] = info[0]["url"].split("?", 1)[0]
        time.sleep(1)
    return urls


def mp3_transcode(url):
    """Commons serves MP3 transcodes of non-MP3 audio at a fixed path."""
    if url.lower().endswith(".mp3"):
        return url
    name = url.rsplit("/", 1)[1]
    path = url.split("/wikipedia/commons/", 1)[1]
    return f"https://upload.wikimedia.org/wikipedia/commons/transcoded/{path}/{name}.mp3"


def main():
    words = words_from_data()
    files = audio_files(words)
    chosen = {}
    says = {}
    for word in words:
        chosen[word] = {}
        for acc in ACCENT_PREFIXES:
            chosen[word][acc], says[word, acc] = pick(word, files.get(word, []), acc)

    titles = {t for picks in chosen.values() for t in picks.values() if t}
    urls = file_urls(titles)

    guesses = {(word, acc): guessed_names(word, acc)
               for word, picks in chosen.items()
               for acc, title in picks.items() if title is None}
    found = file_urls({name for names in guesses.values() for name in names})
    for (word, acc), names in guesses.items():
        title = next((n for n in names if n in found), None)
        if title:
            chosen[word][acc] = title
            urls[title] = found[title]

    recordings = {}
    phrases = []
    for word, picks in chosen.items():
        entry = {}
        for acc, title in picks.items():
            if title and title in urls:
                rec = {"file": title.removeprefix("File:"),
                       "urls": [mp3_transcode(urls[title]), urls[title]]}
                if says.get((word, acc)):
                    rec["says"] = says[word, acc]
                    phrases.append(f"{word} ({acc.upper()}: \"{rec['says']}\")")
                entry[acc] = rec
        if entry:
            recordings[word] = entry

    header = (
        "/*\n"
        " * Real voice recordings from Wiktionary / Wikimedia Commons.\n"
        " * Generated by tools/build_recordings.py - do not edit by hand.\n"
        " * Each accent lists its Commons file and URLs: an MP3 first, then the\n"
        " * original file as a backup. \"says\" is set when the clip is a phrase\n"
        " * such as \"a cat\" instead of the bare word.\n"
        " */\n\n"
    )
    body = "const RECORDINGS = " + json.dumps(recordings, indent=2, ensure_ascii=False) + ";\n"
    OUT_JS.write_text(header + body, encoding="utf-8")

    uk = sum("uk" in r for r in recordings.values())
    us = sum("us" in r for r in recordings.values())
    missing = [w for w in words if w not in recordings]
    print(f"{len(words)} words: {uk} with UK audio, {us} with US audio")
    print("No recording:", ", ".join(missing) or "none")
    for acc in ACCENT_PREFIXES:
        lacking = [w for w in words if acc not in recordings.get(w, {})]
        print(f"Missing {acc.upper()}:", ", ".join(lacking) or "none")
    print("Phrase clips (not the bare word):", ", ".join(phrases) or "none")


if __name__ == "__main__":
    main()
