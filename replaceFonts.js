const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content.replace(/font-poppins/g, 'font-montserrat').replace(/font-inter/g, 'font-open-sans');
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
            }
        }
    }
}
replaceInDir('src');
console.log('Done replacing font classes.');
