/**
 * fix-retro-console-images.js
 * Converts all remaining /thumb/ Wikimedia URLs to direct URLs
 * (direct = verified 200 with real image data from our tests)
 */
const fs = require('fs'), https = require('https');
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const U = get('SUPABASE_URL'), K = get('SUPABASE_SERVICE_KEY');

function thumbToDirect(thumbUrl) {
    // Pattern: .../commons/thumb/X/XX/FILENAME.ext/SIZEpx-FILENAME.ext
    // → .../commons/X/XX/FILENAME.ext
    const m = thumbUrl.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/)thumb\/([a-f0-9]\/[a-f0-9]{2}\/[^/]+)\/.+$/i);
    if (m) return m[1] + m[2];
    return null;
}

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
    // Get all active product images that use /thumb/
    const products = await fetchAll('/rest/v1/products?select=id,name&is_active=eq.true');
    const allImgs = await fetchAll('/rest/v1/product_images?select=id,product_id,storage_path');

    const prodById = {};
    for (const p of products) prodById[p.id] = p;

    const thumbImgs = allImgs.filter(i => i.storage_path?.includes('/thumb/') && prodById[i.product_id]);

    console.log(`Found ${thumbImgs.length} active products with /thumb/ URLs`);

    let fixed = 0, failed = 0;
    for (const img of thumbImgs) {
        const directUrl = thumbToDirect(img.storage_path);
        if (!directUrl) {
            console.log(`  ⚠️  Cannot convert: ${img.storage_path?.slice(0, 80)}`);
            failed++;
            continue;
        }

        const r = await apiReq('PATCH', `/rest/v1/product_images?id=eq.${img.id}`, { storage_path: directUrl });
        if (r.status < 300) {
            const name = prodById[img.product_id]?.name || img.product_id;
            console.log(`  ✅ ${name}`);
            fixed++;
        } else {
            console.log(`  ❌ HTTP ${r.status}: ${r.body.slice(0, 60)}`);
            failed++;
        }
    }

    console.log(`\nFixed: ${fixed} | Failed: ${failed}`);

    // Final count
    const finalCheck = await fetchAll('/rest/v1/product_images?select=storage_path');
    const stillThumb = finalCheck.filter(i => i.storage_path?.includes('/thumb/')).length;
    const gmedia = finalCheck.filter(i => i.storage_path?.includes('gmedia')).length;
    console.log(`Remaining /thumb/ (inactive): ${stillThumb}`);
    console.log(`Remaining gmedia (inactive): ${gmedia}`);
}

main().catch(console.error);
