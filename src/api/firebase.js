import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseConfig } from "@/config";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Every document the app reads is also kept in IndexedDB on this device, so
// trips, day plans, notes and photo records stay readable offline. Writes made
// offline are queued there too and sent when the connection returns. The
// multi-tab manager lets two open tabs share that one cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Google sign-in that also grants per-file Drive access, so the app can
// upload trip photos into the shared Drive folder. `drive.file` is a
// non-sensitive scope: access is limited to files this app creates.
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
// "consent" (not just "select_account") so Google always returns an access
// token that actually carries the drive.file grant — without it a returning
// user is signed in with no Drive scope and uploads fail with 403.
googleProvider.setCustomParameters({ prompt: "consent" });
