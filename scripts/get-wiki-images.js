const https = require('https');
function wikiImg(title) {
    return new Promise(res => {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=640&format=json`;
        const u = new URL(url);
        https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => {
                const j = JSON.parse(d);
                const pages = j.query.pages;
                const page = Object.values(pages)[0];
                res({ title, img: page.thumbnail?.source || null });
            });
        }).on('error', () => res({ title, img: null }));
    });
}
async function main() {
    const titles = [
        'PlayStation 5',
        'PlayStation 5 Pro',
        'Stellar Blade (video game)',
        'Astro Bot (video game)',
        'Helldivers 2',
        'Sackboy: A Big Adventure',
        'The Last of Us Part II',
    ];
    for (const t of titles) {
        const r = await wikiImg(t);
        console.log(r.title + ':\n  ' + r.img);
    }
}
main();
