import React from "react";
import { CloudUpload, WifiOff } from "lucide-react";

export default function ScannerHeader({ online, pending }: { online: boolean; pending: number }) {
  return (
    <header className="flex items-start justify-between">
      <div>
        <p className="text-sm font-bold tracking-tight text-emerald-700">ChekaMeds</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Inventory scanner</h1>
        <p className="mt-1 text-sm text-slate-500">Scan. Confirm. Stock updated.</p>
      </div>
      <div className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${online ? "bg-white text-slate-600" : "bg-amber-100 text-amber-800"}`}>
        {online ? <CloudUpload className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {pending ? `${pending} pending` : online ? "Synced" : "Offline"}
      </div>
    </header>
  );
}
