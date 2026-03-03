// Ecugaming Import - API v3.0 (Supabase Auth + JWT + RLS)
// Uses service_role key on server; validates customer JWTs via supabase.auth.getUser()
'use strict';

const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // store in memory, upload to Storage

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// DATABASE (Supabase service_role — full access, server only)
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
let useSupabase = false;

if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    useSupabase = true;
    console.log('✅ Supabase connected');
} else {
    console.log('⚠️  Supabase not configured — /api/stock uses JSON fallback (read-only)');
}

// ============================================================
// JSON FALLBACK (read-only, for /api/stock when no Supabase)
// ============================================================
const DATA_DIR = path.join(__dirname, '../public/data');
const readJSON = (file) => {
    try {
        const p = path.join(DATA_DIR, file);
        if (!fs.existsSync(p)) return [];
        return JSON.parse(fs.readFileSync(p, 'utf8')) || [];
    } catch { return []; }
};

// Map old stock.json field names to new schema shape
function mapLegacyProduct(p) {
    return {
        id:          p.id,
        name:        p.name,
        category:    p.category,
        price:       p.price,
        sale_price:  p.old_price || null,
        stock:       p.stock,
        description: p.description || '',
        image_url:   (!p.image || p.image.startsWith('data:')) ? null : p.image,
        badge:       p.is_clearance ? 'Remate' : null,
        is_active:   true
    };
}

// ============================================================
// JWT / AUTH HELPERS
// ============================================================
async function verifyToken(req) {
    if (!useSupabase) return null;
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .single();
    return { ...user, role: profile?.role || 'customer', profile };
}

function requireAuth(handler) {
    return async (req, res) => {
        const user = await verifyToken(req);
        if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
        req.user = user;
        return handler(req, res);
    };
}

function requireAdmin(handler) {
    return async (req, res) => {
        const user = await verifyToken(req);
        if (!user) return res.status(401).json({ error: 'Autenticación requerida' });
        if (user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
        req.user = user;
        return handler(req, res);
    };
}

// ============================================================
// PUBLIC: GET /api/stock
// n8n WhatsApp bot reads this — keep field names compatible
// ============================================================
app.get('/api/stock', async (req, res) => {
    try {
        if (useSupabase) {
            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    id, name, slug, brand, description, specs,
                    price, sale_price, stock, badge, is_active,
                    category:categories(id, name, slug),
                    images:product_images(storage_path, sort)
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Build public image URLs
            const mapped = products.map(p => {
                const sorted = (p.images || []).sort((a, b) => a.sort - b.sort);
                let image_url = null;
                if (sorted.length > 0) {
                    const sp = sorted[0].storage_path;
                    // If it's a full URL already (legacy migration), keep it
                    if (sp.startsWith('http')) {
                        image_url = sp;
                    } else {
                        const { data: urlData } = supabase.storage
                            .from('product-images')
                            .getPublicUrl(sp);
                        image_url = urlData?.publicUrl || null;
                    }
                }
                return {
                    id:          p.id,
                    name:        p.name,
                    category:    p.category?.name || 'General',
                    category_id: p.category?.id,
                    brand:       p.brand,
                    description: p.description,
                    specs:       p.specs,
                    price:       p.price,
                    sale_price:  p.sale_price,
                    old_price:   p.sale_price,  // backwards compat for n8n
                    stock:       p.stock,
                    badge:       p.badge,
                    image_url,
                    image:       image_url,     // backwards compat
                    is_active:   p.is_active
                };
            });
            return res.json(mapped);
        }

        // JSON fallback
        res.json(readJSON('stock.json').map(mapLegacyProduct));
    } catch (err) {
        console.error('Stock error:', err);
        res.json(readJSON('stock.json').map(mapLegacyProduct));
    }
});

// PUBLIC: GET /api/orders/track/:id
app.get('/api/orders/track/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!useSupabase) {
            return res.status(503).json({ error: 'Base de datos no configurada' });
        }
        const { data: order, error } = await supabase
            .from('orders')
            .select('id, status, carrier, carrier_agency_name, tracking_code, shipping_address, payment_method, coupon_code, subtotal, discount_total, shipping_total, total, created_at, updated_at')
            .eq('id', id)
            .single();
        if (error || !order) return res.status(404).json({ error: 'Orden no encontrada' });

        const { data: events } = await supabase
            .from('order_status_events')
            .select('id, status, note, created_at')
            .eq('order_id', id)
            .order('created_at', { ascending: true });

        const { data: items } = await supabase
            .from('order_items')
            .select('id, product_snapshot, unit_price, qty, line_total')
            .eq('order_id', id);

        res.json({ ...order, events: events || [], items: items || [] });
    } catch (err) {
        console.error('Track error:', err);
        res.status(500).json({ error: 'Error buscando orden' });
    }
});

