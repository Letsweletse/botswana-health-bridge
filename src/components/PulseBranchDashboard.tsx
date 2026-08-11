import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import {
  Building2, Package, TrendingDown, AlertTriangle,
  ChevronRight, Upload, Search, RefreshCw, MapPin,
  Clock, Phone, CheckCircle, LayoutGrid, List,
  ArrowUpRight, Activity, Zap, Shield, X, Menu,
  CloudUpload, BarChart3, Circle, ChevronDown, ChevronUp
} from 'lucide-react';

type Branch = {
  id: string;
  clinic_name: string;
  location: string;
  address: string;
  contact: string;
  weekday_hours: string;
  weekend_hours: string;
  status: string;
};

type InventoryItem = {
  id: string;
  med_name: string;
  category: string;
  quantity: number;
  trend: string;
  pack_size: string;
  atc_code: string;
};

type BranchStats = { total: number; stable: number; low: number; depleting: number };

export default function PulseBranchDashboard() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [allStats, setAllStats] = useState<Record<string, BranchStats>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'inventory' | 'upload'>('overview');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity'>('name');
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { loadBranches(); }, []);

  const loadBranches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pharmacies')
      .select('id, clinic_name, location, address, contact, weekday_hours, weekend_hours, status')
      .eq('parent_email', 'ho@pulse.co.bw')
      .order('clinic_name');
    if (error) console.error('Branch load error:', error);
    if (data && data.length > 0) {
      setBranches(data as Branch[]);
      await loadAllStats(data.map((b: any) => b.clinic_name));
    }
    setLoading(false);
  };

  const loadAllStats = async (names: string[]) => {
    const { data, error } = await supabase
      .from('clinic_inventory')
      .select('clinic_name, trend')
      .in('clinic_name', names)
      .gt('quantity', 0);
    if (error) return;
    const map: Record<string, BranchStats> = {};
    for (const row of (data || [])) {
      if (!map[row.clinic_name]) map[row.clinic_name] = { total: 0, stable: 0, low: 0, depleting: 0 };
      map[row.clinic_name].total++;
      if (row.trend === 'Stable') map[row.clinic_name].stable++;
      else if (row.trend === 'Low Stock') map[row.clinic_name].low++;
      else if (row.trend === 'Depleting Fast') map[row.clinic_name].depleting++;
    }
    setAllStats(map);
  };

  const selectBranch = async (branch: Branch) => {
    setSelectedBranch(branch);
    setActiveView('inventory');
    setSearch('');
    setTrendFilter('all');
    setInventoryLoading(true);
    const { data, error } = await supabase
      .from('clinic_inventory')
      .select('id, med_name, category, quantity, trend, pack_size, atc_code')
      .eq('clinic_name', branch.clinic_name)
      .order('med_name');
    if (error) console.error('Inventory load error:', error);
    setInventory((data as InventoryItem[]) || []);
    const s = allStats[branch.clinic_name] || { total: 0, stable: 0, low: 0, depleting: 0 };
    setStats(s);
    setInventoryLoading(false);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!selectedBranch) return;
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Reading file...');

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Find header row
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const row = rawRows[i];
        if (row && row.some((c: any) => String(c).toLowerCase().includes('descr'))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) { setUploadStatus('❌ Could not find header row. Expected DESCR column.'); setIsUploading(false); return; }

      const headers = rawRows[headerIdx].map((h: any) => String(h).toUpperCase().trim());
      const descrIdx = headers.findIndex((h: string) => h.includes('DESCR'));
      const stockIdx = headers.findIndex((h: string) => h.includes('STOCKOH'));
      const packIdx = headers.findIndex((h: string) => h.includes('PACKSIZE'));
      const stockcdIdx = headers.findIndex((h: string) => h.includes('STOCKCD'));
      const depdescIdx = headers.findIndex((h: string) => h.includes('DEPDESCR'));

      if (descrIdx === -1 || stockIdx === -1) {
        setUploadStatus('❌ Missing required columns: DESCR, STOCKOH');
        setIsUploading(false);
        return;
      }

      const rows = rawRows.slice(headerIdx + 1)
        .filter(r => r && r[descrIdx] && String(r[descrIdx]).trim())
        .map(r => {
          const qty = parseFloat(String(r[stockIdx] || 0)) || 0;
          const dep = depdescIdx >= 0 ? String(r[depdescIdx] || '').toUpperCase() : '';
          const category = dep.includes('FRONT') ? 'Front Shop' :
            (dep.includes('S4') || dep.includes('VATABLE')) ? 'Schedule 4' : 'Pharmacy';
          const trend = qty < 20 ? 'Depleting Fast' : qty < 50 ? 'Low Stock' : 'Stable';
          const name = String(r[descrIdx]).replace(/_x000D_/g, '').replace(/[\r\n]/g, '').trim();
          return {
            clinic_name: selectedBranch.clinic_name,
            med_name: name,
            category,
            quantity: Math.floor(qty),
            trend,
            strength: '',
            dosage_form: '',
            pack_size: packIdx >= 0 ? String(parseInt(r[packIdx]) || 1) : '1',
            atc_code: stockcdIdx >= 0 ? String(r[stockcdIdx] || '') : '',
            atc_description: name,
            facility_level: 'Pharmacy',
            location: selectedBranch.location || '',
            contact: selectedBranch.contact || '',
            directions_link: '',
          };
        })
        .filter(r => r.quantity > 0);

      setUploadProgress(20);

      if (uploadMode === 'replace') {
        setUploadStatus(`Clearing old stock for ${selectedBranch.clinic_name}...`);
        const { error: delErr } = await supabase
          .from('clinic_inventory')
          .delete()
          .eq('clinic_name', selectedBranch.clinic_name);
        if (delErr) { setUploadStatus(`❌ Delete error: ${delErr.message}`); setIsUploading(false); return; }
      }

      setUploadProgress(35);
      setUploadStatus(`Uploading ${rows.length} items...`);

      const BATCH = 400;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error: insErr } = await supabase.from('clinic_inventory').insert(batch);
        if (insErr) { setUploadStatus(`❌ Insert error at row ${i}: ${insErr.message}`); setIsUploading(false); return; }
        setUploadProgress(35 + Math.floor(((i + BATCH) / rows.length) * 60));
      }

      setUploadProgress(100);
      setUploadStatus(`✅ ${rows.length} items uploaded successfully for ${selectedBranch.clinic_name}!`);

      // Reload
      await selectBranch(selectedBranch);
      await loadAllStats(branches.map(b => b.clinic_name));
    } catch (e: any) {
      setUploadStatus(`❌ Error: ${e.message}`);
    }
    setIsUploading(false);
  }, [selectedBranch, uploadMode, branches]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const filteredInventory = inventory
    .filter(item => {
      const matchSearch = item.med_name.toLowerCase().includes(search.toLowerCase());
      const matchTrend = trendFilter === 'all' || item.trend === trendFilter;
      return matchSearch && matchTrend;
    })
    .sort((a, b) => {
      if (sortBy === 'quantity') return a.quantity - b.quantity;
      return a.med_name.localeCompare(b.med_name);
    });

  const totalBranchStats = branches.reduce((acc, b) => {
    const s = allStats[b.clinic_name];
    if (s) { acc.total += s.total; acc.depleting += s.depleting; acc.low += s.low; acc.stable += s.stable; }
    return acc;
  }, { total: 0, stable: 0, low: 0, depleting: 0 });

  const trendColor = (t: string) => {
    if (t === 'Stable') return '#16a34a';
    if (t === 'Low Stock') return '#d97706';
    return '#dc2626';
  };

  const trendBg = (t: string) => {
    if (t === 'Stable') return '#f0fdf4';
    if (t === 'Low Stock') return '#fffbeb';
    return '#fef2f2';
  };

  const trendDot = (t: string) => {
    if (t === 'Stable') return '#16a34a';
    if (t === 'Low Stock') return '#d97706';
    return '#dc2626';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0066cc', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, letterSpacing: 0.2 }}>Loading Pulse Network</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const SIDEBAR_W = sidebarOpen ? 260 : 64;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif', background: '#f5f5f7', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .branch-row:hover { background: #f0f4ff !important; }
        .inv-row:hover { background: #f9fafb !important; }
        .nav-item:hover { background: rgba(0,102,204,0.08) !important; }
        .btn-primary:hover { background: #0050a0 !important; }
        .btn-ghost:hover { background: #f3f4f6 !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: SIDEBAR_W, minWidth: SIDEBAR_W, height: '100vh', background: '#fff',
        borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease', overflow: 'hidden', flexShrink: 0,
        boxShadow: '1px 0 0 #f0f0f0'
      }}>
        {/* Logo area */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #0066cc 0%, #0044aa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Activity size={16} color="#fff" />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: -0.3 }}>Pulse HQ</div>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 0.1 }}>{branches.length} branches</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost"
            style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#6b7280', flexShrink: 0 }}
          >
            <Menu size={16} />
          </button>
        </div>

        {/* Overview nav item */}
        <div style={{ padding: '8px 8px 4px' }}>
          <button
            className="nav-item"
            onClick={() => { setActiveView('overview'); setSelectedBranch(null); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeView === 'overview' && !selectedBranch ? 'rgba(0,102,204,0.1)' : 'transparent',
              color: activeView === 'overview' && !selectedBranch ? '#0066cc' : '#374151',
              transition: 'background 0.15s'
            }}
          >
            <LayoutGrid size={16} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>All Branches</span>}
          </button>
        </div>

        <div style={{ padding: '4px 8px 2px 12px' }}>
          {sidebarOpen && <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>Branches</span>}
        </div>

        {/* Branch list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 8px 8px' }}>
          {branches.map(branch => {
            const s = allStats[branch.clinic_name];
            const isSelected = selectedBranch?.id === branch.id;
            const shortName = branch.clinic_name.replace('Pulse Pharmacy ', '');
            return (
              <button
                key={branch.id}
                className="nav-item"
                onClick={() => selectBranch(branch)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? 'rgba(0,102,204,0.1)' : 'transparent',
                  color: isSelected ? '#0066cc' : '#374151',
                  transition: 'background 0.15s', marginBottom: 1
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: s && s.depleting > 0 ? '#ef4444' : s && s.low > 0 ? '#f59e0b' : '#10b981'
                }} />
                {sidebarOpen && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isSelected ? 600 : 500, letterSpacing: -0.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {shortName}
                    </div>
                    {s && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{s.total} items</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom - network health */}
        {sidebarOpen && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Network Health</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ flex: totalBranchStats.stable, height: 4, background: '#10b981', borderRadius: 4 }} />
              <div style={{ flex: totalBranchStats.low, height: 4, background: '#f59e0b', borderRadius: 4 }} />
              <div style={{ flex: totalBranchStats.depleting, height: 4, background: '#ef4444', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: '#6b7280' }}>{totalBranchStats.total.toLocaleString()} total SKUs</span>
              <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>{totalBranchStats.depleting} alerts</span>
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: 56, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 16, flexShrink: 0
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: -0.4 }}>
              {selectedBranch ? selectedBranch.clinic_name : 'Pulse Pharmacy Network'}
            </h1>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0, letterSpacing: 0.1 }}>
              {selectedBranch
                ? `${selectedBranch.location || ''} · ${selectedBranch.contact || ''}`
                : `${branches.length} branches · Botswana`
              }
            </p>
          </div>

          {selectedBranch && (
            <div style={{ display: 'flex', gap: 6 }}>
              {(['inventory', 'upload'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  style={{
                    padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, letterSpacing: -0.1,
                    background: activeView === view ? '#0066cc' : 'transparent',
                    color: activeView === view ? '#fff' : '#6b7280',
                    transition: 'all 0.15s'
                  }}
                >
                  {view === 'inventory' ? '📦 Inventory' : '⬆ Upload'}
                </button>
              ))}
            </div>
          )}

          <button onClick={loadBranches} className="btn-ghost" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, color: '#6b7280' }}>
            <RefreshCw size={15} />
          </button>
        </header>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, animation: 'fadeIn 0.2s ease' }}>

          {/* ── OVERVIEW VIEW ── */}
          {(activeView === 'overview' || !selectedBranch) && (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Total Branches', value: branches.length, icon: Building2, color: '#0066cc', bg: '#eff6ff' },
                  { label: 'Network SKUs', value: totalBranchStats.total.toLocaleString(), icon: Package, color: '#059669', bg: '#f0fdf4' },
                  { label: 'Low Stock Alerts', value: totalBranchStats.low, icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
                  { label: 'Critical Alerts', value: totalBranchStats.depleting, icon: TrendingDown, color: '#dc2626', bg: '#fef2f2' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</span>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={15} color={color} />
                      </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: -1 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Branch grid */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 14, letterSpacing: -0.1 }}>
                All Branches <span style={{ color: '#9ca3af', fontWeight: 500 }}>({branches.length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {branches.map(branch => {
                  const s = allStats[branch.clinic_name];
                  const shortName = branch.clinic_name.replace('Pulse Pharmacy ', '');
                  const healthPct = s && s.total > 0 ? Math.round((s.stable / s.total) * 100) : 0;
                  return (
                    <div
                      key={branch.id}
                      className="branch-row"
                      onClick={() => selectBranch(branch)}
                      style={{
                        background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #f0f0f0',
                        cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: -0.3, marginBottom: 3 }}>{shortName}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{branch.location || 'Botswana'}</div>
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20,
                          background: healthPct >= 70 ? '#f0fdf4' : healthPct >= 40 ? '#fffbeb' : '#fef2f2',
                          border: `1px solid ${healthPct >= 70 ? '#bbf7d0' : healthPct >= 40 ? '#fde68a' : '#fecaca'}`
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: healthPct >= 70 ? '#16a34a' : healthPct >= 40 ? '#d97706' : '#dc2626' }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: healthPct >= 70 ? '#16a34a' : healthPct >= 40 ? '#d97706' : '#dc2626' }}>{healthPct}%</span>
                        </div>
                      </div>

                      {s && s.total > 0 ? (
                        <>
                          <div style={{ height: 5, borderRadius: 5, background: '#f3f4f6', overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #10b981 0%, #10b981 100%)', width: `${healthPct}%`, transition: 'width 0.4s ease' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 14 }}>
                            {[
                              { label: 'Stable', val: s.stable, color: '#16a34a' },
                              { label: 'Low', val: s.low, color: '#d97706' },
                              { label: 'Critical', val: s.depleting, color: '#dc2626' },
                            ].map(({ label, val, color }) => (
                              <div key={label}>
                                <div style={{ fontSize: 16, fontWeight: 700, color, letterSpacing: -0.5 }}>{val}</div>
                                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{label}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No inventory data · Upload to activate</div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0066cc' }}>
                          View <ChevronRight size={13} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── INVENTORY VIEW ── */}
          {activeView === 'inventory' && selectedBranch && (
            <>
              {/* Stats row */}
              {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Total Items', value: stats.total, color: '#0066cc', bg: '#eff6ff' },
                    { label: 'Stable', value: stats.stable, color: '#16a34a', bg: '#f0fdf4' },
                    { label: 'Low Stock', value: stats.low, color: '#d97706', bg: '#fffbeb' },
                    { label: 'Critical', value: stats.depleting, color: '#dc2626', bg: '#fef2f2' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: -0.8 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search medicines..."
                    style={{
                      width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid #e5e7eb',
                      fontSize: 13, outline: 'none', background: '#fff', color: '#111827',
                    }}
                  />
                </div>
                {['all', 'Stable', 'Low Stock', 'Depleting Fast'].map(f => (
                  <button
                    key={f}
                    onClick={() => setTrendFilter(f)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: '1px solid',
                      borderColor: trendFilter === f ? '#0066cc' : '#e5e7eb',
                      background: trendFilter === f ? '#eff6ff' : '#fff',
                      color: trendFilter === f ? '#0066cc' : '#6b7280',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
                <button
                  onClick={() => setSortBy(sortBy === 'name' ? 'quantity' : 'name')}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Sort: {sortBy === 'name' ? 'A–Z' : 'Qty ↑'}
                </button>
              </div>

              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
                {filteredInventory.length} of {inventory.length} items
              </div>

              {/* Table */}
              {inventoryLoading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#0066cc', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading inventory...</p>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 110px', padding: '10px 20px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                    {['Medicine', 'Category', 'Stock', 'Status'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {filteredInventory.slice(0, 200).map((item, idx) => (
                    <div
                      key={item.id}
                      className="inv-row"
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 120px 100px 110px',
                        padding: '11px 20px', borderBottom: idx < filteredInventory.length - 1 ? '1px solid #f9fafb' : 'none',
                        transition: 'background 0.1s', alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', letterSpacing: -0.1 }}>{item.med_name}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{item.pack_size ? `Pack: ${item.pack_size}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{item.category}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: item.quantity === 0 ? '#dc2626' : '#111827' }}>{item.quantity}</div>
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                          borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: trendBg(item.trend), color: trendColor(item.trend)
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: trendDot(item.trend), flexShrink: 0 }} />
                          {item.trend === 'Depleting Fast' ? 'Critical' : item.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredInventory.length > 200 && (
                    <div style={{ padding: '14px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                      Showing 200 of {filteredInventory.length} — use search to narrow results
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── UPLOAD VIEW ── */}
          {activeView === 'upload' && selectedBranch && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '24px 28px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: -0.5, marginBottom: 4 }}>
                    Upload Stock for {selectedBranch.clinic_name.replace('Pulse Pharmacy ', '')}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                    Drop your daily stocktake Excel or CSV file. Stock numbers update instantly across the platform.
                  </div>
                </div>

                <div style={{ padding: '24px 28px' }}>
                  {/* Upload mode toggle */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 }}>Upload Mode</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {([
                        { mode: 'replace', title: 'Replace Stock', desc: 'Clear old data, insert fresh numbers. Best for daily uploads.', icon: '🔄' },
                        { mode: 'merge', title: 'Merge / Add', desc: 'Keep existing items, only add new ones from the file.', icon: '➕' },
                      ] as const).map(({ mode, title, desc, icon }) => (
                        <button
                          key={mode}
                          onClick={() => setUploadMode(mode)}
                          style={{
                            padding: '14px 16px', borderRadius: 12, border: '2px solid',
                            borderColor: uploadMode === mode ? '#0066cc' : '#e5e7eb',
                            background: uploadMode === mode ? '#eff6ff' : '#fafafa',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: uploadMode === mode ? '#0066cc' : '#111827', letterSpacing: -0.2 }}>{title}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? '#0066cc' : '#d1d5db'}`,
                      borderRadius: 14, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                      background: dragOver ? '#eff6ff' : '#fafafa',
                      transition: 'all 0.2s', marginBottom: 16
                    }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eff6ff', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CloudUpload size={22} color="#0066cc" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                      {dragOver ? 'Release to upload' : 'Drop your file here'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>or click to browse · .xlsx, .xls, .csv</div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>

                  {/* Progress & status */}
                  {isUploading && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Uploading...</span>
                        <span style={{ fontSize: 12, color: '#0066cc', fontWeight: 700 }}>{uploadProgress}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #0066cc, #0050a0)', borderRadius: 6, width: `${uploadProgress}%`, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  )}

                  {uploadStatus && !isUploading && (
                    <div style={{
                      padding: '14px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                      background: uploadStatus.startsWith('✅') ? '#f0fdf4' : uploadStatus.startsWith('❌') ? '#fef2f2' : '#eff6ff',
                      color: uploadStatus.startsWith('✅') ? '#16a34a' : uploadStatus.startsWith('❌') ? '#dc2626' : '#0066cc',
                      border: `1px solid ${uploadStatus.startsWith('✅') ? '#bbf7d0' : uploadStatus.startsWith('❌') ? '#fecaca' : '#bfdbfe'}`
                    }}>
                      {uploadStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily upload guide */}
              <div style={{ marginTop: 20, background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: -0.3 }}>📅 Daily Stock Update Workflow</div>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, fontWeight: 500 }}>
                    <strong>Recommended:</strong> Each morning, after your POS system runs end-of-day reports:
                  </div>
                  {[
                    { step: '1', title: 'Export from your POS', desc: 'Run the Stocktotals or Stock On Hand report from your pharmacy system (Nexus, Medinol, etc.) and save as Excel.' },
                    { step: '2', title: 'Open ChekaMeds portal', desc: 'Log in here, select your branch from the sidebar, and tap Upload.' },
                    { step: '3', title: 'Drop the file', desc: 'Use Replace Stock mode. The system deletes old numbers and inserts the fresh file — takes under 30 seconds.' },
                    { step: '4', title: 'Done — customers see live stock', desc: 'WhatsApp searches, web searches, and the patient-facing app immediately show the updated quantities.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} style={{ display: 'flex', gap: 14, marginTop: 16 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#0066cc' }}>{step}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: -0.2, marginBottom: 3 }}>{title}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 20, padding: '14px 16px', background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>💡 Pro tip: Automate it</div>
                    <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                      Your POS system may support scheduled export via FTP or email. Ask your IT provider to auto-send the stock file each morning. We can then build an auto-import endpoint so you never need to manually upload.
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
