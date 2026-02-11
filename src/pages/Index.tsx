import DashboardHeader from '@/components/DashboardHeader';
import StatsCards from '@/components/StatsCards';
import ClinicMap from '@/components/ClinicMap';
import InventoryTable from '@/components/InventoryTable';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <StatsCards />
        <div className="grid lg:grid-cols-2 gap-6">
          <ClinicMap />
          <InventoryTable />
        </div>
      </main>
    </div>
  );
};

export default Index;
