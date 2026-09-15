const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalGenerationSettingsModal.tsx', 'utf8');

content = content.replace(
  /const defaults: GlobalGenerationSettings = \{[\s\S]*?\};/,
  `const defaults: GlobalGenerationSettings = {
        maxTokens: 250,
        temperature: 0.9,
        topP: 1.0,
        topK: 0,
        frequencyPenalty: 0.1,
        presencePenalty: 0.0,
        repetitionPenalty: 1.05,
        minP: 0.06,
        mirostat: 0,
        mirostatTau: 5.0,
        mirostatEta: 0.1,
        tfsZ: 0.95,
        logitBias: {},
        dryMultiplier: 0.9,
        dryBase: 1.75,
        dryAllowedLength: 2,
        drySequenceBreakers: ["\\n", ":", "\\"", "*"],
      };`
);

fs.writeFileSync('src/components/GlobalGenerationSettingsModal.tsx', content, 'utf8');
