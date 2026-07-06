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

const coveragePoints = [
  { name: 'Francistown', status: 'Coverage', x: 64, y: 21, tone: 'cyan' },
  { name: 'Gaborone', status: 'Active', x: 50, y: 74, tone: 'emerald' },
  { name: 'Jwaneng', status: 'Active', x: 43, y: 64, tone: 'amber' },
];

const toneStyles: Record<string, { dot: string; glow: string; card: string; badge: string; line: string }> = {
  emerald: {
    dot: 'bg-emerald-300',
    glow: 'bg-emerald-300/35',
    card: 'border-emerald-300/70 bg-emerald-300/12 text-emerald-100',
    badge: 'bg-emerald-300 text-[#04120d]',
    line: 'bg-emerald-300/55',
  },
  amber: {
    dot: 'bg-amber-300',
    glow: 'bg-amber-300/35',
    card: 'border-amber-300/70 bg-amber-300/12 text-amber-100',
    badge: 'bg-amber-300 text-[#04120d]',
    line: 'bg-amber-300/55',
  },
  cyan: {
    dot: 'bg-cyan-300',
    glow: 'bg-cyan-300/35',
    card: 'border-cyan-300/70 bg-cyan-300/12 text-cyan-100',
    badge: 'bg-cyan-300 text-[#04120d]',
    line: 'bg-cyan-300/55',
  },
};

