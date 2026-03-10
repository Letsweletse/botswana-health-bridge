import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Shield, Activity, Pill, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/ChekaMeds_Logo.png';
import heroBg from '@/assets/hero-gaborone.jpg';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim()) {
      toast({ title: 'Clinic required', description: 'Please enter your clinic or hospital name.', variant: 'destructive' });
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
      setConfirmed(true);
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 text-sm rounded-xl border border-border bg-background/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all backdrop-blur-sm";

  return (
    <div className="min-h-screen flex">
      {/* LEFT — hero panel */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        <img src={heroBg} alt="Gaborone" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(180,12%,9%)]/85 via-[hsl(180,12%,9%)]/60 to-[hsl(145,45%,20%)]/70" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary to-transparent opacity-60" />

         <div className="relative z-10 flex flex-col justify-between p-14 w-full">
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="space-y-2">
             <img src={logo} alt="ChekaMeds" className="h-36 w-auto object-contain" />
             <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase font-medium">Powered by IBLIM ENTERPRISE</p>
           </motion.div>

          <div className="space-y-10">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
              <p className="text-primary-foreground/70 text-sm font-medium tracking-widest uppercase mb-3">
                Ipelegeng · Serving Batswana
              </p>
              <h1 className="text-5xl font-display font-bold text-white leading-[1.1]">
                Medicine reaches<br />
                <span className="text-primary">every Motswana.</span>
              </h1>
              <p className="text-white/60 text-base mt-4 leading-relaxed max-w-md">
                A real-time stock visibility platform built for Botswana's public health network — 
                from Princess Marina to every clinic in the district.
              </p>
            </motion.div>

            <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}>
              {[
                { icon: Activity, text: 'Live IoT sensor monitoring across all facilities' },
                { icon: Pill, text: 'Shelf-level medicine tracking & depletion alerts' },
                { icon: Shield, text: 'Clinic-scoped secure access for health personnel' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/15 border border-primary/25">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-white/65">{item.text}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 backdrop-blur-sm"
            >
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Public WhatsApp Line</p>
              <p className="text-primary text-xl font-display font-bold">+267 714 24 486</p>
              <p className="text-white/50 text-xs mt-0.5">Patients text this number to find medicine across Gaborone</p>
            </motion.div>
          </div>

           <p className="text-xs text-white/25 tracking-wide">
             © 2026 ChekaMeds · Powered by IBLIM ENTERPRISE
           </p>
         </div>
      </div>

      {/* RIGHT — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <AnimatePresence mode="wait">
          {confirmed ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Account created!</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Your clinic account is ready. You can now sign in with your credentials.
                </p>
              </div>
              <button
                onClick={() => { setConfirmed(false); setIsSignUp(false); }}
                className="w-full py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                Sign in now <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              className="w-full max-w-sm space-y-7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
               <div className="lg:hidden flex flex-col items-center gap-1">
                 <img src={logo} alt="ChekaMeds" className="h-28 object-contain" />
                 <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase">Powered by IBLIM ENTERPRISE</p>
               </div>

              <div>
                <p className="text-xs text-primary font-medium uppercase tracking-widest mb-2">
                  {isSignUp ? 'Register facility' : 'Staff portal'}
                </p>
                <h2 className="text-3xl font-display font-bold text-foreground">
                  {isSignUp ? 'Join ChekaMeds' : 'Welcome back'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {isSignUp
                    ? 'Register your clinic to manage stock in real time'
                    : 'Sign in to access your facility dashboard'}
                </p>
              </div>

              <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground/80 tracking-wide">Full name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Kgosi Moyo" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground/80 tracking-wide">Clinic / Hospital name</label>
                        <input type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="e.g. Princess Marina Hospital" className={inputClass} />
                        <p className="text-[11px] text-muted-foreground px-1">This becomes your facility identifier. Use the official name.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80 tracking-wide">Email address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@health.gov.bw" className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80 tracking-wide">Password</label>
                    {!isSignUp && <button type="button" className="text-xs text-primary hover:underline font-medium">Forgot password?</button>}
                  </div>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} className={inputClass + ' pr-11'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-2"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {isSignUp ? 'Creating account...' : 'Signing in...'}
                    </>
                  ) : (
                    <>
                      {isSignUp ? 'Create clinic account' : 'Sign in to dashboard'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setIsLoading(false); setConfirmed(false); }}
                  className="w-full py-2.5 text-sm font-medium rounded-xl border border-border text-foreground hover:bg-muted transition-all"
                >
                  {isSignUp ? 'Already registered? Sign in' : 'New facility? Register here'}
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Access restricted to authorised Botswana health personnel only.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;