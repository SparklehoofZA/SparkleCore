const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<\/div>\s*<\/div>\s*\{\/\* Scenarios Section \*\/\}\s*<div className="p-4 flex-1 overflow-y-auto">/,
  '            </div>\n\n            <div className="h-px w-full bg-[#2A2A2E] my-4"></div>\n\n            {/* Scenarios Section */}\n            <div className="flex-1">'
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
