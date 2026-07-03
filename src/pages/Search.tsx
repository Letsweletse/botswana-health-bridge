import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Pill, Package, Building2, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SiteHeader from '@/components/SiteHeader';
import heroBg from '@/assets/hero-bg.png';

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
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
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
    q > 100 ? { text: 'In Stock', cls: 'text-emerald-400' } : q >= 20 ? { text: 'Low Stock', cls: 'text-amber-400' } : { text: 'Limited', cls: 'text-red-400' };

  const groupedByClinic = useMemo(() => {
    const map = new Map<string, typeof results>();
    results.forEach((item) => {
      const existing = map.get(item.clinic_name) || [];
      existing.push(item);
      map.set(item.clinic_name, existing);
    });

    return Array.from(map.entries()).sort((a, b) => {
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

  return (
    <div className="min-h-screen font-[Gordita,system-ui,sans-serif] antialiased bg-[#020e08]">
      <SiteHeader ctaLabel="Clinic Login" ctaTo="/login" />

      <div className="pt-20">
        <div className="relative w-full">
          <img src={heroBg} alt="ChekaMeds — Find Medicines Faster" className="w-full h-auto block" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020e08] to-transparent" />
        </div>
      </div>

      <section className="relative max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 text-xs font-semibold mb-6 border border-emerald-500/20">
            <Pill className="h-3.5 w-3.5" /> Free · No login required
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Find Your Medicine <span className="text-emerald-400">Instantly</span>
          </h2>
          <p className="text-white/40 text-sm md:text-base max-w-lg mx-auto mb-6 font-light">
            Search by brand name, generic name, common name, symptom-style wording, or close misspelling.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <span className="text-xs text-white/30 mr-1">Try:</span>
            {['Panado', 'Paracetmol', 'Ibuprofen', 'Allergex', 'Heartburn', 'Esomep', 'Flu'].map((med) => (
              <button
                key={med}
                onClick={() => setQuickSearch(med)}
                className="text-xs px-3 py-1.5 border border-white/[0.1] bg-white/[0.03] hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 text-white/40 transition-all duration-200 font-medium"
              >
                {med}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Try Panado, Paracetmol, Allergex, Heartburn..."
            className="w-full pl-12 pr-4 h-14 text-base border border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors shadow-lg shadow-black/30"
            autoFocus
          />
          {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400 animate-spin" />}
        </motion.div>

        {searchHint && <p className="text-xs text-emerald-400/70 mt-3">{searchHint}</p>}

        {debouncedQuery.length >= 2 && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-6 mt-5 text-xs text-white/30">
            <span className="flex items-center gap-1.5"><Pill className="h-3.5 w-3.5 text-emerald-400" /><strong className="text-white/70">{uniqueMedicines}</strong> medicine{uniqueMedicines !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-emerald-400" /><strong className="text-white/70">{uniqueClinics}</strong> facilit{uniqueClinics !== 1 ? 'ies' : 'y'}</span>
          </motion.div>
        )}
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {debouncedQuery.length < 2 && query.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                {[
                  { icon: Search, label: 'Smarter search', desc: 'Brand, generic or common names' },
                  { icon: MapPin, label: 'Find facilities', desc: 'Active visible pharmacies only' },
                  { icon: Package, label: 'Check availability', desc: 'Stock and price where listed' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.08] p-5 text-center">
                    <div className="h-10 w-10 bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"><item.icon className="h-5 w-5 text-emerald-400" /></div>
                    <p className="text-xs font-semibold text-white/70 mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-white/30">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : debouncedQuery.length >= 2 && !isLoading && results.length === 0 ? (
            <motion.div key="no-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-16">
              <AlertCircle className="h-12 w-12 text-white/15 mx-auto mb-4" />
              <p className="text-lg font-semibold text-white mb-1">No exact result found</p>
              <p className="text-sm text-white/40 max-w-md mx-auto mb-5">No active facility currently lists <strong className="text-white/60">{debouncedQuery}</strong>. Try a generic name, brand name, shorter spelling, or one of the suggestions below.</p>
              {payload.suggestions.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {payload.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuickSearch(suggestion)}
                      className="text-xs px-3 py-1.5 border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all duration-200 font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {groupedByClinic.map(([clinicName, medicines], idx) => (
                <motion.div key={clinicName} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white/[0.03] border border-white/[0.08] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-emerald-500/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-emerald-400" /></div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{clinicName}</h3>
                        <p className="text-[10px] text-white/30">{medicines.length} matching medicine{medicines.length > 1 ? 's' : ''} listed</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 border font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Available</span>
                  </div>

                  <div className="divide-y divide-white/[0.04]">
                    {medicines.map((med) => (
                      <div key={`${med.id}-${med.med_name}`} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white/80 truncate">{med.med_name}</p>
                            {med.strength && <span className="text-[10px] text-white/30 bg-white/[0.05] px-1.5 py-0.5">{med.strength}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {med.dosage_form && <span className="text-[10px] text-white/25">{med.dosage_form}</span>}
                            {med.pack_size && <span className="text-[10px] text-white/25">· {med.pack_size}</span>}
                            <span className="text-[10px] text-white/25">· {med.category || 'Essential'}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {med.location && <p className="text-[10px] text-white/30">Location: {med.location}</p>}
                            {med.directions_link && (
                              <a href={med.directions_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 hover:text-emerald-200 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 transition-colors">
                                <MapPin className="h-3 w-3" /> Directions
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          {med.price_bwp != null && <p className="text-sm font-bold text-emerald-300">P {Number(med.price_bwp).toFixed(2)}</p>}
                          <p className={`text-xs font-semibold ${stockLabel(med.quantity).cls}`}>{stockLabel(med.quantity).text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default SearchPage;
