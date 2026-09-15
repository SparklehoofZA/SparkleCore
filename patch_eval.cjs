const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const evalPrompt = \`\[SYSTEM EVALUATION: Quest Completion Verification\]/g;
const replacement = `const sensitivity = arguments[0].questConfig?.autoResolutionSensitivity || 3;
    const leniencyGuidance = sensitivity >= 4 ? 
        "Evaluate generously. If the user implies or narratively attempts to fulfill the objective, consider it complete." :
        (sensitivity <= 2 ? "Evaluate strictly. The user must explicitly perform the actions required to complete the objective in clear terms." : "Evaluate normally.");
    const evalPrompt = \`[SYSTEM EVALUATION: Quest Completion Verification]\\nSensitivity Guidance: \$\{leniencyGuidance\}\\n`;

code = code.replace(regex, replacement);

const fnRegex = /async function evaluateQuestCompletion\(params: \{/g;
const fnReplacement = `async function evaluateQuestCompletion(params: {\n  questConfig?: any;`;
code = code.replace(fnRegex, fnReplacement);

const callRegex = /const evalResult = await evaluateQuestCompletion\(\{/g;
const callReplacement = `const evalResult = await evaluateQuestCompletion({\n              questConfig,`;
code = code.replace(callRegex, callReplacement);

fs.writeFileSync('server.ts', code);
