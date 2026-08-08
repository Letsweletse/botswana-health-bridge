import React, { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RotateCcw, WifiOff } from "lucide-react";
import { supabase, invokeStockTransaction } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import ScannerHeader from "@/components/scanner/ScannerHeader";
import BarcodeCapture from "@/components/scanner/BarcodeCapture";
import MedicineCard from "@/components/scanner/MedicineCard";
import MovementSelector from "@/components/scanner/MovementSelector";
import QuantityControl from "@/components/scanner/QuantityControl";
import {
  cacheProduct, enqueueTransaction, getCachedProduct,
  getQueue, makeReference, setQueue,
} from "@/lib/offlineQueue";

const messageFrom = (error: any) => error?.message || "Something went wrong.";

export default function Scanner() {
  const [result, setResult] = useState<any>(null);
  const [type, setType] = useState("stock_out");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(getQueue().length);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || !getQueue().length) return;
    let remaining = getQueue();
    while (remaining.length) {
      try {
        await invokeStockTransaction(remaining[0]);
        remaining = remaining.slice(1);
        setQueue(remaining);
        setPending(remaining.length);
      } catch { break; }
    }
    if (!remaining.length) setNotice("All pending stock movements are synced.");
  }, []);

  useEffect(() => {
    const connected = () => { setOnline(true); syncPending(); };
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    syncPending();
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, [syncPending]);

  const lookup = async (barcode: string) => {
    setBusy(true); setNotice("");
    if (!navigator.onLine) {
      const cached = getCachedProduct(barcode);
      setResult(cached);
      setNotice(cached
        ? "Using last saved stock details while offline."
        : "This barcode is not available offline. Reconnect to identify it.");
      setBusy(false);
      return;
    }
    try {
      const response = await invokeStockTransaction({ action: "lookup", barcode });
      setResult(response.data);
      cacheProduct(barcode, response.data);
      setQuantity(1);
      setType("stock_out");
    } catch (error: any) {
      setResult(null);
      setNotice(messageFrom(error));
    }
    setBusy(false);
  };

  const confirm = async () => {
    const payload = {
      action: "commit",
      barcode: result.medicine.barcode,
      inventory_id: result.inventory.id,
      quantity,
      transaction_type: type,
      transaction_at: new Date().toISOString(),
      client_reference_id: makeReference(),
    };
    if (!navigator.onLine) {
      setPending(enqueueTransaction(payload));
      setNotice("Saved safely. This movement will sync when you reconnect.");
      setResult(null);
      return;
    }
    setBusy(true); setNotice("");
    try {
      const response = await invokeStockTransaction(payload);
      const newQty = response.data.inventory.quantity;
      setResult((prev: any) => ({ ...prev, inventory: { ...prev.inventory, quantity: newQty } }));
      cacheProduct(result.medicine.barcode, { ...result, inventory: { ...result.inventory, quantity: newQty } });
      setNotice("Stock updated and transaction recorded.");
      setQuantity(1);
    } catch (error: any) {
      const networkFailure = !navigator.onLine || /network|fetch/i.test(error.message || "");
      if (networkFailure) {
        setPending(enqueueTransaction(payload));
        setNotice("Connection lost. Saved to pending queue.");
        setResult(null);
      } else {
        setNotice(messageFrom(error));
      }
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
      <ScannerHeader online={online} pending={pending} />
      <div className="mt-7 space-y-5">
        {!result && <BarcodeCapture onDetected={lookup} busy={busy} />}
        {busy && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-4 text-sm font-medium text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            Checking ChekaMeds inventory...
          </div>
        )}
        {notice && (
          <div className={`flex items-start gap-2 rounded-2xl p-4 text-sm font-medium ${
            notice.includes("updated") || notice.includes("synced")
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900"
          }`}>
            {!online && <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />}
            {notice}
          </div>
        )}
        {result && !busy && (
          <>
            <MedicineCard result={result} />
            <MovementSelector value={type} onChange={setType} />
            <QuantityControl value={quantity} onChange={setQuantity} adjustment={type === "adjustment"} />
            <Button
              onClick={confirm}
              disabled={busy}
              className="h-16 w-full rounded-2xl bg-emerald-600 text-lg font-bold hover:bg-emerald-700"
            >
              <Check className="mr-2 h-6 w-6" />
              Confirm {type === "adjustment" ? "count" : `${quantity} unit${quantity === 1 ? "" : "s"}`}
            </Button>
            <button
              onClick={() => { setResult(null); setNotice(""); }}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-500"
            >
              <RotateCcw className="h-4 w-4" /> Scan another medicine
            </button>
          </>
        )}
      </div>
    </div>
  );
}
