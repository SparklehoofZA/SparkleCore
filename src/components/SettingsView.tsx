import React, { useState, useEffect } from "react";
import { 
  Server, 
  Sliders, 
  UserCircle2, 
  MapPin, 
  Database, 
  RefreshCw, 
  Save, 
  Trash2, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  ChevronRight, 
  ExternalLink, 
  Shield,
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  Bug,
  Download,
  Upload,
  Sparkles,
  Zap,
  RotateCcw,
  Activity,
  Info,
  Palette,
  History,
  Brain,
  Target,
  Compass,
  ScrollText,
  Landmark,
} from "lucide-react";
import { 
  GlobalGenerationSettings, 
  LocalServerSettings, 
  LocalServerConfig, 
  LocalModelInfo, 
  UserPersona, 
  Scenario, 
  Personality
} from "../types";
import { ErrorLogsView } from "./ErrorLogsView";
import { LocalServerSetupGuide } from "./LocalServerSetupGuide";
import { SystemStatusSection } from "./SystemStatusSection";
import { AboutSection } from "./AboutSection";
import { ThemeSettingsSection } from "./ThemeSettingsSection";
import { ChangelogSection, CHANGELOG_DATA } from "./ChangelogSection";
import { LicenseSection } from "./LicenseSection";
import { MoodEngineSettingsSection } from "./MoodEngineSettingsSection";
import { QuestingSystemSettingsSection } from "./QuestingSystemSettingsSection";
import { MemPalaceSettingsSection } from "./MemPalaceSettingsSection";
import { ImportChatSection } from "./ImportChatSection";

interface SettingsViewProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  defaultModel?: string;
  onSetDefaultModel?: (model: string) => void;
  localModels: LocalModelInfo[];
  onRefreshLocalModels: () => Promise<void>;
  userPersona: UserPersona | null;
  onSaveUserPersona: (persona: UserPersona) => Promise<void>;
  scenarios: Scenario[];
  onRefreshScenarios: () => Promise<void>;
  personalities: Personality[];
  selectedPersonality: Personality | null;
  onSelectPersonality: (p: Personality | null) => void;
  onBackToChat: () => void;
  serverConnectionStatus?: "connected" | "slow" | "disconnected";
  serverLatency?: number | null;
  serverTarget?: string;
  onCheckServerConnection?: () => void;
  initialSection?: SettingsSection;
  geminiApiKey: string;
  onSetGeminiApiKey: (key: string) => void;
  themeSettings: any;
  onUpdateThemeSettings: (settings: any) => void;
}

export type SettingsSection = "status" | "model_servers" | "theme" | "samplers" | "mempalace" | "mood_engine" | "questing_system" | "persona" | "scenarios" | "import_chat" | "error_logs" | "about" | "changelog" | "license";

