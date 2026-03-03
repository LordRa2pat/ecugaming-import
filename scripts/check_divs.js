const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\leonp\\EG\\public\\admin.html', 'utf8');

let openDivs = 0;
let lineNum = 0;

const lines = content.split('\n');
lines.forEach((line, i) => {
    const openings = (line.match(/<div/g) || []).length;
    const closings = (line.match(/<\/div>/g) || []).length;
    openDivs += openings - closings;
    if (openDivs < 0) {
        console.log(`Potential extra closing div on line ${i + 1}: ${line.trim()}`);
    }
});

console.log(`Final open divs count: ${openDivs}`);
