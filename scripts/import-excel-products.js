/**
 * import-excel-products.js
 * Imports products from Excel into Supabase.
 * - Deduplicates within the Excel (keeps first occurrence by name)
 * - Skips products already in DB (case-insensitive name match)
 * - Applies Amazon USA prices via keyword map
 * - Applies official image URLs via keyword map
 */
const fs = require('fs');
const https = require('https');
const XLSX = require('xlsx');

// ── Env ────────────────────────────────────────────────────────────────────
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g, '') : ''; };
const SUPABASE_URL = get('SUPABASE_URL');
const SUPABASE_KEY = get('SUPABASE_SERVICE_KEY');

// ── Category IDs (from DB) ─────────────────────────────────────────────────
const CAT = {
    iphone:    'b34124ff-2394-45e4-b69e-729274654367',
    consolas:  '2afd0fb7-73de-4d10-8526-cb362b9cc7a6',
    juegos:    'bd83d164-c904-453c-87f6-ac94074c1ced',
    accesorios:'8209b472-f651-401f-8355-9cd4e3f91eeb',
    laptops:   '2490a053-4fd5-441b-92c5-bd65d30a3876',
    retro:     '86c9eff5-ac30-4778-99d9-0a382567ce44',
    general:   '9ef20183-0c2c-4fb6-9552-e73887d28e0f',
};

function excelCatToDb(cat) {
    const c = (cat || '').toLowerCase();
    if (c.includes('iphone')) return CAT.iphone;
    if (c.includes('consola')) return CAT.consolas;
    if (c.includes('retro')) return CAT.retro;
    if (c.includes('juego') || c.includes('nintendo')) return CAT.juegos;
    if (c.includes('accesorio')) return CAT.accesorios;
    if (c.includes('pc') || c.includes('componente')) return CAT.general;
    return CAT.general;
}

// ── Amazon USA Price Map ───────────────────────────────────────────────────
// Matched via lowercase keyword; longer keys first (most specific)
const PRICE_MAP = [
    // ── Consoles ──────────────────────────────────────────────────────────
    { k: 'ps5 slim',             p: 449.99 },
    { k: 'ps5',                  p: 499.99 },
    { k: 'ps4 pro',              p: 299.99 },
    { k: 'xbox series x',        p: 499.99 },
    { k: 'xbox series s',        p: 299.99 },
    { k: 'nintendo switch oled', p: 349.99 },
    { k: 'nintendo switch lite', p: 199.99 },
    { k: 'nintendo switch',      p: 299.99 },
    // ── Retro ─────────────────────────────────────────────────────────────
    { k: 'snes classic',         p: 99.99  },
    { k: 'nes classic',          p: 79.99  },
    { k: 'sega genesis',         p: 59.99  },
    { k: 'gamecube',             p: 149.99 },
    { k: 'n64',                  p: 129.99 },
    { k: 'gameboy color',        p: 79.99  },
    // ── iPhone — specific storage first ───────────────────────────────────
    { k: 'iphone 15', p: 799.99 }, // base price; storage bumps below
    { k: 'iphone 15 256gb',      p: 899.99  },
    { k: 'iphone 15 512gb',      p: 999.99  },
    { k: 'iphone 15 1tb',        p: 1099.99 },
    { k: 'iphone 14 128gb',      p: 699.99  },
    { k: 'iphone 14 256gb',      p: 799.99  },
    { k: 'iphone 14 512gb',      p: 899.99  },
    { k: 'iphone 14 1tb',        p: 999.99  },
    { k: 'iphone 14',            p: 699.99  },
    { k: 'iphone 13 128gb',      p: 599.99  },
    { k: 'iphone 13 256gb',      p: 699.99  },
    { k: 'iphone 13 512gb',      p: 799.99  },
    { k: 'iphone 13 1tb',        p: 899.99  },
    { k: 'iphone 13',            p: 599.99  },
    { k: 'iphone 12 128gb',      p: 499.99  },
    { k: 'iphone 12 256gb',      p: 549.99  },
    { k: 'iphone 12 512gb',      p: 649.99  },
    { k: 'iphone 12 1tb',        p: 699.99  },
    { k: 'iphone 12',            p: 499.99  },
    { k: 'iphone 11 128gb',      p: 279.99  },
    { k: 'iphone 11 256gb',      p: 329.99  },
    { k: 'iphone 11 512gb',      p: 379.99  },
    { k: 'iphone 11 1tb',        p: 429.99  },
    { k: 'iphone 11',            p: 279.99  },
    { k: 'iphone se',            p: 429.99  },
    // ── PC Components ─────────────────────────────────────────────────────
    { k: 'rtx 4090',             p: 1599.99 },
    { k: 'rtx 4080',             p: 799.99  },
    { k: 'rtx 3070',             p: 399.99  },
    { k: 'ryzen 9 7950x',        p: 549.99  },
    { k: 'ryzen 7 5800x',        p: 229.99  },
    { k: 'corsair vengeance 32gb', p: 89.99  },
    { k: 'samsung 990 pro 2tb',  p: 149.99  },
    // ── Accessories ───────────────────────────────────────────────────────
    { k: 'hyperx cloud ii',      p: 49.99   },
    { k: 'dualsense',            p: 69.99   },
    { k: 'mousepad rgb xl',      p: 19.99   },
    { k: 'logitech g502',        p: 39.99   },
    { k: 'xbox wireless controller', p: 59.99 },
    { k: 'razer blackwidow',     p: 79.99   },
    // ── Games ─────────────────────────────────────────────────────────────
    { k: 'returnal',             p: 49.99   },
    { k: 'elden ring',           p: 39.99   },
    { k: 'ratchet & clank: rift apart', p: 39.99 },
    { k: 'ratchet & clank rift apart', p: 39.99 },
    { k: 'the last of us part i', p: 39.99  },
    { k: 'gran turismo 7',       p: 29.99   },
    { k: "spider-man 2",         p: 49.99   },
    { k: 'spider man 2',         p: 49.99   },
    { k: 'god of war ragnarok',  p: 39.99   },
    { k: 'god of war: ragnarok', p: 39.99   },
    { k: 'horizon forbidden west', p: 29.99 },
    { k: 'final fantasy xvi',    p: 39.99   },
    { k: 'pokémon violet',       p: 49.99   },
    { k: 'pokemon violet',       p: 49.99   },
    { k: 'pokémon scarlet',      p: 49.99   },
    { k: 'pokemon scarlet',      p: 49.99   },
    { k: 'zelda: tears of the kingdom', p: 59.99 },
    { k: 'zelda tears of the kingdom',  p: 59.99 },
    { k: 'metroid dread',        p: 49.99   },
    { k: 'splatoon 3',           p: 49.99   },
    { k: 'mario kart 8',         p: 49.99   },
    { k: 'mario bros wonder',    p: 59.99   },
    { k: 'kirby and the forgotten land', p: 49.99 },
];

