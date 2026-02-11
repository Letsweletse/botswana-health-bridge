import DashboardHeader from '@/components/DashboardHeader';
import StatsCards from '@/components/StatsCards';
import ClinicMap from '@/components/ClinicMap';
import InventoryTable from '@/components/InventoryTable';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-lg font-display font-bold text-foreground">
            National Medicine Stock Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tracking shelf-level medicine availability across Gaborone District health facilities.
          </p>
        </div>
        <StatsCards />
        <div className="grid lg:grid-cols-2 gap-6">
          <ClinicMap />
          <InventoryTable />
        </div>
        <footer className="text-center text-[11px] text-muted-foreground py-4 border-t border-border">
          ChekaMeds Consultation © 2026 · Ministry of Health & Wellness, Republic of Botswana · Data updated in real-time via IoT sensors
        </footer>
      </main>
    </div>
  );
};

export default Index;
