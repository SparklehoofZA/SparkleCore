const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("    difficulty,\n    maxActiveQuests,\n", "");
fs.writeFileSync('server.ts', code);
