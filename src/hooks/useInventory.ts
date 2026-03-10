import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface InventoryItem {
  id: string;
  clinic_name: string;
  med_name: string;
  category: string;
  quantity: number;
  trend: string;
  updated_at: string;
  strength: string;
  dosage_form: string;
  pack_size: string;
  atc_code: string;
  atc_description: string;
  facility_level: string;
}

/** Fetches ALL inventory (used by stats/map that need global view) */
export function useInventory() {
  return useQuery({
    queryKey: ['clinic-inventory'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from('clinic_inventory')
        .select('*')
        .order('clinic_name');

      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
    refetchInterval: 30000,
  });
}

/** Fetches inventory filtered to the logged-in user's clinic */
export function useClinicInventory() {
  const { profile } = useAuth();
  const clinicName = profile?.clinic_name;

  return useQuery({
    queryKey: ['clinic-inventory', clinicName],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!clinicName) return [];
      const { data, error } = await supabase
        .from('clinic_inventory')
        .select('*')
        .eq('clinic_name', clinicName)
        .order('med_name');

      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
    enabled: !!clinicName,
    refetchInterval: 30000,
  });
}

export function useInventoryStats() {
  const { data: inventory = [], isLoading } = useInventory();

  // Derive unique clinics from live database inventory
  const clinicNames = [...new Set(inventory.map(i => i.clinic_name))];
  const totalClinics = clinicNames.length;
  const totalMeds = inventory.length;
  const criticalCount = inventory.filter(i => i.quantity < 20).length;
  const healthyCount = inventory.filter(i => i.quantity >= 100).length;
  const depletingFast = inventory.filter(i => i.trend === 'Depleting Fast').length;

  const clinicStatuses = clinicNames.map(name => {
    const clinicMeds = inventory.filter(i => i.clinic_name === name);
    const hasCritical = clinicMeds.some(m => m.quantity < 20);
    const hasWarning = clinicMeds.some(m => m.quantity >= 20 && m.quantity < 50);
    const status = hasCritical ? 'critical' : hasWarning ? 'warning' : 'stocked';
    return { name, lat: 0, lng: 0, status: status as 'critical' | 'warning' | 'stocked' };
  });

  const stockedClinics = clinicStatuses.filter(c => c.status === 'stocked').length;
  const criticalClinics = clinicStatuses.filter(c => c.status === 'critical').length;
  const stockedPct = totalClinics > 0 ? Math.round((stockedClinics / totalClinics) * 100) : 0;

  return {
    inventory,
    isLoading,
    totalClinics,
    totalMeds,
    criticalCount,
    healthyCount,
    depletingFast,
    criticalClinics,
    stockedPct,
    clinicStatuses,
  };
}

export function useRefreshInventory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['clinic-inventory'] });
}
