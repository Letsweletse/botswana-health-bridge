// ChekaMeds WhatsApp webhook — v200
//
// What changed from v119 and why:
//   • Matching moved into Postgres (search_inventory RPC). No more %infix%
//     LIKE over 100k rows in the function. "vis" can no longer match Gaviscon.
//   • Hard dosage-form guard. An eye-drop query cannot return an oral antacid.
//   • The alternatives feature is GONE. The platform never tells a patient
//     that one medicine treats the same thing as another. It shows stock and
//     routes clinical judgement to the pharmacist.
//   • Gemini normalises wording only, with a real token budget and a
//     finishReason check. Truncated output is discarded, never parsed.
//   • Replies are short enough to read on one phone screen.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESERVATION_HOURS = 3;
// Six results: slots 1-3 partner pharmacies, slots 4-6 everyone else.
// If either side is short, the other backfills rather than leaving the list
// stubby. The reply header describes whatever ordering these two produce —
// see resultsMsg — so changing them here changes the wording automatically.
const RESULT_SLOTS = 6;
const PARTNER_TOP_SLOTS = 3;      // partner pharmacies pinned to slots 1-3
// Small "partner" tag on pinned rows. Item-level labelling is how every
// marketplace handles paid placement — quiet, but it means the pinning is
// never hidden. Set false to remove it.
const SHOW_PARTNER_TAG = true;
const PARTNER_MATCH = "pulse";
const MIN_QUERY_LEN = 3;          // was effectively 2 — "vis" got through
const SUGGEST_FLOOR = 0.62;       // below this we do not even offer a guess

const KNOWN_LOCATIONS = ["jwaneng","gaborone","francistown","maun","kasane","palapye","serowe","lobatse","kanye","molepolole","tlokweng","mogoditshane","ramotswa","orapa","letlhakane","selebi phikwe","selibe phikwe","ghanzi","tsabong","hukuntsi","shakawe","gumare","masunga","tati siding","tati","tutume","bordergate"];
const NON_MEDICINE = ["gold plated","regular gold","necklace","bracelet","earring","earrings","perfume","hair piece","hairpiece","body spray","toy","watch"];
const JUNK = ["google","facebook","youtube","instagram","tiktok","gmail","whatsapp","website","url","link","login","password"];

const RESERVE   = /^(store|buy|purchase|reserve for pickup|reserve for pick up|reserve pickup|reserve pick up|pay at store|reserve|pickup|pick up|reserv|reserb|resrv|reseve|resrve|proceed|i want to reserve|i want to collect|i will collect|i will pick up|pay in store|pay at counter|yes reserve|confirm reserve)$/;
const CONSULT   = /^(video consult|consult|doctor|video|online consult|consult a doctor|video_consult|speak to doctor|talk to doctor)$/;
const OPTOUT    = /^(stop|unsubscribe|opt out|optout|no messages|remove me)$/;
const NOTIFY_ME = /^(notify|notify me|alert me|tell me|watch|remind me|yes notify)$/;
const GREETING  = /^(hi|hello|hey|help|menu|start|dumelang|dumela|0)$/;
const YES       = /^(yes|yep|ya|yeah|sure|ok|okay|correct|right|yebo|ee|eya|confirm)$/;

