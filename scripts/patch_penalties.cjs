const fs = require('fs');

// 1. Patch server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');

// Remove presencePenalty and frequencyPenalty from config
serverContent = serverContent.replace(
  /presencePenalty: genSettings\.presencePenalty,\s*frequencyPenalty: genSettings\.frequencyPenalty,/,
  ''
);

// Remove gemini-2.5-flash
serverContent = serverContent.replace(
  /, "gemini-2\.5-flash"/g,
  ''
);
serverContent = serverContent.replace(
  /\n\s*"gemini-2\.5-flash",/g,
  ''
);

fs.writeFileSync('server.ts', serverContent, 'utf8');

// 2. Patch src/App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
  /, "gemini-2\.5-flash"/g,
  ''
);
appContent = appContent.replace(
  /<option value="gemini-2\.5-flash">Gemini 2\.5 Flash<\/option>\n/g,
  ''
);
// Make sure we also strip it if it had leading spaces
appContent = appContent.replace(
  /.*<option value="gemini-2\.5-flash">Gemini 2\.5 Flash<\/option>\n/g,
  ''
);

fs.writeFileSync('src/App.tsx', appContent, 'utf8');
