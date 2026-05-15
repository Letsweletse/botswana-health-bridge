import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Search, ArrowRight, CheckCircle2, Activity, Pill, Shield, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/ChekaMeds_Logo.png';
import heroBg from '@/assets/hero-bg.png';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const signupLockRef = useRef(false);
  const navigate = useNavigate();

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
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupLockRef.current || isLoading) return;

    if (!clinicName.trim()) {
      toast({ title: 'Clinic required', description: 'Please enter your clinic or hospital name.', variant: 'destructive' });
      return;
    }

    signupLockRef.current = true;
    setIsLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanClinicName = clinicName.trim();
      const cleanFullName = fullName.trim();

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: cleanFullName, clinic_name: cleanClinicName },
        },
      });

      if (error) throw error;

      setConfirmed(true);
      toast({ title: 'Registration received', description: 'Your account is pending admin approval.' });
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        signupLockRef.current = false;
      }, 2500);
    }
  };

  const inputClass = "w-full px-4 py-3 text-sm bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors";

  return (
    <div className="min-h-screen font-[Gordita,system-ui,sans-serif] antialiased bg-[#020e08]">
      {/* ─── Top nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020e08]/60 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="ChekaMeds" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/search"
              className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              <Search className="h-3.5 w-3.5" /> Find Medicine
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero image — full width, uncropped ─── */}
      <div className="pt-14">
        <div className="relative w-full">
          <img
            src={heroBg}
            alt="ChekaMeds — Find Medicines Faster"
            className="w-full h-auto block"
          />
          {/* Subtle bottom fade into the dark bg */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020e08] to-transparent" />
        </div>
      </div>

      {/* ─── Content below the image ─── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          {/* LEFT — Brand info */}
          <div className="space-y-8">
            <div>
              <p className="text-emerald-400/80 text-xs font-semibold tracking-[0.3em] uppercase mb-4">
                Ipelegeng — Serving Batswana
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                Medicine reaches{' '}
                <span className="text-emerald-400">every Motswana</span>
              </h1>
              <p className="text-white/45 text-base mt-5 leading-relaxed max-w-lg font-light">
                Real-time stock visibility across Botswana's health network — connecting clinics, pharmacies, and patients instantly.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Activity, text: 'Live medicine stock monitoring across all facilities' },
                { icon: Pill, text: 'Shelf-level tracking & automated depletion alerts' },
                { icon: Shield, text: 'Clinic-scoped secure access for health personnel' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                    <item.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-white/50 font-light">{item.text}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp */}
            <div className="bg-white/[0.03] border border-white/[0.08] p-5 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] text-white/35 uppercase tracking-[0.2em] font-semibold">Public WhatsApp Line</span>
              </div>
              <p className="text-emerald-400 text-xl font-bold tracking-wide">+267 714 24 486</p>
              <p className="text-white/30 text-xs mt-1">Text to find medicine — no app needed</p>
            </div>
          </div>

          {/* RIGHT — Login card */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <div className="bg-[#0a1f18]/70 backdrop-blur-xl border border-white/[0.08] p-8 sm:p-10 shadow-2xl shadow-black/40">
              {confirmed ? (
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Registration received</h2>
                    <p className="text-sm text-white/50 mt-2 leading-relaxed">
                      Your account has been created successfully and is pending admin approval. Once reviewed, your facility profile will be activated.
                    </p>
                  </div>
                  <button
                    onClick={() => { setConfirmed(false); setIsSignUp(false); }}
                    className="w-full py-3 text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    Return to sign in <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-7">
                    <p className="text-emerald-400 text-xs font-semibold uppercase tracking-[0.2em] mb-2">
                      {isSignUp ? 'Register Facility' : 'Staff Portal'}
                    </p>
                    <h2 className="text-2xl font-bold text-white">
                      {isSignUp ? 'Join ChekaMeds' : 'Welcome back'}
                    </h2>
                    <p className="text-sm text-white/40 mt-1 font-light">
                      {isSignUp ? 'Register your clinic or pharmacy for admin approval before appearing in search' : 'Sign in to access your facility dashboard'}
                    </p>
                  </div>

                  <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
                    {isSignUp && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-white/60 tracking-wide">Full name</label>
                          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Kgosi Moyo" className={inputClass} disabled={isLoading} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-white/60 tracking-wide">Clinic / Pharmacy name</label>
                          <input type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="e.g. South West Pharma" className={inputClass} disabled={isLoading} />
                          <p className="text-[11px] text-white/20 px-1">Use your facility's official name. New facilities are reviewed before appearing in search.</p>
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/60 tracking-wide">Email address</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@health.gov.bw" className={inputClass} disabled={isLoading} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white/60 tracking-wide">Password</label>
                        {!isSignUp && (
                          <button type="button" onClick={handleForgotPassword} disabled={isLoading} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors disabled:opacity-50">
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} className={inputClass + ' pr-11'} disabled={isLoading} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={isLoading} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors disabled:opacity-50">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-500/20"
                    >
                      {isLoading ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {isSignUp ? 'Submitting registration...' : 'Signing in...'}
                        </>
                      ) : (
                        <>
                          {isSignUp ? 'Submit registration' : 'Sign in to dashboard'}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/[0.08]" />
                      <span className="text-xs text-white/20">or</span>
                      <div className="flex-1 h-px bg-white/[0.08]" />
                    </div>
                    <button
                      onClick={() => { setIsSignUp(!isSignUp); setIsLoading(false); setConfirmed(false); }}
                      disabled={isLoading}
                      className="w-full py-2.5 text-sm font-medium border border-white/[0.1] text-white/50 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-50"
                    >
                      {isSignUp ? 'Already registered? Sign in' : 'New facility? Register here'}
                    </button>
                    <p className="text-center text-[11px] text-white/20">
                      Access restricted to authorised Botswana health personnel only.
                    </p>
                    <Link
                      to="/search"
                      className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors mt-1"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Looking for medicine? Search here — no login needed
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-6 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/15">© {new Date().getFullYear()} ChekaMeds · Powered by IBLIM ENTERPRISE (Pty) Ltd</p>
          <div className="flex items-center gap-6">
            <Link to="/search" className="text-[11px] text-white/20 hover:text-white/50 transition-colors">Find Medicine</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
