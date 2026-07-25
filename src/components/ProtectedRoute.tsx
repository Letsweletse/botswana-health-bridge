import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/ChekaMeds_Logo.png';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isApproved = Boolean(profile?.approved);

  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-5">
          <img
            src={logo}
            alt="ChekaMeds"
            className="h-16 w-16 mx-auto rounded-2xl bg-white p-1 shadow-md object-contain"
          />
          <div className="h-14 w-14 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Access Pending
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {profile?.clinic_name ? (
                <>
                  Your facility <strong>{profile.clinic_name}</strong> is
                  registered and awaiting admin approval. You'll receive access
                  once verified.
                </>
              ) : (
                <>
                  You're signed in as <strong>{user.email}</strong> but no
                  approved facility is linked to this account yet. Please
                  contact ChekaMeds admin to get approved.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full py-2.5 text-sm font-medium rounded-xl border border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-center"
            >
              Register or switch account
            </Link>
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
