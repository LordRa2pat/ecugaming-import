// Ecugaming Import - API v2.0 (Supabase + JSON Fallback)
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const upload = multer({ dest: '/tmp/' });

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Admin hash constant
const ADMIN_HASH = "c9f43040d4afc34302592256dd4195827600da604b737f2485841e0bf44f5465";
const verifyAdmin = (req) => req.headers['x-admin-hash'] === ADMIN_HASH;

// ============================================
// DATABASE CONNECTION (Supabase or JSON fallback)
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key for server-side

let supabase = null;
let useSupabase = false;

if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    useSupabase = true;
    console.log('✅ Supabase connected (Frankfurt)');
} else {
    console.log('⚠️ Supabase not configured, using JSON fallback');
}

// ============================================
// JSON FALLBACK (for local dev / no DB)
// ============================================
const DATA_DIR = path.join(__dirname, '../public/data');
const getPath = (f) => {
    const tmpP = path.join('/tmp', f);
    const localP = path.join(DATA_DIR, f);
    if (process.env.VERCEL || process.platform === 'linux') {
        if (!fs.existsSync(tmpP) && fs.existsSync(localP)) {
            try { fs.copyFileSync(localP, tmpP); } catch (e) { }
        }
        return tmpP;
    }
    return localP;
};

const readJSON = (file) => {
    try {
        const p = getPath(file);
        if (!fs.existsSync(p)) return [];
        return JSON.parse(fs.readFileSync(p, 'utf8')) || [];
    } catch (e) { return []; }
};

const saveJSON = (file, data) => {
    try { fs.writeFileSync(getPath(file), JSON.stringify(data, null, 2)); return true; }
    catch (e) { return false; }
};

// Ensure local files exist
if (!process.env.VERCEL && !fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
['stock.json', 'users.json', 'orders.json'].forEach(f => {
    const p = getPath(f);
    if (!fs.existsSync(p)) try { fs.writeFileSync(p, '[]'); } catch (e) { }
});

// ============================================
// STOCK API
// ============================================
app.get('/api/stock', async (req, res) => {
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return res.json(data);
        }
        res.json(readJSON('stock.json'));
    } catch (err) {
        console.error('Stock fetch error:', err);
        // Fallback to JSON if Supabase fails
        res.json(readJSON('stock.json'));
    }
});

// Excel Upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ error: "No Autorizado" });
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const products = rawData.map(item => ({
            id: String(item.ID || item.id || Math.random().toString(36).substr(2, 9)),
            name: item.Nombre || item.Name || item.Producto || 'Producto sin nombre',
            category: item.Categoria || item.Category || 'General',
            price: parseFloat(item.Precio || item.Price || 0),
            old_price: item.PrecioAnterior ? parseFloat(item.PrecioAnterior) : null,
            stock: parseInt(item.Stock || item.Cantidad || 0),
            description: item.Descripcion || item.Description || '',
            image: item.Imagen || item.Image || '',
            is_clearance: item.Oferta === 'SI' || item.Oferta === true || false
        }));

        if (useSupabase) {
            // Upsert all products (insert or update if id exists)
            const { error } = await supabase.from('products').upsert(products, { onConflict: 'id' });
            if (error) throw error;
        }

        // Always also save to JSON as backup
        saveJSON('stock.json', products);
        fs.unlinkSync(req.file.path);
        res.json({ message: `Catálogo actualizado: ${products.length} productos`, count: products.length });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error procesando el catálogo: ' + error.message });
    }
});

// Update single product
app.post('/api/stock/update', async (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ error: "No Autorizado" });

    const { id, price, old_price, stock, imageBase64, is_clearance } = req.body;

    try {
        if (useSupabase) {
            const updateData = {};
            if (price !== undefined) updateData.price = price;
            if (old_price !== undefined) updateData.old_price = old_price;
            if (stock !== undefined) updateData.stock = stock;
            if (is_clearance !== undefined) updateData.is_clearance = is_clearance;
            if (imageBase64) updateData.image = imageBase64;

            const { data, error } = await supabase.from('products').update(updateData).eq('id', id).select().single();
            if (error) throw error;
            return res.json(data);
        }

        // JSON fallback
        let products = readJSON('stock.json');
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: "Producto no encontrado" });

        if (price !== undefined) products[idx].price = price;
        if (old_price !== undefined) products[idx].old_price = old_price;
        if (stock !== undefined) products[idx].stock = stock;
        if (is_clearance !== undefined) products[idx].is_clearance = is_clearance;
        if (imageBase64) products[idx].image = imageBase64;

        saveJSON('stock.json', products);
        res.json(products[idx]);
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ error: 'Error actualizando producto' });
    }
});

