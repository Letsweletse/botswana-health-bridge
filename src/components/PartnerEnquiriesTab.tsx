import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Enquiry = {
  id: string;
  created_at: string;
  full_name: string;
  organisation: string;
  job_title: string | null;
  country: string;
  email: string;
  phone: string | null;
  organisation_type: string | null;
  pharmacy_count: number | null;
  plan_interest: string | null;
  channels: string[];
  message: string | null;
  source: string | null;
  status: string;
};

const STATUSES = [
  ['new', 'New'], ['contacted', 'Contacted'], ['call_booked', 'Call booked'],
  ['proposal_sent', 'Proposal sent'], ['won', 'Won'], ['lost', 'Lost'],
] as const;
const PLAN: Record<string, string> = { pilot: 'Pilot', white_label: 'White Label', insights: 'Insights', not_sure: 'Not sure' };
const tone: Record<string, string> = { new: '#f59e0b', contacted: '#38bdf8', call_booked: '#a78bfa', proposal_sent: '#60a5fa', won: '#10b981', lost: '#64748b' };

export function usePartnerEnquiries() {
  return useQuery<Enquiry[]>({
    queryKey: ['partner-enquiries'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partner_enquiries')
        .select('id,created_at,full_name,organisation,job_title,country,email,phone,organisation_type,pharmacy_count,plan_interest,channels,message,source,status')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Enquiry[];
    },
    retry: false,
  });
}

export default function PartnerEnquiriesTab() {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = usePartnerEnquiries();

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('partner_enquiries').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-enquiries'] }),
    onError: (e: Error) => toast({ title: 'Could not update status', description: e.message, variant: 'destructive' }),
  });

  const card = { background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 12, padding: 18 } as const;

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto', color: '#10b981' }} /></div>;
  if (error) {
    return (
      <div style={card}>
        <strong style={{ color: '#f59e0b' }}>Partner enquiries are not set up yet.</strong>
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
          Run the migration <code>20261023190000_partner_enquiries.sql</code> in the Supabase SQL editor. Until then,
          new enquiries still arrive as WhatsApp alerts.
        </p>
      </div>
    );
  }

  const open = data.filter((d) => !['won', 'lost'].includes(d.status)).length;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Partner & licensing enquiries</h2>
        <span style={{ fontSize: 13, color: '#64748b' }}>{data.length} total · {open} open · from chekameds.co.bw/partners</span>
      </div>

      {data.length === 0 && <div style={{ ...card, color: '#94a3b8', fontSize: 14 }}>No enquiries yet. Share chekameds.co.bw/partners with prospects.</div>}

      {data.map((e) => {
        const wa = (e.phone || '').replace(/\D/g, '');
        return (
          <div key={e.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{e.organisation} <span style={{ color: '#64748b', fontWeight: 500 }}>· {e.country}</span></div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                  {e.full_name}{e.job_title ? `, ${e.job_title}` : ''}{e.organisation_type ? ` · ${e.organisation_type}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: tone[e.status] || '#64748b' }} />
                <select
                  value={e.status}
                  onChange={(ev) => setStatus.mutate({ id: e.id, status: ev.target.value })}
                  style={{ background: '#050d18', color: '#e2e8f0', border: '1px solid #1e2d3d', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}
                  aria-label={`Status for ${e.organisation}`}
                >
                  {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, fontSize: 12 }}>
              {[
                e.plan_interest ? PLAN[e.plan_interest] : null,
                ...e.channels.map((c) => c.toUpperCase()),
                e.pharmacy_count != null ? `${e.pharmacy_count} pharmacies` : null,
                new Date(e.created_at).toLocaleString('en-BW', { timeZone: 'Africa/Gaborone', dateStyle: 'medium', timeStyle: 'short' }),
              ].filter(Boolean).map((t) => (
                <span key={t as string} style={{ padding: '3px 9px', borderRadius: 99, background: '#111c2b', color: '#94a3b8' }}>{t}</span>
              ))}
            </div>
            {e.message && <p style={{ marginTop: 12, fontSize: 14, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{e.message}</p>}
            <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 13 }}>
              <a href={`mailto:${e.email}?subject=${encodeURIComponent('ChekaMeds licensing: next steps')}`} style={{ color: '#10b981', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Mail size={14} /> {e.email}</a>
              {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" style={{ color: '#10b981', display: 'inline-flex', gap: 6, alignItems: 'center' }}><MessageCircle size={14} /> {e.phone}</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
