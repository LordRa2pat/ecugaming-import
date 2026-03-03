/**
 * catalog-curate.js
 * Deactivates all existing products and inserts a clean catalog:
 *   - 20 PS5 products (consoles, accessories)
 *   - 20 iPhone products
 *   - 20 Consolas (Xbox, Switch, etc.)
 *   - 100 PS5 physical games
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Category IDs from DB ────────────────────────────────────────────────────
const CAT = {
  Consolas: '2afd0fb7-73de-4d10-8526-cb362b9cc7a6',
  General:  '9ef20183-0c2c-4fb6-9552-e73887d28e0f',
  iPhone:   'b34124ff-2394-45e4-b69e-729274654367',
  Juegos:   'bd83d164-c904-453c-87f6-ac94074c1ced',
  Accesorios:'8209b472-f651-401f-8355-9cd4e3f91eeb',
};

function slug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ── PS5 Products (20) ────────────────────────────────────────────────────────
const PS5_PRODUCTS = [
  { name: 'PlayStation 5 Slim - Edición Disco (1TB)', price: 649, sale_price: null, stock: 8, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-edition-product-thumbnail-01-en-14sep23?$native$',
    desc: 'La nueva y más delgada PS5 con lector de disco Ultra HD Blu-ray. 1TB SSD, ray tracing, 120fps. Incluye DualSense.' },
  { name: 'PlayStation 5 Slim - Edición Digital (1TB)', price: 519, sale_price: 499, stock: 6, badge: 'Súper OFERTA',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-digital-edition-product-thumbnail-01-en-14sep23?$native$',
    desc: 'PS5 Slim sin lector de discos, 1TB SSD. La más compacta de la familia PS5. Ideal para juegos digitales.' },
  { name: 'PlayStation 5 Pro (2TB)', price: 899, sale_price: null, stock: 4, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-pro-console-overview-01-en-24sep24?$native$',
    desc: 'La PS5 más poderosa. GPU 45% más rápida, PlayStation Spectral Super Resolution (PSSR), 2TB SSD.' },
  { name: 'PlayStation 5 Slim Disc + God of War Ragnarök Bundle', price: 699, sale_price: null, stock: 5, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-edition-product-thumbnail-01-en-14sep23?$native$',
    desc: 'Bundle PS5 Slim Disc con God of War Ragnarök incluido. Descubre el épico viaje de Kratos.' },
  { name: 'PlayStation 5 Slim Disc + Marvel\'s Spider-Man 2 Bundle', price: 699, sale_price: null, stock: 4, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-edition-product-thumbnail-01-en-14sep23?$native$',
    desc: 'Bundle PS5 Slim con Spider-Man 2. Juega como Peter Parker y Miles Morales en Nueva York.' },
  { name: 'DualSense Wireless Controller - Midnight Black', price: 89, sale_price: null, stock: 15, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-wireless-controller-midnight-black-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Control inalámbrico DualSense con retroalimentación háptica y gatillos adaptativos. Color Midnight Black.' },
  { name: 'DualSense Wireless Controller - Cosmic Red', price: 89, sale_price: null, stock: 12, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-cosmic-red-controller-product-thumbnail-01-en-14jun21?$native$',
    desc: 'Control inalámbrico DualSense con retroalimentación háptica. Color Cosmic Red exclusivo.' },
  { name: 'DualSense Wireless Controller - Galactic Purple', price: 89, sale_price: null, stock: 10, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-wireless-controller-galactic-purple-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Control DualSense en vibrante color Galactic Purple. Con gatillos adaptativos de última generación.' },
  { name: 'DualSense Wireless Controller - Nova Pink', price: 89, sale_price: 79, stock: 8, badge: 'Remate',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-wireless-controller-nova-pink-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Control DualSense edición Nova Pink. Tecnología háptica avanzada para una experiencia inmersiva.' },
  { name: 'DualSense Edge Wireless Controller', price: 229, sale_price: null, stock: 6, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-edge-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Control pro totalmente personalizable. Perfiles, palancas intercambiables, gatillos ajustables.' },
  { name: 'DualSense Charging Station', price: 39, sale_price: null, stock: 20, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-dualsense-charging-station-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Carga simultáneamente dos controles DualSense sin cables USB. Base oficial de Sony.' },
  { name: 'PS5 Media Remote', price: 35, sale_price: null, stock: 15, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-media-remote-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Control multimedia para PS5. Acceso rápido a Netflix, Disney+, Spotify y más. Con control de volumen TV.' },
  { name: 'Pulse 3D Wireless Headset - Midnight Black', price: 129, sale_price: null, stock: 8, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/pulse-3d-wireless-headset-midnight-black-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Auricular oficial PS5 con audio 3D Tempest. Micrófono dual con cancelación de ruido. Color Midnight Black.' },
  { name: 'Pulse 3D Wireless Headset - Blanco', price: 129, sale_price: 109, stock: 6, badge: 'Súper OFERTA',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/pulse-3d-wireless-headset-white-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Auricular oficial PS5 con tecnología de audio 3D. Diseño ergonómico y batería de larga duración.' },
  { name: 'PlayStation Portal Remote Player', price: 249, sale_price: null, stock: 5, badge: 'Nuevo',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/playstation-portal-product-thumbnail-01-en-24oct23?$native$',
    desc: 'Juega tus juegos PS5 desde cualquier lugar via Wi-Fi. Pantalla LCD 8" 1080p/60fps con DualSense integrado.' },
  { name: 'PS5 HD Camera', price: 69, sale_price: null, stock: 10, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-hd-camera-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Cámara HD oficial para PS5 con doble lente gran angular. Compatible con PS VR2 y streaming.' },
  { name: 'PlayStation VR2', price: 599, sale_price: null, stock: 3, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/psvr2-product-thumbnail-01-en-14sep21?$native$',
    desc: 'Visor VR de última generación para PS5. Pantalla OLED 4K HDR, eye tracking, haptic feedback.' },
  { name: 'PS5 SSD Expansion 2TB (WD_BLACK SN850P)', price: 189, sale_price: null, stock: 7, badge: null,
    img: 'https://shop.westerndigital.com/content/dam/store/en-us/assets/products/internal-game-drives/wd-black-sn850p-nvme-ssd-for-ps5/gallery/wd-black-sn850p-nvme-ssd-for-ps5-left.png.thumb.1280.1280.png',
    desc: 'Amplía el almacenamiento de tu PS5 con 2TB adicionales. Velocidades hasta 7300 MB/s. Incluye disipador.' },
  { name: 'Funda para PS5 Slim - Carbon Black', price: 49, sale_price: null, stock: 12, badge: null,
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-covers-carbon-black-product-thumbnail-01-en-14sep23?$native$',
    desc: 'Faceplates oficiales para personalizar tu PS5 Slim. Material duradero. Color Carbon Black.' },
  { name: 'PS5 Slim Console Cover + DualSense Bundle - Deep Earth Collection', price: 139, sale_price: null, stock: 4, badge: 'Nuevo',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-covers-deep-earth-product-thumbnail-01-en-14sep23?$native$',
    desc: 'Bundle exclusivo Deep Earth Collection: funda para PS5 Slim + DualSense en colores tierra únicos.' },
];

// ── iPhone Products (20) ────────────────────────────────────────────────────
const IPHONE_PRODUCTS = [
  { name: 'iPhone 16 Pro Max 256GB - Titanio Negro', price: 1399, sale_price: null, stock: 6, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-max-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 Pro Max con chip A18 Pro, cámara de 48MP con zoom óptico 5x, pantalla Super Retina XDR 6.9". 256GB.' },
  { name: 'iPhone 16 Pro Max 512GB - Titanio Desierto', price: 1599, sale_price: null, stock: 4, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-max-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 Pro Max 512GB en exclusivo color Titanio Desierto. El iPhone más potente jamás creado.' },
  { name: 'iPhone 16 Pro 128GB - Titanio Natural', price: 1149, sale_price: null, stock: 8, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 Pro con chip A18 Pro, pantalla ProMotion 6.3", cámara gran angular 48MP. 128GB.' },
  { name: 'iPhone 16 Pro 256GB - Titanio Blanco', price: 1299, sale_price: null, stock: 5, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 Pro 256GB en elegante Titanio Blanco. Cámara pro con teleobjetivo 5x y botón Acción.' },
  { name: 'iPhone 16 128GB - Negro', price: 849, sale_price: null, stock: 10, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 con chip A18, botón Acción y botón Cámara, pantalla OLED 6.1". 128GB.' },
  { name: 'iPhone 16 128GB - Blanco', price: 849, sale_price: 799, stock: 8, badge: 'Súper OFERTA',
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 en color Blanco. Apple Intelligence, Dynamic Island y chip A18. 128GB.' },
  { name: 'iPhone 16 256GB - Rosa', price: 959, sale_price: null, stock: 7, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 256GB en delicado color Rosa. Cámara Fusion 48MP con fotografía computacional avanzada.' },
  { name: 'iPhone 16 Plus 128GB - Ultramarino', price: 979, sale_price: null, stock: 5, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-plus-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 Plus con pantalla Super Retina XDR 6.7" y batería de larga duración. 128GB.' },
  { name: 'iPhone 16 Plus 256GB - Negro', price: 1099, sale_price: null, stock: 4, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-plus-finish-unselect-gallery-1-202409?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 16 Plus 256GB. La pantalla más grande de la línea estándar. Chip A18 y Apple Intelligence.' },
  { name: 'iPhone 15 128GB - Rosa', price: 699, sale_price: 649, stock: 10, badge: 'Súper OFERTA',
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-unselect-gallery-1-202309?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 15 con Dynamic Island, cámara 48MP y USB-C. Color Rosa. 128GB.' },
  { name: 'iPhone 15 256GB - Azul', price: 799, sale_price: null, stock: 8, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-unselect-gallery-1-202309?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 15 en color Azul con 256GB. Conector USB-C y cámara 48MP con modo Retrato mejorado.' },
  { name: 'iPhone 15 Plus 128GB - Verde', price: 829, sale_price: null, stock: 6, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-plus-finish-unselect-gallery-1-202309?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 15 Plus en verde, con la pantalla de 6.7" más potente de la línea estándar. 128GB.' },
  { name: 'iPhone 15 Pro 128GB - Titanio Natural', price: 999, sale_price: null, stock: 7, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-unselect-gallery-1-202309?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 15 Pro con titanio de grado aeroespacial, chip A17 Pro y cámara tetraprismática. 128GB.' },
  { name: 'iPhone 15 Pro 256GB - Titanio Negro', price: 1099, sale_price: null, stock: 5, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-unselect-gallery-1-202309?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 15 Pro 256GB en Titanio Negro. El más avanzado con zoom óptico 3x y ProRes Video.' },
  { name: 'iPhone 15 Pro Max 256GB - Titanio Azul', price: 1249, sale_price: null, stock: 4, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-max-finish-unselect-gallery-1-202309?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 15 Pro Max 256GB. Zoom óptico 5x tetraprismático, pantalla 6.7" ProMotion y chip A17 Pro.' },
  { name: 'iPhone 14 128GB - Medianoche', price: 579, sale_price: 549, stock: 12, badge: 'Remate',
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-unselect-gallery-1-202209?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 14 en color Medianoche. Chip A15 Bionic, cámara 12MP y Modo Acción. 128GB. Excelente precio.' },
  { name: 'iPhone 14 256GB - Azul', price: 679, sale_price: null, stock: 9, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-unselect-gallery-1-202209?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 14 256GB en color Azul. Diseño icónico con mejoras de cámara y autonomía.' },
  { name: 'iPhone 14 Plus 128GB - Rojo (PRODUCT)RED', price: 699, sale_price: 659, stock: 7, badge: 'Súper OFERTA',
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-plus-finish-unselect-gallery-1-202209?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone 14 Plus 128GB en PRODUCT(RED). Pantalla de 6.7", batería récord y apoya fundaciones benéficas.' },
  { name: 'iPhone SE (3ra Generación) 64GB - Medianoche', price: 449, sale_price: 399, stock: 15, badge: 'Remate',
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-3rd-gen-finish-unselect-gallery-1-202203?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'El iPhone más asequible con chip A15 Bionic. Diseño compacto 4.7", Touch ID y cámara de 12MP.' },
  { name: 'iPhone SE (3ra Generación) 128GB - Blanco', price: 499, sale_price: null, stock: 10, badge: null,
    img: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-3rd-gen-finish-unselect-gallery-1-202203?wid=5120&hei=2880&fmt=webp&qlt=70',
    desc: 'iPhone SE 128GB. Potencia A15 Bionic en formato compacto. Soporte 5G y Face ID no incluido.' },
];

// ── Other Consolas (20) ─────────────────────────────────────────────────────
const CONSOLAS_PRODUCTS = [
  { name: 'Nintendo Switch OLED - Edición Blanca', price: 419, sale_price: null, stock: 8, badge: null, brand: 'Nintendo',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Nintendo Switch OLED con pantalla AMOLED 7", dock con LAN, 64GB internos y Joy-Con blancos.' },
  { name: 'Nintendo Switch OLED - Edición Splatoon 3', price: 449, sale_price: null, stock: 5, badge: 'Nuevo', brand: 'Nintendo',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Edición especial Splatoon 3. Joy-Con en amarillo neon con diseño exclusivo del juego.' },
  { name: 'Nintendo Switch Lite - Coral', price: 259, sale_price: null, stock: 10, badge: null, brand: 'Nintendo',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Nintendo Switch Lite en color Coral. Compacta, ligera y dedicada al juego portátil. Pantalla 5.5".' },
  { name: 'Nintendo Switch Lite - Turquesa', price: 259, sale_price: 239, stock: 8, badge: 'Súper OFERTA', brand: 'Nintendo',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Nintendo Switch Lite en Turquesa. Perfecta para jugar en cualquier lugar.' },
  { name: 'Nintendo Switch (V2) Neon + Mario Kart 8 Deluxe Bundle', price: 389, sale_price: null, stock: 6, badge: null, brand: 'Nintendo',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Nintendo Switch con Joy-Con Neon + Mario Kart 8 Deluxe incluido. La combinación perfecta para la familia.' },
  { name: 'Xbox Series X (1TB)', price: 589, sale_price: null, stock: 6, badge: null, brand: 'Microsoft',
    img: 'https://cms-assets.xboxservices.com/assets/bd/10/bd10b098-db2e-4e49-9952-7b48df3990da.png?n=XSX_SuperHero_Console_350_A.png',
    desc: 'Xbox Series X: la consola más poderosa de Microsoft. 1TB SSD NVMe, 4K 120fps, retrocompatibilidad total.' },
  { name: 'Xbox Series X - Edición Especial Galaxy Black', price: 629, sale_price: null, stock: 3, badge: 'Nuevo', brand: 'Microsoft',
    img: 'https://cms-assets.xboxservices.com/assets/bd/10/bd10b098-db2e-4e49-9952-7b48df3990da.png?n=XSX_SuperHero_Console_350_A.png',
    desc: 'Xbox Series X edición especial con diseño estelar único. 1TB SSD, rendimiento 4K nativo.' },
  { name: 'Xbox Series S 512GB - Robot White', price: 349, sale_price: null, stock: 10, badge: null, brand: 'Microsoft',
    img: 'https://cms-assets.xboxservices.com/assets/1d/95/1d955f63-0c66-4c4d-9b59-5ef55cc14434.png?n=XSS_SuperHero_Console_350_A.png',
    desc: 'Xbox Series S: potencia next-gen en formato compacto. 512GB SSD, 120fps, Game Pass Compatible.' },
  { name: 'Xbox Series S 1TB - Carbon Black', price: 399, sale_price: null, stock: 7, badge: null, brand: 'Microsoft',
    img: 'https://cms-assets.xboxservices.com/assets/1d/95/1d955f63-0c66-4c4d-9b59-5ef55cc14434.png?n=XSS_SuperHero_Console_350_A.png',
    desc: 'Xbox Series S en Carbon Black con 1TB SSD. Más espacio para tu librería digital.' },
  { name: 'Xbox Series S + 3 Meses Game Pass Ultimate', price: 419, sale_price: null, stock: 5, badge: null, brand: 'Microsoft',
    img: 'https://cms-assets.xboxservices.com/assets/1d/95/1d955f63-0c66-4c4d-9b59-5ef55cc14434.png?n=XSS_SuperHero_Console_350_A.png',
    desc: 'Bundle Xbox Series S + Game Pass Ultimate 3 meses. Acceso a +100 juegos desde el día uno.' },
  { name: 'Steam Deck OLED 512GB', price: 549, sale_price: null, stock: 5, badge: null, brand: 'Valve',
    img: 'https://store.akamai.steamstatic.com/public/shared/images/responsive/share_steam_logo.png',
    desc: 'Steam Deck OLED: pantalla HDR 7.4" AMOLED, 512GB, batería mejorada. PC portátil para gamers.' },
  { name: 'Steam Deck OLED 1TB - Edición Limitada', price: 649, sale_price: null, stock: 3, badge: 'Nuevo', brand: 'Valve',
    img: 'https://store.akamai.steamstatic.com/public/shared/images/responsive/share_steam_logo.png',
    desc: 'Steam Deck OLED 1TB edición limitada translúcida. La mejor experiencia portátil de PC gaming.' },
  { name: 'PlayStation 4 Pro 1TB - Reacondicionado', price: 299, sale_price: 279, stock: 4, badge: 'Remate', brand: 'Sony',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps4-pro-product-thumbnail-01-en-14sep21?$native$',
    desc: 'PS4 Pro reacondicionada en excelente estado. 1TB, 4K, HDR, compatible con más de 3000 juegos.' },
  { name: 'Xbox One X 1TB - Reacondicionado', price: 269, sale_price: 249, stock: 3, badge: 'Remate', brand: 'Microsoft',
    img: 'https://cms-assets.xboxservices.com/assets/bd/10/bd10b098-db2e-4e49-9952-7b48df3990da.png?n=XSX_SuperHero_Console_350_A.png',
    desc: 'Xbox One X 1TB reacondicionada. 4K nativo, HDR y retrocompatibilidad con cientos de juegos Xbox.' },
  { name: 'Nintendo 3DS XL Rojo/Negro - Reacondicionado', price: 129, sale_price: 109, stock: 5, badge: 'Remate', brand: 'Nintendo',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Nintendo 3DS XL en estado excelente. Pantallas 3D sin gafas, biblioteca de cientos de juegos.' },
  { name: 'Game Boy Advance SP AGS-101 - Reacondicionado', price: 149, sale_price: null, stock: 4, badge: null, brand: 'Nintendo',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Game Boy Advance SP con pantalla retroiluminada AGS-101. Juega toda la biblioteca GBA/GB/GBC.' },
  { name: 'PlayStation Vita PCH-2000 - Reacondicionado', price: 179, sale_price: 159, stock: 3, badge: 'Remate', brand: 'Sony',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-digital-edition-product-thumbnail-01-en-14sep23?$native$',
    desc: 'PlayStation Vita edición delgada. Pantalla OLED 5", doble analógico, cámara frontal y trasera.' },
  { name: 'Sega Genesis Mini 2 + 60 Juegos', price: 119, sale_price: null, stock: 6, badge: null, brand: 'Sega',
    img: 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_auto/c_scale,w_300/ncom/software/switch/70010000012398/2e9aebeba975c553a79b63f50bb1c1b06e1fd5d2a9e1e8a58e5eec47e81fa6a0',
    desc: 'Sega Genesis Mini 2 con 60 juegos clásicos preinstalados. Nostalgia garantizada en formato compacto.' },
  { name: 'Retro Console 256GB - 30.000 Juegos', price: 89, sale_price: 79, stock: 15, badge: 'Súper OFERTA', brand: 'Retro Gaming',
    img: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-digital-edition-product-thumbnail-01-en-14sep23?$native$',
    desc: 'Consola retro con 30.000 juegos de NES, SNES, Genesis, GBA, N64, PS1 y más. HDMI 4K.' },
  { name: 'Xbox Wireless Controller - Carbon Black', price: 69, sale_price: null, stock: 18, badge: null, brand: 'Microsoft',
    img: 'https://cms-assets.xboxservices.com/assets/1d/95/1d955f63-0c66-4c4d-9b59-5ef55cc14434.png?n=XSS_SuperHero_Console_350_A.png',
    desc: 'Control inalámbrico Xbox compatible con Series X|S, One, Windows y móviles via Bluetooth.' },
];

// ── PS5 Games (100) ─────────────────────────────────────────────────────────
const PS5_GAME_IMG = 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-edition-product-thumbnail-01-en-14sep23?$native$';

const PS5_GAMES = [
  // Sony First-Party
  { name: 'Marvel\'s Spider-Man 2', price: 75, sale_price: null, stock: 20, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/cb007a8ce36cc0d79e6938fdf30e861ccf04bc60b6d27e5b.png' },
  { name: 'Marvel\'s Spider-Man: Miles Morales', price: 55, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202008/1020/T3h4bNdFqvaMhFRlWeFRvD1s.png' },
  { name: 'God of War: Ragnarök', price: 65, sale_price: null, stock: 25, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png' },
  { name: 'God of War: Ragnarök - Valhalla Edition', price: 79, sale_price: null, stock: 10, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png' },
  { name: 'Horizon: Forbidden West', price: 55, sale_price: null, stock: 20, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202010/0222/niMUubpU9y1PxNvYmDfF9DFP.png' },
  { name: 'Horizon: Forbidden West - Complete Edition', price: 65, sale_price: null, stock: 12, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202010/0222/niMUubpU9y1PxNvYmDfF9DFP.png' },
  { name: 'Gran Turismo 7', price: 60, sale_price: null, stock: 22, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202112/1420/N35bCQbRpGxhpx0hLW1OJFD3.png' },
  { name: 'Ratchet & Clank: Rift Apart', price: 55, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202103/0423/BHsqJMpYkdMKPFKsQdAlbuNM.png' },
  { name: 'Returnal', price: 50, sale_price: null, stock: 15, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202101/2500/r9zTfqDV2mHSHXH0aBcmB8VY.png' },
  { name: 'Demon\'s Souls Remake', price: 55, sale_price: 49, stock: 12, badge: 'Súper OFERTA', img: 'https://image.api.playstation.com/vulcan/ap/rnd/202010/0722/uSS6p5zySjmV7l7l4qEQ9z5b.png' },
  { name: 'Ghost of Tsushima: Director\'s Cut', price: 60, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202106/2423/zijHN4vr3fMBLRNFvzO09qBP.png' },
  { name: 'The Last of Us Part I', price: 60, sale_price: null, stock: 20, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202206/0617/fB7qBpNaZLRB9P7JPJVKG2mJ.png' },
  { name: 'The Last of Us Part II Remastered', price: 50, sale_price: null, stock: 15, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202309/1409/F6HHZDVlrwTb5x1nSTnB0r0A.png' },
  { name: 'Sackboy: A Big Adventure', price: 45, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202009/1515/TBvnzBrU3FxKBGZaRIAaMmyP.png' },
  { name: 'Uncharted: Legacy of Thieves Collection', price: 45, sale_price: null, stock: 14, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202110/1408/NKtH3OC6RDID5KH0E1fLgKkB.png' },
  // FromSoftware / Bandai
  { name: 'Elden Ring', price: 65, sale_price: null, stock: 30, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/aGhoaBerry4PaxaRFpzDDRToE.png' },
  { name: 'Elden Ring: Shadow of the Erdtree (GOTY)', price: 75, sale_price: null, stock: 15, badge: 'Nuevo', img: 'https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/aGhoaberry4PaxaRFpzDDRToE.png' },
  { name: 'Sekiro: Shadows Die Twice - GOTY Edition', price: 45, sale_price: null, stock: 12, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/aGhoaberry4PaxaRFpzDDRToE.png' },
  // Square Enix
  { name: 'Final Fantasy XVI', price: 65, sale_price: null, stock: 22, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202211/0711/kh4MiCbBRLeNabLpFxMRFiMi.png' },
  { name: 'Final Fantasy VII Rebirth', price: 75, sale_price: null, stock: 18, badge: 'Nuevo', img: 'https://image.api.playstation.com/vulcan/ap/rnd/202309/1409/0ac7e5e25bc7e2a0a9a0b0a7c9cba3b3.png' },
  { name: 'Final Fantasy XVI + Final Fantasy VII Rebirth Bundle', price: 119, sale_price: 99, stock: 8, badge: 'Súper OFERTA', img: 'https://image.api.playstation.com/vulcan/ap/rnd/202211/0711/kh4MiCbBRLeNabLpFxMRFiMi.png' },
  { name: 'Kingdom Hearts III + Re Mind', price: 40, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Crisis Core: Final Fantasy VII Reunion', price: 45, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Forspoken', price: 35, sale_price: 29, stock: 10, badge: 'Remate', img: PS5_GAME_IMG },
  // Capcom
  { name: 'Resident Evil Village', price: 45, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202101/1900/fxYAKGJmM2J8G5J0dCTXSrlo.png' },
  { name: 'Resident Evil 4 Remake', price: 60, sale_price: null, stock: 20, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202211/2222/xvBD4WoWXFhJxpVnnKpnXRTo.png' },
  { name: 'Street Fighter 6', price: 60, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202209/0201/4T3BkgbMfzjM7LFBH0S9J2Xt.png' },
  { name: 'Devil May Cry 5 Special Edition', price: 40, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Monster Hunter: World - Iceborne Master Edition', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Monster Hunter Rise: Sunbreak', price: 50, sale_price: null, stock: 15, badge: null, img: PS5_GAME_IMG },
  // Larian / CDPR
  { name: 'Baldur\'s Gate 3', price: 70, sale_price: null, stock: 20, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202307/2000/f0jfpBGKOOiZ8VNThCJv3YoC.png' },
  { name: 'Cyberpunk 2077: Ultimate Edition', price: 65, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202309/0116/a30a3e8f4e5d1f4e6c1fdfe4f19e53eb.png' },
  // WB / Avalanche
  { name: 'Hogwarts Legacy', price: 65, sale_price: null, stock: 25, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202212/0911/en8MFgFa2MURoLl51XxFYjxB.png' },
  { name: 'Mortal Kombat 1', price: 65, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202304/2800/b06b3e7f3c3d0e4b0f5a5f0e3c7b4e6a.png' },
  { name: 'Mortal Kombat 11 Ultimate', price: 40, sale_price: 35, stock: 16, badge: 'Súper OFERTA', img: PS5_GAME_IMG },
  { name: 'Gotham Knights', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Suicide Squad: Kill the Justice League', price: 35, sale_price: 29, stock: 10, badge: 'Remate', img: PS5_GAME_IMG },
  // Ubisoft
  { name: 'Assassin\'s Creed Mirage', price: 55, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/0622/b4f1d5c3f2e1b0a9c8d7e6f5g4h3i2j1.png' },
  { name: 'Assassin\'s Creed Valhalla - Complete Edition', price: 45, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Far Cry 6', price: 40, sale_price: null, stock: 15, badge: null, img: PS5_GAME_IMG },
  { name: 'Watch Dogs: Legion', price: 35, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Avatar: Frontiers of Pandora', price: 65, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Prince of Persia: The Lost Crown', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  // Activision / Blizzard
  { name: 'Call of Duty: Modern Warfare III', price: 65, sale_price: null, stock: 20, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202309/1510/73c0e9bc6dc0c4d06a06a9c1e8f8a1b9.png' },
  { name: 'Call of Duty: Modern Warfare II', price: 50, sale_price: null, stock: 18, badge: null, img: PS5_GAME_IMG },
  { name: 'Diablo IV', price: 60, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202212/0114/6l9FS0TNkY7L2d8DKy5G0Qmb.png' },
  { name: 'Overwatch 2 - Coins 10000', price: 29, sale_price: null, stock: 50, badge: null, img: PS5_GAME_IMG },
  // EA Sports
  { name: 'EA Sports FC 25 (FIFA 25)', price: 75, sale_price: null, stock: 30, badge: 'Nuevo', img: 'https://image.api.playstation.com/vulcan/ap/rnd/202408/2609/aa55c03ce4b4e64f4f0b8be3a0b3f5e7.png' },
  { name: 'EA Sports FC 24 (FIFA 24)', price: 50, sale_price: 40, stock: 20, badge: 'Súper OFERTA', img: PS5_GAME_IMG },
  { name: 'FIFA 23', price: 35, sale_price: 29, stock: 15, badge: 'Remate', img: PS5_GAME_IMG },
  { name: 'NBA 2K25', price: 75, sale_price: null, stock: 20, badge: 'Nuevo', img: 'https://image.api.playstation.com/vulcan/ap/rnd/202407/2609/0c8f3e5d2b4a7e9c1f8b5d3a2e6f0c4b.png' },
  { name: 'NBA 2K24 Kobe Bryant Edition', price: 50, sale_price: null, stock: 16, badge: null, img: PS5_GAME_IMG },
  { name: 'F1 24', price: 65, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'F1 23', price: 45, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'WWE 2K24', price: 65, sale_price: null, stock: 15, badge: null, img: PS5_GAME_IMG },
  { name: 'Madden NFL 25', price: 65, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  // 2K / Rockstar
  { name: 'GTA V Premium Edition (PS5)', price: 40, sale_price: null, stock: 25, badge: null, img: PS5_GAME_IMG },
  { name: 'Red Dead Redemption 2', price: 45, sale_price: null, stock: 18, badge: null, img: PS5_GAME_IMG },
  { name: 'BioShock: The Collection', price: 35, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Mafia: Definitive Edition', price: 35, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Borderlands 3: Ultimate Edition', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  // Bandai Namco / Atlus
  { name: 'Tekken 8', price: 65, sale_price: null, stock: 18, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202312/0715/e8f4c2b1a9d7e5c3f1b8a6d4e2f0c8b6.png' },
  { name: 'Tekken 7 - Legendary Edition', price: 35, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Dragon Ball Z: Kakarot + A New Power Awakens', price: 45, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Persona 5 Royal', price: 55, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202209/2116/P9jVAe8a1SjOjKPl4CYWXNe9.png' },
  { name: 'Persona 3 Reload', price: 65, sale_price: null, stock: 15, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202309/2600/ad77a12a81d40de185a99d11a9c3734f.png' },
  { name: 'Like a Dragon: Infinite Wealth', price: 70, sale_price: null, stock: 14, badge: 'Nuevo', img: PS5_GAME_IMG },
  { name: 'Like a Dragon: Ishin!', price: 50, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Wo Long: Fallen Dynasty', price: 50, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Lies of P', price: 55, sale_price: null, stock: 14, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202209/2715/U8C05eEiSLMpClXcHb1D1j9C.png' },
  // THQ Nordic / Focus
  { name: 'Destroy All Humans! 2 - Reprobed', price: 35, sale_price: null, stock: 10, badge: null, img: PS5_GAME_IMG },
  { name: 'Remnant II: Ultimate Edition', price: 60, sale_price: null, stock: 14, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202302/0822/d6c1f8b5a3e9c7b5d4f2e0c8a6b4d2f0.png' },
  { name: 'A Plague Tale: Requiem', price: 55, sale_price: null, stock: 14, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202209/2715/U8C05eEiSLMpClXcHb1D1j9C.png' },
  // Indie / AA
  { name: 'It Takes Two', price: 45, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202101/2600/WbA9VTBXGFjFlzRkHW6Z5JGm.png' },
  { name: 'Kena: Bridge of Spirits - Deluxe Edition', price: 40, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Stray', price: 35, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202206/0317/vVsS9ZohMUzpkNxBd8DzBOtR.png' },
  { name: 'Ghostwire: Tokyo', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Sifu', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Alan Wake 2 - Deluxe Edition', price: 60, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Star Wars Jedi: Survivor', price: 60, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202304/2800/c0f1e2d3b4a5c6d7e8f9a0b1c2d3e4f5.png' },
  { name: 'Star Wars Jedi: Fallen Order Deluxe', price: 35, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Deathloop', price: 35, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Dead Space Remake', price: 55, sale_price: null, stock: 15, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202210/2700/SIea2WN9kMolG1cTt8HFU7XT.png' },
  { name: 'The Callisto Protocol', price: 35, sale_price: 29, stock: 12, badge: 'Remate', img: PS5_GAME_IMG },
  { name: 'Dying Light 2 Stay Human', price: 45, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Sonic Frontiers', price: 45, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Sonic Superstars', price: 50, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  // Rise of the Ronin / Team Ninja
  { name: 'Rise of the Ronin', price: 70, sale_price: null, stock: 14, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202310/1016/7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d.png' },
  { name: 'Nioh 2 - The Complete Edition', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Stranger of Paradise: Final Fantasy Origin', price: 35, sale_price: null, stock: 10, badge: null, img: PS5_GAME_IMG },
  // Dragon's Dogma / Capcom
  { name: 'Dragon\'s Dogma 2', price: 70, sale_price: null, stock: 16, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202310/1508/c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7.png' },
  { name: 'Devil May Cry 5 + Devil May Cry 4 Bundle', price: 45, sale_price: null, stock: 10, badge: null, img: PS5_GAME_IMG },
  // Sports additional
  { name: 'UFC 5', price: 65, sale_price: null, stock: 15, badge: null, img: PS5_GAME_IMG },
  { name: 'eFootball 2024 Premium Player Pack', price: 29, sale_price: null, stock: 20, badge: null, img: PS5_GAME_IMG },
  // Death Stranding
  { name: 'Death Stranding: Director\'s Cut', price: 45, sale_price: null, stock: 14, badge: null, img: 'https://image.api.playstation.com/vulcan/ap/rnd/202107/0709/4LI7FRGfXASJm6EFwmPELKZ9.png' },
  // Returnal / Sackboy / Crash
  { name: 'Crash Bandicoot 4: It\'s About Time', price: 40, sale_price: null, stock: 14, badge: null, img: PS5_GAME_IMG },
  { name: 'Crash Team Rumble Deluxe', price: 35, sale_price: null, stock: 10, badge: null, img: PS5_GAME_IMG },
  { name: 'Spyro Reignited Trilogy', price: 35, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  // Additional
  { name: 'Ghostbusters: Spirits Unleashed', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'The Quarry', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Tiny Tina\'s Wonderlands', price: 40, sale_price: null, stock: 12, badge: null, img: PS5_GAME_IMG },
  { name: 'Palworld (Collector\'s Edition)', price: 55, sale_price: null, stock: 8, badge: 'Nuevo', img: PS5_GAME_IMG },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== EcuGaming Catalog Curation ===\n');

  // 1. Deactivate all existing products
  console.log('Step 1: Deactivating all existing products...');
  const { error: deactivateErr } = await supabase
    .from('products')
    .update({ is_active: false })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // update all
  if (deactivateErr) { console.error('Deactivate error:', deactivateErr); process.exit(1); }
  console.log('  ✓ All existing products deactivated\n');

  // 2. Clear product_images for deactivated products (optional, skip for speed)

  // 3. Insert new products
  const allSections = [
    { label: 'PS5 Products (20)', items: PS5_PRODUCTS, catId: CAT.Consolas, brand: 'Sony' },
    { label: 'iPhones (20)', items: IPHONE_PRODUCTS, catId: CAT.iPhone, brand: 'Apple' },
    { label: 'Consolas (20)', items: CONSOLAS_PRODUCTS, catId: CAT.Consolas, brand: 'Various' },
    { label: 'PS5 Games (100)', items: PS5_GAMES, catId: CAT.Juegos, brand: 'PlayStation Studios' },
  ];

  let totalInserted = 0;
  let totalImages = 0;

  for (const section of allSections) {
    console.log(`Step: Inserting ${section.label}...`);
    const insertErrors = [];

    for (const item of section.items) {
      const productSlug = slug(item.name) + '-' + Math.random().toString(36).slice(2, 6);
      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .insert({
          name: item.name,
          slug: productSlug,
          category_id: section.catId,
          brand: item.brand || section.brand || 'PlayStation',
          description: item.desc || `${item.name} disponible en Ecuador. Garantía incluida.`,
          price: item.price,
          sale_price: item.sale_price || null,
          stock: item.stock,
          badge: item.badge || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (prodErr) {
        insertErrors.push({ name: item.name, error: prodErr.message });
        continue;
      }
      totalInserted++;

      // Insert image
      const { error: imgErr } = await supabase
        .from('product_images')
        .insert({ product_id: prod.id, storage_path: item.img, sort: 0 });
      if (!imgErr) totalImages++;
    }

    if (insertErrors.length > 0) {
      console.log(`  ⚠ ${insertErrors.length} errors:`);
      insertErrors.forEach(e => console.log(`    - ${e.name}: ${e.error}`));
    }
    console.log(`  ✓ ${section.items.length - insertErrors.length} products inserted\n`);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total products inserted: ${totalInserted}`);
  console.log(`Total images added: ${totalImages}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
