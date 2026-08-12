import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutGrid, Package, AlertTriangle, TrendingDown,
  Search, RefreshCw, Upload, LogOut, Activity,
  ChevronRight, Clock, Phone, MapPin, CheckCircle,
  CloudUpload, Boxes, ShieldCheck, Settings,
  Building2, BarChart3, Menu, X, ArrowRight,
  Pill, Database, Zap, Calendar
} from 'lucide-react';

type Branch = {
  id: string; clinic_name: string; location: string; address: string;
  contact: string; weekday_hours: string; weekend_hours: string; status: string;
  last_upload_at: string | null;
};
type InventoryItem = {
  id: string; med_name: string; category: string; quantity: number;
  trend: string; pack_size: string; atc_code: string;
};
type BranchStats = { total: number; stable: number; low: number; depleting: number };

const T = '#00b4b4';
const P = '#e91e8c';
const W = '#ffffff';
const BG = '#eef1f6';
const DARK = '#1a2535';
const GRAY = '#7a8a9e';
const LGRAY = '#dde3ec';

const Icon = ({ icon: Ic, size = 16, color = GRAY }: { icon: any; size?: number; color?: string }) => (
  <Ic size={size} color={color} strokeWidth={1.8} />
);

export default function PulseBranchDashboard() {
  const { signOut } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [allStats, setAllStats] = useState<Record<string, BranchStats>>({});
  const [loading, setLoading] = useState(true);
  const [invLoading, setInvLoading] = useState(false);
  const [view, setView] = useState<'overview' | 'inventory' | 'upload'>('overview');
  const [search, setSearch] = useState('');
  const [trendFilter, setTrendFilter] = useState('all');
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');
  const [uploadStatus, setUploadStatus] = useState<{type:'success'|'error'|'info';msg:string}|null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [branchRes] = await Promise.all([
      supabase.from('pharmacies').select('id,clinic_name,location,address,contact,weekday_hours,weekend_hours,status,last_upload_at').eq('parent_email','ho@pulse.co.bw').order('clinic_name'),
      loadStats(),
    ]);
    if (branchRes.data) setBranches(branchRes.data as Branch[]);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data } = await supabase.rpc('get_branch_stats');
    const map: Record<string, BranchStats> = {};
    for (const r of (data || []) as any[]) {
      if (String(r.clinic_name).toLowerCase().startsWith('pulse pharmacy')) {
        map[r.clinic_name] = { total: Number(r.total), stable: Number(r.stable), low: Number(r.low), depleting: Number(r.depleting) };
      }
    }
    setAllStats(map);
    return map;
  };

  const selectBranch = async (b: Branch) => {
    setSelected(b); setView('inventory'); setSearch(''); setTrendFilter('all');
    setInvLoading(true);
    // Load inventory and branch stats in parallel — fresh from DB
    const [invRes, trendRes] = await Promise.all([
      supabase.from('clinic_inventory')
        .select('id,med_name,category,quantity,trend,pack_size,atc_code')
        .eq('clinic_name', b.clinic_name)
        .gt('quantity', 0)
        .order('med_name'),
      supabase.from('clinic_inventory')
        .select('trend')
        .eq('clinic_name', b.clinic_name)
        .gt('quantity', 0),
    ]);
    setInventory((invRes.data as InventoryItem[]) || []);
    // Compute fresh stats — never rely on stale allStats
    const rows = (trendRes.data || []) as {trend:string}[];
    const fresh: BranchStats = { total: rows.length, stable: 0, low: 0, depleting: 0 };
    for (const r of rows) {
      if (r.trend === 'Stable') fresh.stable++;
      else if (r.trend === 'Low Stock') fresh.low++;
      else fresh.depleting++;
    }
    setStats(fresh);
    setAllStats(prev => ({ ...prev, [b.clinic_name]: fresh }));
    setInvLoading(false);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!selected || !file) return;
    setUploading(true); setProgress(5); setUploadStatus(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let hi = -1;
      for (let i = 0; i < Math.min(raw.length, 15); i++) {
        if (raw[i]?.some((c: any) => String(c).toUpperCase().includes('DESCR'))) { hi = i; break; }
      }
      if (hi === -1) { setUploadStatus({ type:'error', msg:'Cannot find header row. File must contain DESCR column.' }); setUploading(false); return; }
      const hdrs = raw[hi].map((h: any) => String(h).toUpperCase().trim());
      const di = hdrs.findIndex((h: string) => h.includes('DESCR'));
      const si = hdrs.findIndex((h: string) => h.includes('STOCKOH'));
      const pi = hdrs.findIndex((h: string) => h.includes('PACKSIZE'));
      const ci = hdrs.findIndex((h: string) => h.includes('STOCKCD'));
      const ddi = hdrs.findIndex((h: string) => h.includes('DEPDESCR'));
      if (di === -1 || si === -1) { setUploadStatus({ type:'error', msg:'Missing required columns: DESCR and STOCKOH.' }); setUploading(false); return; }
      const rows = raw.slice(hi + 1).filter(r => r?.[di] && String(r[di]).trim()).map(r => {
        const qty = parseFloat(String(r[si] || 0)) || 0;
        const dep = ddi >= 0 ? String(r[ddi] || '').toUpperCase() : '';
        const cat = dep.includes('FRONT') ? 'Front Shop' : dep.includes('S4') ? 'Schedule 4' : 'Pharmacy';
        const trend = qty < 20 ? 'Depleting Fast' : qty < 50 ? 'Low Stock' : 'Stable';
        return { clinic_name: selected.clinic_name, med_name: String(r[di]).replace(/_x000D_/g,'').trim(), category: cat, quantity: Math.floor(qty), trend, strength:'', dosage_form:'', pack_size: pi >= 0 ? String(parseInt(r[pi])||1) : '1', atc_code: ci >= 0 ? String(r[ci]||'') : '', atc_description: String(r[di]).trim(), facility_level:'Pharmacy', location: selected.location||'', contact: selected.contact||'', directions_link:'' };
      }).filter(r => r.quantity > 0);
      setProgress(20);
      if (uploadMode === 'replace') {
        setUploadStatus({ type:'info', msg:`Clearing ${selected.clinic_name}...` });
        const { error } = await supabase.from('clinic_inventory').delete().eq('clinic_name', selected.clinic_name);
        if (error) { setUploadStatus({ type:'error', msg:`Delete failed: ${error.message}` }); setUploading(false); return; }
      }
      setProgress(35);
      for (let i = 0; i < rows.length; i += 400) {
        const { error } = await supabase.from('clinic_inventory').insert(rows.slice(i, i+400));
        if (error) { setUploadStatus({ type:'error', msg:`Insert error: ${error.message}` }); setUploading(false); return; }
        setProgress(35 + Math.floor(((i+400)/rows.length)*60));
      }
      setProgress(100);
      setUploadStatus({ type:'success', msg:`${rows.length.toLocaleString()} items uploaded for ${selected.clinic_name}.` });
      // Log upload to history
      await supabase.from('upload_logs').insert({
        clinic_name: selected.clinic_name,
        uploaded_by: 'Pulse HQ',
        mode: uploadMode,
        items_inserted: rows.length,
        items_deleted: uploadMode === 'replace' ? rows.length : 0,
        file_name: file.name,
      });
      // Stamp last_upload_at on pharmacy record
      await supabase.from('pharmacies').update({ last_upload_at: new Date().toISOString() }).eq('clinic_name', selected.clinic_name);
      // Fire upload confirmation email — non-blocking
      const fresh = await supabase.from('clinic_inventory').select('trend').eq('clinic_name', selected.clinic_name).gt('quantity', 0);
      const freshRows = (fresh.data || []) as {trend:string}[];
      const fStable = freshRows.filter(r=>r.trend==='Stable').length;
      const fLow = freshRows.filter(r=>r.trend==='Low Stock').length;
      const fCritical = freshRows.filter(r=>r.trend==='Depleting Fast').length;
      supabase.functions.invoke('upload-notify', {
        body: {
          type: 'upload_confirm',
          branch: selected.clinic_name,
          mode: uploadMode,
          items: rows.length,
          stable: fStable,
          low: fLow,
          critical: fCritical,
          fileName: file.name,
        }
      }).catch(e => console.warn('Email notification failed silently:', e));
      await selectBranch(selected);
      await loadStats();
    } catch (e: any) { setUploadStatus({ type:'error', msg: e.message }); }
    setUploading(false);
  }, [selected, uploadMode]);

  const net = branches.reduce((a,b) => { const s=allStats[b.clinic_name]; if(s){a.total+=s.total;a.stable+=s.stable;a.low+=s.low;a.depleting+=s.depleting;} return a; }, {total:0,stable:0,low:0,depleting:0});
  const filtered = inventory.filter(i => i.med_name.toLowerCase().includes(search.toLowerCase()) && (trendFilter==='all'||i.trend===trendFilter));
  const shortName = (n: string) => n.replace('Pulse Pharmacy ','');
  const lastUpload = (b: Branch) => {
    if (!b.last_upload_at) return null;
    const d = new Date(b.last_upload_at);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'Yesterday';
    return `${diffD} days ago`;
  };
  const healthPct = (s?: BranchStats) => s?.total ? Math.round((s.stable/s.total)*100) : 0;
  const statusColor = (s?: BranchStats) => s?.depleting ? '#e74c3c' : s?.low ? '#f39c12' : '#27ae60';

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:BG,fontFamily:'"Segoe UI",Roboto,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:`3px solid ${LGRAY}`,borderTopColor:T,borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 14px'}} />
        <p style={{color:GRAY,fontSize:13,fontWeight:500}}>Loading Pulse Network</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:'"Segoe UI",Roboto,"Helvetica Neue",sans-serif',background:BG,overflow:'hidden'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#eef1f6}
        ::-webkit-scrollbar-thumb{background:#b0bec8;border-radius:0}
        .nav-item:hover{background:rgba(255,255,255,0.12)!important}
        .nav-active{background:rgba(255,255,255,0.22)!important;border-left:3px solid ${W}!important}
        .branch-row:hover{background:#e8f7f7!important;border-left:3px solid ${T}!important;cursor:pointer}
        .branch-row{border-left:3px solid transparent;transition:background 0.12s,border-color 0.12s}
        .inv-row:hover{background:#e8f7f7!important;border-left:3px solid ${T}!important}
        .inv-row{border-left:3px solid transparent;transition:background 0.12s,border-color 0.12s}
        .kpi-card{transition:box-shadow 0.15s,transform 0.12s}
        .kpi-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.13)!important;transform:translateY(-2px)}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{width:sidebarOpen?240:62,flexShrink:0,height:'100vh',background:`linear-gradient(180deg,${T} 0%,#008888 100%)`,display:'flex',flexDirection:'column',transition:'width 0.2s ease',overflow:'hidden'}}>

        {/* Logo block — faithful Pulse Pharmacy brand */}
        <div style={{flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.15)',overflow:'hidden'}}>
          <div style={{display:'flex',height:64,minWidth:240}}>
            {/* LEFT: teal block — "Pulse" + ECG line */}
            <div style={{width:sidebarOpen?96:62,flexShrink:0,background:T,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 12px',gap:6,transition:'width 0.2s ease'}}>
              {/* ECG pulse SVG — matches logo exactly */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                <polyline points="2,12 6,12 8,5 10,19 12,9 14,15 16,12 22,12"
                  stroke={W} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {sidebarOpen && (
                <span style={{fontSize:18,fontWeight:900,color:W,letterSpacing:-0.5,fontFamily:'"Segoe UI",Arial,sans-serif'}}>Pulse</span>
              )}
            </div>
            {/* RIGHT: pink block — "Pharmacy" + tagline */}
            {sidebarOpen && (
              <div style={{flex:1,background:P,display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 14px',minWidth:0}}>
                <div style={{fontSize:16,fontWeight:700,color:W,letterSpacing:0.1,lineHeight:1.2,fontFamily:'"Segoe UI",Arial,sans-serif'}}>Pharmacy</div>
                <div style={{fontSize:8.5,color:'rgba(255,255,255,0.85)',letterSpacing:0.2,marginTop:2,fontWeight:400}}>Your Convenient Chemist</div>
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div style={{padding:'10px 8px',borderBottom:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:sidebarOpen?'space-between':'center',flexShrink:0}}>
          {sidebarOpen && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:P,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:W}}>HQ</div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:W,lineHeight:1.2}}>Pulse HQ</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.55)'}}>Administrator</div>
              </div>
            </div>
          )}
          <button onClick={()=>setSidebarOpen(!sidebarOpen)}
            style={{background:'rgba(255,255,255,0.12)',border:'none',cursor:'pointer',borderRadius:0,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',color:W,flexShrink:0}}>
            {sidebarOpen ? <X size={14} color={W} /> : <Menu size={14} color={W} />}
          </button>
        </div>

        {/* Nav */}
        <div style={{flex:1,overflowY:'auto',padding:'8px 8px'}}>
          {sidebarOpen && <div style={{padding:'8px 10px 4px',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:1.2,textTransform:'uppercase'}}>Overview</div>}
          <button className={`nav-item${!selected?' nav-active':''}`} onClick={()=>{setSelected(null);setView('overview');}}
            style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:0,border:'none',cursor:'pointer',background:'transparent',color:W,marginBottom:2}}>
            <LayoutGrid size={16} color={W} strokeWidth={1.8} style={{flexShrink:0}} />
            {sidebarOpen && <span style={{fontSize:12,fontWeight:500}}>All Branches</span>}
          </button>

          {sidebarOpen && <div style={{padding:'10px 10px 4px',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:1.2,textTransform:'uppercase'}}>Branches</div>}

          {branches.map(b => {
            const s = allStats[b.clinic_name];
            const isActive = selected?.id === b.id;
            const sc = statusColor(s);
            return (
              <button key={b.id} className={`nav-item${isActive?' nav-active':''}`} onClick={()=>selectBranch(b)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:0,border:'none',cursor:'pointer',background:'transparent',color:W,marginBottom:1,textAlign:'left'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:sc,flexShrink:0,boxShadow:`0 0 0 2px rgba(255,255,255,0.2)`}} />
                {sidebarOpen && (
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:isActive?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{shortName(b.clinic_name)}</div>
                    {s?.total ? <div style={{fontSize:9,color:'rgba(255,255,255,0.5)'}}>{s.total.toLocaleString()} items{lastUpload(b)?' · '+lastUpload(b):''}</div> : <div style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>No data — upload needed</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom */}
        <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
          <button className="nav-item" onClick={signOut}
            style={{width:'100%',display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:0,border:'none',cursor:'pointer',background:'transparent',color:'rgba(255,255,255,0.6)'}}>
            <LogOut size={14} color="rgba(255,255,255,0.6)" strokeWidth={1.8} style={{flexShrink:0}} />
            {sidebarOpen && <span style={{fontSize:11}}>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* Top bar */}
        <header style={{height:58,background:W,borderBottom:`1px solid ${LGRAY}`,borderTop:`3px solid ${T}`,display:'flex',alignItems:'center',padding:'0 24px',gap:16,flexShrink:0,boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:GRAY,letterSpacing:0.2}}>Home &rsaquo; {selected ? shortName(selected.clinic_name) : 'Dashboard'}</div>
            <div style={{fontSize:15,fontWeight:700,color:DARK,letterSpacing:-0.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {selected ? selected.clinic_name : 'Dashboard'} <span style={{fontSize:11,fontWeight:400,color:GRAY}}>Control panel</span>
            </div>
          </div>

          {selected && (
            <div style={{display:'flex',background:LGRAY,borderRadius:0,padding:3,gap:2}}>
              {(['inventory','upload'] as const).map(v => (
                <button key={v} onClick={()=>setView(v)}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'6px 16px',borderRadius:0,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:view===v?W:'transparent',color:view===v?T:GRAY,boxShadow:view===v?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
                  {v==='inventory' ? <Package size={13} color={view===v?T:GRAY} strokeWidth={2} /> : <Upload size={13} color={view===v?T:GRAY} strokeWidth={2} />}
                  {v==='inventory'?'Inventory':'Upload'}
                </button>
              ))}
            </div>
          )}

          <button onClick={load} style={{width:34,height:34,borderRadius:0,border:`1px solid ${LGRAY}`,background:W,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <RefreshCw size={14} color={GRAY} strokeWidth={1.8} />
          </button>
          <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${T},${P})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:W}}>HQ</div>
        </header>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:22,animation:'fadeIn 0.2s ease'}}>

          {/* ── OVERVIEW ── */}
          {(view==='overview'||!selected) && (
            <>
              {/* KPI Cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
                {[
                  {label:'Branches',value:branches.length,Icon:Building2,color:T,bg:`${T}14`,accent:T},
                  {label:'Total SKUs',value:net.total.toLocaleString(),Icon:Package,color:'#8e44ad',bg:'#f3e5f5',accent:'#8e44ad'},
                  {label:'Low Stock',value:net.low,Icon:AlertTriangle,color:'#e67e22',bg:'#fef5e7',accent:'#e67e22'},
                  {label:'Critical',value:net.depleting,Icon:TrendingDown,color:'#e74c3c',bg:'#fce4e4',accent:'#e74c3c'},
                ].map(({label,value,Icon:Ic,color,bg,accent})=>(
                  <div key={label} className="kpi-card" style={{background:W,borderTop:`3px solid ${accent}`,padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:46,height:46,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Ic size={21} color={color} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div style={{fontSize:28,fontWeight:800,color:DARK,letterSpacing:-0.8,lineHeight:1}}>{value}</div>
                      <div style={{fontSize:10,fontWeight:700,color:GRAY,letterSpacing:0.6,textTransform:'uppercase',marginTop:4}}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Two-column */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>

                {/* Branch table */}
                <div style={{background:W,borderLeft:`4px solid ${T}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',overflow:'hidden'}}>
                  <div style={{padding:'14px 18px',borderBottom:`2px solid ${LGRAY}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:DARK,letterSpacing:-0.1}}>Branch Overview</div>
                      <div style={{fontSize:11,color:GRAY}}>Select a branch to view or manage inventory</div>
                    </div>
                    <span style={{fontSize:11,background:`${T}15`,color:T,padding:'3px 10px',borderRadius:20,fontWeight:700}}>{branches.length} active</span>
                  </div>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'#f8fafc'}}>
                        {['Branch','Location','SKUs','Last Upload','Status','Health'].map(h=>(
                          <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:GRAY,letterSpacing:0.5,textTransform:'uppercase',borderBottom:`1px solid ${LGRAY}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b,i)=>{
                        const s=allStats[b.clinic_name];
                        const hp=healthPct(s);
                        const sc=statusColor(s);
                        return (
                          <tr key={b.id} className="branch-row" onClick={()=>selectBranch(b)}
                            style={{borderBottom:`1px solid ${LGRAY}`,background:i%2===0?W:'#fafcfd'}}>
                            <td style={{padding:'10px 14px'}}>
                              <div style={{fontSize:12,fontWeight:600,color:DARK}}>{shortName(b.clinic_name)}</div>
                            </td>
                            <td style={{padding:'10px 14px',fontSize:11,color:GRAY}}>{b.location||'Botswana'}</td>
                            <td style={{padding:'10px 14px',fontSize:12,fontWeight:700,color:DARK}}>{s?.total?.toLocaleString()||<span style={{color:LGRAY}}>—</span>}</td>
                            <td style={{padding:'10px 14px'}}>
                              {lastUpload(b) ? (
                                <span style={{fontSize:11,color:lastUpload(b)==='Just now'?'#27ae60':GRAY,fontWeight:lastUpload(b)==='Just now'?700:400}}>{lastUpload(b)}</span>
                              ) : <span style={{fontSize:11,color:'#e74c3c',fontWeight:600}}>Never</span>}
                            </td>
                            <td style={{padding:'10px 14px'}}>
                              <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:`${sc}15`,color:sc}}>
                                <div style={{width:5,height:5,borderRadius:'50%',background:sc}} />
                                {!s?.total?'No data':s.depleting?'Critical':s.low?'Low Stock':'Healthy'}
                              </span>
                            </td>
                            <td style={{padding:'10px 14px'}}>
                              {s?.total ? (
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                  <div style={{flex:1,height:5,background:LGRAY,borderRadius:3,overflow:'hidden',minWidth:55}}>
                                    <div style={{height:'100%',width:`${hp}%`,background:sc,borderRadius:3}} />
                                  </div>
                                  <span style={{fontSize:10,fontWeight:700,color:sc,minWidth:28}}>{hp}%</span>
                                </div>
                              ) : <span style={{color:LGRAY,fontSize:11}}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Right panel */}
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{background:W,borderLeft:`4px solid ${P}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',padding:'16px 18px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <BarChart3 size={15} color={P} strokeWidth={1.8} />
                      <div style={{fontSize:13,fontWeight:700,color:DARK,letterSpacing:-0.1}}>Network Health</div>
                    </div>
                    <div style={{height:8,borderRadius:0,background:LGRAY,overflow:'hidden',display:'flex',marginBottom:12}}>
                      <div style={{width:`${net.total?(net.stable/net.total)*100:0}%`,background:'#27ae60',transition:'width 0.4s'}} />
                      <div style={{width:`${net.total?(net.low/net.total)*100:0}%`,background:'#f39c12'}} />
                      <div style={{width:`${net.total?(net.depleting/net.total)*100:0}%`,background:'#e74c3c'}} />
                    </div>
                    {[
                      {l:'Stable',v:net.stable,c:'#27ae60',bg:'#eafaf1',Icon:CheckCircle},
                      {l:'Low Stock',v:net.low,c:'#f39c12',bg:'#fef9e7',Icon:AlertTriangle},
                      {l:'Critical',v:net.depleting,c:'#e74c3c',bg:'#fce4e4',Icon:TrendingDown},
                    ].map(({l,v,c,bg,Icon:Ic})=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:0,background:bg,marginBottom:6}}>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <Ic size={13} color={c} strokeWidth={2} />
                          <span style={{fontSize:12,color:DARK,fontWeight:500}}>{l}</span>
                        </div>
                        <span style={{fontSize:13,fontWeight:800,color:c}}>{v.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{background:W,borderLeft:`4px solid ${T}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',padding:'16px 18px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <CloudUpload size={15} color={T} strokeWidth={1.8} />
                      <div style={{fontSize:13,fontWeight:700,color:DARK,letterSpacing:-0.1}}>Needs Upload</div>
                    </div>
                    {branches.filter(b=>!allStats[b.clinic_name]?.total).slice(0,6).map(b=>(
                      <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${LGRAY}`}}>
                        <span style={{fontSize:11,color:DARK,fontWeight:500}}>{shortName(b.clinic_name)}</span>
                        <button onClick={()=>{selectBranch(b);setView('upload');}}
                          style={{fontSize:10,background:P,color:W,border:'none',borderRadius:0,padding:'4px 10px',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                          <Upload size={10} color={W} strokeWidth={2} /> Upload
                        </button>
                      </div>
                    ))}
                    {!branches.filter(b=>!allStats[b.clinic_name]?.total).length && (
                      <div style={{display:'flex',alignItems:'center',gap:7,color:'#27ae60',fontSize:12,fontWeight:600}}>
                        <CheckCircle size={14} color="#27ae60" strokeWidth={2} /> All branches have stock data
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── INVENTORY ── */}
          {view==='inventory' && selected && (
            <>
              <div style={{background:W,borderLeft:`4px solid ${T}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',padding:'13px 18px',marginBottom:14,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:38,height:38,borderRadius:0,background:`linear-gradient(135deg,${T},${P})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Building2 size={18} color={W} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:DARK}}>{selected.clinic_name}</div>
                    <div style={{fontSize:11,color:GRAY}}>{selected.location||'Botswana'}</div>
                  </div>
                </div>
                {selected.weekday_hours && (
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <Clock size={12} color={GRAY} strokeWidth={1.8} />
                    <span style={{fontSize:11,color:GRAY}}>{selected.weekday_hours}{selected.weekend_hours?` · ${selected.weekend_hours}`:''}</span>
                  </div>
                )}
                {selected.contact && (
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <Phone size={12} color={GRAY} strokeWidth={1.8} />
                    <span style={{fontSize:11,color:GRAY}}>{selected.contact}</span>
                  </div>
                )}
                {selected.address && (
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <MapPin size={12} color={GRAY} strokeWidth={1.8} />
                    <span style={{fontSize:11,color:GRAY}}>{selected.address}</span>
                  </div>
                )}
              </div>

              {stats && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
                  {[
                    {l:'Total Items',v:stats.total,Ic:Package,c:T,bg:`${T}14`},
                    {l:'Stable',v:stats.stable,Ic:CheckCircle,c:'#27ae60',bg:'#eafaf1'},
                    {l:'Low Stock',v:stats.low,Ic:AlertTriangle,c:'#f39c12',bg:'#fef9e7'},
                    {l:'Critical',v:stats.depleting,Ic:TrendingDown,c:'#e74c3c',bg:'#fce4e4'},
                  ].map(({l,v,Ic,c,bg})=>(
                    <div key={l} className="kpi-card" style={{background:W,borderTop:`3px solid ${c}`,padding:'13px 15px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',display:'flex',alignItems:'center',gap:11}}>
                      <div style={{width:34,height:34,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Ic size={16} color={c} strokeWidth={1.8} />
                      </div>
                      <div>
                        <div style={{fontSize:20,fontWeight:800,color:DARK,letterSpacing:-0.3,lineHeight:1}}>{v.toLocaleString()}</div>
                        <div style={{fontSize:9,fontWeight:600,color:GRAY,textTransform:'uppercase',letterSpacing:0.4,marginTop:2}}>{l}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{background:W,borderLeft:`4px solid ${T}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',overflow:'hidden'}}>
                <div style={{padding:'11px 14px',borderBottom:`2px solid ${LGRAY}`,display:'flex',gap:10,alignItems:'center'}}>
                  <div style={{position:'relative',flex:1}}>
                    <Search size={13} color={GRAY} strokeWidth={1.8} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}} />
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search medicines..."
                      style={{width:'100%',padding:'7px 10px 7px 32px',borderRadius:0,border:`1px solid ${LGRAY}`,fontSize:12,outline:'none',color:DARK,background:'#fafbfc'}} />
                  </div>
                  {['all','Stable','Low Stock','Depleting Fast'].map(f=>{
                    const ac=f==='all'?T:f==='Stable'?'#27ae60':f==='Low Stock'?'#f39c12':'#e74c3c';
                    const active=trendFilter===f;
                    return (
                      <button key={f} onClick={()=>setTrendFilter(f)}
                        style={{padding:'6px 13px',borderRadius:0,border:`1px solid ${active?'transparent':LGRAY}`,cursor:'pointer',fontSize:11,fontWeight:600,background:active?ac:W,color:active?W:GRAY,transition:'all 0.15s',whiteSpace:'nowrap'}}>
                        {f==='all'?'All':f==='Depleting Fast'?'Critical':f}
                      </button>
                    );
                  })}
                  <span style={{fontSize:11,color:GRAY,whiteSpace:'nowrap',fontWeight:500}}>{filtered.length.toLocaleString()} items</span>
                </div>

                {invLoading ? (
                  <div style={{padding:48,textAlign:'center'}}>
                    <div style={{width:28,height:28,border:`3px solid ${LGRAY}`,borderTopColor:T,borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 10px'}} />
                    <div style={{color:GRAY,fontSize:12}}>Loading inventory...</div>
                  </div>
                ) : (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 110px 90px 110px',padding:'9px 14px',background:'#f8fafc',borderBottom:`1px solid ${LGRAY}`}}>
                      {['Medicine','Category','Qty','Status'].map(h=>(
                        <div key={h} style={{fontSize:10,fontWeight:700,color:GRAY,textTransform:'uppercase',letterSpacing:0.5}}>{h}</div>
                      ))}
                    </div>
                    {filtered.slice(0,200).map((item,i)=>{
                      const tc=item.trend==='Stable'?'#27ae60':item.trend==='Low Stock'?'#f39c12':'#e74c3c';
                      const tbg=item.trend==='Stable'?'#eafaf1':item.trend==='Low Stock'?'#fef9e7':'#fce4e4';
                      return (
                        <div key={item.id} className="inv-row"
                          style={{display:'grid',gridTemplateColumns:'1fr 110px 90px 110px',padding:'9px 14px',borderBottom:`1px solid ${LGRAY}`,alignItems:'center',background:i%2===0?W:'#fafcfd',transition:'background 0.1s'}}>
                          <div>
                            <div style={{fontSize:12,fontWeight:500,color:DARK}}>{item.med_name}</div>
                            {item.pack_size&&<div style={{fontSize:10,color:GRAY}}>Pack: {item.pack_size}</div>}
                          </div>
                          <div style={{fontSize:11,color:GRAY}}>{item.category}</div>
                          <div style={{fontSize:13,fontWeight:700,color:item.quantity===0?'#e74c3c':DARK}}>{item.quantity.toLocaleString()}</div>
                          <div>
                            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:0,fontSize:10,fontWeight:700,background:tbg,color:tc}}>
                              <div style={{width:4,height:4,borderRadius:'50%',background:tc}} />
                              {item.trend==='Depleting Fast'?'Critical':item.trend}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {filtered.length>200&&(
                      <div style={{padding:'11px 14px',textAlign:'center',color:GRAY,fontSize:11,background:'#fafcfd'}}>
                        Showing 200 of {filtered.length.toLocaleString()} — narrow with search
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* ── UPLOAD ── */}
          {view==='upload' && selected && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:900}}>
              {/* Upload card */}
              <div style={{background:W,borderRadius:0,borderLeft:`4px solid ${T}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,${T},${P})`,padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
                  <CloudUpload size={22} color={W} strokeWidth={1.8} />
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:W}}>{shortName(selected.clinic_name)}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>Daily stock upload</div>
                  </div>
                </div>
                <div style={{padding:'18px'}}>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:GRAY,letterSpacing:0.5,textTransform:'uppercase',marginBottom:8}}>Upload Mode</div>
                    <div style={{display:'flex',background:LGRAY,borderRadius:0,padding:3,gap:2}}>
                      {([{m:'replace',l:'Replace Stock'},{m:'merge',l:'Merge / Add'}] as const).map(({m,l})=>(
                        <button key={m} onClick={()=>setUploadMode(m as 'replace'|'merge')}
                          style={{flex:1,padding:'7px 0',borderRadius:0,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:uploadMode===m?W:'transparent',color:uploadMode===m?T:GRAY,boxShadow:uploadMode===m?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:GRAY,marginTop:5,lineHeight:1.5}}>
                      {uploadMode==='replace'?'Clears all existing stock and inserts fresh data — recommended for daily uploads.':'Keeps existing items and adds only new ones from the file.'}
                    </div>
                  </div>

                  <div onDrop={e=>{e.preventDefault();setDragOver(false);e.dataTransfer.files[0]&&handleFile(e.dataTransfer.files[0]);}}
                    onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                    onDragLeave={()=>setDragOver(false)}
                    onClick={()=>fileRef.current?.click()}
                    style={{border:`2px dashed ${dragOver?T:'#c8d6e5'}`,borderRadius:0,padding:'28px 20px',textAlign:'center',cursor:'pointer',background:dragOver?`${T}08`:'#fafbfc',transition:'all 0.2s',marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'center',marginBottom:10}}>
                      <div style={{width:46,height:46,borderRadius:0,background:dragOver?`${T}15`:LGRAY,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}>
                        <Upload size={20} color={dragOver?T:GRAY} strokeWidth={1.8} />
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:DARK,marginBottom:3}}>{dragOver?'Release to upload':'Drop your Excel file here'}</div>
                    <div style={{fontSize:11,color:GRAY}}>or click to browse &nbsp;·&nbsp; .xlsx &nbsp;.xls &nbsp;.csv</div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} />
                  </div>

                  {uploading && (
                    <div style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:11,color:DARK,fontWeight:600}}>Uploading...</span>
                        <span style={{fontSize:11,color:T,fontWeight:700}}>{progress}%</span>
                      </div>
                      <div style={{height:6,background:LGRAY,borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',background:`linear-gradient(90deg,${T},${P})`,borderRadius:4,width:`${progress}%`,transition:'width 0.3s'}} />
                      </div>
                    </div>
                  )}

                  {uploadStatus && !uploading && (
                    <div style={{padding:'10px 14px',borderRadius:0,fontSize:12,fontWeight:500,display:'flex',alignItems:'center',gap:8,
                      background:uploadStatus.type==='success'?'#eafaf1':uploadStatus.type==='error'?'#fce4e4':'#e0f7f7',
                      color:uploadStatus.type==='success'?'#27ae60':uploadStatus.type==='error'?'#e74c3c':T,
                      border:`1px solid ${uploadStatus.type==='success'?'#a9dfbf':uploadStatus.type==='error'?'#f1948a':'#76d7c4'}`}}>
                      {uploadStatus.type==='success'?<CheckCircle size={14} color="#27ae60" strokeWidth={2}/>:uploadStatus.type==='error'?<X size={14} color="#e74c3c" strokeWidth={2}/>:<Zap size={14} color={T} strokeWidth={2}/>}
                      {uploadStatus.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow guide */}
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={{background:W,borderRadius:0,borderLeft:`4px solid ${P}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',padding:'16px 18px'}}>
                  <div style={{fontSize:13,fontWeight:700,color:DARK,marginBottom:2}}>Daily Workflow</div>
                  <div style={{fontSize:11,color:GRAY,marginBottom:14}}>How to update stock every morning</div>
                  {[
                    {n:'1',t:'Export from POS',d:'Run the Stocktotals report from Nexus, Medinol, or your system. Save as Excel.',Ic:Database},
                    {n:'2',t:'Select your branch',d:'Click your branch in the sidebar, then select the Upload tab.',Ic:Building2},
                    {n:'3',t:'Drop the file',d:'Use Replace Stock mode. Old data clears, new data loads in under 30 seconds.',Ic:CloudUpload},
                    {n:'4',t:'Live immediately',d:'WhatsApp searches and the public website update with the new stock instantly.',Ic:Zap},
                  ].map(({n,t,d,Ic})=>(
                    <div key={n} style={{display:'flex',gap:12,marginBottom:10,padding:'10px 12px',background:'#fafbfc',borderRadius:0,border:`1px solid ${LGRAY}`}}>
                      <div style={{width:30,height:30,borderRadius:0,background:`linear-gradient(135deg,${T},${P})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Ic size={14} color={W} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:DARK,marginBottom:2}}>{n}. {t}</div>
                        <div style={{fontSize:11,color:GRAY,lineHeight:1.5}}>{d}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Auto-import explainer */}
                <div style={{background:W,borderLeft:`4px solid ${T}`,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',padding:'16px 18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{width:28,height:28,borderRadius:0,background:`${T}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Settings size={14} color={T} strokeWidth={1.8} />
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:DARK}}>Auto-Import — How It Works</div>
                  </div>
                  <div style={{fontSize:11,color:DARK,lineHeight:1.7,marginBottom:12}}>
                    Instead of uploading manually each morning, your IT team can configure the POS system to send the stock file automatically to ChekaMeds every day at 7am. Here is exactly what to tell them:
                  </div>
                  {[
                    {Ic:Calendar,t:'Schedule a daily export',d:'Set the POS (Nexus/Medinol) to run the Stocktotals report automatically every morning at 06:45, and save it to a shared folder or FTP server.'},
                    {Ic:ArrowRight,t:'Deliver it to ChekaMeds',d:'Email the exported file to a dedicated ChekaMeds inbox, or drop it into an agreed FTP/SFTP path. We watch that location every morning at 07:00.'},
                    {Ic:Zap,t:'ChekaMeds auto-imports it',d:'We read the file, clear the old stock, and load the new numbers — the same as the manual upload, but with no one touching anything.'},
                    {Ic:CheckCircle,t:'Result: always fresh stock',d:'By the time your pharmacy opens, the WhatsApp bot and website already show today\'s correct quantities. No staff time needed.'},
                  ].map(({Ic,t,d},idx)=>(
                    <div key={idx} style={{display:'flex',gap:10,marginBottom:10,paddingBottom:10,borderBottom:idx<3?`1px solid ${LGRAY}`:'none'}}>
                      <div style={{width:24,height:24,borderRadius:0,background:`${T}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                        <Ic size={12} color={T} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:DARK,marginBottom:2}}>{t}</div>
                        <div style={{fontSize:11,color:GRAY,lineHeight:1.5}}>{d}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{padding:'10px 12px',background:`${T}08`,borderRadius:0,border:`1px solid ${T}25`}}>
                    <div style={{fontSize:11,fontWeight:700,color:T,marginBottom:2}}>What to tell your IT team</div>
                    <div style={{fontSize:11,color:DARK,lineHeight:1.6}}>"Schedule the Stocktotals export daily at 06:45 and send the Excel file to the ChekaMeds auto-import endpoint. The ChekaMeds team will provide the delivery address and confirm the file format."</div>
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
