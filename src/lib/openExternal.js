// Opens a URL outside the app.
// - Native schemes (geo:, tel:, mailto:, sms:) are passed straight to the
//   system, which Android reliably routes to the matching app (geo: → Google
//   Maps). These are NOT wrapped in intent: — the Base44 Android WebView
//   blocks intent: URIs, but forwards standard schemes.
// - http(s) inside a Cordova-style native shell: window.open(url, "_system").
// - http(s) everywhere else (browser tab, installed PWA): a target="_blank"
//   anchor, so the app itself stays loaded underneath.
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

  if (isAndroid && isCordova) {
    // Native shell (e.g. Cordova InAppBrowser) opens the system browser.
    window.open(url, "_system");
    return;
  }

  // Browser tab or installed PWA: a new tab. Navigating the app's own window
  // away would reload the whole app on the way back (a visible flash).
  clickLink(url, "_blank");
}