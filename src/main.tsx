import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./landing-overrides.css";

const rootEl = document.getElementById("root")!;

// BLANK SCREEN FIX: unregister ALL old service workers + clear all caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}
if ('caches' in window) {
  caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
}

// Safety: if still blank after 4s — hard reload
const blankCheck = setTimeout(() => {
  if (!rootEl.firstChild) window.location.reload();
}, 4000);

const root = createRoot(rootEl);
root.render(<App />);
clearTimeout(blankCheck);
