const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const targetModel = model \|\| getActiveSessionModel\(\) \|\| process\.env\.DEFAULT_MODEL \|\| "gemini-3\.8-flash";/;
const replacement = `const targetModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "gemini-3.8-flash";

  const questConfig = await loadQuestingSystemConfig();
  const existingQuests = await loadQuests();
  const activeCharQuests = existingQuests.filter((q: any) => q.characterId === personalityId && ["in_progress", "proposed", "active"].includes(q.status));
  if (activeCharQuests.length >= (questConfig.maxActiveQuests || 3)) {
    return res.json([]);
  }
  const avoidTitles = activeCharQuests.map((q: any) => \`"\${q.title}"\`).join(", ");
`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
