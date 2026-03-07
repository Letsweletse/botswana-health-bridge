import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Search, MapPin, CheckCircle2, XCircle, Loader2, Pill, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MatchResult {
  clinic_name: string;
  matched: string[];
  missing: string[];
  matchPct: number;
}

const PrescriptionMatcher = () => {
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
      const { data } = await supabase.from('clinic_inventory').select('clinic_name, med_name, quantity');
      if (!data) { setResults([]); setSearched(true); setLoading(false); return; }

      const clinicMap: Record<string, { med_name: string; quantity: number }[]> = {};
      data.forEach(row => {
        if (!clinicMap[row.clinic_name]) clinicMap[row.clinic_name] = [];
        clinicMap[row.clinic_name].push({ med_name: row.med_name, quantity: row.quantity });
      });

      const matchResults: MatchResult[] = Object.entries(clinicMap).map(([clinic_name, meds]) => {
        const matched: string[] = [];
        const missing: string[] = [];
        medicines.forEach(rx => {
          const found = meds.some(m => m.med_name.toLowerCase().includes(rx) && m.quantity > 0);
          if (found) matched.push(rx);
          else missing.push(rx);
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
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 rounded-2xl p-6 card-premium">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold text-foreground">Patient Prescription Matching</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your full prescription list and we'll find the clinic with ALL your medicines in stock — 
              so you don't travel to multiple facilities.
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-2xl p-6 card-premium space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Pill className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground">Enter Your Prescription</h3>
        </div>
        <p className="text-xs text-muted-foreground">Type each medicine on a new line, or separate with commas.</p>
        <textarea
          value={prescriptionText}
          onChange={(e) => setPrescriptionText(e.target.value)}
          placeholder={"Metformin\nParacetamol\nAmoxicillin\nOmeprazole"}
          rows={5}
          className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !prescriptionText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'Searching clinics...' : 'Find Best Clinic'}
        </button>
      </div>

      {/* WhatsApp shortcut */}
      <div className="bg-success/5 border border-success/15 rounded-2xl p-4 flex items-center gap-4">
        <Phone className="h-5 w-5 text-success flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">Also available via WhatsApp</p>
          <p className="text-[11px] text-muted-foreground">Text <span className="font-mono font-bold text-success">"prescription: Metformin, Paracetamol"</span> to +267 71 424 486</p>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {searched && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">
              {results.length > 0 ? `${results.length} clinic${results.length > 1 ? 's' : ''} found` : 'No clinics found with those medicines'}
            </h3>
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
                    <span key={m} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                      <CheckCircle2 className="h-3 w-3" /> {m}
                    </span>
                  ))}
                  {r.missing.map(m => (
                    <span key={m} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-critical/10 text-critical border border-critical/20">
                      <XCircle className="h-3 w-3" /> {m}
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
