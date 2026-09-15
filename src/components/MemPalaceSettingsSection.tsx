import React, { useState, useEffect } from "react";
import {
  Landmark,
  Layers,
  Sparkles,
  RefreshCw,
  Save,
  RotateCcw,
  Sliders,
  MessageSquare,
  Clock,
  ShieldCheck,
  Zap,
  Filter,
  Brain,
  Quote,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronRight,
  Database,
  ArrowRight,
  Settings,
} from "lucide-react";
import {
  MemPalaceConfig,
  DEFAULT_MEMPALACE_CONFIG,
  MemPalaceConsolidateMode,
  NeuralModelsConfig,
  DEFAULT_NEURAL_MODELS_CONFIG,
} from "../types";

interface MemPalaceSettingsSectionProps {
  onNotify?: (message: string, type?: "success" | "info" | "warning") => void;
}

export const MemPalaceSettingsSection: React.FC<MemPalaceSettingsSectionProps> = ({
  onNotify,
}) => {
  const [config, setConfig] = useState<MemPalaceConfig>(DEFAULT_MEMPALACE_CONFIG);
  const [neuralConfig, setNeuralConfig] = useState<NeuralModelsConfig>(DEFAULT_NEURAL_MODELS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isDecluttering, setIsDecluttering] = useState(false);
  const [declutterResult, setDeclutterResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/mempalace/config").then((r) => r.json()),
      fetch("/api/neural-models-config").then((r) => r.json()),
    ])
      .then(([mempalaceData, neuralData]) => {
        if (mempalaceData && !mempalaceData.error) {
          setConfig({ ...DEFAULT_MEMPALACE_CONFIG, ...mempalaceData });
        }
        if (neuralData && !neuralData.error) {
          setNeuralConfig({ ...DEFAULT_NEURAL_MODELS_CONFIG, ...neuralData });
        }
      })
      .catch((err) => {
        console.error("Failed to load MemPalace settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveToast(null);
    try {
      const res = await fetch("/api/mempalace/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
        setSaveToast("MemPalace configuration saved successfully.");
        if (onNotify) onNotify("MemPalace configuration saved successfully.", "success");
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        throw new Error("Server responded with error");
      }
    } catch (err: any) {
      console.error("Failed to save MemPalace config:", err);
      if (onNotify) onNotify("Failed to save MemPalace configuration.", "warning");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all MemPalace settings to system defaults?")) {
      setConfig({ ...DEFAULT_MEMPALACE_CONFIG });
      if (onNotify) onNotify("Reset settings to defaults. Click 'Save Changes' to apply.", "info");
    }
  };

  const handleRunGlobalDeclutter = async () => {
    setIsDecluttering(true);
    setDeclutterResult(null);
    try {
      // Trigger deduplication on current personalities
      const pRes = await fetch("/api/personalities");
      const personalities = await pRes.json();
      let totalMerged = 0;
      if (Array.isArray(personalities)) {
        for (const p of personalities) {
          try {
            const dRes = await fetch(`/api/mempalace/${p.id}/deduplicate`, { method: "POST" });
            if (dRes.ok) {
              const res = await dRes.json();
              totalMerged += (res.mergedDrawersCount || 0) + (res.mergedRelationsCount || 0);
            }
          } catch (e) {
            // ignore individual palace errors
          }
        }
      }
      setDeclutterResult(
        totalMerged > 0
          ? `Maintenance complete: Merged ${totalMerged} redundant memory entries across all palaces.`
          : "Maintenance complete: All memory palaces are already clean and deduplicated."
      );
      setTimeout(() => setDeclutterResult(null), 5000);
    } catch (err) {
      setDeclutterResult("Failed to complete global maintenance.");
      setTimeout(() => setDeclutterResult(null), 4000);
    } finally {
      setIsDecluttering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm font-medium">Loading MemPalace configuration...</span>
      </div>
    );
  }

  const thresholdPresets = [2, 4, 6, 8, 10, 15, 20];
  const historyDepthPresets = [10, 20, 25, 35, 50, 75];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto pb-16">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2E] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Landmark size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                MemPalace Settings & Auto-Consolidation
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure background memory harvesting intervals, context depth, and chamber deduplication.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-lg bg-[#18181D] hover:bg-[#222228] text-gray-300 border border-[#2E2E36] text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Reset configuration values to default"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* SECTION 1: AUTO CHAT CONSOLIDATION MODE */}
      <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-gray-100">Auto Chat Consolidation Mode</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Choose how and when dialogue gets transformed into long-term Method of Loci memories.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            {config.autoConsolidateMode === "auto"
              ? "Debounce (Auto)"
              : config.autoConsolidateMode === "message_count"
              ? `Every ${config.messageThreshold} turns`
              : "Manual Only"}
          </span>
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Auto (Debounce) */}
          <button
            type="button"
            onClick={() => setConfig({ ...config, autoConsolidateMode: "auto" })}
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
              config.autoConsolidateMode === "auto"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/30"
                : "bg-[#16161B] border-[#2A2A2E] text-gray-400 hover:border-[#383840] hover:text-gray-300"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className={config.autoConsolidateMode === "auto" ? "text-amber-400" : "text-gray-500"} />
                  <span className="text-xs font-semibold text-gray-200">Auto (Debounce)</span>
                </div>
                {config.autoConsolidateMode === "auto" && (
                  <Check size={14} className="text-amber-400" />
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                Runs automatically after a brief conversation pause after each reply. Best for continuous real-time memory capture.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-amber-400/80 font-mono">
              Delay: {config.autoConsolidateDelayMs}ms
            </div>
          </button>

          {/* Option 2: Message Count Interval */}
          <button
            type="button"
            onClick={() => setConfig({ ...config, autoConsolidateMode: "message_count" })}
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
              config.autoConsolidateMode === "message_count"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/30"
                : "bg-[#16161B] border-[#2A2A2E] text-gray-400 hover:border-[#383840] hover:text-gray-300"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className={config.autoConsolidateMode === "message_count" ? "text-amber-400" : "text-gray-500"} />
                  <span className="text-xs font-semibold text-gray-200">Chat Turn Interval</span>
                </div>
                {config.autoConsolidateMode === "message_count" && (
                  <Check size={14} className="text-amber-400" />
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                Triggers automatically every N chat turns. Batches dialogue so the model reviews richer narrative chunks.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-amber-400/80 font-mono">
              Interval: Every {config.messageThreshold} chat turns
            </div>
          </button>

          {/* Option 3: Manual Only */}
          <button
            type="button"
            onClick={() => setConfig({ ...config, autoConsolidateMode: "manual_only" })}
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
              config.autoConsolidateMode === "manual_only"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/30"
                : "bg-[#16161B] border-[#2A2A2E] text-gray-400 hover:border-[#383840] hover:text-gray-300"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap size={16} className={config.autoConsolidateMode === "manual_only" ? "text-amber-400" : "text-gray-500"} />
                  <span className="text-xs font-semibold text-gray-200">Manual Only</span>
                </div>
                {config.autoConsolidateMode === "manual_only" && (
                  <Check size={14} className="text-amber-400" />
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                Disables background triggers entirely. Consolidation only executes when you click "Consolidate Chat" in MemPalace.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-amber-400/80 font-mono">
              On-Demand Only
            </div>
          </button>
        </div>

        {/* Dynamic Controls based on selected mode */}
        {config.autoConsolidateMode === "message_count" && (
          <div className="bg-[#18181F] border border-[#2E2E38] rounded-xl p-4 space-y-3 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-medium text-gray-200 flex items-center gap-2">
                  <MessageSquare size={14} className="text-amber-400" />
                  <span>Chat Amount / Turn Threshold:</span>
                  <span className="font-mono text-amber-400 font-semibold">{config.messageThreshold} turns</span>
                </label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Consolidation will run automatically whenever the conversation advances by this many turns.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-500 uppercase font-semibold mr-1">Presets:</span>
                {thresholdPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setConfig({ ...config, messageThreshold: preset })}
                    className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                      config.messageThreshold === preset
                        ? "bg-amber-500 text-black font-semibold"
                        : "bg-[#25252E] text-gray-300 hover:bg-[#30303A]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={config.messageThreshold}
                onChange={(e) =>
                  setConfig({ ...config, messageThreshold: parseInt(e.target.value, 10) || 6 })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#2A2A34] rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>1 turn (High frequency)</span>
                <span>6 turns (Balanced)</span>
                <span>30 turns (Long scenes)</span>
              </div>
            </div>
          </div>
        )}

        {config.autoConsolidateMode === "auto" && (
          <div className="bg-[#18181F] border border-[#2E2E38] rounded-xl p-4 space-y-3 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-medium text-gray-200 flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <span>Debounce Idle Delay:</span>
                  <span className="font-mono text-amber-400 font-semibold">{config.autoConsolidateDelayMs} ms</span>
                </label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  How long the engine waits after a message finishes streaming before harvesting memories in the background.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[1000, 2000, 2500, 4000, 6000].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => setConfig({ ...config, autoConsolidateDelayMs: ms })}
                    className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                      config.autoConsolidateDelayMs === ms
                        ? "bg-amber-500 text-black font-semibold"
                        : "bg-[#25252E] text-gray-300 hover:bg-[#30303A]"
                    }`}
                  >
                    {(ms / 1000).toFixed(1)}s
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <input
                type="range"
                min="800"
                max="10000"
                step="200"
                value={config.autoConsolidateDelayMs}
                onChange={(e) =>
                  setConfig({ ...config, autoConsolidateDelayMs: parseInt(e.target.value, 10) || 2500 })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#2A2A34] rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>0.8s (Eager)</span>
                <span>2.5s (Standard)</span>
                <span>10.0s (Relaxed)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: CONTEXT DEPTH & HARVESTING FIDELITY */}
      <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">Harvesting Depth & Extraction Quality</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Control how much dialogue the AI reads per consolidation pass and the sensitivity of memory creation.
          </p>
        </div>

        {/* Dialogue History Depth */}
        <div className="bg-[#18181F] border border-[#2E2E38] rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-medium text-gray-200 flex items-center gap-2">
                <span>Recent Dialogue Slice Depth:</span>
                <span className="font-mono text-amber-400 font-semibold">{config.dialogueHistoryDepth} messages</span>
              </label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Number of recent messages passed to the memory extraction model. Higher values capture wider context and multi-turn lore, matching manual consolidation depth.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {historyDepthPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setConfig({ ...config, dialogueHistoryDepth: preset })}
                  className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                    config.dialogueHistoryDepth === preset
                      ? "bg-amber-500 text-black font-semibold"
                      : "bg-[#25252E] text-gray-300 hover:bg-[#30303A]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <input
              type="range"
              min="6"
              max="80"
              step="1"
              value={config.dialogueHistoryDepth}
              onChange={(e) =>
                setConfig({ ...config, dialogueHistoryDepth: parseInt(e.target.value, 10) || 25 })
              }
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#2A2A34] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
              <span>6 msgs (Compact)</span>
              <span>25 msgs (Balanced)</span>
              <span>80 msgs (Deep Historical)</span>
            </div>
          </div>
        </div>

        {/* Grid of Secondary Tuning Knobs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Minimum Message Length */}
          <div className="bg-[#16161B] border border-[#2A2A2E] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-200">Min Message Length</label>
              <span className="text-xs font-mono text-amber-400 font-semibold">{config.minMessageLength} chars</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Filters out short affirmative replies (e.g., "yes", "nodding") from triggering empty consolidation cycles.
            </p>
            <input
              type="range"
              min="1"
              max="100"
              step="5"
              value={config.minMessageLength}
              onChange={(e) =>
                setConfig({ ...config, minMessageLength: parseInt(e.target.value, 10) || 15 })
              }
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#2A2A34] rounded-lg mt-2"
            />
          </div>

          {/* Importance Threshold */}
          <div className="bg-[#16161B] border border-[#2A2A2E] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-200">Importance Threshold</label>
              <span className="text-xs font-mono text-amber-400 font-semibold">{config.importanceThreshold} / 10</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Minimum significance rating for a detail to be anchored in a chamber. Lower captures all facts; higher stores only milestones.
            </p>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={config.importanceThreshold}
              onChange={(e) =>
                setConfig({ ...config, importanceThreshold: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#2A2A34] rounded-lg mt-2"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Auto Deduplication Toggle */}
          <label className="flex items-start gap-3 p-3.5 bg-[#16161B] border border-[#2A2A2E] rounded-xl cursor-pointer hover:bg-[#1C1C22] transition-colors">
            <input
              type="checkbox"
              checked={config.autoDeduplicate}
              onChange={(e) => setConfig({ ...config, autoDeduplicate: e.target.checked })}
              className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 bg-[#24242A] border-gray-700"
            />
            <div>
              <div className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>Auto-Declutter & Deduplicate</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Automatically scans and merges similar memory loci and redundant entity graph edges after every consolidation.
              </p>
            </div>
          </label>

          {/* Quote Extraction Toggle */}
          <label className="flex items-start gap-3 p-3.5 bg-[#16161B] border border-[#2A2A2E] rounded-xl cursor-pointer hover:bg-[#1C1C22] transition-colors">
            <input
              type="checkbox"
              checked={config.enableQuoteExtraction}
              onChange={(e) => setConfig({ ...config, enableQuoteExtraction: e.target.checked })}
              className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 bg-[#24242A] border-gray-700"
            />
            <div>
              <div className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
                <Quote size={13} className="text-amber-400" />
                <span>Extract Verbatim Quotes</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Instructs the neural pipeline to preserve iconic words and dialogues verbatim inside the memory drawer.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* SECTION 4: MAINTENANCE & PALACE UTILITIES */}
      <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Database size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">Global Chamber Maintenance</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Perform housekeeping on all personality memory palaces, deduplicating repetitive memories and trimming broken references.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#18181F] border border-[#2E2E38] rounded-xl">
          <div>
            <span className="text-xs font-medium text-gray-200">Global Loci Deduplication Pass</span>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Scans all characters' palaces to merge identical facts, syncretize entity relationships, and calculate refreshed statistics.
            </p>
          </div>
          <button
            onClick={handleRunGlobalDeclutter}
            disabled={isDecluttering}
            className="px-3.5 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 disabled:opacity-50"
          >
            <Sparkles size={14} className={isDecluttering ? "animate-spin" : "text-purple-400"} />
            <span>{isDecluttering ? "Deduplicating..." : "Run Global Declutter"}</span>
          </button>
        </div>

        {declutterResult && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
            <span>{declutterResult}</span>
          </div>
        )}
      </div>
    </div>
  );
};
