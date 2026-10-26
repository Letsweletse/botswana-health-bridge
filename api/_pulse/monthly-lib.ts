import type { Report } from './report-lib.js';
import { reportUrl } from './report-lib.js';
import { unsubUrl } from './digest-lib.js';

/* Monthly message: headline numbers + a link to the full glass-night report. */

const n = (x: number) => x.toLocaleString('en-GB');
const chg = (v: number | null) => (v == null ? '' : v > 2 ? ` (▲ ${v}%)` : v < -2 ? ` (▼ ${Math.abs(v)}%)` : '');
const where = (r: Report) => (r.townName ? `in ${r.townName}` : 'across Botswana');

export function monthlyWhatsapp(r: Report): string {
  const h = r.headline;
  const top = r.medicines.slice(0, 3).map((m) => m.name).join(', ');
  const missed = r.missed.slice(0, 3).map((m) => m.name).join(', ');
  return [
    `📈 *Your ChekaMeds market report: ${r.monthLabel}*`,
    r.clinic,
    '',
    `• *${n(h.townSearches)}* medicine searches ${where(r)}${chg(h.townSearchesChange)}`,
    `• *${n(h.yourSearches)}* were for medicines you list${chg(h.yourSearchesChange)}, ${h.coverage}% of local demand`,
    `• *${n(h.uniqueSearchers)}* people searched; ${h.returningShare}% came back`,
    r.peakDay && r.peakHour != null ? `• Busiest: ${r.peakDay}s around ${String(r.peakHour).padStart(2, '0')}:00` : null,
    top ? `• Most searched: ${top}` : null,
    missed ? `• Searched but not found anywhere: ${missed}` : null,
    r.restock.length ? `• ${r.restock.length} medicine${r.restock.length === 1 ? '' : 's'} you list showed out of stock while people searched for them` : null,
    '',
    `👉 Open your full report (charts, top 20 medicines, prices vs your town):`,
    reportUrl(r.clinic, r.month),
    '',
    `_Counts only, no customer details._`,
    `Stop these updates: ${unsubUrl(r.clinic)}`,
  ].filter((l) => l !== null).join('\n');
}

export function monthlySubject(r: Report) {
  return `${r.monthLabel}: ${n(r.headline.townSearches)} medicine searches ${where(r)}, your ChekaMeds report`;
}

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function monthlyEmail(r: Report): { html: string; text: string } {
  const h = r.headline; const url = reportUrl(r.clinic, r.month);
  const tile = (v: string, k: string, sub = '') => `<td width="33%" style="padding:6px"><div style="background:#151a3f;border:1px solid #2a3170;border-radius:14px;padding:14px 12px;text-align:center"><div style="font-size:24px;font-weight:bold;color:#ffffff">${esc(v)}</div><div style="font-size:12px;color:#aab0e6;margin-top:3px">${esc(k)}</div>${sub ? `<div style="font-size:11px;color:#7ee0c3;margin-top:3px">${esc(sub)}</div>` : ''}</div></td>`;
  const rows = (list: { name: string; v: string }[]) => list.map((x) => `<tr><td style="padding:8px 0;border-bottom:1px solid #232a5e;color:#e6e8ff;font-size:14px">${esc(x.name)}</td><td style="padding:8px 0;border-bottom:1px solid #232a5e;color:#f5d36b;font-size:14px;text-align:right;font-weight:bold">${esc(x.v)}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#05060f;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05060f;padding:24px 10px"><tr><td align="center">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#0b0e26;border:1px solid #232a5e;border-radius:20px;overflow:hidden">
<tr><td style="padding:26px 24px 8px;background:#11154a">
<div style="color:#e8b10b;font-size:12px;font-weight:bold;letter-spacing:2px">CHEKAMEDS MARKET REPORT</div>
<div style="color:#ffffff;font-size:24px;font-weight:bold;margin-top:8px">${esc(r.clinic)}</div>
<div style="color:#aab0e6;font-size:14px;margin:4px 0 16px">${esc(r.monthLabel)}${r.townName ? ` · ${esc(r.townName)}` : ''}</div>
</td></tr>
<tr><td style="padding:12px 18px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${tile(n(h.townSearches), `searches ${where(r)}`, h.townSearchesChange != null ? `${h.townSearchesChange > 0 ? '▲' : '▼'} ${Math.abs(h.townSearchesChange)}% vs ${r.prevMonthLabel}` : '')}
${tile(n(h.yourSearches), 'for medicines you list', `${h.coverage}% of local demand`)}
${tile(n(h.uniqueSearchers), 'people searching', `${h.returningShare}% returning`)}
</tr></table></td></tr>
<tr><td style="padding:10px 24px">
${r.medicines.length ? `<div style="color:#ffffff;font-size:15px;font-weight:bold;margin:12px 0 4px">Most searched ${esc(where(r))}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows(r.medicines.slice(0, 5).map((m) => ({ name: `${m.name}${m.youInStock ? '  ✓' : m.youList ? '  (out of stock)' : '  (not listed)'}`, v: String(m.searches) })))}</table>` : ''}
${r.missed.length ? `<div style="color:#ffffff;font-size:15px;font-weight:bold;margin:20px 0 4px">Searched but not found anywhere</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows(r.missed.slice(0, 5).map((m) => ({ name: m.name, v: String(m.notFound) })))}</table>` : ''}
${r.peakDay && r.peakHour != null ? `<p style="color:#aab0e6;font-size:14px;margin:18px 0 0">Busiest time: <b style="color:#fff">${esc(r.peakDay)}s around ${String(r.peakHour).padStart(2, '0')}:00</b>. ${r.afterHoursShare}% of searches came outside 08:00–18:00.</p>` : ''}
<p style="margin:24px 0 8px;text-align:center"><a href="${url}" style="display:inline-block;background:#e8b10b;color:#141a33;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;font-size:15px">Open your full report</a></p>
<p style="color:#7e85c4;font-size:12px;text-align:center;margin:0 0 18px">Charts, when and where people search, your top 20 medicines and your prices against your town.</p>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #232a5e;font-size:11px;color:#6d74b0;line-height:1.5">Counts only: no customer names, numbers or individual searches. ChekaMeds · IBLIM Enterprises (Pty) Ltd. <a href="${unsubUrl(r.clinic)}" style="color:#6d74b0">Stop these emails</a>.</td></tr>
</table></td></tr></table></body></html>`;
  const text = monthlyWhatsapp(r).replace(/\*/g, '').replace(/_/g, '');
  return { html, text };
}
