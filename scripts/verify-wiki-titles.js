// Find correct Wikipedia image URLs for games with broken 404 images
const https = require('https');

function wikiPageImg(title) {
    return new Promise(res => {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=640&format=json`;
        const u = new URL(url);
        https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } }, r => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => {
                try {
                    const j = JSON.parse(d);
                    const page = Object.values(j.query.pages)[0];
                    res({ title, img: page.thumbnail?.source || null });
                } catch { res({ title, img: null }); }
            });
        }).on('error', () => res({ title, img: null }));
    });
}

const TITLES = [
    "Bloodborne",
    "Stellar Blade (video game)",
    "The Last of Us Part II",
    "Marvel's Spider-Man 2",
    "God of War Ragnarök",
    "Death Stranding Director's Cut",
    "PlayStation Portal",
    "PlayStation Pulse 3D",
    "Pulse 3D Wireless Headset",
    "Astro Bot (2024 video game)",
    "Astro Bot",
];
async function main() {
    for (const t of TITLES) {
        const r = await wikiPageImg(t);
        console.log(t + ':\n  ' + (r.img || 'NO IMAGE'));
    }
}
main();
