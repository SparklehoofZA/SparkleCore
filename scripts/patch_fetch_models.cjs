const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  '  const fetchLocalModels = async () => {\n    setIsFetchingLocalModels(true);\n    setIsBrowsingLocalModels(true);',
  '  const fetchLocalModels = async (showModal = false) => {\n    setIsFetchingLocalModels(true);\n    if (showModal) setIsBrowsingLocalModels(true);'
);
fs.writeFileSync('src/App.tsx', content, 'utf8');
