import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteHeader from '@/components/SiteHeader';
import heroBg from '@/assets/hero-bg.png';
import { consultantVideoImage } from '@/assets/consultantVideoImage';
import { medicineSearchImg, homeConsultationImg, clinicSupportImg, support247Img } from '@/assets/serviceCardImages';

const words = ['faster', 'smarter', 'safely', 'instantly'];

const serviceCards = [
  {
    image: medicineSearchImg,
    tag: 'MEDICINE SEARCH',
    name: 'Find listed stock',
    desc: 'Search for medicines and see where stock is listed across participating facilities.',
    to: '/search',
  },
  {
    image: homeConsultationImg,
    tag: 'HOME CONSULTATION',
    name: 'Care from home',
    desc: 'Request provider support and receive a video link after review.',
    to: '/consultant',
  },
  {
    image: clinicSupportImg,
    tag: 'CLINIC SUPPORT',
    name: 'Assisted care',
    desc: 'Partner facilities can help patients connect to providers by video.',
    to: '/consultant',
  },
  {
    image: support247Img,
    tag: '24/7 SUPPORT',
    name: 'Always here for you',
    desc: 'Patients can use WhatsApp and public search without complex onboarding.',
    to: '/search',
  },
];

const partners = ['South West Pharma', 'J-Mecca Pharmacy', 'Partner Clinics', 'ChekaMeds Admin', 'South West Pharma', 'J-Mecca Pharmacy', 'Partner Clinics', 'ChekaMeds Admin'];

