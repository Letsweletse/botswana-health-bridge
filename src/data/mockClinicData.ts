// Mock data removed — system is now fully database-driven.
// This file is kept for type exports only.

export interface ClinicInventory {
  id: string;
  clinic_name: string;
  med_name: string;
  category: string;
  quantity: number;
  trend: string;
  updated_at: string;
}

// No more hardcoded clinics or inventory data.
export const clinics: { name: string; lat: number; lng: number; status: 'critical' | 'warning' | 'stocked' }[] = [];
export const inventoryData: ClinicInventory[] = [];
