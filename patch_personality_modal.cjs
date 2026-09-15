const fs = require('fs');
let content = fs.readFileSync('src/components/PersonalityModal.tsx', 'utf8');

// Update imports and props
content = content.replace(
  'import { Personality } from "../types";',
  'import { Personality, Scenario } from "../types";'
);
content = content.replace(
  '  onDelete?: (id: string) => Promise<void>;',
  '  onDelete?: (id: string) => Promise<void>;\n  scenarios: Scenario[];'
);
content = content.replace(
  '  onDelete,\n}) => {',
  '  onDelete,\n  scenarios,\n}) => {'
);

// Add scenarioId state
content = content.replace(
  'const [description, setDescription] = useState("");',
  'const [description, setDescription] = useState("");\n  const [scenarioId, setScenarioId] = useState("");'
);

// Populate state
content = content.replace(
  '      setDescription(personality.description || "");',
  '      setDescription(personality.description || "");\n      setScenarioId(personality.scenarioId || "");'
);
content = content.replace(
  '      setDescription("");',
  '      setDescription("");\n      setScenarioId("");'
);

// Save payload
content = content.replace(
  '        description: description.trim(),',
  '        description: description.trim(),\n        scenarioId: scenarioId,'
);

// Add UI for Scenario dropdown
// We'll insert it right after Appearance (Row 4)
const scenarioUI = `
          {/* Row X: Scenario Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <MapPin size={13} className="text-amber-400" />
                Attached Scenario
              </label>
              <span className="text-[11px] text-gray-500">World context</span>
            </div>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all"
            >
              <option value="">None (Standalone Character)</option>
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
`;

content = content.replace(
  /\{\/\* Row 4: Appearance \*\/\}/,
  scenarioUI + '\n          {/* Row 4: Appearance */}'
);

fs.writeFileSync('src/components/PersonalityModal.tsx', content, 'utf8');
