export type Batch = {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier?: string;
  barcode?: string;
  warehouseLocation?: string;
};

export type ConsumptionPoint = {
  date: string;
  quantityIssued: number;
};

export type ReorderRule = {
  minimumStock: number;
  maximumStock: number;
  safetyStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  economicOrderQuantity?: number;
};

export const transactionTypes = [
  'goods_received',
  'goods_issued',
  'stock_adjustment',
  'damaged',
  'expired',
  'transfer',
  'return',
] as const;

export type InventoryTransactionType = (typeof transactionTypes)[number];

export function allocateFefo(batches: Batch[], requestedQuantity: number) {
  if (requestedQuantity <= 0) return [];

  let remaining = requestedQuantity;
  const allocations = batches
    .filter((batch) => batch.quantity > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .flatMap((batch) => {
      if (remaining <= 0) return [];
      const quantity = Math.min(batch.quantity, remaining);
      remaining -= quantity;
      return [{ batchId: batch.id, batchNumber: batch.batchNumber, quantity }];
    });

  return allocations;
}

export function calculateInventoryValue(batches: Batch[]) {
  return batches.reduce((total, batch) => total + batch.quantity * batch.purchasePrice, 0);
}

export function rollingAverage(points: ConsumptionPoint[], windowSize = 30) {
  const recent = points.slice(-windowSize);
  if (recent.length === 0) return 0;
  return recent.reduce((total, point) => total + point.quantityIssued, 0) / recent.length;
}

export function estimateStockoutDate(currentQuantity: number, dailyUsage: number, from = new Date()) {
  if (currentQuantity <= 0) return from.toISOString().slice(0, 10);
  if (dailyUsage <= 0) return null;

  const daysRemaining = Math.floor(currentQuantity / dailyUsage);
  const estimate = new Date(from);
  estimate.setDate(estimate.getDate() + daysRemaining);
  return estimate.toISOString().slice(0, 10);
}

export function getReorderRecommendation(currentQuantity: number, rule: ReorderRule, preferredSupplier?: string) {
  const shouldReorder = currentQuantity <= rule.reorderPoint;
  const targetQuantity = Math.max(rule.maximumStock - currentQuantity, 0);
  const recommendedQuantity = shouldReorder
    ? Math.max(rule.economicOrderQuantity ?? 0, targetQuantity, rule.safetyStock)
    : 0;

  return {
    shouldReorder,
    recommendedQuantity,
    preferredSupplier: shouldReorder ? preferredSupplier ?? 'Use approved supplier catalogue' : undefined,
    createDraftPurchaseOrder: shouldReorder,
  };
}
