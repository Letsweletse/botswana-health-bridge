import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/ChekaMeds_Logo.png';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Check if user's profile is approved
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-approval', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('approved, clinic_name')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-5">
          <img src={logo} alt="ChekaMeds" className="h-16 w-16 mx-auto rounded-2xl bg-white p-1 shadow-md object-contain" />
          <div className="h-14 w-14 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pending Approval</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Your facility <strong>{profile.clinic_name}</strong> is registered and awaiting admin approval. You'll receive access once verified.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/search"
              className="w-full py-2.5 text-sm font-medium rounded-xl border border-border text-foreground hover:bg-muted transition-all text-center"
            >
              Search medicines while you wait
            </Link>
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
