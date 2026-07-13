import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeftRight, BarChart3, Boxes, Building2, FileText, Landmark, PackageCheck, ScanLine, ShieldCheck, ShoppingCart, Truck, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { allocateFefo, calculateInventoryValue, estimateStockoutDate, getReorderRecommendation, rollingAverage, type Batch } from '@/lib/nationalInventory';

const demoBatches: Batch[] = [
  { id: 'amx-001', medicineId: 'amoxicillin', batchNumber: 'AMX-07-26', expiryDate: '2026-09-30', quantity: 42, purchasePrice: 18, sellingPrice: 25, supplier: 'Botswana Medical Suppliers', barcode: '6001002003011', warehouseLocation: 'GAB-A1' },
  { id: 'amx-002', medicineId: 'amoxicillin', batchNumber: 'AMX-01-27', expiryDate: '2027-01-31', quantity: 180, purchasePrice: 17, sellingPrice: 25, supplier: 'Botswana Medical Suppliers', barcode: '6001002003011', warehouseLocation: 'GAB-A2' },
  { id: 'met-001', medicineId: 'metformin', batchNumber: 'MET-11-26', expiryDate: '2026-11-15', quantity: 24, purchasePrice: 12, sellingPrice: 18, supplier: 'HealthBridge Pharma', barcode: '6001002003028', warehouseLocation: 'GAB-B1' },
];

const kpis = [
  { label: 'Facilities', value: '142', icon: Building2, tone: 'text-primary' },
  { label: 'Total Medicines', value: '1,286', icon: Boxes, tone: 'text-success' },
  { label: 'Critical Alerts', value: '37', icon: AlertTriangle, tone: 'text-critical' },
  { label: 'Transfers In Transit', value: '18', icon: Truck, tone: 'text-warning' },
];

const modules = [
  { title: 'Inventory', desc: 'Barcode lookup, batch stock cards, FEFO issues, adjustments, returns and damaged/expired stock.', icon: ScanLine },
  { title: 'Warehouse', desc: 'Warehouse receipts, locations, allocation, incoming shipments and outgoing dispatches.', icon: Warehouse },
  { title: 'Transfers', desc: 'Facility requests, CMS approval, warehouse allocation, confirmation and two-sided inventory updates.', icon: ArrowLeftRight },
  { title: 'Orders', desc: 'Low-stock requisitions, approvals, purchase orders, supplier acceptance and goods received.', icon: ShoppingCart },
  { title: 'Analytics', desc: 'Daily, weekly, monthly, quarterly and annual usage with forecasts and stockout estimates.', icon: BarChart3 },
  { title: 'CMS', desc: 'National view for regions, hospitals, clinics, medical stores, alerts and drill-down audit history.', icon: Landmark },
  { title: 'Reports', desc: 'Inventory, consumption, expiry, purchase, transfer, supplier, facility and national exports.', icon: FileText },
  { title: 'Audit', desc: 'Append-only operational history with user, facility, action, entity and before/after values.', icon: ShieldCheck },
];

const workflow = ['Low Stock', 'Purchase Requisition', 'Approval', 'Purchase Order', 'Supplier Acceptance', 'Shipment', 'Goods Received', 'Inventory Updated'];

export default function InventoryExpansion() {
  const [barcode, setBarcode] = useState('6001002003011');
  const [issueQuantity, setIssueQuantity] = useState(60);
  const barcodeMatch = demoBatches.find((batch) => batch.barcode === barcode);
  const allocations = useMemo(() => allocateFefo(demoBatches.filter((batch) => batch.medicineId === 'amoxicillin'), issueQuantity), [issueQuantity]);
  const inventoryValue = calculateInventoryValue(demoBatches);
  const dailyUsage = rollingAverage([
    { date: '2026-07-09', quantityIssued: 18 },
    { date: '2026-07-10', quantityIssued: 22 },
    { date: '2026-07-11', quantityIssued: 20 },
    { date: '2026-07-12', quantityIssued: 16 },
  ]);
  const reorder = getReorderRecommendation(24, { minimumStock: 20, maximumStock: 220, safetyStock: 40, reorderPoint: 50, leadTimeDays: 14, economicOrderQuantity: 120 }, 'HealthBridge Pharma');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">ChekaMeds v2.0</p>
            <h1 className="text-2xl font-display font-bold text-foreground">National Pharmaceutical Inventory & Supply Chain</h1>
            <p className="text-sm text-muted-foreground">Additive expansion module preserving existing ChekaMeds routes, auth and clinic inventory flows.</p>
          </div>
          <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          {kpis.map((kpi) => <Card key={kpi.label} className="card-premium"><CardContent className="flex items-center gap-3 p-5"><kpi.icon className={`h-5 w-5 ${kpi.tone}`} /><div><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="text-2xl font-bold">{kpi.value}</p></div></CardContent></Card>)}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 card-premium">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ScanLine className="h-5 w-5 text-primary" /> Barcode Inventory Workbench</CardTitle><CardDescription>Camera scanners, USB scanners and manual entry all resolve through the same barcode lookup path.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Scan or type barcode" /><Button>Lookup barcode</Button></div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                {barcodeMatch ? <div className="space-y-2"><Badge>Known medicine</Badge><p className="font-semibold">Open inventory transaction for {barcodeMatch.medicineId} / batch {barcodeMatch.batchNumber}</p><p className="text-sm text-muted-foreground">Supplier: {barcodeMatch.supplier} • Location: {barcodeMatch.warehouseLocation} • Expiry: {barcodeMatch.expiryDate}</p></div> : <div className="space-y-2"><Badge variant="outline">Unknown barcode</Badge><p className="font-semibold">Create new medicine and first batch record before receiving stock.</p></div>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3"><Input type="number" value={issueQuantity} onChange={(event) => setIssueQuantity(Number(event.target.value))} /><div className="sm:col-span-2 rounded-xl bg-background p-3 text-sm text-muted-foreground">FEFO allocation: {allocations.map((item) => `${item.batchNumber} × ${item.quantity}`).join(', ') || 'No stock allocated'}</div></div>
            </CardContent>
          </Card>

          <Card className="card-premium"><CardHeader><CardTitle className="text-lg">Facility Dashboard</CardTitle><CardDescription>Live operational snapshot for store managers and pharmacists.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span>Inventory value</span><b>BWP {inventoryValue.toLocaleString()}</b></div><div className="flex justify-between"><span>Low / critical stock</span><b>1 / 1</b></div><div className="flex justify-between"><span>Expiring soon</span><b>1 batch</b></div><div className="flex justify-between"><span>Daily usage</span><b>{dailyUsage.toFixed(1)} units</b></div><div className="flex justify-between"><span>Estimated stockout</span><b>{estimateStockoutDate(24, dailyUsage, new Date('2026-07-13T00:00:00Z'))}</b></div><div className="rounded-xl bg-primary/10 p-3 text-primary"><PackageCheck className="mb-2 h-4 w-4" /> Reorder: {reorder.recommendedQuantity} units from {reorder.preferredSupplier}</div></CardContent></Card>
        </div>

        <Card className="card-premium"><CardHeader><CardTitle className="text-lg">Procurement Workflow</CardTitle></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-8">{workflow.map((step) => <div key={step} className="rounded-xl border border-border bg-background p-3 text-center text-xs font-semibold">{step}</div>)}</div></CardContent></Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{modules.map((module) => <Card key={module.title} className="card-premium"><CardHeader><module.icon className="h-5 w-5 text-primary" /><CardTitle className="text-base">{module.title}</CardTitle><CardDescription>{module.desc}</CardDescription></CardHeader></Card>)}</div>
      </main>
    </div>
  );
}
