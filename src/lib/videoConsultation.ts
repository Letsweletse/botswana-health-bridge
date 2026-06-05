import { supabase } from '@/integrations/supabase/client';

export type CreateVideoConsultationRoomResponse = {
  room_url: string;
  video_room_url: string;
  expires_at: string | null;
  existing: boolean;
};

type ApiErrorResponse = {
  error?: string;
  missing?: string[];
};

export async function createVideoConsultationRoom(consultantRequestId: string) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Please sign in again before creating a video consultation link.');
  }

  const response = await fetch('/api/create-video-consultation-room-secure', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ consultant_request_id: consultantRequestId }),
  });

  const data = await response.json().catch(() => ({})) as ApiErrorResponse & Partial<CreateVideoConsultationRoomResponse>;

  if (!response.ok || data?.error) {
    const missing = Array.isArray(data?.missing) && data.missing.length > 0
      ? ` Missing: ${data.missing.join(', ')}`
      : '';
    throw new Error(`${data?.error || 'Could not create video consultation room'}${missing}`);
  }

  return data as CreateVideoConsultationRoomResponse;
}
