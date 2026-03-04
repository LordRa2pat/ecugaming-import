'use strict';
// Try multiple Apple CDN key variants to find working ones
const https = require('https');

function check(url) {
  return new Promise(resolve => {
    const p = new URL(url);
    const req = https.request({ hostname: p.hostname, path: p.pathname+p.search, method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' }
    }, res => { resolve(res.statusCode); req.destroy(); });
    req.setTimeout(5000, () => { req.destroy(); resolve(0); });
    req.on('error', () => resolve(0));
    req.end();
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const BASE = 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/';

async function tryAll(label, keys) {
  console.log(`\n${label}:`);
  for (const key of keys) {
    const url = BASE + key;
    const s = await check(url);
    if (s === 200 || s === 301 || s === 302) console.log(`  ✅ ${s} ${key}`);
    else console.log(`  ❌ ${s} ${key}`);
    await sleep(300);
  }
}

(async () => {
  await tryAll('iPhone 14 Plus Red', [
    'iphone-14-plus-finish-select-202209-6-7inch-red?wid=940&hei=1112&fmt=png-alpha',
    'iphone-14-plus-finish-select-202209-6-7inch-productred?wid=940&hei=1112&fmt=png-alpha',
    'iphone-14-plus-finish-select-202209-6-7inch-product-red?wid=940&hei=1112&fmt=png-alpha',
    'iphone-14-plus-product-red-select-202209?wid=940&hei=1112&fmt=png-alpha',
    'iphone-14-plus-finish-select-202212-6-7inch-product-red?wid=2560&hei=1440&fmt=p-jpg',
  ]);

  await tryAll('iPhone SE 3rd Gen', [
    'iphone-se-finish-select-202203-midnight?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-3rd-gen-2022-midnight-select?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-finish-select-202203-midnight_AV2?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-3gen-2022-midnight?wid=940&hei=1112&fmt=png-alpha',
    'SE-2022-select?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-3rd-gen-select-202203-midnight?wid=940&hei=1112&fmt=png-alpha',
    'iphone-se-3-finish-select-202203-midnight?wid=940&hei=1112&fmt=png-alpha',
  ]);

  await tryAll('iPhone 17 Pro Max', [
    'iphone-17-pro-finish-select-202509-6-9inch-blacktitanium?wid=2560&hei=1440&fmt=p-jpg',
    'iphone-17-pro-max-finish-select-202509-6-9inch-blacktitanium?wid=2560&hei=1440&fmt=p-jpg',
    'iphone-17-pro-finish-select-202509-6-9inch-naturaltitanium?wid=2560&hei=1440&fmt=p-jpg',
    'iphone-17-pro-model-unselect-gallery-2-202509?wid=2560&hei=1440&fmt=p-jpg',
  ]);
})();
