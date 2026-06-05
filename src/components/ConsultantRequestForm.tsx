import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Shield, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const dangerSigns = [
  'Difficulty breathing',
  'Chest pain',
  'Severe bleeding',
  'Unconscious or confused',
  'Severe allergic reaction',
  'Pregnancy emergency',
  'High fever in a young child',
];

const initialForm = {
  full_name: '',
  phone: '',
  location: '',
  symptoms: '',
  symptom_duration: '',
  age_group: '',
  pregnancy_status: '',
  existing_conditions: '',
  allergies: '',
  prescription_url: '',
  consultation_mode: 'home',
  preferred_facility_name: '',
};

const fieldClass = 'w-full border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400 focus:bg-slate-900/80';
const labelClass = 'space-y-1.5 text-sm font-medium text-white/75';
const panelClass = 'border border-white/10 bg-white/[0.04] p-5 sm:p-6';

const ConsultantRequestForm = () => {
  const [form, setForm] = useState(initialForm);
  const [emergencyFlags, setEmergencyFlags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [facilities, setFacilities] = useState<string[]>([]);

  useEffect(() => {
    const loadFacilities = async () => {
      const { data } = await supabase
        .from('clinic_inventory')
        .select('clinic_name')
        .not('clinic_name', 'is', null)
        .order('clinic_name', { ascending: true });

      const names = Array.from(new Set((data || [])
        .map((item) => item.clinic_name)
        .filter(Boolean))) as string[];

      setFacilities(names);
    };

    loadFacilities();
  }, []);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleDangerSign = (sign: string) => {
    setEmergencyFlags((current) => (
      current.includes(sign) ? current.filter((item) => item !== sign) : [...current, sign]
    ));
  };

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.full_name.trim() || !form.phone.trim() || !form.location.trim() || !form.symptoms.trim()) {
      toast({
        title: 'Missing details',
        description: 'Please add your name, phone number, location, and symptoms.',
        variant: 'destructive',
      });
      return;
    }

    if (form.consultation_mode === 'facility' && !form.preferred_facility_name.trim()) {
      toast({
        title: 'Choose a partner facility',
        description: 'Please select the pharmacy or clinic that should assist with your consultation.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const preferredFacilityName = form.consultation_mode === 'facility' ? form.preferred_facility_name.trim() : null;
    const { error } = await supabase.from('consultant_requests').insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      symptoms: form.symptoms.trim(),
      symptom_duration: form.symptom_duration,
      age_group: form.age_group,
      pregnancy_status: form.pregnancy_status,
      existing_conditions: form.existing_conditions,
      allergies: form.allergies,
      prescription_url: form.prescription_url,
      emergency_flags: emergencyFlags,
      request_status: emergencyFlags.length > 0 ? 'emergency_flagged' : 'new',
      consultation_type: 'chat',
      consultation_status: 'requested',
      consultation_mode: form.consultation_mode,
      preferred_facility_name: preferredFacilityName,
      assigned_facility_name: preferredFacilityName,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: 'Request failed', description: error.message, variant: 'destructive' });
      return;
    }

    setSubmitted(true);
    setForm(initialForm);
    setEmergencyFlags([]);
  };

  if (submitted) {
    return (
      <div className="border border-emerald-400/25 bg-emerald-500/10 p-6 text-white">
        <CheckCircle2 className="mb-4 h-9 w-9 text-emerald-300" />
        <h2 className="text-2xl font-bold">Request received</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80">
          A participating healthcare provider may contact you shortly. If this is an emergency, visit the nearest clinic or hospital immediately.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-5 border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-50"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={submitRequest} className={panelClass}>
        <div className="mb-6 border-b border-white/10 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">ChekaMeds Virtual Care</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Request provider support</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Choose home virtual care or assisted consultation at a partner pharmacy/clinic.
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, consultation_mode: 'home', preferred_facility_name: '' }))}
            className={`border p-4 text-left transition ${form.consultation_mode === 'home' ? 'border-emerald-400 bg-emerald-400/10 text-white' : 'border-white/10 bg-slate-900 text-white/70'}`}
          >
            <p className="font-bold">Consult from home</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Use your own phone/device. ChekaMeds admin reviews and routes the request.</p>
          </button>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, consultation_mode: 'facility' }))}
            className={`border p-4 text-left transition ${form.consultation_mode === 'facility' ? 'border-emerald-400 bg-emerald-400/10 text-white' : 'border-white/10 bg-slate-900 text-white/70'}`}
          >
            <p className="font-bold">Assisted at partner facility</p>
            <p className="mt-1 text-xs leading-5 text-white/55">A pharmacy/clinic assists with capture, video setup, and medicine collection where applicable.</p>
          </button>
        </div>

        {form.consultation_mode === 'facility' && (
          <label className="mb-5 block space-y-1.5 text-sm font-medium text-white/75">
            Partner pharmacy/clinic *
            <select value={form.preferred_facility_name} onChange={(e) => updateField('preferred_facility_name', e.target.value)} className={fieldClass}>
              <option value="">Select facility</option>
              {facilities.map((facility) => <option key={facility} value={facility}>{facility}</option>)}
            </select>
          </label>
        )}

        <div className="mb-5 border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-50/80">
          ChekaMeds connects patients to participating providers. It does not diagnose, prescribe, or replace emergency care.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Full name *
            <input value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Phone / WhatsApp *
            <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={fieldClass} placeholder="+267..." />
          </label>
          <label className={labelClass}>
            Location *
            <input value={form.location} onChange={(e) => updateField('location', e.target.value)} className={fieldClass} placeholder="Gaborone, Block 6" />
          </label>
          <label className={labelClass}>
            Duration of symptoms
            <input value={form.symptom_duration} onChange={(e) => updateField('symptom_duration', e.target.value)} className={fieldClass} placeholder="2 days" />
          </label>
          <label className={labelClass}>
            Age group
            <select value={form.age_group} onChange={(e) => updateField('age_group', e.target.value)} className={fieldClass}>
              <option value="">Select age group</option>
              <option>Child</option>
              <option>Teen</option>
              <option>Adult</option>
              <option>Older adult</option>
            </select>
          </label>
          <label className={labelClass}>
            Pregnancy status, if applicable
            <select value={form.pregnancy_status} onChange={(e) => updateField('pregnancy_status', e.target.value)} className={fieldClass}>
              <option value="">Not applicable / prefer not to say</option>
              <option>Pregnant</option>
              <option>Recently gave birth</option>
              <option>Trying to conceive</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-1.5 text-sm font-medium text-white/75">
          Symptoms *
          <textarea value={form.symptoms} onChange={(e) => updateField('symptoms', e.target.value)} className={`${fieldClass} min-h-28`} placeholder="Describe what you are feeling..." />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Existing conditions
            <textarea value={form.existing_conditions} onChange={(e) => updateField('existing_conditions', e.target.value)} className={`${fieldClass} min-h-20`} placeholder="Diabetes, asthma..." />
          </label>
          <label className={labelClass}>
            Allergies
            <textarea value={form.allergies} onChange={(e) => updateField('allergies', e.target.value)} className={`${fieldClass} min-h-20`} placeholder="Penicillin, peanuts..." />
          </label>
        </div>

        <label className="mt-4 block space-y-1.5 text-sm font-medium text-white/75">
          Prescription upload link, if available
          <div className="flex items-center gap-2 border border-dashed border-white/15 bg-slate-900 px-3 py-2.5">
            <Upload className="h-4 w-4 text-emerald-300" />
            <input value={form.prescription_url} onChange={(e) => updateField('prescription_url', e.target.value)} className="w-full bg-transparent text-sm text-white outline-none" placeholder="Paste file/image link for MVP" />
          </div>
        </label>

        <button disabled={submitting} className="mt-6 w-full bg-emerald-500 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Submitting request...' : 'Submit consultation request'}
        </button>
      </form>

      <aside className="space-y-5">
        <div className="border border-amber-400/25 bg-amber-400/10 p-5 text-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div>
              <h2 className="font-bold">Emergency warning checklist</h2>
              <p className="mt-1 text-sm leading-6 text-amber-50/75">Tick any danger signs. These requests are highlighted, but urgent cases must go to a clinic or hospital immediately.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {dangerSigns.map((sign) => (
              <label key={sign} className="flex cursor-pointer items-center gap-3 border border-amber-300/15 bg-black/10 p-3 text-sm">
                <input type="checkbox" checked={emergencyFlags.includes(sign)} onChange={() => toggleDangerSign(sign)} className="h-4 w-4 accent-amber-400" />
                {sign}
              </label>
            ))}
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.04] p-5 text-white">
          <Shield className="mb-3 h-6 w-6 text-emerald-300" />
          <h2 className="font-bold">How it works</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-white/65">
            <p className="border border-white/10 bg-slate-900/70 p-3">1. Patient chooses home or partner-facility assisted care.</p>
            <p className="border border-white/10 bg-slate-900/70 p-3">2. Home requests go to ChekaMeds admin. Facility requests go to the selected partner facility.</p>
            <p className="border border-white/10 bg-slate-900/70 p-3">3. Approved users create and share the video link where appropriate.</p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ConsultantRequestForm;
