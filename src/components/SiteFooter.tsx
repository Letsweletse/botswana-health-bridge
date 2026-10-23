import logoMark from '@/assets/chekameds-mark.webp';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const WA_PRIMARY = '26775560140';
const WA_SEARCH = '26771424486';

const cols = [
  {
    title: 'Patients',
    links: [
      { label: 'Find medicine', to: '/search' },
      { label: 'Request delivery', to: '/delivery' },
      { label: 'Video consultation', to: '/consultant' },
    ],
  },
  {
    title: 'Pharmacies & partners',
    links: [
      { label: 'Pharmacy directory', to: '/facilities' },
      { label: 'List your pharmacy', to: '/register' },
      { label: 'License ChekaMeds', to: '/partners' },
      { label: 'Pharmacy login', to: '/login' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="cms cm-ft2" id="support" style={{ minHeight: 0 }}>
      <style>{`
        .cm-ft2{border-top:1px solid var(--line);background:#040806}
        .cm-ft2-in{padding:56px 0 28px;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:40px}
        .cm-ft2-brand p{margin-top:14px;color:var(--muted);font-size:.92rem;line-height:1.6;max-width:340px}
        .cm-ft2 h3{font:700 .8rem var(--body);color:var(--dim);letter-spacing:.02em;margin-bottom:14px}
        .cm-ft2 nav{display:grid;gap:10px}
        .cm-ft2 nav a{color:var(--ink-2);font-size:.92rem}
        .cm-ft2 nav a:hover{color:#fff}
        .cm-ft2-wa{display:inline-flex;align-items:center;gap:8px;margin-bottom:4px;color:var(--g)!important;font-weight:700}
        .cm-ft2-legal{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 20px;border-top:1px solid var(--line);padding:18px 0 26px;font-size:.8rem;color:var(--dim)}
        @media(max-width:900px){.cm-ft2-in{grid-template-columns:1fr 1fr}.cm-ft2-brand{grid-column:1/-1}}
        @media(max-width:520px){.cm-ft2-in{grid-template-columns:1fr;gap:28px;padding-top:44px}}
      `}</style>
      <div className="cms-wrap">
        <div className="cm-ft2-in">
          <div className="cm-ft2-brand">
            <Link to="/" className="cms-brand" aria-label="ChekaMeds home">
              <img src={logoMark} alt="" width="34" height="34" />
              <span>Cheka<span>Meds</span></span>
            </Link>
            <p>Know what's in stock before you travel. Medicine search, pharmacy discovery, delivery and video consultation, built in Botswana.</p>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h3>{c.title}</h3>
              <nav aria-label={c.title}>
                {c.links.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
              </nav>
            </div>
          ))}

          <div>
            <h3>Talk to us</h3>
            <nav aria-label="Contact">
              <a className="cm-ft2-wa" href={`https://wa.me/${WA_SEARCH}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Search on WhatsApp</a>
              <a href={`tel:+${WA_PRIMARY}`}>Support +267 75 560 140</a>
              <a href="tel:+26772347712">+267 72 347 712</a>
              <a href="mailto:info@chekameds.co.bw">info@chekameds.co.bw</a>
            </nav>
          </div>
        </div>
        <div className="cm-ft2-legal">
          <p>© 2026 ChekaMeds Botswana. Operated by IBLIM Enterprises (Pty) Ltd.</p>
          <p>Availability is reported by pharmacies. Always confirm stock before travelling.</p>
        </div>
      </div>
    </footer>
  );
}
