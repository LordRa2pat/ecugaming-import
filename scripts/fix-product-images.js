'use strict';
/**
 * fix-product-images.js
 * Updates broken/wrong image URLs for iPhones and Consolas in Supabase product_images
 * Usage: node scripts/fix-product-images.js [--dry-run]
 */
require('dotenv').config();
require('dotenv').config({ path: '.env.prod', override: false });
const https = require('https');

const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/[\r\n]/g, '');
const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/[\r\n]/g, '');
const DRY = process.argv.includes('--dry-run');

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
      headers: { apikey: SB_KEY, Authorization: 'Bearer '+SB_KEY, 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(bs) }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(r.statusCode)); });
    req.on('error', reject);
    req.write(bs); req.end();
  });
}

// ── MASTER IMAGE MAP — keyword (lowercase) → best image URL ──────────────────
// Rules: first matching keyword wins. More specific keywords first.
const IMAGE_MAP = [
  // ── iPHONE 17 ────────────────────────────────────────────────────────────────
  ['iphone 17 pro max', 'https://www.apple.com/newsroom/images/2025/09/apple-debuts-iphone-17-pro-and-iphone-17-pro-max/article/Apple-iPhone-17-Pro-and-iPhone-17-Pro-Max-hero-250909.jpg.news_app_ed.jpg'],

  // ── iPHONE 16 PRO ────────────────────────────────────────────────────────────
  ['iphone 16 pro max 512', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-desertTitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80'],
  ['iphone 16 pro max 256 titanio negro', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-blackTitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80'],
  ['iphone 16 pro max', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-blackTitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80'],
  ['iphone 16 pro 128', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80'],
  ['iphone 16 pro 256', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-whitetitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80'],
  ['iphone 16 pro', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80'],

  // ── iPHONE 16 ────────────────────────────────────────────────────────────────
  ['iphone 16 plus 256', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-black?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 16 plus 128 ultramarino', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-ultramarine?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 16 plus', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-black?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 16 256 rosa', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-pink?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 16 128 blanco', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-white?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 16 128 negro', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-black?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 16', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-black?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],

  // ── iPHONE 15 PRO ────────────────────────────────────────────────────────────
  ['iphone 15 pro max 256 titanio azul', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-bluetitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15 pro max', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15 pro 256 titanio negro', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-blacktitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15 pro 128', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15 pro', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],

  // ── iPHONE 15 ────────────────────────────────────────────────────────────────
  ['iphone 15 plus 128 verde', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-7inch-green?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15 plus', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-7inch-green?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15 256 azul', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-blue?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15 128 rosa', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-pink?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 15', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-pink?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],

  // ── iPHONE 14 ────────────────────────────────────────────────────────────────
  ['iphone 14 plus 128 rojo', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-plus-finish-select-202209-6-7inch-product-red?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 14 plus', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-plus-finish-select-202209-6-7inch-product-red?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 14 pro max', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-7inch-deeppurple?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 14 256 azul', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-blue?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 14 128 medianoche', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-midnight?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],
  ['iphone 14', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-midnight?wid=5120&hei=2880&fmt=p-jpg&qlt=80'],

  // ── iPHONE 13 ────────────────────────────────────────────────────────────────
  ['iphone 13 pro max 256', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-family-hero?wid=800&hei=1000&fmt=jpeg&qlt=90'],
  ['iphone 13 pro max', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-family-hero?wid=800&hei=1000&fmt=jpeg&qlt=90'],
  ['iphone 13 pro', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-family-hero?wid=800&hei=1000&fmt=jpeg&qlt=90'],
  ['iphone 13 mini', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-mini-blue-select-2021?wid=940&hei=1112&fmt=png-alpha&qlt=80'],
  ['iphone 13', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-blue-select-2021?wid=940&hei=1112&fmt=png-alpha&qlt=80'],

  // ── iPHONE SE ────────────────────────────────────────────────────────────────
  ['iphone se', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-midnight_AV1?wid=940&hei=1112&fmt=png-alpha&qlt=80'],

  // ── CONSOLAS PS5 ─────────────────────────────────────────────────────────────
  ['playstation 5 pro', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5pro-product-thumbnail-01-en-06sep24?$native$'],
  ['playstation 5 slim disc + god of war', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-hero-01-en-14sep23?$native$'],
  ['playstation 5 slim disc + marvel', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-hero-01-en-14sep23?$native$'],
  ['playstation 5 slim - edición digital', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-digital-slim-product-thumbnail-01-en-14sep23?$native$'],
  ['playstation 5 slim - edición disco', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-product-thumbnail-01-en-14sep23?$native$'],
  ['playstation 5 slim disc', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-product-thumbnail-01-en-14sep23?$native$'],
  ['playstation 5 slim', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-product-thumbnail-01-en-14sep23?$native$'],
  ['playstation 5', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-product-thumbnail-01-en-14sep23?$native$'],

  // ── CONSOLAS PS4 ─────────────────────────────────────────────────────────────
  ['playstation 4 pro', 'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-product-thumbnail-01-en-14sep21?$native$'],

  // ── DUALSENSE ────────────────────────────────────────────────────────────────
  ['dualsense edge', 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-edge-product-thumbnail-01-en-13jan23?$native$'],
  ['dualsense charging station', 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-charging-station-product-thumbnail-01-en-12nov20?$native$'],
  ['dualsense wireless controller - midnight black', 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-midnight-black-product-thumbnail-01-en-29jun22?$native$'],
  ['dualsense wireless controller - cosmic red', 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-cosmic-red-product-thumbnail-01-en-29jun22?$native$'],
  ['dualsense wireless controller - galactic purple', 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-galactic-purple-product-thumbnail-01-en-29jun22?$native$'],
  ['dualsense wireless controller - nova pink', 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-nova-pink-product-thumbnail-01-en-29jun22?$native$'],
  ['dualsense', 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-white-front-01-en-26nov20?$native$'],

  // ── PS5 ACCESORIOS ───────────────────────────────────────────────────────────
  ['pulse 3d wireless headset - midnight black', 'https://gmedia.playstation.com/is/image/SIEPDC/pulse3d-wireless-headset-midnight-black-product-thumbnail-01-en-29jun22?$native$'],
  ['pulse 3d wireless headset', 'https://gmedia.playstation.com/is/image/SIEPDC/pulse3d-wireless-headset-product-thumbnail-02-en-12nov20?$native$'],
  ['playstation portal', 'https://gmedia.playstation.com/is/image/SIEPDC/playstation-portal-remote-player-hero-01-en-05sep23?$native$'],
  ['ps5 hd camera', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-hd-camera-product-thumbnail-01-en-12nov20?$native$'],
  ['ps5 media remote', 'https://gmedia.playstation.com/is/image/SIEPDC/media-remote-product-thumbnail-01-en-12nov20?$native$'],
  ['playstation vr2', 'https://gmedia.playstation.com/is/image/SIEPDC/ps-vr2-product-thumbnail-01-en-16nov22?$native$'],
  ['ps5 ssd', 'https://m.media-amazon.com/images/I/71FWNgm8KHL._AC_SL1500_.jpg'],
  ['funda para ps5 slim', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-cover-carbon-black-product-thumbnail-01-en-13jun23?$native$'],
  ['ps5 slim console cover', 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-deep-earth-collection-console-cover-and-dualsense-group-product-thumbnail-01-en-13sep23?$native$'],

  // ── CONSOLAS XBOX ─────────────────────────────────────────────────────────────
  ['xbox series x - edición especial galaxy black', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4VLZV?ver=fa1f&q=90&m=6&h=705&w=1253&b=%23FFFFFFFF&f=jpg&o=f&p=140&aim=true'],
  ['xbox series x', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4mRni?ver=f059&q=90&m=6&h=705&w=1253&b=%23FFFFFFFF&f=jpg&o=f&aim=true'],
  ['xbox series s 1tb', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE563bH?ver=a1bd&q=90&m=6&h=705&w=1253&b=%23FFFFFFFF&f=jpg&o=f&aim=true'],
  ['xbox series s', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4mRnk?ver=17e3&q=90&m=6&h=705&w=1253&b=%23FFFFFFFF&f=jpg&o=f&aim=true'],
  ['xbox one x', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1zGNm?ver=5db0&q=90&m=6&h=705&w=1253&b=%23FFFFFFFF&f=jpg&o=f&aim=true'],
  ['xbox wireless controller - carbon black', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4NHH1?ver=6ab9&q=90&m=6&h=705&w=1253&b=%23FFFFFFFF&f=jpg&o=f&aim=true'],

  // ── CONSOLAS NINTENDO ─────────────────────────────────────────────────────────
  ['nintendo switch oled - edición splatoon', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-splatoon-3-edition/gallery/image01'],
  ['nintendo switch oled - edición blanca', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-white-set/gallery/image01'],
  ['nintendo switch oled', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-white-set/gallery/image01'],
  ['nintendo switch lite - coral', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-lite-coral/gallery/image01'],
  ['nintendo switch lite - turquesa', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-lite-turquoise/gallery/image01'],
  ['nintendo switch lite', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-lite-turquoise/gallery/image01'],
  ['nintendo switch v2', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-neon-blue-neon-red-joy-con/gallery/image01'],
  ['nintendo switch (v2)', 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-neon-blue-neon-red-joy-con/gallery/image01'],
  ['nintendo 3ds xl', 'https://www.nintendo.com/content/dam/noa/en_US/hardware/3DS/nintendo-3ds-xl-red-black.jpg'],

  // ── STEAM DECK ────────────────────────────────────────────────────────────────
  ['steam deck oled 1tb', 'https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg'],
  ['steam deck oled 512', 'https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg'],
  ['steam deck', 'https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg'],

  // ── RETRO ─────────────────────────────────────────────────────────────────────
  ['retro console', 'https://m.media-amazon.com/images/I/71KD3soxGPL._AC_SL1500_.jpg'],
  ['game boy advance sp', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/GBA-SP-SilverPearl.jpg/480px-GBA-SP-SilverPearl.jpg'],
  ['playstation vita', 'https://gmedia.playstation.com/is/image/SIEPDC/psvita-product-thumbnail-01-eu-14sep21?$native$'],
  ['sega genesis mini', 'https://m.media-amazon.com/images/I/71g3TobNqCL._AC_SL1500_.jpg'],
];

function findImage(name) {
  const n = name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [keyword, url] of IMAGE_MAP) {
    if (n.includes(keyword)) return url;
  }
  return null;
}

(async () => {
  console.log(`\n🖼️  Product Image Fixer ${DRY ? '(DRY RUN)' : '(LIVE)'}\n`);

  const prods = await sbGet('/products?select=id,name,categories(name)&is_active=eq.true&limit=500');
  const imgs  = await sbGet('/product_images?select=id,product_id,storage_path&limit=1000');
  const imgMap = {};
  for (const i of imgs) imgMap[i.product_id] = { id: i.id, url: i.storage_path };

  let updated = 0, skipped = 0, notFound = 0;

  for (const p of prods) {
    const cat = p.categories && p.categories.name || '';
    if (!cat.includes('iPhone') && !cat.includes('Consola')) continue;

    const newUrl = findImage(p.name);
    if (!newUrl) {
      console.log(`  ⚠️  No mapping: ${p.name}`);
      notFound++;
      continue;
    }

    const existing = imgMap[p.id];
    if (existing && existing.url === newUrl) {
      skipped++;
      continue;
    }

    console.log(`  ${DRY ? '🔍' : '✅'} ${p.name.slice(0, 55)}`);
    if (!DRY && existing) {
      await sbPatch(`/product_images?id=eq.${existing.id}`, { storage_path: newUrl });
    }
    updated++;
  }

  console.log(`\n📊 Done: ${updated} updated, ${skipped} already correct, ${notFound} no mapping found`);
})().catch(console.error);
