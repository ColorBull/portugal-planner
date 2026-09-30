import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseConfig } from "@/config";

const app = initializeApp(firebaseConfig);

// The default persistence (IndexedDB, then localStorage) keeps the sign-in across
// restarts. A phone short of storage may still throw a site's data away; asking
// for persistent storage tells the browser this data is to be kept.
export const auth = getAuth(app);
try {
  navigator.storage?.persist?.();
} catch {
  /* not supported */
}

// Every document the app reads is also kept in IndexedDB on this device, so
// trips, day plans, notes and photo records stay readable offline. Writes made
// offline are queued there too and sent when the connection returns. The
// multi-tab manager lets two open tabs share that one cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Plain Google sign-in: who you are, nothing else — so signing in again (a new
// phone, cleared site data) is one tap and no permission screen. Drive access for
// photos and documents is asked for separately, on the first upload
// (api/drive.js → requestDriveAccess).
export const googleProvider = new GoogleAuthProvider();
