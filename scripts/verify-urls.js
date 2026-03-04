'use strict';
/**
 * Tests every image URL currently stored in product_images for iPhones & Consolas
 * Reports: OK (2xx), REDIRECT (3xx), BROKEN (4xx/5xx/timeout)
 */
require('dotenv').config();
require('dotenv').config({ path: '.env.prod', override: false });
const https = require('https');
const http  = require('http');

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

function checkUrl(url) {
  return new Promise(resolve => {
    try {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, res => {
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
      });
      req.setTimeout(6000, () => { req.destroy(); resolve({ status: 'TIMEOUT', ok: false }); });
      req.on('error', () => resolve({ status: 'ERROR', ok: false }));
      req.end();
    } catch(e) { resolve({ status: 'INVALID', ok: false }); }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const prods = await sbGet('/products?select=id,name,categories(name)&is_active=eq.true&limit=500');
  const imgs  = await sbGet('/product_images?select=product_id,storage_path&limit=1000');
  const imgMap = {};
  for (const i of imgs) imgMap[i.product_id] = i.storage_path;

  const targets = prods.filter(p => {
    const cat = p.categories && p.categories.name || '';
    return cat.includes('iPhone') || cat.includes('Consola');
  });

  console.log(`\nChecking ${targets.length} iPhone + Console products...\n`);
  let broken = 0, ok = 0;

  for (const p of targets) {
    const url = imgMap[p.id];
    if (!url) { console.log(`  ⚠️  NO IMG  | ${p.name}`); broken++; continue; }
    const { status, ok: isOk } = await checkUrl(url);
    if (isOk) {
      ok++;
    } else {
      console.log(`  ❌ ${status}     | ${p.name}`);
      console.log(`            ${url.slice(0,90)}`);
      broken++;
    }
    await sleep(100);
  }

  console.log(`\n✅ OK: ${ok}   ❌ Broken: ${broken}`);
})().catch(console.error);
