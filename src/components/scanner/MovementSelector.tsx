import React from "react";
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw, SlidersHorizontal } from "lucide-react";

const options: [string, string, any][] = [
  ["stock_out", "Stock Out", ArrowUpFromLine],
  ["stock_in", "Stock In", ArrowDownToLine],
  ["return", "Return", RotateCcw],
  ["adjustment", "Adjustment", SlidersHorizontal],
];

export default function MovementSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700">Stock movement</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(([id, label, Icon]) => (
          <button key={id} onClick={() => onChange(id)}
            className={`flex h-14 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${
              value === id ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100" : "border-slate-200 bg-white text-slate-600"
            }`}>
            <Icon className="h-5 w-5" />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
