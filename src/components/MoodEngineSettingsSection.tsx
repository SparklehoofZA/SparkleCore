import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Sliders,
  Sparkles,
  Shield,
  Heart,
  Activity,
  MapPin,
  Shirt,
  Flame,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Zap,
  Info,
  Layers,
  Leaf,
  Smile,
  ShieldAlert,
  Play,
  Filter,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Send,
  FlaskConical,
} from "lucide-react";
import {
  MoodEngineConfig,
  DEFAULT_MOOD_ENGINE_CONFIG,
  CustomMoodEntry,
  CustomStatusEffectEntry,
  CharacterState,
  NeuralModelsConfig,
  DEFAULT_NEURAL_MODELS_CONFIG
} from "../types";
import {
  MOOD_CATEGORIES,
  REGISTERED_STATUS_EFFECTS,
} from "../moodPresets";
import { extractRuleBasedState } from "../characterStateEngine";

interface MoodEngineSettingsSectionProps {
  onNotify?: (message: string, type?: "success" | "info" | "warning") => void;
}

export interface SandboxBaselineState {
  charName: string;
  userPersona: string;
  mood: string;
  stress: number;
  composure: number;
  trust: number;
  location: string;
  activity: string;
  outfit: string;
  statusEffects: string[];
}

export const DEFAULT_SANDBOX_BASELINE: SandboxBaselineState = {
  charName: "Lyra",
  userPersona: "Traveler",
  mood: "Calm",
  stress: 15,
  composure: 80,
  trust: 65,
  location: "Garden Pavilion",
  activity: "Sitting in shade",
  outfit: "Relaxed tunic",
  statusEffects: ["Content"],
};

export interface SandboxThreadMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  mood: string;
  stress: number;
  composure: number;
  trust: number;
  shifts: string[];
}

export function sanitizeSandboxState(base: SandboxBaselineState): CharacterState {
  const stress =
    typeof base.stress === "number" && !isNaN(base.stress)
      ? Math.max(0, Math.min(100, base.stress))
      : 15;
  const composure =
    typeof base.composure === "number" && !isNaN(base.composure)
      ? Math.max(0, Math.min(100, base.composure))
      : 80;
  const trust =
    typeof base.trust === "number" && !isNaN(base.trust)
      ? Math.max(0, Math.min(100, base.trust))
      : 65;
  const mood = (base.mood || "Calm").trim() || "Calm";
  const location = (base.location || "Garden Pavilion").trim() || "Garden Pavilion";
  const activity = (base.activity || "Sitting in shade").trim() || "Sitting in shade";
  const outfit = (base.outfit || "Relaxed tunic").trim() || "Relaxed tunic";
  const statusEffects =
    Array.isArray(base.statusEffects) && base.statusEffects.length > 0
      ? [...base.statusEffects]
      : ["Content"];

  return {
    health: 100,
    stamina: 100,
    statusEffects,
    trust,
    mood,
    stress,
    location,
    activity,
    outfit,
    composure,
    attire: outfit,
    status_effects: statusEffects,
  };
}

