'use strict';
require('dotenv').config();
require('dotenv').config({ path: '.env.prod', override: false });
const https = require('https');
const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/[\r\n]/g, '');
const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/[\r\n]/g, '');

function sbGet(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(SB_URL + '/rest/v1' + path);
    https.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY
      }
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

(async () => {
  const imgs = await sbGet('/product_images?select=product_id&limit=1000');
  const imgSet = new Set(imgs.map(i => i.product_id));
  const prods = await sbGet('/products?select=id,name,categories(name)&is_active=eq.true&limit=500');
  const missing = prods.filter(p => !imgSet.has(p.id));
  console.log('TOTAL:', prods.length, '| MISSING:', missing.length);
  console.log('\nMISSING IMAGES:');
  missing.forEach(p => console.log(`  ${(p.categories && p.categories.name) || '?'} | ${p.name} | ${p.id}`));
})().catch(console.error);
