// Cloudflare Pages Function: store and retrieve audit history in D1.
export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: "D1 not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method === "GET") {
    const { results } = await db
      .prepare(
        `SELECT biz, city, phone, email, image, menu, kw1, kw2, kw3, timestamp
         FROM audit_runs
         ORDER BY created_at DESC
         LIMIT 20`
      )
      .all();
    return new Response(JSON.stringify(results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stmt = db.prepare(
      `INSERT INTO audit_runs (biz, city, phone, email, image, menu, kw1, kw2, kw3, timestamp, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))`
    );

    await stmt
      .bind(
        payload.biz || "",
        payload.city || "",
        payload.phone || "",
        payload.email || "",
        payload.image || "",
        payload.menu || "",
        payload.kw1 || "",
        payload.kw2 || "",
        payload.kw3 || "",
        payload.timestamp || ""
      )
      .run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method === "DELETE") {
    await db.prepare("DELETE FROM audit_runs").run();
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
