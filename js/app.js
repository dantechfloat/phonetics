/*
 * Sound Explorer - page logic.
 * Renders sound cards, the detail dialog and the Sound Game,
 * and keeps everything in sync with the selected notation (DJ or KK).
 */

(() => {
  const STORAGE_KEY = "soundExplorer.v1";
  const QUIZ_LENGTH = 10;

  const byId = Object.fromEntries(PHONEMES.map((p) => [p.id, p]));
  const notationById = Object.fromEntries(NOTATIONS.map((n) => [n.id, n]));
  const accentNames = Object.fromEntries(NOTATIONS.map((n) => [n.accent, n.accentName]));

  // ---------- Saved settings (best effort; the page works without storage) ----------
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        notation: state.notation,
        slow: state.slow,
        tab: state.tab,
        best: state.best,
        earsOnly: state.earsOnly,
        progress: state.progress,
      }));
    } catch (err) {
      // Storage unavailable (private mode, blocked): ignore.
    }
  }

  const saved = loadSettings();
  const state = {
    notation: notationById[saved.notation] ? saved.notation : "kk",
    slow: !!saved.slow,
    tab: ["vowel", "diphthong", "consonant", "compare", "quiz"].includes(saved.tab) ? saved.tab : "vowel",
    best: saved.best || {}, // "<notation>:<mode>" -> stars
    earsOnly: !!saved.earsOnly,
    progress: saved.progress || {}, // sound id -> { right, wrong }
    openId: null,
    quiz: null,
  };

  const notation = () => notationById[state.notation];
  const accent = () => notation().accent;
  const sym = (p) => p[state.notation];
  /** Other sounds written with the same symbol in the current notation. */
  const sameSymbol = (p) => PHONEMES.filter((x) => x !== p && sym(x) === sym(p));
  const wrap = (s) => `/${s}/`;

  // ---------- Small helpers ----------
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
      if (child == null) continue;
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return node;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // One persistent live region for screen readers. Live regions that are
  // created already filled in (like a re-rendered view) often aren't read.
  const announcer = document.getElementById("announcer");
  function announce(message) {
    announcer.textContent = "";
    // A tick later, so the same message twice in a row is still read.
    setTimeout(() => { announcer.textContent = message; }, 50);
  }

  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  /** Show a short message. Pass announce: false for ones a screen reader doesn't need. */
  function toast(message, { announce: speak = true } = {}) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
    if (speak) announce(message);
  }

  // ---------- Splitting a transcription into sounds ----------
  // Longest symbols first, so "tʃ" wins over "t" and "ai" wins over "a".
  const symbolLists = Object.fromEntries(NOTATIONS.map((n) => [
    n.id, [...new Set(PHONEMES.map((p) => p[n.id]))].sort((a, b) => b.length - a.length),
  ]));

  function tokenize(transcription, notation) {
    const symbols = symbolLists[notation];
    const tokens = [];
    let i = 0;
    while (i < transcription.length) {
      const match = symbols.find((s) => transcription.startsWith(s, i));
      const token = match || transcription[i];
      tokens.push(token);
      i += token.length;
    }
    return tokens;
  }

  // Sounds in a transcription, including ones hidden inside a bigger symbol
  // (NOTATIONS alsoHas), for picking quiz distractors.
  const soundsIn = (transcription, n) => new Set(
    tokenize(transcription, n).flatMap((t) => [t, ...(notationById[n].alsoHas[t] || [])])
  );

  /**
   * Transcriptions of everything the word's recordings say, for each notation:
   * the word itself plus any lead-in word ("a cat", "the king"). Either
   * accent's clip can play as a fallback, so both are included.
   */
  function heardTranscriptions(word) {
    const leads = Object.values(RECORDINGS[word.word.toLowerCase()] || {})
      .flatMap((rec) => (rec.says ? rec.says.split(" ").slice(0, -1) : []));
    return [word, ...leads.flatMap((lead) => LEAD_INS[lead] || [])];
  }

  /** Transcription element with the target sound highlighted. */
  function transcriptionNode(transcription, target) {
    const span = el("span", { class: "word-ipa" }, "/");
    for (const token of tokenize(transcription, state.notation)) {
      span.append(token === target ? el("mark", { text: token }) : token);
    }
    span.append("/");
    return span;
  }

  /** Transcription element with the sounds that differ from `other` highlighted. */
  function differenceNode(transcription, other) {
    const otherTokens = tokenize(other, state.notation);
    const span = el("span", { class: "word-ipa" }, "/");
    tokenize(transcription, state.notation).forEach((token, i) => {
      span.append(token !== otherTokens[i] ? el("mark", { text: token }) : token);
    });
    span.append("/");
    return span;
  }

  /**
   * Example word with a spelling's letters marked: ("ee", "tree") -> tr<mark>ee</mark>.
   * A split spelling like "a_e" marks both parts around the consonants: c<mark>a</mark>k<mark>e</mark>.
   */
  function spellingNode(letters, word) {
    const [first, second] = letters.split("_");
    const match = second
      ? word.match(new RegExp(`^(.*?)(${first})([^aeiou]+)(${second})(.*)$`))
      : word.match(new RegExp(`^(.*?)(${first})(.*)$`));
    const span = el("span", { class: "spelling-word" });
    if (!match) span.append(word);
    else match.slice(1).forEach((part, i) => span.append(i % 2 ? el("mark", { text: part }) : part));
    return span;
  }

  // ---------- Audio ----------
  async function sayWord(word) {
    const source = await SoundPlayer.playWord(word, { accent: accent(), slow: state.slow });
    // Only the fallbacks are worth announcing; "real voice" is the normal case.
    if (source === "recorded") toast("🎙️ Real voice", { announce: false });
    else if (source === "recorded-other") {
      const other = Object.keys(accentNames).find((a) => a !== accent());
      toast(`🎙️ Real voice (${accentNames[other]})`);
    }
    else if (source === "computer") toast("🤖 Computer voice");
  }
  function saySentence(text) {
    SoundPlayer.playSentence(text, { accent: accent(), slow: state.slow });
  }

  // ---------- Header controls ----------
  const notationGroup = document.querySelector(".notation");
  notationGroup.replaceChildren(...NOTATIONS.map((n) => el("button", {
    type: "button", role: "radio", "aria-checked": "false", dataset: { notation: n.id },
  }, [
    el("span", { class: "notation-name", text: n.label }),
    el("span", { class: "notation-sub", text: n.accentName }),
  ])));
  const notationButtons = notationGroup.querySelectorAll("[data-notation]");
  notationButtons.forEach((btn) => {
    btn.addEventListener("click", () => setNotation(btn.dataset.notation));
    btn.addEventListener("keydown", (e) => notationArrowKeys(e, notationGroup));
  });

  /** Arrow keys move through a notation radio group, like native radio buttons. */
  function notationArrowKeys(e, root) {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = NOTATIONS.findIndex((n) => n.id === state.notation);
    setNotation(NOTATIONS[(i + step + NOTATIONS.length) % NOTATIONS.length].id);
    // The dialog's group is rebuilt on a notation change, so look it up again.
    root.querySelector('[role="radio"][aria-checked="true"]').focus();
  }

  function setNotation(id) {
    if (id === state.notation) return;
    state.notation = id;
    saveSettings();
    syncHeader();
    render();
    // state.openId is only cleared by the dialog's "close" event, a task
    // after it closes, so check the dialog itself.
    if (dialog.open) openDetail(state.openId);
    toast(`${notation().label} symbols (${notation().accentName})`);
  }

  function syncHeader() {
    notationButtons.forEach((btn) => {
      const active = btn.dataset.notation === state.notation;
      btn.setAttribute("aria-checked", String(active));
      btn.tabIndex = active ? 0 : -1;
    });
    slowToggle.checked = state.slow;
    document.querySelectorAll(".tab").forEach((tab) => {
      if (tab.dataset.tab === state.tab) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  const slowToggle = document.getElementById("slow-toggle");
  slowToggle.addEventListener("change", () => {
    state.slow = slowToggle.checked;
    saveSettings();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.tab = tab.dataset.tab;
      if (state.tab !== "quiz") state.quiz = null;
      SoundPlayer.stop();
      saveSettings();
      syncHeader();
      render();
    });
  });

  // ---------- Sound cards ----------
  const view = document.getElementById("view");

  function card(p) {
    const first = p.words[0];
    return el("button", {
      type: "button",
      class: "card",
      dataset: { sound: p.id, cat: p.category, ...(p.voicing ? { voicing: p.voicing } : {}) },
      "aria-label": `${p.name} sound, as in ${first.word}`,
      onclick: () => openDetail(p.id),
    }, [
      el("span", { class: "card-symbol", text: wrap(sym(p)) }),
      // Tell apart cards that look the same in this notation (DJ /ə/, KK /ɑ/).
      sameSymbol(p).length ? el("span", { class: "card-name", "aria-hidden": "true", text: p.name }) : null,
      el("span", { class: "card-emoji", "aria-hidden": "true", text: first.emoji }),
      el("span", { class: "card-word", text: first.word }),
      p.voicing ? el("span", { class: "badge", text: p.voicing === "voiced" ? "🐝 Buzzy" : "🤫 Quiet" }) : null,
    ]);
  }

  const INTROS = {
    vowel: "Vowels are open sounds. Your mouth shape changes the sound. Tap a card to listen!",
    diphthong: "Double vowels slide from one sound to another. Tap a card to listen!",
    consonant: "Consonants use your lips, teeth and tongue. Tap a card to listen!",
  };

  function renderCategory(category) {
    const items = PHONEMES.filter((p) => p.category === category);
    const groups = [...new Set(items.map((p) => p.group))];
    view.append(el("div", { class: "section-head" }, [
      el("p", { class: "section-intro", text: INTROS[category] }),
      el("button", { type: "button", class: "link-btn print-btn", onclick: () => window.print() }, "🖨️ Print these cards"),
    ]));

    for (const group of groups) {
      const inGroup = items.filter((p) => p.group === group);
      view.append(el("h2", { class: "group-title", text: GROUPS[group] }));

      if (group === "pair") {
        view.append(el("p", { class: "hint-box" }, [
          "✋ Put your hand on your throat! ",
          el("strong", { text: "Quiet" }),
          " sounds use only air. ",
          el("strong", { text: "Buzzy" }),
          " sounds make your throat shake.",
        ]));
        const grid = el("div", { class: "pair-grid" });
        for (const p of inGroup.filter((x) => x.voicing === "voiceless")) {
          grid.append(el("div", { class: "pair" }, [card(p), card(byId[p.pair])]));
        }
        view.append(grid);
      } else {
        view.append(el("div", { class: "card-grid" }, inGroup.map(card)));
      }
    }
  }

  // ---------- Notation comparison ----------
  /**
   * Symbols used by more than one notation for completely different sounds
   * (DJ /i/ is "fish", KK /i/ is "sea"): symbol -> { notationId: [phonemes] }.
   */
  const trickySymbols = (() => {
    const result = new Map();
    const symbols = new Set(PHONEMES.flatMap((p) => NOTATIONS.map((n) => p[n.id])));
    for (const symbol of symbols) {
      const users = Object.fromEntries(NOTATIONS
        .map((n) => [n.id, PHONEMES.filter((p) => p[n.id] === symbol)])
        .filter(([, list]) => list.length));
      const lists = Object.values(users);
      const shared = lists.some((a, i) => lists.slice(i + 1).some((b) => a.some((p) => b.includes(p))));
      if (lists.length > 1 && !shared) result.set(symbol, users);
    }
    return result;
  })();

  function renderCompare() {
    const asIn = (p) => `${p.words[0].emoji} ${p.name} (${p.words[0].word})`;
    view.append(
      el("p", { class: "section-intro", text: `The same sounds, written the ${NOTATIONS.map((n) => n.label).join(" way and the ")} way. Tap a sound to learn it!` }),
      el("h2", { class: "group-title", text: "⚠️ Tricky symbols" }),
      el("p", { class: "hint-box" }, `These symbols look the same in ${NOTATIONS.map((n) => n.label).join(" and ")}, but they mean different sounds!`),
      el("div", { class: "tricky-grid" }, [...trickySymbols].map(([symbol, users]) =>
        el("div", { class: "tricky" }, [
          el("p", { class: "tricky-symbol", text: wrap(symbol) }),
          el("ul", {}, NOTATIONS.filter((n) => users[n.id]).map((n) =>
            el("li", {}, [el("strong", { text: `In ${n.label}: ` }), users[n.id].map(asIn).join(", ")])
          )),
        ])
      )),
    );

    for (const category of CATEGORIES) {
      const rows = PHONEMES.filter((p) => p.category === category.id).map((p) => {
        const differs = NOTATIONS.some((n) => p[n.id] !== p[NOTATIONS[0].id]);
        return el("tr", { class: differs ? "differs" : null }, [
          el("th", { scope: "row" }, el("button", {
            type: "button", class: "compare-sound", dataset: { sound: p.id },
            onclick: () => openDetail(p.id),
          }, [
            el("span", { "aria-hidden": "true", text: p.words[0].emoji }), " ",
            el("strong", { text: p.name }), ` as in ${p.words[0].word}`,
          ])),
          ...NOTATIONS.map((n) => el("td", {
            class: trickySymbols.has(p[n.id]) ? "ipa tricky-cell" : "ipa",
          }, [
            wrap(p[n.id]),
            trickySymbols.has(p[n.id]) ? el("span", { class: "tricky-flag", title: "Tricky symbol", text: " ⚠️" }) : null,
          ])),
        ]);
      });
      view.append(
        el("h2", { class: "group-title", text: `${category.emoji} ${category.label}` }),
        el("div", { class: "table-wrap" }, el("table", { class: "compare-table" }, [
          el("thead", {}, el("tr", {}, [
            el("th", { scope: "col", text: "Sound" }),
            ...NOTATIONS.map((n) => el("th", { scope: "col" }, [n.label, el("small", { text: n.accentName })])),
          ])),
          el("tbody", {}, rows),
        ])),
      );
    }
    view.append(el("p", { class: "note", text: "Rows with a colored edge are written differently in the two notations. ⚠️ marks a tricky symbol." }));
  }

  function render() {
    view.replaceChildren();
    if (state.tab === "quiz") renderQuiz();
    else if (state.tab === "compare") renderCompare();
    else renderCategory(state.tab);
  }

  // ---------- Detail dialog ----------
  const dialog = document.getElementById("detail");
  const detailContent = document.getElementById("detail-content");

  /** Mark the example words (and simple forms like "eggs") plus any extra `highlight` words. */
  function highlightSentence(sentence, words, extra = []) {
    const p = el("p", { class: "sentence-text" });
    const stems = words.map((w) => w.word.toLowerCase());
    const exact = extra.map((w) => w.toLowerCase());
    for (const part of sentence.split(/(\s+)/)) {
      const bare = part.toLowerCase().replace(/[^a-z-]/g, "");
      const hit = bare && (exact.includes(bare) ||
        stems.some((s) => bare === s || (bare.startsWith(s) && bare.length - s.length <= 2)));
      p.append(hit ? el("mark", { text: part }) : part);
    }
    return p;
  }

  function openDetail(id) {
    const p = byId[id];
    state.openId = id;
    const target = sym(p);

    const head = el("div", {
      class: "detail-head",
      dataset: { cat: p.category, ...(p.voicing ? { voicing: p.voicing } : {}) },
    }, [
      el("p", { class: "detail-symbol", text: wrap(target) }),
      el("div", {}, [
        el("p", { class: "detail-both" }, NOTATIONS.flatMap((n, i) => [
          `${i ? "   |   " : ""}${n.label}: `, el("span", { class: "ipa", text: wrap(p[n.id]) }),
        ])),
        // The header switch is inert behind the modal, so the dialog has its own.
        el("div", { class: "detail-notation", role: "radiogroup", "aria-label": "Phonetic notation" },
          NOTATIONS.map((n) => el("button", {
            type: "button", role: "radio",
            "aria-checked": String(n.id === state.notation),
            tabindex: n.id === state.notation ? "0" : "-1",
            onclick: () => {
              setNotation(n.id);
              detailContent.querySelector(`.detail-notation [aria-checked="true"]`).focus();
            },
            onkeydown: (e) => notationArrowKeys(e, detailContent),
          }, `${n.label} (${n.accentName})`))),
        el("button", {
          type: "button", class: "play-btn",
          onclick: () => sayWord(p.words[0].word),
        }, ["🔊 Listen: ", p.words[0].word]),
      ]),
    ]);

    const wordItems = p.words.map((w) =>
      el("li", {}, el("button", {
        type: "button", class: "word-btn",
        "aria-label": `Listen to ${w.word}`,
        onclick: () => sayWord(w.word),
      }, [
        el("span", { class: "word-emoji", "aria-hidden": "true", text: w.emoji }),
        el("span", { class: "word-text", text: w.word }),
        transcriptionNode(w[state.notation], target),
        el("span", { class: "badge", text: "🔊 Tap to listen" }),
      ]))
    );

    const partner = p.pair ? byId[p.pair] : null;

    detailContent.replaceChildren(...[
      el("button", { type: "button", class: "close-btn", "aria-label": "Close", onclick: closeDetail, text: "✕" }),
      head,
      el("section", { class: "detail-section" }, [
        el("h3", { text: "👄 How to say it" }),
        el("p", { class: "tip", text: p.tip }),
        p.voicing ? el("p", { class: "note", text: p.voicing === "voiced"
          ? "🐝 Buzzy sound: your throat shakes when you say it."
          : "🤫 Quiet sound: only air comes out, no voice." }) : null,
        p.note ? el("p", { class: "note", text: `💡 ${p.note}` }) : null,
        sameSymbol(p).length ? el("p", { class: "note", text:
          `💡 ${notation().label} writes ${[p, ...sameSymbol(p)].map((x) => `the ${x.name} sound`).join(" and ")} with the same symbol, ${wrap(target)}.` }) : null,
      ]),
      p.spellings ? el("section", { class: "detail-section" }, [
        el("h3", { text: "✏️ Ways to write it" }),
        el("ul", { class: "spelling-list" }, p.spellings.map(([letters, word]) =>
          el("li", {}, [el("strong", { text: letters }), " as in ", spellingNode(letters, word)])
        )),
      ]) : null,
      el("section", { class: "detail-section" }, [
        el("h3", { text: "🖼️ Words with this sound" }),
        el("ul", { class: "word-list" }, wordItems),
        p.words.some((w) => w[state.notation].includes("ˈ"))
          ? el("p", { class: "note" }, ["👆 The little mark ", el("span", { class: "ipa", text: "ˈ" }), " means: say the next part louder!"])
          : null,
      ]),
      SoundPlayer.canRecord ? el("section", { class: "detail-section" }, [
        el("h3", { text: "🎤 Say it yourself" }),
        el("p", { class: "note", text: "Record yourself, then compare with the real voice. Your recording stays on this device." }),
        recorderSection(p),
      ]) : null,
      el("section", { class: "detail-section" }, [
        el("h3", { text: "💬 Say it in a sentence" }),
        el("div", { class: "sentence" }, [
          highlightSentence(p.sentence, p.words, p.highlight),
          el("button", { type: "button", class: "play-btn small", onclick: () => saySentence(p.sentence) }, "🔊 Listen"),
        ]),
      ]),
      partner ? el("button", {
        type: "button", class: "partner-link",
        onclick: () => {
          SoundPlayer.stop();
          openDetail(partner.id);
          // The clicked link was replaced; focus the new one, which leads back.
          detailContent.querySelector(".partner-link").focus();
        },
      }, [`Compare with its partner sound ${wrap(sym(partner))} →`]) : null,
    ].filter(Boolean));

    dialog.setAttribute("aria-label", `${p.name} sound, ${wrap(target)}`);
    SoundPlayer.preload(p.words.map((w) => w.word), { accent: accent() });
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  function closeDetail() {
    dialog.close();
  }

  dialog.addEventListener("close", () => {
    const id = state.openId;
    state.openId = null;
    SoundPlayer.stop();
    // The browser returns focus to the button that opened the dialog, but a
    // notation change redraws the page behind it. Focus the new copy.
    if (document.activeElement === document.body || dialog.contains(document.activeElement)) {
      (view.querySelector(`[data-sound="${id}"]`) || view).focus();
    }
  });
  // Close when clicking the dark backdrop.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDetail();
  });

  // ---------- Record and compare (opt-in; recordings never leave the device) ----------
  const myClips = new Map(); // word -> blob URL of the learner's last try
  let recording = null; // { word, session } while the microphone is on
  let drawRecorder = () => {}; // redraws the recorder in the open dialog

  function recorderSection(p) {
    const box = el("div", { class: "recorder" });
    // The dialog is rebuilt on notation changes, so always draw the newest one.
    const draw = drawRecorder = () => box.replaceChildren(...p.words.map((w) => {
      const active = recording && recording.word === w.word;
      const mine = !active && myClips.get(w.word);
      return el("div", { class: "recorder-row" }, [
        el("button", {
          type: "button", class: `play-btn small${active ? " recording" : ""}`,
          onclick: () => (active ? recording.session.stop() : recordWord(w.word)),
        }, active ? "⏹️ Stop" : `🎤 Say "${w.word}"`),
        mine ? el("button", { type: "button", class: "mode-btn small", onclick: () => SoundPlayer.playClip(mine) }, "▶️ Hear me") : null,
        mine ? el("button", { type: "button", class: "mode-btn small", onclick: () => sayWord(w.word) }, "🔊 Real voice") : null,
      ]);
    }));
    draw();
    return box;
  }

  async function recordWord(word) {
    if (recording) return;
    let session;
    try {
      session = await SoundPlayer.startRecording({ maxMs: 3000 });
    } catch (err) {
      // AbortError: the dialog closed, another sound played or another
      // recording started while the browser asked for the microphone.
      if (err.name !== "AbortError") toast("🎤 The microphone isn't available");
      return;
    }
    recording = { word, session };
    drawRecorder();
    announce(`Recording. Say ${word}!`);
    const url = await session.done;
    if (myClips.has(word)) URL.revokeObjectURL(myClips.get(word));
    myClips.set(word, url);
    recording = null;
    drawRecorder();
    // Closing the dialog or playing another sound stops the recording; keep
    // it, but don't play it back over that sound.
    if (dialog.open && !session.interrupted()) SoundPlayer.playClip(url);
  }

  // ---------- Recording credits ----------
  const creditsDialog = document.getElementById("credits");

  function openCredits() {
    const accentLabel = (a) => `${accentNames[a] || a} voice`;
    const items = Object.entries(RECORDINGS)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([word, byAccent]) => Object.entries(byAccent).map(([acc, rec]) =>
        el("li", {}, [
          el("strong", { text: word }), ` (${accentLabel(acc)}): `,
          el("a", { href: rec.page, target: "_blank", rel: "noopener", text: rec.file }),
          ` by ${rec.author}, `,
          rec.licenseUrl
            ? el("a", { href: rec.licenseUrl, target: "_blank", rel: "noopener", text: rec.license })
            : rec.license,
        ])
      ));
    document.getElementById("credits-content").replaceChildren(
      el("button", { type: "button", class: "close-btn", "aria-label": "Close", onclick: () => creditsDialog.close(), text: "✕" }),
      el("h2", { class: "credits-title", id: "credits-title", text: "🎙️ Recording credits" }),
      el("p", { class: "note", text: "Thank you to everyone who recorded these words for Wikimedia Commons! Each file is used under the license shown. Follow a file name to see its page." }),
      el("ul", { class: "credits-list" }, items),
    );
    creditsDialog.showModal();
  }

  document.getElementById("credits-btn").addEventListener("click", openCredits);
  creditsDialog.addEventListener("click", (e) => {
    if (e.target === creditsDialog) creditsDialog.close();
  });

  // ---------- Sound Game ----------
  // Every game asks QUIZ_LENGTH questions. A question has a type, an answer
  // and options: sound ids for "hear", words for the picture games.
  const allWords = [...new Map([...PHONEMES.flatMap((p) => p.words), ...MINIMAL_PAIRS.flat()]
    .map((w) => [w.word, w])).values()];
  const wordByText = Object.fromEntries(allWords.map((w) => [w.word, w]));

  const MODES = {
    vowel: { type: "hear", label: "Vowel Sounds", emoji: "🍎", pool: (p) => p.category !== "consonant" },
    consonant: { type: "hear", label: "Consonant Sounds", emoji: "🐝", pool: (p) => p.category === "consonant" },
    mix: { type: "hear", label: "Mix It Up", emoji: "🌈", pool: () => true },
    pairs: { type: "pairs", label: "Which Word?", emoji: "🐑" },
    find: { type: "find", label: "Find the Sound", emoji: "🔎", pool: () => true },
    read: { type: "read", label: "Read It!", emoji: "📖" },
  };
  const GAME_GROUPS = [
    { title: "👂 Hear it", text: "Listen to a word and find its sound, or tell two words apart (ship or sheep?).", modes: ["vowel", "consonant", "mix", "pairs"], earsOnly: true },
    { title: "🔤 Read it", text: "Read the symbols and find the picture.", modes: ["find", "read"] },
  ];

  function startQuiz(mode) {
    const m = MODES[mode];
    // Every pool has at least QUIZ_LENGTH items, so a round never repeats one.
    // Questions are made up front so the next word's audio can be preloaded.
    const questions = m.type === "read" ? shuffle(allWords).slice(0, QUIZ_LENGTH).map(makeReadQuestion)
      : m.type === "pairs" ? shuffle(MINIMAL_PAIRS).slice(0, QUIZ_LENGTH).map(makePairsQuestion)
      : practiceTargets(PHONEMES.filter(m.pool), QUIZ_LENGTH)
        .map(m.type === "hear" ? makeHearQuestion : makeFindQuestion);
    state.quiz = { mode, questions, index: 0, score: 0, question: null, answered: null };
    nextQuestion();
  }

  const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
  const starCount = (n) => `${n} star${n === 1 ? "" : "s"}`;
  const bestKey = (mode, n = state.notation) => `${n}:${mode}`;

  /** Save the round's score as the best for its game in the current notation. */
  function finishQuiz(q) {
    q.notation = state.notation;
    state.best[bestKey(q.mode)] = Math.max(q.score, state.best[bestKey(q.mode)] || 0);
    saveSettings();
  }

  // ---------- Progress ----------
  /** "new", "learning" or "known" for a sound, from saved right/wrong answers. */
  function level(p) {
    const { right = 0, wrong = 0 } = state.progress[p.id] || {};
    if (!right && !wrong) return "new";
    return right >= 2 && right / (right + wrong) >= 0.8 ? "known" : "learning";
  }
  const LEVELS = {
    new: { label: "not tried yet", emoji: "⚪" },
    learning: { label: "still learning", emoji: "🌱" },
    known: { label: "I know it!", emoji: "⭐" },
  };

  function record(id, right) {
    const entry = state.progress[id] || (state.progress[id] = { right: 0, wrong: 0 });
    entry[right ? "right" : "wrong"]++;
    saveSettings();
  }

  /**
   * Pick `count` different sounds, favoring ones the child often misses.
   * Weighted sampling without replacement: sort by random^(1/weight).
   */
  function practiceTargets(pool, count) {
    const weight = (p) => {
      const { right = 0, wrong = 0 } = state.progress[p.id] || {};
      const missRate = right + wrong ? wrong / (right + wrong) : 0.5;
      return 1 + 3 * missRate;
    };
    return pool
      .map((p) => ({ p, key: Math.random() ** (1 / weight(p)) }))
      .sort((a, b) => b.key - a.key)
      .slice(0, count)
      .map(({ p }) => p);
  }

  /** Does any notation's transcription of the word contain the sound? */
  const wordHasSound = (word, p) => NOTATIONS.some((n) => soundsIn(word[n.id], n.id).has(p[n.id]));

  /** The answer word plus up to 3 other words that pass `ok`, all with different pictures. */
  function pictureOptions(answerWord, ok) {
    const chosen = [answerWord];
    for (const w of shuffle(allWords)) {
      if (chosen.length === 4) break;
      if (chosen.some((c) => c.word === w.word || c.emoji === w.emoji) || !ok(w)) continue;
      chosen.push(w);
    }
    return shuffle(chosen).map((w) => w.word);
  }

  /** Hear a word, pick its sound. */
  function makeHearQuestion(target) {
    const word = pickOne(target.words);

    // Distractors: same kind of sound (vowel vs consonant), not present in the
    // word in either notation, and with symbols that look different from the
    // answer and from each other in both notations.
    const sameKind = PHONEMES.filter((p) => (p.category === "consonant") === (target.category === "consonant"));
    const heard = heardTranscriptions(word);
    const inWord = Object.fromEntries(NOTATIONS.map((n) => [
      n.id, new Set(heard.flatMap((t) => [...soundsIn(t[n.id], n.id)])),
    ]));
    const chosen = [target];
    for (const p of shuffle(sameKind)) {
      if (chosen.length === 4) break;
      if (NOTATIONS.some((n) => inWord[n.id].has(p[n.id]))) continue;
      if (chosen.some((c) => NOTATIONS.some((n) => c[n.id] === p[n.id]))) continue;
      chosen.push(p);
    }
    return { type: "hear", targetId: target.id, word, answer: target.id, options: shuffle(chosen).map((p) => p.id) };
  }

  /** See a symbol, pick the picture whose word has that sound. */
  function makeFindQuestion(target) {
    const word = pickOne(target.words);
    // Wrong pictures must not have the sound in any notation, not even as part
    // of a bigger symbol: /ʃ/ is visible in "chair" /tʃɛr/, and so is /ɪ/ in /naɪn/.
    const options = pictureOptions(word, (w) =>
      !wordHasSound(w, target) && NOTATIONS.every((n) => !w[n.id].includes(target[n.id])));
    return { type: "find", targetId: target.id, word, answer: word.word, options };
  }

  /** See a transcription, pick its picture. */
  function makeReadQuestion(word) {
    const options = pictureOptions(word, (w) => NOTATIONS.every((n) => w[n.id] !== word[n.id]));
    return { type: "read", word, answer: word.word, options };
  }

  /** Hear one word of a minimal pair, pick which one it was. */
  function makePairsQuestion(pair) {
    const word = pickOne(pair);
    return { type: "pairs", pair, word, answer: word.word, options: shuffle(pair).map((w) => w.word) };
  }

  // Games where the word is played and the child answers by ear.
  const LISTENING = new Set(["hear", "pairs"]);

  function nextQuestion() {
    const q = state.quiz;
    q.question = q.questions[q.index];
    q.answered = null;
    const upcoming = q.questions[q.index + 1];
    if (upcoming) SoundPlayer.preload([upcoming.word.word], { accent: accent() });
    render();
    // The button that was clicked is gone; keep keyboard users in the game.
    if (LISTENING.has(q.question.type)) {
      view.querySelector(".quiz .play-btn").focus();
      sayWord(q.question.word.word);
    } else {
      view.querySelector(".quiz .option").focus();
    }
  }

  function answer(choice) {
    const q = state.quiz;
    if (q.answered) return;
    const question = q.question;
    q.answered = choice;
    const right = choice === question.answer;
    if (right) q.score++;
    if (question.targetId) record(question.targetId, right);
    q.praise = pickOne(["Great job! ⭐", "You got it! ⭐", "Super! ⭐", "Well done! ⭐"]);
    render();
    announce(right ? q.praise
      : question.type === "hear" ? `Nice try! The answer is the ${byId[question.answer].name} sound.`
      : `Nice try! The answer is ${question.answer}.`);
    // In the reading games, hearing the answer is part of the reward.
    if (!LISTENING.has(question.type)) sayWord(question.answer);
  }

  function renderGameMenu(box) {
    box.append(
      el("h2", { text: "🎮 Sound Game" }),
      el("p", { class: "section-intro", text: `${QUIZ_LENGTH} questions. Collect as many stars as you can!` }),
      ...GAME_GROUPS.flatMap((group) => [
        el("h3", { class: "game-group", text: group.title }),
        el("p", { text: group.text }),
        group.earsOnly ? el("label", { class: "ears-toggle" }, [
          el("input", {
            type: "checkbox", checked: state.earsOnly ? "" : false,
            onchange: (e) => { state.earsOnly = e.target.checked; saveSettings(); },
          }),
          " 👂 Ears only: hide the word, so you have to listen",
        ]) : null,
        el("div", { class: "mode-list" }, group.modes.map((key) => {
          const m = MODES[key];
          return el("button", { type: "button", class: "mode-btn", onclick: () => startQuiz(key) }, [
            el("span", { "aria-hidden": "true", text: m.emoji }),
            m.label,
            state.best[bestKey(key)] != null ? el("small", { text: `Best (${notation().label}): ${state.best[bestKey(key)]} ⭐` }) : null,
          ]);
        })),
      ]),
      renderMySounds(),
    );
  }

  /** Every sound, colored by how well the child knows it. */
  function renderMySounds() {
    const counts = { new: 0, learning: 0, known: 0 };
    const chips = PHONEMES.map((p) => {
      const l = level(p);
      counts[l]++;
      return el("button", {
        type: "button", class: `sound-chip ${l}`, dataset: { sound: p.id },
        "aria-label": `${p.name}: ${LEVELS[l].label}`,
        title: `${p.name}: ${LEVELS[l].label}`,
        onclick: () => openDetail(p.id),
      }, wrap(sym(p)));
    });
    return el("section", { class: "my-sounds" }, [
      el("h3", { class: "game-group", text: "⭐ My sounds" }),
      el("p", { class: "section-intro", text: "Sounds you miss come up more often in the games. Tap a sound to practice it." }),
      el("p", { class: "legend" }, Object.entries(LEVELS).map(([key, l]) =>
        el("span", { class: `legend-item ${key}` }, `${l.emoji} ${l.label}: ${counts[key]}`))),
      el("div", { class: "sound-chips" }, chips),
      counts.new < PHONEMES.length ? el("button", {
        type: "button", class: "link-btn",
        onclick: () => {
          if (!confirm("Forget all your sound progress?")) return;
          state.progress = {};
          saveSettings();
          render();
        },
      }, "Start over") : null,
    ]);
  }

  function renderResults(box, q) {
    // Saved once by finishQuiz: a notation change redraws this screen, and
    // must not copy the score into the other notation's best.
    const best = state.best[bestKey(q.mode, q.notation)];
    const message = q.score === QUIZ_LENGTH ? "Perfect! You are a Sound Star! 🏆"
      : q.score >= 7 ? "Awesome work! 🎉"
      : q.score >= 4 ? "Good job! Keep practicing! 💪"
      : "Nice try! Let's play again! 😊";
    box.append(
      el("h2", { text: message }),
      el("p", { class: "big-stars", role: "img", "aria-label": starCount(q.score), text: "⭐".repeat(q.score) || "🌱" }),
      el("p", { text: `You got ${q.score} out of ${QUIZ_LENGTH}.` }),
      el("p", { class: "section-intro", text: `Best score (${notationById[q.notation].label}): ${best} ⭐` }),
      el("div", { class: "quiz-actions" }, [
        el("button", { type: "button", class: "play-btn", onclick: () => startQuiz(q.mode) }, "🔁 Play again"),
        el("button", { type: "button", class: "mode-btn", onclick: () => { state.quiz = null; render(); view.querySelector(".mode-btn").focus(); } }, "Choose a game"),
      ]),
    );
  }

  /** The prompt part of a question: what the child hears or reads. */
  function questionPrompt(question, answered) {
    const { type, word } = question;
    const target = question.targetId && byId[question.targetId];
    if (type === "hear") {
      // In ears-only mode the spelling would give the answer away ("sh" in "ship").
      const hideWord = state.earsOnly && !answered;
      return [
        el("div", { class: "quiz-emoji", "aria-hidden": "true", text: word.emoji }),
        hideWord ? null : el("p", { class: "quiz-word", text: word.word }),
        answered ? transcriptionNode(word[state.notation], sym(target)) : null,
        el("p", { class: "quiz-question", text: hideWord ? "Which sound do you hear?" : `Which sound do you hear in "${word.word}"?` }),
        el("button", { type: "button", class: "play-btn", onclick: () => sayWord(word.word) }, "🔊 Listen again"),
      ];
    }
    if (type === "find") {
      return [
        el("p", { class: "quiz-symbol", role: "img", "aria-label": `${target.name} sound`, text: wrap(sym(target)) }),
        el("p", { class: "quiz-question", text: "Which word has this sound?" }),
        answered ? el("p", {}, [el("strong", { text: word.word }), " ", transcriptionNode(word[state.notation], sym(target))]) : null,
      ];
    }
    if (type === "pairs") {
      return [
        el("div", { class: "quiz-emoji", "aria-hidden": "true", text: "👂" }),
        el("p", { class: "quiz-question", text: "Which word do you hear?" }),
        el("button", { type: "button", class: "play-btn", onclick: () => sayWord(word.word) }, "🔊 Listen again"),
        // After answering, show where the two words differ.
        answered ? el("p", { class: "pair-compare" }, question.pair.map((w, i) => el("span", {}, [
          el("strong", { text: w.word }), " ",
          differenceNode(w[state.notation], question.pair[1 - i][state.notation]),
        ]))) : null,
      ];
    }
    // "read"
    return [
      el("p", { class: "quiz-transcription", text: wrap(word[state.notation]) }),
      el("p", { class: "quiz-question", text: "Which picture is this word?" }),
    ];
  }

  function optionButton(question, choice, answered) {
    let cls = "option";
    if (answered && choice === question.answer) cls += " correct";
    else if (answered === choice) cls += " wrong";
    const attrs = { type: "button", disabled: answered ? "" : false, onclick: () => answer(choice) };
    if (question.type === "hear") {
      const p = byId[choice];
      return el("button", { ...attrs, class: cls, "aria-label": `${p.name} sound` }, wrap(sym(p)));
    }
    const w = wordByText[choice];
    return el("button", { ...attrs, class: `${cls} picture` }, [
      el("span", { class: "option-emoji", "aria-hidden": "true", text: w.emoji }),
      el("span", { class: "option-word", text: w.word }),
    ]);
  }

  function renderQuiz() {
    const q = state.quiz;
    const box = el("div", { class: "quiz" });
    view.append(box);

    if (!q) return renderGameMenu(box);
    if (q.index >= QUIZ_LENGTH) return renderResults(box, q);

    const question = q.question;
    const target = question.targetId && byId[question.targetId];
    // Visual only: answer() announces the result through the live region.
    const feedback = el("p", { class: "feedback", "aria-hidden": "true" });
    if (q.answered === question.answer) {
      feedback.classList.add("good");
      feedback.textContent = q.praise;
    } else if (q.answered) {
      feedback.classList.add("bad");
      feedback.textContent = `Nice try! The answer is ${question.type === "hear" ? wrap(sym(target)) : question.answer}.`;
    }

    box.append(
      el("div", { class: "quiz-progress" }, [
        el("span", { text: `Question ${q.index + 1} / ${QUIZ_LENGTH}` }),
        el("span", { class: "quiz-stars", role: "img", "aria-label": starCount(q.score), text: `⭐ ${q.score}` }),
      ]),
      ...questionPrompt(question, q.answered),
      el("div", { class: "options" }, question.options.map((choice) => optionButton(question, choice, q.answered))),
      feedback,
      q.answered ? el("div", { class: "quiz-actions" }, [
        target ? el("button", {
          type: "button", class: "mode-btn", dataset: { sound: target.id }, onclick: () => openDetail(target.id),
        }, `Learn ${wrap(sym(target))}`) : null,
        el("button", {
          type: "button", class: "play-btn next-btn",
          onclick: () => {
            q.index++;
            if (q.index < QUIZ_LENGTH) nextQuestion();
            else {
              finishQuiz(q);
              render();
              view.querySelector(".quiz .play-btn").focus();
            }
          },
        }, q.index + 1 < QUIZ_LENGTH ? "Next ➜" : "See my stars ➜"),
      ]) : null,
    );

    if (q.answered) box.querySelector(".next-btn").focus();
  }

  // ---------- Offline use (only when served over http/https) ----------
  // sw.js caches the page, fonts and every recording that has played. The
  // button downloads all recordings at once, for classrooms with poor Wi-Fi.
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    document.getElementById("offline").hidden = false;
  }

  document.getElementById("offline-btn").addEventListener("click", async (e) => {
    const button = e.currentTarget;
    const status = document.getElementById("offline-status");
    // Same cache name as MEDIA_CACHE in sw.js.
    const cache = await caches.open("sound-explorer-media-v1");
    const urls = Object.values(RECORDINGS)
      .flatMap((byAccent) => Object.values(byAccent))
      .map((rec) => new URL(rec.urls[0], location.href).href);
    button.disabled = true;
    let failed = 0;
    for (const [i, url] of urls.entries()) {
      status.textContent = `${i + 1} / ${urls.length}…`;
      try {
        if (!(await cache.match(url))) await cache.add(new Request(url, { mode: "cors", credentials: "omit" }));
      } catch (err) {
        failed++;
      }
    }
    button.disabled = false;
    status.textContent = failed ? `Saved ${urls.length - failed} sounds; ${failed} failed. Try again later.` : `✅ All ${urls.length} sounds saved.`;
    announce(status.textContent);
  });

  // ---------- Start ----------
  syncHeader();
  render();
})();
