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

function directions(row: { clinic_name: string; location?: string | null; directions_link?: string | null }) {
  if (row.directions_link?.trim()) return row.directions_link;
  if (row.location?.trim() && row.location !== "N/A" && row.location.toLowerCase() !== "botswana") return `https://maps.google.com/?q=${encodeURIComponent(row.location + ", Botswana")}`;
  return `https://maps.google.com/?q=${encodeURIComponent(row.clinic_name + ", Botswana")}`;
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
  if (r.price_bwp != null) s += 8;
  if (Number(r.quantity) > 0) s += 10;
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
  rows = rows.sort((a, b) => score(b, terms) - score(a, terms));
  if (!rows.length) {
    try { await db().from("failed_searches").insert({ query: q, source: "whatsapp", user_phone: cleanPhone(phone) }); } catch {}
  }
  const result = { rows, terms, ts: Date.now() };
  cache.set(key, result);
  return result;
}

async function processQuery(message: string, phone: string) {
  const msg = cleanText(message);
  const session = await getSession(phone);

  if (/^(hi|hello|hey|help|dumelang|dumela)$/.test(msg)) {
    return `🏥 *ChekaMeds Botswana*\n\nFind medicines and health essentials faster.\n\nTry:\n💊 Panado / Paracetamol\n🤧 Flu\n🤕 Headache\n🩹 Wound care / Cuts\n🔥 Burn care\n🩺 BP tablets\n\n🌐 chekameds.co.bw\n📱 +267 71 424 486\n\n⚠️ We help you find listed stock. We do not diagnose.`;
  }

  if (/^[1-5]$/.test(msg) && session?.options?.length) {
    const choice = session.options[Number(msg) - 1];
    if (!choice) return `Invalid selection. Reply with 1-${session.options.length}.`;
    await saveSession(phone, session.medicine, session.options, choice);
    const price = choice.price_bwp != null ? `P${Number(choice.price_bwp).toFixed(2)}` : "Price not available";
    return `✅ *Selected*\n\n💊 ${choice.med_name}\n📍 ${choice.clinic_name}\n${choice.location ? `📌 ${choice.location}\n` : ""}💰 ${price}\n📦 ${Number(choice.quantity) < 20 ? "Limited stock" : "In stock"}\n🗺️ ${directions(choice)}\n\n👉 Reply *PAY* to continue.`;
  }

  if (msg === "pay") {
    if (!session?.selected) return "Please search first, choose a pharmacy by number, then reply PAY.";
    const s = session.selected;
    const price = s.price_bwp != null ? `P${Number(s.price_bwp).toFixed(2)}` : "price on request";
    return `💳 *Payment / Collection Request*\n\n💊 ${s.med_name}\n📍 ${s.clinic_name}\n💰 ${price}\n🗺️ ${directions(s)}\n\nOnline payment activation is in progress. For now, please visit the pharmacy or contact support for collection confirmation.`;
  }

  const { rows, terms } = await search(message, phone);
  if (!rows.length) return `❌ No listed stock found for "${message}".\n\nTry: headache, flu, wound care, BP tablets, Panado.\n\n⚠️ If symptoms are serious, please consult a healthcare professional.`;

  const byClinic = new Map<string, Row>();
  for (const r of rows) if (!byClinic.has(r.clinic_name)) byClinic.set(r.clinic_name, r);
  const options = Array.from(byClinic.values()).slice(0, 5);
  const sessionOptions: SessionOption[] = options.map(r => ({ clinic_name: r.clinic_name, location: r.location || null, price_bwp: r.price_bwp == null ? null : Number(r.price_bwp), quantity: Number(r.quantity), med_name: r.med_name, directions_link: r.directions_link || null }));
  const best = options[0].med_name;
  await saveSession(phone, best, sessionOptions);

  let reply = `💊 *ChekaMeds Results*\n`;
  const extra = terms.filter(t => t !== cleanText(message)).slice(0, 2);
  if (extra.length) reply += `_Also searched: ${extra.join(", ")}_\n`;
  reply += `\n✅ *${best}* found at ${options.length} facilit${options.length === 1 ? "y" : "ies"}\n\n`;
  options.forEach((r, i) => {
    reply += `${i + 1}️⃣ *${r.clinic_name}*\n`;
    if (r.location && r.location.toLowerCase() !== "botswana") reply += `📍 ${r.location}\n`;
    reply += `💰 ${r.price_bwp != null ? `P${Number(r.price_bwp).toFixed(2)}` : "Price not available"}\n`;
    reply += `📦 ${Number(r.quantity) < 20 ? "Limited stock" : "In stock"}\n`;
    reply += `🗺️ ${directions(r)}\n\n`;
  });
  reply += `👉 Reply *1-${options.length}* to choose\n👉 Reply *PAY* after choosing\n\n⚠️ ChekaMeds helps you find listed stock. It does not diagnose.`;
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

    const from = cleanPhone(String(body.from || body.sender || body.author || body.chatId || ""));
    const messageBody = String(body.body || body.message || body.text || "");

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
