# সংবাদসংক্ষেপ

প্রথম আলোকে একমাত্র প্রাথমিক সংবাদ উৎস ধরে তৈরি করা হালকা, মোবাইল-উপযোগী headline-link dashboard।

## বর্তমান বৈশিষ্ট্য
- প্রথম আলোর RSS feed থেকে শিরোনাম, প্রকাশের সময় ও মূল প্রতিবেদনের লিংক সংগ্রহ
- শিরোনামভিত্তিক স্বয়ংক্রিয় বিভাগ
- বিভাগ ফিল্টার, refresh, browser local cache\n- একই ব্রাউজারে সর্বোচ্চ ৩০ দিনের/৫০০টি শিরোনামের স্থানীয় archive
- Vercel serverless API route; feed parsing browser-এর বদলে server-এ
- কোনো তৃতীয় পক্ষের RSS converter বা client-side secret নেই

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- এটি **পূর্ণ প্রতিবেদন বা ৬–৭ লাইনের AI সারাংশ প্রকাশ করে না**। প্রথম আলোর ব্যবহারের শর্তে কনটেন্ট পরিবর্তন/পুনঃপ্রকাশে সীমাবদ্ধতা আছে। তাই এই সংস্করণে কেবল শিরোনাম, তারিখ ও মূল প্রতিবেদনের লিংক দেখানো হয়। পূর্ণ খবর প্রথম আলোর সাইটেই পড়তে হবে।
- RSS endpoint `https://www.prothomalo.com/feed/`। প্রথম আলো feed পরিবর্তন/বন্ধ করলে API-তে নতুন খবর আসবে না।
- Archive browser localStorage-এ সীমিত (সর্বোচ্চ ৩০ দিন/৫০০টি শিরোনাম); এটি কেন্দ্রীয়, সব ডিভাইসে দেখা যায় এমন database archive নয়। ব্রাউজারের data মুছে ফেললে archive-ও মুছে যাবে।
- Production deployment-এর আগে RSS feed-এর বর্তমান availability ও ব্যবহারের অনুমতি যাচাই করুন।

## Local run
Node.js 20+ প্রয়োজন।

```bash
npm install
npm run dev
```

Vite dev server `/api/news` serverless function চালায় না। পূর্ণ local test-এর জন্য Vercel CLI ব্যবহার করুন:

```bash
npm install -g vercel
vercel dev
```

## Vercel deployment
1. ZIP extract করে GitHub repository-তে push করুন।
2. Vercel → Add New → Project → repository import করুন।
3. Framework preset: Vite (অথবা Other); build command `npm run build`; output directory `dist`।
4. Deploy চাপুন।
5. deployment URL-এ `/api/news` খুলে JSON response যাচাই করুন; তারপর homepage পরীক্ষা করুন।

Vercel Git deployment guide: https://vercel.com/docs/git

## Source attribution
প্রথম আলো: https://www.prothomalo.com/
Feed URL: https://www.prothomalo.com/feed/
