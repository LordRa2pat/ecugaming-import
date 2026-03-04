/**
 * fix-accessory-images.js
 * Replaces broken/hotlink-blocked image URLs for accessories and
 * any product with a known-bad storage_path.
 */
const fs = require('fs'), https = require('https');
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const U = get('SUPABASE_URL'), K = get('SUPABASE_SERVICE_KEY');

// Reliable, embeddable image URLs (no hotlink protection)
const FIXES = [
    {
        name: 'logitech g502',
        url: 'https://resource.logitech.com/content/dam/gaming/en/products/g502-x/g502-x-gallery-1.png',
    },
    {
        name: 'xbox wireless controller',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Xbox_One_Wireless_Controller.jpg/640px-Xbox_One_Wireless_Controller.jpg',
    },
    {
        name: 'hyperx cloud ii',
        url: 'https://m.media-amazon.com/images/I/61AIo1LLMXL._SX679_.jpg',
    },
    {
        name: 'mousepad rgb xl',
        url: 'https://m.media-amazon.com/images/I/71RFuVFRxuL._SX679_.jpg',
    },
    {
        name: 'razer blackwidow',
        url: 'https://m.media-amazon.com/images/I/71uJRiMa3EL._SX679_.jpg',
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

async function main() {
    for (const fix of FIXES) {
        // Find product by name (case-insensitive)
        const r = await apiReq('GET', `/rest/v1/products?select=id,name&is_active=eq.true&name=ilike.*${encodeURIComponent(fix.name)}*&limit=5`);
        const products = JSON.parse(r.body);
        if (!products.length) { console.log(`  NOT FOUND: ${fix.name}`); continue; }

        for (const p of products) {
            // Update or insert image
            const imgR = await apiReq('GET', `/rest/v1/product_images?select=id&product_id=eq.${p.id}&limit=1`);
            const imgs = JSON.parse(imgR.body);
            if (imgs.length) {
                // Update existing
                await apiReq('PATCH', `/rest/v1/product_images?id=eq.${imgs[0].id}`, { storage_path: fix.url });
            } else {
                // Insert new
                await apiReq('POST', '/rest/v1/product_images', { product_id: p.id, storage_path: fix.url, sort: 0 });
            }
            console.log(`  ✅  ${p.name}`);
        }
    }
    console.log('Done');
}
main().catch(console.error);
