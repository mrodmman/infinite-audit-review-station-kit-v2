// Cloudflare Pages Function: forwards audit payloads to an n8n webhook.
export async function onRequestPost(context) {
  const { request, env } = context;
  const WEBHOOK_URL = "https://n8n.kbkcompanies.com/webhook/infinite-audit"; // Replace with your n8n webhook URL.
  const API_KEY = env.API_KEY; // Optional: set an API key in Cloudflare Pages environment variables.

  // Optionally require an API key if one is configured.
  if (API_KEY) {
    const providedKey = request.headers.get("x-api-key");
    if (!providedKey || providedKey !== API_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Parse JSON payload from the client.
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Forward request to the webhook.
  const webhookResponse = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await webhookResponse.text();

  return new Response(data, {
    status: webhookResponse.status,
    headers: { "Content-Type": webhookResponse.headers.get("Content-Type") || "application/json" },
  });
}
