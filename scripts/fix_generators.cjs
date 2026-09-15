const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Scenario prompt:
code = code.replace(
  /- You MUST use the literal string "character" \(INCLUDING the double quotes\) to refer to the active chat character in all descriptions and text\. Never use their real name or just the word character without quotes\./g,
  '- You MUST use the literal string {{char}} to refer to the active chat character in all descriptions and text. Never use their real name.'
);

code = code.replace(
  /- You MUST use the literal string "user" \(INCLUDING the double quotes\) to refer to the active user persona\. Never use their real name or just the word user without quotes\./g,
  '- You MUST use the literal string {{user}} to refer to the active user persona. Never use their real name.'
);

code = code.replace(
  /"description": "Detailed scenario context \\(using \\\\\\"character\\\\\\" and \\\\\\"user\\\\\\"\\)"/g,
  '"description": "Detailed scenario context (using {{char}} and {{user}})"'
);
code = code.replace(
  /"context": "Broader world context \\(using \\\\\\"character\\\\\\" and \\\\\\"user\\\\\\"\\)"/g,
  '"context": "Broader world context (using {{char}} and {{user}})"'
);
code = code.replace(
  /"relationship": "Description of their relationship \\(using \\\\\\"character\\\\\\" and \\\\\\"user\\\\\\"\\)"/g,
  '"relationship": "Description of their relationship (using {{char}} and {{user}})"'
);
code = code.replace(
  /"firstMessage": "The opening message for the roleplay from \\\\\\"character\\\\\\""/g,
  '"firstMessage": "The opening message for the roleplay from {{char}}"'
);

// Event prompt:
code = code.replace(
  /"description": "Detailed description of the event, what happens, and what \\\\\\"character\\\\\\" sees or experiences."/g,
  '"description": "Detailed description of the event, what happens, and what {{char}} sees or experiences."'
);


// Random Character Prompt:
code = code.replace(
  /"systemInstruction": "Specific system instructions or behavioral directives for \\\\\\"character\\\\\\""/g,
  '"systemInstruction": "Specific system instructions or behavioral directives for {{char}}"'
);

code = code.replace(
  /"firstMessage": "The character's opening message \\(Use \\\\\\"user\\\\\\" to refer to the player\\)"/g,
  '"firstMessage": "The character\'s opening message (Use {{user}} to refer to the player)"'
);

code = code.replace(
  /"scenario": "The starting scenario description \\(use \\\\\\"character\\\\\\" and \\\\\\"user\\\\\\" as macros\\)"/g,
  '"scenario": "The starting scenario description (use {{char}} and {{user}} as macros)"'
);


fs.writeFileSync('server.ts', code);
