import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Pill, Package, Building2, AlertCircle, Loader2, MapPin, Home, BookmarkIcon, User, Map, Phone, Navigation, ChevronRight, X, Star, Clock, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  panado: 'paracetamol', panadol: 'paracetamol', panadoo: 'paracetamol', panodo: 'paracetamol',
  paracetmol: 'paracetamol', parecetamol: 'paracetamol', parasetamol: 'paracetamol', paracitamol: 'paracetamol',
  brufen: 'ibuprofen', ibrufen: 'ibuprofen', ibrofen: 'ibuprofen', ibuprofin: 'ibuprofen',
  amoxil: 'amoxicillin', amoxilin: 'amoxicillin', amoxycillin: 'amoxicillin',
  disprin: 'aspirin', asprin: 'aspirin',
  allergex: 'chlorpheniramine', alergex: 'chlorpheniramine', allegex: 'chlorpheniramine',
  cetrezine: 'cetirizine', cetrizine: 'cetirizine', citrizine: 'cetirizine',
  omperazole: 'omeprazole', esomperazole: 'esomeprazole', esomep: 'esomeprazole',
  citrosoda: 'citro soda', canesten: 'clotrimazole', candid: 'clotrimazole',
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
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
};

const similarity = (a: string, b: string) => {
  const x = normalize(a), y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return Math.min(0.92, Math.min(x.length, y.length) / Math.max(x.length, y.length) + 0.25);
  return Math.max(0, 1 - levenshtein(x, y) / Math.max(x.length, y.length));
};

const scoreItem = (item: InventoryItem, terms: string[]) => {
  const haystack = normalize([item.med_name, item.generic_name, item.brand_name, item.strength, item.dosage_form, item.category, item.search_tokens].filter(Boolean).join(' '));
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
    const { data } = await (supabase as any).from('medicine_aliases').select('alias, canonical_name').limit(2000);
    return ((data || []) as { alias: string; canonical_name: string }[])
      .map((item) => ({ ...item, aliasScore: similarity(item.alias, normalizedTerm), canonicalScore: similarity(item.canonical_name, normalizedTerm) }))
      .filter((item) => {
        const alias = normalize(item.alias || ''), canonical = normalize(item.canonical_name || '');
        return alias.includes(normalizedTerm) || canonical.includes(normalizedTerm) || item.aliasScore >= 0.7 || item.canonicalScore >= 0.7;
      })
      .sort((a, b) => Math.max(b.aliasScore, b.canonicalScore) - Math.max(a.aliasScore, a.canonicalScore))
      .slice(0, 30).map(({ alias, canonical_name }) => ({ alias, canonical_name }));
  } catch { return []; }
};

const logFailedSearch = async (query: string) => {
  try { await (supabase as any).from('failed_searches').insert({ query, source: 'web' }); } catch {}
};

const runInventorySearch = async (terms: string[]) => {
  const selectFields = 'id, med_name, clinic_name, quantity, category, strength, dosage_form, pack_size, facility_level, price_bwp, location, contact, directions_link, generic_name, brand_name, search_tokens, updated_at';
  const safeTerms = unique(terms).slice(0, 20);
  const orFilter = safeTerms.flatMap((term) => [`med_name.ilike.%${term}%`, `generic_name.ilike.%${term}%`, `brand_name.ilike.%${term}%`, `category.ilike.%${term}%`, `search_tokens.ilike.%${term}%`]).join(',');
  if (!orFilter) return [];
  try {
    const { data, error } = await (supabase as any).from('active_pharmacy_inventory').select(selectFields).or(orFilter).gt('quantity', 0).limit(300);
    if (error) throw error;
    return (data || []) as InventoryItem[];
  } catch {
    const basicOrFilter = safeTerms.map((term) => `med_name.ilike.%${term}%`).join(',');
    const { data } = await supabase.from('clinic_inventory').select('id, med_name, clinic_name, quantity, category, strength, dosage_form, pack_size, facility_level, price_bwp, location, contact, directions_link, updated_at').or(basicOrFilter).gt('quantity', 0).neq('clinic_name', 'ChekaMeds Admin').limit(300);
    return (data || []) as InventoryItem[];
  }
};

