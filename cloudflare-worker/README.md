# ChekaMeds Cloudflare WhatsApp Webhook Gateway

This Worker is an alternative webhook front door for ChekaMeds.

It does **not** replace the existing Supabase WhatsApp bot.
It receives provider webhooks, normalizes the payload, then forwards the clean message to the existing Supabase Edge Function:

```txt
https://kcgsxxwgzrmsnnxvpkvi.supabase.co/functions/v1/whatsapp-webhook
```

## Routes

```txt
GET  /health
POST /ultramsg
POST /meta
POST /twilio
POST /360dialog
POST /generic
```

## Flow

```txt
UltraMsg / Meta / Twilio / 360dialog
        ↓
Cloudflare Worker gateway
        ↓
Existing Supabase whatsapp-webhook Edge Function
        ↓
Existing ChekaMeds WhatsApp bot logic
```

## Deploy

From this folder:

```sh
npm install
npm run deploy
```

## Optional security secret

The gateway works without a secret while testing.

For production, add a Worker secret:

```sh
npx wrangler secret put GATEWAY_SECRET
```

Then providers must send this header:

```txt
x-gateway-secret: YOUR_SECRET
```

Some providers do not allow custom webhook headers. If a provider cannot send custom headers, leave `GATEWAY_SECRET` unset and rely on provider-side verification later.

## Test locally

```sh
npm run dev
```

Dry run through the existing Supabase bot without sending WhatsApp:

```sh
curl -X POST 'http://localhost:8787/ultramsg?test=true' \
  -H 'Content-Type: application/json' \
  -d '{"from":"+26771234567","body":"panado"}'
```

Live-style test against deployed Worker:

```sh
curl -X POST 'https://chekameds-webhook-gateway.YOUR_SUBDOMAIN.workers.dev/ultramsg?test=true' \
  -H 'Content-Type: application/json' \
  -d '{"from":"+26771234567","body":"panado"}'
```

## Provider webhook URLs

After deployment, set providers like this:

```txt
UltraMsg:   https://YOUR_WORKER_URL/ultramsg
Meta:       https://YOUR_WORKER_URL/meta
Twilio:     https://YOUR_WORKER_URL/twilio
360dialog:  https://YOUR_WORKER_URL/360dialog
```

Start with `?test=true` while testing to prevent actual WhatsApp replies from the Supabase function:

```txt
https://YOUR_WORKER_URL/ultramsg?test=true
```

Remove `?test=true` only when ready for live replies.
