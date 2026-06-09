import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: Record<string, unknown>) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ConsultantRequest = {
  id: string;
  video_room_url: string | null;
  video_room_created_at: string | null;
  video_room_expires_at: string | null;
  assigned_facility_name: string | null;
};

type Profile = {
  approved: boolean | null;
  clinic_name: string | null;
};

const json = (res: ApiResponse, status: number, body: Record<string, unknown>) => {
  res.status(status).json(body);
};

const readBody = (body: unknown) => {
  if (typeof body === 'string') {
    return JSON.parse(body || '{}');
  }

  return body && typeof body === 'object' ? body as Record<string, unknown> : {};
};

const pickEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', ['POST', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = pickEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
    const anonKey = pickEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY');
    const serviceRoleKey = pickEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY');
    const dailyApiKey = pickEnv('DAILY_API_KEY');
    const dailyDomain = pickEnv('DAILY_DOMAIN');

    const missingSupabaseEnv = [
      ['SUPABASE_URL or VITE_SUPABASE_URL', supabaseUrl],
      ['SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY', anonKey],
      ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
    ].filter(([, value]) => !value).map(([name]) => name);

    if (missingSupabaseEnv.length > 0) {
      return json(res, 500, {
        error: 'Supabase server environment is not configured',
        missing: missingSupabaseEnv,
      });
    }

    if (!dailyApiKey) {
      return json(res, 500, { error: 'DAILY_API_KEY is not configured', missing: ['DAILY_API_KEY'] });
    }

    const authorization = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      return json(res, 401, { error: 'Authentication required' });
    }

    const userClient = createClient(supabaseUrl!, anonKey!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json(res, 401, { error: 'Authentication required' });
    }

    const userId = authData.user.id;

    const { data: profileById, error: profileByIdError } = await serviceClient
      .from('profiles')
      .select('approved, clinic_name')
      .eq('id', userId)
      .maybeSingle<Profile>();

    if (profileByIdError) {
      console.error('Profile approval lookup failed:', profileByIdError);
    }

    const isApproved = profileById?.approved === true;
    const userFacilityName = profileById?.clinic_name || null;
    let isAdmin = false;

    const { data: roleData, error: roleError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleError && roleData) {
      isAdmin = true;
    } else if (roleError) {
      console.warn('user_roles admin lookup skipped:', roleError.message);
    }

    if (!isAdmin && (!isApproved || !userFacilityName)) {
      return json(res, 403, { error: 'Only approved facility/admin users can create video consultation rooms' });
    }

    const body = readBody(req.body);
    const consultantRequestId = body.consultant_request_id;
    if (!consultantRequestId || typeof consultantRequestId !== 'string') {
      return json(res, 400, { error: 'consultant_request_id is required' });
    }

    const { data: requestRow, error: requestError } = await serviceClient
      .from('consultant_requests')
      .select('id, video_room_url, video_room_created_at, video_room_expires_at, assigned_facility_name')
      .eq('id', consultantRequestId)
      .maybeSingle<ConsultantRequest>();

    if (requestError) {
      console.error('Consultant request lookup failed:', requestError);
      return json(res, 500, { error: 'Could not read consultant request' });
    }

    if (!requestRow) {
      return json(res, 404, { error: 'Consultant request not found' });
    }

    if (!isAdmin && requestRow.assigned_facility_name !== userFacilityName) {
      return json(res, 403, { error: 'This request is not assigned to your facility' });
    }

    if (requestRow.video_room_url) {
      return json(res, 200, {
        room_url: requestRow.video_room_url,
        video_room_url: requestRow.video_room_url,
        expires_at: requestRow.video_room_expires_at,
        existing: true,
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const roomName = `chekameds-${consultantRequestId}-${crypto.randomUUID().slice(0, 8)}`;

    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public',
        properties: {
          exp: Math.floor(expiresAt.getTime() / 1000),
          enable_chat: true,
          enable_screenshare: false,
          eject_at_room_exp: true,
          enable_knocking: false,
        },
      }),
    });

    if (!dailyResponse.ok) {
      const dailyError = await dailyResponse.text();
      console.error('Daily room creation failed:', dailyResponse.status, dailyError);
      return json(res, 502, { error: 'Could not create Daily.co room' });
    }

    const dailyRoom = await dailyResponse.json();
    const roomUrl = dailyRoom.url || (dailyDomain ? `https://${dailyDomain}.daily.co/${roomName}` : null);

    if (!roomUrl) {
      console.error('Daily response did not include a room URL:', dailyRoom);
      return json(res, 502, { error: 'Daily.co room URL was not returned' });
    }

    const { error: updateError } = await serviceClient
      .from('consultant_requests')
      .update({
        video_room_url: roomUrl,
        video_room_created_at: now.toISOString(),
        video_room_expires_at: expiresAt.toISOString(),
        consultation_type: 'video',
        consultation_status: 'video_link_created',
        request_status: 'in_review',
        updated_at: now.toISOString(),
      })
      .eq('id', consultantRequestId);

    if (updateError) {
      console.error('Saving Daily room failed:', updateError);
      return json(res, 500, { error: 'Room created but could not be saved to the request' });
    }

    return json(res, 200, {
      room_url: roomUrl,
      video_room_url: roomUrl,
      expires_at: expiresAt.toISOString(),
      existing: false,
    });
  } catch (error) {
    console.error('create-video-consultation-room API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json(res, 500, { error: message });
  }
}
