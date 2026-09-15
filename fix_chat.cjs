const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Inside /api/chat Evaluate Quests:
// We need to inject the aiPushiness into questInstructionInjection
const injectionStr = "let questInstructionInjection = \"\";";
code = code.replace(
    injectionStr,
    `let questInstructionInjection = "";
    const questConfig = await loadQuestingSystemConfig();
    `
);

fs.writeFileSync('server.ts', code);
