'use strict';
const https = require('https');
function check(url) {
  return new Promise(resolve => {
    const p = new URL(url);
    const req = https.request({ hostname: p.hostname, path: p.pathname+p.search, method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, res => { resolve(res.statusCode); req.destroy(); });
    req.setTimeout(5000, () => { req.destroy(); resolve(0); });
    req.on('error', () => resolve(0)); req.end();
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const BASE = 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/';

async function tryAll(label, keys) {
  console.log(`\n${label}:`);
  for (const key of keys) {
    const url = BASE + key;
    const s = await check(url);
    const ok = s === 200 || s === 206 || s === 301 || s === 302;
    console.log(`  ${ok?'✅':'❌'} ${s} ${key.slice(0,80)}`);
    await sleep(300);
  }
}

(async () => {
  await tryAll('iPhone 14 Plus (gallery/model variants)', [
    'iphone-14-plus-model-unselect-gallery-2-202209?wid=2560&hei=1440&fmt=p-jpg',
    'iphone-14-plus-model-gallery1-202209-6-7inch?wid=2560&hei=1440&fmt=p-jpg',
    'iphone-14-plus-hero-product-red-202209?wid=940&hei=1112&fmt=png-alpha',
    'iphone-14-model-unselect-gallery-2-202209?wid=2560&hei=1440&fmt=p-jpg',
    'iphone-14-finish-select-202209-6-1inch-product-red?wid=940&hei=1112&fmt=png-alpha',
    'iphone-14-finish-select-202209-6-1inch-red?wid=940&hei=1112&fmt=png-alpha',
  ]);
  await tryAll('iPhone SE 3rd gen (gallery/model variants)', [
    'iphone-se-model-unselect-gallery-2-202203?wid=2560&hei=1440&fmt=p-jpg',
    'iphone-se-select-2022?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-hero-202203?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-3rd-hero?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-3-gen-2022?wid=940&hei=1112&fmt=png-alpha',
  ]);
})();
