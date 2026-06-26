import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import logo from '@/assets/ChekaMeds_Logo.png';

type SiteHeaderLink = {
  label: string;
  to: string;
};

type SiteHeaderProps = {
  links?: SiteHeaderLink[];
  ctaLabel?: string;
  ctaTo?: string;
};

const defaultLinks: SiteHeaderLink[] = [
  { label: 'Search', to: '/search' },
  { label: 'Consultant', to: '/consultant' },
  { label: 'Facilities', to: '/facilities' },
];

const SiteHeader = ({ links = defaultLinks, ctaLabel = 'Clinic Login', ctaTo = '/login' }: SiteHeaderProps) => {
  const location = useLocation();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-emerald-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(151,214,88,0.22),transparent_32%),linear-gradient(90deg,rgba(5,12,10,0.98),rgba(9,29,24,0.94),rgba(2,14,8,0.98))] text-white shadow-[0_14px_55px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-12">
        <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label="ChekaMeds home">
          <span className="flex h-12 w-[138px] shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-white/95 px-2 py-1 shadow-[0_0_28px_rgba(151,214,88,0.20)] transition group-hover:shadow-[0_0_36px_rgba(151,214,88,0.34)] sm:w-[172px]">
            <img src={logo} alt="ChekaMeds" className="max-h-full w-full object-contain" />
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200/90">Find Medicines Faster</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Botswana Health Bridge</span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-1" aria-label="Main navigation">
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-emerald-300/15 bg-[linear-gradient(135deg,rgba(1,18,14,0.96),rgba(2,42,31,0.94)_48%,rgba(0,12,10,0.96))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.42),0_0_42px_rgba(16,185,129,0.12)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(52,211,153,0.16),transparent_32%),radial-gradient(circle_at_82%_0%,rgba(125,211,252,0.10),transparent_28%)]" />
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-12">
        <Link to="/" className="flex min-w-0 items-center" aria-label="ChekaMeds home">
          <img
            src={logo}
            alt="ChekaMeds"
            className="h-11 w-auto max-w-[170px] object-contain drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)] sm:h-12 sm:max-w-[220px]"
          />
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 p-1.5 shadow-inner md:flex" aria-label="Main navigation">
          {links.map((link) => {
            const isActive = link.to !== '/' && location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition sm:px-4 sm:text-xs ${
                  isActive
                    ? 'bg-emerald-300 text-[#06110d] shadow-[0_0_24px_rgba(151,214,88,0.28)]'
                    : 'border border-white/10 bg-white/[0.04] text-white/78 hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-emerald-100'
                className={`rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] transition ${
                  isActive
                    ? 'bg-emerald-300 text-[#06130e] shadow-[0_0_24px_rgba(52,211,153,0.34)]'
                    : 'text-white/72 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          to={ctaTo}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200/40 bg-gradient-to-r from-[#97d658] to-[#2d9768] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#03110c] shadow-[0_0_30px_rgba(151,214,88,0.26)] transition hover:scale-[1.02] hover:shadow-[0_0_38px_rgba(151,214,88,0.42)] sm:px-5 sm:text-xs"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200/40 bg-gradient-to-r from-emerald-300 via-lime-200 to-emerald-300 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#06130e] shadow-[0_10px_30px_rgba(52,211,153,0.26),0_0_22px_rgba(52,211,153,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(52,211,153,0.36)] sm:px-5"
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
};

export default SiteHeader;
