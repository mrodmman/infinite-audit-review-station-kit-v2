// Cloudflare Pages Function: generate menu HTML with AI and save into /menus via GitHub API.
export async function onRequestPost(context) {
  const { request, env } = context;

  const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY; // Required for AI generation.
  const GITHUB_TOKEN = env.GITHUB_TOKEN; // GitHub token with repo write access.
  const GITHUB_OWNER = env.GITHUB_OWNER; // GitHub username or org.
  const GITHUB_REPO = env.GITHUB_REPO; // Repository name.
  const GITHUB_BRANCH = env.GITHUB_BRANCH || "main";

  if (!DEEPSEEK_API_KEY || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return new Response(
      JSON.stringify({ error: "Missing API configuration. Check env vars." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let imageUrl = "";
  let bizName = "Restaurant";
  let slug = "";

  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const upload = formData.get("menuImage");
    imageUrl = (formData.get("imageUrl") || "").toString().trim();
    bizName = (formData.get("bizName") || bizName).toString().trim() || bizName;
    slug = (formData.get("slug") || "").toString().trim();

    if (upload && typeof upload === "object" && typeof upload.arrayBuffer === "function") {
      if (!env.R2_BUCKET || !env.R2_PUBLIC_BASE) {
        return new Response(JSON.stringify({ error: "Missing R2 configuration. Check env vars." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const uploadName = (upload.name || "menu-image").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const safeSlug = slug || "menu";
      const key = `menu-uploads/${safeSlug}-${Date.now()}-${uploadName}`;
      const buffer = await upload.arrayBuffer();
      await env.R2_BUCKET.put(key, buffer, {
        httpMetadata: { contentType: upload.type || "application/octet-stream" },
      });
      const base = env.R2_PUBLIC_BASE.replace(/\/+$/, "");
      imageUrl = `${base}/${key}`;
    }
  } else {
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    imageUrl = payload.imageUrl;
    bizName = payload.bizName || bizName;
    slug = payload.slug;
  }

  if (!imageUrl || !slug) {
    return new Response(JSON.stringify({ error: "imageUrl and slug are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Prompt DeepSeek to extract and format the menu into HTML.
  const prompt = `You are an expert menu designer. Based on the menu image URL: ${imageUrl},
extract all menu categories, items, prices, and descriptions. Output JSON ONLY with this shape:
{
  "businessName": "...",
  "tagline": "...",
  "html": "<full HTML page>"
}
The HTML must be mobile-first, modern, and clean. Use inline CSS and avoid external assets.`;

  const aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You generate structured JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    return new Response(JSON.stringify({ error: "AI request failed", details: errorText }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData?.choices?.[0]?.message?.content || "";

  // Attempt to parse JSON from the AI response.
  let parsed;
  try {
    const jsonStart = rawContent.indexOf("{");
    const jsonEnd = rawContent.lastIndexOf("}");
    parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd + 1));
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: rawContent }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const html = parsed.html || "";
  if (!html) {
    return new Response(JSON.stringify({ error: "AI did not return HTML" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filePath = `menus/${slug}.html`;
  const commitMessage = `Add AI menu for ${bizName}`;
  const githubUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  // Check if the file already exists to include its SHA for updates.
  let existingSha;
  const existingResponse = await fetch(`${githubUrl}?ref=${GITHUB_BRANCH}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "audit-dashboard",
    },
  });
  if (existingResponse.ok) {
    const existingData = await existingResponse.json();
    existingSha = existingData.sha;
  }

  // Create or update the file in GitHub.
  const githubResponse = await fetch(githubUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "audit-dashboard",
    },
    body: JSON.stringify({
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(html))),
      branch: GITHUB_BRANCH,
      sha: existingSha,
    }),
  });

  if (!githubResponse.ok) {
    const errorText = await githubResponse.text();
    return new Response(JSON.stringify({ error: "GitHub save failed", details: errorText }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const menuUrl = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${filePath}`;

  return new Response(
    JSON.stringify({
      menuUrl,
      businessName: parsed.businessName || bizName,
      tagline: parsed.tagline || "",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
