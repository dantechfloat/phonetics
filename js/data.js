/*
 * Phoneme dataset.
 *
 * Every sound has a symbol in both notations:
 *   dj - Daniel Jones style (British English, as used in many school dictionaries)
 *   kk - Kenyon & Knott style (American English)
 *
 * Every example word also carries a full transcription in both notations,
 * so switching the notation updates the whole page consistently.
 */

const CATEGORIES = [
  { id: "vowel", label: "Vowels", emoji: "🍎" },
  { id: "diphthong", label: "Double Vowels", emoji: "🎈" },
  { id: "consonant", label: "Consonants", emoji: "🐝" },
];

const GROUPS = {
  short: "Short Vowels",
  long: "Long Vowels",
  diphthong: "Double Vowels (Gliding Sounds)",
  pair: "Partner Sounds (Quiet + Buzzy)",
  other: "More Consonants",
};

const PHONEMES = [
  // ---------- Short vowels ----------
  {
    id: "short-i", category: "vowel", group: "short", dj: "i", kk: "ɪ",
    tip: "Say a short, relaxed \"i\". Open your mouth just a little. Don't smile too much!",
    words: [
      { word: "fish", emoji: "🐟", dj: "fiʃ", kk: "fɪʃ" },
      { word: "pig", emoji: "🐷", dj: "pig", kk: "pɪg" },
      { word: "milk", emoji: "🥛", dj: "milk", kk: "mɪlk" },
    ],
    sentence: "The big pig drinks milk.",
  },
  {
    id: "short-e", category: "vowel", group: "short", dj: "e", kk: "ɛ",
    tip: "Open your mouth a little more than for \"i\" and say a short \"e\".",
    words: [
      { word: "bed", emoji: "🛏️", dj: "bed", kk: "bɛd" },
      { word: "egg", emoji: "🥚", dj: "eg", kk: "ɛg" },
      { word: "red", emoji: "🔴", dj: "red", kk: "rɛd" },
    ],
    sentence: "Ten red eggs are on the bed.",
  },
  {
    id: "short-ae", category: "vowel", group: "short", dj: "æ", kk: "æ",
    tip: "Open your mouth wide like a big smile, and say \"a\" and \"e\" at the same time.",
    words: [
      { word: "cat", emoji: "🐱", dj: "kæt", kk: "kæt" },
      { word: "apple", emoji: "🍎", dj: "ˈæpl", kk: "ˈæpl" },
      { word: "hat", emoji: "🎩", dj: "hæt", kk: "hæt" },
    ],
    sentence: "The cat has a black hat.",
  },
  {
    id: "short-uh", category: "vowel", group: "short", dj: "ʌ", kk: "ʌ",
    tip: "Open your mouth a little and say a short, strong \"a\" from your throat.",
    words: [
      { word: "cup", emoji: "☕", dj: "kʌp", kk: "kʌp" },
      { word: "sun", emoji: "☀️", dj: "sʌn", kk: "sʌn" },
      { word: "duck", emoji: "🦆", dj: "dʌk", kk: "dʌk" },
    ],
    sentence: "The duck sits in the sun.",
  },
  {
    id: "short-o", category: "vowel", group: "short", dj: "ɔ", kk: "ɑ",
    tip: "Make your mouth round and open, and say a short \"o\". In American English it sounds more like \"ah\".",
    words: [
      { word: "hot", emoji: "🔥", dj: "hɔt", kk: "hɑt" },
      { word: "box", emoji: "📦", dj: "bɔks", kk: "bɑks" },
      { word: "sock", emoji: "🧦", dj: "sɔk", kk: "sɑk" },
    ],
    sentence: "My sock is in the box.",
  },
  {
    id: "short-u", category: "vowel", group: "short", dj: "u", kk: "ʊ",
    tip: "Round your lips a little and say a short, soft \"u\".",
    words: [
      { word: "book", emoji: "📖", dj: "buk", kk: "bʊk" },
      { word: "foot", emoji: "🦶", dj: "fut", kk: "fʊt" },
      { word: "cook", emoji: "🧑‍🍳", dj: "kuk", kk: "kʊk" },
    ],
    sentence: "Look at the good book.",
  },
  {
    id: "schwa", category: "vowel", group: "short", dj: "ə", kk: "ə",
    tip: "This is the lazy sound! Relax your mouth and say a tiny, quick \"uh\".",
    words: [
      { word: "banana", emoji: "🍌", dj: "bəˈnɑːnə", kk: "bəˈnænə" },
      { word: "lemon", emoji: "🍋", dj: "ˈlemən", kk: "ˈlɛmən" },
      { word: "panda", emoji: "🐼", dj: "ˈpændə", kk: "ˈpændə" },
    ],
    sentence: "A panda eats a banana.",
  },
  {
    id: "schwa-r", category: "vowel", group: "short", dj: "ə", kk: "ɚ",
    tip: "A lazy \"uh\" at the end of a word. In American English, curl your tongue back a little for an \"r\" sound.",
    note: "KK uses a special symbol for this sound. DJ uses the same symbol as the lazy \"uh\".",
    words: [
      { word: "water", emoji: "💧", dj: "ˈwɔːtə", kk: "ˈwɔtɚ" },
      { word: "tiger", emoji: "🐯", dj: "ˈtaigə", kk: "ˈtaɪgɚ" },
      { word: "teacher", emoji: "🧑‍🏫", dj: "ˈtiːtʃə", kk: "ˈtitʃɚ" },
    ],
    sentence: "The tiger drinks water.",
  },

  // ---------- Long vowels ----------
  {
    id: "long-ee", category: "vowel", group: "long", dj: "iː", kk: "i",
    tip: "Smile wide and say a long \"ee\".",
    words: [
      { word: "sea", emoji: "🌊", dj: "siː", kk: "si" },
      { word: "tree", emoji: "🌳", dj: "triː", kk: "tri" },
      { word: "cheese", emoji: "🧀", dj: "tʃiːz", kk: "tʃiz" },
    ],
    sentence: "I see three green trees.",
  },
  {
    id: "long-ah", category: "vowel", group: "long", dj: "ɑː", kk: "ɑ",
    tip: "Open your mouth wide like at the doctor and say a long \"ah\". In American English, add an \"r\" after it in these words.",
    words: [
      { word: "car", emoji: "🚗", dj: "kɑː", kk: "kɑr" },
      { word: "star", emoji: "⭐", dj: "stɑː", kk: "stɑr" },
      { word: "park", emoji: "🏞️", dj: "pɑːk", kk: "pɑrk" },
    ],
    sentence: "I see a star from the car.",
  },
  {
    id: "long-aw", category: "vowel", group: "long", dj: "ɔː", kk: "ɔ",
    tip: "Make your lips round like an \"o\" and say a long \"aw\".",
    words: [
      { word: "ball", emoji: "⚽", dj: "bɔːl", kk: "bɔl" },
      { word: "horse", emoji: "🐴", dj: "hɔːs", kk: "hɔrs" },
      { word: "fork", emoji: "🍴", dj: "fɔːk", kk: "fɔrk" },
    ],
    sentence: "The horse plays with a ball.",
  },
  {
    id: "long-oo", category: "vowel", group: "long", dj: "uː", kk: "u",
    tip: "Push your lips forward like a kiss and say a long \"oo\".",
    words: [
      { word: "moon", emoji: "🌙", dj: "muːn", kk: "mun" },
      { word: "school", emoji: "🏫", dj: "skuːl", kk: "skul" },
      { word: "shoe", emoji: "👟", dj: "ʃuː", kk: "ʃu" },
    ],
    sentence: "The moon is over the school.",
  },
  {
    id: "long-er", category: "vowel", group: "long", dj: "əː", kk: "ɝ",
    tip: "Keep your mouth half open and say a long \"er\". In American English, curl your tongue back.",
    words: [
      { word: "bird", emoji: "🐦", dj: "bəːd", kk: "bɝd" },
      { word: "girl", emoji: "👧", dj: "gəːl", kk: "gɝl" },
      { word: "nurse", emoji: "🧑‍⚕️", dj: "nəːs", kk: "nɝs" },
    ],
    sentence: "The girl sees a bird.",
  },

  // ---------- Diphthongs ----------
  {
    id: "di-ay", category: "diphthong", group: "diphthong", dj: "ei", kk: "e",
    tip: "Start with \"e\" and slide to \"i\": \"e-i\".",
    words: [
      { word: "cake", emoji: "🎂", dj: "keik", kk: "kek" },
      { word: "train", emoji: "🚆", dj: "trein", kk: "tren" },
      { word: "rain", emoji: "🌧️", dj: "rein", kk: "ren" },
    ],
    sentence: "I eat cake on the train.",
  },
  {
    id: "di-eye", category: "diphthong", group: "diphthong", dj: "ai", kk: "aɪ",
    tip: "Start with a big \"a\" and slide to \"i\": \"a-i\".",
    words: [
      { word: "bike", emoji: "🚲", dj: "baik", kk: "baɪk" },
      { word: "ice", emoji: "🧊", dj: "ais", kk: "aɪs" },
      { word: "kite", emoji: "🪁", dj: "kait", kk: "kaɪt" },
    ],
    sentence: "I ride my bike and fly a kite.",
  },
  {
    id: "di-oy", category: "diphthong", group: "diphthong", dj: "ɔi", kk: "ɔɪ",
    tip: "Start with a round \"o\" and slide to \"i\": \"o-i\".",
    words: [
      { word: "boy", emoji: "👦", dj: "bɔi", kk: "bɔɪ" },
      { word: "toy", emoji: "🧸", dj: "tɔi", kk: "tɔɪ" },
      { word: "coin", emoji: "🪙", dj: "kɔin", kk: "kɔɪn" },
    ],
    sentence: "The boy has a toy.",
  },
  {
    id: "di-ow", category: "diphthong", group: "diphthong", dj: "au", kk: "aʊ",
    tip: "Start with a big \"a\" and slide to \"u\": \"a-u\". Like saying \"Ouch!\"",
    words: [
      { word: "cow", emoji: "🐄", dj: "kau", kk: "kaʊ" },
      { word: "house", emoji: "🏠", dj: "haus", kk: "haʊs" },
      { word: "mouse", emoji: "🐭", dj: "maus", kk: "maʊs" },
    ],
    sentence: "A mouse is in the house.",
  },
  {
    id: "di-oh", category: "diphthong", group: "diphthong", dj: "ou", kk: "o",
    tip: "Start with \"o\" and slide to \"u\" as your lips get rounder: \"o-u\".",
    words: [
      { word: "boat", emoji: "⛵", dj: "bout", kk: "bot" },
      { word: "snow", emoji: "❄️", dj: "snou", kk: "sno" },
      { word: "nose", emoji: "👃", dj: "nouz", kk: "noz" },
    ],
    sentence: "Snow is on my nose.",
  },
  {
    id: "di-ear", category: "diphthong", group: "diphthong", dj: "iə", kk: "ɪr",
    tip: "Start with \"i\" and slide to a lazy \"uh\". In American English, finish with an \"r\".",
    words: [
      { word: "ear", emoji: "👂", dj: "iə", kk: "ɪr" },
      { word: "deer", emoji: "🦌", dj: "diə", kk: "dɪr" },
      { word: "year", emoji: "📅", dj: "jiə", kk: "jɪr" },
    ],
    sentence: "The deer has big ears.",
  },
  {
    id: "di-air", category: "diphthong", group: "diphthong", dj: "ɛə", kk: "ɛr",
    tip: "Start with \"e\" and slide to a lazy \"uh\". In American English, finish with an \"r\".",
    words: [
      { word: "bear", emoji: "🐻", dj: "bɛə", kk: "bɛr" },
      { word: "chair", emoji: "🪑", dj: "tʃɛə", kk: "tʃɛr" },
      { word: "hair", emoji: "💇", dj: "hɛə", kk: "hɛr" },
    ],
    sentence: "The bear sits on a chair.",
  },
  {
    id: "di-oor", category: "diphthong", group: "diphthong", dj: "uə", kk: "ʊr",
    tip: "Start with a soft \"u\" and slide to a lazy \"uh\". In American English, finish with an \"r\".",
    note: "Many speakers today say these words with \"ɔː\" instead.",
    words: [
      { word: "tour", emoji: "🗺️", dj: "tuə", kk: "tʊr" },
      { word: "sure", emoji: "✅", dj: "ʃuə", kk: "ʃʊr" },
      { word: "tourist", emoji: "📸", dj: "ˈtuərist", kk: "ˈtʊrɪst" },
    ],
    sentence: "Are you sure about the tour?",
  },

  // ---------- Consonants: partner pairs ----------
  {
    id: "c-p", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-b", dj: "p", kk: "p",
    tip: "Close your lips, then pop them open with a puff of air. No voice!",
    words: [
      { word: "pen", emoji: "🖊️", dj: "pen", kk: "pɛn" },
      { word: "pig", emoji: "🐷", dj: "pig", kk: "pɪg" },
      { word: "cup", emoji: "☕", dj: "kʌp", kk: "kʌp" },
    ],
    sentence: "The pig has a pink pen.",
  },
  {
    id: "c-b", category: "consonant", group: "pair", voicing: "voiced", pair: "c-p", dj: "b", kk: "b",
    tip: "Close your lips, then pop them open while using your voice.",
    words: [
      { word: "ball", emoji: "⚽", dj: "bɔːl", kk: "bɔl" },
      { word: "bus", emoji: "🚌", dj: "bʌs", kk: "bʌs" },
      { word: "bed", emoji: "🛏️", dj: "bed", kk: "bɛd" },
    ],
    sentence: "Ben has a big blue ball.",
  },
  {
    id: "c-t", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-d", dj: "t", kk: "t",
    tip: "Touch the top of your mouth behind your teeth with your tongue, then let go with a puff of air.",
    words: [
      { word: "ten", emoji: "🔟", dj: "ten", kk: "tɛn" },
      { word: "tea", emoji: "🍵", dj: "tiː", kk: "ti" },
      { word: "cat", emoji: "🐱", dj: "kæt", kk: "kæt" },
    ],
    sentence: "Tom has ten toys.",
  },
  {
    id: "c-d", category: "consonant", group: "pair", voicing: "voiced", pair: "c-t", dj: "d", kk: "d",
    tip: "Same as \"t\", but use your voice.",
    words: [
      { word: "dog", emoji: "🐶", dj: "dɔg", kk: "dɔg" },
      { word: "duck", emoji: "🦆", dj: "dʌk", kk: "dʌk" },
      { word: "door", emoji: "🚪", dj: "dɔː", kk: "dɔr" },
    ],
    sentence: "The dog is at the door.",
  },
  {
    id: "c-k", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-g", dj: "k", kk: "k",
    tip: "Lift the back of your tongue, then let go with a puff of air.",
    words: [
      { word: "key", emoji: "🔑", dj: "kiː", kk: "ki" },
      { word: "cake", emoji: "🎂", dj: "keik", kk: "kek" },
      { word: "book", emoji: "📖", dj: "buk", kk: "bʊk" },
    ],
    sentence: "Kate has a key and a cake.",
  },
  {
    id: "c-g", category: "consonant", group: "pair", voicing: "voiced", pair: "c-k", dj: "g", kk: "g",
    tip: "Same as \"k\", but use your voice.",
    words: [
      { word: "gift", emoji: "🎁", dj: "gift", kk: "gɪft" },
      { word: "goat", emoji: "🐐", dj: "gout", kk: "got" },
      { word: "egg", emoji: "🥚", dj: "eg", kk: "ɛg" },
    ],
    sentence: "The goat has a gift.",
  },
  {
    id: "c-f", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-v", dj: "f", kk: "f",
    tip: "Put your top teeth on your bottom lip and blow air.",
    words: [
      { word: "fish", emoji: "🐟", dj: "fiʃ", kk: "fɪʃ" },
      { word: "fox", emoji: "🦊", dj: "fɔks", kk: "fɑks" },
      { word: "leaf", emoji: "🍃", dj: "liːf", kk: "lif" },
    ],
    sentence: "The fox sees a fish.",
  },
  {
    id: "c-v", category: "consonant", group: "pair", voicing: "voiced", pair: "c-f", dj: "v", kk: "v",
    tip: "Put your top teeth on your bottom lip and use your voice. Your lip will tickle!",
    words: [
      { word: "van", emoji: "🚐", dj: "væn", kk: "væn" },
      { word: "vest", emoji: "🦺", dj: "vest", kk: "vɛst" },
      { word: "five", emoji: "5️⃣", dj: "faiv", kk: "faɪv" },
    ],
    sentence: "Five vans are very big.",
  },
  {
    id: "c-th", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-dh", dj: "θ", kk: "θ",
    tip: "Put the tip of your tongue between your teeth and blow air softly.",
    words: [
      { word: "three", emoji: "3️⃣", dj: "θriː", kk: "θri" },
      { word: "thumb", emoji: "👍", dj: "θʌm", kk: "θʌm" },
      { word: "bath", emoji: "🛁", dj: "bɑːθ", kk: "bæθ" },
    ],
    sentence: "Thank you for the three gifts.",
  },
  {
    id: "c-dh", category: "consonant", group: "pair", voicing: "voiced", pair: "c-th", dj: "ð", kk: "ð",
    tip: "Put the tip of your tongue between your teeth and use your voice.",
    words: [
      { word: "this", emoji: "☝️", dj: "ðis", kk: "ðɪs" },
      { word: "mother", emoji: "👩", dj: "ˈmʌðə", kk: "ˈmʌðɚ" },
      { word: "father", emoji: "👨", dj: "ˈfɑːðə", kk: "ˈfɑðɚ" },
    ],
    sentence: "This is my mother and father.",
  },
  {
    id: "c-s", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-z", dj: "s", kk: "s",
    tip: "Put your teeth close together and hiss like a snake: \"sss\".",
    words: [
      { word: "sun", emoji: "☀️", dj: "sʌn", kk: "sʌn" },
      { word: "bus", emoji: "🚌", dj: "bʌs", kk: "bʌs" },
      { word: "sock", emoji: "🧦", dj: "sɔk", kk: "sɑk" },
    ],
    sentence: "Sam sees the sun from the bus.",
  },
  {
    id: "c-z", category: "consonant", group: "pair", voicing: "voiced", pair: "c-s", dj: "z", kk: "z",
    tip: "Same as \"s\", but use your voice. Buzz like a bee: \"zzz\".",
    words: [
      { word: "zoo", emoji: "🦁", dj: "zuː", kk: "zu" },
      { word: "zebra", emoji: "🦓", dj: "ˈziːbrə", kk: "ˈzibrə" },
      { word: "nose", emoji: "👃", dj: "nouz", kk: "noz" },
    ],
    sentence: "I see a zebra at the zoo.",
  },
  {
    id: "c-sh", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-zh", dj: "ʃ", kk: "ʃ",
    tip: "Round your lips and say \"shh\", like asking someone to be quiet.",
    words: [
      { word: "shoe", emoji: "👟", dj: "ʃuː", kk: "ʃu" },
      { word: "ship", emoji: "🚢", dj: "ʃip", kk: "ʃɪp" },
      { word: "fish", emoji: "🐟", dj: "fiʃ", kk: "fɪʃ" },
    ],
    sentence: "She sees a fish from the ship.",
  },
  {
    id: "c-zh", category: "consonant", group: "pair", voicing: "voiced", pair: "c-sh", dj: "ʒ", kk: "ʒ",
    tip: "Same as \"sh\", but use your voice.",
    words: [
      { word: "treasure", emoji: "💎", dj: "ˈtreʒə", kk: "ˈtrɛʒɚ" },
      { word: "television", emoji: "📺", dj: "ˈteliviʒən", kk: "ˈtɛləvɪʒən" },
      { word: "measure", emoji: "📏", dj: "ˈmeʒə", kk: "ˈmɛʒɚ" },
    ],
    sentence: "We find treasure on television.",
  },
  {
    id: "c-ch", category: "consonant", group: "pair", voicing: "voiceless", pair: "c-j", dj: "tʃ", kk: "tʃ",
    tip: "Start with \"t\" and quickly go to \"sh\": \"ch\", like a sneeze!",
    words: [
      { word: "cheese", emoji: "🧀", dj: "tʃiːz", kk: "tʃiz" },
      { word: "chair", emoji: "🪑", dj: "tʃɛə", kk: "tʃɛr" },
      { word: "lunch", emoji: "🍱", dj: "lʌntʃ", kk: "lʌntʃ" },
    ],
    sentence: "I eat cheese for lunch.",
  },
  {
    id: "c-j", category: "consonant", group: "pair", voicing: "voiced", pair: "c-ch", dj: "dʒ", kk: "dʒ",
    tip: "Same as \"ch\", but use your voice: \"j\".",
    words: [
      { word: "juice", emoji: "🧃", dj: "dʒuːs", kk: "dʒus" },
      { word: "jam", emoji: "🍓", dj: "dʒæm", kk: "dʒæm" },
      { word: "orange", emoji: "🍊", dj: "ˈɔrindʒ", kk: "ˈɔrɪndʒ" },
    ],
    sentence: "I like jam and orange juice.",
  },

  // ---------- Consonants: others ----------
  {
    id: "c-h", category: "consonant", group: "other", voicing: "voiceless", dj: "h", kk: "h",
    tip: "Open your mouth and breathe out, like fogging up a window: \"hhh\".",
    words: [
      { word: "hat", emoji: "🎩", dj: "hæt", kk: "hæt" },
      { word: "horse", emoji: "🐴", dj: "hɔːs", kk: "hɔrs" },
      { word: "house", emoji: "🏠", dj: "haus", kk: "haʊs" },
    ],
    sentence: "A horse is in the house.",
  },
  {
    id: "c-m", category: "consonant", group: "other", voicing: "voiced", dj: "m", kk: "m",
    tip: "Close your lips and hum: \"mmm\", like something yummy!",
    words: [
      { word: "moon", emoji: "🌙", dj: "muːn", kk: "mun" },
      { word: "milk", emoji: "🥛", dj: "milk", kk: "mɪlk" },
      { word: "mouse", emoji: "🐭", dj: "maus", kk: "maʊs" },
    ],
    sentence: "My mouse drinks milk.",
  },
  {
    id: "c-n", category: "consonant", group: "other", voicing: "voiced", dj: "n", kk: "n",
    tip: "Touch the top of your mouth behind your teeth with your tongue and hum through your nose: \"nnn\".",
    words: [
      { word: "nose", emoji: "👃", dj: "nouz", kk: "noz" },
      { word: "nine", emoji: "9️⃣", dj: "nain", kk: "naɪn" },
      { word: "nut", emoji: "🥜", dj: "nʌt", kk: "nʌt" },
    ],
    sentence: "Nine nuts are on my nose.",
  },
  {
    id: "c-ng", category: "consonant", group: "other", voicing: "voiced", dj: "ŋ", kk: "ŋ",
    tip: "Lift the back of your tongue like \"k\", and hum through your nose: \"ng\". Don't say \"g\" at the end!",
    words: [
      { word: "king", emoji: "👑", dj: "kiŋ", kk: "kɪŋ" },
      { word: "ring", emoji: "💍", dj: "riŋ", kk: "rɪŋ" },
      { word: "sing", emoji: "🎤", dj: "siŋ", kk: "sɪŋ" },
    ],
    sentence: "The king can sing.",
  },
  {
    id: "c-l", category: "consonant", group: "other", voicing: "voiced", dj: "l", kk: "l",
    tip: "Touch the top of your mouth behind your teeth with your tongue tip and use your voice: \"lll\".",
    words: [
      { word: "lion", emoji: "🦁", dj: "ˈlaiən", kk: "ˈlaɪən" },
      { word: "leaf", emoji: "🍃", dj: "liːf", kk: "lif" },
      { word: "lemon", emoji: "🍋", dj: "ˈlemən", kk: "ˈlɛmən" },
    ],
    sentence: "The lion plays with a leaf.",
  },
  {
    id: "c-r", category: "consonant", group: "other", voicing: "voiced", dj: "r", kk: "r",
    tip: "Round your lips a little and curl your tongue back. Don't touch the top of your mouth!",
    words: [
      { word: "red", emoji: "🔴", dj: "red", kk: "rɛd" },
      { word: "rabbit", emoji: "🐰", dj: "ˈræbit", kk: "ˈræbɪt" },
      { word: "rain", emoji: "🌧️", dj: "rein", kk: "ren" },
    ],
    sentence: "The red rabbit runs in the rain.",
  },
  {
    id: "c-w", category: "consonant", group: "other", voicing: "voiced", dj: "w", kk: "w",
    tip: "Push your lips forward into a small circle, then open them: \"w\".",
    words: [
      { word: "water", emoji: "💧", dj: "ˈwɔːtə", kk: "ˈwɔtɚ" },
      { word: "window", emoji: "🪟", dj: "ˈwindou", kk: "ˈwɪndo" },
      { word: "web", emoji: "🕸️", dj: "web", kk: "wɛb" },
    ],
    sentence: "We wash the window with water.",
  },
  {
    id: "c-y", category: "consonant", group: "other", voicing: "voiced", dj: "j", kk: "j",
    tip: "Start with a quick \"ee\" and slide into the next sound: \"y\". It is not the letter \"j\"!",
    words: [
      { word: "yes", emoji: "🙆", dj: "jes", kk: "jɛs" },
      { word: "yellow", emoji: "💛", dj: "ˈjelou", kk: "ˈjɛlo" },
      { word: "yo-yo", emoji: "🪀", dj: "ˈjoujou", kk: "ˈjojo" },
    ],
    sentence: "Yes, the yo-yo is yellow.",
  },
];
