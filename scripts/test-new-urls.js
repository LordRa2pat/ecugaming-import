'use strict';
const https = require('https');
const http  = require('http');

const URLS = {
  'iPhone 17 Pro Max':
    'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-pro-max-finish-select-202509-6-9inch-naturalblacktitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80',
  'iPhone 16 Pro Max Black':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-blacktitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80',
  'iPhone 16 Pro Max Desert':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-deserttitanium?wid=2560&hei=1440&fmt=p-jpg&qlt=80',
  'iPhone 14 Plus Red':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-plus-finish-select-202209-6-7inch-red?wid=5120&hei=2880&fmt=p-jpg&qlt=80',
  'iPhone SE Midnight':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-midnight?wid=940&hei=1112&fmt=png-alpha&qlt=80',
  'iPhone SE Starlight':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-starlight?wid=940&hei=1112&fmt=png-alpha&qlt=80',
  'Switch Lite Turquoise (Wiki)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Nintendo_Switch_Lite_Turquoise.jpg/480px-Nintendo_Switch_Lite_Turquoise.jpg',
  'Switch Lite Coral (Wiki)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Nintendo_Switch_Lite_coral.jpg/480px-Nintendo_Switch_Lite_coral.jpg',
  'Switch OLED Splatoon (Wiki)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo_Switch_OLED_Splatoon_3.jpg/480px-Nintendo_Switch_OLED_Splatoon_3.jpg',
  'Switch Neon V2 (Wiki)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Nintendo-Switch-wJoyCons-L-R-BlueRed-Standing-FL.jpg/480px-Nintendo-Switch-wJoyCons-L-R-BlueRed-Standing-FL.jpg',
  'GBA SP (Wiki)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/GameBoyAdvance-SP-Mk2.jpg/480px-GameBoyAdvance-SP-Mk2.jpg',
  'Sega Genesis Mini 2 (Wiki)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Mega_Drive_Mini_2.jpg/480px-Mega_Drive_Mini_2.jpg',
};

function check(url) {
  return new Promise(resolve => {
    try {
      const p = new URL(url);
      const lib = p.protocol === 'https:' ? https : http;
      const req = lib.request({ hostname: p.hostname, path: p.pathname+p.search, method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*', 'Referer': 'https://ecugamingimport.online/' }
      }, res => { resolve({ s: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 }); req.destroy(); });
      req.setTimeout(8000, () => { req.destroy(); resolve({ s: 'TIMEOUT', ok: false }); });
      req.on('error', () => resolve({ s: 'ERR', ok: false }));
      req.end();
    } catch(e) { resolve({ s: 'INVALID', ok: false }); }
  });
}

(async () => {
  console.log('\nVerifying new URLs with GET + browser headers:\n');
  for (const [name, url] of Object.entries(URLS)) {
    const { s, ok } = await check(url);
    console.log(`  ${ok ? '✅' : '❌'} [${s}] ${name}`);
    if (!ok) console.log(`       ${url.slice(0,100)}`);
    await new Promise(r => setTimeout(r, 200));
  }
})();
