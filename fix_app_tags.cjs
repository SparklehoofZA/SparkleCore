const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// I'll just restore the </div></div> before the divider
content = content.replace(
  '            <div className="h-px w-full bg-[#2A2A2E] my-4"></div>',
  '            </div>\n          </div>\n\n          <div className="h-px w-full bg-[#2A2A2E] my-4"></div>'
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
