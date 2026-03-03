const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/stock.json');

// Mapa de keywords a imágenes 4K/HD reales
const ImageMap = {
    'playstation 5 slim': 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-front-01-en-23oct23?$native$',
    'nintendo switch oled': 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/c_scale,w_500/ncom/en_US/switch/site-design-update/hardware/switch/nintendo-switch-oled-model-white-set/gallery/image01',
    'iphone 15 pro': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-model-unselect-gallery-2-202309?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693010534571',
    'iphone 16 pro': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-model-unselect-gallery-2-202409_GEO_US?wid=2560&hei=1440&fmt=p-jpg&qlt=80&.v=1725407027376',
    'samsung galaxy s24': 'https://images.samsung.com/is/image/samsung/p6pim/es/2401/gallery/es-galaxy-s24-s928-sm-s928bztqeub-539316664?$1300_1038_PNG$',
    'lenovo legion': 'https://p3-ofp.static.pub//fes/cms/2023/11/24/jovsow8ow1mhw77z5vj7512l2f144g659556.png',
    'macbook pro m3': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697230830200',
    'airpods max': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-max-select-silver-202011?wid=940&hei=1112&fmt=png-alpha&.v=1604021221000',
    'xbox series x': 'https://cms-assets.xboxservices.com/assets/c7/24/c7247a32-9df9-425b-aba2-de414dcacbbc.png?n=11111_Gallery-0_1350x759_02.png',
    'control dulasense': 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-white-front-01-en-26nov20?$native$',
    'meta quest 3': 'https://scontent.fuio21-1.fna.fbcdn.net/v/t39.8562-6/389028882_1371465223793739_8897589333575975005_n.png?_nc_cat=103&ccb=1-7&_nc_sid=f537c7&_nc_ohc=fK2jYm2sLdQQ7kNvgFvJ8r5&_nc_zt=21&_nc_ht=scontent.fuio21-1.fna&_nc_gid=AnK8T4kUf2L1nFRqgqOa1s6&oh=00_AYDo0-YrdS531Xj_9qT-57x5Ue5r77z5Ue5&oe=662B72E3'
};

const stock = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
let updatedCount = 0;

stock.forEach(item => {
    if (!item.image || item.image.length < 50) { // Si no tiene imagen base64 o url
        const nameLow = item.name.toLowerCase();
        for (let key in ImageMap) {
            if (nameLow.includes(key)) {
                item.image = ImageMap[key];
                // Set the most expensive/popular items as super clearance for the 3D slider to pick up!
                if (key.includes('iphone 16') || key.includes('playstation 5') || key.includes('xbox series x')) {
                    item.is_clearance = true;
                    item.old_price = item.price * 1.25; // 25% off
                }
                updatedCount++;
                break;
            }
        }
    }
});

fs.writeFileSync(DATA_FILE, JSON.stringify(stock, null, 2));
console.log(`✅ Inyectadas imágenes reales en ${updatedCount} productos top.`);
