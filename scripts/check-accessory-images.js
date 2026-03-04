const fs = require('fs'), https = require('https');
const prod = fs.readFileSync('.env.prod', 'utf8');
const get = k => { const m = prod.match(new RegExp(k + '=.?([A-Za-z0-9/_.:+=-]+)')); return m ? m[1].trim().replace(/[\r\n]/g,'') : ''; };
const U = get('SUPABASE_URL'), K = get('SUPABASE_SERVICE_KEY');
function apiGet(path) {
  return new Promise((res,rej) => {
    const u = new (require('url').URL)(U+path);
    https.get({hostname:u.hostname,path:u.pathname+u.search,headers:{apikey:K,'Authorization':'Bearer '+K}},r=>{
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error',rej);
  });
}
// Fetch accesorios + consolas products with their images
async function main() {
  const accs = await apiGet('/rest/v1/products?select=id,name,category_id&is_active=eq.true&category_id=eq.8209b472-f651-401f-8355-9cd4e3f91eeb');
  console.log('Accesorios:', accs.length);
  for (const p of accs) {
    const imgs = await apiGet('/rest/v1/product_images?select=storage_path&product_id=eq.'+p.id);
    const url = imgs[0] ? imgs[0].storage_path : 'NO IMAGE';
    console.log('  ' + p.name + '\n    ' + url.slice(0, 120));
  }
}
main().catch(console.error);
