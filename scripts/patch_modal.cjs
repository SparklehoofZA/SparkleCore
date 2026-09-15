const fs = require('fs');
let content = fs.readFileSync('src/components/ScenarioManagerModal.tsx', 'utf8');

// Remove onSelectScenario from props
content = content.replace(
  '  selectedScenario: Scenario | null;\n  onSelectScenario: (s: Scenario | null) => void;',
  '' // Remove these
);
content = content.replace(
  'export function ScenarioManagerModal({ isOpen, onClose, scenarios, onScenariosChange, selectedScenario, onSelectScenario }: Props) {',
  'export function ScenarioManagerModal({ isOpen, onClose, scenarios, onScenariosChange }: Props) {'
);

// Replace onSelectScenario calls with startEdit
content = content.replace(
  'if (editingId === "new" || selectedScenario?.id === editingId) {\n           onSelectScenario(savedData);\n        }',
  ''
);
content = content.replace(
  'if (selectedScenario?.id === id) {\n          onSelectScenario(null);\n        }',
  ''
);
content = content.replace(
  'onClick={() => onSelectScenario(s)}',
  'onClick={() => startEdit(s)}'
);

// Remove active highlighting using selectedScenario
content = content.replace(
  'selectedScenario?.id === s.id',
  'editingId === s.id'
);

fs.writeFileSync('src/components/ScenarioManagerModal.tsx', content, 'utf8');
