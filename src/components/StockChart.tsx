import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
  { day: 'Mon', stocked: 6, warning: 1, critical: 1 },
  { day: 'Tue', stocked: 5, warning: 2, critical: 1 },
  { day: 'Wed', stocked: 5, warning: 1, critical: 2 },
  { day: 'Thu', stocked: 4, warning: 2, critical: 2 },
  { day: 'Fri', stocked: 5, warning: 2, critical: 1 },
  { day: 'Sat', stocked: 6, warning: 1, critical: 1 },
  { day: 'Sun', stocked: 4, warning: 2, critical: 2 },
];

const StockChart = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-display font-semibold text-foreground">Weekly Stock Trend</h2>
        <p className="text-xs text-muted-foreground">Clinic status distribution over the past 7 days</p>
      </div>
      <div className="p-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradStocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(155, 72%, 37%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(155, 72%, 37%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradWarning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" strokeOpacity={0.5} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 50%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 50%)" />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid hsl(214, 20%, 90%)',
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Area type="monotone" dataKey="stocked" stroke="hsl(155, 72%, 37%)" fill="url(#gradStocked)" strokeWidth={2} />
            <Area type="monotone" dataKey="warning" stroke="hsl(38, 92%, 50%)" fill="url(#gradWarning)" strokeWidth={2} />
            <Area type="monotone" dataKey="critical" stroke="hsl(0, 72%, 51%)" fill="url(#gradCritical)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-3 flex items-center gap-4">
        {[
          { label: 'Stocked', color: 'bg-success' },
          { label: 'Warning', color: 'bg-warning' },
          { label: 'Critical', color: 'bg-critical' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default StockChart;
