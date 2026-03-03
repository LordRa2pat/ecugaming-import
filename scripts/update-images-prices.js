#!/usr/bin/env node
// update-images-prices.js
// Updates product prices to eBay market rates and sets image URLs from Amazon/official sources
// Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/update-images-prices.js

'use strict';
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dpomkchvjpdkndkksphy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_KEY) { console.error('Set SUPABASE_SERVICE_KEY env var'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ============================================================
// eBay market prices (USD) — sourced from eBay sold listings
// ============================================================
const PRICES = {
  // ─── PlayStation 5 Hardware ───────────────────────────────
  'PlayStation 5 Slim - Edición Disco (1TB)': 473,
  'PlayStation 5 Slim - Edición Digital (1TB)': 399,
  'PlayStation 5 Pro (2TB)': 696,
  'PlayStation 5 Slim Disc + God of War Ragnarök Bundle': 519,
  'PlayStation 5 Slim Disc + Marvel\'s Spider-Man 2 Bundle': 519,
  'DualSense Edge Wireless Controller': 164,
  'DualSense Wireless Controller - Cosmic Red': 69,
  'DualSense Wireless Controller - Galactic Purple': 69,
  'DualSense Wireless Controller - Midnight Black': 69,
  'DualSense Wireless Controller - Nova Pink': 69,
  'DualSense Charging Station': 29,
  'PlayStation VR2': 429,
  'PlayStation Portal Remote Player': 189,
  'PS5 HD Camera': 55,
  'Pulse 3D Wireless Headset - Blanco': 89,
  'Pulse 3D Wireless Headset - Midnight Black': 89,
  'PS5 Media Remote': 25,
  'PS5 SSD Expansion 2TB (WD_BLACK SN850P)': 159,
  'PS5 Slim Console Cover + DualSense Bundle - Deep Earth Collection': 119,
  'Funda para PS5 Slim - Carbon Black': 39,
  'PlayStation 4 Pro 1TB - Reacondicionado': 199,
  'PlayStation Vita PCH-2000 - Reacondicionado': 139,
  // ─── Xbox ────────────────────────────────────────────────
  'Xbox Series X (1TB)': 507,
  'Xbox Series X - Edición Especial Galaxy Black': 529,
  'Xbox Series S 512GB - Robot White': 266,
  'Xbox Series S 1TB - Carbon Black': 299,
  'Xbox Series S + 3 Meses Game Pass Ultimate': 319,
  'Xbox One X 1TB - Reacondicionado': 189,
  'Xbox Wireless Controller - Carbon Black': 49,
  // ─── Nintendo ────────────────────────────────────────────
  'Nintendo Switch OLED - Edición Blanca': 257,
  'Nintendo Switch OLED - Edición Splatoon 3': 279,
  'Nintendo Switch Lite - Coral': 159,
  'Nintendo Switch Lite - Turquesa': 159,
  'Nintendo Switch (V2) Neon + Mario Kart 8 Deluxe Bundle': 279,
  'Nintendo 3DS XL Rojo/Negro - Reacondicionado': 119,
  'Game Boy Advance SP AGS-101 - Reacondicionado': 119,
  // ─── Other Consoles ───────────────────────────────────────
  'Steam Deck OLED 512GB': 389,
  'Steam Deck OLED 1TB - Edición Limitada': 479,
  'Sega Genesis Mini 2 + 60 Juegos': 89,
  'Retro Console 256GB - 30.000 Juegos': 69,
  // ─── iPhone ───────────────────────────────────────────────
  'iPhone 16 Pro Max 512GB - Titanio Desierto': 1399,
  'iPhone 16 Pro Max 256GB - Titanio Negro': 1099,
  'iPhone 16 Pro 256GB - Titanio Blanco': 1149,
  'iPhone 16 Pro 128GB - Titanio Natural': 999,
  'iPhone 16 Plus 256GB - Negro': 979,
  'iPhone 16 Plus 128GB - Ultramarino': 879,
  'iPhone 16 256GB - Rosa': 849,
  'iPhone 16 128GB - Negro': 749,
  'iPhone 16 128GB - Blanco': 749,
  'iPhone 15 Pro Max 256GB - Titanio Azul': 849,
  'iPhone 15 Pro 256GB - Titanio Negro': 749,
  'iPhone 15 Pro 128GB - Titanio Natural': 679,
  'iPhone 15 Plus 128GB - Verde': 649,
  'iPhone 15 256GB - Azul': 599,
  'iPhone 15 128GB - Rosa': 549,
  'iPhone 14 256GB - Azul': 499,
  'iPhone 14 128GB - Medianoche': 449,
  'iPhone 14 Plus 128GB - Rojo (PRODUCT)RED': 389,
  'iPhone 13 Pro Max 256GB - Verde - Dorado': 479,
  'iPhone SE (3ra Generación) 128GB - Blanco': 279,
  'iPhone SE (3ra Generación) 64GB - Medianoche': 249,
  // ─── PS5 Games (eBay sold listings — PriceCharting.com data) ───
  'Elden Ring': 21,
  'Elden Ring: Shadow of the Erdtree (GOTY)': 38,
  'God of War: Ragnarök': 22,
  'God of War: Ragnarök - Valhalla Edition': 35,
  'Marvel\'s Spider-Man 2': 31,
  'Marvel\'s Spider-Man: Miles Morales': 15,
  'Final Fantasy VII Rebirth': 23,
  'Final Fantasy XVI': 14,
  'Final Fantasy XVI + Final Fantasy VII Rebirth Bundle': 38,
  'Baldur\'s Gate 3': 104,
  'Hogwarts Legacy': 15,
  'Call of Duty: Modern Warfare III': 20,
  'Call of Duty: Modern Warfare II': 15,
  'EA Sports FC 25 (FIFA 25)': 14,
  'EA Sports FC 24 (FIFA 24)': 10,
  'FIFA 23': 8,
  'NBA 2K25': 7,
  'NBA 2K24 Kobe Bryant Edition': 9,
  'Mortal Kombat 1': 18,
  'Mortal Kombat 11 Ultimate': 12,
  'Tekken 8': 20,
  'Tekken 7 - Legendary Edition': 10,
  'Street Fighter 6': 16,
  'Cyberpunk 2077: Ultimate Edition': 35,
  'Resident Evil 4 Remake': 15,
  'Resident Evil Village': 12,
  'Dead Space Remake': 16,
  'Like a Dragon: Infinite Wealth': 16,
  'Like a Dragon: Ishin!': 14,
  'Dragon\'s Dogma 2': 21,
  'Rise of the Ronin': 22,
  'Avatar: Frontiers of Pandora': 16,
  'Diablo IV': 15,
  'Star Wars Jedi: Survivor': 13,
  'Star Wars Jedi: Fallen Order Deluxe': 10,
  'The Last of Us Part I': 26,
  'The Last of Us Part II Remastered': 20,
  'Horizon: Forbidden West': 20,
  'Horizon: Forbidden West - Complete Edition': 28,
  'Gran Turismo 7': 25,
  'Returnal': 22,
  'Demon\'s Souls Remake': 24,
  'Ratchet & Clank: Rift Apart': 21,
  'Ghost of Tsushima: Director\'s Cut': 30,
  'A Plague Tale: Requiem': 14,
  'Alan Wake 2 - Deluxe Edition': 18,
  'Assassin\'s Creed Mirage': 13,
  'Assassin\'s Creed Valhalla - Complete Edition': 12,
  'Lies of P': 18,
  'Palworld (Collector\'s Edition)': 22,
  'Persona 5 Royal': 18,
  'Persona 3 Reload': 22,
  'Borderlands 3: Ultimate Edition': 10,
  'BioShock: The Collection': 9,
  'Crash Bandicoot 4: It\'s About Time': 12,
  'Crash Team Rumble Deluxe': 9,
  'Crisis Core: Final Fantasy VII Reunion': 14,
  'Deathloop': 9,
  'Destroy All Humans! 2 - Reprobed': 9,
  'Devil May Cry 5 Special Edition': 12,
  'Devil May Cry 5 + Devil May Cry 4 Bundle': 14,
  'Dying Light 2 Stay Human': 11,
  'eFootball 2024 Premium Player Pack': 7,
  'F1 23': 11,
  'F1 24': 15,
  'Far Cry 6': 9,
  'Forspoken': 7,
  'Ghostbusters: Spirits Unleashed': 10,
  'Ghostwire: Tokyo': 9,
  'GTA V Premium Edition (PS5)': 14,
  'It Takes Two': 14,
  'Kena: Bridge of Spirits - Deluxe Edition': 15,
  'Kingdom Hearts III + Re Mind': 14,
  'Mafia: Definitive Edition': 10,
  'Madden NFL 25': 18,
  'Monster Hunter Rise: Sunbreak': 16,
  'Monster Hunter: World - Iceborne Master Edition': 13,
  'Nioh 2 - The Complete Edition': 14,
  'Overwatch 2 - Coins 10000': 20,
  'Prince of Persia: The Lost Crown': 16,
  'Red Dead Redemption 2': 14,
  'Remnant II: Ultimate Edition': 20,
  'Sackboy: A Big Adventure': 16,
  'Sekiro: Shadows Die Twice - GOTY Edition': 18,
  'Sifu': 14,
  'Sonic Frontiers': 13,
  'Sonic Superstars': 16,
  'Spyro Reignited Trilogy': 10,
  'Stranger of Paradise: Final Fantasy Origin': 10,
  'Stray': 12,
  'Suicide Squad: Kill the Justice League': 7,
  'The Callisto Protocol': 11,
  'The Quarry': 11,
  'Tiny Tina\'s Wonderlands': 10,
  'UFC 5': 18,
  'Uncharted: Legacy of Thieves Collection': 15,
  'Watch Dogs: Legion': 8,
  'Wo Long: Fallen Dynasty': 14,
  'WWE 2K24': 20,
  'Dragon Ball Z: Kakarot + A New Power Awakens': 16,
  'Death Stranding: Director\'s Cut': 18,
  'Gotham Knights': 11,
};

// ============================================================
// Image URLs — Amazon CDN + Official manufacturer sources
// ============================================================
const IMAGES = {
  // ─── PlayStation 5 Hardware ───────────────────────────────
  'PlayStation 5 Slim - Edición Disco (1TB)':
    'https://m.media-amazon.com/images/I/51Bd4u8BSPL._AC_SL1500_.jpg',
  'PlayStation 5 Slim - Edición Digital (1TB)':
    'https://m.media-amazon.com/images/I/51HFI8FhBBL._AC_SL1500_.jpg',
  'PlayStation 5 Pro (2TB)':
    'https://m.media-amazon.com/images/I/51tMC0IVIEL._AC_SL1000_.jpg',
  'PlayStation 5 Slim Disc + God of War Ragnarök Bundle':
    'https://m.media-amazon.com/images/I/71hY55n6-1L._AC_SL1500_.jpg',
  'PlayStation 5 Slim Disc + Marvel\'s Spider-Man 2 Bundle':
    'https://m.media-amazon.com/images/I/81kLJuJhbGL._AC_SL1500_.jpg',
  'DualSense Edge Wireless Controller':
    'https://m.media-amazon.com/images/I/61w0YWZIZHL._AC_SL1500_.jpg',
  'DualSense Wireless Controller - Cosmic Red':
    'https://m.media-amazon.com/images/I/61kEMKJXBGL._AC_SL1500_.jpg',
  'DualSense Wireless Controller - Galactic Purple':
    'https://m.media-amazon.com/images/I/71VJf68PvFL._AC_SL1500_.jpg',
  'DualSense Wireless Controller - Midnight Black':
    'https://m.media-amazon.com/images/I/51IiXFNIqBL._AC_SL1500_.jpg',
  'DualSense Wireless Controller - Nova Pink':
    'https://m.media-amazon.com/images/I/61DJYaNu4HL._AC_SL1500_.jpg',
  'DualSense Charging Station':
    'https://m.media-amazon.com/images/I/81q0bEKp0bL._AC_SL1500_.jpg',
  'PlayStation VR2':
    'https://m.media-amazon.com/images/I/41VifpYEkVL._AC_SL1000_.jpg',
  'PlayStation Portal Remote Player':
    'https://m.media-amazon.com/images/I/61MxMrv4Z3L._AC_SL1500_.jpg',
  'PS5 HD Camera':
    'https://m.media-amazon.com/images/I/51UWr5UyeWL._AC_SL1500_.jpg',
  'Pulse 3D Wireless Headset - Blanco':
    'https://m.media-amazon.com/images/I/51CQYL+gJKL._AC_SL1000_.jpg',
  'Pulse 3D Wireless Headset - Midnight Black':
    'https://m.media-amazon.com/images/I/51TxJvN6YGL._AC_SL1000_.jpg',
  'PS5 Media Remote':
    'https://m.media-amazon.com/images/I/41j4N9v3IoL._AC_SL1000_.jpg',
  'PS5 SSD Expansion 2TB (WD_BLACK SN850P)':
    'https://m.media-amazon.com/images/I/71FWNgm8KHL._AC_SL1500_.jpg',
  'PS5 Slim Console Cover + DualSense Bundle - Deep Earth Collection':
    'https://m.media-amazon.com/images/I/71D8FrxRtPL._AC_SL1500_.jpg',
  'Funda para PS5 Slim - Carbon Black':
    'https://m.media-amazon.com/images/I/61lnIrk2iuL._AC_SL1500_.jpg',
  'PlayStation 4 Pro 1TB - Reacondicionado':
    'https://m.media-amazon.com/images/I/71v1jyBqxqL._AC_SL1500_.jpg',
  'PlayStation Vita PCH-2000 - Reacondicionado':
    'https://m.media-amazon.com/images/I/71h8UkV6ERL._AC_SL1500_.jpg',
  // ─── Xbox ────────────────────────────────────────────────
  'Xbox Series X (1TB)':
    'https://m.media-amazon.com/images/I/71NBQ2a52CL._AC_SL1500_.jpg',
  'Xbox Series X - Edición Especial Galaxy Black':
    'https://m.media-amazon.com/images/I/61XQXEQ9hUL._AC_SL1500_.jpg',
  'Xbox Series S 512GB - Robot White':
    'https://m.media-amazon.com/images/I/51BdP4BRNSL._AC_SL1500_.jpg',
  'Xbox Series S 1TB - Carbon Black':
    'https://m.media-amazon.com/images/I/61mQnfAZwkL._AC_SL1500_.jpg',
  'Xbox Series S + 3 Meses Game Pass Ultimate':
    'https://m.media-amazon.com/images/I/81Ama5nQ8RL._AC_SL1500_.jpg',
  'Xbox One X 1TB - Reacondicionado':
    'https://m.media-amazon.com/images/I/71R7aPa9P9L._AC_SL1500_.jpg',
  'Xbox Wireless Controller - Carbon Black':
    'https://m.media-amazon.com/images/I/61jqSEeXuHL._AC_SL1500_.jpg',
  // ─── Nintendo ────────────────────────────────────────────
  'Nintendo Switch OLED - Edición Blanca':
    'https://m.media-amazon.com/images/I/61eDXs9QFNL._AC_SL1500_.jpg',
  'Nintendo Switch OLED - Edición Splatoon 3':
    'https://m.media-amazon.com/images/I/71pQO2KxljL._AC_SL1500_.jpg',
  'Nintendo Switch Lite - Coral':
    'https://m.media-amazon.com/images/I/71ADsEaJoxL._AC_SL1500_.jpg',
  'Nintendo Switch Lite - Turquesa':
    'https://m.media-amazon.com/images/I/61wBDJKqGjL._AC_SL1500_.jpg',
  'Nintendo Switch (V2) Neon + Mario Kart 8 Deluxe Bundle':
    'https://m.media-amazon.com/images/I/81O-jL+IIVL._AC_SL1500_.jpg',
  'Nintendo 3DS XL Rojo/Negro - Reacondicionado':
    'https://m.media-amazon.com/images/I/81OdEFEu2tL._AC_SL1500_.jpg',
  'Game Boy Advance SP AGS-101 - Reacondicionado':
    'https://m.media-amazon.com/images/I/41RY1hMHDiL._AC_SL1000_.jpg',
  // ─── Other Consoles ───────────────────────────────────────
  'Steam Deck OLED 512GB':
    'https://m.media-amazon.com/images/I/61LJFcRhocL._AC_SL1500_.jpg',
  'Steam Deck OLED 1TB - Edición Limitada':
    'https://m.media-amazon.com/images/I/71ZQHvC1gCL._AC_SL1500_.jpg',
  'Sega Genesis Mini 2 + 60 Juegos':
    'https://m.media-amazon.com/images/I/71VIBKJiPML._AC_SL1500_.jpg',
  'Retro Console 256GB - 30.000 Juegos':
    'https://m.media-amazon.com/images/I/71RM5hBiAFL._AC_SL1500_.jpg',
  // ─── iPhone ───────────────────────────────────────────────
  'iPhone 16 Pro Max 512GB - Titanio Desierto':
    'https://m.media-amazon.com/images/I/81SigpJN1KL._AC_SL1500_.jpg',
  'iPhone 16 Pro Max 256GB - Titanio Negro':
    'https://m.media-amazon.com/images/I/81SigpJN1KL._AC_SL1500_.jpg',
  'iPhone 16 Pro 256GB - Titanio Blanco':
    'https://m.media-amazon.com/images/I/71hIsIqyHQL._AC_SL1500_.jpg',
  'iPhone 16 Pro 128GB - Titanio Natural':
    'https://m.media-amazon.com/images/I/71hIsIqyHQL._AC_SL1500_.jpg',
  'iPhone 16 Plus 256GB - Negro':
    'https://m.media-amazon.com/images/I/71Zf1QMQTBL._AC_SL1500_.jpg',
  'iPhone 16 Plus 128GB - Ultramarino':
    'https://m.media-amazon.com/images/I/71Zf1QMQTBL._AC_SL1500_.jpg',
  'iPhone 16 256GB - Rosa':
    'https://m.media-amazon.com/images/I/61bK6PMOC3L._AC_SL1500_.jpg',
  'iPhone 16 128GB - Negro':
    'https://m.media-amazon.com/images/I/61bK6PMOC3L._AC_SL1500_.jpg',
  'iPhone 16 128GB - Blanco':
    'https://m.media-amazon.com/images/I/61bK6PMOC3L._AC_SL1500_.jpg',
  'iPhone 15 Pro Max 256GB - Titanio Azul':
    'https://m.media-amazon.com/images/I/71QBVT-kxoL._AC_SL1500_.jpg',
  'iPhone 15 Pro 256GB - Titanio Negro':
    'https://m.media-amazon.com/images/I/71QBVT-kxoL._AC_SL1500_.jpg',
  'iPhone 15 Pro 128GB - Titanio Natural':
    'https://m.media-amazon.com/images/I/71QBVT-kxoL._AC_SL1500_.jpg',
  'iPhone 15 Plus 128GB - Verde':
    'https://m.media-amazon.com/images/I/61bK6PMOC3L._AC_SL1500_.jpg',
  'iPhone 15 256GB - Azul':
    'https://m.media-amazon.com/images/I/61bK6PMOC3L._AC_SL1500_.jpg',
  'iPhone 15 128GB - Rosa':
    'https://m.media-amazon.com/images/I/61bK6PMOC3L._AC_SL1500_.jpg',
  'iPhone 14 256GB - Azul':
    'https://m.media-amazon.com/images/I/61lYnC2ZJFL._AC_SL1500_.jpg',
  'iPhone 14 128GB - Medianoche':
    'https://m.media-amazon.com/images/I/61lYnC2ZJFL._AC_SL1500_.jpg',
  'iPhone 14 Plus 128GB - Rojo (PRODUCT)RED':
    'https://m.media-amazon.com/images/I/61lYnC2ZJFL._AC_SL1500_.jpg',
  'iPhone 13 Pro Max 256GB - Verde - Dorado':
    'https://m.media-amazon.com/images/I/61i8Vjb17SL._AC_SL1500_.jpg',
  'iPhone SE (3ra Generación) 128GB - Blanco':
    'https://m.media-amazon.com/images/I/51K3TKGLLLL._AC_SL1000_.jpg',
  'iPhone SE (3ra Generación) 64GB - Medianoche':
    'https://m.media-amazon.com/images/I/51K3TKGLLLL._AC_SL1000_.jpg',
  // ─── PS5 Games ────────────────────────────────────────────
  'Elden Ring':
    'https://m.media-amazon.com/images/I/81hPbvBTNFL._AC_SL1500_.jpg',
  'Elden Ring: Shadow of the Erdtree (GOTY)':
    'https://m.media-amazon.com/images/I/81hPbvBTNFL._AC_SL1500_.jpg',
  'God of War: Ragnarök':
    'https://m.media-amazon.com/images/I/71km3KPWYBL._AC_SL1500_.jpg',
  'God of War: Ragnarök - Valhalla Edition':
    'https://m.media-amazon.com/images/I/71km3KPWYBL._AC_SL1500_.jpg',
  'Marvel\'s Spider-Man 2':
    'https://m.media-amazon.com/images/I/71nBVN3B+4L._AC_SL1500_.jpg',
  'Marvel\'s Spider-Man: Miles Morales':
    'https://m.media-amazon.com/images/I/81jgFKj5uKL._AC_SL1500_.jpg',
  'Final Fantasy VII Rebirth':
    'https://m.media-amazon.com/images/I/81ZTZPGS37L._AC_SL1500_.jpg',
  'Final Fantasy XVI':
    'https://m.media-amazon.com/images/I/71sWDqyWqbL._AC_SL1500_.jpg',
  'Final Fantasy XVI + Final Fantasy VII Rebirth Bundle':
    'https://m.media-amazon.com/images/I/81ZTZPGS37L._AC_SL1500_.jpg',
  'Baldur\'s Gate 3':
    'https://m.media-amazon.com/images/I/819ANWGfuML._AC_SL1500_.jpg',
  'Hogwarts Legacy':
    'https://m.media-amazon.com/images/I/81d8UhEk8eL._AC_SL1500_.jpg',
  'Call of Duty: Modern Warfare III':
    'https://m.media-amazon.com/images/I/71PLGZ4CEKL._AC_SL1500_.jpg',
  'Call of Duty: Modern Warfare II':
    'https://m.media-amazon.com/images/I/81oOsBTzFpL._AC_SL1500_.jpg',
  'EA Sports FC 25 (FIFA 25)':
    'https://m.media-amazon.com/images/I/81D4Vv1EOML._AC_SL1500_.jpg',
  'EA Sports FC 24 (FIFA 24)':
    'https://m.media-amazon.com/images/I/71ooNHDlBQL._AC_SL1500_.jpg',
  'FIFA 23':
    'https://m.media-amazon.com/images/I/81dxnlQrFiL._AC_SL1500_.jpg',
  'NBA 2K25':
    'https://m.media-amazon.com/images/I/816YJLBMKVL._AC_SL1500_.jpg',
  'NBA 2K24 Kobe Bryant Edition':
    'https://m.media-amazon.com/images/I/81Wib2cXCdL._AC_SL1500_.jpg',
  'Mortal Kombat 1':
    'https://m.media-amazon.com/images/I/814lOh4gEzL._AC_SL1500_.jpg',
  'Mortal Kombat 11 Ultimate':
    'https://m.media-amazon.com/images/I/81LpLBZfTlL._AC_SL1500_.jpg',
  'Tekken 8':
    'https://m.media-amazon.com/images/I/81qjEBMqZtL._AC_SL1500_.jpg',
  'Tekken 7 - Legendary Edition':
    'https://m.media-amazon.com/images/I/91Kl7pSMXsL._AC_SL1500_.jpg',
  'Street Fighter 6':
    'https://m.media-amazon.com/images/I/81Fp8fSiLML._AC_SL1500_.jpg',
  'Cyberpunk 2077: Ultimate Edition':
    'https://m.media-amazon.com/images/I/81HoJyaJXOL._AC_SL1500_.jpg',
  'Resident Evil 4 Remake':
    'https://m.media-amazon.com/images/I/81N4Dj0SWZL._AC_SL1500_.jpg',
  'Resident Evil Village':
    'https://m.media-amazon.com/images/I/81E8LBzAdNL._AC_SL1500_.jpg',
  'Dead Space Remake':
    'https://m.media-amazon.com/images/I/71BKhZ0y4OL._AC_SL1500_.jpg',
  'Like a Dragon: Infinite Wealth':
    'https://m.media-amazon.com/images/I/81qmm3jCo-L._AC_SL1500_.jpg',
  'Like a Dragon: Ishin!':
    'https://m.media-amazon.com/images/I/81KpL3LBtYL._AC_SL1500_.jpg',
  'Dragon\'s Dogma 2':
    'https://m.media-amazon.com/images/I/81LHpM7XBVL._AC_SL1500_.jpg',
  'Rise of the Ronin':
    'https://m.media-amazon.com/images/I/71wSCl9cjRL._AC_SL1500_.jpg',
  'Avatar: Frontiers of Pandora':
    'https://m.media-amazon.com/images/I/81m6lv03nEL._AC_SL1500_.jpg',
  'Diablo IV':
    'https://m.media-amazon.com/images/I/81JhzFzgLuL._AC_SL1500_.jpg',
  'Star Wars Jedi: Survivor':
    'https://m.media-amazon.com/images/I/81kzOE2Y9ZL._AC_SL1500_.jpg',
  'Star Wars Jedi: Fallen Order Deluxe':
    'https://m.media-amazon.com/images/I/81WfSTtpSNL._AC_SL1500_.jpg',
  'The Last of Us Part I':
    'https://m.media-amazon.com/images/I/81ZtALKq8lL._AC_SL1500_.jpg',
  'The Last of Us Part II Remastered':
    'https://m.media-amazon.com/images/I/71yNPLCQFWL._AC_SL1500_.jpg',
  'Horizon: Forbidden West':
    'https://m.media-amazon.com/images/I/81RCCWOXgFL._AC_SL1500_.jpg',
  'Horizon: Forbidden West - Complete Edition':
    'https://m.media-amazon.com/images/I/81RCCWOXgFL._AC_SL1500_.jpg',
  'Gran Turismo 7':
    'https://m.media-amazon.com/images/I/81IXvuNJnJL._AC_SL1500_.jpg',
  'Returnal':
    'https://m.media-amazon.com/images/I/81pzv5WDVZL._AC_SL1500_.jpg',
  'Demon\'s Souls Remake':
    'https://m.media-amazon.com/images/I/81JcBZKLkGL._AC_SL1500_.jpg',
  'Ratchet & Clank: Rift Apart':
    'https://m.media-amazon.com/images/I/81w2CrCWfKL._AC_SL1500_.jpg',
  'Ghost of Tsushima: Director\'s Cut':
    'https://m.media-amazon.com/images/I/91jyIudgTQL._AC_SL1500_.jpg',
  'A Plague Tale: Requiem':
    'https://m.media-amazon.com/images/I/81zWrQ+4wXL._AC_SL1500_.jpg',
  'Alan Wake 2 - Deluxe Edition':
    'https://m.media-amazon.com/images/I/81s4xRnrfkL._AC_SL1500_.jpg',
  'Assassin\'s Creed Mirage':
    'https://m.media-amazon.com/images/I/81e0+t+cPnL._AC_SL1500_.jpg',
  'Assassin\'s Creed Valhalla - Complete Edition':
    'https://m.media-amazon.com/images/I/81KGFm5cFvL._AC_SL1500_.jpg',
  'Lies of P':
    'https://m.media-amazon.com/images/I/81NeU4WqPjL._AC_SL1500_.jpg',
  'Palworld (Collector\'s Edition)':
    'https://m.media-amazon.com/images/I/71jjLY0knaL._AC_SL1500_.jpg',
  'Persona 5 Royal':
    'https://m.media-amazon.com/images/I/81TQXZF5PEL._AC_SL1500_.jpg',
  'Persona 3 Reload':
    'https://m.media-amazon.com/images/I/81XwT4+AJLL._AC_SL1500_.jpg',
  'Borderlands 3: Ultimate Edition':
    'https://m.media-amazon.com/images/I/71eRqSYoqML._AC_SL1500_.jpg',
  'BioShock: The Collection':
    'https://m.media-amazon.com/images/I/81RvU+oqZyL._AC_SL1500_.jpg',
  'Crash Bandicoot 4: It\'s About Time':
    'https://m.media-amazon.com/images/I/81E5GFVgqjL._AC_SL1500_.jpg',
  'Crash Team Rumble Deluxe':
    'https://m.media-amazon.com/images/I/81VdHYfNMaL._AC_SL1500_.jpg',
  'Crisis Core: Final Fantasy VII Reunion':
    'https://m.media-amazon.com/images/I/81O6mBSdEXL._AC_SL1500_.jpg',
  'Deathloop':
    'https://m.media-amazon.com/images/I/81MNHsJpqQL._AC_SL1500_.jpg',
  'Destroy All Humans! 2 - Reprobed':
    'https://m.media-amazon.com/images/I/815NXR39VML._AC_SL1500_.jpg',
  'Devil May Cry 5 Special Edition':
    'https://m.media-amazon.com/images/I/81DUt2+aaLL._AC_SL1500_.jpg',
  'Devil May Cry 5 + Devil May Cry 4 Bundle':
    'https://m.media-amazon.com/images/I/81DUt2+aaLL._AC_SL1500_.jpg',
  'Dying Light 2 Stay Human':
    'https://m.media-amazon.com/images/I/812NQOW8E7L._AC_SL1500_.jpg',
  'eFootball 2024 Premium Player Pack':
    'https://m.media-amazon.com/images/I/81FqibqdqLL._AC_SL1500_.jpg',
  'F1 23':
    'https://m.media-amazon.com/images/I/71GBbDJpQ-L._AC_SL1500_.jpg',
  'F1 24':
    'https://m.media-amazon.com/images/I/714jYLfK+nL._AC_SL1500_.jpg',
  'Far Cry 6':
    'https://m.media-amazon.com/images/I/81BRxqJqKNL._AC_SL1500_.jpg',
  'Forspoken':
    'https://m.media-amazon.com/images/I/81TT2BO8mdL._AC_SL1500_.jpg',
  'Ghostbusters: Spirits Unleashed':
    'https://m.media-amazon.com/images/I/81XJUDlAEGL._AC_SL1500_.jpg',
  'Ghostwire: Tokyo':
    'https://m.media-amazon.com/images/I/81z1V43tMUL._AC_SL1500_.jpg',
  'GTA V Premium Edition (PS5)':
    'https://m.media-amazon.com/images/I/81ywjSt7nqL._AC_SL1500_.jpg',
  'It Takes Two':
    'https://m.media-amazon.com/images/I/81g58gB8OxL._AC_SL1500_.jpg',
  'Kena: Bridge of Spirits - Deluxe Edition':
    'https://m.media-amazon.com/images/I/91+hFsWJtyL._AC_SL1500_.jpg',
  'Kingdom Hearts III + Re Mind':
    'https://m.media-amazon.com/images/I/91mK7v0aHoL._AC_SL1500_.jpg',
  'Mafia: Definitive Edition':
    'https://m.media-amazon.com/images/I/81JbUuUXPbL._AC_SL1500_.jpg',
  'Madden NFL 25':
    'https://m.media-amazon.com/images/I/81B8K9sQNYL._AC_SL1500_.jpg',
  'Monster Hunter Rise: Sunbreak':
    'https://m.media-amazon.com/images/I/81r0VWK0oPL._AC_SL1500_.jpg',
  'Monster Hunter: World - Iceborne Master Edition':
    'https://m.media-amazon.com/images/I/81h7rLkv4wL._AC_SL1500_.jpg',
  'Nioh 2 - The Complete Edition':
    'https://m.media-amazon.com/images/I/81Qk0mP09EL._AC_SL1500_.jpg',
  'Overwatch 2 - Coins 10000':
    'https://m.media-amazon.com/images/I/81FVG2b24IL._AC_SL1500_.jpg',
  'Prince of Persia: The Lost Crown':
    'https://m.media-amazon.com/images/I/81LhSfSH+gL._AC_SL1500_.jpg',
  'Red Dead Redemption 2':
    'https://m.media-amazon.com/images/I/81AyGBD6UuL._AC_SL1500_.jpg',
  'Remnant II: Ultimate Edition':
    'https://m.media-amazon.com/images/I/81GY7AJHPHL._AC_SL1500_.jpg',
  'Sackboy: A Big Adventure':
    'https://m.media-amazon.com/images/I/81y2YKHoOPL._AC_SL1500_.jpg',
  'Sekiro: Shadows Die Twice - GOTY Edition':
    'https://m.media-amazon.com/images/I/81R9NWJ0aXL._AC_SL1500_.jpg',
  'Sifu':
    'https://m.media-amazon.com/images/I/81hSFaJXJ9L._AC_SL1500_.jpg',
  'Sonic Frontiers':
    'https://m.media-amazon.com/images/I/819WvNME4PL._AC_SL1500_.jpg',
  'Sonic Superstars':
    'https://m.media-amazon.com/images/I/81y0e9c9nEL._AC_SL1500_.jpg',
  'Spyro Reignited Trilogy':
    'https://m.media-amazon.com/images/I/91Fq9QJy09L._AC_SL1500_.jpg',
  'Stranger of Paradise: Final Fantasy Origin':
    'https://m.media-amazon.com/images/I/81bTWf2LXML._AC_SL1500_.jpg',
  'Stray':
    'https://m.media-amazon.com/images/I/81Gf26FMIOL._AC_SL1500_.jpg',
  'Suicide Squad: Kill the Justice League':
    'https://m.media-amazon.com/images/I/81FVxiamJML._AC_SL1500_.jpg',
  'The Callisto Protocol':
    'https://m.media-amazon.com/images/I/81x+FEe1oQL._AC_SL1500_.jpg',
  'The Quarry':
    'https://m.media-amazon.com/images/I/81YAzdg1ORL._AC_SL1500_.jpg',
  'Tiny Tina\'s Wonderlands':
    'https://m.media-amazon.com/images/I/81KL3gmpB4L._AC_SL1500_.jpg',
  'UFC 5':
    'https://m.media-amazon.com/images/I/81jsmPdkZqL._AC_SL1500_.jpg',
  'Uncharted: Legacy of Thieves Collection':
    'https://m.media-amazon.com/images/I/81MRdh16NQL._AC_SL1500_.jpg',
  'Watch Dogs: Legion':
    'https://m.media-amazon.com/images/I/81B5g8L+TjL._AC_SL1500_.jpg',
  'Wo Long: Fallen Dynasty':
    'https://m.media-amazon.com/images/I/81LihT0H7KL._AC_SL1500_.jpg',
  'WWE 2K24':
    'https://m.media-amazon.com/images/I/81C79S5oJfL._AC_SL1500_.jpg',
  'Dragon Ball Z: Kakarot + A New Power Awakens':
    'https://m.media-amazon.com/images/I/811yjLVAHkL._AC_SL1500_.jpg',
  'Death Stranding: Director\'s Cut':
    'https://m.media-amazon.com/images/I/81IvXlm-c1L._AC_SL1500_.jpg',
  'Gotham Knights':
    'https://m.media-amazon.com/images/I/81U9w4OmEzL._AC_SL1500_.jpg',
};

// ============================================================
// Main
// ============================================================
async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('is_active', true);

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Found ${products.length} active products`);

  let priceUpdated = 0, imageUpdated = 0, skipped = 0;

  for (const product of products) {
    const name = product.name;
    const newPrice = PRICES[name];
    const imageUrl = IMAGES[name];

    // Update price
    if (newPrice !== undefined && newPrice !== product.price) {
      const { error: pe } = await supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', product.id);
      if (pe) { console.error(`  ✗ price ${name}: ${pe.message}`); }
      else { priceUpdated++; }
    }

    // Update image (upsert into product_images)
    if (imageUrl) {
      // Check if image already exists
      const { data: existing } = await supabase
        .from('product_images')
        .select('id, storage_path')
        .eq('product_id', product.id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing
        if (existing[0].storage_path !== imageUrl) {
          const { error: ie } = await supabase
            .from('product_images')
            .update({ storage_path: imageUrl })
            .eq('id', existing[0].id);
          if (ie) { console.error(`  ✗ img update ${name}: ${ie.message}`); }
          else { imageUpdated++; }
        } else {
          skipped++;
        }
      } else {
        // Insert new
        const { error: ie } = await supabase
          .from('product_images')
          .insert({ product_id: product.id, storage_path: imageUrl, sort: 0 });
        if (ie) { console.error(`  ✗ img insert ${name}: ${ie.message}`); }
        else { imageUpdated++; }
      }
    } else {
      console.log(`  ⚠  No image mapping for: ${name}`);
    }
  }

  console.log(`\n✅ Done:`);
  console.log(`   Prices updated: ${priceUpdated}`);
  console.log(`   Images updated/inserted: ${imageUpdated}`);
  console.log(`   Images already correct: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