export function MoodEngineSettingsSection({
  onNotify,
}: MoodEngineSettingsSectionProps) {
  const [config, setConfig] = useState<MoodEngineConfig>(DEFAULT_MOOD_ENGINE_CONFIG);
  const [activeModel, setActiveModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Active Palette Filter & New Mood Modal State
  const [moodFilterCategory, setMoodFilterCategory] = useState<string>("all");
  const [moodSearchQuery, setMoodSearchQuery] = useState<string>("");
  const [showAddMoodModal, setShowAddMoodModal] = useState(false);
  const [newMoodName, setNewMoodName] = useState("");
  const [newMoodCategory, setNewMoodCategory] = useState("joy");
  const [newMoodDesc, setNewMoodDesc] = useState("");
  const [newMoodComposureBias, setNewMoodComposureBias] = useState(0);
  const [newMoodStressBias, setNewMoodStressBias] = useState(0);

  // Status Effects Filter & New Effect Modal State
  const [effectFilterCategory, setEffectFilterCategory] = useState<string>("all");
  const [effectSearchQuery, setEffectSearchQuery] = useState<string>("");
  const [showAddEffectModal, setShowAddEffectModal] = useState(false);
  const [newEffectTag, setNewEffectTag] = useState("");
  const [newEffectCategory, setNewEffectCategory] = useState<"Physical" | "Psychological" | "Environmental">("Psychological");
  const [newEffectDesc, setNewEffectDesc] = useState("");
  const [newEffectSeverity, setNewEffectSeverity] = useState<"Low" | "Moderate" | "High" | "Severe">("Moderate");

  // Live Simulation / Sandbox state
  const [sandboxBaseline, setSandboxBaseline] = useState<SandboxBaselineState>(DEFAULT_SANDBOX_BASELINE);
  const [showBaselineDrawer, setShowBaselineDrawer] = useState(false);
  const [sandboxRole, setSandboxRole] = useState<"user" | "assistant">("user");
  const [simMessage, setSimMessage] = useState("");
  const [simResult, setSimResult] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string | null>(null);
  const [settingsModified, setSettingsModified] = useState(false);

  // Live in-memory sandbox session state
  const [sandboxThread, setSandboxThread] = useState<SandboxThreadMessage[]>([]);
  const [currentSandboxState, setCurrentSandboxState] = useState<CharacterState>(() =>
    sanitizeSandboxState(DEFAULT_SANDBOX_BASELINE)
  );
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    text: string;
    timestamp: string;
  } | null>(null);

  // Load config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const [res, neuralRes] = await Promise.all([
          fetch("/api/mood-engine/config"),
          fetch("/api/neural-models-config")
        ]);
        if (res.ok) {
          const data = await res.json();
          setConfig({
            ...DEFAULT_MOOD_ENGINE_CONFIG,
            ...data,
            liveMonitors: {
              ...DEFAULT_MOOD_ENGINE_CONFIG.liveMonitors,
              ...(data.liveMonitors || {}),
            },
          });
        }
        if (neuralRes.ok) {
          const nData = await neuralRes.json();
          if (nData?.characterStateModel) setActiveModel(nData.characterStateModel);
        }
      } catch (err) {
        console.error("Failed to load mood engine config:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Sandbox Test Execution Runner - isolated in memory
  const executeSandboxTest = useCallback(
    (
      customMsg?: string,
      customRole?: "user" | "assistant",
      customBaseline?: SandboxBaselineState,
      isFreshReset = false
    ) => {
      const base = customBaseline || sandboxBaseline;
      const role = customRole || sandboxRole;
      const depth = Math.max(1, Math.min(5, config?.windowDepth || 3));

      let targetMsg = "";
      let isReEvaluation = false;

      if (customMsg !== undefined && customMsg.trim()) {
        targetMsg = customMsg.trim();
      } else if (simMessage.trim()) {
        targetMsg = simMessage.trim();
        // Clear input so message is visibly submitted into the dialogue thread
        setSimMessage("");
      } else if (sandboxThread.length > 0) {
        // When clicking button with empty input, re-evaluate existing thread against current detection settings
        isReEvaluation = true;
      } else {
        targetMsg = "I brought you some fresh lavender from the garden, they smell wonderful.";
      }

      setIsEvaluating(true);

      setTimeout(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        // Case A: Re-evaluating existing thread against updated detection settings
        if (isReEvaluation && sandboxThread.length > 0) {
          let runningState = sanitizeSandboxState(base);
          const allDialogue: { role: string; text: string }[] = [];
          const updatedThread: SandboxThreadMessage[] = [];
          let lastRes: any = null;

          for (let i = 0; i < sandboxThread.length; i++) {
            const turn = sandboxThread[i];
            const priorHistory = allDialogue.slice(-(depth - 1));
            const turnDialogue = [...priorHistory, { role: turn.role, text: turn.text }];
            allDialogue.push({ role: turn.role, text: turn.text });

            const turnResult = extractRuleBasedState(
              runningState,
              turnDialogue,
              base.charName || "Lyra",
              base.userPersona || "Traveler",
              config
            );
            runningState = turnResult.updatedState;
            lastRes = turnResult;

            updatedThread.push({
              ...turn,
              mood: turnResult.updatedState.mood,
              stress: turnResult.updatedState.stress,
              composure: turnResult.updatedState.composure ?? 80,
              trust: turnResult.updatedState.trust ?? 65,
              shifts: turnResult.shifts || [],
            });
          }

          setCurrentSandboxState(runningState);
          setSandboxThread(updatedThread);
          if (lastRes) {
            setSimResult({
              ...lastRes,
              baselineState: sanitizeSandboxState(base),
              testedMessage: sandboxThread[sandboxThread.length - 1].text,
              testedRole: sandboxThread[sandboxThread.length - 1].role,
            });
          }
          setLastEvaluatedAt(timeStr);
          setSettingsModified(false);

          setSubmissionFeedback({
            text: `Thread re-evaluated with current detection settings! Sensitivity: ${config.stressSensitivity.toUpperCase()} • Depth: ${depth} • Safe Haven: ${config.safeSettingBuffering ? "ON" : "OFF"} • Mood: "${runningState.mood}" • Stress: ${runningState.stress}%`,
            timestamp: timeStr,
          });
          setIsEvaluating(false);
          return;
        }

        // Case B: Submitting a new message turn
        const startingState: CharacterState = isFreshReset || customBaseline
          ? sanitizeSandboxState(base)
          : currentSandboxState;

        const priorHistory = isFreshReset
          ? []
          : sandboxThread.slice(-(depth - 1)).map((m) => ({ role: m.role, text: m.text }));

        const recentDialogue = [...priorHistory, { role, text: targetMsg }];

        // Run engine with current detection configurations
        const result = extractRuleBasedState(
          startingState,
          recentDialogue,
          base.charName || "Lyra",
          base.userPersona || "Traveler",
          config
        );

        setCurrentSandboxState(result.updatedState);
        setSimResult({
          ...result,
          baselineState: { ...startingState },
          testedMessage: targetMsg,
          testedRole: role,
        });
        setLastEvaluatedAt(timeStr);
        setSettingsModified(false);

        const newEntry: SandboxThreadMessage = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          role,
          text: targetMsg,
          timestamp: timeStr,
          mood: result.updatedState.mood,
          stress: result.updatedState.stress,
          composure: result.updatedState.composure ?? 80,
          trust: result.updatedState.trust ?? 65,
          shifts: result.shifts || [],
        };

        setSandboxThread((prev) => (isFreshReset ? [newEntry] : [...prev, newEntry]));

        // Calculate summary for immediate submission feedback banner
        const moodText = result.updatedState.mood !== startingState.mood
          ? `Mood: "${startingState.mood}" → "${result.updatedState.mood}"`
          : `Mood: "${result.updatedState.mood}" (Stable)`;
        const stressDiff = result.updatedState.stress - startingState.stress;
        const stressText = stressDiff > 0
          ? `Stress: +${stressDiff}% (${result.updatedState.stress}%)`
          : stressDiff < 0
          ? `Stress: ${stressDiff}% (${result.updatedState.stress}%)`
          : `Stress: ${result.updatedState.stress}% (Stable)`;

        setSubmissionFeedback({
          text: `Message submitted & evaluated against detection settings! [${config.stressSensitivity.toUpperCase()} Sensitivity • Depth ${depth}] • ${moodText} • ${stressText}`,
          timestamp: timeStr,
        });

        setIsEvaluating(false);
      }, 120);
    },
    [simMessage, sandboxRole, sandboxBaseline, currentSandboxState, sandboxThread, config]
  );

  // Initialize sandbox with default test on initial config load
  useEffect(() => {
    if (!loading && !simResult) {
      executeSandboxTest(
        "I brought you some fresh lavender from the garden, they smell wonderful.",
        "user",
        DEFAULT_SANDBOX_BASELINE,
        true
      );
    }
  }, [loading, simResult, executeSandboxTest]);

  // Save config
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/mood-engine/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveSuccess(true);
        if (onNotify) onNotify("Mood & State Engine configuration saved!", "success");
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
      if (onNotify) onNotify("Failed to save configuration", "warning");
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/mood-engine/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || DEFAULT_MOOD_ENGINE_CONFIG);
        setResetConfirm(false);
        if (onNotify) onNotify("Reset to default configuration", "info");
      }
    } catch (err) {
      console.error("Failed to reset config:", err);
    } finally {
      setSaving(false);
    }
  };

  // Add custom mood
  const handleAddMood = () => {
    if (!newMoodName.trim()) return;
    const newEntry: CustomMoodEntry = {
      id: `custom_mood_${Date.now()}`,
      name: newMoodName.trim(),
      category: newMoodCategory,
      description: newMoodDesc.trim() || undefined,
      composureBias: newMoodComposureBias,
      stressBias: newMoodStressBias,
      active: true,
    };
    setConfig((prev) => ({
      ...prev,
      customMoods: [...prev.customMoods, newEntry],
    }));
    setNewMoodName("");
    setNewMoodDesc("");
    setNewMoodComposureBias(0);
    setNewMoodStressBias(0);
    setShowAddMoodModal(false);
  };

  // Remove custom mood
  const handleRemoveMood = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      customMoods: prev.customMoods.filter((m) => m.id !== id),
    }));
  };

  // Add custom status effect
  const handleAddStatusEffect = () => {
    if (!newEffectTag.trim()) return;
    const newEntry: CustomStatusEffectEntry = {
      id: `custom_effect_${Date.now()}`,
      tag: newEffectTag.trim(),
      category: newEffectCategory,
      description: newEffectDesc.trim() || undefined,
      severity: newEffectSeverity,
      active: true,
    };
    setConfig((prev) => ({
      ...prev,
      customStatusEffects: [...prev.customStatusEffects, newEntry],
    }));
    setNewEffectTag("");
    setNewEffectDesc("");
    setShowAddEffectModal(false);
  };

  // Remove custom status effect
  const handleRemoveStatusEffect = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      customStatusEffects: prev.customStatusEffects.filter((e) => e.id !== id),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-amber-400">
        <Activity className="animate-spin mr-3" size={24} />
        <span>Loading State & Mood Engine Configuration...</span>
      </div>
    );
  }

  // Combine standard moods from categories with custom moods
  const allCategoryMoods = MOOD_CATEGORIES.flatMap((cat) =>
    cat.moods.map((m) => ({
      name: m,
      category: cat.id,
      categoryName: cat.name,
      isCustom: false,
      id: undefined as string | undefined,
      description: undefined as string | undefined,
      stressBias: undefined as number | undefined,
      composureBias: undefined as number | undefined,
    }))
  );

  const customMoodsList = config.customMoods.map((m) => ({
    name: m.name,
    category: m.category || "General",
    categoryName: "Custom",
    isCustom: true,
    id: m.id,
    description: m.description,
    stressBias: m.stressBias,
    composureBias: m.composureBias,
  }));

  const filteredMoods = [...allCategoryMoods, ...customMoodsList].filter((item) => {
    const matchesCategory =
      moodFilterCategory === "all" ||
      item.category === moodFilterCategory ||
      (moodFilterCategory === "custom" && item.isCustom);
    const matchesSearch =
      !moodSearchQuery.trim() ||
      item.name.toLowerCase().includes(moodSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Combine standard status effects with custom status effects
  const allDefaultEffects = REGISTERED_STATUS_EFFECTS.map((e) => ({
    ...e,
    isCustom: false,
    id: undefined as string | undefined,
    severity: "Moderate" as any,
  }));
  const customEffectsList = config.customStatusEffects.map((e) => ({
    tag: e.tag,
    category: (e.category || "Physical") as any,
    description: e.description || "Custom effect",
    severity: (e.severity || "Moderate") as any,
    isCustom: true,
    id: e.id,
  }));

  const filteredEffects = [...allDefaultEffects, ...customEffectsList].filter((item) => {
    const matchesCategory =
      effectFilterCategory === "all" ||
      item.category.toLowerCase() === effectFilterCategory.toLowerCase() ||
      (effectFilterCategory === "custom" && item.isCustom);
    const matchesSearch =
      !effectSearchQuery.trim() ||
      item.tag.toLowerCase().includes(effectSearchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(effectSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-150 pb-16 text-gray-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#252530] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Brain size={18} />
            </div>
            <h1 className="text-xl font-semibold text-gray-100">
              State & Mood Detection Engine
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Rolling Window v2.1
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 max-w-2xl">
            Configure dynamic contextual sensitivity, safe peaceful topic buffers, rolling message depth, active palette registries, and live extraction monitors.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {resetConfirm ? (
            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-rose-300">Reset all?</span>
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="px-2 py-1 bg-[#1E1E26] hover:bg-[#282834] text-gray-300 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              className="px-3 py-2 bg-[#17171F] hover:bg-[#20202A] border border-[#2D2D3B] text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              saveSuccess
                ? "bg-emerald-600 text-white"
                : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/40"
            }`}
          >
            {saving ? (
              <Activity size={14} className="animate-spin" />
            ) : saveSuccess ? (
              <Check size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            <span>{saveSuccess ? "Saved!" : saving ? "Saving..." : "Save Engine Config"}</span>
          </button>
        </div>
      </div>

      {/* 0. Neural Model Configuration */}
      <section className="bg-[#121218] border border-[#232330] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">
              0. Engine Processing Model
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded">
            {activeModel || "Configured Centrally"}
          </span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Model selection for the Character State & Mood Engine is centrally managed in the <strong>Neural Model & Inference Servers</strong> tab. All state shifts, vitals evaluations, and status effects strictly execute on your chosen model.
        </p>
      </section>

      {/* 1. Rolling Window & Context Depth */}
      <section className="bg-[#121218] border border-[#232330] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">
              1. Detection Window & Rolling Message Depth
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded bg-[#1C1C26] border border-[#2E2E3E] text-amber-300 font-mono text-xs font-semibold">
            {config.windowDepth} {config.windowDepth === 1 ? "Message" : "Messages"} Depth
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Determines how many recent messages in the conversation thread are evaluated simultaneously. Rolling windows prevent abrupt mood spikes caused by isolated keywords and maintain organic emotional progression.
        </p>

        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs text-gray-400 font-medium">
            <span>1 (Immediate / Reactive)</span>
            <span className="text-amber-400 font-semibold">3 (Default & Recommended)</span>
            <span>5 (Deep Continuity)</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={config.windowDepth}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, windowDepth: parseInt(e.target.value, 10) }))
            }
            className="w-full h-2 bg-[#1F1F2B] rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div
            onClick={() => setConfig((prev) => ({ ...prev, windowDepth: 1 }))}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              config.windowDepth === 1
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                : "bg-[#161620] border-[#22222E] text-gray-400 hover:border-gray-600"
            }`}
          >
            <div className="font-medium text-gray-200 mb-1">Depth 1: High Reactivity</div>
            Focuses strictly on the latest message. Best for fast-paced action sequences or sudden surprises.
          </div>

          <div
            onClick={() => setConfig((prev) => ({ ...prev, windowDepth: 3 }))}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              config.windowDepth === 3
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                : "bg-[#161620] border-[#22222E] text-gray-400 hover:border-gray-600"
            }`}
          >
            <div className="font-medium text-gray-200 mb-1">Depth 3: Balanced Flow (Default)</div>
            Evaluates contextual continuity across 3 exchanges. Perfectly balances mood stability with natural shifts.
          </div>

          <div
            onClick={() => setConfig((prev) => ({ ...prev, windowDepth: 5 }))}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              config.windowDepth === 5
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                : "bg-[#161620] border-[#22222E] text-gray-400 hover:border-gray-600"
            }`}
          >
            <div className="font-medium text-gray-200 mb-1">Depth 5: Narrative Arc</div>
            Takes into account extensive prior context before altering emotional state. Ideal for slow-burn roleplay.
          </div>
        </div>
      </section>

      {/* 2. Stress Sensitivity & Contextual Understanding */}
      <section className="bg-[#121218] border border-[#232330] rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-gray-100">
            2. Stress Sensitivity & Topic Disambiguation
          </h2>
        </div>

        <p className="text-xs text-gray-400">
          Fine-tune the algorithm that distinguishes peaceful topics (such as flowers, cooking, nature, or casual greetings) from genuinely threatening or combative events.
        </p>

        {/* Sensitivity Level Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 block">
            Stress Detection Sensitivity
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: "low",
                label: "Low (Peaceful & Relaxed)",
                desc: "Strong buffer against premature stress triggers. Topics like flowers, scenery, or tea never raise stress.",
                badge: "Ideal for Casual Chat",
              },
              {
                id: "normal",
                label: "Normal (Balanced)",
                desc: "Standard calibrated stress response. Responds to genuine conflict, danger, or rejection.",
                badge: "Default",
              },
              {
                id: "high",
                label: "High (High Stakes)",
                desc: "Elevated reactivity to mild awkwardness, tension, or confrontation. Character stresses quickly.",
                badge: "Strict / Fragile",
              },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    stressSensitivity: lvl.id as "low" | "normal" | "high",
                  }))
                }
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  config.stressSensitivity === lvl.id
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/40"
                    : "bg-[#15151F] border-[#22222E] text-gray-400 hover:border-gray-600 hover:text-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-gray-100">{lvl.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1F2C] text-gray-300 border border-[#2D2D3D]">
                    {lvl.badge}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">{lvl.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Safe Setting Buffering */}
          <div className="flex items-start justify-between p-3.5 rounded-xl bg-[#161620] border border-[#22222E]">
            <div className="space-y-1 pr-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <Leaf size={14} className="text-emerald-400" />
                <span>Safe Setting & Nature Buffering</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                When active, discussing flowers, gardens, cooking, warm weather, or scenic beauty protects the character from stress increases and promotes gentle composure recovery.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={config.safeSettingBuffering}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, safeSettingBuffering: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#252533] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Relationship Trust Buffering */}
          <div className="flex items-start justify-between p-3.5 rounded-xl bg-[#161620] border border-[#22222E]">
            <div className="space-y-1 pr-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <Heart size={14} className="text-pink-400" />
                <span>Relationship Trust Buffering</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                When trust exceeds 60%, the character gives the user the benefit of the doubt, reducing stress impact from playful teasing or misunderstandings.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={config.relationshipTrustBuffering}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    relationshipTrustBuffering: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#252533] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Mood Transition Smoothing */}
          <div className="flex items-start justify-between p-3.5 rounded-xl bg-[#161620] border border-[#22222E]">
            <div className="space-y-1 pr-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <Activity size={14} className="text-violet-400" />
                <span>Mood Transition Smoothing</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Prevents sudden swings from ecstatic to terrified without intermediate emotional states, preserving plausible character psychology.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={config.moodTransitionSmoothing}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    moodTransitionSmoothing: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#252533] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Drastic Event Override */}
          <div className="flex items-start justify-between p-3.5 rounded-xl bg-[#161620] border border-[#22222E]">
            <div className="space-y-1 pr-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <Flame size={14} className="text-rose-400" />
                <span>Drastic Event Emergency Override</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Immediately bypasses smoothing during extreme events (e.g. violent ambush, weapons drawn, injury, explosive shock).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={config.drasticEventOverride}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    drasticEventOverride: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#252533] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>
        </div>

        {/* Step Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#1F1F2B]">
          {/* Max Stress Step */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-gray-300">Max Stress Step Per Turn</span>
              <span className="font-mono text-amber-300 bg-[#1C1C26] px-2 py-0.5 rounded border border-[#2B2B3A]">
                ±{config.maxStressStepPerTurn ?? 15} pts
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={config.maxStressStepPerTurn ?? 15}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  maxStressStepPerTurn: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-1.5 bg-[#1F1F2B] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-[10px] text-gray-400">
              Caps how rapidly stress can climb in a single non-emergency interaction.
            </p>
          </div>

          {/* Composure Recovery Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-gray-300">Composure Recovery Rate</span>
              <span className="font-mono text-emerald-300 bg-[#1C1C26] px-2 py-0.5 rounded border border-[#2B2B3A]">
                +{config.composureRecoveryRate ?? 3} pts/turn
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.composureRecoveryRate ?? 3}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  composureRecoveryRate: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-1.5 bg-[#1F1F2B] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-[10px] text-gray-400">
              Natural composure restored each turn during calm, peaceful dialogues.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Live Extraction Monitors Panel */}
      <section className="bg-[#121218] border border-[#232330] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">
              3. Live Extraction Monitors & State Tracking
            </h2>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">Dynamic Scene Parser</span>
        </div>

        <p className="text-xs text-gray-400">
          Toggle which environment and situational aspects the engine dynamically extracts and updates from ongoing chat narration.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Location Monitor */}
          <div className="p-3.5 rounded-xl bg-[#15151F] border border-[#22222E] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <MapPin size={15} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">Scene Location</div>
                <div className="text-[10px] text-gray-400">Tracks room / setting</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.liveMonitors?.trackLocation ?? true}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  liveMonitors: {
                    ...prev.liveMonitors,
                    trackLocation: e.target.checked,
                  },
                }))
              }
              className="rounded bg-[#20202C] border-[#303040] text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Activity Monitor */}
          <div className="p-3.5 rounded-xl bg-[#15151F] border border-[#22222E] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles size={15} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">Current Activity</div>
                <div className="text-[10px] text-gray-400">Extracts actions & tasks</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.liveMonitors?.trackActivity ?? true}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  liveMonitors: {
                    ...prev.liveMonitors,
                    trackActivity: e.target.checked,
                  },
                }))
              }
              className="rounded bg-[#20202C] border-[#303040] text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Attire Monitor */}
          <div className="p-3.5 rounded-xl bg-[#15151F] border border-[#22222E] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Shirt size={15} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">Attire & Outfit</div>
                <div className="text-[10px] text-gray-400">Tracks clothing changes</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.liveMonitors?.trackAttire ?? true}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  liveMonitors: {
                    ...prev.liveMonitors,
                    trackAttire: e.target.checked,
                  },
                }))
              }
              className="rounded bg-[#20202C] border-[#303040] text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Status Effects Monitor */}
          <div className="p-3.5 rounded-xl bg-[#15151F] border border-[#22222E] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Zap size={15} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">Status Conditions</div>
                <div className="text-[10px] text-gray-400">Physical & mental tags</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.liveMonitors?.trackStatusEffects ?? true}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  liveMonitors: {
                    ...prev.liveMonitors,
                    trackStatusEffects: e.target.checked,
                  },
                }))
              }
              className="rounded bg-[#20202C] border-[#303040] text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* 4. Live Simulation & Disambiguation Sandbox */}
      <section className="bg-[#121218] border border-[#232330] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical size={17} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">
              Live Engine Test & Sensitivity Preview
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            <Lock size={11} />
            Real-time Sandbox (Isolated)
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Test and verify how your configured stress sensitivity, rolling window depth, safe-setting buffers, and live scene monitors classify dialogue. Enter test details below and submit to evaluate &mdash; all tests run purely in-memory and will never alter your actual character state or saved chats.
        </p>

        {/* Preset Prompt Buttons */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-400" />
            Quick Test Presets:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "🌸 Flowers & Lavender (Peaceful)",
                text: "I brought you some fresh lavender from the garden, they smell wonderful.",
                role: "user" as const,
                loc: "Garden Pavilion",
              },
              {
                label: "🍵 Warm Chamomile Tea (Cozy Comfort)",
                text: "Here, drink this warm chamomile tea by the fireplace. You can rest now.",
                role: "user" as const,
                loc: "Cozy Hearth",
              },
              {
                label: "⚔️ Combat Ambush (Peril / Danger)",
                text: "Look out! Swords drawn, three assassins just kicked open the door!",
                role: "user" as const,
                loc: "Narrow Corridor",
              },
              {
                label: "😏 Playful Teasing (Flirtatious)",
                text: "Are you blushing? I didn't think someone so stern could get this flustered.",
                role: "user" as const,
                loc: "Garden Pavilion",
              },
              {
                label: "🤝 Sincere Gratitude (Trust Boost)",
                text: "Thank you for staying by my side through everything. I'll always protect you.",
                role: "user" as const,
                loc: "Garden Pavilion",
              },
              {
                label: "🏰 Enter Ancient Archives (Location Shift)",
                text: "We arrive at the Grand Royal Archives and step into the high vaulted library.",
                role: "user" as const,
                loc: "Garden Pavilion",
              },
              {
                label: "🥋 Torn Tunic in Battle (Outfit Damage)",
                text: "*The beast's claws tear shirt to shreds, leaving clothes ripped and battered.*",
                role: "assistant" as const,
                loc: "Dungeon Arena",
              },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSimMessage(preset.text);
                  setSandboxRole(preset.role);
                  const updatedBaseline = {
                    ...sandboxBaseline,
                    location: preset.loc || sandboxBaseline.location,
                  };
                  setSandboxBaseline(updatedBaseline);
                  executeSandboxTest(preset.text, preset.role, updatedBaseline, true);
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] bg-[#191924] hover:bg-[#232332] border border-[#2B2B3C] text-gray-300 hover:text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Details Control Box */}
        <div className="p-4 rounded-xl bg-[#151520] border border-[#262638] space-y-3.5">
          {/* Top toolbar: Role selector & Baseline drawer toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#202030]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Message Speaker:</span>
              <div className="inline-flex rounded-lg bg-[#101018] p-0.5 border border-[#2B2B3E]">
                <button
                  type="button"
                  onClick={() => setSandboxRole("user")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    sandboxRole === "user"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  User Dialogue
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxRole("assistant")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    sandboxRole === "assistant"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Character Action / Narration
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBaselineDrawer(!showBaselineDrawer)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-300 hover:text-amber-300 bg-[#1A1A26] border border-[#2E2E42] flex items-center gap-1.5 transition-colors"
            >
              <Sliders size={12} className="text-amber-400" />
              <span>Customize Starting Conditions</span>
              {showBaselineDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Collapsible Sandbox Starting Conditions Drawer */}
          {showBaselineDrawer && (
            <div className="p-3.5 rounded-lg bg-[#101018] border border-[#242436] space-y-3 text-xs">
              <div className="flex items-center justify-between text-gray-300 font-medium pb-1.5 border-b border-[#1C1C2A]">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Sliders size={13} />
                  Sandbox Baseline Character State
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSandboxBaseline(DEFAULT_SANDBOX_BASELINE);
                    setCurrentSandboxState(sanitizeSandboxState(DEFAULT_SANDBOX_BASELINE));
                  }}
                  className="text-[10px] text-gray-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Reset Baseline
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Starting Mood</label>
                  <input
                    type="text"
                    value={sandboxBaseline.mood}
                    onChange={(e) =>
                      setSandboxBaseline((prev) => ({ ...prev, mood: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-md bg-[#181824] border border-[#2E2E40] text-gray-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">
                    Starting Stress: {sandboxBaseline.stress}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sandboxBaseline.stress}
                    onChange={(e) =>
                      setSandboxBaseline((prev) => ({ ...prev, stress: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-500 h-1.5 bg-[#252535] rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">
                    Starting Composure: {sandboxBaseline.composure}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sandboxBaseline.composure}
                    onChange={(e) =>
                      setSandboxBaseline((prev) => ({ ...prev, composure: Number(e.target.value) }))
                    }
                    className="w-full accent-cyan-500 h-1.5 bg-[#252535] rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">
                    Starting Trust Bond: {sandboxBaseline.trust}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sandboxBaseline.trust}
                    onChange={(e) =>
                      setSandboxBaseline((prev) => ({ ...prev, trust: Number(e.target.value) }))
                    }
                    className="w-full accent-pink-500 h-1.5 bg-[#252535] rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Starting Location</label>
                  <input
                    type="text"
                    value={sandboxBaseline.location}
                    onChange={(e) =>
                      setSandboxBaseline((prev) => ({ ...prev, location: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-md bg-[#181824] border border-[#2E2E40] text-gray-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Starting Outfit / Attire</label>
                  <input
                    type="text"
                    value={sandboxBaseline.outfit}
                    onChange={(e) =>
                      setSandboxBaseline((prev) => ({ ...prev, outfit: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-md bg-[#181824] border border-[#2E2E40] text-gray-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-gray-400 block mb-1">
                    Starting Status Effects (comma separated)
                  </label>
                  <input
                    type="text"
                    value={sandboxBaseline.statusEffects.join(", ")}
                    onChange={(e) =>
                      setSandboxBaseline((prev) => ({
                        ...prev,
                        statusEffects: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-md bg-[#181824] border border-[#2E2E40] text-gray-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test Dialogue Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
              <span>Test Dialogue or Action Statement:</span>
              <span className="text-[10px] text-gray-400">Click &quot;Submit &amp; Run Sandbox Test&quot; or press Enter</span>
            </label>
            <div className="relative">
              <input
                id="sandbox-dialogue-input"
                type="text"
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    executeSandboxTest();
                  }
                }}
                placeholder="Type any sample dialogue or action (e.g., 'Look out, an attack!' or '*smiles and offers tea*')..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#101018] border border-[#2B2B3C] text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30"
              />
              {simMessage && (
                <button
                  type="button"
                  onClick={() => setSimMessage("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Action Row with the Submit Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Shield size={13} className="text-amber-400 shrink-0" />
              <span>
                Engine Settings: <strong>{config.stressSensitivity.toUpperCase()}</strong> Sensitivity &bull; Depth <strong>{config.windowDepth}</strong> &bull; {config.safeSettingBuffering ? "Safe Haven Buffering ON" : "Safe Haven OFF"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSimMessage("I brought you some fresh lavender from the garden, they smell wonderful.");
                  setSandboxBaseline(DEFAULT_SANDBOX_BASELINE);
                  setCurrentSandboxState(sanitizeSandboxState(DEFAULT_SANDBOX_BASELINE));
                  setSandboxRole("user");
                  setSandboxThread([]);
                  setSubmissionFeedback(null);
                  executeSandboxTest(
                    "I brought you some fresh lavender from the garden, they smell wonderful.",
                    "user",
                    DEFAULT_SANDBOX_BASELINE,
                    true
                  );
                }}
                className="px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#20202E] border border-transparent transition-colors cursor-pointer"
              >
                Reset Session
              </button>

              {/* The Dedicated Submit & Test Button */}
              <button
                id="submit-run-sandbox-test-btn"
                type="button"
                onClick={() => executeSandboxTest()}
                disabled={!simMessage.trim() || isEvaluating}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEvaluating ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Play size={14} className="fill-current" />
                )}
                <span>{isEvaluating ? "Evaluating Engine..." : "Submit & Run Sandbox Test"}</span>
              </button>
            </div>
          </div>

          {/* Submission Feedback Banner */}
          {submissionFeedback && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>{submissionFeedback.text}</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono shrink-0">
                {submissionFeedback.timestamp}
              </span>
            </div>
          )}

          {/* Sandbox Conversation Transcript Log */}
          {sandboxThread.length > 0 && (
            <div className="p-3 rounded-lg bg-[#101018] border border-[#232334] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-300 border-b border-[#1C1C2A] pb-2">
                <div className="flex items-center gap-2">
                  <Send size={13} className="text-amber-400" />
                  <span>
                    Sandbox Conversation Transcript ({sandboxThread.length} {sandboxThread.length === 1 ? "turn" : "turns"})
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    &bull; Rolling window evaluates last {config.windowDepth}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const fresh = sanitizeSandboxState(sandboxBaseline);
                    setCurrentSandboxState(fresh);
                    setSandboxThread([]);
                    setSubmissionFeedback(null);
                    executeSandboxTest(
                      "I brought you some fresh lavender from the garden, they smell wonderful.",
                      "user",
                      sandboxBaseline,
                      true
                    );
                  }}
                  className="text-[10px] text-gray-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw size={10} /> Clear Transcript &amp; Reset
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {sandboxThread.map((turn, idx) => (
                  <div
                    key={turn.id}
                    className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                      idx === sandboxThread.length - 1
                        ? "bg-[#161624] border-amber-500/40 shadow-sm"
                        : "bg-[#12121B] border-[#20202F]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium ${
                            turn.role === "user"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          }`}
                        >
                          {turn.role === "user" ? "User" : "Character"}
                        </span>
                        <span className="font-mono">#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono">{turn.timestamp}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1C1C2C] text-amber-300 font-semibold">
                          Mood: {turn.mood}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1C1C2C] text-gray-300 font-mono">
                          Stress: {turn.stress}%
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-200 text-xs pl-0.5 leading-relaxed font-sans">
                      {turn.text}
                    </div>

                    {turn.shifts && turn.shifts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] text-gray-400">
                        <span className="text-emerald-400 font-medium">Shifts:</span>
                        {turn.shifts.map((s, si) => (
                          <span
                            key={si}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Simulation Output Card */}
        {simResult && simResult.updatedState && (
          <div className="p-4 rounded-xl bg-[#151522] border border-[#2B2B40] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242436] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-amber-400" />
                <span className="text-xs font-semibold text-gray-200">
                  Sandbox Detection Evaluation
                </span>
                {lastEvaluatedAt && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    ({lastEvaluatedAt})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#1E1E2C] text-gray-300 border border-[#2D2D40]">
                  Sensitivity: <strong className="text-emerald-400">{config.stressSensitivity.toUpperCase()}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock size={9} />
                  In-Memory Isolated
                </span>
              </div>
            </div>

            {/* Core Emotional Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* 1. Proposed Mood */}
              <div className="p-3 rounded-lg bg-[#0E0E16] border border-[#202030] space-y-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Proposed Mood</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-amber-300 text-sm">
                    {simResult.updatedState.mood || "Calm"}
                  </span>
                  {simResult.baselineState?.mood !== simResult.updatedState.mood && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      (from {simResult.baselineState?.mood})
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Stress Level & Shift */}
              <div className="p-3 rounded-lg bg-[#0E0E16] border border-[#202030] space-y-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Stress Level & Shift</div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold font-mono text-sm ${
                      simResult.updatedState.stress > (simResult.baselineState?.stress ?? 15)
                        ? "text-rose-400"
                        : simResult.updatedState.stress < (simResult.baselineState?.stress ?? 15)
                        ? "text-emerald-400"
                        : "text-gray-300"
                    }`}
                  >
                    {simResult.updatedState.stress}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {simResult.updatedState.stress > (simResult.baselineState?.stress ?? 15)
                      ? `(+${simResult.updatedState.stress - (simResult.baselineState?.stress ?? 15)})`
                      : simResult.updatedState.stress < (simResult.baselineState?.stress ?? 15)
                      ? `(${simResult.updatedState.stress - (simResult.baselineState?.stress ?? 15)} Buffered)`
                      : "(Stable)"}
                  </span>
                </div>
              </div>

              {/* 3. Composure */}
              <div className="p-3 rounded-lg bg-[#0E0E16] border border-[#202030] space-y-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Composure</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold font-mono text-sm text-cyan-300">
                    {simResult.updatedState.composure ?? 80}%
                  </span>
                  {simResult.baselineState?.composure !== undefined && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      ({(simResult.updatedState.composure ?? 80) >= simResult.baselineState.composure ? "+" : ""}
                      {(simResult.updatedState.composure ?? 80) - simResult.baselineState.composure})
                    </span>
                  )}
                </div>
              </div>

              {/* 4. Trust Bond */}
              <div className="p-3 rounded-lg bg-[#0E0E16] border border-[#202030] space-y-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Trust Bond</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold font-mono text-sm text-pink-300">
                    {simResult.updatedState.trust ?? 65}%
                  </span>
                  {simResult.baselineState?.trust !== undefined && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      ({(simResult.updatedState.trust ?? 65) >= simResult.baselineState.trust ? "+" : ""}
                      {(simResult.updatedState.trust ?? 65) - simResult.baselineState.trust})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scene & Physical Extraction Diagnostics */}
            <div className="p-3 rounded-lg bg-[#101018] border border-[#20202E] space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-amber-400" />
                  Dynamic Scene & Physical Extraction
                </span>
                <span className="text-[10px] text-gray-400">Parsed via active monitors</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded bg-[#181824] border border-[#262638]">
                  <div className="text-[10px] text-gray-400 mb-0.5 flex items-center justify-between">
                    <span>Scene Location</span>
                    <span className="text-[9px] text-emerald-400">
                      {config.liveMonitors?.trackLocation !== false ? "Monitor ON" : "Monitor OFF"}
                    </span>
                  </div>
                  <div className="font-medium text-gray-200">
                    {simResult.updatedState.location || "Unknown"}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#181824] border border-[#262638]">
                  <div className="text-[10px] text-gray-400 mb-0.5 flex items-center justify-between">
                    <span>Current Activity</span>
                    <span className="text-[9px] text-emerald-400">
                      {config.liveMonitors?.trackActivity !== false ? "Monitor ON" : "Monitor OFF"}
                    </span>
                  </div>
                  <div className="font-medium text-gray-200">
                    {simResult.updatedState.activity || "None"}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#181824] border border-[#262638]">
                  <div className="text-[10px] text-gray-400 mb-0.5 flex items-center justify-between">
                    <span>Attire & Outfit</span>
                    <span className="text-[9px] text-emerald-400">
                      {config.liveMonitors?.trackOutfit !== false ? "Monitor ON" : "Monitor OFF"}
                    </span>
                  </div>
                  <div className="font-medium text-gray-200">
                    {simResult.updatedState.outfit || simResult.updatedState.attire || "Standard"}
                  </div>
                </div>
              </div>

              {/* Status Effects List */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                <span className="text-[10px] text-gray-400">Active Status Tags:</span>
                {(simResult.updatedState.statusEffects || []).length > 0 ? (
                  simResult.updatedState.statusEffects.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-500 italic">None (Normal)</span>
                )}
              </div>
            </div>

            {/* Rule Buffering & Classification Log */}
            <div className="p-3 rounded-lg bg-[#101018] border border-[#20202E] space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield size={13} className="text-amber-400" />
                  Engine Rules & Buffer Breakdown
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {simResult.detectionMeta?.activeTopicIntent || "General Interaction"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 rounded bg-[#161622] border border-[#242434]">
                  <div className="text-gray-400 mb-0.5">Sensory / Nature Shield</div>
                  <div className={simResult.detectionMeta?.isPeacefulNatureTopic ? "text-emerald-400 font-semibold" : "text-gray-500"}>
                    {simResult.detectionMeta?.isPeacefulNatureTopic ? "ACTIVE (Stress Dampened)" : "INACTIVE"}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#161622] border border-[#242434]">
                  <div className="text-gray-400 mb-0.5">Safe Setting Buffering</div>
                  <div className={simResult.detectionMeta?.isSafeSetting ? "text-emerald-400 font-semibold" : "text-gray-500"}>
                    {simResult.detectionMeta?.isSafeSetting ? "ACTIVE (Setting Protected)" : "INACTIVE"}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#161622] border border-[#242434]">
                  <div className="text-gray-400 mb-0.5">Relationship Buffering</div>
                  <div className={simResult.detectionMeta?.hasHighTrust ? "text-emerald-400 font-semibold" : "text-gray-500"}>
                    {simResult.detectionMeta?.hasHighTrust ? "ACTIVE (Trust >= 55%)" : "INACTIVE"}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#161622] border border-[#242434]">
                  <div className="text-gray-400 mb-0.5">Drastic Event Override</div>
                  <div className={simResult.detectionMeta?.overrideTriggered ? "text-rose-400 font-semibold" : "text-gray-500"}>
                    {simResult.detectionMeta?.overrideTriggered ? "TRIGGERED (Extreme Peril)" : "INACTIVE"}
                  </div>
                </div>
              </div>

              {/* State Shifts Triggered */}
              {simResult.shifts && simResult.shifts.length > 0 && (
                <div className="pt-2 border-t border-[#1C1C2A] space-y-1">
                  <div className="text-[10px] text-gray-400 font-medium">Applied State Shifts:</div>
                  <ul className="space-y-1">
                    {simResult.shifts.map((shift: string, i: number) => (
                      <li key={i} className="text-[11px] text-gray-300 flex items-start gap-1.5">
                        <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{shift}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sandbox Isolation Notice */}
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5 p-2 rounded-lg bg-[#0F0F18] border border-[#1E1E2A]">
              <Lock size={12} className="text-emerald-400 shrink-0" />
              <span>
                <strong>Sandbox Guarantee:</strong> This test evaluated the dialogue strictly in-memory. Your ongoing chat session and active character profile were not modified.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Active Palette Viewer & Manager */}
      <section className="bg-[#121218] border border-[#232330] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Smile size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">
              4. Active Mood Palette Viewer & Manager
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#1E1E28] text-gray-300 border border-[#2C2C3A]">
              {filteredMoods.length} Moods
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMoodModal(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Add Custom Mood</span>
          </button>
        </div>

        <p className="text-xs text-gray-400">
          The registry of moods available to the character state engine. Custom moods can be appended with unique composure and stress biases.
        </p>

        {/* Filter and search bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              value={moodSearchQuery}
              onChange={(e) => setMoodSearchQuery(e.target.value)}
              placeholder="Search registered moods..."
              className="w-full pl-9 pr-3 py-2 bg-[#161622] border border-[#282838] rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "joy", label: "Joy" },
              { id: "playful", label: "Playful" },
              { id: "affection", label: "Romance" },
              { id: "calm", label: "Calm" },
              { id: "fear", label: "Fear" },
              { id: "anger", label: "Anger" },
              { id: "custom", label: "Custom Only" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setMoodFilterCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  moodFilterCategory === cat.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-[#161622] text-gray-400 hover:text-gray-200 border border-[#282838]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mood Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
          {filteredMoods.map((m, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between group transition-all ${
                m.isCustom
                  ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                  : "bg-[#161622] border-[#252535] text-gray-300"
              }`}
            >
              <div className="min-w-0 pr-1.5">
                <div className="font-medium truncate">{m.name}</div>
                <div className="text-[10px] text-gray-500 capitalize">
                  {m.isCustom ? "Custom Entry" : m.categoryName}
                </div>
              </div>
              {m.isCustom && m.id && (
                <button
                  type="button"
                  onClick={() => handleRemoveMood(m.id!)}
                  title="Remove custom mood"
                  className="opacity-70 hover:opacity-100 text-rose-400 p-1 hover:bg-rose-950/40 rounded transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. Status Effects Registry Panel */}
      <section className="bg-[#121218] border border-[#232330] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-100">
              5. Status Effects & Conditions Registry
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#1E1E28] text-gray-300 border border-[#2C2C3A]">
              {filteredEffects.length} Conditions
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddEffectModal(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Add Status Effect</span>
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Registered physical, psychological, and environmental conditions that can afflict or benefit the character during encounters.
        </p>

        {/* Filter and search bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              value={effectSearchQuery}
              onChange={(e) => setEffectSearchQuery(e.target.value)}
              placeholder="Search status conditions..."
              className="w-full pl-9 pr-3 py-2 bg-[#161622] border border-[#282838] rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "psychological", label: "Psychological" },
              { id: "physical", label: "Physical" },
              { id: "environmental", label: "Environmental" },
              { id: "custom", label: "Custom Only" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setEffectFilterCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  effectFilterCategory === cat.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-[#161622] text-gray-400 hover:text-gray-200 border border-[#282838]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Effects List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
          {filteredEffects.map((eff, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                eff.isCustom
                  ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                  : "bg-[#161622] border-[#252535] text-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-100">{eff.tag}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      eff.category === "Physical"
                        ? "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                        : eff.category === "Environmental"
                        ? "bg-blue-950/60 text-blue-300 border border-blue-800/40"
                        : "bg-violet-950/60 text-violet-300 border border-violet-800/40"
                    }`}
                  >
                    {eff.category}
                  </span>
                </div>
                {eff.isCustom && eff.id && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStatusEffect(eff.id!)}
                    title="Remove custom condition"
                    className="text-rose-400 p-1 hover:bg-rose-950/40 rounded transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 leading-normal line-clamp-2">
                {eff.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Add Custom Mood Modal */}
      {showAddMoodModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#161620] border border-[#2D2D3E] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#242436] pb-3">
              <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                <Smile size={16} className="text-amber-400" />
                Add Custom Mood Entry
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMoodModal(false)}
                className="text-gray-400 hover:text-gray-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Mood Name</label>
                <input
                  type="text"
                  value={newMoodName}
                  onChange={(e) => setNewMoodName(e.target.value)}
                  placeholder="e.g. Dreamy, Stupefied, Vengeful"
                  className="w-full px-3 py-2 bg-[#101018] border border-[#2B2B3C] rounded-lg text-gray-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Category</label>
                <select
                  value={newMoodCategory}
                  onChange={(e) => setNewMoodCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101018] border border-[#2B2B3C] rounded-lg text-gray-200 focus:outline-none focus:border-amber-500/60"
                >
                  <option value="joy">Joy & Excitement</option>
                  <option value="playful">Playful & Banter</option>
                  <option value="affection">Affection & Romance</option>
                  <option value="calm">Calm & Serenity</option>
                  <option value="fear">Fear & Peril</option>
                  <option value="anger">Anger & Conflict</option>
                  <option value="sorrow">Melancholy & Sorrow</option>
                  <option value="mystery">Curiosity & Mystery</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Description / Behavioral Note</label>
                <textarea
                  value={newMoodDesc}
                  onChange={(e) => setNewMoodDesc(e.target.value)}
                  rows={2}
                  placeholder="How does this mood alter tone and speech?"
                  className="w-full px-3 py-2 bg-[#101018] border border-[#2B2B3C] rounded-lg text-gray-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Composure Bias: {newMoodComposureBias}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={newMoodComposureBias}
                    onChange={(e) => setNewMoodComposureBias(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-[#1F1F2B] rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Stress Bias: {newMoodStressBias}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={newMoodStressBias}
                    onChange={(e) => setNewMoodStressBias(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-[#1F1F2B] rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#242436]">
              <button
                type="button"
                onClick={() => setShowAddMoodModal(false)}
                className="px-3 py-1.5 bg-[#1C1C28] hover:bg-[#252535] text-gray-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMood}
                disabled={!newMoodName.trim()}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                Add Mood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Status Effect Modal */}
      {showAddEffectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#161620] border border-[#2D2D3E] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#242436] pb-3">
              <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Add Status Effect / Condition
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEffectModal(false)}
                className="text-gray-400 hover:text-gray-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Tag Name</label>
                <input
                  type="text"
                  value={newEffectTag}
                  onChange={(e) => setNewEffectTag(e.target.value)}
                  placeholder="e.g. Hypnotized, Inspired, Starving"
                  className="w-full px-3 py-2 bg-[#101018] border border-[#2B2B3C] rounded-lg text-gray-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Category</label>
                <select
                  value={newEffectCategory}
                  onChange={(e) =>
                    setNewEffectCategory(
                      e.target.value as "Physical" | "Psychological" | "Environmental"
                    )
                  }
                  className="w-full px-3 py-2 bg-[#101018] border border-[#2B2B3C] rounded-lg text-gray-200 focus:outline-none focus:border-amber-500/60"
                >
                  <option value="Psychological">Psychological</option>
                  <option value="Physical">Physical</option>
                  <option value="Environmental">Environmental</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Severity Level</label>
                <select
                  value={newEffectSeverity}
                  onChange={(e) =>
                    setNewEffectSeverity(
                      e.target.value as "Low" | "Moderate" | "High" | "Severe"
                    )
                  }
                  className="w-full px-3 py-2 bg-[#101018] border border-[#2B2B3C] rounded-lg text-gray-200 focus:outline-none focus:border-amber-500/60"
                >
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Description</label>
                <textarea
                  value={newEffectDesc}
                  onChange={(e) => setNewEffectDesc(e.target.value)}
                  rows={2}
                  placeholder="Brief clinical or emotional summary of this condition..."
                  className="w-full px-3 py-2 bg-[#101018] border border-[#2B2B3C] rounded-lg text-gray-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#242436]">
              <button
                type="button"
                onClick={() => setShowAddEffectModal(false)}
                className="px-3 py-1.5 bg-[#1C1C28] hover:bg-[#252535] text-gray-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStatusEffect}
                disabled={!newEffectTag.trim()}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                Add Status Effect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
