import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = {
  clinic_name: string;
  med_name: string;
  quantity: number;
  price_bwp: number | null;
  location?: string | null;
  directions_link?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  search_tokens?: string | null;
  approved?: boolean | null;
};

type SessionOption = {
  clinic_name: string;
  location: string | null;
  price_bwp: number | null;
  quantity: number;
  med_name: string;
  directions_link?: string | null;
};

const cache = new Map<string, { rows: Row[]; terms: string[]; ts: number }>();

const SYMPTOM_TERMS: Record<string, string[]> = {
  flu: ["paracetamol", "cough", "cold", "flu"],
  cold: ["paracetamol", "cough", "cold", "flu"],
  cough: ["cough", "syrup", "lozenges"],
  headache: ["paracetamol", "ibuprofen", "pain"],
  fever: ["paracetamol", "ibuprofen", "fever"],
  pain: ["paracetamol", "ibuprofen", "pain"],
  stomach: ["antacid", "oral rehydration", "diarrhoea", "stomach"],
  diarrhea: ["oral rehydration", "diarrhoea", "loperamide"],
  diarrhoea: ["oral rehydration", "diarrhoea", "loperamide"],
  wound: ["antiseptic", "bandage", "wound"],
  allergy: ["cetirizine", "loratadine", "allergy"],
  allergies: ["cetirizine", "loratadine", "allergy"],
};

