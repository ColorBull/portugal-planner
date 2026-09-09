import { openExternal } from "@/lib/openExternal";

// On Android, open the location in the Google Maps app via the geo: scheme,
// which the WebView reliably forwards to the system (unlike intent: URIs).
// On iOS/desktop, open the normal Google Maps web link (Safari → Maps).
export function openMapUrl(rawUrl) {
  const isAndroid = /Android/i.test(navigator.userAgent || "");
  if (isAndroid) {
    try {
      const u = new URL(rawUrl);
      const q = u.searchParams.get("query") || u.searchParams.get("q");
      if (q) {
        openExternal(`geo:0,0?q=${encodeURIComponent(q)}`);
        return;
      }
    } catch (e) {
      // fall through
    }
  }
  openExternal(rawUrl);
}