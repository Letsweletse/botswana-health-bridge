import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Medicine inventory data (same as frontend mock — will be replaced with DB later)
const inventoryData = [
  { clinic_name: 'Princess Marina Hospital', med_name: 'Metformin 500mg', category: 'Chronic', quantity: 12, trend: 'Depleting Fast' },
  { clinic_name: 'Princess Marina Hospital', med_name: 'Amoxicillin 250mg', category: 'Acute', quantity: 5, trend: 'Depleting Fast' },
  { clinic_name: 'Gaborone Private Hospital', med_name: 'Amlodipine 5mg', category: 'Chronic', quantity: 340, trend: 'Stable' },
  { clinic_name: 'Bokamoso Private Hospital', med_name: 'Paracetamol 500mg', category: 'Essential', quantity: 520, trend: 'Restocked' },
  { clinic_name: 'Sbrana Psychiatric Hospital', med_name: 'Diazepam 5mg', category: 'Acute', quantity: 45, trend: 'Depleting Fast' },
  { clinic_name: 'Extension 2 Clinic', med_name: 'ARV - TLD', category: 'Chronic', quantity: 8, trend: 'Depleting Fast' },
  { clinic_name: 'Bontleng Clinic', med_name: 'Ibuprofen 400mg', category: 'Essential', quantity: 200, trend: 'Stable' },
  { clinic_name: 'Block 6 Clinic', med_name: 'ORS Sachets', category: 'Preventive', quantity: 150, trend: 'Stable' },
  { clinic_name: 'Phase 2 Clinic', med_name: 'Insulin Glargine', category: 'Chronic', quantity: 30, trend: 'Depleting Fast' },
  { clinic_name: 'Gaborone Private Hospital', med_name: 'Ciprofloxacin 500mg', category: 'Acute', quantity: 280, trend: 'Stable' },
  { clinic_name: 'Princess Marina Hospital', med_name: 'Omeprazole 20mg', category: 'Essential', quantity: 90, trend: 'Stable' },
  { clinic_name: 'Extension 2 Clinic', med_name: 'Cotrimoxazole', category: 'Preventive', quantity: 3, trend: 'Depleting Fast' },
];

function processQuery(message: string): string {
  const msg = message.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|dumelang|dumela)/.test(msg)) {
    return `🏥 *ChekaMeds — Medicine Stock Checker*\n\nDumelang! 👋 I can help you check medicine availability.\n\nSend me:\n📍 A clinic name (e.g. "Princess Marina")\n💊 A medicine name (e.g. "Metformin")\n📊 "status" for a full summary\n🆘 "critical" for urgent shortages`;
  }

  // Critical shortages
  if (/critical|urgent|shortage|emergency|low/.test(msg)) {
    const critical = inventoryData.filter(i => i.quantity < 20).sort((a, b) => a.quantity - b.quantity);
    if (critical.length === 0) return "✅ No critical shortages right now! All clinics are well-stocked.";
    let reply = `🚨 *CRITICAL SHORTAGES (${critical.length} items)*\n\n`;
    critical.forEach(item => {
      reply += `⚠️ *${item.med_name}* — ${item.quantity} units\n   📍 ${item.clinic_name}\n\n`;
    });
    reply += `_Updated in real-time via IoT sensors_`;
    return reply;
  }

  // Full status
  if (/status|summary|overview|report/.test(msg)) {
    const total = inventoryData.length;
    const critical = inventoryData.filter(i => i.quantity < 20).length;
    const healthy = inventoryData.filter(i => i.quantity >= 100).length;
    const depleting = inventoryData.filter(i => i.trend === 'Depleting Fast').length;
    return `📊 *ChekaMeds Stock Summary*\n\n💊 Medicines tracked: ${total}\n✅ Healthy stock (100+): ${healthy}\n⚠️ Critical (<20 units): ${critical}\n📉 Depleting fast: ${depleting}\n\n_Send a clinic or medicine name for details._`;
  }

  // Search by clinic name
  const clinicMatches = inventoryData.filter(i => i.clinic_name.toLowerCase().includes(msg));
  if (clinicMatches.length > 0) {
    const clinicName = clinicMatches[0].clinic_name;
    let reply = `📍 *${clinicName}*\n\n`;
    clinicMatches.forEach(item => {
      const emoji = item.quantity < 20 ? '🔴' : item.quantity < 50 ? '🟡' : '🟢';
      reply += `${emoji} ${item.med_name}: *${item.quantity} units* (${item.trend})\n`;
    });
    reply += `\n_Real-time data from IoT shelf sensors_`;
    return reply;
  }

  // Search by medicine name
  const medMatches = inventoryData.filter(i => i.med_name.toLowerCase().includes(msg));
  if (medMatches.length > 0) {
    let reply = `💊 *${medMatches[0].med_name}* availability:\n\n`;
    medMatches.forEach(item => {
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
    // Handle incoming webhook from UltraMsg
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

      // Process and reply
      const reply = processQuery(messageBody);
      await sendWhatsAppReply(from, reply);

      return new Response(JSON.stringify({ status: 'replied', to: from }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET — test / health check and manual query
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const query = url.searchParams.get('query');
      if (query) {
        const reply = processQuery(query);
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
