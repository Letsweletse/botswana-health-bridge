import { Link } from 'react-router-dom';
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
    desc: 'Patients text a WhatsApp number to search medicines — no app downloads needed.',
  },
  {
    icon: BarChart3,
    title: 'Predictive Forecasting',
    desc: 'Analyses depletion trends and alerts facilities before stockouts happen, preventing supply chain gaps.',
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
  { num: '02', title: 'Upload Your Stock', desc: 'Download our Excel template, fill in your medicines, and upload.' },
  { num: '03', title: 'Go Live', desc: 'Your stock becomes searchable by patients via web, WhatsApp, and SMS instantly.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background font-[Poppins]">

      {/* ─── Hero with integrated nav ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(180,12%,6%)]/95 via-[hsl(180,12%,8%)]/85 to-[hsl(145,40%,12%)]/70" />
        </div>

        {/* Nav overlay */}
        <div className="relative z-10">
          <nav className="max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2 group">
                <span className="text-[10px] text-white/30 font-medium uppercase tracking-[0.15em] group-hover:text-white/50 transition-colors">Powered by IBLIM ENTERPRISE</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/search"
                className="hidden sm:inline-flex text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2"
              >
                Find Medicine
              </Link>
              <Link
                to="/login"
                className="text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all px-5 py-2.5 rounded-lg"
              >
                Clinic Portal
              </Link>
            </div>
          </nav>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-8 pb-24 md:pt-10 md:pb-32">
          {/* Large logo */}
          <div className="mb-10">
            <img
              src={logo}
              alt="ChekaMeds"
              className="h-28 sm:h-36 md:h-44 lg:h-52 w-auto object-contain drop-shadow-2xl"
            />
          </div>

          <div className="max-w-2xl">
            <p className="text-white/40 text-xs font-medium tracking-[0.35em] uppercase mb-5">
              Ipelegeng — Serving Batswana
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.12] mb-6">
              Medicine reaches{' '}
              <span className="text-primary">every Motswana.</span>
            </h1>
            <p className="text-white/55 text-base md:text-lg leading-relaxed mb-10 max-w-xl">
              A real-time stock visibility platform built for Botswana's health network — connecting clinics, pharmacies, and patients across the nation.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/search"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
              >
                <Search className="h-4 w-4" /> Find Medicine Now
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white/8 text-white text-sm font-semibold rounded-lg hover:bg-white/12 transition-all border border-white/12"
              >
                Register Your Facility <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-8 mt-14">
              {[
                { icon: Activity, text: 'Real-time stock updates' },
                { icon: Pill, text: 'Shelf-level tracking' },
                { icon: Shield, text: 'Secure facility access' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-white/5 border border-white/8">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-white/45 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 md:py-28">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <p className="text-xs text-primary font-semibold uppercase tracking-[0.3em] mb-3">Platform Capabilities</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Built for Botswana's health infrastructure
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
              From Princess Marina to rural clinics — one platform connecting the entire medicine supply chain.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border p-7 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/8 flex items-center justify-center mb-5">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <p className="text-xs text-primary font-semibold uppercase tracking-[0.3em] mb-3">Getting Started</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Three steps to go live</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold text-primary/15 mb-4 tabular-nums">{s.num}</div>
                <h3 className="text-sm font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WhatsApp CTA ─── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-10">
          <div className="bg-card rounded-2xl border border-border p-10 md:p-14 text-center">
            <div className="inline-flex items-center gap-2 bg-[hsl(145,45%,38%)]/8 text-primary rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-primary/15">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Access
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Patients can text to find medicine
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              No app download. No internet browsing. Just text a WhatsApp number and find your medicine across Gaborone.
            </p>
            <div className="bg-muted/40 border border-border rounded-xl inline-block px-10 py-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Public WhatsApp Line</p>
              <p className="text-primary text-2xl font-bold tracking-wide">+267 714 24 486</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center">
          <p className="text-xs text-primary font-semibold uppercase tracking-[0.3em] mb-3">Facility Subscriptions</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Start from P300/month</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
            Get your clinic or pharmacy listed on ChekaMeds. Patients find you, stock is managed, and you stay ahead of shortages.
          </p>
          <div className="flex flex-wrap justify-center gap-5 mb-10">
            {[
              'Real-time inventory management',
              'WhatsApp & SMS visibility',
              'Stock forecasting',
              'Prescription matching',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            Register Your Facility <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src={logo} alt="ChekaMeds" className="h-12 w-auto object-contain" />
              <div>
                <p className="text-sm font-bold text-foreground">ChekaMeds</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em]">Powered by IBLIM ENTERPRISE</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/search" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Find Medicine</Link>
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clinic Portal</Link>
            </div>
            <p className="text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} ChekaMeds. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
