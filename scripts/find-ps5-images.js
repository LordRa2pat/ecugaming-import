const https = require('https');

function testUrl(url) {
    return new Promise(res => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' }
        }, r => res(r.statusCode));
        req.on('error', () => res(0));
        req.end();
    });
}

// Try Wikimedia Commons files for PS5
const candidates = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/PlayStation_5_and_DualSense_with_transparent_background.png/640px-PlayStation_5_and_DualSense_with_transparent_background.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/PS5_Disc_Edition.jpg/640px-PS5_Disc_Edition.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/PlayStation-5-Console-FL.jpg/640px-PlayStation-5-Console-FL.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/PlayStation_5_Slim_-_Front.jpg/640px-PlayStation_5_Slim_-_Front.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/PlayStation_5_Pro_-_Front.jpg/640px-PlayStation_5_Pro_-_Front.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/7/77/Black_and_white_Playstation_5_base_edition_with_controller.png',
    // PS5 Pro
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/PlayStation-5-Pro.jpg/640px-PlayStation-5-Pro.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/PlayStation_5_Pro.jpg/640px-PlayStation_5_Pro.jpg',
    // Game images
    'https://upload.wikimedia.org/wikipedia/en/thumb/3/33/Hogwarts_Legacy.jpg/300px-Hogwarts_Legacy.jpg',
    'https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg',
    'https://upload.wikimedia.org/wikipedia/en/5/54/Resident_Evil_Village.jpg',
];

async function main() {
    for (const url of candidates) {
        const code = await testUrl(url);
        const name = url.split('/').pop().slice(0, 50);
        console.log(code + ' ' + name);
    }
}
main();
