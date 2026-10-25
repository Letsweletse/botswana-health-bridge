import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, AlertCircle, Loader2, MapPin, MessageCircle, Phone, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SiteHeader from '@/components/SiteHeader';

interface InventoryItem {
  id: string;
  med_name: string;
  clinic_name: string;
  quantity: number;
  category: string | null;
  strength: string | null;
  dosage_form: string | null;
  pack_size: string | null;
  facility_level: string | null;
  price_bwp: number | null;
  location?: string | null;
  contact?: string | null;
  directions_link?: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  search_tokens?: string | null;
  updated_at: string;
}

interface SearchPayload {
  rows: InventoryItem[];
  expandedTerms: string[];
  usedAlias: boolean;
  suggestions: string[];
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const unique = (items: string[]) => Array.from(new Set(items.map(normalize).filter(Boolean)));

const commonCorrections: Record<string, string> = {
  panado: 'paracetamol',
  panadol: 'paracetamol',
  panadoo: 'paracetamol',
  panodo: 'paracetamol',
  paracetmol: 'paracetamol',
  parecetamol: 'paracetamol',
  parasetamol: 'paracetamol',
  paracitamol: 'paracetamol',
  brufen: 'ibuprofen',
  ibrufen: 'ibuprofen',
  ibrofen: 'ibuprofen',
  ibuprofin: 'ibuprofen',
  amoxil: 'amoxicillin',
  amoxilin: 'amoxicillin',
  amoxycillin: 'amoxicillin',
  disprin: 'aspirin',
  asprin: 'aspirin',
  allergex: 'chlorpheniramine',
  alergex: 'chlorpheniramine',
  allegex: 'chlorpheniramine',
  allejex: 'chlorpheniramine',
  cetrezine: 'cetirizine',
  cetrizine: 'cetirizine',
  citrizine: 'cetirizine',
  omperazole: 'omeprazole',
  esomperazole: 'esomeprazole',
  esomep: 'esomeprazole',
  citrosoda: 'citro soda',
  canesten: 'clotrimazole',
  candid: 'clotrimazole',
};

const normalizeSearchInput = (value: string) => {
  let text = normalize(value);
  if (commonCorrections[text]) return commonCorrections[text];
  Object.entries(commonCorrections).forEach(([wrong, correct]) => {
    text = text.replace(new RegExp(`\\b${wrong.replace(/\s+/g, '\\s+')}\\b`, 'g'), correct);
  });
  return text;
};

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }

  return prev[b.length];
};

const similarity = (a: string, b: string) => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return Math.min(0.92, Math.min(x.length, y.length) / Math.max(x.length, y.length) + 0.25);
  return Math.max(0, 1 - levenshtein(x, y) / Math.max(x.length, y.length));
};

const scoreItem = (item: InventoryItem, terms: string[]) => {
  const haystack = normalize([
    item.med_name,
    item.generic_name,
    item.brand_name,
    item.strength,
    item.dosage_form,
    item.category,
    item.search_tokens,
  ].filter(Boolean).join(' '));

  const med = normalize(item.med_name || '');
  let score = 0;

  for (const term of terms) {
    if (!term) continue;
    if (med === term) score += 160;
    if (med.startsWith(term)) score += 100;
    if (haystack.includes(term)) score += 60;

    const medSimilarity = similarity(med, term);
    if (medSimilarity >= 0.84) score += 90;
    else if (medSimilarity >= 0.72) score += 55;

    for (const part of term.split(' ')) {
      if (part.length >= 3 && haystack.includes(part)) score += 12;
    }
  }

  if (item.price_bwp != null) score += 8;
  if (item.quantity >= 100) score += 6;
  if (item.quantity > 0) score += 10;
  return score;
};

const fetchAliases = async (term: string) => {
  try {
    const normalizedTerm = normalizeSearchInput(term);
    const { data } = await (supabase as any)
      .from('medicine_aliases')
      .select('alias, canonical_name')
      .limit(2000);

    const aliases = ((data || []) as { alias: string; canonical_name: string }[])
      .map((item) => ({
        ...item,
        aliasScore: similarity(item.alias, normalizedTerm),
        canonicalScore: similarity(item.canonical_name, normalizedTerm),
      }))
      .filter((item) => {
        const alias = normalize(item.alias || '');
        const canonical = normalize(item.canonical_name || '');
        return alias.includes(normalizedTerm) || canonical.includes(normalizedTerm) || item.aliasScore >= 0.7 || item.canonicalScore >= 0.7;
      })
      .sort((a, b) => Math.max(b.aliasScore, b.canonicalScore) - Math.max(a.aliasScore, a.canonicalScore))
      .slice(0, 30)
      .map(({ alias, canonical_name }) => ({ alias, canonical_name }));

    return aliases;
  } catch (error) {
    console.warn('Alias lookup skipped:', error);
    return [];
  }
};

