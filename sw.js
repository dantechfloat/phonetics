/*
 * Sound Explorer - service worker for offline and classroom use.
 *
 * - The page itself (HTML, CSS, JS): network first, so changes show up right
 *   away, with the cached copy as a fallback when offline.
 * - Fonts and recordings: cache first. Recordings are cached the first time
 *   they play, or all at once with the "Save sounds for offline" button.
 *
 * Service workers only run over http(s), so opening index.html from disk
 * works as before, just without offline support.
 */

const PAGE_CACHE = "sound-explorer-page-v1";
const MEDIA_CACHE = "sound-explorer-media-v1";

const PAGE_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/data.js",
  "js/recordings.js",
  "js/audio.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

const MEDIA_HOSTS = ["upload.wikimedia.org", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.addAll(PAGE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = [PAGE_CACHE, MEDIA_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isAudio = /\.(mp3|ogg|oga|wav)$/i.test(url.pathname);

  if (url.origin === self.location.origin && !isAudio) {
    event.respondWith(networkFirst(request));
  } else if (MEDIA_HOSTS.includes(url.hostname) || (url.origin === self.location.origin && isAudio)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(MEDIA_CACHE);
  // Cache by URL only: audio requests can carry a Range header, but we always
  // store the whole file and cut the range out of it ourselves.
  const key = request.url;
  let response = await cache.match(key);
  if (!response) {
    const full = await fetch(key, { mode: "cors", credentials: "omit" });
    if (!full.ok) return full;
    await cache.put(key, full.clone());
    response = full;
  }
  const range = request.headers.get("range");
  return range ? rangeResponse(response, range) : response;
}

/** Answer a "Range: bytes=start-end" request from a full cached response. */
async function rangeResponse(response, range) {
  const blob = await response.blob();
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  let start = match && match[1] ? Number(match[1]) : 0;
  let end = match && match[2] ? Number(match[2]) : blob.size - 1;
  if (match && !match[1] && match[2]) {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(blob.size - Number(match[2]), 0);
    end = blob.size - 1;
  }
  end = Math.min(end, blob.size - 1);
  if (start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${blob.size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${blob.size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
