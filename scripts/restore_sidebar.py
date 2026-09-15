import re

with open("src/App.tsx", "r") as f:
    text = f.read()

# I will find this:
#                 {localModels.map(m => ( 
#                    <option key={m.id} value={m.id} label={`${m.serverName || "Local"}: ${m.name}`} />
#                 ))}
#             </div>
#           </div>

find_str = '                   <option key={m.id} value={m.id} label={`${m.serverName || "Local"}: ${m.name}`} />\n                ))}\n            </div>\n          </div>'

replacement = """                   <option key={m.id} value={m.id} label={`${m.serverName || "Local"}: ${m.name}`} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="h-px w-full bg-[#2A2A2E] my-0 shrink-0"></div>

          <div className="p-4 border-b border-[#2A2A2E] bg-[#111114]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] uppercase tracking-[0.15em] text-amber-500/70 font-semibold flex items-center gap-2">
                <Landmark size={14} /> MemPalace
              </h2>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                LOCI
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Hierarchical memory wings, rooms, and semantic loci search for <span className="text-amber-400 font-semibold">{selectedPersonality?.name || "active character"}</span>.
            </p>
            <button
              onClick={() => setIsMemPalaceOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all"
            >
              <Landmark size={13} />
              Open Palace Chambers
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Personalities</h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleImportClick}
                  className="text-amber-500/70 hover:text-amber-400 p-1 rounded hover:bg-amber-500/10 transition-colors flex items-center gap-1 text-xs"
                  title="Import Character"
                >
                  <Upload size={14} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
                <button 
                  onClick={() => selectedPersonality && handleExportPersonality(selectedPersonality)}
                  className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${
                    selectedPersonality 
                      ? "text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10" 
                      : "text-gray-600 cursor-not-allowed"
                  }`}
                  title={selectedPersonality ? `Export ${selectedPersonality.name}` : "Select a character to export"}
                  disabled={!selectedPersonality}
                >
                  <Download size={14} />
                </button>
                <button 
                  onClick={openCreatePersonality}
                  className="text-amber-500/70 hover:text-amber-400 p-1 rounded hover:bg-amber-500/10 transition-colors flex items-center gap-1 text-xs"
                  title="Create Roleplay Character"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <div 
                onClick={() => setSelectedPersonality(null)}
                className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors flex items-center gap-2 ${
                  selectedPersonality === null 
                    ? "bg-amber-500/10 border-l-2 border-amber-500 text-amber-100" 
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#1C1C1F]"
                }`}
              >
                <UserCircle2 size={14} />
                <span>Default AI</span>
              </div>
              
              {personalities.map((p) => (
                <div 
                  key={p.id}
                  className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors flex items-center gap-2 group ${
                    selectedPersonality?.id === p.id 
                      ? "bg-amber-500/10 border-l-2 border-amber-500 text-amber-100" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-[#1C1C1F]"
                  }`}
                >
                  <div className="flex-1 flex items-center gap-2 min-w-0" onClick={() => setSelectedPersonality(p)}>
                    <UserCircle2 size={14} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      {p.description ? (
                        <p className="text-[10px] text-gray-500 truncate">{p.description}</p>
                      ) : p.personality || p.traits ? (
                        <p className="text-[10px] text-gray-500 truncate">{p.personality || p.traits}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPersonality(p);
                      }}
                      className="p-1 text-gray-500 hover:text-amber-400 transition-all hover:bg-[#25252B] rounded"
                      title="Edit Character"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>"""

new_text = text.replace(find_str, replacement)

with open("src/App.tsx", "w") as f2:
    f2.write(new_text)

print("Done")
