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
 *
 * It can also record the learner from the microphone (only when they ask)
 * and play that back. Recordings stay in memory on the device.
 */

const SoundPlayer = (() => {
  let currentAudio = null;
  // Increases on every stop(), and so on every play request, so an older
  // sound that is still loading cannot start after a newer one, and a
  // recording can tell that something else interrupted it.
  let playToken = 0;
  let voices = [];
  // Preloaded audio elements by URL, oldest first.
  const preloaded = new Map();
  const PRELOAD_LIMIT = 12;
  let activeRecorder = null;

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
    if (activeRecorder && activeRecorder.state === "recording") activeRecorder.stop();
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

  /**
   * Start downloading words' recordings so the first tap plays at once.
   * Fetches the clip that playWord would try first.
   */
  function preload(words, { accent = "us" } = {}) {
    for (const word of words) {
      const recordings = RECORDINGS[word.toLowerCase()] || {};
      const rec = recordings[accent] || recordings[accent === "uk" ? "us" : "uk"];
      const url = rec && rec.urls[0];
      if (!url || preloaded.has(url)) continue;
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
      preloaded.set(url, audio);
      if (preloaded.size > PRELOAD_LIMIT) preloaded.delete(preloaded.keys().next().value);
    }
  }

  /** Try each URL in turn. Resolves true once one starts playing. */
  async function playUrls(urls, slow, token) {
    for (const url of urls) {
      if (token !== playToken) return false;
      const audio = preloaded.get(url) || new Audio(url);
      audio.currentTime = 0;
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

  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  /**
   * Record from the microphone until session.stop() or maxMs.
   * Resolves to { stop, done, interrupted }, where done resolves to a blob
   * URL and interrupted() is true if stop() ended the recording early.
   * Rejects if there is no microphone or permission is denied, and with an
   * AbortError if stop() was called while the browser asked for permission.
   */
  async function startRecording({ maxMs = 3000 } = {}) {
    stop();
    const token = playToken;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (token !== playToken) {
      // The dialog closed or another sound played meanwhile: don't record.
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException("Recording cancelled", "AbortError");
    }
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.addEventListener("dataavailable", (e) => chunks.push(e.data));
    const done = new Promise((resolve) => {
      recorder.addEventListener("stop", () => {
        clearTimeout(timer);
        // Release the microphone right away.
        stream.getTracks().forEach((track) => track.stop());
        if (activeRecorder === recorder) activeRecorder = null;
        resolve(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
      });
    });
    recorder.start();
    activeRecorder = recorder;
    const timer = setTimeout(() => recorder.state === "recording" && recorder.stop(), maxMs);
    return {
      stop: () => recorder.state === "recording" && recorder.stop(),
      done,
      interrupted: () => token !== playToken,
    };
  }

  /** Play a clip from a URL, e.g. the learner's own recording. */
  function playClip(url) {
    stop();
    return playUrls([url], false, playToken);
  }

  /** Play a sentence with the computer voice. */
  function playSentence(text, { accent = "us", slow = false } = {}) {
    stop();
    speak(text, { accent, slow });
    return "computer";
  }

  return { playWord, playSentence, preload, stop, canRecord, startRecording, playClip };
})();