// ============================================================
// CUSTOMER: GET /api/me
// ============================================================
app.get('/api/me', requireAuth(async (req, res) => {
    const userId = req.user.id;
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    const { data: addresses } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });
    res.json({ ...profile, addresses: addresses || [] });
}));

// CUSTOMER: POST /api/me (update profile)
app.post('/api/me', requireAuth(async (req, res) => {
    const userId = req.user.id;
    const allowed = ['first_name', 'last_name', 'phone', 'cedula'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

// CUSTOMER: GET /api/my-orders
app.get('/api/my-orders', requireAuth(async (req, res) => {
    const userId = req.user.id;
    const { data, error } = await supabase
        .from('orders')
        .select(`
            id, status, payment_method, payment_status,
            subtotal, discount_total, shipping_total, total,
            coupon_code, carrier, carrier_agency_name,
            tracking_code, shipping_address, created_at,
            items:order_items(product_snapshot, qty, unit_price, line_total)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
}));

// CUSTOMER: GET /api/orders/:id
app.get('/api/orders/:id', requireAuth(async (req, res) => {
    const userId = req.user.id;
    const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', req.params.id)
        .single();
    if (error || !order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.user_id !== userId) return res.status(403).json({ error: 'Acceso denegado' });

    const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', req.params.id);

    const { data: events } = await supabase
        .from('order_status_events')
        .select('*')
        .eq('order_id', req.params.id)
        .order('created_at', { ascending: true });

    res.json({ ...order, items: items || [], events: events || [] });
}));

// ============================================================
// CUSTOMER: POST /api/orders/create (CHECKOUT)
// ============================================================
app.post('/api/orders/create', requireAuth(async (req, res) => {
    const userId = req.user.id;
    const {
        items,              // [{ productId, qty }]
        couponCode,
        carrier,
        carrierAgencyName,
        shippingAddress,    // { firstName, lastName, cedula, phone, province, city, address1, reference }
        paymentMethod,      // 'transferencia' | 'cripto'
        paymentProof        // { bank, txid, proofPath }  (optional)
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
    }
    if (!carrier) return res.status(400).json({ error: 'Selecciona un transportista' });
    if (carrier === 'Cooperativa' && !carrierAgencyName) {
        return res.status(400).json({ error: 'Ingresa el nombre de la agencia cooperativa' });
    }
    if (!shippingAddress?.city) return res.status(400).json({ error: 'Dirección de envío incompleta' });
    if (!['transferencia', 'cripto'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Método de pago inválido' });
    }

    try {
        // 1. Validate stock and gather product data
        const productIds = items.map(i => i.productId);
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, price, sale_price, stock, badge, images:product_images(storage_path, sort)')
            .in('id', productIds)
            .eq('is_active', true);

        if (prodError) throw prodError;

        const productMap = {};
        for (const p of products) {
            const sorted = (p.images || []).sort((a, b) => a.sort - b.sort);
            let image_url = null;
            if (sorted.length > 0) {
                const sp = sorted[0].storage_path;
                image_url = sp.startsWith('http') ? sp
                    : supabase.storage.from('product-images').getPublicUrl(sp).data?.publicUrl;
            }
            productMap[p.id] = { ...p, image_url };
        }

        const orderItemsData = [];
        let subtotal = 0;

        for (const item of items) {
            const prod = productMap[item.productId];
            if (!prod) return res.status(400).json({ error: `Producto no encontrado: ${item.productId}` });
            if (prod.stock < item.qty) {
                return res.status(400).json({ error: `Stock insuficiente para "${prod.name}" (disponible: ${prod.stock})` });
            }
            const unitPrice = prod.sale_price ?? prod.price;
            const lineTotal = unitPrice * item.qty;
            subtotal += lineTotal;
            orderItemsData.push({
                product_id: prod.id,
                product_snapshot: {
                    name:      prod.name,
                    price:     unitPrice,
                    image_url: prod.image_url,
                    badge:     prod.badge
                },
                unit_price: unitPrice,
                qty:        item.qty,
                line_total: lineTotal
            });
        }

        // 2. Apply coupon
        let discountTotal = 0;
        let couponFreeShipping = false;
        let validatedCouponCode = null;

        if (couponCode) {
            const code = couponCode.trim().toUpperCase();
            const { data: coupon } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (coupon) {
                const now = new Date();
                const expired = coupon.ends_at && new Date(coupon.ends_at) < now;
                const exhausted = coupon.max_redemptions && coupon.redemption_count >= coupon.max_redemptions;
                const tooLow = subtotal < (coupon.min_subtotal || 0);

                if (!expired && !exhausted && !tooLow) {
                    if (coupon.type === 'percent') {
                        discountTotal = parseFloat((subtotal * coupon.value / 100).toFixed(2));
                    } else {
                        discountTotal = Math.min(coupon.value, subtotal);
                    }
                    couponFreeShipping = coupon.free_shipping;
                    validatedCouponCode = code;
                }
            }
        }

        // 3. Shipping cost
        const { data: settings } = await supabase
            .from('settings')
            .select('value')
            .in('key', ['free_shipping_threshold', 'shipping_cost']);

        const settingsMap = {};
        for (const s of (settings || [])) settingsMap[s.key] = s.value;
        const freeThreshold = parseFloat(settingsMap['free_shipping_threshold'] || 500);
        const baseCost      = parseFloat(settingsMap['shipping_cost'] || 5);

        const shippingTotal = (couponFreeShipping || (subtotal - discountTotal) >= freeThreshold) ? 0 : baseCost;
        const total = parseFloat((subtotal - discountTotal + shippingTotal).toFixed(2));

        // 4. Create order ID
        const orderId = 'EG-' + Date.now().toString(36).toUpperCase() +
                        Math.random().toString(36).substr(2, 3).toUpperCase();

        // 5. Insert order
        const { error: orderError } = await supabase.from('orders').insert({
            id:                 orderId,
            user_id:            userId,
            status:             'confirmando_pago',
            payment_method:     paymentMethod,
            payment_status:     'pending',
            coupon_code:        validatedCouponCode,
            discount_total:     discountTotal,
            shipping_total:     shippingTotal,
            subtotal,
            total,
            carrier,
            carrier_agency_name: carrierAgencyName || '',
            shipping_address:   shippingAddress
        });
        if (orderError) throw orderError;

        // 6. Insert order items
        const itemsWithOrderId = orderItemsData.map(i => ({ ...i, order_id: orderId }));
        const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
        if (itemsError) throw itemsError;

        // 7. Decrement stock
        for (const item of items) {
            await supabase.rpc('decrement_stock', {
                product_id: item.productId,
                amount: item.qty
            }).catch(() => {
                // Fallback if RPC not available
                supabase.from('products')
                    .select('stock')
                    .eq('id', item.productId)
                    .single()
                    .then(({ data: p }) => {
                        if (p) supabase.from('products')
                            .update({ stock: Math.max(0, p.stock - item.qty) })
                            .eq('id', item.productId);
                    });
            });
        }

        // 8. Increment coupon redemption count
        if (validatedCouponCode) {
            await supabase.from('coupons')
                .update({ redemption_count: supabase.rpc('increment', { x: 1 }) })
                .eq('code', validatedCouponCode)
                .catch(() => {
                    supabase.from('coupons').select('redemption_count').eq('code', validatedCouponCode).single()
                        .then(({ data: c }) => {
                            if (c) supabase.from('coupons')
                                .update({ redemption_count: (c.redemption_count || 0) + 1 })
                                .eq('code', validatedCouponCode);
                        });
                });
        }

        // 9. Log initial status event
        await supabase.from('order_status_events').insert({
            order_id:      orderId,
            status:        'confirmando_pago',
            note:          'Orden creada',
            actor_user_id: userId
        });

        // 10. Save payment proof if provided
        if (paymentProof && (paymentProof.bank || paymentProof.txid || paymentProof.proofPath)) {
            await supabase.from('payment_proofs').insert({
                order_id:   orderId,
                method:     paymentMethod,
                bank:       paymentProof.bank || '',
                txid:       paymentProof.txid || '',
                proof_path: paymentProof.proofPath || ''
            });
        }

        res.json({
            orderId,
            subtotal,
            discountTotal,
            shippingTotal,
            total,
            couponApplied: validatedCouponCode
        });

    } catch (err) {
        console.error('Order create error:', err);
        res.status(500).json({ error: 'Error creando la orden: ' + err.message });
    }
}));

// ============================================================
// ADMIN: GET /api/admin/orders
// ============================================================
app.get('/api/admin/orders', requireAdmin(async (req, res) => {
    const page  = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 50);
    const from  = (page - 1) * limit;
    const status = req.query.status;

    let query = supabase
        .from('orders')
        .select(`
            id, status, payment_method, payment_status,
            subtotal, discount_total, shipping_total, total,
            coupon_code, carrier, carrier_agency_name,
            tracking_code, shipping_address, notes,
            created_at, updated_at,
            customer:profiles(first_name, last_name, email, phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ orders: data || [], total: count, page, limit });
}));

// ADMIN: PATCH /api/admin/orders/:id/status
app.patch('/api/admin/orders/:id/status', requireAdmin(async (req, res) => {
    const { status, note, trackingCode } = req.body;
    const { id } = req.params;
    const validStatuses = ['confirmando_pago', 'orden_confirmada', 'empacando', 'enviado', 'recibido', 'cancelado'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }

    const updates = { status };
    if (trackingCode !== undefined) updates.tracking_code = trackingCode;

    const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) return res.status(400).json({ error: error.message });

    await supabase.from('order_status_events').insert({
        order_id:      id,
        status,
        note:          note || '',
        actor_user_id: req.user.id
    });

    res.json(data);
}));

// ADMIN: GET /api/admin/orders/:id (full detail)
app.get('/api/admin/orders/:id', requireAdmin(async (req, res) => {
    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *, customer:profiles(first_name, last_name, email, phone)
        `)
        .eq('id', req.params.id)
        .single();
    if (error || !order) return res.status(404).json({ error: 'Orden no encontrada' });

    const [{ data: items }, { data: events }, { data: proofs }] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', req.params.id),
        supabase.from('order_status_events').select('*').eq('order_id', req.params.id).order('created_at'),
        supabase.from('payment_proofs').select('*').eq('order_id', req.params.id)
    ]);

    res.json({ ...order, items: items || [], events: events || [], proofs: proofs || [] });
}));

// ADMIN: GET /api/admin/products
app.get('/api/admin/products', requireAdmin(async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .select(`
            *, category:categories(id, name),
            images:product_images(id, storage_path, sort)
        `)
        .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
}));

// ADMIN: POST /api/admin/products
app.post('/api/admin/products', requireAdmin(async (req, res) => {
    const { name, slug, category_id, brand, description, specs, price, sale_price, stock, badge, is_active } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Nombre y precio son requeridos' });

    const finalSlug = slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

    const { data, error } = await supabase
        .from('products')
        .insert({ name, slug: finalSlug, category_id, brand, description, specs: specs || {}, price, sale_price, stock: stock || 0, badge, is_active: is_active !== false })
        .select()
        .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

// ADMIN: PATCH /api/admin/products/:id
app.patch('/api/admin/products/:id', requireAdmin(async (req, res) => {
    const allowed = ['name', 'slug', 'category_id', 'brand', 'description', 'specs', 'price', 'sale_price', 'stock', 'badge', 'is_active'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

// ADMIN: POST /api/admin/products/:id/images (upload to Supabase Storage)
app.post('/api/admin/products/:id/images', upload.single('image'), requireAdmin(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

    const productId = req.params.id;
    const ext = req.file.originalname.split('.').pop().toLowerCase() || 'jpg';
    const fileName = `${productId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
        });

    if (uploadError) return res.status(400).json({ error: uploadError.message });

    // Get sort order
    const { data: existing } = await supabase
        .from('product_images')
        .select('sort')
        .eq('product_id', productId)
        .order('sort', { ascending: false })
        .limit(1);

    const nextSort = existing?.[0] ? existing[0].sort + 1 : 0;

    const { data: imgRow, error: imgError } = await supabase
        .from('product_images')
        .insert({ product_id: productId, storage_path: fileName, sort: nextSort })
        .select()
        .single();

    if (imgError) return res.status(400).json({ error: imgError.message });

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    res.json({ ...imgRow, public_url: urlData?.publicUrl });
}));

// ADMIN: DELETE /api/admin/products/:productId/images/:imageId
app.delete('/api/admin/products/:productId/images/:imageId', requireAdmin(async (req, res) => {
    const { data: img } = await supabase
        .from('product_images')
        .select('storage_path')
        .eq('id', req.params.imageId)
        .single();

    if (img) await supabase.storage.from('product-images').remove([img.storage_path]);

    await supabase.from('product_images').delete().eq('id', req.params.imageId);
    res.json({ ok: true });
}));

// ============================================================
// ADMIN: COUPONS
// ============================================================
app.get('/api/admin/coupons', requireAdmin(async (req, res) => {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
}));

app.post('/api/admin/coupons', requireAdmin(async (req, res) => {
    const { code, type, value, free_shipping, starts_at, ends_at, max_redemptions, min_subtotal, is_active } = req.body;
    if (!code || !type || value === undefined) return res.status(400).json({ error: 'Datos del cupón incompletos' });
    const { data, error } = await supabase
        .from('coupons')
        .insert({ code: code.toUpperCase(), type, value, free_shipping: !!free_shipping, starts_at, ends_at, max_redemptions, min_subtotal: min_subtotal || 0, is_active: is_active !== false })
        .select()
        .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

app.patch('/api/admin/coupons/:id', requireAdmin(async (req, res) => {
    const allowed = ['code', 'type', 'value', 'free_shipping', 'starts_at', 'ends_at', 'max_redemptions', 'min_subtotal', 'is_active'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.code) updates.code = updates.code.toUpperCase();
    const { data, error } = await supabase.from('coupons').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

// ============================================================
// ADMIN: SETTINGS
// ============================================================
app.get('/api/admin/settings', requireAdmin(async (req, res) => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return res.status(400).json({ error: error.message });
    const map = {};
    for (const s of (data || [])) map[s.key] = s.value;
    res.json(map);
}));

app.patch('/api/admin/settings', requireAdmin(async (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key requerida' });
    const { data, error } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' })
        .select()
        .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

// ============================================================
// Health check
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        status:    'ok',
        version:   '3.0',
        database:  useSupabase ? 'supabase' : 'json-fallback',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
