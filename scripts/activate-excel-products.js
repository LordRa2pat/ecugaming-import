/**
 * activate-excel-products.js
 * Activates Excel products in DB:
 * - Sets is_active=true
 * - Fixes price to Amazon USA value
 * - Adds official image if none exists
 */
const fs = require('fs');
const https = require('https');
const XLSX = require('xlsx');

const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const SUPABASE_URL = get('SUPABASE_URL');
const SUPABASE_KEY = get('SUPABASE_SERVICE_KEY');

// ── Price Map ───────────────────────────────────────────────────────────────
const PRICE_MAP = [
    { k: 'ps5 slim',             p: 449.99 },
    { k: 'ps5',                  p: 499.99 },
    { k: 'ps4 pro',              p: 299.99 },
    { k: 'xbox series x',        p: 499.99 },
    { k: 'xbox series s',        p: 299.99 },
    { k: 'nintendo switch oled', p: 349.99 },
    { k: 'nintendo switch lite', p: 199.99 },
    { k: 'nintendo switch',      p: 299.99 },
    { k: 'snes classic',         p: 99.99  },
    { k: 'nes classic',          p: 79.99  },
    { k: 'sega genesis',         p: 59.99  },
    { k: 'gamecube',             p: 149.99 },
    { k: 'n64',                  p: 129.99 },
    { k: 'gameboy color',        p: 79.99  },
    { k: 'iphone 15 1tb',        p: 1099.99 },
    { k: 'iphone 15 512gb',      p: 999.99  },
    { k: 'iphone 15 256gb',      p: 899.99  },
    { k: 'iphone 15',            p: 799.99  },
    { k: 'iphone 14 1tb',        p: 999.99  },
    { k: 'iphone 14 512gb',      p: 899.99  },
    { k: 'iphone 14 256gb',      p: 799.99  },
    { k: 'iphone 14 128gb',      p: 699.99  },
    { k: 'iphone 14',            p: 699.99  },
    { k: 'iphone 13 1tb',        p: 899.99  },
    { k: 'iphone 13 512gb',      p: 799.99  },
    { k: 'iphone 13 256gb',      p: 699.99  },
    { k: 'iphone 13 128gb',      p: 599.99  },
    { k: 'iphone 13',            p: 599.99  },
    { k: 'iphone 12 1tb',        p: 699.99  },
    { k: 'iphone 12 512gb',      p: 649.99  },
    { k: 'iphone 12 256gb',      p: 549.99  },
    { k: 'iphone 12 128gb',      p: 499.99  },
    { k: 'iphone 12',            p: 499.99  },
    { k: 'iphone 11 1tb',        p: 429.99  },
    { k: 'iphone 11 512gb',      p: 379.99  },
    { k: 'iphone 11 256gb',      p: 329.99  },
    { k: 'iphone 11 128gb',      p: 279.99  },
    { k: 'iphone 11',            p: 279.99  },
    { k: 'iphone se',            p: 429.99  },
    { k: 'rtx 4090',             p: 1599.99 },
    { k: 'rtx 4080',             p: 799.99  },
    { k: 'rtx 3070',             p: 399.99  },
    { k: 'ryzen 9 7950x',        p: 549.99  },
    { k: 'ryzen 7 5800x',        p: 229.99  },
    { k: 'corsair vengeance 32gb', p: 89.99 },
    { k: 'samsung 990 pro 2tb',  p: 149.99  },
    { k: 'hyperx cloud ii',      p: 49.99   },
    { k: 'dualsense',            p: 69.99   },
    { k: 'mousepad rgb xl',      p: 19.99   },
    { k: 'logitech g502',        p: 39.99   },
    { k: 'xbox wireless controller', p: 59.99 },
    { k: 'razer blackwidow',     p: 79.99   },
    { k: 'returnal',             p: 49.99   },
    { k: 'elden ring',           p: 39.99   },
    { k: 'ratchet & clank',      p: 39.99   },
    { k: 'the last of us part i', p: 39.99  },
    { k: 'gran turismo 7',       p: 29.99   },
    { k: 'spider-man 2',         p: 49.99   },
    { k: 'spider man 2',         p: 49.99   },
    { k: 'god of war ragnarok',  p: 39.99   },
    { k: 'horizon forbidden west', p: 29.99 },
    { k: 'final fantasy xvi',    p: 39.99   },
    { k: 'pokémon violet',       p: 49.99   },
    { k: 'pokemon violet',       p: 49.99   },
    { k: 'pokémon scarlet',      p: 49.99   },
    { k: 'pokemon scarlet',      p: 49.99   },
    { k: 'zelda: tears of the kingdom', p: 59.99 },
    { k: 'metroid dread',        p: 49.99   },
    { k: 'splatoon 3',           p: 49.99   },
    { k: 'mario kart 8',         p: 49.99   },
    { k: 'mario bros wonder',    p: 59.99   },
    { k: 'kirby and the forgotten land', p: 49.99 },
];
PRICE_MAP.sort((a, b) => b.k.length - a.k.length);

