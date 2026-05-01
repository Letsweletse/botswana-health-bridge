// Sends facility registration notification email via Resend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ADMIN_EMAIL = 'iblimenterprise@zohomail.com';
const FROM_EMAIL = 'ChekaMeds <noreply@chekameds.co.bw>';

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

    const { clinicName, fullName, email } = await req.json();
    if (!clinicName || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeClinicName = escapeHtml(clinicName);
    const safeFullName = escapeHtml(fullName || '—');
    const safeEmail = escapeHtml(email);
    const registeredAt = new Date().toLocaleString('en-BW', { timeZone: 'Africa/Gaborone' });

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
        <div style="border-bottom:2px solid #10b981;padding-bottom:16px;margin-bottom:24px">
          <h1 style="margin:0;font-size:22px;color:#0f172a">ChekaMeds — New Facility Registered</h1>
          <p style="margin:6px 0 0;color:#64748b;font-size:13px">National Medicine Stock Dashboard · Botswana</p>
        </div>
        <p style="font-size:14px;line-height:1.6">A new health facility has just registered on ChekaMeds and has been auto-approved for access.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600;width:40%">Facility Name</td><td style="padding:10px;background:#f8fafc">${safeClinicName}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Contact Person</td><td style="padding:10px;background:#f8fafc">${safeFullName}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Email</td><td style="padding:10px;background:#f8fafc">${safeEmail}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Registered At</td><td style="padding:10px;background:#f8fafc">${registeredAt}</td></tr>
        </table>
        <p style="font-size:13px;color:#64748b;line-height:1.6">The facility can now sign in and begin uploading inventory items. No further action is required unless you wish to revoke access.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">ChekaMeds · IBLIM Enterprise · Gaborone, Botswana</p>
      </div>
    `;

    const facilityHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
        <div style="border-bottom:2px solid #10b981;padding-bottom:16px;margin-bottom:24px">
          <h1 style="margin:0;font-size:22px;color:#0f172a">Your ChekaMeds facility account is active</h1>
          <p style="margin:6px 0 0;color:#64748b;font-size:13px">National Medicine Stock Dashboard · Botswana</p>
        </div>
        <p style="font-size:14px;line-height:1.6">Dumela ${safeFullName},</p>
        <p style="font-size:14px;line-height:1.6">Your facility <strong>${safeClinicName}</strong> has been registered and approved. You can now sign in and start uploading medicine inventory.</p>
        <div style="margin:22px 0;padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:14px;line-height:1.6">
          Status: Approved<br />
          Facility: ${safeClinicName}<br />
          Registered: ${registeredAt}
        </div>
        <p style="font-size:13px;color:#64748b;line-height:1.6">If you did not register this facility, please contact IBLIM Enterprise immediately.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">ChekaMeds · IBLIM Enterprise · Gaborone, Botswana</p>
      </div>
    `;

    const recipients = [
      {
        to: ADMIN_EMAIL,
        subject: `New Facility Registered: ${clinicName}`,
        html: adminHtml,
        reply_to: email,
      },
      {
        to: email,
        subject: `ChekaMeds Facility Approved: ${clinicName}`,
        html: facilityHtml,
        reply_to: ADMIN_EMAIL,
      },
    ];

    const sendResults = [];
    for (const message of recipients) {
      const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        reply_to: message.reply_to,
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
      sendResults.push({ to: message.to, id: data.id });
    }

    return new Response(JSON.stringify({ success: true, sent: sendResults }), {
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
