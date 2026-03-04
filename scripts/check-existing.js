const fs = require('fs');
const https = require('https');
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const URL = get('SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_KEY');

function apiGet(path) {
    return new Promise((resolve, reject) => {
        const u = new (require('url').URL)(URL + path);
        https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }, r => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
}

apiGet('/rest/v1/products?select=name&is_active=eq.true&limit=1000').then(products => {
    console.log('Existing products in DB:', products.length);
    products.slice(0, 20).forEach(p => console.log('  ' + p.name));
    console.log('...');
});
