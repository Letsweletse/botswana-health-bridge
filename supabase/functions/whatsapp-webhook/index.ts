import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Language state per user session (in production, persist in DB)
const userLanguages: Record<string, 'en' | 'tn'> = {};

// Session memory persisted in DB so replies survive cold starts
type SessionOption = { clinic_name: string; location: string | null; price_bwp: number | null; quantity: number; med_name: string };
type Session = { medicine: string; options: SessionOption[]; selected?: SessionOption };

function sessionClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function setSession(from: string, s: Session) {
  try {
    await sessionClient().from('whatsapp_sessions').upsert({
      from_number: from,
      medicine: s.medicine,
      options: s.options as any,
      selected: (s.selected ?? null) as any,
      updated_at: new Date().toISOString(),
    });
  } catch (e) { console.error('setSession error', e); }
}

async function getSession(from: string): Promise<Session | undefined> {
  try {
    const { data } = await sessionClient()
      .from('whatsapp_sessions').select('*').eq('from_number', from).maybeSingle();
    if (!data) return undefined;
    if (Date.now() - new Date(data.updated_at).getTime() > 30 * 60 * 1000) return undefined;
    return { medicine: data.medicine, options: (data.options || []) as SessionOption[], selected: data.selected || undefined };
  } catch { return undefined; }
}

function getLang(from: string): 'en' | 'tn' {
  return userLanguages[from] || 'en';
}

const tn: Record<string, string> = {
  greeting: '🏥 *ChekaMeds — Tlhatlhobo ya Ditlhare*\n\nDumelang! 👋 Ke ka go thusa go bona ditlhare.\n\nRomela:\n📍 Leina la kliniiki (jk. "Princess Marina")\n💊 Leina la setlhare (jk. "Metformin")\n📊 "status" go bona kakaretso\n🆘 "critical" go bona tlhaelo e kgolo\n💊 "prescription: Med1, Med2" go bona kliniiki e e nang le tsotlhe',
  no_critical: '✅ Ga go na tlhaelo e kgolo ga jaana! Dikliniiki tsotlhe di na le ditlhare.',
  critical_header: '🚨 *TLHAELO E KGOLO',
  status_header: '📊 *Kakaretso ya ChekaMeds*',
  not_found: '🤔 Ga ke a bona sepe ka',
  lang_switch: '🇧🇼 Puo e fetoletswe go Setswana! Romela molaetsa ope.',
  lang_en: '🇬🇧 Language switched to English! Send any message.',
  prescription_header: '💊 *Prescription Matching*',
  prescription_full: '✅ *FULL MATCH*',
  prescription_partial: '⚠️ *PARTIAL MATCH*',
};

// ===== Performance: in-memory caches (per warm instance) =====
const INVENTORY_TTL_MS = 60_000;
const SEARCH_TTL_MS = 60_000;
let inventoryCache: { data: any[]; ts: number } | null = null;
const searchCache = new Map<string, { data: any[]; ts: number }>();

function cachedSupabase() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function getInventoryData() {
  if (inventoryCache && Date.now() - inventoryCache.ts < INVENTORY_TTL_MS) {
    return inventoryCache.data;
  }
  const { data, error } = await cachedSupabase()
    .from('clinic_inventory')
    .select('clinic_name,med_name,quantity,price_bwp,location,trend,category')
    .order('clinic_name');
  if (error) { console.error('DB query error:', error); return []; }
  inventoryCache = { data: data || [], ts: Date.now() };
  return inventoryCache.data;
}

/** Fast targeted medicine search — only reads matching rows. */
async function searchMedicine(term: string) {
  const key = term.toLowerCase().trim();
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.ts < SEARCH_TTL_MS) return hit.data;

  const { data, error } = await cachedSupabase()
    .from('clinic_inventory')
    .select('clinic_name,med_name,quantity,price_bwp,location')
    .ilike('med_name', `%${key}%`)
    .neq('clinic_name', 'ChekaMeds Admin')
    .limit(50);
  if (error) { console.error('searchMedicine error:', error); return []; }
  const rows = data || [];
  searchCache.set(key, { data: rows, ts: Date.now() });
  if (searchCache.size > 200) searchCache.delete(searchCache.keys().next().value);
  return rows;
}

