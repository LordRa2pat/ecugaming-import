const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const categories = [
    { name: "iPhone", templates: ["iPhone 15", "iPhone 14", "iPhone 13", "iPhone 12", "iPhone 11", "iPhone SE"], colors: ["Graphite", "Silver", "Gold", "Pacific Blue", "Sierra Blue", "Alpine Green", "Deep Purple", "Space Black", "Natural Titanium"], storage: ["128GB", "256GB", "512GB", "1TB"], basePrice: 400 },
    { name: "Consolas", templates: ["PS5", "PS5 Slim", "PS4 Pro", "Xbox Series X", "Xbox Series S", "Nintendo Switch OLED", "Nintendo Switch Lite"], colors: ["Standard", "Limited Edition", "Special Edition"], storage: ["500GB", "1TB", "2TB"], basePrice: 300 },
    { name: "Juegos PS5", templates: ["God of War Ragnarok", "Spider-Man 2", "Elden Ring", "Final Fantasy XVI", "Horizon Forbidden West", "Ratchet & Clank: Rift Apart", "Returnal", "Gran Turismo 7", "The Last of Us Part I"], basePrice: 40 },
    { name: "Juegos Nintendo", templates: ["Zelda: Tears of the Kingdom", "Mario Bros Wonder", "Mario Kart 8", "Pokémon Scarlet", "Pokémon Violet", "Metroid Dread", "Splatoon 3", "Kirby and the Forgotten Land"], basePrice: 50 },
    { name: "Retro", templates: ["Gameboy Color", "NES Classic", "SNES Classic", "GameCube", "N64", "Sega Genesis"], colors: ["Berry", "Teal", "Grape", "Standard"], basePrice: 100 },
    { name: "Componentes PC", templates: ["NVIDIA RTX 4090", "RTX 4080", "RTX 3070", "AMD Ryzen 9 7950X", "Ryzen 7 5800X", "Corsair Vengeance 32GB RAM", "Samsung 990 Pro 2TB SSD"], basePrice: 200 },
    { name: "Accesorios", templates: ["Control DualSense", "Xbox Wireless Controller", "HyperX Cloud II", "Logitech G502", "Razer BlackWidow", "Mousepad RGB XL"], basePrice: 30 }
];

const products = [];

for (let i = 0; i < 550; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const template = cat.templates[Math.floor(Math.random() * cat.templates.length)];
    const color = cat.colors ? cat.colors[Math.floor(Math.random() * cat.colors.length)] : null;
    const storage = cat.storage ? cat.storage[Math.floor(Math.random() * cat.storage.length)] : null;

    let name = template;
    if (color) name += ` ${color}`;
    if (storage) name += ` ${storage}`;

    // Variation in price
    const price = cat.basePrice + (Math.random() * 500);
    const stock = Math.floor(Math.random() * 50) + 1;
    const desc = `Producto premium de ${cat.name}. Calidad garantizada por Ecugaming Import. ${name} es ideal para los entusiastas del gaming y la tecnología.`;

    products.push({
        Nombre: name,
        Categoria: cat.name,
        Precio: parseFloat(price.toFixed(2)),
        Stock: stock,
        Descripcion: desc
    });
}

const ws = xlsx.utils.json_to_sheet(products);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Inventario Masivo");

const filePath = path.join(__dirname, '../data/inventario_ecugaming_masivo.xlsx');
xlsx.writeFile(wb, filePath);

console.log(`Excel masivo con ${products.length} productos generado con éxito en: ${filePath}`);
