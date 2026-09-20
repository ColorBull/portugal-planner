import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, googleProvider } from "@/api/firebase";
import { ALLOWED_EMAILS } from "@/config";
import {
  setDriveToken,
  registerReauthorize,
  tokenGrantsDrive,
  hasDriveAccess,
} from "@/api/drive";

const AuthContext = createContext(null);

const isAllowedEmail = (email) =>
  !!email && ALLOWED_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());

// Mobile browsers routinely refuse to open the Google popup. Fall back to a
// full-page redirect, which they always allow.
const POPUP_UNAVAILABLE = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
]);

const isDismissal = (code) =>
  code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Pop the Google dialog and capture a fresh Drive access token. Google shows
  // the Drive permission as an optional checkbox; if it's left unticked the
  // token has no drive.file scope, so re-prompt once before giving up.
  const authorize = async (allowRetry = true) => {
    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (!POPUP_UNAVAILABLE.has(e?.code)) throw e;
      // Navigates away; the token is picked up by getRedirectResult on return.
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    setDriveToken(token);
    if (token && allowRetry && !(await tokenGrantsDrive(token))) {
      setError(
        "Похоже, при входе не был отмечен доступ к Google Drive. " +
          "Отметьте галочку доступа к файлам Drive в следующем окне."
      );
      return authorize(false);
    }
    return token;
  };

  // Coming back from the redirect fallback above.
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (!result) return;
        const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
        if (token) setDriveToken(token);
      })
      .catch(() => {});
  }, []);

  // drive.js calls this when its token is missing or expired.
  useEffect(() => {
    registerReauthorize(async () => {
      try {
        return await authorize();
      } catch {
        return null;
      }
    });
  }, []);

  // Call this from a click handler *before* opening a file picker: the Google
  // dialog only opens while the browser still sees a live user gesture.
  const ensureDriveAccess = async () => {
    if (hasDriveAccess()) return true;
    setError(null);
    try {
      return !!(await authorize());
    } catch (e) {
      if (!isDismissal(e?.code)) {
        setError("Не удалось подключить Google Drive. Попробуйте ещё раз.");
      }
      return false;
    }
  };

  const signIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await authorize();
    } catch (e) {
      if (!isDismissal(e?.code)) {
        setError(
          e?.code === "auth/unauthorized-domain"
            ? "Этот домен не добавлен в список разрешённых в Firebase."
            : "Не удалось войти. Попробуйте ещё раз."
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    setDriveToken(null);
    await fbSignOut(auth);
  };

  const value = {
    user,
    loading,
    signingIn,
    error,
    isAllowed: isAllowedEmail(user?.email),
    signIn,
    signOut,
    ensureDriveAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
