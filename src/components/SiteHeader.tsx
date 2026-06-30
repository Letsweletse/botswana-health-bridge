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
  { label: 'Video Consult', to: '/consultant' },
  { label: 'Facilities', to: '/facilities' },
];

const SiteHeader = ({ links = defaultLinks, ctaLabel = 'Clinic Login', ctaTo = '/login' }: SiteHeaderProps) => {
  const location = useLocation();

  return (
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
            const isActive = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to);

            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition sm:px-4 sm:text-xs ${
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
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200/40 bg-gradient-to-r from-emerald-300 via-lime-200 to-emerald-300 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#06130e] shadow-[0_10px_30px_rgba(52,211,153,0.26),0_0_22px_rgba(52,211,153,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(52,211,153,0.36)] sm:px-5"
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
};

export default SiteHeader;
