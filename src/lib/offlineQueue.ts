const QUEUE_KEY = "chekameds-scanner-queue";
const CACHE_KEY = "chekameds-scanner-products";

export const getQueue = (): any[] => JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
export const setQueue = (items: any[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
export const enqueueTransaction = (payload: any): number => {
  const next = [...getQueue(), payload];
  setQueue(next);
  return next.length;
};
export const cacheProduct = (barcode: string, product: any) => {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  cache[barcode] = product;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};
export const getCachedProduct = (barcode: string): any | null => {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  return cache[barcode] || null;
};
export const makeReference = (): string =>
  `scan-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
