// Vercel serverless function: returns only headline metadata and canonical links.
// Prothom Alo is the sole primary source. No article body is scraped or republished.
const FEEDS = ["https://www.prothomalo.com/feed/"];
function decode(s=""){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\s+/g," ").trim();}
function tag(xml,name){const re=new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,"i");return (xml.match(re)||[])[1]||"";}
function parse(xml){
  const chunks=xml.match(/<item\b[\s\S]*?<\/item>/gi)||xml.match(/<entry\b[\s\S]*?<\/entry>/gi)||[];
  return chunks.map(x=>{
    const title=decode(tag(x,"title"));
    const linkTag=x.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
    const link=decode(tag(x,"link")) || (linkTag?linkTag[1]:"");
    const url=link || ((x.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)||[])[1]||"").trim();
    const date=decode(tag(x,"pubDate")||tag(x,"published")||tag(x,"updated"));
    return {title,url,date,source:"প্রথম আলো"};
  }).filter(x=>x.title&&/^https:\/\/www\.prothomalo\.com\//.test(x.url));
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=900");
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.method!=="GET"){res.status(405).json({error:"Method not allowed"});return;}
  let lastError;
  for(const feed of FEEDS){
    try{
      const response=await fetch(feed,{headers:{"User-Agent":"SongbadShongkhep/1.0 (headline links; personal non-commercial use)","Accept":"application/rss+xml, application/atom+xml, application/xml, text/xml"}});
      if(!response.ok) throw new Error(`Feed returned ${response.status}`);
      const xml=await response.text();
      const items=parse(xml).slice(0,60);
      if(!items.length) throw new Error("Feed format or items unavailable");
      res.status(200).json({source:"প্রথম আলো",fetchedAt:new Date().toISOString(),items});return;
    }catch(e){lastError=e;}
  }
  res.status(502).json({error:"Primary source unavailable",detail:lastError?.message||"Unknown error"});
}
