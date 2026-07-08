import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Building2, Clock, ArrowLeft, Loader2, Users, ShieldCheck, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import logo from '@/assets/ChekaMeds_Logo.png';

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  // Check admin role
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

  // Fetch all profiles (admin RLS policy allows this)
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles', filter],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (filter === 'pending') query = query.eq('approved', false);
      else if (filter === 'approved') query = query.eq('approved', true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approved }: { userId: string; approved: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ approved })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({
        title: approved ? 'Facility approved' : 'Facility access revoked',
        description: approved ? 'They can now access the dashboard.' : 'Their dashboard access has been removed.',
      });
    },
    onError: (err: any) => {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    },
  });

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  const pendingCount = profiles.filter(p => !p.approved).length;
  const approvedCount = profiles.filter(p => p.approved).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="ChekaMeds" className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm object-contain" />
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">ChekaMeds Admin</h1>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Facility Management</p>
              </div>
            </Link>
          </div>
          <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Link
          to="/admin/campaigns"
          className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-5 hover:bg-primary/15 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Email Campaign Helper</p>
              <p className="text-xs text-muted-foreground mt-1">Paste pharmacy emails, clean duplicates, export Brevo CSV, and copy the ChekaMeds campaign HTML.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary">Open →</span>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Facilities', value: profiles.length, icon: Building2, color: 'text-foreground' },
            { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'text-warning' },
            { label: 'Approved', value: approvedCount, icon: ShieldCheck, color: 'text-success' },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {(['pending', 'approved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all capitalize ${
                filter === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f} {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1 bg-warning/20 text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Profiles list */}
        {profilesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No facilities found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'pending' ? 'No pending registrations.' : 'No facilities match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    profile.approved ? 'bg-success/10' : 'bg-warning/10'
                  }`}>
                    <Building2 className={`h-5 w-5 ${profile.approved ? 'text-success' : 'text-warning'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{profile.clinic_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{profile.full_name || 'No name'}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Joined {new Date(profile.created_at).toLocaleDateString('en-BW', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {profile.approved ? (
                    <>
                      <span className="text-[10px] font-medium text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                        Approved
                      </span>
                      <button
                        onClick={() => approveMutation.mutate({ userId: profile.user_id, approved: false })}
                        disabled={approveMutation.isPending}
                        className="p-2 rounded-lg text-muted-foreground hover:text-critical hover:bg-critical/10 transition-colors"
                        title="Revoke access"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                        Pending
                      </span>
                      <button
                        onClick={() => approveMutation.mutate({ userId: profile.user_id, approved: true })}
                        disabled={approveMutation.isPending}
                        className="p-2 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                        title="Approve facility"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => approveMutation.mutate({ userId: profile.user_id, approved: false })}
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
      </main>
    </div>
  );
};

export default AdminPanel;
