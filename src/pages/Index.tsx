import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import ClinicMap from '@/components/ClinicMap';
import InventoryTable from '@/components/InventoryTable';
import StockChart from '@/components/StockChart';
import AlertsFeed from '@/components/AlertsFeed';
import { motion } from 'framer-motion';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <DashboardHeader />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-xl font-display font-bold text-foreground">
              National Medicine Stock Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tracking shelf-level medicine availability across Gaborone District health facilities.
            </p>
          </motion.div>

          <StatsCards />

          <div className="grid lg:grid-cols-2 gap-6">
            <StockChart />
            <AlertsFeed />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ClinicMap />
            <InventoryTable />
          </div>

          <footer className="text-center text-[11px] text-muted-foreground py-4 border-t border-border">
            ChekaMeds Consultation © 2026 · Ministry of Health & Wellness, Republic of Botswana · Data updated in real-time via IoT sensors
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
