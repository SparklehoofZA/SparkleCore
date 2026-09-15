import { useState, useEffect } from "react";
import { X, Save, RefreshCw, Loader2 } from "lucide-react";
import { GlobalGenerationSettings } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalGenerationSettingsModal({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<GlobalGenerationSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/generation-settings?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await fetch("/api/generation-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset to default settings?")) {
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
      setSettings(defaults);
    }
  };

  const updateSetting = <K extends keyof GlobalGenerationSettings>(key: K, value: GlobalGenerationSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2E]">
          <h2 className="text-lg font-semibold text-gray-200">Global Generation Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#2A2A2E] rounded text-gray-400 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 text-sm">
          {isFetching || !settings ? (
            <div className="text-gray-400 text-center py-8">Loading settings...</div>
          ) : (
            <div className="space-y-6">
              
              <div className="space-y-4 border-b border-[#2A2A2E] pb-6">
                <h3 className="text-amber-500 font-semibold text-base">Core Sampling</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Max Tokens (Length)</span>
                      <span className="text-gray-500">{settings.maxTokens}</span>
                    </label>
                    <input type="range" min="128" max="16384" step="128" value={settings.maxTokens} onChange={(e) => updateSetting("maxTokens", parseInt(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Maximum length of the generated response.</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Temperature</span>
                      <span className="text-gray-500">{settings.temperature}</span>
                    </label>
                    <input type="range" min="0" max="2" step="0.05" value={settings.temperature} onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Controls randomness. Higher is more creative.</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Top-P</span>
                      <span className="text-gray-500">{settings.topP}</span>
                    </label>
                    <input type="range" min="0" max="1" step="0.05" value={settings.topP} onChange={(e) => updateSetting("topP", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Top-K</span>
                      <span className="text-gray-500">{settings.topK}</span>
                    </label>
                    <input type="range" min="0" max="100" step="1" value={settings.topK} onChange={(e) => updateSetting("topK", parseInt(e.target.value))} className="w-full accent-amber-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-b border-[#2A2A2E] pb-6">
                <h3 className="text-amber-500 font-semibold text-base">Penalties & Repetition</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Frequency Penalty</span>
                      <span className="text-gray-500">{settings.frequencyPenalty}</span>
                    </label>
                    <input type="range" min="-2" max="2" step="0.05" value={settings.frequencyPenalty} onChange={(e) => updateSetting("frequencyPenalty", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Reduces chance of repeating words based on frequency. (Good for roleplay to stop catchphrases)</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Presence Penalty</span>
                      <span className="text-gray-500">{settings.presencePenalty}</span>
                    </label>
                    <input type="range" min="-2" max="2" step="0.05" value={settings.presencePenalty} onChange={(e) => updateSetting("presencePenalty", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Applies a flat penalty to any used token. (Forces new topics and vocabulary)</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Repetition Penalty</span>
                      <span className="text-gray-500">{settings.repetitionPenalty}</span>
                    </label>
                    <input type="range" min="1" max="2" step="0.05" value={settings.repetitionPenalty} onChange={(e) => updateSetting("repetitionPenalty", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Multiplier to prevent looping.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-b border-[#2A2A2E] pb-6">
                <h3 className="text-amber-500 font-semibold text-base">Advanced Samplers (Local Models)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Min-P</span>
                      <span className="text-gray-500">{settings.minP}</span>
                    </label>
                    <input type="range" min="0" max="1" step="0.01" value={settings.minP} onChange={(e) => updateSetting("minP", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Filters out low-prob tokens based on top token probability.</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Tail Free Sampling (TFS-Z)</span>
                      <span className="text-gray-500">{settings.tfsZ}</span>
                    </label>
                    <input type="range" min="0" max="2" step="0.05" value={settings.tfsZ} onChange={(e) => updateSetting("tfsZ", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Removes tail tokens. Good for creative storytelling. 1.0 = disabled.</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>Mirostat Mode</span>
                      <span className="text-gray-500">{settings.mirostat}</span>
                    </label>
                    <select value={settings.mirostat} onChange={(e) => updateSetting("mirostat", parseInt(e.target.value))} className="w-full bg-[#111114] border border-[#2A2A2E] rounded py-2 px-3 text-gray-200">
                      <option value={0}>Disabled</option>
                      <option value={1}>Mirostat 1.0</option>
                      <option value={2}>Mirostat 2.0</option>
                    </select>
                  </div>

                  {settings.mirostat > 0 && (
                    <>
                      <div>
                        <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                          <span>Mirostat Tau</span>
                          <span className="text-gray-500">{settings.mirostatTau}</span>
                        </label>
                        <input type="range" min="0" max="10" step="0.1" value={settings.mirostatTau} onChange={(e) => updateSetting("mirostatTau", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                          <span>Mirostat Eta</span>
                          <span className="text-gray-500">{settings.mirostatEta}</span>
                        </label>
                        <input type="range" min="0" max="1" step="0.01" value={settings.mirostatEta} onChange={(e) => updateSetting("mirostatEta", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-amber-500 font-semibold text-base">DRY (Don't Repeat Yourself) / Sequence Penalty</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                      <span>DRY Multiplier</span>
                      <span className="text-gray-500">{settings.dryMultiplier}</span>
                    </label>
                    <input type="range" min="0" max="1" step="0.05" value={settings.dryMultiplier} onChange={(e) => updateSetting("dryMultiplier", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[10px] text-gray-500 mt-1">Breaks repeating sequences. 0 = disabled.</p>
                  </div>

                  {settings.dryMultiplier > 0 && (
                    <>
                      <div>
                        <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                          <span>DRY Base</span>
                          <span className="text-gray-500">{settings.dryBase}</span>
                        </label>
                        <input type="range" min="1" max="2" step="0.05" value={settings.dryBase} onChange={(e) => updateSetting("dryBase", parseFloat(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-medium mb-1 flex justify-between">
                          <span>DRY Allowed Length</span>
                          <span className="text-gray-500">{settings.dryAllowedLength}</span>
                        </label>
                        <input type="range" min="1" max="10" step="1" value={settings.dryAllowedLength} onChange={(e) => updateSetting("dryAllowedLength", parseInt(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#2A2A2E] flex justify-between items-center bg-[#111114]">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            <RefreshCw size={16} /> Reset
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || !settings}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-6 py-2 rounded font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
