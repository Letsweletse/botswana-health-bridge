import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ClipboardCopy, Download, ExternalLink, Loader2, Mail, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/ChekaMeds_Logo.png';

const defaultSubject = 'List your pharmacy on ChekaMeds Botswana';
const defaultPreview = 'Help patients find your pharmacy, search medicine availability, and access video consultation support.';

const defaultPlainMessage = `Good day,

ChekaMeds Botswana is inviting pharmacies to join our medicine access platform so members of the public can search for available medicines and contact pharmacies directly.

ChekaMeds helps patients avoid moving from pharmacy to pharmacy without knowing where stock may be available.

We also support video consultation access through ChekaMeds, helping patients request provider support from home when appropriate.

Your pharmacy can benefit from:

- Public visibility when people search for medicines
- Branch contact details shown to potential customers
- Support with inventory listing
- Direct customer enquiries
- Video consultation support for patients who need care guidance
- Assistance with completing or uploading the inventory template

ChekaMeds is live here:
https://www.chekameds.co.bw

Video consultation page:
https://www.chekameds.co.bw/consultant

To start, we only need confirmation of your pharmacy details and the person responsible for inventory or pharmacy operations.

Kind regards,

Letsweletse Seatla
Founder, ChekaMeds Botswana

ChekaMeds Botswana
Medicine Access • Pharmacy Visibility • Video Consultation • Digital Health Support
Website: https://www.chekameds.co.bw
Email: info@chekameds.co.bw
Mobile/WhatsApp: +267 75560140

Helping Batswana find available medicines faster.`;

