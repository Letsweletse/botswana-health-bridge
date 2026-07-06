import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bike, CheckCircle2, Clock, Loader2, PackageCheck, RefreshCw, Truck, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/ChekaMeds_Logo.png';

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string | null;
  vehicle_registration: string | null;
  service_area: string | null;
  is_active: boolean;
};

type DeliveryRequest = {
  id: string;
  patient_name: string;
  patient_phone: string;
  delivery_address: string;
  pharmacy_name: string;
  pharmacy_contact: string | null;
  medicine_name: string;
  order_status: string;
  driver_id: string | null;
  delivery_pin: string | null;
  delivery_fee_bwp: number | null;
  notes: string | null;
  created_at: string;
};

const statusOptions = ['requested', 'accepted', 'ready_for_pickup', 'driver_assigned', 'collected', 'on_the_way', 'delivered', 'cancelled', 'failed'];

const statusLabel = (status: string) => status.replace(/_/g, ' ');

const DeliveryAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'active' | 'delivered' | 'all'>('active');
  const [newDriver, setNewDriver] = useState({ full_name: '', phone: '', vehicle_type: '', vehicle_registration: '', service_area: '' });

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (error) throw error;
      return data?.role === 'admin';
    },
    enabled: !!user,
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['delivery-requests', filter],
    queryFn: async () => {
      let query = (supabase as any).from('medicine_delivery_requests').select('*').order('created_at', { ascending: false }).limit(100);
      if (filter === 'active') query = query.not('order_status', 'in', '(delivered,cancelled,failed)');
      if (filter === 'delivered') query = query.eq('order_status', 'delivered');
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DeliveryRequest[];
    },
    enabled: isAdmin === true,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('delivery_drivers').select('*').eq('is_active', true).order('full_name');
      if (error) throw error;
      return (data || []) as Driver[];
    },
    enabled: isAdmin === true,
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase as any).from('medicine_delivery_requests').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests'] });
      toast({ title: 'Delivery updated', description: 'The request status has been saved.' });
    },
    onError: (error: any) => toast({ title: 'Update failed', description: error?.message || 'Try again.', variant: 'destructive' }),
  });

  const createDriver = useMutation({
    mutationFn: async () => {
      if (!newDriver.full_name.trim() || !newDriver.phone.trim()) throw new Error('Driver name and phone are required.');
      const { error } = await (supabase as any).from('delivery_drivers').insert({
        full_name: newDriver.full_name.trim(),
        phone: newDriver.phone.trim(),
        vehicle_type: newDriver.vehicle_type.trim() || null,
        vehicle_registration: newDriver.vehicle_registration.trim() || null,
        service_area: newDriver.service_area.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewDriver({ full_name: '', phone: '', vehicle_type: '', vehicle_registration: '', service_area: '' });
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({ title: 'Driver added', description: 'Driver can now be assigned to deliveries.' });
    },
    onError: (error: any) => toast({ title: 'Driver not added', description: error?.message || 'Try again.', variant: 'destructive' }),
  });

  if (authLoading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  const activeCount = requests.filter((request) => !['delivered', 'cancelled', 'failed'].includes(request.order_status)).length;
  const deliveredCount = requests.filter((request) => request.order_status === 'delivered').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm object-contain" />
            <div><h1 className="text-sm font-bold text-foreground tracking-tight">ChekaMeds Delivery Admin</h1><p className="text-[9px] text-muted-foreground uppercase tracking-widest">Requests · Drivers · Status</p></div>
          </Link>
          <Link to="/admin" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Admin</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Active requests', value: activeCount, icon: Clock },
            { label: 'Delivered', value: deliveredCount, icon: CheckCircle2 },
            { label: 'Active drivers', value: drivers.length, icon: Truck },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border p-5"><div className="flex items-center gap-2 mb-2"><stat.icon className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{stat.label}</span></div><p className="text-2xl font-bold text-foreground">{stat.value}</p></div>
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
                {(['active', 'delivered', 'all'] as const).map((item) => (
                  <button key={item} onClick={() => setFilter(item)} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all capitalize ${filter === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{item}</button>
                ))}
              </div>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['delivery-requests'] })} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
            </div>

            {requestsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border"><PackageCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm font-semibold text-foreground">No delivery requests found</p><p className="text-xs text-muted-foreground mt-1">New requests will appear here.</p></div>
            ) : (
              <div className="space-y-3">
                {requests.map((request, index) => {
                  const driver = drivers.find((item) => item.id === request.driver_id);
                  return (
                    <motion.div key={request.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="bg-card rounded-2xl border border-border p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-foreground">{request.medicine_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{request.pharmacy_name} → {request.delivery_address}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Patient: {request.patient_name} · {request.patient_phone}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2.5 py-1 border border-primary/20">{statusLabel(request.order_status)}</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="space-y-1"><span className="text-[10px] text-muted-foreground font-semibold uppercase">Status</span><select value={request.order_status} onChange={(event) => updateRequest.mutate({ id: request.id, patch: { order_status: event.target.value } })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground">{statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-[10px] text-muted-foreground font-semibold uppercase">Driver</span><select value={request.driver_id || ''} onChange={(event) => updateRequest.mutate({ id: request.id, patch: { driver_id: event.target.value || null, order_status: event.target.value ? 'driver_assigned' : request.order_status } })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"><option value="">Unassigned</option>{drivers.map((driverItem) => <option key={driverItem.id} value={driverItem.id}>{driverItem.full_name}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-[10px] text-muted-foreground font-semibold uppercase">Fee BWP</span><input value={request.delivery_fee_bwp ?? ''} onChange={(event) => updateRequest.mutate({ id: request.id, patch: { delivery_fee_bwp: event.target.value ? Number(event.target.value) : null } })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground" placeholder="0.00" /></label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {driver && <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> {driver.full_name} · {driver.phone}</span>}
                        {request.delivery_pin && <span>PIN: <strong className="text-foreground">{request.delivery_pin}</strong></span>}
                        {request.notes && <span>Notes: {request.notes}</span>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => updateRequest.mutate({ id: request.id, patch: { order_status: 'accepted' } })} className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success hover:bg-success/15"><CheckCircle2 className="h-3.5 w-3.5" /> Accept</button>
                        <button onClick={() => updateRequest.mutate({ id: request.id, patch: { order_status: 'delivered' } })} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15"><PackageCheck className="h-3.5 w-3.5" /> Delivered</button>
                        <button onClick={() => updateRequest.mutate({ id: request.id, patch: { order_status: 'cancelled' } })} className="inline-flex items-center gap-1 rounded-lg bg-critical/10 px-3 py-2 text-xs font-semibold text-critical hover:bg-critical/15"><XCircle className="h-3.5 w-3.5" /> Cancel</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="bg-card rounded-2xl border border-border p-5 h-fit space-y-5">
            <div><h2 className="text-sm font-bold text-foreground">Add delivery driver</h2><p className="mt-1 text-xs text-muted-foreground">Start manual dispatch before building a full driver app.</p></div>
            {['full_name', 'phone', 'vehicle_type', 'vehicle_registration', 'service_area'].map((field) => (
              <label key={field} className="block space-y-1"><span className="text-[10px] text-muted-foreground font-semibold uppercase">{field.replace(/_/g, ' ')}</span><input value={(newDriver as any)[field]} onChange={(event) => setNewDriver((current) => ({ ...current, [field]: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground" /></label>
            ))}
            <button onClick={() => createDriver.mutate()} disabled={createDriver.isPending || driversLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{createDriver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} Add driver</button>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default DeliveryAdmin;