// Sort by key length desc so longer (more specific) keys match first
PRICE_MAP.sort((a, b) => b.k.length - a.k.length);

function getPrice(name) {
    const n = name.toLowerCase();
    for (const { k, p } of PRICE_MAP) {
        if (n.includes(k)) return p;
    }
    return null;
}

// ── Image URL Map ─────────────────────────────────────────────────────────
// keyword → official image URL
const IMAGE_MAP = [
    // ── PS5 ───────────────────────────────────────────────────────────────
    { k: 'ps5 slim', url: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-01-en-31aug23?$native$' },
    { k: 'ps5',      url: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-console-selection-group-image-block-01-en-14sep21?$native$' },
    // ── PS4 ───────────────────────────────────────────────────────────────
    { k: 'ps4 pro',  url: 'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-product-thumbnail-01-en-14sep21?$native$' },
    { k: 'ps4',      url: 'https://gmedia.playstation.com/is/image/SIEPDC/ps4-product-thumbnail-01-en-14sep21?$native$' },
    // ── Xbox ──────────────────────────────────────────────────────────────
    { k: 'xbox series x', url: 'https://cms-assets.xboxservices.com/assets/bf/7b/bf7b2a7e-5f08-4e1d-8fe4-e63f0f5c5a5f.png' },
    { k: 'xbox series s', url: 'https://cms-assets.xboxservices.com/assets/2f/f5/2ff5282a-b9e0-41d7-b80a-aa9a8e427977.png' },
    // ── Nintendo Switch ───────────────────────────────────────────────────
    { k: 'nintendo switch oled', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-white-set/image-thumb' },
    { k: 'nintendo switch lite', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-lite-yellow/image-thumb' },
    { k: 'nintendo switch',      url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-neon-blue-red-set/image-thumb' },
    // ── Retro ─────────────────────────────────────────────────────────────
    { k: 'snes classic', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/products/hardware/nintendo-entertainment-system/snes_classic_mini' },
    { k: 'nes classic',  url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/products/hardware/nintendo-entertainment-system/NES_Classic_Edition-01' },
    { k: 'sega genesis', url: 'https://m.media-amazon.com/images/I/71OY3-5s-PL._AC_SX679_.jpg' },
    { k: 'gamecube',     url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/GameCube-Console-Set.png/800px-GameCube-Console-Set.png' },
    { k: 'n64',          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/N64-Console-Set.png/800px-N64-Console-Set.png' },
    { k: 'gameboy color', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/GBC-Console-Set.png/800px-GBC-Console-Set.png' },
    // ── iPhone ────────────────────────────────────────────────────────────
    { k: 'iphone 15', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-pink?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 14', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-midnight?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 13', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-finish-select-202207-6-1inch-midnight?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 12', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-black-select-2020?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 11', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-black-select-2019?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone se', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-starlight?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    // ── PC Components ─────────────────────────────────────────────────────
    { k: 'rtx 4090', url: 'https://m.media-amazon.com/images/I/81MqNXHe0nL._AC_SX679_.jpg' },
    { k: 'rtx 4080', url: 'https://m.media-amazon.com/images/I/81pWfE-lbFL._AC_SX679_.jpg' },
    { k: 'rtx 3070', url: 'https://m.media-amazon.com/images/I/71XCCkDpnpL._AC_SX679_.jpg' },
    { k: 'ryzen 9 7950x', url: 'https://m.media-amazon.com/images/I/61ZKKI4fN3L._AC_SX679_.jpg' },
    { k: 'ryzen 7 5800x', url: 'https://m.media-amazon.com/images/I/61S8y6kUqsL._AC_SX679_.jpg' },
    { k: 'corsair vengeance', url: 'https://m.media-amazon.com/images/I/71FOrqJhiqL._AC_SX679_.jpg' },
    { k: 'samsung 990 pro', url: 'https://m.media-amazon.com/images/I/71IWq9BZBEL._AC_SX679_.jpg' },
    // ── Accessories ───────────────────────────────────────────────────────
    { k: 'hyperx cloud ii',   url: 'https://m.media-amazon.com/images/I/61AIo1LLMXL._AC_SX679_.jpg' },
    { k: 'dualsense',         url: 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-controller-midnight-black-01-en-14sep21?$native$' },
    { k: 'logitech g502',     url: 'https://m.media-amazon.com/images/I/71AV5o3P-YL._AC_SX679_.jpg' },
    { k: 'xbox wireless controller', url: 'https://cms-assets.xboxservices.com/assets/controller-carbon-black.png' },
    { k: 'razer blackwidow',  url: 'https://m.media-amazon.com/images/I/71uJRiMa3EL._AC_SX679_.jpg' },
    { k: 'mousepad rgb',      url: 'https://m.media-amazon.com/images/I/71nFfTv1VnL._AC_SX679_.jpg' },
    // ── Games ─────────────────────────────────────────────────────────────
    { k: 'returnal',       url: 'https://image.api.playstation.com/vulcan/ap/rnd/202010/2915/BCAS20120_00_en_US_400x500px.png' },
    { k: 'elden ring',     url: 'https://image.api.playstation.com/vulcan/ap/rnd/202109/1318/uFp1FcVcfEuTlWieBFVjNt4T.png' },
    { k: 'ratchet & clank', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202104/1714/5y3rvtKpvqKYhgLpvZIAexFN.png' },
    { k: 'last of us part i', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/8A0PGVHJ8YqnH3FDAI6mGLUH.png' },
    { k: 'gran turismo 7',  url: 'https://image.api.playstation.com/vulcan/ap/rnd/202109/2910/EDo4YRgylHBUeHrMkFbMcjO7.png' },
    { k: 'spider-man 2',    url: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/1c13a47e2f06e3a41b8cbae96f7ee82e02bd96d9ce67eed7.png' },
    { k: 'spider man 2',    url: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/1c13a47e2f06e3a41b8cbae96f7ee82e02bd96d9ce67eed7.png' },
    { k: 'god of war ragnarok', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202206/0720/ae7AuNVZOFtd20Q6fkAUAEsB.png' },
    { k: 'horizon forbidden west', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202107/3100/HO8vkO9pfLhwbCa7CaCFOSxL.png' },
    { k: 'final fantasy xvi', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202211/3015/Lv9jOxJ6wJt8OBP7SKQWX0w6.png' },
    { k: 'pokémon violet',  url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/p/pokemon-violet-switch/boxart' },
    { k: 'pokemon violet',  url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/p/pokemon-violet-switch/boxart' },
    { k: 'pokémon scarlet', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/p/pokemon-scarlet-switch/boxart' },
    { k: 'pokemon scarlet', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/p/pokemon-scarlet-switch/boxart' },
    { k: 'zelda: tears of the kingdom', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/t/the-legend-of-zelda-tears-of-the-kingdom-switch/boxart' },
    { k: 'zelda tears of the kingdom', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/t/the-legend-of-zelda-tears-of-the-kingdom-switch/boxart' },
    { k: 'metroid dread',   url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/m/metroid-dread-switch/boxart' },
    { k: 'splatoon 3',      url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/s/splatoon-3-switch/boxart' },
    { k: 'mario kart 8',    url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/m/mario-kart-8-deluxe-switch/boxart' },
    { k: 'mario bros wonder', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/s/super-mario-bros-wonder-switch/boxart' },
    { k: 'kirby and the forgotten land', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/games/switch/k/kirby-and-the-forgotten-land-switch/boxart' },
];

// Sort by key length desc for most specific match first
IMAGE_MAP.sort((a, b) => b.k.length - a.k.length);

function getImageUrl(name) {
    const n = name.toLowerCase();
    for (const { k, url } of IMAGE_MAP) {
        if (n.includes(k)) return url;
    }
    return null;
}

// ── Supabase API helper ────────────────────────────────────────────────────
function apiReq(method, path, body) {
    return new Promise((resolve, reject) => {
        const u = new (require('url').URL)(SUPABASE_URL + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method,
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
        };
        if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = https.request(opts, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: d }));
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function slugify(name) {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
    // 1. Read Excel & deduplicate by name
    const wb = XLSX.readFile('data/inventario_ecugaming_masivo.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const seen = new Set();
    const unique = rows.filter(r => {
        const k = (r.Nombre || '').toLowerCase().trim();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    console.log(`Excel: ${rows.length} rows → ${unique.length} unique names`);

    // 2. Fetch existing product names from DB
    const existing = await apiReq('GET', '/rest/v1/products?select=name&limit=2000');
    const existingNames = new Set(JSON.parse(existing.body).map(p => p.name.toLowerCase().trim()));
    console.log(`DB: ${existingNames.size} existing products`);

    // 3. Filter to truly new products
    const newProducts = unique.filter(r => !existingNames.has(r.Nombre.toLowerCase().trim()));
    console.log(`New to import: ${newProducts.length}`);

    let inserted = 0, skippedPrice = 0, skippedError = 0;

    for (const row of newProducts) {
        const name = row.Nombre.trim();
        const category_id = excelCatToDb(row.Categoria);
        const price = getPrice(name);

        if (!price) {
            console.log(`  SKIP (no price)  ${name}`);
            skippedPrice++;
            continue;
        }

        const slug = slugify(name);
        const description = `${name}. Importado de alta calidad. Envío seguro a todo Ecuador con garantía Ecu Gaming Import.`;

        // Insert product
        const pRes = await apiReq('POST', '/rest/v1/products', {
            name,
            slug,
            category_id,
            description,
            price,
            stock: 10,
            is_active: true,
        });

        if (pRes.status >= 400) {
            // Slug conflict? Retry with unique slug
            const pRes2 = await apiReq('POST', '/rest/v1/products', {
                name,
                slug: slug + '-' + Date.now(),
                category_id,
                description,
                price,
                stock: 10,
                is_active: true,
            });
            if (pRes2.status >= 400) {
                console.log(`  ERROR  ${name}: ${pRes2.body}`);
                skippedError++;
                continue;
            }
        }

        const newProd = JSON.parse(pRes.status < 400 ? pRes.body : '[]');
        const productId = Array.isArray(newProd) && newProd[0] ? newProd[0].id : null;

        // Insert image if URL found
        const imageUrl = getImageUrl(name);
        if (productId && imageUrl) {
            await apiReq('POST', '/rest/v1/product_images', {
                product_id: productId,
                storage_path: imageUrl,
                sort: 0,
            });
        }

        const imgStatus = imageUrl ? '🖼️' : '  ';
        console.log(`  ✅ ${imgStatus} $${price}   ${name}`);
        inserted++;
    }

    console.log(`\nDone: ${inserted} inserted, ${skippedPrice} skipped (no price), ${skippedError} errors`);
}

main().catch(console.error);
