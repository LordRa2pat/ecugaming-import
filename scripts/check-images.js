const https = require('https');
const fs = require('fs');

https.get('https://ecugamingimport.online/api/stock', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const products = JSON.parse(data);
        const noImg = products.filter(p => !p.image_url);
        const withImg = products.filter(p => p.image_url);
        console.log(`Total: ${products.length} | Con imagen: ${withImg.length} | Sin imagen: ${noImg.length}`);
        console.log('\nSin imagen:');
        noImg.forEach(p => console.log(`  ${p.id} | ${p.name} | ${p.category}`));
    });
}).on('error', e => console.error(e));
