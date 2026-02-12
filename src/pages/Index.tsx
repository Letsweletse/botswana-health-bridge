import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar, { type TabId } from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import ClinicMap from '@/components/ClinicMap';
import InventoryTable from '@/components/InventoryTable';
import StockChart from '@/components/StockChart';
import AlertsFeed from '@/components/AlertsFeed';
import WhatsAppPanel from '@/components/WhatsAppPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Package, BarChart3, Settings as SettingsIcon, Wrench } from 'lucide-react';

const tabTitles: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: 'National Medicine Stock Dashboard', subtitle: 'Tracking shelf-level medicine availability across Gaborone District health facilities.' },
  map: { title: 'Clinic Status Map', subtitle: 'Geographic view of all monitored health facilities and their current stock status.' },
  inventory: { title: 'Medicine Inventory', subtitle: 'Full inventory list across all clinics — search, filter, and track stock levels.' },
  analytics: { title: 'Stock Analytics', subtitle: 'Weekly trends, alert history, and depletion patterns across the district.' },
  whatsapp: { title: 'WhatsApp Integration', subtitle: 'Test the medicine stock checker bot — same logic health workers use via WhatsApp.' },
  settings: { title: 'System Settings', subtitle: 'Configure IoT connections, notification thresholds, and user preferences.' },
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <DashboardHeader />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-xl font-display font-bold text-foreground">
              {tabTitles[activeTab].title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tabTitles[activeTab].subtitle}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <StatsCards />
                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <StockChart />
                    </div>
                    <AlertsFeed />
                  </div>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <ClinicMap />
                    <WhatsAppPanel />
                  </div>
                </div>
              )}

              {activeTab === 'map' && (
                <div className="space-y-4">
                  <div className="h-[600px]">
                    <ClinicMap />
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  <InventoryTable />
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <StatsCards />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <StockChart />
                    <AlertsFeed />
                  </div>
                </div>
              )}

              {activeTab === 'whatsapp' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <WhatsAppPanel />
                  <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-display font-semibold text-foreground">How It Works</h3>
                    <div className="space-y-3 text-xs text-muted-foreground">
                      <p>Health workers can text the ChekaMeds WhatsApp number to instantly check medicine availability at any clinic.</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-primary font-bold">1.</span>
                          <p>Send <strong>"hi"</strong> to get started with the bot</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary font-bold">2.</span>
                          <p>Type a <strong>clinic name</strong> (e.g. "Princess Marina") to see all medicines at that facility</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary font-bold">3.</span>
                          <p>Type a <strong>medicine name</strong> (e.g. "Metformin") to check availability across clinics</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary font-bold">4.</span>
                          <p>Send <strong>"critical"</strong> to see all urgent shortages immediately</p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
                        <p className="text-success font-medium text-[11px]">✅ Webhook URL for UltraMsg configuration:</p>
                        <code className="text-[10px] text-foreground mt-1 block break-all">
                          {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-display font-semibold text-foreground">IoT Configuration</h3>
                    </div>
                    <div className="space-y-3 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span>ESP32-S3 Devices Connected</span>
                        <span className="font-mono font-bold text-foreground">8</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span>Data Push Interval</span>
                        <span className="font-mono font-bold text-foreground">5 min</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span>Critical Threshold</span>
                        <span className="font-mono font-bold text-critical">20 units</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span>WhatsApp Webhook</span>
                        <span className="text-success font-medium">Active ✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-display font-semibold text-foreground">Notifications</h3>
                    </div>
                    <div className="space-y-3 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span>Email Alerts</span>
                        <span className="text-success font-medium">Enabled</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span>WhatsApp Alerts</span>
                        <span className="text-success font-medium">Enabled</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span>Alert Frequency</span>
                        <span className="font-mono font-bold text-foreground">Real-time</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span>Escalation After</span>
                        <span className="font-mono font-bold text-foreground">30 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <footer className="text-center text-[11px] text-muted-foreground py-4 border-t border-border">
            ChekaMeds Consultation © 2026 · Ministry of Health & Wellness, Republic of Botswana · Data updated in real-time via IoT sensors
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
