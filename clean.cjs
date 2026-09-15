const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex1 = /\|\| 3\)\) \{\n    return res\.json\(\[\]\);\n  \}\n  const avoidTitles = activeCharQuests\.map\(\(q: any\) => \`"\$\{q\.title\}"\`\)\.join\(", "\);\n/g;
code = code.replace(regex1, "");

const regex2 = /  if \(activeCharQuests\.length >= \(questConfig\.maxActiveQuests || 3\)\) \{\n    return res\.json\(\[\]\);\n  \}\n  const avoidTitles = activeCharQuests\.map\(\(q: any\) => \`"\$\{q\.title\}"\`\)\.join\(", "\);\n/g;
code = code.replace(regex2, "");

// Line 2954
const regex3 = /  const targetModel =        selectedModel \|\|/g;
code = code.replace(regex3, "  const targetModel = selectedModel ||");

fs.writeFileSync('server.ts', code);
