/**
 * fix-ps5-all.js
 * 1. Replaces broken gmedia.playstation.com console images with Wikimedia Commons
 * 2. Activates inactive PS5 games and adds images
 * 3. Inserts new PS5 games not in the DB
 */
const fs = require('fs'), https = require('https');
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const U = get('SUPABASE_URL'), K = get('SUPABASE_SERVICE_KEY');

// ── Reliable image map for PS5 hardware ──────────────────────────────────────
// Wikimedia Commons (works in browsers; 429 is server-side rate limiting only)
const CONSOLE_IMAGES = {
    ps5_standard:   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/PlayStation_5_and_DualSense_with_transparent_background.png/640px-PlayStation_5_and_DualSense_with_transparent_background.png',
    ps5_slim:       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/PS5-Slim-Console-FL.png/640px-PS5-Slim-Console-FL.png',
    ps5_pro:        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/PlayStation-5-Pro.jpg/640px-PlayStation-5-Pro.jpg',
    ps5_digital:    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/PlayStation_5_Digital_Edition.png/640px-PlayStation_5_Digital_Edition.png',
    dualsense:      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/DualSense_Front.jpg/640px-DualSense_Front.jpg',
    psvr2:          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/PlayStation_VR2.jpg/640px-PlayStation_VR2.jpg',
    ps4_pro:        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/PS4_Pro.jpg/640px-PS4_Pro.jpg',
};

