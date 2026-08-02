import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./landing-overrides.css";

// Fix blank screen: clear stale service worker cache on version mismatch
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    // If SW exists but page is blank, force update
    if (registrations.length > 0) {
      registrations.forEach((sw) => sw.update());
    }
  });

  // Listen for SW controlling the page — reload to get fresh content
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (document.getElementById('root')?.children.length === 0) {
      window.location.reload();
    }
  });
}

const rootEl = document.getElementById("root")!;

// Safety net: if root is still empty after 5 seconds, force reload
setTimeout(() => {
  if (rootEl.children.length === 0) {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      }).then(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }
}, 5000);

createRoot(rootEl).render(<App />);
