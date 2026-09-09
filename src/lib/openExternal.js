// Opens a URL outside the app.
// - Native schemes (geo:, tel:, mailto:, sms:) are passed straight to the
//   system, which Android reliably routes to the matching app (geo: → Google
//   Maps). These are NOT wrapped in intent: — the Base44 Android WebView
//   blocks intent: URIs, but forwards standard schemes.
// - http(s) on Android: if a Cordova-style native bridge is present, use
//   window.open(url, "_system"); otherwise a same-window anchor click goes
//   via shouldOverrideUrlLoading, which the native shell routes to the
//   system browser (no target="_blank" — that traps it inside the app).
// - http(s) on iOS/other: a target="_blank" anchor opens Safari correctly.
function clickLink(href, target) {
  const a = document.createElement("a");
  a.href = href;
  if (target) a.target = target;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const NATIVE_SCHEME = /^(geo|tel|mailto|sms|maps):/i;

export function openExternal(url) {
  if (!url) return;
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isCordova = typeof window.cordova !== "undefined";

  // Native schemes → let the OS handle directly (no target, so it goes via
  // shouldOverrideUrlLoading which forwards to the system app).
  if (NATIVE_SCHEME.test(url)) {
    clickLink(url, "");
    return;
  }

  if (isAndroid) {
    if (isCordova) {
      // Native shell (e.g. Cordova InAppBrowser) opens the system browser.
      window.open(url, "_system");
      return;
    }
    // Same-window navigation triggers the WebView's shouldOverrideUrlLoading,
    // which the native shell routes to the system browser (Chrome / Samsung
    // Internet). We deliberately avoid target="_blank" — that goes through
    // onCreateWindow, which loads the page inside the app (stuck).
    clickLink(url, "");
    return;
  }

  // iOS / desktop / fallback
  clickLink(url, "_blank");
}