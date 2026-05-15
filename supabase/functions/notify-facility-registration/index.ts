// Sends facility registration notification email via Resend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ADMIN_EMAIL = 'iblimenterprise@zohomail.com';
const FROM_EMAIL = 'ChekaMeds <noreply@chekameds.co.bw>';

type ResendMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  reply_to: string;
  role: 'admin' | 'facility';
  required: boolean;
};

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
        <p style="font-size:14px;line-height:1.6">A new health facility has just registered on ChekaMeds and is awaiting admin approval.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600;width:40%">Facility Name</td><td style="padding:10px;background:#f8fafc">${safeClinicName}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Contact Person</td><td style="padding:10px;background:#f8fafc">${safeFullName}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Email</td><td style="padding:10px;background:#f8fafc">${safeEmail}</td></tr>
          <tr><td style="padding:10px;background:#f1f5f9;font-weight:600">Registered At</td><td style="padding:10px;background:#f8fafc">${registeredAt}</td></tr>
        </table>
        <p style="font-size:13px;color:#64748b;line-height:1.6">Please review the facility in the admin dashboard, then approve, suspend, or keep it under review.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">ChekaMeds · IBLIM Enterprise · Gaborone, Botswana</p>
      </div>
    `;

    const facilityHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
        <div style="border-bottom:2px solid #10b981;padding-bottom:16px;margin-bottom:24px">
          <h1 style="margin:0;font-size:22px;color:#0f172a">Your ChekaMeds facility registration is pending review</h1>
          <p style="margin:6px 0 0;color:#64748b;font-size:13px">National Medicine Stock Dashboard · Botswana</p>
        </div>
        <p style="font-size:14px;line-height:1.6">Dumela ${safeFullName},</p>
        <p style="font-size:14px;line-height:1.6">Your facility <strong>${safeClinicName}</strong> has been registered and is pending admin review. You will be able to upload medicine inventory after approval.</p>
        <div style="margin:22px 0;padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:14px;line-height:1.6">
          Status: Pending admin review<br />
          Facility: ${safeClinicName}<br />
          Registered: ${registeredAt}
        </div>
        <p style="font-size:13px;color:#64748b;line-height:1.6">If you did not register this facility, please contact IBLIM Enterprise immediately.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">ChekaMeds · IBLIM Enterprise · Gaborone, Botswana</p>
      </div>
    `;

    const recipients: ResendMessage[] = [
      {
        to: ADMIN_EMAIL,
        subject: `New Facility Registered: ${clinicName}`,
        html: adminHtml,
        text: `New facility registered and pending admin approval. Facility: ${clinicName}. Contact: ${fullName || '—'}. Email: ${email}. Registered: ${registeredAt}.`,
        reply_to: email,
        role: 'admin',
        required: true,
      },
      {
        to: email,
        subject: `ChekaMeds Facility Registration Received: ${clinicName}`,
        html: facilityHtml,
        text: `Dumela ${fullName || ''}. Your ChekaMeds facility account for ${clinicName} has been received and is pending admin review.`,
        reply_to: ADMIN_EMAIL,
        role: 'facility',
        required: false,
      },
    ];

    const sendResults = [];
    for (const message of recipients) {
      const payload = {
        from: FROM_EMAIL,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.reply_to,
        tags: [
          { name: 'source', value: 'facility_registration' },
          { name: 'recipient_role', value: message.role },
        ],
      };

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: unknown = responseText;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (_) {
        data = responseText;
      }

      if (!res.ok) {
        const resendError = {
          recipientRole: message.role,
          to: message.to,
          status: res.status,
          statusText: res.statusText,
          responseBody: data,
        };
        console.error('Resend delivery request failed:', JSON.stringify(resendError));

        if (!message.required) {
          sendResults.push({ to: message.to, role: message.role, warning: resendError });
          continue;
        }

        return new Response(JSON.stringify({ error: 'Admin notification email failed', details: resendError }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Resend delivery request accepted:', JSON.stringify({ recipientRole: message.role, to: message.to, responseBody: data }));
      sendResults.push({ to: message.to, role: message.role, id: (data as { id?: string } | null)?.id, responseBody: data });
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
