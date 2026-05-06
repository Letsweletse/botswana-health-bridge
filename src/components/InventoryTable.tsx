import { useState, useRef } from 'react';
import { useClinicInventory, useRefreshInventory } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TrendingDown, Minus, ArrowUpRight, Search, Pencil, Check, X, Loader2, Trash2, AlertTriangle, Download, Upload } from 'lucide-react';
import AddMedicineDialog from '@/components/AddMedicineDialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const trendConfig: Record<string, { icon: typeof TrendingDown; className: string }> = {
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
  const { data: inventoryData = [], isLoading } = useClinicInventory();
  const { profile } = useAuth();
  const refreshInventory = useRefreshInventory();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clinicName = profile?.clinic_name || 'My Clinic';

  const downloadTemplate = () => {
    const templateData = [
      { 'Product Name': 'Panado', 'Category': 'Essential', 'Stock Quantity': 200, 'Price (BWP)': 25, 'Availability': 'In Stock', 'Pharmacy Name': clinicName, 'Location': 'Gaborone', 'Contact': '+267 71234567' },
      { 'Product Name': 'Metformin', 'Category': 'Chronic', 'Stock Quantity': 45, 'Price (BWP)': 48, 'Availability': 'Low Stock', 'Pharmacy Name': clinicName, 'Location': 'Gaborone', 'Contact': '+267 71234567' },
      { 'Product Name': 'Amoxicillin', 'Category': 'Acute', 'Stock Quantity': 0, 'Price (BWP)': '', 'Availability': 'Out of Stock', 'Pharmacy Name': clinicName, 'Location': 'Gaborone', 'Contact': '+267 71234567' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const instructions = [
      { Field: 'Product Name', Notes: 'Required. The medicine/product name customers will search for.' },
      { Field: 'Category', Notes: 'Optional. e.g. Chronic, Acute, Preventive, Essential.' },
      { Field: 'Stock Quantity', Notes: 'Required. Whole number of units in stock. Use 0 if out of stock.' },
      { Field: 'Price (BWP)', Notes: 'Optional. Pharmacies should fill price in Botswana Pula. Clinics may leave blank.' },
      { Field: 'Availability', Notes: 'Optional. In Stock / Low Stock / Out of Stock. Auto-derived from quantity if blank.' },
      { Field: 'Pharmacy Name', Notes: 'Optional. Defaults to your account clinic/pharmacy name if blank.' },
      { Field: 'Location', Notes: 'Recommended. City/area shown to customers (e.g. Gaborone, Block 6).' },
      { Field: 'Contact', Notes: 'Optional. Phone number for customers to reach the pharmacy.' },
    ];
    const wsInfo = XLSX.utils.json_to_sheet(instructions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Template');
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions');
    XLSX.writeFile(wb, `ChekaMeds_Stock_Template_${clinicName.replace(/\s+/g, '_')}.xlsx`);
    toast({ title: 'Template downloaded', description: 'Includes Pharmacy Name, Location and Contact columns.' });
  };

  const downloadCurrentStock = () => {
    if (inventoryData.length === 0) {
      toast({ title: 'No data', description: 'Your inventory is empty.', variant: 'destructive' });
      return;
    }
    const exportData = inventoryData.map(i => ({
      med_name: i.med_name,
      strength: i.strength || '',
      dosage_form: i.dosage_form || '',
      pack_size: i.pack_size || '',
      atc_code: i.atc_code || '',
      atc_description: i.atc_description || '',
      category: i.category,
      facility_level: i.facility_level || '',
      quantity: i.quantity,
      trend: i.trend,
      price_bwp: i.price_bwp ?? '',
      updated_at: i.updated_at,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Current Stock');
    XLSX.writeFile(wb, `ChekaMeds_Stock_${clinicName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: 'Stock exported', description: `${exportData.length} medicines exported to Excel.` });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) throw new Error('The file is empty.');

      const validCategories = ['Chronic', 'Acute', 'Preventive', 'Essential'];
      const validTrends = ['Stable', 'Depleting Fast', 'Restocked'];

      const records = rows.map((row, idx) => {
        const medName = String(row['Product Name'] || row.med_name || row['Medicine Name'] || row['medicine'] || '').trim();
        const strength = String(row.strength || row['Strength'] || '').trim();
        const dosageForm = String(row.dosage_form || row['Dosage Form'] || '').trim();
        const packSize = String(row.pack_size || row['Pack Size'] || '').trim();
        const atcCode = String(row.atc_code || row['ATC Code'] || '').trim();
        const atcDescription = String(row.atc_description || row['ATC Description'] || '').trim();
        const category = String(row['Category'] || row.category || 'Essential').trim();
        const facilityLevel = String(row.facility_level || row['Facility Level'] || '').trim();
        const qtyRaw = row['Stock Quantity'] ?? row.quantity ?? row['Quantity'] ?? '0';
        const quantity = parseInt(String(qtyRaw), 10);
        const availability = String(row['Availability'] || '').trim().toLowerCase();
        let trend = String(row.trend || row['Trend'] || 'Stable').trim();
        if (availability === 'low stock') trend = 'Depleting Fast';
        else if (availability === 'in stock') trend = 'Stable';
        const priceRaw = row['Price (BWP)'] ?? row.price_bwp ?? row['price_bwp'] ?? row['price'] ?? '';
        const priceStr = String(priceRaw).trim();
        const priceParsed = priceStr === '' ? null : parseFloat(priceStr);
        const price_bwp = priceParsed !== null && !isNaN(priceParsed) && priceParsed >= 0 ? priceParsed : null;

        if (!medName) throw new Error(`Row ${idx + 2}: Product Name is required.`);
        if (isNaN(quantity) || quantity < 0) throw new Error(`Row ${idx + 2}: Invalid Stock Quantity for "${medName}".`);

        return {
          clinic_name: clinicName,
          med_name: medName,
          strength,
          dosage_form: dosageForm,
          pack_size: packSize,
          atc_code: atcCode,
          atc_description: atcDescription,
          category: validCategories.includes(category) ? category : 'Essential',
          facility_level: facilityLevel,
          quantity,
          trend: validTrends.includes(trend) ? trend : 'Stable',
          price_bwp,
        };
      });

      const { error: delErr } = await supabase
        .from('clinic_inventory')
        .delete()
        .eq('clinic_name', clinicName);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from('clinic_inventory')
        .insert(records);
      if (insErr) throw insErr;

      toast({ title: 'Stock uploaded', description: `${records.length} medicines imported from Excel.` });
      refreshInventory();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Could not process the file.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const categories = ['All', ...new Set(inventoryData.map(i => i.category))];

  const filtered = inventoryData.filter(item => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      item.med_name.toLowerCase().includes(searchLower) ||
      (item.strength || '').toLowerCase().includes(searchLower) ||
      (item.atc_code || '').toLowerCase().includes(searchLower) ||
      (item.atc_description || '').toLowerCase().includes(searchLower);
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

  const startEdit = (id: string, currentQty: number) => {
    setEditingId(id);
    setEditQty(currentQty);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinic_inventory')
        .update({ quantity: editQty })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Stock updated', description: `Quantity set to ${editQty} units.` });
      setEditingId(null);
      refreshInventory();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message || 'Could not update stock.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('clinic_inventory')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Medicine removed', description: `${deleteTarget.name} has been removed from inventory.` });
      setDeleteTarget(null);
      refreshInventory();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message || 'Could not delete this record.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-10 flex items-center justify-center card-premium">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading inventory...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-2xl border border-border overflow-hidden card-premium">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-display font-semibold text-foreground">
                {clinicName} — Stock Inventory
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} items · Upload Excel to bulk-update</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-xl border border-input bg-background text-muted-foreground hover:bg-muted transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Template
              </button>
              <button
                onClick={downloadCurrentStock}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-xl border border-input bg-background text-muted-foreground hover:bg-muted transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? 'Uploading...' : 'Upload Excel'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <AddMedicineDialog />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, strength, ATC code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 text-[11px] rounded-lg border transition-all font-medium ${
                    filterCategory === cat
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'bg-background text-muted-foreground border-input hover:bg-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted/60 backdrop-blur-sm">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Medicine Name</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Strength</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Dosage Form</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Pack Size</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">ATC Code</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">ATC Description</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Facility Level</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Stock</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Trend</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p>No medicines found. Add your first medicine above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const trend = trendConfig[item.trend] || trendConfig['Stable'];
                  const TrendIcon = trend.icon;
                  const isLow = item.quantity < 20;
                  const isEditing = editingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${isLow ? 'bg-critical/[0.025]' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{item.med_name}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.strength || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.dosage_form || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.pack_size || '—'}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{item.atc_code || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.atc_description || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[item.category] || ''}`}>
                          {item.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.facility_level || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQty}
                            onChange={e => setEditQty(Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 text-xs text-right rounded-lg border border-primary bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            min={0}
                            autoFocus
                          />
                        ) : (
                          <span className={`font-mono font-bold ${isLow ? 'text-critical' : 'text-foreground'}`}>
                            {item.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${trend.className}`}>
                          <TrendIcon className="h-2.5 w-2.5" />
                          {item.trend}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(item.id)}
                                disabled={saving}
                                className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors"
                                title="Save"
                              >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(item.id, item.quantity)}
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                title="Edit quantity"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: item.id, name: item.med_name })}
                                className="p-1.5 rounded-lg hover:bg-critical/10 text-muted-foreground hover:text-critical transition-colors"
                                title="Remove medicine"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-critical" />
              Remove from inventory?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget?.name}</strong> will be permanently removed from your clinic's inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-critical text-critical-foreground hover:bg-critical/90"
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Removing...</>
              ) : 'Yes, remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InventoryTable;