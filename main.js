const $ = (s) => document.querySelector(s);
let allNews = [], archiveNews = [], current = "সব", archiveMode = false, cloudAvailable = false;
const CACHE_KEY = "songbadshongkhep_cache_v2";
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function categoryOf(item) {
  if (item.category) return item.category;
  const t = `${item.title || ""}`.toLowerCase();
  if (/খেলা|ক্রিকেট|ফুটবল|টেনিস|sports|cricket|football/.test(t)) return "খেলাধুলা";
  if (/অর্থ|ব্যাংক|শেয়ার|বাজেট|বাণিজ্য|business|econom/.test(t)) return "অর্থনীতি";
  if (/রাজনীতি|নির্বাচন|সংসদ|দলীয়|politic/.test(t)) return "রাজনীতি";
  if (/বিশ্ব|যুক্তরাষ্ট্র|ভারত|চীন|যুদ্ধ|ইরান|ইসরায়েল|আন্তর্জাতিক|world|international/.test(t)) return "আন্তর্জাতিক";
  if (/প্রযুক্তি|বিজ্ঞান|কৃত্রিম বুদ্ধিমত্তা|technology|science/.test(t)) return "প্রযুক্তি";
  if (/বাংলাদেশ|ঢাকা|সরকার|আদালত|পুলিশ|জাতীয়/.test(t)) return "জাতীয়";
  return "অন্যান্য";
}
function dateLabel(value) {
  if (!value) return "সময় উল্লেখ নেই";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "সময় উল্লেখ নেই";
  return new Intl.DateTimeFormat("bn-BD", {day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}).format(d);
}
function render() {
  const source = archiveMode ? archiveNews : allNews;
  const filtered = current === "সব" ? source : source.filter(n => n.category === current);
  $("#archiveToggle").classList.toggle("active", archiveMode);
  $("#archiveToggle").textContent = archiveMode ? "সর্বশেষ খবর" : `আর্কাইভ (${archiveNews.length})`;
  $("#news").innerHTML = filtered.length ? filtered.map(n => `<article class="item"><div class="item-head"><span class="category">${escapeHtml(n.category || categoryOf(n))}</span><span class="meta">${escapeHtml(n.source || "প্রথম আলো")} · ${escapeHtml(dateLabel(n.published_at || n.date))}</span></div><h3>${escapeHtml(n.title)}</h3>${n.summary ? `<p class="summary">${escapeHtml(n.summary)}</p>` : ""}<a href="${escapeHtml(n.url)}" target="_blank" rel="noopener noreferrer">মূল প্রতিবেদন পড়ুন ↗</a></article>`).join("") : `<div class="empty">এই বিভাগে এখন কোনো সংবাদ পাওয়া যায়নি।</div>`;
}
function useCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (c) { allNews = c.items || []; archiveNews = c.archive || []; render(); if (c.savedAt) $("#updated").textContent = `সর্বশেষ সংরক্ষিত: ${dateLabel(c.savedAt)}`; }
  } catch {}
}
async function loadCloudArchive() {
  try {
    const r = await fetch("/api/archive", {cache:"no-store"});
    if (!r.ok) throw new Error("Cloud archive unavailable");
    const data = await r.json();
    if (!Array.isArray(data.items)) throw new Error("Invalid archive response");
    archiveNews = data.items.map(n => ({...n, date:n.published_at, category:n.category || categoryOf(n)}));
    cloudAvailable = true;
    localStorage.setItem(CACHE_KEY, JSON.stringify({items:allNews, archive:archiveNews, savedAt:new Date().toISOString()}));
    render();
    return true;
  } catch { cloudAvailable = false; return false; }
}
async function refresh() {
  $("#status").textContent = "প্রথম আলোর সংবাদ খোঁজা হচ্ছে…";
  $("#refresh").disabled = true;
  try {
    const r = await fetch("/api/news", {cache:"no-store"});
    if (!r.ok) throw new Error("সংবাদ সার্ভার সাড়া দেয়নি");
    const data = await r.json();
    if (!Array.isArray(data.items)) throw new Error("সংবাদের তথ্য পাওয়া যায়নি");
    allNews = data.items.map(x => ({...x, category:x.category || categoryOf(x)}));
    const cloudLoaded = await loadCloudArchive();
    if (!cloudLoaded) {
      const seen = new Map(archiveNews.map(x => [x.url, x]));
      for (const item of allNews) seen.set(item.url, item);
      const cutoff = Date.now() - 30*24*60*60*1000;
      archiveNews = [...seen.values()].filter(x => !x.date || Number.isNaN(new Date(x.date).getTime()) || new Date(x.date).getTime() >= cutoff)
        .sort((a,b) => new Date(b.published_at || b.date || 0) - new Date(a.published_at || a.date || 0)).slice(0,500);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify({items:allNews, archive:archiveNews, savedAt:new Date().toISOString()}));
    render();
    $("#updated").textContent = `সর্বশেষ আপডেট: ${dateLabel(data.fetchedAt)}`;
    $("#status").textContent = `${allNews.length}টি শিরোনাম · উৎস: প্রথম আলো · ${data.cloudArchived ? "Cloud Archive সংরক্ষিত" : (cloudAvailable ? "Cloud Archive যুক্ত" : "স্থানীয় ক্যাশ")}`;
  } catch (e) {
    $("#status").textContent = "নতুন খবর আনা যায়নি। সংরক্ষিত খবর দেখানো হচ্ছে; ইন্টারনেট থাকলে আবার চেষ্টা করুন।";
    if (!allNews.length) $("#news").innerHTML = `<div class="empty">${escapeHtml(e.message)}। কিছুক্ষণ পর আবার চেষ্টা করুন।</div>`;
  } finally { $("#refresh").disabled = false; }
}
$("#filters").addEventListener("click", e => {
  const b = e.target.closest("button[data-category]");
  if (!b) return;
  current = b.dataset.category;
  $("#filters").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
  render();
});
$("#refresh").addEventListener("click", refresh);
$("#archiveToggle").addEventListener("click", async () => {
  archiveMode = !archiveMode;
  if (archiveMode) await loadCloudArchive();
  $("#status").textContent = archiveMode ? (cloudAvailable ? "সব ডিভাইসে ব্যবহারযোগ্য Cloud Archive" : "এই ব্রাউজারে সংরক্ষিত আর্কাইভ") : "সর্বশেষ সংবাদ";
  render();
});
useCache();
loadCloudArchive().finally(refresh);
