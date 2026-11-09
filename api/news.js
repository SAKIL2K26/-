// Vercel serverless function: fetch headline metadata and archive it in Supabase.
// Only headline metadata and canonical links are stored; article bodies are not scraped.
const FEEDS = ["https://www.prothomalo.com/feed/"];

function decode(s = "") {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}
function tag(xml, name) {
  const re = new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + ">", "i");
  return (xml.match(re) || [])[1] || "";
}
function categoryOf(item) {
  const t = (item.title || "").toLowerCase();
  if (/খেলা|ক্রিকেট|ফুটবল|টেনিস|sports|cricket|football/.test(t)) return "খেলাধুলা";
  if (/অর্থ|ব্যাংক|শেয়ার|বাজেট|বাণিজ্য|business|econom/.test(t)) return "অর্থনীতি";
  if (/রাজনীতি|নির্বাচন|সংসদ|দলীয়|politic/.test(t)) return "রাজনীতি";
  if (/বিশ্ব|যুক্তরাষ্ট্র|ভারত|চীন|যুদ্ধ|ইরান|ইসরায়েল|আন্তর্জাতিক|world|international/.test(t)) return "আন্তর্জাতিক";
  if (/প্রযুক্তি|বিজ্ঞান|কৃত্রিম বুদ্ধিমত্তা|technology|science/.test(t)) return "প্রযুক্তি";
  if (/বাংলাদেশ|ঢাকা|সরকার|আদালত|পুলিশ|জাতীয়/.test(t)) return "জাতীয়";
  return "অন্যান্য";
}
function parse(xml) {
  const chunks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return chunks.map(x => {
    const title = decode(tag(x, "title"));
    const linkTag = x.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
    const link = decode(tag(x, "link")) || (linkTag ? linkTag[1] : "");
    const url = link || ((x.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || "").trim();
    const date = decode(tag(x, "pubDate") || tag(x, "published") || tag(x, "updated"));
    return { title, url, date, source: "প্রথম আলো", category: categoryOf({ title }) };
  }).filter(x => x.title && /^https:\/\/www\.prothomalo\.com\//.test(x.url));
}
async function archiveInSupabase(items) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return { ok: false, reason: "Supabase environment variables are missing" };
  const rows = items.map(item => ({
    url: item.url,
    title: item.title,
    source: item.source,
    category: item.category,
    published_at: item.date && !Number.isNaN(Date.parse(item.date)) ? new Date(item.date).toISOString() : null
  }));
  const response = await fetch(base.replace(/\/$/, "") + "/rest/v1/news_archive?on_conflict=url", {
    method: "POST",
    headers: {
      "apikey": key,
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Supabase archive failed (" + response.status + "): " + detail.slice(0, 300));
  }
  return { ok: true };
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  let lastError;
  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed, {
        headers: {
          "User-Agent": "SongbadShongkhep/1.0 (headline links; personal non-commercial use)",
          "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"
        }
      });
      if (!response.ok) throw new Error("Feed returned " + response.status);
      const items = parse(await response.text()).slice(0, 60);
      if (!items.length) throw new Error("Feed format or items unavailable");
      let cloudArchive = { ok: false };
      try { cloudArchive = await archiveInSupabase(items); }
      catch (error) { cloudArchive = { ok: false, reason: error.message }; }
      return res.status(200).json({
        source: "প্রথম আলো",
        fetchedAt: new Date().toISOString(),
        items,
        cloudArchived: cloudArchive.ok,
        archiveWarning: cloudArchive.ok ? null : cloudArchive.reason
      });
    } catch (error) { lastError = error; }
  }
  return res.status(502).json({ error: "Primary source unavailable", detail: lastError ? lastError.message : "Unknown error" });
}
