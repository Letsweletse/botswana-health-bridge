import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, Clock, Moon, ShieldCheck, Sun, Wifi } from 'lucide-react';
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from 'react';
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from 'react-router-dom';
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from '@/hooks/useAuth';

const DashboardHeader = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const { profile, isAdmin } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const greeting = currentTime.getHours() < 12
    ? 'Dumela'
    : currentTime.getHours() < 17
    ? 'Dumela'
    : 'Lotsha';

  const formattedDate = currentTime.toLocaleDateString('en-BW', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-BW', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <header className="bg-card/95 border-b border-border sticky top-0 z-30 backdrop-blur-sm">
      <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="md:hidden">
          <p className="text-sm font-display font-bold text-foreground">ChekaMeds</p>
        </div>
        <div className="hidden md:block">
          <p className="text-sm text-foreground font-medium">
            {greeting}, <span className="font-semibold">{profile?.name || 'Operator'}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate} · {profile?.clinic_name || '—'}</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning hover:bg-warning/15 transition-colors"
              title="Facility approvals"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Approvals</span>
            </Link>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono font-medium">{formattedTime}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-success/25 bg-success/8 px-3 py-1">
            <Wifi className="h-3 w-3 text-success" />
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold text-success hidden sm:block">Live</span>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
            title="Toggle theme"
          >
            {darkMode
              ? <Sun className="h-4 w-4 text-[hsl(var(--gov-gold))]" />
              : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>

          <button className="relative p-2 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border" title="Notifications">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-critical border-2 border-card" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
