#!/usr/bin/env node
// enrich-images-v2.js - Uses Steam API + official CDNs (no quota limits)
// Steam: https://store.steampowered.com/api/storesearch/?term={name}
// PS CDN: https://gmedia.playstation.com
// Run: node scripts/enrich-images-v2.js

'use strict';
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dpomkchvjpdkndkksphy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_KEY) { console.error('Set SUPABASE_SERVICE_KEY'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    }).on('error', reject);
  });
}

// Search Steam store and return header image URL
async function steamSearch(name) {
  try {
    const term = name.replace(/[:\-].*/g, '').trim(); // simplify name
    const { data } = await get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=US`);
    if (!data || !data.items || data.items.length === 0) return null;
    // Find best match (first result)
    for (const item of data.items.slice(0, 3)) {
      if (item.id && item.name) {
        const imgUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/header.jpg`;
        return imgUrl;
      }
    }
  } catch (e) { /* silent */ }
  return null;
}

// Official PS CDN images for known PlayStation hardware
const HARDWARE_IMAGES = {
  'PlayStation 5 Slim - Edición Disco (1TB)':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-hero-01-en-14sep23?$native$',
  'PlayStation 5 Slim - Edición Digital (1TB)':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-digital-slim-hero-01-en-14sep23?$native$',
  'PlayStation 5 Pro (2TB)':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5pro-hero-01-en-06sep24?$native$',
  'PlayStation 5 Slim Disc + God of War Ragnarök Bundle':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-hero-01-en-14sep23?$native$',
  "PlayStation 5 Slim Disc + Marvel's Spider-Man 2 Bundle":
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-disc-slim-hero-01-en-14sep23?$native$',
  'DualSense Edge Wireless Controller':
    'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-edge-product-thumbnail-01-en-13jan23?$native$',
  'DualSense Wireless Controller - Cosmic Red':
    'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-cosmic-red-product-thumbnail-01-en-29jun22?$native$',
  'DualSense Wireless Controller - Galactic Purple':
    'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-galactic-purple-product-thumbnail-01-en-29jun22?$native$',
  'DualSense Wireless Controller - Midnight Black':
    'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-midnight-black-product-thumbnail-01-en-29jun22?$native$',
  'DualSense Wireless Controller - Nova Pink':
    'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-nova-pink-product-thumbnail-01-en-29jun22?$native$',
  'DualSense Charging Station':
    'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-charging-station-product-thumbnail-01-en-12nov20?$native$',
  'PlayStation VR2':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps-vr2-product-thumbnail-01-en-16nov22?$native$',
  'PlayStation Portal Remote Player':
    'https://gmedia.playstation.com/is/image/SIEPDC/playstation-portal-remote-player-hero-01-en-05sep23?$native$',
  'PS5 HD Camera':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-hd-camera-product-thumbnail-01-en-12nov20?$native$',
  'Pulse 3D Wireless Headset - Blanco':
    'https://gmedia.playstation.com/is/image/SIEPDC/pulse3d-wireless-headset-product-thumbnail-02-en-12nov20?$native$',
  'Pulse 3D Wireless Headset - Midnight Black':
    'https://gmedia.playstation.com/is/image/SIEPDC/pulse3d-wireless-headset-midnight-black-product-thumbnail-01-en-09sep21?$native$',
  'PS5 Media Remote':
    'https://gmedia.playstation.com/is/image/SIEPDC/media-remote-product-thumbnail-01-en-12nov20?$native$',
  'PS5 SSD Expansion 2TB (WD_BLACK SN850P)':
    'https://m.media-amazon.com/images/I/71FWNgm8KHL._AC_SL1500_.jpg',
  'PS5 Slim Console Cover + DualSense Bundle - Deep Earth Collection':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-deep-earth-collection-console-cover-and-dualsense-wireless-controller-bundle-product-thumbnail-01-en-05sep23?$native$',
  'Funda para PS5 Slim - Carbon Black':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-cover-carbon-black-product-thumbnail-01-en-05sep23?$native$',
  'PlayStation 4 Pro 1TB - Reacondicionado':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-hero-01-en-01oct16?$native$',
  'PlayStation Vita PCH-2000 - Reacondicionado':
    'https://gmedia.playstation.com/is/image/SIEPDC/ps-vita-pch-2000-product-thumbnail-01-en-06jan14?$native$',
  // Xbox
  'Xbox Series X (1TB)':
    'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4mRni?ver=f059',
  'Xbox Series X - Edición Especial Galaxy Black':
    'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4VLZV?ver=fa1f',
  'Xbox Series S 512GB - Robot White':
    'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4mRnk?ver=17e3',
  'Xbox Series S 1TB - Carbon Black':
    'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE563bH?ver=a1bd',
  'Xbox Series S + 3 Meses Game Pass Ultimate':
    'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4mRnk?ver=17e3',
  'Xbox One X 1TB - Reacondicionado':
    'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1zGNm?ver=5db0',
  'Xbox Wireless Controller - Carbon Black':
    'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4NHH1?ver=6ab9',
  // Nintendo
  'Nintendo Switch OLED - Edición Blanca':
    'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_656/b_white/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch-oled/oled-white-set',
  'Nintendo Switch OLED - Edición Splatoon 3':
    'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_656/b_white/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch-oled/oled-splatoon3-set',
  'Nintendo Switch Lite - Coral':
    'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_656/b_white/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch-lite/switch-lite-coral-set',
  'Nintendo Switch Lite - Turquesa':
    'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_656/b_white/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch-lite/switch-lite-turquoise-set',
  'Nintendo Switch (V2) Neon + Mario Kart 8 Deluxe Bundle':
    'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_656/b_white/f_auto/q_auto/ncom/en_US/switch/site-design-update/hardware/switch/neon-blue-red-set-mk8d',
  'Nintendo 3DS XL Rojo/Negro - Reacondicionado':
    'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_656/b_white/f_auto/q_auto/ncom/en_US/nintendo-3ds/overview/header',
  'Game Boy Advance SP AGS-101 - Reacondicionado':
    'https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_656/b_white/f_auto/q_auto/ncom/en_US/nintendo-game-boy-advance/overview/header',
  // Other
  'Steam Deck OLED 512GB':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/1675200/hero_capsule.jpg',
  'Steam Deck OLED 1TB - Edición Limitada':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/1675200/hero_capsule.jpg',
  'Sega Genesis Mini 2 + 60 Juegos':
    'https://m.media-amazon.com/images/I/71VIBKJiPML._AC_SL1500_.jpg',
  'Retro Console 256GB - 30.000 Juegos':
    'https://m.media-amazon.com/images/I/71RM5hBiAFL._AC_SL1500_.jpg',
  // Fallbacks for non-Steam PS exclusives / EA Sports
  'EA Sports FC 24 (FIFA 24)':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/2195250/header.jpg',
  'FIFA 23':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/1811260/header.jpg',
  'Gran Turismo 7':
    'https://gmedia.playstation.com/is/image/SIEPDC/gt7-packshot-standard-01-en-11jan22?$native$',
  "Demon's Souls Remake":
    'https://gmedia.playstation.com/is/image/SIEPDC/demons-souls-packshot-01-en-13aug20?$native$',
  'BioShock: The Collection':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/409720/header.jpg',
  'NBA 2K24 Kobe Bryant Edition':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/2338770/header.jpg',
  'Overwatch 2 - Coins 10000':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg',
  'UFC 5':
    'https://gmedia.playstation.com/is/image/SIEPDC/ufc-5-packshot-01-en-28jun23?$native$',
  'Alan Wake 2 - Deluxe Edition':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/1342040/header.jpg',
  'Crash Team Rumble Deluxe':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/1965120/header.jpg',
  'eFootball 2024 Premium Player Pack':
    'https://cdn.cloudflare.steamstatic.com/steam/apps/1665460/header.jpg',
  // Apple iPhones - official Apple Store CDN
  'iPhone 16 Pro Max 512GB - Titanio Desierto':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-deserttitanium?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1724927632953',
  'iPhone 16 Pro Max 256GB - Titanio Negro':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-blacktitanium?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1724927632953',
  'iPhone 16 Pro 256GB - Titanio Blanco':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-1inch-whitetitanium?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1724927632953',
  'iPhone 16 Pro 128GB - Titanio Natural':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-1inch-naturaltitanium?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1724927632953',
  'iPhone 16 Plus 256GB - Negro':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-black?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1725016952960',
  'iPhone 16 Plus 128GB - Ultramarino':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-ultramarine?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1725016952960',
  'iPhone 16 256GB - Rosa':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-pink?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1725016952960',
  'iPhone 16 128GB - Negro':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-black?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1725016952960',
  'iPhone 16 128GB - Blanco':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-white?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1725016952960',
  'iPhone 15 Pro Max 256GB - Titanio Azul':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-bluetitanium?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1692917364498',
  'iPhone 15 Pro 256GB - Titanio Negro':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-blacktitanium?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1692917364498',
  'iPhone 15 Pro 128GB - Titanio Natural':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1692917364498',
  'iPhone 15 Plus 128GB - Verde':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-7inch_GR?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1693009394412',
  'iPhone 15 256GB - Azul':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch_BL?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1693009394412',
  'iPhone 15 128GB - Rosa':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch_PI?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1693009394412',
  'iPhone 14 256GB - Azul':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-blue?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1660803972829',
  'iPhone 14 128GB - Medianoche':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-midnight?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1660803972829',
  'iPhone 14 Plus 128GB - Rojo (PRODUCT)RED':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-plus-finish-select-202209-6-7inch-productred?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1660803972829',
  'iPhone 13 Pro Max 256GB - Verde - Dorado':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-family-hero?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1631220221000',
  'iPhone SE (3ra Generación) 128GB - Blanco':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-white?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1645552400000',
  'iPhone SE (3ra Generación) 64GB - Medianoche':
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-midnight?wid=800&hei=800&fmt=jpeg&qlt=90&.v=1645552400000',
};

