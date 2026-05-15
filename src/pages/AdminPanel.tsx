import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  PauseCircle,
  RefreshCw,
  SearchX,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/ChekaMeds_Logo.png';
import type { Tables } from '@/integrations/supabase/types';

type Pharmacy = Tables<'pharmacies'>;
type Inventory = Tables<'clinic_inventory'>;
type OrderRequest = Tables<'order_requests'>;
type WhatsAppLog = Tables<'whatsapp_webhook_logs'>;
type WhatsAppSession = Tables<'whatsapp_sessions'>;
type ChekaPayEvent = Tables<'chekapay_webhook_events'>;
type FailedSearch = Tables<'failed_searches'>;

type AdminTab = 'facilities' | 'inventory' | 'orders' | 'whatsapp' | 'chekapay' | 'failed';
type PharmacyDraft = Pick<Pharmacy, 'contact_name' | 'contact_email' | 'contact_phone' | 'directions_link' | 'subscription_status' | 'payment_required' | 'visible_in_search'>;

const tabs: { id: AdminTab; label: string; icon: typeof Building2 }[] = [
  { id: 'facilities', label: 'Facilities', icon: Building2 },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'orders', label: 'Orders', icon: CreditCard },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'chekapay', label: 'ChekaPay', icon: ShieldCheck },
  { id: 'failed', label: 'Failed searches', icon: SearchX },
];

