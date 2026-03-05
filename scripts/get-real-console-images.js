// Fetches ACTUAL verified image URLs from Wikipedia REST API
const https = require('https');

function wikiSummary(title) {
    return new Promise(res => {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const u = new URL(url);
        https.get({
            hostname: u.hostname, path: u.pathname + u.search,
            headers: { 'User-Agent': 'EcuGamingImport/1.0 (contact@ecugamingimport.online)' }
        }, r => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => {
                try {
                    const j = JSON.parse(d);
                    res({
                        title,
                        thumbnail: j.thumbnail?.source || null,
                        original: j.originalimage?.source || null,
                    });
                } catch { res({ title, thumbnail: null, original: null }); }
            });
        }).on('error', () => res({ title, thumbnail: null, original: null }));
    });
}

const CONSOLES = [
    'PlayStation 5',
    'PlayStation 5 Slim',
    'PlayStation 5 Pro',
    'PlayStation 4 Pro',
    'DualSense',
    'PlayStation VR2',
    'PlayStation Portal',
    'PlayStation Pulse 3D Headset',
    'Xbox Series X',
    'Xbox Series S',
    'Nintendo Switch',
    'Nintendo Switch Lite',
    'Nintendo Switch OLED Model',
    'Steam Deck',
    'Bloodborne',
    'Stellar Blade (video game)',
    'The Last of Us Part II',
    "God of War Ragnarok",
];

async function main() {
    for (const t of CONSOLES) {
        const r = await wikiSummary(t);
        console.log(`\n${t}:`);
        if (r.thumbnail) console.log(`  thumb: ${r.thumbnail}`);
        else console.log(`  thumb: NONE`);
    }
}
main();
