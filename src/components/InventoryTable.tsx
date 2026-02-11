import { inventoryData } from '@/data/mockClinicData';
import { TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const trendConfig = {
  'Depleting Fast': { icon: TrendingDown, className: 'bg-critical/10 text-critical border-critical/20' },
  'Stable': { icon: Minus, className: 'bg-muted text-muted-foreground border-border' },
  'Restocked': { icon: ArrowUpRight, className: 'bg-success/10 text-success border-success/20' },
};

const categoryColors: Record<string, string> = {
  Chronic: 'bg-primary/10 text-primary border-primary/20',
  Acute: 'bg-warning/10 text-warning border-warning/20',
  Preventive: 'bg-accent/10 text-accent border-accent/20',
  Essential: 'bg-muted text-muted-foreground border-border',
};

const InventoryTable = () => {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-BW', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-display font-semibold text-foreground">Real-Time Inventory</h2>
        <p className="text-xs text-muted-foreground">Live stock levels across all monitored clinics</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Clinic</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Medication</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Qty</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Trend</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.map((item) => {
              const trend = trendConfig[item.trend];
              const TrendIcon = trend.icon;
              const isLow = item.quantity < 20;

              return (
                <tr
                  key={item.id}
                  className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${isLow ? 'bg-critical/[0.03]' : ''}`}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">{item.clinic_name}</td>
                  <td className="px-4 py-2.5 text-foreground">{item.med_name}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[item.category]}`}>
                      {item.category}
                    </Badge>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${isLow ? 'text-critical' : 'text-foreground'}`}>
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${trend.className}`}>
                      <TrendIcon className="h-3 w-3" />
                      {item.trend}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">
                    {formatTime(item.updated_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
