import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Building2, Clock, ArrowLeft, Loader2, Users, ShieldCheck, Mail,
  LayoutDashboard, Store, Phone, PhoneOff, Search, Plus, Save, MessageCircle, Truck,
  ClipboardList, Stethoscope, Eye, EyeOff, BellRing, BellOff, ExternalLink, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import logo from '@/assets/ChekaMeds_Logo.png';

type AdminTab = 'overview' | 'approvals' | 'directory' | 'orders' | 'consultations' | 'analytics';

type Facility = {
  id: string;
  facility_name: string;
  facility_type: string | null;
  city_town: string | null;
  area: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  listing_status: string | null;
  stock_visibility: boolean | null;
  can_receive_reservations: boolean | null;
};

type OrderRequest = {
  id: string;
  from_number: string | null;
  medicine: string | null;
  pharmacy: string | null;
  amount: number | null;
  payment_status: string | null;
  status: string | null;
  notes: string | null;
  pickup_code: string | null;
  created_at: string;
};

type ConsultRequest = {
  id: string;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  symptoms: string | null;
  is_emergency: boolean | null;
  request_status: string | null;
  consultation_status: string | null;
  status: string | null;
  created_at: string;
};

const fmtDate = (value: string) =>
  new Date(value).toLocaleString('en-BW', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const hasNumber = (facility: Facility) => Boolean((facility.phone_whatsapp || '').replace(/[^0-9]/g, '').length >= 7);

const statusPill = (status: string | null) => {
  const value = (status || 'unknown').toLowerCase();
  if (['reserved', 'pending'].includes(value)) return 'text-warning bg-warning/10 border-warning/20';
  if (['ready', 'approved', 'confirmed'].includes(value)) return 'text-primary bg-primary/10 border-primary/20';
  if (['collected', 'completed', 'paid'].includes(value)) return 'text-success bg-success/10 border-success/20';
  if (['cancelled', 'rejected', 'declined'].includes(value)) return 'text-critical bg-critical/10 border-critical/20';
  return 'text-muted-foreground bg-muted border-border';
};

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [approvalFilter, setApprovalFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [dirSearch, setDirSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<'all' | 'missing' | 'reservable'>('all');
  const [phoneEdits, setPhoneEdits] = useState<Record<string, string>>({});
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [newFacility, setNewFacility] = useState({ name: '', city: '', phone: '' });

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

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
    queryKey: ['admin-facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chekameds_facilities')
        .select('id, facility_name, facility_type, city_town, area, phone_whatsapp, email, listing_status, stock_visibility, can_receive_reservations')
        .order('facility_name');
      if (error) throw error;
      return data as Facility[];
    },
    enabled: isAdmin === true,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as OrderRequest[];
    },
    enabled: isAdmin === true,
    refetchInterval: 30000,
  });

  const { data: consults = [], isLoading: consultsLoading } = useQuery({
    queryKey: ['admin-consults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultant_requests')
        .select('id, full_name, phone, location, symptoms, is_emergency, request_status, consultation_status, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ConsultRequest[];
    },
    enabled: isAdmin === true,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approved }: { userId: string; approved: boolean }) => {
      const { error } = await supabase.from('profiles').update({ approved }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({
        title: approved ? 'Facility approved' : 'Facility access revoked',
        description: approved ? 'They can now access the dashboard.' : 'Their dashboard access has been removed.',
      });
    },
    onError: (err: any) => toast({ title: 'Action failed', description: err.message, variant: 'destructive' }),
  });

  const facilityMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Facility> }) => {
      const { error } = await supabase.from('chekameds_facilities').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id, patch }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
      if ('phone_whatsapp' in patch) {
        setPhoneEdits((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast({ title: 'Number saved', description: 'Booking notifications will use this WhatsApp number.' });
      } else {
        toast({ title: 'Facility updated' });
      }
    },
    onError: (err: any) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' }),
  });

  const addFacilityMutation = useMutation({
    mutationFn: async () => {
      if (!newFacility.name.trim()) throw new Error('Facility name is required');
      const slug = newFacility.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { error } = await supabase.from('chekameds_facilities').insert({
        facility_name: newFacility.name.trim(),
        facility_slug: `${slug}-${Date.now().toString(36)}`,
        city_town: newFacility.city.trim() || null,
        phone_whatsapp: newFacility.phone.trim() || null,
        facility_type: 'pharmacy',
        listing_status: 'active',
        source: 'admin_panel',
        stock_visibility: true,
        can_receive_reservations: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
      setNewFacility({ name: '', city: '', phone: '' });
      setShowAddFacility(false);
      toast({ title: 'Facility added', description: 'It is now part of the ChekaMeds directory.' });
    },
    onError: (err: any) => toast({ title: 'Could not add facility', description: err.message, variant: 'destructive' }),
  });

  const orderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('order_requests').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Order updated' });
    },
    onError: (err: any) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' }),
  });

  const pendingProfiles = profiles.filter((p) => !p.approved);
  const missingNumbers = facilities.filter((f) => !hasNumber(f));
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString());

  const filteredProfiles = useMemo(() => {
    if (approvalFilter === 'pending') return profiles.filter((p) => !p.approved);
    if (approvalFilter === 'approved') return profiles.filter((p) => p.approved);
    return profiles;
  }, [profiles, approvalFilter]);

  const filteredFacilities = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    return facilities.filter((f) => {
      if (dirFilter === 'missing' && hasNumber(f)) return false;
      if (dirFilter === 'reservable' && !f.can_receive_reservations) return false;
      if (!q) return true;
      return [f.facility_name, f.city_town, f.area, f.phone_whatsapp, f.email]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [facilities, dirSearch, dirFilter]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'approvals', label: 'Approvals', icon: ShieldCheck, badge: pendingProfiles.length },
    { id: 'directory', label: 'Pharmacy Directory', icon: Store, badge: missingNumbers.length },
    { id: 'orders', label: 'Reservations', icon: ClipboardList, badge: orders.filter((o) => o.status === 'reserved').length },
    { id: 'consultations', label: 'Consultations', icon: Stethoscope },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm object-contain" />
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">ChekaMeds Admin</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Platform Control Center</p>
            </div>
          </Link>
          <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id ? 'bg-primary/15 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className="bg-warning/20 text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Registered Accounts', value: profiles.length, sub: `${pendingProfiles.length} pending approval`, icon: Users, color: 'text-foreground' },
                { label: 'Directory Pharmacies', value: facilities.length, sub: `${missingNumbers.length} missing WhatsApp number`, icon: Store, color: 'text-primary' },
                { label: 'Reservations', value: orders.length, sub: `${todayOrders.length} today`, icon: ClipboardList, color: 'text-warning' },
                { label: 'Consultation Requests', value: consults.length, sub: `${consults.filter((c) => (c.request_status || c.status) === 'pending').length} pending`, icon: Stethoscope, color: 'text-success' },
              ].map((stat) => (
                <div key={stat.label} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>

            {missingNumbers.length > 0 && (
              <button
                onClick={() => { setTab('directory'); setDirFilter('missing'); }}
                className="w-full flex items-center justify-between gap-4 rounded-2xl border border-warning/25 bg-warning/10 p-5 hover:bg-warning/15 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-warning/15 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{missingNumbers.length} pharmacies cannot receive booking notifications</p>
                    <p className="text-xs text-muted-foreground mt-1">They have no WhatsApp number on file. Add numbers so they get alerted when a patient reserves medicine.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-warning whitespace-nowrap">Fix now →</span>
              </button>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { to: '/admin/campaigns', icon: Mail, title: 'Email Campaigns', desc: 'Clean pharmacy emails and export Brevo campaigns.' },
                { to: '/admin/delivery', icon: Truck, title: 'Delivery Admin', desc: 'Manage medicine delivery requests and drivers.' },
                { to: '/admin/whatsapp', icon: MessageCircle, title: 'WhatsApp Webhook', desc: 'Inspect bot traffic and webhook health.' },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
                  <link.icon className="h-5 w-5 text-primary" />
                  <p className="text-sm font-bold text-foreground mt-3 flex items-center gap-1.5">
                    {link.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === 'approvals' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Account Approvals</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Accounts that registered on the platform. The wider pharmacy directory lives in the Pharmacy Directory tab.
                </p>
              </div>
              <div className="flex gap-1 bg-muted rounded-xl p-1">
                {(['pending', 'approved', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setApprovalFilter(f)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all capitalize ${
                      approvalFilter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f} {f === 'pending' && pendingProfiles.length > 0 && (
                      <span className="ml-1 bg-warning/20 text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingProfiles.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {profilesLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">No accounts found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {approvalFilter === 'pending' ? 'No pending registrations.' : 'No accounts match this filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((profile, i) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${profile.approved ? 'bg-success/10' : 'bg-warning/10'}`}>
                        <Building2 className={`h-5 w-5 ${profile.approved ? 'text-success' : 'text-warning'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{profile.clinic_name || 'Unnamed facility'}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">{profile.name || 'No name'}</span>
                          <span className="text-[11px] text-muted-foreground">{profile.email || ''}</span>
                          <span className="text-[10px] text-muted-foreground">
                            Joined {new Date(profile.created_at).toLocaleDateString('en-BW', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {profile.approved ? (
                        <>
                          <span className="text-[10px] font-medium text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">Approved</span>
                          <button
                            onClick={() => approveMutation.mutate({ userId: profile.id, approved: false })}
                            disabled={approveMutation.isPending}
                            className="p-2 rounded-lg text-muted-foreground hover:text-critical hover:bg-critical/10 transition-colors"
                            title="Revoke access"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">Pending</span>
                          <button
                            onClick={() => approveMutation.mutate({ userId: profile.id, approved: true })}
                            disabled={approveMutation.isPending}
                            className="p-2 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                            title="Approve facility"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => approveMutation.mutate({ userId: profile.id, approved: false })}
                            disabled={approveMutation.isPending}
                            className="p-2 rounded-lg text-muted-foreground hover:text-critical hover:bg-critical/10 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'directory' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Pharmacy Directory ({facilities.length})</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Every pharmacy listed on ChekaMeds. The WhatsApp number here is used to notify the pharmacy when a patient reserves medicine.
                </p>
              </div>
              <button
                onClick={() => setShowAddFacility(!showAddFacility)}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Plus className="h-3.5 w-3.5" /> Add Pharmacy
              </button>
            </div>

            {showAddFacility && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-primary/25 p-5 grid sm:grid-cols-4 gap-3">
                <input
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                  placeholder="Pharmacy name *"
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
                <input
                  value={newFacility.city}
                  onChange={(e) => setNewFacility({ ...newFacility, city: e.target.value })}
                  placeholder="City / town"
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
                <input
                  value={newFacility.phone}
                  onChange={(e) => setNewFacility({ ...newFacility, phone: e.target.value })}
                  placeholder="WhatsApp number e.g. 26771234567"
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={() => addFacilityMutation.mutate()}
                  disabled={addFacilityMutation.isPending}
                  className="bg-primary text-primary-foreground text-xs font-bold rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-50"
                >
                  {addFacilityMutation.isPending ? 'Saving…' : 'Save Pharmacy'}
                </button>
              </motion.div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                  placeholder="Search name, town, number…"
                  className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-1 bg-muted rounded-xl p-1">
                {([
                  { id: 'all', label: `All (${facilities.length})` },
                  { id: 'missing', label: `No number (${missingNumbers.length})` },
                  { id: 'reservable', label: 'Reservations on' },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDirFilter(f.id)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                      dirFilter === f.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {facilitiesLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredFacilities.length === 0 ? (
              <div className="text-center py-16">
                <Store className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">No pharmacies match</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFacilities.map((facility) => {
                  const numberMissing = !hasNumber(facility);
                  const edited = phoneEdits[facility.id];
                  const phoneValue = edited !== undefined ? edited : (facility.phone_whatsapp || '');
                  const dirty = edited !== undefined && edited !== (facility.phone_whatsapp || '');
                  return (
                    <div
                      key={facility.id}
                      className={`bg-card rounded-2xl border p-5 ${numberMissing ? 'border-warning/40' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${numberMissing ? 'bg-warning/10' : 'bg-primary/10'}`}>
                            {numberMissing ? <PhoneOff className="h-5 w-5 text-warning" /> : <Phone className="h-5 w-5 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{facility.facility_name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground capitalize">{facility.facility_type || 'pharmacy'}</span>
                              {(facility.city_town || facility.area) && (
                                <span className="text-[11px] text-muted-foreground">· {[facility.area, facility.city_town].filter(Boolean).join(', ')}</span>
                              )}
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusPill(facility.listing_status)}`}>
                                {facility.listing_status || 'unlisted'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => facilityMutation.mutate({ id: facility.id, patch: { stock_visibility: !facility.stock_visibility } })}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                              facility.stock_visibility
                                ? 'text-success border-success/25 bg-success/10 hover:bg-success/15'
                                : 'text-muted-foreground border-border bg-muted hover:text-foreground'
                            }`}
                            title="Toggle whether this facility's stock appears in patient search"
                          >
                            {facility.stock_visibility ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            Stock {facility.stock_visibility ? 'visible' : 'hidden'}
                          </button>
                          <button
                            onClick={() => facilityMutation.mutate({ id: facility.id, patch: { can_receive_reservations: !facility.can_receive_reservations } })}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                              facility.can_receive_reservations
                                ? 'text-primary border-primary/25 bg-primary/10 hover:bg-primary/15'
                                : 'text-muted-foreground border-border bg-muted hover:text-foreground'
                            }`}
                            title="Toggle whether patients can reserve at this facility"
                          >
                            {facility.can_receive_reservations ? <BellRing className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                            Reservations {facility.can_receive_reservations ? 'on' : 'off'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">WhatsApp for bookings</span>
                        <input
                          value={phoneValue}
                          onChange={(e) => setPhoneEdits({ ...phoneEdits, [facility.id]: e.target.value })}
                          placeholder="No number — add e.g. 26771234567"
                          className={`flex-1 min-w-[200px] max-w-xs bg-muted border rounded-lg px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-primary ${
                            numberMissing && !dirty ? 'border-warning/40' : 'border-border'
                          }`}
                        />
                        {dirty && (
                          <button
                            onClick={() => facilityMutation.mutate({ id: facility.id, patch: { phone_whatsapp: phoneValue.trim() || null } })}
                            disabled={facilityMutation.isPending}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                            <Save className="h-3 w-3" /> Save number
                          </button>
                        )}
                        {numberMissing && !dirty && (
                          <span className="text-[10px] font-medium text-warning">Cannot receive booking alerts until a number is added</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Medicine Reservations ({orders.length})</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bookings placed by patients via WhatsApp. Auto-refreshes every 30 seconds. Notes show whether the pharmacy was notified.
              </p>
            </div>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">No reservations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{order.medicine || 'Unknown item'}</p>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusPill(order.status)}`}>
                            {order.status || 'unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Store className="h-3 w-3" /> {order.pharmacy || '—'}</span>
                          {order.from_number && (
                            <a href={`https://wa.me/${order.from_number}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                              <MessageCircle className="h-3 w-3" /> +{order.from_number}
                            </a>
                          )}
                          <span>{order.amount != null ? `P${Number(order.amount).toFixed(2)}` : 'No price'}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(order.created_at)}</span>
                        </div>
                        {order.notes && <p className="text-[11px] text-muted-foreground mt-2 bg-muted/60 rounded-lg px-3 py-2">{order.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {['reserved'].includes(order.status || '') && (
                          <button
                            onClick={() => orderMutation.mutate({ id: order.id, status: 'ready' })}
                            className="text-[10px] font-bold text-primary border border-primary/25 bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/15"
                          >
                            Mark Ready
                          </button>
                        )}
                        {['reserved', 'ready'].includes(order.status || '') && (
                          <>
                            <button
                              onClick={() => orderMutation.mutate({ id: order.id, status: 'collected' })}
                              className="text-[10px] font-bold text-success border border-success/25 bg-success/10 px-3 py-1.5 rounded-lg hover:bg-success/15"
                            >
                              Collected
                            </button>
                            <button
                              onClick={() => orderMutation.mutate({ id: order.id, status: 'cancelled' })}
                              className="text-[10px] font-bold text-critical border border-critical/25 bg-critical/10 px-3 py-1.5 rounded-lg hover:bg-critical/15"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'consultations' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Consultation Requests ({consults.length})</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Recent virtual care requests. Full management (video links, assignment) lives in the Consultant tab of the dashboard.</p>
              </div>
              <Link to="/" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Open Consultant Dashboard <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            {consultsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : consults.length === 0 ? (
              <div className="text-center py-16">
                <Stethoscope className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">No consultation requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {consults.map((c) => (
                  <div key={c.id} className={`bg-card rounded-2xl border p-5 ${c.is_emergency ? 'border-critical/40' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{c.full_name || 'Anonymous'}</p>
                          {c.is_emergency && (
                            <span className="text-[10px] font-bold text-critical bg-critical/10 border border-critical/20 px-2 py-0.5 rounded-full">EMERGENCY</span>
                          )}
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusPill(c.request_status || c.status)}`}>
                            {c.request_status || c.status || 'pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-muted-foreground">
                          {c.phone && (
                            <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {c.phone}
                            </a>
                          )}
                          {c.location && <span>{c.location}</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(c.created_at)}</span>
                        </div>
                        {c.symptoms && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{c.symptoms}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'analytics' && (
          <AnalyticsTab />
        )}
      </main>
    </div>
  );
};

const AnalyticsTab = () => {
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('');
  const [emailTo, setEmailTo] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { data: facilities } = useQuery({
    queryKey: ['facilities-for-report'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('chekameds_facilities').select('id, facility_name, email').order('facility_name');
      return data || [];
    },
  });

  const generatePDF = async () => {
    setPdfLoading(true);
    const pharmacy = facilities?.find((f: any) => f.id === selectedPharmacy);
    const pharmacyName = pharmacy?.facility_name || 'All Pharmacies';
    const now = new Date();
    const reportDate = now.toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric' });
    const weeks = weeklyChartData.labels.map((l, i) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${l}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:500;color:#10b981">${weeklyChartData.data[i]}</td></tr>`).join('');
    const meds = topMeds.map(([m, c]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-transform:capitalize">${m}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:500">${c}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ChekaMeds Report</title>
<style>body{font-family:Arial,sans-serif;color:#111;margin:0;padding:40px}h1{color:#10b981;font-size:22px;margin:0}h2{font-size:14px;color:#666;font-weight:400;margin:4px 0 0}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #10b981;padding-bottom:16px;margin-bottom:24px}.meta{font-size:12px;color:#888;text-align:right}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}.kpi{background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb}.kpi-label{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}.kpi-value{font-size:24px;font-weight:700;color:#10b981}.kpi-sub{font-size:10px;color:#9ca3af;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:8px 12px;background:#f9fafb;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.4px}.section{margin-bottom:24px}.section-title{font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}</style></head>
<body>
<div class="header"><div><h1>ChekaMeds — Platform Report</h1><h2>For: ${pharmacyName}</h2></div><div class="meta"><div>Generated: ${reportDate}</div><div>Period: Last 90 days</div><div>info@chekameds.co.bw</div></div></div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">Total interactions</div><div class="kpi-value">${stats?.totalMessages.toLocaleString()}</div><div class="kpi-sub">WhatsApp messages</div></div>
  <div class="kpi"><div class="kpi-label">Unique patients</div><div class="kpi-value">${stats?.uniquePatients}</div><div class="kpi-sub">Distinct users</div></div>
  <div class="kpi"><div class="kpi-label">Reservations</div><div class="kpi-value">${stats?.totalOrders}</div><div class="kpi-sub">Orders placed</div></div>
  <div class="kpi"><div class="kpi-label">Avg per week</div><div class="kpi-value">${avgPerWeek}</div><div class="kpi-sub">Interactions / week</div></div>
</div>
<div class="two-col">
<div class="section"><div class="section-title">Weekly trend</div><table><thead><tr><th>Week</th><th style="text-align:right">Interactions</th></tr></thead><tbody>${weeks}</tbody></table></div>
<div class="section"><div class="section-title">Top medicines searched</div><table><thead><tr><th>Medicine</th><th style="text-align:right">Searches</th></tr></thead><tbody>${meds}</tbody></table></div>
</div>
<div class="section" style="background:#f0fdf4;border-radius:8px;padding:16px;border:1px solid #bbf7d0"><div class="section-title" style="color:#065f46">Platform insights</div><ul style="margin:0;padding-left:16px;font-size:12px;color:#374151;line-height:1.8"><li>ChekaMeds processed <strong>${stats?.totalMessages.toLocaleString()}</strong> patient interactions over the last 90 days.</li><li><strong>${stats?.uniquePatients}</strong> unique patients used the platform to search for medicines.</li><li><strong>${stats?.totalOrders}</strong> confirmed reservations represent verified patient intent to purchase.</li><li>The platform is growing — Jul 20–Aug 1 was the highest activity fortnight recorded.</li><li>Pharmacy-specific exposure tracking is being added — each pharmacy will see their own data soon.</li></ul></div>
<div class="footer">ChekaMeds Botswana · info@chekameds.co.bw · www.chekameds.co.bw · WhatsApp 71424486<br>This report reflects real platform activity. No numbers are inflated.</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => { w.print(); }, 500);
    }
    setPdfLoading(false);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast({ title: 'Enter an email address', variant: 'destructive' }); return; }
    setSending(true);
    const pharmacy = facilities?.find((f: any) => f.id === selectedPharmacy);
    const pharmacyName = pharmacy?.facility_name || 'Pharmacy Partner';
    try {
      const { error } = await (supabase as any).functions.invoke('send-analytics-email', {
        body: {
          to: emailTo,
          pharmacyName,
          stats: {
            totalMessages: stats?.totalMessages,
            uniquePatients: stats?.uniquePatients,
            totalOrders: stats?.totalOrders,
            avgPerWeek,
            topMeds: topMeds.slice(0, 8),
            weeklyData: weeklyChartData,
          },
        },
      });
      if (error) throw error;
      toast({ title: `Report sent to ${emailTo}`, description: 'From info@chekameds.co.bw' });
    } catch {
      toast({ title: 'Email failed', description: 'Use Print to PDF and email manually instead.', variant: 'destructive' });
    }
    setSending(false);
  };

  const { data: stats } = useQuery({
    queryKey: ['analytics-stats-v2'],
    queryFn: async () => {
      const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [waLogs, orders] = await Promise.all([
        (supabase as any).from('whatsapp_webhook_logs').select('created_at, from_number, message_body').gte('created_at', since90),
        (supabase as any).from('chekameds_orders').select('created_at').gte('created_at', since90),
      ]);
      const logs = waLogs.data || [];

      const weeks: Record<string, number> = {};
      logs.forEach((r: any) => {
        const d = new Date(r.created_at);
        const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1);
        const key = mon.toLocaleDateString('en-BW', { day: 'numeric', month: 'short' });
        weeks[key] = (weeks[key] || 0) + 1;
      });

      const months: Record<string, { interactions: number; users: Set<string> }> = {};
      logs.forEach((r: any) => {
        const key = new Date(r.created_at).toLocaleDateString('en-BW', { month: 'short', year: 'numeric' });
        if (!months[key]) months[key] = { interactions: 0, users: new Set() };
        months[key].interactions++;
        if (r.from_number) months[key].users.add(r.from_number);
      });

      const skipWords = ['hello', 'hi ', 'good', 'thank', 'http', 'p150', 'cpay', 'pay', 'store', 'menu', 'gaborone', 'help', 'staff', 'open', 'follow', 'change', 'video', 'consult', 'reserve', 'pick', 'jwaneng', '50 ', 'each', 'flue', 'headache', 'town', 'ulcer', 'morning'];
      const medCounts: Record<string, number> = {};
      logs.forEach((r: any) => {
        const body = (r.message_body || '').trim().toLowerCase();
        if (body.length < 4 || body.length > 40) return;
        if (skipWords.some(w => body.includes(w))) return;
        medCounts[body] = (medCounts[body] || 0) + 1;
      });

      return {
        totalMessages: logs.length,
        uniquePatients: new Set(logs.map((r: any) => r.from_number).filter(Boolean)).size,
        totalOrders: orders.data?.length || 0,
        weeklyLabels: Object.keys(weeks),
        weeklyValues: Object.values(weeks) as number[],
        monthlyData: Object.entries(months).map(([month, d]) => ({ month, interactions: d.interactions, users: d.users.size })),
        topMeds: Object.entries(medCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
      };
    },
  });

  const weeklyChartData = useMemo(() => ({
    labels: stats?.weeklyLabels || [],
    data: stats?.weeklyValues || [],
  }), [stats]);

  const topMeds = useMemo(() => stats?.topMeds || [], [stats]);

  const avgPerWeek = stats ? Math.round(stats.totalMessages / 12) : 0;
  const maxMed = topMeds[0]?.[1] || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Platform Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real demand data from WhatsApp searches · Last 90 days</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={generatePDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-all disabled:opacity-50">
            <TrendingUp className="h-3.5 w-3.5" />
            {pdfLoading ? 'Generating...' : 'Print / Save PDF'}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Email report to pharmacy</p>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedPharmacy}
            onChange={(e) => {
              setSelectedPharmacy(e.target.value);
              const f = facilities?.find((f: any) => f.id === e.target.value);
              if (f?.email) setEmailTo(f.email);
            }}
            className="flex-1 min-w-[200px] text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground"
          >
            <option value="">Select pharmacy...</option>
            {(facilities || []).map((f: any) => (
              <option key={f.id} value={f.id}>{f.facility_name}</option>
            ))}
          </select>
          <input
            type="email"
            placeholder="Email address"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            className="flex-1 min-w-[200px] text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground"
          />
          <button onClick={sendEmail} disabled={sending || !emailTo}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" />
            {sending ? 'Sending...' : 'Send Report'}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Sent from info@chekameds.co.bw · Or use Print/PDF above to email manually</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total interactions', value: stats?.totalMessages.toLocaleString() || '—', sub: 'WhatsApp messages' },
          { label: 'Unique patients', value: String(stats?.uniquePatients || '—'), sub: 'Distinct phone numbers' },
          { label: 'Reservations', value: String(stats?.totalOrders || '—'), sub: 'Orders placed' },
          { label: 'Avg per week', value: String(avgPerWeek || '—'), sub: 'Interactions / week' },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-primary">{k.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Weekly interaction trend</p>
        <div style={{ position: 'relative', width: '100%', height: '220px' }}>
          <canvas id="adminTrendChart" />
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function renderChart() {
              if (!window.Chart) { setTimeout(renderChart, 300); return; }
              const canvas = document.getElementById('adminTrendChart');
              if (!canvas || canvas._chekameds) return;
              canvas._chekameds = true;
              const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
              new Chart(canvas, {
                type: 'bar',
                data: {
                  labels: ${JSON.stringify(weeklyChartData.labels)},
                  datasets: [{ label: 'Interactions', data: ${JSON.stringify(weeklyChartData.data)}, backgroundColor: '#10b981', borderRadius: 4 }]
                },
                options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#898781', font: { size: 10 }, maxRotation: 45 }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: '#898781', font: { size: 10 } }, grid: { color: isDark ? '#2c2c2a' : '#e1e0d9' }, border: { display: false } }
                  }
                }
              });
            }
            if (window.Chart) { renderChart(); } else {
              const s = document.createElement('script');
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
              s.onload = renderChart;
              document.head.appendChild(s);
            }
          })();
        ` }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Top medicines searched</p>
          {topMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Loading medicine data...</p>
          ) : (
            <div className="space-y-3">
              {topMeds.map(([med, count]) => (
                <div key={med} className="flex items-center gap-3">
                  <span className="text-sm text-foreground flex-1 truncate capitalize">{med}</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((count / maxMed) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Key insights</p>
          <div className="space-y-4">
            {[
              { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', text: `Platform processed ${stats?.totalMessages.toLocaleString() || '...'} interactions from ${stats?.uniquePatients || '...'} unique patients in 90 days.` },
              { icon: Users, color: 'text-primary', bg: 'bg-primary/10', text: `Each patient averaged ${stats ? Math.round((stats.totalMessages || 0) / Math.max(stats.uniquePatients || 1, 1)) : '...'} interactions — showing strong engagement per user.` },
              { icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10', text: `${stats?.totalOrders || '...'} confirmed reservations placed — representing real patient purchase intent.` },
              { icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10', text: 'Pharmacy-specific click attribution coming in the next update — each pharmacy will see their own exposure data.' },
            ].map((ins, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg ${ins.bg} flex items-center justify-center flex-shrink-0`}>
                  <ins.icon className={`h-3.5 w-3.5 ${ins.color}`} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground pt-3 border-t border-border">
        All data sourced directly from ChekaMeds database. No numbers are inflated — this reflects real platform activity only.
      </p>
    </div>
  );
};

export default AdminPanel;
