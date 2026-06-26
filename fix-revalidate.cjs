const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src/app/api');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('revalidateTag(')) {
        // match revalidateTag("xxx") and replace with revalidateTag("xxx", undefined as any)
        const newContent = content.replace(/revalidateTag\((["'][^"']+["'])\)/g, 'revalidateTag($1, undefined as any)');
        if (newContent !== content) {
            fs.writeFileSync(f, newContent);
            console.log('Fixed', f);
        }
    }
});
