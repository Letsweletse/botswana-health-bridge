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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.08] bg-[#020e08]/88 text-white shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="ChekaMeds home">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-sm ring-1 ring-emerald-400/20">
            <img src={logo} alt="ChekaMeds" className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black leading-none tracking-tight">ChekaMeds</span>
            <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80 sm:block">Health Bridge</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((link) => {
            const isActive = link.to !== '/' && location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/25'
                    : 'text-white/55 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          to={ctaTo}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-400/20 sm:px-4"
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
};

export default SiteHeader;