const logFailedSearch = async (query: string) => {
  try {
    await (supabase as any).from('failed_searches').insert({ query, source: 'web' });
  } catch (error) {
    console.warn('Failed search log skipped:', error);
  }
};

const runInventorySearch = async (terms: string[]) => {
  const selectFields = 'id, med_name, clinic_name, quantity, category, strength, dosage_form, pack_size, facility_level, price_bwp, location, contact, directions_link, generic_name, brand_name, search_tokens, updated_at';
  const safeTerms = unique(terms).slice(0, 20);
  const orFilter = safeTerms
    .flatMap((term) => [`med_name.ilike.%${term}%`, `generic_name.ilike.%${term}%`, `brand_name.ilike.%${term}%`, `category.ilike.%${term}%`, `search_tokens.ilike.%${term}%`])
    .join(',');

  if (!orFilter) return [];

  try {
    const { data, error } = await (supabase as any)
      .from('active_pharmacy_inventory')
      .select(selectFields)
      .or(orFilter)
      .gt('quantity', 0)
      .limit(300);

    if (error) throw error;
    return (data || []) as InventoryItem[];
  } catch (viewError) {
    console.warn('active_pharmacy_inventory unavailable, falling back to clinic_inventory:', viewError);

    const basicOrFilter = safeTerms.map((term) => `med_name.ilike.%${term}%`).join(',');
    const { data, error } = await supabase
      .from('clinic_inventory')
      .select('id, med_name, clinic_name, quantity, category, strength, dosage_form, pack_size, facility_level, price_bwp, location, contact, directions_link, updated_at')
      .or(basicOrFilter)
      .gt('quantity', 0)
      .neq('clinic_name', 'ChekaMeds Admin')
      .limit(300);

    if (error) throw error;
    return (data || []) as InventoryItem[];
  }
};

