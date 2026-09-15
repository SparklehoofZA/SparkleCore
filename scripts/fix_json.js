const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// Replace standard try-catch blocks for parsing JSON
content = content.replace(/try\s*\{\s*res\.json\(JSON\.parse\(cleaned\)\);\s*\}\s*catch\s*\(e:\s*any\)\s*\{/g, 
`try {
      cleaned = jsonrepair(cleaned);
      res.json(JSON.parse(cleaned));
    } catch (e: any) {`);

content = content.replace(/try\s*\{\s*const parsed = JSON\.parse\(cleaned\);\s*res\.json\(parsed\);\s*\}\s*catch\s*\(e:\s*any\)\s*\{/g,
`try {
      cleaned = jsonrepair(cleaned);
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (e: any) {`);
    
content = content.replace(/try\s*\{\s*parsed = JSON\.parse\(cleaned\);\s*\}\s*catch\s*\(e:\s*any\)\s*\{/g,
`try {
      cleaned = jsonrepair(cleaned);
      parsed = JSON.parse(cleaned);
    } catch (e: any) {`);

fs.writeFileSync('server.ts', content);