async function processQuery(message: string, from: string = ''): Promise<string> {
  const msg = message.toLowerCase().trim();
  const lang = getLang(from);

  // Language switching
  if (/^setswana$/.test(msg)) {
    userLanguages[from] = 'tn';
    return tn.lang_switch;
  }
  if (/^english$/.test(msg)) {
    userLanguages[from] = 'en';
    return tn.lang_en;
  }

  // Greeting
  if (/^(hi|hello|hey|dumelang|dumela|thobela|lotsha)/.test(msg)) {
    if (lang === 'tn') return tn.greeting;
    return `🏥 *ChekaMeds — Medicine Stock Checker*\n\nDumelang! 👋 I can help you check medicine availability.\n\nSend me:\n📍 A clinic name (e.g. "Princess Marina")\n💊 A medicine name (e.g. "Metformin")\n📊 "status" for a full summary\n🆘 "critical" for urgent shortages\n💊 "prescription: Med1, Med2" to find a clinic with all meds\n🇧🇼 "setswana" to switch language`;
  }

  // ===== Session-based selection / payment handlers (must run BEFORE inventory fetch) =====
  const session = await getSession(from);

  // PAY flow
  if (/^pay$/i.test(msg)) {
    if (session?.selected) {
      const s = session.selected;
      const priceLine = s.price_bwp != null ? `P${Number(s.price_bwp).toFixed(2)}` : 'price on request';
      return `💳 Preparing your payment request...\n\n💊 ${s.med_name}\n📍 ${s.clinic_name}${s.location ? ' – ' + s.location : ''}\n💰 ${priceLine}\n\nWe'll send your ChekaPay link shortly.`;
    }
    return `💳 Please search for a medicine first, then choose a pharmacy before replying PAY.`;
  }

  // Numeric option selection (1/2/3)
  if (/^[1-9]$/.test(msg) && session?.options?.length) {
    const idx = parseInt(msg, 10) - 1;
    if (idx < 0 || idx >= session.options.length) {
      return `❌ Invalid selection.\n\nPlease reply with:\n${session.options.map((_, i) => i + 1).join(' or ')}`;
    }
    const choice = session.options[idx];
    await setSession(from, { medicine: session.medicine, options: session.options, selected: choice });
    const priceLine = choice.price_bwp != null ? `P${Number(choice.price_bwp).toFixed(2)}` : 'Price not available';
    return `✅ You selected *${choice.clinic_name}*\n\n💊 ${choice.med_name}\n💰 Price: *${priceLine}*\n📍 Location: ${choice.location || 'N/A'}\n\n👉 Reply *PAY* to continue`;
  }

  // Lazy-load full inventory only for aggregate queries below
  const needsFullInventory = /^prescription[:\s]|critical|urgent|shortage|emergency|low|tlhaelo|status|summary|overview|report|kakaretso/.test(msg);
  const inventoryData: any[] = needsFullInventory ? await getInventoryData() : [];

  // Prescription matching
  if (/^prescription[:\s]/.test(msg)) {
    const rxPart = msg.replace(/^prescription[:\s]+/, '');
    const medicines = rxPart.split(/[,;]+/).map(m => m.trim()).filter(Boolean);
    
    if (medicines.length === 0) {
      return lang === 'tn' 
        ? '💊 Romela lenaane la ditlhare: "prescription: Metformin, Paracetamol"'
        : '💊 Send your list like: "prescription: Metformin, Paracetamol"';
    }

    // Group inventory by clinic
    const clinicMap: Record<string, any[]> = {};
    inventoryData.forEach((item: any) => {
      if (!clinicMap[item.clinic_name]) clinicMap[item.clinic_name] = [];
      clinicMap[item.clinic_name].push(item);
    });

    const results: { clinic: string; matched: string[]; missing: string[]; pct: number }[] = [];
    
    for (const [clinic, meds] of Object.entries(clinicMap)) {
      const matched: string[] = [];
      const missing: string[] = [];
      medicines.forEach(rx => {
        const found = meds.some(m => m.med_name.toLowerCase().includes(rx) && m.quantity > 0);
        if (found) matched.push(rx);
        else missing.push(rx);
      });
      if (matched.length > 0) {
        results.push({ clinic, matched, missing, pct: Math.round((matched.length / medicines.length) * 100) });
      }
    }

    results.sort((a, b) => b.pct - a.pct);

    if (results.length === 0) {
      return lang === 'tn'
        ? '😞 Ga go na kliniiki e e nang le ditlhare tseo.'
        : '😞 No clinic has any of those medicines in stock right now.';
    }

    let reply = lang === 'tn' ? `${tn.prescription_header}\n\n` : `💊 *Prescription Matching Results*\n\n`;
    reply += `🔍 Searched: ${medicines.join(', ')}\n\n`;

    results.slice(0, 5).forEach(r => {
      const icon = r.pct === 100 ? '✅' : '⚠️';
      reply += `${icon} *${r.clinic}* — ${r.pct}% match\n`;
      reply += `  ✓ Has: ${r.matched.join(', ')}\n`;
      if (r.missing.length > 0) reply += `  ✗ Missing: ${r.missing.join(', ')}\n`;
      reply += `\n`;
    });

    const fullMatch = results.find(r => r.pct === 100);
    if (fullMatch) {
      reply += `🎯 *Best option: ${fullMatch.clinic}* has ALL your medicines!`;
    } else {
      reply += `⚠️ No single clinic has everything. ${results[0].clinic} is the closest match.`;
    }

    return reply;
  }

  // Critical shortages
  if (/critical|urgent|shortage|emergency|low|tlhaelo/.test(msg)) {
    const critical = inventoryData.filter((i: any) => i.quantity < 20).sort((a: any, b: any) => a.quantity - b.quantity);
    if (critical.length === 0) return lang === 'tn' ? tn.no_critical : "✅ No critical shortages right now! All clinics are well-stocked.";
    let reply = lang === 'tn' 
      ? `${tn.critical_header} (${critical.length})*\n\n`
      : `🚨 *CRITICAL SHORTAGES (${critical.length} items)*\n\n`;
    critical.forEach((item: any) => {
      reply += `⚠️ *${item.med_name}* — ${item.quantity} units\n   📍 ${item.clinic_name}\n\n`;
    });
    reply += lang === 'tn' ? `_Data ya sebele go tswa mo database_` : `_Updated in real-time from database_`;
    return reply;
  }

  // Full status
  if (/status|summary|overview|report|kakaretso/.test(msg)) {
    const total = inventoryData.length;
    const critical = inventoryData.filter((i: any) => i.quantity < 20).length;
    const healthy = inventoryData.filter((i: any) => i.quantity >= 100).length;
    const depleting = inventoryData.filter((i: any) => i.trend === 'Depleting Fast').length;
    
    if (lang === 'tn') {
      return `${tn.status_header}*\n\n💊 Ditlhare tse di latedisiwang: ${total}\n✅ Setoko se se siameng (100+): ${healthy}\n⚠️ Tlhaelo e kgolo (<20): ${critical}\n📉 Di a fela ka bonako: ${depleting}\n\n_Romela leina la kliniiki kgotsa setlhare go bona dintlha._`;
    }
    return `📊 *ChekaMeds Stock Summary*\n\n💊 Medicines tracked: ${total}\n✅ Healthy stock (100+): ${healthy}\n⚠️ Critical (<20 units): ${critical}\n📉 Depleting fast: ${depleting}\n\n_Send a clinic or medicine name for details._`;
  }

  // Product search — short, WhatsApp-friendly response
  const medMatchesRaw = inventoryData.filter((i: any) =>
    i.med_name && i.med_name.toLowerCase().includes(msg) &&
    i.clinic_name !== 'ChekaMeds Admin'
  );

  if (medMatchesRaw.length > 0) {
    const inStock = medMatchesRaw.filter((i: any) => Number(i.quantity) > 0);
    const sortByPrice = (a: any, b: any) => {
      const ap = a.price_bwp != null ? Number(a.price_bwp) : Infinity;
      const bp = b.price_bwp != null ? Number(b.price_bwp) : Infinity;
      if (ap !== bp) return ap - bp;
      return Number(b.quantity) - Number(a.quantity);
    };

    // Dedupe by pharmacy/clinic — keep best record per pharmacy
    const byPharmacy: Record<string, any> = {};
    (inStock.length > 0 ? inStock : medMatchesRaw)
      .sort(sortByPrice)
      .forEach((it: any) => {
        if (!byPharmacy[it.clinic_name]) byPharmacy[it.clinic_name] = it;
      });
    const unique = Object.values(byPharmacy);

    const name = unique[0].med_name;

    // Out of stock — suggest nearest alternative if any
    if (inStock.length === 0) {
      return `❌ ${name} is out of stock\n\nReply ALT for alternatives or NOTIFY for updates`;
    }

    // Build session options for selection
    const sessionOptions: SessionOption[] = unique.slice(0, 5).map((p: any) => ({
      clinic_name: p.clinic_name,
      location: p.location || null,
      price_bwp: p.price_bwp != null ? Number(p.price_bwp) : null,
      quantity: Number(p.quantity),
      med_name: name,
    }));

    // Multiple pharmacies have it
    if (unique.length > 1) {
      const top = sessionOptions.slice(0, 3);
      const numEmoji = ['1️⃣', '2️⃣', '3️⃣'];
      let reply = `✅ *${name}* is available at multiple pharmacies\n\n`;
      top.forEach((p, idx) => {
        const priceLine = p.price_bwp != null ? `*P${p.price_bwp.toFixed(2)}*` : '*Price not available*';
        reply += `${numEmoji[idx]} *${p.clinic_name}*${p.location ? ' – ' + p.location : ''}\n💊 Price: ${priceLine}\n\n`;
      });
      reply += `👉 Reply *${top.map((_, i) => i + 1).join('* or *')}* to choose a pharmacy\n`;
      reply += `👉 Reply *PAY* to order immediately`;
      await setSession(from, { medicine: name, options: top });
      return reply;
    }

    // Single pharmacy
    const best = unique[0];
    const qty = Number(best.quantity);
    const priceLine = best.price_bwp != null
      ? `💊 Price: *P${Number(best.price_bwp).toFixed(2)}*`
      : `💊 Price not available`;
    const header = qty < 20
      ? `⚠️ *${name}* is available (Limited stock)`
      : `✅ *${name}* is available`;
    let reply = `${header}\n${priceLine}\n📦 Status: ${qty < 20 ? 'Low Stock' : 'In Stock'}`;
    if (best.clinic_name) reply += `\n📍 Pharmacy: *${best.clinic_name}*`;
    if (best.location) reply += `\n📍 Location: ${best.location}`;
    reply += `\n\n👉 Reply *1* to reserve\n👉 Reply *PAY* to order`;
    await setSession(from, { medicine: name, options: [sessionOptions[0]], selected: sessionOptions[0] });
    return reply;
  }

  // Search by clinic name (only if not a med match)
  const clinicMatches = inventoryData.filter((i: any) =>
    i.clinic_name.toLowerCase().includes(msg) &&
    Number(i.quantity) > 0 &&
    i.clinic_name !== 'ChekaMeds Admin'
  );
  if (clinicMatches.length > 0) {
    const clinicName = clinicMatches[0].clinic_name;
    const stockLabel = (q: number) => q > 100 ? 'In Stock' : q >= 20 ? 'Low Stock' : 'Limited';
    let reply = `📍 *${clinicName}*\n\n`;
    clinicMatches.slice(0, 15).forEach((item: any) => {
      reply += `💊 ${item.med_name} — 📦 ${stockLabel(Number(item.quantity))}\n`;
    });
    reply += `\nReply with another medicine to search again.`;
    return reply;
  }

  if (lang === 'tn') {
    return `❌ Setlhare ga se a bonwa. Tlhola mokwalo kgotsa leka leina le lengwe.`;
  }
  return `❌ Medicine not found. Please check spelling or try another name`;
}

