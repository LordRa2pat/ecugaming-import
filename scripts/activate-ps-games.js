/**
 * activate-ps-games.js
 * Activates inactive PS5/PS4 games with Amazon USA prices and official images.
 * Deduplicates: keeps one active per unique game name.
 */
const fs = require('fs'), https = require('https');
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const U = get('SUPABASE_URL'), K = get('SUPABASE_SERVICE_KEY');

// PS5/PS4 games with Amazon USA prices and Wikimedia/official images
const GAMES = [
    {
        name: 'spider-man 2',
        platform: 'ps5',
        price: 59.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/9/9d/Marvel%27s_Spider-Man_2_cover_art.jpg',
    },
    {
        name: 'god of war ragnarok',
        platform: 'ps5',
        price: 49.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/e/e1/God_of_War_Ragnar%C3%B6k_cover.jpg',
    },
    {
        name: 'horizon forbidden west',
        platform: 'ps5',
        price: 39.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/6/6e/Horizon_Forbidden_West.jpg',
    },
    {
        name: 'elden ring',
        platform: 'ps5',
        price: 59.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
    },
    {
        name: 'final fantasy xvi',
        platform: 'ps5',
        price: 49.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/b/bd/Final_Fantasy_XVI.jpg',
    },
    {
        name: 'returnal',
        platform: 'ps5',
        price: 49.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/3/35/Returnal_cover_art.jpg',
    },
    {
        name: 'ratchet & clank',
        platform: 'ps5',
        price: 49.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/4/47/Ratchet_%26_Clank_Rift_Apart.jpg',
    },
    {
        name: "demon's souls",
        platform: 'ps5',
        price: 39.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Demon%27s_Souls_2020.jpg',
    },
    {
        name: 'gran turismo 7',
        platform: 'ps5',
        price: 49.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/1/15/Gran_Turismo_7_cover.jpg',
    },
    {
        name: 'the last of us part i',
        platform: 'ps5',
        price: 49.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/2/20/The_Last_of_Us_Part_I_cover.jpg',
    },
    {
        name: 'death stranding',
        platform: 'ps5',
        price: 39.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/e/e8/Death_Stranding_Director%27s_Cut.jpg',
    },
    {
        name: 'ufc 5',
        platform: 'ps5',
        price: 59.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/d/d2/EA_Sports_UFC_5_cover.jpg',
    },
    {
        name: 'call of duty',
        platform: 'ps5',
        price: 69.99,
        image: 'https://upload.wikimedia.org/wikipedia/en/4/4d/Call_of_Duty_Modern_Warfare_III_key_art.jpg',
    },
];

function apiReq(method, path, body) {
    return new Promise((resolve, reject) => {
        const u = new (require('url').URL)(U + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: u.hostname, path: u.pathname + u.search, method,
            headers: {
                apikey: K, Authorization: 'Bearer ' + K,
                'Content-Type': 'application/json', Prefer: 'return=minimal',
            },
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
    const pageSize = 1000;
    let offset = 0, all = [];
    while (true) {
        const sep = path.includes('?') ? '&' : '?';
        const r = await apiReq('GET', `${path}${sep}limit=${pageSize}&offset=${offset}`);
        const batch = JSON.parse(r.body);
        if (!Array.isArray(batch) || batch.length === 0) break;
        all = all.concat(batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
    }
    return all;
}

function matchGame(productName, gameKeyword) {
    return productName.toLowerCase().includes(gameKeyword.toLowerCase());
}

async function main() {
    const juegosId = 'bd83d164-c904-453c-87f6-ac94074c1ced';

    // Fetch all inactive juegos
    const inactive = await fetchAll(
        `/rest/v1/products?select=id,name,price,created_at&is_active=eq.false&category_id=eq.${juegosId}`
    );
    console.log(`Inactive juegos found: ${inactive.length}`);

    // Fetch existing images
    const allImgs = await fetchAll('/rest/v1/product_images?select=product_id,id');
    const withImage = new Map();
    for (const img of allImgs) {
        if (!withImage.has(img.product_id)) withImage.set(img.product_id, img.id);
    }

    let activated = 0, deactivated = 0, priced = 0, imaged = 0;

    for (const game of GAMES) {
        // Find all inactive products matching this game
        const matches = inactive.filter(p => matchGame(p.name, game.name));
        if (matches.length === 0) {
            console.log(`  NOT FOUND: ${game.name}`);
            continue;
        }

        // Sort: prefer one with image, then oldest
        matches.sort((a, b) => {
            const aImg = withImage.has(a.id) ? 0 : 1;
            const bImg = withImage.has(b.id) ? 0 : 1;
            if (aImg !== bImg) return aImg - bImg;
            return new Date(a.created_at) - new Date(b.created_at);
        });

        const keep = matches[0];
        const rest = matches.slice(1);

        // Activate the best one with price
        await apiReq('PATCH', `/rest/v1/products?id=eq.${keep.id}`, {
            is_active: true,
            price: game.price,
        });
        activated++;
        priced++;

        // Add/update image for the kept product
        const existingImgId = withImage.get(keep.id);
        if (existingImgId) {
            await apiReq('PATCH', `/rest/v1/product_images?id=eq.${existingImgId}`, {
                storage_path: game.image,
            });
        } else {
            await apiReq('POST', '/rest/v1/product_images', {
                product_id: keep.id,
                storage_path: game.image,
                sort: 0,
            });
        }
        imaged++;

        // Deactivate duplicates (keep them inactive)
        for (const dup of rest) {
            await apiReq('PATCH', `/rest/v1/products?id=eq.${dup.id}`, { is_active: false });
            deactivated++;
        }

        console.log(`  ✅ ${keep.name} — $${game.price} [${game.platform.toUpperCase()}] (${rest.length} dups kept inactive)`);
    }

    console.log(`\nDone:`);
    console.log(`  Activated: ${activated}`);
    console.log(`  Priced:    ${priced}`);
    console.log(`  Images:    ${imaged}`);
    console.log(`  Dups kept inactive: ${deactivated}`);
}

main().catch(console.error);
