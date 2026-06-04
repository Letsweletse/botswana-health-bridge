import { useState } from 'react';
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
};

const ConsultantRequestForm = () => {
  const [form, setForm] = useState(initialForm);
  const [emergencyFlags, setEmergencyFlags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

    setSubmitting(true);
    const { error } = await supabase.from('consultant_requests').insert({
      ...form,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      symptoms: form.symptoms.trim(),
      emergency_flags: emergencyFlags,
      request_status: emergencyFlags.length > 0 ? 'emergency_flagged' : 'new',
      consultation_type: 'chat',
      consultation_status: 'requested',
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
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-white shadow-2xl shadow-emerald-950/40">
        <CheckCircle2 className="mb-4 h-10 w-10 text-emerald-300" />
        <h2 className="text-2xl font-bold">Your consultation request has been received.</h2>
        <p className="mt-3 text-sm leading-6 text-emerald-50/80">
          A participating healthcare provider may contact you shortly. If this is an emergency, please visit the nearest clinic or hospital immediately.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={submitRequest} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">ChekaMeds Consultant</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Request healthcare provider support</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Submit your symptoms and contact details. A participating pharmacy, clinic, or healthcare provider will review the request before any video link is created.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-white/70">
            Full name *
            <input value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400" />
          </label>
          <label className="space-y-1.5 text-sm text-white/70">
            Phone / WhatsApp *
            <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400" placeholder="+267..." />
          </label>
          <label className="space-y-1.5 text-sm text-white/70">
            Location *
            <input value={form.location} onChange={(e) => updateField('location', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400" placeholder="Gaborone, Block 6" />
          </label>
          <label className="space-y-1.5 text-sm text-white/70">
            Duration of symptoms
            <input value={form.symptom_duration} onChange={(e) => updateField('symptom_duration', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400" placeholder="2 days" />
          </label>
          <label className="space-y-1.5 text-sm text-white/70">
            Age group
            <select value={form.age_group} onChange={(e) => updateField('age_group', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400">
              <option value="">Select age group</option>
              <option>Child</option>
              <option>Teen</option>
              <option>Adult</option>
              <option>Older adult</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm text-white/70">
            Pregnancy status, if applicable
            <select value={form.pregnancy_status} onChange={(e) => updateField('pregnancy_status', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400">
              <option value="">Not applicable / prefer not to say</option>
              <option>Pregnant</option>
              <option>Recently gave birth</option>
              <option>Trying to conceive</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-1.5 text-sm text-white/70">
          Symptoms *
          <textarea value={form.symptoms} onChange={(e) => updateField('symptoms', e.target.value)} className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400" placeholder="Describe what you are feeling..." />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-white/70">
            Existing conditions
            <textarea value={form.existing_conditions} onChange={(e) => updateField('existing_conditions', e.target.value)} className="min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400" placeholder="Diabetes, asthma..." />
          </label>
          <label className="space-y-1.5 text-sm text-white/70">
            Allergies
            <textarea value={form.allergies} onChange={(e) => updateField('allergies', e.target.value)} className="min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-emerald-400" placeholder="Penicillin, peanuts..." />
          </label>
        </div>

        <label className="mt-4 block space-y-1.5 text-sm text-white/70">
          Prescription upload link, if available
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-2.5">
            <Upload className="h-4 w-4 text-emerald-300" />
            <input value={form.prescription_url} onChange={(e) => updateField('prescription_url', e.target.value)} className="w-full bg-transparent text-white outline-none" placeholder="Paste file/image link for MVP" />
          </div>
        </label>

        <button disabled={submitting} className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Submitting request...' : 'Submit consultation request'}
        </button>
      </form>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div>
              <h2 className="font-bold">Emergency warning checklist</h2>
              <p className="mt-1 text-sm text-amber-50/75">Tick any danger signs. These requests are highlighted for providers, but you should still seek urgent care immediately.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {dangerSigns.map((sign) => (
              <label key={sign} className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-300/15 bg-black/10 p-3 text-sm">
                <input type="checkbox" checked={emergencyFlags.includes(sign)} onChange={() => toggleDangerSign(sign)} className="h-4 w-4 accent-amber-400" />
                {sign}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-white backdrop-blur-xl">
          <Shield className="mb-3 h-6 w-6 text-emerald-300" />
          <h2 className="font-bold">Safety disclaimer</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Video consultation is provided by the participating healthcare provider. ChekaMeds does not diagnose, prescribe, or replace emergency care.
          </p>
          <p className="mt-3 rounded-2xl bg-black/20 p-3 text-xs text-white/55">
            Patients cannot create video call links. Only approved facility/admin users can generate a secure room after reviewing a request.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default ConsultantRequestForm;
