// ---------------------------------------------------------------------------
// Silent Drive token renewal.
//
// Google access tokens always expire after ~1h and Firebase will not refresh
// them, so the app used to re-open the Google dialog on every upload. Google
// Identity Services can mint a fresh token in a hidden iframe instead — no
// popup, no user gesture — as long as the browser still has a Google session
// and drive.file was granted once.
//
// Needs GOOGLE_OAUTH_CLIENT_ID in config.js; without it the app falls back to
// the dialog exactly as before.
// ---------------------------------------------------------------------------

import { GOOGLE_OAUTH_CLIENT_ID } from "@/config";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const RENEW_TIMEOUT_MS = 10000;
const INTERACTIVE_TIMEOUT_MS = 180000;

export const canRenewSilently = () =>
  !!GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_ID !== "REPLACE_ME";

let scriptPromise = null;

export function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Google Identity Services failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

let tokenClient = null;
let pending = null;

const settle = (value) => {
  const resolve = pending;
  pending = null;
  resolve?.(value);
};

async function ensureClient() {
  if (tokenClient) return tokenClient;
  await loadGis();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: (response) => settle(response?.access_token ? response : null),
    error_callback: () => settle(null),
  });
  return tokenClient;
}

// Asks for a token and waits for the person: Google may show its sign-in and
// consent windows (first time on a device, or no Google session to reuse). Call
// it from a tap. Resolves to the response ({ access_token, expires_in, scope }) or
// null if nothing came of it. `hint` is the account's e-mail, so Google does not
// offer the account chooser.
export async function requestDriveToken(hint) {
  if (!canRenewSilently()) return null;
  try {
    const client = await ensureClient();
    settle(null); // a silent attempt still waiting is superseded
    return await new Promise((resolve) => {
      pending = resolve;
      setTimeout(() => {
        if (pending === resolve) settle(null);
      }, INTERACTIVE_TIMEOUT_MS);
      client.requestAccessToken({ prompt: "", hint: hint || undefined });
    });
  } catch {
    return null;
  }
}

// Resolves to { access_token, expires_in } or null when Google wants to show
// something — the caller then falls back to the interactive dialog.
export async function renewDriveToken() {
  // Renewal opens a Google window; offline it can only show an error page.
  if (!canRenewSilently() || pending || navigator.onLine === false) return null;
  try {
    const client = await ensureClient();
    return await new Promise((resolve) => {
      pending = resolve;
      setTimeout(() => {
        if (pending === resolve) settle(null);
      }, RENEW_TIMEOUT_MS);
      client.requestAccessToken({ prompt: "" });
    });
  } catch {
    return null;
  }
}
