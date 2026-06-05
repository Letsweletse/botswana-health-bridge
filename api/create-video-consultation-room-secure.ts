import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: Record<string, unknown>) => void; setHeader: (name: string, value: string | string[]) => void };
type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };

type ConsultantRequest = {
  id: string;
  video_room_url: string | null;
  video_room_expires_at: string | null;
  preferred_facility_name: string | null;
  assigned_facility_name: string | null;
};

const json = (res: ApiResponse, status: number, body: Record<string, unknown>) => res.status(status).json(body);
const norm = (value?: string | null) => value?.trim().toLowerCase() || '';
const readBody = (body: unknown) => typeof body === 'string' ? JSON.parse(body || '{}') : body && typeof body === 'object' ? body as Record<string, unknown> : {};
const env = (...names: string[]) => names.map((name) => process.env[name]?.trim()).find(Boolean);
const isAdminEmail = (email?: string | null) => {
  const admins = new Set(['iblimenterprise@zohomail.com', ...(env('CHEKAMEDS_ADMIN_EMAILS') || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)]);
  return admins.has((email || '').toLowerCase());
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', ['POST', 'OPTIONS']);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const supabaseUrl = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
    const anonKey = env('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY');
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY');
    const dailyApiKey = env('DAILY_API_KEY');
    const dailyDomain = env('DAILY_DOMAIN');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(res, 500, { error: 'Supabase server environment is not configured' });
    if (!dailyApiKey) return json(res, 500, { error: 'DAILY_API_KEY is not configured' });

    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) return json(res, 401, { error: 'Authentication required' });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(res, 401, { error: 'Authentication required' });

    const userId = authData.user.id;
    const isAdmin = isAdminEmail(authData.user.email);

    const { data: profile, error: profileError } = await serviceClient.from('profiles').select('approved, clinic_name').eq('id', userId).maybeSingle();
    if (profileError) return json(res, 500, { error: 'Could not read user profile' });
    if (!isAdmin && profile?.approved !== true) return json(res, 403, { error: 'Only approved facility/admin users can create video consultation rooms' });

    const body = readBody(req.body);
    const consultantRequestId = body.consultant_request_id;
    if (!consultantRequestId || typeof consultantRequestId !== 'string') return json(res, 400, { error: 'consultant_request_id is required' });

    const { data: requestRow, error: requestError } = await serviceClient
      .from('consultant_requests')
      .select('id, video_room_url, video_room_expires_at, preferred_facility_name, assigned_facility_name')
      .eq('id', consultantRequestId)
      .maybeSingle<ConsultantRequest>();

    if (requestError) return json(res, 500, { error: 'Could not read consultant request' });
    if (!requestRow) return json(res, 404, { error: 'Consultant request not found' });

    if (!isAdmin) {
      const clinicName = norm(profile?.clinic_name as string | null);
      const assigned = norm(requestRow.assigned_facility_name);
      const preferred = norm(requestRow.preferred_facility_name);
      if (!clinicName || (clinicName !== assigned && clinicName !== preferred)) return json(res, 403, { error: 'This request is not assigned to your facility' });
    }

    if (requestRow.video_room_url) return json(res, 200, { room_url: requestRow.video_room_url, video_room_url: requestRow.video_room_url, expires_at: requestRow.video_room_expires_at, existing: true });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const roomName = `chekameds-${consultantRequestId}-${crypto.randomUUID().slice(0, 8)}`;

    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dailyApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: roomName, privacy: 'public', properties: { exp: Math.floor(expiresAt.getTime() / 1000), enable_chat: true, enable_screenshare: false, eject_at_room_exp: true, enable_knocking: false } }),
    });

    if (!dailyResponse.ok) return json(res, 502, { error: 'Could not create Daily.co room' });
    const dailyRoom = await dailyResponse.json();
    const roomUrl = dailyRoom.url || (dailyDomain ? `https://${dailyDomain}.daily.co/${roomName}` : null);
    if (!roomUrl) return json(res, 502, { error: 'Daily.co room URL was not returned' });

    const { error: updateError } = await serviceClient.from('consultant_requests').update({ video_room_url: roomUrl, video_room_created_at: now.toISOString(), video_room_expires_at: expiresAt.toISOString(), consultation_type: 'video', consultation_status: 'video_link_created', request_status: 'in_review', reviewed_by: userId, reviewed_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', consultantRequestId);
    if (updateError) return json(res, 500, { error: 'Room created but could not be saved to the request' });

    return json(res, 200, { room_url: roomUrl, video_room_url: roomUrl, expires_at: expiresAt.toISOString(), existing: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json(res, 500, { error: message });
  }
}
