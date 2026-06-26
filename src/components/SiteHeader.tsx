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
    <header className="site-header-shell">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-12">
        <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label="ChekaMeds home">
          <span className="site-logo-chip">
            <img src={logo} alt="ChekaMeds" className="max-h-full w-full object-contain" />
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200/90">Find Medicines Faster</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Botswana Health Bridge</span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-1" aria-label="Main navigation">
          {links.map((link) => {
            const isActive = link.to !== '/' && location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition sm:px-4 sm:text-xs ${
                  isActive
                    ? 'site-nav-pill-active'
                    : 'site-nav-pill-idle'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          to={ctaTo}
          className="site-header-cta"
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
};

export default SiteHeader;
