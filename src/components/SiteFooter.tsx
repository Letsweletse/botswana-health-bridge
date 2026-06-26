import { Link } from 'react-router-dom';

const whatsappPrimary = '26775560140';
const whatsappSecondary = '26772347712';

const quickLinks = [
  { label: 'Find Medicine', to: '/search' },
  { label: 'Video Consultation', to: '/consultant' },
  { label: 'Partner Facilities', to: '/facilities' },
  { label: 'Staff Portal', to: '/dashboard' },
  { label: 'Admin', to: '/admin' },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer" id="support">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link to="/" className="site-footer__logo" aria-label="ChekaMeds home">
            Cheka<span>Meds</span>
          </Link>
          <p>
            Medicine availability search, pharmacy discovery and video consultation support for Botswana.
          </p>
          <div className="site-footer__badges">
            <span>WhatsApp support</span>
            <span>Pharmacy onboarding</span>
            <span>Patient assistance</span>
          </div>
        </div>

        <div className="site-footer__column">
          <h3>Quick links</h3>
          <nav aria-label="Footer quick links">
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to}>{link.label}</Link>
            ))}
          </nav>
        </div>

        <div className="site-footer__column">
          <h3>Contact</h3>
          <a href="mailto:info@chekameds.co.bw">info@chekameds.co.bw</a>
          <a href="mailto:iblimenterprise@zohomail.com">iblimenterprise@zohomail.com</a>
          <a href={`tel:+${whatsappPrimary}`}>+267 75 560 140</a>
          <a href={`tel:+${whatsappSecondary}`}>+267 72 347 712</a>
        </div>

        <div className="site-footer__column site-footer__support">
          <h3>Support WhatsApp</h3>
          <a className="site-footer__whatsapp" href={`https://wa.me/${whatsappPrimary}`} target="_blank" rel="noreferrer">
            WhatsApp +267 75 560 140
          </a>
          <a className="site-footer__whatsapp site-footer__whatsapp--alt" href={`https://wa.me/${whatsappSecondary}`} target="_blank" rel="noreferrer">
            Backup +267 72 347 712
          </a>
          <p>For pharmacy onboarding, medicine listing issues, video consult support and urgent platform help.</p>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© 2026 ChekaMeds Botswana. All rights reserved.</span>
        <span>Powered by iBlim Enterprise.</span>
      </div>
    </footer>
  );
}
