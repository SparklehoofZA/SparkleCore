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

    // Fix + "{{char}}" and +"{{char}}" in JSX text
    // Replace +"{{char}}" with +{"\"{{char}}\""}
    content = content.replace(/\+"\{\{char\}\}"/g, '+{"\\"{{char}}\\""}');
    content = content.replace(/\+"\{\{user\}\}"/g, '+{"\\"{{user}}\\""}');
    content = content.replace(/\+ "\{\{char\}\}"/g, '+ {"\\"{{char}}\\""}');
    content = content.replace(/\+ "\{\{user\}\}"/g, '+ {"\\"{{user}}\\""}');

    // Also fix (e.g. <em>"character" works at coffee shop and {{user}} walks in</em>)
    // Here {{user}} is an expression!
    content = content.replace(/<em>(.*?)(\{\{char\}\}|\{\{user\}\})(.*?)<\/em>/g, (match) => {
        // Just wrap any {{char}} or {{user}} inside <em> with {" "} if it's naked text
        return match.replace(/\{\{char\}\}/g, '{"{{char}}"}').replace(/\{\{user\}\}/g, '{"{{user}}"}');
    });

    fs.writeFileSync(filepath, content);
}
