const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace(
  'export type Scenario = {',
  'export type Scenario = {\n  location?: string;\n  timeOfDay?: string;'
);
content = content.replace(
  'export type Personality = {\n  id: string;\n  name: string;',
  'export type Personality = {\n  id: string;\n  name: string;\n  scenarioId?: string;'
);
fs.writeFileSync('src/types.ts', content, 'utf8');
