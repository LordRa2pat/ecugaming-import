/**
 * dedup-products.js
 * For each group of active products with the same name:
 * - Keeps the one with the best data (has image, lowest id = oldest)
 * - Deactivates the rest (is_active=false)
 */
const fs = require('fs');
const https = require('https');

const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const SUPABASE_URL = get('SUPABASE_URL');
const SUPABASE_KEY = get('SUPABASE_SERVICE_KEY');

function apiReq(method, path, body) {
    return new Promise((resolve, reject) => {
        const u = new (require('url').URL)(SUPABASE_URL + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: u.hostname, path: u.pathname + u.search, method,
            headers: {
                apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY,
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

async function main() {
    // Fetch all active products
    const products = await fetchAll('/rest/v1/products?select=id,name,price,created_at&is_active=eq.true');
    console.log(`Active products: ${products.length}`);

    // Fetch all products with images
    const images = await fetchAll('/rest/v1/product_images?select=product_id');
    const withImage = new Set(images.map(i => i.product_id));

    // Group by lowercase name
    const groups = {};
    for (const p of products) {
        const key = p.name.toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    }

    let deactivated = 0;
    const dupeGroups = Object.values(groups).filter(g => g.length > 1);
    console.log(`Duplicate groups: ${dupeGroups.length}`);

    for (const group of dupeGroups) {
        // Prefer: has image > older created_at
        group.sort((a, b) => {
            const aImg = withImage.has(a.id) ? 0 : 1;
            const bImg = withImage.has(b.id) ? 0 : 1;
            if (aImg !== bImg) return aImg - bImg;
            return new Date(a.created_at) - new Date(b.created_at);
        });

        const keep = group[0];
        const deactivate = group.slice(1);

        for (const p of deactivate) {
            await apiReq('PATCH', `/rest/v1/products?id=eq.${p.id}`, { is_active: false });
            deactivated++;
        }
        console.log(`  Keep: ${keep.name} (${group.length} total, ${deactivate.length} deactivated)`);
    }

    console.log(`\nDone: ${deactivated} duplicates deactivated`);

    // Final count
    const finalActive = await fetchAll('/rest/v1/products?select=id&is_active=eq.true');
    console.log(`Final active products: ${finalActive.length}`);
}

main().catch(console.error);
