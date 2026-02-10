// Cloudflare Pages Function: forwards audit payloads to an n8n webhook.
export async function onRequestPost(context) {
  const { request, env } = context;
  const WEBHOOK_URL = env.WEBHOOK_URL || "WEBHOOK_URL_HERE"; // Prefer environment variable in Cloudflare Pages.
  const API_KEY = env.API_KEY; // Optional: set an API key in Cloudflare Pages environment variables.

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
      return new Response(
        JSON.stringify({
          error: "Webhook responded with an error.",
          webhookStatus: webhookResponse.status,
          webhookBody: data.slice(0, 1000),
        }),
        {
          status: webhookResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(data, {
      status: webhookResponse.status,
      headers: { "Content-Type": webhookResponse.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unable to reach the webhook endpoint.",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
