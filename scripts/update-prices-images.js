'use strict';
/**
 * update-prices-images.js
 *
 * 1. Searches Google for CURRENT PHYSICAL GAME PRICES and updates Supabase
 * 2. Searches Google Images for missing product images and updates Supabase
 *
 * Usage:
 *   node scripts/update-prices-images.js [--prices-only] [--images-only] [--dry-run]
 *
 * Env required (.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (or from .env.prod)
 *   GOOGLE_API_KEY, GOOGLE_CX
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.prod', override: false });

const https = require('https');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\r?\n$/, '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').replace(/\r?\n$/, '').trim();
const GOOGLE_KEY   = process.env.GOOGLE_API_KEY || '';
const GOOGLE_CX    = process.env.GOOGLE_CX || '';

const DRY_RUN      = process.argv.includes('--dry-run');
const PRICES_ONLY  = process.argv.includes('--prices-only');
const IMAGES_ONLY  = process.argv.includes('--images-only');
const SLEEP_MS     = 1100; // stay under 1 req/s for Google API

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}
if (!GOOGLE_KEY || !GOOGLE_CX) {
    console.error('❌ Missing GOOGLE_API_KEY or GOOGLE_CX');
    process.exit(1);
}
if (DRY_RUN) console.log('🔍 DRY RUN — no changes will be saved\n');

// ── HELPERS ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'EcugamingBot/1.0' } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve(null); }
            });
        });
        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function supabaseFetch(method, path, body) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : null;
        const url = new URL(SUPABASE_URL + '/rest/v1' + path);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ── GOOGLE SEARCH ─────────────────────────────────────────────────────────────

/**
 * Extracts a USD price from Google search result snippets.
 * Looks for patterns like $12.99, USD 15, 15.00 USD, etc.
 */
function extractPrice(snippets) {
    const text = snippets.join(' ').replace(/,/g, '.');
    // Match patterns: $12.99 / USD 12.99 / 12.99 USD / 12 dolares
    const patterns = [
        /\$\s*(\d{1,3}(?:\.\d{2})?)/g,
        /USD\s*(\d{1,3}(?:\.\d{2})?)/gi,
        /(\d{1,3}(?:\.\d{2})?)\s*USD/gi,
        /(\d{1,3}(?:\.\d{2})?)\s*d[oó]lares?/gi,
    ];
    const prices = [];
    for (const pat of patterns) {
        let m;
        while ((m = pat.exec(text)) !== null) {
            const v = parseFloat(m[1]);
            if (v >= 3 && v <= 120) prices.push(v); // physical games: $3-$120
        }
    }
    if (!prices.length) return null;
    // Return median to avoid outliers
    prices.sort((a, b) => a - b);
    return prices[Math.floor(prices.length / 2)];
}

async function googleSearchPrice(gameName) {
    // Search specifically for physical copy prices
    const q = encodeURIComponent(`"${gameName}" juego fisico precio USD OR "$" comprar`);
    const url = `https://www.googleapis.com/customsearch/v1?q=${q}&cx=${GOOGLE_CX}&key=${GOOGLE_KEY}&num=5&gl=ec&hl=es`;
    try {
        const data = await fetchJSON(url);
        if (!data?.items) return null;
        const snippets = data.items.flatMap(item => [
            item.snippet || '',
            item.title || '',
            item.pagemap?.metatags?.[0]?.['og:description'] || '',
        ]);
        return extractPrice(snippets);
    } catch (e) {
        console.error(`  Google price search error for "${gameName}":`, e.message);
        return null;
    }
}

async function googleSearchImage(productName, category) {
    const q = encodeURIComponent(`"${productName}" ${category} official product`);
    const url = `https://www.googleapis.com/customsearch/v1?q=${q}&cx=${GOOGLE_CX}&key=${GOOGLE_KEY}&searchType=image&imgSize=large&imgType=photo&num=3`;
    try {
        const data = await fetchJSON(url);
        const items = data?.items || [];
        // Pick first .jpg/.png link that isn't amazon/ebay
        for (const item of items) {
            const link = item.link || '';
            if (!link.match(/amazon|ebay|aliexpress|walmart/i) && link.match(/\.(jpg|jpeg|png|webp)/i)) {
                return link;
            }
        }
        return items[0]?.link || null;
    } catch (e) {
        console.error(`  Google image search error for "${productName}":`, e.message);
        return null;
    }
}

// ── SUPABASE OPERATIONS ───────────────────────────────────────────────────────
async function getAllProducts() {
    const { status, body } = await supabaseFetch('GET', '/products?select=id,name,category:categories(name),price,sale_price,is_active&is_active=eq.true&limit=1000');
    if (status !== 200) {
        console.error('Failed to fetch products:', status);
        return [];
    }
    return (body || []).map(p => ({
        ...p,
        category: p.category?.name || '',
    }));
}

async function getProductsWithoutImages() {
    // Get product IDs that have no entry in product_images
    const { body: existing } = await supabaseFetch('GET', '/product_images?select=product_id');
    const existingIds = new Set((existing || []).map(r => r.product_id));
    const products = await getAllProducts();
    return products.filter(p => !existingIds.has(p.id));
}

