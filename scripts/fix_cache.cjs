const fs = require('fs');

const fixFile = (path) => {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/fetch\("\/api\/generation-settings"\)/g, 'fetch(`/api/generation-settings?t=${Date.now()}`)');
  fs.writeFileSync(path, content);
};

fixFile('src/components/SettingsView.tsx');
fixFile('src/components/GlobalGenerationSettingsModal.tsx');
