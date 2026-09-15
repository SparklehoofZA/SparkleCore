const fs = require('fs');

const UI_FILES = [
    'src/components/PersonalityModal.tsx',
    'src/components/UserPersonaModal.tsx',
    'src/components/LoreBookManagerModal.tsx',
    'src/components/EventManagerModal.tsx',
    'src/components/ScenarioManagerModal.tsx',
    'src/App.tsx'
];

for (const filepath of UI_FILES) {
    if (!fs.existsSync(filepath)) continue;
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix JSX rendering of {{char}} and {{user}} inside elements
    // Basically >{{char}}< to >{"{{char}}"}<
    content = content.replace(/>\{\{char\}\}</g, '>{"{{char}}"}<');
    content = content.replace(/>\{\{user\}\}</g, '>{"{{user}}"}<');

    fs.writeFileSync(filepath, content);
}
