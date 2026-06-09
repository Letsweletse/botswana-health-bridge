import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/ChekaMeds_Logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [success, setSuccess] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const prepareRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hashType = hashParams.get('type');
        const accessToken = hashParams.get('access_token');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (mounted) setHasRecoverySession(true);
          window.history.replaceState({}, document.title, '/reset-password');
          return;
        }

        if (hashType === 'recovery' && accessToken) {
          if (mounted) setHasRecoverySession(true);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (mounted) setHasRecoverySession(Boolean(data.session));
      } catch (err: any) {
        console.error('Password recovery session failed:', err);
        toast({ title: 'Reset link problem', description: err.message || 'Please request a new password reset link.', variant: 'destructive' });
        if (mounted) setHasRecoverySession(false);
      } finally {
        if (mounted) setCheckingLink(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && mounted) {
        setHasRecoverySession(true);
        setCheckingLink(false);
      }
    });

    prepareRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err: any) {
      toast({ title: 'Reset failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-emerald-300/70 focus:bg-white/[0.09]';

  return (
    <div className="min-h-screen bg-[#050807] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(23,255,154,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(255,79,216,0.10),transparent_30%)]" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] max-w-5xl items-center justify-center">
        <motion.div
          className="w-full max-w-md border border-white/10 bg-[#07110d]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-7 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="ChekaMeds" className="h-10 w-10 bg-white p-1" />
              <div>
                <p className="text-sm font-black leading-none">ChekaMeds</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/45">Account Recovery</p>
              </div>
            </Link>
            <Link to="/login" className="text-xs font-bold text-white/50 hover:text-white">Login</Link>
          </div>

          {checkingLink ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
              <p className="mt-4 text-sm text-white/55">Checking reset link...</p>
            </div>
          ) : success ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Password updated</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">Your password has been reset. Sign in with your new password.</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="flex w-full items-center justify-center gap-2 bg-emerald-400 px-4 py-3 text-sm font-black text-[#06110d] transition hover:bg-emerald-300"
              >
                Sign in now <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : !hasRecoverySession ? (
            <div className="space-y-5 text-center">
              <Lock className="mx-auto h-10 w-10 text-white/35" />
              <div>
                <h2 className="text-2xl font-black">Invalid or expired reset link</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">Request a new password reset from the login page.</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-emerald-400 px-4 py-3 text-sm font-black text-[#06110d] transition hover:bg-emerald-300"
              >
                Back to login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Account recovery</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Set new password</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">Enter a new password for your ChekaMeds account.</p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">New password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      minLength={6}
                      className={`${inputClass} pr-11`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Confirm password</span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={inputClass}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 bg-emerald-400 px-4 py-3 text-sm font-black text-[#06110d] shadow-[0_0_28px_rgba(23,255,154,0.20)] transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Update password <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
