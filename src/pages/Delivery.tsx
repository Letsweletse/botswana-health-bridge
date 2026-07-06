import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, MapPin, PackageCheck, Phone, ShieldCheck, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import SiteHeader from '@/components/SiteHeader';
import { toast } from '@/hooks/use-toast';

type DeliveryForm = {
  patient_name: string;
  patient_phone: string;
  delivery_address: string;
  medicine_name: string;
  pharmacy_name: string;
  pharmacy_contact: string;
  notes: string;
};

const clean = (value: string | null) => decodeURIComponent(value || '').trim();
const makePin = () => String(Math.floor(1000 + Math.random() * 9000));

const Delivery = () => {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; pin: string } | null>(null);

  const inventoryId = clean(searchParams.get('inventory_id'));
  const preset = useMemo<DeliveryForm>(() => ({
    patient_name: '',
    patient_phone: '',
    delivery_address: '',
    medicine_name: clean(searchParams.get('medicine_name')),
    pharmacy_name: clean(searchParams.get('pharmacy_name')),
    pharmacy_contact: clean(searchParams.get('pharmacy_contact')),
    notes: '',
  }), [searchParams]);

  const [form, setForm] = useState<DeliveryForm>(preset);

  const updateField = (field: keyof DeliveryForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.patient_name.trim() || !form.patient_phone.trim() || !form.delivery_address.trim() || !form.medicine_name.trim() || !form.pharmacy_name.trim()) {
      toast({ title: 'Missing details', description: 'Add the patient, phone, address, item and facility.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const deliveryPin = makePin();

    try {
      const { data, error } = await (supabase as any)
        .from('medicine_delivery_requests')
        .insert({
          patient_name: form.patient_name.trim(),
          patient_phone: form.patient_phone.trim(),
          delivery_address: form.delivery_address.trim(),
          pharmacy_name: form.pharmacy_name.trim(),
          pharmacy_contact: form.pharmacy_contact.trim() || null,
          medicine_name: form.medicine_name.trim(),
          inventory_id: inventoryId || null,
          notes: form.notes.trim() || null,
          order_status: 'requested',
          delivery_pin: deliveryPin,
        })
        .select('id')
        .single();

      if (error) throw error;
      setSuccess({ id: data.id, pin: deliveryPin });
      toast({ title: 'Request sent', description: 'The facility will review and confirm.' });
    } catch (error: any) {
      toast({ title: 'Request failed', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020e08] text-white font-[Gordita,system-ui,sans-serif] antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Link to="/search" className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300 hover:text-emerald-200">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden border border-emerald-300/15 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(125,211,252,0.10),transparent_30%)]" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                <Truck className="h-4 w-4" /> ChekaMeds Delivery
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Found it? <span className="text-emerald-300">Request delivery.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
                Send a delivery request to the listed facility. The facility stays in control of confirmation, packing and handover.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, title: 'Facility controlled', text: 'The facility confirms first.' },
                  { icon: PackageCheck, title: 'Traceable handover', text: 'Request, status and PIN are recorded.' },
                  { icon: Phone, title: 'WhatsApp ready', text: 'Updates can be connected next.' },
                ].map((item) => (
                  <div key={item.title} className="border border-white/10 bg-black/20 p-4">
                    <item.icon className="mb-3 h-5 w-5 text-emerald-300" />
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-white/80">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-white/40">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] sm:p-6">
            {success ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-300" />
                <h2 className="text-2xl font-black">Request received</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">The facility will review the request. Keep this PIN for delivery confirmation.</p>
                <div className="mx-auto mt-6 max-w-xs border border-emerald-300/20 bg-emerald-400/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Delivery PIN</p>
                  <p className="mt-2 text-4xl font-black tracking-[0.22em] text-white">{success.pin}</p>
                </div>
                <p className="mt-5 text-xs text-white/35">Reference: {success.id.slice(0, 8).toUpperCase()}</p>
                <Link to="/search" className="mt-7 inline-flex items-center justify-center bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#06130e] hover:bg-emerald-200">Search another item</Link>
              </div>
            ) : (
              <form onSubmit={submitRequest} className="space-y-4">
                <div>
                  <h2 className="text-xl font-black">Delivery details</h2>
                  <p className="mt-1 text-xs leading-5 text-white/40">Use the correct patient phone number. The facility may call before confirming.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-bold text-white/65">Patient name</span><input value={form.patient_name} onChange={(e) => updateField('patient_name', e.target.value)} className="h-12 w-full border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-emerald-300/50" placeholder="Full name" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-bold text-white/65">Phone / WhatsApp</span><input value={form.patient_phone} onChange={(e) => updateField('patient_phone', e.target.value)} className="h-12 w-full border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-emerald-300/50" placeholder="e.g. 75560140" /></label>
                </div>

                <label className="space-y-1.5 block"><span className="text-xs font-bold text-white/65">Delivery address</span><textarea value={form.delivery_address} onChange={(e) => updateField('delivery_address', e.target.value)} className="min-h-[86px] w-full border border-white/10 bg-black/25 px-3 py-3 text-sm outline-none focus:border-emerald-300/50" placeholder="House/plot, ward, town, landmark" /></label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-bold text-white/65">Medicine / item</span><input value={form.medicine_name} onChange={(e) => updateField('medicine_name', e.target.value)} className="h-12 w-full border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-emerald-300/50" placeholder="Name" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-bold text-white/65">Facility</span><input value={form.pharmacy_name} onChange={(e) => updateField('pharmacy_name', e.target.value)} className="h-12 w-full border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-emerald-300/50" placeholder="Facility name" /></label>
                </div>

                <label className="space-y-1.5 block"><span className="text-xs font-bold text-white/65">Facility contact, if listed</span><input value={form.pharmacy_contact} onChange={(e) => updateField('pharmacy_contact', e.target.value)} className="h-12 w-full border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-emerald-300/50" placeholder="Optional" /></label>
                <label className="space-y-1.5 block"><span className="text-xs font-bold text-white/65">Notes</span><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className="min-h-[72px] w-full border border-white/10 bg-black/25 px-3 py-3 text-sm outline-none focus:border-emerald-300/50" placeholder="Optional delivery notes" /></label>

                <div className="border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100/80">The listed facility must confirm the request before delivery proceeds.</div>

                <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 bg-emerald-300 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#06130e] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  Submit delivery request
                </button>
              </form>
            )}
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default Delivery;
