import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import heroBg from '@/assets/hero-bg.png';
import { consultantVideoImage } from '@/assets/consultantVideoImage';

const words = ['faster', 'smarter', 'safely', 'instantly'];

const Landing = () => {
  const navigate = useNavigate();
  const [wordIndex, setWordIndex] = useState(0);
  const [wordClass, setWordClass] = useState('');

  useEffect(() => {
    const progress = document.getElementById('progress');
    const nav = document.querySelector('.cm-nav') as HTMLElement | null;

    const onScroll = () => {
      if (progress) {
        const max = document.body.scrollHeight - window.innerHeight;
        progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
      }
      if (nav) nav.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(13,27,42,0.07)' : 'none';
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal, .feat-item, .s-card, .section-eyebrow, .section-title, .section-body, .consult-btns, .secure-row').forEach((el) => observer.observe(el));

    let index = 0;
    const timer = window.setInterval(() => {
      setWordClass('slide-out');
      window.setTimeout(() => {
        index = (index + 1) % words.length;
        setWordIndex(index);
        setWordClass('slide-in');
        window.setTimeout(() => setWordClass(''), 420);
      }, 350);
    }, 2600);

    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="cm-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap');
        .cm-page{--ink:#0d1b2a;--ink-mid:#2c3e50;--ink-soft:#6b7c93;--ink-faint:#a8b8c8;--white:#fff;--off-white:#f6f8fa;--accent:#1a6b4a;--accent-light:#e6f3ed;--accent-mid:#2d9768;--rule:rgba(13,27,42,.08);--shadow-md:0 8px 40px rgba(13,27,42,.10);font-family:'DM Sans',sans-serif;background:var(--white);color:var(--ink);overflow-x:hidden;-webkit-font-smoothing:antialiased}.cm-page *,.cm-page *::before,.cm-page *::after{box-sizing:border-box}#progress{position:fixed;top:0;left:0;height:2px;width:0;background:var(--accent);z-index:500;transition:width .08s linear}
        .cm-nav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:0 4rem;height:68px;background:rgba(255,255,255,.97);backdrop-filter:blur(20px) saturate(1.4);border-bottom:1px solid var(--rule);opacity:0;animation:navIn .5s .1s ease forwards}@keyframes navIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}.logo{font-family:'DM Serif Display',serif;font-size:1.5rem;color:var(--ink);letter-spacing:-.3px;text-decoration:none}.logo em{color:var(--accent);font-style:normal}.nav-links{display:flex;gap:2.4rem;list-style:none;margin:0;padding:0}.nav-links a{font-size:.83rem;font-weight:400;letter-spacing:.3px;color:var(--ink-soft);text-decoration:none;transition:color .2s;position:relative;padding-bottom:2px}.nav-links a::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:1px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .25s ease}.nav-links a:hover{color:var(--ink)}.nav-links a:hover::after{transform:scaleX(1)}.nav-actions{display:flex;align-items:center;gap:1rem}.btn-ghost{font-size:.83rem;color:var(--ink-mid);background:none;border:none;cursor:pointer;padding:.45rem .9rem;border-radius:4px;transition:background .2s,color .2s;text-decoration:none}.btn-ghost:hover{background:var(--off-white);color:var(--ink)}.btn-cta{font-size:.83rem;font-weight:500;letter-spacing:.2px;padding:.52rem 1.3rem;background:var(--ink);color:white;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:.45rem;transition:background .2s,transform .15s;text-decoration:none}.btn-cta:hover{background:var(--accent);transform:translateY(-1px)}
        .hero{padding-top:68px;display:flex;flex-direction:column;position:relative}.hero-visual{position:relative;width:100%;overflow:hidden;background:var(--ink)}.hero-visual img{width:100%;display:block;opacity:0;animation:imgFadeIn 1.1s .4s ease forwards}@keyframes imgFadeIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}.hero-overlay{position:absolute;inset:0;background:linear-gradient(105deg,rgba(13,27,42,.76) 0%,rgba(13,27,42,.50) 42%,rgba(13,27,42,.08) 72%,transparent 100%)}.hero-text{position:absolute;top:50%;left:0;transform:translateY(-50%);padding:0 4.5rem;max-width:680px;z-index:2}.eyebrow{display:inline-flex;align-items:center;gap:.6rem;font-size:.7rem;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--accent-mid);margin-bottom:1.6rem;opacity:0;animation:fadeUp .6s .7s ease forwards}.eyebrow-line{width:24px;height:1px;background:var(--accent-mid)}.hero-title{font-family:'DM Serif Display',serif;font-size:4.2rem;line-height:1.07;letter-spacing:-.5px;color:white;margin:0 0 1.4rem;opacity:0;animation:fadeUp .7s .85s ease forwards}.hero-title em{color:var(--accent-mid);font-style:italic;display:inline-block;position:relative;min-width:210px}.hero-title em::after{content:'';position:absolute;bottom:4px;left:0;right:0;height:2px;background:var(--accent-mid);opacity:.5;transform:scaleX(0);transform-origin:left;animation:lineGrow .6s 1.6s ease forwards}@keyframes lineGrow{to{transform:scaleX(1)}}.word-rotate-wrap{display:inline-block;overflow:hidden;vertical-align:bottom}.word-rotate{display:inline-block}.word-rotate.slide-out{animation:slideOut .35s ease forwards}.word-rotate.slide-in{animation:slideIn .4s ease forwards}@keyframes slideOut{to{transform:translateY(-100%);opacity:0}}@keyframes slideIn{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.typed-cursor{display:inline-block;width:2px;height:.85em;background:var(--accent-mid);margin-left:1px;vertical-align:middle;animation:blink .9s step-end infinite}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .hero-body{font-size:1.05rem;line-height:1.8;color:rgba(255,255,255,.78);max-width:460px;font-weight:300;margin-bottom:2.2rem;opacity:0;animation:fadeUp .7s 1s ease forwards}.hero-actions{display:flex;gap:.9rem;align-items:center;opacity:0;animation:fadeUp .7s 1.15s ease forwards}.btn-primary{display:inline-flex;align-items:center;gap:.6rem;font-size:.88rem;font-weight:500;letter-spacing:.2px;padding:.85rem 1.9rem;background:var(--accent);color:white;border:none;border-radius:4px;cursor:pointer;transition:all .2s;box-shadow:0 4px 24px rgba(26,107,74,.30);text-decoration:none}.btn-primary:hover{background:#155c3e;transform:translateY(-2px);box-shadow:0 8px 32px rgba(26,107,74,.35)}.btn-secondary{display:inline-flex;align-items:center;gap:.5rem;font-size:.88rem;font-weight:400;color:rgba(255,255,255,.85);background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);padding:.85rem 1.6rem;border-radius:4px;cursor:pointer;backdrop-filter:blur(8px);transition:all .2s;text-decoration:none}.btn-secondary:hover{background:rgba(255,255,255,.2);color:white}.hero-stats{background:var(--ink);padding:1.8rem 4.5rem;display:flex;align-items:center;gap:0;opacity:0;animation:fadeUp .6s 1.3s ease forwards}.stat-item{flex:1;padding:0 2.5rem;border-right:1px solid rgba(255,255,255,.08)}.stat-item:first-child{padding-left:0}.stat-item:last-child{border-right:none}.stat-num{font-family:'DM Serif Display',serif;font-size:2rem;color:white;line-height:1;display:flex;align-items:baseline;gap:.1rem}.stat-num sup{font-size:1.1rem;color:var(--accent-mid);font-family:'DM Sans',sans-serif;font-weight:500}.stat-label{font-size:.73rem;color:rgba(255,255,255,.4);margin-top:.3rem;letter-spacing:.5px;font-weight:300}
        .features-strip{border-bottom:1px solid var(--rule);padding:2.4rem 4.5rem;display:grid;grid-template-columns:repeat(4,1fr);background:var(--white)}.feat-item{display:flex;align-items:flex-start;gap:1rem;padding-right:2.5rem;border-right:1px solid var(--rule);opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease}.feat-item:last-child{border-right:none;padding-right:0}.feat-item.visible{opacity:1;transform:translateY(0)}.feat-icon{width:38px;height:38px;flex-shrink:0;border-radius:6px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;transition:background .2s}.feat-item:hover .feat-icon{background:var(--accent)}.feat-item:hover .feat-icon svg{stroke:white}.feat-icon svg{width:17px;height:17px;stroke:var(--accent);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:stroke .2s}.feat-title{font-size:.86rem;font-weight:500;color:var(--ink);margin-bottom:.2rem}.feat-desc{font-size:.77rem;color:var(--ink-soft);line-height:1.65;font-weight:300}
        .consult{display:grid;grid-template-columns:1fr 1fr;overflow:hidden;border-top:1px solid var(--rule)}.consult-img-col{position:relative;overflow:hidden;background:var(--off-white);min-height:520px}.consult-img-col img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .8s ease}.consult-img-col:hover img{transform:scale(1.02)}.consult-img-gradient{position:absolute;inset:0;background:linear-gradient(to right,transparent 60%,var(--white) 100%);pointer-events:none}.consult-content{display:flex;flex-direction:column;justify-content:center;padding:5.5rem 5rem 5.5rem 4rem}.section-eyebrow{font-size:.7rem;letter-spacing:2px;text-transform:uppercase;color:var(--accent);font-weight:500;display:flex;align-items:center;gap:.6rem;margin-bottom:1.4rem;opacity:0;transition:opacity .5s ease,transform .5s ease;transform:translateY(12px)}.section-eyebrow::before{content:'';width:20px;height:1px;background:var(--accent)}.section-eyebrow.visible{opacity:1;transform:translateY(0)}.section-title{font-family:'DM Serif Display',serif;font-size:3rem;line-height:1.1;letter-spacing:-.3px;color:var(--ink);margin:0 0 1.3rem;opacity:0;transform:translateY(16px);transition:opacity .6s .1s ease,transform .6s .1s ease}.section-title.visible{opacity:1;transform:translateY(0)}.section-title em{color:var(--accent);font-style:italic}.section-body{font-size:.98rem;line-height:1.85;color:var(--ink-soft);font-weight:300;max-width:420px;margin-bottom:2.2rem;opacity:0;transform:translateY(16px);transition:opacity .6s .2s ease,transform .6s .2s ease}.section-body.visible{opacity:1;transform:translateY(0)}.consult-btns{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin-bottom:1.6rem;opacity:0;transform:translateY(12px);transition:opacity .5s .3s ease,transform .5s .3s ease}.consult-btns.visible{opacity:1;transform:translateY(0)}.btn-p,.btn-s{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;font-size:.86rem;font-weight:500;padding:.9rem 1.2rem;border-radius:4px;cursor:pointer;transition:all .2s;text-decoration:none}.btn-p{background:var(--accent);color:white;border:1px solid var(--accent);box-shadow:0 4px 20px rgba(26,107,74,.22)}.btn-p:hover{background:#155c3e;transform:translateY(-1px)}.btn-s{color:var(--ink-mid);background:none;border:1px solid var(--rule)}.btn-s:hover{border-color:rgba(13,27,42,.2);color:var(--ink)}.secure-row{font-size:.73rem;color:var(--ink-faint);display:flex;align-items:center;gap:.45rem;font-weight:300;opacity:0;transition:opacity .5s .4s ease}.secure-row.visible{opacity:1}
        .services{padding:5rem 4.5rem;background:var(--off-white);border-top:1px solid var(--rule)}.services-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:3rem}.services-header .section-title{margin-bottom:0;font-size:2.5rem}.services-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem}.s-card{background:white;border-radius:8px;border:1px solid var(--rule);overflow:hidden;opacity:0;transform:translateY(18px);transition:opacity .55s ease,transform .55s ease,box-shadow .3s,border-color .3s;cursor:pointer;display:flex;flex-direction:column;min-height:260px}.s-card.visible{opacity:1;transform:translateY(0)}.s-card:hover{box-shadow:var(--shadow-md);border-color:rgba(26,107,74,.2);transform:translateY(-4px)!important}.s-img-wrap{overflow:hidden;width:100%;height:120px;background:linear-gradient(135deg,#e6f3ed,#fff);display:flex;align-items:center;justify-content:center}.s-img-icon{width:54px;height:54px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center}.s-img-icon svg{width:26px;height:26px;stroke:var(--accent);fill:none;stroke-width:1.8}.s-body{padding:1.1rem 1.2rem 1.3rem;display:flex;flex-direction:column;flex:1}.s-tag{font-size:.65rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);font-weight:500;margin-bottom:.5rem}.s-name{font-size:.92rem;font-weight:500;color:var(--ink);margin-bottom:.3rem;line-height:1.3}.s-desc{font-size:.77rem;color:var(--ink-soft);line-height:1.6;font-weight:300}.s-link{display:inline-flex;align-items:center;justify-content:center;gap:.3rem;font-size:.74rem;color:white;background:var(--accent);font-weight:500;margin-top:auto;text-decoration:none;transition:gap .2s;padding:.72rem .8rem;border-radius:4px}.s-card:hover .s-link{gap:.55rem}
        .partners{padding:2rem 4.5rem;display:flex;align-items:center;gap:4rem;border-top:1px solid var(--rule);background:var(--white)}.p-label{font-size:.72rem;color:var(--ink-faint);letter-spacing:.5px;white-space:nowrap;font-weight:300}.p-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;flex:1}.p-name{font-family:'DM Serif Display',serif;font-size:.95rem;color:var(--ink-soft);transition:color .2s;cursor:default;border:1px solid var(--rule);padding:1rem;text-align:center}.p-name:hover{color:var(--accent)}.cm-footer{padding:2rem 4.5rem;background:var(--ink);display:flex;align-items:center;justify-content:space-between}.f-logo{font-family:'DM Serif Display',serif;font-size:1.25rem;color:white}.f-logo em{color:var(--accent-mid);font-style:normal}.f-links{display:flex;gap:2rem;list-style:none;margin:0;padding:0}.f-links a{font-size:.77rem;color:rgba(255,255,255,.35);text-decoration:none;transition:color .2s;letter-spacing:.2px}.f-links a:hover{color:rgba(255,255,255,.75)}.f-copy{font-size:.72rem;color:rgba(255,255,255,.25);font-weight:300}.reveal{opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease}.reveal.visible{opacity:1;transform:translateY(0)}@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:980px){.cm-nav{padding:0 1.25rem}.nav-links{display:none}.hero-text{position:relative;transform:none;top:auto;padding:2rem 1.25rem;background:var(--ink);max-width:none}.hero-overlay{display:none}.hero-title{font-size:2.8rem}.hero-title em{min-width:150px}.hero-stats,.features-strip,.services,.partners,.cm-footer{padding-left:1.25rem;padding-right:1.25rem}.hero-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem}.stat-item{border-right:0;padding:0}.features-strip,.services-grid,.p-row{grid-template-columns:1fr}.feat-item{border-right:0;border-bottom:1px solid var(--rule);padding:0 0 1rem}.consult{grid-template-columns:1fr}.consult-img-col{min-height:300px}.consult-content{padding:3rem 1.25rem}.services-header{display:block}.partners,.cm-footer{display:block}.p-row{margin-top:1rem}.f-links{margin:1rem 0;flex-wrap:wrap}.consult-btns,.hero-actions{grid-template-columns:1fr;flex-direction:column;align-items:stretch}.btn-primary,.btn-secondary,.btn-p,.btn-s{justify-content:center}}
      `}</style>

      <div id="progress" />

      <nav className="cm-nav">
        <Link to="/" className="logo">Cheka<em>Meds</em></Link>
        <ul className="nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#consultants">Consultants</a></li>
          <li><Link to="/facilities">Pharmacies</Link></li>
          <li><a href="#services">About</a></li>
          <li><a href="#help">Help</a></li>
        </ul>
        <div className="nav-actions">
          <Link to="/dashboard" className="btn-ghost">Log in</Link>
          <button className="btn-cta" onClick={() => navigate('/search')}>Get started</button>
        </div>
      </nav>

      <section className="hero" id="how">
        <div className="hero-visual">
          <img src={heroBg} alt="ChekaMeds medicine availability platform" />
          <div className="hero-overlay" />
          <div className="hero-text">
            <div className="eyebrow"><span className="eyebrow-line" /> Medicine availability platform</div>
            <h1 className="hero-title">Find medicines <span className="word-rotate-wrap"><em className={`word-rotate ${wordClass}`}>{words[wordIndex]}</em></span><span className="typed-cursor" /></h1>
            <p className="hero-body">Search medicine availability across partner pharmacies and clinics. Start on WhatsApp or use direct search — no app required.</p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate('/search')}>Search medicine <ArrowSvg /></button>
              <button className="btn-secondary" onClick={() => navigate('/consultant')}>Request virtual care</button>
            </div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-item"><div className="stat-num">24<sup>/7</sup></div><div className="stat-label">WhatsApp access</div></div>
          <div className="stat-item"><div className="stat-num">0<sup>app</sup></div><div className="stat-label">No download required</div></div>
          <div className="stat-item"><div className="stat-num">2<sup>ways</sup></div><div className="stat-label">Home or facility support</div></div>
          <div className="stat-item"><div className="stat-num">BW</div><div className="stat-label">Built for Botswana</div></div>
        </div>
      </section>

      <section className="features-strip">
        <Feature icon="search" title="Check medicine availability" desc="Search partner pharmacies and clinics near you." />
        <Feature icon="whatsapp" title="Instant on WhatsApp" desc="Simple, fast and convenient. No app required." />
        <Feature icon="shield" title="Trusted partners" desc="Verified pharmacies, clinics and provider workflows." />
        <Feature icon="clock" title="Always available" desc="Support and search when you need it." />
      </section>

      <section className="consult" id="consultants">
        <div className="consult-img-col">
          <img src={consultantVideoImage} alt="Older patient doing a video consultation at home" />
          <div className="consult-img-gradient" />
        </div>
        <div className="consult-content">
          <div className="section-eyebrow">Virtual consultation</div>
          <h2 className="section-title">Care from <em>anywhere</em></h2>
          <p className="section-body">Request provider support from home, or choose a partner pharmacy or clinic where staff can assist with symptom capture, video setup and medicine collection.</p>
          <div className="consult-btns">
            <button className="btn-p" onClick={() => navigate('/consultant')}>Book a consultation</button>
            <button className="btn-s" onClick={() => navigate('/search')}>Find medicine first</button>
          </div>
          <div className="secure-row"><LockSvg /> Private. Secure. Provider-led.</div>
        </div>
      </section>

      <section className="services" id="services">
        <div className="services-header"><h2 className="section-title visible">How ChekaMeds helps</h2></div>
        <div className="services-grid">
          <Service icon="pill" tag="Medicine search" name="Find listed stock" desc="Search for medicines and see where stock is listed across participating facilities." />
          <Service icon="home" tag="Home consultation" name="Care from home" desc="Request provider support and receive a video link after review." />
          <Service icon="building" tag="Clinic support" name="Assisted care" desc="Partner facilities can help patients connect to providers by video." />
          <Service icon="support" tag="24/7 support" name="Always here for you" desc="Patients can use WhatsApp and public search without complex onboarding." />
        </div>
      </section>

      <div className="partners reveal">
        <div className="p-label">Working with trusted pharmacies and clinics across Botswana</div>
        <div className="p-row">
          <div className="p-name">South West Pharma</div>
          <div className="p-name">J-Mecca Pharmacy</div>
          <div className="p-name">Partner Clinics</div>
          <div className="p-name">ChekaMeds Admin</div>
        </div>
      </div>

      <footer className="cm-footer" id="help">
        <div className="f-logo">Cheka<em>Meds</em></div>
        <ul className="f-links">
          <li><Link to="/search">Find Medicine</Link></li>
          <li><Link to="/consultant">Consultant</Link></li>
          <li><Link to="/dashboard">Staff Portal</Link></li>
          <li><a href="https://wa.me/26771424486">Contact</a></li>
        </ul>
        <div className="f-copy">© 2026 ChekaMeds · Gaborone, Botswana</div>
      </footer>
    </div>
  );
};

const ArrowSvg = () => <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
const LockSvg = () => <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;

const Icon = ({ type }: { type: string }) => {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', style: { stroke: 'currentColor', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const } };
  if (type === 'search') return <svg {...common}><circle cx="11" cy="11" r="7" /><line x1="16.65" y1="16.65" x2="21" y2="21" /></svg>;
  if (type === 'whatsapp') return <svg {...common}><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8.5 8.5c.4 3 3 5.6 6 6" /></svg>;
  if (type === 'shield') return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (type === 'clock') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (type === 'pill') return <svg {...common}><path d="m10 21 10-10a5 5 0 0 0-7-7L3 14a5 5 0 0 0 7 7Z" /><path d="m8 12 4 4" /></svg>;
  if (type === 'home') return <svg {...common}><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>;
  if (type === 'building') return <svg {...common}><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" /><path d="M9 21v-6h6v6" /><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" /></svg>;
  return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
};

const Feature = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => <div className="feat-item"><div className="feat-icon"><Icon type={icon} /></div><div><div className="feat-title">{title}</div><div className="feat-desc">{desc}</div></div></div>;
const Service = ({ icon, tag, name, desc }: { icon: string; tag: string; name: string; desc: string }) => <div className="s-card"><div className="s-img-wrap"><div className="s-img-icon"><Icon type={icon} /></div></div><div className="s-body"><div className="s-tag">{tag}</div><div className="s-name">{name}</div><div className="s-desc">{desc}</div><Link className="s-link" to={icon === 'home' || icon === 'building' ? '/consultant' : '/search'}>Learn more <ArrowSvg /></Link></div></div>;

export default Landing;