function db() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function cleanText(v: string) {
  return (v || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanPhone(raw: string) {
  let p = (raw || "").replace("@c.us", "").replace("@s.whatsapp.net", "").replace(/^\+/, "").replace(/[^0-9]/g, "");
  if (p.length === 8) p = `267${p}`;
  if (p.length === 10 && p.startsWith("0")) p = `267${p.slice(1)}`;
  return p;
}

function hasRealLocation(location?: string | null) {
  if (!location) return false;
  const value = cleanText(location);
  return value !== "" && value !== "n a" && value !== "botswana" && value !== "unknown" && value !== "not listed";
}

function realDirections(link?: string | null) {
  if (!link) return "";
  const value = link.trim();
  const lower = value.toLowerCase();
  if (!value) return "";
  if (!/^https:\/\//i.test(value)) return "";
  if (lower.includes("example")) return "";
  if (lower.includes("placeholder")) return "";
  if (lower.includes("fake")) return "";
  if (lower.includes("test")) return "";
  return value;
}

function isProductionRow(row: Row) {
  const clinic = cleanText(row.clinic_name || "");
  const medicine = cleanText(row.med_name || "");
  if (!clinic || !medicine) return false;
  if (clinic.includes("chekameds admin")) return false;
  if (["demo", "test", "sample", "mock", "trial"].some((bad) => clinic.includes(bad))) return false;
  if (row.approved === false) return false;
  return Number(row.quantity) > 0;
}

function isSymptomSearch(message: string) {
  const msg = cleanText(message);
  if (/\b(i have|i feel|symptom|sick|not well|ke bolawa|ke lwala)\b/i.test(message)) return true;
  return Object.keys(SYMPTOM_TERMS).some((word) => msg.includes(word));
}

function symptomSearchTerms(message: string) {
  const msg = cleanText(message);
  const terms = new Set<string>();
  for (const [symptom, mapped] of Object.entries(SYMPTOM_TERMS)) {
    if (msg.includes(symptom)) mapped.forEach((term) => terms.add(term));
  }
  if (!terms.size) terms.add(msg);
  return Array.from(terms);
}

async function getAliases(q: string) {
  try {
    const { data } = await db().from("medicine_aliases").select("alias, canonical_name").or(`alias.ilike.%${q}%,canonical_name.ilike.%${q}%`).limit(12);
    return data || [];
  } catch {
    return [];
  }
}

async function saveSession(phone: string, medicine: string, options: SessionOption[], selected?: SessionOption) {
  try {
    await db().from("whatsapp_sessions").upsert({
      from_number: cleanPhone(phone), medicine, options: options as any, selected: (selected || null) as any, updated_at: new Date().toISOString(),
    });
  } catch (e) { console.error("session save failed", e); }
}

async function getSession(phone: string) {
  try {
    const { data } = await db().from("whatsapp_sessions").select("*").eq("from_number", cleanPhone(phone)).maybeSingle();
    if (!data) return null;
    return data as { medicine: string; options: SessionOption[]; selected?: SessionOption };
  } catch { return null; }
}

function score(r: Row, terms: string[]) {
  const h = cleanText([r.med_name, r.generic_name, r.brand_name, r.strength, r.dosage_form, r.search_tokens].filter(Boolean).join(" "));
  let s = 0;
  for (const t of terms.map(cleanText).filter(Boolean)) {
    const m = cleanText(r.med_name);
    if (m === t) s += 150;
    if (m.startsWith(t)) s += 100;
    if (h.includes(t)) s += 60;
    for (const p of t.split(" ")) if (p.length > 2 && h.includes(p)) s += 12;
  }
  if (realDirections(r.directions_link)) s += 20;
  if (hasRealLocation(r.location)) s += 12;
  if (r.price_bwp != null) s += 8;
  s += Math.min(Number(r.quantity) || 0, 50) / 10;
  return s;
}

function dedupeInventoryItems(rows: Row[]) {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const row of rows) {
    const key = cleanText(`${row.med_name}|${row.clinic_name}|${row.location || ""}|${row.price_bwp ?? ""}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function search(q: string, phone: string, forcedTerms?: string[]) {
  const key = cleanText([q, ...(forcedTerms || [])].join(" "));
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < 60000) return hit;

  const aliases = await getAliases(cleanText(q));
  const terms = Array.from(new Set([
    cleanText(q),
    ...(forcedTerms || []).map(cleanText),
    ...aliases.map((a: any) => cleanText(a.alias)),
    ...aliases.map((a: any) => cleanText(a.canonical_name)),
  ].filter(Boolean)));

  const orFilter = terms.flatMap(t => [`med_name.ilike.%${t}%`, `generic_name.ilike.%${t}%`, `brand_name.ilike.%${t}%`, `search_tokens.ilike.%${t}%`]).join(",");
  let rows: Row[] = [];
  try {
    const { data, error } = await db().from("active_pharmacy_inventory").select("clinic_name,med_name,quantity,price_bwp,location,directions_link,strength,dosage_form,generic_name,brand_name,search_tokens").or(orFilter).gt("quantity", 0).limit(100);
    if (error) throw error;
    rows = data || [];
  } catch {
    const fallback = terms.map(t => `med_name.ilike.%${t}%`).join(",");
    const { data } = await db().from("clinic_inventory").select("clinic_name,med_name,quantity,price_bwp,location,directions_link,strength,dosage_form").or(fallback).gt("quantity", 0).neq("clinic_name", "ChekaMeds Admin").limit(100);
    rows = data || [];
  }

  rows = dedupeInventoryItems(rows.filter(isProductionRow).sort((a, b) => score(b, terms) - score(a, terms)));
  if (!rows.length) {
    try { await db().from("failed_searches").insert({ query: q, source: "whatsapp", user_phone: cleanPhone(phone) }); } catch {}
  }
  const result = { rows, terms, ts: Date.now() };
  cache.set(key, result);
  return result;
}

function formatPrice(price: number | null | undefined) {
  return price != null ? `P${Number(price).toFixed(2)}` : "Price unavailable";
}

function formatInventoryItem(row: Row | SessionOption, index: number) {
  const location = hasRealLocation(row.location) ? row.location : "Location unavailable";
  const link = realDirections(row.directions_link);
  let text = `${index}. *${row.med_name}*\n🏥 Pharmacy: ${row.clinic_name}\n📍 Location: ${location}\n💰 Price: ${formatPrice(row.price_bwp)}\n📦 Stock: In stock`;
  if (link) text += `\n🧭 Directions: ${link}`;
  return text;
}

function formatPaymentChoice(selected: SessionOption) {
  return `✅ *Reservation request received*\n\nMedicine: ${selected.med_name}\nPharmacy: ${selected.clinic_name}\nLocation: ${hasRealLocation(selected.location) ? selected.location : "Location unavailable"}\nAmount: ${formatPrice(selected.price_bwp)}\n\nChoose payment method:\n\n⚡ Reply *CPAY*\nPay with ChekaPay\nInstant confirmation • Priority pickup • Digital receipt\n\n🏪 Reply *STORE*\nReserve now and pay physically on collection.`;
}

function formatMedicineResults(query: string, rows: Row[]) {
  let reply = `💊 *Search results for: ${query}*\n\n`;
  rows.forEach((row, i) => { reply += `${formatInventoryItem(row, i + 1)}\n\n`; });
  reply += `Reply with the item number to reserve.\nExample: Reply *1*`;
  return reply;
}

function formatSymptomResults(query: string, rows: Row[]) {
  let reply = `🩺 *Possible options for: ${query}*\n\n`;
  reply += `This is not a diagnosis. Please speak to a pharmacist or clinician if symptoms are severe, unusual, or persistent.\n\n`;
  rows.forEach((row, i) => { reply += `${formatInventoryItem(row, i + 1)}\n\n`; });
  reply += `Reply with the item number to reserve.\nExample: Reply *1*`;
  return reply;
}

async function processQuery(message: string, phone: string) {
  const msg = cleanText(message);
  const session = await getSession(phone);

  if (/^(hi|hello|hey|help|dumelang|dumela)$/.test(msg)) {
    return `ChekaMeds Botswana\n\nSend a medicine name or symptom.\n\nExamples:\nPanado\nFlu\nHeadache and fever\nWound care\nBP tablets\n\nWebsite: chekameds.co.bw\nWhatsApp: +267 71 424 486`;
  }

  if (/^(cpay|chekapay|pay with chekapay)$/.test(msg)) {
    if (!session?.selected) return "Please search first, reply with an item number to reserve, then reply CPAY.";
    const selected = session.selected;
    return `⚡ *ChekaPay selected*\n\nMedicine: ${selected.med_name}\nPharmacy: ${selected.clinic_name}\nAmount: ${formatPrice(selected.price_bwp)}\n\nYour reservation is marked for ChekaPay payment.\nA ChekaPay payment confirmation/receipt will be sent once payment is completed.\n\nIf you need help, a support representative will assist with collection arrangements.`;
  }

  if (/^(store|pay at store|cash|cash payment)$/.test(msg)) {
    if (!session?.selected) return "Please search first, reply with an item number to reserve, then reply STORE.";
    const selected = session.selected;
    return `🏪 *Pay at Store selected*\n\nMedicine: ${selected.med_name}\nPharmacy: ${selected.clinic_name}\nLocation: ${hasRealLocation(selected.location) ? selected.location : "Location unavailable"}\n\nYour reservation request has been kept for standard pickup.\nPlease pay physically at the pharmacy on collection.\n\nA pharmacy representative may confirm final availability before pickup.`;
  }

  const payMatch = msg.match(/^pay(?:\s+([1-5]))?$/);
  if (payMatch) {
    if (!session?.options?.length) return "Please search first, then reply with the item number to reserve, for example 1.";
    const selected = payMatch[1] ? session.options[Number(payMatch[1]) - 1] : session.selected;
    if (!selected) return `Please choose an item first. Reply with 1-${session.options.length}.`;
    await saveSession(phone, session.medicine, session.options, selected);
    return formatPaymentChoice(selected);
  }

  if (/^[1-5]$/.test(msg) && session?.options?.length) {
    const choice = session.options[Number(msg) - 1];
    if (!choice) return `Invalid selection. Reply with 1-${session.options.length}.`;
    await saveSession(phone, session.medicine, session.options, choice);
    return formatPaymentChoice(choice);
  }

  const symptom = isSymptomSearch(message);
  const terms = symptom ? symptomSearchTerms(message) : undefined;
  const { rows } = await search(message, phone, terms);
  const options = rows.slice(0, 5);

  if (!options.length) {
    return symptom
      ? `No listed stock found for "${message}".\n\nThis is not a diagnosis. If symptoms are severe, unusual, or persistent, please speak to a pharmacist or clinician.`
      : `No listed stock found for "${message}".\n\nTry another name, brand, or generic medicine.\nFor urgent symptoms, consult a healthcare professional.`;
  }

  const sessionOptions: SessionOption[] = options.map(r => ({ clinic_name: r.clinic_name, location: r.location || null, price_bwp: r.price_bwp == null ? null : Number(r.price_bwp), quantity: Number(r.quantity), med_name: r.med_name, directions_link: realDirections(r.directions_link) || null }));
  await saveSession(phone, options[0].med_name, sessionOptions);

  return symptom ? formatSymptomResults(message, options) : formatMedicineResults(message, options);
}

async function sendWhatsAppReply(to: string, message: string) {
  const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID");
  const token = Deno.env.get("ULTRAMSG_TOKEN");
  if (!instanceId || !token) throw new Error("UltraMsg secrets missing");
  const recipient = cleanPhone(to);
  const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, to: recipient, body: message, priority: 10 }),
  });
  const data = await res.json();
  if (!res.ok || data?.sent === "false") throw new Error(`UltraMsg API failed: ${JSON.stringify(data)}`);
}

async function logWebhook(entry: any) {
  try { await db().from("whatsapp_webhook_logs").insert(entry); } catch (e) { console.error("log failed", e); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";

  try {
    if (req.method === "GET") {
      const query = url.searchParams.get("query");
      if (!query) return new Response(JSON.stringify({ status: "ok", message: "ChekaMeds WhatsApp webhook active" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const reply = await processQuery(query, "GET");
      return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const raw = await req.text();
    let body: any = {};
    try { body = req.headers.get("content-type")?.includes("x-www-form-urlencoded") ? Object.fromEntries(new URLSearchParams(raw).entries()) : JSON.parse(raw || "{}"); } catch { body = {}; }

    const payload = body?.data && typeof body.data === "object" ? body.data : body;
    const from = cleanPhone(String(payload.from || payload.sender || payload.author || payload.chatId || ""));
    const messageBody = String(payload.body || payload.message || payload.text || "");

    if (!from || !messageBody) {
      await logWebhook({ source: isTest ? "test" : "incoming", from_number: from, message_body: messageBody, response_status: 200, error_message: "no_message", raw_payload: body });
      return new Response(JSON.stringify({ status: "no_message" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reply = await processQuery(messageBody, from);
    let sendError = "";
    if (!isTest) {
      try { await sendWhatsAppReply(from, reply); } catch (e) { sendError = e instanceof Error ? e.message : String(e); }
    }

    await logWebhook({ source: isTest ? "test" : "incoming", from_number: from, message_body: messageBody, reply_text: reply, response_status: sendError ? 500 : 200, error_message: sendError || null, raw_payload: body });
    if (sendError) return new Response(JSON.stringify({ error: sendError, reply }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ status: isTest ? "tested" : "replied", to: from, reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await logWebhook({ source: isTest ? "test" : "incoming", response_status: 500, error_message: error });
    return new Response(JSON.stringify({ error }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});