const BotswanaCoverageMap = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.14),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_52%_82%,rgba(252,211,77,0.12),transparent_22%)]" />
    <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bw-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
        <linearGradient id="bw-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(52,211,153,0.7)" />
          <stop offset="50%" stopColor="rgba(34,211,238,0.6)" />
          <stop offset="100%" stopColor="rgba(252,211,77,0.6)" />
        </linearGradient>
        <filter id="bw-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g opacity="0.12">
        {[40, 110, 180, 250, 320, 390, 460, 530].map((y) => <path key={`h-${y}`} d={`M80 ${y}H520`} stroke="white" strokeWidth="1" />)}
        {[100, 170, 240, 310, 380, 450].map((x) => <path key={`v-${x}`} d={`M${x} 30V560`} stroke="white" strokeWidth="1" />)}
      </g>
      <path
        d="M231 58 L323 54 L391 71 L441 101 L473 149 L487 209 L477 273 L459 333 L471 392 L449 453 L396 505 L334 530 L263 533 L202 516 L155 483 L132 431 L120 363 L108 300 L118 232 L141 178 L179 126 L203 92 Z"
        fill="url(#bw-fill)"
        stroke="url(#bw-stroke)"
        strokeWidth="4"
        filter="url(#bw-glow)"
      />
      <path d="M260 88 C240 140, 248 205, 270 268 C292 336, 296 411, 287 503" stroke="rgba(255,255,255,0.13)" strokeWidth="3" fill="none" strokeDasharray="10 10" />
      <path d="M184 208 C245 214, 327 210, 421 194" stroke="rgba(255,255,255,0.11)" strokeWidth="3" fill="none" strokeDasharray="10 10" />
      <path d="M178 380 C246 356, 316 349, 424 360" stroke="rgba(255,255,255,0.11)" strokeWidth="3" fill="none" strokeDasharray="10 10" />
    </svg>

    {coveragePoints.map((point) => {
      const tone = toneStyles[point.tone];
      return (
        <div key={point.name} className="absolute" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            <div className={`absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-pulse ${tone.glow}`} />
            <div className={`relative z-10 h-4 w-4 border-2 border-white ${tone.dot}`} />
            <div className={`ml-5 mt-[-6px] h-8 w-[2px] ${tone.line}`} />
            <div className={`ml-7 mt-1 w-28 border-2 p-2 shadow-[8px_8px_0_rgba(0,0,0,0.15)] ${tone.card}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.14em]">{point.name}</div>
              <div className={`mt-1 inline-block px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${tone.badge}`}>{point.status}</div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

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
      toast({ title: 'Request failed', description: error?.message || 'Please check the delivery request table RLS policy.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'h-12 w-full border-2 border-emerald-900/60 bg-[#061a13] px-3 text-sm text-white outline-none transition focus:border-emerald-300';
  const textareaClass = 'w-full border-2 border-emerald-900/60 bg-[#061a13] px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-300';

  return (
    <div className="min-h-screen bg-[#020e08] text-white font-[Gordita,system-ui,sans-serif] antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Link to="/search" className="mb-6 inline-flex items-center gap-2 border-2 border-emerald-400 bg-[#052016] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-200 hover:bg-emerald-400 hover:text-[#04120d]">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative min-h-[560px] overflow-hidden border-2 border-emerald-500/30 bg-[#03140e] p-6 shadow-[12px_12px_0_rgba(16,185,129,0.14)] sm:p-8">
            <div className="absolute inset-x-0 top-0 grid grid-cols-4">
              <div className="h-2 bg-emerald-400" />
              <div className="h-2 bg-cyan-300" />
              <div className="h-2 bg-amber-300" />
              <div className="h-2 bg-lime-300" />
            </div>
            <BotswanaCoverageMap />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,14,8,0.9),rgba(3,20,14,0.68),rgba(2,14,8,0.92))]" />
            <div className="relative pt-4">
              <div className="mb-5 inline-flex items-center gap-2 border-2 border-emerald-300 bg-emerald-300 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#04120d]">
                <Truck className="h-4 w-4" /> ChekaMeds Delivery
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Found it? <span className="text-emerald-300">Request delivery.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                Send a delivery request to the listed facility. The facility confirms first, then assigns the driver and manages the delivery fee.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Gaborone Active', cls: 'border-emerald-400 bg-emerald-400/15 text-emerald-100' },
                  { label: 'Jwaneng Active', cls: 'border-amber-300 bg-amber-300/15 text-amber-100' },
                  { label: 'Francistown Coverage', cls: 'border-cyan-300 bg-cyan-300/15 text-cyan-100' },
                ].map((item) => (
                  <div key={item.label} className={`border-2 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] ${item.cls}`}>
                    {item.label}
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, title: 'Facility confirms', text: 'No delivery proceeds before facility review.', cls: 'border-emerald-400 bg-emerald-400/10 text-emerald-200' },
                  { icon: PackageCheck, title: 'Tracked handover', text: 'Request, status and PIN stay recorded.', cls: 'border-cyan-300 bg-cyan-300/10 text-cyan-100' },
                  { icon: Phone, title: 'WhatsApp alerts', text: 'Driver and patient updates are supported.', cls: 'border-amber-300 bg-amber-300/10 text-amber-100' },
                ].map((item) => (
                  <div key={item.title} className={`border-2 p-4 ${item.cls}`}>
                    <item.icon className="mb-3 h-5 w-5" />
                    <p className="text-xs font-black uppercase tracking-[0.12em]">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-white/55">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="border-2 border-white/15 bg-[#04130e] p-5 shadow-[12px_12px_0_rgba(255,255,255,0.05)] sm:p-6">
            {success ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-300" />
                <h2 className="text-2xl font-black">Request received</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/55">The facility will review the request. Keep this PIN for delivery confirmation.</p>
                <div className="mx-auto mt-6 max-w-xs border-2 border-emerald-300 bg-emerald-300/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Delivery PIN</p>
                  <p className="mt-2 text-4xl font-black tracking-[0.22em] text-white">{success.pin}</p>
                </div>
                <p className="mt-5 text-xs text-white/35">Reference: {success.id.slice(0, 8).toUpperCase()}</p>
                <Link to="/search" className="mt-7 inline-flex items-center justify-center border-2 border-emerald-300 bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#06130e] hover:bg-[#06130e] hover:text-emerald-200">Search another item</Link>
              </div>
            ) : (
              <form onSubmit={submitRequest} className="space-y-4">
                <div className="border-l-8 border-emerald-300 bg-emerald-300/10 p-4">
                  <h2 className="text-xl font-black">Delivery details</h2>
                  <p className="mt-1 text-xs leading-5 text-white/50">Use the correct patient phone number. The facility may call before confirming.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-bold text-emerald-200">Patient name</span><input value={form.patient_name} onChange={(e) => updateField('patient_name', e.target.value)} className={inputClass} placeholder="Full name" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-bold text-cyan-100">Phone / WhatsApp</span><input value={form.patient_phone} onChange={(e) => updateField('patient_phone', e.target.value)} className={inputClass} placeholder="e.g. 75560140" /></label>
                </div>

                <label className="space-y-1.5 block"><span className="text-xs font-bold text-amber-100">Delivery address</span><textarea value={form.delivery_address} onChange={(e) => updateField('delivery_address', e.target.value)} className={`${textareaClass} min-h-[86px]`} placeholder="House/plot, ward, town, landmark" /></label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-bold text-lime-100">Medicine / item</span><input value={form.medicine_name} onChange={(e) => updateField('medicine_name', e.target.value)} className={inputClass} placeholder="Name" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-bold text-emerald-200">Facility</span><input value={form.pharmacy_name} onChange={(e) => updateField('pharmacy_name', e.target.value)} className={inputClass} placeholder="Facility name" /></label>
                </div>

                <label className="space-y-1.5 block"><span className="text-xs font-bold text-cyan-100">Facility contact, if listed</span><input value={form.pharmacy_contact} onChange={(e) => updateField('pharmacy_contact', e.target.value)} className={inputClass} placeholder="Optional" /></label>
                <label className="space-y-1.5 block"><span className="text-xs font-bold text-amber-100">Notes</span><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className={`${textareaClass} min-h-[72px]`} placeholder="Optional delivery notes" /></label>

                <div className="border-2 border-amber-300 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100">The listed facility must confirm the request before delivery proceeds.</div>

                <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 border-2 border-emerald-300 bg-emerald-300 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#06130e] transition hover:bg-[#06130e] hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60">
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
