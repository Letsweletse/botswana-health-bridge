import { useState } from 'react';
import { inventoryData } from '@/data/mockClinicData';
import { TrendingDown, Minus, ArrowUpRight, Search } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', ...new Set(inventoryData.map(i => i.category))];

  const filtered = inventoryData.filter(item => {
    const matchesSearch = item.clinic_name.toLowerCase().includes(search.toLowerCase()) ||
      item.med_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-BW', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-display font-semibold text-foreground">Medicine Inventory</h2>
            <p className="text-xs text-muted-foreground">{filtered.length} items shown</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clinic or medicine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted/80 backdrop-blur-sm">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Clinic</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Medicine</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Stock</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No results found. Try a different search.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
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
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {formatTime(item.updated_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
