import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BarChart3, Building2, Check, MessageCircle, Search, ShieldCheck, Smartphone, Store, Truck, Video,
} from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';

const WhatsAppDemo = lazy(() => import('@/components/landing/WhatsAppDemo'));
const Moments = lazy(() => import('@/components/landing/Moments'));

const WA_SEARCH = 'https://wa.me/26771424486?text=' + encodeURIComponent('Hi ChekaMeds, I am looking for a medicine. Please help me find a pharmacy with availability.');

const stats = [
  { n: '39', t: 'participating pharmacies' },
  { n: '26,000+', t: 'medicine listings' },
  { n: '1,600+', t: 'medicine searches a month' },
  { n: '24/7', t: 'search on WhatsApp' },
];

const services = [
  { icon: Search, title: 'Find a medicine', body: 'Search by brand, generic name or even a misspelling. See which pharmacies report it in stock.', to: '/search', cta: 'Search now' },
  { icon: Truck, title: 'Get it delivered', body: 'Found it? Ask the pharmacy to deliver. They confirm first, then send a driver.', to: '/delivery', cta: 'Request delivery' },
  { icon: Video, title: 'See a provider by video', body: 'Request a video consultation from home, or with help at a partner pharmacy or clinic.', to: '/consultant', cta: 'Request a consult' },
];

