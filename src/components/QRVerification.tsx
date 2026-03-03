import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Package, ShieldCheck, Download, Copy, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const QRVerification = () => {
  const { profile } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);

  const loadInventory = async () => {
    const clinic = profile?.clinic_name;
    if (!clinic) return;
    const { data } = await supabase.from('clinic_inventory').select('*').eq('clinic_name', clinic);
    setInventory(data || []);
    setLoaded(true);
  };

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 rounded-2xl p-6 card-premium">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-display font-bold text-foreground">QR Code Medicine Verification</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate unique QR codes for each medicine batch. Patients scan to verify authenticity — 
                fighting counterfeit drugs across Botswana.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 card-premium text-center">
          <button
            onClick={loadInventory}
            className="px-6 py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Load My Clinic Medicines
          </button>
        </div>
      </div>
    );
  }

  const generateQRData = (med: any) => {
    return JSON.stringify({
      platform: 'ChekaMeds',
      verified: true,
      medicine: med.med_name,
      clinic: med.clinic_name,
      category: med.category,
      quantity: med.quantity,
      last_updated: med.updated_at,
      verification_id: med.id,
    });
  };

  const copyQRLink = (med: any) => {
    const data = generateQRData(med);
    navigator.clipboard.writeText(data);
    toast({ title: 'Copied!', description: 'QR data copied to clipboard.' });
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 rounded-2xl p-6 card-premium">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/15 border border-primary/20">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold text-foreground">QR Code Medicine Verification</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate unique QR codes for each medicine in your inventory. Patients scan to verify authenticity.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Medicine list */}
        <div className="bg-card border border-border rounded-2xl p-4 card-premium space-y-2 max-h-[500px] overflow-y-auto">
          <h3 className="text-sm font-display font-semibold text-foreground px-2 pb-2 border-b border-border">
            {profile?.clinic_name} — {inventory.length} medicines
          </h3>
          {inventory.map(med => (
            <button
              key={med.id}
              onClick={() => setSelectedMed(med)}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                selectedMed?.id === med.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
              }`}
            >
              <Package className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{med.med_name}</p>
                <p className="text-[11px] text-muted-foreground">{med.category} · {med.quantity} units</p>
              </div>
              {selectedMed?.id === med.id && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* QR Preview */}
        <div className="bg-card border border-border rounded-2xl p-6 card-premium flex flex-col items-center justify-center">
          {selectedMed ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
              <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                <QRCodeSVG
                  value={generateQRData(selectedMed)}
                  size={200}
                  level="H"
                  includeMargin
                  fgColor="#1a1a1a"
                />
              </div>
              <div>
                <p className="text-sm font-display font-bold text-foreground">{selectedMed.med_name}</p>
                <p className="text-xs text-muted-foreground">{selectedMed.clinic_name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3 text-success" />
                  <span className="text-[10px] text-success font-semibold uppercase tracking-wider">Verified by ChekaMeds</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyQRLink(selectedMed)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-all"
                >
                  <Copy className="h-3 w-3" /> Copy Data
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center">
              <QrCode className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a medicine to generate its QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRVerification;
