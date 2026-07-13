import { describe, expect, it } from 'vitest';
import { allocateFefo, calculateInventoryValue, estimateStockoutDate, getReorderRecommendation, rollingAverage } from './nationalInventory';

const batches = [
  { id: 'b2', medicineId: 'm1', batchNumber: 'B-2027', expiryDate: '2027-01-01', quantity: 10, purchasePrice: 5, sellingPrice: 7 },
  { id: 'b1', medicineId: 'm1', batchNumber: 'B-2026', expiryDate: '2026-08-01', quantity: 8, purchasePrice: 4, sellingPrice: 6 },
  { id: 'b3', medicineId: 'm1', batchNumber: 'B-2028', expiryDate: '2028-01-01', quantity: 0, purchasePrice: 6, sellingPrice: 8 },
];

describe('national inventory calculations', () => {
  it('allocates goods issued by FEFO', () => {
    expect(allocateFefo(batches, 12)).toEqual([
      { batchId: 'b1', batchNumber: 'B-2026', quantity: 8 },
      { batchId: 'b2', batchNumber: 'B-2027', quantity: 4 },
    ]);
  });

  it('calculates inventory value from batch purchase prices', () => {
    expect(calculateInventoryValue(batches)).toBe(82);
  });

  it('calculates rolling usage and stockout dates', () => {
    expect(rollingAverage([{ date: '2026-07-01', quantityIssued: 6 }, { date: '2026-07-02', quantityIssued: 10 }])).toBe(8);
    expect(estimateStockoutDate(16, 8, new Date('2026-07-13T00:00:00Z'))).toBe('2026-07-15');
  });

  it('recommends reorder quantities at reorder point', () => {
    expect(getReorderRecommendation(15, { minimumStock: 10, maximumStock: 100, safetyStock: 20, reorderPoint: 20, leadTimeDays: 14 }, 'MedSupply BW')).toEqual({
      shouldReorder: true,
      recommendedQuantity: 85,
      preferredSupplier: 'MedSupply BW',
      createDraftPurchaseOrder: true,
    });
  });
});