const SearchPage = () => {
  const initialQuery = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('q') || '').slice(0, 80) : '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery.trim());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedQuery(value.trim()), 400);
  };

  const { data: payload = { rows: [], expandedTerms: [], usedAlias: false, suggestions: [] }, isLoading } = useQuery<SearchPayload>({
    queryKey: ['public-medicine-search-v3', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { rows: [], expandedTerms: [], usedAlias: false, suggestions: [] };

      const normalizedQuery = normalizeSearchInput(debouncedQuery);
      const aliases = await fetchAliases(debouncedQuery);
      const expandedTerms = unique([debouncedQuery, normalizedQuery, ...aliases.map((a) => a.alias), ...aliases.map((a) => a.canonical_name)]);
      const rows = await runInventorySearch(expandedTerms);
      const suggestions = rows.length === 0
        ? unique(aliases.flatMap((a) => [a.canonical_name, a.alias])).slice(0, 5)
        : [];
      if (rows.length === 0) await logFailedSearch(debouncedQuery);

      return { rows, expandedTerms, usedAlias: aliases.length > 0 || normalize(debouncedQuery) !== normalizedQuery, suggestions };
    },
    enabled: debouncedQuery.length >= 2,
  });

  const results = useMemo(() => {
    const map = new Map<string, InventoryItem & { score: number }>();

    payload.rows.forEach((item) => {
      const key = [item.clinic_name, item.med_name, item.strength || ''].join('|').toLowerCase();
      const score = scoreItem(item, payload.expandedTerms);
      const next = { ...item, score };
      const existing = map.get(key);

      if (!existing || next.score > existing.score || (next.price_bwp != null && existing.price_bwp == null) || next.quantity > existing.quantity) {
        map.set(key, next);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aHasPrice = a.price_bwp != null;
      const bHasPrice = b.price_bwp != null;
      if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
      if (aHasPrice && bHasPrice && a.price_bwp !== b.price_bwp) return a.price_bwp! - b.price_bwp!;
      return b.quantity - a.quantity;
    });
  }, [payload]);

  const stockLabel = (q: number) =>
    q > 100 ? { text: 'In stock', cls: '' } : q >= 20 ? { text: 'Low stock', cls: 'amber' } : { text: 'Limited', cls: 'amber' };

  const groupedByClinic = useMemo(() => {
    const map = new Map<string, typeof results>();
    results.forEach((item) => {
      const existing = map.get(item.clinic_name) || [];
      existing.push(item);
      map.set(item.clinic_name, existing);
    });

    return Array.from(map.entries()).sort((a, b) => {
      // Pulse Pharmacy Tati always appears first
      const PRIORITY_CLINIC = 'Pulse Pharmacy Tati Siding';
      if (a[0] === PRIORITY_CLINIC) return -1;
      if (b[0] === PRIORITY_CLINIC) return 1;
      const aBest = Math.max(...a[1].map((m) => m.score));
      const bBest = Math.max(...b[1].map((m) => m.score));
      if (aBest !== bBest) return bBest - aBest;
      const aMin = Math.min(...a[1].map((m) => m.price_bwp ?? Infinity));
      const bMin = Math.min(...b[1].map((m) => m.price_bwp ?? Infinity));
      if (aMin !== bMin) return aMin - bMin;
      return b[1].length - a[1].length;
    });
  }, [results]);

  const uniqueMedicines = new Set(results.map((r) => r.med_name)).size;
  const uniqueClinics = new Set(results.map((r) => r.clinic_name)).size;
  const searchHint = payload.usedAlias && payload.expandedTerms.length > 1
    ? `Also searched: ${payload.expandedTerms.filter((t) => normalize(t) !== normalize(debouncedQuery)).slice(0, 3).join(', ')}`
    : null;

  const setQuickSearch = (medicine: string) => {
    setQuery(medicine);
    setDebouncedQuery(medicine);
  };

  const WA_SEARCH = 'https://wa.me/26771424486?text=' + encodeURIComponent(`Hi ChekaMeds, I am looking for ${debouncedQuery || 'a medicine'}.`);
  const deliveryLink = (med: InventoryItem) =>
    `/delivery?inventory_id=${encodeURIComponent(med.id)}&medicine_name=${encodeURIComponent([med.med_name, med.strength].filter(Boolean).join(' '))}&pharmacy_name=${encodeURIComponent(med.clinic_name)}${med.contact ? `&pharmacy_contact=${encodeURIComponent(med.contact)}` : ''}`;

  return (
    <div className="cms cm-search">
      <style>{`
        .cm-search-hero{padding:56px 0 28px;text-align:center;display:grid;justify-items:center;gap:14px}
        .cm-search-box{position:relative;width:min(680px,100%);margin-top:14px}
        .cm-search-box svg.lead{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:var(--muted)}
        .cm-search-box input{height:62px!important;padding-left:52px;padding-right:52px;font-size:1.08rem;border-radius:16px;background:rgba(17,16,15,.35)!important;backdrop-filter:blur(20px)}
        .cm-search-box .spin{position:absolute;right:18px;top:50%;margin-top:-10px;color:var(--g)}
        .cm-try{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;align-items:center;margin-top:4px}
        .cm-try span{font-size:.84rem;color:var(--dim);margin-right:2px}
        .cm-meta{display:flex;gap:20px;justify-content:center;font-size:.88rem;color:var(--muted);margin-top:6px}
        .cm-meta b{color:#fff}
        .cm-results{width:min(820px,100%);margin:0 auto;padding:12px 0 96px;display:grid;gap:14px}
        .cm-res{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden}
        .cm-res-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line)}
        .cm-res-hd h3{font-size:1.02rem}
        .cm-res-hd p{font-size:.82rem;color:var(--muted);margin-top:2px}
        .cm-res-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;border-bottom:1px solid var(--line)}
        .cm-res-row:last-child{border-bottom:0}
        .cm-res-name{font-weight:600;color:#f6fffa}
        .cm-res-sub{font-size:.82rem;color:var(--muted);margin-top:3px}
        .cm-res-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .cm-res-acts a{display:inline-flex;align-items:center;gap:5px;font-size:.8rem;font-weight:600;color:var(--g);padding:5px 10px;border-radius:8px;background:var(--g-soft)}
        .cm-res-price{text-align:right;flex-shrink:0}
        .cm-res-price b{display:block;font:800 1.05rem var(--head);color:#f6fffa}
        .cm-empty{text-align:center;padding:48px 0 96px;display:grid;justify-items:center;gap:12px}
        .cm-how{width:min(820px,100%);margin:20px auto 96px}
        @media(max-width:600px){.cm-search-hero{padding-top:32px}.cm-res-row{align-items:flex-start}.cm-res-hd,.cm-res-row{padding-left:16px;padding-right:16px}}
      `}</style>
      <SiteHeader />

      <div className="cms-wrap">
        <section className="cm-search-hero">
          <span className="cms-eyebrow"><i /> Free · No login needed</span>
          <h1 className="cms-h1" style={{ fontSize: 'clamp(2.1rem,4.6vw,3.4rem)' }}>Find your medicine</h1>
          <p className="cms-sub" style={{ margin: '0 auto' }}>Search by brand, generic or common name. Close spellings work too.</p>

          <div className="cm-search-box">
            <Search size={20} className="lead" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="e.g. Panado, amoxicillin, heartburn"
              className="cms-input"
              aria-label="Search for a medicine"
              autoFocus
            />
            {isLoading && <Loader2 size={20} className="spin cms-spin" />}
          </div>

          <div className="cm-try">
            <span>Try:</span>
            {['Panado', 'Ibuprofen', 'Allergex', 'Amoxicillin', 'Heartburn', 'Esomep'].map((med) => (
              <button key={med} type="button" onClick={() => setQuickSearch(med)} className="cms-chip">{med}</button>
            ))}
          </div>

          {searchHint && <p className="cms-small" style={{ color: 'var(--g)' }}>{searchHint}</p>}
          {debouncedQuery.length >= 2 && !isLoading && results.length > 0 && (
            <div className="cm-meta">
              <span><b>{uniqueMedicines}</b> medicine{uniqueMedicines !== 1 ? 's' : ''}</span>
              <span><b>{uniqueClinics}</b> pharmac{uniqueClinics !== 1 ? 'ies' : 'y'}</span>
            </div>
          )}
        </section>

        {debouncedQuery.length < 2 && query.length === 0 ? (
          <div className="cm-how">
            <div className="cms-grid-3">
              <div className="cms-card cms-card-tight"><span className="cms-icon"><Search size={19} /></span><h3 className="cms-h3">1. Search</h3><p>Type the medicine name. We also search generic and brand names.</p></div>
              <div className="cms-card cms-card-tight"><span className="cms-icon"><Building2 size={19} /></span><h3 className="cms-h3">2. Pick a pharmacy</h3><p>See who reports it in stock, with price where listed.</p></div>
              <div className="cms-card cms-card-tight"><span className="cms-icon"><Truck size={19} /></span><h3 className="cms-h3">3. Collect or deliver</h3><p>Call to confirm, get directions, or request delivery.</p></div>
            </div>
            <p className="cms-small" style={{ textAlign: 'center', marginTop: 22 }}>
              Prefer WhatsApp? <a href={WA_SEARCH} target="_blank" rel="noreferrer" className="cms-link">Message 71 424 486</a>
            </p>
          </div>
        ) : debouncedQuery.length >= 2 && !isLoading && results.length === 0 ? (
          <div className="cm-empty">
            <AlertCircle size={40} color="#6b8276" />
            <h2 className="cms-h3" style={{ fontSize: '1.3rem' }}>No pharmacy lists "{debouncedQuery}" right now</h2>
            <p className="cms-sub">Try the generic name, a shorter spelling, or one of these. We've logged your search so pharmacies can see the demand.</p>
            {payload.suggestions.length > 0 && (
              <div className="cm-try">
                {payload.suggestions.map((s) => <button key={s} type="button" onClick={() => setQuickSearch(s)} className="cms-chip">{s}</button>)}
              </div>
            )}
            <a href={WA_SEARCH} target="_blank" rel="noreferrer" className="cms-btn cms-btn-g" style={{ marginTop: 8 }}><MessageCircle size={16} /> Ask us on WhatsApp</a>
          </div>
        ) : (
          <div className="cm-results">
            {groupedByClinic.map(([clinicName, medicines]) => (
              <article key={clinicName} className="cm-res">
                <div className="cm-res-hd">
                  <div>
                    <h3>{clinicName}</h3>
                    <p>{medicines.length} matching medicine{medicines.length > 1 ? 's' : ''}{medicines[0]?.location ? ` · ${medicines[0].location}` : ''}</p>
                  </div>
                  <span className="cms-badge">Reports in stock</span>
                </div>
                {medicines.map((med) => {
                  const st = stockLabel(med.quantity);
                  const tel = (med.contact || '').replace(/[^0-9+]/g, '');
                  return (
                    <div key={`${med.id}-${med.med_name}`} className="cm-res-row">
                      <div style={{ minWidth: 0 }}>
                        <p className="cm-res-name">{med.med_name}{med.strength ? ` ${med.strength}` : ''}</p>
                        <p className="cm-res-sub">{[med.dosage_form, med.pack_size, med.category].filter(Boolean).join(' · ') || 'Medicine'}</p>
                        <div className="cm-res-acts">
                          {tel && <a href={`tel:${tel}`}><Phone size={13} /> Call to confirm</a>}
                          {med.directions_link && <a href={med.directions_link} target="_blank" rel="noopener noreferrer"><MapPin size={13} /> Directions</a>}
                          <Link to={deliveryLink(med)}><Truck size={13} /> Deliver</Link>
                        </div>
                      </div>
                      <div className="cm-res-price">
                        {med.price_bwp != null && <b>P {Number(med.price_bwp).toFixed(2)}</b>}
                        <span className={`cms-badge ${st.cls}`} style={{ marginTop: 6 }}>{st.text}</span>
                      </div>
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
