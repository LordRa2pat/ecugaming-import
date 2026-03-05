/**
 * fix-broken-images.js
 * Fixes the 9 products with confirmed broken (404) or blocked (403) image URLs.
 */
const fs = require('fs'), https = require('https');
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const U = get('SUPABASE_URL'), K = get('SUPABASE_SERVICE_KEY');

// Map broken storage_path → working replacement
// Steam CDN (✅ 200 verified), Wikimedia (⚠️ 429 = rate-limited server, works in browser)
const FIXES = [
    // 404 Wikipedia game covers → Steam CDN (these games have PC ports)
    {
        match: 'Marvel%27s_Spider-Man_2_cover_art.jpg',
        url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2552500/header.jpg',
        label: 'Spider-Man 2',
    },
    {
        match: 'God_of_War_Ragnar%C3%B6k_cover.jpg',
        url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2322010/header.jpg',
        label: 'God of War Ragnarök',
    },
    {
        match: 'Death_Stranding_Director%27s_Cut.jpg',
        url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1850570/header.jpg',
        label: 'Death Stranding DC',
    },
    // 404 Wikipedia game covers → correct Wikipedia paths
    {
        match: 'Bloodborne_Cover_Artwork.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/en/b/b5/Bloodborne.jpg',
        label: 'Bloodborne',
    },
    {
        match: 'The_Last_of_Us_Part_II_Box_Art.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/en/4/41/The_Last_of_Us_Part_II.jpg',
        label: 'TLOU Part II',
    },
    {
        match: 'Stellar_Blade_cover_art.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/en/3/30/Stellar_Blade.jpg',
        label: 'Stellar Blade',
    },
    // gmedia.playstation.com (403) → Wikimedia Commons
    {
        match: 'playstation-portal-remote-player',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/PlayStation_Portal.jpg/640px-PlayStation_Portal.jpg',
        label: 'PlayStation Portal',
    },
    {
        match: 'pulse3d-wireless-headset-product-thumbnail-02',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Pulse_3D_Wireless_Headset.jpg/640px-Pulse_3D_Wireless_Headset.jpg',
        label: 'Pulse 3D - Blanco',
    },
    {
        match: 'pulse3d-wireless-headset-midnight',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Pulse_3D_Wireless_Headset.jpg/640px-Pulse_3D_Wireless_Headset.jpg',
        label: 'Pulse 3D - Midnight Black',
    },
];

function apiReq(method, path, body) {
    return new Promise((resolve, reject) => {
        const u = new (require('url').URL)(U + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: u.hostname, path: u.pathname + u.search, method,
            headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
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
    console.log('Fetching all product images...');
    const allImgs = await fetchAll('/rest/v1/product_images?select=id,product_id,storage_path');
    console.log(`Total images: ${allImgs.length}`);

    let fixed = 0;
    for (const fix of FIXES) {
        const img = allImgs.find(i => i.storage_path && i.storage_path.includes(fix.match));
        if (!img) { console.log(`  NOT FOUND: ${fix.label} (${fix.match})`); continue; }

        const r = await apiReq('PATCH', `/rest/v1/product_images?id=eq.${img.id}`, { storage_path: fix.url });
        if (r.status < 300) {
            console.log(`  ✅ ${fix.label}`);
            fixed++;
        } else {
            console.log(`  ❌ ${fix.label} — HTTP ${r.status}: ${r.body.slice(0, 80)}`);
        }
    }

    console.log(`\nFixed ${fixed}/${FIXES.length} images.`);

    // Final verification
    console.log('\nVerifying — remaining gmedia/broken:');
    const check = await fetchAll('/rest/v1/product_images?select=storage_path');
    const stillBad = check.filter(i => i.storage_path && i.storage_path.includes('gmedia.playstation.com'));
    console.log(`gmedia remaining: ${stillBad.length}`);
    if (stillBad.length > 0) stillBad.forEach(i => console.log('  ' + i.storage_path.slice(0, 80)));
}

main().catch(console.error);
