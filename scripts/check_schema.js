const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const url = process.env.SUPABASE_URL.trim();
const key = process.env.SUPABASE_SERVICE_KEY.trim();

const supabase = createClient(url, key);

async function check() {
    try {
        console.log('Checking products table columns...');
        // We can't easily get column info via JS client without RPC or generic select
        // Let's try to select one row and see the keys
        const { data, error } = await supabase.from('products').select('*').limit(1);
        if (error) {
            console.error('Error:', error.message);
        } else if (data && data.length > 0) {
            console.log('Columns found:', Object.keys(data[0]).join(', '));
            console.log('Sample row:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('No data in products table, trying categories...');
            const { data: catData, error: catError } = await supabase.from('categories').select('*').limit(1);
            if (catError) console.log('Categories also missing.');
        }

    } catch (err) {
        console.error('Fatal:', err);
    }
}

check();
