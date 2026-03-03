/**
 * migrate_products_v2.js
 * Migrates existing products from _products_backup (Supabase) or
 * public/data/stock.json (fallback) to the new v2 products schema.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate_products_v2.js
 *
 * What it does:
 *   - Reads _products_backup table OR stock.json
 *   - Maps old fields -> new schema (old_price->sale_price, is_clearance->badge)
 *   - Resolves category_id from categories table by name
 *   - Generates proper UUIDs and slugs
 *   - Ignores base64 images (upload manually via admin panel)
 *   - Inserts in batches of 20
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

async function loadOldProducts() {
  // Try _products_backup table first
  const { data, error } = await supabase
    .from('_products_backup')
    .select('*');

  if (!error && data && data.length > 0) {
    console.log(`✅ Loaded ${data.length} products from _products_backup table`);
    return data;
  }

  // Fallback to stock.json
  const jsonPath = path.join(__dirname, '..', 'public', 'data', 'stock.json');
  if (fs.existsSync(jsonPath)) {
    const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`✅ Loaded ${items.length} products from stock.json`);
    return items;
  }

  console.error('❌ No source data found (no _products_backup table and no stock.json)');
  process.exit(1);
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('id, name, slug');
  if (error) { console.error('❌ Could not load categories:', error.message); process.exit(1); }
  return data;
}

function resolveCategoryId(categoryName, categories) {
  if (!categoryName) return null;
  const lower = categoryName.toLowerCase();
  // exact match
  let cat = categories.find(c => c.name.toLowerCase() === lower);
  if (cat) return cat.id;
  // partial match
  cat = categories.find(c =>
    lower.includes(c.slug) || c.name.toLowerCase().includes(lower)
  );
  if (cat) return cat.id;
  // fallback to General
  return categories.find(c => c.slug === 'general')?.id || null;
}

function mapBadge(product) {
  if (product.badge) return product.badge;
  if (product.is_clearance) return 'Remate';
  return null;
}

function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image');
}

async function migrate() {
  console.log('🚀 Starting product migration v2...\n');

  const [oldProducts, categories] = await Promise.all([
    loadOldProducts(),
    loadCategories()
  ]);

  const slugTracker = new Set();
  const newProducts = oldProducts.map((p, index) => {
    let baseSlug = slugify(p.name || `product-${index}`);
    let slug = baseSlug;
    let counter = 2;
    while (slugTracker.has(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }
    slugTracker.add(slug);

    // Don't store base64 images - they'll be uploaded via admin
    const imageUrl = p.image && !isBase64Image(p.image) ? p.image : null;

    return {
      name:        p.name || 'Sin nombre',
      slug,
      category_id: resolveCategoryId(p.category, categories),
      brand:       p.brand || '',
      description: p.description || '',
      specs:       p.specs || {},
      price:       parseFloat(p.price) || 0,
      sale_price:  p.old_price ? parseFloat(p.old_price) : null,
      stock:       parseInt(p.stock) || 0,
      badge:       mapBadge(p),
      is_active:   true,
      // store old image URL separately as a note if it's a URL (not base64)
      _legacy_image: imageUrl
    };
  });

  // Insert in batches of 20
  const BATCH = 20;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < newProducts.length; i += BATCH) {
    const batch = newProducts.slice(i, i + BATCH);
    const batchForInsert = batch.map(({ _legacy_image, ...p }) => p);

    const { data, error } = await supabase
      .from('products')
      .upsert(batchForInsert, { onConflict: 'slug' })
      .select('id, name, slug');

    if (error) {
      console.error(`❌ Batch ${Math.floor(i/BATCH)+1} error:`, error.message);
      errors += batch.length;
      continue;
    }

    // For products with legacy URL images, create product_images entries
    const imageInserts = [];
    for (let j = 0; j < batch.length; j++) {
      const legacyImg = batch[j]._legacy_image;
      if (legacyImg && data[j]) {
        imageInserts.push({
          product_id:   data[j].id,
          storage_path: legacyImg,  // URL, not storage path, but better than null
          sort:         0
        });
      }
    }

    if (imageInserts.length > 0) {
      await supabase.from('product_images').insert(imageInserts);
    }

    inserted += data.length;
    console.log(`  ✓ Batch ${Math.floor(i/BATCH)+1}: ${data.length} products inserted`);
  }

  // Verify
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log('\n============================================');
  console.log(`✅ Migration complete!`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Errors:   ${errors}`);
  console.log(`   Total in DB: ${count}`);
  console.log('============================================');
  console.log('\n⚠️  Note: Base64 images were skipped. Upload product images via the Admin panel.');
  console.log('⚠️  Remember to set your admin user:');
  console.log("   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';");
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
