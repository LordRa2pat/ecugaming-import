'use strict';
require('dotenv').config();
require('dotenv').config({ path: '.env.prod', override: false });
const https = require('https');
const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/[\r\n]/g, '');
const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/[\r\n]/g, '');

function sbGet(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(SB_URL + '/rest/v1' + path);
    https.get({ hostname: u.hostname, path: u.pathname + u.search,
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(JSON.parse(d))); }).on('error', reject);
  });
}

(async () => {
  const prods = await sbGet('/products?select=id,name,categories(name)&is_active=eq.true&limit=500');
  const imgs  = await sbGet('/product_images?select=product_id,storage_path&limit=1000');
  const imgMap = {};
  for (const i of imgs) imgMap[i.product_id] = i.storage_path;

  // Show iPhone + Console products and their image URLs
  const cats = ['iPhone', 'Consolas'];
  console.log('iPhone & Consolas — stored image URLs:\n');
  for (const p of prods) {
    const cat = p.categories && p.categories.name;
    if (!cats.some(c => cat && cat.includes(c))) continue;
    const url = imgMap[p.id] || '(no image)';
    console.log(`[${cat}] ${p.name}`);
    console.log(`  → ${url.slice(0, 100)}`);
    console.log();
  }
})().catch(console.error);
