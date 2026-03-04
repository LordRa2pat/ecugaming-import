const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const { data: products } = await sb.from('products').select('id,name,categories(name)').eq('active', true).order('name');
  const { data: imgs } = await sb.from('product_images').select('product_id,storage_path');
  const imgMap = {};
  for (const i of imgs) imgMap[i.product_id] = i.storage_path;
  const missing = products.filter(p => !(imgMap[p.id]));
  console.log('TOTAL:', products.length, '| MISSING:', missing.length);
  missing.forEach(p => console.log((p.categories && p.categories.name) || '?', '|', p.name));
  const cats = [...new Set(products.map(p => p.categories && p.categories.name))].sort();
  console.log('\nALL CATEGORIES:', JSON.stringify(cats));
  // Show all products with category
  console.log('\nALL PRODUCTS:');
  products.forEach(p => console.log((p.categories && p.categories.name) || '?', '|', p.name));
})().catch(console.error);