function getPrice(name) {
    const n = name.toLowerCase();
    for (const { k, p } of PRICE_MAP) {
        if (n.includes(k)) return p;
    }
    return null;
}

// ── Image Map ───────────────────────────────────────────────────────────────
const IMAGE_MAP = [
    { k: 'ps5 slim', url: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-01-en-31aug23?$native$' },
    { k: 'ps5',      url: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-console-selection-group-image-block-01-en-14sep21?$native$' },
    { k: 'ps4 pro',  url: 'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-product-thumbnail-01-en-14sep21?$native$' },
    { k: 'xbox series x', url: 'https://www.xbox.com/content/dam/xbox/en-us/consoles/xbox-series-x/xbox-series-x-hero.png' },
    { k: 'xbox series s', url: 'https://www.xbox.com/content/dam/xbox/en-us/consoles/xbox-series-s/xbox-series-s-hero.png' },
    { k: 'nintendo switch oled', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-white-set/image-thumb' },
    { k: 'nintendo switch lite', url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-lite-yellow/image-thumb' },
    { k: 'nintendo switch',      url: 'https://assets.nintendo.com/image/upload/ar_1:1,c_scale,q_auto,w_480/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-neon-blue-red-set/image-thumb' },
    { k: 'snes classic', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/SNES-Classic-Mini-Console-FL.jpg/800px-SNES-Classic-Mini-Console-FL.jpg' },
    { k: 'nes classic',  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/NES-Classic-Mini-Console-FL.jpg/800px-NES-Classic-Mini-Console-FL.jpg' },
    { k: 'sega genesis', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Sega-Genesis-Mod2-Set.jpg/800px-Sega-Genesis-Mod2-Set.jpg' },
    { k: 'gamecube',     url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/GameCube-Console-Set.png/800px-GameCube-Console-Set.png' },
    { k: 'n64',          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/N64-Console-Set.png/800px-N64-Console-Set.png' },
    { k: 'gameboy color', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/GBC-Console-Set.png/800px-GBC-Console-Set.png' },
    { k: 'iphone 15', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-pink?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 14', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-midnight?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 13', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-finish-select-202207-6-1inch-midnight?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 12', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-black-select-2020?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone 11', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-black-select-2019?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'iphone se', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-starlight?wid=800&hei=800&fmt=p-jpg&qlt=80' },
    { k: 'rtx 4090', url: 'https://m.media-amazon.com/images/I/81MqNXHe0nL._AC_SX679_.jpg' },
    { k: 'rtx 4080', url: 'https://m.media-amazon.com/images/I/81pWfE-lbFL._AC_SX679_.jpg' },
    { k: 'rtx 3070', url: 'https://m.media-amazon.com/images/I/71XCCkDpnpL._AC_SX679_.jpg' },
    { k: 'ryzen 9 7950x', url: 'https://m.media-amazon.com/images/I/61ZKKI4fN3L._AC_SX679_.jpg' },
    { k: 'ryzen 7 5800x', url: 'https://m.media-amazon.com/images/I/61S8y6kUqsL._AC_SX679_.jpg' },
    { k: 'corsair vengeance', url: 'https://m.media-amazon.com/images/I/71FOrqJhiqL._AC_SX679_.jpg' },
    { k: 'samsung 990 pro', url: 'https://m.media-amazon.com/images/I/71IWq9BZBEL._AC_SX679_.jpg' },
    { k: 'hyperx cloud ii',   url: 'https://m.media-amazon.com/images/I/61AIo1LLMXL._AC_SX679_.jpg' },
    { k: 'dualsense',         url: 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-controller-midnight-black-01-en-14sep21?$native$' },
    { k: 'logitech g502',     url: 'https://m.media-amazon.com/images/I/71AV5o3P-YL._AC_SX679_.jpg' },
    { k: 'xbox wireless controller', url: 'https://m.media-amazon.com/images/I/61gLbvfPRQL._AC_SX679_.jpg' },
    { k: 'razer blackwidow',  url: 'https://m.media-amazon.com/images/I/71uJRiMa3EL._AC_SX679_.jpg' },
    { k: 'mousepad rgb',      url: 'https://m.media-amazon.com/images/I/71nFfTv1VnL._AC_SX679_.jpg' },
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
IMAGE_MAP.sort((a, b) => b.k.length - a.k.length);

function getImageUrl(name) {
    const n = name.toLowerCase();
    for (const { k, url } of IMAGE_MAP) {
        if (n.includes(k)) return url;
    }
    return null;
}

// ── API helpers ─────────────────────────────────────────────────────────────
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
                Prefer: method === 'GET' ? 'count=exact' : 'return=representation',
            },
        };
        if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = https.request(opts, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: d, headers: r.headers }));
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// Fetch all pages of a query
async function fetchAll(path) {
    const pageSize = 1000;
    let offset = 0;
    let all = [];
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

async function main() {
    // 1. Read Excel & get unique names
    const wb = XLSX.readFile('data/inventario_ecugaming_masivo.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const seen = new Set();
    const excelProducts = rows.filter(r => {
        const k = (r.Nombre || '').toLowerCase().trim();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    console.log(`Excel unique products: ${excelProducts.length}`);
    const excelNames = new Set(excelProducts.map(r => r.Nombre.toLowerCase().trim()));

    // 2. Fetch all DB products (paginated)
    console.log('Fetching all DB products...');
    const allDbProducts = await fetchAll('/rest/v1/products?select=id,name,is_active,price');
    console.log(`DB total: ${allDbProducts.length} products`);

    // 3. Fetch all existing product_image product_ids (to avoid adding duplicates)
    const allImages = await fetchAll('/rest/v1/product_images?select=product_id');
    const withImage = new Set(allImages.map(i => i.product_id));
    console.log(`Products with images: ${withImage.size}`);

    let activated = 0, priceFixed = 0, imageAdded = 0, noPrice = 0;

    for (const dbProd of allDbProducts) {
        const nameKey = dbProd.name.toLowerCase().trim();
        if (!excelNames.has(nameKey)) continue; // not from Excel, skip

        const price = getPrice(dbProd.name);
        if (!price) { noPrice++; continue; }

        const imageUrl = getImageUrl(dbProd.name);
        const needsActivation = !dbProd.is_active;
        const needsPriceFix = Math.abs(parseFloat(dbProd.price) - price) > 0.005;

        // Update product if needed
        if (needsActivation || needsPriceFix) {
            const patch = {};
            if (needsActivation) patch.is_active = true;
            if (needsPriceFix) patch.price = price;
            await apiReq('PATCH', `/rest/v1/products?id=eq.${dbProd.id}`, patch);
            if (needsActivation) activated++;
            if (needsPriceFix) priceFixed++;
        }

        // Add image if missing
        if (imageUrl && !withImage.has(dbProd.id)) {
            await apiReq('POST', '/rest/v1/product_images', {
                product_id: dbProd.id,
                storage_path: imageUrl,
                sort: 0,
            });
            imageAdded++;
            withImage.add(dbProd.id); // mark as done
        }

        const actions = [
            needsActivation ? '✅ACTIVADO' : '',
            needsPriceFix ? `💲$${price}` : '',
            (imageUrl && imageAdded > 0 && !withImage.has(dbProd.id + '_done')) ? '🖼️IMG' : '',
        ].filter(Boolean).join(' ');
        if (actions) console.log(`  ${actions}  ${dbProd.name}`);
    }

    console.log(`\nDone:`);
    console.log(`  Activated:    ${activated}`);
    console.log(`  Price fixed:  ${priceFixed}`);
    console.log(`  Images added: ${imageAdded}`);
    console.log(`  No price:     ${noPrice}`);
}

main().catch(console.error);
