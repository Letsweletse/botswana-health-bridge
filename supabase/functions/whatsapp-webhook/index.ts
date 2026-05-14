import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SessionOption = {
  clinic_name: string;
  location: string | null;
  price_bwp: number | null;
  quantity: number;
  med_name: string;
  directions_link?: string | null;
};

type Session = {
  medicine: string;
  options: SessionOption[];
  selected?: SessionOption;
};

type InventoryRow = {
  id?: string;
  clinic_name: string;
  med_name: string;
  quantity: number;
  price_bwp: number | null;
  location?: string | null;
  directions_link?: string | null;
  category?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  search_tokens?: string | null;
};

const userLanguages: Record<string, "en" | "tn"> = {};
const SEARCH_TTL_MS = 60_000;
const searchCache = new Map<string, { data: InventoryRow[]; terms: string[]; ts: number }>();

function db() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function unique(items: string[]) {
  return Array.from(new Set(items.map(normalize).filter(Boolean)));
}

function getLang(from: string): "en" | "tn" {
  return userLanguages[from] || "en";
}

function getDirectionsLink(pharmacy: { clinic_name: string; directions_link?: string | null; location?: string | null }) {
  if (pharmacy.directions_link && pharmacy.directions_link.trim() !== "") return pharmacy.directions_link;
  if (pharmacy.location && pharmacy.location.trim() !== "" && pharmacy.location !== "N/A") {
    return `https://maps.google.com/?q=${encodeURIComponent(pharmacy.location + ", Botswana")}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(pharmacy.clinic_name + ", Botswana")}`;
}

async function setSession(from: string, s: Session) {
  try {
    await db().from("whatsapp_sessions").upsert({
      from_number: from,
      medicine: s.medicine,
      options: s.options as any,
      selected: (s.selected ?? null) as any,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("setSession error", error);
  }
}

async function getSession(from: string): Promise<Session | undefined> {
  try {
    const { data } = await db().from("whatsapp_sessions").select("*").eq("from_number", from).maybeSingle();
    if (!data) return undefined;
    if (Date.now() - new Date(data.updated_at).getTime() > 30 * 60 * 1000) return undefined;
    return {
      medicine: data.medicine,
      options: (data.options || []) as SessionOption[],
      selected: data.selected || undefined,
    };
  } catch {
    return undefined;
  }
}

async function fetchAliases(term: string) {
  try {
    const { data } = await db()
      .from("medicine_aliases")
      .select("alias, canonical_name")
      .or(`alias.ilike.%${term}%,canonical_name.ilike.%${term}%`)
      .limit(15);
    return (data || []) as { alias: string; canonical_name: string }[];
  } catch (error) {
    console.warn("Alias lookup skipped", error);
    return [];
  }
}

async function logFailedSearch(query: string, from: string) {
  try {
    await db().from("failed_searches").insert({ query, source: "whatsapp", user_phone: from || null });
  } catch (error) {
    console.warn("failed_searches insert skipped", error);
  }
}

function scoreItem(item: InventoryRow, terms: string[]) {
  const haystack = normalize([
    item.med_name,
    item.generic_name,
    item.brand_name,
    item.strength,
    item.dosage_form,
    item.category,
    item.search_tokens,
  ].filter(Boolean).join(" "));

  let score = 0;
  for (const term of terms) {
    const med = normalize(item.med_name || "");
    if (med === term) score += 120;
    if (med.startsWith(term)) score += 80;
    if (haystack.includes(term)) score += 45;
    for (const part of term.split(" ")) {
      if (part.length >= 3 && haystack.includes(part)) score += 12;
    }
  }
  if (item.price_bwp != null) score += 8;
  if (Number(item.quantity) >= 100) score += 6;
  if (Number(item.quantity) > 0) score += 10;
  return score;
}

async function runInventorySearch(terms: string[]) {
  const selectFields = "id,clinic_name,med_name,quantity,price_bwp,location,directions_link,category,strength,dosage_form,generic_name,brand_name,search_tokens";
  const orFilter = terms.flatMap((term) => [
    `med_name.ilike.%${term}%`,
    `generic_name.ilike.%${term}%`,
    `brand_name.ilike.%${term}%`,
    `search_tokens.ilike.%${term}%`,
  ]).join(",");

  try {
    const { data, error } = await db()
      .from("active_pharmacy_inventory")
      .select(selectFields)
      .or(orFilter)
      .gt("quantity", 0)
      .limit(120);
    if (error) throw error;
    return (data || []) as InventoryRow[];
  } catch (viewError) {
    console.warn("active_pharmacy_inventory unavailable, using clinic_inventory", viewError);
    const fallbackOr = terms.map((term) => `med_name.ilike.%${term}%`).join(",");
    const { data, error } = await db()
      .from("clinic_inventory")
      .select("clinic_name,med_name,quantity,price_bwp,location,directions_link,category,strength,dosage_form")
      .or(fallbackOr)
      .gt("quantity", 0)
      .neq("clinic_name", "ChekaMeds Admin")
      .limit(120);
    if (error) throw error;
    return (data || []) as InventoryRow[];
  }
}

async function searchMedicine(rawTerm: string, from: string) {
  const key = normalize(rawTerm);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < SEARCH_TTL_MS) return cached;

  const aliases = await fetchAliases(key);
  const terms = unique([key, ...aliases.map((a) => a.alias), ...aliases.map((a) => a.canonical_name)]);
  const rows = await runInventorySearch(terms);

  const deduped = new Map<string, InventoryRow & { score: number }>();
  for (const row of rows) {
    const item = { ...row, score: scoreItem(row, terms) };
    const dedupeKey = `${row.clinic_name}|${row.med_name}|${row.strength || ""}`.toLowerCase();
    const existing = deduped.get(dedupeKey);
    if (!existing || item.score > existing.score || Number(item.quantity) > Number(existing.quantity)) deduped.set(dedupeKey, item);
  }

  const data = Array.from(deduped.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ap = a.price_bwp != null ? Number(a.price_bwp) : Infinity;
    const bp = b.price_bwp != null ? Number(b.price_bwp) : Infinity;
    if (ap !== bp) return ap - bp;
    return Number(b.quantity) - Number(a.quantity);
  });

  if (data.length === 0) await logFailedSearch(rawTerm, from);
  const result = { data, terms, ts: Date.now() };
  searchCache.set(key, result);
  if (searchCache.size > 200) searchCache.delete(searchCache.keys().next().value);
  return result;
}

function formatSearchResults(rows: InventoryRow[], originalQuery: string, terms: string[], from: string) {
  const byClinic: Record<string, InventoryRow> = {};
  for (const row of rows) {
    const existing = byClinic[row.clinic_name];
    if (!existing) byClinic[row.clinic_name] = row;
    else {
      const currentPrice = row.price_bwp != null ? Number(row.price_bwp) : Infinity;
      const oldPrice = existing.price_bwp != null ? Number(existing.price_bwp) : Infinity;
      if (currentPrice < oldPrice || Number(row.quantity) > Number(existing.quantity)) byClinic[row.clinic_name] = row;
    }
  }

  const options = Object.values(byClinic).slice(0, 5);
  const bestName = options[0]?.med_name || originalQuery;
  const sessionOptions: SessionOption[] = options.map((p) => ({
    clinic_name: p.clinic_name,
    location: p.location || null,
    price_bwp: p.price_bwp != null ? Number(p.price_bwp) : null,
    quantity: Number(p.quantity),
    med_name: p.med_name,
    directions_link: p.directions_link || null,
  }));

  const aliasTerms = terms.filter((t) => t !== normalize(originalQuery)).slice(0, 2);
  let reply = `💊 *ChekaMeds Results*\n`;
  if (aliasTerms.length > 0) reply += `_Also searched: ${aliasTerms.join(", ")}_\n`;
  reply += `\n✅ *${bestName}* found at ${options.length} facilit${options.length === 1 ? "y" : "ies"}\n\n`;

  const num = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  options.slice(0, 5).forEach((p, idx) => {
    const priceLine = p.price_bwp != null ? `P${Number(p.price_bwp).toFixed(2)}` : "Price not available";
    const stock = Number(p.quantity) < 20 ? "Limited stock" : "In stock";
    reply += `${num[idx]} *${p.clinic_name}*\n`;
    if (p.location) reply += `📍 ${p.location}\n`;
    reply += `💰 ${priceLine}\n`;
    reply += `📦 ${stock}\n`;
    const directions = getDirectionsLink(p);
    if (directions) reply += `🗺️ ${directions}\n`;
    reply += `\n`;
  });

  reply += `👉 Reply *1-${Math.min(options.length, 5)}* to choose\n`;
  reply += `👉 Reply *PAY* after choosing\n\n`;
  reply += `⚠️ ChekaMeds helps you find listed stock. It does not diagnose. Please consult a pharmacist or healthcare professional.`;

  setSession(from, { medicine: bestName, options: sessionOptions.slice(0, 5) });
  return reply;
}

async function processQuery(message: string, from = ""): Promise<string> {
  const msg = normalize(message);
  const lang = getLang(from);
  const session = await getSession(from);

  if (/^setswana$/.test(msg)) {
    userLanguages[from] = "tn";
    return "🇧🇼 Puo e fetoletswe go Setswana! Romela molaetsa ope.";
  }
  if (/^english$/.test(msg)) {
    userLanguages[from] = "en";
    return "🇬🇧 Language switched to English. Send any medicine or health need.";
  }

  if (/^(hi|hello|hey|dumelang|dumela|thobela|lotsha|help)$/.test(msg)) {
    return `🏥 *ChekaMeds Botswana*\n\nFind medicines and health essentials faster.\n\nTry searching:\n💊 Panado / Paracetamol\n🤧 Flu\n🤕 Headache\n🩹 Wound care / Cuts\n🔥 Burn care\n🩺 BP tablets\n\nWhatsApp line: *+267 71 424 486*\nWebsite: https://chekameds.co.bw\n\n⚠️ We help you find listed stock. We do not diagnose.`;
  }

  if (/^pay$/.test(msg)) {
    if (session?.selected) {
      const s = session.selected;
      const priceLine = s.price_bwp != null ? `P${Number(s.price_bwp).toFixed(2)}` : "price on request";
      return `💳 *Payment / Collection Request*\n\n💊 ${s.med_name}\n📍 ${s.clinic_name}\n💰 ${priceLine}\n🗺️ ${getDirectionsLink(s)}\n\nOnline payment activation is in progress. For now, please visit the pharmacy or contact support for collection confirmation.\n\nChekaMeds Botswana`;
    }
    return "Please search for a medicine first, choose a pharmacy by replying with a number, then reply PAY.";
  }

  if (/^[1-5]$/.test(msg) && session?.options?.length) {
    const idx = parseInt(msg, 10) - 1;
    if (idx < 0 || idx >= session.options.length) return `Invalid selection. Reply with 1-${session.options.length}.`;
    const choice = session.options[idx];
    await setSession(from, { medicine: session.medicine, options: session.options, selected: choice });
    const priceLine = choice.price_bwp != null ? `P${Number(choice.price_bwp).toFixed(2)}` : "Price not available";
    return `✅ *Selected*\n\n💊 ${choice.med_name}\n📍 ${choice.clinic_name}\n${choice.location ? `📌 ${choice.location}\n` : ""}💰 ${priceLine}\n📦 ${Number(choice.quantity) < 20 ? "Limited stock" : "In stock"}\n🗺️ ${getDirectionsLink(choice)}\n\n👉 Reply *PAY* to continue.`;
  }

  if (/^status|summary|overview|report$/.test(msg)) {
    const { count } = await db().from("clinic_inventory").select("*", { count: "exact", head: true });
    return `📊 *ChekaMeds Status*\n\n💊 Inventory records: ${count || 0}\n🌐 Website: https://chekameds.co.bw\n📱 WhatsApp: +267 71 424 486\n\nSearch any medicine or health need to continue.`;
  }

  const { data, terms } = await searchMedicine(message, from);
  if (data.length > 0) return formatSearchResults(data, message, terms, from);

  return lang === "tn"
    ? "❌ Ga re a bona se o se batlang. Leka leina le lengwe kgotsa botsa mo pharmacy."
    : `❌ No listed stock found for "${message}".\n\nTry a brand name, generic name, or simple wording like:\n• headache\n• flu\n• wound care\n• BP tablets\n\n⚠️ If symptoms are serious, please consult a healthcare professional.`;
}

async function sendWhatsAppReply(to: string, message: string) {
  const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID");
  const token = Deno.env.get("ULTRAMSG_TOKEN");
  if (!instanceId) throw new Error("ULTRAMSG_INSTANCE_ID is not configured");
  if (!token) throw new Error("ULTRAMSG_TOKEN is not configured");

  const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, to, body: message }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`UltraMsg API failed [${response.status}]: ${JSON.stringify(data)}`);
  return data;
}

