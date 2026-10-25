import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoMark from '@/assets/chekameds-mark.webp';

/* One header for every public page ("Glass Night"): logo, a frosted nav pill
   and a frosted action pill; below 1100px a glass menu button opens a panel.
   Must be rendered inside a .cms wrapper (src/styles/site.css).
   `overlay` lays it over a full-bleed hero. Old props are accepted and ignored. */

type SiteHeaderProps = { links?: unknown; ctaLabel?: string; ctaTo?: string; overlay?: boolean };

const LINKS = [
  { label: 'Find medicine', to: '/search' },
  { label: 'Delivery', to: '/delivery' },
  { label: 'Video consult', to: '/consultant' },
  { label: 'Pharmacies', to: '/facilities' },
  { label: 'For partners', to: '/partners' },
];

const SiteHeader = ({ overlay = false }: SiteHeaderProps) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + '/');

  return (
    <>
      <header className={`cms-hd${overlay ? ' over' : ''}`}>
        <div className="cms-wrap cms-hd-in">
          <Link to="/" className="cms-brand cms-a-down" style={{ animationDelay: '0ms' }} aria-label="ChekaMeds home">
            <img src={logoMark} alt="" width="32" height="32" />
            <span>ChekaMeds</span>
          </Link>

          <nav className="cms-pill cms-nav cms-a-down" style={{ animationDelay: '100ms' }} aria-label="Main navigation">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} aria-current={isActive(l.to) ? 'page' : undefined}>{l.label}</Link>
            ))}
          </nav>

          <div className="cms-pill cms-act cms-a-down" style={{ animationDelay: '200ms' }}>
            <Link to="/login">Pharmacy login</Link>
            <Link to="/search" className="solid">Find medicine</Link>
          </div>

          <button type="button" className="cms-burger cms-a-down" style={{ animationDelay: '100ms' }} aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Menu size={20} className="ic-menu" />
            <X size={20} className="ic-x" />
          </button>
        </div>
      </header>

      <div className={`cms-overlay${open ? ' open' : ''}`} aria-hidden={!open}>
        <button type="button" className="cms-overlay-bg" aria-label="Close menu" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
        <div className="cms-panel">
          <nav aria-label="Mobile navigation">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} tabIndex={open ? 0 : -1} aria-current={isActive(l.to) ? 'page' : undefined}>{l.label}</Link>
            ))}
          </nav>
          <hr />
          <div className="ctas">
            <Link to="/search" className="solid" tabIndex={open ? 0 : -1}>Find medicine</Link>
            <Link to="/login" className="line" tabIndex={open ? 0 : -1}>Pharmacy login</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default SiteHeader;
