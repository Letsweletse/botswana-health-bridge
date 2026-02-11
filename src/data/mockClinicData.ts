export interface ClinicInventory {
  id: string;
  clinic_name: string;
  med_name: string;
  category: 'Chronic' | 'Acute' | 'Preventive' | 'Essential';
  quantity: number;
  trend: 'Stable' | 'Depleting Fast' | 'Restocked';
  updated_at: string;
  lat: number;
  lng: number;
}

export const clinics = [
  { name: 'Princess Marina Hospital', lat: -24.6541, lng: 25.9087, status: 'critical' as const },
  { name: 'Gaborone Private Hospital', lat: -24.6282, lng: 25.9230, status: 'stocked' as const },
  { name: 'Bokamoso Private Hospital', lat: -24.6100, lng: 25.9400, status: 'stocked' as const },
  { name: 'Sbrana Psychiatric Hospital', lat: -24.6700, lng: 25.9300, status: 'warning' as const },
  { name: 'Extension 2 Clinic', lat: -24.6450, lng: 25.9150, status: 'critical' as const },
  { name: 'Bontleng Clinic', lat: -24.6600, lng: 25.9200, status: 'stocked' as const },
  { name: 'Block 6 Clinic', lat: -24.6350, lng: 25.9050, status: 'stocked' as const },
  { name: 'Phase 2 Clinic', lat: -24.6200, lng: 25.9500, status: 'warning' as const },
];

export const inventoryData: ClinicInventory[] = [
  { id: '1', clinic_name: 'Princess Marina Hospital', med_name: 'Metformin 500mg', category: 'Chronic', quantity: 12, trend: 'Depleting Fast', updated_at: '2026-02-11T08:30:00Z', lat: -24.6541, lng: 25.9087 },
  { id: '2', clinic_name: 'Princess Marina Hospital', med_name: 'Amoxicillin 250mg', category: 'Acute', quantity: 5, trend: 'Depleting Fast', updated_at: '2026-02-11T09:15:00Z', lat: -24.6541, lng: 25.9087 },
  { id: '3', clinic_name: 'Gaborone Private Hospital', med_name: 'Amlodipine 5mg', category: 'Chronic', quantity: 340, trend: 'Stable', updated_at: '2026-02-11T07:00:00Z', lat: -24.6282, lng: 25.9230 },
  { id: '4', clinic_name: 'Bokamoso Private Hospital', med_name: 'Paracetamol 500mg', category: 'Essential', quantity: 520, trend: 'Restocked', updated_at: '2026-02-11T06:45:00Z', lat: -24.6100, lng: 25.9400 },
  { id: '5', clinic_name: 'Sbrana Psychiatric Hospital', med_name: 'Diazepam 5mg', category: 'Acute', quantity: 45, trend: 'Depleting Fast', updated_at: '2026-02-11T10:00:00Z', lat: -24.6700, lng: 25.9300 },
  { id: '6', clinic_name: 'Extension 2 Clinic', med_name: 'ARV - TLD', category: 'Chronic', quantity: 8, trend: 'Depleting Fast', updated_at: '2026-02-11T09:50:00Z', lat: -24.6450, lng: 25.9150 },
  { id: '7', clinic_name: 'Bontleng Clinic', med_name: 'Ibuprofen 400mg', category: 'Essential', quantity: 200, trend: 'Stable', updated_at: '2026-02-11T08:00:00Z', lat: -24.6600, lng: 25.9200 },
  { id: '8', clinic_name: 'Block 6 Clinic', med_name: 'ORS Sachets', category: 'Preventive', quantity: 150, trend: 'Stable', updated_at: '2026-02-11T07:30:00Z', lat: -24.6350, lng: 25.9050 },
  { id: '9', clinic_name: 'Phase 2 Clinic', med_name: 'Insulin Glargine', category: 'Chronic', quantity: 30, trend: 'Depleting Fast', updated_at: '2026-02-11T10:20:00Z', lat: -24.6200, lng: 25.9500 },
  { id: '10', clinic_name: 'Gaborone Private Hospital', med_name: 'Ciprofloxacin 500mg', category: 'Acute', quantity: 280, trend: 'Stable', updated_at: '2026-02-11T08:45:00Z', lat: -24.6282, lng: 25.9230 },
  { id: '11', clinic_name: 'Princess Marina Hospital', med_name: 'Omeprazole 20mg', category: 'Essential', quantity: 90, trend: 'Stable', updated_at: '2026-02-11T07:15:00Z', lat: -24.6541, lng: 25.9087 },
  { id: '12', clinic_name: 'Extension 2 Clinic', med_name: 'Cotrimoxazole', category: 'Preventive', quantity: 3, trend: 'Depleting Fast', updated_at: '2026-02-11T10:30:00Z', lat: -24.6450, lng: 25.9150 },
];
