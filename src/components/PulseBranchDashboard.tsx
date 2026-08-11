import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import {
  Building2, Package, TrendingDown, AlertTriangle,
  ChevronRight, Upload, Search, RefreshCw, MapPin,
  Clock, Phone, CheckCircle, Menu, X, Home, Bell
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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBranches();
  }, []);

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
    if (error) { console.error('Stats load error:', error); return; }
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
    setInventoryLoading(true);
    setSearch('');
    const { data, error } = await supabase
      .from('clinic_inventory')
      .select('id, med_name, category, quantity, trend, pack_size, atc_code')
      .eq('clinic_name', branch.clinic_name)
      .gt('quantity', 0)
      .order('med_name')
      .limit(500);
    if (error) console.error('Inventory load error:', error);
    setInventory((data || []) as InventoryItem[]);
    const s = allStats[branch.clinic_name] || { total: 0, stable: 0, low: 0, depleting: 0 };
    setStats(s);
    setInventoryLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBranch) return;
    setUploadStatus('Reading file...');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Find header row
      let headerIdx = rows.findIndex((r: any[]) =>
        r.some((c: any) => String(c).toLowerCase().includes('descr') || String(c).toLowerCase().includes('description'))
      );
      if (headerIdx < 0) headerIdx = 0;
      const headers = rows[headerIdx].map((h: any) => String(h).toLowerCase().trim());

      const getCol = (keywords: string[]) =>
        headers.findIndex((h: string) => keywords.some(k => h.includes(k)));

      const descrIdx = getCol(['descr', 'description', 'name', 'item']);
      const qtyIdx   = getCol(['stock on hand', 'stockoh', 'on hand', 'qty', 'quantity']);
      const packIdx  = getCol(['pack size', 'packsize', 'pack']);
      const codeIdx  = getCol(['stock code', 'stockcd', 'code', 'barcode', 'sku']);
      const depIdx   = getCol(['dep', 'department', 'category', 'dept']);

      if (descrIdx < 0 || qtyIdx < 0) {
        setUploadStatus('❌ Cannot find Description or Quantity columns in this file.');
        return;
      }

      const items = rows
        .slice(headerIdx + 1)
        .filter((r: any[]) => r[descrIdx] && !isNaN(Number(r[qtyIdx])) && Number(r[qtyIdx]) > 0)
        .map((r: any[]) => {
          const qty = Number(r[qtyIdx]) || 0;
          const dep = String(r[depIdx] || '').toUpperCase();
          const category = dep.includes('FRONT') ? 'Front Shop'
            : dep.includes('S4') || dep.includes('VATABLE') ? 'Schedule 4'
            : 'Pharmacy';
          const trend = qty < 20 ? 'Depleting Fast' : qty < 50 ? 'Low Stock' : 'Stable';
          return {
            clinic_name: selectedBranch.clinic_name,
            med_name: String(r[descrIdx]).trim(),
            category,
            quantity: qty,
            trend,
            pack_size: packIdx >= 0 ? String(r[packIdx] || '1') : '1',
            atc_code: codeIdx >= 0 ? String(r[codeIdx] || '') : '',
            atc_description: String(r[descrIdx]).trim(),
            facility_level: 'Pharmacy',
            location: selectedBranch.location || '',
            contact: selectedBranch.contact || '',
          };
        });

      if (!items.length) { setUploadStatus('❌ No valid items found in file.'); return; }
      setUploadStatus(`Clearing old stock...`);
      await supabase.from('clinic_inventory').delete().eq('clinic_name', selectedBranch.clinic_name);

      const batchSize = 200;
      for (let i = 0; i < items.length; i += batchSize) {
        const { error } = await supabase.from('clinic_inventory').insert(items.slice(i, i + batchSize));
        if (error) { setUploadStatus(`❌ Upload error: ${error.message}`); return; }
        setUploadStatus(`Uploading... ${Math.min(i + batchSize, items.length)} / ${items.length}`);
      }

      setUploadStatus(`✅ ${items.length} items uploaded for ${selectedBranch.clinic_name}!`);
      await selectBranch(selectedBranch);
      await loadAllStats(branches.map(b => b.clinic_name));
    } catch (err: any) {
      setUploadStatus(`❌ Error: ${err.message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const filtered = inventory.filter(i =>
    !search ||
    i.med_name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const trendColor = (t: string) =>
    t === 'Stable'         ? 'text-emerald-600 bg-emerald-50' :
    t === 'Low Stock'      ? 'text-amber-600 bg-amber-50' :
                             'text-red-600 bg-red-50';

  const totalAll  = branches.reduce((s, b) => s + (allStats[b.clinic_name]?.total || 0), 0);
  const totalLow  = branches.reduce((s, b) => s + (allStats[b.clinic_name]?.low || 0) + (allStats[b.clinic_name]?.depleting || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading Pulse branches...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="w-72 h-full bg-white border-r border-gray-200 flex flex-col">

          {/* Header */}
          <div className="px-4 py-4 bg-gradient-to-br from-blue-700 to-blue-500 text-white flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div>
                <div className="font-bold text-sm">Pulse Pharmacy</div>
                <div className="text-xs text-blue-200">Head Office</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-xl font-bold">{branches.length}</div>
                <div className="text-xs text-blue-200">Branches</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-xl font-bold">{totalAll.toLocaleString()}</div>
                <div className="text-xs text-blue-200">Stock Items</div>
              </div>
            </div>
            {totalLow > 0 && (
              <div className="mt-2 flex items-center gap-1.5 bg-amber-400/20 rounded-lg px-2 py-1.5 text-xs text-amber-200">
                <Bell size={11} /> {totalLow} items need attention
              </div>
            )}
          </div>

          {/* Overview link */}
          <button
            onClick={() => { setSelectedBranch(null); setActiveView('overview'); }}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-gray-100 flex-shrink-0
              ${!selectedBranch ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Home size={15} /> All Branches Overview
          </button>

          {/* Branch list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white">
              {branches.length} Branches
            </div>
            {branches.map(branch => {
              const bs = allStats[branch.clinic_name];
              const hasIssues = (bs?.low || 0) + (bs?.depleting || 0) > 0;
              const isActive = selectedBranch?.id === branch.id;
              const shortName = branch.clinic_name.replace('Pulse Pharmacy ', '');
              return (
                <button
                  key={branch.id}
                  onClick={() => selectBranch(branch)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-l-4
                    ${isActive
                      ? 'bg-blue-50 border-blue-600'
                      : 'border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5
                    ${(bs?.total || 0) === 0 ? 'bg-gray-300' : hasIssues ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                      {shortName}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{branch.location}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-gray-500">{bs?.total || 0}</div>
                    {hasIssues && <div className="text-xs text-amber-500">{(bs.low||0)+(bs.depleting||0)}⚠️</div>}
                  </div>
                  {isActive && <ChevronRight size={13} className="text-blue-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-800">
                {selectedBranch ? selectedBranch.clinic_name : 'Pulse Pharmacy — All Branches'}
              </h1>
              {selectedBranch && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {selectedBranch.address}
                  <span className="mx-1">·</span>
                  <Clock size={10} /> {selectedBranch.weekday_hours}
                  <span className="mx-1">·</span>
                  <Phone size={10} /> {selectedBranch.contact}
                </p>
              )}
            </div>
          </div>
          {selectedBranch && (
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveView('inventory')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${activeView === 'inventory' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Package size={13} className="inline mr-1" />Inventory
              </button>
              <button onClick={() => { setActiveView('upload'); setUploadStatus(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${activeView === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Upload size={13} className="inline mr-1" />Upload Stock
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* OVERVIEW */}
          {activeView === 'overview' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Total Branches', value: branches.length, color: 'text-gray-800' },
                  { label: 'Total Stock Items', value: totalAll.toLocaleString(), color: 'text-blue-600' },
                  { label: 'Stocked Branches', value: branches.filter(b => (allStats[b.clinic_name]?.total||0)>0).length, color: 'text-emerald-600' },
                  { label: 'Need Attention', value: totalLow, color: 'text-amber-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {branches.map(branch => {
                  const bs = allStats[branch.clinic_name] || { total:0, stable:0, low:0, depleting:0 };
                  const shortName = branch.clinic_name.replace('Pulse Pharmacy ', '');
                  const pct = bs.total > 0 ? Math.round((bs.stable / bs.total) * 100) : 0;
                  return (
                    <div key={branch.id} onClick={() => selectBranch(branch)}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors text-sm">
                            {shortName}
                          </h3>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={9} /> {branch.location}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${bs.total > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          {bs.total > 0 ? `${bs.total} items` : 'No stock'}
                        </span>
                      </div>
                      {bs.total > 0 ? (
                        <>
                          <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div className="bg-emerald-50 rounded-lg py-1.5">
                              <div className="text-sm font-bold text-emerald-600">{bs.stable}</div>
                              <div className="text-xs text-gray-400">Stable</div>
                            </div>
                            <div className="bg-amber-50 rounded-lg py-1.5">
                              <div className="text-sm font-bold text-amber-500">{bs.low}</div>
                              <div className="text-xs text-gray-400">Low</div>
                            </div>
                            <div className="bg-red-50 rounded-lg py-1.5">
                              <div className="text-sm font-bold text-red-500">{bs.depleting}</div>
                              <div className="text-xs text-gray-400">Critical</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-3 border-t border-gray-100 mt-3">
                          <Upload size={18} className="mx-auto text-gray-300 mb-1" />
                          <p className="text-xs text-gray-400 mb-2">No stock uploaded yet</p>
                          <button
                            onClick={e => { e.stopPropagation(); selectBranch(branch).then(()=>setActiveView('upload')); }}
                            className="text-xs text-blue-600 hover:underline">
                            Upload stock →
                          </button>
                        </div>
                      )}
                      {bs.total > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock size={9}/> {branch.weekday_hours||'09:00-18:00'}</span>
                          <span className="flex items-center gap-1"><Phone size={9}/> {branch.contact}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {activeView === 'inventory' && selectedBranch && (
            <div>
              {stats && (
                <div className="grid grid-cols-4 gap-4 mb-5">
                  {[
                    { label:'Total Items',    value:stats.total,     color:'text-blue-600',    bg:'bg-blue-50' },
                    { label:'Stable',         value:stats.stable,    color:'text-emerald-600', bg:'bg-emerald-50' },
                    { label:'Low Stock',      value:stats.low,       color:'text-amber-600',   bg:'bg-amber-50' },
                    { label:'Depleting Fast', value:stats.depleting, color:'text-red-600',     bg:'bg-red-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search medicines..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <button onClick={() => selectBranch(selectedBranch)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                  <RefreshCw size={13} /> Refresh
                </button>
                <button onClick={() => { setActiveView('upload'); setUploadStatus(null); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                  <Upload size={13} /> Upload New Stock
                </button>
              </div>
              {inventoryLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="ml-3 text-gray-500 text-sm">Loading inventory...</span>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-600">
                    {filtered.length} items {search && `matching "${search}"`}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Medicine</th>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-left">Pack</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtered.slice(0, 300).map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-800">{item.med_name}</div>
                              {item.atc_code && <div className="text-xs text-gray-400">{item.atc_code}</div>}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{item.category}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{item.pack_size}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-700">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${trendColor(item.trend)}`}>
                                {item.trend}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <Package size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No items found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPLOAD */}
          {activeView === 'upload' && selectedBranch && (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload size={28} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Upload Stock File</h2>
                <p className="text-blue-600 font-semibold text-sm mb-1">{selectedBranch.clinic_name}</p>
                <p className="text-gray-400 text-xs mb-6">
                  Upload your pharmacy stock export (.xlsx). Existing stock for this branch will be replaced.
                </p>
                <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                  Choose File (.xlsx)
                </button>
                {uploadStatus && (
                  <div className={`mt-4 p-4 rounded-xl text-sm font-medium
                    ${uploadStatus.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      uploadStatus.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {uploadStatus}
                  </div>
                )}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Expected columns (same format as Tati Siding):</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                    <span>✓ Stock Code</span><span>✓ Description</span>
                    <span>✓ Pack Size</span><span>✓ Stock On Hand</span>
                    <span>✓ Department</span><span className="text-gray-400">+ extras ignored</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
