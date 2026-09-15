const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace('<button\n<button', '<button');
fs.writeFileSync('src/App.tsx', content, 'utf8');