const Landing = () => {
  const navigate = useNavigate();
  const [wordIndex, setWordIndex] = useState(0);
  const [wordClass, setWordClass] = useState('');

  useEffect(() => {
    const progress = document.getElementById('progress');
    const onScroll = () => {
      if (!progress) return;
      const max = document.body.scrollHeight - window.innerHeight;
      progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal, .feat-item, .s-card, .section-kicker, .section-title, .section-body, .consult-actions').forEach((el) => observer.observe(el));

    let index = 0;
    const timer = window.setInterval(() => {
      setWordClass('slide-out');
      window.setTimeout(() => {
        index = (index + 1) % words.length;
        setWordIndex(index);
        setWordClass('slide-in');
        window.setTimeout(() => setWordClass(''), 420);
      }, 320);
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;700&display=swap');
        .cm-page{--ink:#0d1b2a;--soft:#6b7c93;--faint:#a8b8c8;--accent:#1a6b4a;--accent2:#2d9768;--light:#f6f8fa;--rule:rgba(255,255,255,.10);font-family:'DM Sans',system-ui,sans-serif;background:#050807;color:#fff;overflow-x:hidden}.cm-page *{box-sizing:border-box}#progress{position:fixed;top:0;left:0;height:2px;background:linear-gradient(90deg,#17ff9a,#ff4fd8,#ff3b3b);z-index:999;width:0}.cm-nav{position:fixed;top:0;left:0;right:0;height:68px;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 4rem;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);border-bottom:1px solid var(--rule)}.logo{font-family:'DM Serif Display',serif;font-size:1.5rem;color:var(--ink);text-decoration:none}.logo em{font-style:normal;color:var(--accent)}.nav-links{display:flex;gap:2.2rem;list-style:none;margin:0;padding:0}.nav-links a{font-size:.84rem;color:var(--soft);text-decoration:none}.nav-links a:hover{color:var(--ink)}.nav-actions{display:flex;gap:.8rem}.btn-ghost,.btn-cta,.btn-primary,.btn-secondary,.btn-p,.btn-s{border-radius:4px;cursor:pointer;text-decoration:none;border:none;font-weight:600}.btn-ghost{padding:.55rem 1rem;color:var(--ink);background:transparent}.btn-cta{padding:.65rem 1.2rem;background:var(--ink);color:#fff}.btn-cta:hover,.btn-primary:hover,.btn-p:hover{background:var(--accent)}
        .hero{padding-top:80px}.hero-visual{position:relative;background:var(--ink);overflow:hidden}.hero-visual img{width:100%;display:block;animation:imgIn 1s ease forwards}.hero-overlay{position:absolute;inset:0;background:linear-gradient(105deg,rgba(13,27,42,.78),rgba(13,27,42,.52) 43%,rgba(13,27,42,.08) 72%,transparent)}.hero-text{position:absolute;top:50%;left:0;transform:translateY(-50%);z-index:2;max-width:720px;padding:0 4.5rem;color:#fff}.eyebrow{display:flex;align-items:center;gap:.7rem;margin-bottom:1.4rem;color:var(--accent2);font-size:.72rem;letter-spacing:2px;text-transform:uppercase;font-weight:700;animation:fadeUp .7s .3s both}.eyebrow-line{width:28px;height:1px;background:var(--accent2)}.hero-title{font-family:'DM Serif Display',serif;font-size:4.35rem;line-height:1.05;margin:0 0 1.4rem;animation:fadeUp .75s .45s both}.hero-title em{font-style:italic;color:var(--accent2);display:inline-block;min-width:210px}.word-rotate-wrap{display:inline-block;overflow:hidden;vertical-align:bottom}.word-rotate.slide-out{animation:slideOut .32s ease both}.word-rotate.slide-in{animation:slideIn .4s ease both}.hero-body{max-width:500px;font-size:1.06rem;line-height:1.8;color:rgba(255,255,255,.78);font-weight:300;margin-bottom:2rem;animation:fadeUp .8s .58s both}.hero-actions{display:flex;gap:.9rem;animation:fadeUp .8s .72s both}.btn-primary{padding:.9rem 1.9rem;background:var(--accent);color:#fff;box-shadow:0 12px 30px rgba(26,107,74,.25)}.btn-secondary{padding:.9rem 1.6rem;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25)}.hero-stats{display:grid;grid-template-columns:repeat(4,1fr);background:var(--ink);padding:1.8rem 4.5rem;color:#fff}.stat-item{border-right:1px solid rgba(255,255,255,.08);padding:0 2rem}.stat-item:first-child{padding-left:0}.stat-item:last-child{border-right:0}.stat-num{font-family:'DM Serif Display',serif;font-size:2rem}.stat-num sup{font-family:'DM Sans';font-size:1rem;color:var(--accent2)}.stat-label{font-size:.74rem;color:rgba(255,255,255,.42)}
        .features-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;padding:2.3rem 4.5rem;border-bottom:1px solid var(--rule);background:#050807;color:#fff}.feat-item{display:flex;gap:1rem;padding-right:2rem;border-right:1px solid var(--rule);opacity:0;transform:translateY(14px);transition:.6s}.feat-item.visible{opacity:1;transform:translateY(0)}.feat-item:last-child{border-right:0}.feat-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(151,214,88,.14);color:#97d658;font-weight:800}.feat-title{font-size:.88rem;font-weight:800}.feat-desc{margin-top:.25rem;font-size:.78rem;color:rgba(255,255,255,.58);line-height:1.55}
        .consult{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--rule)}.consult-img-col{position:relative;min-height:540px;overflow:hidden;background:#07130f}.consult-img-col img{width:100%;height:100%;object-fit:cover;display:block}.consult-img-gradient{position:absolute;inset:0;background:linear-gradient(to right,transparent 58%,#07130f)}.consult-content{display:flex;flex-direction:column;justify-content:center;padding:5rem;background:radial-gradient(circle at 16% 0%,rgba(151,214,88,.14),transparent 36%),#07130f;color:#fff}.section-kicker{font-size:.72rem;text-transform:uppercase;letter-spacing:2px;color:var(--accent);font-weight:800;opacity:0;transform:translateY(14px);transition:.55s}.section-kicker.visible{opacity:1;transform:translateY(0)}.section-title{font-family:'DM Serif Display',serif;font-size:3.05rem;line-height:1.08;margin:.9rem 0 1.2rem;opacity:0;transform:translateY(16px);transition:.65s}.section-title.visible{opacity:1;transform:translateY(0)}.section-title em{font-style:italic;color:var(--accent)}.section-body{max-width:460px;line-height:1.85;color:rgba(255,255,255,.64);opacity:0;transform:translateY(16px);transition:.7s}.section-body.visible{opacity:1;transform:translateY(0)}.consult-actions{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin-top:2rem;opacity:0;transform:translateY(14px);transition:.6s}.consult-actions.visible{opacity:1;transform:translateY(0)}.btn-p,.btn-s{display:flex;justify-content:center;align-items:center;padding:.9rem 1rem}.btn-p{background:var(--accent);color:#fff}.btn-s{border:1px solid rgba(151,214,88,.22);color:#fff;background:rgba(255,255,255,.05)}.secure-row{margin-top:1.2rem;color:rgba(255,255,255,.48);font-size:.76rem}
        .services{padding:5.2rem 4.5rem;background:radial-gradient(circle at 8% 0%,rgba(23,255,154,.13),transparent 32%),radial-gradient(circle at 52% 5%,rgba(255,79,216,.10),transparent 30%),radial-gradient(circle at 95% 20%,rgba(255,59,59,.10),transparent 28%),#050807;border-top:1px solid rgba(255,255,255,.08)}.services-header .section-title{opacity:1;transform:none;margin:0 0 2.4rem;color:#fff;text-shadow:0 0 28px rgba(23,255,154,.22)}.services-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.35rem}.s-card{position:relative;display:flex;flex-direction:column;min-height:420px;background:rgba(255,255,255,.035);border:1px solid rgba(23,255,154,.72);border-radius:20px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 0 28px rgba(23,255,154,.18);opacity:0;transform:translateY(18px);transition:opacity .55s,transform .55s,box-shadow .35s,border-color .35s,filter .35s;color:#fff;text-align:left}.s-card:nth-child(2){border-color:rgba(255,79,216,.75);box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 0 30px rgba(255,79,216,.18)}.s-card:nth-child(3){border-color:rgba(255,59,59,.75);box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 0 30px rgba(255,59,59,.18)}.s-card:nth-child(4){border-color:rgba(23,255,154,.68);box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 0 30px rgba(23,255,154,.16)}.s-card::before{content:'';position:absolute;inset:0;border-radius:20px;background:linear-gradient(135deg,rgba(23,255,154,.12),transparent 35%,rgba(255,79,216,.08) 70%,rgba(255,59,59,.08));opacity:.72;pointer-events:none}.s-card.visible{opacity:1;transform:translateY(0)}.s-card:hover{transform:translateY(-8px) scale(1.01);filter:saturate(1.07);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 0 42px rgba(23,255,154,.38),0 24px 70px rgba(0,0,0,.32)}.s-card:nth-child(2):hover{box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 0 46px rgba(255,79,216,.42),0 24px 70px rgba(0,0,0,.32)}.s-card:nth-child(3):hover{box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 0 46px rgba(255,59,59,.42),0 24px 70px rgba(0,0,0,.32)}.s-img-wrap,.s-body{position:relative;z-index:1}.s-img-wrap{height:190px;overflow:hidden;background:#08120e}.s-img-photo{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s,filter .45s;filter:saturate(.98) contrast(1.02)}.s-card:hover .s-img-photo{transform:scale(1.06);filter:saturate(1.18) contrast(1.08)}.s-body{display:flex;flex-direction:column;flex:1;padding:1.25rem}.s-tag{font-size:.66rem;letter-spacing:1.7px;color:#17ff9a;font-weight:900;margin-bottom:.65rem}.s-card:nth-child(2) .s-tag{color:#ff4fd8}.s-card:nth-child(3) .s-tag{color:#ff3b3b}.s-name{font-size:1.08rem;font-weight:900;color:#fff;margin-bottom:.45rem}.s-desc{font-size:.83rem;line-height:1.68;color:rgba(255,255,255,.64);margin-bottom:0}.s-card-action{margin-top:auto;padding-top:1rem;color:rgba(255,255,255,.82);font-size:.76rem;font-weight:900;letter-spacing:.8px;text-transform:uppercase;display:flex;align-items:center;gap:.4rem}.s-card:hover .s-tag,.s-card:hover .s-name,.s-card:hover .s-desc,.s-card:hover .s-card-action{animation:textDissolve .72s ease both}.s-card-action span{transition:transform .2s}.s-card:hover .s-card-action span{transform:translateX(4px)}.partners{padding:2rem 0;display:grid;grid-template-columns:auto 1fr;gap:2rem;align-items:center;overflow:hidden;background:#050807;border-top:1px solid rgba(255,255,255,.08)}.p-label{font-size:.75rem;color:rgba(255,255,255,.38);padding-left:4.5rem;white-space:nowrap}.p-carousel{position:relative;overflow:hidden}.p-carousel::before,.p-carousel::after{content:'';position:absolute;top:0;bottom:0;width:80px;z-index:2;pointer-events:none}.p-carousel::before{left:0;background:linear-gradient(to right,#050807,transparent)}.p-carousel::after{right:0;background:linear-gradient(to left,#050807,transparent)}.p-track{display:flex;width:max-content;gap:4rem;animation:partnerSlide 20s linear infinite;will-change:transform}.p-carousel:hover .p-track{animation-play-state:paused}.p-name{display:inline-flex;align-items:center;min-width:max-content;color:rgba(255,255,255,.82);font-family:'DM Serif Display',serif;font-size:1.2rem;letter-spacing:.4px;text-shadow:0 0 18px rgba(23,255,154,.20);white-space:nowrap}.p-name::after{content:'•';margin-left:4rem;color:#17ff9a;text-shadow:0 0 12px rgba(23,255,154,.65)}.cm-footer{display:flex;justify-content:space-between;align-items:center;background:var(--ink);color:#fff;padding:2rem 4.5rem}.f-logo{font-family:'DM Serif Display',serif;font-size:1.25rem}.f-logo em{font-style:normal;color:var(--accent2)}.f-links{display:flex;gap:1.5rem;list-style:none;margin:0;padding:0}.f-links a{color:rgba(255,255,255,.45);text-decoration:none;font-size:.8rem}.f-copy{color:rgba(255,255,255,.28);font-size:.75rem}@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes imgIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}@keyframes slideOut{to{opacity:0;transform:translateY(-100%)}}@keyframes slideIn{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}@keyframes partnerSlide{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes textDissolve{0%{opacity:.38;filter:blur(5px);letter-spacing:.08em;transform:translateY(4px)}55%{opacity:1;filter:blur(0);letter-spacing:.02em}100%{opacity:1;filter:blur(0);letter-spacing:inherit;transform:translateY(0)}}@media(max-width:980px){.cm-nav{padding:0 1.25rem}.nav-links{display:none}.hero-text{position:relative;transform:none;padding:2rem 1.25rem;background:var(--ink);max-width:none}.hero-overlay{display:none}.hero-title{font-size:2.8rem}.hero-title em{min-width:150px}.hero-actions,.consult-actions{grid-template-columns:1fr;flex-direction:column}.hero-stats,.features-strip,.services,.cm-footer{padding-left:1.25rem;padding-right:1.25rem}.hero-stats,.features-strip,.services-grid{grid-template-columns:1fr}.feat-item{border-right:0;border-bottom:1px solid var(--rule);padding:0 0 1rem}.consult{grid-template-columns:1fr}.consult-img-col{min-height:320px}.consult-content{padding:3rem 1.25rem}.partners{display:block;padding:1.5rem 0}.p-label{padding:0 1.25rem 1rem}.p-track{gap:2.6rem}.p-name{font-size:1rem}.p-name::after{margin-left:2.6rem}.f-links{margin:1rem 0;flex-wrap:wrap}.cm-footer{display:block}.s-card{min-height:auto}}
      `}</style>

      <div id="progress" />

      <SiteHeader ctaLabel="Get started" ctaTo="/search" />

      <section className="hero" id="how">
        <div className="hero-visual">
          <img src={heroBg} alt="ChekaMeds medicine availability platform" />
          <div className="hero-overlay" />
          <div className="hero-text">
            <div className="eyebrow"><span className="eyebrow-line" /> Medicine availability platform</div>
            <h1 className="hero-title">Find medicines <span className="word-rotate-wrap"><em className={`word-rotate ${wordClass}`}>{words[wordIndex]}</em></span></h1>
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
        <Feature icon="⌕" title="Check medicine availability" desc="Search partner pharmacies and clinics near you." />
        <Feature icon="☏" title="Instant on WhatsApp" desc="Simple, fast and convenient. No app required." />
        <Feature icon="✓" title="Trusted partners" desc="Verified pharmacies, clinics and provider workflows." />
        <Feature icon="24" title="Always available" desc="Support and search when you need it." />
      </section>

      <section className="consult" id="consultants">
        <div className="consult-img-col">
          <img src={consultantVideoImage} alt="Older patient doing a video consultation in a rural village" />
          <div className="consult-img-gradient" />
        </div>
        <div className="consult-content">
          <div className="section-kicker">Virtual consultation</div>
          <h2 className="section-title">Care from <em>anywhere</em></h2>
          <p className="section-body">Request provider support from home, or choose a partner pharmacy or clinic where staff can assist with symptom capture, video setup and medicine collection.</p>
          <div className="consult-actions">
            <button className="btn-p" onClick={() => navigate('/consultant')}>Book a consultation</button>
            <button className="btn-s" onClick={() => navigate('/search')}>Find medicine first</button>
          </div>
          <div className="secure-row">Private. Secure. Provider-led. ChekaMeds does not replace emergency care.</div>
        </div>
      </section>

      <section className="services" id="services">
        <div className="services-header"><h2 className="section-title visible">How ChekaMeds helps</h2></div>
        <div className="services-grid">
          {serviceCards.map((card) => (
            <button key={card.name} className="s-card" onClick={() => navigate(card.to)} type="button">
              <div className="s-img-wrap">
                <img src={card.image} alt={card.name} className="s-img-photo" />
              </div>
              <div className="s-body">
                <div className="s-tag">{card.tag}</div>
                <div className="s-name">{card.name}</div>
                <div className="s-desc">{card.desc}</div>
                <div className="s-card-action">Open <span>→</span></div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="partners reveal">
        <div className="p-label">Working with trusted pharmacies and clinics across Botswana</div>
        <div className="p-carousel">
          <div className="p-track">
            {partners.map((partner, index) => (
              <span key={`${partner}-${index}`} className="p-name">{partner}</span>
            ))}
          </div>
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
        <div className="f-copy">© 2026 IBLIM Enterprise (Pty) Ltd, trading as ChekaMeds. All rights reserved.</div>
      </footer>
    </div>
  );
};

const ArrowSvg = () => <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
const Feature = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => <div className="feat-item"><div className="feat-icon">{icon}</div><div><div className="feat-title">{title}</div><div className="feat-desc">{desc}</div></div></div>;

export default Landing;
