import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
