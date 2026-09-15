import React, { useState, useEffect, useRef } from "react";
import { X, Save, Trash2, Plus, Edit2, MapPin, Sparkles, User, Info, Check, Heart, Activity, Shirt, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Scenario, Personality } from "../types";
import { resolveRoleplayVariables, insertRoleplayMacro } from "../roleplayTemplate";
import { COMMON_MOOD_PRESETS } from "../moodPresets";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scenarios: Scenario[];
  characters?: Personality[];
  onScenariosChange: () => void;
  activeCharacterName?: string;
  activePersonalityName?: string;
  activeUserName?: string;
}

export function ScenarioManagerModal({
  isOpen,
  onClose,
  scenarios,
  characters = [],
  onScenariosChange,
  activeCharacterName,
  activePersonalityName,
  activeUserName,
}: Props) {
  const effectiveCharName = activeCharacterName || activePersonalityName || "Character";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [location, setLocation] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [context, setContext] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  // Dynamic status & scene condition state
  const [showDynamicStateSection, setShowDynamicStateSection] = useState(false);
  const [initialMood, setInitialMood] = useState("Neutral");
  const [initialLocation, setInitialLocation] = useState("");
  const [initialActivity, setInitialActivity] = useState("");
  const [initialOutfit, setInitialOutfit] = useState("");
  const [initialHealth, setInitialHealth] = useState(100);
  const [initialStamina, setInitialStamina] = useState(100);
  const [initialTrust, setInitialTrust] = useState(50);
  const [initialStress, setInitialStress] = useState(0);
  const [initialStatusEffects, setInitialStatusEffects] = useState<string[]>([]);
  const [newEffectTag, setNewEffectTag] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genDetails, setGenDetails] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const contextRef = useRef<HTMLTextAreaElement>(null);
  const firstMessageRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const relationshipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setConfirmDeleteId(null);
      setDeleteError(null);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCharacterId("");
    setRelationship("");
    setLocation("");
    setTimeOfDay("");
    setContext("");
    setFirstMessage("");

    setInitialMood("Neutral");
    setInitialLocation("");
    setInitialActivity("");
    setInitialOutfit("");
    setInitialHealth(100);
    setInitialStamina(100);
    setInitialTrust(50);
    setInitialStress(0);
    setInitialStatusEffects([]);
    setNewEffectTag("");
    setShowDynamicStateSection(false);
  };

  const startEdit = (s: Scenario) => {
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description || "");
    setCharacterId(s.characterId || "");
    setRelationship(s.relationship || "");
    setLocation(s.location || "");
    setTimeOfDay(s.timeOfDay || "");
    setContext(s.context);
    setFirstMessage(s.firstMessage || "");

    const st = s.state;
    setInitialMood(st?.mood || "Neutral");
    setInitialLocation(st?.location || s.location || "");
    setInitialActivity(st?.activity || "");
    setInitialOutfit(st?.outfit || "");
    setInitialHealth(typeof st?.health === "number" ? st.health : 100);
    setInitialStamina(typeof st?.stamina === "number" ? st.stamina : 100);
    setInitialTrust(typeof st?.trust === "number" ? st.trust : 50);
    setInitialStress(typeof st?.stress === "number" ? st.stress : 0);
    setInitialStatusEffects(Array.isArray(st?.statusEffects) ? st.statusEffects : []);
    setNewEffectTag("");
    setShowDynamicStateSection(false);
  };

  const startNew = () => {
    setEditingId("new");
    resetForm();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setConfirmDeleteId(null);
    setDeleteError(null);
    resetForm();
  };

  const handleGenerate = async () => {
    if (!genDetails.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: genDetails }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setName(data.name || "");
      setDescription(data.description || "");
      setLocation(data.location || "");
      setTimeOfDay(data.timeOfDay || "");
      setContext(data.context || "");
      setFirstMessage(data.firstMessage || "");
    } finally { setIsGenerating(false); }
  };

  const handleSave = async () => {
    if (!name.trim() || !context.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        characterId: characterId ? characterId : null,
        relationship: relationship.trim(),
        location: location.trim(),
        timeOfDay: timeOfDay.trim(),
        context: context.trim(),
        firstMessage: firstMessage.trim(),
        state: {
          health: initialHealth,
          stamina: initialStamina,
          statusEffects: initialStatusEffects,
          trust: initialTrust,
          mood: initialMood.trim() || "Neutral",
          stress: initialStress,
          location: (initialLocation.trim() || location.trim()) || "Unknown",
          activity: initialActivity.trim() || "Idle",
          outfit: initialOutfit.trim() || "Casual attire",
        },
      };
      let res;
      if (editingId && editingId !== "new") {
        res = await fetch(`/api/scenarios/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        onScenariosChange();
        cancelEdit();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingId === id) {
          cancelEdit();
        } else {
          setConfirmDeleteId(null);
        }
        onScenariosChange();
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.error || "Failed to delete scenario");
      }
    } catch (e: any) {
      console.error("Failed to delete scenario:", e);
      setDeleteError(e?.message || "Failed to delete scenario");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2E]">
          <div className="flex items-center gap-2">
            <MapPin className="text-amber-500" size={18} />
            <h2 className="text-lg font-semibold text-gray-200">Scenario Manager</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#2A2A2E] rounded text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-6">
          {/* List of Scenarios */}
          <div className={`md:w-1/3 flex flex-col gap-2 ${editingId ? 'hidden md:flex' : 'flex'}`}>
            <button
              onClick={startNew}
              className="flex items-center justify-center gap-2 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/30 transition-colors font-medium text-sm"
            >
              <Plus size={16} /> New Scenario
            </button>
            <div className="space-y-2 overflow-y-auto">
              {scenarios.map((s) => {
                const assignedChar = characters.find(c => c.id === s.characterId);
                return (
                  <div
                    key={s.id}
                    onClick={() => startEdit(s)}
                    className={`p-3 rounded-lg border cursor-pointer group transition-all ${
                      editingId === s.id
                        ? "bg-[#25252A] border-amber-500/50"
                        : "bg-[#18181C] border-[#2A2A2E] hover:border-[#3A3A40]"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-sm text-gray-200 line-clamp-1">{s.name}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(s); }}
                          className="text-gray-400 hover:text-amber-400 p-1 rounded-md hover:bg-black/30 transition-colors"
                          title="Edit scenario"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(confirmDeleteId === s.id ? null : s.id);
                          }}
                          className="text-gray-400 hover:text-red-400 p-1 rounded-md hover:bg-black/30 transition-colors"
                          title="Delete scenario"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>}

                    {/* Metadata Badges: Character allocation & Relationship */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {assignedChar ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                          <User size={10} /> {assignedChar.name}
                        </span>
                      ) : s.characterId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                          <User size={10} /> Assigned
                        </span>
                      ) : null}

                      {s.relationship && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-medium line-clamp-1 max-w-[160px]">
                          <Heart size={10} className="shrink-0" /> {s.relationship}
                        </span>
                      )}

                      {s.state?.mood && (
                        <span className="text-[10px] text-gray-400 bg-[#141418] px-1.5 py-0.5 rounded border border-[#2A2A32]">
                          {s.state.mood}
                        </span>
                      )}
                    </div>

                    {/* Inline Delete Confirmation on Card */}
                    {confirmDeleteId === s.id && (
                      <div
                        className="mt-2 p-2.5 bg-red-950/80 border border-red-500/40 rounded-lg text-xs space-y-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-red-200 text-[11px] font-medium block">
                          Permanently delete this scenario?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleDelete(s.id, e)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                          >
                            {isDeleting ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 bg-[#25252D] hover:bg-[#30303A] text-gray-300 rounded text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {scenarios.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4 italic">No scenarios yet.</p>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <div className={`flex-1 ${!editingId ? 'hidden md:flex items-center justify-center border-l border-[#2A2A2E] pl-6' : ''}`}>
            {!editingId ? (
              <div className="text-center text-gray-500 text-sm italic">
                Select a scenario to edit or create a new one.
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-2">
                  <h3 className="text-sm font-semibold text-gray-300">
                    {editingId === "new" ? "Create New Scenario" : "Edit Scenario"}
                  </h3>
                  <span className="text-[11px] text-amber-400 font-mono">Roleplay Standard Syntax</span>
                </div>

                {/* Standard Roleplay Definition Guide Banner */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                    <Sparkles size={13} className="text-amber-400 shrink-0" />
                    <span>Roleplay Definition Standard</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    When creating scenarios or entering details, the character is known as <code className="px-1 py-0.5 bg-black/50 text-amber-300 rounded font-mono font-semibold">{"{{char}}"}</code> and the user is known as <code className="px-1 py-0.5 bg-black/50 text-cyan-300 rounded font-mono font-semibold">{"{{user}}"}</code>.
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-300 bg-black/40 px-2.5 py-1.5 rounded-lg font-mono border border-white/5">
                    <span className="text-gray-500 text-[10px] uppercase font-semibold">Structure:</span>
                    <span>
                      <span className="text-amber-300 font-bold">{"{{char}}"}</span> works at coffee shop and <span className="text-cyan-300 font-bold">{"{{user}}"}</span> walks in
                    </span>
                  </div>
                </div>

                {/* Generate Random Scenario Section */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={13} /> Generate Random Scenario
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={genDetails}
                      onChange={(e) => setGenDetails(e.target.value)}
                      placeholder="Basic details (e.g., 'a medieval tavern')"
                      className="flex-1 bg-[#111114] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200"
                    />
                    <button type="button" onClick={handleGenerate} disabled={isGenerating} className="px-3 py-2 bg-amber-500 text-black rounded-lg text-xs font-semibold hover:bg-amber-600 disabled:opacity-50">
                      {isGenerating ? "Generating..." : "Generate"}
                    </button>
                  </div>
                </div>
                
                {/* Row 1: Scenario Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Scenario Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cozy Coffee Shop, Medieval Tavern..."
                    className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                  />
                </div>

                {/* Character Allocation Status */}
                {(() => {
                  const assignedChar = characters.find((c) => c.id === characterId);
                  return assignedChar ? (
                    <div className="p-2.5 bg-[#16161C] border border-[#2A2A32] rounded-lg text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <User size={13} className="text-amber-400 shrink-0" />
                        <span>Allocated Character: <strong className="text-amber-300 font-semibold">{assignedChar.name}</strong></span>
                      </div>
                      <span className="text-[10px] text-gray-500">Scenario allocation is managed in the Character screen</span>
                    </div>
                  ) : null;
                })()}

                {/* Row 1.5: Relationship Definition */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                      <Heart size={12} className="text-rose-400" /> Character Relationship with User
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-gray-500">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{char}}', relationship, setRelationship, relationshipRef.current)}
                        className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                      >
                        +{"\"{{char}}\""}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{user}}', relationship, setRelationship, relationshipRef.current)}
                        className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                      >
                        +{"\"{{user}}\""}
                      </button>
                    </div>
                  </div>
                  <input
                    ref={relationshipRef}
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder='e.g. {{char}} is an old friend of {{user}} who runs the local coffee shop, or "Rival warrior"'
                    className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                  />
                  {relationship.trim() && (
                    <p className="text-[11px] text-gray-400 italic">
                      Resolved: {resolveRoleplayVariables(relationship, effectiveCharName, activeUserName || "User")}
                    </p>
                  )}
                </div>
                
                {/* Row 2: Short Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400">Short Description (Optional)</label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-gray-500">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{char}}', description, setDescription, descRef.current)}
                        className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                      >
                        +{"\"{{char}}\""}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{user}}', description, setDescription, descRef.current)}
                        className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                      >
                        +{"\"{{user}}\""}
                      </button>
                    </div>
                  </div>
                  <input
                    ref={descRef}
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder='e.g. {{char}} works at coffee shop and {{user}} walks in'
                    className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                  />
                </div>

                {/* Row 3: Location & Time of Day */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Local Coffee Shop, Forest Outpost"
                      className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Time of Day</label>
                    <input
                      type="text"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                      placeholder="e.g. Just after sunset, Rainy morning"
                      className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                    />
                  </div>
                </div>

                {/* Row 4: Scenario Context / World State */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400">Scenario Context / World State</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 font-medium">Quick Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{char}}', context, setContext, contextRef.current)}
                        className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded text-xs font-mono transition-colors"
                        title='Insert {{char}} at cursor'
                      >
                        + {"\"{{char}}\""}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{user}}', context, setContext, contextRef.current)}
                        className="px-2 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded text-xs font-mono transition-colors"
                        title='Insert "user" at cursor'
                      >
                        + {"\"{{user}}\""}
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={contextRef}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder='e.g. {{char}} works at coffee shop and {{user}} walks in'
                    rows={5}
                    className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none resize-y min-h-[110px]"
                  />

                  {/* Live Resolved Preview */}
                  {context.trim() && (
                    <div className="p-2.5 bg-[#141418] border border-[#282830] rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400">
                        <span className="flex items-center gap-1 text-gray-300">
                          <Check size={11} className="text-emerald-400" />
                          Resolved Preview ({effectiveCharName} & {activeUserName || "User Persona"})
                        </span>
                        <span className="text-amber-400/80 font-mono text-[9px]">Live Substitution</span>
                      </div>
                      <p className="text-gray-300 italic text-[11px] leading-relaxed bg-black/20 p-1.5 rounded border border-white/5">
                        {resolveRoleplayVariables(context, effectiveCharName, activeUserName || "User")}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Row 5: First Message (Optional) */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-gray-400">First Message (Optional)</label>
                      <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                        "Dialogue" & *Actions*
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 font-medium">Quick Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{char}}', firstMessage, setFirstMessage, firstMessageRef.current)}
                        className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded text-xs font-mono transition-colors"
                        title='Insert active chat character ({{char}}) at cursor'
                      >
                        + {"\"{{char}}\""}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertRoleplayMacro('{{user}}', firstMessage, setFirstMessage, firstMessageRef.current)}
                        className="px-2 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded text-xs font-mono transition-colors"
                        title='Insert active user persona ("user") at cursor'
                      >
                        + {"\"{{user}}\""}
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={firstMessageRef}
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    placeholder='e.g. *looks up with a gentle smile and sets her book down* "Welcome in, "user"!" *gestures toward the counter*'
                    rows={3}
                    className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none resize-y min-h-[70px]"
                  />
                  {firstMessage.trim() && (
                    <div className="p-2.5 bg-[#141418] border border-[#282830] rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400">
                        <span className="flex items-center gap-1 text-gray-300">
                          <Check size={11} className="text-emerald-400" />
                          Resolved Preview
                        </span>
                      </div>
                      <p className="text-gray-300 italic text-[11px] leading-relaxed bg-black/20 p-1.5 rounded border border-white/5">
                        {resolveRoleplayVariables(firstMessage, effectiveCharName, activeUserName || "User")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Row 6: Initial Scene State & Dynamic Status (Moved from Character Screen) */}
                <div className="rounded-xl border border-[#2A2A34] bg-[#16161B] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDynamicStateSection(!showDynamicStateSection)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1A1A22] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-amber-400" />
                      <span className="text-xs font-semibold text-gray-200">
                        Initial Scene State & Dynamic Status
                      </span>
                      <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {initialMood || "Neutral"} • {initialLocation || location || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <span>{showDynamicStateSection ? "Collapse" : "Configure"}</span>
                      {showDynamicStateSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {showDynamicStateSection && (
                    <div className="p-4 border-t border-[#25252E] space-y-3.5 text-xs">
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Set baseline parameters for the scenario's starting state. When the scenario is active, character emotions, conditions, and environment will initialize to these values.
                      </p>

                      {/* Mood and Location */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-gray-300 flex items-center gap-1">
                            <Sparkles size={11} className="text-amber-400" /> Initial Mood
                          </label>
                          <input
                            type="text"
                            value={initialMood}
                            onChange={(e) => setInitialMood(e.target.value)}
                            placeholder="e.g. Excited, Confident, Playful, Melancholy, Surprised, Calm"
                            className="w-full bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:border-amber-500 focus:outline-hidden"
                          />
                          <div className="flex flex-wrap gap-1 pt-1 max-h-20 overflow-y-auto">
                            {COMMON_MOOD_PRESETS.slice(0, 16).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setInitialMood(m)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                                  initialMood.toLowerCase() === m.toLowerCase()
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-[#18181D] text-gray-400 border-[#262630] hover:text-gray-200'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-gray-300 flex items-center gap-1">
                            <MapPin size={11} className="text-emerald-400" /> Initial Location
                          </label>
                          <input
                            type="text"
                            value={initialLocation}
                            onChange={(e) => setInitialLocation(e.target.value)}
                            placeholder={location ? `Defaults to: ${location}` : "e.g. Cozy Corner Cafe, The Forest Path"}
                            className="w-full bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:border-emerald-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Activity and Outfit */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-gray-300 flex items-center gap-1">
                            <Activity size={11} className="text-amber-400" /> Current Activity
                          </label>
                          <input
                            type="text"
                            value={initialActivity}
                            onChange={(e) => setInitialActivity(e.target.value)}
                            placeholder="e.g. Brewing coffee, Exploring ruins"
                            className="w-full bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:border-amber-500 focus:outline-hidden"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-gray-300 flex items-center gap-1">
                            <Shirt size={11} className="text-purple-400" /> Starting Outfit
                          </label>
                          <input
                            type="text"
                            value={initialOutfit}
                            onChange={(e) => setInitialOutfit(e.target.value)}
                            placeholder="e.g. Barista apron over green blouse"
                            className="w-full bg-[#111114] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:border-purple-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Status Sliders */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2 bg-[#111114] rounded-lg border border-[#262630]">
                          <div className="flex justify-between text-[10px] text-rose-300 font-medium mb-1">
                            <span>Vitality</span>
                            <span>{initialHealth}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={initialHealth}
                            onChange={(e) => setInitialHealth(parseInt(e.target.value, 10))}
                            className="w-full accent-rose-500 h-1"
                          />
                        </div>
                        <div className="p-2 bg-[#111114] rounded-lg border border-[#262630]">
                          <div className="flex justify-between text-[10px] text-emerald-300 font-medium mb-1">
                            <span>Energy</span>
                            <span>{initialStamina}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={initialStamina}
                            onChange={(e) => setInitialStamina(parseInt(e.target.value, 10))}
                            className="w-full accent-emerald-500 h-1"
                          />
                        </div>
                        <div className="p-2 bg-[#111114] rounded-lg border border-[#262630]">
                          <div className="flex justify-between text-[10px] text-purple-300 font-medium mb-1">
                            <span>Trust</span>
                            <span>{initialTrust}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={initialTrust}
                            onChange={(e) => setInitialTrust(parseInt(e.target.value, 10))}
                            className="w-full accent-purple-500 h-1"
                          />
                        </div>
                        <div className="p-2 bg-[#111114] rounded-lg border border-[#262630]">
                          <div className="flex justify-between text-[10px] text-amber-300 font-medium mb-1">
                            <span>Stress</span>
                            <span>{initialStress}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={initialStress}
                            onChange={(e) => setInitialStress(parseInt(e.target.value, 10))}
                            className="w-full accent-amber-500 h-1"
                          />
                        </div>
                      </div>

                      {/* Status Conditions */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-medium text-gray-300 flex items-center gap-1">
                          <AlertCircle size={11} className="text-amber-400" /> Initial Status Effects
                        </label>
                        <div className="flex flex-wrap gap-1 min-h-[26px]">
                          {initialStatusEffects.map((eff, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                              {eff}
                              <button
                                type="button"
                                onClick={() => setInitialStatusEffects(initialStatusEffects.filter((_, idx) => idx !== i))}
                                className="hover:text-red-300"
                              >
                                <X size={9} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newEffectTag}
                            onChange={(e) => setNewEffectTag(e.target.value)}
                            placeholder="Add tag (e.g. 'Excited', 'Alert')"
                            className="flex-1 bg-[#111114] border border-[#2A2A32] rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:border-amber-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newEffectTag.trim();
                              if (trimmed && !initialStatusEffects.includes(trimmed)) {
                                setInitialStatusEffects([...initialStatusEffects, trimmed]);
                                setNewEffectTag("");
                              }
                            }}
                            className="px-2.5 py-1 bg-[#222228] text-gray-300 hover:text-white rounded-lg text-xs border border-[#33333E] flex items-center gap-1"
                          >
                            <Plus size={11} /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-lg flex items-center justify-between">
                    <span>{deleteError}</span>
                    <button type="button" onClick={() => setDeleteError(null)} className="text-gray-400 hover:text-gray-200 text-xs">
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2E]">
                  <div>
                    {editingId && editingId !== "new" && (
                      confirmDeleteId === editingId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400 font-medium">Delete scenario?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(editingId)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                          >
                            {isDeleting ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 text-gray-400 hover:text-gray-200 text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(editingId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Delete Scenario</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={cancelEdit} className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 bg-[#2A2A2E] hover:bg-[#3A3A40] rounded-lg transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !name.trim() || !context.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-black bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={14} /> {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
