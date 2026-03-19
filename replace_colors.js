const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Check if we need to replace
            let newContent = content
                .replace(/#ff8c00/gi, '#00b4d8')
                .replace(/rgba\(\s*255\s*,\s*140\s*,\s*0/gi, 'rgba(0, 180, 216')
                .replace(/#ff4500/gi, '#0077b6')
                .replace(/rgba\(\s*255\s*,\s*45\s*,\s*85/gi, 'rgba(0, 119, 182');
            
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log('Updated', fullPath);
            }
        }
    });
}
replaceInDir(path.join(__dirname, 'public'));
