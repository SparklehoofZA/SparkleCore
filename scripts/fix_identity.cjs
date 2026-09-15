const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(
  /- ACTIVE CHAT CHARACTER: You are \$\{charName\}\. In all scenario setups, lore books, character context, and prompts, "character", "personality", \{\{char\}\}, and \{\{character\}\} ALWAYS refer directly to YOU \(\$\{charName\}\)\.\n- ACTIVE USER PERSONA: The person you are interacting with is \$\{userName\}\. In all scenario setups, lore books, user profiles, and prompts, "user" and \{\{user\}\} ALWAYS refer directly to the active user persona \(\$\{userName\}\)\./g,
  `- ACTIVE CHAT CHARACTER (YOU): You are \${charName}. In all scenario setups, lore books, character context, and prompts, the words "character", "personality", {{char}}, and {{character}} (whether quoted or unquoted) ALWAYS refer directly to YOU (\${charName}). If a scenario says "character is injured", it means YOU (\${charName}) are injured.\n- ACTIVE USER PERSONA: The person you are interacting with is \${userName}. In all scenario setups, lore books, user profiles, and prompts, the words "user" and {{user}} (whether quoted or unquoted) ALWAYS refer directly to the active user persona (\${userName}). If a scenario says "user is injured", it means \${userName} is injured.\n- IDENTITY RULE: NEVER confuse your identity. You are ALWAYS \${charName} (the active chat character) and you are talking to \${userName} (the user persona). Do not act as the user, and do not attribute the character's actions or states to the user.`
);

fs.writeFileSync('server.ts', serverCode);

let templateCode = fs.readFileSync('src/roleplayTemplate.ts', 'utf8');
templateCode = templateCode.replace(
  /\\buser\\s\+\(walks\|approaches\|enters\|speaks\|asks\|smiles\|looks\|replies\|says\|stands\|sits\|steps\)\\b/g,
  `\\buser\\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|walks|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\\b`
);

templateCode = templateCode.replace(
  /\\b\(character\|personality\|char\)\\s\+\(works\|approaches\|enters\|speaks\|asks\|smiles\|looks\|replies\|says\|stands\|sits\|steps\)\\b/g,
  `\\b(character|personality|char)\\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|works|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\\b`
);

templateCode = templateCode.replace(
  /\\bwhere user and \(character\|personality\|char\)\\b/g,
  `\\b(where|when|while|if) user and (character|personality|char)\\b`
);
templateCode = templateCode.replace(
  /\\bwhere \(character\|personality\|char\) and user\\b/g,
  `\\b(where|when|while|if) (character|personality|char) and user\\b`
);

fs.writeFileSync('src/roleplayTemplate.ts', templateCode);

