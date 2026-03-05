// Test multiple filename variants for broken game images + find PS console images
const https = require('https');

function head(url) {
    return new Promise(res => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120' }
        }, r => res(r.statusCode));
        req.on('error', () => res(0));
        req.end();
    });
}

const CANDIDATES = {
    // Spider-Man 2 (PC port Steam)
    spider2: [
        'https://cdn.cloudflare.steamstatic.com/steam/apps/2552500/header.jpg',  // PC port
        'https://upload.wikimedia.org/wikipedia/en/9/9c/Marvel%27s_Spider-Man_2_cover_art.jpg',
        'https://upload.wikimedia.org/wikipedia/en/0/0d/Marvel%27s_Spider-Man_2.jpg',
    ],
    // God of War Ragnarok (PC port Steam)
    gow: [
        'https://cdn.cloudflare.steamstatic.com/steam/apps/2322010/header.jpg',  // PC port
        'https://upload.wikimedia.org/wikipedia/en/7/74/God_of_War_Ragnar%C3%B6k.jpg',
    ],
    // Death Stranding DC (PC port Steam)
    ds: [
        'https://cdn.cloudflare.steamstatic.com/steam/apps/1850570/header.jpg',  // PC port
        'https://upload.wikimedia.org/wikipedia/en/d/d0/Death_Stranding_Director%27s_Cut.jpg',
    ],
    // Bloodborne (no PC port)
    bloodborne: [
        'https://upload.wikimedia.org/wikipedia/en/9/9d/Bloodborne_Coverart.png',
        'https://upload.wikimedia.org/wikipedia/en/4/45/Bloodborne_cover_art.jpg',
        'https://upload.wikimedia.org/wikipedia/en/b/b5/Bloodborne.jpg',
        'https://media.rawg.io/media/games/320/320c8b6d499416929dbbbc28c84cdfa0.jpg',
    ],
    // TLOU Part II (no PC)
    tlou2: [
        'https://upload.wikimedia.org/wikipedia/en/4/41/The_Last_of_Us_Part_II.jpg',
        'https://upload.wikimedia.org/wikipedia/en/d/dc/The_Last_of_Us_Part_II_cover.jpg',
        'https://media.rawg.io/media/games/c80/c80bcdd89e8d964e6395c878aa5caaab.jpg',
    ],
    // Stellar Blade (PS5 only)
    stellar: [
        'https://upload.wikimedia.org/wikipedia/en/3/30/Stellar_Blade.jpg',
        'https://upload.wikimedia.org/wikipedia/en/1/17/Stellar_Blade_cover.jpg',
        'https://media.rawg.io/media/games/b90/b90453c87e7f9b6a5b6ef78e2d1bbab0.jpg',
    ],
    // Pulse 3D headset (gmedia fix)
    pulse3d: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Pulse_3D_Wireless_Headset.jpg/640px-Pulse_3D_Wireless_Headset.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/PlayStation-Pulse-3D-Wireless-Headset.jpg/640px-PlayStation-Pulse-3D-Wireless-Headset.jpg',
    ],
    // PlayStation Portal (gmedia fix)
    portal: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/PlayStation_Portal.jpg/640px-PlayStation_Portal.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/PlayStation_Portal.jpg/640px-PlayStation_Portal.jpg',
    ],
    // Astro Bot
    astrobot: [
        'https://upload.wikimedia.org/wikipedia/en/6/6d/Astro_Bot_cover_art.jpg',
        'https://upload.wikimedia.org/wikipedia/en/7/7e/Astro_Bot.jpg',
        'https://cdn.cloudflare.steamstatic.com/steam/apps/2885570/header.jpg', // if on PC
    ],
};

async function main() {
    for (const [game, urls] of Object.entries(CANDIDATES)) {
        console.log('\n' + game.toUpperCase() + ':');
        for (const url of urls) {
            const code = await head(url);
            const name = url.split('/').pop().slice(0, 60);
            console.log(`  ${code === 200 ? '✅' : code === 429 ? '⚠️ 429' : '❌ ' + code}  ${name}`);
            if (code === 200 || code === 429) break; // use first working one
        }
    }
}
main();