const defaultHtmlMessage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ChekaMeds Pharmacy Onboarding</title>
</head>
<body style="margin:0;padding:0;background:#0D0F1A;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;color:#0D0F1A;font-size:1px;line-height:1px;">
    Help patients find your pharmacy, search medicine availability, and access video consultation support.
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0D0F1A;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#0D1120;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:18px 28px;background:#060810;border-bottom:1px solid rgba(255,255,255,0.08);">
              <strong style="font-size:24px;color:#ffffff;">Cheka<span style="color:#00C48C;">Meds</span></strong>
              <span style="float:right;background:rgba(0,196,140,0.12);color:#00C48C;border:1px solid rgba(0,196,140,0.25);border-radius:20px;padding:6px 12px;font-size:11px;font-weight:bold;">PHARMACY PARTNER</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:46px 34px;background:linear-gradient(160deg,#0A1628,#0C2040,#071A30);">
              <div style="display:inline-block;background:rgba(0,196,140,0.10);border:1px solid rgba(0,196,140,0.25);border-radius:30px;padding:8px 16px;color:#00C48C;font-size:11px;font-weight:bold;letter-spacing:1px;">NOW ONBOARDING PHARMACIES</div>
              <h1 style="margin:22px 0 12px;font-size:36px;line-height:1.12;color:#ffffff;">Help patients find medicine faster — <span style="color:#00C48C;">and reach care from home.</span></h1>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.72);font-size:16px;line-height:1.65;">ChekaMeds connects patients to listed medicine availability, pharmacy contacts, directions, WhatsApp access, and video consultation support.</p>
              <a href="https://www.chekameds.co.bw?utm_source=brevo&utm_medium=email&utm_campaign=pharmacy_onboarding" style="display:inline-block;background:#00C48C;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:10px;padding:15px 28px;">List Your Pharmacy</a>
              <a href="https://www.chekameds.co.bw/consultant?utm_source=brevo&utm_medium=email&utm_campaign=pharmacy_onboarding" style="display:inline-block;margin-left:8px;background:#11294A;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:10px;padding:15px 22px;">View Video Consultation</a>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 34px 8px;">
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">Dear {{ contact.FIRSTNAME | default: \"Pharmacy Manager\" }},</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.68);"><strong style="color:#ffffff;">{{ contact.PHARMACYNAME | default: \"Your pharmacy\" }}</strong> can be listed on ChekaMeds so patients can find your branch when searching for medicines.</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.68);">We are onboarding pharmacies across Botswana to improve medicine visibility, reduce wasted patient movement, and support better access to care.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px;">
                    <h2 style="margin:0 0 14px;color:#ffffff;font-size:20px;">What ChekaMeds helps with</h2>
                    <p style="margin:0 0 10px;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.6;">✅ Medicine search and pharmacy visibility</p>
                    <p style="margin:0 0 10px;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.6;">✅ WhatsApp access for patients</p>
                    <p style="margin:0 0 10px;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.6;">✅ Branch contacts, location, and directions</p>
                    <p style="margin:0 0 10px;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.6;">✅ Inventory upload assistance</p>
                    <p style="margin:0;color:rgba(255,255,255,0.72);font-size:14px;line-height:1.6;">✅ Video consultation support through ChekaMeds</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 34px 34px;">
              <a href="https://wa.me/26771424486?text=Hi%20ChekaMeds%2C%20I%20want%20to%20onboard%20my%20pharmacy" style="display:inline-block;background:#075E54;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:10px;padding:14px 26px;">WhatsApp ChekaMeds to Onboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 34px;background:#030508;text-align:center;color:rgba(255,255,255,0.42);font-size:12px;line-height:1.7;">
              <strong style="color:#ffffff;font-size:16px;">Letsweletse Seatla</strong><br />
              Founder, ChekaMeds Botswana<br />
              Medicine Access • Pharmacy Visibility • Video Consultation • Digital Health Support<br />
              <a href="https://www.chekameds.co.bw" style="color:#00C48C;">www.chekameds.co.bw</a> · info@chekameds.co.bw · +267 75560140<br /><br />
              You are receiving this because your pharmacy was identified as a potential ChekaMeds partner.<br />
              <a href="{{ unsubscribe }}" style="color:rgba(255,255,255,0.5);">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const splitEmails = (input: string) =>
  input
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const downloadTextFile = (filename: string, content: string, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const copyToClipboard = async (label: string, content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    toast({ title: `${label} copied`, description: 'Paste it where you need it.' });
  } catch {
    toast({ title: 'Copy failed', description: 'Your browser blocked clipboard access.', variant: 'destructive' });
  }
};

const CampaignAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [rawRecipients, setRawRecipients] = useState('fairgrounds@pulse.co.bw\ntlokweng@pulse.co.bw\nmogo@pulse.co.bw\nmahalapye@pulse.co.bw\nletlhakane@pulse.co.bw\nmaun@pulse.co.bw\ngoodhope@pulse.co.bw\npalapye@pulse.co.bw\nmolepolole@pulse.co.bw\npharmacist@pulse.co.bw\noodi@pulse.co.bw\nsarona@pulse.co.bw\ngwest@pulse.co.bw\nho@pulse.co.bw');
  const [subject, setSubject] = useState(defaultSubject);
  const [preview, setPreview] = useState(defaultPreview);
  const [plainMessage, setPlainMessage] = useState(defaultPlainMessage);
  const [htmlMessage, setHtmlMessage] = useState(defaultHtmlMessage);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ['campaign-admin-check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) throw error;
      return data?.role === 'admin';
    },
    enabled: !!user,
  });

  const parsed = useMemo(() => {
    const all = splitEmails(rawRecipients);
    const unique = Array.from(new Set(all));
    const valid = unique.filter(isValidEmail);
    const invalid = unique.filter((email) => !isValidEmail(email));
    return { all, unique, valid, invalid };
  }, [rawRecipients]);

  const csv = useMemo(() => {
    const rows = ['EMAIL,FIRSTNAME,PHARMACYNAME'];
    parsed.valid.forEach((email) => {
      const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
      rows.push(`${email},Pharmacy Manager,${name}`);
    });
    return rows.join('\n');
  }, [parsed.valid]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm object-contain" />
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">ChekaMeds Campaign Admin</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Brevo-ready pharmacy outreach</p>
            </div>
          </Link>
          <Link to="/admin" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Admin
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="grid md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Valid recipients</span></div>
            <p className="text-3xl font-bold text-foreground">{parsed.valid.length}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Duplicates removed</span></div>
            <p className="text-3xl font-bold text-foreground">{Math.max(parsed.all.length - parsed.unique.length, 0)}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4 text-critical" /><span className="text-xs text-muted-foreground">Invalid emails</span></div>
            <p className="text-3xl font-bold text-foreground">{parsed.invalid.length}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground mb-2">Brevo route</p>
            <a href="https://app.brevo.com/contact/list" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open Contacts <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Paste recipient emails</label>
              <textarea
                value={rawRecipients}
                onChange={(e) => setRawRecipients(e.target.value)}
                className="mt-2 min-h-[260px] w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Paste emails, separated by commas, spaces, or new lines"
              />
            </div>
            {parsed.invalid.length > 0 && (
              <div className="rounded-xl border border-critical/20 bg-critical/10 p-3 text-xs text-critical">
                Invalid emails: {parsed.invalid.join(', ')}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => copyToClipboard('Clean recipient list', parsed.valid.join('\n'))} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                <ClipboardCopy className="h-4 w-4" /> Copy clean emails
              </button>
              <button onClick={() => downloadTextFile('chekameds-brevo-contacts.csv', csv, 'text/csv')} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-muted">
                <Download className="h-4 w-4" /> Download Brevo CSV
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Subject line</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Preview text</label>
              <input value={preview} onChange={(e) => setPreview(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm text-muted-foreground leading-6">
              <p className="font-semibold text-foreground mb-2">Fast Brevo steps</p>
              <p>1. Download CSV here.</p>
              <p>2. In Brevo go Contacts → Import contacts → Upload CSV.</p>
              <p>3. Map EMAIL, FIRSTNAME, PHARMACYNAME.</p>
              <p>4. Create campaign → HTML editor → paste HTML.</p>
              <p>5. Choose the imported list, test, then send.</p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Plain email copy</label>
              <button onClick={() => copyToClipboard('Plain email copy', plainMessage)} className="text-xs font-semibold text-primary hover:underline">Copy</button>
            </div>
            <textarea value={plainMessage} onChange={(e) => setPlainMessage(e.target.value)} className="min-h-[340px] w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Brevo HTML campaign</label>
              <div className="flex gap-3">
                <button onClick={() => copyToClipboard('HTML campaign', htmlMessage)} className="text-xs font-semibold text-primary hover:underline">Copy HTML</button>
                <button onClick={() => downloadTextFile('chekameds-brevo-campaign.html', htmlMessage, 'text/html')} className="text-xs font-semibold text-primary hover:underline">Download</button>
              </div>
            </div>
            <textarea value={htmlMessage} onChange={(e) => setHtmlMessage(e.target.value)} className="min-h-[340px] w-full rounded-xl border border-border bg-background p-4 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </section>
      </main>
    </div>
  );
};

export default CampaignAdmin;
