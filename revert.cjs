const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /  const questConfig = await loadQuestingSystemConfig\(\);\n  const existingQuests = await loadQuests\(\);\n  const activeCharQuests = existingQuests\.filter\(\(q: any\) => q\.characterId === personalityId && \["in_progress", "proposed", "active"\]\.includes\(q\.status\)\);\n  if \(activeCharQuests\.length >= \(questConfig\.maxActiveQuests || 3\)\) \{\n    return res\.json\(\[\]\);\n  \}\n  const avoidTitles = activeCharQuests\.map\(\(q: any\) => \`"\$\{q\.title\}"\`\)\.join\(", "\);\n/g;

code = code.replace(regex, "");
fs.writeFileSync('server.ts', code);
