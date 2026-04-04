import { Link } from 'react-router-dom';
import { Search, Shield, Activity, Pill, Building2, Phone, ArrowRight, CheckCircle2, BarChart3, MessageCircle } from 'lucide-react';
import logo from '@/assets/ChekaMeds_Logo.png';

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
    <div className="min-h-screen font-[Poppins]">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-[hsl(200,15%,10%)]">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(145,45%,50%) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        {/* Gradient glow from logo area */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(170,50%,25%,0.12),transparent_70%)]" />

        {/* Nav */}
        <div className="relative z-10">
          <nav className="max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
            <span className="text-[10px] text-white/25 font-medium uppercase tracking-[0.15em]">Powered by IBLIM ENTERPRISE</span>
            <div className="flex items-center gap-4">
              <Link
                to="/search"
                className="hidden sm:inline-flex text-sm font-medium text-white/50 hover:text-white transition-colors px-4 py-2"
              >
                Find Medicine
              </Link>
              <Link
                to="/login"
                className="text-sm font-semibold text-white bg-[hsl(145,45%,38%)] hover:bg-[hsl(145,45%,34%)] transition-all px-5 py-2.5 rounded-lg"
              >
                Clinic Portal
              </Link>
            </div>
          </nav>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-6 pb-24 md:pt-8 md:pb-32 flex flex-col items-center text-center">
          {/* Logo — center stage, massive */}
          <div className="mb-12">
            <img
              src={logo}
              alt="ChekaMeds"
              className="h-36 sm:h-48 md:h-56 lg:h-64 xl:h-72 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 8px 40px hsl(170,50%,30%,0.25))' }}
            />
          </div>

          <p className="text-white/30 text-xs font-medium tracking-[0.35em] uppercase mb-5">
            Ipelegeng — Serving Batswana
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.12] mb-6 max-w-3xl">
            Medicine reaches{' '}
            <span className="text-[hsl(145,55%,48%)]">every Motswana.</span>
          </h1>
          <p className="text-white/45 text-base md:text-lg leading-relaxed mb-10 max-w-xl">
            A real-time stock visibility platform built for Botswana's health network — connecting clinics, pharmacies, and patients across the nation.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/search"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[hsl(145,45%,38%)] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(145,45%,34%)] transition-all shadow-xl shadow-[hsl(145,45%,30%,0.3)]"
            >
              <Search className="h-4 w-4" /> Find Medicine Now
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-white/[0.06] text-white text-sm font-semibold rounded-lg hover:bg-white/[0.1] transition-all border border-white/[0.1]"
            >
              Register Your Facility <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 mt-16">
            {[
              { icon: Activity, text: 'Real-time stock updates' },
              { icon: Pill, text: 'Shelf-level tracking' },
              { icon: Shield, text: 'Secure facility access' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-white/[0.04] border border-white/[0.06]">
                  <item.icon className="h-3.5 w-3.5 text-[hsl(170,60%,50%)]" />
                </div>
                <span className="text-xs text-white/35 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom edge fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(150,8%,97%)] to-transparent" />
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 md:py-28 bg-[hsl(150,8%,97%)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <p className="text-xs text-[hsl(145,45%,38%)] font-semibold uppercase tracking-[0.3em] mb-3">Platform Capabilities</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(200,18%,12%)]">
              Built for Botswana's health infrastructure
            </h2>
            <p className="text-sm text-[hsl(200,10%,48%)] mt-3 max-w-lg mx-auto leading-relaxed">
              From Princess Marina to rural clinics — one platform connecting the entire medicine supply chain.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[hsl(150,12%,88%)] p-7 hover:border-[hsl(145,45%,38%,0.2)] hover:shadow-lg hover:shadow-[hsl(145,45%,38%,0.05)] transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-lg bg-[hsl(145,45%,38%,0.08)] flex items-center justify-center mb-5">
                  <f.icon className="h-5 w-5 text-[hsl(145,45%,38%)]" />
                </div>
                <h3 className="text-sm font-bold text-[hsl(200,18%,12%)] mb-2">{f.title}</h3>
                <p className="text-xs text-[hsl(200,10%,48%)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 bg-[hsl(200,15%,10%)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(170,50%,50%) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <p className="text-xs text-[hsl(170,60%,50%)] font-semibold uppercase tracking-[0.3em] mb-3">Getting Started</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Three steps to go live</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold text-[hsl(170,60%,50%,0.12)] mb-4 tabular-nums">{s.num}</div>
                <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WhatsApp CTA ─── */}
      <section className="py-24 bg-[hsl(150,8%,97%)]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10">
          <div className="bg-white rounded-2xl border border-[hsl(150,12%,88%)] p-10 md:p-14 text-center">
            <div className="inline-flex items-center gap-2 bg-[hsl(145,45%,38%,0.08)] text-[hsl(145,45%,38%)] rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-[hsl(145,45%,38%,0.15)]">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Access
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(200,18%,12%)] mb-3">
              Patients can text to find medicine
            </h2>
            <p className="text-sm text-[hsl(200,10%,48%)] max-w-md mx-auto mb-8 leading-relaxed">
              No app download. No internet browsing. Just text a WhatsApp number and find your medicine across Gaborone.
            </p>
            <div className="bg-[hsl(200,15%,10%)] rounded-xl inline-block px-10 py-5">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Public WhatsApp Line</p>
              <p className="text-[hsl(145,55%,48%)] text-2xl font-bold tracking-wide">+267 714 24 486</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-24 bg-[hsl(200,15%,10%)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(145,45%,25%,0.08),transparent_60%)]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 text-center">
          <p className="text-xs text-[hsl(170,60%,50%)] font-semibold uppercase tracking-[0.3em] mb-3">Facility Subscriptions</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Start from P300/month</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
            Get your clinic or pharmacy listed on ChekaMeds. Patients find you, stock is managed, and you stay ahead of shortages.
          </p>
          <div className="flex flex-wrap justify-center gap-5 mb-10">
            {[
              'Real-time inventory management',
              'WhatsApp & SMS visibility',
              'Stock forecasting',
              'Prescription matching',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                <CheckCircle2 className="h-4 w-4 text-[hsl(145,55%,48%)]" />
                {item}
              </div>
            ))}
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[hsl(145,45%,38%)] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(145,45%,34%)] transition-all shadow-xl shadow-[hsl(145,45%,30%,0.3)]"
          >
            Register Your Facility <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 bg-[hsl(200,18%,8%)] border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src={logo} alt="ChekaMeds" className="h-14 w-auto object-contain" />
              <div>
                <p className="text-sm font-bold text-white">ChekaMeds</p>
                <p className="text-[9px] text-white/25 uppercase tracking-[0.15em]">Powered by IBLIM ENTERPRISE</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/search" className="text-xs text-white/35 hover:text-white/70 transition-colors">Find Medicine</Link>
              <Link to="/login" className="text-xs text-white/35 hover:text-white/70 transition-colors">Clinic Portal</Link>
            </div>
            <p className="text-[11px] text-white/25">
              © {new Date().getFullYear()} ChekaMeds. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