// ── New PS5 games to INSERT (not in DB, Steam CDN = reliable) ────────────────
const NEW_GAMES = [
    // Steam CDN (header.jpg = reliable, no hotlink protection)
    { name: 'Hogwarts Legacy (PS5)',                    price: 39.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg' },
    { name: 'Cyberpunk 2077: Ultimate Edition (PS5)',   price: 29.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg' },
    { name: 'Resident Evil Village (PS5)',              price: 29.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1196590/header.jpg' },
    { name: 'Resident Evil 4 Remake (PS5)',             price: 39.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg' },
    { name: 'Resident Evil 2 Remake (PS5)',             price: 24.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/883710/header.jpg' },
    { name: 'Resident Evil 3 Remake (PS5)',             price: 24.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/952060/header.jpg' },
    { name: 'The Witcher 3: Complete Edition (PS5)',    price: 29.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg' },
    { name: 'Mortal Kombat 1 (PS5)',                   price: 39.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1971870/header.jpg' },
    { name: 'Street Fighter 6 (PS5)',                  price: 39.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1716230/header.jpg' },
    { name: 'Sekiro: Shadows Die Twice GOTY (PS5)',    price: 29.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/814380/header.jpg' },
    { name: 'Final Fantasy VII Remake Intergrade (PS5)',price: 39.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1462040/header.jpg' },
    { name: "Baldur's Gate 3 (PS5)",                   price: 49.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg' },
    { name: 'Black Myth: Wukong (PS5)',                price: 59.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2358720/header.jpg' },
    { name: 'Silent Hill 2 Remake (PS5)',               price: 59.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2124490/header.jpg' },
    { name: 'Space Marine 2 (PS5)',                    price: 49.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2183900/header.jpg' },
    { name: 'Dragon Age: The Veilguard (PS5)',          price: 49.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1845980/header.jpg' },
    { name: 'Hi-Fi Rush (PS5)',                        price: 24.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1817230/header.jpg' },
    { name: 'Metaphor: ReFantazio (PS5)',               price: 59.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2679460/header.jpg' },
    { name: 'Helldivers 2 (PS5)',                      price: 39.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/553850/header.jpg' },
    { name: 'God of War (2018) (PS5)',                 price: 19.99, image: 'https://upload.wikimedia.org/wikipedia/en/a/a7/God_of_War_4_cover.jpg' },
    { name: 'The Last of Us Part II Remastered (PS5)', price: 39.99, image: 'https://upload.wikimedia.org/wikipedia/en/4/4f/The_Last_of_Us_Part_II_Box_Art.jpg' },
    { name: 'Bloodborne (PS5)',                        price: 19.99, image: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Bloodborne_Cover_Artwork.jpg' },
    { name: 'Stellar Blade (PS5)',                     price: 59.99, image: 'https://upload.wikimedia.org/wikipedia/en/3/3e/Stellar_Blade_cover_art.jpg' },
    { name: 'Astro Bot (PS5)',                         price: 59.99, image: 'https://upload.wikimedia.org/wikipedia/en/d/d8/Astro_Bot_cover_art.jpg' },
    { name: 'Horizon Zero Dawn Remastered (PS5)',       price: 49.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1151640/header.jpg' },
    { name: 'Yakuza: Like a Dragon (PS5)',              price: 29.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1235140/header.jpg' },
    { name: 'Forza Horizon 5 (PS5)',                   price: 39.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg' },
    { name: 'The Plucky Squire (PS5)',                 price: 19.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2286870/header.jpg' },
    { name: 'Indiana Jones and the Great Circle (PS5)',price: 59.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2677660/header.jpg' },
    { name: 'Avowed (PS5)',                            price: 59.99, image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1224780/header.jpg' },
];

const JUEGOS_CAT_ID = 'bd83d164-c904-453c-87f6-ac94074c1ced';

function apiReq(method, path, body) {
    return new Promise((resolve, reject) => {
        const u = new (require('url').URL)(U + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: u.hostname, path: u.pathname + u.search, method,
            headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        };
        if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = https.request(opts, r => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: d }));
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function fetchAll(path) {
    const ps = 1000; let off = 0, all = [];
    while (true) {
        const sep = path.includes('?') ? '&' : '?';
        const r = await apiReq('GET', `${path}${sep}limit=${ps}&offset=${off}`);
        const b = JSON.parse(r.body);
        if (!Array.isArray(b) || b.length === 0) break;
        all = all.concat(b);
        if (b.length < ps) break;
        off += ps;
    }
    return all;
}

async function main() {
    console.log('=== STEP 1: Fix PS5 console images ===');

    // Fetch all products in Consolas category with gmedia images
    const consolas = await fetchAll(
        `/rest/v1/products?select=id,name,is_active&is_active=eq.true&category_id=neq.${JUEGOS_CAT_ID}`
    );
    const allImgs = await fetchAll('/rest/v1/product_images?select=id,product_id,storage_path');
    const imgByProduct = {};
    for (const img of allImgs) {
        if (!imgByProduct[img.product_id]) imgByProduct[img.product_id] = img;
    }

    let consolaFixed = 0;
    for (const p of consolas) {
        const img = imgByProduct[p.id];
        if (!img || !img.storage_path.includes('gmedia.playstation.com')) continue;

        const n = p.name.toLowerCase();
        let newImg = null;

        if (n.includes('ps5 pro'))           newImg = CONSOLE_IMAGES.ps5_pro;
        else if (n.includes('ps5 slim') && n.includes('digit')) newImg = CONSOLE_IMAGES.ps5_digital;
        else if (n.includes('ps5 slim'))     newImg = CONSOLE_IMAGES.ps5_slim;
        else if (n.match(/^ps5/))            newImg = CONSOLE_IMAGES.ps5_standard;
        else if (n.includes('playstation 5 slim')) newImg = CONSOLE_IMAGES.ps5_slim;
        else if (n.includes('playstation 5 pro'))  newImg = CONSOLE_IMAGES.ps5_pro;
        else if (n.includes('playstation 5'))      newImg = CONSOLE_IMAGES.ps5_standard;
        else if (n.includes('dualsense'))    newImg = CONSOLE_IMAGES.dualsense;
        else if (n.includes('vr2') || n.includes('playstation vr')) newImg = CONSOLE_IMAGES.psvr2;
        else if (n.includes('ps4 pro') || n.includes('playstation 4 pro')) newImg = CONSOLE_IMAGES.ps4_pro;

        if (newImg) {
            await apiReq('PATCH', `/rest/v1/product_images?id=eq.${img.id}`, { storage_path: newImg });
            console.log(`  ✅ ${p.name}`);
            consolaFixed++;
        }
    }
    console.log(`  → Fixed ${consolaFixed} console images\n`);

    console.log('=== STEP 2: Insert new PS5 games ===');

    // Get existing product names to avoid duplicates
    const existing = await fetchAll('/rest/v1/products?select=name,is_active&category_id=eq.' + JUEGOS_CAT_ID);
    const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()));

    let inserted = 0;
    for (const g of NEW_GAMES) {
        if (existingNames.has(g.name.toLowerCase().trim())) {
            console.log(`  SKIP (exists): ${g.name}`);
            continue;
        }

        // Insert product
        const slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        const r = await apiReq('POST', '/rest/v1/products', {
            name: g.name,
            slug: slug + '-' + Date.now(),
            category_id: JUEGOS_CAT_ID,
            brand: 'PlayStation Studios',
            description: `${g.name} disponible en Ecuador. Garantía incluida.`,
            specs: {},
            price: g.price,
            stock: 10,
            is_active: true,
        });

        let productId = null;
        try {
            const body = JSON.parse(r.body);
            productId = Array.isArray(body) ? body[0]?.id : body?.id;
        } catch (_) {}

        if (!productId) {
            console.log(`  ❌ Failed to insert ${g.name} (status ${r.status}): ${r.body.slice(0,100)}`);
            continue;
        }

        // Insert image
        await apiReq('POST', '/rest/v1/product_images', {
            product_id: productId,
            storage_path: g.image,
            sort: 0,
        });

        console.log(`  ✅ ${g.name} — $${g.price}`);
        inserted++;
    }
    console.log(`  → Inserted ${inserted} new PS5 games\n`);

    // Final count
    const activeGames = await fetchAll('/rest/v1/products?select=id&is_active=eq.true&category_id=eq.' + JUEGOS_CAT_ID);
    console.log(`Total active juegos now: ${activeGames.length}`);
    const totalActive = await fetchAll('/rest/v1/products?select=id&is_active=eq.true');
    console.log(`Total active products: ${totalActive.length}`);
}

main().catch(console.error);
