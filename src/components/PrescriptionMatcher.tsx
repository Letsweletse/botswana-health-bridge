import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, CheckCircle2, XCircle, Loader2, Pill, Phone, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MatchResult {
  clinic_name: string;
  matched: { name: string; quantity: number; strength?: string; dosage_form?: string }[];
  missing: string[];
  matchPct: number;
}

const PrescriptionMatcher = () => {
  const [clinicFilter, setClinicFilter] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!prescriptionText.trim()) return;
    setLoading(true);
    setSearched(false);

    const medicines = prescriptionText
      .split(/[,\n;]+/)
      .map(m => m.trim().toLowerCase())
      .filter(Boolean);

    try {
      let query = supabase.from('clinic_inventory').select('clinic_name, med_name, quantity, strength, dosage_form');
      
      if (clinicFilter.trim()) {
        query = query.ilike('clinic_name', `%${clinicFilter.trim()}%`);
      }

      const { data } = await query;
      if (!data || data.length === 0) { setResults([]); setSearched(true); setLoading(false); return; }

      const clinicMap: Record<string, { med_name: string; quantity: number; strength?: string | null; dosage_form?: string | null }[]> = {};
      data.forEach(row => {
        if (!clinicMap[row.clinic_name]) clinicMap[row.clinic_name] = [];
        clinicMap[row.clinic_name].push(row);
      });

      const matchResults: MatchResult[] = Object.entries(clinicMap).map(([clinic_name, meds]) => {
        const matched: MatchResult['matched'] = [];
        const missing: string[] = [];
        medicines.forEach(rx => {
          const found = meds.find(m => m.med_name.toLowerCase().includes(rx) && m.quantity > 0);
          if (found) {
            matched.push({
              name: rx,
              quantity: found.quantity,
              strength: found.strength || undefined,
              dosage_form: found.dosage_form || undefined,
            });
          } else {
            missing.push(rx);
          }
        });
        return {
          clinic_name,
          matched,
          missing,
          matchPct: medicines.length > 0 ? Math.round((matched.length / medicines.length) * 100) : 0,
        };
      });

      matchResults.sort((a, b) => b.matchPct - a.matchPct);
      setResults(matchResults.filter(r => r.matchPct > 0));
    } catch {
      setResults([]);
    }
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Search Card */}
      <div className="bg-card border border-border rounded-2xl p-5 card-premium space-y-4">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <h2 className="text-base font-display font-bold text-foreground">Medicine Availability Search</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Search for one or more medicines to find which clinics have them in stock. Optionally filter by clinic name.
        </p>

        {/* Clinic filter */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Clinic Name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value)}
            placeholder="e.g. Clinic 1, Gaborone Pharmacy..."
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        {/* Medicine input */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Pill className="h-3.5 w-3.5 text-muted-foreground" />
            Medicine(s) <span className="text-destructive">*</span>
          </label>
          <textarea
            value={prescriptionText}
            onChange={(e) => setPrescriptionText(e.target.value)}
            placeholder={"Type one medicine per line, or separate with commas:\nMetformin\nParacetamol\nAmoxicillin"}
            rows={4}
            className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !prescriptionText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'Searching...' : 'Check Availability'}
        </button>
      </div>

      {/* WhatsApp shortcut */}
      <div className="bg-success/5 border border-success/15 rounded-2xl p-4 flex items-center gap-4">
        <Phone className="h-5 w-5 text-success flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">Also available via WhatsApp</p>
          <p className="text-[11px] text-muted-foreground">
            Text <span className="font-mono font-bold text-success">"prescription: Metformin, Paracetamol"</span> to +267 71 424 486
          </p>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {searched && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">
              {results.length > 0
                ? `${results.length} clinic${results.length > 1 ? 's' : ''} found with matching stock`
                : 'No clinics found with those medicines in stock'}
            </h3>

            {results.length === 0 && (
              <p className="text-xs text-muted-foreground">Try a different spelling, or check back later as stock is updated in real time.</p>
            )}

            {results.map((r, i) => (
              <motion.div
                key={r.clinic_name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border rounded-2xl p-4 card-premium ${r.matchPct === 100 ? 'border-success/30 bg-success/5' : 'border-border bg-card'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-display font-semibold text-foreground">{r.clinic_name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${r.matchPct === 100 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                    {r.matchPct}% match
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.matched.map(m => (
                    <span key={m.name} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                      <CheckCircle2 className="h-3 w-3" />
                      {m.name}
                      {m.strength && <span className="opacity-70">({m.strength})</span>}
                      — <strong>{m.quantity}</strong> in stock
                    </span>
                  ))}
                  {r.missing.map(m => (
                    <span key={m} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-critical/10 text-critical border border-critical/20">
                      <XCircle className="h-3 w-3" /> {m} — out of stock
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrescriptionMatcher;
