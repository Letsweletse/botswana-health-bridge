import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { inventoryData } from '@/data/mockClinicData';

const AlertsFeed = () => {
  const criticalItems = inventoryData
    .filter(i => i.quantity < 20)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  const alerts = criticalItems.map(item => ({
    id: item.id,
    clinic: item.clinic_name,
    med: item.med_name,
    qty: item.quantity,
    severity: item.quantity < 10 ? 'critical' : 'warning',
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-display font-semibold text-foreground">Live Alerts</h2>
          <p className="text-xs text-muted-foreground">{alerts.length} items need attention</p>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Auto-refreshing
        </span>
      </div>
      <div className="divide-y divide-border max-h-[260px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All stock levels healthy</p>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className={`px-4 py-3 flex items-start gap-3 ${
                alert.severity === 'critical' ? 'bg-critical/[0.03]' : ''
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${
                alert.severity === 'critical' ? 'bg-critical/10' : 'bg-warning/10'
              }`}>
                <AlertTriangle className={`h-3.5 w-3.5 ${
                  alert.severity === 'critical' ? 'text-critical' : 'text-warning'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {alert.med} — <span className="font-bold">{alert.qty} units left</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{alert.clinic}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default AlertsFeed;
