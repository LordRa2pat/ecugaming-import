const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const headerHTML = `
    <header style="background: rgba(10, 10, 11, 0.9); border-bottom: 1px solid var(--border);">
        <div class="logo" onclick="location.href='/'" style="color: #fff;">Ecugaming <span style="color: #fff; opacity: 0.8;">Import</span></div>

        <div class="search-container" style="display:flex; align-items:center; background:rgba(255,255,255,0.08); border-radius:20px; padding:0 12px; height:36px; margin:0 1rem;">
            <i class="fa fa-search search-icon" style="color:#fff; opacity:0.7; font-size:14px;"></i>
            <input type="text" id="searchInput" placeholder="Buscar..." 
                onkeydown="if(event.key==='Enter') { if(window.handleSearch){ handleSearch(); } else { location.href='/?q='+encodeURIComponent(this.value); } }"
                style="background:transparent; border:none; color:#fff; margin-left:8px; outline:none; font-size:.9rem; width:100%;">
        </div>

        <div class="nav-actions" style="display:flex; align-items:center; gap:16px;">
            <div id="authArea" style="display:flex; gap:.5rem; align-items:center; color:#fff;"></div>
            <div onclick="if(window.toggleCart) toggleCart(true); else location.href='/checkout'" style="position:relative; cursor:pointer;">
                <i class="fa fa-shopping-bag" style="font-size:1.2rem; color:#fff;"></i>
                <span id="cartBadge" style="position:absolute; top:-5px; right:-8px; background:var(--accent); color:#fff; font-size:10px; padding:2px 5px; border-radius:50%; font-weight:800; display:none;">0</span>
            </div>
        </div>
    </header>
`;

// Helper to remove any existing <header> blocks
function replaceHeaderInHTML(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the old header overrides from index.html CSS since they are now inline
    // This avoids black text conflicts
    content = content.replace(/header \.logo,\s*header \.nav-actions i,\s*header \.nav-actions a\s*\{\s*color: var\(--text\);\s*\}/g, '');

    // Replace <header> to </header>
    if (content.includes('<header>') && content.includes('</header>')) {
        content = content.replace(/<header>[\s\S]*?<\/header>/i, headerHTML.trim());
        fs.writeFileSync(filePath, content);
        console.log('Injected header ->', filePath);
    }
}

// Ensure the Cart and Auth scripts are present on all files being modified
const filesToUpdate = ['index.html', 'product.html', 'login.html', 'checkout.html', 'account.html', 'devoluciones.html', 'envios.html', 'privacidad.html', 'terminos.html', 'credito.html'];

filesToUpdate.forEach(file => {
    const p = path.join(publicDir, file);
    if (fs.existsSync(p)) {
        replaceHeaderInHTML(p);
    }
});
