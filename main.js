const $ = (s) => document.querySelector(s);
let allNews = [], archiveNews = [], current = "সব", archiveMode = false;
const CACHE_KEY = "songbadshongkhep_cache_v1";
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function categoryOf(item) {
  const t = `${item.title||""} ${item.category||""}`.toLowerCase();
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
  return new Intl.DateTimeFormat("bn-BD",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}).format(d);
}
function render() {
  const source = archiveMode ? archiveNews : allNews;
  const filtered = current === "সব" ? source : source.filter(n => n.category === current);
  $("#archiveToggle").classList.toggle("active", archiveMode);
  $("#archiveToggle").textContent = archiveMode ? "সর্বশেষ খবর" : `আর্কাইভ (${archiveNews.length})`;
  $("#news").innerHTML = filtered.length ? filtered.map(n => `<article class="item"><div class="item-head"><span class="category">${escapeHtml(n.category)}</span><span class="meta">${escapeHtml(n.source || "প্রথম আলো")} · ${escapeHtml(dateLabel(n.date))}</span></div><h3>${escapeHtml(n.title)}</h3><a href="${escapeHtml(n.url)}" target="_blank" rel="noopener noreferrer">মূল প্রতিবেদন পড়ুন ↗</a></article>`).join("") : `<div class="empty">এই বিভাগে এখন কোনো সংবাদ পাওয়া যায়নি।</div>`;
}
function useCache() {
  try { const c=JSON.parse(localStorage.getItem(CACHE_KEY)||"null"); if(c){allNews=c.items||[];archiveNews=c.archive||allNews;render();if(c.savedAt)$("#updated").textContent=`সর্বশেষ সংরক্ষিত: ${dateLabel(c.savedAt)}`;} } catch {}
}
async function refresh() {
  $("#status").textContent="প্রথম আলোর সংবাদ খোঁজা হচ্ছে…";
  $("#refresh").disabled=true;
  try {
    const r=await fetch("/api/news",{cache:"no-store"});
    if(!r.ok) throw new Error("সংবাদ সার্ভার সাড়া দেয়নি");
    const data=await r.json();
    if(!Array.isArray(data.items)) throw new Error("সংবাদের তথ্য পাওয়া যায়নি");
    allNews=data.items.map(x=>({...x,category:categoryOf(x)}));
    const seen = new Map(archiveNews.map(x=>[x.url,x]));
    for (const item of allNews) seen.set(item.url,item);
    const cutoff = Date.now() - 30*24*60*60*1000;
    archiveNews = [...seen.values()].filter(x=>!x.date || Number.isNaN(new Date(x.date).getTime()) || new Date(x.date).getTime()>=cutoff).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,500);
    localStorage.setItem(CACHE_KEY,JSON.stringify({items:allNews,archive:archiveNews,savedAt:new Date().toISOString()}));
    render();$("#updated").textContent=`সর্বশেষ আপডেট: ${dateLabel(data.fetchedAt)}`;
    $("#status").textContent=`${allNews.length}টি শিরোনাম · উৎস: প্রথম আলো`;
  } catch(e) {
    $("#status").textContent="নতুন খবর আনা যায়নি। সংরক্ষিত খবর দেখানো হচ্ছে; ইন্টারনেট বা সংবাদ উৎস পরে আবার চেষ্টা করুন।";
    if(!allNews.length) $("#news").innerHTML=`<div class="empty">${escapeHtml(e.message)}। কিছুক্ষণ পর আবার চেষ্টা করুন।</div>`;
  } finally { $("#refresh").disabled=false; }
}
$("#filters").addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(!b)return;current=b.dataset.category;$("#filters").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));render();});
$("#refresh").addEventListener("click",refresh);
$("#archiveToggle").addEventListener("click",()=>{archiveMode=!archiveMode;$("#status").textContent=archiveMode?"এই ব্রাউজারে সংরক্ষিত গত ৩০ দিনের সংবাদ":"সর্বশেষ সংবাদ";render();});
useCache();refresh();
