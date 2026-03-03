'use strict';

// Load env: first try .env, then .env.production
require('dotenv').config();
if (!process.env.SUPABASE_URL) {
    require('dotenv').config({ path: '.env.production' });
}

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL        = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_KEY= (process.env.SUPABASE_SERVICE_KEY || '').trim();
const GOOGLE_API_KEY      = (process.env.GOOGLE_API_KEY || '').trim();
const GOOGLE_CX           = (process.env.GOOGLE_CX || '').trim();
const N8N_WEBHOOK_URL     = (process.env.N8N_WEBHOOK_URL || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    console.error('    Add them to .env or .env.production and re-run.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Extended keyword → image URL map ─────────────────────────────────────────
// Keys are matched as substrings (case-insensitive, longest match first).
const IMAGE_MAP = {
    // ── PlayStation ──
    'playstation 5 slim':   'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-front-01-en-23oct23?$native$',
    'playstation 5':        'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-console-group-front-01-en-14sep21?$native$',
    'playstation 4 pro':    'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-product-thumbnail-01-en-14sep21?$native$',
    'playstation 4':        'https://gmedia.playstation.com/is/image/SIEPDC/ps4-product-thumbnail-01-en-14sep21?$native$',
    'ps5 slim':             'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-front-01-en-23oct23?$native$',
    'ps5':                  'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-console-group-front-01-en-14sep21?$native$',
    'ps4 pro':              'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-product-thumbnail-01-en-14sep21?$native$',
    'ps4':                  'https://gmedia.playstation.com/is/image/SIEPDC/ps4-product-thumbnail-01-en-14sep21?$native$',
    'dualsense':            'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-white-front-01-en-26nov20?$native$',
    'dual sense':           'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-white-front-01-en-26nov20?$native$',
    'control dulasense':    'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-white-front-01-en-26nov20?$native$',

    // ── Xbox ──
    'xbox series x':        'https://cms-assets.xboxservices.com/assets/c7/24/c7247a32-9df9-425b-aba2-de414dcacbbc.png?n=11111_Gallery-0_1350x759_02.png',
    'xbox series s':        'https://cms-assets.xboxservices.com/assets/d4/99/d499d356-46a0-4e3d-8b75-bde278e2cebe.png',
    'xbox one x':           'https://cms-assets.xboxservices.com/assets/3f/84/3f843d4c-4e3d-4d1c-bb2f-09cd00d4b7cc.png',
    'xbox one':             'https://cms-assets.xboxservices.com/assets/3f/84/3f843d4c-4e3d-4d1c-bb2f-09cd00d4b7cc.png',

    // ── Nintendo ──
    'nintendo switch oled': 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-white-set/gallery/image01',
    'nintendo switch lite': 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-lite-coral/gallery/image01',
    'nintendo switch':      'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-neon-red-blue/gallery/image01',

    // ── Meta / VR ──
    'meta quest 3':         'https://about.fb.com/wp-content/uploads/2023/09/Meta-Quest-3-hero.jpg',
    'meta quest 2':         'https://about.fb.com/wp-content/uploads/2021/10/Quest-2-hero.jpg',
    'meta quest':           'https://about.fb.com/wp-content/uploads/2023/09/Meta-Quest-3-hero.jpg',

    // ── iPhone ──
    'iphone 16 pro max':    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-max-model-unselect-gallery-2-202409?wid=2560&hei=1440&fmt=p-jpg&qlt=80&.v=1725407010649',
    'iphone 16 pro':        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-model-unselect-gallery-2-202409_GEO_US?wid=2560&hei=1440&fmt=p-jpg&qlt=80&.v=1725407027376',
    'iphone 16 plus':       'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-plus-model-unselect-gallery-2-202409?wid=2560&hei=1440&fmt=p-jpg&qlt=80&.v=1724925713617',
    'iphone 16':            'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-model-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1724925662130',
    'iphone 15 pro max':    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-max-model-unselect-gallery-2-202309?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693010538234',
    'iphone 15 pro':        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-model-unselect-gallery-2-202309?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693010534571',
    'iphone 15':            'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-model-unselect-gallery-2-202309?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693010526947',
    'iphone 14 pro':        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-model-unselect-gallery-2-202209?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1660803982280',
    'iphone 14':            'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-model-unselect-gallery-2-202209?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1660803619668',
    'iphone 13':            'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-model-unselect-gallery-2-202109?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1629876695000',

    // ── Samsung Galaxy ──
    'samsung galaxy s25 ultra': 'https://images.samsung.com/is/image/samsung/p6pim/es/2501/gallery/es-galaxy-s25-ultra-sm-s938-sm-s938bzkheub-544376079',
    'samsung galaxy s25':       'https://images.samsung.com/is/image/samsung/p6pim/es/2501/gallery/es-galaxy-s25-sm-s931-510220-sm-s931bzkgeub-544315625',
    'samsung galaxy s24 ultra': 'https://images.samsung.com/is/image/samsung/p6pim/es/2401/gallery/es-galaxy-s24-ultra-s928-sm-s928bztqeub-539316664',
    'samsung galaxy s24':       'https://images.samsung.com/is/image/samsung/p6pim/es/2401/gallery/es-galaxy-s24-s928-sm-s928bztqeub-539316664?$1300_1038_PNG$',
    'samsung galaxy s23':       'https://images.samsung.com/is/image/samsung/p6pim/es/2302/gallery/es-galaxy-s23-s911-sm-s911bzkeeub-534863671',
    'samsung galaxy a55':       'https://images.samsung.com/is/image/samsung/p6pim/es/2404/gallery/es-galaxy-a55-a556-sm-a556bzkeeub-540073782',
    'samsung galaxy a35':       'https://images.samsung.com/is/image/samsung/p6pim/es/2404/gallery/es-galaxy-a35-a356-sm-a356bzkeeub-540072899',
    'samsung galaxy a15':       'https://images.samsung.com/is/image/samsung/p6pim/es/2024/gallery/es-galaxy-a15-a155-sm-a155fzkaeub-thumb-539765869',

    // ── Apple — Mac ──
    'macbook pro m3':    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697230830200',
    'macbook pro m2':    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202301?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1671304673202',
    'macbook pro':       'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697230830200',
    'macbook air m3':    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202402?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1708367688034',
    'macbook air m2':    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202206?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1653493704417',
    'macbook air':       'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202402?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1708367688034',

    // ── Apple — iPad ──
    'ipad pro':          'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-pro-13-select-202405_FMT_WHH?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1713920283288',
    'ipad air':          'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-air-select-202203?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1645461242213',
    'ipad mini':         'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-mini-select-202109_FMT_WHH?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1629832117000',
    'ipad':              'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-10th-gen-finish-unselect-gallery-2-202210?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1664379409560',

    // ── Apple — Audio / Watch ──
    'airpods max':       'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-max-select-silver-202011?wid=940&hei=1112&fmt=png-alpha&.v=1604021221000',
    'airpods pro':       'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQDY3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1660803972361',
    'airpods':           'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MLWK3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1649089316000',
    'apple watch ultra': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQDY3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1660803972361',
    'apple watch':       'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQDY3?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1660803972361',

    // ── Samsung — Wearables ──
    'samsung galaxy watch': 'https://images.samsung.com/is/image/samsung/p6pim/es/2308/gallery/es-galaxy-watch6-classic-sm-r960-sm-r960nzkaeur-537249854',
    'samsung galaxy buds':  'https://images.samsung.com/is/image/samsung/p6pim/es/2307/gallery/es-galaxy-buds2-pro-sm-r510-sm-r510nzaaeub-front-graphite-536656454',

    // ── Laptops ──
    'lenovo legion':     'https://p3-ofp.static.pub//fes/cms/2023/11/24/jovsow8ow1mhw77z5vj7512l2f144g659556.png',
    'lenovo thinkpad':   'https://p2-ofp.static.pub/fes/cms/2022/08/22/9nhm4p2s9q16u08oiijq0s2z41xf04576399.png',
    'lenovo ideapad':    'https://p2-ofp.static.pub/fes/cms/2022/09/01/fqb7fozlot2dz3i6vdpazj76zzbtg0946583.png',
    'asus rog':          'https://dlcdnwebimgs.asus.com/gain/29B6B4B3-A2D1-4E8C-BB30-5D4D83F82B9E/w1000/h732',
    'asus zenbook':      'https://dlcdnwebimgs.asus.com/gain/5FF34B9E-2C7A-441F-A4B8-2F4A96B0D0DC/w1000/h732',
    'dell xps':          'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9530/media-gallery/silver/laptop-xps-15-9530-t-silver-gallery-4.psd?fmt=png-alpha&wid=960&hei=960',
    'hp pavilion':       'https://ssl-product-images.www8-hp.com/digmedialib/prodimg/knowledgebase/iss/laptops/HP-Pavilion-laptop-15-2024.png',
    'hp envy':           'https://ssl-product-images.www8-hp.com/digmedialib/prodimg/knowledgebase/iss/laptops/HP-ENVY-laptop-2024.png',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Longest-key-first substring match */
function matchKeyword(name) {
    const lower = name.toLowerCase();
    const keys = Object.keys(IMAGE_MAP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (lower.includes(key)) return IMAGE_MAP[key];
    }
    return null;
}

/** Google Custom Search — returns first image URL or null */
async function searchGoogle(name, category) {
    if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;
    try {
        const q = encodeURIComponent(`"${name}" ${category} product official`);
        const url = `https://www.googleapis.com/customsearch/v1?q=${q}&searchType=image&imgSize=large&imgType=photo&num=1&cx=${GOOGLE_CX}&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) {
            const txt = await res.text();
            console.warn(`    ⚠  Google ${res.status}: ${txt.slice(0, 120)}`);
            return null;
        }
        const json = await res.json();
        return json.items?.[0]?.link || null;
    } catch (e) {
        console.warn(`    ⚠  Google error: ${e.message}`);
        return null;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🎮  Image Enrichment Script — Ecugaming Import');
    console.log('━'.repeat(52));

    // 1. Get product IDs that already have at least one image
    const { data: existing, error: existErr } = await supabase
        .from('product_images')
        .select('product_id');

    if (existErr) {
        console.error('❌  product_images query failed:', existErr.message);
        process.exit(1);
    }

    const coveredIds = new Set((existing || []).map(r => r.product_id));
    console.log(`ℹ   Products with images already : ${coveredIds.size}`);

    // 2. Get all active products
    const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, name, category:categories(name)')
        .eq('is_active', true)
        .order('name');

    if (prodErr) {
        console.error('❌  products query failed:', prodErr.message);
        process.exit(1);
    }

    const toEnrich = (products || []).filter(p => !coveredIds.has(p.id));
    console.log(`📦  Products needing images      : ${toEnrich.length} / ${(products || []).length}`);

    if (GOOGLE_API_KEY && GOOGLE_CX) {
        console.log(`🔍  Google Custom Search         : enabled`);
    } else {
        console.log(`🔍  Google Custom Search         : disabled (no GOOGLE_API_KEY / GOOGLE_CX)`);
    }
    console.log('━'.repeat(52));

    if (toEnrich.length === 0) {
        console.log('✅  All products already have images — nothing to do.\n');
        return;
    }

    let found = 0;
    let googleUsed = 0;
    const missing = [];

    for (const product of toEnrich) {
        const categoryName = product.category?.name || '';
        process.stdout.write(`  🔎  "${product.name}" ... `);

        // Pass 1 — keyword map (free, instant)
        let imageUrl = matchKeyword(product.name);
        let source = 'keyword';

        // Pass 2 — Google Custom Search
        if (!imageUrl && GOOGLE_API_KEY && GOOGLE_CX) {
            imageUrl = await searchGoogle(product.name, categoryName);
            source = 'google';
            await sleep(1100); // stay within 100 req/day free tier
        }

        if (imageUrl) {
            const { error: insErr } = await supabase
                .from('product_images')
                .insert({ product_id: product.id, storage_path: imageUrl, sort: 0 });

            if (insErr) {
                process.stdout.write(`❌  DB: ${insErr.message}\n`);
                missing.push({ id: product.id, name: product.name, category: categoryName, reason: insErr.message });
            } else {
                process.stdout.write(`✅  [${source}]\n`);
                found++;
                if (source === 'google') googleUsed++;
            }
        } else {
            process.stdout.write('⛔  not found\n');
            missing.push({ id: product.id, name: product.name, category: categoryName, reason: 'no match' });
        }
    }

    console.log('━'.repeat(52));
    console.log(`✅  Enriched : ${found} (${found - googleUsed} keyword  +  ${googleUsed} Google)`);
    console.log(`⛔  Missing  : ${missing.length}`);

    if (missing.length > 0) {
        console.log('\n  Products with no image found:');
        missing.forEach(p => console.log(`    • ${p.name}  [${p.category}]`));
    }

    // 3. Notify n8n webhook with missing list
    if (N8N_WEBHOOK_URL) {
        try {
            const payload = {
                missing_products: missing,
                total_missing: missing.length,
                total_enriched: found,
                timestamp: new Date().toISOString()
            };
            const r = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log(`\n📡  n8n webhook: ${r.ok ? '✅ sent' : '⚠  HTTP ' + r.status}`);
        } catch (e) {
            console.warn('\n📡  n8n webhook failed:', e.message);
        }
    }

    // 4. Git commit + push (only if something was inserted)
    if (found > 0) {
        try {
            execSync('git add -A', { stdio: 'pipe' });
            const msg = `chore: update product images catalog (${found} enriched, ${missing.length} missing)`;
            execSync(`git commit -m "${msg}"`, { stdio: 'pipe' });
            execSync('git push origin main', { stdio: 'pipe' });
            console.log('🚀  Git: committed and pushed to main');
        } catch (e) {
            const out = e.stdout?.toString() || e.message;
            if (out.includes('nothing to commit')) {
                console.log('ℹ   Git: nothing to commit (images already in DB, no file changes)');
            } else {
                console.warn('⚠   Git error:', out.slice(0, 200));
            }
        }
    }

    console.log('━'.repeat(52));
    console.log('Done!\n');
}

main().catch(err => {
    console.error('\nFatal error:', err.message || err);
    process.exit(1);
});
