import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Package, BarChart3, MessageCircle, Settings, LogOut,
  ChevronLeft, ChevronRight, User, Stethoscope
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/ChekaMeds_Logo.png';

export type TabId = 'dashboard' | 'map' | 'inventory' | 'analytics' | 'whatsapp' | 'settings';

const navItems: { label: string; icon: typeof LayoutDashboard; id: TabId }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { label: 'Map View', icon: Map, id: 'map' },
  { label: 'My Inventory', icon: Package, id: 'inventory' },
  { label: 'Analytics', icon: BarChart3, id: 'analytics' },
  { label: 'WhatsApp Bot', icon: MessageCircle, id: 'whatsapp' },
  { label: 'Settings', icon: Settings, id: 'settings' },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 overflow-hidden relative"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at top left, hsl(210 85% 30% / 0.15) 0%, transparent 60%),
          radial-gradient(ellipse at bottom right, hsl(38 85% 52% / 0.08) 0%, transparent 60%)
        `
      }}
    >
      {/* Gold accent top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(38,85%,52%)] to-transparent opacity-60" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src={logo} alt="ChekaMeds" className="h-8 w-8 object-contain flex-shrink-0 rounded-lg" />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-display font-bold whitespace-nowrap text-sidebar-foreground">ChekaMeds</p>
              <p className="text-[9px] text-[hsl(38,85%,52%)] whitespace-nowrap font-medium tracking-widest uppercase">MoHW · Botswana</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              activeTab === item.id
                ? 'bg-[hsl(38,85%,52%)]/15 text-[hsl(38,85%,62%)] font-semibold border border-[hsl(38,85%,52%)]/20'
                : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
            }`}
          >
            <item.icon className={`h-4 w-4 flex-shrink-0 ${activeTab === item.id ? 'text-[hsl(38,85%,62%)]' : ''}`} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {/* Active indicator dot */}
            {activeTab === item.id && (
              <motion.div
                layoutId="active-dot"
                className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(38,85%,52%)] flex-shrink-0"
              />
            )}
          </button>
        ))}
      </nav>

      {/* Clinic badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-3 p-3 rounded-xl bg-[hsl(210,85%,38%)]/10 border border-[hsl(210,85%,38%)]/15"
          >
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">Active Facility</p>
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile?.clinic_name || 'Loading...'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-3 px-1">
          <div className="h-8 w-8 rounded-full bg-[hsl(38,85%,52%)]/15 border border-[hsl(38,85%,52%)]/25 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-[hsl(38,85%,62%)]" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden flex-1">
                <p className="text-xs font-semibold truncate text-sidebar-foreground">{profile?.full_name || 'Operator'}</p>
                <p className="text-[10px] text-sidebar-foreground/40 truncate">Health Staff</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-sidebar-foreground/40 hover:text-critical hover:bg-critical/8 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-16 -right-3 h-6 w-6 bg-sidebar-accent border border-sidebar-border rounded-full flex items-center justify-center text-sidebar-foreground hover:bg-[hsl(38,85%,52%)] hover:text-[hsl(218,35%,9%)] transition-colors z-50 shadow-lg"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
