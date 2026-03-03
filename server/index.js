const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public')); // Sirve el frontend

// Auth Middleware para rutas seguras
app.use('/api', (req, res, next) => {
    if (req.method === 'POST') {
        const hash = req.headers['x-admin-hash'];
        // SHA-256 para "Ecugaming2026"
        const validHash = "c9f43040d4afc34302592256dd4195827600da604b737f2485841e0bf44f5465";
        if (hash !== validHash) {
            return res.status(401).json({ error: "No Autorizado. Clave SHA incorrecta." });
        }
    }
    next();
});

const upload = multer({ dest: 'uploads/' });

const DATA_FILE = path.join(__dirname, '../data/stock.json');

// Helper to read stock
const readStock = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return content ? JSON.parse(content) : [];
    } catch (e) {
        return [];
    }
};

// Helper to save stock
const saveStock = (data) => {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// --- API ENDPOINTS ---

// GET /api/stock - Consumed by AI and Frontend
app.get('/api/stock', (req, res) => {
    const stock = readStock();
    res.json(stock);
});

// POST /api/upload - Excel/CSV Bulk Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Normalize data
        const normalizedData = rawData.map(item => ({
            id: item.ID || item.id || Math.random().toString(36).substr(2, 9),
            name: item.Nombre || item.Name || item.Producto || 'Producto sin nombre',
            category: item.Categoria || item.Category || 'General',
            price: parseFloat(item.Precio || item.Price || 0),
            stock: parseInt(item.Stock || item.Cantidad || 0),
            description: item.Descripcion || item.Description || ''
        }));

        saveStock(normalizedData);

        // Clean up upload
        fs.unlinkSync(req.file.path);

        res.json({ message: 'Stock actualizado correctamente', count: normalizedData.length });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error procesando el archivo.');
    }
});

app.post('/api/stock/update', (req, res) => {
    try {
        const { id, price, old_price, stock, imageBase64, is_clearance } = req.body;
        if (!id) return res.status(400).send('ID es requerido');

        let currentStock = readStock();
        const itemIndex = currentStock.findIndex(p => p.id === id);

        if (itemIndex === -1) return res.status(404).send('Producto no encontrado');

        currentStock[itemIndex] = {
            ...currentStock[itemIndex],
            price: price !== undefined ? parseFloat(price) : currentStock[itemIndex].price,
            old_price: old_price !== undefined ? (old_price ? parseFloat(old_price) : null) : currentStock[itemIndex].old_price,
            stock: stock !== undefined ? parseInt(stock) : currentStock[itemIndex].stock,
            image: imageBase64 !== undefined ? imageBase64 : currentStock[itemIndex].image,
            is_clearance: is_clearance !== undefined ? is_clearance : currentStock[itemIndex].is_clearance
        };

        saveStock(currentStock);
        res.json({ message: 'Producto actualizado', product: currentStock[itemIndex] });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Error interno al actualizar producto');
    }
});

app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);

    // Auto-load generated stock if exists
    const genExcel = path.join(__dirname, '../data/inventario_ecugaming_masivo.xlsx');
    if (fs.existsSync(genExcel)) {
        console.log('Detectado Excel masivo generado, cargando automáticamente...');
        try {
            const workbook = xlsx.readFile(genExcel);
            const sheetName = workbook.SheetNames[0];
            const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            const normalizedData = rawData.map(item => ({
                id: Math.random().toString(36).substr(2, 9),
                name: item.Nombre,
                category: item.Categoria,
                price: parseFloat(item.Precio),
                stock: parseInt(item.Stock),
                description: item.Descripcion
            }));
            saveStock(normalizedData);
            console.log(`Stock masivo (${normalizedData.length} productos) cargado con éxito.`);
        } catch (e) {
            console.error('Error cargando stock masivo:', e);
        }
    }
});
