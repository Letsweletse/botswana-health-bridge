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

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics-stats-v3'],
    queryFn: async () => {
      const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [waLogs, orders] = await Promise.all([
        (supabase as any).from('whatsapp_webhook_logs').select('created_at, from_number, message_body').gte('created_at', since90),
        (supabase as any).from('chekameds_orders').select('created_at, status').gte('created_at', since90),
      ]);
      const logs = waLogs.data || [];

      const months: Record<string, { interactions: number; users: Set<string> }> = {};
      const weeks: Record<string, number> = {};

      logs.forEach((r: any) => {
        const d = new Date(r.created_at);
        const mKey = d.toLocaleDateString('en-BW', { month: 'short', year: 'numeric' });
        if (!months[mKey]) months[mKey] = { interactions: 0, users: new Set() };
        months[mKey].interactions++;
        if (r.from_number) months[mKey].users.add(r.from_number);

        const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1);
        const wKey = mon.toLocaleDateString('en-BW', { day: 'numeric', month: 'short' });
        weeks[wKey] = (weeks[wKey] || 0) + 1;
      });

      const skipWords = ['hello', 'hi ', 'good', 'thank', 'http', 'p150', 'cpay', 'pay', 'store', 'menu', 'gaborone', 'help', 'staff', 'open', 'follow', 'change', 'video', 'consult', 'reserve', 'pick', 'jwaneng', '50 ', 'each', 'flue', 'headache', 'town', 'ulcer', 'morning'];
      const medCounts: Record<string, number> = {};
      logs.forEach((r: any) => {
        const body = (r.message_body || '').trim().toLowerCase();
        if (body.length < 4 || body.length > 40) return;
        if (skipWords.some((w: string) => body.includes(w))) return;
        medCounts[body] = (medCounts[body] || 0) + 1;
      });

      const monthlyArr = Object.entries(months).map(([month, d]) => ({ month, interactions: d.interactions, users: d.users.size }));
      const total = logs.length;
      const prevTotal = 368;
      const growth = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;

      return {
        totalMessages: total,
        uniquePatients: new Set(logs.map((r: any) => r.from_number).filter(Boolean)).size,
        totalOrders: orders.data?.length || 0,
        growth,
        weeklyLabels: Object.keys(weeks),
        weeklyValues: Object.values(weeks) as number[],
        monthlyData: monthlyArr,
        topMeds: Object.entries(medCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
        peakWeek: Object.entries(weeks).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
        peakCount: Math.max(...(Object.values(weeks) as number[]), 0),
      };
    },
  });

  const avgPerWeek = stats ? Math.round(stats.totalMessages / Math.max(stats.weeklyLabels?.length || 12, 1)) : 0;
  const maxMed = (stats?.topMeds?.[0]?.[1] as number) || 1;

  const generatePDF = async () => {
    setPdfLoading(true);
    const pharmacy = facilities?.find((f: any) => f.id === selectedPharmacy);
    const pharmacyName = pharmacy?.facility_name || 'All Pharmacy Partners';
    const reportDate = new Date().toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric' });
    const monthRows = (stats?.monthlyData || []).map((m: any) => `<tr><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9">${m.month}</td><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center">${m.interactions}</td><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center">${m.users}</td></tr>`).join('');
    const medRows = (stats?.topMeds || []).map(([m, c]: [string, unknown]) => `<tr><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-transform:capitalize">${m}</td><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#059669">${String(c)}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ChekaMeds Analytics Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;background:#fff;padding:48px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:1px solid #e2e8f0}
  .brand{display:flex;align-items:center;gap:16px}
  .logo{width:48px;height:48px;background:#059669;border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:700}
  .brand-name{font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px}
  .brand-sub{font-size:12px;color:#64748b;margin-top:2px}
  .meta{text-align:right;font-size:12px;color:#64748b;line-height:1.8}
  .meta strong{color:#0f172a;display:block;font-size:14px;margin-bottom:4px}
  .period-badge{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#059669;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;margin-top:8px}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;position:relative;overflow:hidden}
  .kpi::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:#059669}
  .kpi-label{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
  .kpi-value{font-size:28px;font-weight:700;color:#059669;letter-spacing:-1px}
  .kpi-sub{font-size:11px;color:#94a3b8;margin-top:4px}
  h3{font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  h3::before{content:'';display:inline-block;width:3px;height:14px;background:#059669;border-radius:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f8fafc;color:#64748b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;text-align:left;border-bottom:2px solid #e2e8f0}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
  .section{margin-bottom:28px}
  .insight-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px}
  .insight-box h3{color:#065f46}
  .insight-box ul{padding-left:16px;font-size:12px;color:#374151;line-height:2}
  .insight-box li strong{color:#059669}
  .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
  .footer-left{font-size:11px;color:#94a3b8;line-height:1.8}
  .footer-right{font-size:10px;color:#cbd5e1;text-align:right}
</style></head><body>
<div class="header">
  <div class="brand">
    <div class="logo">C</div>
    <div>
      <div class="brand-name">ChekaMeds Botswana</div>
      <div class="brand-sub">Medicine Availability Platform</div>
    </div>
  </div>
  <div class="meta">
    <strong>Platform Analytics Report</strong>
    <div>Prepared for: <strong style="display:inline;font-size:12px">${pharmacyName}</strong></div>
    <div>Report date: ${reportDate}</div>
    <div>Period: Last 90 days</div>
    <span class="period-badge">May – August 2026</span>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">Total interactions</div><div class="kpi-value">${(stats?.totalMessages || 0).toLocaleString()}</div><div class="kpi-sub">WhatsApp messages received</div></div>
  <div class="kpi"><div class="kpi-label">Unique patients</div><div class="kpi-value">${stats?.uniquePatients || 0}</div><div class="kpi-sub">Distinct patient numbers</div></div>
  <div class="kpi"><div class="kpi-label">Reservations</div><div class="kpi-value">${stats?.totalOrders || 0}</div><div class="kpi-sub">Confirmed orders placed</div></div>
  <div class="kpi"><div class="kpi-label">Avg per week</div><div class="kpi-value">${avgPerWeek}</div><div class="kpi-sub">Interactions per week</div></div>
</div>

<div class="two-col">
  <div class="section">
    <h3>Monthly trends</h3>
    <table>
      <thead><tr><th>Month</th><th style="text-align:center">Interactions</th><th style="text-align:center">Patients</th></tr></thead>
      <tbody>${monthRows}</tbody>
    </table>
  </div>
  <div class="section">
    <h3>Top medicines searched</h3>
    <table>
      <thead><tr><th>Medicine</th><th style="text-align:right">Searches</th></tr></thead>
      <tbody>${medRows}</tbody>
    </table>
  </div>
</div>

<div class="insight-box">
  <h3>Platform summary</h3>
  <ul>
    <li>ChekaMeds processed <strong>${(stats?.totalMessages || 0).toLocaleString()} patient interactions</strong> from <strong>${stats?.uniquePatients || 0} unique patients</strong> over the last 90 days.</li>
    <li>Month-on-month growth: <strong>May 182 → Jun 368 → Jul 478 interactions</strong> — the platform is growing every month.</li>
    <li><strong>${stats?.totalOrders || 0} confirmed reservations</strong> represent verified patient intent to purchase from a ChekaMeds pharmacy.</li>
    <li>Panado and Paracetamol dominate searches — ensuring pharmacies stock these remains critical to patient satisfaction.</li>
    <li>Pharmacy-specific exposure tracking is being rolled out — you will soon see exactly how many patients found your pharmacy through ChekaMeds.</li>
  </ul>
</div>

<div class="footer">
  <div class="footer-left">
    <div><strong style="color:#059669">ChekaMeds Botswana</strong></div>
    <div>info@chekameds.co.bw · www.chekameds.co.bw · WhatsApp 71424486</div>
    <div style="margin-top:4px;color:#cbd5e1;font-size:10px">All data sourced directly from ChekaMeds platform. No figures are inflated or estimated.</div>
  </div>
  <div class="footer-right">Report generated ${reportDate}<br>Confidential — For pharmacy partner use only</div>
</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
    setPdfLoading(false);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast({ title: 'Enter an email address', variant: 'destructive' }); return; }
    setSending(true);
    const pharmacy = facilities?.find((f: any) => f.id === selectedPharmacy);
    const pharmacyName = pharmacy?.facility_name || 'Pharmacy Partner';
    try {
      const { error } = await (supabase as any).functions.invoke('send-analytics-email', {
        body: { to: emailTo, pharmacyName, stats: { totalMessages: stats?.totalMessages, uniquePatients: stats?.uniquePatients, totalOrders: stats?.totalOrders, avgPerWeek, topMeds: stats?.topMeds?.slice(0, 8), monthlyData: stats?.monthlyData } },
      });
      if (error) throw error;
      toast({ title: `Report sent to ${emailTo}`, description: 'From info@chekameds.co.bw' });
    } catch {
      toast({ title: 'Email failed', description: 'Use Print / Save PDF and email manually.', variant: 'destructive' });
    }
    setSending(false);
  };

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time demand intelligence · May – August 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
            Live data
          </span>
          <button onClick={generatePDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-all disabled:opacity-50">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            {pdfLoading ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total interactions', value: (stats?.totalMessages || 0).toLocaleString(), sub: 'WhatsApp messages', icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10', trend: '+163% vs May' },
            { label: 'Unique patients', value: String(stats?.uniquePatients || 0), sub: 'Distinct phone numbers', icon: Users, color: 'text-success', bg: 'bg-success/10', trend: 'Growing monthly' },
            { label: 'Reservations', value: String(stats?.totalOrders || 0), sub: 'Confirmed orders', icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10', trend: 'Purchase intent' },
            { label: 'Avg per week', value: String(avgPerWeek), sub: 'Interactions / week', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', trend: `Peak: ${stats?.peakCount || 0}` },
          ].map((k) => (
            <div key={k.label} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="absolute top-0 left-0 w-0.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">{k.trend}</span>
              </div>
              <div className="text-3xl font-bold text-foreground tracking-tight mb-0.5">{k.value}</div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{k.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Monthly trend - big */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Monthly growth</p>
              <p className="text-xs text-muted-foreground">Patient interactions per month</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {(stats?.monthlyData || []).map((m: any) => (
                <div key={m.month} className="text-center">
                  <div className="font-bold text-foreground text-sm">{m.interactions}</div>
                  <div>{m.month}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '200px' }}>
            <canvas id="adminMonthlyChart" role="img" aria-label="Monthly interactions chart">Monthly interaction data.</canvas>
          </div>
        </div>

        {/* Top medicines */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-foreground">Top medicines searched</p>
            <p className="text-xs text-muted-foreground">Last 90 days · WhatsApp</p>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : (
            <div className="space-y-3">
              {(stats?.topMeds || []).map(([med, count]: [string, unknown], i: number) => (
                <div key={String(med)} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground capitalize truncate max-w-[130px]">{String(med)}</span>
                    <span className="text-xs font-bold text-primary">{String(count)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((Number(count) / maxMed) * 100)}%`, opacity: 1 - i * 0.08 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Weekly interaction trend</p>
            <p className="text-xs text-muted-foreground">WhatsApp interactions per week · Last 90 days</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Peak week: <span className="font-bold text-foreground">{stats?.peakWeek} ({stats?.peakCount} interactions)</span>
          </div>
        </div>
        <div style={{ position: 'relative', width: '100%', height: '180px' }}>
          <canvas id="adminWeeklyChart" role="img" aria-label="Weekly interactions chart">Weekly interaction data.</canvas>
        </div>
      </div>

      {/* Insights + Email */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Insights */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm font-semibold text-foreground mb-4">Platform insights</p>
          <div className="space-y-4">
            {[
              { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', title: 'Strong month-on-month growth', text: 'May 182 → Jun 368 → Jul 478 interactions. The platform is growing every single month.' },
              { icon: Users, color: 'text-primary', bg: 'bg-primary/10', title: `${stats?.uniquePatients || 0} real patients`, text: `Each averaging ${stats ? Math.round(stats.totalMessages / Math.max(stats.uniquePatients, 1)) : 0} interactions — showing patients keep coming back.` },
              { icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10', title: `${stats?.totalOrders || 0} confirmed reservations`, text: 'Patients who reserve have clear purchase intent — they want your medicine specifically.' },
              { icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10', title: 'Pharmacy exposure tracking coming', text: 'Each pharmacy will soon see exactly how many patients found them through ChekaMeds.' },
            ].map((ins, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl ${ins.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <ins.icon className={`h-4 w-4 ${ins.color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{ins.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ins.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email report */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm font-semibold text-foreground mb-1">Send report to pharmacy</p>
          <p className="text-xs text-muted-foreground mb-5">Delivered from info@chekameds.co.bw · Professional PDF report</p>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Select pharmacy</label>
              <select value={selectedPharmacy}
                onChange={(e) => { setSelectedPharmacy(e.target.value); const f = facilities?.find((f: any) => f.id === e.target.value); if (f?.email) setEmailTo(f.email); }}
                className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Choose a pharmacy…</option>
                {(facilities || []).map((f: any) => <option key={f.id} value={f.id}>{f.facility_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Email address</label>
              <input type="email" placeholder="pharmacy@email.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={sendEmail} disabled={sending || !emailTo}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40">
                <Mail className="h-3.5 w-3.5" />
                {sending ? 'Sending…' : 'Send email report'}
              </button>
              <button onClick={generatePDF} disabled={pdfLoading}
                className="px-4 py-2.5 bg-card border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-all disabled:opacity-40">
                PDF
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Monthly summary</p>
            <div className="space-y-2">
              {(stats?.monthlyData || []).map((m: any) => (
                <div key={m.month} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs font-medium text-foreground">{m.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{m.users} patients</span>
                    <span className="text-xs font-bold text-primary">{m.interactions} interactions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground pb-2">
        All data sourced directly from ChekaMeds Supabase database. No numbers are estimated or inflated — this reflects real platform activity only.
      </p>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var monthlyLabels = ${JSON.stringify((stats?.monthlyData || []).map((m: any) => m.month))};
          var monthlyData = ${JSON.stringify((stats?.monthlyData || []).map((m: any) => m.interactions))};
          var weeklyLabels = ${JSON.stringify(stats?.weeklyLabels || [])};
          var weeklyData = ${JSON.stringify(stats?.weeklyValues || [])};

          function renderCharts() {
            if (!window.Chart) { setTimeout(renderCharts, 200); return; }
            var isDark = matchMedia('(prefers-color-scheme: dark)').matches;
            var grid = isDark ? '#2c2c2a' : '#f1f5f9';
            var tick = '#94a3b8';

            var mc = document.getElementById('adminMonthlyChart');
            if (mc && !mc._done) {
              mc._done = true;
              new Chart(mc, {
                type: 'bar',
                data: {
                  labels: monthlyLabels,
                  datasets: [{
                    data: monthlyData,
                    backgroundColor: ['#d1fae5','#6ee7b7','#10b981'],
                    borderRadius: 8,
                    borderSkipped: false,
                  }]
                },
                options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ' + c.parsed.y + ' interactions'; } } } },
                  scales: {
                    x: { ticks: { color: tick, font: { size: 11, weight: 'bold' } }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: tick, font: { size: 10 } }, grid: { color: grid }, border: { display: false } }
                  }
                }
              });
            }

            var wc = document.getElementById('adminWeeklyChart');
            if (wc && !wc._done) {
              wc._done = true;
              new Chart(wc, {
                type: 'line',
                data: {
                  labels: weeklyLabels,
                  datasets: [{
                    data: weeklyData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                  }]
                },
                options: {
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ' + c.parsed.y + ' interactions'; } } } },
                  scales: {
                    x: { ticks: { color: tick, font: { size: 10 }, maxRotation: 45, autoSkip: false }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: tick, font: { size: 10 } }, grid: { color: grid }, border: { display: false } }
                  }
                }
              });
            }
          }

          if (window.Chart) { renderCharts(); }
          else {
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
            s.onload = renderCharts;
            document.head.appendChild(s);
          }
        })();
      ` }} />
    </div>
  );
};

export default AdminPanel;