async function logWebhook(entry: {
  source: string;
  from_number?: string;
  message_body?: string;
  reply_text?: string;
  response_status?: number;
  error_message?: string;
  raw_payload?: unknown;
}) {
  try {
    await db().from("whatsapp_webhook_logs").insert(entry);
  } catch (error) {
    console.error("Failed to log webhook", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";

  try {
    if (req.method === "GET") {
      const query = url.searchParams.get("query");
      if (query) {
        const reply = await processQuery(query, "GET");
        return new Response(JSON.stringify({ reply }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ status: "ok", message: "ChekaMeds WhatsApp webhook active" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, string> = {};
    let rawText = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      rawText = await req.text();
      body = Object.fromEntries(new URLSearchParams(rawText).entries());
    } else {
      rawText = await req.text();
      body = rawText ? JSON.parse(rawText) : {};
    }

    const from = (body.from || "").toString().replace("@c.us", "");
    const messageBody = (body.body || "").toString();
    const source = isTest ? "test" : "incoming";

    if (!from || !messageBody) {
      await logWebhook({ source, from_number: from, message_body: messageBody, response_status: 200, error_message: "no_message", raw_payload: body });
      return new Response(JSON.stringify({ status: "no_message" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reply = await processQuery(messageBody, from);
    let sendError: string | undefined;

    if (!isTest) {
      try {
        await sendWhatsAppReply(from, reply);
      } catch (error) {
        sendError = error instanceof Error ? error.message : String(error);
      }
    }

    await logWebhook({ source, from_number: from, message_body: messageBody, reply_text: reply, response_status: sendError ? 500 : 200, error_message: sendError, raw_payload: body });

    if (sendError) {
      return new Response(JSON.stringify({ error: sendError, reply }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ status: isTest ? "tested" : "replied", to: from, reply }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logWebhook({ source: isTest ? "test" : "incoming", response_status: 500, error_message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
