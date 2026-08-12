import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import {
  Activity, Package, TrendingDown, AlertTriangle,
  ChevronRight, Search, RefreshCw, CheckCircle,
  LayoutGrid, ArrowUpRight, Upload, X, LogOut,
  ChevronDown, BarChart3, Clock, Phone, MapPin,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Branch = {
  id: string; clinic_name: string; location: string; address: string;
  contact: string; weekday_hours: string; weekend_hours: string; status: string;
};
type InventoryItem = {
  id: string; med_name: string; category: string; quantity: number;
  trend: string; pack_size: string; atc_code: string;
};
type BranchStats = { total: number; stable: number; low: number; depleting: number };

const COLORS = {
  blue: '#0071e3', blueDark: '#0058b0', blueLight: '#e8f0fb',
  green: '#34c759', greenLight: '#e9fbe9',
  amber: '#ff9f0a', amberLight: '#fff5e0',
  red: '#ff3b30', redLight: '#fff0ef',
  gray50: '#f9f9fb', gray100: '#f2f2f7', gray200: '#e5e5ea',
  gray400: '#aeaeb2', gray600: '#636366', gray900: '#1c1c1e',
  white: '#ffffff',
};

export default function PulseBranchDashboard() {
  const { signOut } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [allStats, setAllStats] = useState<Record<string, BranchStats>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'inventory' | 'upload'>('overview');
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [trendFilter, setTrendFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'qty'>('name');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadBranches(); }, []);

  const loadBranches = async () => {
    setLoading(true);
    const { data } = await supabase.from('pharmacies')
      .select('id,clinic_name,location,address,contact,weekday_hours,weekend_hours,status')
      .eq('parent_email', 'ho@pulse.co.bw').order('clinic_name');
    if (data) {
      setBranches(data as Branch[]);
      await loadAllStats(data.map((b: any) => b.clinic_name));
    }
    setLoading(false);
  };

  const loadAllStats = async (names: string[]) => {
    const { data } = await supabase.from('clinic_inventory')
      .select('clinic_name,trend').in('clinic_name', names).gt('quantity', 0);
    const map: Record<string, BranchStats> = {};
    for (const row of data || []) {
      if (!map[row.clinic_name]) map[row.clinic_name] = { total: 0, stable: 0, low: 0, depleting: 0 };
      map[row.clinic_name].total++;
      if (row.trend === 'Stable') map[row.clinic_name].stable++;
      else if (row.trend === 'Low Stock') map[row.clinic_name].low++;
      else map[row.clinic_name].depleting++;
    }
    setAllStats(map);
  };

  const selectBranch = async (branch: Branch) => {
    setSelectedBranch(branch);
    setActiveView('inventory');
    setSearch(''); setTrendFilter('all');
    setInventoryLoading(true);
    const { data } = await supabase.from('clinic_inventory')
      .select('id,med_name,category,quantity,trend,pack_size,atc_code')
      .eq('clinic_name', branch.clinic_name).order('med_name');
    setInventory((data as InventoryItem[]) || []);
    setStats(allStats[branch.clinic_name] || { total: 0, stable: 0, low: 0, depleting: 0 });
    setInventoryLoading(false);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!selectedBranch || !file) return;
    setIsUploading(true); setUploadProgress(5); setUploadStatus(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        if (rawRows[i]?.some((c: any) => String(c).toUpperCase().includes('DESCR'))) { headerIdx = i; break; }
      }
      if (headerIdx === -1) { setUploadStatus({ type: 'error', msg: 'Could not find header row. File must contain a DESCR column.' }); setIsUploading(false); return; }
      const headers = rawRows[headerIdx].map((h: any) => String(h).toUpperCase().trim());
      const descrIdx = headers.findIndex((h: string) => h.includes('DESCR'));
      const stockIdx = headers.findIndex((h: string) => h.includes('STOCKOH'));
      const packIdx = headers.findIndex((h: string) => h.includes('PACKSIZE'));
      const stockcdIdx = headers.findIndex((h: string) => h.includes('STOCKCD'));
      const depdescIdx = headers.findIndex((h: string) => h.includes('DEPDESCR'));
      if (descrIdx === -1 || stockIdx === -1) { setUploadStatus({ type: 'error', msg: 'Missing required columns: DESCR and STOCKOH.' }); setIsUploading(false); return; }
      const rows = rawRows.slice(headerIdx + 1)
        .filter(r => r?.[descrIdx] && String(r[descrIdx]).trim())
        .map(r => {
          const qty = parseFloat(String(r[stockIdx] || 0)) || 0;
          const dep = depdescIdx >= 0 ? String(r[depdescIdx] || '').toUpperCase() : '';
          const category = dep.includes('FRONT') ? 'Front Shop' : dep.includes('S4') ? 'Schedule 4' : 'Pharmacy';
          const trend = qty < 20 ? 'Depleting Fast' : qty < 50 ? 'Low Stock' : 'Stable';
          return {
            clinic_name: selectedBranch.clinic_name,
            med_name: String(r[descrIdx]).replace(/_x000D_/g, '').replace(/[\r\n]/g, '').trim(),
            category, quantity: Math.floor(qty), trend,
            strength: '', dosage_form: '',
            pack_size: packIdx >= 0 ? String(parseInt(r[packIdx]) || 1) : '1',
            atc_code: stockcdIdx >= 0 ? String(r[stockcdIdx] || '') : '',
            atc_description: String(r[descrIdx]).trim(),
            facility_level: 'Pharmacy',
            location: selectedBranch.location || '',
            contact: selectedBranch.contact || '',
            directions_link: '',
          };
        })
        .filter(r => r.quantity > 0);
      setUploadProgress(20);
      if (uploadMode === 'replace') {
        setUploadStatus({ type: 'info', msg: `Clearing existing stock for ${selectedBranch.clinic_name}...` });
        const { error: delErr } = await supabase.from('clinic_inventory').delete().eq('clinic_name', selectedBranch.clinic_name);
        if (delErr) { setUploadStatus({ type: 'error', msg: `Delete failed: ${delErr.message}` }); setIsUploading(false); return; }
      }
      setUploadProgress(35);
      setUploadStatus({ type: 'info', msg: `Uploading ${rows.length} items...` });
      const BATCH = 400;
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from('clinic_inventory').insert(rows.slice(i, i + BATCH));
        if (error) { setUploadStatus({ type: 'error', msg: `Upload error at row ${i}: ${error.message}` }); setIsUploading(false); return; }
        setUploadProgress(35 + Math.floor(((i + BATCH) / rows.length) * 60));
      }
      setUploadProgress(100);
      setUploadStatus({ type: 'success', msg: `${rows.length.toLocaleString()} items uploaded for ${selectedBranch.clinic_name}.` });
      await selectBranch(selectedBranch);
      await loadAllStats(branches.map(b => b.clinic_name));
    } catch (e: any) {
      setUploadStatus({ type: 'error', msg: `Error: ${e.message}` });
    }
    setIsUploading(false);
  }, [selectedBranch, uploadMode, branches]);

  const filtered = inventory.filter(i => {
    const ms = i.med_name.toLowerCase().includes(search.toLowerCase());
    const mt = trendFilter === 'all' || i.trend === trendFilter;
    return ms && mt;
  }).sort((a, b) => sortBy === 'qty' ? a.quantity - b.quantity : a.med_name.localeCompare(b.med_name));

  const net = branches.reduce((a, b) => {
    const s = allStats[b.clinic_name];
    if (s) { a.total += s.total; a.stable += s.stable; a.low += s.low; a.depleting += s.depleting; }
    return a;
  }, { total: 0, stable: 0, low: 0, depleting: 0 });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.gray50, fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.gray200}`, borderTopColor: COLORS.blue, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: COLORS.gray600, fontSize: 13, fontWeight: 500 }}>Loading Pulse Network</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} * {box-sizing:border-box} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#d1d1d6;border-radius:4px}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system,"SF Pro Display","Helvetica Neue",sans-serif', background: COLORS.gray50, overflow: 'hidden' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#c7c7cc;border-radius:4px}
        .row-hover:hover{background:#f2f2f7!important}
        .branch-card:hover{background:#f2f2f7!important;transform:translateY(-1px)}
        .nav-btn:hover{background:rgba(0,113,227,0.08)!important}
        .btn-ghost:hover{background:${COLORS.gray100}!important}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, flexShrink: 0, height: '100vh', background: COLORS.white, borderRight: `1px solid ${COLORS.gray200}`, display: 'flex', flexDirection: 'column' }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${COLORS.gray100}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.blue} 0%, #0058b0 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray900, letterSpacing: -0.3 }}>Pulse HQ</div>
              <div style={{ fontSize: 11, color: COLORS.gray400 }}>{branches.length} branches</div>
            </div>
          </div>
        </div>

        {/* Network health pill */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${COLORS.gray100}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.gray400, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Network Health</div>
          <div style={{ height: 5, borderRadius: 5, background: COLORS.gray100, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${net.total ? (net.stable / net.total) * 100 : 0}%`, background: COLORS.green, transition: 'width 0.4s' }} />
            <div style={{ width: `${net.total ? (net.low / net.total) * 100 : 0}%`, background: COLORS.amber }} />
            <div style={{ width: `${net.total ? (net.depleting / net.total) * 100 : 0}%`, background: COLORS.red }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 10, color: COLORS.gray600 }}>{net.total.toLocaleString()} SKUs</span>
            {net.depleting > 0 && <span style={{ fontSize: 10, color: COLORS.red, fontWeight: 600 }}>{net.depleting} critical</span>}
          </div>
        </div>

        {/* Nav: Overview */}
        <div style={{ padding: '8px 10px 4px' }}>
          <button className="nav-btn" onClick={() => { setActiveView('overview'); setSelectedBranch(null); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', background: activeView === 'overview' && !selectedBranch ? COLORS.blueLight : 'transparent', transition: 'background 0.15s' }}>
            <LayoutGrid size={15} color={activeView === 'overview' && !selectedBranch ? COLORS.blue : COLORS.gray600} />
            <span style={{ fontSize: 13, fontWeight: 600, color: activeView === 'overview' && !selectedBranch ? COLORS.blue : COLORS.gray900 }}>All Branches</span>
          </button>
        </div>

        <div style={{ padding: '4px 20px 4px', fontSize: 10, fontWeight: 600, color: COLORS.gray400, letterSpacing: 0.8, textTransform: 'uppercase' }}>Branches</div>

        {/* Branch list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 10px 10px' }}>
          {branches.map(b => {
            const s = allStats[b.clinic_name];
            const isActive = selectedBranch?.id === b.id;
            const dotColor = s?.depleting ? COLORS.red : s?.low ? COLORS.amber : COLORS.green;
            return (
              <button key={b.id} className="nav-btn" onClick={() => selectBranch(b)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', background: isActive ? COLORS.blueLight : 'transparent', marginBottom: 1, transition: 'background 0.15s' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? COLORS.blue : COLORS.gray900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.clinic_name.replace('Pulse Pharmacy ', '')}
                  </div>
                  {s && <div style={{ fontSize: 10, color: COLORS.gray400 }}>{s.total} items</div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sign out */}
        <div style={{ padding: '12px 10px', borderTop: `1px solid ${COLORS.gray100}` }}>
          <button className="nav-btn" onClick={signOut}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent' }}>
            <LogOut size={14} color={COLORS.gray600} />
            <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.gray600 }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 56, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${COLORS.gray200}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: COLORS.gray900, margin: 0, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedBranch ? selectedBranch.clinic_name : 'Pulse Pharmacy Network'}
            </h1>
            {selectedBranch && (
              <p style={{ fontSize: 11, color: COLORS.gray600, margin: 0 }}>
                {selectedBranch.weekday_hours || selectedBranch.location || ''}
              </p>
            )}
          </div>
          {selectedBranch && (
            <div style={{ display: 'flex', background: COLORS.gray100, borderRadius: 10, padding: 3, gap: 2 }}>
              {(['inventory', 'upload'] as const).map(v => (
                <button key={v} onClick={() => setActiveView(v)}
                  style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeView === v ? COLORS.white : 'transparent', color: activeView === v ? COLORS.gray900 : COLORS.gray600, boxShadow: activeView === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                  {v === 'inventory' ? 'Inventory' : 'Upload'}
                </button>
              ))}
            </div>
          )}
          <button className="btn-ghost" onClick={loadBranches} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, color: COLORS.gray600, display: 'flex' }}>
            <RefreshCw size={14} />
          </button>
        </header>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, animation: 'fadeUp 0.2s ease' }}>

          {/* ── OVERVIEW ── */}
          {(activeView === 'overview' || !selectedBranch) && (
            <>
              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Branches', value: branches.length, icon: LayoutGrid, color: COLORS.blue, bg: COLORS.blueLight },
                  { label: 'Total SKUs', value: net.total.toLocaleString(), icon: Package, color: COLORS.green, bg: COLORS.greenLight },
                  { label: 'Low Stock', value: net.low, icon: AlertTriangle, color: COLORS.amber, bg: COLORS.amberLight },
                  { label: 'Critical', value: net.depleting, icon: TrendingDown, color: COLORS.red, bg: COLORS.redLight },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} style={{ background: COLORS.white, borderRadius: 14, padding: '18px 20px', border: `1px solid ${COLORS.gray200}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.gray600, letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</span>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={14} color={color} />
                      </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.gray900, letterSpacing: -1 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Branch grid */}
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray600, marginBottom: 12 }}>
                All Branches <span style={{ color: COLORS.gray400, fontWeight: 400 }}>({branches.length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
                {branches.map(b => {
                  const s = allStats[b.clinic_name];
                  const health = s?.total ? Math.round((s.stable / s.total) * 100) : 0;
                  const hColor = health >= 70 ? COLORS.green : health >= 40 ? COLORS.amber : COLORS.red;
                  return (
                    <div key={b.id} className="branch-card" onClick={() => selectBranch(b)}
                      style={{ background: COLORS.white, borderRadius: 14, padding: '18px 20px', border: `1px solid ${COLORS.gray200}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray900, letterSpacing: -0.2, marginBottom: 2 }}>
                            {b.clinic_name.replace('Pulse Pharmacy ', '')}
                          </div>
                          <div style={{ fontSize: 11, color: COLORS.gray600 }}>{b.location || 'Botswana'}</div>
                        </div>
                        <div style={{ padding: '3px 10px', borderRadius: 20, background: `${hColor}15`, border: `1px solid ${hColor}40` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: hColor }}>{health}%</span>
                        </div>
                      </div>
                      {s?.total ? (
                        <>
                          <div style={{ height: 4, borderRadius: 4, background: COLORS.gray100, overflow: 'hidden', marginBottom: 14, display: 'flex' }}>
                            <div style={{ width: `${(s.stable / s.total) * 100}%`, background: COLORS.green }} />
                            <div style={{ width: `${(s.low / s.total) * 100}%`, background: COLORS.amber }} />
                            <div style={{ width: `${(s.depleting / s.total) * 100}%`, background: COLORS.red }} />
                          </div>
                          <div style={{ display: 'flex', gap: 18 }}>
                            {[{ l: 'Stable', v: s.stable, c: COLORS.green }, { l: 'Low', v: s.low, c: COLORS.amber }, { l: 'Critical', v: s.depleting, c: COLORS.red }].map(({ l, v, c }) => (
                              <div key={l}>
                                <div style={{ fontSize: 17, fontWeight: 700, color: c, letterSpacing: -0.5 }}>{v}</div>
                                <div style={{ fontSize: 10, color: COLORS.gray400 }}>{l}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: COLORS.gray400, fontStyle: 'italic' }}>No inventory — upload to activate</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.blue, display: 'flex', alignItems: 'center', gap: 3 }}>
                          View <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── INVENTORY ── */}
          {activeView === 'inventory' && selectedBranch && (
            <>
              {/* Branch info banner */}
              <div style={{ background: COLORS.white, borderRadius: 14, padding: '16px 20px', border: `1px solid ${COLORS.gray200}`, marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {selectedBranch.weekday_hours && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} color={COLORS.gray600} />
                    <span style={{ fontSize: 12, color: COLORS.gray900, fontWeight: 500 }}>{selectedBranch.weekday_hours}</span>
                    {selectedBranch.weekend_hours && <span style={{ fontSize: 12, color: COLORS.gray600 }}>· {selectedBranch.weekend_hours}</span>}
                  </div>
                )}
                {selectedBranch.contact && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} color={COLORS.gray600} />
                    <span style={{ fontSize: 12, color: COLORS.gray900, fontWeight: 500 }}>{selectedBranch.contact}</span>
                  </div>
                )}
                {selectedBranch.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color={COLORS.gray600} />
                    <span style={{ fontSize: 12, color: COLORS.gray900 }}>{selectedBranch.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { l: 'Total Items', v: stats.total, c: COLORS.blue, bg: COLORS.blueLight },
                    { l: 'Stable', v: stats.stable, c: COLORS.green, bg: COLORS.greenLight },
                    { l: 'Low Stock', v: stats.low, c: COLORS.amber, bg: COLORS.amberLight },
                    { l: 'Critical', v: stats.depleting, c: COLORS.red, bg: COLORS.redLight },
                  ].map(({ l, v, c, bg }) => (
                    <div key={l} style={{ background: COLORS.white, borderRadius: 12, padding: '14px 16px', border: `1px solid ${COLORS.gray200}` }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.gray600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{l}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: c, letterSpacing: -0.5 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: COLORS.gray400 }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicines..."
                    style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 9, border: `1px solid ${COLORS.gray200}`, fontSize: 13, outline: 'none', background: COLORS.white, color: COLORS.gray900 }} />
                </div>
                {/* Solid color filter buttons */}
                {['all', 'Stable', 'Low Stock', 'Depleting Fast'].map(f => {
                  const active = trendFilter === f;
                  const fColor = f === 'Stable' ? COLORS.green : f === 'Low Stock' ? COLORS.amber : f === 'Depleting Fast' ? COLORS.red : COLORS.blue;
                  return (
                    <button key={f} onClick={() => setTrendFilter(f)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: active ? fColor : COLORS.gray100, color: active ? COLORS.white : COLORS.gray600, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {f === 'all' ? 'All' : f === 'Depleting Fast' ? 'Critical' : f}
                    </button>
                  );
                })}
                <button onClick={() => setSortBy(sortBy === 'name' ? 'qty' : 'name')}
                  style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${COLORS.gray200}`, background: COLORS.white, color: COLORS.gray600, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {sortBy === 'name' ? 'A–Z' : 'Qty ↑'}
                </button>
              </div>

              <div style={{ fontSize: 11, color: COLORS.gray400, marginBottom: 10 }}>{filtered.length} of {inventory.length} items</div>

              {/* Table */}
              {inventoryLoading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ width: 28, height: 28, border: `3px solid ${COLORS.gray200}`, borderTopColor: COLORS.blue, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ color: COLORS.gray400, fontSize: 13 }}>Loading inventory...</p>
                </div>
              ) : (
                <div style={{ background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.gray200}`, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 110px', padding: '10px 20px', borderBottom: `1px solid ${COLORS.gray100}`, background: COLORS.gray50 }}>
                    {['Medicine', 'Category', 'Qty', 'Status'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray400, letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {filtered.slice(0, 200).map((item, i) => {
                    const tc = item.trend === 'Stable' ? COLORS.green : item.trend === 'Low Stock' ? COLORS.amber : COLORS.red;
                    const tbg = item.trend === 'Stable' ? COLORS.greenLight : item.trend === 'Low Stock' ? COLORS.amberLight : COLORS.redLight;
                    return (
                      <div key={item.id} className="row-hover"
                        style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 110px', padding: '10px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.gray100}` : 'none', alignItems: 'center', transition: 'background 0.1s' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.gray900 }}>{item.med_name}</div>
                          {item.pack_size && <div style={{ fontSize: 10, color: COLORS.gray400 }}>Pack: {item.pack_size}</div>}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.gray600 }}>{item.category}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: item.quantity === 0 ? COLORS.red : COLORS.gray900 }}>{item.quantity}</div>
                        <div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: tbg, color: tc }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: tc, flexShrink: 0 }} />
                            {item.trend === 'Depleting Fast' ? 'Critical' : item.trend}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length > 200 && (
                    <div style={{ padding: '14px 20px', textAlign: 'center', color: COLORS.gray400, fontSize: 12, borderTop: `1px solid ${COLORS.gray100}` }}>
                      Showing 200 of {filtered.length} — use search to narrow results
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── UPLOAD ── */}
          {activeView === 'upload' && selectedBranch && (
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{ background: COLORS.white, borderRadius: 16, border: `1px solid ${COLORS.gray200}`, overflow: 'hidden' }}>
                <div style={{ padding: '22px 26px', borderBottom: `1px solid ${COLORS.gray100}` }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.gray900, letterSpacing: -0.3, marginBottom: 3 }}>
                    Upload Stock — {selectedBranch.clinic_name.replace('Pulse Pharmacy ', '')}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.gray600 }}>
                    Drop the daily Stocktotals Excel file. Stock updates instantly across WhatsApp and web.
                  </div>
                </div>
                <div style={{ padding: '22px 26px' }}>
                  {/* Upload mode — solid color toggle */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Upload Mode</div>
                    <div style={{ display: 'flex', background: COLORS.gray100, borderRadius: 10, padding: 3, gap: 3 }}>
                      {([
                        { mode: 'replace', label: 'Replace Stock', sub: 'Clear old, insert fresh — best for daily uploads' },
                        { mode: 'merge', label: 'Merge / Add', sub: 'Keep existing, add new items only' },
                      ] as const).map(({ mode, label, sub }) => (
                        <button key={mode} onClick={() => setUploadMode(mode)}
                          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', background: uploadMode === mode ? COLORS.white : 'transparent', boxShadow: uploadMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: uploadMode === mode ? COLORS.gray900 : COLORS.gray600, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 11, color: COLORS.gray400, lineHeight: 1.4 }}>{sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDrop={e => { e.preventDefault(); setDragOver(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileRef.current?.click()}
                    style={{ border: `2px dashed ${dragOver ? COLORS.blue : COLORS.gray200}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? COLORS.blueLight : COLORS.gray50, transition: 'all 0.2s', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.blueLight, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Upload size={20} color={COLORS.blue} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.gray900, marginBottom: 4 }}>
                      {dragOver ? 'Release to upload' : 'Drop your file here'}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.gray400 }}>or click to browse · .xlsx .xls .csv</div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>

                  {/* Progress */}
                  {isUploading && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: COLORS.gray900, fontWeight: 600 }}>Uploading...</span>
                        <span style={{ fontSize: 12, color: COLORS.blue, fontWeight: 700 }}>{uploadProgress}%</span>
                      </div>
                      <div style={{ height: 5, background: COLORS.gray100, borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: COLORS.blue, borderRadius: 5, width: `${uploadProgress}%`, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  {uploadStatus && !isUploading && (
                    <div style={{
                      padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                      background: uploadStatus.type === 'success' ? COLORS.greenLight : uploadStatus.type === 'error' ? COLORS.redLight : COLORS.blueLight,
                      color: uploadStatus.type === 'success' ? COLORS.green : uploadStatus.type === 'error' ? COLORS.red : COLORS.blue,
                      border: `1px solid ${uploadStatus.type === 'success' ? '#a3e6b0' : uploadStatus.type === 'error' ? '#ffb3ae' : '#b3d1f7'}`
                    }}>
                      {uploadStatus.type === 'success' ? '✓ ' : uploadStatus.type === 'error' ? '✕ ' : ''}{uploadStatus.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily guide */}
              <div style={{ marginTop: 16, background: COLORS.white, borderRadius: 16, border: `1px solid ${COLORS.gray200}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 22px', borderBottom: `1px solid ${COLORS.gray100}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray900 }}>Daily Upload Workflow</div>
                </div>
                <div style={{ padding: '18px 22px' }}>
                  {[
                    { n: '1', t: 'Export from POS', d: 'Run Stocktotals / Stock On Hand from your pharmacy system (Nexus, Medinol, etc.) and save as Excel.' },
                    { n: '2', t: 'Select your branch', d: 'Log in to ChekaMeds portal, click your branch in the sidebar, tap Upload.' },
                    { n: '3', t: 'Drop the file', d: 'Use Replace Stock mode. Old numbers clear, fresh file inserts — done in under 30 seconds.' },
                    { n: '4', t: 'Live immediately', d: 'WhatsApp searches and web results update instantly with the new quantities.' },
                  ].map(({ n, t, d }) => (
                    <div key={n} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: COLORS.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.blue }}>{n}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.gray900, marginBottom: 3 }}>{t}</div>
                        <div style={{ fontSize: 12, color: COLORS.gray600, lineHeight: 1.5 }}>{d}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '13px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>Pro tip — automate it</div>
                    <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                      Ask your IT team to schedule the POS export at 7am daily. We can build an auto-import endpoint so stock updates itself every morning with zero manual action.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
