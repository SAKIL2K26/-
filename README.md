# সংবাদসংক্ষেপ

প্রথম আলোকে প্রধান সংবাদ উৎস ধরে তৈরি মোবাইল-উপযোগী headline-link dashboard।

## বৈশিষ্ট্য
- প্রথম আলোর RSS feed থেকে শিরোনাম, প্রকাশের সময় ও মূল প্রতিবেদনের লিংক সংগ্রহ
- স্বয়ংক্রিয় বিভাগ, বিভাগ ফিল্টার ও refresh
- Supabase-এ কেন্দ্রীয় Cloud Archive; একই আর্কাইভ বিভিন্ন ডিভাইসে দেখা যায়
- Vercel Cron দিয়ে প্রতিদিন বাংলাদেশ সময় সকাল ৬টায় RSS সংগ্রহ ও আর্কাইভ আপডেট
- Browser local cache, যাতে নেটওয়ার্ক সমস্যা হলেও আগে দেখা শিরোনাম পাওয়া যায়

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- সাইটটি পূর্ণ প্রতিবেদন scrape বা republish করে না; শিরোনাম ও মূল প্রতিবেদনের লিংক দেখায়।
- RSS feed-এ যতটুকু metadata পাওয়া যায়, শুধু সেটুকুই সংরক্ষিত হয়।
- ৬–৭ লাইনের AI summary এখনো তৈরি হয় না; summary field ভবিষ্যৎ ব্যবহারের জন্য রাখা হয়েছে।
- Cloud archive চালু রাখতে Vercel-এ SUPABASE_URL এবং SUPABASE_SECRET_KEY environment variables থাকতে হবে। Secret key শুধু server-side function-এ ব্যবহৃত হয়; browser code-এ রাখা হয় না।
- Supabase table: public.news_archive; url কলামে UNIQUE constraint থাকতে হবে।

## Vercel deployment
GitHub-এর main branch-এ commit push হলে Vercel project connected থাকলে deploy শুরু হবে। Deployment শেষে /api/news ও /api/archive পরীক্ষা করুন।
