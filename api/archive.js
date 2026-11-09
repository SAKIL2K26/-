// Read the shared cloud archive from Supabase. Keys stay server-side.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const base = process.env.SUPABASE_URL;
  // Accept either configured key name to avoid needless Vercel renaming.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing = [];
  if (!base) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  if (missing.length) return res.status(503).json({ error: "Cloud archive is not configured", missing });
  try {
    const url = new URL("/rest/v1/news_archive", base);
    url.searchParams.set("select", "id,url,title,source,category,published_at,summary,archived_at");
    url.searchParams.set("order", "published_at.desc.nullslast");
    url.searchParams.set("limit", "500");
    const response = await fetch(url, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}: ${(await response.text()).slice(0, 250)}`);
    const rows = await response.json();
    return res.status(200).json({ items: rows, count: rows.length, source: "cloud" });
  } catch (error) {
    return res.status(502).json({ error: "Could not load cloud archive", detail: error.message });
  }
}
