const XLSX = require('xlsx');
const wb = XLSX.readFile('data/inventario_ecugaming_masivo.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
const seen = new Set();
const unique = rows.filter(r => {
  const k = r.Nombre.toLowerCase().trim();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
console.log('Total unique:', unique.length);
const cats = {};
unique.forEach(r => {
  const c = r.Categoria || '?';
  if (!cats[c]) cats[c] = [];
  cats[c].push(r.Nombre);
});
Object.keys(cats).forEach(c => {
  console.log('\n=== ' + c + ' (' + cats[c].length + ') ===');
  cats[c].forEach(n => console.log('  ' + n));
});
