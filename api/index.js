// Ecugaming Import - API v3.0 (Supabase Auth + JWT + RLS)
// Uses service_role key on server; validates customer JWTs via supabase.auth.getUser()
'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

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
// SECURITY: IP Banning Middleware
// ============================================================
app.use(async (req, res, next) => {
    if (!useSupabase) return next();

    // Get real IP (handle proxies)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    req.clientIp = ip;

    try {
        const { data: banned } = await supabase
            .from('banned_ips')
            .select('ip_address')
            .eq('ip_address', ip)
            .single();

        if (banned) {
            return res.status(403).json({ error: 'Tu acceso ha sido revocado por razones de seguridad.', code: 'IP_BANNED' });
        }
    } catch (e) { /* silent fail on select error */ }

    next();
});

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
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        sale_price: p.old_price || null,
        stock: p.stock,
        description: p.description || '',
        image_url: (!p.image || p.image.startsWith('data:')) ? null : p.image,
        badge: p.is_clearance ? 'Remate' : null,
        is_active: true
    };
}

// ============================================================
// INPUT SANITIZATION
// ============================================================
function sanitize(str, maxLen = 200) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/[<>"'`]/g, '')    // strip HTML/JS injection chars
        .replace(/[\r\n]/g, ' ')   // strip newlines — prevents email header injection
        .trim()
        .slice(0, maxLen);
}

// ============================================================
// EMAIL — DIRECT SMTP (nodemailer) — primary method
// ============================================================
const smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.spacemail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
});

const STATUS_LABELS_ES = {
    confirmando_pago: 'Confirmando Pago',
    orden_confirmada: 'Orden Confirmada',
    empacando: 'Empacando',
    enviado: 'Enviado',
    recibido: 'Entregado',
    cancelado: 'Cancelado',
};

