const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const url = process.env.SUPABASE_URL.trim();
const key = process.env.SUPABASE_SERVICE_KEY.trim();

console.log('Connecting to:', url);

const supabase = createClient(url, key);

async function check() {
    try {
        console.log('\nChecking tables...');
        const tables = ['products', 'profiles', 'categories', 'orders'];
        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*').limit(0);
            if (error) {
                console.log(`❌ Table ${table}: ${error.message}`);
            } else {
                console.log(`✅ Table ${table}: Found`);
            }
        }

        console.log('\nChecking categories...');
        const { data: cats, error: catErr } = await supabase.from('categories').select('name');
        if (catErr) {
            console.log(`❌ Categories: ${catErr.message}`);
        } else {
            console.log(`✅ Categories: ${cats.map(c => c.name).join(', ')}`);
        }

    } catch (err) {
        console.error('Fatal:', err);
    }
}

check();
