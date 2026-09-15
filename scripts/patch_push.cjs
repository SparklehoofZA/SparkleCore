const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `let questInstructionInjection = "";`;
const replacement = `let questInstructionInjection = "";
    const questConfig = await loadQuestingSystemConfig();
    const pushiness = questConfig.aiPushiness || "Moderate";
`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('server.ts', code);
console.log("Patched pushiness");