// ============================================
// AUTH API
// ============================================
app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Datos incompletos" });

    const emailLower = email.toLowerCase().trim();

    try {
        if (useSupabase) {
            // Check if exists
            const { data: existing } = await supabase.from('users').select('id').eq('email', emailLower).maybeSingle();
            if (existing) return res.status(400).json({ error: "Email ya registrado" });

            const { data, error } = await supabase.from('users').insert({
                name, email: emailLower, phone, password
            }).select().single();
            if (error) throw error;
            return res.json({ message: "Usuario creado", user: { id: data.id, name, email: emailLower, phone } });
        }

        // JSON fallback
        let users = readJSON('users.json');
        if (users.find(u => u.email === emailLower)) return res.status(400).json({ error: "Email ya registrado" });

        const newUser = { id: Date.now().toString(), name, email: emailLower, phone, password };
        users.push(newUser);
        saveJSON('users.json', users);
        res.json({ message: "Usuario creado", user: { id: newUser.id, name, email: emailLower, phone } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Error en el registro' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });

    const emailLower = email.toLowerCase().trim();

    try {
        if (useSupabase) {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, phone, password')
                .eq('email', emailLower)
                .maybeSingle();

            if (error) throw error;
            if (!data || data.password !== password) {
                return res.status(401).json({ error: "Credenciales inválidas" });
            }
            return res.json({ user: { id: data.id, name: data.name, email: data.email, phone: data.phone } });
        }

        // JSON fallback
        const users = readJSON('users.json');
        const user = users.find(u => u.email === emailLower && u.password === password);
        if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
        res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error de autenticación' });
    }
});

// ============================================
// ORDERS API
// ============================================
app.get('/api/orders', async (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ error: "No Autorizado" });

    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return res.json(data);
        }
        res.json(readJSON('orders.json'));
    } catch (err) {
        res.json(readJSON('orders.json'));
    }
});

app.post('/api/orders/create', async (req, res) => {
    const { userId, userName, userPhone, userAddress, items, total } = req.body;
    const orderId = 'EG-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();

    const newOrder = {
        id: orderId,
        user_id: userId,
        user_name: userName || 'Cliente',
        user_phone: userPhone || '',
        user_address: userAddress || '',
        items: items || [],
        total: total || 0,
        status: 'confirmando_pago'
    };

    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('orders').insert(newOrder).select().single();
            if (error) throw error;
            return res.json({ message: "Orden creada", orderId: data.id });
        }

        let orders = readJSON('orders.json');
        newOrder.created_at = new Date().toISOString();
        orders.push(newOrder);
        saveJSON('orders.json', orders);
        res.json({ message: "Orden creada", orderId: newOrder.id });
    } catch (err) {
        console.error('Order create error:', err);
        res.status(500).json({ error: 'Error creando la orden' });
    }
});

app.post('/api/orders/update-status', async (req, res) => {
    if (!verifyAdmin(req)) return res.status(401).json({ error: "No Autorizado" });

    const { id, status } = req.body;

    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
            if (error) throw error;
            return res.json({ message: "Estatus actualizado", order: data });
        }

        let orders = readJSON('orders.json');
        const idx = orders.findIndex(o => o.id === id);
        if (idx === -1) return res.status(404).json({ error: "Orden no encontrada" });

        orders[idx].status = status;
        saveJSON('orders.json', orders);
        res.json({ message: "Estatus actualizado", order: orders[idx] });
    } catch (err) {
        console.error('Order update error:', err);
        res.status(500).json({ error: 'Error actualizando orden' });
    }
});

app.get('/api/orders/track/:id', async (req, res) => {
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
            if (error) throw error;
            if (!data) return res.status(404).json({ error: "Orden no encontrada" });
            return res.json(data);
        }

        const orders = readJSON('orders.json');
        const order = orders.find(o => o.id === req.params.id);
        if (!order) return res.status(404).json({ error: "Orden no encontrada" });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Error buscando orden' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: useSupabase ? 'supabase-frankfurt' : 'json-fallback',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
