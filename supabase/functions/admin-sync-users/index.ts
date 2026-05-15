import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SyncResult = {
  scanned: number;
  profilesUpserted: number;
  pharmaciesUpserted: number;
  rolesUpserted: number;
};

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

function metadataText(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing admin authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = serviceClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Invalid admin authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (role?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: SyncResult = { scanned: 0, profilesUpserted: 0, pharmaciesUpserted: 0, rolesUpserted: 0 };
    const perPage = 1000;
    let page = 1;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const users = data.users || [];
      result.scanned += users.length;

      for (const user of users) {
        const email = user.email || '';
        const isAdminEmail = email.toLowerCase() === 'iblimenterprise@zohomail.com';
        const clinicName = isAdminEmail
          ? 'ChekaMeds Admin'
          : metadataText(user.user_metadata?.clinic_name, email ? `Facility ${email}` : `Facility ${user.id.slice(0, 8)}`);
        const fullName = metadataText(user.user_metadata?.full_name, email || clinicName);
        const approved = isAdminEmail;

        const { data: existingProfile, error: existingProfileError } = await supabase
          .from('profiles')
          .select('id, approved')
          .eq('user_id', user.id)
          .maybeSingle();
        if (existingProfileError) throw existingProfileError;

        const profilePayload = {
          user_id: user.id,
          full_name: fullName,
          clinic_name: clinicName,
          updated_at: new Date().toISOString(),
        };

        const { data: profile, error: profileError } = existingProfile
          ? await supabase
            .from('profiles')
            .update(isAdminEmail ? { ...profilePayload, approved: true } : profilePayload)
            .eq('user_id', user.id)
            .select('id, approved')
            .single()
          : await supabase
            .from('profiles')
            .insert({ ...profilePayload, approved })
            .select('id, approved')
            .single();
        if (profileError) throw profileError;
        const profileApproved = Boolean(profile.approved);
        result.profilesUpserted += 1;

        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({ user_id: user.id, role: isAdminEmail ? 'admin' : 'clinic_staff' }, { onConflict: 'user_id,role' });
        if (roleError) throw roleError;
        result.rolesUpserted += 1;

        if (isAdminEmail) {
          await supabase
            .from('admin_profiles')
            .upsert({ user_id: user.id, email }, { onConflict: 'user_id' });
        }

        const { data: existingPharmacy, error: existingPharmacyError } = await supabase
          .from('pharmacies')
          .select('id, status')
          .eq('name', clinicName)
          .maybeSingle();
        if (existingPharmacyError) throw existingPharmacyError;

        const pharmacyBase = {
          profile_id: profile.id,
          user_id: user.id,
          contact_name: fullName,
          contact_email: email,
          updated_at: new Date().toISOString(),
        };

        const pharmacyLifecycle = profileApproved && existingPharmacy?.status !== 'suspended'
          ? { status: 'active', visible_in_search: true, approved_at: new Date().toISOString() }
          : {};

        const { error: pharmacyError } = existingPharmacy
          ? await supabase
            .from('pharmacies')
            .update({ ...pharmacyBase, ...pharmacyLifecycle })
            .eq('id', existingPharmacy.id)
          : await supabase
            .from('pharmacies')
            .insert({
              name: clinicName,
              ...pharmacyBase,
              status: profileApproved ? 'active' : 'pending',
              subscription_status: 'trial',
              payment_required: false,
              visible_in_search: profileApproved,
              approved_at: profileApproved ? new Date().toISOString() : null,
            });
        if (pharmacyError) throw pharmacyError;
        result.pharmaciesUpserted += 1;
      }

      if (users.length < perPage) break;
      page += 1;
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown admin sync error';
    console.error('admin-sync-users error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
