import React, { useState, useEffect } from "react";
import {
  Cpu,
  Server,
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  Sliders,
  SlidersHorizontal,
  ExternalLink,
  Shield,
  Layers,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { LocalServerConfig, LocalServerSettings, LocalModelInfo, LocalServerType } from "../types";

interface LocalServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

type TabType = "servers" | "models" | "guide";

export const LocalServerSettingsModal: React.FC<LocalServerSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("servers");
  const [settings, setSettings] = useState<LocalServerSettings | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<LocalModelInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Test statuses per server ID
  const [serverStatuses, setServerStatuses] = useState<
    Record<string, { status: "testing" | "online" | "offline"; latency?: number; modelCount?: number; error?: string }>
  >({});

  // Editing or adding new server
  const [editingServer, setEditingServer] = useState<LocalServerConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      scanAllServers();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/local-servers/config");
      if (res.ok) {
        const data: LocalServerSettings = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to load server settings", e);
    }
  };

  const saveSettings = async (newSettings: LocalServerSettings) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/local-servers/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setSettings(newSettings);
      }
    } catch (e) {
      console.error("Failed to save server settings", e);
    } finally {
      setIsSaving(false);
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
    setIsScanning(true);
    try {
      const res = await fetch("/api/local-models");
      if (res.ok) {
        const models: LocalModelInfo[] = await res.json();
        setDiscoveredModels(models);

        // Also test each configured server to update individual indicators
        if (settings?.servers) {
          for (const server of settings.servers) {
            if (server.enabled) {
              testSingleServer(server);
            }
          }
        }
      }
    } catch (e) {
      console.error("Scan failed", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    if (!settings) return;
    const updatedServers = settings.servers.map((s) => (s.id === serverId ? { ...s, enabled } : s));
    const newSettings = { ...settings, servers: updatedServers };
    await saveSettings(newSettings);
    if (enabled) {
      const target = updatedServers.find((s) => s.id === serverId);
      if (target) testSingleServer(target);
    }
  };

  const handleSaveServerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer || !settings) return;

    let updatedServers = [...settings.servers];
    const exists = updatedServers.some((s) => s.id === editingServer.id);

    if (exists) {
      updatedServers = updatedServers.map((s) => (s.id === editingServer.id ? editingServer : s));
    } else {
      updatedServers.push(editingServer);
    }

    const newSettings = { ...settings, servers: updatedServers };
    await saveSettings(newSettings);
    testSingleServer(editingServer);
    setEditingServer(null);
    setIsAddingNew(false);
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!settings) return;
    const updatedServers = settings.servers.filter((s) => s.id !== serverId);
    const newSettings = { ...settings, servers: updatedServers };
    await saveSettings(newSettings);
    setEditingServer(null);
  };

  const startAddNewServer = () => {
    setEditingServer({
      id: `server_${Date.now()}`,
      name: "Custom Local Inference API",
      type: "custom_openai",
      baseUrl: "http://127.0.0.1:8000/v1",
      enabled: true,
      temperature: 0.7,
      maxTokens: 2048,
    });
    setIsAddingNew(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141417] border border-[#2A2A2E] rounded-2xl w-full max-w-4xl h-[85vh] max-h-[780px] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2A2A2E] bg-[#101013] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Server size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-100 flex items-center gap-2">
                Local LLM & API Server Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-normal">
                  Jan • Ollama • LM Studio • Custom
                </span>
              </h2>
              <p className="text-xs text-gray-400">Configure local inference backends, Jan endpoints, and parameters.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={scanAllServers}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1F1F24] border border-[#333339] text-gray-200 hover:bg-[#2A2A32] hover:text-amber-300 transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={isScanning ? "animate-spin text-amber-400" : ""} />
              {isScanning ? "Probing Ports..." : "Scan Local Ports"}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#25252B] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2A2A2E] bg-[#0E0E11] px-6">
          <button
            onClick={() => {
              setActiveTab("servers");
              setEditingServer(null);
              setIsAddingNew(false);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "servers"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Server size={14} />
            Configured Servers ({settings?.servers?.length || 0})
          </button>
          <button
            onClick={() => {
              setActiveTab("models");
              setEditingServer(null);
              setIsAddingNew(false);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "models"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Cpu size={14} />
            Discovered Models ({discoveredModels.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("guide");
              setEditingServer(null);
              setIsAddingNew(false);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "guide"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <HelpCircle size={14} />
            Jan & Local Setup Guides
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: CONFIGURED SERVERS */}
          {activeTab === "servers" && (
            <div>
              {editingServer ? (
                /* Edit Server Form */
                <form onSubmit={handleSaveServerForm} className="bg-[#1A1A1E] border border-[#2E2E35] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2E2E35] pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Settings size={14} />
                      {isAddingNew ? "Add Local Inference Server" : `Configure: ${editingServer.name}`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingServer(null);
                        setIsAddingNew(false);
                      }}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Server Name
                      </label>
                      <input
                        type="text"
                        value={editingServer.name}
                        onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })}
                        className="w-full bg-[#121215] border border-[#2E2E35] rounded-lg px-3 py-2 text-xs text-gray-100 focus:border-amber-500/50 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Server Type
                      </label>
                      <select
                        value={editingServer.type}
                        onChange={(e) => {
                          const type = e.target.value as LocalServerType;
                          let defaultUrl = editingServer.baseUrl;
                          if (type === "jan") defaultUrl = "http://127.0.0.1:1337";
                          if (type === "ollama") defaultUrl = "http://127.0.0.1:11434";
                          if (type === "lmstudio") defaultUrl = "http://127.0.0.1:1234";
                          if (type === "openrouter") defaultUrl = "https://openrouter.ai/api/v1";
                          if (type === "ngrok") defaultUrl = "https://your-tunnel.ngrok-free.app";
                          setEditingServer({ ...editingServer, type, baseUrl: defaultUrl });
                        }}
                        className="w-full bg-[#121215] border border-[#2E2E35] rounded-lg px-3 py-2 text-xs text-gray-100 focus:border-amber-500/50 outline-none"
                      >
                        <option value="jan">Jan AI (Local API Server)</option>
                        <option value="ollama">Ollama</option>
                        <option value="lmstudio">LM Studio</option>
                        <option value="custom_openai">Custom OpenAI / LAN Server / vLLM</option>
                        <option value="openrouter">OpenRouter API</option>
                        <option value="ngrok">Ngrok Proxy</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      API Server Base URL
                    </label>
                    <input
                      type="text"
                      value={editingServer.baseUrl}
                      onChange={(e) => setEditingServer({ ...editingServer, baseUrl: e.target.value })}
                      placeholder="e.g. http://127.0.0.1:1337 or http://192.168.1.50:8000/v1"
                      className="w-full bg-[#121215] border border-[#2E2E35] rounded-lg px-3 py-2 text-xs text-gray-100 font-mono focus:border-amber-500/50 outline-none"
                      required
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {editingServer.type === "jan" && "Jan's default server port is 1337 (http://127.0.0.1:1337)."}
                      {editingServer.type === "ollama" && "Ollama's default server port is 11434 (http://127.0.0.1:11434)."}
                      {editingServer.type === "lmstudio" && "LM Studio's default server port is 1234 (http://127.0.0.1:1234)."}
                      {editingServer.type === "custom_openai" && "Specify any OpenAI-compatible API base URL (LAN IP or domain)."}
                      {editingServer.type === "openrouter" && "OpenRouter's API URL is https://openrouter.ai/api/v1."}
                      {editingServer.type === "ngrok" && "Your Ngrok public URL (e.g. https://<id>.ngrok-free.app)."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                        <Shield size={12} /> Optional API Key / Bearer Token
                      </label>
                      <input
                        type="password"
                        value={editingServer.apiKey || ""}
                        onChange={(e) => setEditingServer({ ...editingServer, apiKey: e.target.value })}
                        placeholder="Leave empty if no auth required"
                        className="w-full bg-[#121215] border border-[#2E2E35] rounded-lg px-3 py-2 text-xs text-gray-100 focus:border-amber-500/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                        <Sliders size={12} /> Default Temperature ({editingServer.temperature ?? 0.7})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={editingServer.temperature ?? 0.7}
                        onChange={(e) => setEditingServer({ ...editingServer, temperature: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500 mt-2"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#2E2E35]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => testSingleServer(editingServer)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[#222228] hover:bg-[#2C2C34] text-gray-200 border border-[#3A3A42] flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} /> Test Endpoint
                      </button>
                      {serverStatuses[editingServer.id] && (
                        <span
                          className={`text-xs flex items-center gap-1 ${
                            serverStatuses[editingServer.id].status === "online"
                              ? "text-emerald-400"
                              : serverStatuses[editingServer.id].status === "testing"
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {serverStatuses[editingServer.id].status === "online" && (
                            <>
                              <CheckCircle2 size={13} /> {serverStatuses[editingServer.id].latency}ms (
                              {serverStatuses[editingServer.id].modelCount} models)
                            </>
                          )}
                          {serverStatuses[editingServer.id].status === "testing" && "Testing..."}
                          {serverStatuses[editingServer.id].status === "offline" && (
                            <>
                              <XCircle size={13} /> Offline
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isAddingNew && !["jan-default", "ollama-default", "lmstudio-default"].includes(editingServer.id) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteServer(editingServer.id)}
                          className="px-3 py-1.5 text-xs rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30"
                      >
                        {isSaving ? "Saving..." : "Save Server"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Server List */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Inference Providers & Endpoints
                      </h3>
                      <p className="text-xs text-gray-500">
                        Select and enable which local engines NeverForget queries for offline roleplay memory.
                      </p>
                    </div>
                    <button
                      onClick={startAddNewServer}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all"
                    >
                      <Plus size={13} /> Add Custom Server
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {settings?.servers?.map((server) => {
                      const status = serverStatuses[server.id];
                      return (
                        <div
                          key={server.id}
                          className={`p-4 rounded-xl border transition-all ${
                            server.enabled
                              ? "bg-[#18181C] border-[#2E2E35] hover:border-amber-500/30"
                              : "bg-[#131316] border-[#222226] opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  !server.enabled
                                    ? "bg-gray-600"
                                    : status?.status === "online"
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                                    : status?.status === "testing"
                                    ? "bg-amber-400 animate-ping"
                                    : status?.status === "offline"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                                }`}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-gray-100">{server.name}</h4>
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#25252C] text-gray-400 border border-[#33333C]">
                                    {server.type}
                                  </span>
                                  {server.id === "jan-default" && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                      JAN.AI
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">{server.baseUrl}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Status Details */}
                              {status && (
                                <div className="text-right mr-2 hidden sm:block">
                                  {status.status === "online" ? (
                                    <span className="text-xs text-emerald-400 font-mono">
                                      ● {status.latency}ms ({status.modelCount} models)
                                    </span>
                                  ) : status.status === "testing" ? (
                                    <span className="text-xs text-amber-400">Probing...</span>
                                  ) : (
                                    <span className="text-xs text-red-400">Unreachable</span>
                                  )}
                                </div>
                              )}

                              {/* Toggle Enabled */}
                              <button
                                type="button"
                                onClick={() => handleToggleServer(server.id, !server.enabled)}
                                className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                                  server.enabled
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    : "bg-[#222228] text-gray-500 border-[#33333C]"
                                }`}
                              >
                                {server.enabled ? "Active" : "Disabled"}
                              </button>

                              {/* Test Button */}
                              <button
                                onClick={() => testSingleServer(server)}
                                title="Test Connection"
                                className="p-1.5 rounded-lg bg-[#222228] text-gray-300 hover:text-amber-400 hover:bg-[#2C2C35] transition-colors border border-[#33333C]"
                              >
                                <RefreshCw size={13} />
                              </button>

                              {/* Configure Button */}
                              <button
                                onClick={() => setEditingServer(server)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#222228] text-gray-300 hover:text-amber-400 hover:bg-[#2C2C35] transition-colors border border-[#33333C] flex items-center gap-1"
                              >
                                <Settings size={12} /> Configure
                              </button>
                            </div>
                          </div>

                          {/* Error notice if offline */}
                          {status?.status === "offline" && server.enabled && (
                            <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                              <div className="flex-1">
                                <span>{status.error || "Cannot establish connection to server."}</span>
                                {server.type === "jan" && (
                                  <p className="text-[11px] text-red-400/80 mt-1">
                                    💡 Tip: Open Jan desktop app → Settings → Local API Server → Enable Local Server.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISCOVERED MODELS */}
          {activeTab === "models" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Discovered Local Models ({discoveredModels.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Click any discovered model from Jan, Ollama, or LM Studio to assign it as active Neural Core.
                  </p>
                </div>

                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span>Current active core:</span>
                  <span className="font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    {selectedModel}
                  </span>
                </div>
              </div>

              {isScanning ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-amber-400">
                  <RefreshCw size={24} className="animate-spin" />
                  <p className="text-xs uppercase tracking-widest text-gray-400">Querying active local server ports...</p>
                </div>
              ) : discoveredModels.length === 0 ? (
                <div className="p-8 border border-[#2E2E35] rounded-xl bg-[#18181C] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                    <Cpu size={24} />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-200">No Local Models Detected</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Start Jan, Ollama, or LM Studio on your machine and click "Scan Local Ports".
                  </p>
                  <button
                    onClick={() => setActiveTab("guide")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                  >
                    <HelpCircle size={13} /> View Setup Instructions
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {discoveredModels.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-950/20"
                            : "bg-[#18181C] border-[#2E2E35] hover:border-gray-500/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#25252C] text-amber-400 border border-amber-500/30">
                              {m.serverName}
                            </span>
                            {m.size && (
                              <span className="text-[10px] font-mono text-gray-400 bg-[#141417] px-1.5 py-0.5 rounded border border-[#2E2E35]">
                                {m.size}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-gray-100 break-all">{m.name}</h4>
                          <p className="text-[11px] font-mono text-gray-500 mt-1 break-all">{m.id}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#2A2A30] flex items-center justify-between">
                          {(() => {
                            const openrouterConfig = settings?.servers?.find((s) => s.type === "openrouter");
                            const hasOpenRouterKey = Boolean(openrouterConfig?.apiKey && openrouterConfig.apiKey.trim());
                            const isMissingKey = m.serverType === "openrouter" && !hasOpenRouterKey;

                            return (
                              <>
                                <span className="text-[10px] text-gray-400">
                                  {m.serverType === "jan" && "Jan Local Inference"}
                                  {m.serverType === "ollama" && "Ollama Engine"}
                                  {m.serverType === "lmstudio" && "LM Studio Server"}
                                  {m.serverType === "custom_openai" && "Custom Endpoint"}
                                  {m.serverType === "openrouter" && (isMissingKey ? "OpenRouter (No Key)" : "OpenRouter Proxy")}
                                  {m.serverType === "ngrok" && "Ngrok Proxy Endpoint"}
                                </span>
                                <button
                                  onClick={() => {
                                    if (isMissingKey) {
                                      setActiveTab("servers");
                                      return;
                                    }
                                    onSelectModel(m.id);
                                    onClose();
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    isMissingKey
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                                      : isSelected
                                      ? "bg-amber-500 text-black font-bold"
                                      : "bg-[#25252C] text-gray-200 hover:bg-amber-500/20 hover:text-amber-300 border border-[#3A3A42]"
                                  }`}
                                >
                                  {isMissingKey ? "Configure Key" : isSelected ? "Active Core" : "Use Model"}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JAN & LOCAL SETUP GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-6 text-gray-300 text-xs">
              {/* Jan Guide */}
              <div className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Server size={14} />
                  </div>
                  <h3>Jan (Jan.ai) Setup Guide</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Jan provides a clean local AI interface with a built-in OpenAI-compatible server on port{" "}
                  <code className="bg-[#1C1C22] px-1.5 py-0.5 rounded text-amber-300 font-mono">1337</code>.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300 leading-relaxed pl-1">
                  <li>Open the <strong>Jan desktop app</strong>.</li>
                  <li>Click on <strong>Settings (gear icon)</strong> in the bottom-left sidebar.</li>
                  <li>Go to <strong>Local API Server</strong>.</li>
                  <li>Turn ON <strong>Enable Local API Server</strong> (Port is <code className="font-mono">1337</code> by default).</li>
                  <li>Download or load any model (e.g., Llama 3, Mistral, Qwen) in Jan.</li>
                  <li>Click <strong>Scan Local Ports</strong> in NeverForget to auto-detect and connect.</li>
                </ol>
              </div>

              {/* Ollama Guide */}
              <div className="p-5 rounded-xl border border-[#2E2E35] bg-[#18181C] space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Cpu size={14} />
                  </div>
                  <h3>Ollama Setup Guide</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Ollama runs a background daemon serving models on port{" "}
                  <code className="bg-[#1C1C22] px-1.5 py-0.5 rounded text-amber-300 font-mono">11434</code>.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300 leading-relaxed pl-1">
                  <li>Install and run Ollama (<code className="font-mono text-gray-200">ollama serve</code>).</li>
                  <li>Pull your desired model: <code className="font-mono text-amber-300 bg-[#111114] px-1.5 py-0.5 rounded">ollama pull llama3.2</code> or <code className="font-mono text-amber-300 bg-[#111114] px-1.5 py-0.5 rounded">ollama pull deepseek-r1</code>.</li>
                  <li>NeverForget will automatically read your loaded models.</li>
                </ol>
              </div>

              {/* LM Studio Guide */}
              <div className="p-5 rounded-xl border border-[#2E2E35] bg-[#18181C] space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Layers size={14} />
                  </div>
                  <h3>LM Studio Setup Guide</h3>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300 leading-relaxed pl-1">
                  <li>Open LM Studio and switch to the <strong>Local Server</strong> tab (double-arrow icon).</li>
                  <li>Select a loaded GGUF model and click <strong>Start Server</strong> (default port: <code className="font-mono text-amber-300">1234</code>).</li>
                  <li>NeverForget connects instantly using OpenAI format.</li>
                </ol>
              </div>

              {/* Custom Remote / LAN Guide */}
              <div className="p-5 rounded-xl border border-[#2E2E35] bg-[#18181C] space-y-3">
                <div className="flex items-center gap-2 text-gray-300 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                    <SlidersHorizontal size={14} />
                  </div>
                  <h3>Custom / Remote GPU Rig</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Running vLLM, text-generation-webui, or llama.cpp on a secondary computer? Click <strong>Add Custom Server</strong> in the Configured Servers tab and enter the LAN IP (e.g. <code className="font-mono text-amber-300">http://192.168.1.100:8000/v1</code>).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#2A2A2E] bg-[#101013] flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>MemPalace memory indexing works natively with all local models.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#222228] hover:bg-[#2C2C34] text-gray-200 border border-[#33333C] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
