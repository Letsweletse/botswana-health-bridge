import React, { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RotateCcw, WifiOff, Eye, EyeOff, LogOut, CloudUpload } from "lucide-react";
import { supabase, invokeStockTransaction } from "@/lib/supabaseClient";
import BarcodeCapture from "@/components/scanner/BarcodeCapture";
import MedicineCard from "@/components/scanner/MedicineCard";
import MovementSelector from "@/components/scanner/MovementSelector";
import QuantityControl from "@/components/scanner/QuantityControl";
import {
  cacheProduct, enqueueTransaction, getCachedProduct,
  getQueue, makeReference, setQueue,
} from "@/lib/offlineQueue";

const messageFrom = (error: any) => error?.message || "Something went wrong.";

// ── LOGIN SCREEN ──
function ScannerLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    onLogin();
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 80, height: 80, background: "linear-gradient(135deg,#10b981,#059669)", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 36, boxShadow: "0 8px 32px rgba(16,185,129,0.35)" }}>📷</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: -0.5 }}>ChekaMeds</h1>
          <p style={{ fontSize: 13, color: "#475569", marginTop: 5, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Pharmacy Scanner</p>
        </div>
        <form onSubmit={handleLogin} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="pharmacy@email.com" autoComplete="email"
              style={{ width: "100%", background: "#0a0f1a", border: "1px solid #1f2937", borderRadius: 12, padding: "14px 16px", fontSize: 16, color: "#f1f5f9", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "#10b981"}
              onBlur={e => e.target.style.borderColor = "#1f2937"}
            />
          </div>
          <div style={{ marginBottom: 20, position: "relative" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Password</label>
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password"
              style={{ width: "100%", background: "#0a0f1a", border: "1px solid #1f2937", borderRadius: 12, padding: "14px 48px 14px 16px", fontSize: 16, color: "#f1f5f9", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "#10b981"}
              onBlur={e => e.target.style.borderColor = "#1f2937"}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, bottom: 14, background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0 }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, background: "#450a0a", padding: "10px 14px", borderRadius: 10 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width: "100%", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", border: "none", borderRadius: 12, padding: "15px 0", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 20px rgba(16,185,129,0.35)" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 12, color: "#1e3a5f", marginTop: 24 }}>chekameds.co.bw · Powered by IBLIM</p>
      </div>
    </div>
  );
}

// ── MAIN SCANNER ──
export default function Scanner() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [type, setType] = useState("stock_out");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{msg: string; ok: boolean} | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(getQueue().length);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from("profiles").select("clinic_name,name,role").eq("id", u.id).single();
        setProfile(p);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from("profiles").select("clinic_name,name,role").eq("id", u.id).single();
        setProfile(p);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || !getQueue().length) return;
    let remaining = getQueue();
    while (remaining.length) {
      try { await invokeStockTransaction(remaining[0]); remaining = remaining.slice(1); setQueue(remaining); setPending(remaining.length); }
      catch { break; }
    }
    if (!remaining.length) setNotice({ msg: "All pending movements synced ✓", ok: true });
  }, []);

  useEffect(() => {
    const up = () => { setOnline(true); syncPending(); };
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    syncPending();
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, [syncPending]);

  const lookup = async (barcode: string) => {
    setBusy(true); setNotice(null);
    if (!navigator.onLine) {
      const cached = getCachedProduct(barcode);
      setResult(cached);
      setNotice({ msg: cached ? "Offline — showing cached data" : "Barcode not cached. Connect to search.", ok: false });
      setBusy(false); return;
    }
    try {
      const response = await invokeStockTransaction({ action: "lookup", barcode });
      setResult(response.data);
      cacheProduct(barcode, response.data);
      setQuantity(1); setType("stock_out");
    } catch (error: any) {
      setResult(null);
      setNotice({ msg: messageFrom(error), ok: false });
    }
    setBusy(false);
  };

  const confirm = async () => {
    const payload = { action: "commit", barcode: result.medicine.barcode, inventory_id: result.inventory.id, quantity, transaction_type: type, transaction_at: new Date().toISOString(), client_reference_id: makeReference() };
    if (!navigator.onLine) { setPending(enqueueTransaction(payload)); setNotice({ msg: "Saved offline — will sync when connected", ok: true }); setResult(null); return; }
    setBusy(true); setNotice(null);
    try {
      const response = await invokeStockTransaction(payload);
      const newQty = response.data.inventory.quantity;
      setResult((prev: any) => ({ ...prev, inventory: { ...prev.inventory, quantity: newQty } }));
      cacheProduct(result.medicine.barcode, { ...result, inventory: { ...result.inventory, quantity: newQty } });
      setNotice({ msg: `✓ Stock updated — ${newQty} units remaining`, ok: true });
      setQuantity(1);
      try { navigator.vibrate?.(100); } catch (_) {}
    } catch (error: any) {
      if (!navigator.onLine || /network|fetch/i.test(error.message || "")) {
        setPending(enqueueTransaction(payload));
        setNotice({ msg: "Connection lost — saved to queue", ok: false });
        setResult(null);
      } else {
        setNotice({ msg: messageFrom(error), ok: false });
      }
    }
    setBusy(false);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <ScannerLogin onLogin={() => supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", paddingBottom: 40 }}>

      {/* ── HEADER ── */}
      <div style={{ background: "#111827", borderBottom: "1px solid #1f2937", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>ChekaMeds</span>
            <span style={{ fontSize: 12, background: "#10b981", color: "white", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>Scanner</span>
          </div>
          <p style={{ fontSize: 11, color: "#475569", margin: 0, marginTop: 2 }}>{profile?.clinic_name || "Pharmacy"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Sync indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: online ? "#6b7280" : "#f59e0b" }}>
            {online ? <CloudUpload size={14} /> : <WifiOff size={14} />}
            {pending > 0 ? `${pending} pending` : online ? "Synced" : "Offline"}
          </div>
          {/* Sign out */}
          <button onClick={() => supabase.auth.signOut()}
            style={{ background: "none", border: "1px solid #1f2937", borderRadius: 10, padding: "6px 12px", color: "#6b7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={14} /> Out
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── SCANNER OR RESULT ── */}
        {!result ? (
          <BarcodeCapture onDetected={lookup} busy={busy} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Back to scanner */}
            <button onClick={() => { setResult(null); setNotice(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              <RotateCcw size={15} /> Scan another
            </button>
            <MedicineCard result={result} />
            <MovementSelector value={type} onChange={setType} />
            <QuantityControl value={quantity} onChange={setQuantity} adjustment={type === "adjustment"} />
            <button onClick={confirm} disabled={busy}
              style={{
                width: "100%", padding: "18px 0",
                background: busy ? "#1f2937" : "linear-gradient(135deg,#10b981,#059669)",
                border: "none", borderRadius: 16, color: "white",
                fontSize: 17, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: busy ? "none" : "0 4px 20px rgba(16,185,129,0.35)",
                letterSpacing: 0.2,
              }}>
              {busy
                ? <><Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} /> Processing...</>
                : <><Check size={22} /> Confirm {type === "adjustment" ? "Count" : `${quantity} Unit${quantity === 1 ? "" : "s"}`}</>
              }
            </button>
          </div>
        )}

        {/* ── NOTICE ── */}
        {notice && (
          <div style={{
            marginTop: 14, padding: "14px 16px", borderRadius: 14,
            background: notice.ok ? "#022c22" : "#1c0a0a",
            border: `1px solid ${notice.ok ? "#10b981" : "#ef4444"}33`,
            color: notice.ok ? "#34d399" : "#f87171",
            fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            {!online && <WifiOff size={16} />}
            {notice.msg}
          </div>
        )}

        {/* ── BUSY OVERLAY ── */}
        {busy && !result && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #1f2937", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "#6b7280", fontSize: 14 }}>Looking up medicine...</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
