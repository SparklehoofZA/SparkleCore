import { useState, useEffect } from "react";
import {
  Compass,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Shield,
  MessageSquare,
  Plus,
  Trash2,
  Package,
  Award,
  Loader2,
  Flame,
  Heart,
  Zap,
} from "lucide-react";
import { CharacterQuest, Personality, QuestDifficulty, UserGameState, QuestingSystemConfig, DEFAULT_QUESTING_SYSTEM_CONFIG } from "../types";
import { getDifficultyBadgeClass } from "../questsEngine";

interface QuestManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  personality: Personality | null;
  quests: CharacterQuest[];
  gameState: UserGameState;
  onGenerateQuests: () => Promise<void>;
  onProposeQuest: (quest: CharacterQuest) => void;
  onAcceptQuest?: (quest: CharacterQuest) => Promise<void>;
  onCompleteQuest?: (quest: CharacterQuest) => Promise<void>;
  onDeleteQuest: (questId: string) => Promise<void>;
  onSaveQuest: (quest: Partial<CharacterQuest>) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onPurgeChatSpoils?: (personalityId: string) => Promise<void>;
  isGenerating?: boolean;
}

export function QuestManagerModal({
  isOpen,
  onClose,
  personality,
  quests,
  gameState,
  onGenerateQuests,
  onProposeQuest,
  onAcceptQuest,
  onCompleteQuest,
  onDeleteQuest,
  onSaveQuest,
  onDeleteItem,
  onPurgeChatSpoils,
  isGenerating = false,
}: QuestManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"desires" | "in_progress" | "completed" | "inventory">("desires");
  const [isCreating, setIsCreating] = useState(false);
  const [lastCompletedReward, setLastCompletedReward] = useState<{
    items?: { item_name: string }[];
  } | null>(null);

  // New Custom Quest Form State
  const [sysConfig, setSysConfig] = useState<QuestingSystemConfig>(DEFAULT_QUESTING_SYSTEM_CONFIG);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/questing-system/config")
        .then((res) => res.json())
        .then((data) => setSysConfig(data || DEFAULT_QUESTING_SYSTEM_CONFIG))
        .catch(() => setSysConfig(DEFAULT_QUESTING_SYSTEM_CONFIG));
    }
  }, [isOpen]);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMotivation, setNewMotivation] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<QuestDifficulty>("Medium");
  const [newAffinity, setNewAffinity] = useState(15);
  const [newTrust, setNewTrust] = useState(10);
  const [newBond, setNewBond] = useState(8);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");

  if (!isOpen) return null;

  const currentCharacterName = personality?.name || "Character";

  // Quests are strictly scoped to the active chat / character
  const characterQuests = quests.filter(
    (q) => q.characterId === personality?.id
  );

  const availableDesires = characterQuests.filter(
    (q) => !q.status || q.status === "available" || q.status === "proposed"
  );
  const inProgressQuests = characterQuests.filter(
    (q) => q.status === "in_progress" || q.status === "pending_payout" || q.status === "active"
  );
  const completedQuests = characterQuests.filter((q) => q.status === "completed");

  // Items & spoils are strictly scoped to the active chat / character, not global
  const chatInventory = gameState.inventory.filter((item) => {
    if (personality?.id && item.characterId) {
      return item.characterId === personality.id;
    }
    if (personality?.name && item.characterName) {
      return item.characterName.toLowerCase() === personality.name.toLowerCase();
    }
    return false;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const questData: Partial<CharacterQuest> = {
      quest_id: `quest_custom_${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim() || `Assist ${currentCharacterName} with their request.`,
      character_motivation: newMotivation.trim() || "Immediate personal need or concern.",
      difficulty: newDifficulty,
      trigger_prompt: `I wanted to ask you about "${newTitle.trim()}". What can I do to help you?`,
      rewards: {
        relationship_metrics: {
          affinity: Number(newAffinity) || 0,
          trust: Number(newTrust) || 0,
          harmonic_bond: Number(newBond) || 0,
        },
        items: newItemName.trim()
          ? [
              {
                item_name: newItemName.trim(),
                item_description: newItemDesc.trim() || "A rare keepsake earned from this quest.",
              },
            ]
          : [],
      },
      status: "available",
      characterId: personality?.id,
      characterName: currentCharacterName,
      createdAt: new Date().toISOString(),
    };

    await onSaveQuest(questData);
    setIsCreating(false);
    setNewTitle("");
    setNewDescription("");
    setNewMotivation("");
    setNewItemName("");
    setNewItemDesc("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0F0F13] border border-[#2B2B38] rounded-2xl shadow-2xl overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23232F] bg-[#14141A] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Compass size={22} className="animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white truncate">
                  The Quest Book
                </h2>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {currentCharacterName}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                Character desires, errands, and collaborative tasks generated from scene, vitals, and memories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1E1E26] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Reward celebration banner */}
        {lastCompletedReward && (
          <div className="bg-gradient-to-r from-amber-600/30 via-emerald-600/30 to-amber-600/30 border-b border-amber-500/40 px-5 py-2.5 flex items-center justify-between text-xs text-amber-200 animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-amber-400 animate-bounce" />
              <span>
                <strong>Triumph Achieved!</strong>
                {lastCompletedReward.items && lastCompletedReward.items.length > 0 && (
                  <span>
                    {" "}Added <strong>{lastCompletedReward.items.map((i) => i.item_name).join(", ")}</strong> to your inventory!
                  </span>
                )}
              </span>
            </div>
            <span className="text-[10px] text-amber-400/80 font-mono">Affinity & Trust Deepened</span>
          </div>
        )}

        {/* Tab Navigation & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#1F1F2A] bg-[#111116] shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-[#181822] rounded-xl border border-[#252532]">
            <button
              onClick={() => {
                setActiveTab("desires");
                setIsCreating(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "desires" && !isCreating
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Sparkles size={13} />
              <span>Desires & Tasks</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#101016] text-amber-400 border border-amber-500/20">
                {availableDesires.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("in_progress");
                setIsCreating(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "in_progress" && !isCreating
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Clock size={13} />
              <span>In Progress</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#101016] text-amber-400 border border-amber-500/20">
                {inProgressQuests.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("completed");
                setIsCreating(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "completed" && !isCreating
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Completed</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#101016] text-emerald-400 border border-emerald-500/20">
                {completedQuests.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("inventory");
                setIsCreating(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "inventory" && !isCreating
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Package size={13} />
              <span>Spoils & Items</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#101016] text-purple-400 border border-purple-500/20">
                {chatInventory.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateQuests}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/40 hover:to-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Generate 3-5 background desires based on current Personality, Scene, Vitals, and Lore"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin text-amber-400" />
              ) : (
                <Sparkles size={14} className="text-amber-400" />
              )}
              <span>{isGenerating ? "Consulting Mind..." : "Refresh Desires"}</span>
            </button>

            <button
              onClick={() => setIsCreating((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D1D27] hover:bg-[#252533] text-gray-300 hover:text-white border border-[#2F2F40] text-xs font-medium transition-colors cursor-pointer"
              title="Add a custom desire or task to this character's Quest Book"
            >
              <Plus size={14} className="text-amber-400" />
              <span>{isCreating ? "Cancel" : "New Desire"}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Create Custom Desire Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-4 rounded-xl bg-[#14141B] border border-amber-500/30 space-y-3.5 shadow-lg animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#232330]">
                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                  <Plus size={16} />
                  <span>Add Desire to {currentCharacterName}'s Quest Book</span>
                </h3>
                <span className="text-xs text-gray-500">Local to this character</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., The Great Coffee Bean Shortage"
                    className="w-full bg-[#1B1B24] border border-[#2E2E3E] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/60"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as QuestDifficulty)}
                    className="w-full bg-[#1B1B24] border border-[#2E2E3E] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Description / Goal</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., Get 2 bags of roast beans from the local market supplier."
                  rows={2}
                  className="w-full bg-[#1B1B24] border border-[#2E2E3E] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/60 resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Character Motivation</label>
                <input
                  type="text"
                  value={newMotivation}
                  onChange={(e) => setNewMotivation(e.target.value)}
                  placeholder='e.g., “We’re running dangerously low on our signature roast, and the morning rush is coming!”'
                  className="w-full bg-[#1B1B24] border border-[#2E2E3E] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Dynamic Rewards */}
              <div className="p-3 bg-[#171720] border border-[#242430] rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                  <Award size={14} className="text-amber-400" />
                  <span>Dynamic Rewards</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] text-gray-400">Affinity Bonus (%)</label>
                    <input
                      type="number"
                      value={newAffinity}
                      onChange={(e) => setNewAffinity(Number(e.target.value))}
                      className="w-full bg-[#1E1E28] border border-[#2C2C3A] rounded px-2 py-1 text-xs text-rose-300 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400">Trust Bonus (%)</label>
                    <input
                      type="number"
                      value={newTrust}
                      onChange={(e) => setNewTrust(Number(e.target.value))}
                      className="w-full bg-[#1E1E28] border border-[#2C2C3A] rounded px-2 py-1 text-xs text-blue-300 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400">Bond Bonus (%)</label>
                    <input
                      type="number"
                      value={newBond}
                      onChange={(e) => setNewBond(Number(e.target.value))}
                      className="w-full bg-[#1E1E28] border border-[#2C2C3A] rounded px-2 py-1 text-xs text-purple-300 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] text-gray-400">Item Name (Optional)</label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g., Special House Blend"
                      className="w-full bg-[#1E1E28] border border-[#2C2C3A] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400">Item Description</label>
                    <input
                      type="text"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="e.g., A fragrant artisan roast coffee blend."
                      className="w-full bg-[#1E1E28] border border-[#2C2C3A] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-[#1A1A24] border border-[#292938]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-sm cursor-pointer"
                >
                  Save to Quest Book
                </button>
              </div>
            </form>
          )}

          {/* Spoils & Inventory Tab */}
          {activeTab === "inventory" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#14141C] border border-[#262636] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Package size={16} className="text-purple-400" />
                    <span>Inventory & Quest Spoils</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Artisan goods, tokens, and rewards obtained by aiding {currentCharacterName} in this chat.
                  </p>
                </div>

                {chatInventory.length > 0 && onPurgeChatSpoils && personality?.id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Purge all spoils and earned items from your chat with ${currentCharacterName}?`)) {
                        onPurgeChatSpoils(personality.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-900/50 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    title={`Purge all spoils for ${currentCharacterName}`}
                  >
                    <Trash2 size={13} className="text-red-400" />
                    <span>Purge Chat Spoils</span>
                  </button>
                )}
              </div>

              {chatInventory.length === 0 ? (
                <div className="py-12 text-center text-gray-500 space-y-2 border border-dashed border-[#232330] rounded-2xl p-6">
                  <Package size={36} className="mx-auto text-gray-600 opacity-50" />
                  <p className="text-sm font-medium text-gray-300">No spoils or items earned with {currentCharacterName} yet</p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Complete quests for {currentCharacterName} in this chat to earn authentic narrative items and keepsakes!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {chatInventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#14141B] border border-[#242432] hover:border-purple-500/40 transition-colors space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                          <Shield size={13} className="text-purple-400 shrink-0" />
                          <span>{item.item_name}</span>
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.questTitle && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1B1B26] text-gray-400 border border-[#2B2B3A] shrink-0 truncate max-w-[140px]">
                              {item.questTitle}
                            </span>
                          )}
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                              title="Discard item from spoils"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{item.item_description}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-[#1E1E2A]">
                        <span>From: {item.characterName || currentCharacterName}</span>
                        <span>{new Date(item.acquiredAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quests View: Desires / In Progress / Completed */}
          {activeTab !== "inventory" && (
            <div className="space-y-3">
              {(() => {
                const currentList =
                  activeTab === "desires"
                    ? availableDesires
                    : activeTab === "in_progress"
                    ? inProgressQuests
                    : completedQuests;

                if (currentList.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-500 space-y-3 border border-dashed border-[#232330] rounded-2xl p-6">
                      <Compass size={36} className="mx-auto text-gray-600 opacity-60" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-300">
                          {activeTab === "desires"
                            ? `No active desires in ${currentCharacterName}'s Quest Book`
                            : activeTab === "in_progress"
                            ? "No quests currently in progress"
                            : "No completed triumphs yet"}
                        </p>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                          {activeTab === "desires"
                            ? `Click 'Refresh Desires' above to dynamically analyze ${currentCharacterName}'s scene, vitals, and memories to generate 3-5 tasks!`
                            : activeTab === "in_progress"
                            ? "Propose a desire to the character in chat, and agree to help to pin it to your header."
                            : "Triumphs and earned keepsakes will be memorialized here."}
                        </p>
                      </div>

                      {activeTab === "desires" && (
                        <button
                          onClick={onGenerateQuests}
                          disabled={isGenerating}
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-semibold transition-all cursor-pointer"
                        >
                          {isGenerating ? (
                            <Loader2 size={14} className="animate-spin text-amber-400" />
                          ) : (
                            <Sparkles size={14} className="text-amber-400" />
                          )}
                          <span>Generate 3–5 Desires Now</span>
                        </button>
                      )}
                    </div>
                  );
                }

                return currentList.map((quest) => {
                  const badgeStyle = getDifficultyBadgeClass(quest.difficulty);
                  const isProposed = quest.status === "proposed";
                  const isPendingPayout = quest.status === "pending_payout";
                  const isInProgress = quest.status === "in_progress" || isPendingPayout || quest.status === "active";
                  const isCompleted = quest.status === "completed";

                  return (
                    <div
                      key={quest.quest_id}
                      className={`p-4 rounded-xl border transition-all space-y-3 shadow-md group ${
                        isCompleted
                          ? "bg-gradient-to-r from-emerald-950/30 via-[#101814] to-[#0c140e] border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-emerald-950/20"
                          : isPendingPayout
                          ? "bg-gradient-to-r from-emerald-950/25 via-[#14181E] to-[#121418] border-emerald-500/40 ring-1 ring-emerald-500/20"
                          : isInProgress
                          ? "bg-gradient-to-r from-amber-950/20 via-[#14141E] to-[#121218] border-amber-500/40 ring-1 ring-amber-500/20"
                          : isProposed
                          ? "bg-[#14141E] border-amber-500/30"
                          : "bg-[#13131A] border-[#242432] hover:border-[#353548]"
                      }`}
                    >
                      {/* Quest Top Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* For completed quests, show difficulty in green instead of red/rose */}
                            {isCompleted ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                {quest.difficulty}
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle.badge}`}
                              >
                                {quest.difficulty}
                              </span>
                            )}
                            {isProposed && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                Proposed in Chat
                              </span>
                            )}

                            {isPendingPayout && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 animate-pulse">
                                Goal Met — Pending Acknowledgment
                              </span>
                            )}

                            {isInProgress && !isPendingPayout && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50">
                                📌 In Progress
                              </span>
                            )}

                            {isCompleted && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shadow-xs">
                                <CheckCircle2 size={11} className="text-emerald-400" />
                                <span>Completed</span>
                              </span>
                            )}

                            <h3 className={`text-sm font-semibold truncate ${isCompleted ? "text-emerald-200" : "text-white"}`}>
                              {quest.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onDeleteQuest(quest.quest_id)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Remove quest"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Description / Goal */}
                      <div className="space-y-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isCompleted ? "text-emerald-400/80" : "text-gray-400"}`}>
                          Goal:
                        </span>
                        <p className={`text-xs leading-relaxed font-medium ${isCompleted ? "text-emerald-100/90" : "text-gray-200"}`}>
                          {quest.description}
                        </p>
                      </div>

                      {/* Character Motivation Quote */}
                      {quest.character_motivation && (
                        <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          isCompleted
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200/90"
                            : "bg-[#181822] border-[#262634] text-gray-300"
                        }`}>
                          <span className={`${isCompleted ? "text-emerald-400" : "text-amber-400"} shrink-0 text-sm`}>💭</span>
                          <div className="space-y-0.5">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isCompleted ? "text-emerald-400/80" : "text-amber-400/80"}`}>
                              Motivation
                            </span>
                            <p className="italic text-xs">“{quest.character_motivation}”</p>
                          </div>
                        </div>
                      )}

                      {/* Dynamic Rewards Overview */}
                      <div className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2.5 text-xs ${
                        isCompleted
                          ? "bg-emerald-950/20 border-emerald-500/25"
                          : "bg-[#161620] border-[#21212E]"
                      }`}>
                        <div className="flex flex-wrap items-center gap-3">
                          {quest.rewards?.relationship_metrics && (
                            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                              {typeof quest.rewards.relationship_metrics.affinity === "number" && (
                                <span className={isCompleted ? "text-emerald-300 flex items-center gap-1" : "text-rose-300 flex items-center gap-1"}>
                                  <Heart size={11} className={isCompleted ? "text-emerald-400" : "text-rose-400"} />
                                  <span>+{quest.rewards.relationship_metrics.affinity}% Affinity</span>
                                </span>
                              )}
                              {typeof quest.rewards.relationship_metrics.trust === "number" && (
                                <span className={isCompleted ? "text-emerald-300 flex items-center gap-1" : "text-blue-300 flex items-center gap-1"}>
                                  <Shield size={11} className={isCompleted ? "text-emerald-400" : "text-blue-400"} />
                                  <span>+{quest.rewards.relationship_metrics.trust}% Trust</span>
                                </span>
                              )}
                              {typeof quest.rewards.relationship_metrics.harmonic_bond === "number" && (
                                <span className={isCompleted ? "text-emerald-300 flex items-center gap-1" : "text-purple-300 flex items-center gap-1"}>
                                  <Zap size={11} className={isCompleted ? "text-emerald-400" : "text-purple-400"} />
                                  <span>+{quest.rewards.relationship_metrics.harmonic_bond}% Bond</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {quest.rewards?.items && quest.rewards.items.length > 0 && (
                          <div className={`flex items-center gap-1.5 text-[11px] ${isCompleted ? "text-emerald-300" : "text-purple-300"}`}>
                            <Package size={12} className={isCompleted ? "text-emerald-400" : "text-purple-400"} />
                            <span>Item: {quest.rewards.items.map((i) => i.item_name).join(", ")}</span>
                          </div>
                        )}
                      </div>

                      {/* Action & Conversational Guidance */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1C1C26]">
                        {/* Status / Steering actions */}
                        {!isCompleted ? (
                          <div className="flex items-center gap-2">
                            {/* Propose / Offer in Chat button */}
                            <button
                              onClick={() => {
                                onProposeQuest(quest);
                                onClose();
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                              title="Have the character naturally bring up this task in-character right now"
                            >
                              <MessageSquare size={13} />
                              <span>{isProposed ? "Re-Propose in Chat" : "Propose / Offer Quest"}</span>
                            </button>

                            {sysConfig?.manualOverrideFinishQuests && onCompleteQuest && (
                              <button
                                onClick={() => {
                                  onCompleteQuest(quest);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                                title="Manually override and mark this quest as completed without chatting"
                              >
                                <CheckCircle2 size={13} />
                                <span>Force Complete</span>
                              </button>
                            )}
                            {isProposed && (
                              <span className="text-[11px] text-amber-400/80 italic">
                                Awaiting conversational response in chat...
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>
                              Completed{" "}
                              {quest.completedAt && `on ${new Date(quest.completedAt).toLocaleDateString()}`}
                            </span>
                          </span>
                        )}

                        {/* Conversational Acceptance / Completion Status */}
                        <div className="flex items-center gap-2">
                          {!isCompleted && !isInProgress && (
                            <span className="text-[11px] text-gray-400 italic bg-[#181822] px-2.5 py-1 rounded-lg border border-[#242434]">
                              Chat with {currentCharacterName} to accept or decline
                            </span>
                          )}

                          {isInProgress && (
                            <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                              quest.status === "pending_payout"
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 animate-pulse"
                                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                            }`}>
                              {quest.status === "pending_payout"
                                ? "Objective Accomplished — Awaiting Dialogue"
                                : "Active in Chat — Complete via Narrative"}
                            </span>
                          )}

                          {isCompleted && (
                            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg border bg-emerald-500/15 border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                              <Sparkles size={11} className="text-emerald-400" />
                              <span>Memorialized in Memory Palace</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-[#1C1C24] bg-[#0E0E12] flex items-center justify-between text-[11px] text-gray-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <Shield size={12} className="text-amber-500/70" />
            <span>Conversational Quest Engine: Local to {currentCharacterName}</span>
          </span>
          <span>Quests are accepted and completed naturally through chat narrative</span>
        </div>
      </div>
    </div>
  );
}
