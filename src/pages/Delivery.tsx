import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Info, Loader2, MapPin, PackageCheck, Phone, ShieldCheck } from 'lucide-react';
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
const mapEmbedSrc = ['https://www.google.com/maps', '?q=Botswana&z=6&output=embed'].join('');

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

  const F = (field: keyof DeliveryForm, label: string, placeholder: string, opts: { area?: boolean; full?: boolean; required?: boolean } = {}) => (
    <div className={opts.full ? 'full' : undefined}>
      <label className="cms-label" htmlFor={`d-${field}`}>{label}{opts.required ? ' *' : ''}</label>
      {opts.area
        ? <textarea id={`d-${field}`} value={form[field]} onChange={(e) => updateField(field, e.target.value)} className="cms-textarea" placeholder={placeholder} />
        : <input id={`d-${field}`} value={form[field]} onChange={(e) => updateField(field, e.target.value)} className="cms-input" placeholder={placeholder} />}
    </div>
  );

  return (
    <div className="cms cm-deliv">
      <style>{`
        .cm-deliv-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:28px;align-items:start;margin-top:28px}
        .cm-deliv-towns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
        .cm-deliv-map{margin-top:24px;border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--line);height:300px;background:#000}
        .cm-deliv-map iframe{width:100%;height:100%;border:0;filter:grayscale(.3) brightness(.85)}
        .cm-pin{margin:22px auto 0;max-width:260px;border-radius:var(--r);border:1px solid var(--g-line);background:var(--g-soft);padding:18px;text-align:center}
        .cm-pin b{display:block;font:800 2.4rem var(--head);letter-spacing:.2em;color:#fff;margin-top:4px}
        @media(max-width:900px){.cm-deliv-grid{grid-template-columns:1fr}.cm-deliv-map{height:240px}}
      `}</style>
      <SiteHeader />

      <main className="cms-wrap cms-page" style={{ paddingTop: 0 }}>
        <section className="cms-hero">
          <Link to="/search" className="cms-link" style={{ color: 'var(--muted)' }}><ArrowLeft size={15} /> Back to search</Link>
          <span className="cms-eyebrow"><i /> ChekaMeds Delivery</span>
          <h1 className="cms-h1" style={{ fontSize: 'clamp(2.1rem,4.4vw,3.2rem)' }}>Found it? <em>Get it delivered.</em></h1>
          <p className="cms-lead">Send a delivery request to the pharmacy. They confirm first, then assign a driver and tell you the delivery fee.</p>
        </section>

        <div className="cm-deliv-grid">
          <div>
            <div className="cms-steps">
              <div><span><h3>Pharmacy confirms</h3><p>Nothing is sent until the pharmacy has checked stock and accepted your request.</p></span></div>
              <div><span><h3>Driver delivers</h3><p>The pharmacy assigns a driver and agrees the delivery fee with you.</p></span></div>
              <div><span><h3>Hand over with your PIN</h3><p>You get a 4-digit PIN. Give it to the driver when your medicine arrives.</p></span></div>
            </div>
            <div style={{ marginTop: 22 }}>
              <p className="cms-small">Delivery active in</p>
              <div className="cm-deliv-towns">
                <span className="cms-badge">Gaborone</span>
                <span className="cms-badge">Jwaneng</span>
                <span className="cms-badge muted">More towns soon</span>
              </div>
            </div>
            <div className="cm-deliv-map">
              <iframe title="ChekaMeds delivery coverage map" src={mapEmbedSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </div>

          <div className="cms-card" style={{ padding: 28 }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={52} color="#5eeaa8" style={{ margin: '0 auto' }} />
                <h2 className="cms-h2" style={{ fontSize: '1.7rem', marginTop: 14 }}>Request received</h2>
                <p className="cms-sub" style={{ margin: '10px auto 0' }}>The pharmacy will review it and contact you. Keep this PIN for the hand-over.</p>
                <div className="cm-pin"><span className="cms-small">Delivery PIN</span><b>{success.pin}</b></div>
                <p className="cms-fine" style={{ marginTop: 14 }}>Reference {success.id.slice(0, 8).toUpperCase()}</p>
                <Link to="/search" className="cms-btn cms-btn-p" style={{ marginTop: 22 }}>Search another medicine</Link>
              </div>
            ) : (
              <form onSubmit={submitRequest}>
                <h2 className="cms-h3" style={{ fontSize: '1.3rem' }}>Delivery details</h2>
                <p className="cms-small" style={{ marginTop: 4, marginBottom: 20 }}>Use the right phone number. The pharmacy may call before confirming.</p>
                <div className="cms-form-grid">
                  {F('patient_name', 'Patient name', 'Full name', { required: true })}
                  {F('patient_phone', 'Phone / WhatsApp', 'e.g. 75560140', { required: true })}
                  {F('delivery_address', 'Delivery address', 'Plot, ward, town and a landmark', { area: true, full: true, required: true })}
                  {F('medicine_name', 'Medicine', 'Name and strength', { required: true })}
                  {F('pharmacy_name', 'Pharmacy', 'Pharmacy name', { required: true })}
                  {F('pharmacy_contact', 'Pharmacy phone', 'Optional', { full: true })}
                  {F('notes', 'Notes', 'Anything the driver should know', { area: true, full: true })}
                </div>
                <div className="cms-note" style={{ marginTop: 18 }}><Info size={17} /> The pharmacy must confirm before delivery goes ahead.</div>
                <button disabled={isSubmitting} className="cms-btn cms-btn-p cms-btn-block" style={{ marginTop: 18, minHeight: 52 }}>
                  {isSubmitting ? <Loader2 size={17} className="cms-spin" /> : <MapPin size={17} />} Send delivery request
                </button>
                <p className="cms-fine" style={{ marginTop: 14 }}>By sending this request you agree to our <Link to="/terms" style={{ color: '#fff', textDecoration: 'underline' }}>Terms</Link> and <Link to="/privacy" style={{ color: '#fff', textDecoration: 'underline' }}>Privacy Policy</Link>. We share your details with the pharmacy only to arrange delivery.</p>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }} className="cms-fine">
                  <span style={{ display: 'inline-flex', gap: 6 }}><ShieldCheck size={14} /> Pharmacy reviewed</span>
                  <span style={{ display: 'inline-flex', gap: 6 }}><PackageCheck size={14} /> PIN hand-over</span>
                  <span style={{ display: 'inline-flex', gap: 6 }}><Phone size={14} /> WhatsApp updates</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Delivery;
