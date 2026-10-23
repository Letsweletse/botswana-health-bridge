import { Home, Info, MessageCircle, ShieldCheck, Video } from 'lucide-react';
import ConsultantRequestForm from '@/components/ConsultantRequestForm';
import SiteHeader from '@/components/SiteHeader';
import { consultantVideoImage } from '@/assets/consultantVideoImage';

const Consultant = () => (
  <div className="cms cm-consult">
    <style>{`
      .cm-consult-hero{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;padding:48px 0 8px}
      .cm-consult-img{position:relative;border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--line);aspect-ratio:4/3.4;background:#0a1410}
      .cm-consult-img img{width:100%;height:100%;object-fit:cover}
      .cm-consult-img::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(5,10,8,.75))}
      .cm-consult-cap{position:absolute;left:18px;right:18px;bottom:16px;z-index:1;font-size:.9rem;color:#dbe9e1}
      .cm-consult-ways{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
      .cm-consult-flow{display:flex;gap:18px;flex-wrap:wrap;margin-top:20px;color:var(--muted);font-size:.88rem}
      .cm-consult-flow span{display:inline-flex;gap:7px;align-items:center}
      .cm-consult-flow svg{color:var(--g)}
      .cm-consult-form{margin-top:48px}
      @media(max-width:900px){.cm-consult-hero{grid-template-columns:1fr;gap:24px;padding-top:28px}.cm-consult-img{order:-1;aspect-ratio:16/10}}
      @media(max-width:520px){.cm-consult-ways{grid-template-columns:1fr}}
    `}</style>
    <SiteHeader />
    <main className="cms-wrap cms-page" style={{ paddingTop: 0 }}>
      <section className="cm-consult-hero">
        <div>
          <span className="cms-eyebrow"><i /> Video consultation</span>
          <h1 className="cms-h1" style={{ fontSize: 'clamp(2.1rem,4.4vw,3.3rem)', marginTop: 14 }}>See a provider <em>without the long trip.</em></h1>
          <p className="cms-lead" style={{ marginTop: 14 }}>Request a video consultation from home, or get help at a partner pharmacy or clinic. Built for villages as much as cities.</p>
          <div className="cm-consult-ways">
            <div className="cms-card cms-card-tight"><span className="cms-icon"><Home size={19} /></span><h3 className="cms-h3">From home</h3><p>Describe your symptoms and get a secure video link where appropriate.</p></div>
            <div className="cms-card cms-card-tight"><span className="cms-icon"><ShieldCheck size={19} /></span><h3 className="cms-h3">At a partner pharmacy</h3><p>Staff help you set up the call and collect your medicine after.</p></div>
          </div>
          <div className="cm-consult-flow">
            <span><ShieldCheck size={15} /> Request reviewed</span>
            <span><MessageCircle size={15} /> Link sent on WhatsApp</span>
            <span><Video size={15} /> Video call</span>
          </div>
        </div>
        <figure className="cm-consult-img" style={{ margin: 0 }}>
          <img src={consultantVideoImage} alt="An older woman in Botswana on a video call with a doctor on her phone" loading="eager" />
          <figcaption className="cm-consult-cap">Virtual care that works at home, in villages and at partner facilities.</figcaption>
        </figure>
      </section>

      <div className="cms-note" style={{ marginTop: 28 }}>
        <Info size={17} /> ChekaMeds connects patients with participating providers. It does not diagnose, prescribe or replace emergency care. In an emergency, go to the nearest clinic or hospital, or call 997.
      </div>

      <div className="cm-consult-form">
        <ConsultantRequestForm />
      </div>
    </main>
  </div>
);

export default Consultant;
