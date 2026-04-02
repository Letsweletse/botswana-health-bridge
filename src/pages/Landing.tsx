import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Shield, Activity, Pill, Building2, Phone, ArrowRight, CheckCircle2, BarChart3, MessageCircle } from 'lucide-react';
import logo from '@/assets/ChekaMeds_Logo.png';
import heroBg from '@/assets/hero-gaborone.jpg';

const features = [
  {
    icon: Search,
    title: 'Real-Time Medicine Search',
    desc: 'Patients find which clinics have their medicine in stock — instantly, no login required.',
  },
  {
    icon: Building2,
    title: 'Facility Inventory Management',
    desc: 'Clinics and pharmacies upload stock via Excel templates. Data reflects across the platform within seconds.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Access',
    desc: 'Patients text a WhatsApp number to search medicines from their phone — no app downloads or internet browsing needed.',
  },
  {
    icon: BarChart3,
    title: 'Predictive Forecasting',
    desc: 'AI analyses depletion trends and alerts facilities before stockouts happen, preventing supply chain gaps.',
  },
  {
    icon: Shield,
    title: 'Secure & Clinic-Scoped',
    desc: 'Each facility only manages their own stock. Row-level security ensures complete data isolation.',
  },
  {
    icon: Phone,
    title: 'SMS & USSD Fallback',
    desc: 'Feature phone users access medicine data via *123# or SMS — ensuring nobody is left behind.',
  },
];

const steps = [
  { num: '01', title: 'Register Your Facility', desc: 'Sign up with your clinic or pharmacy name. Takes under 2 minutes.' },
  { num: '02', title: 'Upload Your Stock', desc: 'Download our Excel template, fill in your medicines, and upload. That simple.' },
  { num: '03', title: 'Go Live', desc: 'Your stock becomes searchable by patients via web, WhatsApp, and SMS instantly.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-11 w-11 rounded-xl bg-white p-0.5 shadow-sm object-contain" />
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">ChekaMeds</h1>
              <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em]">Powered by IBLIM ENTERPRISE</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/search"
              className="hidden sm:inline-flex text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Find Medicine
            </Link>
            <Link
              to="/login"
              className="text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all px-4 py-2 rounded-xl shadow-sm"
            >
              Clinic Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(180,12%,9%)]/90 via-[hsl(180,12%,9%)]/75 to-[hsl(145,45%,20%)]/60" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <p className="text-xs text-white/50 font-medium tracking-[0.3em] uppercase mb-4">
                Ipelegeng — Serving Batswana
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-5">
                Medicine reaches<br />
                <span className="text-primary">every Motswana.</span>
              </h2>
              <p className="text-white/60 text-base md:text-lg leading-relaxed mb-8 max-w-lg">
                A real-time stock visibility platform built for Botswana's health network — connecting clinics, pharmacies, and patients across the nation.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/search"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
                >
                  <Search className="h-4 w-4" /> Find Medicine Now
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/15 transition-all border border-white/15 backdrop-blur-sm"
                >
                  Register Your Facility <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap gap-6 mt-12"
            >
              {[
                { icon: Activity, text: 'Real-time stock updates' },
                { icon: Pill, text: 'Shelf-level medicine tracking' },
                { icon: Shield, text: 'Secure facility access' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/15 border border-primary/25">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-white/55">{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs text-primary font-semibold uppercase tracking-[0.3em] mb-3">Platform Capabilities</p>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Built for Botswana's health infrastructure
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              From Princess Marina to rural clinics — one platform connecting the entire medicine supply chain.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/40 border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs text-primary font-semibold uppercase tracking-[0.3em] mb-3">Getting Started</p>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">Three steps to go live</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-primary/20 mb-3">{s.num}</div>
                <h4 className="text-sm font-bold text-foreground mb-2">{s.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-card rounded-3xl border border-border p-8 md:p-12 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 bg-success/10 text-success rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border border-success/20">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Access
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Patients can text to find medicine
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              No app download. No internet browsing. Just text a WhatsApp number and find your medicine across Gaborone.
            </p>
            <div className="bg-muted/50 border border-border rounded-2xl inline-block px-8 py-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Public WhatsApp Line</p>
              <p className="text-primary text-2xl font-bold">+267 714 24 486</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 bg-muted/40 border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-primary font-semibold uppercase tracking-[0.3em] mb-3">Facility Subscriptions</p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Start from P300/month</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
            Get your clinic or pharmacy listed on ChekaMeds. Patients find you, stock is managed, and you stay ahead of shortages.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              'Real-time inventory management',
              'WhatsApp & SMS visibility',
              'AI stock forecasting',
              'Prescription matching',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              Register Your Facility <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="ChekaMeds" className="h-9 w-9 rounded-lg bg-white p-0.5 shadow-sm object-contain" />
              <div>
                <p className="text-xs font-bold text-foreground">ChekaMeds</p>
                <p className="text-[8px] text-muted-foreground uppercase tracking-[0.15em]">Powered by IBLIM ENTERPRISE</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/search" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Find Medicine</Link>
              <Link to="/login" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Clinic Portal</Link>
            </div>
            <p className="text-[10px] text-muted-foreground">
              © {new Date().getFullYear()} ChekaMeds. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
