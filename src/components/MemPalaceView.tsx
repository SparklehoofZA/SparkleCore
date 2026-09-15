import React, { useState, useEffect } from "react";
import {
  Landmark,
  Layers,
  Search,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Sparkles,
  Network,
  BookOpen,
  Calendar,
  Heart,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Clock,
  X,
  Sliders,
  ChevronRight,
  HeartHandshake,
} from "lucide-react";
import { MemoryPalace, MemoryDrawer, MemoryHall, EntityRelation, Personality, RecallResult } from "../types";

interface MemPalaceViewProps {
  personality: Personality | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRelationshipMetrics?: () => void;
  onOpenSettings?: () => void;
}

export function MemPalaceView({ personality, isOpen, onClose, onOpenRelationshipMetrics, onOpenSettings }: MemPalaceViewProps) {
  const [palace, setPalace] = useState<MemoryPalace | null>(null);
  const [mempalaceConfig, setMempalaceConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"loci" | "graph" | "search">("loci");
  const [selectedWing, setSelectedWing] = useState<string>("all");
  const [selectedHall, setSelectedHall] = useState<MemoryHall | "all">("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  
  // Search & Test Recall state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RecallResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Add / Edit Drawer state
  const [isDrawerModalOpen, setIsDrawerModalOpen] = useState(false);
  const [editingDrawer, setEditingDrawer] = useState<MemoryDrawer | null>(null);
  const [formWing, setFormWing] = useState("Narrative & Encounters");
  const [formRoom, setFormRoom] = useState("Recent Conversations");
  const [formHall, setFormHall] = useState<MemoryHall>("facts");
  const [formContent, setFormContent] = useState("");
  const [formQuote, setFormQuote] = useState("");
  const [formEntities, setFormEntities] = useState("");
  const [formImportance, setFormImportance] = useState(7);

  // Add Relation state
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [relSource, setRelSource] = useState("");
  const [relRelation, setRelRelation] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relContext, setRelContext] = useState("");

  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const personalityId = personality?.id || "default";

  const fetchPalace = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mempalace/${personalityId}`);
      if (res.ok) {
        const data = await res.json();
        setPalace(data);
      }
    } catch (e) {
      console.error("Failed to load MemPalace:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/mempalace/config?personalityId=${personalityId}`);
      if (res.ok) {
        const data = await res.json();
        setMempalaceConfig(data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPalace();
      fetchConfig();
    }
  }, [isOpen, personalityId]);

  const handleDeduplicate = async () => {
    setIsDeduplicating(true);
    setStatusMessage("Deduplicating and decluttering Memory Palace chambers...");
    try {
      const res = await fetch(`/api/mempalace/${personalityId}/deduplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const outcome = await res.json();
        setPalace(outcome.palace);
        const mergedD = outcome.mergedDrawersCount || 0;
        const mergedR = outcome.mergedRelationsCount || 0;
        if (mergedD > 0 || mergedR > 0) {
          setStatusMessage(
            `Declutter Complete: Merged ${mergedD} duplicate drawer${mergedD === 1 ? "" : "s"} and ${mergedR} redundant entity link${mergedR === 1 ? "" : "s"}.`
          );
        } else {
          setStatusMessage("Memory Palace is pristine — no duplicate entries found!");
        }
        setTimeout(() => setStatusMessage(null), 4500);
      }
    } catch (e) {
      setStatusMessage("Failed to deduplicate Memory Palace.");
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsDeduplicating(false);
    }
  };

  const handleConsolidate = async () => {
    setIsConsolidating(true);
    setStatusMessage("Consolidating entire conversation history into MemPalace chambers...");
    try {
      const res = await fetch(`/api/mempalace/${personalityId}/consolidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full: true })
      });
      if (res.ok) {
        const outcome = await res.json();
        await fetchPalace();
        await fetchConfig();
        const dedupeNote = outcome.deduplicated ? " • Auto-decluttered" : "";
        const depthNote = outcome.dialogueDepthUsed ? ` (Reviewed ${outcome.dialogueDepthUsed} messages)` : "";
        setStatusMessage(`Consolidation complete: +${outcome.addedDrawers?.length || 0} memory loci, +${outcome.addedRelations?.length || 0} entity links stored${depthNote}${dedupeNote}.`);
        setTimeout(() => setStatusMessage(null), 4500);
      }
    } catch (e) {
      setStatusMessage("Failed to consolidate dialogue.");
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleSaveDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) return;

    const entitiesArray = formEntities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingDrawer) {
        await fetch(`/api/mempalace/${personalityId}/drawers/${editingDrawer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wing: formWing,
            room: formRoom,
            hall: formHall,
            content: formContent,
            verbatimQuote: formQuote || undefined,
            entities: entitiesArray,
            importance: formImportance,
          }),
        });
      } else {
        await fetch(`/api/mempalace/${personalityId}/drawers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wing: formWing,
            room: formRoom,
            hall: formHall,
            content: formContent,
            verbatimQuote: formQuote || undefined,
            entities: entitiesArray,
            importance: formImportance,
          }),
        });
      }

      setIsDrawerModalOpen(false);
      setEditingDrawer(null);
      setFormContent("");
      setFormQuote("");
      setFormEntities("");
      await fetchPalace();
    } catch (e) {
      console.error("Failed to save drawer:", e);
    }
  };

  const handleDeleteDrawer = async (drawerId: string) => {
    try {
      await fetch(`/api/mempalace/${personalityId}/drawers/${drawerId}`, {
        method: "DELETE",
      });
      await fetchPalace();
    } catch (e) {
      console.error("Failed to delete drawer:", e);
    }
  };

  const handleSaveRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relSource.trim() || !relRelation.trim() || !relTarget.trim()) return;

    try {
      await fetch(`/api/mempalace/${personalityId}/relations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: relSource,
          relation: relRelation,
          target: relTarget,
          context: relContext || undefined,
        }),
      });

      setIsRelationModalOpen(false);
      setRelSource("");
      setRelRelation("");
      setRelTarget("");
      setRelContext("");
      await fetchPalace();
    } catch (e) {
      console.error("Failed to save relation:", e);
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await fetch(`/api/mempalace/${personalityId}/relations/${relationId}`, {
        method: "DELETE",
      });
      await fetchPalace();
    } catch (e) {
      console.error("Failed to delete relation:", e);
    }
  };

  const handleSearchRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/mempalace/${personalityId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, topK: 8 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  // Filter drawers based on selected Wing, Room, and Hall
  const filteredDrawers = (palace?.drawers || []).filter((d) => {
    if (selectedWing !== "all" && d.wing !== selectedWing) return false;
    if (selectedHall !== "all" && d.hall !== selectedHall) return false;
    if (selectedRoom !== "all" && d.room !== selectedRoom) return false;
    return true;
  });

  const availableRooms = Array.from(
    new Set(
      (palace?.drawers || [])
        .filter((d) => selectedWing === "all" || d.wing === selectedWing)
        .map((d) => d.room)
    )
  );

  const getHallIcon = (hall: MemoryHall) => {
    switch (hall) {
      case "facts":
        return <ShieldCheck size={14} className="text-emerald-400" />;
      case "events":
        return <Calendar size={14} className="text-sky-400" />;
      case "discoveries":
        return <Lightbulb size={14} className="text-amber-400" />;
      case "preferences":
        return <Heart size={14} className="text-rose-400" />;
    }
  };

  const getHallBadgeStyle = (hall: MemoryHall) => {
    switch (hall) {
      case "facts":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      case "events":
        return "bg-sky-500/10 text-sky-300 border-sky-500/20";
      case "discoveries":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "preferences":
        return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2A2A2E] bg-[#17171B] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Landmark size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-gray-100 tracking-tight">
                  MemPalace: Method of Loci Memory System
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Verbatim Loci
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Active Palace for: <span className="text-amber-400 font-semibold">{personality?.name || "Global Character"}</span> • Structured hierarchical recall & temporal entity graph
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenRelationshipMetrics && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRelationshipMetrics();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-all shadow-sm"
                title="Open Personality Relationship Metrics & Memory Board"
              >
                <HeartHandshake size={13} className="text-rose-400" />
                <span>Relationship Metrics</span>
              </button>
            )}
            {/* Consolidation Mode Indicator */}
            {mempalaceConfig && (
              <div
                onClick={onOpenSettings}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  onOpenSettings ? "cursor-pointer hover:bg-[#1F1F26]" : ""
                } ${
                  mempalaceConfig.autoConsolidateMode === "auto"
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    : mempalaceConfig.autoConsolidateMode === "message_count"
                    ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                    : "bg-gray-800/40 text-gray-400 border border-gray-700/30"
                }`}
                title={onOpenSettings ? "Click to configure MemPalace settings" : undefined}
              >
                <Sliders size={12} className={mempalaceConfig.autoConsolidateMode === "auto" ? "text-amber-400" : mempalaceConfig.autoConsolidateMode === "message_count" ? "text-sky-400" : "text-gray-400"} />
                <span>
                  {mempalaceConfig.autoConsolidateMode === "auto"
                    ? "Auto (Debounce)"
                    : mempalaceConfig.autoConsolidateMode === "message_count"
                    ? `Every ${mempalaceConfig.messageThreshold} turns (${mempalaceConfig.pendingTurns || 0}/${mempalaceConfig.messageThreshold})`
                    : "Manual Only"}
                </span>
              </div>
            )}

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1A1A22] text-gray-300 hover:text-amber-300 hover:bg-[#242430] border border-[#2E2E38] transition-all"
                title="Open MemPalace Settings"
              >
                <Sliders size={13} className="text-amber-400" />
                <span className="hidden md:inline">Settings</span>
              </button>
            )}

            <button
              onClick={handleDeduplicate}
              disabled={isDeduplicating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition-all disabled:opacity-50"
              title="Scan and merge duplicate memory loci and redundant entity links"
            >
              <Sparkles size={13} className={isDeduplicating ? "animate-spin text-purple-300" : "text-purple-400"} />
              {isDeduplicating ? "Decluttering..." : "Deduplicate & Clean"}
            </button>
            <button
              onClick={handleConsolidate}
              disabled={isConsolidating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all disabled:opacity-50"
              title="Consolidate recent chat history into MemPalace drawers"
            >
              <RefreshCw size={13} className={isConsolidating ? "animate-spin" : ""} />
              {isConsolidating ? "Harvesting Loci..." : "Consolidate Chat"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#252529] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-2.5 bg-[#141418] border-b border-[#2A2A2E] flex flex-wrap items-center justify-between text-xs text-gray-400 gap-3 shrink-0">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-amber-400" />
              <span>Total Drawers:</span>
              <strong className="text-gray-200">{palace?.stats?.totalDrawers || palace?.drawers?.length || 0}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Facts:</span>
              <strong className="text-gray-200">{palace?.stats?.hallCounts?.facts || 0}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-sky-400" />
              <span>Events:</span>
              <strong className="text-gray-200">{palace?.stats?.hallCounts?.events || 0}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Lightbulb size={13} className="text-amber-400" />
              <span>Discoveries:</span>
              <strong className="text-gray-200">{palace?.stats?.hallCounts?.discoveries || 0}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart size={13} className="text-rose-400" />
              <span>Preferences:</span>
              <strong className="text-gray-200">{palace?.stats?.hallCounts?.preferences || 0}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Network size={13} className="text-purple-400" />
              <span>Entity Relations:</span>
              <strong className="text-gray-200">{palace?.entityGraph?.length || 0}</strong>
            </div>
          </div>

          {palace?.lastConsolidatedAt && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Clock size={11} />
              <span>Last synced: {new Date(palace.lastConsolidatedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
            <Sparkles size={14} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#2A2A2E] bg-[#111114] px-4 shrink-0">
          <button
            onClick={() => setActiveTab("loci")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "loci"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1E]"
            }`}
          >
            <Landmark size={14} />
            Chambers & Loci Drawers
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "graph"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1E]"
            }`}
          >
            <Network size={14} />
            Entity-Relationship Graph ({palace?.entityGraph?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "search"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1E]"
            }`}
          >
            <Search size={14} />
            Loci Walkthrough & Recall Simulator
          </button>
        </div>

        {/* Tab 1: Chambers & Loci Drawers */}
        {activeTab === "loci" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Sidebar: Wings & Halls Filter */}
            <div className="w-full md:w-64 border-r border-[#2A2A2E] bg-[#131317] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold mb-2">
                  Palace Wings (Domains)
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedWing("all");
                      setSelectedRoom("all");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedWing === "all"
                        ? "bg-amber-500/15 text-amber-300 font-semibold"
                        : "text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-200"
                    }`}
                  >
                    <span>All Palace Wings</span>
                    <span className="text-[10px] opacity-60">{palace?.drawers?.length || 0}</span>
                  </button>
                  {palace?.wings?.map((w) => {
                    const count = (palace?.drawers || []).filter((d) => d.wing === w.name).length;
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedWing(w.name);
                          setSelectedRoom("all");
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          selectedWing === w.name
                            ? "bg-amber-500/15 text-amber-300 font-semibold"
                            : "text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-200"
                        }`}
                      >
                        <span className="truncate pr-1">{w.name}</span>
                        <span className="text-[10px] opacity-60 shrink-0">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold mb-2">
                  Hall of Loci (Memory Type)
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedHall("all")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedHall === "all"
                        ? "bg-amber-500/15 text-amber-300 font-semibold"
                        : "text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-200"
                    }`}
                  >
                    <span>All Halls</span>
                  </button>
                  <button
                    onClick={() => setSelectedHall("facts")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      selectedHall === "facts"
                        ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                        : "text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-200"
                    }`}
                  >
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span>Hall of Facts</span>
                  </button>
                  <button
                    onClick={() => setSelectedHall("events")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      selectedHall === "events"
                        ? "bg-sky-500/15 text-sky-300 font-semibold"
                        : "text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-200"
                    }`}
                  >
                    <Calendar size={13} className="text-sky-400" />
                    <span>Hall of Events</span>
                  </button>
                  <button
                    onClick={() => setSelectedHall("discoveries")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      selectedHall === "discoveries"
                        ? "bg-amber-500/15 text-amber-300 font-semibold"
                        : "text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-200"
                    }`}
                  >
                    <Lightbulb size={13} className="text-amber-400" />
                    <span>Hall of Discoveries</span>
                  </button>
                  <button
                    onClick={() => setSelectedHall("preferences")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      selectedHall === "preferences"
                        ? "bg-rose-500/15 text-rose-300 font-semibold"
                        : "text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-200"
                    }`}
                  >
                    <Heart size={13} className="text-rose-400" />
                    <span>Hall of Preferences</span>
                  </button>
                </div>
              </div>

              {availableRooms.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">
                    Chambers / Rooms
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setSelectedRoom("all")}
                      className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                        selectedRoom === "all"
                          ? "bg-amber-500/20 text-amber-300 font-medium"
                          : "bg-[#1C1C21] text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      All
                    </button>
                    {availableRooms.map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRoom(r)}
                        className={`px-2 py-0.5 rounded text-[11px] transition-colors truncate max-w-[190px] ${
                          selectedRoom === r
                            ? "bg-amber-500/20 text-amber-300 font-medium"
                            : "bg-[#1C1C21] text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-[#2A2A2E]">
                <button
                  onClick={() => {
                    setEditingDrawer(null);
                    setFormWing(selectedWing !== "all" ? selectedWing : "Narrative & Encounters");
                    setFormRoom(selectedRoom !== "all" ? selectedRoom : "Recent Conversations");
                    setFormHall(selectedHall !== "all" ? selectedHall : "facts");
                    setFormContent("");
                    setFormQuote("");
                    setFormEntities("");
                    setFormImportance(7);
                    setIsDrawerModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-amber-500 text-gray-950 hover:bg-amber-400 transition-colors shadow"
                >
                  <Plus size={14} /> Add Memory Drawer
                </button>
              </div>
            </div>

            {/* Right Main Panel: Drawers Display */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#101013]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <span>{selectedWing === "all" ? "All Wings" : selectedWing}</span>
                    {selectedRoom !== "all" && (
                      <>
                        <ChevronRight size={14} className="text-gray-600" />
                        <span className="text-amber-400">{selectedRoom}</span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Showing {filteredDrawers.length} memory drawers
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeduplicate}
                    disabled={isDeduplicating}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#1C1C22] border border-[#2A2A2E] text-purple-300 hover:bg-[#25252C] transition-colors disabled:opacity-50"
                    title="Deduplicate memory drawers"
                  >
                    <Sparkles size={13} className={isDeduplicating ? "animate-spin" : ""} />
                    <span>Clean Duplicates</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingDrawer(null);
                      setFormWing(selectedWing !== "all" ? selectedWing : "Narrative & Encounters");
                      setFormRoom(selectedRoom !== "all" ? selectedRoom : "Recent Conversations");
                      setFormHall(selectedHall !== "all" ? selectedHall : "facts");
                      setFormContent("");
                      setFormQuote("");
                      setFormEntities("");
                      setFormImportance(7);
                      setIsDrawerModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-[#1C1C22] border border-[#2A2A2E] text-amber-400 hover:bg-[#25252C] transition-colors"
                  >
                    <Plus size={13} />
                    New Drawer
                  </button>
                </div>
              </div>

              {filteredDrawers.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#2A2A2E] rounded-xl text-gray-500">
                  <Landmark size={32} className="opacity-30 mb-2" />
                  <p className="text-sm font-medium text-gray-400">No memory loci in this chamber</p>
                  <p className="text-xs max-w-sm mt-1">
                    Click &quot;Add Memory Drawer&quot; to manually record a permanent memory, or click &quot;Consolidate Chat&quot; to auto-extract from your roleplay dialogue.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {filteredDrawers.map((drawer) => (
                    <div
                      key={drawer.id}
                      className="bg-[#16161B] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-sm group"
                    >
                      <div>
                        {/* Drawer Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${getHallBadgeStyle(drawer.hall)}`}>
                              {getHallIcon(drawer.hall)}
                              {drawer.hall.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-400 bg-[#202026] px-2 py-0.5 rounded border border-[#2D2D35]">
                              {drawer.room}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-amber-400/80 font-mono font-semibold" title="Importance score (1-10)">
                              ★ {drawer.importance}/10
                            </span>
                            <button
                              onClick={() => {
                                setEditingDrawer(drawer);
                                setFormWing(drawer.wing);
                                setFormRoom(drawer.room);
                                setFormHall(drawer.hall);
                                setFormContent(drawer.content);
                                setFormQuote(drawer.verbatimQuote || "");
                                setFormEntities(drawer.entities.join(", "));
                                setFormImportance(drawer.importance);
                                setIsDrawerModalOpen(true);
                              }}
                              className="p-1 text-gray-400 hover:text-amber-400 rounded hover:bg-[#222228] transition-colors"
                              title="Edit Drawer"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteDrawer(drawer.id)}
                              className="p-1 text-gray-400 hover:text-rose-400 rounded hover:bg-[#222228] transition-colors"
                              title="Delete Drawer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-xs text-gray-200 leading-relaxed font-normal mb-2.5">
                          {drawer.content}
                        </p>

                        {/* Verbatim Dialogue Quote */}
                        {drawer.verbatimQuote && (
                          <div className="p-2 bg-[#1C1C23] border-l-2 border-amber-500/70 rounded-r text-[11px] italic text-amber-200/80 mb-2.5">
                            &quot;{drawer.verbatimQuote}&quot;
                          </div>
                        )}
                      </div>

                      {/* Footer: Entities & Recalls */}
                      <div className="pt-2.5 border-t border-[#23232A] flex items-center justify-between text-[10px] text-gray-500">
                        <div className="flex items-center gap-1 flex-wrap">
                          {drawer.entities.map((ent, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-[#202026] text-gray-400 border border-[#2D2D35]"
                            >
                              #{ent}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {drawer.recallCount ? (
                            <span className="text-amber-400/70">Recalled {drawer.recallCount}x</span>
                          ) : null}
                          <span>{new Date(drawer.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Temporal Entity-Relationship Graph */}
        {activeTab === "graph" && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#101013] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-200">
                  Temporal Entity-Relationship Graph
                </h2>
                <p className="text-xs text-gray-500">
                  Models connections between characters, lore items, factions, locations, and user dynamics.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeduplicate}
                  disabled={isDeduplicating}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#1C1C22] border border-[#2A2A2E] text-purple-300 hover:bg-[#25252C] transition-colors disabled:opacity-50"
                  title="Deduplicate entity graph links"
                >
                  <Sparkles size={13} className={isDeduplicating ? "animate-spin" : ""} />
                  <span>Clean Redundant Links</span>
                </button>
                <button
                  onClick={() => setIsRelationModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-amber-500 text-gray-950 font-semibold hover:bg-amber-400 transition-colors shadow"
                >
                  <Plus size={13} />
                  Add Entity Link
                </button>
              </div>
            </div>

            {(!palace?.entityGraph || palace.entityGraph.length === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#2A2A2E] rounded-xl text-gray-500">
                <Network size={32} className="opacity-30 mb-2" />
                <p className="text-sm font-medium text-gray-400">No entity relationships recorded yet</p>
                <p className="text-xs max-w-sm mt-1">
                  Add links manually or use &quot;Consolidate Chat&quot; to auto-extract relationships from conversation history.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {palace.entityGraph.map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-[#16161B] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-bold text-gray-200 px-2 py-0.5 rounded bg-[#202026] border border-[#2E2E36]">
                          {rel.source}
                        </span>
                        <button
                          onClick={() => handleDeleteRelation(rel.id)}
                          className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                          title="Delete Link"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center justify-center my-2">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                          <Network size={12} />
                          <span>── {rel.relation} ──&gt;</span>
                        </div>
                      </div>

                      <div className="text-right text-xs mt-2">
                        <span className="font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 inline-block">
                          {rel.target}
                        </span>
                      </div>

                      {rel.context && (
                        <p className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-[#23232A] italic">
                          &quot;{rel.context}&quot;
                        </p>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-500 mt-3 text-right">
                      {new Date(rel.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Loci Walkthrough & Recall Simulator */}
        {activeTab === "search" && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#101013] flex flex-col">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-200">
                Loci Walkthrough & Recall Inspector
              </h2>
              <p className="text-xs text-gray-500">
                Test how MemPalace traverses your character&apos;s palace chambers to recall episodic context during dialogue.
              </p>
            </div>

            <form onSubmit={handleSearchRecall} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter a test prompt or question (e.g., 'What happened with the ancient sword?' or 'Do you remember what I told you?')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#17171C] border border-[#2A2A2E] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-gray-950 hover:bg-amber-400 transition-colors shrink-0 disabled:opacity-50"
              >
                {isSearching ? "Walking Palace..." : "Simulate Recall"}
              </button>
            </form>

            <div className="flex-1">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                    Retrieved Loci Drawers ({searchResults.length})
                  </h3>
                  {searchResults.map((res, i) => (
                    <div
                      key={res.drawer.id}
                      className="bg-[#16161B] border border-[#2A2A2E] rounded-xl p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">#{i + 1}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getHallBadgeStyle(res.drawer.hall)}`}>
                            {res.drawer.hall.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {res.drawer.wing} &gt; {res.drawer.room}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Match Score: {res.relevanceScore}
                        </span>
                      </div>

                      <p className="text-xs text-gray-200">{res.drawer.content}</p>

                      {res.drawer.verbatimQuote && (
                        <div className="p-2 bg-[#1C1C23] border-l-2 border-amber-500/70 rounded-r text-[11px] italic text-amber-200/80">
                          &quot;{res.drawer.verbatimQuote}&quot;
                        </div>
                      )}

                      {res.matchedKeywords && res.matchedKeywords.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <span>Matched tokens:</span>
                          {res.matchedKeywords.map((k) => (
                            <span key={k} className="px-1.5 py-0.5 rounded bg-[#25252C] text-amber-300 font-mono">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center p-8 text-gray-500 text-xs">
                  No matching loci found for this query.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Drawer */}
        {isDrawerModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#17171C] border border-[#2A2A2E] rounded-xl w-full max-w-lg p-5 flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-200">
                  {editingDrawer ? "Edit Memory Drawer" : "Add Memory Drawer"}
                </h3>
                <button
                  onClick={() => setIsDrawerModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveDrawer} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                      Wing (Domain)
                    </label>
                    <select
                      value={formWing}
                      onChange={(e) => setFormWing(e.target.value)}
                      className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                    >
                      {palace?.wings?.map((w) => (
                        <option key={w.id} value={w.name}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                      Hall (Memory Type)
                    </label>
                    <select
                      value={formHall}
                      onChange={(e) => setFormHall(e.target.value as MemoryHall)}
                      className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                    >
                      <option value="facts">🏛️ Facts (Verbatim Truth)</option>
                      <option value="events">📜 Events (Narrative Timeline)</option>
                      <option value="discoveries">✨ Discoveries (Revelations)</option>
                      <option value="preferences">❤️ Preferences (Affinities)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                    Chamber / Room Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Key Revelations, User Quirks, Weapon Lore"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                    Memory Content
                  </label>
                  <textarea
                    placeholder="What happened or what fact must be permanently remembered?"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60 h-20 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                    Verbatim Dialogue Quote (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder='e.g., "I promise to protect the crystal at all costs."'
                    value={formQuote}
                    onChange={(e) => setFormQuote(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                      Entities (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="User, Elena, Ancient Sword"
                      value={formEntities}
                      onChange={(e) => setFormEntities(e.target.value)}
                      className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                      Importance: {formImportance}/10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formImportance}
                      onChange={(e) => setFormImportance(parseInt(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawerModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-gray-950 hover:bg-amber-400 transition-colors shadow"
                  >
                    Save Drawer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Entity Relation */}
        {isRelationModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#17171C] border border-[#2A2A2E] rounded-xl w-full max-w-md p-5 flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-200">Add Entity Relationship</h3>
                <button
                  onClick={() => setIsRelationModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveRelation} className="space-y-3.5">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                    Source Entity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. User, Elena, Silver Guild"
                    value={relSource}
                    onChange={(e) => setRelSource(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                    Relationship Verb / Action
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gifted, Allied With, Secretly Loves, Distrusts"
                    value={relRelation}
                    onChange={(e) => setRelRelation(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                    Target Entity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ancient Sword, Elena, User"
                    value={relTarget}
                    onChange={(e) => setRelTarget(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                    Context / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Given after the battle of Eldoria"
                    value={relContext}
                    onChange={(e) => setRelContext(e.target.value)}
                    className="w-full bg-[#111114] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRelationModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-gray-950 hover:bg-amber-400 transition-colors shadow"
                  >
                    Save Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
