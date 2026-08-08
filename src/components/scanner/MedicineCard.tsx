import React from "react";
import { PackageCheck, MapPin } from "lucide-react";

export default function MedicineCard({ result }: { result: any }) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><PackageCheck className="h-7 w-7" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Medicine found</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">{result.medicine.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {[result.medicine.strength, result.medicine.dosage_form].filter(Boolean).join(" · ") || result.medicine.barcode}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${result.inventory.quantity <= (result.inventory.minimum_stock || 10) ? "text-red-600" : "text-slate-950"}`}>
            {result.inventory.quantity}
          </p>
          <p className="text-xs text-slate-500">in stock</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
        <span className="font-mono text-slate-500">{result.medicine.barcode}</span>
        <span className="flex items-center gap-1 font-medium text-slate-700">
          <MapPin className="h-4 w-4 text-emerald-600" />{result.branch.name}
        </span>
      </div>
    </div>
  );
}
