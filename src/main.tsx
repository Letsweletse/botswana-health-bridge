import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./landing-overrides.css";

const rootEl = document.getElementById("root")!;

// One-time cleanup of the retired emergency worker (sw-reset.js). Does NOT touch the
// real PWA worker or caches, and never reloads the page.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      const url = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
      if (url.endsWith("/sw-reset.js")) reg.unregister();
    });
  }).catch(() => {});
}

// Apply saved theme before render — prevents flash
const _t = localStorage.getItem("chekameds-theme") || "system";
if (_t === "dark" || (_t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.classList.add("dark");
}

createRoot(rootEl).render(<App />);
