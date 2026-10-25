import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Smartphone } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';

const WhatsAppDemo = lazy(() => import('@/components/landing/WhatsAppDemo'));
const Moments = lazy(() => import('@/components/landing/Moments'));

const WA_SEARCH = 'https://wa.me/26771424486?text=' + encodeURIComponent('Hi ChekaMeds, I am looking for a medicine. Please help me find a pharmacy with availability.');

/* Shape of the hero card's bar chart. It is decorative and labelled as such. */
const BAR_HEIGHTS = [23, 40, 53, 40, 33, 14, 7, 17, 75, 65, 88, 75, 65, 47, 33, 88, 4, 7, 9, 14, 95, 65, 79, 37, 7, 40, 17, 20, 62, 47, 92, 72];
const MAX_BAR = Math.max(...BAR_HEIGHTS);

const services = [
  { n: '01', title: 'Find a medicine', body: 'Search by brand, generic name or a close spelling and see which pharmacies report it in stock.', to: '/search', cta: 'Search now' },
  { n: '02', title: 'Get it delivered', body: 'Found it? The pharmacy confirms first, then sends a driver. Hand over with your PIN.', to: '/delivery', cta: 'Request delivery' },
  { n: '03', title: 'See a provider by video', body: 'Request a video consultation from home, or with help at a partner pharmacy. The link comes on WhatsApp.', to: '/consultant', cta: 'Request a consult' },
];

const stats = [
  { n: '39', t: 'participating pharmacies' },
  { n: '26,000+', t: 'medicine listings' },
  { n: '1,600+', t: 'medicine searches a month' },
  { n: '24/7', t: 'search on WhatsApp' },
];

