import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, User, Trash2, Heart, Eye, Calendar, FileText, Bookmark, Info, Image as ImageIcon, Upload, Link as LinkIcon, Check, Loader2, MapPin } from "lucide-react";
import { Personality, Scenario } from "../types";
import { insertRoleplayMacro } from "../roleplayTemplate";

const PRESET_AVATARS = [
  { label: "Human Male", url: "/avatar_human_male.jpg" },
  { label: "Human Female", url: "/avatar_human_female.jpg" },
  { label: "Elf Male", url: "/avatar_elf_male.jpg" },
  { label: "Elf Female", url: "/avatar_elf_female.jpg" },
  { label: "Dwarf Male", url: "/avatar_dwarf_male.jpg" },
  { label: "Dwarf Female", url: "/avatar_dwarf_female.jpg" },
  { label: "Demon Male", url: "/avatar_demon_male.jpg" },
  { label: "Demon Female", url: "/avatar_demon_female.jpg" },
];

const PRESET_BACKGROUNDS = [
  { label: "Enchanted Forest", url: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80" },
  { label: "Fantasy Tavern", url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1920&q=80" },
  { label: "Cyberpunk City", url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80" },
  { label: "Arcane Library", url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1920&q=80" },
  { label: "Cosmic Nebula", url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80" },
  { label: "Candlelit Study", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80" },
  { label: "Ancient Castle", url: "https://images.unsplash.com/photo-1533158307587-828f0a76ef96?auto=format&fit=crop&w=1920&q=80" },
  { label: "Misty Mountains", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80" },
];

interface PersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  personality: Personality | null; // null for creating new
  onSave: (personalityData: Partial<Personality>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  scenarios?: Scenario[];
}

export const PersonalityModal: React.FC<PersonalityModalProps> = ({
  isOpen,
  onClose,
  personality,
  onSave,
  onDelete,
  scenarios = [],
}) => {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [chatbotPersonality, setChatbotPersonality] = useState("");
  const [appearance, setAppearance] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [orientation, setOrientation] = useState("");
  const [systemInstruction, setSystemInstruction] = useState("");
  const [description, setDescription] = useState("");
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState("");
  const [customBackgroundOpacity, setCustomBackgroundOpacity] = useState(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  const personalityTextareaRef = useRef<HTMLTextAreaElement>(null);
  const appearanceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const systemInstructionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"upload" | "url" | "presets">("upload");
  const [bgTab, setBgTab] = useState<"upload" | "url" | "presets">("upload");
  const [bgUrlInput, setBgUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genDetails, setGenDetails] = useState("");

  useEffect(() => {
    if (personality) {
      setName(personality.name || "");
      setAvatar(personality.avatar || "");
      setChatbotPersonality(personality.personality || personality.traits || "");
      setAppearance(personality.appearance || "");
      setAge(personality.age || "");
      setGender(personality.gender || "");
      setOrientation(personality.orientation || "");
      setSystemInstruction(personality.systemInstruction || "");
      setDescription(personality.description || "");
      setCustomBackgroundUrl(personality.customBackgroundUrl || "");
      setCustomBackgroundOpacity(typeof personality.customBackgroundOpacity === "number" ? personality.customBackgroundOpacity : 1);
      setSelectedScenarioId(personality.scenarioId || "");
    } else {
      setName("");
      setAvatar("");
      setChatbotPersonality("");
      setAppearance("");
      setAge("");
      setGender("");
      setOrientation("");
      setSystemInstruction("");
      setDescription("");
      setCustomBackgroundUrl("");
      setCustomBackgroundOpacity(1);
      setSelectedScenarioId("");
    }
    setConfirmDelete(false);
    setError(null);
  }, [personality, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WebP, GIF)");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Image size should be under 20MB");
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
          body: JSON.stringify({ image: base64Data, name }),
        });
        if (res.ok) {
          const data = await res.json();
          setAvatar(data.url);
        } else {
          setAvatar(base64Data);
        }
      } catch (err) {
        console.error("Failed to upload avatar, falling back to data URL", err);
        setAvatar(reader.result as string);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WebP, GIF)");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Image size should be under 20MB");
      return;
    }

    setIsUploadingBg(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch("/api/upload-avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, name: `${name}_bg` }),
        });
        if (res.ok) {
          const data = await res.json();
          setCustomBackgroundUrl(data.url);
        } else {
          setCustomBackgroundUrl(base64Data);
        }
      } catch (err) {
        console.error("Failed to upload background, falling back to data URL", err);
        setCustomBackgroundUrl(reader.result as string);
      } finally {
        setIsUploadingBg(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a character name.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: String(name || "").trim(),
        avatar: String(avatar || "").trim(),
        personality: String(chatbotPersonality || "").trim(),
        traits: String(chatbotPersonality || "").trim(), // sync for backwards compatibility
        appearance: String(appearance || "").trim(),
        age: String(age || "").trim(),
        gender: String(gender || "").trim(),
        orientation: String(orientation || "").trim(),
        systemInstruction: String(systemInstruction || "").trim(),
        description: String(description || "").trim(),
        customBackgroundUrl: String(customBackgroundUrl || "").trim(),
        customBackgroundOpacity: customBackgroundOpacity,
        scenarioId: String(selectedScenarioId || "").trim(),
        // Preserve any existing fields already attached to the character
        ...(personality?.firstMessage ? { firstMessage: personality.firstMessage } : {}),
        ...(personality?.state ? { state: personality.state } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save character profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!genDetails.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: genDetails }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setName(data.name);
      setChatbotPersonality(data.personality);
      setAppearance(data.appearance);
      setAge(data.age);
      setDescription(data.description);
      setSystemInstruction(data.systemInstruction);
    } finally { setIsGenerating(false); }
  };

  const handleDelete = async () => {
    if (!personality?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(personality.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete character.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111114] border border-[#2A2A2E] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between bg-[#161619]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                {personality ? "Edit Roleplay Character" : "Create Roleplay Character"}
              </h2>
              <p className="text-xs text-gray-400">
                Configure persona traits, appearance, scene scenario, and system constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#25252B] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Random Character Section */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
            <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Sparkles size={13} /> Generate Random Character
            </label>
            <div className="flex gap-2">
              <input
                value={genDetails}
                onChange={(e) => setGenDetails(e.target.value)}
                placeholder="Basic details (e.g., 'a grumpy wizard')"
                className="flex-1 bg-[#111114] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-gray-200"
              />
              <button type="button" onClick={handleGenerate} disabled={isGenerating} className="px-3 py-2 bg-amber-500 text-black rounded-lg text-xs font-semibold hover:bg-amber-600 disabled:opacity-50">
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Profile Picture / Avatar Section */}
          <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#272730] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-amber-400" />
                Character Profile Picture / Avatar
              </label>
              <div className="flex items-center gap-1 bg-[#1E1E24] p-0.5 rounded-lg border border-[#2D2D38]">
                <button
                  type="button"
                  onClick={() => setAvatarTab("upload")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    avatarTab === "upload" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("url")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    avatarTab === "url" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("presets")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    avatarTab === "presets" ? "bg-amber-500 text-black font-semibold" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Presets
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-[#1D1D24] flex items-center justify-center shadow-lg shadow-black/40">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name || "Character"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-600/20 to-amber-950/40 text-amber-300 font-bold text-sm">
                      {name ? name.substring(0, 2).toUpperCase() : "AI"}
                    </div>
                  )}
                </div>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar("")}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] shadow"
                    title="Remove avatar"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-w-0">
                {avatarTab === "upload" && (
                  <div className="space-y-1.5">
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
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-[#1A1A22] hover:bg-[#20202A] text-gray-300 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-all"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-amber-400" />
                          <span>Uploading image...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} className="text-amber-400" />
                          <span>Click to browse or upload picture (PNG, JPG, WebP)</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-gray-400">Supported up to 20MB. Automatically stored for your character.</p>
                  </div>
                )}

                {avatarTab === "url" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon size={12} className="absolute left-3 top-3 text-gray-400" />
                        <input
                          type="url"
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value)}
                          placeholder="https://example.com/character-photo.jpg"
                          className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all"
                        />
                      </div>
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => setAvatar("")}
                          className="px-2.5 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-[#22222A]"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400">Paste direct image URL from web or image hosting.</p>
                  </div>
                )}

                {avatarTab === "presets" && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {PRESET_AVATARS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setAvatar(preset.url)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                          avatar === preset.url
                            ? "border-amber-500 bg-amber-500/20 text-amber-300 font-medium"
                            : "border-[#2D2D38] bg-[#1B1B22] text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-4 h-4 rounded-full object-cover" />
                        <span>{preset.label}</span>
                        {avatar === preset.url && <Check size={11} className="text-amber-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Custom Background Section */}
          <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#272730] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-amber-400" />
                Custom Chat Background (Per-Character)
              </label>
              {customBackgroundUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomBackgroundUrl("");
                    setBgUrlInput("");
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Remove Background</span>
                </button>
              )}
            </div>

            {/* If a background is already selected, display the live preview & opacity slider */}
            {customBackgroundUrl ? (
              <div className="space-y-3 bg-[#191922] border border-[#2A2A34] p-3 rounded-xl">
                <div className="relative w-full h-28 rounded-lg overflow-hidden border border-[#333342] shadow-inner flex items-center justify-center bg-[#0C0C10]">
                  <img
                    src={customBackgroundUrl}
                    alt="Background Preview"
                    className="w-full h-full object-cover transition-opacity duration-200"
                    style={{ opacity: customBackgroundOpacity }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-amber-300 font-medium border border-amber-500/30">
                    Active Chat Background
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-gray-300">
                    Opacity: {Math.round(customBackgroundOpacity * 100)}%
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-gray-300 font-medium">
                    <span>Background Opacity in Chat</span>
                    <span className="text-amber-400 font-semibold">{Math.round(customBackgroundOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={customBackgroundOpacity}
                    onChange={(e) => setCustomBackgroundOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 cursor-pointer bg-[#242430] rounded-lg"
                  />
                  <p className="text-[11px] text-gray-400">Lower opacity smoothly blends the background with the dark chat theme for maximum text legibility.</p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomBackgroundUrl("");
                      setBgUrlInput("");
                    }}
                    className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded bg-[#22222E] hover:bg-[#2A2A38] transition-colors"
                  >
                    Change Background
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mode tabs: Upload, Image URL, Presets */}
                <div className="flex bg-[#121216] p-0.5 rounded-lg border border-[#24242C] text-xs">
                  <button
                    type="button"
                    onClick={() => setBgTab("upload")}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                      bgTab === "upload"
                        ? "bg-[#20202A] text-amber-300 shadow-sm"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgTab("url")}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                      bgTab === "url"
                        ? "bg-[#20202A] text-amber-300 shadow-sm"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgTab("presets")}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                      bgTab === "presets"
                        ? "bg-[#20202A] text-amber-300 shadow-sm"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Preset Scenes
                  </button>
                </div>

                {bgTab === "upload" && (
                  <div>
                    <input
                      type="file"
                      ref={bgFileInputRef}
                      onChange={handleBgFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bgFileInputRef.current?.click()}
                      disabled={isUploadingBg}
                      className="w-full py-4 px-3 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-[#1A1A22] hover:bg-[#20202A] text-gray-300 hover:text-white flex flex-col items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer"
                    >
                      {isUploadingBg ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-amber-400" />
                          <span>Uploading image...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={18} className="text-amber-400 mb-0.5" />
                          <span>Click to browse or drop background image</span>
                          <span className="text-[11px] text-gray-500">Supports PNG, JPG, WebP, GIF (Up to 20MB)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {bgTab === "url" && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={bgUrlInput}
                      onChange={(e) => setBgUrlInput(e.target.value)}
                      placeholder="https://example.com/fantasy-background.jpg"
                      className="flex-1 bg-[#1A1A22] border border-[#2D2D38] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (bgUrlInput.trim()) {
                          setCustomBackgroundUrl(bgUrlInput.trim());
                        }
                      }}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-lg transition-colors shrink-0"
                    >
                      Set
                    </button>
                  </div>
                )}

                {bgTab === "presets" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_BACKGROUNDS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setCustomBackgroundUrl(preset.url);
                          setCustomBackgroundOpacity(0.75);
                        }}
                        className="group relative flex flex-col items-center rounded-lg border border-[#2D2D38] hover:border-amber-400 bg-[#181820] overflow-hidden transition-all text-left p-1 cursor-pointer hover:shadow-md"
                      >
                        <div className="w-full h-14 rounded overflow-hidden bg-black/40">
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <span className="text-[11px] text-gray-300 group-hover:text-amber-300 font-medium px-1 py-1 truncate w-full">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 1: Core Details */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <User size={13} className="text-amber-400" />
                Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lilly, Lyra Whisperwind"
                className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Calendar size={13} className="text-amber-400" />
                Age
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 18, 300"
                className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Heart size={13} className="text-amber-400" />
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Unspecified</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Unspecified</option>
                <option value="Straight">Straight</option>
                <option value="Gay/Lesbian">Gay/Lesbian</option>
                <option value="Bisexual">Bisexual</option>
                <option value="Pansexual">Pansexual</option>
                <option value="Asexual">Asexual</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Allocated Scenario Section */}
          <div className="p-3.5 rounded-xl bg-[#16161B] border border-[#272730] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <Bookmark size={14} className="text-amber-400" />
                Allocate Scenario to Character
              </label>
              {selectedScenarioId && (
                <button
                  type="button"
                  onClick={() => setSelectedScenarioId("")}
                  className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  Unallocate Scenario
                </button>
              )}
            </div>

            <div className="space-y-2">
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">None (Unallocated / Freeform Roleplay)</option>
                {scenarios.map((s) => {
                  const isCurrent = personality?.id && s.characterId === personality.id;
                  const isAssignedOther = s.characterId && (!personality?.id || s.characterId !== personality.id);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.location ? `(${s.location})` : ""} {isCurrent ? "✓ [Currently Allocated]" : isAssignedOther ? "• [Assigned to other character]" : ""}
                    </option>
                  );
                })}
              </select>

              {/* Selected Scenario Preview Card */}
              {(() => {
                const allocatedScenario = scenarios.find((s) => s.id === selectedScenarioId);
                if (!allocatedScenario) return null;
                return (
                  <div className="p-3 bg-[#111114] border border-[#2A2A2E] rounded-xl space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-amber-300 text-xs flex items-center gap-1.5">
                          <Sparkles size={12} className="text-amber-400 shrink-0" />
                          {allocatedScenario.name}
                        </span>
                        {allocatedScenario.description && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{allocatedScenario.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {allocatedScenario.location && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 flex items-center gap-1">
                            <MapPin size={9} /> {allocatedScenario.location}
                          </span>
                        )}
                        {allocatedScenario.timeOfDay && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {allocatedScenario.timeOfDay}
                          </span>
                        )}
                      </div>
                    </div>

                    {allocatedScenario.relationship && (
                      <div className="text-[11px] text-rose-300/90 bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-500/15 flex items-center gap-1.5">
                        <Heart size={11} className="text-rose-400 shrink-0" />
                        <span>Relationship: <strong>{allocatedScenario.relationship}</strong></span>
                      </div>
                    )}

                    {allocatedScenario.context && (
                      <div className="text-[11px] text-gray-400 bg-black/30 p-2 rounded-lg border border-white/5 line-clamp-2">
                        <span className="text-gray-500 text-[10px] uppercase font-semibold mr-1">Scene Context:</span>
                        {allocatedScenario.context}
                      </div>
                    )}

                    {allocatedScenario.firstMessage && (
                      <div className="text-[11px] text-gray-300 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 line-clamp-2 italic">
                        <span className="text-amber-400 not-italic font-semibold text-[10px] uppercase mr-1">Greeting:</span>
                        "{allocatedScenario.firstMessage}"
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Roleplay Definition Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                <Sparkles size={13} className="text-amber-400 shrink-0" />
                <span>Roleplay Context & Formatting Standards</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300/90 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                "Dialogue" & *Actions*
              </span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              In all traits, appearance, system instructions, and scenarios, <code className="px-1 py-0.5 bg-black/50 text-amber-300 rounded font-mono font-semibold">{"{{char}}"}</code> ALWAYS refers to the <strong>active chat character</strong>, and <code className="px-1 py-0.5 bg-black/50 text-cyan-300 rounded font-mono font-semibold">{"{{user}}"}</code> ALWAYS refers to the <strong>active user persona</strong>. Words spoken aloud are between <code className="px-1 py-0.5 bg-black/50 text-white rounded font-mono font-semibold">" "</code>, and thoughts or actions are between <code className="px-1 py-0.5 bg-black/50 text-sky-300 rounded font-mono font-semibold">* *</code>.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-gray-300 bg-black/40 px-2.5 py-1.5 rounded-lg font-mono border border-white/5">
              <span className="text-gray-500 text-[10px] uppercase font-semibold">Example:</span>
              <span className="text-gray-300">
                <span className="text-sky-300 italic">*smiles*</span> <span className="text-white">"Welcome in, <span className="text-cyan-300 font-bold">{"{{user}}"}</span>!"</span>
              </span>
            </div>
          </div>

          {/* Row 2: Short Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Bookmark size={13} className="text-amber-400" />
                Short Description
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-gray-500 font-medium">Insert:</span>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{char}}', description, setDescription, descriptionInputRef.current)}
                  className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{char}}\""}
                </button>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{user}}', description, setDescription, descriptionInputRef.current)}
                  className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{user}}\""}
                </button>
              </div>
            </div>
            <input
              ref={descriptionInputRef}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. {{char}} works at coffee shop and {{user}} walks in'
              className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all"
            />
          </div>

          {/* Row 3: Character Personality & Traits */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Heart size={13} className="text-amber-400" />
                Character Personality & Traits
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-gray-500 font-medium">Insert:</span>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{char}}', chatbotPersonality, setChatbotPersonality, personalityTextareaRef.current)}
                  className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{char}}\""}
                </button>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{user}}', chatbotPersonality, setChatbotPersonality, personalityTextareaRef.current)}
                  className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{user}}\""}
                </button>
              </div>
            </div>
            <textarea
              ref={personalityTextareaRef}
              value={chatbotPersonality}
              onChange={(e) => setChatbotPersonality(e.target.value)}
              placeholder='e.g. {{char}} is playful, witty, and warm-hearted. Whenever {{user}} enters the scene, {{char}} welcomes {{user}} with a bright teasing smile.'
              rows={3}
              className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all resize-y min-h-[72px]"
            />
          </div>

          {/* Row 4: Appearance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Eye size={13} className="text-amber-400" />
                Appearance
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-gray-500 font-medium">Insert:</span>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{char}}', appearance, setAppearance, appearanceTextareaRef.current)}
                  className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{char}}\""}
                </button>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{user}}', appearance, setAppearance, appearanceTextareaRef.current)}
                  className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{user}}\""}
                </button>
              </div>
            </div>
            <textarea
              ref={appearanceTextareaRef}
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              placeholder='e.g. {{char}} is a slender elf with pointed ears, silver hair, and a dark green barista apron while serving {{user}} at the coffee shop.'
              rows={2}
              className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all resize-y min-h-[60px]"
            />
          </div>

          {/* Row 5: Additional System Instructions or Context */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <FileText size={13} className="text-amber-400" />
                Additional System Instructions or Context
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-gray-500 font-medium">Insert:</span>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{char}}', systemInstruction, setSystemInstruction, systemInstructionTextareaRef.current)}
                  className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{char}}\""}
                </button>
                <button
                  type="button"
                  onClick={() => insertRoleplayMacro('{{user}}', systemInstruction, setSystemInstruction, systemInstructionTextareaRef.current)}
                  className="px-1.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[10px] transition-colors"
                >
                  +{"\"{{user}}\""}
                </button>
              </div>
            </div>
            <textarea
              ref={systemInstructionTextareaRef}
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder='e.g. {{char}} stays in character. When {{user}} enters or speaks, {{char}} reacts naturally and with emotional depth.'
              rows={3}
              className="w-full bg-[#18181C] border border-[#2A2A2E] focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all resize-y min-h-[72px]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#2A2A2E] flex items-center justify-between">
            {personality?.id && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400 font-medium">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 text-gray-400 hover:text-gray-200 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400/80 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors border border-transparent hover:border-red-900/40"
                >
                  <Trash2 size={13} />
                  <span>Delete Character</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#1E1E24] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? "Saving..." : personality ? "Save Changes" : "Create Character"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
