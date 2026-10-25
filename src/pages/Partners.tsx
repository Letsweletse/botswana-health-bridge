import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, BarChart3, Check, CheckCircle2, Download, Globe2, Loader2, Mail, MessageCircle,
  MonitorSmartphone, Phone, Smartphone,
} from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';

const WA = '26775560140';
const WA_TEXT = encodeURIComponent("Hi Letsweletse, I'd like to discuss licensing ChekaMeds in my country.");
const WA_LINK = `https://wa.me/${WA}?text=${WA_TEXT}`;
const PDF = '/chekameds-licensing.pdf';

const stats = [
  { n: '39', t: 'pharmacies live' },
  { n: '~26,000', t: 'medicine listings' },
  { n: '1,346', t: 'unfilled requests captured' },
  { n: '17-branch', t: 'pharmacy group on contract' },
];

const channels = [
  {
    icon: MessageCircle, name: 'WhatsApp', tag: 'Included', opt: false,
    body: 'Patients chat with your number, search a medicine, see nearby stock and reserve. Works with photos of prescriptions and voice notes.',
    fine: 'Live in 30 days. Meta messaging fees passed through at cost.',
  },
  {
    icon: Smartphone, name: 'USSD for basic phones', tag: 'Optional add-on', opt: true,
    body: 'Patients dial a short code such as *123#, choose a medicine and area from a menu, and get pharmacy results by SMS. No smartphone, data or app needed.',
    fine: 'From US$1,500 setup + US$150 / month per market. Short code and session fees from your mobile operator billed at cost. Live in 6 to 10 weeks, depending on operator approval.',
  },
  {
    icon: MonitorSmartphone, name: 'Web + pharmacy dashboard', tag: 'Included', opt: false,
    body: 'A public web finder for your market, plus a dashboard where pharmacies update stock, scan barcodes and handle reservations.',
    fine: 'On your own domain with White Label.',
  },
];

const gets = [
  ['Medicine search', 'on WhatsApp, USSD and web'],
  ['Pharmacy tools', 'barcode scanning, live stock, reservations'],
  ['Analytics', 'demand, stock-outs and unfilled requests by area'],
  ['Onboarding', 'staff access, training pack, partner support'],
  ['Your brand', 'currency, languages and pharmacy network'],
];

const who = [
  'Pharmacy chains and franchise groups',
  'Pharmaceutical distributors and wholesalers',
  'Medical aid schemes and insurers',
  'Mobile network operators (USSD and airtime partners)',
  'Health ministries and digital health companies',
];

const plans = [
  {
    id: 'pilot', name: 'Powered by ChekaMeds', hl: true,
    body: 'Run ChekaMeds in your country with your branding alongside ours. Start with a 90-day pilot in one city.',
    price: 'US$1,000 pilot', sub: ['90 days, up to 20 pharmacies', 'then US$20 per pharmacy / month'],
  },
  {
    id: 'white_label', name: 'Full White Label', hl: false,
    body: 'Fully your brand: your domain, WhatsApp number, USSD menu and design. ChekaMeds stays invisible.',
    price: 'From US$4,000 setup', sub: ['+ annual licence from US$9,000', 'includes up to 100 pharmacies'],
  },
  {
    id: 'insights', name: 'Demand Insights add-on', hl: false,
    body: 'Monthly reports on unfilled medicine demand, for manufacturers, distributors and health ministries.',
    price: 'From US$250 / month', sub: ['per market'],
  },
];

const steps = [
  ['Discovery call', 'Your market, pharmacy network, channels and goals. 30 minutes, online.'],
  ['90-day pilot', '10 to 20 pharmacies in one city, live on WhatsApp first.'],
  ['Rollout', 'Scale nationally, add USSD with your mobile operator, and train pharmacy staff.'],
];

