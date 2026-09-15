const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

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
\${charInstruction}

You must ALWAYS stay in character. Never break the fourth wall.

FORMATTING REQUIREMENTS:
- When speaking out loud (dialogue), write normal text so it renders clearly.
- When performing physical actions, gestures, body language, facial expressions, or describing scene activities, wrap the action in asterisks (e.g., *smiles warmly, leaning across the counter*).

You can generate images using the generate_image tool when the user asks for a picture or when describing a vivid scene that warrants an illustration. When you use the tool, ALWAYS ensure the image prompt explicitly requests a vibrant anime cartoon style. ALWAYS include the image URL in your response using markdown format: ![Image Description](image_url).\`;
    }
    
    return baseInstruction + userContext;
  };`;

content = content.replace(
  /const buildSystemInstruction = \(\) => \{[\s\S]*?return baseInstruction \+ userContext;\n  \};/,
  newBuildSystemInstruction
);

// Replace selectedPersonality.scenario in the Context Card
content = content.replace(
  /\{\(selectedPersonality\.personality \|\| selectedPersonality\.traits\) && \([\s\S]*?\{\s*selectedPersonality\.scenario && \(\s*<div className="bg-\[#18181D\] p-2\.5 rounded-lg border border-\[#242429\]">\s*<span className="text-gray-400 font-semibold flex items-center gap-1 text-\[11px\] mb-1">\s*<MapPin size=\{11\} className="text-amber-400" \/> Scenario\s*<\/span>\s*<p className="text-gray-200 line-clamp-2">\{selectedPersonality\.scenario\}<\/p>\s*<\/div>\s*\)\}/,
  `{(selectedPersonality.personality || selectedPersonality.traits) && (
                      <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429]">
                        <span className="text-gray-400 font-semibold flex items-center gap-1 text-[11px] mb-1">
                          <Heart size={11} className="text-amber-400" /> Chatbot's Personality
                        </span>
                        <p className="text-gray-200 line-clamp-2">{selectedPersonality.personality || selectedPersonality.traits}</p>
                      </div>
                    )}
                    {selectedScenario && (
                      <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429]">
                        <span className="text-gray-400 font-semibold flex items-center gap-1 text-[11px] mb-1">
                          <MapPin size={11} className="text-amber-400" /> Scenario: {selectedScenario.name}
                        </span>
                        <p className="text-gray-200 line-clamp-2">{selectedScenario.context}</p>
                      </div>
                    )}`
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
