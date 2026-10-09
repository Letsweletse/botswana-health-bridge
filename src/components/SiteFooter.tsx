import logoMark from '@/assets/chekameds-mark.webp';
import { Link } from 'react-router-dom';

const WA_PRIMARY = '26775560140';
const WA_SECONDARY = '26772347712';

const platform = [
  { label: 'Find medicine', to: '/search' },
  { label: 'Video consultation', to: '/consultant' },
  { label: 'Partner facilities', to: '/facilities' },
];

const company = [
  { label: 'Staff portal', to: '/dashboard' },
  { label: 'Admin', to: '/admin' },
];

export default function SiteFooter() {
  return (
    <footer className="cm-ft" id="support">
      <style>{`
        .cm-ft{position:relative;background:#050a08;color:#eaf5ef;border-top:1px solid rgba(211,255,232,.12);font-family:'DM Sans',system-ui,sans-serif}
        .cm-ft::before{content:'';position:absolute;top:-1px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(41,242,154,.45),transparent)}
        .cm-ft-in{width:min(1180px,calc(100% - 48px));margin:0 auto;padding:clamp(48px,5vw,76px) 0 clamp(20px,2vw,30px)}

        .cm-ft-top{display:grid;grid-template-columns:minmax(280px,1.3fr) repeat(3,minmax(140px,.44fr));gap:clamp(28px,4vw,64px)}
        .cm-ft-say{max-width:460px;margin:0;font:600 clamp(28px,3.1vw,46px)/1.08 Manrope,sans-serif;letter-spacing:-.035em;color:#f4fff9}
        .cm-ft-say em{font-style:normal;color:#29f29a}
        .cm-ft-sub{margin:16px 0 0;max-width:380px;color:#8fa69a;font-size:.88rem;line-height:1.55}

        .cm-ft-col h3{margin:0 0 16px;font:600 .75rem/1 Manrope,sans-serif;color:#60766a;letter-spacing:.01em}
        .cm-ft-col nav{display:flex;flex-direction:column;align-items:flex-start;gap:clamp(11px,1.1vw,15px);background:none;border:0;padding:0}
        .cm-ft a{color:rgba(234,245,239,.88);text-decoration:none;font-size:.93rem;line-height:1.15;transition:color .18s ease,transform .18s ease}
        .cm-ft a:hover{color:#fff;transform:translateX(3px)}
        .cm-ft a:focus-visible{outline:2px solid #29f29a;outline-offset:3px;border-radius:3px}
        .cm-ft-col a{display:inline-block}
        .cm-ft-wa{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:7px;border:1px solid rgba(41,242,154,.24);background:rgba(41,242,154,.07);color:#b8ffda!important;font-weight:600;font-size:.85rem;white-space:nowrap}
        .cm-ft-wa:hover{background:rgba(41,242,154,.12);transform:none!important}

        .cm-ft-brand{display:flex;align-items:center;width:100%;margin-top:clamp(34px,4.5vw,64px);color:#f4fff9}
        .cm-ft-brand img{flex:0 0 clamp(42px,5vw,86px);width:clamp(42px,5vw,86px);height:clamp(42px,5vw,86px);margin-right:clamp(12px,1.5vw,24px);border-radius:14px}
        .cm-ft-word{flex:1 1 auto;min-width:0;display:block;font:800 clamp(46px,12.4vw,180px)/.8 Manrope,sans-serif;letter-spacing:-.055em;white-space:nowrap}
        .cm-ft-word i{font-style:normal;color:#29f29a}

        .cm-ft-legal{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:clamp(20px,2vw,30px);padding-top:clamp(16px,1.6vw,22px);border-top:1px solid rgba(211,255,232,.09);color:rgba(234,245,239,.5);font-size:.78rem;line-height:1.4}
        .cm-ft-legal p{margin:0}

        @media(max-width:980px){
          .cm-ft-in{width:min(100% - 36px,760px)}
          .cm-ft-top{grid-template-columns:1fr 1fr}
          .cm-ft-say-cell{grid-column:1/-1}
        }
        @media(max-width:560px){
          .cm-ft-in{width:calc(100% - 34px)}
          .cm-ft-top{grid-template-columns:1fr;gap:30px}
          .cm-ft-brand img{flex-basis:clamp(34px,11vw,48px);width:clamp(34px,11vw,48px);height:clamp(34px,11vw,48px)}
          .cm-ft-word{font-size:clamp(32px,14vw,72px)}
        }
        @media(prefers-reduced-motion:reduce){.cm-ft a:hover{transform:none}}
      `}</style>

      <div className="cm-ft-in">
        <div className="cm-ft-top">
          <div className="cm-ft-say-cell">
            <h2 className="cm-ft-say">Know what's in stock <em>before you travel.</em></h2>
            <p className="cm-ft-sub">
              Medicine availability search, pharmacy discovery and video consultation support, built in Botswana
              by IBLIM Enterprise.
            </p>
          </div>

          <div className="cm-ft-col">
            <h3>Platform</h3>
            <nav aria-label="Platform links">
              {platform.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            </nav>
          </div>

          <div className="cm-ft-col">
            <h3>Company</h3>
            <nav aria-label="Company links">
              {company.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
              <a href="mailto:info@chekameds.co.bw">info@chekameds.co.bw</a>
            </nav>
          </div>

          <div className="cm-ft-col">
            <h3>Talk to us</h3>
            <nav aria-label="Contact links">
              <a className="cm-ft-wa" href={`https://wa.me/${WA_PRIMARY}`} target="_blank" rel="noreferrer">
                Chat on WhatsApp
              </a>
              <a href={`tel:+${WA_PRIMARY}`}>+267 75 560 140</a>
              <a href={`tel:+${WA_SECONDARY}`}>+267 72 347 712</a>
              <a href="mailto:iblimenterprise@zohomail.com">iblimenterprise@zohomail.com</a>
            </nav>
          </div>
        </div>

        <Link to="/" className="cm-ft-brand" aria-label="ChekaMeds home">
          <img src={logoMark} alt="" width="86" height="86" />
          <span className="cm-ft-word">Cheka<i>Meds</i></span>
        </Link>

        <div className="cm-ft-legal">
          <p>© 2026 ChekaMeds Botswana. All rights reserved.</p>
          <p>Powered by IBLIM Enterprise (Pty) Ltd.</p>
        </div>
      </div>
    </footer>
  );
}
