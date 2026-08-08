import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./landing-overrides.css";

const rootEl = document.getElementById("root")!;

// ── NUCLEAR CACHE CLEAR ──
// Unregister ALL old service workers
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
  // Register our reset SW to clear everything
  navigator.serviceWorker.register("/sw-reset.js", { scope: "/" }).catch(() => {});
}

// Clear all caches
if ("caches" in window) {
  caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
}

// Clear any stale localStorage scanner queue conflicts
try {
  const staleKeys = Object.keys(localStorage).filter(k => k.includes("workbox") || k.includes("sw-"));
  staleKeys.forEach(k => localStorage.removeItem(k));
} catch (_) {}

createRoot(rootEl).render(<App />);
