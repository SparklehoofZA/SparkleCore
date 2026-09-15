const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Update candidate models in chat
content = content.replace(
  '    const candidateModels = [\n      selectedModel,\n      "gemini-3.1-flash-lite",\n      "gemini-flash-latest",\n      "gemini-3.7-flash",\n    ];',
  '    const candidateModels = [\n      selectedModel,\n      "gemini-3.1-flash-lite",\n      "gemini-flash-latest",\n      "gemini-3.7-flash",\n      "gemini-2.5-flash",\n    ];'
);

content = content.replace(
  'maxAttemptsPerModel: 2,',
  'maxAttemptsPerModel: 3,'
);

// Update models in scene generation
content = content.replace(
  'const modelsToTry = [selectedModel, "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];',
  'const modelsToTry = [selectedModel, "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash", "gemini-2.5-flash"];'
);
content = content.replace(
  '      const { response: promptResponse } = await callGeminiContentWithRetry({\n        models: modelsToTry,',
  '      const { response: promptResponse } = await callGeminiContentWithRetry({\n        models: modelsToTry,\n        maxAttemptsPerModel: 3,'
);


// Update image model fallbacks
content = content.replace(
  'const modelsToTry = ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image"];',
  'const modelsToTry = ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-3.1-pro-image"];'
);

fs.writeFileSync('server.ts', content, 'utf8');
