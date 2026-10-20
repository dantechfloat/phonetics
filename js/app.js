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
      }));
    } catch (err) {
      // Storage unavailable (private mode, blocked): ignore.
    }
  }

  const saved = loadSettings();
  const state = {
    notation: notationById[saved.notation] ? saved.notation : "kk",
    slow: !!saved.slow,
    tab: ["vowel", "diphthong", "consonant", "quiz"].includes(saved.tab) ? saved.tab : "vowel",
    best: saved.best || {},
    openId: null,
    quiz: null,
  };

  const notation = () => notationById[state.notation];
  const accent = () => notation().accent;
  const sym = (p) => p[state.notation];
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

  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
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

  /** Transcription element with the target sound highlighted. */
  function transcriptionNode(transcription, target) {
    const span = el("span", { class: "word-ipa" }, "/");
    for (const token of tokenize(transcription, state.notation)) {
      span.append(token === target ? el("mark", { text: token }) : token);
    }
    span.append("/");
    return span;
  }

  // ---------- Audio ----------
  async function sayWord(word) {
    const source = await SoundPlayer.playWord(word, { accent: accent(), slow: state.slow });
    if (source === "recorded") toast("🎙️ Real voice");
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
    btn.addEventListener("keydown", (e) => {
      const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const i = NOTATIONS.findIndex((n) => n.id === state.notation);
      const next = NOTATIONS[(i + step + NOTATIONS.length) % NOTATIONS.length].id;
      setNotation(next);
      notationGroup.querySelector(`[data-notation="${next}"]`).focus();
    });
  });

  function setNotation(id) {
    if (id === state.notation) return;
    state.notation = id;
    saveSettings();
    syncHeader();
    render();
    if (state.openId) openDetail(state.openId);
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
      dataset: { cat: p.category, ...(p.voicing ? { voicing: p.voicing } : {}) },
      "aria-label": `Sound ${sym(p)}, as in ${first.word}`,
      onclick: () => openDetail(p.id),
    }, [
      el("span", { class: "card-symbol", text: wrap(sym(p)) }),
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
    view.append(el("p", { class: "section-intro", text: INTROS[category] }));

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

  function render() {
    view.replaceChildren();
    if (state.tab === "quiz") renderQuiz();
    else renderCategory(state.tab);
  }

  // ---------- Detail dialog ----------
  const dialog = document.getElementById("detail");
  const detailContent = document.getElementById("detail-content");

  function highlightSentence(sentence, words) {
    const p = el("p", { class: "sentence-text" });
    const stems = words.map((w) => w.word.toLowerCase());
    for (const part of sentence.split(/(\s+)/)) {
      const bare = part.toLowerCase().replace(/[^a-z-]/g, "");
      const hit = bare && stems.some((s) => bare === s || (bare.startsWith(s) && bare.length - s.length <= 2));
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
      el("p", { class: "detail-symbol", id: "detail-symbol", text: wrap(target) }),
      el("div", {}, [
        el("p", { class: "detail-both" }, NOTATIONS.flatMap((n, i) => [
          `${i ? "   |   " : ""}${n.label}: `, el("span", { class: "ipa", text: wrap(p[n.id]) }),
        ])),
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
      ]),
      el("section", { class: "detail-section" }, [
        el("h3", { text: "🖼️ Words with this sound" }),
        el("ul", { class: "word-list" }, wordItems),
      ]),
      el("section", { class: "detail-section" }, [
        el("h3", { text: "💬 Say it in a sentence" }),
        el("div", { class: "sentence" }, [
          highlightSentence(p.sentence, p.words),
          el("button", { type: "button", class: "play-btn small", onclick: () => saySentence(p.sentence) }, "🔊 Listen"),
        ]),
      ]),
      partner ? el("button", {
        type: "button", class: "partner-link",
        onclick: () => openDetail(partner.id),
      }, [`Compare with its partner sound ${wrap(sym(partner))} →`]) : null,
    ].filter(Boolean));

    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  function closeDetail() {
    dialog.close();
  }

  dialog.addEventListener("close", () => {
    state.openId = null;
    SoundPlayer.stop();
  });
  // Close when clicking the dark backdrop.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDetail();
  });

  // ---------- Sound Game ----------
  const MODES = {
    vowel: { label: "Vowel Sounds", emoji: "🍎", pool: (p) => p.category !== "consonant" },
    consonant: { label: "Consonant Sounds", emoji: "🐝", pool: (p) => p.category === "consonant" },
    mix: { label: "Mix It Up", emoji: "🌈", pool: () => true },
  };

  function startQuiz(mode) {
    // Every pool has at least QUIZ_LENGTH sounds, so a round never repeats one.
    const queue = shuffle(PHONEMES.filter(MODES[mode].pool)).slice(0, QUIZ_LENGTH);
    state.quiz = { mode, queue, index: 0, score: 0, question: null, answered: null };
    nextQuestion();
  }

  function makeQuestion(target) {
    const word = target.words[Math.floor(Math.random() * target.words.length)];

    // Distractors: same kind of sound (vowel vs consonant), not present in the
    // word in either notation, and with symbols that look different from the
    // answer and from each other in both notations.
    const sameKind = PHONEMES.filter((p) => (p.category === "consonant") === (target.category === "consonant"));
    const inWord = Object.fromEntries(NOTATIONS.map((n) => [n.id, soundsIn(word[n.id], n.id)]));
    const chosen = [target];
    for (const p of shuffle(sameKind)) {
      if (chosen.length === 4) break;
      if (NOTATIONS.some((n) => inWord[n.id].has(p[n.id]))) continue;
      if (chosen.some((c) => NOTATIONS.some((n) => c[n.id] === p[n.id]))) continue;
      chosen.push(p);
    }
    return { targetId: target.id, word, optionIds: shuffle(chosen).map((p) => p.id) };
  }

  function nextQuestion() {
    const q = state.quiz;
    q.question = makeQuestion(q.queue[q.index]);
    q.answered = null;
    render();
    sayWord(q.question.word.word);
  }

  function answer(id) {
    const q = state.quiz;
    if (q.answered) return;
    q.answered = id;
    if (id === q.question.targetId) q.score++;
    render();
  }

  function renderQuiz() {
    const q = state.quiz;
    const box = el("div", { class: "quiz" });
    view.append(box);

    if (!q) {
      box.append(
        el("h2", { text: "🎮 Sound Game" }),
        el("p", { text: "Listen to a word and find its sound!" }),
        el("p", { class: "section-intro", text: `${QUIZ_LENGTH} questions. Collect as many stars as you can!` }),
        el("div", { class: "mode-list" }, Object.entries(MODES).map(([key, m]) =>
          el("button", { type: "button", class: "mode-btn", onclick: () => startQuiz(key) }, [
            el("span", { "aria-hidden": "true", text: m.emoji }),
            m.label,
            state.best[key] != null ? el("small", { style: "display:block;font-weight:700", text: `Best: ${state.best[key]} ⭐` }) : null,
          ])
        )),
      );
      return;
    }

    if (q.index >= QUIZ_LENGTH) {
      const best = Math.max(q.score, state.best[q.mode] || 0);
      state.best[q.mode] = best;
      saveSettings();
      const message = q.score === QUIZ_LENGTH ? "Perfect! You are a Sound Star! 🏆"
        : q.score >= 7 ? "Awesome work! 🎉"
        : q.score >= 4 ? "Good job! Keep practicing! 💪"
        : "Nice try! Let's play again! 😊";
      box.append(
        el("h2", { text: message }),
        el("p", { class: "big-stars", "aria-label": `${q.score} stars`, text: "⭐".repeat(q.score) || "🌱" }),
        el("p", { text: `You got ${q.score} out of ${QUIZ_LENGTH}.` }),
        el("p", { class: "section-intro", text: `Best score: ${best} ⭐` }),
        el("div", { class: "quiz-actions" }, [
          el("button", { type: "button", class: "play-btn", onclick: () => startQuiz(q.mode) }, "🔁 Play again"),
          el("button", { type: "button", class: "mode-btn", onclick: () => { state.quiz = null; render(); } }, "Choose a game"),
        ]),
      );
      return;
    }

    const { word, targetId, optionIds } = q.question;
    const target = byId[targetId];
    const feedback = el("p", { class: "feedback", role: "status" });

    if (q.answered) {
      if (q.answered === targetId) {
        feedback.classList.add("good");
        feedback.textContent = shuffle(["Great job! ⭐", "You got it! ⭐", "Super! ⭐", "Well done! ⭐"])[0];
      } else {
        feedback.classList.add("bad");
        feedback.textContent = `Nice try! The answer is ${wrap(sym(target))}.`;
      }
    }

    box.append(
      el("div", { class: "quiz-progress" }, [
        el("span", { text: `Question ${q.index + 1} / ${QUIZ_LENGTH}` }),
        el("span", { class: "quiz-stars", "aria-label": `${q.score} stars`, text: `⭐ ${q.score}` }),
      ]),
      el("div", { class: "quiz-emoji", "aria-hidden": "true", text: word.emoji }),
      el("p", { class: "quiz-word", text: word.word }),
      q.answered ? transcriptionNode(word[state.notation], sym(target)) : null,
      el("p", { class: "quiz-question", text: `Which sound do you hear in "${word.word}"?` }),
      el("button", { type: "button", class: "play-btn", onclick: () => sayWord(word.word) }, "🔊 Listen again"),
      el("div", { class: "options" }, optionIds.map((id) => {
        const p = byId[id];
        let cls = "option";
        if (q.answered && id === targetId) cls += " correct";
        else if (q.answered === id) cls += " wrong";
        return el("button", {
          type: "button", class: cls,
          disabled: q.answered ? "" : false,
          "aria-label": `Sound ${sym(p)}`,
          onclick: () => answer(id),
        }, wrap(sym(p)));
      })),
      feedback,
      q.answered ? el("div", { class: "quiz-actions" }, [
        el("button", { type: "button", class: "mode-btn", onclick: () => openDetail(targetId) }, `Learn ${wrap(sym(target))}`),
        el("button", {
          type: "button", class: "play-btn",
          onclick: () => { q.index++; if (q.index < QUIZ_LENGTH) nextQuestion(); else render(); },
        }, q.index + 1 < QUIZ_LENGTH ? "Next ➜" : "See my stars ➜"),
      ]) : null,
    );

    if (q.answered) box.querySelector(".quiz-actions .play-btn").focus();
  }

  // ---------- Start ----------
  syncHeader();
  render();
})();
