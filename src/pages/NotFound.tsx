import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

/* A page that exists on the server but not in a cached copy of the app shows up
   here first. Ask the service worker for the latest build and reload once, so
   returning visitors are not stuck on an old version of the site. */
const NotFound = () => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const key = `cm-404-reload:${location.pathname}`;
    let done = false;
    const finish = () => { if (!done) { done = true; setChecking(false); } };
    try {
      if (!sessionStorage.getItem(key) && "serviceWorker" in navigator) {
        sessionStorage.setItem(key, "1");
        // Drop the old saved copy completely (service worker + its caches), then load fresh from the server.
        (async () => {
          const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
          if (!regs.length) return finish();
          await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
          if ("caches" in window) {
            const keys = await caches.keys().catch(() => [] as string[]);
            await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
          }
          window.location.reload();
        })().catch(finish);
        setTimeout(finish, 6000);
        return;
      }
    } catch { /* storage blocked */ }
    finish();
  }, [location.pathname]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center" style={{ background: "#080a19", color: "rgba(255,255,255,.7)" }}>Loading the latest version…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#080a19", color: "#fff" }}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl" style={{ color: "rgba(255,255,255,.65)" }}>Page not found</p>
        <a href="/" className="underline">Return to Home</a>
      </div>
    </div>
  );
};

export default NotFound;
