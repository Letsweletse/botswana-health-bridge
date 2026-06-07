import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Shield, Activity, Pill, ArrowRight, CheckCircle2, Search, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/ChekaMeds_Logo.png';
import heroBg from '@/assets/hero-bg.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: 'Enter your email', description: 'Please enter your email address first, then click Forgot password.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      toast({ title: 'Reset link sent', description: 'Check your email for a password reset link.' });
    } catch (err: any) {
      toast({ title: 'Request failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim()) {
      toast({ title: 'Facility required', description: 'Please enter your pharmacy, clinic, or hospital name.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/login',
          data: {
            full_name: fullName.trim(),
            clinic_name: clinicName.trim(),
          },
        },
      });
      if (error) throw error;
      const { error: notifyError } = await supabase.functions.invoke('notify-facility-registration', {
        body: { clinicName: clinicName.trim(), fullName: fullName.trim(), email: email.trim() },
      });
      if (notifyError) {
        console.error('Registration notification email failed:', notifyError);
        throw new Error(`Account created, but the admin notification email failed: ${notifyError.message}`);
      }
      setConfirmed(true);
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-emerald-300/70 focus:bg-white/[0.09]";

  return (
    <div className="min-h-screen bg-[#050807] text-white">
      <div className="fixed inset-0 opacity-70">
        <img src={heroBg} alt="ChekaMeds background" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#050807]/88" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(23,255,154,0.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(255,79,216,0.08),transparent_26%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center justify-between border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-10 w-10 bg-white p-1" />
            <div>
              <p className="text-sm font-black leading-none">ChekaMeds</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/45">Staff Portal</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link to="/search" className="hidden border border-emerald-300/25 px-3 py-2 text-emerald-100 transition hover:bg-emerald-300/10 sm:inline-flex">Search</Link>
            <Link to="/" className="border border-white/10 px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white">Home</Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden lg:block">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">ChekaMeds secure access</p>
              <h1 className="mt-5 text-6xl font-black leading-[0.98] tracking-tight">
                One platform.<br />One clean flow.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-white/62">
                Sign in to manage medicine stock, consultation requests, WhatsApp support, and partner facility workflows.
              </p>
              <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
                {[
                  { icon: Search, text: 'Medicine search' },
                  { icon: Video, text: 'Video consults' },
                  { icon: Shield, text: 'Approved access' },
                ].map((item) => (
                  <div key={item.text} className="border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                    <item.icon className="h-5 w-5 text-emerald-300" />
                    <p className="mt-3 text-xs font-bold text-white/75">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          <section className="mx-auto w-full max-w-md border border-white/10 bg-[#07110d]/85 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
            <AnimatePresence mode="wait">
              {confirmed ? (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-center"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Account submitted</h2>
                    <p className="mt-2 text-sm leading-6 text-white/58">
                      Your facility account was created. Sign in after approval to access the dashboard.
                    </p>
                  </div>
                  <button
                    onClick={() => { setConfirmed(false); setIsSignUp(false); }}
                    className="w-full bg-emerald-500 px-4 py-3 text-sm font-black text-[#06110d] transition hover:bg-emerald-300"
                  >
                    Go to sign in
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={isSignUp ? 'register' : 'login'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
                      {isSignUp ? 'Facility onboarding' : 'Login'}
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">
                      {isSignUp ? 'Register facility' : 'Welcome back'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      {isSignUp
                        ? 'Create a facility profile for approval. Approved users access the dashboard after sign in.'
                        : 'Sign in directly to the approved facility dashboard.'}
                    </p>
                  </div>

                  <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
                    <AnimatePresence>
                      {isSignUp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <label className="block space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Full name</span>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className={inputClass} />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Pharmacy / Clinic / Facility</span>
                            <input type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Official facility name" className={inputClass} />
                          </label>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Email address</span>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@facility.co.bw" className={inputClass} />
                    </label>

                    <label className="block space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Password</span>
                        {!isSignUp && <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-emerald-300 hover:text-emerald-100">Forgot?</button>}
                      </div>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} className={`${inputClass} pr-11`} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex w-full items-center justify-center gap-2 bg-emerald-400 px-4 py-3 text-sm font-black text-[#06110d] shadow-[0_0_28px_rgba(23,255,154,0.20)] transition hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-[#06110d]/25 border-t-[#06110d] animate-spin" />
                          {isSignUp ? 'Submitting...' : 'Signing in...'}
                        </>
                      ) : (
                        <>
                          {isSignUp ? 'Submit facility registration' : 'Sign in to dashboard'}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="space-y-4">
                    <button
                      onClick={() => { setIsSignUp(!isSignUp); setIsLoading(false); setConfirmed(false); }}
                      className="w-full border border-white/10 px-4 py-3 text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white"
                    >
                      {isSignUp ? 'Already registered? Sign in' : 'New pharmacy or clinic? Register here'}
                    </button>
                    <div className="grid gap-2 text-center text-xs font-semibold text-white/45">
                      <Link to="/search" className="hover:text-emerald-200">Public medicine search — no login needed</Link>
                      <Link to="/consultant" className="hover:text-emerald-200">Request virtual care</Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Login;
