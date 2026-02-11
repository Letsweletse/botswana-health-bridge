import { Building2, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { clinics, inventoryData } from '@/data/mockClinicData';

const StatsCards = () => {
  const totalClinics = clinics.length;
  const criticalClinics = clinics.filter(c => c.status === 'critical').length;
  const totalMeds = inventoryData.length;
  const depletingFast = inventoryData.filter(i => i.trend === 'Depleting Fast').length;

  const stats = [
    {
      label: 'Total Clinics',
      value: totalClinics,
      icon: Building2,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Critical Shortage',
      value: criticalClinics,
      icon: AlertTriangle,
      color: 'text-critical bg-critical/10',
    },
    {
      label: 'Medications Tracked',
      value: totalMeds,
      icon: Package,
      color: 'text-accent bg-accent/10',
    },
    {
      label: 'Depleting Fast',
      value: depletingFast,
      icon: TrendingDown,
      color: 'text-warning bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 shadow-sm"
        >
          <div className={`p-2.5 rounded-lg ${stat.color}`}>
            <stat.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
