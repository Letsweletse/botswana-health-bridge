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
    <div className="min-h-screen font-[Gordita,system-ui,sans-serif] antialiased bg-[#020617]">

      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ChekaMeds" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              to="/search"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors hidden sm:block"
            >
              Find Medicine
            </Link>
            <a
              href="#about"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors hidden sm:block"
            >
              About Us
            </a>
            <Link
              to="/login"
              className="text-[13px] font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors px-5 py-2"
            >
              Clinic Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-24 pb-20 md:pt-28 md:pb-32 overflow-hidden min-h-[100vh] flex items-center">
        {/* Dramatic geometric gradient background */}
        <div className="absolute inset-0">
          {/* Base dark */}
          <div className="absolute inset-0 bg-[#020617]" />
          {/* Primary diagonal beam */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(125deg, transparent 30%, rgba(37,99,235,0.15) 45%, rgba(37,99,235,0.08) 55%, transparent 70%)',
            }}
          />
          {/* Secondary beam */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(200deg, transparent 40%, rgba(59,130,246,0.1) 55%, transparent 65%)',
            }}
          />
          {/* Subtle radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(37,99,235,0.08) 0%, transparent 70%)',
            }}
          />
          {/* Top-left accent */}
          <div
            className="absolute top-0 left-0 w-[600px] h-[600px]"
            style={{
              background: 'radial-gradient(circle at 0% 0%, rgba(37,99,235,0.12) 0%, transparent 60%)',
            }}
          />
          {/* Bottom-right accent */}
          <div
            className="absolute bottom-0 right-0 w-[800px] h-[800px]"
            style={{
              background: 'radial-gradient(circle at 100% 100%, rgba(30,64,175,0.1) 0%, transparent 50%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 w-full">
          <div className="max-w-3xl mx-auto text-center">
            {/* Logo */}
            <div className="mb-10 flex justify-center animate-fade-in">
              <img
                src={logo}
                alt="ChekaMeds"
                className="h-36 sm:h-44 md:h-52 w-auto object-contain drop-shadow-[0_0_60px_rgba(37,99,235,0.15)]"
              />
            </div>

            <p
              className="text-[#60a5fa] text-xs font-semibold tracking-[0.3em] uppercase mb-6 animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              Ipelegeng — Serving Batswana
            </p>

            <h1
              className="text-[2.5rem] sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              Medicine reaches{' '}
              <span className="text-[#3b82f6]">every Motswana</span>
            </h1>

            <p
              className="text-white/45 text-base md:text-lg leading-relaxed mb-12 max-w-xl mx-auto font-light animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              A real-time stock visibility platform built for Botswana's health network — connecting clinics, pharmacies, and patients.
            </p>

            <div
              className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in"
              style={{ animationDelay: '0.4s' }}
            >
              <Link
                to="/search"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)]"
              >
                <Search className="h-4 w-4" /> Find Medicine
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-white/[0.06] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all border border-white/[0.1]"
              >
                Register Your Facility <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Trust strip */}
          <div
            className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-20 pt-10 border-t border-white/[0.06] animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            {[
              { icon: Activity, text: 'Real-time stock updates' },
              { icon: Pill, text: 'Shelf-level tracking' },
              { icon: Shield, text: 'Secure facility access' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-xs text-white/40 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 md:py-32 bg-[#0f172a] relative">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(37,99,235,0.06) 0%, transparent 70%)' }} />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs text-[#60a5fa] font-semibold uppercase tracking-[0.25em] mb-3">Platform</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Built for Botswana's health infrastructure
            </h2>
            <p className="text-sm text-white/40 mt-3 max-w-md mx-auto leading-relaxed font-light">
              From Princess Marina to rural clinics — one platform connecting the entire medicine supply chain.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-[#0f172a] p-8 hover:bg-[#1e293b]/60 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <div className="h-10 w-10 bg-[#2563eb]/10 flex items-center justify-center mb-5 group-hover:bg-[#2563eb]/20 transition-colors">
                  <f.icon className="h-[18px] w-[18px] text-[#3b82f6]" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 md:py-32 bg-[#020617] relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.5) 0%, transparent 30%, transparent 70%, rgba(15,23,42,0.5) 100%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs text-[#60a5fa] font-semibold uppercase tracking-[0.25em] mb-3">Getting Started</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Three steps to go live</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((s, i) => (
              <div key={i} className="text-center animate-fade-in" style={{ animationDelay: `${0.15 * i}s` }}>
                <div className="inline-flex items-center justify-center h-14 w-14 bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#3b82f6] font-bold text-sm mb-5">
                  {s.num}
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed font-light">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WhatsApp CTA ─── */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border border-white/[0.06] bg-[#020617] p-10 md:p-14 text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[#2563eb]/10 text-[#60a5fa] px-4 py-1.5 text-xs font-semibold mb-6">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Access
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              Patients can text to find medicine
            </h2>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-8 leading-relaxed font-light">
              No app download. No internet browsing. Just text a WhatsApp number and find your medicine across Gaborone.
            </p>
            <div className="bg-[#020617] border border-white/[0.08] inline-block px-10 py-5 animate-[pulse_3s_ease-in-out_infinite]">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Public WhatsApp Line</p>
              <p className="text-[#3b82f6] text-xl font-bold tracking-wide">+267 714 24 486</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-24 md:py-32 bg-[#020617] relative">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(37,99,235,0.05) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs text-[#60a5fa] font-semibold uppercase tracking-[0.25em] mb-3">Facility Subscriptions</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">Start from P300/month</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-10 leading-relaxed font-light">
            Get your clinic or pharmacy listed on ChekaMeds. Patients find you, stock is managed, and you stay ahead of shortages.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
            {[
              'Real-time inventory management',
              'WhatsApp & SMS visibility',
              'Stock forecasting',
              'Prescription matching',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-white/60">
                <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />
                {item}
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="mb-10 border-t border-white/[0.06] pt-8">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-4">Payment Methods</p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: 'MyZaka (Mascom)', detail: 'Mobile Money' },
                { name: 'FNB Pay to Cell', detail: '+267 755 60 140' },
                { name: 'Bank Transfer', detail: 'Contact for details' },
              ].map((pm, i) => (
                <div key={i} className="border border-white/[0.08] bg-white/[0.02] px-5 py-3 text-left">
                  <p className="text-xs text-white/70 font-medium">{pm.name}</p>
                  <p className="text-[11px] text-white/30">{pm.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-all shadow-[0_0_40px_rgba(37,99,235,0.25)]"
          >
            Register Your Facility <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── About Us & Legal ─── */}
      <section id="about" className="py-24 md:py-32 bg-[#0f172a]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs text-[#60a5fa] font-semibold uppercase tracking-[0.25em] mb-3">About Us</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              ChekaMeds by IBLIM Enterprise
            </h2>
            <p className="text-sm text-white/40 mt-3 max-w-lg mx-auto leading-relaxed font-light">
              ChekaMeds is a health-tech platform developed by IBLIM Enterprise (Pty) Ltd, registered in Botswana. 
              Our mission is to eliminate medicine stockouts and improve access to essential medicines for every Motswana.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.04]">
            <div className="bg-[#0f172a] p-7 animate-fade-in">
              <Scale className="h-5 w-5 text-[#3b82f6] mb-4" />
              <h3 className="text-sm font-semibold text-white mb-3">Regulatory Compliance</h3>
              <ul className="text-[13px] text-white/40 leading-relaxed font-light space-y-2">
                <li>• CIPA Registration</li>
                <li>• Botswana Data Protection Act 2024</li>
                <li>• BoMRA guidelines</li>
                <li>• BURS Tax Compliance</li>
              </ul>
            </div>
            <div className="bg-[#0f172a] p-7 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <FileText className="h-5 w-5 text-[#3b82f6] mb-4" />
              <h3 className="text-sm font-semibold text-white mb-3">Data & Privacy</h3>
              <ul className="text-[13px] text-white/40 leading-relaxed font-light space-y-2">
                <li>• No patient personal data collected</li>
                <li>• Clinic data is scoped and isolated</li>
                <li>• Row-level security on all records</li>
                <li>• POPIA/GDPR-aligned practices</li>
              </ul>
            </div>
            <div className="bg-[#0f172a] p-7 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Globe className="h-5 w-5 text-[#3b82f6] mb-4" />
              <h3 className="text-sm font-semibold text-white mb-3">Recommended Registrations</h3>
              <ul className="text-[13px] text-white/40 leading-relaxed font-light space-y-2">
                <li>• BOCRA for SMS/USSD</li>
                <li>• LEA for startup support</li>
                <li>• Ministry of Health e-Health</li>
                <li>• BEMA membership (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 bg-[#020617] border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="ChekaMeds" className="h-10 w-auto object-contain" />
              <div>
                <p className="text-sm font-semibold text-white">ChekaMeds</p>
                <p className="text-[9px] text-white/25 uppercase tracking-[0.12em]">Powered by IBLIM ENTERPRISE (Pty) Ltd</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/search" className="text-xs text-white/30 hover:text-white/60 transition-colors">Find Medicine</Link>
              <Link to="/login" className="text-xs text-white/30 hover:text-white/60 transition-colors">Clinic Portal</Link>
              <a href="#about" className="text-xs text-white/30 hover:text-white/60 transition-colors">About Us</a>
            </div>
            <p className="text-[11px] text-white/20">
              © {new Date().getFullYear()} ChekaMeds. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
