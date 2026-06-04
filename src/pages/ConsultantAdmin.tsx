import { Link } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import ConsultantDashboard from '@/components/ConsultantDashboard';

const ConsultantAdmin = () => (
  <div className="min-h-screen bg-background">
    <DashboardHeader />
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">ChekaMeds Virtual Care</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Consultant Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review consultation requests and create secure video consultation links.</p>
          </div>
          <Link to="/dashboard" className="inline-flex items-center justify-center border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
            Back to main dashboard
          </Link>
        </div>
      </div>

      <ConsultantDashboard />
    </main>
  </div>
);

export default ConsultantAdmin;
