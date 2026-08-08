import React, { useState } from "react";
import { Camera, Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useBarcodeCamera from "@/hooks/useBarcodeCamera";

export default function BarcodeCapture({ onDetected, busy }: { onDetected: (b: string) => void; busy: boolean }) {
  const [barcode, setBarcode] = useState("");
  const camera = useBarcodeCamera(onDetected);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (barcode.trim()) onDetected(barcode.trim()); };
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 aspect-[4/3] shadow-xl">
        <video ref={camera.videoRef} className="h-full w-full object-cover" playsInline muted />
        {!camera.active && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center text-white">
            <div>
              <Camera className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
              <p className="font-semibold">Ready to scan</p>
              <p className="mt-1 text-sm text-slate-400">Point the camera at a medicine barcode</p>
            </div>
          </div>
        )}
        {camera.active && (
          <div className="absolute inset-8 rounded-2xl border-2 border-emerald-400/80">
            <span className="absolute left-4 right-4 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_16px_#34d399]" />
          </div>
        )}
        {camera.active && (
          <button onClick={camera.stop} className="absolute right-4 top-4 rounded-full bg-black/50 p-3 text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {!camera.active && (
        <Button onClick={camera.start} disabled={busy} className="h-16 w-full rounded-2xl bg-emerald-600 text-lg hover:bg-emerald-700">
          <Camera className="mr-2 h-6 w-6" /> Scan medicine
        </Button>
      )}
      {camera.error && <p className="text-sm text-amber-700">{camera.error}</p>}
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Enter barcode or medicine name" inputMode="numeric" className="h-12 rounded-xl pl-10" />
        </div>
        <Button type="submit" variant="outline" className="h-12 rounded-xl" disabled={busy}>Find</Button>
      </form>
    </section>
  );
}