async function sendWhatsAppReply(to: string, message: string) {
  const instanceId = Deno.env.get('ULTRAMSG_INSTANCE_ID');
  const token = Deno.env.get('ULTRAMSG_TOKEN');

  if (!instanceId) throw new Error('ULTRAMSG_INSTANCE_ID is not configured');
  if (!token) throw new Error('ULTRAMSG_TOKEN is not configured');

  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, to, body: message }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`UltraMsg API failed [${response.status}]: ${JSON.stringify(data)}`);
  }
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await supabase.from('whatsapp_webhook_logs').insert(entry);
  } catch (e) {
    console.error('Failed to log webhook:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const isTest = url.searchParams.get('test') === 'true';

  try {
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      let body: Record<string, string> = {};
      let rawText = '';

      if (contentType.includes('application/x-www-form-urlencoded')) {
        rawText = await req.text();
        const params = new URLSearchParams(rawText);
        body = Object.fromEntries(params.entries());
      } else {
        try {
          rawText = await req.text();
          body = rawText ? JSON.parse(rawText) : {};
        } catch {
          body = {};
        }
      }

      // UltraMsg nests payload under `data`. Support both flat + nested.
      const data: Record<string, string> = (body as any).data && typeof (body as any).data === 'object'
        ? (body as any).data
        : body;
      const from = (data.from || data.sender || (body as any).from || '').toString().replace('@c.us', '');
      const messageBody = (data.body || data.message || (body as any).body || '').toString();
      const source = isTest ? 'test' : 'incoming';

      console.log('Incoming WhatsApp message:', { from, messageBody, isTest });

      if (!from || !messageBody) {
        await logWebhook({
          source,
          from_number: from,
          message_body: messageBody,
          response_status: 200,
          error_message: 'no_message: missing from or body',
          raw_payload: body,
        });
        return new Response(JSON.stringify({ status: 'no_message' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const reply = await processQuery(messageBody, from);

      let sendError: string | undefined;
      if (!isTest) {
        try {
          await sendWhatsAppReply(from, reply);
        } catch (e) {
          sendError = e instanceof Error ? e.message : String(e);
        }
      }

      await logWebhook({
        source,
        from_number: from,
        message_body: messageBody,
        reply_text: reply,
        response_status: sendError ? 500 : 200,
        error_message: sendError,
        raw_payload: body,
      });

      if (sendError) {
        return new Response(JSON.stringify({ error: sendError, reply }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ status: isTest ? 'tested' : 'replied', to: from, reply }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const query = url.searchParams.get('query');
      if (query) {
        const reply = await processQuery(query);
        await logWebhook({
          source: 'test',
          from_number: 'GET',
          message_body: query,
          reply_text: reply,
          response_status: 200,
        });
        return new Response(JSON.stringify({ reply }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ status: 'ok', message: 'ChekaMeds WhatsApp Webhook is active' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook({
      source: isTest ? 'test' : 'incoming',
      response_status: 500,
      error_message: errorMessage,
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
