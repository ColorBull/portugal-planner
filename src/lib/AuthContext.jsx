import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/api/firebase";
import { ALLOWED_EMAILS } from "@/config";
import {
  setDriveToken,
  registerReauthorize,
  requestDriveAccess,
  hasDriveAccess,
  driveTokenStale,
  renewSilently,
  backgroundRenewalAllowed,
} from "@/api/drive";
import { canRenewSilently } from "@/api/googleToken";
import { t } from "@/lib/i18n";

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

  // Sign in with Google: identity only. Drive access is a separate request.
  const authorize = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (!POPUP_UNAVAILABLE.has(e?.code)) throw e;
      // Navigates away; the sign-in completes when the page comes back.
      await signInWithRedirect(auth, googleProvider);
    }
  };

  // Coming back from the redirect fallback above (onAuthStateChanged does the rest).
  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
  }, []);

  // Drive access, asked for from a tap (Google's window if it has to be).
  const driveAccessFromTap = async () => {
    const { token, noScope } = await requestDriveAccess(auth.currentUser?.email);
    if (noScope) {
      setError(
        t("Похоже, при входе не был отмечен доступ к Google Drive. ") +
          t("Отметьте галочку доступа к файлам Drive в следующем окне.")
      );
    }
    return token;
  };

  // Keep the Drive token fresh while the app is open, so an upload never has
  // to stop and ask. Renewal is silent; the dialog stays as the fallback.
  useEffect(() => {
    if (!user || !canRenewSilently()) return;

    let stopped = false;
    const refresh = () => {
      // Offline, Google's renewal window could only show an error page.
      if (stopped || !driveTokenStale() || navigator.onLine === false) return;
      // Not where it has already failed once: it would open a Google window.
      if (!backgroundRenewalAllowed()) return;
      renewSilently().catch(() => {});
    };

    refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  // drive.js calls this when its token is missing or expired.
  useEffect(() => {
    registerReauthorize(async () => {
      try {
        return await driveAccessFromTap();
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
    // One request does both: quiet when Google already has the permission and a
    // session to reuse, Google's own window (which waits for the person) when not.
    try {
      return !!(await driveAccessFromTap());
    } catch {
      setError(t("Не удалось подключить Google Drive. Попробуйте ещё раз."));
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
            ? t("Этот домен не добавлен в список разрешённых в Firebase.")
            : t("Не удалось войти. Попробуйте ещё раз.")
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
