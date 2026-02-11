import { Building2, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { clinics, inventoryData } from '@/data/mockClinicData';

const StatsCards = () => {
  const totalClinics = clinics.length;
  const criticalClinics = clinics.filter(c => c.status === 'critical').length;
  const totalMeds = inventoryData.length;
  const depletingFast = inventoryData.filter(i => i.trend === 'Depleting Fast').length;

  const stats = [
    {
      label: 'Clinics Monitored',
      value: totalClinics,
      note: `${clinics.filter(c => c.status === 'stocked').length} fully stocked`,
      icon: Building2,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Critical Shortages',
      value: criticalClinics,
      note: criticalClinics > 0 ? 'Needs attention today' : 'All clear',
      icon: AlertTriangle,
      color: 'text-critical bg-critical/10',
    },
    {
      label: 'Meds Being Tracked',
      value: totalMeds,
      note: 'Across all facilities',
      icon: Package,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Running Low',
      value: depletingFast,
      note: depletingFast > 0 ? 'Based on recent usage' : 'Stable supply',
      icon: TrendingDown,
      color: 'text-warning bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
          <p className="text-xs font-medium text-foreground mt-0.5">{stat.label}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{stat.note}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
