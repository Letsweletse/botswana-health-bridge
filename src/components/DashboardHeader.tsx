import logo from '@/assets/ChekaMeds_Logo.png';
import { Activity, Bell } from 'lucide-react';

const DashboardHeader = () => {
  return (
    <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src={logo} alt="ChekaMeds Logo" className="h-10 object-contain" />
        <div className="hidden sm:block h-8 w-px bg-border" />
        <div className="hidden sm:block">
          <h1 className="text-sm font-display font-semibold text-foreground leading-tight">
            National Medicine Stock Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Gaborone District • Republic of Botswana
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5">
          <Activity className="h-3.5 w-3.5 text-success animate-pulse" />
          <span className="text-xs font-medium text-success">Live</span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-critical" />
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
