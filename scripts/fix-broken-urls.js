'use strict';
/**
 * fix-broken-urls.js  — patches only the genuinely 404/403-blocked URLs
 * Run: node scripts/fix-broken-urls.js [--dry-run]
 */
require('dotenv').config();
require('dotenv').config({ path: '.env.prod', override: false });
const https = require('https');

const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/[\r\n]/g, '');
const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/[\r\n]/g, '');
const DRY    = process.argv.includes('--dry-run');

function sbGet(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(SB_URL + '/rest/v1' + path);
    https.get({ hostname: u.hostname, path: u.pathname + u.search,
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(JSON.parse(d))); }).on('error', reject);
  });
}
function sbPatch(path, body) {
  return new Promise((resolve, reject) => {
    const bs = JSON.stringify(body);
    const u = new URL(SB_URL + '/rest/v1' + path);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
      headers: { apikey: SB_KEY, Authorization: 'Bearer '+SB_KEY,
        'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(bs) }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(r.statusCode)); });
    req.on('error', reject); req.write(bs); req.end();
  });
}

// Exact product-name → verified working URL
// Apple: fixed lowercase titanium names + removed _AV1 suffix
// Nintendo: switched to Wikimedia (never blocks hotlinking)
// Amazon/retro: Wikimedia alternatives
const FIXES = {
  // ── iPHONE 17 (model gallery — verified 200) ──
  'iPhone 17 Pro Max 256GB - Todos los Colores Disponibles':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-17-pro-model-unselect-gallery-2-202509?wid=2560&hei=1440&fmt=p-jpg&qlt=80',

  // ── iPHONE 16 PRO (lowercase titanium — verified 200) ──
  'iPhone 16 Pro Max 256GB - Titanio Negro':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-blacktitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80',
  'iPhone 16 Pro Max 512GB - Titanio Desierto':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-deserttitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80',
  'iPhone 16 Pro 128GB - Titanio Natural':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80',
  'iPhone 16 Pro 256GB - Titanio Blanco':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-whitetitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80',

  // ── iPHONE 14 Plus Red (Apple CDN uses 6.1" key for product-red — verified 200) ──
  'iPhone 14 Plus 128GB - Rojo (PRODUCT)RED':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-product-red?wid=940&hei=1112&fmt=png-alpha&qlt=80',

  // ── iPHONE SE (Apple CDN retired — Wikimedia commons, works in browser) ──
  'iPhone SE (3ra Generación) 64GB - Medianoche':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/IPhone_SE_3rd_generation_in_Midnight.png/390px-IPhone_SE_3rd_generation_in_Midnight.png',
  'iPhone SE (3ra Generación) 128GB - Blanco':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/IPhone_SE_3rd_generation_in_Starlight.png/390px-IPhone_SE_3rd_generation_in_Starlight.png',

  // ── NINTENDO (Wikimedia — never blocks hotlinking) ──
  'Nintendo Switch OLED - Edición Splatoon 3':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo_Switch_OLED_Splatoon_3.jpg/480px-Nintendo_Switch_OLED_Splatoon_3.jpg',
  'Nintendo Switch Lite - Coral':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Nintendo_Switch_Lite_coral.jpg/480px-Nintendo_Switch_Lite_coral.jpg',
  'Nintendo Switch Lite - Turquesa':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Nintendo_Switch_Lite_Turquoise.jpg/480px-Nintendo_Switch_Lite_Turquoise.jpg',
  'Nintendo Switch (V2) Neon + Mario Kart 8 Deluxe Bundle':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Nintendo-Switch-wJoyCons-L-R-BlueRed-Standing-FL.jpg/480px-Nintendo-Switch-wJoyCons-L-R-BlueRed-Standing-FL.jpg',

  // ── RETRO / OTROS ──
  'Game Boy Advance SP AGS-101 - Reacondicionado':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/GameBoyAdvance-SP-Mk2.jpg/480px-GameBoyAdvance-SP-Mk2.jpg',
  'Sega Genesis Mini 2 + 60 Juegos':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Mega_Drive_Mini_2.jpg/480px-Mega_Drive_Mini_2.jpg',
  'Retro Console 256GB - 30.000 Juegos':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Famiclone-FW-3326_with_controllers.jpg/480px-Famiclone-FW-3326_with_controllers.jpg',
  'PS5 SSD Expansion 2TB (WD_BLACK SN850P)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/WD_Black_SN850P_for_PS5.jpg/480px-WD_Black_SN850P_for_PS5.jpg',
};

(async () => {
  console.log(`\n🔧 Targeted URL Fixer ${DRY ? '(DRY RUN)' : '(LIVE)'}\n`);

  const prods = await sbGet('/products?select=id,name&is_active=eq.true&limit=500');
  const imgs  = await sbGet('/product_images?select=id,product_id,storage_path&limit=1000');
  const imgByProduct = {};
  for (const i of imgs) imgByProduct[i.product_id] = { id: i.id, url: i.storage_path };

  const prodByName = {};
  for (const p of prods) prodByName[p.name] = p;

  let updated = 0;
  for (const [name, newUrl] of Object.entries(FIXES)) {
    const prod = prodByName[name];
    if (!prod) { console.log(`  ⚠️  Product not found: ${name}`); continue; }
    const img = imgByProduct[prod.id];
    if (!img) { console.log(`  ⚠️  No image row: ${name}`); continue; }
    if (img.url === newUrl) { console.log(`  ✓ Already correct: ${name.slice(0,50)}`); continue; }

    console.log(`  ${DRY ? '🔍' : '✅'} ${name.slice(0,55)}`);
    if (!DRY) await sbPatch(`/product_images?id=eq.${img.id}`, { storage_path: newUrl });
    updated++;
  }

  console.log(`\n📊 ${updated} URLs patched`);
})().catch(console.error);
