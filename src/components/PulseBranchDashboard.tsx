import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
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

const T = '#00b4b4';   // teal
const P = '#e91e8c';   // pink/magenta
const W = '#ffffff';
const BG = '#f0f4f8';
const DARK = '#2c3e50';
const GRAY = '#8492a6';
const LGRAY = '#e8edf2';

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
      supabase.from('pharmacies').select('id,clinic_name,location,address,contact,weekday_hours,weekend_hours,status').eq('parent_email','ho@pulse.co.bw').order('clinic_name'),
      loadStats(),
    ]);
    if (branchRes.data) setBranches(branchRes.data as Branch[]);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data } = await supabase.rpc('get_branch_stats');
    const map: Record<string, BranchStats> = {};
    for (const r of (data || []) as any[]) {
      map[r.clinic_name] = { total: Number(r.total), stable: Number(r.stable), low: Number(r.low), depleting: Number(r.depleting) };
    }
    setAllStats(map);
    return map;
  };

  const selectBranch = async (b: Branch) => {
    setSelected(b); setView('inventory'); setSearch(''); setTrendFilter('all');
    setInvLoading(true);
    const { data } = await supabase.from('clinic_inventory').select('id,med_name,category,quantity,trend,pack_size,atc_code').eq('clinic_name', b.clinic_name).order('med_name');
    setInventory((data as InventoryItem[]) || []);
    setStats(allStats[b.clinic_name] || { total:0,stable:0,low:0,depleting:0 });
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
      await selectBranch(selected);
      await loadStats();
    } catch (e: any) { setUploadStatus({ type:'error', msg: e.message }); }
    setUploading(false);
  }, [selected, uploadMode]);

  const net = branches.reduce((a,b) => { const s=allStats[b.clinic_name]; if(s){a.total+=s.total;a.stable+=s.stable;a.low+=s.low;a.depleting+=s.depleting;} return a; }, {total:0,stable:0,low:0,depleting:0});

  const filtered = inventory.filter(i => i.med_name.toLowerCase().includes(search.toLowerCase()) && (trendFilter==='all'||i.trend===trendFilter));

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:BG,fontFamily:'"Segoe UI",Roboto,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:`4px solid ${LGRAY}`,borderTopColor:T,borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 14px'}} />
        <p style={{color:GRAY,fontSize:14}}>Loading Pulse Network...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const shortName = (n: string) => n.replace('Pulse Pharmacy ','');
  const healthPct = (s?: BranchStats) => s?.total ? Math.round((s.stable/s.total)*100) : 0;
  const statusColor = (s?: BranchStats) => s?.depleting ? '#e74c3c' : s?.low ? '#f39c12' : '#27ae60';

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:'"Segoe UI",Roboto,"Helvetica Neue",sans-serif',background:BG,overflow:'hidden'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:#c0cdd8;border-radius:4px}
        .nav-item:hover{background:rgba(255,255,255,0.1)!important}
        .nav-item.active{background:rgba(255,255,255,0.18)!important}
        .branch-row:hover{background:#f7fafc!important}
        .inv-row:hover{background:#f7fafc!important}
        .kpi-card{transition:transform 0.15s,box-shadow 0.15s}
        .kpi-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.12)!important}
        .tab-btn{transition:all 0.15s}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{width: sidebarOpen ? 240 : 60, flexShrink:0, height:'100vh', background:`linear-gradient(180deg, ${T} 0%, #009494 100%)`, display:'flex', flexDirection:'column', transition:'width 0.2s', overflow:'hidden'}}>

        {/* Logo */}
        <div style={{padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', gap:10, minHeight:64, flexShrink:0}}>
          {/* Pulse Pharmacy logo recreation */}
          <div style={{display:'flex', flexShrink:0, borderRadius:6, overflow:'hidden', height:34}}>
            <div style={{background:T, padding:'0 8px', display:'flex', alignItems:'center', borderRight:'2px solid rgba(255,255,255,0.3)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <polyline points="2,12 6,12 8,4 10,20 12,8 14,16 16,12 22,12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{background:P, padding:'0 8px', display:'flex', flexDirection:'column', justifyContent:'center', minWidth: sidebarOpen ? 90 : 0, overflow:'hidden', transition:'min-width 0.2s'}}>
              {sidebarOpen && <>
                <span style={{fontSize:12, fontWeight:700, color:W, letterSpacing:0.3, lineHeight:1.2}}>Pulse Pharmacy</span>
                <span style={{fontSize:7, color:'rgba(255,255,255,0.8)', letterSpacing:0.2}}>Your Convenient Chemist</span>
              </>}
            </div>
          </div>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:18,lineHeight:1,flexShrink:0,padding:2}}>
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {/* User */}
        {sidebarOpen && (
          <div style={{padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:P,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:W,flexShrink:0}}>HQ</div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:W}}>Pulse HQ</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>ho@pulse.co.bw</div>
            </div>
          </div>
        )}

        {/* Nav label */}
        {sidebarOpen && <div style={{padding:'14px 14px 6px',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',letterSpacing:1.2,textTransform:'uppercase'}}>Navigation</div>}

        {/* Overview nav */}
        <div style={{padding:'0 8px'}}>
          <button className={`nav-item${!selected ? ' active' : ''}`} onClick={()=>{setSelected(null);setView('overview');}}
            style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:6,border:'none',cursor:'pointer',background:'transparent',color:W,textAlign:'left',marginBottom:2}}>
            <span style={{fontSize:16,flexShrink:0}}>⊞</span>
            {sidebarOpen && <span style={{fontSize:12,fontWeight:500}}>All Branches</span>}
          </button>
        </div>

        {sidebarOpen && <div style={{padding:'10px 14px 4px',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',letterSpacing:1.2,textTransform:'uppercase'}}>Branches</div>}

        {/* Branch list */}
        <div style={{flex:1,overflowY:'auto',padding:'0 8px 8px'}}>
          {branches.map(b => {
            const s = allStats[b.clinic_name];
            const isActive = selected?.id === b.id;
            return (
              <button key={b.id} className={`nav-item${isActive?' active':''}`} onClick={()=>selectBranch(b)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:6,border:'none',cursor:'pointer',background:'transparent',color:W,textAlign:'left',marginBottom:1}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:statusColor(s),flexShrink:0,boxShadow:`0 0 0 2px rgba(255,255,255,0.15)`}} />
                {sidebarOpen && (
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:isActive?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{shortName(b.clinic_name)}</div>
                    {s && <div style={{fontSize:9,color:'rgba(255,255,255,0.55)'}}>{s.total} items</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sign out */}
        <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button className="nav-item" onClick={signOut}
            style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:6,border:'none',cursor:'pointer',background:'transparent',color:'rgba(255,255,255,0.6)'}}>
            <span style={{fontSize:14}}>↩</span>
            {sidebarOpen && <span style={{fontSize:11}}>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* Top nav bar */}
        <header style={{height:56,background:W,borderBottom:`1px solid ${LGRAY}`,display:'flex',alignItems:'center',padding:'0 24px',gap:16,flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
          {/* Breadcrumb */}
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:GRAY}}>Home &rsaquo; Dashboard</div>
            <div style={{fontSize:15,fontWeight:700,color:DARK,letterSpacing:-0.2}}>{selected ? selected.clinic_name : 'Dashboard'} <span style={{fontSize:11,fontWeight:400,color:GRAY}}>Control panel</span></div>
          </div>

          {/* View tabs — only when branch selected */}
          {selected && (
            <div style={{display:'flex',gap:2,background:LGRAY,borderRadius:8,padding:3}}>
              {(['inventory','upload'] as const).map(v => (
                <button key={v} className="tab-btn" onClick={()=>setView(v)}
                  style={{padding:'5px 16px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:view===v?W:'transparent',color:view===v?T:GRAY,boxShadow:view===v?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
                  {v==='inventory'?'📦 Inventory':'⬆ Upload'}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <button onClick={load} style={{width:34,height:34,borderRadius:8,border:`1px solid ${LGRAY}`,background:W,cursor:'pointer',color:GRAY,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>↻</button>
          <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${T},${P})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:W,cursor:'pointer'}}>HQ</div>
        </header>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:24,animation:'fadeIn 0.2s ease'}}>

          {/* ── OVERVIEW ── */}
          {(view==='overview'||!selected) && (
            <>
              {/* KPI Cards — FAB Admin style with colored icons */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
                {[
                  {label:'BRANCHES',value:branches.length,icon:'🏥',color:T,bg:'#e0f7f7'},
                  {label:'TOTAL SKUs',value:net.total.toLocaleString(),icon:'💊',color:'#9b59b6',bg:'#f3e5f5'},
                  {label:'LOW STOCK',value:net.low,icon:'⚠',color:'#f39c12',bg:'#fff8e1'},
                  {label:'CRITICAL',value:net.depleting,icon:'🔴',color:'#e74c3c',bg:'#fce4e4'},
                ].map(({label,value,icon,color,bg})=>(
                  <div key={label} className="kpi-card" style={{background:W,borderRadius:10,padding:'18px 20px',boxShadow:'0 2px 10px rgba(0,0,0,0.07)',display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:52,height:52,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{icon}</div>
                    <div>
                      <div style={{fontSize:26,fontWeight:800,color:DARK,letterSpacing:-0.5,lineHeight:1}}>{value}</div>
                      <div style={{fontSize:10,fontWeight:700,color:GRAY,letterSpacing:1,textTransform:'uppercase',marginTop:3}}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Two-column layout: branch table + network summary */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>

                {/* Branch table */}
                <div style={{background:W,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.07)',overflow:'hidden'}}>
                  <div style={{padding:'16px 20px',borderBottom:`1px solid ${LGRAY}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:DARK}}>Branch Overview</div>
                      <div style={{fontSize:11,color:GRAY}}>Click any row to view inventory</div>
                    </div>
                    <span style={{fontSize:11,background:`${T}15`,color:T,padding:'3px 10px',borderRadius:20,fontWeight:600}}>{branches.length} branches</span>
                  </div>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'#fafbfc'}}>
                        {['Branch','Location','Items','Status','Health'].map(h=>(
                          <th key={h} style={{padding:'9px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:GRAY,letterSpacing:0.5,textTransform:'uppercase',borderBottom:`1px solid ${LGRAY}`}}>{h}</th>
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
                            style={{borderBottom:`1px solid ${LGRAY}`,cursor:'pointer',background:i%2===0?W:'#fafbfc'}}>
                            <td style={{padding:'10px 16px',fontSize:12,fontWeight:600,color:DARK}}>{shortName(b.clinic_name)}</td>
                            <td style={{padding:'10px 16px',fontSize:11,color:GRAY}}>{b.location||'Botswana'}</td>
                            <td style={{padding:'10px 16px',fontSize:12,fontWeight:700,color:DARK}}>{s?.total?.toLocaleString()||'—'}</td>
                            <td style={{padding:'10px 16px'}}>
                              <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:`${sc}15`,color:sc}}>
                                <div style={{width:5,height:5,borderRadius:'50%',background:sc}} />
                                {s?.depleting?'Critical':s?.low?'Low Stock':s?.total?'Healthy':'No data'}
                              </span>
                            </td>
                            <td style={{padding:'10px 16px'}}>
                              {s?.total ? (
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                  <div style={{flex:1,height:6,background:LGRAY,borderRadius:4,overflow:'hidden',minWidth:60}}>
                                    <div style={{height:'100%',width:`${hp}%`,background:sc,borderRadius:4,transition:'width 0.3s'}} />
                                  </div>
                                  <span style={{fontSize:10,fontWeight:700,color:sc,minWidth:28}}>{hp}%</span>
                                </div>
                              ) : <span style={{fontSize:10,color:GRAY}}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Right column: network health + quick stats */}
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  {/* Network health */}
                  <div style={{background:W,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.07)',padding:'18px 20px'}}>
                    <div style={{fontSize:13,fontWeight:700,color:DARK,marginBottom:4}}>Network Health</div>
                    <div style={{fontSize:10,color:GRAY,marginBottom:14}}>Across all {branches.length} branches</div>
                    <div style={{height:10,borderRadius:6,background:LGRAY,overflow:'hidden',display:'flex',marginBottom:10}}>
                      <div style={{width:`${net.total?(net.stable/net.total)*100:0}%`,background:'#27ae60',transition:'width 0.4s'}} />
                      <div style={{width:`${net.total?(net.low/net.total)*100:0}%`,background:'#f39c12'}} />
                      <div style={{width:`${net.total?(net.depleting/net.total)*100:0}%`,background:'#e74c3c'}} />
                    </div>
                    {[
                      {l:'Stable',v:net.stable,c:'#27ae60',bg:'#e8f8f0'},
                      {l:'Low Stock',v:net.low,c:'#f39c12',bg:'#fff8e1'},
                      {l:'Critical',v:net.depleting,c:'#e74c3c',bg:'#fce4e4'},
                    ].map(({l,v,c,bg})=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${LGRAY}`}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:10,height:10,borderRadius:3,background:bg,border:`1.5px solid ${c}`}} />
                          <span style={{fontSize:12,color:DARK}}>{l}</span>
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:c}}>{v.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Branches needing upload */}
                  <div style={{background:W,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.07)',padding:'18px 20px'}}>
                    <div style={{fontSize:13,fontWeight:700,color:DARK,marginBottom:14}}>Upload Needed</div>
                    {branches.filter(b=>!allStats[b.clinic_name]?.total).slice(0,5).map(b=>(
                      <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${LGRAY}`}}>
                        <span style={{fontSize:11,color:DARK}}>{shortName(b.clinic_name)}</span>
                        <button onClick={()=>{selectBranch(b);setView('upload');}}
                          style={{fontSize:10,background:P,color:W,border:'none',borderRadius:4,padding:'3px 8px',cursor:'pointer',fontWeight:600}}>Upload</button>
                      </div>
                    ))}
                    {branches.filter(b=>allStats[b.clinic_name]?.total).length===branches.length && (
                      <div style={{fontSize:12,color:'#27ae60',fontWeight:600}}>✓ All branches have stock data</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── INVENTORY ── */}
          {view==='inventory' && selected && (
            <>
              {/* Branch info banner */}
              <div style={{background:W,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.07)',padding:'14px 20px',marginBottom:16,display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:40,height:40,borderRadius:8,background:`linear-gradient(135deg,${T},${P})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🏥</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:DARK}}>{selected.clinic_name}</div>
                    <div style={{fontSize:11,color:GRAY}}>{selected.location||'Botswana'}</div>
                  </div>
                </div>
                {selected.weekday_hours && <div style={{fontSize:11,color:GRAY}}>⏰ {selected.weekday_hours}{selected.weekend_hours?` · ${selected.weekend_hours}`:''}</div>}
                {selected.contact && <div style={{fontSize:11,color:GRAY}}>📞 {selected.contact}</div>}
              </div>

              {/* Stat cards */}
              {stats && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                  {[
                    {l:'Total Items',v:stats.total,c:T,bg:'#e0f7f7',icon:'📦'},
                    {l:'Stable',v:stats.stable,c:'#27ae60',bg:'#e8f8f0',icon:'✅'},
                    {l:'Low Stock',v:stats.low,c:'#f39c12',bg:'#fff8e1',icon:'⚠️'},
                    {l:'Critical',v:stats.depleting,c:'#e74c3c',bg:'#fce4e4',icon:'🔴'},
                  ].map(({l,v,c,bg,icon})=>(
                    <div key={l} className="kpi-card" style={{background:W,borderRadius:8,padding:'14px 16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:38,height:38,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{icon}</div>
                      <div>
                        <div style={{fontSize:20,fontWeight:800,color:DARK,letterSpacing:-0.3}}>{v.toLocaleString()}</div>
                        <div style={{fontSize:9,fontWeight:700,color:GRAY,textTransform:'uppercase',letterSpacing:0.5}}>{l}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search & filters */}
              <div style={{background:W,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.07)',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:`1px solid ${LGRAY}`,display:'flex',gap:10,alignItems:'center'}}>
                  <div style={{position:'relative',flex:1}}>
                    <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:GRAY,fontSize:13}}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search medicines..."
                      style={{width:'100%',padding:'7px 10px 7px 32px',borderRadius:6,border:`1px solid ${LGRAY}`,fontSize:12,outline:'none',color:DARK}} />
                  </div>
                  {['all','Stable','Low Stock','Depleting Fast'].map(f=>{
                    const ac=f==='all'?T:f==='Stable'?'#27ae60':f==='Low Stock'?'#f39c12':'#e74c3c';
                    const active=trendFilter===f;
                    return (
                      <button key={f} onClick={()=>setTrendFilter(f)}
                        style={{padding:'6px 14px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:active?ac:'transparent',color:active?W:GRAY,border:active?'none':`1px solid ${LGRAY}`,whiteSpace:'nowrap',transition:'all 0.15s'}}>
                        {f==='all'?'All':f==='Depleting Fast'?'Critical':f}
                      </button>
                    );
                  })}
                  <span style={{fontSize:11,color:GRAY,whiteSpace:'nowrap'}}>{filtered.length} items</span>
                </div>

                {/* Table */}
                {invLoading ? (
                  <div style={{padding:48,textAlign:'center'}}>
                    <div style={{width:30,height:30,border:`3px solid ${LGRAY}`,borderTopColor:T,borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 10px'}} />
                    <div style={{color:GRAY,fontSize:12}}>Loading inventory...</div>
                  </div>
                ) : (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 110px 90px 100px',padding:'9px 16px',background:'#fafbfc',borderBottom:`1px solid ${LGRAY}`}}>
                      {['Medicine','Category','Qty','Status'].map(h=>(
                        <div key={h} style={{fontSize:10,fontWeight:700,color:GRAY,textTransform:'uppercase',letterSpacing:0.5}}>{h}</div>
                      ))}
                    </div>
                    {filtered.slice(0,200).map((item,i)=>{
                      const tc=item.trend==='Stable'?'#27ae60':item.trend==='Low Stock'?'#f39c12':'#e74c3c';
                      return (
                        <div key={item.id} className="inv-row"
                          style={{display:'grid',gridTemplateColumns:'1fr 110px 90px 100px',padding:'9px 16px',borderBottom:`1px solid ${LGRAY}`,alignItems:'center',background:i%2===0?W:'#fafbfc',transition:'background 0.1s'}}>
                          <div>
                            <div style={{fontSize:12,fontWeight:500,color:DARK}}>{item.med_name}</div>
                            {item.pack_size&&<div style={{fontSize:10,color:GRAY}}>Pack: {item.pack_size}</div>}
                          </div>
                          <div style={{fontSize:11,color:GRAY}}>{item.category}</div>
                          <div style={{fontSize:13,fontWeight:700,color:item.quantity===0?'#e74c3c':DARK}}>{item.quantity.toLocaleString()}</div>
                          <div>
                            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:`${tc}18`,color:tc}}>
                              <div style={{width:4,height:4,borderRadius:'50%',background:tc}} />
                              {item.trend==='Depleting Fast'?'Critical':item.trend}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {filtered.length>200&&(
                      <div style={{padding:'12px 16px',textAlign:'center',color:GRAY,fontSize:11,background:'#fafbfc',borderTop:`1px solid ${LGRAY}`}}>
                        Showing 200 of {filtered.length.toLocaleString()} — use search to narrow
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
              <div style={{background:W,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.07)',overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,${T},${P})`,padding:'18px 20px'}}>
                  <div style={{fontSize:14,fontWeight:700,color:W}}>{shortName(selected.clinic_name)}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.75)',marginTop:2}}>Daily stock upload</div>
                </div>
                <div style={{padding:'20px'}}>
                  {/* Mode toggle */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:10,fontWeight:700,color:GRAY,letterSpacing:0.5,textTransform:'uppercase',marginBottom:8}}>Upload Mode</div>
                    <div style={{display:'flex',background:LGRAY,borderRadius:8,padding:3,gap:3}}>
                      {([{m:'replace',l:'Replace Stock'},{m:'merge',l:'Merge / Add'}] as const).map(({m,l})=>(
                        <button key={m} onClick={()=>setUploadMode(m as 'replace'|'merge')}
                          style={{flex:1,padding:'8px 0',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:uploadMode===m?W:'transparent',color:uploadMode===m?T:GRAY,boxShadow:uploadMode===m?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:GRAY,marginTop:6}}>{uploadMode==='replace'?'Clears all existing items and inserts the new file — best for daily morning uploads.':'Keeps existing items and adds new ones from the file.'}</div>
                  </div>

                  {/* Drop zone */}
                  <div onDrop={e=>{e.preventDefault();setDragOver(false);e.dataTransfer.files[0]&&handleFile(e.dataTransfer.files[0]);}}
                    onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                    onDragLeave={()=>setDragOver(false)}
                    onClick={()=>fileRef.current?.click()}
                    style={{border:`2px dashed ${dragOver?T:'#c8d6e5'}`,borderRadius:8,padding:'32px 20px',textAlign:'center',cursor:'pointer',background:dragOver?`${T}08`:'#fafbfc',transition:'all 0.2s',marginBottom:14}}>
                    <div style={{fontSize:32,marginBottom:8}}>⬆️</div>
                    <div style={{fontSize:13,fontWeight:600,color:DARK,marginBottom:4}}>{dragOver?'Drop to upload':'Drop your Excel file here'}</div>
                    <div style={{fontSize:11,color:GRAY}}>or click to browse · .xlsx .xls .csv</div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} />
                  </div>

                  {/* Progress */}
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

                  {/* Status */}
                  {uploadStatus && !uploading && (
                    <div style={{padding:'10px 14px',borderRadius:8,fontSize:12,fontWeight:500,
                      background:uploadStatus.type==='success'?'#e8f8f0':uploadStatus.type==='error'?'#fce4e4':'#e0f7f7',
                      color:uploadStatus.type==='success'?'#27ae60':uploadStatus.type==='error'?'#e74c3c':T,
                      border:`1px solid ${uploadStatus.type==='success'?'#a3e6b0':uploadStatus.type==='error'?'#f5b7b1':'#7fd4d4'}`}}>
                      {uploadStatus.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload guide */}
              <div style={{background:W,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.07)',padding:'20px'}}>
                <div style={{fontSize:13,fontWeight:700,color:DARK,marginBottom:4}}>Daily Workflow</div>
                <div style={{fontSize:11,color:GRAY,marginBottom:16}}>How to update stock every morning</div>
                {[
                  {n:'1',t:'Export from POS',d:'Run Stocktotals from Nexus, Medinol, or your pharmacy system. Save as Excel.',icon:'📤'},
                  {n:'2',t:'Select your branch',d:'Click your branch in the sidebar on the left, then tap Upload tab.',icon:'🏥'},
                  {n:'3',t:'Drop the file',d:'Use Replace Stock mode. Old numbers clear, new ones in. Under 30 seconds.',icon:'📂'},
                  {n:'4',t:'Done — live instantly',d:'WhatsApp and web search update immediately with the new quantities.',icon:'✅'},
                ].map(({n,t,d,icon})=>(
                  <div key={n} style={{display:'flex',gap:12,marginBottom:14,padding:'10px 12px',background:'#fafbfc',borderRadius:8,border:`1px solid ${LGRAY}`}}>
                    <div style={{width:30,height:30,borderRadius:6,background:`linear-gradient(135deg,${T},${P})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>{icon}</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:DARK,marginBottom:2}}>{n}. {t}</div>
                      <div style={{fontSize:11,color:GRAY,lineHeight:1.5}}>{d}</div>
                    </div>
                  </div>
                ))}
                <div style={{padding:'10px 12px',background:'#fff8e1',borderRadius:8,border:'1px solid #fde68a'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#92400e',marginBottom:2}}>💡 Pro tip</div>
                  <div style={{fontSize:11,color:'#78350f',lineHeight:1.5}}>Ask your IT team to schedule auto-export at 7am. We can then auto-import — zero manual uploads needed.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
