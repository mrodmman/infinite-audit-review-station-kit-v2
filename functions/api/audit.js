// Cloudflare Pages Function: forwards audit payloads to an n8n webhook.

const getWebhookUrl = (env) => (env?.WEBHOOK_URL || "").trim();

export async function onRequestGet(context) {
  const { env } = context;
  const webhookUrl = getWebhookUrl(env);

  // Safe diagnostics endpoint: does not return secrets, only configuration health.
  return jsonResponse(
    {
      ok: true,
      route: "/api/audit",
      method: "GET",
      checks: {
        webhookConfigured: Boolean(webhookUrl),
        webhookLooksValid: webhookUrl.startsWith("https://"),
        apiKeyConfigured: Boolean(env?.API_KEY),
      },
      help: [
        "If webhookConfigured=false, set WEBHOOK_URL in Cloudflare Pages project env vars for the correct environment and redeploy.",
        "If webhookLooksValid=false, use a full https:// webhook URL.",
        "Then test POST /api/audit again from the dashboard.",
      ],
    },
    200
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const WEBHOOK_URL = getWebhookUrl(env);
  const API_KEY = env.API_KEY; // Optional: set an API key in Cloudflare Pages environment variables.
  const debugId = crypto.randomUUID();

  if (!WEBHOOK_URL || WEBHOOK_URL === "WEBHOOK_URL_HERE") {
    console.error(`[audit:${debugId}] Missing WEBHOOK_URL configuration`);
    return jsonResponse(
      {
        error: "WEBHOOK_URL is not configured. Set it in Cloudflare Pages > Settings > Environment variables, then redeploy.",
        debugId,
      },
      500,
      debugId
    );
  }

  if (!WEBHOOK_URL || WEBHOOK_URL === "WEBHOOK_URL_HERE") {
    return new Response(
      JSON.stringify({
        error: "WEBHOOK_URL is not configured. Set it in Cloudflare Pages > Settings > Environment variables.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Optionally require an API key if one is configured.
  if (API_KEY) {
    const providedKey = request.headers.get("x-api-key");
    if (!providedKey || providedKey !== API_KEY) {
      console.warn(`[audit:${debugId}] Unauthorized request - x-api-key missing or incorrect`);
      return jsonResponse({ error: "Unauthorized", debugId }, 401, debugId);
    }
  }

  // Parse JSON payload from the client.
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    console.warn(`[audit:${debugId}] Invalid JSON payload`);
    return jsonResponse({ error: "Invalid JSON payload", debugId }, 400, debugId);
  }

  // Log high-level request shape (avoid sensitive values).
  const payloadKeys = Object.keys(payload || {});
  console.log(`[audit:${debugId}] Forwarding payload with keys: ${payloadKeys.join(", ")}`);

  // Forward request to the webhook.
  try {
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await webhookResponse.text();

    if (!webhookResponse.ok) {
      console.error(`[audit:${debugId}] Webhook error status=${webhookResponse.status} body=${data.slice(0, 300)}`);
      return jsonResponse(
        {
          error: "Webhook responded with an error.",
          webhookStatus: webhookResponse.status,
          webhookBody: data.slice(0, 1000),
          debugId,
        },
        webhookResponse.status,
        debugId
      );
    }

    console.log(`[audit:${debugId}] Webhook success status=${webhookResponse.status}`);

    return new Response(data, {
      status: webhookResponse.status,
      headers: {
        "Content-Type": webhookResponse.headers.get("Content-Type") || "application/json",
        "x-debug-id": debugId,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[audit:${debugId}] Fetch error: ${details}`);
    return jsonResponse(
      {
        error: "Unable to reach the webhook endpoint.",
        details,
        debugId,
      },
      502,
      debugId
    );
  }
}

function jsonResponse(body, status, debugId) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (debugId) {
    headers["x-debug-id"] = debugId;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}
