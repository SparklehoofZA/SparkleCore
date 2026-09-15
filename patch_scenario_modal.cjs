const fs = require('fs');
let content = fs.readFileSync('src/components/ScenarioManagerModal.tsx', 'utf8');

content = content.replace(
  'const [description, setDescription] = useState("");',
  'const [description, setDescription] = useState("");\n  const [location, setLocation] = useState("");\n  const [timeOfDay, setTimeOfDay] = useState("");'
);

content = content.replace(
  '    setDescription("");\n    setContext("");',
  '    setDescription("");\n    setLocation("");\n    setTimeOfDay("");\n    setContext("");'
);

content = content.replace(
  '    setDescription(s.description || "");\n    setContext(s.context);',
  '    setDescription(s.description || "");\n    setLocation(s.location || "");\n    setTimeOfDay(s.timeOfDay || "");\n    setContext(s.context);'
);

content = content.replace(
  'const payload = { name, description, context };',
  'const payload = { name, description, location, timeOfDay, context };'
);

const newFields = `
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Cyberpunk City, Cafe"
                      className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Time of Day</label>
                    <input
                      type="text"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                      placeholder="e.g. Midnight, Sunset"
                      className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                    />
                  </div>
                </div>
`;

content = content.replace(
  '                <div className="space-y-1 flex-1">',
  newFields + '\n                <div className="space-y-1 flex-1">'
);

fs.writeFileSync('src/components/ScenarioManagerModal.tsx', content, 'utf8');
