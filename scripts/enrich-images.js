#!/usr/bin/env node
// enrich-images.js - Uses Google Custom Search Image API to find product images
// Run: node scripts/enrich-images.js
// Quota: 100 free searches/day. Run daily until all products have images.

'use strict';
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dpomkchvjpdkndkksphy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyA_PuMotDviY7C7EXaMNnKTZGaUti_mlHk';
const GOOGLE_CX = process.env.GOOGLE_CX || '8483c315919cd4ed4';

if (!SUPABASE_KEY) { console.error('Set SUPABASE_SERVICE_KEY'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Helper: HTTP GET → JSON
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error('JSON parse error: ' + body.slice(0,200))); }
      });
    }).on('error', reject);
  });
}

// Helper: check if URL returns 200 image
function checkImage(url) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : require('http');
      const req = mod.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'HEAD', timeout: 4000 }, res => {
        resolve(res.statusCode === 200 && (res.headers['content-type'] || '').startsWith('image/'));
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch { resolve(false); }
  });
}

// Search Google CSE for product image
async function searchImage(query, site = null) {
  const q = site ? `${query} site:${site}` : query;
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&searchType=image&q=${encodeURIComponent(q)}&num=5&imgType=photo&imgSize=large&safe=active`;
  try {
    const data = await get(url);
    if (data.error) {
      console.error('  CSE API error:', data.error.message);
      return null;
    }
    const items = data.items || [];
    for (const item of items) {
      const imgUrl = item.link;
      if (!imgUrl) continue;
      // Skip SVG, GIF, tiny images
      if (/\.(svg|gif)$/i.test(imgUrl)) continue;
      if (item.image && (item.image.width < 200 || item.image.height < 200)) continue;
      // Prefer Amazon, PlayStation, official manufacturer CDNs
      const goodDomains = ['media-amazon.com', 'playstation.com', 'apple.com', 'nintendo.com', 'xbox.com', 'microsoft.com', 'store.steampowered.com', 'steamstatic.com', 'media.rawg.io'];
      const isGood = goodDomains.some(d => imgUrl.includes(d));
      if (isGood) {
        const ok = await checkImage(imgUrl);
        if (ok) return imgUrl;
      }
    }
    // Fallback: try any working image from results
    for (const item of items) {
      const imgUrl = item.link;
      if (!imgUrl || /\.(svg|gif)$/i.test(imgUrl)) continue;
      const ok = await checkImage(imgUrl);
      if (ok) return imgUrl;
    }
  } catch (e) {
    console.error('  CSE fetch error:', e.message);
  }
  return null;
}

// Build search query per product
function buildQuery(name, brand) {
  const cleanName = name
    .replace(/\s*-\s*(Reacondicionado|Edición.*|Bundle.*|Complete.*)/gi, '')
    .trim();

  // Platform-specific queries
  if (['PlayStation Studios', 'Sony'].includes(brand) && !cleanName.includes('iPhone')) {
    return `${cleanName} PS5 cover art official`;
  }
  if (brand === 'Apple') return `${cleanName} official Apple product image`;
  if (brand === 'Nintendo') return `${cleanName} official Nintendo product image`;
  if (brand === 'Microsoft') return `${cleanName} Xbox official product image`;
  if (brand === 'Valve') return `${cleanName} Steam Deck official image`;
  return `${cleanName} official product image`;
}

async function main() {
  // Get products with broken images (404 or missing)
  const { data: products } = await sb
    .from('products')
    .select('id, name, brand, product_images(id, storage_path)')
    .eq('is_active', true)
    .order('name');

  // Find ones that need new images (missing or likely broken)
  const toFix = [];
  for (const p of products) {
    const img = p.product_images?.[0];
    if (!img || img.storage_path?.includes('media-amazon.com')) {
      toFix.push(p); // Re-search Amazon URLs (most were 404)
    }
  }

  console.log(`Products needing image refresh: ${toFix.length}`);
  console.log('Note: Google CSE quota is 100/day. Running for first batch...\n');

  let updated = 0, failed = 0, quota = 0;

  for (const product of toFix) {
    if (quota >= 98) {
      console.log(`\n⚠  Google CSE quota limit reached (${quota} searches). Run again tomorrow for remaining products.`);
      break;
    }

    const query = buildQuery(product.name, product.brand);
    process.stdout.write(`  Searching: ${product.name.slice(0, 50).padEnd(50)} `);

    const imgUrl = await searchImage(query);
    quota++;

    if (imgUrl) {
      const img = product.product_images?.[0];
      let error;
      if (img) {
        ({ error } = await sb.from('product_images').update({ storage_path: imgUrl }).eq('id', img.id));
      } else {
        ({ error } = await sb.from('product_images').insert({ product_id: product.id, storage_path: imgUrl, sort: 0 }));
      }
      if (error) {
        console.log(`✗ DB: ${error.message}`);
        failed++;
      } else {
        console.log(`✓`);
        updated++;
      }
    } else {
      console.log(`✗ (no image found)`);
      failed++;
    }

    // Respect CSE rate limit (100 req/100s)
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\n✅ Done: ${updated} updated, ${failed} failed, ${quota} API calls used`);
}

main().catch(e => { console.error(e); process.exit(1); });