const statusBadge = (status: string) => {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  if (status === 'suspended') return 'bg-red-500/10 text-red-600 border-red-500/20';
  if (status === 'overdue' || status === 'frozen') return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  return 'bg-muted text-muted-foreground border-border';
};

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('facilities');
  const [drafts, setDrafts] = useState<Record<string, Partial<PharmacyDraft>>>({});

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) throw error;
      return data?.role === 'admin';
    },
    enabled: !!user,
  });

  const enabled = isAdmin === true;

  const pharmaciesQuery = useQuery({
    queryKey: ['admin-pharmacies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pharmacy[];
    },
    enabled,
  });

  const inventoryQuery = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clinic_inventory').select('*').order('clinic_name').order('med_name');
      if (error) throw error;
      return (data ?? []) as Inventory[];
    },
    enabled,
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-order-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('order_requests').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as OrderRequest[];
    },
    enabled,
  });

  const logsQuery = useQuery({
    queryKey: ['admin-whatsapp-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_webhook_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as WhatsAppLog[];
    },
    enabled,
  });

  const sessionsQuery = useQuery({
    queryKey: ['admin-whatsapp-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_sessions').select('*').order('updated_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as WhatsAppSession[];
    },
    enabled,
  });

  const chekaPayQuery = useQuery({
    queryKey: ['admin-chekapay-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chekapay_webhook_events').select('*').order('received_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as ChekaPayEvent[];
    },
    enabled,
  });

  const failedQuery = useQuery({
    queryKey: ['admin-failed-searches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('failed_searches').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as FailedSearch[];
    },
    enabled,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
    queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    queryClient.invalidateQueries({ queryKey: ['admin-order-requests'] });
    queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-logs'] });
    queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-chekapay-events'] });
    queryClient.invalidateQueries({ queryKey: ['admin-failed-searches'] });
  };

  const pharmacyMutation = useMutation({
    mutationFn: async ({ pharmacy, patch }: { pharmacy: Pharmacy; patch: Partial<Pharmacy> }) => {
      const payload = { ...patch, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('pharmacies').update(payload).eq('id', pharmacy.id);
      if (error) throw error;

      if (patch.status === 'active') {
        await supabase.from('profiles').update({ approved: true }).eq('clinic_name', pharmacy.name);
      }
      if (patch.status === 'suspended' || patch.visible_in_search === false) {
        await supabase.from('profiles').update({ approved: patch.status === 'active' }).eq('clinic_name', pharmacy.name);
      }
      if ('directions_link' in patch || 'contact_phone' in patch) {
        await supabase
          .from('clinic_inventory')
          .update({ directions_link: patch.directions_link ?? pharmacy.directions_link, contact: patch.contact_phone ?? pharmacy.contact_phone })
          .eq('clinic_name', pharmacy.name);
      }
    },
    onSuccess: () => {
      refreshAll();
      toast({ title: 'Facility updated', description: 'Admin changes were saved.' });
    },
    onError: (err: Error) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' }),
  });

  const orderMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OrderRequest> }) => {
      const { error } = await supabase.from('order_requests').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-requests'] });
      toast({ title: 'Order updated' });
    },
    onError: (err: Error) => toast({ title: 'Order update failed', description: err.message, variant: 'destructive' }),
  });

  const syncUsersMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-sync-users', { body: {} });
      if (error) throw error;
      return data as { scanned?: number; profilesUpserted?: number; pharmaciesUpserted?: number };
    },
    onSuccess: (data) => {
      refreshAll();
      toast({
        title: 'Signups synced',
        description: `Scanned ${data?.scanned ?? 0} Auth users and refreshed facility rows.`,
      });
    },
    onError: (err: Error) => toast({ title: 'Signup sync failed', description: err.message, variant: 'destructive' }),
  });

  const pharmacies = pharmaciesQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const chekaPayEvents = chekaPayQuery.data ?? [];
  const failedSearches = failedQuery.data ?? [];

  const stats = useMemo(() => ({
    total: pharmacies.length,
    pending: pharmacies.filter((p) => p.status === 'pending').length,
    active: pharmacies.filter((p) => p.status === 'active').length,
    suspended: pharmacies.filter((p) => p.status === 'suspended').length,
    hidden: pharmacies.filter((p) => !p.visible_in_search).length,
    orders: orders.length,
  }), [orders.length, pharmacies]);

  const setDraft = (id: string, patch: Partial<PharmacyDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const getDraft = (pharmacy: Pharmacy): PharmacyDraft => ({
    contact_name: drafts[pharmacy.id]?.contact_name ?? pharmacy.contact_name,
    contact_email: drafts[pharmacy.id]?.contact_email ?? pharmacy.contact_email,
    contact_phone: drafts[pharmacy.id]?.contact_phone ?? pharmacy.contact_phone,
    directions_link: drafts[pharmacy.id]?.directions_link ?? pharmacy.directions_link,
    subscription_status: drafts[pharmacy.id]?.subscription_status ?? pharmacy.subscription_status,
    payment_required: drafts[pharmacy.id]?.payment_required ?? pharmacy.payment_required,
    visible_in_search: drafts[pharmacy.id]?.visible_in_search ?? pharmacy.visible_in_search,
  });

  if (authLoading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm object-contain" />
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">ChekaMeds Admin</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Operations & launch control</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => syncUsersMutation.mutate()} disabled={syncUsersMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncUsersMutation.isPending ? 'animate-spin' : ''}`} /> Sync signups
            </Button>
            <Button variant="outline" size="sm" onClick={refreshAll}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
            <Link to="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Building2 },
            { label: 'Pending', value: stats.pending, icon: Clock },
            { label: 'Active', value: stats.active, icon: CheckCircle2 },
            { label: 'Suspended', value: stats.suspended, icon: PauseCircle },
            { label: 'Hidden', value: stats.hidden, icon: EyeOff },
            { label: 'Orders', value: stats.orders, icon: CreditCard },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><stat.icon className="h-4 w-4" />{stat.label}</div>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </Card>
          ))}
        </div>

        <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${tab === item.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </div>

        {tab === 'facilities' && (
          <div className="space-y-3">
            {pharmaciesQuery.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : pharmacies.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">No facility rows found yet. Click <strong>Sync signups</strong> to pull Supabase Auth users into pending pharmacy records.</Card>
            ) : pharmacies.map((pharmacy) => {
              const draft = getDraft(pharmacy);
              return (
                <Card key={pharmacy.id} className="p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-lg">{pharmacy.name}</h2>
                        <Badge variant="outline" className={statusBadge(pharmacy.status)}>{pharmacy.status}</Badge>
                        <Badge variant="outline" className={statusBadge(pharmacy.subscription_status)}>{pharmacy.subscription_status}</Badge>
                        {pharmacy.visible_in_search ? <Badge className="bg-emerald-600"><Eye className="h-3 w-3 mr-1" /> Visible</Badge> : <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" /> Hidden</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Created {new Date(pharmacy.created_at).toLocaleString()} · Payment required: {pharmacy.payment_required ? 'Yes' : 'No'}</p>
                      {pharmacy.suspension_reason && <p className="text-xs text-red-600 mt-1">Suspension reason: {pharmacy.suspension_reason}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => pharmacyMutation.mutate({ pharmacy, patch: { status: 'active', visible_in_search: true, approved_at: new Date().toISOString(), suspended_at: null, suspension_reason: null } })} disabled={pharmacyMutation.isPending}>Approve / Reactivate</Button>
                      <Button size="sm" variant="outline" onClick={() => pharmacyMutation.mutate({ pharmacy, patch: { visible_in_search: false, subscription_status: 'frozen', payment_required: true } })} disabled={pharmacyMutation.isPending}>Freeze visibility</Button>
                      <Button size="sm" variant="destructive" onClick={() => pharmacyMutation.mutate({ pharmacy, patch: { status: 'suspended', visible_in_search: false, suspended_at: new Date().toISOString(), suspension_reason: 'Suspended by admin' } })} disabled={pharmacyMutation.isPending}>Suspend</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Input value={draft.contact_name ?? ''} onChange={(e) => setDraft(pharmacy.id, { contact_name: e.target.value })} placeholder="Contact name" />
                    <Input value={draft.contact_email ?? ''} onChange={(e) => setDraft(pharmacy.id, { contact_email: e.target.value })} placeholder="Contact email" />
                    <Input value={draft.contact_phone ?? ''} onChange={(e) => setDraft(pharmacy.id, { contact_phone: e.target.value })} placeholder="Contact phone" />
                    <Input value={draft.directions_link ?? ''} onChange={(e) => setDraft(pharmacy.id, { directions_link: e.target.value })} placeholder="Directions link" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs text-muted-foreground">Subscription</label>
                    <select className="h-9 rounded-md border bg-background px-3 text-sm" value={draft.subscription_status} onChange={(e) => setDraft(pharmacy.id, { subscription_status: e.target.value as Pharmacy['subscription_status'] })}>
                      <option value="trial">trial</option>
                      <option value="active">active</option>
                      <option value="overdue">overdue</option>
                      <option value="frozen">frozen</option>
                    </select>
                    <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={draft.visible_in_search} onChange={(e) => setDraft(pharmacy.id, { visible_in_search: e.target.checked })} /> Visible in search</label>
                    <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={draft.payment_required} onChange={(e) => setDraft(pharmacy.id, { payment_required: e.target.checked })} /> Payment required</label>
                    <Button size="sm" variant="secondary" onClick={() => pharmacyMutation.mutate({ pharmacy, patch: draft })} disabled={pharmacyMutation.isPending}>Save management fields</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab === 'inventory' && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b"><h2 className="font-semibold">All inventory ({inventory.length})</h2></div>
            <div className="overflow-x-auto max-h-[650px]">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0"><tr><th className="text-left p-3">Facility</th><th className="text-left p-3">Medicine</th><th className="text-left p-3">Qty</th><th className="text-left p-3">Price</th><th className="text-left p-3">Directions</th></tr></thead>
                <tbody>{inventory.map((item) => <tr key={item.id} className="border-t"><td className="p-3">{item.clinic_name}</td><td className="p-3">{item.med_name}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.price_bwp != null ? `P${Number(item.price_bwp).toFixed(2)}` : '—'}</td><td className="p-3 max-w-xs truncate">{item.directions_link || '—'}</td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.medicine} · {order.pharmacy_name}</p>
                  <p className="text-xs text-muted-foreground">{order.from_number || 'No phone'} · {new Date(order.created_at).toLocaleString()} · {order.payment_status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select className="h-9 rounded-md border bg-background px-3 text-sm" value={order.status} onChange={(e) => orderMutation.mutate({ id: order.id, patch: { status: e.target.value as OrderRequest['status'] } })}>
                    <option value="pending">pending</option><option value="confirmed">confirmed</option><option value="collected">collected</option><option value="cancelled">cancelled</option>
                  </select>
                  <Button size="sm" variant="outline" onClick={() => orderMutation.mutate({ id: order.id, patch: { payment_status: 'paid_manual' } })}>Mark paid</Button>
                  <Button size="sm" variant="outline" onClick={() => orderMutation.mutate({ id: order.id, patch: { payment_status: 'manual_collection_pending' } })}>Payment pending</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3"><h2 className="font-semibold">Recent searches/messages</h2>{logs.map((log) => <div key={log.id} className="border rounded-lg p-3"><p className="text-xs text-muted-foreground">{log.from_number || '—'} · {new Date(log.created_at).toLocaleString()}</p><p className="text-sm font-medium">{log.message_body}</p><pre className="text-xs bg-muted p-2 mt-2 rounded whitespace-pre-wrap max-h-32 overflow-auto">{log.reply_text}</pre></div>)}</Card>
            <Card className="p-4 space-y-3"><h2 className="font-semibold">Active sessions</h2>{sessions.map((session) => <div key={session.from_number} className="border rounded-lg p-3"><p className="font-medium">{session.from_number}</p><p className="text-xs text-muted-foreground">{session.medicine || 'No medicine'} · {session.language} · {new Date(session.updated_at).toLocaleString()}</p></div>)}</Card>
          </div>
        )}

        {tab === 'chekapay' && (
          <Card className="p-4 space-y-3"><h2 className="font-semibold">ChekaPay webhook events</h2>{chekaPayEvents.map((event) => <div key={event.id} className="border rounded-lg p-3"><p className="font-medium">{event.event_type} · {event.status || 'no status'}</p><p className="text-xs text-muted-foreground">Payment: {event.payment_id || '—'} · {new Date(event.received_at).toLocaleString()}</p></div>)}</Card>
        )}

        {tab === 'failed' && (
          <Card className="p-4 space-y-3"><h2 className="font-semibold">Failed searches</h2>{failedSearches.map((failed) => <div key={failed.id} className="border rounded-lg p-3 flex items-center gap-3"><SearchX className="h-4 w-4 text-muted-foreground" /><div><p className="font-medium">{failed.query}</p><p className="text-xs text-muted-foreground">{failed.from_number || '—'} · {new Date(failed.created_at).toLocaleString()}</p></div></div>)}</Card>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
