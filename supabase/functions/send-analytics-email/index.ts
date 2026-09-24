// Sends a platform analytics report email via Resend.
// Mirrors the working pattern in notify-facility-registration, which already
// uses the RESEND_API_KEY secret configured on this project.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FROM_EMAIL = 'ChekaMeds <noreply@chekameds.co.bw>';

type MonthlyRow = { month: string; interactions: number; users: number };
type TopMed = [string, number];

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const { to, pharmacyName, stats } = await req.json();
    if (!to || !stats) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, stats' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeName = escapeHtml(pharmacyName || 'Pharmacy Partner');
    const reportDate = new Date().toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Gaborone' });

    const monthlyData: MonthlyRow[] = Array.isArray(stats.monthlyData) ? stats.monthlyData : [];
    const topMeds: TopMed[] = Array.isArray(stats.topMeds) ? stats.topMeds : [];

    const monthRows = monthlyData.map((m) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${escapeHtml(m.month)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${Number(m.interactions) || 0}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${Number(m.users) || 0}</td></tr>`
    ).join('');

    const medRows = topMeds.map(([m, c]) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-transform:capitalize">${escapeHtml(m)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#059669">${Number(c) || 0}</td></tr>`
    ).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
        <div style="border-bottom:2px solid #10b981;padding-bottom:16px;margin-bottom:24px">
          <h1 style="margin:0;font-size:22px;color:#0f172a">ChekaMeds Platform Analytics</h1>
          <p style="margin:6px 0 0;color:#64748b;font-size:13px">Prepared for ${safeName} · ${reportDate}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px">
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600;width:50%">Total interactions</td><td style="padding:10px;background:#f8fafc">${Number(stats.totalMessages) || 0}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Unique patients</td><td style="padding:10px;background:#f8fafc">${Number(stats.uniquePatients) || 0}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Confirmed reservations</td><td style="padding:10px;background:#f8fafc">${Number(stats.totalOrders) || 0}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Avg interactions / week</td><td style="padding:10px;background:#f8fafc">${Number(stats.avgPerWeek) || 0}</td></tr>
        </table>
        ${monthRows ? `
        <h3 style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Monthly trend</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
          <thead><tr><th style="background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;padding:8px 12px;text-align:left">Month</th><th style="background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;padding:8px 12px;text-align:center">Interactions</th><th style="background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;padding:8px 12px;text-align:center">Patients</th></tr></thead>
          <tbody>${monthRows}</tbody>
        </table>` : ''}
        ${medRows ? `
        <h3 style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Top medicines searched</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
          <thead><tr><th style="background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;padding:8px 12px;text-align:left">Medicine</th><th style="background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;padding:8px 12px;text-align:right">Searches</th></tr></thead>
          <tbody>${medRows}</tbody>
        </table>` : ''}
        <p style="font-size:11px;color:#94a3b8;margin-top:8px">All data sourced directly from the ChekaMeds platform database. No figures are estimated or inflated.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">ChekaMeds Botswana · info@chekameds.co.bw · www.chekameds.co.bw</p>
      </div>
    `;

    const text = `ChekaMeds Platform Analytics — ${safeName}\nReport date: ${reportDate}\n\nTotal interactions: ${Number(stats.totalMessages) || 0}\nUnique patients: ${Number(stats.uniquePatients) || 0}\nConfirmed reservations: ${Number(stats.totalOrders) || 0}\nAvg interactions/week: ${Number(stats.avgPerWeek) || 0}\n\nAll data sourced directly from the ChekaMeds platform database.`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `ChekaMeds Platform Analytics — ${pharmacyName || 'Report'}`,
        html,
        text,
        tags: [{ name: 'source', value: 'admin_analytics_report' }],
      }),
    });

    const responseText = await res.text();
    let data: unknown = responseText;
    try { data = responseText ? JSON.parse(responseText) : null; } catch (_) { data = responseText; }

    if (!res.ok) {
      console.error('Resend delivery failed:', JSON.stringify({ status: res.status, data }));
      return new Response(JSON.stringify({ error: 'Email delivery failed', details: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analytics email sent:', JSON.stringify({ to, id: (data as { id?: string } | null)?.id }));
    return new Response(JSON.stringify({ success: true, id: (data as { id?: string } | null)?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-analytics-email error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
