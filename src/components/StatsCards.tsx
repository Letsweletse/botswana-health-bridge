import { Building2, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { useInventoryStats } from '@/hooks/useInventory';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const useAnimatedCount = (target: number, duration = 1200) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

const StatsCards = () => {
  const { totalClinics, criticalClinics, totalMeds, depletingFast, stockedPct } = useInventoryStats();

  const stats = [
    {
      label: 'Clinics Monitored',
      value: totalClinics,
      note: `${stockedPct}% fully stocked`,
      icon: Building2,
      gradient: 'from-primary/10 to-primary/5',
      iconBg: 'bg-primary/15 text-primary',
      barColor: 'bg-primary',
      barPct: stockedPct,
    },
    {
      label: 'Critical Shortages',
      value: criticalClinics,
      note: criticalClinics > 0 ? 'Needs attention today' : 'All clear — nice',
      icon: AlertTriangle,
      gradient: 'from-critical/10 to-critical/5',
      iconBg: 'bg-critical/15 text-critical',
      barColor: 'bg-critical',
      barPct: totalClinics > 0 ? Math.round((criticalClinics / totalClinics) * 100) : 0,
    },
    {
      label: 'Meds Tracked',
      value: totalMeds,
      note: 'Across all facilities',
      icon: Package,
      gradient: 'from-accent/10 to-accent/5',
      iconBg: 'bg-accent/15 text-accent',
      barColor: 'bg-accent',
      barPct: 100,
    },
    {
      label: 'Running Low',
      value: depletingFast,
      note: depletingFast > 0 ? 'Based on sensor data' : 'Supply stable',
      icon: TrendingDown,
      gradient: 'from-warning/10 to-warning/5',
      iconBg: 'bg-warning/15 text-warning',
      barColor: 'bg-warning',
      barPct: totalMeds > 0 ? Math.round((depletingFast / totalMeds) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, i) => {
        const AnimatedValue = () => {
          const val = useAnimatedCount(stat.value);
          return <>{val}</>;
        };

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`bg-gradient-to-br ${stat.gradient} rounded-xl border border-border p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-foreground tabular-nums">
              <AnimatedValue />
            </p>
            <p className="text-xs font-medium text-foreground mt-1">{stat.label}</p>
            <div className="mt-3 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${stat.barColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.barPct}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{stat.note}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatsCards;