export default function Landing() {
  return (
    <div className="cms cm-home">
      <style>{`
        .cm-home{--green:var(--g);--green2:#b9f6d9;--white:#ffffff;--panel:var(--surface);--panel2:var(--surface-2)}
        .cm-home .cm-demo h2,.cm-home .cm-moments-head h2{font-family:Inter,system-ui,sans-serif!important;font-weight:400!important;letter-spacing:-.025em!important;font-size:clamp(1.8rem,3.4vw,2.75rem)!important;line-height:1.05!important}
        .cm-home .cm-beam,.cm-home .cm-floor{display:none!important}
        .cm-home .cm-demo{background:transparent!important}
        .cm-home .cm-demo:before{background:radial-gradient(50% 50% at 75% 40%,rgba(120,140,255,.08),transparent 70%)!important}
        .cm-home .cm-demo:after{display:none!important}
        .cm-home .cm-site{background:none!important}
        .cm-home .cm-browser,.cm-home .cm-phone-front{background:#0c0f24!important;border-color:rgba(255,255,255,.1)!important;border-radius:20px!important}
        .cm-home .cm-bar{background:rgba(255,255,255,.04)!important}
        .cm-home .cm-demo-cta,.cm-home .cm-demo-go{background:#e9e9e9!important;color:#0a0707!important;border-radius:12px!important;font-weight:450!important;box-shadow:none!important}
        .cm-home .cm-moment{border-color:rgba(255,255,255,.1)!important;box-shadow:none!important;border-radius:33px!important}
        .cm-home .cm-moment-cap span{color:rgba(255,255,255,.7)!important}
        .cm-ghero{position:relative;isolation:isolate;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;overflow:hidden;background:#080a19}
        .cm-ghero-bg{position:absolute;inset:0;z-index:-1}
        .cm-ghero-bg img{width:100%;height:100%;object-fit:cover;object-position:68% 30%}
        .cm-ghero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,25,.95) 0%,rgba(8,10,25,.74) 42%,rgba(8,10,25,.38) 100%),radial-gradient(60% 70% at 85% 30%,rgba(94,234,168,.14),transparent 70%),linear-gradient(180deg,transparent 70%,#080a19 100%)}
        .cm-ghero-body{flex:1;display:flex;align-items:center;padding:132px 0 48px}
        .cm-ghero-row{display:flex;flex-direction:column;gap:40px}
        .cm-ghero-copy{max-width:593px}
        .cm-ghero h1{font-size:36px;font-weight:400;line-height:.95;letter-spacing:-.025em;margin:0 0 20px}
        .cm-ghero-sub{color:rgba(255,255,255,.8);font-size:16px;font-weight:450;line-height:1.3;max-width:390px;margin:0 0 28px}
        .cm-ghero-cta{display:flex;flex-wrap:wrap;gap:12px}
        .cm-card-wrap{width:100%;max-width:405px;margin:0 auto}
        .cm-rev{border-radius:24px;background:rgba(17,16,15,.35);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);padding:20px 20px 20px}
        .cm-rev-label{font-size:16px;line-height:20px;margin:0 0 12px}
        .cm-rev-num{margin:0 0 8px;font-size:28px;line-height:1}
        .cm-rev-num span{color:rgba(255,255,255,.2)}
        .cm-rev-delta{display:flex;align-items:center;gap:10px;margin-bottom:24px;font-size:12px;line-height:14px}
        .cm-rev-delta b{font-weight:450;padding:7px 6px;background:rgba(255,255,255,.2);border-radius:6px}
        .cm-rev-delta span{color:rgba(255,255,255,.8);opacity:.7}
        .cm-rev-chart{position:relative}
        .cm-rev-bars{display:flex;align-items:flex-end;gap:1.5px;height:80px}
        .cm-rev-bars i{flex:1;border-radius:.5px}
        .cm-rev-grid{position:absolute;inset:0;pointer-events:none}
        .cm-rev-grid i{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.1)}
        .cm-rev-axis{display:flex;justify-content:space-between;margin-top:12px;font-size:9px;line-height:10px;color:rgba(255,255,255,.8)}
        .cm-rev-note{margin:10px 0 0;font-size:11px;color:rgba(255,255,255,.4)}
        @media(min-width:640px){
          .cm-ghero h1{font-size:52px;margin-bottom:32px}
          .cm-ghero-sub{font-size:18px;margin-bottom:40px}
          .cm-ghero-cta{gap:16px}
          .cm-rev{border-radius:33px;padding:32px 32px 24px}
          .cm-rev-label{font-size:20px;margin-bottom:16px}
          .cm-rev-num{font-size:46px;margin-bottom:12px}
          .cm-rev-delta{font-size:14px;margin-bottom:32px}
          .cm-rev-bars{height:100px}
          .cm-rev-axis{font-size:10px}
        }
        @media(min-width:768px){.cm-ghero h1{font-size:64px}.cm-ghero-sub{font-size:20px}}
        @media(min-width:1024px){
          .cm-ghero h1{font-size:72px}
          .cm-ghero-row{flex-direction:row;align-items:center;justify-content:space-between;gap:48px}
          .cm-card-wrap{margin:0}
        }
        .cm-svc{display:flex;flex-direction:column;gap:12px;transition:border-color .2s}
        .cm-svc:hover{border-color:rgba(255,255,255,.22)}
        .cm-svc-n{font-size:14px;color:var(--dim)}
        .cm-svc h3{font-size:26px;font-weight:400;letter-spacing:-.01em}
        .cm-svc p{color:rgba(255,255,255,.7);line-height:1.5;flex:1}
        .cm-svc .cms-btn{align-self:flex-start;margin-top:8px}
        .cm-split{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .cm-panel{border-radius:var(--r-lg);border:1px solid var(--line);padding:36px;background:var(--surface);display:flex;flex-direction:column;gap:16px}
        .cm-panel.glass{background:rgba(17,16,15,.35);border-color:rgba(255,255,255,.12)}
        .cm-panel h3{font-size:30px;font-weight:400;letter-spacing:-.02em}
        .cm-panel .acts{display:flex;flex-wrap:wrap;gap:12px;margin-top:auto;padding-top:8px}
        .cm-final{margin:96px 0 0;border-radius:33px;padding:48px;display:flex;justify-content:space-between;align-items:center;gap:28px;background:rgba(255,255,255,.04);border:1px solid var(--line)}
        @media(max-width:900px){.cm-split{grid-template-columns:1fr}.cm-final{flex-direction:column;align-items:flex-start;padding:30px}.cm-panel{padding:26px}}
      `}</style>

      <section className="cm-ghero">
        <div className="cm-ghero-bg" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet="/media/hero-elder-sm.webp" />
            <img src="/media/hero-elder.webp" alt="" width="2100" height="1179" fetchPriority="high" decoding="async" />
          </picture>
        </div>

        <SiteHeader overlay />

        <div className="cm-ghero-body">
          <div className="cms-wrap cm-ghero-row">
            <div className="cm-ghero-copy">
              <h1 className="cms-a-up" style={{ animationDelay: '300ms' }}>Find your medicine before you leave home</h1>
              <p className="cm-ghero-sub cms-a-up" style={{ animationDelay: '500ms' }}>See which pharmacies near you report it in stock, on WhatsApp or the web</p>
              <div className="cm-ghero-cta cms-a-up" style={{ animationDelay: '700ms' }}>
                <Link to="/search" className="cms-btn cms-btn-p">Search for medicine</Link>
                <a href={WA_SEARCH} target="_blank" rel="noreferrer" className="cms-btn cms-btn-g">WhatsApp 71 424 486</a>
              </div>
            </div>

            <div className="cm-card-wrap cms-a-scale" style={{ animationDelay: '900ms' }}>
              <div className="cm-rev">
                <p className="cm-rev-label">Medicine listings</p>
                <p className="cm-rev-num">26,000<span>+</span></p>
                <div className="cm-rev-delta"><b>39 pharmacies</b><span>across Botswana</span></div>
                <div className="cm-rev-chart" aria-hidden="true">
                  <div className="cm-rev-bars">
                    {BAR_HEIGHTS.map((h, i) => (
                      <i key={i} className="cms-bar" style={{ height: `${(h / MAX_BAR) * 100}%`, background: i >= 28 ? 'rgba(255,255,255,0.1)' : '#ffffff', animationDelay: `${1100 + i * 30}ms` }} />
                    ))}
                  </div>
                  <div className="cm-rev-grid">
                    {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ left: `${((i + 1) / 5) * 100}%` }} />)}
                  </div>
                  <div className="cm-rev-axis">
                    {['Mon', 'Wed', 'Fri', 'Sat', 'Sun'].map((d, i) => <span key={d} style={{ opacity: i >= 3 ? 0.4 : 1 }}>{d}</span>)}
                  </div>
                </div>
                <p className="cm-rev-note">Illustration of search activity</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="cms-wrap">
        <div className="cms-stats" style={{ ['--n' as string]: 4 }} aria-label="ChekaMeds in numbers">
          {stats.map((s) => <div key={s.t} className="cms-stat"><b>{s.n}</b><span>{s.t}</span></div>)}
        </div>

        <section className="cms-section" id="services">
          <div className="cms-head">
            <h2 className="cms-h2">Everything you need to get your medicine</h2>
            <p className="cms-sub">Find it, have it delivered, or speak to a provider first. All from your phone.</p>
          </div>
          <div className="cms-grid-3">
            {services.map((s) => (
              <div key={s.to} className="cms-card cm-svc">
                <span className="cm-svc-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <Link to={s.to} className="cms-btn cms-btn-g cms-btn-sm" style={{ borderColor: 'rgba(255,255,255,.35)' }}>{s.cta}</Link>
              </div>
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
              <h3>List your pharmacy</h3>
              <ul className="cms-ticks">
                <li><Check size={17} /><span>Appear when patients search for medicines you stock</span></li>
                <li><Check size={17} /><span>Take reservations and delivery requests</span></li>
                <li><Check size={17} /><span>Update stock in minutes with barcode scanning</span></li>
              </ul>
              <div className="acts">
                <Link to="/register" className="cms-btn cms-btn-p">List your pharmacy</Link>
                <Link to="/facilities" className="cms-btn cms-btn-g">See the directory</Link>
              </div>
            </div>
            <div className="cm-panel glass">
              <h3>License ChekaMeds in your country</h3>
              <ul className="cms-ticks">
                <li><Smartphone size={17} /><span>WhatsApp and USSD medicine search, ready to launch</span></li>
                <li><Check size={17} /><span>Pharmacy dashboard and demand insights included</span></li>
                <li><Check size={17} /><span>Pilots from US$1,000 for 90 days</span></li>
              </ul>
              <div className="acts">
                <Link to="/partners" className="cms-btn cms-btn-p">See partner options</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="cm-final">
          <div>
            <h2 className="cms-h2">Looking for a medicine right now?</h2>
            <p className="cms-sub" style={{ marginTop: 12 }}>Type the name and your town. We'll show you where to go.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/search" className="cms-btn cms-btn-p">Find medicine <ArrowRight size={16} /></Link>
            <a href={WA_SEARCH} target="_blank" rel="noreferrer" className="cms-btn cms-btn-g">Ask on WhatsApp</a>
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
