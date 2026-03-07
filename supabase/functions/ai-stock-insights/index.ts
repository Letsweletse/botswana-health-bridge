import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { forecasts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const criticalItems = forecasts?.filter((f: any) => f.risk === 'critical') || [];
    const warningItems = forecasts?.filter((f: any) => f.risk === 'warning') || [];

    const systemPrompt = `You are a concise pharmaceutical supply chain analyst for Botswana's public health clinics. Given stock forecast data, provide a brief 3-4 sentence strategic insight covering:
1. The most urgent action needed
2. A pattern or trend you notice
3. A specific recommendation for the district health team
Be direct, professional, and specific to Botswana's health context. No emojis. No bullet points. Just clear prose.`;

    const userPrompt = `Here is the current stock forecast data for Gaborone District clinics:

Critical items (${criticalItems.length}): ${criticalItems.map((c: any) => `${c.med_name} at ${c.clinic_name}: ${c.current_qty} units, ${c.days_until_empty} days left`).join('; ')}

Warning items (${warningItems.length}): ${warningItems.map((w: any) => `${w.med_name} at ${w.clinic_name}: ${w.current_qty} units, ${w.days_until_empty} days left`).join('; ')}

Total items analysed: ${forecasts?.length || 0}

Provide your strategic insight.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ insight }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI insights error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
