/**
 * Guarded service-worker registration.
 *
 * The worker only ever registers in the real published app — never in the
 * Lovable editor preview, an iframe, or development — and `?sw=off` removes it.
 */

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterAppWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes("/sw.js"))
      .map((r) => r.unregister()),
  );
}

export async function registerServiceWorker() {
  if (isRefusedContext()) {
    await unregisterAppWorkers();
    return;
  }
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}
