// ---------------------------------------------------------------------------
// Reads and writes that keep working without a connection.
//
// Firestore's persistent cache (see firebase.js) already holds a copy of every
// document this device has seen. These helpers make the app lean on it:
//   - reads go to the server when online and fall back to the cache when the
//     device is offline or the network is too slow to answer;
//   - writes are applied to the cache at once and synced later, so the UI never
//     waits on a server acknowledgement that cannot arrive while offline.
// ---------------------------------------------------------------------------

import { getDocs, getDocsFromCache, getDoc, getDocFromCache } from "firebase/firestore";

// How long to wait for the server before settling for cached data.
const SLOW_NETWORK_MS = 4000;
// How long a save may keep the UI waiting before it counts as queued.
const WRITE_WAIT_MS = 6000;

export const isOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fromServerOrCache(fromServer, fromCache, isEmpty) {
  if (!isOnline()) return fromCache();

  const server = fromServer();
  // On a flaky connection, show what the cache has instead of spinning — but
  // only if it actually has something; an empty cache waits for the server.
  const slow = delay(SLOW_NETWORK_MS).then(async () => {
    const cached = await fromCache().catch(() => null);
    return cached && !isEmpty(cached) ? cached : server;
  });

  try {
    return await Promise.race([server, slow]);
  } catch (e) {
    if (e?.code === "unavailable" || e?.code === "failed-precondition") return fromCache();
    throw e;
  }
}

export const readDocs = (q) =>
  fromServerOrCache(
    () => getDocs(q),
    () => getDocsFromCache(q),
    (snap) => snap.empty
  );

export const readDoc = (ref) =>
  fromServerOrCache(
    () => getDoc(ref),
    () => getDocFromCache(ref),
    (snap) => !snap.exists()
  );

// Firestore resolves a write only when the server confirms it, which never
// happens offline — yet the change is already in the local cache and queued.
// So wait a moment for the confirmation, then let the UI move on.
export async function write(promise) {
  promise.catch((e) => console.error("Firestore write failed", e));
  if (!isOnline()) return;
  await Promise.race([promise, delay(WRITE_WAIT_MS)]);
}
