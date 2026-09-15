const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
content = content.replace(
  'import { Content, Personality, UserPersona } from "./types";',
  'import { Content, Personality, UserPersona, Scenario } from "./types";'
);
content = content.replace(
  'import { PersonalityModal } from "./components/PersonalityModal";',
  'import { PersonalityModal } from "./components/PersonalityModal";\nimport { ScenarioManagerModal } from "./components/ScenarioManagerModal";'
);

// State
content = content.replace(
  'const [personalities, setPersonalities] = useState<Personality[]>([]);\n  const [selectedPersonality, setSelectedPersonality] = useState<Personality | null>(null);',
  'const [personalities, setPersonalities] = useState<Personality[]>([]);\n  const [selectedPersonality, setSelectedPersonality] = useState<Personality | null>(null);\n  const [scenarios, setScenarios] = useState<Scenario[]>([]);\n  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);\n  const [isScenarioManagerOpen, setIsScenarioManagerOpen] = useState(false);'
);

// Fetch in useEffect
content = content.replace(
  'fetchPersonalities();\n    fetchUserPersona();',
  'fetchPersonalities();\n    fetchScenarios();\n    fetchUserPersona();'
);

// Fetch scenarios function
const fetchScenariosFunc = `
  const fetchScenarios = async () => {
    try {
      const res = await fetch("/api/scenarios");
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
        if (data.length > 0 && !selectedScenario) {
          // No auto-select, let user pick
        }
      }
    } catch (e) {
      console.error(e);
    }
  };
`;

content = content.replace(
  /const fetchPersonalities = async \(\) => \{[\s\S]*?console\.error\(e\);\n    \}\n  \};/,
  match => match + fetchScenariosFunc
);

// Replace buildSystemInstruction
const newBuildSystemInstruction = `const buildSystemInstruction = () => {
    let baseInstruction = "You are a helpful chat assistant with perfect memory. You can generate images using the generate_image tool when the user asks for a picture or when describing a vivid scene that warrants an illustration. When you use the tool, ALWAYS ensure the image prompt explicitly requests a vibrant anime cartoon style. ALWAYS include the image URL in your response using markdown format: ![Image Description](image_url).";
    
    let userContext = "";
    if (userPersona && userPersona.name) {
      userContext = \`\\n\\n--- User Character Profile (The person you are talking to) ---\\nName: \${userPersona.name}\\nAge: \${userPersona.age || 'Not specified'}\\nAppearance: \${userPersona.appearance || 'Not specified'}\\nPersonality: \${userPersona.traits || 'Not specified'}\\nBackground: \${userPersona.background || 'Not specified'}\\n----------------------------------\\n\`;
    }

    if (selectedPersonality) {
      const charPersonality = selectedPersonality.personality || selectedPersonality.traits || 'Not specified';
      const charDesc = selectedPersonality.description ? \`Short Description: \${selectedPersonality.description}\\n\` : '';
      const charInstruction = selectedPersonality.systemInstruction || 'Stay in character and naturally engage in the roleplay scenario.';
      const activeScenarioCtx = selectedScenario ? \`\\n--- Active Scenario ---\\nName: \${selectedScenario.name}\\nContext/World State: \${selectedScenario.context}\\n------------------------\\n\` : '';

      return \`You are playing a character in a roleplay.
Name: \${selectedPersonality.name}
Chatbot's Personality: \${charPersonality}
Appearance: \${selectedPersonality.appearance || 'Not specified'}
Age: \${selectedPersonality.age || 'Not specified'}
\${charDesc}\${activeScenarioCtx}\${userContext}
Additional system instructions or context:
\${charInstruction}\`;
    }

    return baseInstruction;
  };`;

content = content.replace(
  /const buildSystemInstruction = \(\) => \{[\s\S]*?return baseInstruction;\n  \};/,
  newBuildSystemInstruction
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
