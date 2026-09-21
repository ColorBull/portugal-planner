// ---------------------------------------------------------------------------
// Service worker: lets the app start and show its pictures without a network.
//
//   app shell   index.html is network-first (a new deploy shows up as soon as
//               there is a connection) with the cached copy as the fallback;
//               the hashed JS/CSS bundles are cache-first. After every page
//               load the app asks for the full build list (asset-manifest.json)
//               to be cached, so lazily-loaded chunks are on the device too.
//   images      Drive thumbnails and flagcdn flags are cache-first. A photo
//               opened offline at a size never fetched falls back to any
//               cached size of the same file.
//
// Firestore, Google sign-in and Drive uploads pass straight through: Firestore
// has its own offline cache (src/api/firebase.js).
//
// The file never changes between builds, so the cache names stay put and
// stale bundles are pruned against the manifest instead.
// ---------------------------------------------------------------------------

const SHELL = "pp-shell-v1";
const MEDIA = "pp-media-v1";

const scope = new URL(self.registration.scope);
const INDEX = new URL("./", scope).href;
const MANIFEST = new URL("asset-manifest.json", scope).href;
// The frozen /backup/ build lives under this scope but is not this app.
const BACKUP = new URL("backup/", scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.add(INDEX))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== MEDIA).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Cache every file of the current build and drop files from older builds.
async function precache() {
  const res = await fetch(MANIFEST, { cache: "no-store" });
  if (!res.ok) return;
  const manifest = await res.json();
  const files = new Set();
  for (const entry of Object.values(manifest)) {
    [entry.file, ...(entry.css || []), ...(entry.assets || [])]
      .filter(Boolean)
      .forEach((f) => files.add(new URL(f, scope).href));
  }

  const cache = await caches.open(SHELL);
  const cached = new Set((await cache.keys()).map((r) => r.url));
  for (const url of files) {
    if (!cached.has(url)) await cache.add(url).catch(() => {});
  }
  for (const url of cached) {
    if (url !== INDEX && !files.has(url)) await cache.delete(url);
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "precache") event.waitUntil(precache().catch(() => {}));
});

async function networkFirstIndex(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(INDEX, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(INDEX);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(cacheName, request, key = request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await fetch(request);
  // Cross-origin images come back opaque (status 0); they are still usable.
  if (res.ok || res.type === "opaque") await cache.put(key, res.clone());
  return res;
}

const driveFileId = (url) => (url.pathname === "/thumbnail" ? url.searchParams.get("id") : null);

async function driveThumbnail(request) {
  try {
    return await cacheFirst(MEDIA, request, request.url);
  } catch (e) {
    const id = driveFileId(new URL(request.url));
    const cache = await caches.open(MEDIA);
    for (const key of await cache.keys()) {
      if (driveFileId(new URL(key.url)) === id) return cache.match(key);
    }
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === scope.origin) {
    if (!request.url.startsWith(scope.href) || request.url.startsWith(BACKUP)) return;
    if (request.url === MANIFEST || url.pathname.endsWith("/sw.js")) return;
    const isIndex = url.href.split(/[?#]/)[0] === INDEX || url.pathname.endsWith("/index.html");
    if (request.mode === "navigate" || isIndex) {
      event.respondWith(networkFirstIndex(request));
    } else {
      event.respondWith(cacheFirst(SHELL, request));
    }
    return;
  }

  if (url.hostname === "drive.google.com" && url.pathname === "/thumbnail") {
    event.respondWith(driveThumbnail(request));
    return;
  }

  if (url.hostname === "flagcdn.com") {
    event.respondWith(cacheFirst(MEDIA, request, request.url));
  }
});
