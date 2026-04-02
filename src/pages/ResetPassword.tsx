import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/ChekaMeds_Logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasRecoveryToken, setHasRecoveryToken] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setHasRecoveryToken(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoveryToken(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please ensure both fields are identical.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters required.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      toast({ title: 'Reset failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 text-sm rounded-xl border border-border bg-background/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        className="w-full max-w-sm space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center gap-2">
          <img src={logo} alt="ChekaMeds" className="h-20 w-20 object-contain rounded-2xl bg-white p-1 shadow-md" />
          <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase">Powered by IBLIM ENTERPRISE</p>
        </div>

        {success ? (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Password updated</h2>
              <p className="text-sm text-muted-foreground mt-1">Your password has been reset successfully.</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              Sign in now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : !hasRecoveryToken ? (
          <div className="text-center space-y-4">
            <Lock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Invalid reset link</h2>
            <p className="text-sm text-muted-foreground">This link has expired or is invalid. Please request a new password reset.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-widest mb-2">Account recovery</p>
              <h2 className="text-2xl font-bold text-foreground">Set new password</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter a strong password for your account.</p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 tracking-wide">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    className={inputClass + ' pr-11'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 tracking-wide">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>Update password <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
