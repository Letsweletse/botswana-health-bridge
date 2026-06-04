import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Loader2, MessageCircle, PlayCircle, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createVideoConsultationRoom } from '@/lib/videoConsultation';
import { toast } from '@/hooks/use-toast';

type ConsultantRequest = {
  id: string;
  full_name: string;
  phone: string;
  location: string;
  symptoms: string;
  symptom_duration: string | null;
  age_group: string | null;
  pregnancy_status: string | null;
  existing_conditions: string | null;
  allergies: string | null;
  prescription_url: string | null;
  emergency_flags: string[] | null;
  request_status: string | null;
  consultation_status: string | null;
  consultation_type: string | null;
  video_room_url: string | null;
  video_room_created_at: string | null;
  video_room_expires_at: string | null;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  new: 'New',
  in_review: 'In Review',
  emergency_flagged: 'Emergency Flagged',
  requested: 'New',
  video_link_created: 'Video Link Created',
  started: 'Started',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const badgeClass = (status: string) => {
  if (status === 'emergency_flagged') return 'border-critical/30 bg-critical/10 text-critical';
  if (status === 'video_link_created') return 'border-primary/30 bg-primary/10 text-primary';
  if (status === 'started') return 'border-warning/30 bg-warning/10 text-warning';
  if (status === 'completed') return 'border-success/30 bg-success/10 text-success';
  return 'border-border bg-muted text-muted-foreground';
};

const formatDate = (date: string | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-BW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const whatsappLink = (phone: string, videoRoomUrl: string) => {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const text = `Your ChekaMeds video consultation link is ready:\n\n${videoRoomUrl}\n\nPlease join at the agreed time.\n\nVideo consultation is provided by the participating healthcare provider. ChekaMeds does not diagnose, prescribe, or replace emergency care.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

const ConsultantDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ConsultantRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['consultant_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultant_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ConsultantRequest[];
    },
  });

  const stats = useMemo(() => ({
    total: requests.length,
    emergencies: requests.filter((request) => (request.emergency_flags?.length || 0) > 0).length,
    videoLinks: requests.filter((request) => Boolean(request.video_room_url)).length,
    completed: requests.filter((request) => request.consultation_status === 'completed').length,
  }), [requests]);

  const createVideoMutation = useMutation({
    mutationFn: async (requestId: string) => createVideoConsultationRoom(requestId),
    onSuccess: async (data) => {
      toast({ title: data.existing ? 'Existing video link loaded' : 'Video link created', description: data.video_room_url });
      await queryClient.invalidateQueries({ queryKey: ['consultant_requests'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not create video link', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: 'started' | 'completed' }) => {
      const { error } = await supabase
        .from('consultant_requests')
        .update({ consultation_status: status, consultation_type: 'video', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: 'Consultation status updated' });
      await queryClient.invalidateQueries({ queryKey: ['consultant_requests'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Status update failed', description: error.message, variant: 'destructive' });
    },
  });

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast({ title: 'Video link copied' });
  };

  return (
    <div className="space-y-5">
      <div className="border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Provider review area</p>
        <p className="mt-1 leading-6">Review patient requests, identify urgent cases, and create a secure video link only where appropriate. ChekaMeds does not diagnose or prescribe.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Total Requests', stats.total],
          ['Emergency Flagged', stats.emergencies],
          ['Video Links', stats.videoLinks],
          ['Completed', stats.completed],
        ].map(([label, value]) => (
          <div key={label} className="border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center border border-border bg-card py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : requests.length === 0 ? (
        <div className="border border-border bg-card p-10 text-center">
          <Video className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No consultant requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Patient submissions will appear here for facility review.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const isEmergency = (request.emergency_flags?.length || 0) > 0;
            const requestStatus = isEmergency ? 'emergency_flagged' : request.request_status || 'new';
            const consultationStatus = request.consultation_status || 'requested';

            return (
              <article key={request.id} className={`border bg-card p-5 ${isEmergency ? 'border-critical/40 ring-1 ring-critical/15' : 'border-border'}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">{request.full_name}</h2>
                      {isEmergency && <AlertTriangle className="h-4 w-4 text-critical" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{request.location} · Created {formatDate(request.created_at)}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{request.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[requestStatus, consultationStatus].filter(Boolean).map((status) => (
                      <span key={status} className={`border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(status)}`}>
                        {statusLabels[status] || status}
                      </span>
                    ))}
                  </div>
                </div>

                {isEmergency && (
                  <div className="mt-4 border border-critical/25 bg-critical/10 p-3 text-sm text-critical">
                    This request contains emergency warning signs. The patient should be advised to seek urgent medical care immediately.
                  </div>
                )}

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="space-y-3 border border-border bg-muted/20 p-4 text-sm">
                    <p><span className="font-semibold text-foreground">Symptoms:</span> <span className="text-muted-foreground">{request.symptoms}</span></p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Detail label="Duration" value={request.symptom_duration} />
                      <Detail label="Age group" value={request.age_group} />
                      <Detail label="Pregnancy" value={request.pregnancy_status} />
                      <Detail label="Prescription uploaded" value={request.prescription_url ? 'Yes' : 'No'} />
                      <Detail label="Existing conditions" value={request.existing_conditions} />
                      <Detail label="Allergies" value={request.allergies} />
                    </div>
                    {request.prescription_url && (
                      <a href={request.prescription_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        View prescription link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="border border-border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
                      <Video className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Video Consultation</h3>
                    </div>

                    {!request.video_room_url ? (
                      <div className="space-y-3">
                        <p className="border border-border bg-card p-3 text-xs leading-5 text-muted-foreground">Only approved facility/admin users can create video consultation links after reviewing the request.</p>
                        <button
                          onClick={() => createVideoMutation.mutate(request.id)}
                          disabled={createVideoMutation.isPending}
                          className="inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                        >
                          {createVideoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                          Create Video Call Link
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <a href={request.video_room_url} target="_blank" rel="noreferrer" className="block break-all border border-primary/20 bg-primary/5 p-3 text-xs font-medium text-primary hover:underline">
                          {request.video_room_url}
                        </a>
                        <p className="border border-border bg-card p-3 text-xs text-muted-foreground">Expires 2 hours after creation. Expiry: {formatDate(request.video_room_expires_at)}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button onClick={() => copyLink(request.video_room_url!)} className="inline-flex items-center justify-center gap-2 border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                            <Copy className="h-3.5 w-3.5" /> Copy Link
                          </button>
                          <a href={whatsappLink(request.phone, request.video_room_url)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-success hover:bg-success/15">
                            <MessageCircle className="h-3.5 w-3.5" /> Send via WhatsApp
                          </a>
                          <button onClick={() => updateStatusMutation.mutate({ requestId: request.id, status: 'started' })} className="inline-flex items-center justify-center gap-2 border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning hover:bg-warning/15">
                            <PlayCircle className="h-3.5 w-3.5" /> Mark Started
                          </button>
                          <button onClick={() => updateStatusMutation.mutate({ requestId: request.id, status: 'completed' })} className="inline-flex items-center justify-center gap-2 border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-success hover:bg-success/15">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={() => setSelectedRequest(request)} className="mt-4 text-xs font-semibold text-primary hover:underline">View request details</button>
              </article>
            );
          })}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedRequest(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedRequest.full_name}</h2>
                <p className="text-sm text-muted-foreground">{selectedRequest.phone} · {selectedRequest.location}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-muted">Close</button>
            </div>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <Detail label="Created" value={formatDate(selectedRequest.created_at)} />
              <Detail label="Symptoms" value={selectedRequest.symptoms} />
              <Detail label="Duration" value={selectedRequest.symptom_duration} />
              <Detail label="Age group" value={selectedRequest.age_group} />
              <Detail label="Pregnancy" value={selectedRequest.pregnancy_status} />
              <Detail label="Existing conditions" value={selectedRequest.existing_conditions} />
              <Detail label="Allergies" value={selectedRequest.allergies} />
              <Detail label="Emergency flags" value={selectedRequest.emergency_flags?.join(', ') || 'None'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value?: string | null }) => (
  <p className="border border-border bg-card p-2"><span className="font-semibold text-foreground">{label}:</span> <span className="text-muted-foreground">{value || '—'}</span></p>
);

export default ConsultantDashboard;
