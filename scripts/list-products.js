const fs = require('fs');
// Load .env.prod manually
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = key => { const m = prod.match(new RegExp(key + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const SUPABASE_URL = get('SUPABASE_URL');
const SUPABASE_KEY = get('SUPABASE_SERVICE_KEY');

const https = require('https');
const url = new URL(`${SUPABASE_URL}/rest/v1/products?select=id,name,category_id,price&order=category_id,name`);
const opts = { hostname: url.hostname, path: url.pathname + url.search, headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } };
https.get(opts, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const products = JSON.parse(d);
    console.log('Raw:', d.slice(0,200));
    if (!Array.isArray(products)) return;
    products.forEach(p => console.log(`${(p.category||'').padEnd(20)} $${String(p.price).padEnd(8)} ${p.name}`));
  });
});
