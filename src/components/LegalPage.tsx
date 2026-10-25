import { ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '@/components/SiteHeader';

/* Shared layout for the Privacy Policy and Terms of Use ("Glass Night"). */

export type LegalSection = { id: string; title: string; body: ReactNode };

export default function LegalPage({ eyebrow, title, intro, updated, sections, other }: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  updated: string;
  sections: LegalSection[];
  other: { label: string; to: string };
}) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | ChekaMeds`;
    return () => { document.title = prev; };
  }, [title]);

  return (
    <div className="cms cm-legal">
      <style>{`
        .cm-legal-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:56px;align-items:start;margin-top:40px}
        .cm-legal-toc{position:sticky;top:24px;display:grid;gap:2px;padding:18px;border-radius:20px;background:rgba(17,16,15,.35);backdrop-filter:blur(20px);border:1px solid var(--line)}
        .cm-legal-toc p{font-size:.78rem;color:var(--dim);margin:0 0 8px}
        .cm-legal-toc a{font-size:.88rem;color:var(--ink-2);padding:7px 10px;border-radius:9px}
        .cm-legal-toc a:hover{background:rgba(255,255,255,.06);color:#fff}
        .cm-legal-body{max-width:760px}
        .cm-legal-body section{padding:28px 0;border-bottom:1px solid var(--line);scroll-margin-top:24px}
        .cm-legal-body section:first-child{padding-top:0}
        .cm-legal-body h2{font-size:1.45rem;font-weight:500;margin:0 0 14px}
        .cm-legal-body h3{font-size:1.02rem;font-weight:500;margin:20px 0 8px}
        .cm-legal-body p,.cm-legal-body li{color:var(--ink-2);line-height:1.7;font-size:.98rem}
        .cm-legal-body p{margin:0 0 12px}
        .cm-legal-body ul{margin:0 0 12px;padding-left:20px;display:grid;gap:6px}
        .cm-legal-body a{color:#fff;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(255,255,255,.35)}
        .cm-legal-body table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:.92rem}
        .cm-legal-body th,.cm-legal-body td{text-align:left;padding:10px 12px;border:1px solid var(--line)!important;vertical-align:top;color:var(--ink-2)}
        .cm-legal-body th{color:#fff!important;font-weight:500;background:rgba(255,255,255,.04)}
        .cm-legal-tbl{overflow-x:auto}
        .cm-legal-meta{display:flex;flex-wrap:wrap;gap:10px 22px;color:var(--muted);font-size:.88rem;margin-top:6px}
        @media(max-width:900px){.cm-legal-grid{grid-template-columns:1fr;gap:28px}.cm-legal-toc{position:static}}
      `}</style>
      <SiteHeader />
      <main className="cms-wrap cms-page" style={{ paddingTop: 0 }}>
        <section className="cms-hero">
          <span className="cms-eyebrow"><i /> {eyebrow}</span>
          <h1 className="cms-h1" style={{ fontSize: 'clamp(2.2rem,4.6vw,3.6rem)' }}>{title}</h1>
          <div className="cms-lead" style={{ maxWidth: 720 }}>{intro}</div>
          <div className="cm-legal-meta">
            <span>Last updated {updated}</span>
            <span>IBLIM Enterprises (Pty) Ltd · CIPA BW00002903575</span>
            <Link to={other.to} style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}>{other.label}</Link>
          </div>
        </section>

        <div className="cm-legal-grid">
          <nav className="cm-legal-toc" aria-label="On this page">
            <p>On this page</p>
            {sections.map((s) => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
          </nav>
          <div className="cm-legal-body">
            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h2>{s.title}</h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
