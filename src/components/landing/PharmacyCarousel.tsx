import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* An endless, slowly moving row of pharmacies on ChekaMeds ("Glass Night").
   Live-stock pharmacies come from the public inventory view; directory
   pharmacies come from the public facilities view. Names and towns only. */

type Pharm = { name: string; town: string; live: boolean };

const tidy = (v?: string | null) => (v || '').replace(/\s+/g, ' ').trim();
const key = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

export default function PharmacyCarousel() {
  const { data = [] } = useQuery<Pharm[]>({
    queryKey: ['landing-pharmacy-carousel'],
    staleTime: 30 * 60 * 1000,
    retry: 0,
    queryFn: async () => {
      const [inv, dir] = await Promise.all([
        (supabase as any).from('active_pharmacy_inventory').select('clinic_name').ilike('med_name', '%paracetamol%').gt('quantity', 0).limit(400),
        (supabase as any).from('chekameds_public_facilities_map').select('facility_name, facility_type, city_town').limit(200),
      ]);
      const out = new Map<string, Pharm>();
      for (const r of (inv.data || []) as { clinic_name: string }[]) {
        const name = tidy(r.clinic_name);
        if (!name || /chekameds/i.test(name)) continue;
        if (!out.has(key(name))) out.set(key(name), { name, town: '', live: true });
      }
      for (const r of (dir.data || []) as { facility_name: string; facility_type: string | null; city_town: string | null }[]) {
        if ((r.facility_type || '').toLowerCase() !== 'pharmacy') continue;
        const name = tidy(r.facility_name);
        if (!name) continue;
        const hit = out.get(key(name));
        if (hit) { if (!hit.town) hit.town = tidy(r.city_town); continue; }
        out.set(key(name), { name, town: tidy(r.city_town), live: false });
      }
      return Array.from(out.values()).sort((a, b) => Number(b.live) - Number(a.live));
    },
  });

  const rows = useMemo(() => {
    if (data.length < 4) return null;
    const half = Math.ceil(data.length / 2);
    return [data.slice(0, half), data.slice(half)];
  }, [data]);

  if (!rows) return null;

  return (
    <section className="cm-pc" aria-labelledby="cm-pc-title">
      <style>{`
        .cm-pc{padding:96px 0 0;overflow:hidden}
        .cm-pc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:28px}
        .cm-pc-track{position:relative;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
        .cm-pc-row{display:flex;gap:14px;width:max-content;padding:7px 0;animation:cm-pc-move var(--dur,60s) linear infinite}
        .cm-pc-row.rev{animation-direction:reverse}
        .cm-pc-track:hover .cm-pc-row,.cm-pc-track:focus-within .cm-pc-row{animation-play-state:paused}
        @keyframes cm-pc-move{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .cm-pc-card{flex:0 0 auto;display:flex;align-items:center;gap:14px;min-width:260px;padding:16px 20px 16px 16px;border-radius:20px;background:rgba(17,16,15,.35);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);transition:border-color .2s,background .2s}
        .cm-pc-card:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.06)}
        .cm-pc-mono{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.08);font:500 15px Inter,sans-serif;color:#fff;flex-shrink:0;letter-spacing:.02em}
        .cm-pc-name{font-size:15px;color:#fff;line-height:1.25;white-space:nowrap}
        .cm-pc-meta{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:12.5px;color:rgba(255,255,255,.6);white-space:nowrap}
        .cm-pc-live{font-size:11px;padding:3px 7px;border-radius:6px;background:rgba(94,234,168,.12);color:#5eeaa8}
        @media(prefers-reduced-motion:reduce){
          .cm-pc-row{animation:none;flex-wrap:nowrap}
          .cm-pc-track{overflow-x:auto;-webkit-mask-image:none;mask-image:none}
          .cm-pc-row .dup{display:none}
        }
      `}</style>
      <div className="cms-wrap cm-pc-head">
        <div style={{ display: 'grid', gap: 12 }}>
          <h2 id="cm-pc-title" className="cms-h2">Pharmacies on ChekaMeds</h2>
          <p className="cms-sub">From Gaborone to Maun. Pharmacies marked live share their stock, so you can search their medicines.</p>
        </div>
        <Link to="/facilities" className="cms-btn cms-btn-g cms-btn-sm" style={{ borderColor: 'rgba(255,255,255,.35)' }}>See all pharmacies</Link>
      </div>
      <div className="cm-pc-track">
        {rows.map((row, ri) => (
          <div key={ri} className={`cm-pc-row${ri === 1 ? ' rev' : ''}`} style={{ ['--dur' as string]: `${Math.max(40, row.length * 6)}s` }}>
            {[0, 1].map((copy) => row.map((p) => (
              <Link
                key={`${copy}-${p.name}`}
                to={`/facilities?q=${encodeURIComponent(p.name)}`}
                className={`cm-pc-card${copy ? ' dup' : ''}`}
                aria-hidden={copy ? true : undefined}
                tabIndex={copy ? -1 : undefined}
              >
                <span className="cm-pc-mono" aria-hidden="true">{p.name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                <span>
                  <span className="cm-pc-name">{p.name}</span>
                  <span className="cm-pc-meta">
                    {p.town && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{p.town}</span>}
                    {p.live && <span className="cm-pc-live">Live stock</span>}
                  </span>
                </span>
              </Link>
            )))}
          </div>
        ))}
      </div>
    </section>
  );
}
