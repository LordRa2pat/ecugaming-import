/**
 * update-game-prices.js
 * Updates game prices to approximate Amazon USA retail prices.
 * Matches by lowercase product name keywords.
 */
const fs = require('fs');
const https = require('https');

const prod = fs.readFileSync('.env.prod', 'utf8');
const get = key => { const m = prod.match(new RegExp(key + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g, '') : ''; };
const SUPABASE_URL = get('SUPABASE_URL');
const SUPABASE_KEY = get('SUPABASE_SERVICE_KEY');

// Amazon USA prices (as of 2025) — matched by lowercase keywords in product name
const PRICE_MAP = [
    // Bundles / Special editions (check first)
    { k: 'final fantasy xvi + final fantasy vii rebirth bundle', p: 59.99 },
    { k: 'final fantasy xvi + final fantasy vii', p: 59.99 },
    { k: 'elden ring: shadow of the erdtree', p: 59.99 },
    { k: 'elden ring shadow of the erdtree', p: 59.99 },
    { k: 'god of war: ragnarök - valhalla', p: 49.99 },
    { k: 'god of war ragnarök - valhalla', p: 49.99 },
    { k: 'god of war: ragnarok - valhalla', p: 49.99 },
    { k: 'horizon: forbidden west - complete', p: 39.99 },
    { k: 'horizon forbidden west - complete', p: 39.99 },
    { k: 'alan wake 2 - deluxe', p: 39.99 },
    { k: 'alan wake 2 deluxe', p: 39.99 },
    { k: 'assassin\'s creed valhalla - complete', p: 19.99 },
    { k: 'cyberpunk 2077: ultimate', p: 39.99 },
    { k: 'cyberpunk 2077 ultimate', p: 39.99 },
    { k: 'devil may cry 5 + devil may cry 4 bundle', p: 19.99 },
    { k: 'devil may cry 5 special edition', p: 19.99 },
    { k: 'devil may cry 5 + devil', p: 19.99 },
    { k: 'mortal kombat 11 ultimate', p: 19.99 },
    { k: 'nba 2k24 kobe bryant', p: 19.99 },
    { k: 'monster hunter rise: sunbreak', p: 19.99 },
    { k: 'monster hunter: world - iceborne', p: 19.99 },
    { k: 'monster hunter world iceborne', p: 19.99 },
    { k: 'crash bandicoot 4', p: 19.99 },
    { k: 'crash team rumble deluxe', p: 9.99 },
    { k: 'bioshock: the collection', p: 14.99 },
    { k: 'borderlands 3: ultimate', p: 14.99 },
    { k: 'borderlands 3 ultimate', p: 14.99 },
    { k: 'kingdom hearts iii + re mind', p: 19.99 },
    { k: 'kingdom hearts iii', p: 19.99 },
    { k: 'star wars jedi: fallen order deluxe', p: 14.99 },
    { k: 'star wars jedi fallen order', p: 14.99 },
    { k: 'star wars jedi: survivor', p: 29.99 },
    { k: 'star wars jedi survivor', p: 29.99 },
    { k: 'spyro reignited', p: 14.99 },
    { k: 'tekken 7 - legendary', p: 14.99 },
    { k: 'tekken 7 legendary', p: 14.99 },
    { k: 'stranger of paradise', p: 14.99 },
    // Base games
    { k: 'a plague tale: requiem', p: 29.99 },
    { k: 'a plague tale requiem', p: 29.99 },
    { k: 'alan wake 2', p: 29.99 },
    { k: "assassin's creed mirage", p: 19.99 },
    { k: 'assassin\'s creed mirage', p: 19.99 },
    { k: 'avatar: frontiers of pandora', p: 29.99 },
    { k: 'avatar frontiers', p: 29.99 },
    { k: "baldur's gate 3", p: 49.99 },
    { k: 'baldur\'s gate 3', p: 49.99 },
    { k: 'call of duty: modern warfare iii', p: 49.99 },
    { k: 'call of duty: modern warfare ii', p: 29.99 },
    { k: 'call of duty modern warfare iii', p: 49.99 },
    { k: 'call of duty modern warfare ii', p: 29.99 },
    { k: 'crisis core: final fantasy vii reunion', p: 19.99 },
    { k: 'crisis core final fantasy', p: 19.99 },
    { k: 'dead space remake', p: 29.99 },
    { k: 'death stranding', p: 19.99 },
    { k: 'deathloop', p: 9.99 },
    { k: "demon's souls remake", p: 29.99 },
    { k: 'demon\'s souls', p: 29.99 },
    { k: 'destroy all humans', p: 9.99 },
    { k: 'diablo iv', p: 39.99 },
    { k: 'dragon ball z: kakarot', p: 19.99 },
    { k: 'dragon ball z kakarot', p: 19.99 },
    { k: "dragon's dogma 2", p: 49.99 },
    { k: 'dragon\'s dogma 2', p: 49.99 },
    { k: 'dying light 2', p: 19.99 },
    { k: 'ea sports fc 25', p: 39.99 },
    { k: 'ea sports fc 24', p: 19.99 },
    { k: 'efootball 2024', p: 9.99 },
    { k: 'elden ring', p: 39.99 },
    { k: 'f1 24', p: 29.99 },
    { k: 'f1 23', p: 19.99 },
    { k: 'far cry 6', p: 14.99 },
    { k: 'fifa 23', p: 9.99 },
    { k: 'final fantasy vii rebirth', p: 39.99 },
    { k: 'final fantasy xvi', p: 39.99 },
    { k: 'forspoken', p: 9.99 },
    { k: 'ghost of tsushima', p: 39.99 },
    { k: 'ghostbusters: spirits unleashed', p: 19.99 },
    { k: 'ghostbusters spirits unleashed', p: 19.99 },
    { k: 'ghostwire: tokyo', p: 14.99 },
    { k: 'ghostwire tokyo', p: 14.99 },
    { k: 'god of war: ragnarök', p: 39.99 },
    { k: 'god of war ragnarök', p: 39.99 },
    { k: 'god of war: ragnarok', p: 39.99 },
    { k: 'gotham knights', p: 19.99 },
    { k: 'gran turismo 7', p: 29.99 },
    { k: 'gta v premium', p: 19.99 },
    { k: 'hogwarts legacy', p: 29.99 },
    { k: 'horizon: forbidden west', p: 29.99 },
    { k: 'horizon forbidden west', p: 29.99 },
    { k: 'it takes two', p: 19.99 },
    { k: 'kena: bridge of spirits', p: 19.99 },
    { k: 'kena bridge of spirits', p: 19.99 },
    { k: 'kirby and the forgotten land', p: 49.99 },
    { k: 'lies of p', p: 29.99 },
    { k: 'like a dragon: infinite wealth', p: 49.99 },
    { k: 'like a dragon infinite wealth', p: 49.99 },
    { k: 'like a dragon: ishin', p: 29.99 },
    { k: 'like a dragon ishin', p: 29.99 },
    { k: 'madden nfl 25', p: 39.99 },
    { k: 'mafia: definitive edition', p: 14.99 },
    { k: 'mafia definitive', p: 14.99 },
    { k: 'mario bros wonder', p: 59.99 },
    { k: 'mario kart 8', p: 49.99 },
    { k: "marvel's spider-man 2", p: 49.99 },
    { k: 'marvel\'s spider-man 2', p: 49.99 },
    { k: "marvel's spider-man: miles morales", p: 29.99 },
    { k: 'marvel\'s spider-man: miles morales', p: 29.99 },
    { k: 'metroid dread', p: 49.99 },
    { k: 'monster hunter rise', p: 19.99 },
    { k: 'mortal kombat 1', p: 39.99 },
    { k: 'nba 2k25', p: 14.99 },
    { k: 'nioh 2', p: 19.99 },
    { k: 'overwatch 2 - coins 10000', p: 19.99 },
    { k: 'overwatch 2', p: 19.99 },
    { k: "palworld (collector's edition)", p: 44.99 },
    { k: 'palworld', p: 44.99 },
    { k: 'persona 3 reload', p: 39.99 },
    { k: 'persona 5 royal', p: 29.99 },
    { k: 'pokémon scarlet', p: 49.99 },
    { k: 'pokemon scarlet', p: 49.99 },
    { k: 'pokémon violet', p: 49.99 },
    { k: 'pokemon violet', p: 49.99 },
    { k: 'prince of persia: the lost crown', p: 19.99 },
    { k: 'prince of persia the lost crown', p: 19.99 },
    { k: 'ratchet & clank: rift apart', p: 39.99 },
    { k: 'ratchet & clank rift apart', p: 39.99 },
    { k: 'red dead redemption 2', p: 19.99 },
    { k: 'remnant ii: ultimate edition', p: 39.99 },
    { k: 'remnant ii ultimate', p: 39.99 },
    { k: 'resident evil 4 remake', p: 29.99 },
    { k: 'resident evil village', p: 19.99 },
    { k: 'returnal', p: 49.99 },
    { k: 'rise of the ronin', p: 59.99 },
    { k: 'sackboy: a big adventure', p: 19.99 },
    { k: 'sackboy a big adventure', p: 19.99 },
    { k: 'sekiro: shadows die twice', p: 39.99 },
    { k: 'sekiro shadows die twice', p: 39.99 },
    { k: 'sifu', p: 19.99 },
    { k: 'sonic frontiers', p: 19.99 },
    { k: 'sonic superstars', p: 39.99 },
    { k: "spider-man 2", p: 49.99 },
    { k: 'spider-man 2', p: 49.99 },
    { k: 'splatoon 3', p: 49.99 },
    { k: 'stray', p: 19.99 },
    { k: 'street fighter 6', p: 29.99 },
    { k: 'suicide squad: kill the justice league', p: 9.99 },
    { k: 'suicide squad kill', p: 9.99 },
    { k: 'tekken 8', p: 39.99 },
    { k: 'the callisto protocol', p: 14.99 },
    { k: 'the last of us part ii remastered', p: 29.99 },
    { k: 'the last of us part i', p: 39.99 },
    { k: 'the quarry', p: 19.99 },
    { k: "tiny tina's wonderlands", p: 14.99 },
    { k: "tiny tina's", p: 14.99 },
    { k: 'ufc 5', p: 29.99 },
    { k: 'uncharted: legacy of thieves', p: 19.99 },
    { k: 'uncharted legacy of thieves', p: 19.99 },
    { k: 'watch dogs: legion', p: 9.99 },
    { k: 'watch dogs legion', p: 9.99 },
    { k: 'wo long: fallen dynasty', p: 19.99 },
    { k: 'wo long fallen dynasty', p: 19.99 },
    { k: 'wwe 2k24', p: 39.99 },
    { k: 'zelda: tears of the kingdom', p: 59.99 },
    { k: 'zelda tears of the kingdom', p: 59.99 },
];

function getPrice(name) {
    const n = name.toLowerCase();
    for (const { k, p } of PRICE_MAP) {
        if (n.includes(k)) return p;
    }
    return null;
}

function apiReq(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
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

async function main() {
    // Fetch all games
    const r = await apiReq('GET', '/rest/v1/products?select=id,name,price&category_id=eq.bd83d164-c904-453c-87f6-ac94074c1ced&order=name');
    const games = JSON.parse(r.body);
    console.log(`Found ${games.length} game products\n`);

    let updated = 0, skipped = 0;
    for (const g of games) {
        const newPrice = getPrice(g.name);
        if (!newPrice) { console.log(`  SKIP  $${g.price} → no match: ${g.name}`); skipped++; continue; }
        if (parseFloat(g.price) === newPrice) { skipped++; continue; }
        const patch = await apiReq('PATCH', `/rest/v1/products?id=eq.${g.id}`, { price: newPrice });
        if (patch.status >= 200 && patch.status < 300) {
            console.log(`  ✅  $${String(g.price).padEnd(8)} → $${newPrice}  ${g.name}`);
            updated++;
        } else {
            console.log(`  ❌  Error updating ${g.name}: ${patch.body}`);
        }
    }
    console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main().catch(console.error);