async function updateProductPrice(productId, newPrice) {
    if (DRY_RUN) return;
    const { status } = await supabaseFetch('PATCH', `/products?id=eq.${productId}`, { price: newPrice });
    return status < 300;
}

async function insertProductImage(productId, imageUrl) {
    if (DRY_RUN) return;
    const { status } = await supabaseFetch('POST', '/product_images', {
        product_id: productId,
        storage_path: imageUrl,
        sort: 0,
    });
    return status < 300;
}

// ── MAIN: UPDATE GAME PRICES ──────────────────────────────────────────────────
async function updateGamePrices() {
    console.log('\n══════════════════════════════════════════');
    console.log('📦 PHASE 1: Update Physical Game Prices');
    console.log('══════════════════════════════════════════');

    const products = await getAllProducts();
    const games = products.filter(p => (p.category || '').toLowerCase().includes('juego'));
    console.log(`Found ${games.length} game products\n`);

    let updated = 0, skipped = 0, failed = 0;
    const log = [];

    for (const game of games) {
        const oldPrice = parseFloat(game.price) || 0;
        process.stdout.write(`  🔍 "${game.name}" ($${oldPrice}) → `);

        const newPrice = await googleSearchPrice(game.name);
        await sleep(SLEEP_MS);

        if (!newPrice) {
            console.log('no price found');
            log.push({ name: game.name, old: oldPrice, new: null, status: 'not found' });
            failed++;
            continue;
        }

        const diff = Math.abs(newPrice - oldPrice);
        const diffPct = oldPrice > 0 ? (diff / oldPrice) * 100 : 100;

        // Only update if change is significant (>5%) and price is reasonable
        if (diffPct < 5 && oldPrice > 0) {
            console.log(`$${newPrice} ≈ same, skip`);
            log.push({ name: game.name, old: oldPrice, new: newPrice, status: 'same' });
            skipped++;
            continue;
        }

        console.log(`$${newPrice} ✅ (was $${oldPrice}, ${diffPct.toFixed(0)}% change)`);
        log.push({ name: game.name, old: oldPrice, new: newPrice, status: 'updated' });

        await updateProductPrice(game.id, newPrice);
        updated++;
    }

    console.log(`\n📊 Price update results:`);
    console.log(`   ✅ Updated:    ${updated}`);
    console.log(`   ⏭  Skipped:    ${skipped}`);
    console.log(`   ❌ Not found:  ${failed}`);

    // Print full table
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Game Price Report                                               │');
    console.log('├───────────────────────────────────────┬────────┬────────┬───────┤');
    console.log('│ Name                                  │  Old   │  New   │Status │');
    console.log('├───────────────────────────────────────┼────────┼────────┼───────┤');
    for (const entry of log) {
        const name = entry.name.slice(0, 38).padEnd(38);
        const old  = `$${(entry.old || 0).toFixed(2)}`.padStart(6);
        const nw   = entry.new ? `$${entry.new.toFixed(2)}`.padStart(6) : '  —   ';
        const st   = (entry.status || '').padEnd(7);
        console.log(`│ ${name} │ ${old} │ ${nw} │ ${st}│`);
    }
    console.log('└───────────────────────────────────────┴────────┴────────┴───────┘');

    return { updated, skipped, failed };
}

// ── MAIN: ADD MISSING IMAGES ──────────────────────────────────────────────────
async function addMissingImages() {
    console.log('\n══════════════════════════════════════════');
    console.log('🖼️  PHASE 2: Add Missing Product Images');
    console.log('══════════════════════════════════════════');

    const products = await getProductsWithoutImages();
    console.log(`Found ${products.length} products without images\n`);

    if (products.length === 0) {
        console.log('✅ All products already have images!');
        return { found: 0, notFound: 0 };
    }

    let found = 0, notFound = 0;

    for (const p of products) {
        process.stdout.write(`  🔍 "${p.name}" (${p.category}) → `);

        const imageUrl = await googleSearchImage(p.name, p.category);
        await sleep(SLEEP_MS);

        if (!imageUrl) {
            console.log('no image found');
            notFound++;
            continue;
        }

        const short = imageUrl.length > 60 ? imageUrl.slice(0, 57) + '…' : imageUrl;
        console.log(`✅ ${short}`);
        await insertProductImage(p.id, imageUrl);
        found++;
    }

    console.log(`\n📊 Image results:`);
    console.log(`   ✅ Found & saved: ${found}`);
    console.log(`   ❌ Not found:     ${notFound}`);

    return { found, notFound };
}

// ── ENTRY POINT ───────────────────────────────────────────────────────────────
(async () => {
    console.log('🎮 Ecugaming Import — Price & Image Updater');
    console.log(`   Supabase: ${SUPABASE_URL}`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

    let priceResult = null, imageResult = null;

    if (!IMAGES_ONLY) {
        priceResult = await updateGamePrices();
    }

    if (!PRICES_ONLY) {
        imageResult = await addMissingImages();
    }

    console.log('\n══════════════════════════════════════════');
    console.log('✅ Done!');
    if (priceResult) console.log(`   Prices updated: ${priceResult.updated} games`);
    if (imageResult) console.log(`   Images added:   ${imageResult.found} products`);
    if (DRY_RUN) console.log('   (DRY RUN — no changes were saved)');
    console.log('══════════════════════════════════════════\n');
})();
