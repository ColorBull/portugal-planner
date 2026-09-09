import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "@/config";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = getFirestore(app);

// Google sign-in that also grants per-file Drive access, so the app can
// upload trip photos into the shared Drive folder. `drive.file` is a
// non-sensitive scope: access is limited to files this app creates.
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
googleProvider.setCustomParameters({ prompt: "select_account" });
