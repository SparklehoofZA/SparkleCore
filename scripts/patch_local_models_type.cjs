const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure LocalModelInfo is imported
if (!content.includes('LocalModelInfo')) {
  content = content.replace('LocalServerConfig', 'LocalServerConfig, LocalModelInfo');
}

content = content.replace(
  'const [localModels, setLocalModels] = useState<{id: string, name: string, serverName: string}[]>([]);',
  'const [localModels, setLocalModels] = useState<any[]>([]); // Using any for simplicity or update to LocalModelInfo'
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
