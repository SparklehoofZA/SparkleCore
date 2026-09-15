import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Heart,
  HeartHandshake,
  Sparkles,
  Network,
  ShieldCheck,
  Eye,
  BookOpen,
  Calendar,
  Tag,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  RefreshCw,
  Activity,
  Layers,
  ChevronRight,
  User,
  Quote,
  Clock,
  Landmark,
  MessageSquare,
  SlidersHorizontal,
  Compass,
  ArrowUpRight,
  Info,
} from "lucide-react";
import {
  Personality,
  UserPersona,
  MemoryPalace,
  MemoryDrawer,
  RelationshipMetrics,
  RelationshipMilestone,
  BoardNode,
  BoardLink,
  MemoryHall,
} from "../types";

interface RelationshipMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personality: Personality | null;
  userPersona?: UserPersona | null;
  onOpenMemPalace?: () => void;
}

export function RelationshipMetricsModal({
  isOpen,
  onClose,
  personality,
  userPersona,
  onOpenMemPalace,
}: RelationshipMetricsModalProps) {
  const [data, setData] = useState<{
    metrics: RelationshipMetrics;
    palace: MemoryPalace;
    personality: Personality;
    userPersona: UserPersona;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"board" | "metrics" | "milestones">("board");

  // Visual Board State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  // Density mode: "key" (clean, spacious, zero clutter) vs "all" (full constellation)
  const [displayDensity, setDisplayDensity] = useState<"key" | "all">("key");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "bond" | "encounters" | "facts" | "secrets" | "entities">("all");
  const [minImportance, setMinImportance] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const personalityId = personality?.id || "default";

  // Fetch relationship metrics and live MemPalace memories
  const fetchMetrics = async () => {
    if (!personalityId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mempalace/${personalityId}/relationship-metrics`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load relationship metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setSelectedNodeId(null);
    }
  }, [isOpen, personalityId]);

  // ESC key listener to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Pan & Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(2.2, Math.max(0.45, prev * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  // Compile Board Nodes and Connecting Lines from MemPalace with collision-free spacing
  const { nodes, links, selectedNode } = useMemo(() => {
    if (!data || !data.palace) {
      return { nodes: [], links: [], selectedNode: null };
    }

    const palace = data.palace;
    const drawers = palace.drawers || [];
    const metrics = data.metrics;

    const charName = data.personality?.name || personality?.name || "Companion";
    const userName = data.userPersona?.name || userPersona?.name || "User";
    const charAvatar = data.personality?.avatar || personality?.avatar;
    const userAvatar = data.userPersona?.avatar || userPersona?.avatar;

    const compiledNodes: BoardNode[] = [];
    const compiledLinks: BoardLink[] = [];

    // 1. Center Core Nodes: User (Left) and Character (Right)
    const USER_NODE_ID = "node-core-user";
    const CHAR_NODE_ID = "node-core-character";

    compiledNodes.push({
      id: USER_NODE_ID,
      type: "user",
      label: userName,
      sublabel: userPersona?.traits ? userPersona.traits.slice(0, 25) : "User Persona",
      avatar: userAvatar,
      x: -150,
      y: 0,
      color: "#F59E0B",
    });

    compiledNodes.push({
      id: CHAR_NODE_ID,
      type: "personality",
      label: charName,
      sublabel: personality?.age ? `Age ${personality.age} • Companion` : "Companion",
      avatar: charAvatar,
      x: 150,
      y: 0,
      color: "#EC4899",
    });

    // Central Emotional Resonance Link between User & Character
    compiledLinks.push({
      id: "link-core-resonance",
      source: USER_NODE_ID,
      target: CHAR_NODE_ID,
      label: `${metrics?.stage || "Bond"} (${metrics?.overallBondScore || 25}%)`,
      strength: 10,
      color: "#F43F5E",
      style: "resonant",
      sentiment: "intimate",
    });

    // 2. Classify and sort MemPalace Drawers into semantic categories
    const bondDrawers: MemoryDrawer[] = [];
    const encounterDrawers: MemoryDrawer[] = [];
    const userFactDrawers: MemoryDrawer[] = [];
    const charFactDrawers: MemoryDrawer[] = [];
    const secretDrawers: MemoryDrawer[] = [];

    for (const d of drawers) {
      const wingLower = (d.wing || "").toLowerCase();
      const roomLower = (d.room || "").toLowerCase();

      if (wingLower.includes("bond") || roomLower.includes("relationship") || roomLower.includes("promise")) {
        bondDrawers.push(d);
      } else if (wingLower.includes("secret") || roomLower.includes("vulnerab") || roomLower.includes("unspoken")) {
        secretDrawers.push(d);
      } else if (d.hall === "events" || roomLower.includes("encounter") || roomLower.includes("conversation")) {
        encounterDrawers.push(d);
      } else if (wingLower.includes("user") || roomLower.includes("user")) {
        userFactDrawers.push(d);
      } else {
        charFactDrawers.push(d);
      }
    }

    // Sort by importance descending so most salient memories are highlighted
    const sortByImportance = (a: MemoryDrawer, b: MemoryDrawer) => (b.importance || 5) - (a.importance || 5);
    bondDrawers.sort(sortByImportance);
    encounterDrawers.sort(sortByImportance);
    userFactDrawers.sort(sortByImportance);
    charFactDrawers.sort(sortByImportance);
    secretDrawers.sort(sortByImportance);

    // Filter items according to Display Density mode
    const selectedBonds = displayDensity === "key" ? bondDrawers.slice(0, 3) : bondDrawers.slice(0, 6);
    const selectedEncounters = displayDensity === "key" ? encounterDrawers.slice(0, 4) : encounterDrawers.slice(0, 8);
    const selectedUserFacts = displayDensity === "key" ? userFactDrawers.slice(0, 3) : userFactDrawers.slice(0, 6);
    const selectedCharFacts = displayDensity === "key" ? charFactDrawers.slice(0, 3) : charFactDrawers.slice(0, 6);
    const selectedSecrets = displayDensity === "key" ? secretDrawers.slice(0, 2) : secretDrawers.slice(0, 4);

    // Helper to add a drawer node and its clean link
    const addDrawerNode = (
      d: MemoryDrawer,
      x: number,
      y: number,
      color: string,
      nodeType: BoardNode["type"],
      defaultTarget: "user" | "char" | "both" = "both"
    ) => {
      const nodeId = `drawer-${d.id}`;
      compiledNodes.push({
        id: nodeId,
        type: nodeType,
        label: d.room || d.wing || "Memory",
        sublabel: d.verbatimQuote ? `"${d.verbatimQuote.slice(0, 32)}..."` : d.content.slice(0, 38),
        content: d.content,
        quote: d.verbatimQuote,
        importance: d.importance,
        hall: d.hall,
        wing: d.wing,
        room: d.room,
        recallCount: d.recallCount,
        date: d.timestamp,
        x,
        y,
        color,
      });

      const strength = Math.max(2, Math.min(8, d.importance || 5));
      const text = (d.content + " " + (d.entities || []).join(" ")).toLowerCase();
      const hasUser = text.includes("user") || defaultTarget === "user" || defaultTarget === "both";
      const hasChar = text.includes(charName.toLowerCase()) || defaultTarget === "char" || defaultTarget === "both";

      if (hasUser && hasChar && defaultTarget === "both") {
        // Connect to both User and Character
        compiledLinks.push({
          id: `link-${USER_NODE_ID}-${nodeId}`,
          source: USER_NODE_ID,
          target: nodeId,
          label: "Mutual Memory",
          strength,
          color,
          style: d.importance >= 8 ? "glowing" : "solid",
        });
        compiledLinks.push({
          id: `link-${CHAR_NODE_ID}-${nodeId}`,
          source: CHAR_NODE_ID,
          target: nodeId,
          label: "Shared Encounter",
          strength,
          color,
          style: d.importance >= 8 ? "glowing" : "solid",
        });
      } else if (hasUser && !hasChar) {
        compiledLinks.push({
          id: `link-${USER_NODE_ID}-${nodeId}`,
          source: USER_NODE_ID,
          target: nodeId,
          label: "User Truth",
          strength,
          color,
          style: "solid",
        });
      } else {
        compiledLinks.push({
          id: `link-${CHAR_NODE_ID}-${nodeId}`,
          source: CHAR_NODE_ID,
          target: nodeId,
          label: "Companion Lore",
          strength,
          color,
          style: "solid",
        });
      }
    };

    // 3. Guaranteed Collision-Free Spatial Layout
    // SECTOR 1: Bonds & Feelings (Top Arc - Pink #EC4899)
    if (selectedBonds.length > 0) {
      const count = selectedBonds.length;
      const startX = -((count - 1) * 90);
      selectedBonds.forEach((d, i) => {
        const x = startX + i * 180;
        const y = -210 - Math.abs(x) * 0.15;
        addDrawerNode(d, x, Math.round(y), "#EC4899", "milestone", "both");
      });
    }

    // SECTOR 2: Encounters & Dialogue (Bottom Arc - Amber #F59E0B)
    if (selectedEncounters.length > 0) {
      const count = selectedEncounters.length;
      const startX = -((count - 1) * 95);
      selectedEncounters.forEach((d, i) => {
        const x = startX + i * 190;
        const y = 205 + Math.abs(x) * 0.12;
        addDrawerNode(d, x, Math.round(y), "#F59E0B", "memory", "both");
      });
    }

    // SECTOR 3: Discovered User Facts & Lore (Left Flank - Emerald #10B981)
    if (selectedUserFacts.length > 0) {
      const count = selectedUserFacts.length;
      const startY = -((count - 1) * 45);
      selectedUserFacts.forEach((d, i) => {
        const x = -350 - (i % 2 === 1 ? 50 : 0);
        const y = startY + i * 90;
        addDrawerNode(d, x, y, "#10B981", "memory", "user");
      });
    }

    // SECTOR 4: Discovered Companion Lore & Quirks (Right Flank - Emerald #10B981 / Purple #8B5CF6)
    if (selectedCharFacts.length > 0) {
      const count = selectedCharFacts.length;
      const startY = -((count - 1) * 45);
      selectedCharFacts.forEach((d, i) => {
        const x = 350 + (i % 2 === 1 ? 50 : 0);
        const y = startY + i * 90;
        addDrawerNode(d, x, y, "#10B981", "memory", "char");
      });
    }

    // SECTOR 5: Secrets & Epiphanies (Upper Corners - Violet #8B5CF6)
    if (selectedSecrets.length > 0) {
      selectedSecrets.forEach((d, i) => {
        const x = i % 2 === 0 ? -330 : 330;
        const y = -140 - Math.floor(i / 2) * 80;
        addDrawerNode(d, x, y, "#8B5CF6", "secret", "both");
      });
    }

    // SECTOR 6: Discovered World Relics & Places (Outer Diagonal Havens - Cyan #06B6D4)
    const mutualEntities = data.metrics.mutualEntities || [];
    const relicItems = displayDensity === "key" ? mutualEntities.slice(0, 2) : mutualEntities.slice(0, 4);
    const cornerOffsets = [
      { x: -280, y: -290 },
      { x: 280, y: -290 },
      { x: -290, y: 290 },
      { x: 290, y: 290 },
    ];

    relicItems.forEach((entityName, idx) => {
      const entityId = `entity-${idx}`;
      const offset = cornerOffsets[idx % cornerOffsets.length];

      compiledNodes.push({
        id: entityId,
        type: "entity",
        label: entityName,
        sublabel: "World Relic / Haven",
        x: offset.x,
        y: offset.y,
        color: "#06B6D4",
      });

      compiledLinks.push({
        id: `link-${CHAR_NODE_ID}-${entityId}`,
        source: CHAR_NODE_ID,
        target: entityId,
        label: "Associated Haven",
        strength: 3,
        color: "#06B6D4",
        style: "dashed",
      });
    });

    const activeNode = compiledNodes.find((n) => n.id === selectedNodeId) || null;

    return { nodes: compiledNodes, links: compiledLinks, selectedNode: activeNode };
  }, [data, personality, userPersona, selectedNodeId, displayDensity]);

  // Filtered nodes based on category, min importance, search
  const filteredNodeIds = useMemo(() => {
    const ids = new Set<string>();
    const query = searchQuery.trim().toLowerCase();

    for (const n of nodes) {
      if (n.type === "user" || n.type === "personality") {
        ids.add(n.id);
        continue;
      }

      // Filter category
      if (filterCategory === "bond" && n.color !== "#EC4899") continue;
      if (filterCategory === "encounters" && n.color !== "#F59E0B") continue;
      if (filterCategory === "facts" && n.color !== "#10B981") continue;
      if (filterCategory === "secrets" && n.color !== "#8B5CF6") continue;
      if (filterCategory === "entities" && n.type !== "entity") continue;

      // Filter importance
      if (minImportance > 0 && (n.importance || 0) < minImportance) continue;

      // Search query
      if (query) {
        const text = `${n.label} ${n.sublabel || ""} ${n.content || ""} ${n.quote || ""}`.toLowerCase();
        if (!text.includes(query)) continue;
      }

      ids.add(n.id);
    }
    return ids;
  }, [nodes, filterCategory, minImportance, searchQuery]);

  // Node Map for fast coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, BoardNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  if (!isOpen) return null;

  const metrics = data?.metrics;
  const charName = personality?.name || data?.personality?.name || "Companion";
  const userName = userPersona?.name || data?.userPersona?.name || "User";

  // Check if someone has active hover or selection to isolate lines
  const activeFocusId = hoveredNodeId || selectedNodeId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[94vh] bg-[#0C0C10] border border-[#262632] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-100">
        
        {/* Top Header Bar */}
        <header className="px-5 py-3.5 bg-[#121218] border-b border-[#22222E] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatars */}
            <div className="flex items-center -space-x-2">
              <div className="w-9 h-9 rounded-xl border-2 border-amber-500/50 bg-[#1A1A22] overflow-hidden flex items-center justify-center shadow">
                {userPersona?.avatar ? (
                  <img src={userPersona.avatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-amber-300">{userName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="w-9 h-9 rounded-xl border-2 border-rose-500/50 bg-[#1A1A22] overflow-hidden flex items-center justify-center shadow z-10">
                {personality?.avatar ? (
                  <img src={personality.avatar} alt={charName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-rose-300">{charName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 tracking-tight">
                  <HeartHandshake size={18} className="text-rose-400" />
                  <span>Relationship Metrics & Memory Board</span>
                </h2>
                {metrics && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-1 shadow-sm">
                    <Sparkles size={11} className="text-rose-400" />
                    <span>Stage: {metrics.stage}</span>
                    <span className="text-rose-200/60 font-mono">({metrics.overallBondScore}%)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">
                {userName} & {charName} • Sourced directly from MemPalace loci memory bank ({data?.palace?.drawers?.length || 0} memories)
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex items-center gap-2.5">
            {/* View Tab Switcher */}
            <div className="flex items-center bg-[#171720] p-1 rounded-xl border border-[#262634]">
              <button
                type="button"
                onClick={() => setActiveTab("board")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "board"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Network size={14} className={activeTab === "board" ? "text-rose-400" : "text-gray-400"} />
                <span>Memory Board</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("metrics")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "metrics"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Activity size={14} className={activeTab === "metrics" ? "text-rose-400" : "text-gray-400"} />
                <span>Metrics Breakdown</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("milestones")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "milestones"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Calendar size={14} className={activeTab === "milestones" ? "text-rose-400" : "text-gray-400"} />
                <span>Milestone Timeline</span>
              </button>
            </div>

            {/* Sync / Refresh */}
            <button
              type="button"
              onClick={fetchMetrics}
              disabled={loading}
              className="p-2 rounded-xl bg-[#171720] border border-[#262634] text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              title="Sync & Recalculate with MemPalace"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-rose-400" : ""} />
            </button>

            {/* Jump to MemPalace */}
            {onOpenMemPalace && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMemPalace();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors"
                title="Open MemPalace Loci Viewer"
              >
                <Landmark size={13} />
                <span>MemPalace</span>
              </button>
            )}

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#171720] border border-[#262634] text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          
          {/* TAB 1: VISUAL MEMORY BOARD */}
          {activeTab === "board" && (
            <div className="flex-1 flex flex-col relative overflow-hidden select-none">
              
              {/* Board Floating Controls & Filter Bar */}
              <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                
                {/* Density Switcher + Filter Category Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
                  {/* Key vs All Memories Toggle */}
                  <div className="flex items-center bg-[#111118]/95 backdrop-blur-md p-0.5 rounded-xl border border-[#2D2D3E] shadow-lg">
                    <button
                      type="button"
                      onClick={() => setDisplayDensity("key")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        displayDensity === "key"
                          ? "bg-rose-500 text-black shadow-sm"
                          : "text-gray-300 hover:text-white"
                      }`}
                      title="Curated, non-overlapping key memories"
                    >
                      <Sparkles size={12} />
                      <span>Key Memories</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayDensity("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        displayDensity === "all"
                          ? "bg-rose-500 text-black shadow-sm"
                          : "text-gray-300 hover:text-white"
                      }`}
                      title="Show all recorded MemPalace drawers"
                    >
                      <Layers size={12} />
                      <span>All ({data?.palace?.drawers?.length || 0})</span>
                    </button>
                  </div>

                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1 bg-[#111118]/90 backdrop-blur-md p-1 rounded-xl border border-[#262636] shadow-lg">
                    <button
                      type="button"
                      onClick={() => setFilterCategory("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        filterCategory === "all" ? "bg-white/20 text-white font-semibold" : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory("bond")}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        filterCategory === "bond" ? "bg-rose-500/30 text-rose-300 border border-rose-500/50" : "text-rose-300/70 hover:text-rose-300"
                      }`}
                    >
                      <Heart size={10} />
                      <span>Bond</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory("encounters")}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        filterCategory === "encounters" ? "bg-amber-500/30 text-amber-300 border border-amber-500/50" : "text-amber-300/70 hover:text-amber-300"
                      }`}
                    >
                      <MessageSquare size={10} />
                      <span>Encounters</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory("facts")}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        filterCategory === "facts" ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50" : "text-emerald-300/70 hover:text-emerald-300"
                      }`}
                    >
                      <BookOpen size={10} />
                      <span>Facts & Lore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory("secrets")}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        filterCategory === "secrets" ? "bg-purple-500/30 text-purple-300 border border-purple-500/50" : "text-purple-300/70 hover:text-purple-300"
                      }`}
                    >
                      <ShieldCheck size={10} />
                      <span>Secrets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategory("entities")}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        filterCategory === "entities" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50" : "text-cyan-300/70 hover:text-cyan-300"
                      }`}
                    >
                      <Tag size={10} />
                      <span>Havens</span>
                    </button>
                  </div>
                </div>

                {/* Search, Zoom & Reset Controls */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search memories..."
                      className="bg-[#111118]/90 backdrop-blur border border-[#2D2D3C] focus:border-rose-500/60 rounded-xl pl-7 pr-3 py-1.5 text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none shadow-md w-40 sm:w-48"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2 text-xs text-gray-400 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="flex items-center bg-[#111118]/90 backdrop-blur p-0.5 rounded-xl border border-[#2D2D3C] shadow-md">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
                      className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1E1E2A] rounded-lg transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.45, z - 0.15))}
                      className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1E1E2A] rounded-lg transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={resetView}
                      className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1E1E2A] rounded-lg transition-colors text-[10px] font-mono font-semibold px-2"
                      title="Reset View"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                  </div>
                </div>
              </div>

              {/* Main SVG & HTML Interactive Canvas */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[#09090D]"
                style={{
                  backgroundImage: `radial-gradient(#1E1E28 1px, transparent 1px)`,
                  backgroundSize: `${36 * zoom}px ${36 * zoom}px`,
                  backgroundPosition: `${pan.x}px ${pan.y}px`,
                }}
              >
                {/* SVG Connecting Lines Layer */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                >
                  <defs>
                    <linearGradient id="coreResonanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#F43F5E" stopOpacity="1" />
                      <stop offset="100%" stopColor="#EC4899" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Connecting Links */}
                  <g>
                    {links.map((link) => {
                      const sourceNode = nodeMap.get(link.source);
                      const targetNode = nodeMap.get(link.target);
                      if (!sourceNode || !targetNode) return null;

                      // Skip if nodes are hidden by filter
                      const isSourceVisible = filteredNodeIds.has(sourceNode.id);
                      const isTargetVisible = filteredNodeIds.has(targetNode.id);
                      if (!isSourceVisible || !isTargetVisible) return null;

                      const centerX = (containerRef.current?.clientWidth || 1000) / 2;
                      const centerY = (containerRef.current?.clientHeight || 600) / 2;

                      const x1 = centerX + sourceNode.x;
                      const y1 = centerY + sourceNode.y;
                      const x2 = centerX + targetNode.x;
                      const y2 = centerY + targetNode.y;

                      const isDirectlyFocused =
                        activeFocusId === sourceNode.id ||
                        activeFocusId === targetNode.id ||
                        hoveredLinkId === link.id;

                      const isSelected = selectedNodeId === sourceNode.id || selectedNodeId === targetNode.id;

                      // Calculate curved bezier curve
                      const dx = x2 - x1;
                      const dy = y2 - y1;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const curvature = link.style === "resonant" ? 0 : Math.min(45, dist * 0.12);
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2 - curvature;

                      const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

                      if (link.style === "resonant") {
                        return (
                          <g key={link.id} className="transition-opacity">
                            {/* Outer resonance glow */}
                            <path
                              d={`M ${x1} ${y1} Q ${midX} ${midY - 15} ${x2} ${y2}`}
                              stroke="url(#coreResonanceGradient)"
                              strokeWidth="7"
                              strokeOpacity="0.25"
                              fill="none"
                              filter="url(#glowFilter)"
                            />
                            {/* Inner harmonic beam */}
                            <path
                              d={`M ${x1} ${y1} Q ${midX} ${midY - 15} ${x2} ${y2}`}
                              stroke="url(#coreResonanceGradient)"
                              strokeWidth="3"
                              strokeDasharray="5 3"
                              fill="none"
                              className="animate-pulse"
                            />
                          </g>
                        );
                      }

                      // Dynamic line de-cluttering: dim non-focused lines when inspecting
                      let strokeOpacity = 0.22;
                      let strokeWidth = 1.2;

                      if (activeFocusId) {
                        if (isDirectlyFocused) {
                          strokeOpacity = 0.95;
                          strokeWidth = 2.6;
                        } else {
                          strokeOpacity = 0.04;
                        }
                      } else if (link.style === "glowing") {
                        strokeOpacity = 0.45;
                        strokeWidth = 1.8;
                      }

                      return (
                        <g
                          key={link.id}
                          className="pointer-events-auto cursor-pointer"
                          onMouseEnter={() => setHoveredLinkId(link.id)}
                          onMouseLeave={() => setHoveredLinkId(null)}
                        >
                          {/* Wide hit area for hover ease */}
                          <path d={pathD} stroke="transparent" strokeWidth="14" fill="none" />

                          {/* Rendered line */}
                          <path
                            d={pathD}
                            stroke={isDirectlyFocused ? "#FFFFFF" : link.color || "#888899"}
                            strokeWidth={strokeWidth}
                            strokeOpacity={strokeOpacity}
                            strokeDasharray={link.style === "dashed" ? "4 4" : undefined}
                            fill="none"
                            className="transition-all duration-150"
                            filter={isDirectlyFocused ? "url(#glowFilter)" : undefined}
                          />

                          {/* Relationship Badge on Active Focus */}
                          {isDirectlyFocused && link.label && (
                            <text
                              x={midX}
                              y={midY - 6}
                              fill="#FFFFFF"
                              fontSize="10"
                              fontWeight="600"
                              textAnchor="middle"
                              className="select-none font-sans"
                            >
                              {link.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* HTML Interactive Nodes Layer */}
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                >
                  {nodes.map((node) => {
                    const isVisible = filteredNodeIds.has(node.id);
                    if (!isVisible) return null;

                    const centerX = (containerRef.current?.clientWidth || 1000) / 2;
                    const centerY = (containerRef.current?.clientHeight || 600) / 2;
                    const nodeX = centerX + node.x;
                    const nodeY = centerY + node.y;

                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;

                    // Core User & Personality Anchor Cards
                    if (node.type === "user" || node.type === "personality") {
                      const isUser = node.type === "user";
                      return (
                        <div
                          key={node.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(isSelected ? null : node.id);
                          }}
                          onMouseEnter={() => setHoveredNodeId(node.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer p-2 rounded-2xl border-2 transition-all duration-200 flex items-center gap-2.5 shadow-xl ${
                            isUser
                              ? "bg-[#14141E] border-amber-500/70 hover:border-amber-400 shadow-amber-500/10"
                              : "bg-[#19131C] border-rose-500/70 hover:border-rose-400 shadow-rose-500/10"
                          } ${isSelected ? "ring-4 ring-white/30 scale-105" : "hover:scale-105"}`}
                          style={{
                            left: `${nodeX}px`,
                            top: `${nodeY}px`,
                            width: "155px",
                          }}
                        >
                          <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 ${isUser ? "border-amber-400" : "border-rose-400"} bg-[#101016] flex items-center justify-center`}>
                            {node.avatar ? (
                              <img src={node.avatar} alt={node.label} className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-xs font-bold ${isUser ? "text-amber-300" : "text-rose-300"}`}>
                                {node.label.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={`text-[9px] font-bold uppercase tracking-wider block ${isUser ? "text-amber-400" : "text-rose-400"}`}>
                              {isUser ? "User Persona" : "Companion"}
                            </span>
                            <p className="text-xs font-bold text-white truncate">{node.label}</p>
                            <p className="text-[9px] text-gray-400 truncate">{node.sublabel}</p>
                          </div>
                        </div>
                      );
                    }

                    // Compact, Legible Memory Capsules
                    return (
                      <div
                        key={node.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(isSelected ? null : node.id);
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer px-2.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-150 shadow-md ${
                          isSelected
                            ? "bg-[#1A1A26] ring-2 ring-white scale-110 z-30"
                            : isHovered
                            ? "bg-[#161622] scale-105 z-20"
                            : "bg-[#101016]/95 hover:bg-[#14141E] z-10"
                        }`}
                        style={{
                          left: `${nodeX}px`,
                          top: `${nodeY}px`,
                          width: "150px",
                          borderColor: node.color ? `${node.color}50` : "#2E2E3E",
                          boxShadow: isSelected || isHovered ? `0 6px 20px -3px ${node.color}35` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider px-1 py-0.2 rounded flex items-center gap-1 truncate max-w-[100px]"
                            style={{
                              backgroundColor: `${node.color}15`,
                              color: node.color || "#EEEEEE",
                            }}
                          >
                            {node.hall === "facts" && <BookOpen size={9} />}
                            {node.hall === "events" && <MessageSquare size={9} />}
                            {node.type === "secret" && <ShieldCheck size={9} />}
                            {node.type === "milestone" && <Heart size={9} />}
                            {node.type === "entity" && <Tag size={9} />}
                            <span className="truncate">{node.label}</span>
                          </span>

                          {node.importance && (
                            <span className="text-[9px] font-mono text-amber-400 font-bold shrink-0">
                              ★{node.importance}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-gray-200 truncate leading-tight">
                          {node.sublabel}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Center Resonance Stage Pill */}
                {metrics && (
                  <div
                    className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{
                      left: `${(containerRef.current?.clientWidth || 1000) / 2 + pan.x}px`,
                      top: `${(containerRef.current?.clientHeight || 600) / 2 + pan.y - 40 * zoom}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="px-3 py-1 rounded-full bg-[#12121A]/95 backdrop-blur-md border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 shadow-xl">
                      <Heart size={12} className="text-rose-400 animate-pulse" />
                      <span>{metrics.stage}</span>
                      <span className="text-[10px] text-gray-400 font-mono">({metrics.overallBondScore}%)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Memory Inspector Drawer (Right Side) */}
              {selectedNode && selectedNode.type !== "user" && selectedNode.type !== "personality" && (
                <div className="absolute right-3 top-16 bottom-3 w-72 sm:w-80 bg-[#121218]/95 backdrop-blur-md border border-[#2B2B3C] rounded-2xl p-4 shadow-2xl z-30 flex flex-col justify-between animate-in slide-in-from-right-4 duration-200">
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1"
                          style={{
                            backgroundColor: `${selectedNode.color}20`,
                            color: selectedNode.color || "#FFFFFF",
                          }}
                        >
                          {selectedNode.type === "secret" ? "Confided Secret" : selectedNode.room || "Memory Locus"}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {selectedNode.label}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedNodeId(null)}
                        className="p-1 text-gray-400 hover:text-white rounded-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Verbatim Quote */}
                    {selectedNode.quote && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs italic flex items-start gap-1.5">
                        <Quote size={13} className="shrink-0 mt-0.5 text-amber-400" />
                        <span>"{selectedNode.quote}"</span>
                      </div>
                    )}

                    {/* Content */}
                    {selectedNode.content && (
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {selectedNode.content}
                      </p>
                    )}

                    {/* MemPalace Location */}
                    <div className="p-2.5 rounded-xl bg-[#181822] border border-[#252534] text-[11px] space-y-1">
                      <div className="text-gray-400 flex items-center justify-between">
                        <span>Wing:</span>
                        <span className="text-gray-200 font-medium">{selectedNode.wing || "General"}</span>
                      </div>
                      <div className="text-gray-400 flex items-center justify-between">
                        <span>Room:</span>
                        <span className="text-gray-200 font-medium">{selectedNode.room || "Loci"}</span>
                      </div>
                      <div className="text-gray-400 flex items-center justify-between">
                        <span>Hall:</span>
                        <span className="text-gray-200 capitalize font-medium">{selectedNode.hall || "Events"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inspector Footer */}
                  <div className="pt-3 border-t border-[#222230] flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-bold font-mono">
                      Importance: {selectedNode.importance}/10
                    </span>
                    {onOpenMemPalace && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMemPalace();
                        }}
                        className="flex items-center gap-1 text-amber-300 hover:text-amber-200 font-medium"
                      >
                        <span>View in MemPalace</span>
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED METRICS BREAKDOWN */}
          {activeTab === "metrics" && metrics && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Top Hero Banner with Dynamic Relationship Standing */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/25 via-[#161622] to-amber-950/25 border border-[#2D2D3E] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Stage: {metrics.stage}
                    </span>
                    <span className="text-xs text-amber-400 font-medium">{metrics.stageSubtitle}</span>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {metrics.stageDescription}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                    <Info size={13} className="text-rose-400" />
                    <span>Relationship standing is computed from genuine shared memories, disclosures, and emotional reciprocity.</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3.5 bg-[#121218] px-5 py-3 rounded-xl border border-[#252534]">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Harmonic Bond</span>
                    <span className="text-2xl font-black text-rose-400 font-mono">{metrics.overallBondScore}%</span>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-rose-500/30 border-t-rose-400 flex items-center justify-center text-rose-300">
                    <Heart size={20} className="fill-rose-500/20" />
                  </div>
                </div>
              </div>

              {/* 4 Core Gauge Meters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Affinity */}
                <div className="p-4 rounded-xl bg-[#14141E] border border-[#252534] space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Heart size={14} className="text-rose-400" />
                      Affinity & Warmth
                    </span>
                    <span className="text-sm font-mono font-bold text-rose-400">{metrics.affinityScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.affinityScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">Positive impressions, compliments, and shared warmth.</p>
                </div>

                {/* 2. Trust */}
                <div className="p-4 rounded-xl bg-[#14141E] border border-[#252534] space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-purple-400" />
                      Mutual Trust & Secrets
                    </span>
                    <span className="text-sm font-mono font-bold text-purple-400">{metrics.trustScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.trustScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">Confided personal facts, vulnerabilities, and shared secrets.</p>
                </div>

                {/* 3. Familiarity */}
                <div className="p-4 rounded-xl bg-[#14141E] border border-[#252534] space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-emerald-400" />
                      Familiarity & Recalls
                    </span>
                    <span className="text-sm font-mono font-bold text-emerald-400">{metrics.familiarityScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.familiarityScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">{metrics.totalSharedMemories} MemPalace loci anchored, {metrics.totalRecalls} conversational recalls.</p>
                </div>

                {/* 4. Chemistry */}
                <div className="p-4 rounded-xl bg-[#14141E] border border-[#252534] space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      Chemistry & Banter
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-400">{metrics.chemistryScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.chemistryScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">Playful testing, snappy witty exchanges, and conversational rhythm.</p>
                </div>
              </div>

              {/* Emotional Dynamics Spectrum */}
              <div className="p-5 rounded-2xl bg-[#14141E] border border-[#252534] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-rose-400" />
                  <span>Emotional Dynamics Spectrum</span>
                </h3>
                <div className="space-y-3">
                  {metrics.emotionalDynamics.map((item) => (
                    <div key={item.trait} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 font-medium">{item.trait}</span>
                        <span className="font-mono font-semibold" style={{ color: item.color }}>
                          {item.score}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#1C1C28] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.score}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two Column Knowledge Vault */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: What Personality Knows About User */}
                <div className="p-4 rounded-xl bg-[#14141E] border border-[#252534] space-y-3">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <User size={14} />
                    <span>What {charName} Knows About You</span>
                  </h4>
                  {metrics.knownAboutUser.length > 0 ? (
                    <ul className="space-y-2">
                      {metrics.knownAboutUser.map((fact, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2 bg-[#1A1A26] p-2.5 rounded-lg border border-[#262638]">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span className="leading-relaxed">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No user-specific facts recorded yet.</p>
                  )}
                </div>

                {/* Right: What You Know About Personality */}
                <div className="p-4 rounded-xl bg-[#14141E] border border-[#252534] space-y-3">
                  <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <Heart size={14} />
                    <span>What You Know About {charName}</span>
                  </h4>
                  {metrics.knownAboutPersonality.length > 0 ? (
                    <ul className="space-y-2">
                      {metrics.knownAboutPersonality.map((fact, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2 bg-[#1A1A26] p-2.5 rounded-lg border border-[#262638]">
                          <span className="text-rose-400 mt-0.5">•</span>
                          <span className="leading-relaxed">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No character-specific facts recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MILESTONE TIMELINE */}
          {activeTab === "milestones" && metrics && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Calendar size={16} className="text-rose-400" />
                    <span>Key Relationship Milestones & Encounters</span>
                  </h3>
                  <p className="text-xs text-gray-400">Chronological moments and turning points recorded in the MemPalace memory bank.</p>
                </div>
                <span className="text-xs font-mono text-gray-400 bg-[#171722] px-2.5 py-1 rounded-lg border border-[#262634]">
                  {metrics.milestones.length} Turning Points
                </span>
              </div>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#222230]">
                {metrics.milestones.map((m, idx) => (
                  <div key={m.id || idx} className="relative pl-9 group">
                    {/* Timeline Node Dot */}
                    <div className="absolute left-1.5 top-3 w-4 h-4 rounded-full bg-[#161622] border-2 border-rose-500/60 group-hover:border-rose-400 group-hover:scale-110 transition-transform shadow flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    </div>

                    {/* Milestone Card */}
                    <div className="p-3.5 rounded-xl bg-[#14141E] border border-[#252534] hover:border-gray-600 transition-all space-y-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{m.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-medium">
                            {m.room}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                          <span>{new Date(m.date).toLocaleDateString()}</span>
                          <span className="text-amber-400 font-bold">★{m.importance}</span>
                        </div>
                      </div>

                      {m.quote && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs italic text-amber-200 flex items-start gap-1.5">
                          <Quote size={12} className="shrink-0 mt-0.5 text-amber-400" />
                          <span>"{m.quote}"</span>
                        </div>
                      )}

                      <p className="text-xs text-gray-300 leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
