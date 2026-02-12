import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, Package, BarChart3, MessageCircle, Settings, LogOut,
  ChevronLeft, ChevronRight, User
} from 'lucide-react';
import logo from '@/assets/ChekaMeds_Logo.png';

export type TabId = 'dashboard' | 'map' | 'inventory' | 'analytics' | 'whatsapp' | 'settings';

const navItems: { label: string; icon: typeof LayoutDashboard; id: TabId }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { label: 'Map View', icon: Map, id: 'map' },
  { label: 'Inventory', icon: Package, id: 'inventory' },
  { label: 'Analytics', icon: BarChart3, id: 'analytics' },
  { label: 'WhatsApp', icon: MessageCircle, id: 'whatsapp' },
  { label: 'Settings', icon: Settings, id: 'settings' },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('chekameds_user');
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 overflow-hidden relative"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <img src={logo} alt="ChekaMeds" className="h-8 w-8 object-contain flex-shrink-0 rounded" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-display font-bold whitespace-nowrap overflow-hidden"
            >
              ChekaMeds
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === item.id
                ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
          >
            <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
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
          </button>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-3 px-1">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-sidebar-primary" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">
                <p className="text-xs font-medium truncate">Health Operator</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">MoHW · Gaborone</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:text-critical hover:bg-critical/10 transition-colors"
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
        className="absolute top-16 -right-3 h-6 w-6 bg-sidebar-accent border border-sidebar-border rounded-full flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors z-50"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
