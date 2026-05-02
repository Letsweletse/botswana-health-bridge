import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Language state per user session (in production, persist in DB)
const userLanguages: Record<string, 'en' | 'tn'> = {};

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

async function getInventoryData() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('clinic_inventory')
    .select('*')
    .order('clinic_name');

  if (error) {
    console.error('DB query error:', error);
    return [];
  }
  return data || [];
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

  const inventoryData = await getInventoryData();

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

  // Search by clinic name
  const clinicMatches = inventoryData.filter((i: any) => i.clinic_name.toLowerCase().includes(msg));
  if (clinicMatches.length > 0) {
    const clinicName = clinicMatches[0].clinic_name;
    let reply = `📍 *${clinicName}*\n\n`;
    clinicMatches.forEach((item: any) => {
      const emoji = item.quantity < 20 ? '🔴' : item.quantity < 50 ? '🟡' : '🟢';
      reply += `${emoji} ${item.med_name}: *${item.quantity} units* (${item.trend})\n`;
    });
    reply += lang === 'tn' ? `\n_Data ya sebele go tswa mo ChekaMeds_` : `\n_Live data from ChekaMeds database_`;
    return reply;
  }

  // Search by medicine name
  const medMatches = inventoryData.filter((i: any) => i.med_name.toLowerCase().includes(msg));
  if (medMatches.length > 0) {
    let reply = `💊 *${medMatches[0].med_name}* ${lang === 'tn' ? 'e fumaneha:' : 'availability'}:\n\n`;
    medMatches.forEach((item: any) => {
      const emoji = item.quantity < 20 ? '🔴' : item.quantity < 50 ? '🟡' : '🟢';
      reply += `${emoji} ${item.clinic_name}: *${item.quantity} units*\n`;
    });
    return reply;
  }

  if (lang === 'tn') {
    return `🤔 Ga ke a bona sepe ka "${message}".\n\nLeka:\n📍 Leina la kliniiki (jk. "Princess Marina")\n💊 Setlhare (jk. "Paracetamol")\n📊 "status" go bona kakaretso\n🆘 "critical" go bona tlhaelo\n💊 "prescription: Med1, Med2" go batla ditlhare tsotlhe`;
  }
  return `🤔 I couldn't find anything for "${message}".\n\nTry:\n📍 A clinic name (e.g. "Princess Marina")\n💊 A medicine (e.g. "Paracetamol")\n📊 "status" for overview\n🆘 "critical" for urgent shortages\n💊 "prescription: Med1, Med2" for prescription matching\n🇧🇼 "setswana" to switch language`;
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

      const from = body.from || body.sender || '';
      const messageBody = body.body || body.message || '';
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
