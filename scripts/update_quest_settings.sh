cat << 'INNER_EOF' > src/components/QuestingSystemSettingsSection.tsx
import React, { useState, useEffect } from "react";
import { Save, ShieldAlert, Sparkles, Plus, Trash2, Activity, Settings, Info, RefreshCw, Layers, ShieldCheck, MapPin, Zap, Flame, Target, MessageSquare, Database } from "lucide-react";
import { QuestingSystemConfig, DEFAULT_QUESTING_SYSTEM_CONFIG } from "../types";

export const QuestingSystemSettingsSection: React.FC = () => {
  const [config, setConfig] = useState<QuestingSystemConfig>(DEFAULT_QUESTING_SYSTEM_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/questing-system/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data || DEFAULT_QUESTING_SYSTEM_CONFIG);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load questing system config:", err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveToast(null);
    try {
      const res = await fetch("/api/questing-system/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveToast("Configuration saved successfully.");
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurge = async (type: "active" | "completed" | "failed" | "all") => {
    if (!confirm(`Are you sure you want to purge ${type} quests? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/quests/purge?type=${type}`, { method: "POST" });
      if (res.ok) {
        alert(`Successfully purged ${type} quests.`);
      }
    } catch (error) {
      console.error("Failed to purge quests:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm font-medium">Initializing Engine Configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between sticky top-0 bg-[#0a0a0c]/80 backdrop-blur-md py-4 z-10 border-b border-[#2A2A2E]">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <ShieldCheck size={24} className="text-amber-500" />
            Questing System Engine
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure how quests, errands, and objectives are generated and managed within the roleplay.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 shrink-0"
        >
          {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <ShieldCheck size={16} />
          {saveToast}
        </div>
      )}

      {/* Generation & Autonomy Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#2A2A2E]">
          <Settings size={18} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Generation & Autonomy</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">Trigger Mode</label>
            </div>
            <select
              value={config.generationTriggerMode || "Automatic"}
              onChange={(e) => setConfig((prev) => ({ ...prev, generationTriggerMode: e.target.value as any }))}
              className="w-full bg-[#1A1A22] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50"
            >
              <option value="Automatic">Automatic (AI-Driven)</option>
              <option value="Event-Based">Event-Based (Vitals Shifts)</option>
              <option value="Manual Only">Manual Only (Player-Initiated)</option>
            </select>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              Determines what causes the engine to evaluate and propose new quests.
            </p>
          </div>
          
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-200">Auto-Generate Quests</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoGenerateQuests}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoGenerateQuests: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2A2A2E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              If enabled, the engine will automatically extract new quests when active objectives are empty.
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">AI Initiative & Pushiness</label>
            </div>
            <select
              value={config.aiPushiness || "Moderate"}
              onChange={(e) => setConfig((prev) => ({ ...prev, aiPushiness: e.target.value as any }))}
              className="w-full bg-[#1A1A22] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50"
            >
              <option value="Passive">Passive (Subtle Hints)</option>
              <option value="Moderate">Moderate</option>
              <option value="Aggressive">Aggressive</option>
              <option value="Relentless">Relentless (Urgent & Demanding)</option>
            </select>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              How aggressively the character naturally brings up active quests in standard dialogue.
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">Max Active Quests</label>
              <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {config.maxActiveQuests}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.maxActiveQuests}
              onChange={(e) => setConfig((prev) => ({ ...prev, maxActiveQuests: parseInt(e.target.value, 10) }))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>1 (Focused)</span>
              <span>10 (Overwhelming)</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              Maximum simultaneous quests in "In Progress" or "Proposed" states.
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">Auto-Acceptance Threshold (Trust)</label>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                {config.autoAcceptanceThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.autoAcceptanceThreshold || 50}
              onChange={(e) => setConfig((prev) => ({ ...prev, autoAcceptanceThreshold: parseInt(e.target.value, 10) }))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0% (Always Accept)</span>
              <span>100% (Strict)</span>
            </div>
          </div>
          
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">Generation Cooldown (Turns)</label>
              <span className="text-xs font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                {config.generationCooldownTurns}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={config.generationCooldownTurns || 3}
              onChange={(e) => setConfig((prev) => ({ ...prev, generationCooldownTurns: parseInt(e.target.value, 10) }))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0 (Immediate)</span>
              <span>20 (Slow)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty, Progression & Rewards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#2A2A2E]">
          <Flame size={18} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Difficulty & Progression</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-200">Dynamic Objective Scaling</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.dynamicObjectiveScaling}
                  onChange={(e) => setConfig((prev) => ({ ...prev, dynamicObjectiveScaling: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2A2A2E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Quest difficulty scales automatically based on active Vitals (e.g., high Stress generates harder coping tasks).
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">Base Quest Difficulty</label>
            </div>
            <select
              value={config.questDifficulty}
              onChange={(e) => setConfig((prev) => ({ ...prev, questDifficulty: e.target.value as any }))}
              disabled={config.dynamicObjectiveScaling}
              className="w-full bg-[#1A1A22] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-amber-500/50 disabled:opacity-50"
            >
              <option value="Adaptive">Adaptive (Based on current context)</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              {config.dynamicObjectiveScaling ? "Disabled while Dynamic Scaling is on." : "Fixed baseline difficulty for generated quests."}
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-200">Quest Failure Engine</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.questFailureEngine}
                  onChange={(e) => setConfig((prev) => ({ ...prev, questFailureEngine: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2A2A2E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Enables fail-states and turn limits, imposing penalties if a high-priority quest is ignored.
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-3 relative overflow-hidden group hover:border-amber-500/30 transition-colors row-span-2">
            <label className="text-sm font-semibold text-gray-200 block border-b border-[#2A2A2E] pb-2">Reward Types</label>
            <div className="space-y-3 pt-1">
              {['personalityTraits', 'loreBooks', 'sceneUnlocks', 'titleAccolades'].map((type) => (
                <label key={type} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={(config.rewardTypes as any)?.[type] || false}
                    onChange={(e) => setConfig((prev) => ({ ...prev, rewardTypes: { ...prev.rewardTypes, [type]: e.target.checked } }))}
                    className="rounded border-[#2A2A2E] bg-[#1A1A22] text-amber-500 focus:ring-amber-500/50"
                  />
                  <span className="text-sm text-gray-300 capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-4 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <label className="text-sm font-semibold text-gray-200 block border-b border-[#2A2A2E] pb-2">Reward Multipliers</label>
            {['affinity', 'trust', 'bond'].map((stat) => (
              <div key={stat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-400 capitalize">{stat}</span>
                  <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    x{(config.rewardMultipliers as any)?.[stat]?.toFixed(1) || "1.0"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={(config.rewardMultipliers as any)?.[stat] || 1.0}
                  onChange={(e) => setConfig((prev) => ({ ...prev, rewardMultipliers: { ...prev.rewardMultipliers, [stat]: parseFloat(e.target.value) } }))}
                  className="w-full accent-amber-500"
                />
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Narrative Context & Integration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#2A2A2E]">
          <Database size={18} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Narrative Context</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-200">Explicit vs. Implicit Objectives</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.explicitObjectives}
                  onChange={(e) => setConfig((prev) => ({ ...prev, explicitObjectives: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2A2A2E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Toggle strict, explicit text goals ("Lead User past the Veil") vs open-ended, atmospheric nudges.
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">Auto-Resolution Sensitivity</label>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                Level {config.autoResolutionSensitivity || 3}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={config.autoResolutionSensitivity || 3}
              onChange={(e) => setConfig((prev) => ({ ...prev, autoResolutionSensitivity: parseInt(e.target.value, 10) }))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>1 (Strict)</span>
              <span>5 (Lenient)</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              Parser sensitivity for detecting naturally satisfied quest criteria in chat prose.
            </p>
          </div>

          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors md:col-span-2">
             <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-200">Memory & Lore Context Depth</label>
              <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {config.memoryContextDepth || 5} records
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={config.memoryContextDepth || 5}
              onChange={(e) => setConfig((prev) => ({ ...prev, memoryContextDepth: parseInt(e.target.value, 10) }))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>1 (Shallow Context)</span>
              <span>20 (Deep Lore Engine)</span>
            </div>
          </div>
          
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors md:col-span-2">
            <label className="text-sm font-semibold text-gray-200">Custom Prompt Injector</label>
            <textarea
              value={config.customPromptTemplate || ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, customPromptTemplate: e.target.value }))}
              rows={3}
              className="w-full bg-[#1A1A22] border border-[#2A2A2E] rounded-lg p-3 text-xs text-gray-300 font-mono resize-y outline-none focus:border-amber-500/50 leading-relaxed"
              placeholder="System prompt template to frame tone and quest construction..."
            />
            <p className="text-xs text-gray-500 leading-relaxed">
              Controls exact persona framing used by the underlying model when constructing a new quest.
            </p>
          </div>
        </div>
      </div>

      {/* Data & Lifecycle Management */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#2A2A2E]">
          <Layers size={18} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Data & Lifecycle</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-200">Manual Override Finish Quests</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.manualOverrideFinishQuests}
                  onChange={(e) => setConfig((prev) => ({ ...prev, manualOverrideFinishQuests: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2A2A2E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Allow forcing the completion of a quest via the UI, even if not organically triggered.
            </p>
          </div>
          
          <div className="bg-[#121216] border border-[#2A2A2E] p-4 rounded-xl space-y-3 relative overflow-hidden group hover:border-rose-500/30 transition-colors md:col-span-2">
            <label className="text-sm font-semibold text-rose-400">Quest Log Purge Utilities</label>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Clear specific histories without wiping character memories or overall chat history.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handlePurge("active")}
                className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                Clear Active Quests
              </button>
              <button
                onClick={() => handlePurge("completed")}
                className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                Clear Completed Quests
              </button>
              <button
                onClick={() => handlePurge("failed")}
                className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                Clear Failed Quests
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
INNER_EOF
