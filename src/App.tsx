import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Login from "./pages/Login";

import Search from "./pages/Search";
import Facilities from "./pages/Facilities";
import Consultant from "./pages/Consultant";
import ConsultantAdmin from "./pages/ConsultantAdmin";
import ResetPassword from "./pages/ResetPassword";
import AdminPanel from "./pages/AdminPanel";
import WhatsAppWebhookAdmin from "./pages/WhatsAppWebhookAdmin";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/consultant" element={<Consultant />} />
          <Route path="/dashboard/consultant" element={<ProtectedRoute><ConsultantAdmin /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/whatsapp" element={<WhatsAppWebhookAdmin />} />
          <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
