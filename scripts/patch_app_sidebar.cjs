const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const scenarioSection = `
          {/* Scenarios Section */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 group">
              <h2 className="text-[11px] uppercase tracking-[0.15em] text-amber-500/70 font-semibold flex items-center gap-2">
                <MapPin size={14} /> Scenarios
              </h2>
              <button 
                onClick={() => setIsScenarioManagerOpen(true)}
                className="text-amber-500/70 hover:text-amber-400 p-1 rounded hover:bg-amber-500/10 transition-colors flex items-center gap-1 text-xs"
                title="Manage Scenarios"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <div 
                onClick={() => setSelectedScenario(null)}
                className={\`px-3 py-2 text-sm rounded cursor-pointer transition-colors flex items-center gap-2 \${
                  selectedScenario === null 
                    ? "bg-amber-500/10 border-l-2 border-amber-500 text-amber-100" 
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#1C1C1F]"
                }\`}
              >
                <MapPin size={14} />
                <span>No Scenario</span>
              </div>
              
              {scenarios.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => setSelectedScenario(s)}
                  className={\`px-3 py-2 text-sm rounded cursor-pointer transition-colors flex items-center gap-2 group \${
                    selectedScenario?.id === s.id 
                      ? "bg-amber-500/10 border-l-2 border-amber-500 text-amber-100" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-[#1C1C1F]"
                  }\`}
                >
                  <MapPin size={14} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    {s.description && (
                      <p className="text-[10px] text-gray-500 truncate">{s.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
`;

content = content.replace(
  '            </div>\n          </div>\n        </aside>',
  '            </div>\n          </div>\n' + scenarioSection + '        </aside>'
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