// Skeleton card component
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-gray-100 rounded-xl" />
      <div className="flex-1">
        <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-6 bg-gray-100 rounded-full w-20" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-4/5" />
    </div>
    <div className="flex gap-2 mt-4">
      <div className="h-9 bg-gray-100 rounded-xl flex-1" />
      <div className="h-9 bg-gray-100 rounded-xl flex-1" />
      <div className="h-9 bg-gray-100 rounded-xl w-9" />
    </div>
  </div>
);

// Bottom navigation
const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'saved', icon: BookmarkIcon, label: 'Saved' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100" style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}>
      <div className="flex items-center justify-around px-2 pt-2 pb-3 max-w-lg mx-auto">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)} className="flex flex-col items-center gap-1 min-w-[52px] group">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${activeTab === id ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30 scale-110' : 'bg-transparent group-hover:bg-gray-50'}`}>
              <Icon className={`w-5 h-5 transition-colors ${activeTab === id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] font-semibold transition-colors ${activeTab === id ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// WhatsApp floating button
const WhatsAppFAB = () => (
  <a href="https://wa.me/26771424486" target="_blank" rel="noopener noreferrer"
    className="fixed bottom-24 right-4 z-40 flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-xl shadow-emerald-500/40 hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95">
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    <span className="text-sm font-bold">71424486</span>
  </a>
);

// Stock badge
const StockBadge = ({ qty }: { qty: number }) => {
  if (qty > 100) return <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">In stock</span>;
  if (qty >= 20) return <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">Low stock</span>;
  return <span className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">Limited</span>;
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
  };
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedQuery(value.trim()), 400);
  };

  const { data: payload = { rows: [], expandedTerms: [], usedAlias: false, suggestions: [] }, isLoading } = useQuery<SearchPayload>({
    queryKey: ['public-medicine-search-v4', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { rows: [], expandedTerms: [], usedAlias: false, suggestions: [] };
      const normalizedQuery = normalizeSearchInput(debouncedQuery);
      const aliases = await fetchAliases(debouncedQuery);
      const expandedTerms = unique([debouncedQuery, normalizedQuery, ...aliases.map((a) => a.alias), ...aliases.map((a) => a.canonical_name)]);
      const rows = await runInventorySearch(expandedTerms);
      const suggestions = rows.length === 0 ? unique(aliases.flatMap((a) => [a.canonical_name, a.alias])).slice(0, 5) : [];
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
      if (!existing || next.score > existing.score || (next.price_bwp != null && existing.price_bwp == null) || next.quantity > existing.quantity) map.set(key, next);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aHasPrice = a.price_bwp != null, bHasPrice = b.price_bwp != null;
      if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
      if (aHasPrice && bHasPrice && a.price_bwp !== b.price_bwp) return a.price_bwp! - b.price_bwp!;
      return b.quantity - a.quantity;
    });
  }, [payload]);

  const groupedByClinic = useMemo(() => {
    const map = new Map<string, typeof results>();
    results.forEach((item) => {
      const existing = map.get(item.clinic_name) || [];
      existing.push(item);
      map.set(item.clinic_name, existing);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const aBest = Math.max(...a[1].map((m) => m.score)), bBest = Math.max(...b[1].map((m) => m.score));
      if (aBest !== bBest) return bBest - aBest;
      const aMin = Math.min(...a[1].map((m) => m.price_bwp ?? Infinity)), bMin = Math.min(...b[1].map((m) => m.price_bwp ?? Infinity));
      return aMin !== bMin ? aMin - bMin : b[1].length - a[1].length;
    });
  }, [results]);

  const uniqueClinics = new Set(results.map((r) => r.clinic_name)).size;
  const cheapest = results.filter(r => r.price_bwp != null).sort((a,b) => (a.price_bwp ?? 0) - (b.price_bwp ?? 0))[0];
  const setQuickSearch = (medicine: string) => { setQuery(medicine); setDebouncedQuery(medicine); };
  const clearSearch = () => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); };

  const filters = ['all', 'open now', 'cheapest', 'delivery', '24 hours'];

  return (
    <div className="min-h-screen bg-gray-50 font-[system-ui,sans-serif] antialiased">

      {/* Top search header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          {/* Logo row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Pill className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-gray-900 text-base tracking-tight">ChekaMeds</span>
            </div>
            <a href="https://wa.me/26771424486" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              71424486
            </a>
          </div>

          {/* Search input */}
          <div className={`flex items-center gap-3 bg-gray-50 border-2 rounded-2xl px-4 h-14 transition-all duration-200 ${searchFocused ? 'border-emerald-400 bg-white shadow-lg shadow-emerald-500/10' : 'border-gray-100'}`}>
            <Search className={`w-5 h-5 flex-shrink-0 transition-colors ${searchFocused ? 'text-emerald-500' : 'text-gray-300'}`} strokeWidth={2.5} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search medicine, brand, symptom..."
              className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 text-base font-medium outline-none"
            />
            {isLoading && <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />}
            {query && !isLoading && (
              <button onClick={clearSearch} className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Quick search chips */}
          {!debouncedQuery && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
              {['Panado', 'Amoxicillin', 'Ventolin', 'Augmentin', 'Allergex', 'Ibuprofen'].map((med) => (
                <button key={med} onClick={() => setQuickSearch(med)}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 rounded-full transition-all">
                  {med}
                </button>
              ))}
            </div>
          )}

          {/* Filters - only when results */}
          {debouncedQuery && results.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
              {filters.map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full capitalize transition-all ${activeFilter === f ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PWA Install banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3 max-w-lg mx-auto">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">Add ChekaMeds to your home screen</div>
              <div className="text-xs text-gray-400">Access instantly, works offline</div>
            </div>
            <button onClick={handleInstall} className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0">Install</button>
            <button onClick={() => setShowInstallBanner(false)} className="text-gray-400 flex-shrink-0"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="max-w-lg mx-auto px-4 pb-32">
        <AnimatePresence mode="wait">

          {/* Empty / Home state */}
          {!debouncedQuery && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Hero banner */}
              <div className="mt-4 bg-emerald-500 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -right-4 bottom-0 w-20 h-20 bg-white/10 rounded-full" />
                <div className="relative z-10">
                  <div className="text-xs font-bold tracking-widest uppercase opacity-80 mb-1">ChekaMeds · Botswana</div>
                  <div className="text-2xl font-black leading-tight mb-2">Find your medicine<br/>near you, instantly</div>
                  <div className="text-sm opacity-90 mb-4">Search across pharmacies in Botswana. No app needed.</div>
                  <a href="https://wa.me/26771424486" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold text-sm px-4 py-2.5 rounded-xl">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp 71424486
                  </a>
                </div>
              </div>

              {/* Quick access cards */}
              <div className="mt-5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick access</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: '💊', label: 'Medicine', sub: 'Search stock' },
                    { icon: '🏥', label: 'Pharmacies', sub: 'Find nearby' },
                    { icon: '🚚', label: 'Delivery', sub: 'To your door' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-xs font-bold text-gray-800">{item.label}</div>
                      <div className="text-[10px] text-gray-400">{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="mt-5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">How it works</div>
                <div className="space-y-3">
                  {[
                    { step: '1', text: 'Type any medicine name — brand, generic, or even a misspelling' },
                    { step: '2', text: 'See which pharmacies have it in stock near you' },
                    { step: '3', text: 'Get directions, call, or WhatsApp them directly' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-white">{item.step}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading skeletons */}
          {isLoading && debouncedQuery.length >= 2 && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </motion.div>
          )}

          {/* No results */}
          {debouncedQuery.length >= 2 && !isLoading && results.length === 0 && (
            <motion.div key="no-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-9 h-9 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Not found nearby</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">No pharmacy currently lists <span className="font-semibold text-gray-600">"{debouncedQuery}"</span>. Try a different name or notify a pharmacy.</p>

              <div className="space-y-3">
                <a href={`https://wa.me/26771424486?text=Hi, I'm looking for ${query}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between bg-emerald-500 text-white rounded-2xl p-4 shadow-lg shadow-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <div className="text-left">
                      <div className="font-bold text-sm">Ask on WhatsApp</div>
                      <div className="text-xs opacity-80">We'll help find it for you</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-70" />
                </a>

                {payload.suggestions.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold text-gray-400 mb-3">Did you mean?</p>
                    <div className="flex flex-wrap gap-2">
                      {payload.suggestions.map((s) => (
                        <button key={s} onClick={() => setQuickSearch(s)}
                          className="text-sm font-semibold px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Results */}
          {debouncedQuery.length >= 2 && !isLoading && results.length > 0 && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Summary bar */}
              <div className="mt-4 grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                  <div className="text-xl font-black text-emerald-600">{uniqueClinics}</div>
                  <div className="text-[10px] font-semibold text-gray-400">Pharmacies</div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                  <div className="text-xl font-black text-emerald-600">{cheapest?.price_bwp ? `P${Number(cheapest.price_bwp).toFixed(0)}` : '—'}</div>
                  <div className="text-[10px] font-semibold text-gray-400">From</div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                  <div className="text-xl font-black text-emerald-600">{results.length}</div>
                  <div className="text-[10px] font-semibold text-gray-400">Results</div>
                </div>
              </div>

              {/* WhatsApp helper strip */}
              <a href={`https://wa.me/26771424486?text=Hi, I'm looking for ${query}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-4">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-emerald-600 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <div className="flex-1">
                  <span className="text-sm font-bold text-emerald-700">Need help? WhatsApp 71424486</span>
                  <span className="text-xs text-emerald-500 block">Tap to ask about {query}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </a>

              {/* Pharmacy cards */}
              <div className="space-y-4">
                {groupedByClinic.map(([clinicName, medicines], idx) => (
                  <motion.div key={clinicName} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                    className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    {/* Clinic header */}
                    <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
                      <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{clinicName}</h3>
                        <p className="text-xs text-gray-400">{medicines.length} medicine{medicines.length > 1 ? 's' : ''} available</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-emerald-600">Open</span>
                      </div>
                    </div>

                    {/* Medicine rows */}
                    <div className="divide-y divide-gray-50">
                      {medicines.map((med) => (
                        <div key={`${med.id}-${med.med_name}`} className="px-5 py-3.5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{med.med_name}</span>
                                {med.strength && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{med.strength}</span>}
                              </div>
                              {med.dosage_form && <span className="text-xs text-gray-400">{med.dosage_form}{med.pack_size ? ` · ${med.pack_size}` : ''}</span>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {med.price_bwp != null && <div className="font-black text-emerald-600 text-base">P{Number(med.price_bwp).toFixed(2)}</div>}
                              <StockBadge qty={med.quantity} />
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-2">
                            {med.directions_link ? (
                              <a href={med.directions_link} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 flex-1 justify-center bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-md shadow-emerald-500/25 hover:bg-emerald-600 active:scale-95 transition-all">
                                <Navigation className="w-3.5 h-3.5" />
                                Directions
                              </a>
                            ) : (
                              <a href={`https://wa.me/26771424486?text=Hi, I need ${med.med_name} from ${clinicName}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 flex-1 justify-center bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-md shadow-emerald-500/25 hover:bg-emerald-600 active:scale-95 transition-all">
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                Reserve
                              </a>
                            )}
                            {med.contact && (
                              <a href={`tel:${med.contact}`}
                                className="flex items-center gap-1.5 px-4 justify-center bg-gray-50 text-gray-600 text-xs font-bold py-2.5 rounded-xl border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all">
                                <Phone className="w-3.5 h-3.5" />
                                Call
                              </a>
                            )}
                            <a href={`https://wa.me/26771424486?text=Hi, I need ${med.med_name} from ${clinicName}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-center w-10 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all">
                              <Truck className="w-4 h-4 text-gray-400" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="mt-6 bg-gray-900 rounded-3xl p-5 text-white text-center">
                <div className="text-sm font-bold mb-1">Can't find what you need?</div>
                <div className="text-xs text-gray-400 mb-4">WhatsApp us and we'll locate it for you across Botswana</div>
                <a href="https://wa.me/26771424486" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/30">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp 71424486
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WhatsApp FAB */}
      <WhatsAppFAB />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default SearchPage;