function buildOrderEmailHtml(p) {
    const statusLabel = STATUS_LABELS_ES[p.status] || p.status || 'Confirmando Pago';
    const statusColor = p.status === 'cancelado' ? '#dc2626'
        : p.status === 'recibido' ? '#16a34a'
        : p.status === 'enviado' ? '#0070ba'
        : '#ff8c00';
    const trackingHtml = p.trackingCode
        ? `<tr><td style="padding:8px 0; color:#555; font-size:14px;">Código de seguimiento</td><td style="padding:8px 0; font-weight:700; color:#0070ba; font-size:14px;">${p.trackingCode}</td></tr>`
        : '';
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
  <!-- Header -->
  <tr><td style="background:#111;padding:28px 36px;">
    <span style="font-size:22px;font-weight:900;color:#fff;">Ecugaming <span style="color:#ff8c00;">Import</span></span>
  </td></tr>
  <!-- Status banner -->
  <tr><td style="background:${statusColor};padding:18px 36px;text-align:center;">
    <span style="color:#fff;font-size:18px;font-weight:800;">Estado de tu orden: ${statusLabel}</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px 36px;">
    <p style="font-size:16px;color:#111;margin:0 0 8px;">Hola, <strong>${p.customerName || 'Cliente'}</strong> 👋</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px;">Aquí tienes el estado actualizado de tu pedido en Ecugaming Import.</p>
    <!-- Order box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:8px 0;color:#555;font-size:14px;">Número de orden</td>
          <td style="padding:8px 0;font-weight:800;color:#111;font-size:16px;">${p.orderId}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;">Producto</td>
          <td style="padding:8px 0;font-weight:700;color:#111;font-size:14px;">${p.productName || 'Tu pedido'}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;">Total</td>
          <td style="padding:8px 0;font-weight:800;color:#ff8c00;font-size:16px;">$${p.total}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;">Transportista</td>
          <td style="padding:8px 0;font-weight:700;color:#111;font-size:14px;">${p.carrier || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;">Método de pago</td>
          <td style="padding:8px 0;font-weight:700;color:#111;font-size:14px;">${p.paymentMethod || '—'}</td></tr>
      ${trackingHtml}
    </table>
    ${p.statusNote ? `<div style="background:#fff3e0;border-left:4px solid #ff8c00;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;font-size:14px;color:#555;"><strong>Nota:</strong> ${p.statusNote}</div>` : ''}
    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="https://ecugamingimport.online/tracking?id=${p.orderId}"
         style="background:#ff8c00;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:15px;display:inline-block;">
        Ver estado de mi pedido
      </a>
    </div>
    <p style="font-size:13px;color:#888;text-align:center;margin:0;">¿Tienes dudas? Escríbenos por WhatsApp o a <a href="mailto:ventas@ecugamingimport.online" style="color:#ff8c00;">ventas@ecugamingimport.online</a></p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f4f4f5;padding:16px 36px;text-align:center;">
    <span style="font-size:12px;color:#aaa;">© 2026 Ecugaming Import · Ecuador</span>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

async function sendOrderEmail(payload) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('[email] SMTP not configured, skipping');
        return;
    }
    const statusLabel = STATUS_LABELS_ES[payload.status] || payload.status || 'actualizado';
    try {
        await smtpTransporter.sendMail({
            from: `"Ecugaming Import" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: payload.customerEmail,
            subject: `Tu orden ${payload.orderId} — ${statusLabel}`,
            html: buildOrderEmailHtml(payload),
        });
        console.log(`[email] sent to ${payload.customerEmail} for ${payload.orderId}`);
    } catch (e) {
        console.error('[email] SMTP error:', e.message);
    }
}

// ============================================================
// EMAIL — ORDER NOTIFICATION (fire-and-forget via n8n) — kept as secondary
// ============================================================
async function notifyN8N(payload) {
    const url = (process.env.N8N_ORDER_WEBHOOK_URL || '').trim();
    const key = process.env.N8N_API_KEY;
    if (!url || !key) return;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        console.log(`[n8n] webhook sent for ${payload.orderId}`);
    } catch (e) {
        console.error('[n8n notify]', e.message);
    }
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
        .select('role, first_name, last_name, is_banned')
        .eq('id', user.id)
        .single();
    if (profile?.is_banned) return null; // banned users get treated as unauthenticated
    // Update last_ip non-blocking (fire & forget)
    if (req.clientIp) {
        supabase.from('profiles').update({ last_ip: req.clientIp }).eq('id', user.id).then(() => {});
    }
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
                    id: p.id,
                    name: p.name,
                    category: p.category?.name || 'General',
                    category_id: p.category?.id,
                    brand: p.brand,
                    description: p.description,
                    specs: p.specs,
                    price: p.price,
                    sale_price: p.sale_price,
                    old_price: p.sale_price,  // backwards compat for n8n
                    stock: p.stock,
                    badge: p.badge,
                    image_url,
                    image: image_url,     // backwards compat
                    is_active: p.is_active
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

    // Sanitize all free-text fields to prevent injection
    const safeAddress = {
        firstName: sanitize(shippingAddress?.firstName),
        lastName:  sanitize(shippingAddress?.lastName),
        cedula:    sanitize(shippingAddress?.cedula, 20),
        phone:     sanitize(shippingAddress?.phone, 20),
        province:  sanitize(shippingAddress?.province),
        city:      sanitize(shippingAddress?.city),
        address1:  sanitize(shippingAddress?.address1),
        reference: sanitize(shippingAddress?.reference),
    };

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
                    name: prod.name,
                    price: unitPrice,
                    image_url: prod.image_url,
                    badge: prod.badge
                },
                unit_price: unitPrice,
                qty: item.qty,
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
        const baseCost = parseFloat(settingsMap['shipping_cost'] || 5);

        const shippingTotal = (couponFreeShipping || (subtotal - discountTotal) >= freeThreshold) ? 0 : baseCost;
        const total = parseFloat((subtotal - discountTotal + shippingTotal).toFixed(2));

        // 4. Create order ID
        const orderId = 'EG-' + Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).substr(2, 3).toUpperCase();

        // 5. Insert order
        const { error: orderError } = await supabase.from('orders').insert({
            id: orderId,
            user_id: userId,
            status: 'confirmando_pago',
            payment_method: paymentMethod,
            payment_status: 'pending',
            coupon_code: validatedCouponCode,
            discount_total: discountTotal,
            shipping_total: shippingTotal,
            subtotal,
            total,
            carrier: carrier,
            carrier_agency_name: carrierAgencyName || '',
            shipping_address: safeAddress,
            ip_address: req.clientIp
        });
        if (orderError) throw orderError;

        // 6. Insert order items
        const itemsWithOrderId = orderItemsData.map(i => ({ ...i, order_id: orderId }));
        const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
        if (itemsError) throw itemsError;

        // 7. Decrement stock (fallback direct update if RPC not available)
        for (const item of items) {
            const { error: rpcErr } = await supabase.rpc('decrement_stock', {
                product_id: item.productId,
                amount: item.qty
            });
            if (rpcErr) {
                const { data: p } = await supabase.from('products')
                    .select('stock').eq('id', item.productId).single();
                if (p) await supabase.from('products')
                    .update({ stock: Math.max(0, p.stock - item.qty) })
                    .eq('id', item.productId);
            }
        }

        // 8. Increment coupon redemption count
        if (validatedCouponCode) {
            const { data: currentCoupon } = await supabase.from('coupons')
                .select('redemption_count').eq('code', validatedCouponCode).single();
            if (currentCoupon) {
                await supabase.from('coupons')
                    .update({ redemption_count: (currentCoupon.redemption_count || 0) + 1 })
                    .eq('code', validatedCouponCode);
            }
        }

        // 9. Log initial status event
        await supabase.from('order_status_events').insert({
            order_id: orderId,
            status: 'confirmando_pago',
            note: 'Orden creada',
            actor_user_id: userId
        });

        // 10. Save payment proof if provided
        if (paymentProof && (paymentProof.bank || paymentProof.txid || paymentProof.proofPath)) {
            await supabase.from('payment_proofs').insert({
                order_id: orderId,
                method: paymentMethod,
                bank: paymentProof.bank || '',
                txid: paymentProof.txid || '',
                proof_path: paymentProof.proofPath || ''
            });
        }

        // 11. Send order confirmation email directly via SMTP
        const firstItem = orderItemsData[0];
        sendOrderEmail({
            orderId,
            status: 'confirmando_pago',
            customerName: `${safeAddress.firstName} ${safeAddress.lastName}`,
            customerEmail: req.user.email,
            productName: sanitize(firstItem?.product_snapshot?.name || 'Tu pedido'),
            carrier: sanitize(carrier),
            total: parseFloat(total).toFixed(2),
            paymentMethod: sanitize(paymentMethod),
            timestamp: new Date().toISOString(),
        });

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
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 50);
    const from = (page - 1) * limit;
    const status = req.query.status;

    let query = supabase
        .from('orders')
        .select(`
            id, status, payment_method, payment_status,
            subtotal, discount_total, shipping_total, total,
            coupon_code, carrier, carrier_agency_name,
            tracking_code, shipping_address, ip_address, notes,
            created_at, updated_at,
            customer:profiles(id, first_name, last_name, email, phone, is_banned, last_ip)
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
        order_id: id,
        status,
        note: note || '',
        actor_user_id: req.user.id
    });

    // Send status update email to customer (fire-and-forget)
    const { data: orderFull } = await supabase
        .from('orders')
        .select('*, customer:profiles(first_name, last_name, email)')
        .eq('id', id)
        .single();
    if (orderFull) {
        const { data: items } = await supabase
            .from('order_items').select('product_snapshot, qty').eq('order_id', id).limit(1);
        const customerEmail = orderFull.customer?.email || orderFull.shipping_address?.email;
        if (customerEmail) {
            sendOrderEmail({
                orderId: id,
                status,
                customerName: `${orderFull.shipping_address?.firstName || orderFull.customer?.first_name || ''} ${orderFull.shipping_address?.lastName || orderFull.customer?.last_name || ''}`.trim(),
                customerEmail,
                productName: items?.[0]?.product_snapshot?.name || 'Tu pedido',
                carrier: orderFull.carrier || '',
                total: parseFloat(orderFull.total || 0).toFixed(2),
                paymentMethod: orderFull.payment_method || '',
                trackingCode: trackingCode || orderFull.tracking_code || '',
                statusNote: note || '',
            });
        }
    }

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
    const { data, error } = await supabase.from('coupons').select('*').order('starts_at', { ascending: false });
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
// ADMIN: SECURITY & IP MANAGEMENT
// ============================================================
app.get('/api/admin/security/banned-ips', requireAdmin(async (req, res) => {
    const { data, error } = await supabase.from('banned_ips').select('*').order('banned_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

app.post('/api/admin/security/ban', requireAdmin(async (req, res) => {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP requerida' });
    const { data, error } = await supabase.from('banned_ips').insert({
        ip_address: ip,
        reason: reason || 'Comportamiento sospechoso',
        banned_by: req.user.id
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

app.delete('/api/admin/security/unban/:ip', requireAdmin(async (req, res) => {
    const { error } = await supabase.from('banned_ips').delete().eq('ip_address', req.params.ip);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
}));

// ============================================================
// ADMIN: ANALYTICS & AUDIT
// ============================================================
app.get('/api/admin/audit', requireAdmin(async (req, res) => {
    const { data, error } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

app.get('/api/admin/analytics/stats', requireAdmin(async (req, res) => {
    // Basic stats aggregation
    const [{ count: totalOrders }, { count: totalProds }, { data: revenue }] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total').eq('status', 'recibido')
    ]);
    const totalRevenue = (revenue || []).reduce((acc, curr) => acc + Number(curr.total), 0);
    res.json({ totalOrders, totalProds, totalRevenue });
}));

// ============================================================
// ADMIN: USER MANAGEMENT
// ============================================================
app.get('/api/admin/users', requireAdmin(async (req, res) => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

app.patch('/api/admin/users/:id', requireAdmin(async (req, res) => {
    const { role, is_banned } = req.body;
    const updates = {};
    if (role) updates.role = role;
    if (is_banned !== undefined) updates.is_banned = is_banned;
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}));

app.post('/api/admin/users/:id/reset-password', requireAdmin(async (req, res) => {
    const { data: profile, error: pe } = await supabase.from('profiles').select('email').eq('id', req.params.id).single();
    if (pe || !profile) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: profile.email,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, link: data.properties?.action_link });
}));

// ============================================================
// TEST EMAIL — sends a test email directly via SMTP
// Usage: GET /api/test-email?to=you@example.com&key=YOUR_N8N_API_KEY
// ============================================================
app.get('/api/test-email', async (req, res) => {
    const { to, key } = req.query;
    if (!key || key !== process.env.N8N_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!to) return res.status(400).json({ error: 'Missing ?to= param' });

    try {
        await sendOrderEmail({
            orderId: 'EG-TEST-001',
            status: 'orden_confirmada',
            customerName: 'Cliente de Prueba',
            customerEmail: to,
            productName: 'PlayStation 5 Slim - Edición Disco (1TB)',
            carrier: 'Servientrega',
            total: '649.00',
            paymentMethod: 'Transferencia Bancaria',
            trackingCode: '',
            statusNote: 'Este es un correo de prueba del sistema.',
        });
        res.json({ ok: true, sentTo: to, method: 'smtp' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ============================================================
// PUBLIC: GET /api/news — proxies n8n news webhook (hides server URL)
// ============================================================
app.get('/api/news', async (req, res) => {
    const url = process.env.N8N_NEWS_WEBHOOK_URL;
    if (!url) return res.json([]);
    try {
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await r.json().catch(() => []);
        res.json(data);
    } catch (e) {
        res.json([]);
    }
});

// ============================================================
// PUBLIC: POST /api/credit-check — saves credit application to Supabase
// ============================================================
app.post('/api/credit-check', async (req, res) => {
    const b = req.body;
    const sol = b.solicitante || {};
    const eco = b.economia || {};
    const prod = b.producto || {};
    try {
        if (useSupabase) {
            await supabase.from('credit_applications').insert({
                status: 'pendiente',
                nombres:            sanitize(sol.nombres || ''),
                apellidos:          sanitize(sol.apellidos || ''),
                cedula:             sanitize(sol.cedula || ''),
                fecha_nacimiento:   sol.fecha_nacimiento || null,
                whatsapp:           sanitize(sol.whatsapp || ''),
                email:              sanitize(sol.email || ''),
                direccion:          sanitize(sol.direccion || ''),
                ciudad:             sanitize(sol.ciudad || ''),
                estado_civil:       sanitize(sol.estado_civil || ''),
                ocupacion:          sanitize(eco.ocupacion || ''),
                lugar_trabajo:      sanitize(eco.lugar_trabajo || ''),
                ingresos_mensuales: parseFloat(eco.ingresos_mensuales) || 0,
                gastos_mensuales:   parseFloat(eco.gastos_mensuales) || 0,
                tiempo_en_trabajo:  sanitize(eco.tiempo_en_trabajo || ''),
                referencia_personal: sanitize(eco.referencia_personal || ''),
                product_name:       sanitize(prod.nombre || ''),
                product_price:      parseFloat(prod.precio) || 0,
                entrada_inicial:    parseFloat(prod.entrada_inicial) || 0,
                monto_financiar:    parseFloat(prod.monto_financiar) || 0,
                plan_meses:         parseInt(prod.plan_meses) || 0,
                cuota_mensual:      parseFloat(prod.cuota_mensual) || 0,
                total_pagar:        parseFloat(prod.total_pagar) || 0,
            });
        }
        // Also fire n8n if configured
        const url = process.env.N8N_CREDIT_WEBHOOK_URL;
        if (url) {
            fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(b), signal: AbortSignal.timeout(5000) })
                .catch(e => console.error('[credit n8n]', e.message));
        }
        // Notify admin by email
        if (process.env.SMTP_USER) {
            sendOrderEmail({
                orderId: `CREDITO-${Date.now()}`,
                status: 'confirmando_pago',
                customerName: `${sol.nombres} ${sol.apellidos}`,
                customerEmail: process.env.SMTP_FROM || process.env.SMTP_USER,
                productName: `Solicitud Crédito: ${prod.nombre}`,
                carrier: `$${prod.cuota_mensual?.toFixed(2)}/mes x${prod.plan_meses} meses`,
                total: prod.total_pagar?.toFixed(2) || '0',
                paymentMethod: `Entrada: $${prod.entrada_inicial}`,
            }).catch(() => {});
        }
    } catch (e) {
        console.error('[credit-check]', e.message);
    }
    res.json({ ok: true });
});

// ============================================================
// ADMIN: GET /api/admin/credits — list all credit applications
// ============================================================
app.get('/api/admin/credits', requireAdmin(async (req, res) => {
    const { status, limit = 200, page = 1 } = req.query;
    let query = supabase
        .from('credit_applications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
    if (status) query = query.eq('status', status);
    const { data, error, count } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ applications: data || [], total: count });
}));

// ADMIN: GET /api/admin/credits/:id
app.get('/api/admin/credits/:id', requireAdmin(async (req, res) => {
    const { data, error } = await supabase
        .from('credit_applications')
        .select('*')
        .eq('id', req.params.id)
        .single();
    if (error || !data) return res.status(404).json({ error: 'No encontrado' });
    res.json(data);
}));

// ADMIN: PATCH /api/admin/credits/:id/status
app.patch('/api/admin/credits/:id/status', requireAdmin(async (req, res) => {
    const { status, admin_note } = req.body;
    const valid = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    const updates = { status, updated_at: new Date().toISOString() };
    if (admin_note !== undefined) updates.admin_note = sanitize(admin_note);
    const { data, error } = await supabase
        .from('credit_applications')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
    if (error) return res.status(400).json({ error: error.message });
    // Notify applicant by email
    if (data.email && process.env.SMTP_USER) {
        const statusMsg = { aprobado: '✅ ¡Tu crédito fue APROBADO!', rechazado: '❌ Tu solicitud fue rechazada', en_revision: '🔍 Tu solicitud está en revisión', pendiente: 'Tu solicitud está pendiente' };
        sendOrderEmail({
            orderId: `CRÉDITO`,
            status: 'orden_confirmada',
            customerName: `${data.nombres} ${data.apellidos}`,
            customerEmail: data.email,
            productName: `Crédito: ${data.product_name}`,
            carrier: `Cuota: $${parseFloat(data.cuota_mensual || 0).toFixed(2)}/mes`,
            total: parseFloat(data.total_pagar || 0).toFixed(2),
            paymentMethod: statusMsg[status] || status,
            statusNote: admin_note || '',
        }).catch(() => {});
    }
    res.json(data);
}));

// ============================================================
// PUBLIC: GET /api/config — serves public Supabase config
// Keeps credentials out of static HTML/JS source files
// ============================================================
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    });
});

// ============================================================
// ADMIN: POST /api/admin/orders/:id/send-email
// Manually trigger the n8n order notification email
// ============================================================
app.post('/api/admin/orders/:id/send-email', requireAdmin(async (req, res) => {
    const { data: order, error } = await supabase
        .from('orders')
        .select(`*, customer:profiles(first_name, last_name, email)`)
        .eq('id', req.params.id)
        .single();

    if (error || !order) return res.status(404).json({ error: 'Orden no encontrada' });

    const { data: items } = await supabase
        .from('order_items')
        .select('product_snapshot, qty')
        .eq('order_id', req.params.id)
        .limit(1);

    const firstItem = items?.[0];
    const customerEmail = order.customer?.email || order.shipping_address?.email;
    if (!customerEmail) return res.status(400).json({ error: 'El cliente no tiene email registrado' });

    await sendOrderEmail({
        orderId: order.id,
        status: order.status || 'confirmando_pago',
        customerName: `${order.shipping_address?.firstName || order.customer?.first_name || ''} ${order.shipping_address?.lastName || order.customer?.last_name || ''}`.trim(),
        customerEmail,
        productName: sanitize(firstItem?.product_snapshot?.name || 'Tu pedido'),
        carrier: sanitize(order.carrier || ''),
        total: parseFloat(order.total || 0).toFixed(2),
        paymentMethod: sanitize(order.payment_method || ''),
        trackingCode: order.tracking_code || '',
        statusNote: order.status_note || '',
        timestamp: new Date().toISOString(),
    });

    res.json({ ok: true, sentTo: customerEmail });
}));

// ============================================================
// Health check
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '3.5 (Mega Admin)',
        database: useSupabase ? 'supabase' : 'json-fallback',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
