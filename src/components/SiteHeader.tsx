import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoMark from '@/assets/chekameds-mark.webp';

/* One header for every public page. Must be rendered inside a .cms wrapper
   (src/styles/site.css). The old props are accepted and ignored so any
   remaining callers keep compiling. */

type SiteHeaderProps = { links?: unknown; ctaLabel?: string; ctaTo?: string };

const LINKS = [
  { label: 'Find medicine', to: '/search' },
  { label: 'Delivery', to: '/delivery' },
  { label: 'Video consult', to: '/consultant' },
  { label: 'Pharmacies', to: '/facilities' },
  { label: 'For partners', to: '/partners' },
];

const SiteHeader = (_props: SiteHeaderProps) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + '/');

  return (
    <header className="cms-hd">
      <div className="cms-wrap">
        <div className="cms-hd-in">
          <Link to="/" className="cms-brand" aria-label="ChekaMeds home">
            <img src={logoMark} alt="" width="34" height="34" />
            <span>Cheka<span>Meds</span></span>
          </Link>

          <nav className="cms-nav" aria-label="Main navigation">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} aria-current={isActive(l.to) ? 'page' : undefined}>{l.label}</Link>
            ))}
          </nav>

          <div className="cms-hd-act">
            <Link to="/login" className="cms-hd-login">Pharmacy login</Link>
            {pathname !== '/search' && <Link to="/search" className="cms-btn cms-btn-p cms-btn-sm">Find medicine</Link>}
            <button type="button" className="cms-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <nav className={`cms-drawer${open ? ' open' : ''}`} aria-label="Mobile navigation">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} aria-current={isActive(l.to) ? 'page' : undefined}>{l.label}</Link>
          ))}
          <Link to="/login">Pharmacy login</Link>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
