import React, { useRef, useState } from "react";
import { Download, Upload, Users, BookOpen, MapPin, Calendar, FileJson, Check, AlertCircle } from "lucide-react";
import { Personality, Scenario, LoreBook, Event } from "../types";

interface ContentManagerViewProps {
  personalities: Personality[];
  scenarios: Scenario[];
  loreBooks: LoreBook[];
  events: Event[];
  onRefreshPersonalities: () => void;
  onRefreshScenarios: () => void;
  onRefreshLoreBooks: () => void;
  onRefreshEvents: (events: Event[]) => void;
}

export default function ContentManagerView({
  personalities,
  scenarios,
  loreBooks,
  events,
  onRefreshPersonalities,
  onRefreshScenarios,
  onRefreshLoreBooks,
  onRefreshEvents
}: ContentManagerViewProps) {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState<"characters" | "scenarios" | "lorebooks" | "events" | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<"characters" | "scenarios" | "lorebooks" | "events" | null>(null);

  const handleExport = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerImport = (target: "characters" | "scenarios" | "lorebooks" | "events") => {
    setImportTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTarget) return;

    setIsImporting(true);
    setImportStatus("Reading file...");

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const items = Array.isArray(payload) ? payload : [payload];

      setImportStatus(`Importing ${items.length} items...`);

      let successCount = 0;

      if (importTarget === "characters") {
        for (const item of items) {
          const res = await fetch("/api/personalities/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personality: { ...item, id: undefined } })
          });
          if (res.ok) successCount++;
        }
        onRefreshPersonalities();
      } else if (importTarget === "scenarios") {
        for (const item of items) {
          const res = await fetch("/api/scenarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
          });
          if (res.ok) successCount++;
        }
        onRefreshScenarios();
      } else if (importTarget === "lorebooks") {
        for (const item of items) {
          const res = await fetch("/api/lorebooks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
          });
          if (res.ok) successCount++;
        }
        onRefreshLoreBooks();
      } else if (importTarget === "events") {
        // Events are local state, strip id so it forces creation of new events without conflicts
        const validEvents = items.filter(i => i && i.name && i.type).map(i => ({ 
          ...i, 
          id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) 
        }));
        if (validEvents.length > 0) {
          const merged = [...events, ...validEvents];
          onRefreshEvents(merged);
          successCount = validEvents.length;
        }
      }

      setImportStatus(`✅ Successfully imported ${successCount} ${importTarget}.`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      setImportStatus(`❌ Import failed: ${err.message || "Invalid JSON"}`);
    } finally {
      setIsImporting(false);
      setImportTarget(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl w-full mx-auto">
      <div className="space-y-6 animate-in fade-in duration-150">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2 mb-2">
            <FileJson className="text-amber-400" />
            Content Management
          </h1>
          <p className="text-sm text-gray-400">
            Export your data to share with friends, or import content shared with you. 
            Importing content will append it to your existing collection.
          </p>
        </div>

        {importStatus && (
          <div className={`p-3 rounded-md text-sm font-medium flex items-center gap-2 ${
            importStatus.includes("✅") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
            importStatus.includes("❌") ? "bg-red-500/10 text-red-400 border border-red-500/20" :
            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          }`}>
            {importStatus.includes("✅") ? <Check size={16} /> : importStatus.includes("❌") ? <AlertCircle size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />}
            {importStatus}
          </div>
        )}

        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Characters Card */}
          <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-amber-400" size={18} />
                <h3 className="text-md font-semibold text-gray-200">Characters</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                Export or import your personalities. This includes their avatar, persona description, traits, and system instructions.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExport(personalities, "characters_export.json")}
                  disabled={personalities.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export All ({personalities.length})</span>
                </button>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === "characters" ? null : "characters")}
                  disabled={personalities.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export One...</span>
                </button>
                <button
                  onClick={() => triggerImport("characters")}
                  disabled={isImporting}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 h-10"
                >
                  <Upload size={14} className="shrink-0" />
                  <span className="truncate">Import</span>
                </button>
              </div>
              {expandedCategory === "characters" && personalities.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto space-y-1 bg-[#0A0A0C] border border-[#1C1C20] rounded p-1.5 animate-in fade-in slide-in-from-top-2">
                  {personalities.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-[#1C1C20] rounded">
                      <span className="text-gray-300 truncate pr-2 font-medium">{p.name}</span>
                      <button 
                        onClick={() => handleExport([p], `${p.name.replace(/\s+/g, '_').toLowerCase()}_export.json`)}
                        className="text-amber-400 hover:text-amber-300 flex-shrink-0"
                        title="Export this character"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scenarios Card */}
          <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="text-blue-400" size={18} />
                <h3 className="text-md font-semibold text-gray-200">Scenarios</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                Export or import your roleplay scenarios. This includes locations, context, and starting conditions.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExport(scenarios, "scenarios_export.json")}
                  disabled={scenarios.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export All ({scenarios.length})</span>
                </button>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === "scenarios" ? null : "scenarios")}
                  disabled={scenarios.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export One...</span>
                </button>
                <button
                  onClick={() => triggerImport("scenarios")}
                  disabled={isImporting}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 h-10"
                >
                  <Upload size={14} className="shrink-0" />
                  <span className="truncate">Import</span>
                </button>
              </div>
              {expandedCategory === "scenarios" && scenarios.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto space-y-1 bg-[#0A0A0C] border border-[#1C1C20] rounded p-1.5 animate-in fade-in slide-in-from-top-2">
                  {scenarios.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-[#1C1C20] rounded">
                      <span className="text-gray-300 truncate pr-2 font-medium">{s.name}</span>
                      <button 
                        onClick={() => handleExport([s], `${s.name.replace(/\s+/g, '_').toLowerCase()}_export.json`)}
                        className="text-amber-400 hover:text-amber-300 flex-shrink-0"
                        title="Export this scenario"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lore Books Card */}
          <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="text-emerald-400" size={18} />
                <h3 className="text-md font-semibold text-gray-200">Lore Books</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                Export or import your universe's lore. This includes world-building facts, entity definitions, and rules.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExport(loreBooks, "lorebooks_export.json")}
                  disabled={loreBooks.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export All ({loreBooks.length})</span>
                </button>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === "lorebooks" ? null : "lorebooks")}
                  disabled={loreBooks.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export One...</span>
                </button>
                <button
                  onClick={() => triggerImport("lorebooks")}
                  disabled={isImporting}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 h-10"
                >
                  <Upload size={14} className="shrink-0" />
                  <span className="truncate">Import</span>
                </button>
              </div>
              {expandedCategory === "lorebooks" && loreBooks.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto space-y-1 bg-[#0A0A0C] border border-[#1C1C20] rounded p-1.5 animate-in fade-in slide-in-from-top-2">
                  {loreBooks.map(lb => (
                    <div key={lb.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-[#1C1C20] rounded">
                      <span className="text-gray-300 truncate pr-2 font-medium">{lb.name}</span>
                      <button 
                        onClick={() => handleExport([lb], `${lb.name.replace(/\s+/g, '_').toLowerCase()}_export.json`)}
                        className="text-amber-400 hover:text-amber-300 flex-shrink-0"
                        title="Export this lore book"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Events Card */}
          <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-purple-400" size={18} />
                <h3 className="text-md font-semibold text-gray-200">Events</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                Export or import your custom mood and narrative events to inject drama and plot twists into roleplays.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExport(events, "events_export.json")}
                  disabled={events.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export All ({events.length})</span>
                </button>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === "events" ? null : "events")}
                  disabled={events.length === 0}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Download size={14} className="shrink-0" />
                  <span className="truncate">Export One...</span>
                </button>
                <button
                  onClick={() => triggerImport("events")}
                  disabled={isImporting}
                  className="w-full py-2 px-1 sm:px-3 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300 hover:text-white rounded-md text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 h-10"
                >
                  <Upload size={14} className="shrink-0" />
                  <span className="truncate">Import</span>
                </button>
              </div>
              {expandedCategory === "events" && events.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto space-y-1 bg-[#0A0A0C] border border-[#1C1C20] rounded p-1.5 animate-in fade-in slide-in-from-top-2">
                  {events.map(ev => (
                    <div key={ev.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-[#1C1C20] rounded">
                      <span className="text-gray-300 truncate pr-2 font-medium">{ev.name}</span>
                      <button 
                        onClick={() => handleExport([ev], `${ev.name.replace(/\s+/g, '_').toLowerCase()}_export.json`)}
                        className="text-amber-400 hover:text-amber-300 flex-shrink-0"
                        title="Export this event"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
