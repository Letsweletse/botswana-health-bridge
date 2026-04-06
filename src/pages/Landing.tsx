import { Link } from 'react-router-dom';
import { Search, Shield, Activity, Pill, Building2, Phone, ArrowRight, CheckCircle2, BarChart3, MessageCircle, ChevronRight, Scale, FileText, Globe } from 'lucide-react';
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
    <div className="min-h-screen bg-white font-[Gordita,system-ui,sans-serif] antialiased">

      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              to="/search"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Find Medicine
            </Link>
            <a
              href="#about"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              About Us
            </a>
            <Link
              to="/login"
              className="text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors px-5 py-2"
            >
              Clinic Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-gradient-to-b from-white to-secondary/30">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8 flex justify-center animate-fade-in">
              <img
                src={logo}
                alt="ChekaMeds"
                className="h-36 sm:h-44 md:h-52 w-auto object-contain"
              />
            </div>

            <p className="text-[hsl(210,80%,45%)] text-xs font-semibold tracking-[0.25em] uppercase mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Ipelegeng — Serving Batswana
            </p>

            <h1 className="text-[2rem] sm:text-4xl md:text-5xl font-bold text-[hsl(215,25%,15%)] leading-[1.15] mb-5 tracking-tight animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Medicine reaches{' '}
              <span className="text-[hsl(210,80%,50%)]">every Motswana</span>
            </h1>

            <p className="text-[hsl(210,10%,50%)] text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto font-light animate-fade-in" style={{ animationDelay: '0.3s' }}>
              A real-time stock visibility platform built for Botswana's health network — connecting clinics, pharmacies, and patients.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Link
                to="/search"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3 bg-[hsl(210,80%,50%)] text-white text-sm font-semibold hover:bg-[hsl(210,80%,45%)] transition-all shadow-lg shadow-[hsl(210,80%,50%)]/20"
              >
                <Search className="h-4 w-4" /> Find Medicine
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3 bg-white text-[hsl(215,25%,15%)] text-sm font-semibold hover:bg-[hsl(210,20%,96%)] transition-all border border-[hsl(210,20%,88%)]"
              >
                Register Your Facility <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-16 pt-10 border-t border-border/60 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            {[
              { icon: Activity, text: 'Real-time stock updates' },
              { icon: Pill, text: 'Shelf-level tracking' },
              { icon: Shield, text: 'Secure facility access' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 text-[hsl(210,80%,50%)]" />
                <span className="text-xs text-[hsl(210,10%,50%)] font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs text-[hsl(210,80%,50%)] font-semibold uppercase tracking-[0.2em] mb-2">Platform</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(215,25%,15%)] tracking-tight">
              Built for Botswana's health infrastructure
            </h2>
            <p className="text-sm text-[hsl(210,10%,50%)] mt-3 max-w-md mx-auto leading-relaxed font-light">
              From Princess Marina to rural clinics — one platform connecting the entire medicine supply chain.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="group border border-border bg-card p-6 hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="h-10 w-10 bg-[hsl(210,80%,50%)]/8 flex items-center justify-center mb-4 group-hover:bg-[hsl(210,80%,50%)]/12 transition-colors">
                  <f.icon className="h-[18px] w-[18px] text-[hsl(210,80%,50%)]" />
                </div>
                <h3 className="text-sm font-semibold text-[hsl(215,25%,15%)] mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-[hsl(210,10%,50%)] leading-relaxed font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs text-[hsl(210,80%,50%)] font-semibold uppercase tracking-[0.2em] mb-2">Getting Started</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(215,25%,15%)] tracking-tight">Three steps to go live</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center animate-fade-in" style={{ animationDelay: `${0.15 * i}s` }}>
                <div className="inline-flex items-center justify-center h-12 w-12 bg-[hsl(210,80%,50%)]/10 text-[hsl(210,80%,50%)] font-bold text-sm mb-4">
                  {s.num}
                </div>
                <h3 className="text-sm font-semibold text-[hsl(215,25%,15%)] mb-2">{s.title}</h3>
                <p className="text-[13px] text-[hsl(210,10%,50%)] leading-relaxed font-light">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WhatsApp CTA ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border border-border bg-card p-8 md:p-12 text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[hsl(210,80%,95%)] text-[hsl(210,80%,50%)] px-4 py-1.5 text-xs font-semibold mb-5">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Access
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[hsl(215,25%,15%)] mb-2">
              Patients can text to find medicine
            </h2>
            <p className="text-sm text-[hsl(210,10%,50%)] max-w-md mx-auto mb-7 leading-relaxed font-light">
              No app download. No internet browsing. Just text a WhatsApp number and find your medicine across Gaborone.
            </p>
            <div className="bg-[hsl(215,25%,12%)] inline-block px-8 py-4 animate-[pulse_3s_ease-in-out_infinite]">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Public WhatsApp Line</p>
              <p className="text-[hsl(210,80%,60%)] text-xl font-bold tracking-wide">+267 714 24 486</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-20 md:py-28 bg-[hsl(215,25%,12%)]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs text-[hsl(210,80%,60%)] font-semibold uppercase tracking-[0.2em] mb-2">Facility Subscriptions</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">Start from P300/month</h2>
          <p className="text-sm text-white/50 max-w-md mx-auto mb-10 leading-relaxed font-light">
            Get your clinic or pharmacy listed on ChekaMeds. Patients find you, stock is managed, and you stay ahead of shortages.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
            {[
              'Real-time inventory management',
              'WhatsApp & SMS visibility',
              'Stock forecasting',
              'Prescription matching',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-white/70">
                <CheckCircle2 className="h-4 w-4 text-[hsl(210,80%,60%)]" />
                {item}
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="mb-10 border-t border-white/10 pt-8">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Payment Methods</p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: 'MyZaka (Mascom)', detail: 'Mobile Money' },
                { name: 'FNB Pay to Cell', detail: '+267 755 60 140' },
                { name: 'Bank Transfer', detail: 'Contact for details' },
              ].map((pm, i) => (
                <div key={i} className="border border-white/10 px-5 py-3 text-left">
                  <p className="text-xs text-white/80 font-medium">{pm.name}</p>
                  <p className="text-[11px] text-white/40">{pm.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 px-7 py-3 bg-[hsl(210,80%,50%)] text-white text-sm font-semibold hover:bg-[hsl(210,80%,45%)] transition-all"
          >
            Register Your Facility <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── About Us & Legal ─── */}
      <section id="about" className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs text-[hsl(210,80%,50%)] font-semibold uppercase tracking-[0.2em] mb-2">About Us</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[hsl(215,25%,15%)] tracking-tight">
              ChekaMeds by IBLIM Enterprise
            </h2>
            <p className="text-sm text-[hsl(210,10%,50%)] mt-3 max-w-lg mx-auto leading-relaxed font-light">
              ChekaMeds is a health-tech platform developed by IBLIM Enterprise (Pty) Ltd, registered in Botswana. 
              Our mission is to eliminate medicine stockouts and improve access to essential medicines for every Motswana.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-border p-6 animate-fade-in">
              <Scale className="h-5 w-5 text-[hsl(210,80%,50%)] mb-3" />
              <h3 className="text-sm font-semibold text-[hsl(215,25%,15%)] mb-2">Regulatory Compliance</h3>
              <ul className="text-[13px] text-[hsl(210,10%,50%)] leading-relaxed font-light space-y-2">
                <li>• CIPA Registration (Companies & Intellectual Property Authority)</li>
                <li>• Botswana Data Protection Act 2024 compliance</li>
                <li>• Botswana Medicines Regulatory Authority (BoMRA) guidelines</li>
                <li>• BURS Tax Compliance</li>
              </ul>
            </div>
            <div className="border border-border p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <FileText className="h-5 w-5 text-[hsl(210,80%,50%)] mb-3" />
              <h3 className="text-sm font-semibold text-[hsl(215,25%,15%)] mb-2">Data & Privacy</h3>
              <ul className="text-[13px] text-[hsl(210,10%,50%)] leading-relaxed font-light space-y-2">
                <li>• No patient personal data is collected</li>
                <li>• Clinic data is scoped and isolated</li>
                <li>• Row-level security on all records</li>
                <li>• POPIA/GDPR-aligned privacy practices</li>
              </ul>
            </div>
            <div className="border border-border p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Globe className="h-5 w-5 text-[hsl(210,80%,50%)] mb-3" />
              <h3 className="text-sm font-semibold text-[hsl(215,25%,15%)] mb-2">Recommended Registrations</h3>
              <ul className="text-[13px] text-[hsl(210,10%,50%)] leading-relaxed font-light space-y-2">
                <li>• BOCRA (Botswana Communications Regulatory Authority) for SMS/USSD</li>
                <li>• LEA (Local Enterprise Authority) for startup support</li>
                <li>• Ministry of Health e-Health registration</li>
                <li>• BEMA membership (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 bg-[hsl(200,18%,8%)] border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="ChekaMeds" className="h-10 w-auto object-contain" />
              <div>
                <p className="text-sm font-semibold text-white">ChekaMeds</p>
                <p className="text-[9px] text-white/30 uppercase tracking-[0.12em]">Powered by IBLIM ENTERPRISE (Pty) Ltd</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/search" className="text-xs text-white/40 hover:text-white/70 transition-colors">Find Medicine</Link>
              <Link to="/login" className="text-xs text-white/40 hover:text-white/70 transition-colors">Clinic Portal</Link>
              <a href="#about" className="text-xs text-white/40 hover:text-white/70 transition-colors">About Us</a>
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
