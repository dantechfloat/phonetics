/*
 * Sound playback.
 *
 * Words are played in this order of preference:
 *   1. A real human recording in the selected accent
 *      (UK for DJ, US for KK; see js/recordings.js).
 *   2. The browser's computer voice in the selected accent.
 *   3. A real recording in the other accent (if the browser has no
 *      voice for the selected accent).
 *
 * Sentences always use the browser's computer voice.
 */

const SoundPlayer = (() => {
  let currentAudio = null;
  // Increases on every play request so an older sound that is still
  // loading cannot start after a newer one.
  let playToken = 0;
  let voices = [];

  const hasSpeech = "speechSynthesis" in window;

  function loadVoices() {
    voices = window.speechSynthesis.getVoices();
  }
  if (hasSpeech) {
    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
  }

  function langFor(accent) {
    return accent === "uk" ? "en-GB" : "en-US";
  }

  function voicesFor(accent) {
    if (hasSpeech && !voices.length) loadVoices();
    const lang = langFor(accent).toLowerCase();
    return voices.filter((v) => v.lang.replace("_", "-").toLowerCase() === lang);
  }

  function pickVoice(accent) {
    const matching = voicesFor(accent);
    // Prefer higher quality voices when the browser offers them.
    return (
      matching.find((v) => /natural|google|samantha|daniel|serena/i.test(v.name)) ||
      matching[0] ||
      null
    );
  }

  function stop() {
    playToken++;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (hasSpeech) window.speechSynthesis.cancel();
  }

  function speak(text, { accent = "us", slow = false } = {}) {
    return new Promise((resolve) => {
      if (!hasSpeech) return resolve(false);
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = langFor(accent);
      const voice = pickVoice(accent);
      if (voice) utter.voice = voice;
      utter.rate = slow ? 0.6 : 0.9;
      utter.onend = () => resolve(true);
      utter.onerror = () => resolve(false);
      window.speechSynthesis.speak(utter);
    });
  }

  /** Try each URL in turn. Resolves true once one starts playing. */
  async function playUrls(urls, slow, token) {
    for (const url of urls) {
      if (token !== playToken) return false;
      const audio = new Audio(url);
      audio.preservesPitch = true;
      audio.playbackRate = slow ? 0.7 : 1;
      currentAudio = audio;
      try {
        await audio.play();
        return true;
      } catch (err) {
        // Unsupported format or network error: try the next URL.
      }
    }
    return false;
  }

  /**
   * Play a single word. Resolves to "recorded", "computer",
   * "recorded-other" (other accent's recording) or "skipped".
   */
  async function playWord(word, { accent = "us", slow = false } = {}) {
    stop();
    const token = playToken;
    const recordings = RECORDINGS[word.toLowerCase()] || {};
    const other = accent === "uk" ? "us" : "uk";

    if (recordings[accent] && (await playUrls(recordings[accent].urls, slow, token))) return "recorded";
    if (token !== playToken) return "skipped";

    if (hasSpeech && voicesFor(accent).length) {
      speak(word, { accent, slow });
      return "computer";
    }
    if (recordings[other] && (await playUrls(recordings[other].urls, slow, token))) return "recorded-other";
    if (token !== playToken) return "skipped";

    speak(word, { accent, slow });
    return "computer";
  }

  /** Play a sentence with the computer voice. */
  function playSentence(text, { accent = "us", slow = false } = {}) {
    stop();
    speak(text, { accent, slow });
    return "computer";
  }

  return { playWord, playSentence, stop };
})();
