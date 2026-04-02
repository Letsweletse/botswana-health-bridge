import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Pill, Package, ArrowRight, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/ChekaMeds_Logo.png';

interface InventoryItem {
  id: string;
  med_name: string;
  clinic_name: string;
  quantity: number;
  category: string;
  strength: string | null;
  dosage_form: string | null;
  pack_size: string | null;
  updated_at: string;
}

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setQuery(value);
    clearTimeout((window as any).__searchTimeout);
    (window as any).__searchTimeout = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 400);
  };

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['public-medicine-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('clinic_inventory')
        .select('id, med_name, clinic_name, quantity, category, strength, dosage_form, pack_size, updated_at')
        .ilike('med_name', `%${debouncedQuery}%`)
        .gt('quantity', 0)
        .order('quantity', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Group results by clinic
  const groupedByClinic = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    results.forEach(item => {
      const existing = map.get(item.clinic_name) || [];
      existing.push(item);
      map.set(item.clinic_name, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [results]);

  const uniqueMedicines = new Set(results.map(r => r.med_name)).size;
  const uniqueClinics = new Set(results.map(r => r.clinic_name)).size;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/search" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm object-contain" />
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">ChekaMeds</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Medicine Finder</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Clinic Login <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Hero Search */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 50%),
                              radial-gradient(circle at 80% 50%, hsl(var(--accent)) 0%, transparent 50%)`,
          }}
        />
        <div className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-primary/20">
              <Pill className="h-3.5 w-3.5" />
              Free • No login required
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
              Find Your Medicine <span className="text-primary">Instantly</span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto mb-6">
              Search across clinics and pharmacies in Botswana to find where your medicine is in stock right now.
            </p>

            {/* Popular searches */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <span className="text-xs text-muted-foreground mr-1">Popular:</span>
              {['Paracetamol', 'Amoxicillin', 'Metformin', 'Ibuprofen', 'Omeprazole', 'Ciprofloxacin', 'Amlodipine', 'ARVs'].map((med) => (
                <button
                  key={med}
                  onClick={() => { setQuery(med); setDebouncedQuery(med); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-muted-foreground transition-all duration-200 font-medium"
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type a medicine name e.g. Amoxicillin, Paracetamol..."
              className="pl-12 pr-4 h-14 text-base rounded-2xl border-2 border-border focus:border-primary bg-card shadow-lg"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
            )}
          </motion.div>

          {/* Quick stats */}
          {debouncedQuery.length >= 2 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-6 mt-5 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-primary" />
                <strong className="text-foreground">{uniqueMedicines}</strong> medicine{uniqueMedicines !== 1 ? 's' : ''} found
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Available at <strong className="text-foreground">{uniqueClinics}</strong> {uniqueClinics !== 1 ? 'facilities' : 'facility'}
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* Results */}
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
                  { icon: MapPin, label: 'Find nearby clinics', desc: 'With stock available' },
                  { icon: Package, label: 'Check availability', desc: 'Real-time quantities' },
                ].map((item, i) => (
                  <div key={i} className="bg-card rounded-2xl p-5 border border-border text-center">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
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
              <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-1">No results found</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No clinics currently have "<strong>{debouncedQuery}</strong>" in stock. Try a different spelling or search for a generic name.
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
                  className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Clinic header */}
                  <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Building2 className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{clinicName}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          {medicines.length} matching medicine{medicines.length > 1 ? 's' : ''} in stock
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/20">
                      In Stock
                    </Badge>
                  </div>

                  {/* Medicine list */}
                  <div className="divide-y divide-border">
                    {medicines.map((med) => (
                      <div key={med.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{med.med_name}</p>
                            {med.strength && (
                              <span className="text-[10px] text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                                {med.strength}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {med.dosage_form && (
                              <span className="text-[10px] text-muted-foreground">{med.dosage_form}</span>
                            )}
                            {med.pack_size && (
                              <span className="text-[10px] text-muted-foreground">• {med.pack_size}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground">• {med.category}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className={`text-sm font-bold ${med.quantity > 50 ? 'text-success' : med.quantity > 10 ? 'text-warning' : 'text-critical'}`}>
                            {med.quantity}
                          </p>
                          <p className="text-[9px] text-muted-foreground">units</p>
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

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ChekaMeds — Powered by IBLIM ENTERPRISE. Stock data updated in real time by registered facilities.
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/login" className="text-[10px] text-primary hover:underline">Clinic Portal</Link>
            <Link to="/" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SearchPage;
