// Sends facility registration notification email via Resend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ADMIN_EMAIL = 'iblimenterprise@zohomail.com';
const FROM_EMAIL = 'ChekaMeds <noreply@chekameds.co.bw>';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const { clinicName, fullName, email } = await req.json();
    if (!clinicName || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
        <div style="border-bottom:2px solid #10b981;padding-bottom:16px;margin-bottom:24px">
          <h1 style="margin:0;font-size:22px;color:#0f172a">ChekaMeds — New Facility Registered</h1>
          <p style="margin:6px 0 0;color:#64748b;font-size:13px">National Medicine Stock Dashboard · Botswana</p>
        </div>
        <p style="font-size:14px;line-height:1.6">A new health facility has just registered on ChekaMeds and has been auto-approved for access.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600;width:40%">Facility Name</td><td style="padding:10px;background:#f8fafc">${clinicName}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Contact Person</td><td style="padding:10px;background:#f8fafc">${fullName || '—'}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Email</td><td style="padding:10px;background:#f8fafc">${email}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Registered At</td><td style="padding:10px;background:#f8fafc">${new Date().toLocaleString('en-BW', { timeZone: 'Africa/Gaborone' })}</td></tr>
        </table>
        <p style="font-size:13px;color:#64748b;line-height:1.6">The facility can now sign in and begin uploading inventory items. No further action is required unless you wish to revoke access.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">ChekaMeds · IBLIM Enterprise · Gaborone, Botswana</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Facility Registered: ${clinicName}`,
        html,
        reply_to: email,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: 'Email send failed', details: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-facility-registration error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
