const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(
  /\\buser\\s\+\(walks\|approaches\|enters\|speaks\|asks\|smiles\|looks\|replies\|says\|stands\|sits\|steps\)\\b/g,
  `\\buser\\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|walks|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\\b`
);

serverCode = serverCode.replace(
  /\\b\(character\|personality\|char\)\\s\+\(works\|approaches\|enters\|speaks\|asks\|smiles\|looks\|replies\|says\|stands\|sits\|steps\)\\b/g,
  `\\b(character|personality|char)\\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|works|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\\b`
);

serverCode = serverCode.replace(
  /\\bwhere user and \(character\|personality\|char\)\\b/g,
  `\\b(where|when|while|if) user and (character|personality|char)\\b`
);
serverCode = serverCode.replace(
  /\\bwhere \(character\|personality\|char\) and user\\b/g,
  `\\b(where|when|while|if) (character|personality|char) and user\\b`
);

fs.writeFileSync('server.ts', serverCode);

