const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const manageScenariosBtn = `
          <button
            onClick={() => setIsScenarioManagerOpen(true)}
            className="px-3 py-1.5 bg-[#1C1C20] border border-[#33333A] hover:border-amber-500/50 hover:bg-[#25252B] text-gray-200 hover:text-amber-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Manage Environments and Scenarios"
          >
            <MapPin size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Scenarios</span>
          </button>
`;

content = content.replace(
  '          <button\n            onClick={() => setIsMemPalaceOpen(true)}',
  manageScenariosBtn + '          <button\n            onClick={() => setIsMemPalaceOpen(true)}'
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
