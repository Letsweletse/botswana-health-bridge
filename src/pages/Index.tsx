import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar, { type TabId } from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import ClinicMap from '@/components/ClinicMap';
import InventoryTable from '@/components/InventoryTable';
import StockChart from '@/components/StockChart';
import AlertsFeed from '@/components/AlertsFeed';
import WhatsAppPanel from '@/components/WhatsAppPanel';
import ClinicOnboarding from '@/components/ClinicOnboarding';
import PrescriptionMatcher from '@/components/PrescriptionMatcher';
import StockForecasting from '@/components/StockForecasting';
import QRVerification from '@/components/QRVerification';
import SMSUSSDPanel from '@/components/SMSUSSDPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Settings as SettingsIcon } from 'lucide-react';

const tabTitles: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: 'National Medicine Stock Dashboard', subtitle: 'Real-time shelf-level visibility across Gaborone District health facilities.' },
  map: { title: 'Clinic Status Map', subtitle: 'Geographic view of all monitored health facilities and their live stock status.' },
  inventory: { title: 'My Clinic Inventory', subtitle: 'Manage your facility\'s medicine stock — add, update quantities, or remove records.' },
  analytics: { title: 'Stock Analytics', subtitle: 'Weekly trends, depletion patterns, and alert history across the district.' },
  whatsapp: { title: 'WhatsApp Bot & Clinic Guide', subtitle: 'How patients and health workers access medicine data — and how to join ChekaMeds.' },
  prescriptions: { title: 'Prescription Matching', subtitle: 'Find the nearest clinic that has ALL medicines on a patient\'s prescription list.' },
  forecasting: { title: 'Predictive Stock Forecasting', subtitle: 'AI-powered depletion analysis with automatic supplier alerts before shortages hit.' },
  qr_codes: { title: 'QR Code Verification', subtitle: 'Generate and manage QR codes for medicine authenticity verification.' },
  sms_ussd: { title: 'SMS/USSD & Integrations', subtitle: 'Feature phone access via *123#, SMS fallback, and DHIS2 government API integration.' },
  settings: { title: 'System Settings', subtitle: 'IoT device configuration, notification thresholds, and system preferences.' },
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <StatsCards />
                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2"><StockChart /></div>
                    <AlertsFeed />
                  </div>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <ClinicMap />
                    <WhatsAppPanel />
                  </div>
                </div>
              )}

              {activeTab === 'map' && (
                <div className="h-[620px]"><ClinicMap /></div>
              )}

              {activeTab === 'inventory' && (
                <InventoryTable />
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
                <div className="space-y-6">
                  <ClinicOnboarding />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <WhatsAppPanel />
                    <div className="bg-card rounded-2xl border border-border p-6 space-y-4 card-premium">
                      <h3 className="text-sm font-display font-semibold text-foreground">Bot Commands Reference</h3>
                      <div className="space-y-3 text-xs text-muted-foreground">
                        {[
                          { cmd: '"hi"', desc: 'Start conversation & get help menu' },
                          { cmd: '"Princess Marina"', desc: 'See all medicines at a specific clinic' },
                          { cmd: '"Metformin"', desc: 'Find this medicine across all Gaborone clinics' },
                          { cmd: '"critical"', desc: 'View all urgent shortages requiring immediate attention' },
                          { cmd: '"status"', desc: 'Get a full district-wide stock summary' },
                          { cmd: '"prescription: Med1, Med2"', desc: 'Find clinic with ALL prescription medicines' },
                          { cmd: '"setswana"', desc: 'Switch bot language to Setswana' },
                        ].map(({ cmd, desc }) => (
                          <div key={cmd} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 border border-border">
                            <code className="text-primary font-mono font-bold whitespace-nowrap">{cmd}</code>
                            <span>{desc}</span>
                          </div>
                        ))}
                        <div className="mt-4 p-3 rounded-xl bg-success/5 border border-success/20">
                          <p className="text-success font-semibold text-[11px] mb-1">Webhook URL (for UltraMsg dashboard)</p>
                          <code className="text-[10px] text-foreground block break-all">
                            {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'prescriptions' && <PrescriptionMatcher />}
              {activeTab === 'forecasting' && <StockForecasting />}
              {activeTab === 'qr_codes' && <QRVerification />}
              {activeTab === 'sms_ussd' && <SMSUSSDPanel />}

              {activeTab === 'settings' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-4 card-premium">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-display font-semibold text-foreground">IoT Configuration</h3>
                    </div>
                    <div className="space-y-0 divide-y divide-border text-xs">
                      {[
                        { label: 'ESP32-S3 Devices Connected', value: '8', color: 'text-foreground' },
                        { label: 'Data Push Interval', value: '5 min', color: 'text-foreground' },
                        { label: 'Critical Threshold', value: '20 units', color: 'text-critical' },
                        { label: 'WhatsApp Webhook', value: 'Active ✓', color: 'text-success' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between py-2.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className={`font-mono font-bold ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-4 card-premium">
                    <div className="flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-display font-semibold text-foreground">Notifications</h3>
                    </div>
                    <div className="space-y-0 divide-y divide-border text-xs">
                      {[
                        { label: 'Email Alerts', value: 'Enabled', color: 'text-success' },
                        { label: 'WhatsApp Alerts', value: 'Enabled', color: 'text-success' },
                        { label: 'Alert Frequency', value: 'Real-time', color: 'text-foreground' },
                        { label: 'Escalation After', value: '30 min', color: 'text-foreground' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between py-2.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className={`font-mono font-bold ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

           <footer className="text-center text-[11px] text-muted-foreground py-4 border-t border-border">
             <span className="font-bold text-foreground/60">ChekaMeds</span> · Powered by IBLIM ENTERPRISE · Data updated in real-time via IoT sensors · © 2026
           </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
