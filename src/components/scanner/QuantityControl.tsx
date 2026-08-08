import React from "react";
import { Minus, Plus } from "lucide-react";

export default function QuantityControl({ value, onChange, adjustment }: { value: number; onChange: (v: number) => void; adjustment: boolean }) {
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <p className="text-sm font-semibold text-slate-700">{adjustment ? "Set exact stock count" : "Quantity"}</p>
        {adjustment && <span className="text-xs text-slate-500">New balance</span>}
      </div>
      <div className="flex items-center justify-between rounded-2xl border bg-white p-2">
        <button onClick={() => onChange(Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-700">
          <Minus className="h-5 w-5" />
        </button>
        <input className="w-24 bg-transparent text-center text-3xl font-bold outline-none" inputMode="numeric"
          value={value} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))} />
        <button onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