export default function Landing() {
  return (
    <div className="cms cm-home">
      <style>{`
        .cm-home{--green:var(--g);--green2:#a4ffd2;--white:#f4fff9;--panel:var(--surface);--panel2:var(--surface-2)}
        .cm-home .cm-demo h2,.cm-home .cm-moments-head h2{font-weight:800!important;letter-spacing:-.035em!important;font-size:clamp(1.75rem,3.2vw,2.55rem)!important;line-height:1.1!important}
        .cm-hero2{position:relative;isolation:isolate;overflow:hidden;border-bottom:1px solid var(--line)}
        .cm-hero2-img{position:absolute;inset:0;z-index:-2}
        .cm-hero2-img img{position:absolute;top:0;right:0;width:72%;height:100%;object-fit:cover;object-position:20% 35%;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 38%);mask-image:linear-gradient(90deg,transparent 0,#000 38%)}
        .cm-hero2-img::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,var(--bg) 0%,rgba(5,10,8,.92) 32%,rgba(5,10,8,.35) 64%,rgba(5,10,8,.1) 100%),linear-gradient(180deg,transparent 60%,var(--bg) 100%)}
        .cm-hero2-in{min-height:min(78vh,700px);display:flex;flex-direction:column;justify-content:center;padding:72px 0 64px;max-width:640px}
        .cm-hero2 .cms-h1{margin:18px 0 18px;font-size:clamp(2.6rem,5.6vw,4.4rem)}
        .cm-hero2-acts{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
        .cm-hero2-trust{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:26px;color:var(--muted);font-size:.88rem}
        .cm-hero2-trust span{display:inline-flex;align-items:center;gap:7px}
        .cm-hero2-trust svg{color:var(--g)}
        .cm-stats-band{margin-top:-1px;padding:28px 0 0}
        .cm-svc{display:flex;flex-direction:column;transition:border-color .2s,transform .2s}
        .cm-svc:hover{border-color:var(--g-line);transform:translateY(-2px)}
        .cm-svc p{flex:1}
        .cm-svc .cms-link{margin-top:18px}
        .cm-split{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .cm-panel{position:relative;overflow:hidden;border-radius:var(--r-lg);border:1px solid var(--line);padding:34px;background:var(--surface);display:flex;flex-direction:column;gap:14px}
        .cm-panel.hl{background:radial-gradient(circle at 100% 0,rgba(41,242,154,.14),transparent 50%),var(--surface);border-color:var(--g-line)}
        .cm-panel ul{margin:6px 0 10px}
        .cm-panel .cm-panel-acts{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;padding-top:8px}
        .cm-final{margin:88px 0 0;border-radius:var(--r-lg);border:1px solid var(--g-line);padding:44px;display:flex;justify-content:space-between;align-items:center;gap:28px;background:radial-gradient(ellipse at 0 100%,rgba(41,242,154,.12),transparent 55%),var(--surface)}
        .cm-final-acts{display:flex;gap:10px;flex-wrap:wrap}
        @media(max-width:900px){.cm-split{grid-template-columns:1fr}.cm-final{flex-direction:column;align-items:flex-start;padding:30px}}
        @media(max-width:700px){
          .cm-hero2-img{bottom:auto;height:300px}
          .cm-hero2-img img{width:100%;-webkit-mask-image:none;mask-image:none;object-position:30% 30%}
          .cm-hero2-img::after{background:linear-gradient(180deg,rgba(5,10,8,.15) 0%,rgba(5,10,8,.2) 50%,var(--bg) 100%)}
          .cm-hero2-in{min-height:0;padding:250px 0 40px}
          .cm-hero2-acts .cms-btn{flex:1 1 100%}
          .cm-panel{padding:24px}
        }
      `}</style>

      <SiteHeader />

      <section className="cm-hero2">
        <div className="cm-hero2-img" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet="/media/hero-elder-sm.webp" />
            <img src="/media/hero-elder.webp" alt="" width="2100" height="1179" fetchPriority="high" decoding="async" />
          </picture>
        </div>
        <div className="cms-wrap">
          <div className="cm-hero2-in">
            <span className="cms-eyebrow"><i /> Built in Botswana</span>
            <h1 className="cms-h1">Know which pharmacy has your medicine <em>before you go.</em></h1>
            <p className="cms-lead">Search on the website or on WhatsApp and see participating pharmacies that report your medicine in stock. No more calling around or wasted trips.</p>
            <div className="cm-hero2-acts">
              <Link to="/search" className="cms-btn cms-btn-p"><Search size={17} /> Search for medicine</Link>
              <a href={WA_SEARCH} target="_blank" rel="noreferrer" className="cms-btn cms-btn-g"><MessageCircle size={17} /> WhatsApp 71 424 486</a>
            </div>
            <div className="cm-hero2-trust">
              <span><Check size={15} /> Free to use</span>
              <span><Check size={15} /> No app or account</span>
              <span><Check size={15} /> Works on any phone</span>
            </div>
          </div>
        </div>
      </section>

      <div className="cms-wrap cm-stats-band">
        <div className="cms-stats" style={{ ['--n' as string]: 4 }} aria-label="ChekaMeds in numbers">
          {stats.map((s) => <div key={s.t} className="cms-stat"><b>{s.n}</b><span>{s.t}</span></div>)}
        </div>
      </div>

      <div className="cms-wrap">
        <section className="cms-section" id="services">
          <div className="cms-head">
            <h2 className="cms-h2">Everything you need to get your medicine.</h2>
            <p className="cms-sub">Find it, have it delivered, or speak to a provider first. All from your phone.</p>
          </div>
          <div className="cms-grid-3">
            {services.map((s) => (
              <Link key={s.to} to={s.to} className="cms-card cm-svc">
                <span className="cms-icon"><s.icon size={21} /></span>
                <h3 className="cms-h3">{s.title}</h3>
                <p>{s.body}</p>
                <span className="cms-link">{s.cta} <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <Suspense fallback={null}>
        <div style={{ paddingTop: 40 }}><WhatsAppDemo /></div>
        <Moments />
      </Suspense>

      <div className="cms-wrap">
        <section id="for-pharmacies">
          <div className="cms-head">
            <h2 className="cms-h2">For pharmacies and partners</h2>
            <p className="cms-sub">Patients are already searching. Make sure they find you, or bring ChekaMeds to your country.</p>
          </div>
          <div className="cm-split">
            <div className="cm-panel">
              <span className="cms-icon" style={{ marginBottom: 0 }}><Store size={21} /></span>
              <h3 className="cms-h3" style={{ fontSize: '1.35rem' }}>List your pharmacy</h3>
              <ul className="cms-ticks">
                <li><Check size={17} /><span>Appear when patients search for medicines you stock</span></li>
                <li><Check size={17} /><span>Take reservations and delivery requests</span></li>
                <li><Check size={17} /><span>Update stock in minutes with barcode scanning</span></li>
              </ul>
              <div className="cm-panel-acts">
                <Link to="/register" className="cms-btn cms-btn-p">List your pharmacy</Link>
                <Link to="/facilities" className="cms-btn cms-btn-g"><Building2 size={16} /> See the directory</Link>
              </div>
            </div>
            <div className="cm-panel hl">
              <span className="cms-icon" style={{ marginBottom: 0 }}><BarChart3 size={21} /></span>
              <h3 className="cms-h3" style={{ fontSize: '1.35rem' }}>License ChekaMeds in your country</h3>
              <ul className="cms-ticks">
                <li><Smartphone size={17} /><span>WhatsApp and USSD medicine search, ready to launch</span></li>
                <li><Check size={17} /><span>Pharmacy dashboard and demand insights included</span></li>
                <li><Check size={17} /><span>Pilots from US$1,000 for 90 days</span></li>
              </ul>
              <div className="cm-panel-acts">
                <Link to="/partners" className="cms-btn cms-btn-p">See partner options <ArrowUpRight size={16} /></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="cm-final">
          <div>
            <h2 className="cms-h2">Looking for a medicine right now?</h2>
            <p className="cms-sub" style={{ marginTop: 10 }}>Type the name and your town. We'll show you where to go.</p>
          </div>
          <div className="cm-final-acts">
            <Link to="/search" className="cms-btn cms-btn-p"><Search size={17} /> Find medicine</Link>
            <a href={WA_SEARCH} target="_blank" rel="noreferrer" className="cms-btn cms-btn-g"><MessageCircle size={17} /> Ask on WhatsApp</a>
          </div>
        </section>
        <p className="cms-fine" style={{ margin: '18px 0 80px', display: 'flex', gap: 8 }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          Availability is reported by participating pharmacies and can change. Always contact the pharmacy to confirm stock, price and opening hours before travelling. ChekaMeds does not replace professional medical advice.
        </p>
      </div>
    </div>
  );
}
