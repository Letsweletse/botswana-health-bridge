import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRefreshInventory } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const categories = ['Chronic', 'Acute', 'Preventive', 'Essential'] as const;
const trends = ['Stable', 'Depleting Fast', 'Restocked'] as const;

const AddMedicineDialog = () => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const refreshInventory = useRefreshInventory();
  const { profile } = useAuth();

  const [medName, setMedName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [trend, setTrend] = useState<string>('Stable');

  const resetForm = () => {
    setMedName('');
    setCategory('');
    setQuantity(0);
    setTrend('Stable');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clinicName = profile?.clinic_name;

    if (!clinicName || !medName.trim() || !category) {
      toast({ title: 'Missing fields', description: 'Please fill in medicine name and category.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('clinic_inventory').insert({
        clinic_name: clinicName,
        med_name: medName.trim(),
        category,
        quantity,
        trend,
      });

      if (error) throw error;

      toast({ title: 'Medicine added', description: `${medName} added to ${clinicName}` });
      resetForm();
      setOpen(false);
      refreshInventory();
    } catch (err: any) {
      toast({ title: 'Failed to add', description: err.message || 'Could not add medicine.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs h-8">
          <Plus className="h-3.5 w-3.5" />
          Add Medicine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Medicine to {profile?.clinic_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-xs">Medicine Name</Label>
            <Input
              placeholder="e.g. Metformin 500mg"
              value={medName}
              onChange={e => setMedName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Initial Quantity</Label>
              <Input
                type="number"
                min={0}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Trend</Label>
            <Select value={trend} onValueChange={setTrend}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trends.map(t => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Adding...' : 'Add to Inventory'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMedicineDialog;
