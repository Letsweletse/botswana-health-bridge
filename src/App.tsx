import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Already installed as PWA — hide
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as any).standalone === true) return;
    // Already dismissed permanently THIS session
    if (sessionStorage.getItem("pwa-banner-hidden") === "1") return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const android = /Android/.test(navigator.userAgent);
    setIsIOS(ios);
    setIsAndroid(android);

    // Android — wait for browser install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS or Android without prompt — show manual instructions after 4s
    if (ios) {
      setTimeout(() => setShow(true), 4000);
    }

    // Fallback: if no beforeinstallprompt after 6s on Android, show anyway
    if (android) {
      const fallback = setTimeout(() => setShow(true), 6000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(fallback);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("pwa-banner-hidden", "1");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
      background: "#0d1117", borderTop: "2px solid #10b981",
      padding: "16px 20px 20px", display: "flex", alignItems: "flex-start", gap: 12,
      boxShadow: "0 -8px 32px rgba(0,0,0,.8)",
      paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
    }}>
      <div style={{
        width: 44, height: 44, background: "#10b981", borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: 20, fontWeight: 800, color: "white",
      }}>C</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>
          Install ChekaMeds
        </div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
            Tap <strong style={{ color: "#10b981" }}>Share</strong> (box with arrow) then <strong style={{ color: "#10b981" }}>Add to Home Screen</strong>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
            Find medicine faster · Works offline · No app store needed
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, alignItems: "flex-end" }}>
        {!isIOS && (
          <button onClick={deferredPrompt ? handleInstall : () => { 
            // Manual instructions for browsers that don't fire beforeinstallprompt
            alert("To install:\n1. Tap the 3-dot menu (⋮) in your browser\n2. Tap \'Add to Home screen\'\n3. Tap \'Add\'");
          }} style={{
            background: "#10b981", color: "white", border: "none",
            borderRadius: 8, padding: "10px 20px", fontSize: 13,
            fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            📲 Install App
          </button>
        )}
        <button onClick={handleDismiss} style={{
          background: "transparent", border: "none",
          color: "#475569", cursor: "pointer", fontSize: 11,
          padding: "4px 8px", borderRadius: 6, whiteSpace: "nowrap",
        }}>
          Not now
        </button>
      </div>
    </div>
  );
};
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Search from "./pages/Search";
import Facilities from "./pages/Facilities";
import Consultant from "./pages/Consultant";
import Delivery from "./pages/Delivery";
import DeliveryAdmin from "./pages/DeliveryAdmin";
import ConsultantAdmin from "./pages/ConsultantAdmin";
import ResetPassword from "./pages/ResetPassword";
import AdminPanel from "./pages/AdminPanel";
import CampaignAdmin from "./pages/CampaignAdmin";
import WhatsAppWebhookAdmin from "./pages/WhatsAppWebhookAdmin";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import SiteFooter from "./components/SiteFooter";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
  }, [location.pathname, shouldReduceMotion]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={location.pathname}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/consultant" element={<Consultant />} />
          <Route path="/dashboard/consultant" element={<ProtectedRoute><ConsultantAdmin /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/campaigns" element={<CampaignAdmin />} />
          <Route path="/admin/delivery" element={<ProtectedRoute><DeliveryAdmin /></ProtectedRoute>} />
          <Route path="/admin/whatsapp" element={<WhatsAppWebhookAdmin />} />
          <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
        <SiteFooter />
        <PWAInstallBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
