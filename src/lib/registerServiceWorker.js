// Register public/sw.js (production only — Vite's dev server would fight it)
// and, once it is running, have it store the whole current build.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      await navigator.serviceWorker.ready;
      (registration.active || navigator.serviceWorker.controller)?.postMessage("precache");
    } catch (e) {
      console.warn("Service worker registration failed", e);
    }
  });
}
