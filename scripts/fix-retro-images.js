/**
 * fix-retro-images.js — Find and update broken retro console images
 * Uses Wikimedia API to get verified image URLs
 */
const https = require('https');
const SUPABASE_URL = 'https://dpomkchvjpdkndkksphy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb21rY2h2anBka25ka2tzcGh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ5NDg5OCwiZXhwIjoyMDg4MDcwODk4fQ.ozc20Sicro_jT3aV7Ipsyn6b0s_08pN4zSITlOcA88g';

// Products with known broken images → Wikimedia file names to search
const FIXES = [
    {
        id: '64e8f89a-ddcf-44e2-9ee8-2cf5314a3cb9',
        name: 'Game Boy Advance SP',
        wikiFile: 'GBA-SP-SilverPearl.jpg',
        fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/GBA-SP-SilverPearl.jpg/480px-GBA-SP-SilverPearl.jpg'
    },
    {
        id: '2c567d12-8738-4d01-b9cb-132aa5fe2f7f',
        name: 'Nintendo 3DS XL',
        wikiFile: 'Nintendo-3DS-XL-AnB.jpg',
        fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Nintendo-3DS-XL-AnB.jpg/480px-Nintendo-3DS-XL-AnB.jpg'
    },
    {
        id: '32380938-0787-4e09-b606-f31904126348',
        name: 'PlayStation Vita',
        wikiFile: 'PlayStation-Vita-2001-FL.jpg',
        fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/PlayStation-Vita-2001-FL.jpg/480px-PlayStation-Vita-2001-FL.jpg'
    },
    {
        id: 'cf56569c-3689-4f91-baa2-a0ff2415a5b9',
        name: 'Sega Genesis Mini 2',
        wikiFile: 'Sega-Mega-Drive-Mini-2.jpg',
        fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Sega-Mega-Drive-Mini-FL.jpg/480px-Sega-Mega-Drive-Mini-FL.jpg'
    },
    {
        id: 'f2cbd49c-1bc6-43f7-b993-5a0e980e3641',
        name: 'Retro Console 256GB - 30,000 Juegos',
        wikiFile: null,
        // Use a generic retro gaming console image
        fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Famiclone-FW-3326_with_controllers.jpg/480px-Famiclone-FW-3326_with_controllers.jpg'
    },
];

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'EcuGamingBot/1.0' } }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

async function getWikimediaUrl(filename) {
    const api = `https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
    const { data } = await fetch(api);
    const json = JSON.parse(data);
    const pages = json.query.pages;
    const page = Object.values(pages)[0];
    if (page.imageinfo && page.imageinfo[0]) return page.imageinfo[0].url;
    return null;
}

async function testUrl(url) {
    try {
        const { status } = await fetch(url);
        return status >= 200 && status < 400;
    } catch { return false; }
}

async function updateImage(productId, imageUrl) {
    const url = `${SUPABASE_URL}/rest/v1/product_images?product_id=eq.${productId}`;
    const body = JSON.stringify({ storage_path: imageUrl });
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)
            }
        }, res => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', reject);
        req.write(body); req.end();
    });
}

(async () => {
    console.log('Fixing retro console images...\n');

    for (const item of FIXES) {
        let imageUrl = item.fallback;

        // Try to get from Wikimedia API first
        if (item.wikiFile) {
            try {
                const wikiUrl = await getWikimediaUrl(item.wikiFile);
                if (wikiUrl) {
                    const ok = await testUrl(wikiUrl);
                    if (ok) { imageUrl = wikiUrl; console.log(`  Wiki OK: ${wikiUrl.slice(-50)}`); }
                    else console.log(`  Wiki 404, using fallback`);
                }
            } catch (e) { console.log(`  Wiki error: ${e.message}, using fallback`); }
        }

        // Test fallback
        const ok = await testUrl(imageUrl);
        console.log(`${ok ? '✓' : '?'} ${item.name}`);
        console.log(`  URL: ${imageUrl}`);

        const status = await updateImage(item.id, imageUrl);
        console.log(`  DB: ${status === 204 ? 'updated' : `status ${status}`}\n`);
    }

    console.log('Done.');
})();