export function SettingsView({
  selectedModel,
  onSelectModel,
  defaultModel,
  onSetDefaultModel,
  localModels,
  onRefreshLocalModels,
  userPersona,
  onSaveUserPersona,
  scenarios,
  onRefreshScenarios,
  personalities,
  selectedPersonality,
  onSelectPersonality,
  onBackToChat,
  serverConnectionStatus,
  serverLatency,
  serverTarget,
  onCheckServerConnection,
  initialSection,
  geminiApiKey,
  onSetGeminiApiKey,
  themeSettings,
  onUpdateThemeSettings,
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection || "model_servers");
  const [errorLogCount, setErrorLogCount] = useState<number>(0);

  // Default Model state
  const [currentDefaultModel, setCurrentDefaultModel] = useState<string>(
    () => defaultModel || localStorage.getItem("DEFAULT_INFERENCE_MODEL") || ""
  );
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [defaultModelSuccessMsg, setDefaultModelSuccessMsg] = useState<string | null>(null);

  // Dedicated Pipeline Models state
  const [characterStateModel, setCharacterStateModel] = useState<string>(
    () => localStorage.getItem("CHARACTER_STATE_MODEL") || "gemini-3.8-flash"
  );
  const [questEngineModel, setQuestEngineModel] = useState<string>(
    () => localStorage.getItem("QUEST_ENGINE_MODEL") || "gemini-3.8-flash"
  );
  const [mempalaceModel, setMempalaceModel] = useState<string>(
    () => localStorage.getItem("MEMPALACE_MODEL") || "gemini-3.8-flash"
  );
  const [fallbackModel, setFallbackModel] = useState<string>(
    () => localStorage.getItem("FALLBACK_MODEL") || "none"
  );
  const [isSavingDedicatedModels, setIsSavingDedicatedModels] = useState(false);
  const [dedicatedModelsSuccessMsg, setDedicatedModelsSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/neural-models-config")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.defaultModel && !defaultModel) {
            setCurrentDefaultModel(data.defaultModel);
          }
          if (data.characterStateModel) {
            setCharacterStateModel(data.characterStateModel);
            localStorage.setItem("CHARACTER_STATE_MODEL", data.characterStateModel);
          }
          if (data.questEngineModel) {
            setQuestEngineModel(data.questEngineModel);
            localStorage.setItem("QUEST_ENGINE_MODEL", data.questEngineModel);
          }
          if (data.mempalaceModel) {
            setMempalaceModel(data.mempalaceModel);
            localStorage.setItem("MEMPALACE_MODEL", data.mempalaceModel);
          }
          if (data.fallbackModel) {
            setFallbackModel(data.fallbackModel);
            localStorage.setItem("FALLBACK_MODEL", data.fallbackModel);
          }
        }
      })
      .catch(() => {
        if (defaultModel) {
          setCurrentDefaultModel(defaultModel);
        } else {
          fetch("/api/default-model")
            .then((res) => res.json())
            .then((data) => {
              if (data?.defaultModel) {
                setCurrentDefaultModel(data.defaultModel);
              }
            })
            .catch(() => {});
        }
      });
  }, [defaultModel]);

  const handleUpdateDedicatedModel = async (type: "characterStateModel" | "questEngineModel" | "fallbackModel" | "mempalaceModel", newModel: string) => {
    setIsSavingDedicatedModels(true);
    setDedicatedModelsSuccessMsg(null);
    try {
      const updatedConfig = {
        characterStateModel: type === "characterStateModel" ? newModel : characterStateModel,
        questEngineModel: type === "questEngineModel" ? newModel : questEngineModel,
        mempalaceModel: type === "mempalaceModel" ? newModel : mempalaceModel,
        fallbackModel: type === "fallbackModel" ? newModel : fallbackModel,
      };

      if (type === "characterStateModel") {
        setCharacterStateModel(newModel);
        localStorage.setItem("CHARACTER_STATE_MODEL", newModel);
      } else if (type === "questEngineModel") {
        setQuestEngineModel(newModel);
        localStorage.setItem("QUEST_ENGINE_MODEL", newModel);
      } else if (type === "mempalaceModel") {
        setMempalaceModel(newModel);
        localStorage.setItem("MEMPALACE_MODEL", newModel);
      } else if (type === "fallbackModel") {
        setFallbackModel(newModel);
        localStorage.setItem("FALLBACK_MODEL", newModel);
      }

      await fetch("/api/neural-models-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      setDedicatedModelsSuccessMsg(
        type === "questEngineModel"
          ? `Quest Engine model set to "${newModel}"`
          : type === "mempalaceModel"
          ? `MemPalace Consolidation model set to "${newModel}"`
          : type === "characterStateModel"
          ? `Character State model set to "${newModel}"`
          : `Fallback model set to "${newModel}"`
      );
      setTimeout(() => setDedicatedModelsSuccessMsg(null), 3000);
    } catch (e: any) {
      console.error("Failed to update dedicated model", e);
    } finally {
      setIsSavingDedicatedModels(false);
    }
  };

  const handleSetDefaultModel = async () => {
    if (!selectedModel) return;
    setIsSettingDefault(true);
    setDefaultModelSuccessMsg(null);
    try {
      localStorage.setItem("DEFAULT_INFERENCE_MODEL", selectedModel);
      localStorage.setItem("ACTIVE_INFERENCE_MODEL", selectedModel);
      setCurrentDefaultModel(selectedModel);
      if (onSetDefaultModel) {
        onSetDefaultModel(selectedModel);
      }
      await fetch("/api/default-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultModel: selectedModel }),
      });
      await fetch("/api/active-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel }),
      }).catch(() => {});
      setDefaultModelSuccessMsg(`Active model "${selectedModel}" is now set as the default model!`);
      setTimeout(() => setDefaultModelSuccessMsg(null), 3500);
    } catch (e: any) {
      console.error("Failed to set default model", e);
    } finally {
      setIsSettingDefault(false);
    }
  };

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const fetchErrorLogCount = async () => {
    try {
      const res = await fetch("/api/error-logs");
      if (res.ok) {
        const data = await res.json();
        setErrorLogCount(Array.isArray(data.logs) ? data.logs.length : 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchErrorLogCount();
    const interval = setInterval(fetchErrorLogCount, 15000);
    return () => clearInterval(interval);
  }, [activeSection]);

  // --- Samplers State ---
  const [samplers, setSamplers] = useState<GlobalGenerationSettings | null>(null);
  const [isSavingSamplers, setIsSavingSamplers] = useState(false);
  const [samplerFeedback, setSamplerFeedback] = useState<string | null>(null);

  // --- Local Server Settings State ---
  const [serverSettings, setServerSettings] = useState<LocalServerSettings | null>(null);
  const [isScanningServers, setIsScanningServers] = useState(false);
  const [serverStatuses, setServerStatuses] = useState<
    Record<string, { status: "testing" | "online" | "offline"; latency?: number; modelCount?: number; error?: string }>
  >({});
  const [editingServer, setEditingServer] = useState<LocalServerConfig | null>(null);
  const [isAddingNewServer, setIsAddingNewServer] = useState(false);

  // --- Custom Model State ---
  const [customModelInput, setCustomModelInput] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Load initial settings on mount
  useEffect(() => {
    loadSamplers();
    loadServerSettings();
  }, []);

  // --- Samplers Logic ---
  const loadSamplers = async () => {
    try {
      const res = await fetch(`/api/generation-settings?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setSamplers(data);
      }
    } catch (e) {
      console.error("Failed to load generation settings", e);
    }
  };

  const handleSaveSamplers = async () => {
    if (!samplers) return;
    setIsSavingSamplers(true);
    try {
      const res = await fetch("/api/generation-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplers),
      });
      if (res.ok) {
        setSamplerFeedback("Generation settings saved successfully.");
        setTimeout(() => setSamplerFeedback(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingSamplers(false);
    }
  };

  const handleResetSamplers = () => {
    const defaults: GlobalGenerationSettings = {
      maxTokens: 250,
      temperature: 0.9,
      topP: 1.0,
      topK: 0,
      frequencyPenalty: 0.1,
      presencePenalty: 0.0,
      repetitionPenalty: 1.05,
      minP: 0.06,
      mirostat: 0,
      mirostatTau: 5.0,
      mirostatEta: 0.1,
      tfsZ: 0.95,
      logitBias: {},
      dryMultiplier: 0.9,
      dryBase: 1.75,
      dryAllowedLength: 2,
      drySequenceBreakers: ["\n", ":", "\"", "*"],
    };
    setSamplers(defaults);
    setSamplerFeedback("Reset to recommended defaults. Click 'Save' to apply.");
    setTimeout(() => setSamplerFeedback(null), 3500);
  };

  const updateSamplerField = <K extends keyof GlobalGenerationSettings>(key: K, value: GlobalGenerationSettings[K]) => {
    if (!samplers) return;
    setSamplers({ ...samplers, [key]: value });
  };

  // --- Server Logic ---
  const loadServerSettings = async () => {
    try {
      const res = await fetch("/api/local-servers/config");
      if (res.ok) {
        const data = await res.json();
        setServerSettings(data);
      }
    } catch (e) {
      console.error("Failed to load local servers config", e);
    }
  };

  const testSingleServer = async (server: LocalServerConfig) => {
    setServerStatuses((prev) => ({
      ...prev,
      [server.id]: { status: "testing" },
    }));

    try {
      const res = await fetch("/api/local-servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(server),
      });
      const data = await res.json();

      if (data.success) {
        setServerStatuses((prev) => ({
          ...prev,
          [server.id]: {
            status: "online",
            latency: data.latencyMs,
            modelCount: data.models?.length || 0,
          },
        }));
        return data.models || [];
      } else {
        setServerStatuses((prev) => ({
          ...prev,
          [server.id]: {
            status: "offline",
            error: data.error,
          },
        }));
        return [];
      }
    } catch (err: any) {
      setServerStatuses((prev) => ({
        ...prev,
        [server.id]: {
          status: "offline",
          error: err.message,
        },
      }));
      return [];
    }
  };

  const scanAllServers = async () => {
    setIsScanningServers(true);
    try {
      await onRefreshLocalModels();
      if (serverSettings?.servers) {
        for (const server of serverSettings.servers) {
          if (server.enabled) {
            testSingleServer(server);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningServers(false);
    }
  };

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    if (!serverSettings) return;
    const updated = serverSettings.servers.map((s) => (s.id === serverId ? { ...s, enabled } : s));
    const newSettings = { ...serverSettings, servers: updated };
    setServerSettings(newSettings);
    await fetch("/api/local-servers/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    if (enabled) {
      const target = updated.find((s) => s.id === serverId);
      if (target) testSingleServer(target);
    }
  };

  const handleSaveServerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer || !serverSettings) return;

    let updated = [...serverSettings.servers];
    const exists = updated.some((s) => s.id === editingServer.id);
    if (exists) {
      updated = updated.map((s) => (s.id === editingServer.id ? editingServer : s));
    } else {
      updated.push(editingServer);
    }

    const newSettings = { ...serverSettings, servers: updated };
    setServerSettings(newSettings);
    await fetch("/api/local-servers/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    testSingleServer(editingServer);
    setEditingServer(null);
    setIsAddingNewServer(false);
    onRefreshLocalModels();
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!serverSettings) return;
    const updated = serverSettings.servers.filter((s) => s.id !== serverId);
    const newSettings = { ...serverSettings, servers: updated };
    setServerSettings(newSettings);
    await fetch("/api/local-servers/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    setEditingServer(null);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#0A0A0C]">
      {/* Settings Sub-Navigation Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#2A2A2E] bg-[#0E0E12] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div>
            <h2 className="text-xs uppercase font-mono tracking-widest text-amber-500 font-semibold">Settings</h2>
            <p className="text-[11px] text-gray-500">Configuration & Engines</p>
          </div>
          <button
            onClick={onBackToChat}
            className="text-xs px-2.5 py-1 rounded bg-[#1C1C20] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#2E2E35] transition-colors"
          >
            ← Chat
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-x-auto flex md:flex-col gap-1">
          <button
            onClick={() => setActiveSection("status")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "status"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <Activity size={14} className="shrink-0 text-amber-400" />
            <span>Status</span>
          </button>

          <button
            onClick={() => setActiveSection("model_servers")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "model_servers"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <Server size={14} className="shrink-0 text-amber-400" />
            <span>Neural Model & Servers</span>
          </button>

          <button
            onClick={() => setActiveSection("theme")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "theme"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <Palette size={14} className="shrink-0 text-amber-400" />
            <span>Theme & UI</span>
          </button>

          <button
            onClick={() => setActiveSection("samplers")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "samplers"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <Sliders size={14} className="shrink-0 text-amber-400" />
            <span>Generation Samplers</span>
          </button>

          <button
            onClick={() => setActiveSection("mempalace")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "mempalace"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <Landmark size={14} className="shrink-0 text-amber-400" />
            <span>MemPalace</span>
          </button>

          <button
            onClick={() => setActiveSection("mood_engine")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "mood_engine"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <Brain size={14} className="shrink-0 text-amber-400" />
            <span>State & Mood Engine</span>
          </button>

          <button
            onClick={() => setActiveSection("questing_system")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "questing_system"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <ShieldCheck size={14} className="shrink-0 text-amber-400" />
            <span>Questing System</span>
          </button>

          <button
            onClick={() => setActiveSection("import_chat")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "import_chat"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <Upload size={14} className="shrink-0 text-amber-400" />
            <span>Import External Chat</span>
          </button>

          <button
            onClick={() => setActiveSection("error_logs")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all whitespace-nowrap ${
              activeSection === "error_logs"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={14} className="shrink-0 text-rose-400" />
              <span>Error Logs</span>
            </div>
            {errorLogCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/50">
                {errorLogCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection("about")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all whitespace-nowrap ${
              activeSection === "about"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Info size={14} className="shrink-0 text-amber-400" />
              <span>About & Features</span>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#1E1E26] text-amber-400/90 border border-amber-500/20">
              {CHANGELOG_DATA[0]?.version || "v0.50"}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("changelog")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all whitespace-nowrap ${
              activeSection === "changelog"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <History size={14} className="shrink-0 text-amber-400" />
              <span>Changelog</span>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {CHANGELOG_DATA.length} updates
            </span>
          </button>

          <button
            onClick={() => setActiveSection("license")}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeSection === "license"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#18181D]"
            }`}
          >
            <ScrollText size={14} className="shrink-0 text-amber-400" />
            <span>License</span>
          </button>
        </nav>

        {/* Active Model Indicator footer in sidebar */}
        <div className="mt-auto p-3.5 border-t border-[#2A2A2E] hidden md:block text-xs bg-[#0A0A0C]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Active Model</span>
            {serverConnectionStatus && (
              <div
                onClick={onCheckServerConnection}
                className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#2A2A32] cursor-pointer transition-colors"
                title={`Server Connection: ${
                  serverConnectionStatus === "connected"
                    ? "Connected"
                    : serverConnectionStatus === "slow"
                    ? "Connected (Slow)"
                    : "Not Connected"
                }${serverLatency !== null ? ` (${serverLatency}ms)` : ""} - Target: ${serverTarget || "Server"}. Click to re-test.`}
              >
                <span className="relative flex h-2 w-2">
                  {serverConnectionStatus === "connected" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  )}
                  {serverConnectionStatus === "slow" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      serverConnectionStatus === "connected"
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                        : serverConnectionStatus === "slow"
                        ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]"
                        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                    }`}
                  />
                </span>
                <span
                  className={`text-[10px] font-medium font-mono ${
                    serverConnectionStatus === "connected"
                      ? "text-emerald-400"
                      : serverConnectionStatus === "slow"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {serverConnectionStatus === "connected"
                    ? "Online"
                    : serverConnectionStatus === "slow"
                    ? "Slow"
                    : "Offline"}
                  {serverLatency !== null && serverConnectionStatus !== "disconnected" && (
                    <span className="text-[9px] text-gray-400 ml-1 font-mono">({serverLatency}ms)</span>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Server
              size={12}
              className={`shrink-0 ${
                serverConnectionStatus === "connected"
                  ? "text-emerald-400/80"
                  : serverConnectionStatus === "slow"
                  ? "text-yellow-400/80"
                  : "text-red-400/80"
              }`}
            />
            <span className="font-mono text-amber-400/90 text-[11px] truncate block" title={selectedModel}>
              {selectedModel}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl w-full mx-auto">
        {/* ============================================================ */}
        {/* 0. SYSTEM STATUS & DIAGNOSTICS */}
        {/* ============================================================ */}
        {activeSection === "status" && (
          <SystemStatusSection
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
            onNavigateToSection={(sec) => setActiveSection(sec)}
            geminiApiKey={geminiApiKey}
          />
        )}

        {/* ============================================================ */}
        {/* 1. NEURAL MODEL & LOCAL SERVERS */}
        {/* ============================================================ */}
        {activeSection === "model_servers" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <div>
              <h1 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <Server size={18} className="text-amber-400" />
                Neural Model & Inference Servers
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Choose your active LLM or connect local backends including Jan, Ollama, LM Studio, and OpenAI-compatible endpoints.
              </p>
            </div>

            {/* Active Model Selector Card */}
            {(() => {
              const isPredefinedGemini = [
                "gemini-3.8-flash",
                "gemini-3.1-flash-lite",
                "gemini-3.1-pro-preview",
              ].includes(selectedModel);
              const isDiscoveredModel = localModels.some((m) => m.id === selectedModel);
              const isKnownModel = isPredefinedGemini || isDiscoveredModel;

              const openrouterServer = serverSettings?.servers?.find((s) => s.type === "openrouter");
              const isOpenRouterActive = selectedModel?.startsWith("openrouter:");
              const isOpenRouterMissingKey =
                isOpenRouterActive && (!openrouterServer?.apiKey || !openrouterServer.apiKey.trim() || !openrouterServer.enabled);

              return (
                <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">Active Inference Model</h3>
                    {selectedModel !== (currentDefaultModel || "gemini-3.8-flash") && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMode(false);
                          const target = currentDefaultModel || "gemini-3.8-flash";
                          onSelectModel(target);
                          localStorage.setItem("ACTIVE_INFERENCE_MODEL", target);
                          fetch("/api/active-model", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ model: target }),
                          }).catch(() => {});
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#18181D] hover:bg-[#202026] border border-[#2B2B33] text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        title="Switch back to default model"
                      >
                        <RotateCcw size={12} />
                        <span>Switch to Default ({currentDefaultModel || "gemini-3.8-flash"})</span>
                      </button>
                    )}
                  </div>

                  {isOpenRouterMissingKey && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs space-y-2 text-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-300">OpenRouter API Key Missing</p>
                          <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                            The selected model <span className="font-mono text-amber-300 font-semibold">{selectedModel}</span> requires an OpenRouter API key. Without this key, requests will fail or automatically fall back to Gemini.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomMode(false);
                            const target = currentDefaultModel || "gemini-3.8-flash";
                            onSelectModel(target);
                            localStorage.setItem("ACTIVE_INFERENCE_MODEL", target);
                            fetch("/api/active-model", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ model: target }),
                            }).catch(() => {});
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                          <Sparkles size={13} />
                          <span>Switch to {currentDefaultModel || "Gemini 3.8 Flash"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 block">Select from Available Models</label>
                      <select
                        value={isCustomMode ? "custom" : selectedModel}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setIsCustomMode(true);
                          } else {
                            setIsCustomMode(false);
                            onSelectModel(e.target.value);
                          }
                        }}
                        className="w-full bg-[#18181D] border border-[#2E2E35] rounded-lg p-2.5 text-xs text-gray-200 font-mono focus:border-amber-500/60 focus:outline-none"
                      >
                        <optgroup label="Google Gemini Cloud Models">
                          <option value="gemini-3.8-flash">Gemini 3.8 Flash (Default / High Accuracy)</option>
                          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                        </optgroup>

                        {localModels.length > 0 && (
                          <optgroup label="Discovered Local Inference Models">
                            {localModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.serverName || "Local"}: {m.name}
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {!isKnownModel && selectedModel && !isCustomMode && (
                          <optgroup label="Current Active Model">
                            <option value={selectedModel}>
                              Active: {selectedModel}
                            </option>
                          </optgroup>
                        )}

                        <optgroup label="Custom Option">
                          <option value="custom">Custom Model Identifier...</option>
                        </optgroup>
                      </select>
                    </div>

                    {isCustomMode && (
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 block">Custom Model ID</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            placeholder="e.g. ollama:llama3 or jan:mistral"
                            className="flex-1 bg-[#18181D] border border-[#2E2E35] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:border-amber-500/60 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customModelInput.trim()) {
                                onSelectModel(customModelInput.trim());
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 text-xs text-gray-400 flex flex-wrap items-center justify-between gap-3 border-t border-[#222228]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Currently active: <strong className="font-mono text-amber-300">{selectedModel}</strong></span>
                      {currentDefaultModel && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#18181F] text-gray-400 border border-[#2B2B36] font-mono">
                          Default: <span className="text-amber-400 font-semibold">{currentDefaultModel}</span>
                        </span>
                      )}
                      {currentDefaultModel === selectedModel && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono font-medium">
                          <Check size={10} className="text-emerald-400" /> Active is Default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        id="set-default-model-btn"
                        type="button"
                        onClick={handleSetDefaultModel}
                        disabled={isSettingDefault || currentDefaultModel === selectedModel}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                          currentDefaultModel === selectedModel
                            ? "bg-[#1C1C22] text-gray-500 border border-[#2A2A33] cursor-default"
                            : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-amber-950/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        }`}
                        title="Set the current active model as the default model to use"
                      >
                        <Check size={13} className={isSettingDefault ? "animate-spin" : ""} />
                        <span>
                          {isSettingDefault
                            ? "Saving..."
                            : currentDefaultModel === selectedModel
                            ? "Default Model Set"
                            : "Set Default Model"}
                        </span>
                      </button>

                      <button
                        onClick={scanAllServers}
                        disabled={isScanningServers}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18181D] hover:bg-[#202026] border border-[#2B2B33] text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={isScanningServers ? "animate-spin" : ""} />
                        <span>Scan Local Ports</span>
                      </button>
                    </div>
                  </div>

                  {/* Nested Decoupled Pipeline Models Section */}
                  <div className="mt-4 pt-4 border-t border-[#222228] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-semibold text-amber-400 flex items-center gap-1.5">
                          <Compass size={13} className="text-amber-400" />
                          Dedicated Engine Models (Decoupled Pipeline)
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Assign standalone models solely for specialized tasks to prevent slowing down primary chat and keep state evaluation decoupled.
                        </p>
                      </div>
                      {isSavingDedicatedModels && (
                        <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                          <RefreshCw size={11} className="animate-spin" /> Saving...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Quest Engine Model Selector */}
                      <div className="bg-[#18181D] border border-[#2B2B33] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                            <Target size={13} className="text-amber-400" />
                            Quest Engine Model
                          </label>
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                            Quest State
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Dedicated neural model tasked strictly with evaluating chat objective fulfillment and quest progression.
                        </p>
                        <select
                          value={questEngineModel}
                          onChange={(e) => handleUpdateDedicatedModel("questEngineModel", e.target.value)}
                          className="w-full bg-[#121216] border border-[#2E2E35] rounded-md p-2 text-xs text-gray-200 font-mono focus:border-amber-500/60 focus:outline-none"
                        >
                          <optgroup label="Recommended Gemini Models">
                            <option value="gemini-3.8-flash">Gemini 3.8 Flash (High Accuracy / Default)</option>
                            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Fast)</option>
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Complex Quests)</option>
                          </optgroup>
                          {localModels.length > 0 && (
                            <optgroup label="Discovered Local Inference Models">
                              {localModels.map((m) => (
                                <option key={`qm-${m.id}`} value={m.id}>
                                  {m.serverName || "Local"}: {m.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {!["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"].includes(questEngineModel) &&
                            !localModels.some((m) => m.id === questEngineModel) && (
                              <optgroup label="Current Assigned Model">
                                <option value={questEngineModel}>{questEngineModel}</option>
                              </optgroup>
                            )}
                        </select>
                      </div>

                      {/* Character State & Mood Engine Model Selector */}
                      <div className="bg-[#18181D] border border-[#2B2B33] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                            <Brain size={13} className="text-rose-400" />
                            Character State & Mood Model
                          </label>
                          <span className="text-[10px] font-mono text-rose-400 bg-rose-400/10 border border-rose-400/20 px-1.5 py-0.5 rounded">
                            State Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Dedicated low-latency model for pre- and post-inference character vitals, mood shifts, and composure tracking.
                        </p>
                        <select
                          value={characterStateModel}
                          onChange={(e) => handleUpdateDedicatedModel("characterStateModel", e.target.value)}
                          className="w-full bg-[#121216] border border-[#2E2E35] rounded-md p-2 text-xs text-gray-200 font-mono focus:border-amber-500/60 focus:outline-none"
                        >
                          <optgroup label="Recommended Gemini Models">
                            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Balanced / Default)</option>
                            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Low Latency)</option>
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Deep Psychological Nuance)</option>
                          </optgroup>
                          {localModels.length > 0 && (
                            <optgroup label="Discovered Local Inference Models">
                              {localModels.map((m) => (
                                <option key={`csm-${m.id}`} value={m.id}>
                                  {m.serverName || "Local"}: {m.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {!["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"].includes(characterStateModel) &&
                            !localModels.some((m) => m.id === characterStateModel) && (
                              <optgroup label="Current Assigned Model">
                                <option value={characterStateModel}>{characterStateModel}</option>
                              </optgroup>
                            )}
                        </select>
                      </div>

                      {/* MemPalace Consolidation Model Selector */}
                      <div className="bg-[#18181D] border border-[#2B2B33] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                            <Database size={13} className="text-purple-400" />
                            MemPalace Consolidation Model
                          </label>
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 border border-purple-400/20 px-1.5 py-0.5 rounded">
                            Memory Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Dedicated neural model for MemPalace memory extraction and locus synthesis in the background.
                        </p>
                        <select
                          value={mempalaceModel}
                          onChange={(e) => handleUpdateDedicatedModel("mempalaceModel", e.target.value)}
                          className="w-full bg-[#121216] border border-[#2E2E35] rounded-md p-2 text-xs text-gray-200 font-mono focus:border-amber-500/60 focus:outline-none"
                        >
                          <optgroup label="Recommended Gemini Models">
                            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Balanced / Default)</option>
                            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Fast)</option>
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Deep Synthesis)</option>
                          </optgroup>
                          {localModels.length > 0 && (
                            <optgroup label="Discovered Local Inference Models">
                              {localModels.map((m) => (
                                <option key={`mpm-${m.id}`} value={m.id}>
                                  {m.serverName || "Local"}: {m.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {!["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"].includes(mempalaceModel) &&
                            !localModels.some((m) => m.id === mempalaceModel) && (
                              <optgroup label="Current Assigned Model">
                                <option value={mempalaceModel}>{mempalaceModel}</option>
                              </optgroup>
                            )}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#222228] space-y-4">
                      <div className="bg-[#18181D] border border-[#2B2B33] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                            <Shield size={13} className="text-emerald-400" />
                            Fallback Recovery Model
                          </label>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                            Failover Safety
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          The model used automatically if the primary or dedicated models fail to process inference. Set to "None" to disable auto-recovery.
                        </p>
                        <select
                          value={fallbackModel}
                          onChange={(e) => handleUpdateDedicatedModel("fallbackModel", e.target.value)}
                          className="w-full bg-[#121216] border border-[#2E2E35] rounded-md p-2 text-xs text-gray-200 font-mono focus:border-amber-500/60 focus:outline-none"
                        >
                          <option value="none">None (Disable Auto-Recovery)</option>
                          <optgroup label="Recommended Gemini Models">
                            <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                          </optgroup>
                          {localModels.length > 0 && (
                            <optgroup label="Discovered Local Inference Models">
                              {localModels.map((m) => (
                                <option key={`fsm-${m.id}`} value={m.id}>
                                  {m.serverName || "Local"}: {m.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {!["none", "gemini-3.8-flash", "gemini-3.1-flash-lite"].includes(fallbackModel) &&
                            !localModels.some((m) => m.id === fallbackModel) && (
                              <optgroup label="Current Assigned Model">
                                <option value={fallbackModel}>{fallbackModel}</option>
                              </optgroup>
                            )}
                        </select>
                      </div>
                    </div>

                    {dedicatedModelsSuccessMsg && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>{dedicatedModelsSuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  {defaultModelSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>{defaultModelSuccessMsg}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Custom Gemini API Key Settings */}
            <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400 flex items-center gap-2">
                  <Sparkles size={14} />
                  Custom Gemini API Key
                </h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Provide your own Gemini API Key to use your quota instead of the platform default.
                  Your key is securely stored in your browser's local storage and is sent securely in headers.
                  To get a key, visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Google AI Studio</a>.
                </p>
              </div>
              <div className="flex gap-3">
                <input
                  type="password"
                  placeholder="Enter your Gemini API Key..."
                  value={geminiApiKey}
                  onChange={(e) => onSetGeminiApiKey(e.target.value)}
                  className="flex-1 bg-[#18181D] border border-[#2E2E35] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:border-amber-500/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onSetGeminiApiKey("")}
                  className="px-3 py-2 rounded-lg bg-[#1C1C20] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-[#2E2E35] text-xs font-semibold transition-colors"
                  title="Clear API Key"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Configured Local Servers List */}
            <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">Local Inference Servers</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Manage Jan, Ollama, LM Studio, or local API bridges.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingServer({
                      id: `server_${Date.now()}`,
                      name: "Local Inference Server",
                      type: "jan",
                      baseUrl: "http://127.0.0.1:1337/v1",
                      enabled: true,
                      temperature: 0.7,
                      maxTokens: 2048,
                    });
                    setIsAddingNewServer(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1C1C20] hover:bg-amber-500/20 text-gray-200 hover:text-amber-300 border border-[#2E2E35] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={13} />
                  <span>Add Server</span>
                </button>
              </div>

              {serverSettings?.servers && serverSettings.servers.length > 0 ? (
                <div className="space-y-2.5">
                  {serverSettings.servers.map((server) => {
                    const status = serverStatuses[server.id];
                    return (
                      <div
                        key={server.id}
                        className="p-3.5 bg-[#18181D] border border-[#26262C] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-200">{server.name}</span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#202026] text-gray-400 border border-[#2C2C34]">
                              {server.type}
                            </span>
                            {status?.status === "online" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 size={10} /> {status.latency ? `${status.latency}ms` : "Online"}
                              </span>
                            )}
                            {status?.status === "offline" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                                <XCircle size={10} /> Offline
                              </span>
                            )}
                            {status?.status === "testing" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                <RefreshCw size={10} className="animate-spin" /> Testing...
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">{server.baseUrl}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => testSingleServer(server)}
                            className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-[#222228] hover:bg-[#2C2C35] rounded transition-colors"
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingServer(server);
                              setIsAddingNewServer(false);
                            }}
                            className="px-2.5 py-1 text-xs text-gray-300 hover:text-amber-300 bg-[#222228] hover:bg-[#2C2C35] rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleServer(server.id, !server.enabled)}
                            className={`px-2.5 py-1 text-xs rounded transition-colors ${
                              server.enabled
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-gray-800 text-gray-500"
                            }`}
                          >
                            {server.enabled ? "Enabled" : "Disabled"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteServer(server.id)}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete Server"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500">No local servers configured.</div>
              )}

              {/* Edit/Add Server Modal / Inline Form */}
              {editingServer && (
                <form onSubmit={handleSaveServerForm} className="mt-4 p-4 bg-[#15151A] border border-amber-500/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#25252D] pb-2">
                    <span className="text-xs font-semibold text-amber-400">
                      {isAddingNewServer ? "Add Local Server" : `Edit ${editingServer.name}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingServer(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">Server Name</label>
                      <input
                        type="text"
                        value={editingServer.name}
                        onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })}
                        className="w-full bg-[#0E0E12] border border-[#2E2E35] rounded p-2 text-gray-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">Server Type</label>
                      <select
                        value={editingServer.type}
                        onChange={(e) => {
                          const type = e.target.value as any;
                          let defaultUrl = editingServer.baseUrl;
                          if (type === "jan") defaultUrl = "http://127.0.0.1:1337";
                          if (type === "ollama") defaultUrl = "http://127.0.0.1:11434";
                          if (type === "lmstudio") defaultUrl = "http://127.0.0.1:1234";
                          if (type === "openrouter") defaultUrl = "https://openrouter.ai/api/v1";
                          if (type === "ngrok") defaultUrl = "https://your-tunnel.ngrok-free.app";
                          setEditingServer({ ...editingServer, type, baseUrl: defaultUrl });
                        }}
                        className="w-full bg-[#0E0E12] border border-[#2E2E35] rounded p-2 text-gray-200"
                      >
                        <option value="jan">Jan (Port 1337)</option>
                        <option value="ollama">Ollama (Port 11434)</option>
                        <option value="lmstudio">LM Studio (Port 1234)</option>
                        <option value="custom_openai">Custom OpenAI Endpoint</option>
                        <option value="openrouter">OpenRouter API</option>
                        <option value="ngrok">Ngrok Proxy</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-gray-400 mb-1">Base URL</label>
                      <input
                        type="text"
                        value={editingServer.baseUrl}
                        onChange={(e) => setEditingServer({ ...editingServer, baseUrl: e.target.value })}
                        placeholder="http://127.0.0.1:1337/v1"
                        className="w-full bg-[#0E0E12] border border-[#2E2E35] rounded p-2 text-gray-200 font-mono"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-gray-400 mb-1 flex items-center gap-1.5"><Shield size={12}/> API Key (Optional, Required for OpenRouter)</label>
                      <input
                        type="password"
                        value={editingServer.apiKey || ""}
                        onChange={(e) => setEditingServer({ ...editingServer, apiKey: e.target.value })}
                        placeholder="sk-or-v1-..."
                        className="w-full bg-[#0E0E12] border border-[#2E2E35] rounded p-2 text-gray-200 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingServer(null)}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded"
                    >
                      Save Server
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Setup Guide */}
            <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">Quick Connection Ports</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#18181D] rounded-lg border border-[#26262C]">
                  <p className="font-semibold text-amber-300">Jan</p>
                  <p className="font-mono text-gray-400 text-[11px] mt-1">http://127.0.0.1:1337/v1</p>
                  <p className="text-[10px] text-gray-500 mt-1">Start Local Server in Jan settings.</p>
                </div>
                <div className="p-3 bg-[#18181D] rounded-lg border border-[#26262C]">
                  <p className="font-semibold text-amber-300">Ollama</p>
                  <p className="font-mono text-gray-400 text-[11px] mt-1">http://127.0.0.1:11434/v1</p>
                  <p className="text-[10px] text-gray-500 mt-1">Supports native OpenAI API compatibility.</p>
                </div>
                <div className="p-3 bg-[#18181D] rounded-lg border border-[#26262C]">
                  <p className="font-semibold text-amber-300">LM Studio</p>
                  <p className="font-mono text-gray-400 text-[11px] mt-1">http://127.0.0.1:1234/v1</p>
                  <p className="text-[10px] text-gray-500 mt-1">Click "Start Server" in the Developer tab.</p>
                </div>
              </div>
            </div>

            {/* Full Setup Instructions for Jan AI, Ollama, and LM Studio (Linux & Windows) */}
            <LocalServerSetupGuide />
          </div>
        )}

        {/* ============================================================ */}
        {/* 2.5 THEME SETTINGS */}
        {/* ============================================================ */}
        {activeSection === "theme" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <ThemeSettingsSection
              themeSettings={themeSettings}
              onUpdate={onUpdateThemeSettings}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. GENERATION SAMPLERS */}
        {/* ============================================================ */}
        {activeSection === "samplers" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <Sliders size={18} className="text-amber-400" />
                  Generation & Sampler Parameters
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  Tune temperature, repetition penalties, Min-P, Mirostat, and sequence breakers for model inference.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSamplers}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-[#18181D] border border-[#282830] rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveSamplers}
                  disabled={isSavingSamplers || !samplers}
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>{isSavingSamplers ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </div>

            {samplerFeedback && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-center gap-2">
                <Check size={14} className="text-amber-400" />
                <span>{samplerFeedback}</span>
              </div>
            )}

            {samplers ? (
              <div className="space-y-6">
                {/* Core Samplers Card */}
                <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-4">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">Core Sampling</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Max Output Tokens</span>
                        <span className="font-mono text-amber-400">{samplers.maxTokens}</span>
                      </div>
                      <input
                        type="range"
                        min="128"
                        max="8192"
                        step="128"
                        value={samplers.maxTokens}
                        onChange={(e) => updateSamplerField("maxTokens", parseInt(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Length ceiling for generated message response.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Temperature</span>
                        <span className="font-mono text-amber-400">{samplers.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={samplers.temperature}
                        onChange={(e) => updateSamplerField("temperature", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Controls randomness. 0.9 is balanced; higher is creative.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Top-P (Nucleus)</span>
                        <span className="font-mono text-amber-400">{samplers.topP}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={samplers.topP}
                        onChange={(e) => updateSamplerField("topP", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Top-K</span>
                        <span className="font-mono text-amber-400">{samplers.topK}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={samplers.topK}
                        onChange={(e) => updateSamplerField("topK", parseInt(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Repetition & Penalties Card */}
                <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-4">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">Repetition & Penalties</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Frequency Penalty</span>
                        <span className="font-mono text-amber-400">{samplers.frequencyPenalty}</span>
                      </div>
                      <input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.05"
                        value={samplers.frequencyPenalty}
                        onChange={(e) => updateSamplerField("frequencyPenalty", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Reduces repetition based on frequency.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Presence Penalty</span>
                        <span className="font-mono text-amber-400">{samplers.presencePenalty}</span>
                      </div>
                      <input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.05"
                        value={samplers.presencePenalty}
                        onChange={(e) => updateSamplerField("presencePenalty", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Encourages introducing novel topics.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Repetition Penalty</span>
                        <span className="font-mono text-amber-400">{samplers.repetitionPenalty}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.05"
                        value={samplers.repetitionPenalty}
                        onChange={(e) => updateSamplerField("repetitionPenalty", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Local model penalty multiplier (1.05 default).</p>
                    </div>
                  </div>
                </div>

                {/* Advanced Samplers Card */}
                <div className="bg-[#121216] border border-[#2A2A2E] rounded-xl p-5 space-y-4">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-400">Advanced Local Samplers (Min-P, TFS, Mirostat, DRY)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Min-P</span>
                        <span className="font-mono text-amber-400">{samplers.minP}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={samplers.minP}
                        onChange={(e) => updateSamplerField("minP", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Dynamic threshold relative to top probability.</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>Tail Free Sampling (TFS-Z)</span>
                        <span className="font-mono text-amber-400">{samplers.tfsZ}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={samplers.tfsZ}
                        onChange={(e) => updateSamplerField("tfsZ", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">1.0 = disabled.</p>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-medium mb-1">Mirostat Mode</label>
                      <select
                        value={samplers.mirostat}
                        onChange={(e) => updateSamplerField("mirostat", parseInt(e.target.value))}
                        className="w-full bg-[#0E0E12] border border-[#2E2E35] rounded p-2 text-gray-200"
                      >
                        <option value={0}>Disabled</option>
                        <option value={1}>Mirostat 1.0</option>
                        <option value={2}>Mirostat 2.0</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-gray-300 font-medium mb-1">
                        <span>DRY Multiplier</span>
                        <span className="font-mono text-amber-400">{samplers.dryMultiplier}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={samplers.dryMultiplier}
                        onChange={(e) => updateSamplerField("dryMultiplier", parseFloat(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-xs text-center py-8">Loading sampler parameters...</div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* MEMPALACE SETTINGS */}
        {/* ============================================================ */}
        {activeSection === "mempalace" && (
          <MemPalaceSettingsSection />
        )}

        {/* ============================================================ */}
        {/* STATE & MOOD DETECTION ENGINE */}
        {/* ============================================================ */}
        {activeSection === "mood_engine" && (
          <MoodEngineSettingsSection />
        )}

        {/* ============================================================ */}
        {/* QUESTING SYSTEM */}
        {/* ============================================================ */}
        {activeSection === "questing_system" && (
          <QuestingSystemSettingsSection />
        )}

        {/* ============================================================ */}
        {/* IMPORT CHAT */}
        {/* ============================================================ */}
        {activeSection === "import_chat" && (
          <ImportChatSection 
            personalities={personalities} 
            selectedModel={selectedModel} 
          />
        )}

        {/* ============================================================ */}
        {/* 6. ERROR LOGS */}
        {/* ============================================================ */}
        {activeSection === "error_logs" && (
          <ErrorLogsView onBackToChat={onBackToChat} />
        )}

        {/* ============================================================ */}
        {/* 7. ABOUT & FEATURES DIRECTORY */}
        {/* ============================================================ */}
        {activeSection === "about" && (
          <AboutSection
            onNavigateToSection={(sec) => setActiveSection(sec)}
            onBackToChat={onBackToChat}
            selectedModel={selectedModel}
          />
        )}

        {/* ============================================================ */}
        {/* 8. APPLICATION CHANGELOG & UPDATES */}
        {/* ============================================================ */}
        {activeSection === "changelog" && (
          <ChangelogSection
            onNavigateToSection={(sec) => setActiveSection(sec)}
            onBackToChat={onBackToChat}
          />
        )}

        {/* ============================================================ */}
        {/* 9. LICENSE */}
        {/* ============================================================ */}
        {activeSection === "license" && (
          <LicenseSection />
        )}
      </main>
    </div>
  );
}
