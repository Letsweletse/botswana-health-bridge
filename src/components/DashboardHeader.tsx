import logo from '@/assets/ChekaMeds_Logo.png';
import { Bell, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

const DashboardHeader = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = currentTime.getHours() < 12 ? 'Good morning' : currentTime.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = currentTime.toLocaleDateString('en-BW', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const formattedTime = currentTime.toLocaleTimeString('en-BW', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logo} alt="ChekaMeds Consultation" className="h-12 object-contain" />
          <div className="hidden md:block h-10 w-px bg-border" />
          <div className="hidden md:block">
            <p className="text-sm text-foreground font-medium">{greeting}, Operator</p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formattedTime}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/5 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success">System Online</span>
          </div>
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" title="Notifications">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-critical" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
