// Ecugaming Import - Migrate JSON data to Supabase
// Run: node scripts/migrate_to_supabase.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
    console.log('\nSet them like this:');
    console.log('  $env:SUPABASE_URL = "https://your-project.supabase.co"');
    console.log('  $env:SUPABASE_SERVICE_KEY = "eyJhbGciOi..."');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function migrate() {
    console.log('🚀 Starting migration to Supabase (Frankfurt)...\n');

    // Migrate Products
    const stockPath = path.join(__dirname, '../public/data/stock.json');
    if (fs.existsSync(stockPath)) {
        const products = JSON.parse(fs.readFileSync(stockPath, 'utf8'));
        if (products.length > 0) {
            console.log(`📦 Migrating ${products.length} products...`);

            // Ensure all IDs are strings and clean data
            const cleanProducts = products.map(p => ({
                id: String(p.id),
                name: p.name || 'Producto',
                category: p.category || 'General',
                price: parseFloat(p.price) || 0,
                old_price: p.old_price ? parseFloat(p.old_price) : null,
                stock: parseInt(p.stock) || 0,
                description: p.description || '',
                image: p.image || '',
                is_clearance: Boolean(p.is_clearance)
            }));

            const { error } = await supabase.from('products').upsert(cleanProducts, { onConflict: 'id' });
            if (error) {
                console.error('❌ Products migration error:', error.message);
            } else {
                console.log(`✅ ${cleanProducts.length} products migrated successfully!`);
            }
        }
    } else {
        console.log('⚠️ No stock.json found, skipping products.');
    }

    // Migrate Users
    const usersPath = path.join(__dirname, '../public/data/users.json');
    if (fs.existsSync(usersPath)) {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        if (users.length > 0) {
            console.log(`👤 Migrating ${users.length} users...`);

            const cleanUsers = users.map(u => ({
                id: String(u.id),
                name: u.name || 'Usuario',
                email: (u.email || '').toLowerCase().trim(),
                phone: u.phone || '',
                password: u.password || ''
            }));

            const { error } = await supabase.from('users').upsert(cleanUsers, { onConflict: 'id' });
            if (error) {
                console.error('❌ Users migration error:', error.message);
            } else {
                console.log(`✅ ${cleanUsers.length} users migrated successfully!`);
            }
        }
    } else {
        console.log('⚠️ No users.json found, skipping users.');
    }

    // Migrate Orders
    const ordersPath = path.join(__dirname, '../public/data/orders.json');
    if (fs.existsSync(ordersPath)) {
        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
        if (orders.length > 0) {
            console.log(`📋 Migrating ${orders.length} orders...`);

            const cleanOrders = orders.map(o => ({
                id: String(o.id),
                user_id: o.userId || o.user_id || null,
                user_name: o.userName || o.user_name || 'Cliente',
                user_phone: o.userPhone || o.user_phone || '',
                user_address: o.address || o.user_address || '',
                items: o.items || [],
                total: parseFloat(o.total) || 0,
                status: o.status || 'confirmando_pago'
            }));

            const { error } = await supabase.from('orders').upsert(cleanOrders, { onConflict: 'id' });
            if (error) {
                console.error('❌ Orders migration error:', error.message);
            } else {
                console.log(`✅ ${cleanOrders.length} orders migrated successfully!`);
            }
        }
    } else {
        console.log('⚠️ No orders.json found, skipping orders.');
    }

    // Verify
    console.log('\n📊 Verification...');
    const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: uCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: oCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });

    console.log(`   Products in DB: ${pCount}`);
    console.log(`   Users in DB: ${uCount}`);
    console.log(`   Orders in DB: ${oCount}`);
    console.log('\n🎉 Migration complete! Your data is now secured in Frankfurt, Germany.');
}

migrate().catch(console.error);
