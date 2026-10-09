import { motion, useReducedMotion } from 'framer-motion';
import LazyVideo from './LazyVideo';

export default function Moments() {
  const reduce = useReducedMotion();
  const rise = (d = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.7, delay: d },
  });
  return (
    <section className="cm-moments" aria-label="How ChekaMeds helps people">
      <style>{`
        .cm-moments{max-width:1180px;margin:0 auto;padding:40px 24px 110px}
        .cm-moments-head{text-align:center;max-width:680px;margin:0 auto 44px}
        .cm-moments-head h2{font-family:Manrope,system-ui,sans-serif;font-size:clamp(1.8rem,4vw,3rem);line-height:1.06;letter-spacing:-.03em;margin:14px 0 14px}
        .cm-moments-head p{color:var(--muted);line-height:1.65;font-size:1.05rem;margin:0}
        .cm-moments-grid{display:grid;grid-template-columns:minmax(0,.62fr) minmax(0,1fr);gap:22px;align-items:stretch}
        .cm-moment{position:relative;border-radius:26px;overflow:hidden;border:1px solid rgba(211,255,232,.14);box-shadow:0 40px 80px -30px rgba(0,0,0,.8),0 0 60px rgba(41,242,154,.06);background:#07100c;min-height:420px}
        .cm-moment .vid{position:absolute;inset:0}
        .cm-moment:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(5,10,8,.55) 0%,transparent 20%,transparent 36%,rgba(5,10,8,.94) 100%)}
        .cm-moment-cap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:26px}
        .cm-moment-cap span{display:inline-block;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--green);margin-bottom:8px}
        .cm-moment-cap h3{font-family:Manrope,system-ui,sans-serif;font-size:1.35rem;letter-spacing:-.02em;margin:0 0 6px}
        .cm-moment-cap p{margin:0;color:#b9cbc1;font-size:.95rem;line-height:1.5;max-width:420px}
        .cm-moments-note{margin:18px auto 0;text-align:center;font-size:.74rem;color:#6f857a}
        @media(max-width:900px){.cm-moments{padding:20px 16px 80px}.cm-moments-grid{grid-template-columns:1fr}.cm-moment{min-height:460px}.cm-moment.wide{min-height:300px}}
      `}</style>
      <motion.div className="cm-moments-head" {...rise()}>
        <div className="cm-kicker">From search to the counter</div>
        <h2>Find it on your phone.<br />Collect it from a pharmacy near you.</h2>
        <p>ChekaMeds points people to participating pharmacies, so the trip is worth making.</p>
      </motion.div>
      <div className="cm-moments-grid">
        <motion.figure className="cm-moment" style={{ margin: 0 }} {...rise(0.05)}>
          <LazyVideo className="vid" src="/media/woman-s.mp4" poster="/media/woman-poster.webp" alt="A woman smiles as she reads a message on her phone outside a pharmacy" />
          <figcaption className="cm-moment-cap"><span>Step 1</span><h3>Ask on WhatsApp or the website</h3><p>Type the medicine and your town. No app to install.</p></figcaption>
        </motion.figure>
        <motion.figure className="cm-moment wide" style={{ margin: 0 }} {...rise(0.15)}>
          <LazyVideo className="vid" src="/media/pharm-s.mp4" poster="/media/pharm-poster.webp" alt="A pharmacist hands a paper bag to a customer at a pharmacy counter" />
          <figcaption className="cm-moment-cap"><span>Step 2</span><h3>Confirm with the pharmacy, then collect</h3><p>Contact the pharmacy to confirm stock, price and hours before you travel.</p></figcaption>
        </motion.figure>
      </div>
      <p className="cm-moments-note">Illustrative scenes, AI-generated. Not real ChekaMeds customers or pharmacies.</p>
    </section>
  );
}
