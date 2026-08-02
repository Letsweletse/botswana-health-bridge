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
  const dismissed = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("pwa-dismissed")) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => { if (!dismissed.current) setShow(true); }, 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone;
    if (isIOS && !isStandalone && !sessionStorage.getItem("pwa-dismissed")) {
      setTimeout(() => { if (!dismissed.current) setShow(true); }, 3000);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    dismissed.current = true;
    setShow(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  if (!show) return null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "#0d1117", borderTop: "1px solid #1e2d3d",
      padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 -4px 24px rgba(0,0,0,.6)",
    }}>
      <div style={{ width: 40, height: 40, background: "#10b981", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18, fontWeight: 800, color: "white" }}>C</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Install ChekaMeds App</div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>
          {isIOS ? "Tap Share → Add to Home Screen" : "Find medicine faster — works offline too"}
        </div>
      </div>
      {!isIOS && deferredPrompt && (
        <button onClick={handleInstall} style={{ background: "#10b981", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          Install
        </button>
      )}
      <button onClick={handleDismiss} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: "4px 8px", flexShrink: 0 }}>✕</button>
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
