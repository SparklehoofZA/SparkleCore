import React, { useState, useEffect, useRef } from "react";
import { X, Save, UserCircle2, Sparkles, User, FileText, Check, Image as ImageIcon, Upload, Link as LinkIcon, Loader2, Heart, Trash2 } from "lucide-react";
import { UserPersona } from "../types";
import { insertRoleplayMacro } from "../roleplayTemplate";

const PERSONA_PRESETS = [
  { label: "Human Male", url: "/avatar_human_male.jpg" },
  { label: "Human Female", url: "/avatar_human_female.jpg" },
  { label: "Elf Male", url: "/avatar_elf_male.jpg" },
  { label: "Elf Female", url: "/avatar_elf_female.jpg" },
  { label: "Dwarf Male", url: "/avatar_dwarf_male.jpg" },
  { label: "Dwarf Female", url: "/avatar_dwarf_female.jpg" },
  { label: "Demon Male", url: "/avatar_demon_male.jpg" },
  { label: "Demon Female", url: "/avatar_demon_female.jpg" },
];

interface UserPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPersona: UserPersona | null;
  onSave: (persona: UserPersona) => Promise<void>;
  onDelete?: (personaId: string) => Promise<void>;
}

export function UserPersonaModal({
  isOpen,
  onClose,
  userPersona,
  onSave,
  onDelete,
}: UserPersonaModalProps) {
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [form, setForm] = useState<UserPersona>({
    id: "",
    name: "User",
    avatar: "",
    age: "",
    appearance: "",
    traits: "",
    background: "",
    gender: "Unspecified",
    orientation: "Unspecified",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"upload" | "url" | "presets">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const traitsRef = useRef<HTMLTextAreaElement>(null);
  const backgroundRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/user-personas")
        .then(res => res.json())
        .then(data => setPersonas(data || []))
        .catch(err => console.error(err));

      setForm({
        id: userPersona?.id || "",
        name: userPersona?.name || "User",
        avatar: userPersona?.avatar || "",
        age: userPersona?.age || "",
        appearance: userPersona?.appearance || "",
        traits: userPersona?.traits || "",
        background: userPersona?.background || "",
        gender: userPersona?.gender || "Unspecified",
        orientation: userPersona?.orientation || "Unspecified",
      });
      setSavedSuccess(false);
    }
  }, [isOpen, userPersona]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch("/api/upload-avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, name: form.name }),
        });
        if (res.ok) {
          const data = await res.json();
          setForm((prev) => ({ ...prev, avatar: data.url }));
        } else {
          setForm((prev) => ({ ...prev, avatar: base64Data }));
        }
      } catch (err) {
        console.error("Avatar upload error:", err);
        setForm((prev) => ({ ...prev, avatar: reader.result as string }));
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const isNew = !form.id;
      const personaToSave = { ...form, id: form.id || Date.now().toString() };
      
      let updatedPersonas = [...personas];
      if (isNew) {
        updatedPersonas.push(personaToSave);
      } else {
        updatedPersonas = updatedPersonas.map(p => p.id === personaToSave.id ? personaToSave : p);
      }
      
      await fetch("/api/user-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPersonas)
      });
      setPersonas(updatedPersonas);
      setForm(personaToSave);

      await onSave(personaToSave);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (error) {
      console.error("Failed to save user persona:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    
    setIsSaving(true);
    try {
      const updatedPersonas = personas.filter(p => p.id !== form.id);
      
      await fetch("/api/user-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPersonas)
      });
      setPersonas(updatedPersonas);
      
      if (onDelete) {
        await onDelete(form.id);
      }
      
      if (updatedPersonas.length > 0) {
        setForm(updatedPersonas[0]);
      } else {
        setForm({
          id: "",
          name: "User",
          avatar: "",
          age: "",
          appearance: "",
          traits: "",
          background: "",
          gender: "Unspecified",
          orientation: "Unspecified",
        });
      }
    } catch (error) {
      console.error("Failed to delete user persona:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121216] border border-[#2E2E36] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#24242C] flex items-center justify-between bg-[#15151A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserCircle2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-100">User Persona & Roleplay Identity</h2>
              <p className="text-[11px] text-gray-400">
                Define who you are in roleplay interactions. Characters will react to your profile.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#202028] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-[400px]">
          {/* Sidebar for Personas */}
          <div className="w-full md:w-56 bg-[#15151A] border-r border-[#24242C] flex flex-col">
            <div className="p-3 border-b border-[#24242C]">
              <button
                type="button"
                onClick={() => setForm({ id: "", name: "New User", avatar: "", age: "", appearance: "", traits: "", background: "" })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
              >
                <UserCircle2 size={14} />
                New Persona
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {personas.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm(p)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${form.id === p.id ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-[#202028] border border-transparent'}`}
                >
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#202028] flex items-center justify-center shrink-0">
                      <User size={12} className="text-gray-400" />
                    </div>
                  )}
                  <div className="truncate text-[11px] font-medium leading-tight">
                    <div className={`truncate ${form.id === p.id ? 'text-amber-300' : 'text-gray-200'}`}>{p.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs bg-[#121216]">
            {savedSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs">
              <Check size={14} className="text-emerald-400" />
              <span>User persona saved successfully!</span>
            </div>
          )}

          {/* Profile Picture Card */}
          <div className="p-3 rounded-xl bg-[#17171E] border border-[#2A2A34] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
                <ImageIcon size={13} className="text-amber-400" />
                Your Profile Picture / Avatar
              </label>
              <div className="flex items-center gap-1 bg-[#1F1F28] p-0.5 rounded-md border border-[#2D2D3A]">
                <button
                  type="button"
                  onClick={() => setAvatarTab("upload")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    avatarTab === "upload" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("url")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    avatarTab === "url" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("presets")}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    avatarTab === "presets" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Presets
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group shrink-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-500/40 bg-[#1F1F27] flex items-center justify-center shadow">
                  {form.avatar ? (
                    <img
                      src={form.avatar}
                      alt={form.name || "User"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-amber-500/15 text-amber-300 font-bold text-xs">
                      {form.name ? form.name.substring(0, 2).toUpperCase() : "ME"}
                    </div>
                  )}
                </div>
                {form.avatar && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, avatar: "" })}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] shadow"
                    title="Remove avatar"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {avatarTab === "upload" && (
                  <div className="space-y-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full py-2 px-3 rounded-lg border border-dashed border-amber-500/40 hover:border-amber-400 bg-[#1D1D26] hover:bg-[#23232E] text-gray-300 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-medium transition-all"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-amber-400" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} className="text-amber-400" />
                          <span>Choose image from computer</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-gray-500">Supports PNG, JPG, WebP. Displayed beside your messages.</p>
                  </div>
                )}

                {avatarTab === "url" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <LinkIcon size={11} className="absolute left-2.5 top-2 text-gray-400" />
                        <input
                          type="url"
                          value={form.avatar || ""}
                          onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                          placeholder="https://example.com/photo.jpg"
                          className="w-full bg-[#181820] border border-[#2D2D3A] focus:border-amber-500/70 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-gray-100 placeholder:text-gray-600 focus:outline-none"
                        />
                      </div>
                      {form.avatar && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, avatar: "" })}
                          className="px-2 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-white hover:bg-[#252532]"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {avatarTab === "presets" && (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {PERSONA_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setForm({ ...form, avatar: preset.url })}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] transition-all ${
                          form.avatar === preset.url
                            ? "border-amber-500 bg-amber-500/20 text-amber-300 font-medium"
                            : "border-[#2D2D38] bg-[#1B1B24] text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-3.5 h-3.5 rounded-full object-cover" />
                        <span>{preset.label}</span>
                        {form.avatar === preset.url && <Check size={10} className="text-amber-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                Your Character Name / Alias <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Detective Jack Miller"
                className="w-full bg-[#18181F] border border-[#2E2E38] rounded-lg p-2.5 text-gray-200 focus:border-amber-500/60 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1">Age</label>
              <input
                type="text"
                value={form.age || ""}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="e.g. 34, or Mid-30s"
                className="w-full bg-[#18181F] border border-[#2E2E38] rounded-lg p-2.5 text-gray-200 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5"><Heart size={12} className="text-amber-400"/> Gender</label>
              <select
                value={form.gender || "Unspecified"}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full bg-[#18181F] border border-[#2E2E38] rounded-lg p-2.5 text-gray-200 focus:border-amber-500/60 focus:outline-none cursor-pointer"
              >
                <option value="Unspecified">Unspecified</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-1 flex items-center gap-1.5"><Sparkles size={12} className="text-amber-400"/> Orientation</label>
              <select
                value={form.orientation || "Unspecified"}
                onChange={(e) => setForm({ ...form, orientation: e.target.value })}
                className="w-full bg-[#18181F] border border-[#2E2E38] rounded-lg p-2.5 text-gray-200 focus:border-amber-500/60 focus:outline-none cursor-pointer"
              >
                <option value="Unspecified">Unspecified</option>
                <option value="Straight">Straight</option>
                <option value="Gay/Lesbian">Gay/Lesbian</option>
                <option value="Bisexual">Bisexual</option>
                <option value="Pansexual">Pansexual</option>
                <option value="Asexual">Asexual</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-300 font-medium mb-1">Appearance & Attire</label>
              <input
                type="text"
                value={form.appearance || ""}
                onChange={(e) => setForm({ ...form, appearance: e.target.value })}
                placeholder="e.g. Tall, disheveled dark hair, wearing a worn leather jacket and silver watch"
                className="w-full bg-[#18181F] border border-[#2E2E38] rounded-lg p-2.5 text-gray-200 focus:border-amber-500/60 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-gray-300 font-medium">Personality & Mannerisms</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-gray-500 font-medium">Insert:</span>
                  <button
                    type="button"
                    onClick={() => insertRoleplayMacro('{{char}}', form.traits || "", (val) => setForm(prev => ({ ...prev, traits: val })), traitsRef.current)}
                    className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                  >
                    +{"\"{{char}}\""}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRoleplayMacro('{{user}}', form.traits || "", (val) => setForm(prev => ({ ...prev, traits: val })), traitsRef.current)}
                    className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                  >
                    +{"\"{{user}}\""}
                  </button>
                </div>
              </div>
              <textarea
                ref={traitsRef}
                rows={2}
                value={form.traits || ""}
                onChange={(e) => setForm({ ...form, traits: e.target.value })}
                placeholder='e.g. Observant, speaks with dry sarcasm, often finds amusement when {{char}} gets teasing'
                className="w-full bg-[#18181F] border border-[#2E2E38] rounded-lg p-2.5 text-gray-200 focus:border-amber-500/60 focus:outline-none resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-gray-300 font-medium">Background & Context</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-gray-500 font-medium">Insert:</span>
                  <button
                    type="button"
                    onClick={() => insertRoleplayMacro('{{char}}', form.background || "", (val) => setForm(prev => ({ ...prev, background: val })), backgroundRef.current)}
                    className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                  >
                    +{"\"{{char}}\""}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertRoleplayMacro('{{user}}', form.background || "", (val) => setForm(prev => ({ ...prev, background: val })), backgroundRef.current)}
                    className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                  >
                    +{"\"{{user}}\""}
                  </button>
                </div>
              </div>
              <textarea
                ref={backgroundRef}
                rows={3}
                value={form.background || ""}
                onChange={(e) => setForm({ ...form, background: e.target.value })}
                placeholder='e.g. Regular patron at the shop where {{char}} works. Enjoys chatting with {{char}} after a long shift.'
                className="w-full bg-[#18181F] border border-[#2E2E38] rounded-lg p-2.5 text-gray-200 focus:border-amber-500/60 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Standard Roleplay Definition Tip */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-gray-300 text-[11px]">
            <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-amber-300">Standard Roleplay Syntax:</span>
              <p className="text-gray-300 leading-relaxed">
                In all scenarios and roleplay details, your partner is defined as <code className="px-1 py-0.5 bg-black/50 text-amber-300 rounded font-mono font-semibold">{"{{char}}"}</code> and you are defined as <code className="px-1 py-0.5 bg-black/50 text-cyan-300 rounded font-mono font-semibold">{"{{user}}"}</code> (e.g. <em>{"{{char}}"} works at coffee shop and {"{{user}}"} walks in</em>).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#16161D] border border-[#262630] flex items-start gap-2.5 text-gray-400 text-[11px]">
            <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span>
              This profile is sent to the LLM system context as your character biography. AI characters will adapt their dialogue, relationships, and physical interactions accordingly.
            </span>
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-[#22222A]">
            <div>
              {form.id && (
                <button
                  type="button"
                  onClick={() => {
                    if (showDeleteConfirm) {
                      handleDelete();
                      setShowDeleteConfirm(false);
                    } else {
                      setShowDeleteConfirm(true);
                      setTimeout(() => setShowDeleteConfirm(false), 3000);
                    }
                  }}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 text-xs ${
                    showDeleteConfirm 
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20" 
                      : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                  }`}
                >
                  <Trash2 size={13} className={showDeleteConfirm ? "text-white" : "text-rose-400"} />
                  <span>{showDeleteConfirm ? "Click to Confirm" : "Delete Persona"}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#18181E] hover:bg-[#22222A] text-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !form.name.trim()}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Save size={13} />
                <span>{isSaving ? "Saving..." : "Save Persona"}</span>
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