// PS5 games need Steam lookup
const GAME_STEAM_NAMES = {
  'Elden Ring': 'Elden Ring',
  'God of War: Ragnarök': 'God of War Ragnarok',
  "Marvel's Spider-Man 2": "Marvel's Spider-Man 2",
  "Marvel's Spider-Man: Miles Morales": "Marvel's Spider-Man Miles Morales",
  'Final Fantasy VII Rebirth': 'Final Fantasy VII Rebirth',
  'Final Fantasy XVI': 'Final Fantasy XVI',
  'Baldur\'s Gate 3': "Baldur's Gate 3",
  'Hogwarts Legacy': 'Hogwarts Legacy',
  'Call of Duty: Modern Warfare III': 'Call of Duty Modern Warfare III',
  'Call of Duty: Modern Warfare II': 'Call of Duty Modern Warfare II',
  'EA Sports FC 25 (FIFA 25)': 'EA SPORTS FC 25',
  'EA Sports FC 24 (FIFA 24)': 'EA SPORTS FC 24',
  'FIFA 23': 'FIFA 23',
  'NBA 2K25': 'NBA 2K25',
  'NBA 2K24 Kobe Bryant Edition': 'NBA 2K24',
  'Mortal Kombat 1': 'Mortal Kombat 1',
  'Mortal Kombat 11 Ultimate': 'Mortal Kombat 11',
  'Tekken 8': 'TEKKEN 8',
  'Tekken 7 - Legendary Edition': 'TEKKEN 7',
  'Street Fighter 6': 'Street Fighter 6',
  'Cyberpunk 2077: Ultimate Edition': 'Cyberpunk 2077',
  'Resident Evil 4 Remake': 'Resident Evil 4',
  'Resident Evil Village': 'Resident Evil Village',
  'Dead Space Remake': 'Dead Space',
  'Like a Dragon: Infinite Wealth': 'Like a Dragon: Infinite Wealth',
  'Like a Dragon: Ishin!': 'Like a Dragon Ishin',
  "Dragon's Dogma 2": "Dragon's Dogma 2",
  'Rise of the Ronin': 'Rise of the Ronin',
  'Avatar: Frontiers of Pandora': 'Avatar Frontiers of Pandora',
  'Diablo IV': 'Diablo IV',
  'Star Wars Jedi: Survivor': 'STAR WARS Jedi: Survivor',
  'Star Wars Jedi: Fallen Order Deluxe': 'STAR WARS Jedi: Fallen Order',
  'The Last of Us Part I': 'The Last of Us Part I',
  'The Last of Us Part II Remastered': 'The Last of Us Part II',
  'Horizon: Forbidden West': 'Horizon Forbidden West',
  'Horizon: Forbidden West - Complete Edition': 'Horizon Forbidden West',
  'Gran Turismo 7': 'Gran Turismo 7',
  'Returnal': 'Returnal',
  "Demon's Souls Remake": "Demon's Souls",
  'Ratchet & Clank: Rift Apart': 'Ratchet & Clank: Rift Apart',
  "Ghost of Tsushima: Director's Cut": "Ghost of Tsushima",
  'A Plague Tale: Requiem': 'A Plague Tale Requiem',
  'Alan Wake 2 - Deluxe Edition': 'Alan Wake 2',
  "Assassin's Creed Mirage": "Assassin's Creed Mirage",
  "Assassin's Creed Valhalla - Complete Edition": "Assassin's Creed Valhalla",
  'Lies of P': 'Lies of P',
  'Palworld (Collector\'s Edition)': 'Palworld',
  'Persona 5 Royal': 'Persona 5 Royal',
  'Persona 3 Reload': 'Persona 3 Reload',
  'Borderlands 3: Ultimate Edition': 'Borderlands 3',
  'BioShock: The Collection': 'BioShock The Collection',
  "Crash Bandicoot 4: It's About Time": "Crash Bandicoot 4",
  'Crash Team Rumble Deluxe': 'Crash Team Rumble',
  'Crisis Core: Final Fantasy VII Reunion': 'Crisis Core Final Fantasy VII Reunion',
  'Deathloop': 'DEATHLOOP',
  'Destroy All Humans! 2 - Reprobed': 'Destroy All Humans 2 Reprobed',
  'Devil May Cry 5 Special Edition': 'Devil May Cry 5',
  'Devil May Cry 5 + Devil May Cry 4 Bundle': 'Devil May Cry 5',
  'Dying Light 2 Stay Human': 'Dying Light 2',
  'eFootball 2024 Premium Player Pack': 'eFootball 2024',
  'F1 23': 'F1 23',
  'F1 24': 'F1 24',
  'Far Cry 6': 'Far Cry 6',
  'Forspoken': 'Forspoken',
  'Ghostbusters: Spirits Unleashed': 'Ghostbusters Spirits Unleashed',
  'Ghostwire: Tokyo': 'GhostWire Tokyo',
  'GTA V Premium Edition (PS5)': 'Grand Theft Auto V',
  'It Takes Two': 'It Takes Two',
  'Kena: Bridge of Spirits - Deluxe Edition': 'Kena Bridge of Spirits',
  'Kingdom Hearts III + Re Mind': 'KINGDOM HEARTS III',
  'Mafia: Definitive Edition': 'Mafia Definitive Edition',
  'Madden NFL 25': 'Madden NFL 25',
  'Monster Hunter Rise: Sunbreak': 'Monster Hunter Rise Sunbreak',
  'Monster Hunter: World - Iceborne Master Edition': 'Monster Hunter World',
  'Nioh 2 - The Complete Edition': 'Nioh 2',
  'Overwatch 2 - Coins 10000': 'Overwatch 2',
  'Prince of Persia: The Lost Crown': 'Prince of Persia The Lost Crown',
  'Red Dead Redemption 2': 'Red Dead Redemption 2',
  'Remnant II: Ultimate Edition': 'Remnant II',
  'Sackboy: A Big Adventure': 'Sackboy A Big Adventure',
  'Sekiro: Shadows Die Twice - GOTY Edition': 'Sekiro Shadows Die Twice',
  'Sifu': 'Sifu',
  'Sonic Frontiers': 'Sonic Frontiers',
  'Sonic Superstars': 'Sonic Superstars',
  'Spyro Reignited Trilogy': 'Spyro Reignited Trilogy',
  'Stranger of Paradise: Final Fantasy Origin': 'Stranger of Paradise Final Fantasy Origin',
  'Stray': 'Stray',
  'Suicide Squad: Kill the Justice League': 'Suicide Squad Kill the Justice League',
  'The Callisto Protocol': 'The Callisto Protocol',
  'The Quarry': 'The Quarry',
  "Tiny Tina's Wonderlands": "Tiny Tina's Wonderlands",
  'UFC 5': 'UFC 5',
  'Uncharted: Legacy of Thieves Collection': 'Uncharted Legacy of Thieves Collection',
  'Watch Dogs: Legion': 'Watch Dogs Legion',
  'Wo Long: Fallen Dynasty': 'Wo Long Fallen Dynasty',
  'WWE 2K24': 'WWE 2K24',
  'Dragon Ball Z: Kakarot + A New Power Awakens': 'Dragon Ball Z Kakarot',
  "Death Stranding: Director's Cut": 'Death Stranding',
  'Gotham Knights': 'Gotham Knights',
  "God of War: Ragnarök - Valhalla Edition": 'God of War Ragnarok',
  'Final Fantasy XVI + Final Fantasy VII Rebirth Bundle': 'Final Fantasy XVI',
  'Elden Ring: Shadow of the Erdtree (GOTY)': 'Elden Ring Shadow of the Erdtree',
};

