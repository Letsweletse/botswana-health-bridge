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
  return value !== "" && value !== "n a" && value !== "botswana";
}

function realDirections(link?: string | null) {
  if (!link) return "";
  const value = link.trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return "";
  return value;
}

function isProductionRow(row: Row) {
  const clinic = cleanText(row.clinic_name);
  if (!clinic) return false;
  if (clinic.includes("demo")) return false;
  if (clinic.includes("test")) return false;
  if (clinic.includes("chekameds admin")) return false;
  return Number(row.quantity) > 0;
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
  for (const t of terms) {
    const m = cleanText(r.med_name);
    if (m === t) s += 120;
    if (m.startsWith(t)) s += 80;
    if (h.includes(t)) s += 45;
    for (const p of t.split(" ")) if (p.length > 2 && h.includes(p)) s += 10;
  }
  if (realDirections(r.directions_link)) s += 20;
  if (hasRealLocation(r.location)) s += 10;
  if (r.price_bwp != null) s += 8;
  return s;
}

async function search(q: string, phone: string) {
  const key = cleanText(q);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < 60000) return hit;

  const aliases = await getAliases(key);
  const terms = Array.from(new Set([key, ...aliases.map((a: any) => cleanText(a.alias)), ...aliases.map((a: any) => cleanText(a.canonical_name))].filter(Boolean)));
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
  rows = rows.filter(isProductionRow).sort((a, b) => score(b, terms) - score(a, terms));
  if (!rows.length) {
    try { await db().from("failed_searches").insert({ query: q, source: "whatsapp", user_phone: cleanPhone(phone) }); } catch {}
  }
  const result = { rows, terms, ts: Date.now() };
  cache.set(key, result);
  return result;
}

function formatClinicLine(row: Row, index: number) {
  const price = row.price_bwp != null ? `P${Number(row.price_bwp).toFixed(2)}` : "Price not listed";
  const location = hasRealLocation(row.location) ? ` — ${row.location}` : "";
  const link = realDirections(row.directions_link);
  let text = `${index}. ${row.clinic_name}${location}\n${price} • In stock`;
  if (link) text += `\nMap: ${link}`;
  return text;
}

async function processQuery(message: string, phone: string) {
  const msg = cleanText(message);
  const session = await getSession(phone);

  if (/^(hi|hello|hey|help|dumelang|dumela)$/.test(msg)) {
    return `ChekaMeds Botswana\n\nSend a medicine or health need.\n\nExamples:\nPanado\nFlu\nHeadache\nWound care\nBP tablets\n\nWebsite: chekameds.co.bw\nWhatsApp: +267 71 424 486`;
  }

  if (/^[1-5]$/.test(msg) && session?.options?.length) {
    const choice = session.options[Number(msg) - 1];
    if (!choice) return `Invalid selection. Reply with 1-${session.options.length}.`;
    await saveSession(phone, session.medicine, session.options, choice);
    const price = choice.price_bwp != null ? `P${Number(choice.price_bwp).toFixed(2)}` : "Price not listed";
    const location = hasRealLocation(choice.location) ? ` — ${choice.location}` : "";
    const link = realDirections(choice.directions_link);
    let reply = `Selected:\n${choice.med_name}\n${choice.clinic_name}${location}\n${price}`;
    if (link) reply += `\nMap: ${link}`;
    reply += `\n\nReply PAY to continue.`;
    return reply;
  }

  if (msg === "pay") {
    if (!session?.selected) return "Please search first, choose a pharmacy number, then reply PAY.";
    const s = session.selected;
    const price = s.price_bwp != null ? `P${Number(s.price_bwp).toFixed(2)}` : "Price not listed";
    const location = hasRealLocation(s.location) ? ` — ${s.location}` : "";
    const link = realDirections(s.directions_link);
    let reply = `Collection request:\n${s.med_name}\n${s.clinic_name}${location}\n${price}`;
    if (link) reply += `\nMap: ${link}`;
    reply += `\n\nOnline payment is coming soon. For now, please contact or visit the pharmacy.`;
    return reply;
  }

  const { rows } = await search(message, phone);
  if (!rows.length) return `No listed stock found for "${message}".\n\nTry another name, brand, or generic medicine.\nFor urgent symptoms, consult a healthcare professional.`;

  const byClinic = new Map<string, Row>();
  for (const r of rows) if (!byClinic.has(r.clinic_name)) byClinic.set(r.clinic_name, r);
  const options = Array.from(byClinic.values()).slice(0, 3);
  const sessionOptions: SessionOption[] = options.map(r => ({ clinic_name: r.clinic_name, location: r.location || null, price_bwp: r.price_bwp == null ? null : Number(r.price_bwp), quantity: Number(r.quantity), med_name: r.med_name, directions_link: r.directions_link || null }));
  const best = options[0].med_name;
  await saveSession(phone, best, sessionOptions);

  let reply = `${best} available:\n\n`;
  options.forEach((r, i) => { reply += `${formatClinicLine(r, i + 1)}\n\n`; });
  reply += `Reply 1-${options.length} to select.\nReply PAY after selecting.\n\nChekaMeds helps you find listed stock. It does not diagnose.`;
  return reply;
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
