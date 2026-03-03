/**
 * image-enrichment.js
 * Auto-fills product_images table with external URLs.
 * Pass 1: keyword map (instant, free)
 * Pass 2: Google Custom Search for unmatched products
 *
 * Idempotent: only processes products with NO existing images.
 * Run: node scripts/image-enrichment.js
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// ─── Credentials ───────────────────────────────────────────────────────────
const SUPABASE_URL    = 'https://dpomkchvjpdkndkksphy.supabase.co';
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb21rY2h2anBka25ka2tzcGh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ5NDg5OCwiZXhwIjoyMDg4MDcwODk4fQ.ozc20Sicro_jT3aV7Ipsyn6b0s_08pN4zSITlOcA88g';
const GOOGLE_API_KEY  = 'AIzaSyA_PuMotDviY7C7EXaMNnKTZGaUti_mlHk';
const GOOGLE_CX       = '8483c315919cd4ed4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Keyword to Image URL map ────────────────────────────────────────────────
const IMAGE_MAP = {
    // iPhones
    'iphone 11':  'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-purple-select-2019?wid=940&hei=1112&fmt=png-alpha',
    'iphone 12':  'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-purple-select-2021?wid=940&hei=1112&fmt=png-alpha',
    'iphone se':  'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-3rd-gen-select-starlight-2022?wid=940&hei=1112&fmt=png-alpha',
    'iphone 13':  'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-family-select-2021?wid=940&hei=1112&fmt=png-alpha',
    'iphone 14':  'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch?wid=940&hei=1112&fmt=png-alpha',
    'iphone 15':  'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-pink?wid=940&hei=1112&fmt=png-alpha',
    'iphone 16':  'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-black?wid=940&hei=1112&fmt=png-alpha',

    // Retro Consoles
    'n64':            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/N64-Console-Set.png/1200px-N64-Console-Set.png',
    'nes classic':    'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/products/hardware/nes-classic-edition/nes-classic-edition-hero',
    'snes classic':   'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/products/hardware/super-nes-classic-edition/super-nes-classic-edition-hero',
    'gamecube':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/GameCube-Console-Set.png/1200px-GameCube-Console-Set.png',
    'sega genesis':   'https://m.media-amazon.com/images/I/71vYWbYrHDL._AC_SL1500_.jpg',
    'gameboy color':  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/GameBoyColor.png/800px-GameBoyColor.png',
    'game boy color': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/GameBoyColor.png/800px-GameBoyColor.png',

    // Nintendo Switch consoles
    'nintendo switch oled':  'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-white-set/gallery/image01',
    'nintendo switch lite':  'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-lite-yellow/gallery/image01',
    'nintendo switch':       'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-neon-blue-red-joy-con/gallery/image01',
    'playstation 5 slim':    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-front-01-en-23oct23?$native$',
    'playstation 5':         'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-console-group-front-01-en-14sep21?$native$',
    'ps5':                   'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-console-group-front-01-en-14sep21?$native$',
    'ps4 pro':               'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-product-thumbnail-01-en-14sep21?$native$',
    'xbox series x':         'https://cms-assets.xboxservices.com/assets/c7/24/c7247a32-9df9-425b-aba2-de414dcacbbc.png',
    'xbox series s':         'https://cms-assets.xboxservices.com/assets/d5/47/d547d501-a6b7-4d6d-94e5-63aef15ad62e.png',

    // Nintendo Switch Games
    'pokemon scarlet':              'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/p/pokemon-scarlet-switch/boxart/large',
    'pokémon scarlet':              'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/p/pokemon-scarlet-switch/boxart/large',
    'pokemon violet':               'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/p/pokemon-violet-switch/boxart/large',
    'pokémon violet':               'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/p/pokemon-violet-switch/boxart/large',
    'mario kart 8':                 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/m/mario-kart-8-deluxe-switch/boxart/large',
    'mario kart':                   'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/m/mario-kart-8-deluxe-switch/boxart/large',
    'mario bros wonder':            'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/s/super-mario-bros-wonder-switch/boxart/large',
    'super mario bros wonder':      'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/s/super-mario-bros-wonder-switch/boxart/large',
    'splatoon 3':                   'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/s/splatoon-3-switch/boxart/large',
    'metroid dread':                'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/m/metroid-dread-switch/boxart/large',
    'kirby and the forgotten land': 'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/k/kirby-and-the-forgotten-land-switch/boxart/large',
    'kirby':                        'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/k/kirby-and-the-forgotten-land-switch/boxart/large',
    'zelda: tears of the kingdom':  'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/t/the-legend-of-zelda-tears-of-the-kingdom-switch/boxart/large',
    'zelda tears of the kingdom':   'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/t/the-legend-of-zelda-tears-of-the-kingdom-switch/boxart/large',
    'zelda':                        'https://assets.nintendo.com/image/upload/f_auto/q_auto/ncom/en_US/games/switch/t/the-legend-of-zelda-tears-of-the-kingdom-switch/boxart/large',

    // PlayStation Games
    'elden ring':               'https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/phvVT0qZfcRms3nlCyb74ybD.png',
    'god of war ragnarok':      'https://image.api.playstation.com/vulcan/ap/rnd/202207/1013/nRKdMJP0Mblzn7U5VLqhP2xS.png',
    'spider-man 2':             'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/7c06b3c2b40f4ac1a5e35d2e7e9b72bcca6ba7e10e24f08a.png',
    'spider man 2':             'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/7c06b3c2b40f4ac1a5e35d2e7e9b72bcca6ba7e10e24f08a.png',
    'the last of us part i':    'https://image.api.playstation.com/vulcan/ap/rnd/202206/2400/YeKLOaUVjJvCv2ZzQnkfRN5v.png',
    'the last of us':           'https://image.api.playstation.com/vulcan/ap/rnd/202206/2400/YeKLOaUVjJvCv2ZzQnkfRN5v.png',
    'horizon forbidden west':   'https://image.api.playstation.com/vulcan/ap/rnd/202110/1919/CkNhLaYBOz3fzO6sOIzOoGKU.png',
    'gran turismo 7':           'https://image.api.playstation.com/vulcan/ap/rnd/202109/1321/fJA3nIRHnBMlDlRGMDCmIklS.png',
    'ratchet & clank':          'https://image.api.playstation.com/vulcan/img/rnd/202104/2306/p3zVMqpLgFJtNFdRHVGBASun.jpg',
    'ratchet and clank':        'https://image.api.playstation.com/vulcan/img/rnd/202104/2306/p3zVMqpLgFJtNFdRHVGBASun.jpg',
    'returnal':                 'https://image.api.playstation.com/vulcan/ap/rnd/202101/2900/aqCfxJf2MIevI8J14SEiRPvA.png',
    'final fantasy xvi':        'https://image.api.playstation.com/vulcan/ap/rnd/202211/2408/bCHNDIiWNVqL91kF4AHk61H1.png',
    'final fantasy 16':         'https://image.api.playstation.com/vulcan/ap/rnd/202211/2408/bCHNDIiWNVqL91kF4AHk61H1.png',

    // Accessories
    'hyperx cloud ii':           'https://m.media-amazon.com/images/I/71O1EHGpDOL._AC_SL1500_.jpg',
    'hyperx cloud':              'https://m.media-amazon.com/images/I/71O1EHGpDOL._AC_SL1500_.jpg',
    'logitech g502':             'https://resource.logitech.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/g502-x-plus/g502-x-plus-gallery-1.png',
    'razer blackwidow':          'https://assets2.razerzone.com/images/pnx.assets/9e4cff66d1a21cc0f2f1b1dadc14b8d0/razer-blackwidow-v4-pro-og.jpg',
    'mousepad rgb xl':           'https://m.media-amazon.com/images/I/71RFuVFRxuL._AC_SL1500_.jpg',
    'mousepad rgb':              'https://m.media-amazon.com/images/I/71RFuVFRxuL._AC_SL1500_.jpg',
    'xbox wireless controller':  'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4NHMp?ver=e9d0',
    'xbox controller':           'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4NHMp?ver=e9d0',
    'dualsense':                 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-white-front-01-en-26nov20?$native$',

    // PC Hardware
    'nvidia rtx 4090': 'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/ada/rtx-4090/geforce-ada-4090-web-oc-1440px-front-bkg.jpg',
    'rtx 4090':        'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/ada/rtx-4090/geforce-ada-4090-web-oc-1440px-front-bkg.jpg',
    'rtx 4080':        'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/ada/rtx-4080/geforce-ada-4080-web-oc-1440px-front-bkg.jpg',
    'rtx 3070':        'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/ampere/rtx-3070/GeForce-RTX-3070-Shop-600-p@2x.jpg',
    'rtx 3080':        'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/ampere/rtx-3080/GeForce-RTX-3080-Shop-600-p@2x.jpg',
    'samsung 990 pro': 'https://images.samsung.com/is/image/samsung/p6pim/es/mz-v9p2t0bw/gallery/es-990-pro-ssd-mz-v9p2t0bw-536177649?$650_519_PNG$',
    'corsair vengeance':'https://www.corsair.com/medias/sys_master/images/images/h5a/h3f/9125765365790/CMK32GX5M2B5600C36-Gallery-Vengeance-RGB-DDR5-1.jpg',
    'amd ryzen 9 7950x':'https://www.amd.com/system/files/2022-09/677441-amd-ryzen-9-7950x-pib.jpg',
    'ryzen 9 7950x':   'https://www.amd.com/system/files/2022-09/677441-amd-ryzen-9-7950x-pib.jpg',
    'ryzen 7 5800x':   'https://www.amd.com/system/files/2020-10/617691-amd-ryzen-7-5800x-pib.jpg',
    'ryzen 5 5600x':   'https://www.amd.com/system/files/2020-11/617713-amd-ryzen-5-5600x-pib.jpg',
    'intel i9':        'https://www.intel.com/content/dam/products/hero/foreground/bxf80684i913900k-foreground.png',
    'intel i7':        'https://www.intel.com/content/dam/products/hero/foreground/bxf80684i713700k-foreground.png',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(null); }
            });
        }).on('error', reject);
    });
}

async function searchGoogle(productName) {
    const q = encodeURIComponent(`"${productName}" product official`);
    const url = `https://www.googleapis.com/customsearch/v1?q=${q}&searchType=image&imgSize=large&imgType=photo&num=1&cx=${GOOGLE_CX}&key=${GOOGLE_API_KEY}`;
    try {
        const data = await httpsGet(url);
        const link = data?.items?.[0]?.link;
        if (link && link.startsWith('http')) return link;
        if (data?.error) console.error(`  Google API error:`, data.error.message);
    } catch (e) {
        console.error(`  Google error for "${productName}":`, e.message);
    }
    return null;
}

function findInMap(productName) {
    const lower = productName.toLowerCase();
    // Exact match first
    if (IMAGE_MAP[lower]) return IMAGE_MAP[lower];
    // Partial match - longest key first (most specific)
    const sorted = Object.keys(IMAGE_MAP).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (lower.includes(key)) return IMAGE_MAP[key];
    }
    return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🔍 Fetching products without images...\n');

    const { data: existingImages, error: imgErr } = await supabase
        .from('product_images').select('product_id');
    if (imgErr) { console.error('Error:', imgErr.message); process.exit(1); }
    const existingIds = new Set(existingImages.map(r => r.product_id));

    const { data: products, error: prodErr } = await supabase
        .from('products').select('id, name').eq('is_active', true).order('name');
    if (prodErr) { console.error('Error:', prodErr.message); process.exit(1); }

    const needsImage = products.filter(p => !existingIds.has(p.id));
    console.log(`📦 Products needing images: ${needsImage.length} / ${products.length}`);

    // Group by name to deduplicate Google calls
    const byName = {};
    for (const p of needsImage) {
        if (!byName[p.name]) byName[p.name] = [];
        byName[p.name].push(p.id);
    }
    const uniqueNames = Object.keys(byName);
    console.log(`🗂️  Unique names: ${uniqueNames.length}\n`);

    let mapHits = 0, googleHits = 0, misses = 0, googleCalls = 0;
    const GOOGLE_LIMIT = 95;
    const missingNames = [];

    for (const name of uniqueNames) {
        const ids = byName[name];
        let imageUrl = findInMap(name);

        if (imageUrl) {
            mapHits++;
            console.log(`✅ MAP  [${ids.length}x] ${name}`);
        } else if (googleCalls < GOOGLE_LIMIT) {
            await sleep(350);
            imageUrl = await searchGoogle(name);
            googleCalls++;
            if (imageUrl) {
                googleHits++;
                console.log(`🔎 GOOG [${ids.length}x] ${name}`);
            } else {
                misses++;
                missingNames.push(name);
                console.log(`❌ MISS [${ids.length}x] ${name}`);
            }
        } else {
            misses++;
            missingNames.push(name);
            console.log(`⏭️  SKIP [${ids.length}x] ${name} (Google limit)`);
        }

        if (imageUrl) {
            const rows = ids.map(product_id => ({ product_id, storage_path: imageUrl, sort: 0 }));
            const { error } = await supabase.from('product_images').insert(rows);
            if (error) console.error(`  DB error for "${name}":`, error.message);
        }
    }

    console.log('\n══════════════════════════════════════════════════');
    console.log(`✅ Keyword map matches: ${mapHits} names`);
    console.log(`🔎 Google found:        ${googleHits} names (${googleCalls} calls used)`);
    console.log(`❌ Still missing:       ${misses} names`);
    console.log(`📊 Total products enriched: ~${(mapHits + googleHits)} unique × avg products`);
    console.log('══════════════════════════════════════════════════\n');

    if (missingNames.length > 0) {
        console.log('Missing (add manually or re-run tomorrow for more Google calls):');
        missingNames.forEach(n => console.log(' -', n));
    }
}

main().catch(console.error);
