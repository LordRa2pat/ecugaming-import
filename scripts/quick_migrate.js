// Quick test: verify Supabase connection and migrate
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

console.log('URL:', url ? 'SET' : 'MISSING');
console.log('KEY:', key ? 'SET (' + key.substring(0, 20) + '...)' : 'MISSING');

if (!url || !key) { console.log('Missing env vars'); process.exit(1); }

const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    // Test connection
    console.log('\n1. Testing connection...');
    const { data: test, error: testErr } = await supabase.from('products').select('id').limit(1);
    if (testErr) {
        console.error('Connection error:', testErr.message);
        process.exit(1);
    }
    console.log('✅ Connected to Supabase!');

    // Load stock
    const stockPath = path.join(__dirname, '../public/data/stock.json');
    const products = JSON.parse(fs.readFileSync(stockPath, 'utf8'));
    console.log(`\n2. Migrating ${products.length} products...`);

    // Clean and insert in batches of 20
    for (let i = 0; i < products.length; i += 20) {
        const batch = products.slice(i, i + 20).map(p => ({
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

        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error(`Batch error at ${i}:`, error.message);
        } else {
            console.log(`  Batch ${Math.floor(i / 20) + 1}: ${batch.length} products OK`);
        }
    }

    // Verify
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`\n✅ Done! ${count} products now in Supabase Frankfurt 🇩🇪`);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