const faqs = [
  ['Do patients need to download an app?', 'No. Patients use WhatsApp, which they already have, or dial a USSD code on any phone. The web finder is optional.'],
  ['Who owns the data?', 'Your pharmacy and patient data stays yours. We process it only to run the service in your market, and we are happy to sign a data processing agreement.'],
  ['How do pharmacies keep stock up to date?', 'Through the pharmacy dashboard: barcode scanning, quick stock updates, or an upload from their existing system.'],
  ['How do we pay?', 'By SWIFT bank transfer or PayPal, in US dollars. Pilots are paid upfront; licences monthly or yearly.'],
];

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Partners() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [bad, setBad] = useState<string[]>([]);
  const [plan, setPlan] = useState('pilot');
  const [chan, setChan] = useState<string[]>(['whatsapp']);

  useEffect(() => {
    const prev = document.title;
    document.title = 'License ChekaMeds | WhatsApp & USSD medicine finder for your country';
    return () => { document.title = prev; };
  }, []);

  const pickPlan = (id: string) => {
    setPlan(id);
    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const toggle = (c: string) => setChan((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      full_name: f.get('full_name'), organisation: f.get('organisation'), job_title: f.get('job_title'),
      country: f.get('country'), email: f.get('email'), phone: f.get('phone'),
      organisation_type: f.get('organisation_type'), pharmacy_count: f.get('pharmacy_count') || null,
      plan_interest: plan, channels: chan, message: f.get('message'), website: f.get('website'),
      source: `${window.location.pathname}${window.location.search}`.slice(0, 200),
    };
    setStatus('sending'); setError(''); setBad([]);
    try {
      const r = await fetch('/api/partner-enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setBad(Array.isArray(data.fields) ? data.fields : []); throw new Error(data.error || 'Something went wrong.'); }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const cls = (name: string) => (bad.includes(name) ? 'cm-pt-bad' : undefined);

  return (
    <div className="cms cm-pt">
      <style>{`
        .cm-pt{--bg:#080a19;--panel:rgba(255,255,255,.04);--panel2:rgba(255,255,255,.07);--line:rgba(255,255,255,.08);--ink:#ffffff;--mute:rgba(255,255,255,.62);--dim:rgba(255,255,255,.45);--g:#5eeaa8;--amber:#fbbf5a;
          background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;font-weight:450;min-height:100vh;overflow-x:hidden}
        .cm-pt *{box-sizing:border-box}
        .cm-pt a{color:inherit}
        .cm-pt-w{width:min(1180px,calc(100% - 48px));margin:0 auto}
        .cm-pt h1,.cm-pt h2,.cm-pt h3{font-family:Inter,sans-serif;letter-spacing:-.025em;margin:0;font-weight:400}
        .cm-pt-hd{display:flex;align-items:center;justify-content:space-between;height:78px;gap:16px}
        .cm-pt-brand{display:flex;align-items:center;gap:10px;font:400 1.25rem Inter,sans-serif;text-decoration:none;color:#f4fff9}
        .cm-pt-brand img{width:36px;height:36px;border-radius:10px}
        .cm-pt-brand span span{color:var(--g)}
        .cm-pt-brand small{font:600 .7rem 'DM Sans';color:var(--dim);letter-spacing:.12em;text-transform:uppercase;margin-left:6px;padding-left:10px;border-left:1px solid var(--line)}
        .cm-pt-nav{display:flex;gap:26px;font-size:.9rem}
        .cm-pt-nav a{text-decoration:none;color:rgba(234,245,239,.72)}
        .cm-pt-nav a:hover{color:#fff}
        .cm-pt-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 20px;border-radius:10px;font-weight:700;font-size:.92rem;text-decoration:none;border:0;cursor:pointer;white-space:nowrap;transition:transform .15s ease,background .15s ease}
        .cm-pt-btn:hover{transform:translateY(-1px)}
        .cm-pt-btn-p{background:#e9e9e9;color:#0a0707!important}.cm-pt-btn-p:hover{background:#fff}
        .cm-pt-btn-g{border:1px solid rgba(211,255,232,.22);color:#eaf5ef;background:rgba(255,255,255,.02)}
        .cm-pt-btn-g:hover{background:rgba(255,255,255,.06)}
        .cm-pt-btn:focus-visible,.cm-pt input:focus-visible,.cm-pt select:focus-visible,.cm-pt textarea:focus-visible{outline:2px solid var(--g);outline-offset:2px}

        .cm-pt-hero{display:grid;grid-template-columns:1.2fr .9fr;gap:48px;align-items:center;padding:56px 0 80px;position:relative}
        .cm-pt-hero:before{content:'';position:absolute;inset:-120px -30% auto auto;width:640px;height:640px;background:radial-gradient(circle,rgba(94,234,168,.10),transparent 62%);pointer-events:none}
        .cm-pt-eye{display:inline-flex;align-items:center;gap:8px;font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--g)}
        .cm-pt-eye i{width:7px;height:7px;border-radius:50%;background:var(--g);box-shadow:0 0 12px var(--g)}
        .cm-pt-hero h1{font-size:clamp(2.4rem,5vw,4.1rem);line-height:.98;margin:18px 0 20px;font-weight:400}
        .cm-pt-hero h1 em{font-style:normal;color:rgba(255,255,255,.55)}
        .cm-pt-lead{font-size:1.1rem;line-height:1.65;color:#b3c7bc;max-width:580px;margin:0 0 30px}
        .cm-pt-acts{display:flex;gap:12px;flex-wrap:wrap}
        .cm-pt-note{margin-top:22px;font-size:.85rem;color:var(--dim)}

        .cm-pt-phones{display:flex;gap:16px;justify-content:center;position:relative}
        .cm-pt-ph{width:220px;background:rgba(17,16,15,.45);backdrop-filter:blur(20px);border:1px solid var(--line);border-radius:26px;padding:16px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
        .cm-pt-ph:nth-child(2){margin-top:46px}
        .cm-pt-ph h4{margin:0 0 12px;font:700 .68rem 'DM Sans';letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
        .cm-pt-b{font-size:.8rem;line-height:1.4;padding:9px 11px;border-radius:12px;margin:0 0 8px;max-width:90%}
        .cm-pt-b.me{background:#0f5c3c;margin-left:auto;border-bottom-right-radius:4px}
        .cm-pt-b.bot{background:rgba(255,255,255,.08);border-bottom-left-radius:4px}
        .cm-pt-ussd{background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:10px;padding:12px;font:500 .78rem/1.6 ui-monospace,Menlo,monospace;color:#b8ffda;white-space:pre-line}

        .cm-pt-stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:16px;background:var(--panel);overflow:hidden}
        .cm-pt-stat{padding:24px 26px;border-right:1px solid var(--line)}
        .cm-pt-stat:last-child{border-right:0}
        .cm-pt-stat b{display:block;font:400 1.9rem Inter,sans-serif;color:#f4fff9;letter-spacing:-.03em}
        .cm-pt-stat span{font-size:.85rem;color:var(--mute)}
        .cm-pt-src{font-size:.75rem;color:var(--dim);margin:10px 0 0}

        .cm-pt-sec{padding:96px 0 0}
        .cm-pt-sec h2{font-size:clamp(1.9rem,3.4vw,2.7rem);font-weight:400;line-height:1.05}
        .cm-pt-sub{color:var(--mute);font-size:1.02rem;line-height:1.6;max-width:640px;margin:12px 0 34px}
        .cm-pt-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .cm-pt-card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:26px;display:flex;flex-direction:column}
        .cm-pt-ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);color:#fff;margin-bottom:18px}
        .cm-pt-ic.opt{background:rgba(251,191,90,.1);color:var(--amber)}
        .cm-pt-tag{align-self:flex-start;font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:99px;background:rgba(94,234,168,.1);color:var(--g);margin-bottom:12px}
        .cm-pt-tag.opt{background:rgba(251,191,90,.1);color:var(--amber)}
        .cm-pt-card h3{font-size:1.2rem;font-weight:700;margin-bottom:10px;color:#f4fff9}
        .cm-pt-card p{margin:0 0 14px;color:#b3c7bc;line-height:1.6;font-size:.94rem}
        .cm-pt-fine{font-size:.84rem!important;color:var(--mute)!important;margin-top:auto!important;padding-top:14px;border-top:1px solid var(--line)}

        .cm-pt-two{display:grid;grid-template-columns:1fr 1fr;gap:48px}
        .cm-pt-list{list-style:none;margin:22px 0 0;padding:0}
        .cm-pt-list li{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);color:#c8d9cf;line-height:1.45}
        .cm-pt-list li svg{flex:0 0 18px;color:var(--g);margin-top:2px}
        .cm-pt-list b{color:#f4fff9}

        .cm-pt-plan{position:relative}
        .cm-pt-plan.hl{border:1px solid rgba(255,255,255,.5);background:rgba(17,16,15,.35)}
        .cm-pt-plan.hl:before{content:'Best place to start';position:absolute;top:-12px;left:22px;background:#e9e9e9;color:#0a0707;font-size:.7rem;font-weight:500;padding:4px 11px;border-radius:99px}
        .cm-pt-price{margin-top:auto;padding-top:18px;border-top:1px solid var(--line)}
        .cm-pt-price b{display:block;font:400 1.6rem Inter,sans-serif;color:#f4fff9;letter-spacing:-.02em}
        .cm-pt-price span{display:block;color:var(--mute);font-size:.88rem;line-height:1.5}
        .cm-pt-price button{margin-top:18px;width:100%}
        .cm-pt-small{font-size:.82rem;color:var(--dim);margin:16px 0 0;line-height:1.6}

        .cm-pt-step{position:relative;padding-top:58px}
        .cm-pt-step:before{content:attr(data-n);position:absolute;top:24px;left:26px;font:500 .8rem Inter;color:#0a0707;background:#e9e9e9;width:26px;height:26px;border-radius:50%;display:grid;place-items:center}

        .cm-pt-form{display:grid;grid-template-columns:.85fr 1.15fr;gap:40px;background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:clamp(24px,4vw,48px)}
        .cm-pt-form aside p{color:#b3c7bc;line-height:1.65}
        .cm-pt-direct{display:flex;flex-direction:column;gap:12px;margin-top:26px}
        .cm-pt-direct a{display:flex;align-items:center;gap:10px;text-decoration:none;color:#c8d9cf;font-size:.95rem}
        .cm-pt-direct a svg{color:var(--g)}
        .cm-pt-fg{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .cm-pt-fg .full{grid-column:1/-1}
        .cm-pt label{display:block;font-size:.8rem;font-weight:600;color:var(--mute);margin-bottom:6px}
        .cm-pt input,.cm-pt select,.cm-pt textarea{width:100%;background:#050c09;border:1px solid rgba(211,255,232,.16);border-radius:10px;padding:12px 13px;color:#f4fff9;font:inherit;font-size:.95rem}
        .cm-pt textarea{min-height:110px;resize:vertical}
        .cm-pt select option{background:#0a1410}
        .cm-pt .cm-pt-bad{border-color:#f87171!important}
        .cm-pt-chips{display:flex;flex-wrap:wrap;gap:8px}
        .cm-pt-chip{border:1px solid rgba(211,255,232,.18);background:transparent;color:#c8d9cf;border-radius:99px;padding:9px 14px;font:600 .85rem 'DM Sans';cursor:pointer;display:inline-flex;align-items:center;gap:6px}
        .cm-pt-chip[aria-pressed="true"]{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.6);color:#fff}
        .cm-pt-hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
        .cm-pt-err{color:#fca5a5;font-size:.9rem;margin:12px 0 0}
        .cm-pt-ok{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:30px;border-radius:16px;background:rgba(94,234,168,.07);border:1px solid rgba(94,234,168,.3)}
        .cm-pt-ok h3{font-size:1.4rem}
        .cm-pt-ok p{margin:0;color:#b3c7bc;line-height:1.6}

        .cm-pt-faq{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .cm-pt-faq details{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 22px}
        .cm-pt-faq summary{cursor:pointer;font-weight:700;color:#f4fff9;list-style:none}
        .cm-pt-faq summary::-webkit-details-marker{display:none}
        .cm-pt-faq summary:after{content:'+';float:right;color:var(--g);font-weight:800}
        .cm-pt-faq details[open] summary:after{content:'−'}
        .cm-pt-faq p{margin:12px 0 0;color:#b3c7bc;line-height:1.6;font-size:.94rem}
        .cm-pt-end{height:96px}

        @media(max-width:980px){
          .cm-pt-w{width:min(100% - 36px,760px)}
          .cm-pt-hero{grid-template-columns:1fr;padding:36px 0 60px}
          .cm-pt-phones{justify-content:flex-start}
          .cm-pt-stats{grid-template-columns:1fr 1fr}
          .cm-pt-stat:nth-child(2){border-right:0}
          .cm-pt-stat:nth-child(-n+2){border-bottom:1px solid var(--line)}
          .cm-pt-g3,.cm-pt-two,.cm-pt-form,.cm-pt-faq{grid-template-columns:1fr}
          .cm-pt-two{gap:28px}
          .cm-pt-nav{display:none}
          .cm-pt-sec{padding-top:72px}
        }
        @media(max-width:560px){
          .cm-pt-w{width:calc(100% - 32px)}
          .cm-pt-brand small{display:none}
          .cm-pt-hd .cm-pt-btn{padding:10px 14px;font-size:.82rem}
          .cm-pt-ph{width:100%}
          .cm-pt-ph:nth-child(2){margin-top:0}
          .cm-pt-phones{flex-direction:column}
          .cm-pt-acts .cm-pt-btn{width:100%}
          .cm-pt-fg{grid-template-columns:1fr}
          .cm-pt-stat{padding:18px}
          .cm-pt-stat b{font-size:1.5rem}
        }
        @media(prefers-reduced-motion:reduce){.cm-pt-btn{transition:none}.cm-pt-btn:hover{transform:none}}
      `}</style>

      <SiteHeader />
      <div className="cm-pt-w">

        <section className="cm-pt-hero">
          <div>
            <div className="cm-pt-eye"><i /> Partner and licensing programme</div>
            <h1>Launch a medicine finder in your country, on <em>WhatsApp and USSD.</em></h1>
            <p className="cm-pt-lead">
              Patients find which nearby pharmacy has their medicine in stock and reserve it: on WhatsApp from a
              smartphone, or by dialling a short code on any basic phone. Pharmacies get new customers and live stock
              tools. Proven in Botswana, ready to license.
            </p>
            <div className="cm-pt-acts">
              <a href="#enquire" className="cm-pt-btn cm-pt-btn-p">Book a discovery call <ArrowUpRight size={16} /></a>
              <a href={PDF} target="_blank" rel="noopener" className="cm-pt-btn cm-pt-btn-g"><Download size={16} /> Download the one-pager</a>
            </div>
            <p className="cm-pt-note">Pilots from US$1,000 · Live on WhatsApp in 30 days</p>
          </div>
          <div className="cm-pt-phones" aria-hidden="true">
            <div className="cm-pt-ph">
              <h4>WhatsApp</h4>
              <div className="cm-pt-b me">Amoxicillin 500mg near Gaborone West?</div>
              <div className="cm-pt-b bot">3 pharmacies have it in stock. Nearest: 1.2 km, P38. Reply 1 to reserve.</div>
              <div className="cm-pt-b me">1</div>
              <div className="cm-pt-b bot">Reserved for 2 hours. Show code CM-4821 at the counter.</div>
            </div>
            <div className="cm-pt-ph">
              <h4>USSD · *123#</h4>
              <div className="cm-pt-ussd">{'ChekaMeds\n1. Find a medicine\n2. My reservations\n3. Pharmacies near me\n> 1\n\nResults sent to you by SMS'}</div>
            </div>
          </div>
        </section>

        <div className="cm-pt-stats" aria-label="ChekaMeds Botswana operations">
          {stats.map((s) => <div key={s.t} className="cm-pt-stat"><b>{s.n}</b><span>{s.t}</span></div>)}
        </div>
        <p className="cm-pt-src">ChekaMeds Botswana, live operations, 2026.</p>

        <section className="cm-pt-sec" id="channels">
          <h2>Choose your channels</h2>
          <p className="cm-pt-sub">Start on WhatsApp. Add USSD to reach patients without smartphones or data. Every plan includes the web finder and pharmacy dashboard.</p>
          <div className="cm-pt-g3">
            {channels.map((c) => (
              <article key={c.name} className="cm-pt-card">
                <div className={`cm-pt-ic${c.opt ? ' opt' : ''}`}><c.icon size={21} /></div>
                <span className={`cm-pt-tag${c.opt ? ' opt' : ''}`}>{c.tag}</span>
                <h3>{c.name}</h3>
                <p>{c.body}</p>
                <p className="cm-pt-fine">{c.fine}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cm-pt-sec">
          <div className="cm-pt-two">
            <div>
              <h2>What your market gets</h2>
              <ul className="cm-pt-list">
                {gets.map(([b, t]) => <li key={b}><Check size={18} /><span><b>{b}</b>: {t}</span></li>)}
              </ul>
            </div>
            <div>
              <h2>Who it is for</h2>
              <ul className="cm-pt-list">
                {who.map((t) => <li key={t}><Globe2 size={18} /><span>{t}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="cm-pt-sec" id="plans">
          <h2>Licensing options</h2>
          <p className="cm-pt-sub">Simple, affordable pricing. Start small with a pilot and grow as pharmacies join.</p>
          <div className="cm-pt-g3">
            {plans.map((p) => (
              <article key={p.id} className={`cm-pt-card cm-pt-plan${p.hl ? ' hl' : ''}`}>
                {p.id === 'insights' && <div className="cm-pt-ic"><BarChart3 size={21} /></div>}
                <h3>{p.name}</h3>
                <p>{p.body}</p>
                <div className="cm-pt-price">
                  <b>{p.price}</b>
                  {p.sub.map((s) => <span key={s}>{s}</span>)}
                  <button type="button" onClick={() => pickPlan(p.id)} className={`cm-pt-btn ${p.hl ? 'cm-pt-btn-p' : 'cm-pt-btn-g'}`}>Enquire about this plan</button>
                </div>
              </article>
            ))}
          </div>
          <p className="cm-pt-small">
            All plans include WhatsApp and the web dashboard. USSD is an optional add-on on any plan. Indicative pricing
            in USD, excluding taxes. Final quote depends on market size, integrations and support level. Payable by SWIFT
            bank transfer or PayPal.
          </p>
        </section>

        <section className="cm-pt-sec" id="launch">
          <h2>How we launch together</h2>
          <p className="cm-pt-sub">From first call to a live pilot in about a month.</p>
          <div className="cm-pt-g3">
            {steps.map(([t, d], i) => (
              <article key={t} className="cm-pt-card cm-pt-step" data-n={i + 1}><h3>{t}</h3><p>{d}</p></article>
            ))}
          </div>
        </section>

        <section className="cm-pt-sec" id="enquire">
          <div className="cm-pt-form">
            <aside>
              <h2>Book a 30-minute discovery call</h2>
              <p>Tell us about your market and we'll come back within one business day with times for a call and a first estimate.</p>
              <div className="cm-pt-direct">
                <a href={WA_LINK} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp +267 75 560 140</a>
                <a href="mailto:info@chekameds.co.bw?subject=ChekaMeds%20licensing%20enquiry"><Mail size={18} /> info@chekameds.co.bw</a>
                <a href="tel:+26775560140"><Phone size={18} /> Letsweletse Seatla, Founder</a>
                <a href={PDF} target="_blank" rel="noopener"><Download size={18} /> Partner one-pager (PDF)</a>
              </div>
            </aside>

            {status === 'sent' ? (
              <div className="cm-pt-ok" role="status">
                <CheckCircle2 size={34} color="#5eeaa8" />
                <h3>Thank you, we've got your enquiry.</h3>
                <p>We'll reply within one business day. For a faster answer, message us on WhatsApp.</p>
                <a href={WA_LINK} target="_blank" rel="noreferrer" className="cm-pt-btn cm-pt-btn-p"><MessageCircle size={16} /> Continue on WhatsApp</a>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="cm-pt-fg">
                  <div><label htmlFor="pe-name">Full name *</label><input id="pe-name" name="full_name" required autoComplete="name" className={cls('full_name')} /></div>
                  <div><label htmlFor="pe-title">Job title</label><input id="pe-title" name="job_title" autoComplete="organization-title" /></div>
                  <div><label htmlFor="pe-org">Organisation *</label><input id="pe-org" name="organisation" required autoComplete="organization" className={cls('organisation')} /></div>
                  <div><label htmlFor="pe-country">Country *</label><input id="pe-country" name="country" required autoComplete="country-name" className={cls('country')} /></div>
                  <div><label htmlFor="pe-email">Work email *</label><input id="pe-email" name="email" type="email" required autoComplete="email" className={cls('email')} /></div>
                  <div><label htmlFor="pe-phone">Phone or WhatsApp</label><input id="pe-phone" name="phone" type="tel" autoComplete="tel" /></div>
                  <div>
                    <label htmlFor="pe-type">Organisation type</label>
                    <select id="pe-type" name="organisation_type" defaultValue="">
                      <option value="" disabled>Choose one</option>
                      <option>Pharmacy chain</option>
                      <option>Distributor or wholesaler</option>
                      <option>Medical aid or insurer</option>
                      <option>Mobile network operator</option>
                      <option>Government or ministry</option>
                      <option>Digital health company</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div><label htmlFor="pe-count">Number of pharmacies</label><input id="pe-count" name="pharmacy_count" type="number" min={0} inputMode="numeric" /></div>
                  <div className="full">
                    <label id="pe-plan-l">Plan of interest</label>
                    <div className="cm-pt-chips" role="group" aria-labelledby="pe-plan-l">
                      {[['pilot', 'Pilot'], ['white_label', 'White Label'], ['insights', 'Demand Insights'], ['not_sure', 'Not sure yet']].map(([id, label]) => (
                        <button key={id} type="button" className="cm-pt-chip" aria-pressed={plan === id} onClick={() => setPlan(id)}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="full">
                    <label id="pe-chan-l">Channels</label>
                    <div className="cm-pt-chips" role="group" aria-labelledby="pe-chan-l">
                      {[['whatsapp', 'WhatsApp'], ['ussd', 'USSD'], ['web', 'Web']].map(([id, label]) => (
                        <button key={id} type="button" className="cm-pt-chip" aria-pressed={chan.includes(id)} onClick={() => toggle(id)}>
                          {chan.includes(id) && <Check size={14} />}{label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="full"><label htmlFor="pe-msg">About your market</label><textarea id="pe-msg" name="message" placeholder="Cities, pharmacy network, timeline, anything we should know" /></div>
                  <div className="cm-pt-hp" aria-hidden="true"><label htmlFor="pe-web">Website</label><input id="pe-web" name="website" tabIndex={-1} autoComplete="off" /></div>
                </div>
                <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="submit" className="cm-pt-btn cm-pt-btn-p" disabled={status === 'sending'}>
                    {status === 'sending' ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <>Send enquiry <ArrowUpRight size={16} /></>}
                  </button>
                  <span style={{ fontSize: '.8rem', color: '#60766a' }}>We only use your details to reply to this enquiry.</span>
                </div>
                {status === 'error' && (
                  <p className="cm-pt-err" role="alert">
                    {error} <a href={WA_LINK} target="_blank" rel="noreferrer" style={{ color: '#5eeaa8' }}>WhatsApp us instead</a>.
                  </p>
                )}
              </form>
            )}
          </div>
        </section>

        <section className="cm-pt-sec" id="faq">
          <h2>Questions partners ask</h2>
          <p className="cm-pt-sub">Anything else, ask us on the call.</p>
          <div className="cm-pt-faq">
            {faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>
        <div className="cm-pt-end" />
      </div>
    </div>
  );
}