async function main() {
  const { data: products } = await sb
    .from('products')
    .select('id, name, brand, product_images(id, storage_path)')
    .eq('is_active', true)
    .order('name');

  console.log(`Found ${products.length} active products\n`);

  let updated = 0, failed = 0;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  for (const product of products) {
    const name = product.name;
    const img = product.product_images?.[0];
    let imgUrl = null;

    // 1. Use hardcoded hardware images (official CDNs)
    if (HARDWARE_IMAGES[name]) {
      imgUrl = HARDWARE_IMAGES[name];
    }
    // 2. For games: use Steam search
    else if (GAME_STEAM_NAMES[name]) {
      process.stdout.write(`  Steam: ${name.slice(0, 50).padEnd(50)} `);
      imgUrl = await steamSearch(GAME_STEAM_NAMES[name]);
      await delay(300); // be nice to Steam API
    }

    if (!imgUrl) {
      if (GAME_STEAM_NAMES[name]) console.log('✗ (not found on Steam)');
      else process.stdout.write(`  Skip: ${name}\n`);
      failed++;
      continue;
    }

    // Update DB
    let error;
    if (img) {
      ({ error } = await sb.from('product_images').update({ storage_path: imgUrl }).eq('id', img.id));
    } else {
      ({ error } = await sb.from('product_images').insert({ product_id: product.id, storage_path: imgUrl, sort: 0 }));
    }

    if (error) {
      console.log(`✗ DB: ${error.message}`);
      failed++;
    } else {
      if (GAME_STEAM_NAMES[name]) console.log(`✓`);
      else console.log(`  Hardware: ${name.slice(0, 60)} ✓`);
      updated++;
    }
  }

  console.log(`\n✅ Done: ${updated} updated, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
