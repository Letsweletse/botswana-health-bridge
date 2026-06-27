const DEFAULT_SUPABASE_FUNCTION_URL =
  "https://kcgsxxwgzrmsnnxvpkvi.supabase.co/functions/v1/whatsapp-webhook";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type"
  );
}

function targetUrl(req) {
  const configured =
    process.env.SUPABASE_WHATSAPP_WEBHOOK_URL ||
    process.env.SUPABASE_FUNCTION_URL ||
    DEFAULT_SUPABASE_FUNCTION_URL;

  const requestUrl = new URL(req.url || "/api/whatsapp-webhook", "https://chekameds.local");
  const target = new URL(configured);
  target.search = requestUrl.search;
  return target.toString();
}

function isFormRequest(req) {
  return String(req.headers["content-type"] || "").includes("application/x-www-form-urlencoded");
}

async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body;

    if (isFormRequest(req)) {
      return new URLSearchParams(req.body).toString();
    }

    return JSON.stringify(req.body);
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "POST"].includes(req.method || "")) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json",
    };

    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseAnonKey) {
      headers.apikey = supabaseAnonKey;
      headers.authorization = `Bearer ${supabaseAnonKey}`;
    }

    const upstream = await fetch(targetUrl(req), {
      method: req.method,
      headers,
      body: await readBody(req),
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.send(text);
  } catch (error) {
    console.error("WhatsApp webhook proxy failed", error);
    res.status(500).json({
      error: "whatsapp_webhook_proxy_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