// ─── UltraMsg ───────────────────────────────────────────────────────────────
const ULTRAMSG_FALLBACK = "instance114633";
function resolveInstance(): string {
  const raw = (Deno.env.get("ULTRAMSG_INSTANCE_ID") || Deno.env.get("ULTRAMSG_INSTANCE") || "").trim();
  if (!raw) { console.warn(`ULTRAMSG_INSTANCE_ID not set; using ${ULTRAMSG_FALLBACK}`); return ULTRAMSG_FALLBACK; }
  if (/^instance\d+$/.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return `instance${raw}`;
  console.error(`ULTRAMSG_INSTANCE_ID is "${raw}" — not an instance id. Using ${ULTRAMSG_FALLBACK}.`);
  return ULTRAMSG_FALLBACK;
}
const ULTRAMSG_INSTANCE = resolveInstance();
const ULTRAMSG_TOKEN = Deno.env.get("ULTRAMSG_TOKEN") || "";

// ─── Gemini ─────────────────────────────────────────────────────────────────
// One job only: turn human wording into a search term. It never sees stock,
// never names a pharmacy, never suggests a substitute.
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_KEY;

const GEMINI_SYSTEM = [
  "You normalise shoppers' words into ONE search term for a Botswana pharmacy stock lookup.",
  "Return ONLY the term. No sentence, no explanation, maximum 4 words.",
  "",
  "1. Misspelled medicine -> corrected name. 'amoxicilin' -> amoxicillin. 'paracetmol' -> paracetamol.",
  "2. Brand name -> keep the brand. 'panado' -> panado. 'durex' -> durex. 'gaviscon' -> gaviscon.",
  "3. Product described by type -> the type. 'drops for my eyes' -> eye drops. 'cough mixture' -> cough syrup.",
  "4. A SPECIFIC symptom -> the product CATEGORY, never a named drug.",
  "   'my head is paining' -> pain relief. 'blocked nose' -> nasal spray.",
  "5. A VAGUE statement of being unwell, in any language, is NOT a product.",
  "   'ke a lwala', 'I feel sick', 'I am not well' -> return exactly: NONE",
  "6. Contraceptives -> condom. ",
  "7. Nothing to do with health -> return exactly: NONE",
  "",
  "You do not know what is in stock. Never state availability, price or a pharmacy name.",
  "Never give a dose, a treatment plan, or medical advice.",
].join("\n");

async function geminiNormalise(message: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: GEMINI_SYSTEM + "\n\nMESSAGE: " + message }] }],
        // 512, not 60. gemini-2.5-flash spends output tokens on reasoning
        // before it writes anything; a small budget returns truncated text.
        // That is how "visine" once became "vis".
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      }),
    });
    const data = await res.json();
    if (data?.error) { console.error("GEMINI_ERROR:", JSON.stringify(data.error).slice(0, 300)); return null; }

    // Discard anything the model did not finish writing.
    const finish = data?.candidates?.[0]?.finishReason;
    if (finish && finish !== "STOP") { console.warn("GEMINI_TRUNCATED finishReason=", finish); return null; }

    const out = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    console.log("GEMINI_NORMALISE:", message, "->", out, "finish=", finish);
    if (!out || out.toUpperCase() === "NONE") return null;

    const cleaned = out.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (cleaned.length < MIN_QUERY_LEN) { console.warn("GEMINI_REJECT too_short:", cleaned); return null; }
    if (cleaned.split(" ").length > 4)   { console.warn("GEMINI_REJECT too_long:", cleaned); return null; }
    if (/\b(pharmacy|pula|bwp|price|stock|available|p\d)\b/.test(cleaned)) { console.warn("GEMINI_REJECT claim_like:", cleaned); return null; }
    return cleaned;
  } catch (e) {
    console.error("GEMINI_EXCEPTION:", String(e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Visual language ────────────────────────────────────────────────────────
// WhatsApp has no coloured text — not an UltraMsg limit, the platform simply
// has no such feature. Available: *bold* _italic_ ~strike~ ```mono``` > quote.
// The only real colour channel is emoji, so the coloured dots carry the one
// thing that genuinely needs colour: how much to trust the stock figure.
//
//   *bold*    the medicine, the price, the action — what the eye lands on
//   _italic_  everything secondary: age of data, ordering, caveats
//   ⚠️        needs attention before travelling (prescription, last one left)
//
// Stock age is NOT shown to patients — product decision, 14 Oct. It still
// flows through search_inventory and into search_logs so the dashboard and
// the pharmacy-side reports can see it. Internal signal, not a user-facing one.
const DIV = "━━━━━━━━━━━━━━━";
const b  = (s: string) => `*${s}*`;
const it = (s: string) => `_${s}_`;

// Freshness. A patient deciding whether to make a journey deserves to know
// how old the number is. Never-updated rows say so rather than pretending.
// INTERNAL ONLY. Not rendered to patients (product decision, 14 Oct).
// Used to tag search_logs so the dashboard can show which pharmacies are
// letting their stock go stale — the people who can actually fix it.
function freshness(hours: number | null | undefined): { dot: string; label: string; trust: boolean } {
  if (hours == null)  return { dot: "🔴", label: "last update unknown — phone first", trust: false };
  if (hours <= 2)     return { dot: "🟢", label: "updated just now", trust: true };
  if (hours <= 48)    return { dot: "🟢", label: hours < 24 ? `updated ${Math.round(hours)}h ago` : "updated yesterday", trust: true };
  if (hours <= 168)   return { dot: "🟡", label: `updated ${Math.round(hours/24)} days ago`, trust: true };
  if (hours <= 720)   return { dot: "🔴", label: `${Math.round(hours/24)} days old — phone first`, trust: false };
  return                     { dot: "🔴", label: "over a month old — phone first", trust: false };
}

// ─── Types ──────────────────────────────────────────────────────────────────
type Hit = {
  clinic_name: string; med_name: string; generic_name: string | null;
  quantity: number; low_stock: boolean | null; price_bwp: number | null;
  location: string | null; directions_link: string | null; contact: string | null;
  strength: string | null; pack_size: string | null;
  dosage_form: string | null; form_group: string | null;
  // rx_required comes straight from the pharmacy's own prescription_required
  // flag. Nothing is inferred — their data or nothing.
  rx_required: boolean | null; stock_age_hours: number | null;
  match_kind: "exact" | "prefix" | "fulltext" | "fuzzy"; score: number;
};
type Opt = Hit & { weekday_hours: string | null; weekend_hours: string | null; distance_km: number | null };
type PInfo = { contact: string|null; weekday_hours: string|null; weekend_hours: string|null; address: string|null; lat: number|null; lng: number|null };
type Session = { medicine: string; options: Opt[]; selected: Opt|null; state: string; user_lat: number|null; user_lng: number|null; pending: string|null };
type WA = { text: string; buttons?: { id: string; text: string }[] };

// ─── Helpers ────────────────────────────────────────────────────────────────
const sb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ct = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
// Phone normalisation. Real pharmacy records are messy — "397 1606 (WhatsApp
// 7532697)" is a genuine value from the pharmacies table. The old version
// stripped every non-digit and welded two numbers into one 14-digit fiction,
// which was then shown to patients and used for reservation alerts.
// Now: take the FIRST plausible Botswana number in the string, and return ""
// rather than something invented.
const cp = (r: string): string => {
  const raw = String(r || "").replace(/@c\.us|@s\.whatsapp\.net/g, " ");
  // already a full international number?
  const intl = raw.match(/(?:\+|00)?(267\d{8})/);
  if (intl) return intl[1];
  // otherwise find candidate local runs of digits, ignoring separators within
  const runs = (raw.match(/\d[\d\s-]*\d|\d/g) || []).map(x => x.replace(/\D/g, ""));
  for (const d of runs) {
    if (d.length === 8 && /^[2-7]/.test(d)) return `267${d}`;   // 8-digit local
    if (d.length === 9 && d[0] === "0")     return `267${d.slice(1)}`;
    if (d.length === 11 && d.startsWith("267")) return d;
  }
  // 7-digit Gaborone landlines exist in the data; keep them as-is so they can
  // still be displayed, but they will not pass the >= 11 reservation check.
  for (const d of runs) if (d.length === 7) return `267${d}`;
  return "";
};
// Display helper: never print a number we could not make sense of.
const phone = (v?: string | null) => { const p = cp(String(v || "")); return p.length >= 10 ? `+${p}` : null; };
const money = (v: number|null|undefined) => v != null ? `P${Number(v).toFixed(2)}` : null;
const realLink = (v?: string|null) => { const s=String(v||"").trim(); return (/^https:\/\//i.test(s) && !/example|placeholder|fake|test/i.test(s)) ? s : ""; };
const hasLoc = (v?: string|null) => { const s=ct(v); return !!(s && !["botswana","unknown","not listed","n a"].includes(s)); };
const isPartner = (n: string) => ct(n).includes(PARTNER_MATCH);
const tital = (s: string) => s ? s.split(" ").map(w => w ? w[0].toUpperCase()+w.slice(1) : w).join(" ") : s;
const uuid = () => crypto.randomUUID();
const fmtDist = (k: number) => k < 1 ? `${Math.round(k*1000)} m` : `${k.toFixed(1)} km`;

function hav(la1:number,lo1:number,la2:number,lo2:number){
  const R=6371,dL=(la2-la1)*Math.PI/180,dG=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ─── Query understanding ────────────────────────────────────────────────────
const ALIASES: Record<string,string> = {
  panado:"paracetamol",panadol:"paracetamol",panadoo:"paracetamol",panodo:"paracetamol",panadole:"paracetamol",
  paracetmol:"paracetamol",parecetamol:"paracetamol",parasetamol:"paracetamol",paracitamol:"paracetamol",paracet:"paracetamol",
  brufen:"ibuprofen",ibrufen:"ibuprofen",ibrofen:"ibuprofen",ibuprofin:"ibuprofen",brugesic:"ibuprofen",
  amoxil:"amoxicillin",amoxilin:"amoxicillin",amoxycillin:"amoxicillin",amoxy:"amoxicillin",
  allergex:"chlorpheniramine",alergex:"chlorpheniramine",disprin:"aspirin",asprin:"aspirin",
  cetrezine:"cetirizine",cetrizine:"cetirizine",citrizine:"cetirizine",
  omperazole:"omeprazole",esomperazole:"esomeprazole",canesten:"clotrimazole",candid:"clotrimazole",
  metfomin:"metformin",losaten:"losartan",amlodipin:"amlodipine",atovastatin:"atorvastatin",
  zithromax:"azithromycin",cipro:"ciprofloxacin",voltaren:"diclofenac",ventolin:"salbutamol",
  coartem:"artemether lumefantrine",flomax:"tamsulosin",viagra:"sildenafil",dynafil:"sildenafil",
  condoms:"condom",kondom:"condom",
};

// Route of administration implied by the shopper's own words.
// This is what stops a mouthwash answering an eye-drop question.
const FORM_HINTS: [RegExp, string][] = [
  [/\b(eye ?drops?|eyedrops?|ophthalmic|drops? for (my )?eyes?|eye ointment|eye gel)\b/, "ophthalmic"],
  [/\b(ear ?drops?|otic|drops? for (my )?ears?)\b/, "otic"],
  [/\b(nasal spray|nose drops?|nasal drops?)\b/, "nasal"],
  [/\b(mouth ?wash|mouthwash|gargle|oral rinse)\b/, "oralcare"],
  [/\b(inhaler|puffer|nebuli\w*)\b/, "inhaled"],
  [/\b(injection|jab|vial|ampoule)\b/, "injection"],
  [/\b(cream|ointment|lotion|gel for|patch)\b/, "topical"],
  [/\b(tablets?|capsules?|syrup|suspension|pills?)\b/, "oral"],
];
const FORM_LABEL: Record<string,string> = {
  ophthalmic:"eye", otic:"ear", nasal:"nasal", oralcare:"mouth and throat",
  inhaled:"inhaler", injection:"injectable", topical:"skin", oral:"oral", rectal_vaginal:"",
};
function wantedForm(raw: string): string | null {
  const t = ct(raw);
  for (const [re, group] of FORM_HINTS) if (re.test(t)) return group;
  return null;
}

const NOISE = /\b(please|pls|plz|find|search|looking|check|stock|available|avail|medicine|medication|meds|drug|price|need|for|do|you|have|where|can|i|get|is|there|near|me|want|buy|purchase|some|a|an|the|hello|hi|hey|good|morning|afternoon|evening)\b/g;

function normalise(msg: string): string {
  let t = ct(msg).replace(NOISE, " ").replace(/\s+/g, " ").trim();
  if (ALIASES[t]) return ALIASES[t];
  for (const [w, r] of Object.entries(ALIASES)) t = t.replace(new RegExp(`\\b${w}\\b`, "g"), r);
  return t.replace(/\s+/g, " ").trim();
}
const extractLoc = (m: string) => KNOWN_LOCATIONS.find(l => ct(m).includes(l)) || "";
function stripLoc(m: string, l: string) {
  if (!l) return ct(m);
  return ct(m).replace(new RegExp(`\\b${l}\\b`,"g")," ").replace(/\bnear me\b/g," ").replace(/\b(in|at|near)\b/g," ").replace(/\s+/g," ").trim();
}

// ─── Search ─────────────────────────────────────────────────────────────────
async function runSearch(term: string, form: string|null, loc: string): Promise<Hit[]> {
  if (!term || term.length < MIN_QUERY_LEN) return [];
  const { data, error } = await sb().rpc("search_inventory", {
    q: term, want_form: form, want_location: loc || null, max_rows: 60,
  });
  if (error) { console.error("SEARCH_RPC_ERROR:", error.message); return []; }
  const rows = (data || []) as Hit[];
  const clean = rows.filter(r => {
    const m = ct(r.med_name), c = ct(r.clinic_name);
    if (!m || !c) return false;
    if (["demo","test","sample","mock"].some(b => c.includes(b))) return false;
    if (NON_MEDICINE.some(b => m.includes(b))) return false;
    return true;
  });
  console.log("SEARCH:", term, "form=", form, "loc=", loc||"-", "->", clean.length, "hits",
              clean[0] ? `top=${clean[0].med_name}/${clean[0].match_kind}` : "");
  return clean;
}

const pCache = new Map<string, PInfo>();
async function pInfo(name: string): Promise<PInfo> {
  const k = ct(name);
  if (pCache.has(k)) return pCache.get(k)!;
  const empty: PInfo = { contact:null, weekday_hours:null, weekend_hours:null, address:null, lat:null, lng:null };
  try {
    const { data } = await sb().from("pharmacies")
      .select("contact,weekday_hours,weekend_hours,address,latitude,longitude")
      .ilike("clinic_name", `%${name.trim()}%`).maybeSingle();
    const r: PInfo = {
      contact: data?.contact ?? null, weekday_hours: data?.weekday_hours ?? null,
      weekend_hours: data?.weekend_hours ?? null, address: data?.address ?? null,
      lat: data?.latitude != null ? Number(data.latitude) : null,
      lng: data?.longitude != null ? Number(data.longitude) : null,
    };
    pCache.set(k, r); return r;
  } catch { return empty; }
}

// One row per pharmacy — five entries for the same medicine at one branch is
// noise, not choice.
function dedupeByPharmacy(hits: Hit[]): Hit[] {
  const seen = new Set<string>(); const out: Hit[] = [];
  for (const h of hits) { const k = ct(h.clinic_name); if (seen.has(k)) continue; seen.add(k); out.push(h); }
  return out;
}

async function toOptions(hits: Hit[], lat: number|null, lng: number|null): Promise<Opt[]> {
  return await Promise.all(dedupeByPharmacy(hits).map(async h => {
    const info = await pInfo(h.clinic_name);
    const dist = (lat != null && lng != null && info.lat != null && info.lng != null)
      ? hav(lat, lng, info.lat, info.lng) : null;
    return { ...h, contact: info.contact ?? h.contact, weekday_hours: info.weekday_hours,
             weekend_hours: info.weekend_hours, distance_km: dist } as Opt;
  }));
}

// Partner pharmacies take slots 1-2. The header text says so — see resultsMsg.
// If you ever remove the label, remove the pinning too.
function arrange(opts: Opt[], byDistance: boolean): Opt[] {
  const sorter = byDistance
    ? (a: Opt, b: Opt) => (a.distance_km ?? 9e9) - (b.distance_km ?? 9e9)
    : (a: Opt, b: Opt) => b.score - a.score;
  const partners = opts.filter(o => isPartner(o.clinic_name)).sort(sorter);
  const others   = opts.filter(o => !isPartner(o.clinic_name)).sort(sorter);
  const out = partners.slice(0, PARTNER_TOP_SLOTS);
  for (const o of others) { if (out.length >= RESULT_SLOTS) break; out.push(o); }
  for (const p of partners.slice(PARTNER_TOP_SLOTS)) { if (out.length >= RESULT_SLOTS) break; out.push(p); }
  return out.slice(0, RESULT_SLOTS);
}

// ─── Messages ───────────────────────────────────────────────────────────────
function welcome(): WA {
  return { text:
`👋 ${b("Dumela! Welcome to ChekaMeds")} 💊
${DIV}
🇧🇼 Find medicine near you, anywhere in Botswana.

Just send me the name of what you need:
   💊 _Panado_
   💊 _Amoxicillin_
   💊 _Ventolin_

Or tell me how you feel and I will help you look 🤝

📍 Tip: tap 📎 → Location and I will show you how far each pharmacy is 🚗`,
    buttons: [{ id:"find_medicine", text:"🔍 Search" }, { id:"video_consult", text:"🩺 Consult a doctor" }] };
}
function askMed(note?: string): WA {
  return { text: `${note ? note + "\n\n" : ""}💬 ${b("What are you looking for?")}\n\nSend the medicine name or the brand — whatever is on the box is fine 👍\n\n_Panado · Esomeprazole · eye drops · blood pressure tablets_` ,
    buttons: [{ id:"video_consult", text:"🩺 Consult a doctor" }] };
}
function consultPage(): WA {
  return { text: `🩺 ${b("Speak to a clinician")}\n${DIV}\n👨‍⚕️ Talk to a licensed professional from your phone — no travel, no queue.\n\n🔗 www.chekameds.co.bw/consultant`,
    buttons: [{ id:"find_medicine", text:"🔍 Search medicine" }] };
}

function resultsMsg(term: string, opts: Opt[], byDistance: boolean, note?: string): WA {
  const n = opts.length;
  // No ordering claim in the header. The old version printed "sorted by
  // nearest" while pinning partners, which was false and therefore needed a
  // correction line. Claiming nothing needs no correction — and every row
  // carries its own distance, so a patient can see the order for themselves.
  //
  // The one rule: if you ever put an ordering claim back in this header, it
  // must match what `arrange()` actually does.

  const lines = opts.map((o, i) => {
    const priced = money(o.price_bwp);
    const bits: string[] = priced ? [`💰 ${b(priced)}`] : [];
    if (o.distance_km != null) bits.push(`🚗 ${fmtDist(o.distance_km)}`);
    const flags: string[] = [];
    if (o.low_stock) flags.push(`🔥 ${it(o.quantity === 1 ? "last one!" : `only ${o.quantity} left`)}`);
    if (o.rx_required) flags.push(`📋 ${it("prescription needed")}`);
    return [
      `${b(`${i+1}.`)}  💊 ${b(o.med_name)}${o.strength ? ` ${o.strength}` : ""}`,
      `     🏥 ${o.clinic_name}${SHOW_PARTNER_TAG && isPartner(o.clinic_name) ? ` ⭐` : ""}`,
      bits.length ? `     ${bits.join("   ")}` : null,
      flags.length ? `     ${flags.join("  ")}` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return { text:
`${note ? note + "\n\n" : ""}✅ Good news — ${b(tital(term))} is listed at ${b(String(n))} ${n === 1 ? "pharmacy" : "pharmacies"} 🇧🇼

${lines}

${DIV}
👇 Reply ${b("1")}–${b(String(n))} to see the phone number, hours and directions.`,
    buttons: [{ id:"find_medicine", text:"🔍 New search" }] };
}

function stockCard(o: Opt): WA {
  const hours = o.weekday_hours ? `${o.weekday_hours}${o.weekend_hours ? ` · ${o.weekend_hours}` : ""}` : null;
  const lines = [
    `💊 ${b(o.med_name)}${o.strength ? ` ${o.strength}` : ""}${o.pack_size ? ` · ${o.pack_size}` : ""}`,
    o.generic_name && ct(o.generic_name) !== ct(o.med_name) ? `    ${it(tital(o.generic_name))}` : null,
    `🏥 ${o.clinic_name}`,
    hasLoc(o.location) ? `📍 ${o.location}` : null,
    o.distance_km != null ? `🚗 ${fmtDist(o.distance_km)}` : null,
    phone(o.contact) ? `📞 ${phone(o.contact)}` : null,
    hours ? `⏰ ${hours}` : null,
    realLink(o.directions_link) ? `🗺️ ${realLink(o.directions_link)}` : null,
    money(o.price_bwp) ? `💰 ${b(money(o.price_bwp)!)}` : `💰 ${it("price not listed — ask the pharmacy")}`,
    ``,
    o.low_stock ? `⚠️ ${it(o.quantity === 1 ? "Last one on the shelf." : `Only ${o.quantity} left.`)}` : null,
    o.rx_required ? `⚠️ ${it("This usually needs a prescription. Bring it with you.")}` : null,
  ].filter(x => x !== null).join("\n");
  // "Call pharmacy" is a normal marketplace affordance, not a warning. It
  // quietly cuts wasted journeys without saying anything about the data.
  return { text: `${b("Here you go")} 👇\n${DIV}\n${lines}\n${DIV}\n📦 Tap ${b("Reserve")} and we will ask them to hold it for you.`,
    buttons: [{ id:"store", text:"📦 Reserve for pickup" },
              { id:"call_pharmacy", text:"📞 Call pharmacy" }] };
}

// UltraMsg's chat endpoint sends plain text — it cannot render buttons. Any
// button we build has to be printed as a word the user can type back, or the
// feature is invisible. This is why "Consult a doctor" was unreachable.
const BUTTON_KEY: Record<string, string> = {
  find_medicine: "SEARCH", video_consult: "DOCTOR", store: "RESERVE",
  change_location: "TOWN", notify_me: "NOTIFY", call_pharmacy: "CALL",
  confirm_suggestion: "YES", loc_gaborone: "GABORONE", loc_jwaneng: "JWANENG",
  loc_all: "ANYWHERE",
};

function waText(p: WA): string {
  if (!p.buttons?.length) return p.text;
  const opts = p.buttons
    .map(btn => { const k = BUTTON_KEY[btn.id]; return k ? `${btn.text}  →  reply ${b(k)}` : null; })
    .filter(Boolean);
  if (!opts.length) return p.text;
  return `${p.text}\n\n${DIV}\n${opts.join("\n")}`;
}

// ─── Analytics (unchanged behaviour, tidier) ────────────────────────────────
async function logSearch(o: Record<string, unknown>) {
  try { const { error } = await sb().from("search_logs").insert(o); if (error) console.error("LOG_SEARCH:", error.message); }
  catch (e) { console.error("LOG_SEARCH_EX:", String(e)); }
}
async function logImpressions(searchId: string, query: string, opts: Opt[], phone: string, loc: string|null) {
  if (!opts.length) return;
  try {
    await sb().from("search_impressions").insert(opts.map((o, i) => ({
      search_id: searchId, pharmacy_name: o.clinic_name, medicine: o.med_name, query,
      position: i+1, price_bwp: o.price_bwp, quantity: o.quantity, distance_km: o.distance_km,
      user_phone: phone, location: loc, source: "whatsapp", selected: false, reserved: false,
    })));
  } catch (e) { console.error("LOG_IMPRESSION_EX:", String(e)); }
}
async function markImpression(pharmacy: string, medicine: string, phone: string, field: "selected"|"reserved") {
  try { await sb().from("search_impressions").update({ [field]: true })
    .eq("pharmacy_name", pharmacy).eq("medicine", medicine).eq("user_phone", cp(phone)); }
  catch (e) { console.error("MARK_IMPRESSION_EX:", String(e)); }
}
async function logFailed(normalized: string, query: string, phone: string, loc: string|null) {
  try { await sb().from("failed_searches").insert({ query, normalized_query: normalized, source:"whatsapp", user_phone: cp(phone), location: loc, notified: false }); }
  catch (e) { console.error("LOG_FAILED_EX:", String(e)); }
}

// ─── Sessions ───────────────────────────────────────────────────────────────
const blankSession = (): Session => ({ medicine:"", options:[], selected:null, state:"idle", user_lat:null, user_lng:null, pending:null });
async function readSession(phone: string): Promise<Session> {
  try {
    const { data } = await sb().from("whatsapp_sessions")
      .select("medicine,options,selected,state,user_lat,user_lng,pending").eq("from_number", cp(phone)).maybeSingle();
    if (!data) return blankSession();
    return { medicine: data.medicine || "", options: Array.isArray(data.options) ? data.options : [],
             selected: data.selected || null, state: data.state || "idle",
             user_lat: data.user_lat != null ? Number(data.user_lat) : null,
             user_lng: data.user_lng != null ? Number(data.user_lng) : null,
             pending: data.pending || null };
  } catch { return blankSession(); }
}
async function writeSession(phone: string, s: Session) {
  try { await sb().from("whatsapp_sessions").upsert(
    { from_number: cp(phone), medicine:s.medicine, options:s.options as unknown,
      selected:s.selected as unknown, state:s.state, user_lat:s.user_lat, user_lng:s.user_lng,
      pending:s.pending, updated_at:new Date().toISOString() }, { onConflict:"from_number" }); }
  catch (e) { console.error("writeSession:", String(e)); }
}

// ─── Reservation ────────────────────────────────────────────────────────────
async function notifyPharmacy(phone: string, msg: string, pharmacy: string, medicine: string): Promise<boolean> {
  if (!ULTRAMSG_INSTANCE || !ULTRAMSG_TOKEN) return false;
  try {
    const r = await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ token: ULTRAMSG_TOKEN, to: phone, body: msg, priority: 10 }) });
    const j = await r.json(); const ok = j?.sent === "true" || j?.sent === true;
    try { await sb().from("pharmacy_notification_logs").insert({ pharmacy, pharmacy_phone:phone, medicine, sent:ok, error: ok?null:JSON.stringify(j), ultramsg_response:j }); } catch {}
    return ok;
  } catch (e) {
    try { await sb().from("pharmacy_notification_logs").insert({ pharmacy, pharmacy_phone:phone, medicine, sent:false, error:String(e), ultramsg_response:null }); } catch {}
    return false;
  }
}

async function doReserve(phone: string, sel: Opt): Promise<string> {
  const cPhone = cp(phone);
  const info = await pInfo(sel.clinic_name);
  let pPhone = cp(String(info.contact || sel.contact || ""));
  if (pPhone.length < 11) {
    try {
      const { data } = await sb().from("chekameds_facilities").select("phone_whatsapp")
        .ilike("facility_name", `%${sel.clinic_name.trim()}%`).not("phone_whatsapp","is",null).limit(1).maybeSingle();
      if (data?.phone_whatsapp) pPhone = cp(String(data.phone_whatsapp));
    } catch {}
  }
  const exp = new Date(Date.now() + RESERVATION_HOURS*3600000);
  const expTime = exp.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
  const expDate = exp.toLocaleDateString("en-GB", { weekday:"short", month:"short", day:"numeric" });

  let notified = false;
  if (pPhone.length >= 11 && pPhone !== cPhone) {
    notified = await notifyPharmacy(pPhone,
      `🔔 *New reservation — ChekaMeds*\n\n💊 ${sel.med_name}\n👤 +${cPhone}\n💰 ${money(sel.price_bwp) ?? "price not listed"}\n⏱️ Hold until ${expTime}, ${expDate}\n\nPlease set it aside. Release if not collected.`,
      sel.clinic_name, sel.med_name);
  }
  try {
    await sb().from("order_requests").insert({ from_number:cPhone, medicine:sel.med_name, pharmacy:sel.clinic_name,
      pharmacy_phone: pPhone.length>=11 ? pPhone : null, amount:sel.price_bwp,
      payment_status:"pending_store_payment", status:"reserved", expires_at:exp.toISOString(), notes:`Notified:${notified}` });
  } catch (e) { console.error("order insert:", String(e)); }
  await markImpression(sel.clinic_name, sel.med_name, cPhone, "reserved");

  return [
    `🎉 ${b("Reserved for you!")}`, DIV,
    `💊 ${sel.med_name}`,
    `🏥 ${sel.clinic_name}`,
    pPhone.length >= 11 ? `📞 +${pPhone}` : null,
    `💰 ${money(sel.price_bwp) ?? it("price not listed")}`, ``,
    DIV,
    notified ? `🔔 The pharmacy has been notified and is putting it aside for you.` : `📞 Please give them a quick call to confirm.`,
    `⏱️ Collect before ${b(expTime)} on ${expDate}`,
    `💳 Pay at the counter when you collect 👍`,
  ].filter(Boolean).join("\n");
}

// ─── The search conversation ────────────────────────────────────────────────
async function doSearch(phone: string, sess: Session, rawTerm: string, loc: string, form: string|null): Promise<WA> {
  const term = normalise(rawTerm) || ct(rawTerm);
  const cPhone = cp(phone);
  const searchId = uuid();

  if (term.length < MIN_QUERY_LEN) return askMed("That is a little short to search on.");

  let hits = await runSearch(term, form, loc);

  // Widen from the town to the whole country before giving up.
  let widened = false;
  if (!hits.length && loc) { hits = await runSearch(term, form, ""); widened = hits.length > 0; }

  if (hits.length) {
    const strong = hits.filter(h => h.match_kind !== "fuzzy");
    let useHits = strong.length ? strong : hits;

    // Only fuzzy matches. base is 0 for these, so score/300 is the raw
    // similarity. Three bands: confident enough to just show, close enough to
    // ask about, or too weak to mention at all.
    if (!strong.length) {
      const top = hits[0];
      const similarity = top.score / 300;
      if (similarity < SUGGEST_FLOOR) {
        useHits = [];                    // too weak to put in front of a patient
      } else if (similarity < 0.85 && ct(top.med_name) !== term) {
        await writeSession(phone, { ...sess, medicine: term, pending: top.med_name, options: [], selected: null, state: "suggest" });
        await logSearch({ search_id:searchId, query:rawTerm, normalized_query:term, results_count:0, source:"whatsapp",
          user_phone:cPhone, location:loc||null, reserved:false, found:false, matched_pharmacies:[], user_lat:sess.user_lat, user_lng:sess.user_lng });
        return { text: `No exact match for *${tital(term)}*.\n\nDid you mean *${tital(top.med_name)}*?`,
          buttons: [{ id:"confirm_suggestion", text:`✅ Yes` }, { id:"find_medicine", text:"🔍 Try again" }] };
      }
    }

    if (useHits.length) {
      const opts = arrange(await toOptions(useHits, sess.user_lat, sess.user_lng), sess.user_lat != null);
      const shownTerm = opts[0]?.med_name || term;
      await writeSession(phone, { ...sess, medicine: term, options: opts, selected: null, state: "has_results", pending: null });
      const oldest = Math.max(...opts.map(o => o.stock_age_hours ?? 0));
      console.log("STOCK_AGE:", term, "oldest_result_hours=", Math.round(oldest),
                  "stale_count=", opts.filter(o => !freshness(o.stock_age_hours).trust).length, "of", opts.length);
      await logSearch({ search_id:searchId, query:rawTerm, normalized_query:term, results_count:opts.length, source:"whatsapp",
        user_phone:cPhone, location:loc||null, reserved:false, found:true, matched_pharmacies:opts.map(o=>o.clinic_name),
        user_lat:sess.user_lat, user_lng:sess.user_lng });
      await logImpressions(searchId, term, opts, cPhone, loc||null);
      return resultsMsg(shownTerm, opts, sess.user_lat != null,
        widened ? `Nothing in ${tital(loc)} — showing the rest of Botswana.` : undefined);
    }
    // fell through: everything was too weak to show
  }

  // ── Nothing found ─────────────────────────────────────────────────────────
  await logSearch({ search_id:searchId, query:rawTerm, normalized_query:term, results_count:0, source:"whatsapp",
    user_phone:cPhone, location:loc||null, reserved:false, found:false, matched_pharmacies:[], user_lat:sess.user_lat, user_lng:sess.user_lng });
  await logFailed(term, rawTerm, cPhone, loc||null);
  await writeSession(phone, { ...sess, medicine: term, options: [], selected: null, state: "no_results", pending: null });

  // ── Same molecule, different name ────────────────────────────────────────
  // Panado and paracetamol 500mg are the SAME medicine, not similar ones.
  // Resolving a brand to its active ingredient is a fact about naming, read
  // from the pharmacies' own data. It is NOT the equivalence judgement that
  // produced the Gaviscon incident, and the wording keeps that distinction
  // visible to the patient.
  const { data: genericName } = await sb().rpc("resolve_generic", { p_term: term });
  if (genericName && ct(genericName) !== term) {
    const sameMolecule = await runSearch(String(genericName), form, loc);
    if (sameMolecule.length) {
      const opts = arrange(await toOptions(sameMolecule, sess.user_lat, sess.user_lng), sess.user_lat != null);
      const altId = uuid();
      await writeSession(phone, { ...sess, medicine: String(genericName), options: opts, selected: null, state: "has_results", pending: null });
      await logSearch({ search_id:altId, query:rawTerm, normalized_query:ct(genericName), results_count:opts.length, source:"whatsapp",
        user_phone:cPhone, location:loc||null, reserved:false, found:true, matched_pharmacies:opts.map(o=>o.clinic_name),
        user_lat:sess.user_lat, user_lng:sess.user_lng });
      await logImpressions(altId, String(genericName), opts, cPhone, loc||null);
      return resultsMsg(String(genericName), opts, sess.user_lat != null,
        `${b(tital(term))} is a brand name for ${b(tital(String(genericName)))} — ${it("the same medicine")}.`);
    }
  }

  // ── Coverage gap ─────────────────────────────────────────────────────────
  // "Out of stock" is false when the real answer is "no pharmacy of ours is
  // in your town". Different fact, different thing for the patient to do.
  if (loc) {
    const { data: cover } = await sb().rpc("coverage_in", { p_location: loc });
    if (Number(cover ?? 0) === 0) {
      return { text:
`📍 ${b(tital(loc))} — we are not there yet 😔
${DIV}
ChekaMeds has no pharmacy in ${b(tital(loc))} on the platform so far, so I cannot see what they have.

${it("That is a gap on our side, not a sold-out medicine.")}

🇧🇼 Want me to look across the whole country instead?`,
        buttons: [{ id:"loc_all", text:"🇧🇼 Search anywhere" }, { id:"notify_me", text:"🔔 Tell me when we cover it" }] };
    }
  }

  // If we know the route they need, show what IS stocked in that route.
  // This is a statement of fact about stock. It is NOT a claim that any of
  // it is a substitute — that sentence must never be generated again.
  if (form) {
    const { data } = await sb().rpc("browse_by_form", { p_form: form, want_location: loc || null, max_rows: 12 });
    const rows = (data || []) as Hit[];
    if (rows.length) {
      const opts = arrange(await toOptions(rows.map(r => ({
        ...r, generic_name: r.generic_name ?? null, rx_required: r.rx_required ?? null,
        low_stock: r.low_stock ?? null, pack_size: r.pack_size ?? null,
        stock_age_hours: r.stock_age_hours ?? null, match_kind: "fulltext", score: 0,
      } as Hit)), sess.user_lat, sess.user_lng), sess.user_lat != null);
      await writeSession(phone, { ...sess, medicine: term, options: opts, selected: null, state: "has_results", pending: null });
      const label = FORM_LABEL[form] || "";
      const list = opts.map((o,i) => {
        const pr = money(o.price_bwp);
        return `${b(`${i+1}.`)} ${o.med_name}\n    ${o.clinic_name}${pr ? ` · ${b(pr)}` : ""}`;
      }).join("\n\n");
      return { text:
`${b(tital(term))} is not listed at any pharmacy on ChekaMeds.

These pharmacies stock other ${label} products. ${it("Ask the pharmacist whether any of them suits you — we cannot advise on that.")}

${list}

Reply ${b("1")}–${b(String(opts.length))} for details.`,
        buttons: [{ id:"notify_me", text:"🔔 Tell me when it arrives" }] };
    }
  }

  return { text:
`😔 Sorry — I could not find ${b(tital(term))} at any pharmacy on ChekaMeds right now.
${DIV}
🔔 Tap ${b("Notify me")} and I will message you the moment it comes in.

💡 You can also try the brand name, or a different spelling.`,
    buttons: [{ id:"notify_me", text:"🔔 Notify me" }, { id:"find_medicine", text:"🔍 Try again" }] };
}

// ─── Router ─────────────────────────────────────────────────────────────────
async function handle(message: string, phone: string, raw: Record<string, unknown>): Promise<WA> {
  const txt = ct(message);
  const sess = await readSession(phone);

  if (OPTOUT.test(txt)) {
    try { await sb().from("notification_optouts").upsert({ phone: cp(phone), reason:"user_request" }, { onConflict:"phone" }); } catch {}
    return { text: `Unsubscribed. You will not get announcements or stock alerts.\n\nYou can still search any time — just send a medicine name.` };
  }

  // Location pin
  const locMsg = (raw?.location || (raw as any)?.data?.location || (raw as any)?.message?.location) as any;
  const rLat = locMsg?.latitude ?? locMsg?.lat ?? (raw as any)?.latitude ?? null;
  const rLng = locMsg?.longitude ?? locMsg?.lng ?? locMsg?.lon ?? (raw as any)?.longitude ?? null;
  if (rLat != null && rLng != null && !isNaN(Number(rLat)) && !isNaN(Number(rLng))) {
    const lat = Number(rLat), lng = Number(rLng);
    const next = { ...sess, user_lat: lat, user_lng: lng };
    await writeSession(phone, next);
    if (sess.medicine) return await doSearch(phone, next, sess.medicine, "", wantedForm(sess.medicine));
    return { text: `📍 ${b("Got it — location saved!")} ✅\n\n🚗 Now send me a medicine name and I will show you the closest pharmacies with the distance to each one.`,
      buttons: [{ id:"find_medicine", text:"🔍 Search" }] };
  }

  if (GREETING.test(txt)) return welcome();
  if (CONSULT.test(txt) || txt === "video_consult") return consultPage();
  if (txt === "find_medicine" || txt === "search") return askMed();

  if (NOTIFY_ME.test(txt) || txt === "notify_me") {
    if (!sess.medicine) return askMed("Search for something first, then tap Notify me.");
    try { await sb().from("notification_optouts").delete().eq("phone", cp(phone)); } catch {}
    try { await sb().from("stock_watchlist").insert({ phone: cp(phone), medicine: ct(sess.medicine), location: null, notified: false }); } catch (e) { console.error("WATCHLIST:", String(e)); }
    return { text: `🔔 ${b("You are on the list!")} ✅\n${DIV}\n💊 I will message you the moment ${b(tital(sess.medicine))} arrives at a pharmacy near you.\n\n🔍 Meanwhile, feel free to search for something else.\n\n_Reply STOP any time to unsubscribe._`,
      buttons: [{ id:"find_medicine", text:"🔍 Search again" }] };
  }

  if ((sess.state === "suggest" && YES.test(txt)) || txt === "confirm_suggestion") {
    const target = sess.pending || sess.medicine;
    if (target) return await doSearch(phone, { ...sess, state:"idle", pending:null }, target, "", wantedForm(target));
  }

  if (/^(change location|change town|location|town|change_location)$/.test(txt)) {
    if (!sess.medicine) return askMed("Send the medicine name first.");
    await writeSession(phone, { ...sess, state:"awaiting_location" });
    return { text: `Which town? Type the name, or choose below.\n\nLooking for: *${tital(sess.medicine)}*`,
      buttons: [{ id:"loc_gaborone", text:"Gaborone" }, { id:"loc_jwaneng", text:"Jwaneng" }, { id:"loc_all", text:"🇧🇼 Anywhere" }] };
  }

  if (RESERVE.test(txt)) {
    if (sess.state !== "has_selected" || !sess.selected)
      return { text: `Search for a medicine, pick a result, then tap Reserve.`, buttons: [{ id:"find_medicine", text:"🔍 Search" }] };
    const result = await doReserve(phone, sess.selected);
    await writeSession(phone, { ...sess, state:"reserved", selected:null });
    return { text: result };
  }

  if (txt === "call_pharmacy" || /^(call|phone|number)$/.test(txt)) {
    if (sess.state !== "has_selected" || !sess.selected) return askMed("Pick a result first.");
    const s2 = sess.selected;
    const ph = phone(s2.contact);
    return { text: ph
      ? `📞 ${b(s2.clinic_name)}\n\n${ph}\n\n${it("Tap the number to call, or message them on WhatsApp.")}`
      : `${b(s2.clinic_name)} has no phone number on file yet.\n\n${it("Try the directions link, or reserve and we will notify them.")}` };
  }

  if (/^(directions|direction|map|where)$/.test(txt)) {
    if (sess.state !== "has_selected" || !sess.selected) return { text: `Pick a result first, then type *directions*.` };
    const s = sess.selected; const link = realLink(s.directions_link);
    return { text: `🏥 ${s.clinic_name}\n📍 ${hasLoc(s.location) ? s.location : "Phone the pharmacy for the address"}` +
      (s.distance_km != null ? `\n🚗 ${fmtDist(s.distance_km)}` : "") + (link ? `\n🗺️ ${link}` : "") };
  }

  if (sess.state === "awaiting_location") {
    const loc = txt.startsWith("loc_") ? txt.replace("loc_","").replace("all","").trim()
              : (txt === "all" || txt.includes("anywhere")) ? "" : extractLoc(message);
    return await doSearch(phone, sess, sess.medicine, loc, wantedForm(sess.medicine));
  }
  if ((txt.startsWith("loc_") || /^(anywhere|all botswana|everywhere)$/.test(txt)) && sess.medicine) {
    if (!txt.startsWith("loc_")) return await doSearch(phone, sess, sess.medicine, "", wantedForm(sess.medicine));
    const loc = txt.replace("loc_","");
    return await doSearch(phone, sess, sess.medicine, loc === "all" ? "" : loc, wantedForm(sess.medicine));
  }

  // Picking a result
  // Derived from RESULT_SLOTS, never hardcoded — a stale literal here would
  // silently make the last result unselectable.
  const PICK_RE = new RegExp(`^[1-${Math.min(RESULT_SLOTS, 9)}]$`);
  const pick = PICK_RE.test(txt) ? Number(txt) - 1
             : txt.startsWith("item_") ? Number(txt.replace("item_","")) - 1 : -1;
  if (pick >= 0 && sess.options.length) {
    const opt = sess.options[pick];
    if (!opt) return { text: `Reply with a number from the list.` };
    await writeSession(phone, { ...sess, selected: opt, state: "has_selected" });
    await markImpression(opt.clinic_name, opt.med_name, cp(phone), "selected");
    return stockCard(opt);
  }

  // Free text → a search
  const loc = extractLoc(message);
  const stripped = loc ? stripLoc(message, loc) : ct(message);

  // A bare town name answering an earlier search
  const FILLER_ONLY = /^((am|is|it|im|i|this|now|here|there|please|pls|and|the|a)\s*)*$/;
  if (loc && sess.medicine && FILLER_ONLY.test(stripped))
    return await doSearch(phone, sess, sess.medicine, loc, wantedForm(sess.medicine));

  const form = wantedForm(message);
  const local = normalise(stripped || message);

  if (!local || local.length < MIN_QUERY_LEN || /^https?:\/\//.test(local) || JUNK.some(b => local.includes(b))) {
    // Let Gemini try the wording before giving up on it.
    const g = await geminiNormalise(message);
    if (g) return await doSearch(phone, sess, g, loc, form || wantedForm(g));
    return askMed(`I could not find a medicine in "${message}".`);
  }

  // Try the database first — it is faster and free. Gemini is the fallback,
  // not the front door.
  const quick = await runSearch(local, form, loc);
  if (quick.length) return await doSearch(phone, sess, local, loc, form);

  const g = await geminiNormalise(message);
  if (g && g !== local) return await doSearch(phone, sess, g, loc, form || wantedForm(g));
  return await doSearch(phone, sess, local, loc, form);
}

// ─── Transport ──────────────────────────────────────────────────────────────
async function sendWA(to: string, p: WA) {
  if (!ULTRAMSG_INSTANCE || !ULTRAMSG_TOKEN)
    throw new Error(`UltraMsg env missing (instance="${ULTRAMSG_INSTANCE}", token=${ULTRAMSG_TOKEN ? "set" : "EMPTY"})`);
  const r = await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ token: ULTRAMSG_TOKEN, to: cp(to), body: waText(p), priority: 10 }) });
  const d = await r.json();
  if (!r.ok || d?.sent === "false" || d?.error) throw new Error(`UltraMsg[${ULTRAMSG_INSTANCE}]: ${JSON.stringify(d)}`);
}
async function logEntry(entry: Record<string, unknown>) {
  try { await sb().from("whatsapp_webhook_logs").insert(entry); } catch {}
  try { await sb().from("whatsapp_webhook_events").insert({ provider:"ultramsg", from_phone:entry.from_number ?? null,
    message_text:entry.message_body ?? null, message_type:"chat", raw_payload:entry.raw_payload ?? {},
    status: entry.error_message ? "error" : "received", error: entry.error_message ?? null }); } catch {}
}
const extractMsg = (p: any): string => String(p.body || p.message || p.text || p.list_reply?.id ||
  p.button_reply?.id || p.interactive?.list_reply?.id || p.interactive?.button_reply?.id ||
  p.data?.list_reply?.id || p.data?.button_reply?.id || "");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";
  try {
    if (req.method === "GET") {
      const q = url.searchParams.get("query");
      if (!q) return new Response(JSON.stringify({ status:"ok", version:"v200",
        search:"postgres_rpc", form_guard:true, alternatives:"removed", gemini:"normalise_only" }),
        { headers: { ...cors, "Content-Type":"application/json" } });
      return new Response(JSON.stringify({ reply: await handle(q, "GET", {}) }),
        { headers: { ...cors, "Content-Type":"application/json" } });
    }
    const raw = await req.text();
    let body: any = {};
    try { body = req.headers.get("content-type")?.includes("x-www-form-urlencoded")
      ? Object.fromEntries(new URLSearchParams(raw).entries()) : JSON.parse(raw || "{}"); } catch { body = {}; }
    const payload = body?.data && typeof body.data === "object" ? body.data : body;
    const from = cp(String(payload.from || payload.sender || payload.author || payload.chatId || ""));
    const msgBody = extractMsg(payload);
    const hasLocMsg = !!(payload.location?.latitude || payload.data?.location?.latitude || payload.latitude);
    if (!from || (!msgBody && !hasLocMsg)) {
      await logEntry({ source: isTest?"test":"incoming", from_number:from, message_body:msgBody, response_status:200, error_message:"no_message", raw_payload:body });
      return new Response(JSON.stringify({ status:"no_message" }), { headers: { ...cors, "Content-Type":"application/json" } });
    }
    const reply = await handle(msgBody || "[location]", from, payload);
    let sendErr = "";
    if (!isTest) { try { await sendWA(from, reply); } catch (e) { sendErr = e instanceof Error ? e.message : String(e); } }
    await logEntry({ source: isTest?"test":"incoming", from_number:from, message_body:msgBody || "[location]",
      reply_text: JSON.stringify(reply), response_status: sendErr?500:200, error_message: sendErr||null, raw_payload: body });
    return new Response(JSON.stringify({ status: sendErr?"send_failed":"replied", to:from, reply: isTest?reply:undefined, error: sendErr||undefined }),
      { status: sendErr?500:200, headers: { ...cors, "Content-Type":"application/json" } });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await logEntry({ source:"incoming", response_status:500, error_message:err });
    return new Response(JSON.stringify({ error: err }), { status:500, headers:{ ...cors, "Content-Type":"application/json" } });
  }
});