const fs = require('fs');

const updateApp = (path) => {
  if(!fs.existsSync(path)) return;
  let text = fs.readFileSync(path, 'utf8');
  
  // App.tsx
  text = text.replace(
    /Example: If a scenario or detail says '"character" works at coffee shop and \{\{user\}\} walks in'/g,
    'Example: If a scenario or detail says \'{{char}} works at coffee shop and {{user}} walks in\''
  );
  
  text = text.replace(
    /\* "character", "personality", \{\{char\}\}, and \{\{character\}\} ALWAYS refer/g,
    '* {{char}} ALWAYS refers'
  );

  text = text.replace(
    /\* "user" and \{\{user\}\} ALWAYS refer/g,
    '* {{user}} ALWAYS refers'
  );

  fs.writeFileSync(path, text);
};

const updateServer = (path) => {
  if(!fs.existsSync(path)) return;
  let text = fs.readFileSync(path, 'utf8');

  text = text.replace(
    /the macros \{\{char\}\} and \{\{character\}\}, and the words "character" and "personality" \(whether quoted or unquoted\) ALWAYS refer directly to YOU/g,
    'the macro {{char}} (and {{character}}) ALWAYS refers directly to YOU'
  );

  text = text.replace(
    /the macro \{\{user\}\} and the word "user" \(whether quoted or unquoted\) ALWAYS refer directly to the active user persona/g,
    'the macro {{user}} ALWAYS refers directly to the active user persona'
  );
  
  text = text.replace(
    /If a scenario says "character is injured"/g,
    'If a scenario says "{{char}} is injured"'
  );
  
  text = text.replace(
    /If a scenario says "user is injured"/g,
    'If a scenario says "{{user}} is injured"'
  );

  fs.writeFileSync(path, text);
};

updateApp('src/App.tsx');
updateServer('server.ts');
