import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
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

const PWAInstallBanner = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-dismissed') === 'true');

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!dismissed) setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa-dismissed', 'true');
  };

  if (!show) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#0f172a', padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{
        width: 44, height: 44, background: '#10b981', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
      }}>
        <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Add ChekaMeds to your phone</div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Find medicine instantly — works like a native app</div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: '#10b981', color: 'white', border: 'none', borderRadius: 10,
          padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
          flexShrink: 0, boxShadow: '0 2px 12px rgba(16,185,129,0.4)',
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, flexShrink: 0 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </motion.div>
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
        <AnimatePresence>
          <PWAInstallBanner />
        </AnimatePresence>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
