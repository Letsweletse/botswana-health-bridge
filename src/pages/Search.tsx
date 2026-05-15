import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Pill, Package, ArrowRight, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/ChekaMeds_Logo.png';
import heroBg from '@/assets/hero-bg.png';

interface InventoryItem {
  id: string;
  med_name: string;
  clinic_name: string;
  quantity: number;
  category: string;
  strength: string | null;
  dosage_form: string | null;
  pack_size: string | null;
  facility_level: string | null;
  price_bwp: number | null;
  updated_at: string;
}

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    clearTimeout((window as any).__searchTimeout);
    (window as any).__searchTimeout = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 400);
  };

  const { data: rawResults = [], isLoading } = useQuery({
    queryKey: ['public-medicine-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('active_pharmacy_inventory')
        .select('id, med_name, clinic_name, quantity, category, strength, dosage_form, pack_size, facility_level, price_bwp, updated_at')
        .ilike('med_name', `%${debouncedQuery}%`)
        .gt('quantity', 0)
                .limit(100);
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: debouncedQuery.length >= 2,
  });

  const results = useMemo(() => {
    // Dedupe: one record per clinic+medication. Prefer lowest price, then highest quantity.
    const map = new Map<string, InventoryItem>();
    rawResults.forEach(item => {
      const key = [item.clinic_name, item.med_name].join('|').toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        return;
      }
      const eHasPrice = existing.price_bwp != null;
      const iHasPrice = item.price_bwp != null;
      if (iHasPrice && !eHasPrice) { map.set(key, item); return; }
      if (iHasPrice && eHasPrice && item.price_bwp! < existing.price_bwp!) { map.set(key, item); return; }
      if (!iHasPrice && !eHasPrice && item.quantity > existing.quantity) { map.set(key, item); return; }
    });
    // Sort: priced (pharmacies) first, cheapest, then highest qty
    return Array.from(map.values()).sort((a, b) => {
      const aHasPrice = a.price_bwp != null;
      const bHasPrice = b.price_bwp != null;
      if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
      if (aHasPrice && bHasPrice && a.price_bwp !== b.price_bwp) return a.price_bwp! - b.price_bwp!;
      return b.quantity - a.quantity;
    });
  }, [rawResults]);

  const stockLabel = (q: number) =>
    q > 100 ? { text: 'In Stock', cls: 'text-emerald-400' }
    : q >= 20 ? { text: 'Low Stock', cls: 'text-amber-400' }
    : { text: 'Limited', cls: 'text-red-400' };

  const groupedByClinic = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    results.forEach(item => {
      const existing = map.get(item.clinic_name) || [];
      existing.push(item);
      map.set(item.clinic_name, existing);
    });
    // Sort clinic groups by cheapest price among their medicines (then by count)
    return Array.from(map.entries()).sort((a, b) => {
      const aMin = Math.min(...a[1].map(m => m.price_bwp ?? Infinity));
      const bMin = Math.min(...b[1].map(m => m.price_bwp ?? Infinity));
      if (aMin !== bMin) return aMin - bMin;
      return b[1].length - a[1].length;
    });
  }, [results]);

  const uniqueMedicines = new Set(results.map(r => r.med_name)).size;
  const uniqueClinics = new Set(results.map(r => r.clinic_name)).size;

  return (
    <div className="min-h-screen font-[Gordita,system-ui,sans-serif] antialiased bg-[#020e08]">
      {/* ─── Top nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020e08]/60 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="ChekaMeds" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            to="/"
            className="text-xs font-medium text-white/50 hover:text-white transition-colors flex items-center gap-1"
          >
            Clinic Login <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </nav>

      {/* ─── Hero image — full width, uncropped ─── */}
      <div className="pt-14">
        <div className="relative w-full">
          <img
            src={heroBg}
            alt="ChekaMeds — Find Medicines Faster"
            className="w-full h-auto block"
          />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020e08] to-transparent" />
        </div>
      </div>

      {/* ─── Search section ─── */}
      <section className="relative max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 text-xs font-semibold mb-6 border border-emerald-500/20">
            <Pill className="h-3.5 w-3.5" />
            Free · No login required
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Find Your Medicine <span className="text-emerald-400">Instantly</span>
          </h2>
          <p className="text-white/40 text-sm md:text-base max-w-lg mx-auto mb-6 font-light">
            Search across clinics and pharmacies in Botswana to check listed medicines and current stock levels.
          </p>

          {/* Popular searches */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <span className="text-xs text-white/30 mr-1">Popular:</span>
            {['Paracetamol', 'Amoxicillin', 'Metformin', 'Ibuprofen', 'Omeprazole', 'Ciprofloxacin', 'Amlodipine', 'ARVs'].map((med) => (
              <button
                key={med}
                onClick={() => { setQuery(med); setDebouncedQuery(med); }}
                className="text-xs px-3 py-1.5 border border-white/[0.1] bg-white/[0.03] hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 text-white/40 transition-all duration-200 font-medium"
              >
                {med}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative max-w-xl mx-auto"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type a medicine name e.g. Amoxicillin, Paracetamol..."
            className="w-full pl-12 pr-4 h-14 text-base border border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors shadow-lg shadow-black/30"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400 animate-spin" />
          )}
        </motion.div>

        {debouncedQuery.length >= 2 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-6 mt-5 text-xs text-white/30"
          >
            <span className="flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5 text-emerald-400" />
              <strong className="text-white/70">{uniqueMedicines}</strong> medicine{uniqueMedicines !== 1 ? 's' : ''} found
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-emerald-400" />
              Found at <strong className="text-white/70">{uniqueClinics}</strong> {uniqueClinics !== 1 ? 'facilities' : 'facility'}
            </span>
          </motion.div>
        )}
      </section>

      {/* ─── Results ─── */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {debouncedQuery.length < 2 && query.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                {[
                  { icon: Search, label: 'Search any medicine', desc: 'By name or type' },
                  { icon: MapPin, label: 'Find nearby clinics', desc: 'With listed stock' },
                  { icon: Package, label: 'Check availability', desc: 'Real-time quantities' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.08] p-5 text-center">
                    <div className="h-10 w-10 bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                      <item.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-white/70 mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-white/30">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : debouncedQuery.length >= 2 && !isLoading && results.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <AlertCircle className="h-12 w-12 text-white/15 mx-auto mb-4" />
              <p className="text-lg font-semibold text-white mb-1">No results found</p>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                No facilities currently list "<strong className="text-white/60">{debouncedQuery}</strong>". Try a different spelling or search for a generic name.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {groupedByClinic.map(([clinicName, medicines], idx) => (
                <motion.div
                  key={clinicName}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/[0.03] border border-white/[0.08] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-emerald-500/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{clinicName}</h3>
                        <p className="text-[10px] text-white/30">
                          {medicines.length} matching medicine{medicines.length > 1 ? 's' : ''} listed
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 border font-semibold ${medicines.some(m => m.quantity > 0) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {medicines.some(m => m.quantity > 0) ? 'In Stock' : 'Listed'}
                    </span>
                  </div>

                  <div className="divide-y divide-white/[0.04]">
                    {medicines.map((med) => (
                      <div key={med.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white/80 truncate">{med.med_name}</p>
                            {med.strength && (
                              <span className="text-[10px] text-white/30 bg-white/[0.05] px-1.5 py-0.5">
                                {med.strength}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {med.dosage_form && <span className="text-[10px] text-white/25">{med.dosage_form}</span>}
                            {med.pack_size && <span className="text-[10px] text-white/25">· {med.pack_size}</span>}
                            <span className="text-[10px] text-white/25">· {med.category}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          {med.price_bwp != null && (
                            <p className="text-sm font-bold text-emerald-300">P {Number(med.price_bwp).toFixed(2)}</p>
                          )}
                          <p className={`text-xs font-semibold ${stockLabel(med.quantity).cls}`}>
                            {stockLabel(med.quantity).text}
                          </p>
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

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-6 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] text-white/15">
            © {new Date().getFullYear()} ChekaMeds — Powered by IBLIM ENTERPRISE. Stock data updated in real time.
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/" className="text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors">Clinic Portal</Link>
            <Link to="/" className="text-[10px] text-white/20 hover:text-white/50 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SearchPage;
