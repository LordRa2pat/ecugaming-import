// Vercel Serverless Function Version
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ dest: '/tmp/' });

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Paths
const DATA_DIR = path.join(__dirname, '../public/data');
const STOCK_FILE = path.join(DATA_DIR, 'stock.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
[STOCK_FILE, USERS_FILE, ORDERS_FILE].forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
});

// Helpers
const readData = (file) => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        return content ? JSON.parse(content) : [];
    } catch (e) { return []; }
};

const saveData = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) { console.error(`Error saving ${file}:`, e); }
};

// --- STOCK API ---
app.get('/api/stock', (req, res) => res.json(readData(STOCK_FILE)));

// NEW EXCEL UPLOAD
app.post('/api/upload', upload.single('file'), (req, res) => {
    const hash = req.headers['x-admin-hash'];
    const validHash = "c9f43040d4afc34302592256dd4195827600da604b737f2485841e0bf44f5465";
    if (hash !== validHash) return res.status(401).json({ error: "No Autorizado" });

    if (!req.file) return res.status(400).send('No se subió ningún archivo.');

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const normalizedData = rawData.map(item => ({
            id: item.ID || item.id || Math.random().toString(36).substr(2, 9),
            name: item.Nombre || item.Name || item.Producto || 'Producto sin nombre',
            category: item.Categoria || item.Category || 'General',
            price: parseFloat(item.Precio || item.Price || 0),
            stock: parseInt(item.Stock || item.Cantidad || 0),
            description: item.Descripcion || item.Description || '',
            image: item.Imagen || item.Image || '',
            is_clearance: item.Oferta === 'SI' || item.Oferta === true || false
        }));

        saveData(STOCK_FILE, normalizedData);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Stock actualizado correctamente', count: normalizedData.length });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error procesando el catálogo.');
    }
});

app.post('/api/stock/update', (req, res) => {
    const hash = req.headers['x-admin-hash'];
    const validHash = "c9f43040d4afc34302592256dd4195827600da604b737f2485841e0bf44f5465";
    if (hash !== validHash) return res.status(401).json({ error: "No Autorizado" });

    const { id, price, old_price, stock, imageBase64, is_clearance } = req.body;
    let products = readData(STOCK_FILE);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });

    products[idx] = { ...products[idx], ...req.body, image: imageBase64 || products[idx].image };
    saveData(STOCK_FILE, products);
    res.json(products[idx]);
});

// --- AUTH API ---
app.post('/api/auth/register', (req, res) => {
    const { name, email, phone, password } = req.body;
    let users = readData(USERS_FILE);
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "Email ya registrado" });

    const newUser = { id: Date.now().toString(), name, email, phone, password };
    users.push(newUser);
    saveData(USERS_FILE, users);
    res.json({ message: "Usuario creado", user: { id: newUser.id, name, email, phone } });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = readData(USERS_FILE);
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
});

// --- ORDERS API ---
app.get('/api/orders', (req, res) => {
    const hash = req.headers['x-admin-hash'];
    const validHash = "c9f43040d4afc34302592256dd4195827600da604b737f2485841e0bf44f5465";
    if (hash !== validHash) return res.status(401).json({ error: "No Autorizado" });
    res.json(readData(ORDERS_FILE));
});

app.post('/api/orders/update-status', (req, res) => {
    const hash = req.headers['x-admin-hash'];
    const validHash = "c9f43040d4afc34302592256dd4195827600da604b737f2485841e0bf44f5465";
    if (hash !== validHash) return res.status(401).json({ error: "No Autorizado" });

    const { id, status } = req.body;
    let orders = readData(ORDERS_FILE);
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return res.status(404).json({ error: "Orden no encontrada" });

    orders[idx].status = status;
    saveData(ORDERS_FILE, orders);
    res.json({ message: "Estatus de orden actualizado", order: orders[idx] });
});

app.post('/api/orders/create', (req, res) => {
    const { userId, items, total, address } = req.body;
    let orders = readData(ORDERS_FILE);
    const newOrder = {
        id: 'ORDER-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
        userId,
        items,
        total,
        address,
        status: 'confirmando_pago',
        createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    saveData(ORDERS_FILE, orders);
    res.json({ message: "Orden creada", orderId: newOrder.id });
});

app.get('/api/orders/track/:id', (req, res) => {
    const orders = readData(ORDERS_FILE);
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Orden no encontrada" });
    res.json(order);
});

module.exports = app;
