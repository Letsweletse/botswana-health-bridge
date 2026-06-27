type Env = {
  SUPABASE_WEBHOOK_URL: string;
  GATEWAY_SECRET?: string;
};

type NormalizedMessage = {
  provider: "ultramsg" | "meta" | "twilio" | "360dialog" | "generic";
  from: string;
  to?: string;
  body: string;
  messageId?: string;
  messageType?: string;
  raw: unknown;
};

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-gateway-secret, x-hub-signature, x-hub-signature-256",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function cleanPhone(value: unknown) {
  let phone = String(value || "")
    .replace("@c.us", "")
    .replace("@s.whatsapp.net", "")
    .replace(/^\+/, "")
    .replace(/[^0-9]/g, "");

  if (phone.length === 8) phone = `267${phone}`;
  if (phone.length === 10 && phone.startsWith("0")) phone = `267${phone.slice(1)}`;

  return phone;
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.text();
    return Object.fromEntries(new URLSearchParams(form).entries());
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }

  const text = await req.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { body: text };
  }
}

function normalizeUltraMsg(payload: any): NormalizedMessage {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  return {
    provider: "ultramsg",
    from: cleanPhone(data.from || data.sender || data.author || data.chatId),
    to: cleanPhone(data.to || data.instance || data.recipient),
    body: pickText(data.body, data.message, data.text, data.caption),
    messageId: pickText(data.id, data.messageId, data.msgId),
    messageType: pickText(data.type, data.message_type),
    raw: payload,
  };
}

function normalizeTwilio(payload: any): NormalizedMessage {
  return {
    provider: "twilio",
    from: cleanPhone(payload.From || payload.from),
    to: cleanPhone(payload.To || payload.to),
    body: pickText(payload.Body, payload.body, payload.MessageBody),
    messageId: pickText(payload.MessageSid, payload.SmsMessageSid, payload.messageId),
    messageType: pickText(payload.MessageType, payload.SmsStatus),
    raw: payload,
  };
}

function normalizeMetaLike(payload: any, provider: "meta" | "360dialog"): NormalizedMessage {
  const value = payload?.entry?.[0]?.changes?.[0]?.value || payload;
  const message = value?.messages?.[0] || payload?.messages?.[0] || payload;
  const contact = value?.contacts?.[0] || {};

  const body = pickText(
    message?.text?.body,
    message?.button?.text,
    message?.interactive?.button_reply?.title,
    message?.interactive?.list_reply?.title,
    message?.body,
    payload?.body,
    payload?.text
  );

  return {
    provider,
    from: cleanPhone(message?.from || contact?.wa_id || payload?.from),
    to: cleanPhone(value?.metadata?.phone_number_id || payload?.to),
    body,
    messageId: pickText(message?.id, payload?.message_id, payload?.messageId),
    messageType: pickText(message?.type, payload?.type),
    raw: payload,
  };
}

function normalizeGeneric(payload: any): NormalizedMessage {
  return {
    provider: "generic",
    from: cleanPhone(payload.from || payload.sender || payload.phone || payload.msisdn),
    to: cleanPhone(payload.to || payload.recipient),
    body: pickText(payload.body, payload.message, payload.text),
    messageId: pickText(payload.id, payload.messageId, payload.message_id),
    messageType: pickText(payload.type, payload.messageType),
    raw: payload,
  };
}

function normalize(provider: string, payload: any): NormalizedMessage {
  if (provider === "ultramsg") return normalizeUltraMsg(payload);
  if (provider === "twilio") return normalizeTwilio(payload);
  if (provider === "meta") return normalizeMetaLike(payload, "meta");
  if (provider === "360dialog") return normalizeMetaLike(payload, "360dialog");
  return normalizeGeneric(payload);
}

function toSupabasePayload(message: NormalizedMessage) {
  return {
    provider: message.provider,
    from: message.from,
    sender: message.from,
    to: message.to,
    body: message.body,
    message: message.body,
    text: message.body,
    message_id: message.messageId,
    message_type: message.messageType,
    data: {
      from: message.from,
      to: message.to,
      body: message.body,
      id: message.messageId,
      type: message.messageType,
      provider: message.provider,
      raw: message.raw,
    },
    raw_payload: message.raw,
  };
}

async function forwardToExistingBot(env: Env, req: Request, message: NormalizedMessage) {
  const url = new URL(env.SUPABASE_WEBHOOK_URL);
  const requestUrl = new URL(req.url);
  url.search = requestUrl.search;

  const upstream = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toSupabasePayload(message)),
  });

  const text = await upstream.text();
  let body: unknown = text;

  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  return {
    ok: upstream.ok,
    status: upstream.status,
    body,
  };
}

function requireGatewaySecret(req: Request, env: Env) {
  if (!env.GATEWAY_SECRET) return true;
  return req.headers.get("x-gateway-secret") === env.GATEWAY_SECRET;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });

    const url = new URL(req.url);
    const route = url.pathname.replace(/^\/+/, "").split("/")[0] || "health";

    if (req.method === "GET" && route === "health") {
      return json({
        status: "ok",
        service: "chekameds-webhook-gateway",
        mode: "proxy-only",
        existing_bot: env.SUPABASE_WEBHOOK_URL,
        routes: ["/ultramsg", "/meta", "/twilio", "/360dialog", "/generic"],
      });
    }

    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    if (!requireGatewaySecret(req, env)) {
      return json({ error: "unauthorized_gateway_request" }, 401);
    }

    const supported = new Set(["ultramsg", "meta", "twilio", "360dialog", "generic"]);
    const provider = supported.has(route) ? route : "generic";
    const payload = await readPayload(req);
    const normalized = normalize(provider, payload);

    if (!normalized.from || !normalized.body) {
      return json({
        status: "ignored",
        reason: "missing_from_or_body",
        provider,
        normalized,
      });
    }

    const upstream = await forwardToExistingBot(env, req, normalized);

    return json({
      status: upstream.ok ? "forwarded" : "upstream_failed",
      provider,
      from: normalized.from,
      message: normalized.body,
      upstream_status: upstream.status,
      upstream_body: upstream.body,
    }, upstream.ok ? 200 : 502);
  },
};
