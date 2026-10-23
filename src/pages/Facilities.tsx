import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ExternalLink, Info, Loader2, MapPin, Phone, Search, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SiteHeader from '@/components/SiteHeader';

interface Facility {
  facility_name: string;
  facility_slug: string;
  facility_type: string | null;
  city_town: string | null;
  area: string | null;
  address: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  website: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  listing_status: string | null;
  stock_visibility: boolean | null;
  can_receive_reservations: boolean | null;
  public_note: string | null;
  disclaimer: string | null;
  source: string | null;
  notes: string | null;
  map_import_ready: boolean | null;
  updated_at: string | null;
}

const claimNumber = '26771424486';

const normalize = (value: string) => value.toLowerCase().trim();

const facilityTypeLabel = (type?: string | null) => {
  if (!type) return 'Facility';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const FacilitiesPage = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [city, setCity] = useState('all');

  const { data: facilities = [], isLoading, error } = useQuery<Facility[]>({
    queryKey: ['chekameds-public-facilities-map'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chekameds_public_facilities_map')
        .select('*')
        .order('city_town', { ascending: true })
        .order('facility_name', { ascending: true });

      if (error) throw error;
      return (data || []) as Facility[];
    },
  });

  const filteredFacilities = useMemo(() => {
    const q = normalize(query);
    return facilities.filter((facility) => {
      const matchesType = type === 'all' || normalize(facility.facility_type || '') === type;
      const matchesCity = city === 'all' || normalize(facility.city_town || '') === city;
      const haystack = normalize([
        facility.facility_name,
        facility.facility_type,
        facility.city_town,
        facility.area,
        facility.address,
        facility.notes,
      ].filter(Boolean).join(' '));
      const matchesQuery = !q || haystack.includes(q);
      return matchesType && matchesCity && matchesQuery;
    });
  }, [facilities, query, type, city]);

  const cities = useMemo(() => Array.from(new Set(facilities.map((f) => f.city_town).filter(Boolean).map((c) => normalize(c!)))).sort(), [facilities]);
  const connectedCount = facilities.filter((f) => f.stock_visibility || f.can_receive_reservations || f.listing_status === 'connected').length;

  const claimLink = (facility: Facility) => {
    const message = `Hello ChekaMeds, I want to claim or update this facility listing:%0A%0AFacility: ${facility.facility_name}%0ACity: ${facility.city_town || 'Not listed'}%0AArea: ${facility.area || 'Not listed'}%0A%0APlease assist.`;
    return `https://wa.me/${claimNumber}?text=${message}`;
  };

  const isConnected = (f: Facility) => !!(f.stock_visibility || f.can_receive_reservations || f.listing_status === 'connected');
  const connected = filteredFacilities.filter(isConnected);
  const directory = filteredFacilities.filter((f) => !isConnected(f));
  const tel = (v?: string | null) => (v || '').split(/[\/,]/)[0].replace(/[^0-9+]/g, '');

  const Row = ({ facility }: { facility: Facility }) => {
    const live = isConnected(facility);
    const phone = tel(facility.phone_whatsapp);
    return (
      <article className={`cm-fac${live ? ' live' : ''}`}>
        <div className="cm-fac-main">
          <div className="cm-fac-top">
            <h3>{facility.facility_name}</h3>
            {live && <span className="cms-badge">Live stock</span>}
          </div>
          <p className="cm-fac-sub">{facilityTypeLabel(facility.facility_type)} · {[facility.area, facility.city_town].filter(Boolean).join(', ') || 'Location not listed'}</p>
          {facility.address && <p className="cm-fac-line"><MapPin size={14} /> {facility.address}</p>}
        </div>
        <div className="cm-fac-acts">
          {phone && <a href={`tel:${phone}`} className="cms-btn cms-btn-g cms-btn-sm"><Phone size={14} /> Call</a>}
          {facility.google_maps_url && <a href={facility.google_maps_url} target="_blank" rel="noreferrer" className="cms-btn cms-btn-g cms-btn-sm"><ExternalLink size={14} /> Map</a>}
          {!live && <a href={claimLink(facility)} target="_blank" rel="noreferrer" className="cm-fac-claim">Is this yours? Claim it <ArrowRight size={13} /></a>}
        </div>
      </article>
    );
  };

  return (
    <div className="cms cm-facs">
      <style>{`
        .cm-facs-tools{display:grid;grid-template-columns:1fr 190px 190px;gap:10px;margin:28px 0 14px}
        .cm-facs-tools .wrap{position:relative}
        .cm-facs-tools .wrap svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)}
        .cm-facs-tools .wrap input{padding-left:42px}
        .cm-facs-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .cm-fac{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:16px 18px;border-radius:var(--r);background:var(--surface);border:1px solid var(--line)}
        .cm-fac.live{border-color:var(--g-line);background:radial-gradient(circle at 100% 0,rgba(41,242,154,.08),transparent 55%),var(--surface)}
        .cm-fac-main{min-width:0}
        .cm-fac-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .cm-fac h3{font-size:1rem;line-height:1.3}
        .cm-fac-sub{font-size:.84rem;color:var(--muted);margin-top:3px}
        .cm-fac-line{display:flex;gap:6px;align-items:flex-start;font-size:.82rem;color:var(--dim);margin-top:8px}
        .cm-fac-line svg{flex-shrink:0;margin-top:2px}
        .cm-fac-acts{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .cm-fac-acts .cms-btn{min-width:84px}
        .cm-fac-claim{font-size:.76rem;color:var(--dim);display:inline-flex;align-items:center;gap:4px;margin-top:2px}
        .cm-fac-claim:hover{color:var(--g)}
        .cm-group-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:32px 0 12px}
        .cm-group-h h2{font-size:1.2rem}
        .cm-join{margin-top:40px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
        @media(max-width:900px){.cm-facs-tools{grid-template-columns:1fr 1fr}.cm-facs-tools .wrap{grid-column:1/-1}.cm-facs-list{grid-template-columns:1fr}}
        @media(max-width:480px){.cm-fac{flex-direction:column}.cm-fac-acts{flex-direction:row;flex-wrap:wrap;align-items:center}}
      `}</style>
      <SiteHeader />

      <main className="cms-wrap cms-page" style={{ paddingTop: 0 }}>
        <section className="cms-hero">
          <span className="cms-eyebrow"><i /> Pharmacy directory</span>
          <h1 className="cms-h1" style={{ fontSize: 'clamp(2.1rem,4.4vw,3.2rem)' }}>Pharmacies and clinics in Botswana</h1>
          <p className="cms-lead">Find a pharmacy, hospital or clinic near you. Pharmacies marked <b style={{ color: 'var(--g)' }}>Live stock</b> share their stock on ChekaMeds, so you can search their medicines.</p>
        </section>

        <div className="cms-stats" style={{ ['--n' as string]: 3, marginTop: 28 }}>
          <div className="cms-stat"><b>{facilities.length || '—'}</b><span>facilities listed</span></div>
          <div className="cms-stat"><b>{connectedCount || '—'}</b><span>with live stock</span></div>
          <div className="cms-stat"><b>{cities.length || '—'}</b><span>towns covered</span></div>
        </div>

        <div className="cm-facs-tools">
          <div className="wrap">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, town or area" className="cms-input" aria-label="Search facilities" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="cms-select" aria-label="Facility type">
            <option value="all">All types</option>
            <option value="pharmacy">Pharmacies</option>
            <option value="clinic">Clinics</option>
            <option value="hospital">Hospitals</option>
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="cms-select" aria-label="Town">
            <option value="all">All towns</option>
            {cities.map((c) => <option key={c} value={c}>{c.replace(/\b\w/g, (m) => m.toUpperCase())}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="cms-small" style={{ padding: '56px 0', display: 'flex', justifyContent: 'center', gap: 10 }}><Loader2 size={18} className="cms-spin" /> Loading facilities…</div>
        ) : error ? (
          <div className="cms-note"><Info size={18} /> We could not load the directory right now. Please try again shortly.</div>
        ) : (
          <>
            {connected.length > 0 && (
              <>
                <div className="cm-group-h"><h2>Live stock on ChekaMeds</h2><span className="cms-small">{connected.length}</span></div>
                <div className="cm-facs-list">{connected.map((f) => <Row key={f.facility_slug} facility={f} />)}</div>
              </>
            )}
            {directory.length > 0 && (
              <>
                <div className="cm-group-h"><h2>Directory</h2><span className="cms-small">{directory.length}</span></div>
                <div className="cm-facs-list">{directory.map((f) => <Row key={f.facility_slug} facility={f} />)}</div>
              </>
            )}
            {filteredFacilities.length === 0 && <p className="cms-sub" style={{ padding: '40px 0' }}>No facilities match your search.</p>}
            <p className="cms-fine" style={{ marginTop: 16 }}>Directory entries are for location reference. Stock is only shown for pharmacies with live stock.</p>
          </>
        )}

        <div className="cms-card cm-join">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span className="cms-icon" style={{ marginBottom: 0 }}><Store size={20} /></span>
            <div>
              <h2 className="cms-h3" style={{ fontSize: '1.2rem' }}>Run a pharmacy?</h2>
              <p className="cms-sub" style={{ marginTop: 4 }}>Share your stock and get found by patients searching for your medicines. Free to start.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/register" className="cms-btn cms-btn-p">List your pharmacy</Link>
            <a href={`https://wa.me/${claimNumber}`} target="_blank" rel="noreferrer" className="cms-btn cms-btn-g">WhatsApp us</a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FacilitiesPage;
