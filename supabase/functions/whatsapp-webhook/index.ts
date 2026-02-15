import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

async function processQuery(message: string): Promise<string> {
  const msg = message.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|dumelang|dumela)/.test(msg)) {
    return `🏥 *ChekaMeds — Medicine Stock Checker*\n\nDumelang! 👋 I can help you check medicine availability.\n\nSend me:\n📍 A clinic name (e.g. "Princess Marina")\n💊 A medicine name (e.g. "Metformin")\n📊 "status" for a full summary\n🆘 "critical" for urgent shortages`;
  }

  const inventoryData = await getInventoryData();

  // Critical shortages
  if (/critical|urgent|shortage|emergency|low/.test(msg)) {
    const critical = inventoryData.filter((i: any) => i.quantity < 20).sort((a: any, b: any) => a.quantity - b.quantity);
    if (critical.length === 0) return "✅ No critical shortages right now! All clinics are well-stocked.";
    let reply = `🚨 *CRITICAL SHORTAGES (${critical.length} items)*\n\n`;
    critical.forEach((item: any) => {
      reply += `⚠️ *${item.med_name}* — ${item.quantity} units\n   📍 ${item.clinic_name}\n\n`;
    });
    reply += `_Updated in real-time from database_`;
    return reply;
  }

  // Full status
  if (/status|summary|overview|report/.test(msg)) {
    const total = inventoryData.length;
    const critical = inventoryData.filter((i: any) => i.quantity < 20).length;
    const healthy = inventoryData.filter((i: any) => i.quantity >= 100).length;
    const depleting = inventoryData.filter((i: any) => i.trend === 'Depleting Fast').length;
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
    reply += `\n_Live data from ChekaMeds database_`;
    return reply;
  }

  // Search by medicine name
  const medMatches = inventoryData.filter((i: any) => i.med_name.toLowerCase().includes(msg));
  if (medMatches.length > 0) {
    let reply = `💊 *${medMatches[0].med_name}* availability:\n\n`;
    medMatches.forEach((item: any) => {
      const emoji = item.quantity < 20 ? '🔴' : item.quantity < 50 ? '🟡' : '🟢';
      reply += `${emoji} ${item.clinic_name}: *${item.quantity} units*\n`;
    });
    return reply;
  }

  return `🤔 I couldn't find anything for "${message}".\n\nTry:\n📍 A clinic name (e.g. "Princess Marina")\n💊 A medicine (e.g. "Paracetamol")\n📊 "status" for overview\n🆘 "critical" for urgent shortages`;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      let body: Record<string, string>;

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      } else {
        body = await req.json();
      }

      const from = body.from || body.sender || '';
      const messageBody = body.body || body.message || '';

      console.log('Incoming WhatsApp message:', { from, messageBody });

      if (!from || !messageBody) {
        return new Response(JSON.stringify({ status: 'no_message' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const reply = await processQuery(messageBody);
      await sendWhatsAppReply(from, reply);

      return new Response(JSON.stringify({ status: 'replied', to: from }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const query = url.searchParams.get('query');
      if (query) {
        const reply = await processQuery(query);
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
