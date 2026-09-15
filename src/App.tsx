import { useState, useEffect, useRef } from "react";
import { Send, Image as ImageIcon, Loader2, Trash2, Plus, UserCircle2, Cpu, Camera, Edit2, Landmark, Sparkles, Server, Settings, Settings2, RotateCcw, Copy, Check, RefreshCw, Heart, HeartHandshake, MapPin, Eye, Calendar, FileText, Bookmark, AlertCircle, X, Download, Upload, MessageSquare, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Compass, Activity, PlusCircle, FileDown, Monitor, Archive, Maximize2 } from "lucide-react";
import { Content, Personality, UserPersona, Scenario, Event, CharacterQuest, UserGameState, ThemeSettings } from "./types";
import { resolveRoleplayVariables } from "./roleplayTemplate";
import { exportChatToPdf } from "./utils/pdfExport";
import { MemPalaceView } from "./components/MemPalaceView";
import { RelationshipMetricsModal } from "./components/RelationshipMetricsModal";
import { LocalServerSettingsModal } from "./components/LocalServerSettingsModal";
import { GlobalGenerationSettingsModal } from "./components/GlobalGenerationSettingsModal";
import { RoleplayMessage } from "./components/RoleplayMessage";
import { PersonalityModal } from "./components/PersonalityModal";
import { CharacterStateDisplay } from "./components/CharacterStateDisplay";
import { ImageLightboxModal } from "./components/ImageLightboxModal";
import { ScenarioManagerModal } from "./components/ScenarioManagerModal";
import { LoreBookManagerModal } from "./components/LoreBookManagerModal";
import { UserPersonaModal } from "./components/UserPersonaModal";
import { PurgeConfirmationModal } from "./components/PurgeConfirmationModal";
import { SettingsView, SettingsSection } from "./components/SettingsView";
import ContentManagerView from "./components/ContentManagerView";
import {
  loadSavedEvents,
  saveSavedEvents,
  generateRandomEvent,
  constructChatPayload,
  DEFAULT_SAMPLE_EVENTS,
} from "./eventsEngine";
import { EventManagerModal, getTypeBadgeClass } from "./components/EventManagerModal";
import { EventSelectorPopover } from "./components/EventSelectorPopover";
import { QuestManagerModal } from "./components/QuestManagerModal";
import {
  loadSavedQuests,
  saveSavedQuests,
  loadUserGameState,
  saveUserGameState,
  generateFallbackQuests,
  buildQuestSteeringPrompt,
} from "./questsEngine";

function getInitials(name: string): string {
  if (!name) return "AI";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "content" | "settings">("chat");
  const [initialSettingsSection, setInitialSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const [messages, setMessages] = useState<Content[]>([]);
  const [visibleMessagesCount, setVisibleMessagesCount] = useState<number>(20);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegeneratingIndex, setIsRegeneratingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [questConfig, setQuestConfig] = useState<any>(null);

  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  // selectedScenario is now derived from selectedPersonality
  const [isScenarioManagerOpen, setIsScenarioManagerOpen] = useState(false);
  const [loreBooks, setLoreBooks] = useState<any[]>([]);
  const [isLoreBookManagerOpen, setIsLoreBookManagerOpen] = useState(false);

  // High-Resolution Avatar Lightbox State
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    url: string;
    title?: string;
    subtitle?: string;
  } | null>(null);

  // --- Roleplay Events & System Injections State ---
  const [events, setEvents] = useState<Event[]>(() => loadSavedEvents());
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [isEventManagerOpen, setIsEventManagerOpen] = useState(false);
  const [isEventPopoverOpen, setIsEventPopoverOpen] = useState(false);

  useEffect(() => {
    saveSavedEvents(events);
  }, [events]);

  const handleSaveEvent = (newEventData: Omit<Event, "id" | "created_at">) => {
    const newEvent: Event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newEventData.name,
      type: newEventData.type,
      description: newEventData.description,
      created_at: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (activeEvent?.id === id) {
      setActiveEvent(null);
    }
  };

  const handleAutoGenerateEvent = async (guideline?: string) => {
    try {
      const res = await fetch("/api/generate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideline }),
      });
      if (!res.ok) throw new Error("Failed to generate event");
      const data = await res.json();
      
      const newEvent: Event = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: data.name || "Unknown Event",
        type: data.type || "Environmental",
        description: data.description || "An unexpected event occurred.",
        created_at: new Date().toISOString(),
      };
      setEvents((prev) => [newEvent, ...prev]);
      return newEvent;
    } catch (e) {
      console.error("Error auto-generating event, falling back to local...", e);
      const randomEv = generateRandomEvent(guideline);
      setEvents((prev) => [randomEv, ...prev]);
      return randomEv;
    }
  };

  const handleRestoreDefaultEvents = () => {
    setEvents([...DEFAULT_SAMPLE_EVENTS]);
  };

  // --- Character Quests & Game Logic Engine State ---
  const [quests, setQuests] = useState<CharacterQuest[]>(() => loadSavedQuests());
  const [gameState, setGameState] = useState<UserGameState>(() => loadUserGameState());
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);

  useEffect(() => {
    saveSavedQuests(quests);
  }, [quests]);

  useEffect(() => {
    saveUserGameState(gameState);
  }, [gameState]);

  // Sync quests & user game state with backend
  useEffect(() => {
    fetch("/api/quests")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setQuests(data);
        }
      })
      .catch(() => {});

    fetch("/api/user-game-state")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.inventory)) {
          setGameState(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerateQuests = async () => {
    if (!selectedPersonality) return;
    setIsGeneratingQuests(true);
    try {
      const activeScen = scenarios.find((s) => s.characterId === selectedPersonality.id);
      const state = selectedPersonality.state;
      const current_vitals = state
        ? `Health: ${state.health}/100, Stamina: ${state.stamina}/100, Mood: ${state.mood}, Stress: ${state.stress}/100`
        : "Healthy (100/100), Normal mood, Stress: 20/100";
      const current_effects = state?.statusEffects?.length ? state.statusEffects.join(", ") : "None";
      const current_scene = activeScen
        ? `${activeScen.name}: ${activeScen.context || activeScen.description || ""}`
        : state?.location
        ? `${state.location} (${state.activity || "active"})`
        : "Current Scene";

      const relevantLore = loreBooks
        .filter((lb) => !lb.scenarioId || lb.scenarioId === activeScen?.id)
        .flatMap((lb: any) => lb.entries || [])
        .slice(0, 3)
        .map((e: any) => `${e.name}: ${e.content}`)
        .join("; ") || "Local lore and regional knowledge";

      const res = await fetch("/api/generate-quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalityId: selectedPersonality.id,
          character_name: selectedPersonality.name,
          character_personality:
            selectedPersonality.personality ||
            selectedPersonality.traits ||
            selectedPersonality.description ||
            "Complex roleplay character",
          current_scene,
          current_vitals,
          current_effects,
          lore_context: relevantLore,
          mem_palace_summary: `Recent events and companionship with ${selectedPersonality.name}`,
          model: selectedModel,
          customApiKey: geminiApiKey,
          difficulty: questConfig?.questDifficulty || "Adaptive",
          maxActiveQuests: questConfig?.maxActiveQuests || 3,
        }),
      });

      const newQuests = await res.json();
      if (Array.isArray(newQuests) && newQuests.length > 0) {
        setQuests((prev) => {
          const existingIds = new Set(newQuests.map((q: any) => q.quest_id));
          return [...newQuests, ...prev.filter((q) => !existingIds.has(q.quest_id))];
        });
      }
    } catch (err) {
      console.warn("Failed to generate quests from server, using fallback:", err);
      const fallbacks = generateFallbackQuests(
        selectedPersonality.name,
        selectedPersonality.state?.mood,
        selectedPersonality.state?.location
      );
      setQuests((prev) => [...fallbacks, ...prev]);
    } finally {
      setIsGeneratingQuests(false);
    }
  };

  const handleProposeQuest = async (quest: CharacterQuest) => {
    if (!selectedPersonality || isLoading) return;

    // 1. Mark quest as 'proposed' in backend and local state
    try {
      await fetch(`/api/quests/${quest.quest_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "proposed" }),
      });
    } catch {}

    setQuests((prev) =>
      prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "proposed" } : q))
    );

    // 2. Build the hidden system steering prompt
    const steeringPrompt = buildQuestSteeringPrompt(quest);

    // 3. Dispatch steering prompt turn to LLM so the character brings up the quest in-character
    const updatedMessages: Content[] = [
      ...messages.map((msg) => {
        if (msg.variations && msg.variations.length > 0) {
          const activeIdx =
            typeof msg.activeVariationIndex === "number"
              ? msg.activeVariationIndex
              : msg.variations.length - 1;
          const chosenText = msg.variations[activeIdx] || getTextContent(msg);
          return { role: msg.role as "user" | "model", parts: [{ text: chosenText }] };
        }
        return msg;
      }),
      { role: "user", parts: [{ text: steeringPrompt }] },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);
    setEngineErrors({ chat: null, quests: null, vitals: null });
    isUserScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: steeringPrompt,
          personalityId: selectedPersonality.id,
          systemInstruction: buildSystemInstruction(),
          model: selectedModel,
          geminiApiKey,
          userPersona,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.contents);
        if (data.personality) {
          setSelectedPersonality(data.personality);
          setPersonalities((prev) =>
            prev.map((p) => (p.id === data.personality.id ? data.personality : p))
          );
        } else if (data.characterState) {
          const updated = { ...selectedPersonality, state: data.characterState };
          setSelectedPersonality(updated);
          setPersonalities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }
      }
    } catch (err) {
      console.error("Failed to propose quest:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInquireQuest = (quest: CharacterQuest) => {
    handleProposeQuest(quest);
  };

  const handleAcceptQuest = async (quest: CharacterQuest) => {
    try {
      const res = await fetch(`/api/quests/${quest.quest_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (res.ok) {
        setQuests((prev) =>
          prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "in_progress" } : q))
        );
      }
    } catch {
      setQuests((prev) =>
        prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "in_progress" } : q))
      );
    }
    setPurgeToast(`📌 Quest Accepted: "${quest.title}" — Pinned to active header!`);
    setTimeout(() => setPurgeToast(null), 4000);
  };

  const handleDeclineProposedQuest = async (quest: CharacterQuest) => {
    try {
      await fetch(`/api/quests/${quest.quest_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "available" }),
      });
    } catch {}
    setQuests((prev) =>
      prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "available" } : q))
    );
  };

  const handleCompleteQuest = async (quest: CharacterQuest) => {
    try {
      const res = await fetch(`/api/quests/${quest.quest_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalityId: selectedPersonality?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setQuests((prev) =>
          prev.map((q) =>
            q.quest_id === quest.quest_id
              ? { ...q, status: "completed", completedAt: new Date().toISOString() }
              : q
          )
        );
        if (data.gameState) {
          setGameState(data.gameState);
        }
        // Refresh personalities to reflect updated trust/mood/stress
        fetch("/api/personalities")
          .then((r) => r.json())
          .then((ps) => {
            if (Array.isArray(ps)) {
              setPersonalities(ps);
              const updated = ps.find((p) => p.id === selectedPersonality?.id);
              if (updated) setSelectedPersonality(updated);
            }
          })
          .catch(() => {});
        setPurgeToast(`🏆 Quest Complete! "${quest.title}" — Deepened bond and mutual trust!`);
        setTimeout(() => setPurgeToast(null), 4500);
      }
    } catch (err) {
      console.warn("Failed to complete quest via API, using client fallback:", err);
      setQuests((prev) =>
        prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "completed" } : q))
      );
      setGameState((prev) => ({
        ...prev,
        inventory: [
          ...(quest.rewards?.items || []).map((it) => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            item_name: it.item_name,
            item_description: it.item_description,
            acquiredAt: new Date().toISOString(),
            questTitle: quest.title,
            characterName: quest.characterName || selectedPersonality?.name || "Character",
            characterId: quest.characterId || selectedPersonality?.id,
          })),
          ...prev.inventory,
        ],
      }));
    }
  };

  const handleForceCompleteQuest = async (quest: CharacterQuest) => {
    try {
      const res = await fetch(`/api/quests/${quest.quest_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalityId: selectedPersonality?.id })
      });
      if (res.ok) {
        const data = await res.json();
        setQuests((prev) =>
          prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "completed" } : q))
        );
        if (data.gameState) {
          setGameState(data.gameState);
        }
        if (selectedPersonality?.id) {
          fetchPersonalities();
        }
        setPurgeToast(`✅ Quest Force Completed: "${quest.title}"`);
        setTimeout(() => setPurgeToast(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    try {
      await fetch(`/api/quests/${questId}`, { method: "DELETE" });
    } catch {}
    setQuests((prev) => prev.filter((q) => q.quest_id !== questId));
  };

  const handleSaveQuest = async (questData: Partial<CharacterQuest>) => {
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questData),
      });
      const saved = await res.json();
      setQuests((prev) => {
        const idx = prev.findIndex((q) => q.quest_id === saved.quest_id);
        if (idx >= 0) {
          const cp = [...prev];
          cp[idx] = saved;
          return cp;
        }
        return [saved, ...prev];
      });
    } catch {
      setQuests((prev) => [questData as CharacterQuest, ...prev]);
    }
  };

  const activeScenario = selectedPersonality ? scenarios.find(s => s.characterId === selectedPersonality.id) || null : null;

  // Scenario and Persona Details collapsed by default
  const [isScenarioDetailsExpanded, setIsScenarioDetailsExpanded] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  const [userPersona, setUserPersona] = useState<UserPersona | null>(null);
  const [isEditingUserPersona, setIsEditingUserPersona] = useState(false);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);

  // Purge Confirmation State
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeToast, setPurgeToast] = useState<string | null>(null);

  const [isMemPalaceOpen, setIsMemPalaceOpen] = useState(false);
  const [isRelationshipMetricsOpen, setIsRelationshipMetricsOpen] = useState(false);
  
  // Personality Modal State (for create & edit)
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState<Personality | null>(null);

  // User Message Editing State
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");

  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem("ACTIVE_INFERENCE_MODEL") || localStorage.getItem("selected_model") || "gemini-3.8-flash"
  );
  const [defaultModel, setDefaultModel] = useState<string>(
    () => localStorage.getItem("DEFAULT_INFERENCE_MODEL") || "gemini-3.8-flash"
  );
  const [apiError, setApiError] = useState<{ message: string; isRateLimit?: boolean } | null>(null);
  const [engineErrors, setEngineErrors] = useState<{ chat: string | null; quests: string | null; vitals: string | null }>({ chat: null, quests: null, vitals: null });
  
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("USER_GEMINI_API_KEY") || "");
  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem("USER_GEMINI_API_KEY", geminiApiKey);
    } else {
      localStorage.removeItem("USER_GEMINI_API_KEY");
    }
  }, [geminiApiKey]);

  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem("ACTIVE_INFERENCE_MODEL", selectedModel);
      localStorage.setItem("selected_model", selectedModel);
      fetch("/api/active-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, customApiKey: geminiApiKey }),
      }).catch(() => {});
    }
  }, [selectedModel, geminiApiKey]);

  useEffect(() => {
    fetch("/api/default-model")
      .then((res) => res.json())
      .then((data) => {
        if (data?.defaultModel) {
          setDefaultModel(data.defaultModel);
        }
      })
      .catch(() => {});

    fetch("/api/active-model")
      .then((res) => res.json())
      .then((data) => {
        if (data?.model && !localStorage.getItem("ACTIVE_INFERENCE_MODEL")) {
          setSelectedModel(data.model);
        }
      })
      .catch(() => {});
  }, []);

  const [serverConnectionStatus, setServerConnectionStatus] = useState<"connected" | "slow" | "disconnected">("connected");
  const [serverLatency, setServerLatency] = useState<number | null>(null);
  const [serverTarget, setServerTarget] = useState<string>("Gemini Cloud API");
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  const [isBrowsingLocalModels, setIsBrowsingLocalModels] = useState(false);
  const [localModels, setLocalModels] = useState<any[]>([]); // Using any for simplicity or update to LocalModelInfo
  const [isFetchingLocalModels, setIsFetchingLocalModels] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const isUserScrolledUpRef = useRef(false);

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If user is scrolled up > 80px, respect their position so chat does not force scroll down
    isUserScrolledUpRef.current = distanceFromBottom > 80;
  };

  const checkServerConnection = async () => {
    setIsCheckingServer(true);
    const clientStart = performance.now();
    try {
      const res = await fetch(`/api/server-status?model=${encodeURIComponent(selectedModel)}`, {
        headers: geminiApiKey ? { "x-gemini-api-key": geminiApiKey } : undefined
      });
      const clientRoundTrip = Math.round(performance.now() - clientStart);
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          const latency = typeof data.latencyMs === "number" && data.latencyMs > 0 ? data.latencyMs : clientRoundTrip;
          setServerLatency(latency);
          // Green for connected (< 800ms), Yellow for connected but slow (>= 800ms)
          setServerConnectionStatus(latency >= 800 ? "slow" : "connected");
          setServerTarget(data.target || "Server");
        } else {
          setServerConnectionStatus("disconnected");
          setServerLatency(null);
          setServerTarget(data.target || "Server");
        }
      } else {
        setServerConnectionStatus("disconnected");
        setServerLatency(null);
      }
    } catch {
      setServerConnectionStatus("disconnected");
      setServerLatency(null);
    } finally {
      setIsCheckingServer(false);
    }
  };

  useEffect(() => {
    checkServerConnection();
    const interval = setInterval(checkServerConnection, 20000);
    return () => clearInterval(interval);
  }, [selectedModel]);

  useEffect(() => {
    setVisibleMessagesCount(20);
  }, [selectedPersonality?.id]);

  useEffect(() => {
    fetchPersonalities();
    fetchScenarios();
    fetchLoreBooks();
    fetchUserPersona();
    fetchLocalModels();
    fetchThemeSettings();
  }, []);

  useEffect(() => {
    isUserScrolledUpRef.current = false;
    fetchHistory();
  }, [selectedPersonality?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard navigation for chat response variations (Left / Right arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (messages.length === 0) return;
      const lastIdx = messages.length - 1;
      const lastMsg = messages[lastIdx];
      if (
        lastMsg &&
        lastMsg.role === "model" &&
        lastMsg.variations &&
        lastMsg.variations.length > 1
      ) {
        const curIdx =
          typeof lastMsg.activeVariationIndex === "number"
            ? lastMsg.activeVariationIndex
            : lastMsg.variations.length - 1;
        if (e.key === "ArrowLeft" && curIdx > 0) {
          e.preventDefault();
          handleSelectVariation(lastIdx, curIdx - 1);
        } else if (e.key === "ArrowRight" && curIdx < lastMsg.variations.length - 1) {
          e.preventDefault();
          handleSelectVariation(lastIdx, curIdx + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [messages, selectedPersonality, isLoading]);

  const fetchPersonalities = async () => {
    try {
      const res = await fetch("/api/personalities");
      if (res.ok) {
        const data: Personality[] = await res.json();
        setPersonalities(data);
        // Keep active selection in sync with updated data
        if (selectedPersonality) {
          const updated = data.find((p) => p.id === selectedPersonality.id);
          if (updated) setSelectedPersonality(updated);
        }
      }
    } catch (error) {
      console.error("Failed to load personalities", error);
    }
  };

  const fetchLocalModels = async (showModal = false) => {
    setIsFetchingLocalModels(true);
    if (showModal) setIsBrowsingLocalModels(true);
    try {
      const res = await fetch("/api/local-models");
      if (res.ok) {
        const data = await res.json();
        setLocalModels(data);
      }
    } catch (error) {
      console.error("Failed to load local models", error);
    } finally {
      setIsFetchingLocalModels(false);
    }
  };

  const fetchUserPersona = async () => {
    try {
      const res = await fetch("/api/user-persona");
      if (res.ok) {
        const data = await res.json();
        setUserPersona(data);
      }
    } catch (error) {
      console.error("Failed to load user persona", error);
    }
  };

  const fetchThemeSettings = async () => {
    try {
      const res = await fetch("/api/theme");
      if (res.ok) {
        const data = await res.json();
        setThemeSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateThemeSettings = async (newTheme: Partial<ThemeSettings>) => {
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTheme)
      });
      if (res.ok) {
        const updated = await res.json();
        setThemeSettings(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveUserPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPersona?.name?.trim()) return;
    try {
      await fetch("/api/user-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPersona),
      });
      setIsEditingUserPersona(false);
    } catch (error) {
      console.error("Failed to save user persona", error);
    }
  };

  const handleSavePersonality = async (personalityData: Partial<Personality>) => {
    const isEdit = !!editingPersonality?.id;
    const url = isEdit ? `/api/personalities/${editingPersonality.id}` : "/api/personalities";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personalityData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save character profile");
    }

    const saved: Personality = await res.json();
    await fetchPersonalities();
    await fetchScenarios();
    setSelectedPersonality(saved);
  };

  const handleDeletePersonality = async (id: string) => {
    const res = await fetch(`/api/personalities/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete character");
    }

    if (selectedPersonality?.id === id) {
      setSelectedPersonality(null);
    }
    await fetchPersonalities();
    await fetchScenarios();
  };

  const openCreatePersonality = () => {
    setEditingPersonality(null);
    setIsPersonalityModalOpen(true);
  };

  const openEditPersonality = (p: Personality) => {
    setEditingPersonality(p);
    setIsPersonalityModalOpen(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPersonality = async (p: Personality) => {
    try {
      const res = await fetch(`/api/personalities/${p.id}/export`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${p.name.replace(/\s+/g, '_').toLowerCase()}_bundle_export.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to export:", errData);
        alert("Failed to export: " + (errData.error || "Unknown server error"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Export failed: " + (e.message || "Network error"));
    }
  };
  const fetchScenarios = async () => {
    try {
      const res = await fetch("/api/scenarios");
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
      }
      await fetchPersonalities();
    } catch (e) {
      console.error(e);
    }
  };


  const fetchLoreBooks = async () => {
    try {
      const res = await fetch("/api/lorebooks");
      if (res.ok) {
        const data = await res.json();
        setLoreBooks(data);
      }
      await fetchPersonalities();
    } catch (e) {
      console.error(e);
    }
  };


  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch("/api/personalities/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const importResult = await res.json();
        const importedPersonality = importResult.personality;

        // Refresh personalities, scenarios, and lorebooks
        await Promise.all([
          fetchPersonalities(),
          fetchScenarios(),
          fetchLoreBooks(),
        ]);

        // Sync quests
        fetch("/api/quests")
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) setQuests(data);
          })
          .catch(() => {});

        // Sync user game state / inventory
        fetch("/api/user-game-state")
          .then((r) => r.json())
          .then((data) => {
            if (data && Array.isArray(data.inventory)) setGameState(data);
          })
          .catch(() => {});

        if (importedPersonality) {
          setSelectedPersonality(importedPersonality);

          // Refresh scenarios list to ensure newly created scenarios are available
          const scensRes = await fetch("/api/scenarios");
          if (scensRes.ok) {
            const scens = await scensRes.json();
            setScenarios(scens);
          }

          // Fetch chat history for the imported personality immediately
          const pId = importedPersonality.id;
          const sId = importedPersonality.scenarioId;
          const histUrl = `/api/chat/history?personalityId=${pId}${sId ? `&scenarioId=${sId}` : ""}`;
          const histRes = await fetch(histUrl);
          if (histRes.ok) {
            const histData = await histRes.json();
            if (Array.isArray(histData) && histData.length > 0) {
              setMessages(histData);
            }
          }
        }
      } else {
        const error = await res.json().catch(() => ({}));
        console.error("Failed to import:", error);
        alert("Failed to import: " + (error.error || "Invalid file"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse the import file.");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fetchHistory = async () => {
    try {
      const pId = selectedPersonality?.id;
      const sId = activeScenario?.id;
      const url = pId 
        ? `/api/chat/history?personalityId=${pId}${sId ? `&scenarioId=${sId}` : ""}`
        : `/api/chat/history`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        let history: Content[] = data || [];
        if (history.length === 0) {
          const scenarioWithFirstMsg = activeScenario;
          const candidateFirstMsg = scenarioWithFirstMsg?.firstMessage || (selectedPersonality as any)?.firstMessage;
          if (candidateFirstMsg && candidateFirstMsg.trim().length > 0) {
            const resolvedText = resolveRoleplayVariables(
              candidateFirstMsg.trim(),
              selectedPersonality?.name || "Personality",
              userPersona?.name || "User"
            );
            history = [{ role: "model", parts: [{ text: resolvedText }] }];
          }
        }
        setMessages(history);
      }

      // Also refresh the dynamic character state if a character is selected
      if (selectedPersonality?.id) {
        const charId = selectedPersonality.id;
        fetch(`/api/personalities/${charId}/state`)
          .then((r) => (r.ok ? r.json() : null))
          .then((stateData) => {
            if (stateData?.state) {
              setSelectedPersonality((prev) => {
                if (!prev || prev.id !== charId) return prev;
                if (JSON.stringify(prev.state) === JSON.stringify(stateData.state)) return prev;
                return { ...prev, state: stateData.state };
              });
              setPersonalities((prev) =>
                prev.map((p) => (p.id === charId ? { ...p, state: stateData.state } : p))
              );
            }
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  const clearHistory = () => {
    setIsPurgeModalOpen(true);
  };

  const handleExecutePurge = async () => {
    setIsPurging(true);
    try {
      const pId = selectedPersonality?.id || "default";
      const sId = activeScenario?.id;
      const res = await fetch("/api/chat/purge", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalityId: pId, scenarioId: sId })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Seed firstMessage from scenario if present
        let initialMessages: Content[] = data.history || [];
        if (initialMessages.length === 0) {
          const scenarioWithFirstMsg = activeScenario;
          const candidateFirstMsg = scenarioWithFirstMsg?.firstMessage || (selectedPersonality as any)?.firstMessage;
          if (candidateFirstMsg && candidateFirstMsg.trim().length > 0) {
            const resolvedText = resolveRoleplayVariables(
              candidateFirstMsg.trim(),
              selectedPersonality?.name || "Personality",
              userPersona?.name || "User"
            );
            initialMessages = [{ role: "model", parts: [{ text: resolvedText }] }];
          }
        }
        setMessages(initialMessages);
        setInput("");
        setActiveEvent(null);
        setApiError(null);
        
        if (data.state && selectedPersonality) {
          const updated = { ...selectedPersonality, state: data.state };
          setSelectedPersonality(updated);
          setPersonalities(prev => prev.map(p => p.id === updated.id ? updated : p));
        }

        // Purge all quests and related tracking for this active chat
        setQuests((prev) => {
          const filtered = prev.filter((q) => q.characterId !== pId);
          saveSavedQuests(filtered);
          return filtered;
        });

        // Purge all spoils and inventory items linked to this character in client state
        if (data.inventory) {
          setGameState({ inventory: data.inventory });
        } else {
          setGameState((prev) => ({
            inventory: prev.inventory.filter((item) => {
              if (item.characterId && item.characterId === pId) return false;
              if (selectedPersonality && item.characterName && item.characterName.toLowerCase() === selectedPersonality.name?.toLowerCase()) return false;
              return true;
            }),
          }));
        }

        setIsPurgeModalOpen(false);
        const hasOpening = initialMessages.length > 0;
        setPurgeToast(
          hasOpening
            ? `Purged chat & restarted with scenario opening message for ${selectedPersonality?.name || "character"}`
            : `Purged active chat, memories, quests, and spoils for ${selectedPersonality?.name || "Active Character"}`
        );
        setTimeout(() => setPurgeToast(null), 3500);
      }
    } catch (error) {
      console.error("Failed to purge chat and memories", error);
    } finally {
      setIsPurging(false);
    }
  };

  const handleStartNewChat = async () => {
    if (isLoading || isStartingNewChat) return;
    setIsStartingNewChat(true);
    try {
      const pId = selectedPersonality?.id || "default";
      const sId = activeScenario?.id;
      const res = await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalityId: pId, scenarioId: sId }),
      });
      if (res.ok) {
        const data = await res.json();
        let initialMessages: Content[] = data.history || [];
        if (initialMessages.length === 0) {
          const scenarioWithFirstMsg = activeScenario;
          const candidateFirstMsg = scenarioWithFirstMsg?.firstMessage || (selectedPersonality as any)?.firstMessage;
          if (candidateFirstMsg && candidateFirstMsg.trim().length > 0) {
            const resolvedText = resolveRoleplayVariables(
              candidateFirstMsg.trim(),
              selectedPersonality?.name || "Personality",
              userPersona?.name || "User"
            );
            initialMessages = [{ role: "model", parts: [{ text: resolvedText }] }];
          }
        }
        setMessages(initialMessages);
        setInput("");
        setActiveEvent(null);
        setApiError(null);
        const hasOpening = initialMessages.length > 0;
        setPurgeToast(
          hasOpening
            ? `New chat started with scenario opening for ${selectedPersonality?.name || "AI"}`
            : `Started a fresh chat session with ${selectedPersonality?.name || "AI"}`
        );
        setTimeout(() => setPurgeToast(null), 3500);
      }
    } catch (e) {
      console.error("Failed to start new chat:", e);
    } finally {
      setIsStartingNewChat(false);
    }
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    if (messages.length === 0) {
      setPurgeToast("⚠️ No chat messages to export yet. Send a message first!");
      setTimeout(() => setPurgeToast(null), 3500);
      return;
    }
    setIsExportingPdf(true);
    setPurgeToast("📄 Generating easy-to-read PDF transcript...");
    try {
      const result = await exportChatToPdf({
        personality: selectedPersonality,
        scenario: activeScenario,
        userPersona,
        messages,
        getTextContent,
      });
      setPurgeToast(`✅ Exported ${result.turnCount} turns to ${result.filename}`);
      setTimeout(() => setPurgeToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to export chat to PDF:", err);
      setPurgeToast(`❌ PDF export failed: ${err.message || "Unknown error"}`);
      setTimeout(() => setPurgeToast(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/user-game-state/items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setGameState({ inventory: data.inventory });
      }
    } catch (e) {
      console.error("Failed to delete inventory item", e);
    }
  };

  const handlePurgeChatSpoils = async (personalityId: string) => {
    try {
      const res = await fetch(`/api/user-game-state/items?personalityId=${encodeURIComponent(personalityId)}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setGameState({ inventory: data.inventory });
        setPurgeToast(`Purged spoils & items for ${selectedPersonality?.name || "Active Character"}`);
        setTimeout(() => setPurgeToast(null), 3500);
      }
    } catch (e) {
      console.error("Failed to purge chat spoils", e);
    }
  };

  const scrollToBottom = (force = false) => {
    if (!force && isUserScrolledUpRef.current) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildSystemInstruction = () => {
    let baseInstruction = "You are a helpful chat assistant with perfect memory.";
    
    let userContext = "";
    if (userPersona && userPersona.name) {
      let genderStr = "";
      if (userPersona.gender && userPersona.gender !== "Unspecified") {
        genderStr = `\nGender: ${userPersona.gender}`;
      }
      let orientationStr = "";
      if (userPersona.orientation && userPersona.orientation !== "Unspecified") {
        orientationStr = `\nOrientation: ${userPersona.orientation}`;
      }
      userContext = `\n\n--- User Character Profile (The person you are talking to) ---\nName: ${userPersona.name}\nAge: ${userPersona.age || 'Not specified'}${genderStr}${orientationStr}\nAppearance: ${userPersona.appearance || 'Not specified'}\nPersonality: ${userPersona.traits || 'Not specified'}\nBackground: ${userPersona.background || 'Not specified'}\n----------------------------------\n`;
    }

    if (selectedPersonality) {
      const pName = selectedPersonality.name;
      const uName = userPersona?.name || 'User';

      const rawPersonality = selectedPersonality.personality || selectedPersonality.traits || 'Not specified';
      const charPersonality = resolveRoleplayVariables(rawPersonality, pName, uName);

      const rawAppearance = selectedPersonality.appearance || 'Not specified';
      const charAppearance = resolveRoleplayVariables(rawAppearance, pName, uName);

      const charDesc = selectedPersonality.description
        ? resolveRoleplayVariables(`Short Description: ${selectedPersonality.description}\n`, pName, uName)
        : '';

      const rawInstruction = selectedPersonality.systemInstruction || 'Stay in character and naturally engage in the roleplay scenario.';
      const charInstruction = resolveRoleplayVariables(rawInstruction, pName, uName);

      let activeScenarioCtx = "";
      if (activeScenario) {
        const resolvedContext = resolveRoleplayVariables(activeScenario.context, pName, uName);
        const resolvedDesc = activeScenario.description ? resolveRoleplayVariables(activeScenario.description, pName, uName) : "";
        const resolvedRel = activeScenario.relationship ? resolveRoleplayVariables(activeScenario.relationship, pName, uName) : "";
        activeScenarioCtx = `\n--- Active Scenario ---\nName: ${activeScenario.name}\nLocation: ${activeScenario.location || "Unspecified"}\nTime of Day: ${activeScenario.timeOfDay || "Unspecified"}${resolvedRel ? `\nRelationship to User: ${resolvedRel}` : ""}${resolvedDesc ? `\nSummary: ${resolvedDesc}` : ""}\nContext/World State: ${resolvedContext}\n------------------------\n`;
      }

      const resolvedUserContext = resolveRoleplayVariables(userContext, pName, uName);

      return `You are playing a character in a roleplay.
Active Character Name: ${selectedPersonality.name}
Character's Persona & Traits: ${charPersonality}
Appearance: ${charAppearance}
Age: ${selectedPersonality.age || 'Not specified'}
${charDesc}${activeScenarioCtx}${resolvedUserContext}
Additional system instructions or context:
${charInstruction}

--- Roleplay Identity & Context Definitions ---
- ACTIVE CHAT CHARACTER: You are ${selectedPersonality.name}. In all scenario setups, lore books, character context, background details, and instructions:
  * {{char}} ALWAYS refers directly to YOU (${selectedPersonality.name}), the active chat character.
- ACTIVE USER PERSONA: The person you are interacting with is ${uName}. In all scenario setups, lore books, user profiles, and prompt instructions:
  * {{user}} ALWAYS refers directly to the active user persona (${uName}).
- Example: If a scenario or detail says '{{char}} works at coffee shop and {{user}} walks in', it means ${selectedPersonality.name} works at the coffee shop and ${uName} enters the coffee shop.
Always embody this relationship dynamic seamlessly. Never confuse or swap the active character with the active user persona.

You must ALWAYS stay in character. Never break the fourth wall.

--- STRICT FORMATTING RULES ---
1. WORDS BEING SAID (SPOKEN DIALOGUE):
   - Every word, sentence, or phrase spoken out loud MUST be enclosed between double quotation marks " " (e.g., "Hello, ${uName}," she said softly, "how are you today?").
2. THOUGHTS, ACTIONS & NARRATION:
   - All internal thoughts, feelings, physical movements, gestures, expressions, scene descriptions, and body language MUST ALWAYS be enclosed between asterisks * * (e.g., *smiles warmly and glances across the room, feeling a sense of relief*).
3. Do not output raw unformatted dialogue or unformatted actions. Words being said are ALWAYS in " ", and thoughts/actions are ALWAYS in * *.

- System Event Injections: If a message begins with [SYSTEM EVENT INJECTION: ...], this represents a sudden reality/world event, environmental shift, interrupt, or character action that has just transpired in the scene. React to it immediately in character using strict quotation marks " " for your speech and asterisks * * for your actions and thoughts.
`;
    }
    
    return baseInstruction + userContext;
  };

  
  const handleSelectVariation = async (messageIndex: number, newVariationIndex: number) => {
    if (isLoading) return;

    // Optimistically update active variation in state
    setMessages((prev) => {
      const updated = [...prev];
      const target = updated[messageIndex];
      if (
        target &&
        target.role === "model" &&
        target.variations &&
        newVariationIndex >= 0 &&
        newVariationIndex < target.variations.length
      ) {
        const activeText = target.variations[newVariationIndex];
        updated[messageIndex] = {
          ...target,
          activeVariationIndex: newVariationIndex,
          parts: [{ text: activeText }],
        };
      }
      return updated;
    });

    // Synchronize selected variation to server history
    try {
      await fetch("/api/chat/select-variation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalityId: selectedPersonality?.id,
          messageIndex,
          variationIndex: newVariationIndex,
        }),
      });
    } catch (e) {
      console.warn("Failed to persist variation selection:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !activeEvent) || isLoading) return;

    const currentEvent = activeEvent;
    const currentInput = input;

    // Construct final chat payload incorporating active event injection
    const { formattedMessage, apiPayload } = constructChatPayload({
      userInput: currentInput,
      activeEvent: currentEvent,
      personalityId: selectedPersonality?.id,
      systemInstruction: buildSystemInstruction(),
      model: selectedModel,
      geminiApiKey,
      userPersona,
    });

    // Clear user input and clear active event selection after sending as specified
    setInput("");
    setActiveEvent(null);
    setApiError(null);
    
    // When continuing chat, clean up unused variations so only the active selected variation is kept
    setMessages((prev) => [
      ...prev.map((msg) => {
        if (msg.variations && msg.variations.length > 0) {
          const activeIdx =
            typeof msg.activeVariationIndex === "number"
              ? msg.activeVariationIndex
              : msg.variations.length - 1;
          const chosenText = msg.variations[activeIdx] || getTextContent(msg);
          return { role: msg.role, parts: [{ text: chosenText }] };
        }
        return msg;
      }),
      { role: "user", parts: [{ text: formattedMessage }] },
    ]);
    setIsLoading(true);
    setEngineErrors({ chat: null, quests: null, vitals: null });
    isUserScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setMessages(data.contents);
          if (data.personality) {
            setSelectedPersonality(data.personality);
            setPersonalities((prev) => prev.map((p) => (p.id === data.personality.id ? data.personality : p)));
          } else if (data.characterState && selectedPersonality) {
            const updated = { ...selectedPersonality, state: data.characterState };
            setSelectedPersonality(updated);
            setPersonalities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }

          // Handle verbal acceptance of proposed quest
          if (data.acceptedQuest) {
            setQuests((prev) =>
              prev.map((q) =>
                q.quest_id === data.acceptedQuest.quest_id
                  ? { ...q, status: "in_progress" }
                  : q
              )
            );
            setPurgeToast(`📌 Quest Accepted: "${data.acceptedQuest.title}" — Pinned to active header!`);
            setTimeout(() => setPurgeToast(null), 4000);
          } else if (selectedPersonality?.id) {
            const proposed = quests.find(
              (q) => q.characterId === selectedPersonality.id && q.status === "proposed"
            );
            if (proposed) {
              const lower = currentInput.toLowerCase();
              const affirmativeRegex = /\b(sure|yes|yeah|yep|ok|okay|i can|i will|i'll|i'd love to|help|deal|gladly|happy to|count me in|on it|let's do it|sounds good|absolutely|of course|no problem|consider it done|agreed|take care of it)\b/i;
              const refusalRegex = /\b(no|can't|cannot|refuse|nah|decline|don't want to|not now|never|won't)\b/i;
              if (affirmativeRegex.test(lower) && !refusalRegex.test(lower)) {
                handleAcceptQuest(proposed);
              }
            }
          }

          // Handle verbal decline of proposed quest
          if (data.declinedQuest) {
            setQuests((prev) =>
              prev.map((q) =>
                q.quest_id === data.declinedQuest.quest_id
                  ? { ...q, status: "available" }
                  : q
              )
            );
            setPurgeToast(`Quest Declined: "${data.declinedQuest.title}"`);
            setTimeout(() => setPurgeToast(null), 3000);
          }

          // Handle automatic background completion of quest
          if (data.completedQuest) {
            setQuests((prev) =>
              prev.map((q) =>
                q.quest_id === data.completedQuest.quest_id
                  ? { ...q, status: "completed", completedAt: new Date().toISOString() }
                  : q
              )
            );
            setPurgeToast(`🏆 Quest Complete! "${data.completedQuest.title}" — Objective fulfilled & bond deepened!`);
            setTimeout(() => setPurgeToast(null), 5000);
          }

          // Sync game state (inventory) if returned
          if (data.gameState) {
            setGameState(data.gameState);
          }
          if (data.engineErrors) {
            setEngineErrors(data.engineErrors);
          }

          if (questConfig?.autoGenerateQuests && !isGeneratingQuests) {
            // Refresh quests to see if we have active ones
            fetch("/api/quests?personalityId=" + selectedPersonality?.id)
              .then((r) => r.json())
              .then((latestQuests) => {
                if (Array.isArray(latestQuests)) {
                  setQuests(latestQuests);
                  const active = latestQuests.filter(q => ["in_progress", "proposed", "active"].includes(q.status || ""));
                  if (active.length === 0) {
                    handleGenerateQuests();
                  }
                }
              })
              .catch(() => {});
          }
        } catch (e: any) {
          console.error("Failed to parse JSON response:", text.substring(0, 200));
          throw new Error("Invalid response from server. Check server logs.");
        }
      } else {
        const text = await res.text();
        let errData: any = {};
        try { errData = JSON.parse(text); } catch (e) {
          console.error("Error response HTML:", text.substring(0, 200));
        }
        const errMsg = errData.error || res.statusText || text.substring(0, 100);
        const isRateLimit = res.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
        setApiError({ message: errMsg, isRateLimit });
        if (errData.engineErrors) {
          setEngineErrors(errData.engineErrors);
        }
      }
    } catch (error: any) {
      console.error("Failed to send message", error);
      setApiError({ message: error?.message || "Failed to send message" });
      setEngineErrors({ chat: error?.message, quests: null, vitals: null });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (messageIndex?: number, customTemperature?: number) => {
    if (isLoading) return;
    setIsLoading(true);
    setApiError(null);
    setEngineErrors({ chat: null, quests: null, vitals: null });
    setIsRegeneratingIndex(typeof messageIndex === "number" ? messageIndex : null);
    try {
      const res = await fetch("/api/chat/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalityId: selectedPersonality?.id,
          systemInstruction: buildSystemInstruction(),
          model: selectedModel,
          messageIndex,
          temperature: customTemperature,
          geminiApiKey,
          userPersona,
        }),
      });

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setMessages(data.contents);
          if (data.personality) {
            setSelectedPersonality(data.personality);
            setPersonalities((prev) => prev.map((p) => (p.id === data.personality.id ? data.personality : p)));
          } else if (data.characterState && selectedPersonality) {
            const updated = { ...selectedPersonality, state: data.characterState };
            setSelectedPersonality(updated);
            setPersonalities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }
          if (data.engineErrors) {
            setEngineErrors(data.engineErrors);
          }
        } catch (e: any) {
          console.error("Failed to parse JSON response:", text.substring(0, 200));
          throw new Error("Invalid response from server. Check server logs.");
        }
      } else {
        const text = await res.text();
        let errData: any = {};
        try { errData = JSON.parse(text); } catch (e) {
          console.error("Error response HTML:", text.substring(0, 200));
        }
        const errMsg = errData.error || res.statusText || text.substring(0, 100);
        const isRateLimit = res.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
        setApiError({ message: errMsg, isRateLimit });
        if (errData.engineErrors) {
          setEngineErrors(errData.engineErrors);
        }
      }
    } catch (error: any) {
      console.error("Failed to regenerate response", error);
      setApiError({ message: error?.message || "Failed to regenerate response" });
      setEngineErrors({ chat: error?.message, quests: null, vitals: null });
    } finally {
      setIsLoading(false);
      setIsRegeneratingIndex(null);
    }
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleStartEditMessage = (index: number, currentText: string) => {
    setEditingMessageIndex(index);
    setEditingMessageText(currentText);
  };

  const handleCancelEditMessage = () => {
    setEditingMessageIndex(null);
    setEditingMessageText("");
  };

  const handleSaveAndRegenerateEdit = async (index: number) => {
    if (!editingMessageText.trim() || isLoading) return;
    const newText = editingMessageText.trim();
    setApiError(null);

    // Optimistically truncate messages up to this point with the updated user message
    const updatedHistory = messages.slice(0, index + 1);
    updatedHistory[index] = { role: "user", parts: [{ text: newText }] };
    setMessages(updatedHistory);
    setEditingMessageIndex(null);
    setEditingMessageText("");
    setIsLoading(true);
    setEngineErrors({ chat: null, quests: null, vitals: null });
    setIsRegeneratingIndex(index);

    try {
      const res = await fetch("/api/chat/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageIndex: index,
          newMessage: newText,
          personalityId: selectedPersonality?.id,
          systemInstruction: buildSystemInstruction(),
          model: selectedModel,
          geminiApiKey,
          userPersona,
        }),
      });

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setMessages(data.contents);
          if (data.personality) {
            setSelectedPersonality(data.personality);
            setPersonalities((prev) => prev.map((p) => (p.id === data.personality.id ? data.personality : p)));
          } else if (data.characterState && selectedPersonality) {
            const updated = { ...selectedPersonality, state: data.characterState };
            setSelectedPersonality(updated);
            setPersonalities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }
          if (data.engineErrors) {
            setEngineErrors(data.engineErrors);
          }
        } catch (e: any) {
          console.error("Failed to parse JSON response:", text.substring(0, 200));
          throw new Error("Invalid response from server. Check server logs.");
        }
      } else {
        const text = await res.text();
        let err: any = {};
        try { err = JSON.parse(text); } catch (e) {
          console.error("Error response HTML:", text.substring(0, 200));
        }
        const errMsg = err.error || res.statusText || text.substring(0, 100);
        const isRateLimit = res.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
        setApiError({ message: errMsg, isRateLimit });
        if (err.engineErrors) {
          setEngineErrors(err.engineErrors);
        }
        await fetchHistory();
      }
    } catch (error: any) {
      console.error("Failed to edit and regenerate message", error);
      setApiError({ message: error?.message || "Failed to edit and regenerate message" });
      setEngineErrors({ chat: error?.message, quests: null, vitals: null });
      await fetchHistory();
    } finally {
      setIsLoading(false);
      setIsRegeneratingIndex(null);
    }
  };

  const handleSavePersonalityEdit = async (index: number) => {
    if (!editingMessageText.trim() || isLoading) return;
    const newText = editingMessageText.trim();
    setApiError(null);

    // Optimistically update the message in local state
    const updatedHistory = [...messages];
    const targetMsg = { ...updatedHistory[index] };
    targetMsg.parts = [{ text: newText }];
    const existingVars = Array.isArray(targetMsg.variations) && targetMsg.variations.length > 0
      ? [...targetMsg.variations]
      : [newText];
    const activeVarIdx = typeof targetMsg.activeVariationIndex === "number" ? targetMsg.activeVariationIndex : existingVars.length - 1;
    if (activeVarIdx >= 0 && activeVarIdx < existingVars.length) {
      existingVars[activeVarIdx] = newText;
    } else {
      existingVars.push(newText);
    }
    targetMsg.variations = existingVars;
    updatedHistory[index] = targetMsg;
    setMessages(updatedHistory);
    setEditingMessageIndex(null);
    setEditingMessageText("");

    try {
      const res = await fetch("/api/chat/message/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalityId: selectedPersonality?.id,
          messageIndex: index,
          newText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.contents) {
          setMessages(data.contents);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setApiError({ message: err.error || "Failed to update character response" });
        await fetchHistory();
      }
    } catch (e: any) {
      console.error("Failed to update message:", e);
      setApiError({ message: e?.message || "Failed to update character response" });
      await fetchHistory();
    }
  };

  // Helper to get text from a content block (resolving active variation if present)
  const getTextContent = (content: Content) => {
    if (content.variations && content.variations.length > 0) {
      const idx =
        typeof content.activeVariationIndex === "number"
          ? content.activeVariationIndex
          : content.variations.length - 1;
      if (content.variations[idx]) {
        return content.variations[idx];
      }
    }
    return content.parts
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n");
  };

  // Active chat scoped character quests & active status
  const characterQuests = selectedPersonality
    ? quests.filter((q) => !q.characterId || q.characterId === selectedPersonality.id)
    : [];
  const inProgressQuest = characterQuests.find(
    (q) => q.status === "in_progress" || q.status === "active"
  );
  const proposedQuest = !inProgressQuest
    ? characterQuests.find((q) => q.status === "proposed")
    : null;
  const activeCharDesiresCount = characterQuests.filter(
    (q) => q.status === "available" || q.status === "proposed" || q.status === "in_progress" || q.status === "active"
  ).length;

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0C] text-[#E0E0E0] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2E] bg-[#111114] shadow-sm z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-amber-50">
            Sparkle<span className="text-amber-500/80">Core</span>
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#16161A] p-1 rounded-lg border border-[#26262C]">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "chat"
                ? "bg-amber-500 text-black shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "content"
                ? "bg-amber-500 text-black shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Archive size={13} />
            <span>Share Content</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-amber-500 text-black shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Settings size={13} />
            <span>Settings</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Model Status Indicator */}
          <div
            onClick={checkServerConnection}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1A1A22] border border-[#2A2A32] hover:border-amber-500/40 cursor-pointer transition-all select-none"
            title={`Model Status: ${selectedModel} (${serverConnectionStatus === "connected" ? "Online" : serverConnectionStatus === "slow" ? "High Latency" : "Offline"}${serverLatency !== null ? ` • ${serverLatency}ms` : ""}). Click to re-test connection.`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
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
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1 leading-none">
                <Server size={11} className="text-amber-400 shrink-0" />
                <span className="text-[10px] font-semibold font-mono text-gray-200 max-w-[110px] sm:max-w-[150px] truncate">
                  {selectedModel}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono leading-none mt-0.5 ${
                  serverConnectionStatus === "connected"
                    ? "text-emerald-400"
                    : serverConnectionStatus === "slow"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {serverConnectionStatus === "connected"
                  ? "ONLINE"
                  : serverConnectionStatus === "slow"
                  ? "SLOW"
                  : "OFFLINE"}
                {serverLatency !== null && serverConnectionStatus !== "disconnected" && ` • ${serverLatency}ms`}
              </span>
            </div>
          </div>

          {/* Loci Memory Status Indicator */}
          <div
            onClick={() => setIsMemPalaceOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1A1A22] border border-[#2A2A32] hover:border-amber-500/40 cursor-pointer transition-all select-none group"
            title="Loci Memory Status: Active & Synced. Click to open Memory Palace."
          >
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1 leading-none">
                <Landmark size={11} className="text-amber-400 shrink-0" />
                <span className="text-[10px] font-semibold text-gray-200">Loci Memory</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 leading-none mt-0.5">
                ACTIVE • SYNCED
              </span>
            </div>
          </div>
        </div>
      </header>

      {activeTab === "content" ? (
        <ContentManagerView
          personalities={personalities}
          scenarios={scenarios}
          loreBooks={loreBooks}
          events={events}
          onRefreshPersonalities={fetchPersonalities}
          onRefreshScenarios={fetchScenarios}
          onRefreshLoreBooks={fetchLoreBooks}
          onRefreshEvents={(newEvents) => {
            setEvents(newEvents);
            saveSavedEvents(newEvents);
          }}
        />
      ) : activeTab === "settings" ? (
        <SettingsView
          selectedModel={selectedModel}
          onSelectModel={(model) => setSelectedModel(model)}
          defaultModel={defaultModel}
          onSetDefaultModel={(model) => setDefaultModel(model)}
          localModels={localModels}
          onRefreshLocalModels={fetchLocalModels}
          userPersona={userPersona}
          onSaveUserPersona={async (persona) => {
            const res = await fetch("/api/user-persona", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(persona),
            });
            if (res.ok) {
              setUserPersona(persona);
            }
          }}
          scenarios={scenarios}
          onRefreshScenarios={fetchScenarios}
          personalities={personalities}
          selectedPersonality={selectedPersonality}
          onSelectPersonality={(p) => {
            setSelectedPersonality(p);
            setActiveTab("chat");
          }}
          onBackToChat={() => setActiveTab("chat")}
          serverConnectionStatus={serverConnectionStatus}
          serverLatency={serverLatency}
          serverTarget={serverTarget}
          onCheckServerConnection={checkServerConnection}
          initialSection={initialSettingsSection}
          geminiApiKey={geminiApiKey}
          onSetGeminiApiKey={setGeminiApiKey}
          themeSettings={themeSettings}
          onUpdateThemeSettings={updateThemeSettings}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className={`w-72 border-r border-[#2A2A2E] bg-[#0D0D10] flex-col shrink-0 ${isChatFocused ? 'hidden' : 'hidden md:flex'}`}>
            {/* User Persona & Scenarios Section */}
            <div className="p-3 border-b border-[#24242C] bg-[#111115] space-y-2">
              {/* User Persona Card */}
              <div 
                onClick={() => setIsEditingUserPersona(true)}
                className="group p-2.5 rounded-xl bg-[#16161B] hover:bg-[#1C1C24] border border-[#272732] hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between gap-2.5 shadow-sm"
                title="Click to view & edit your User Persona profile"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                    {userPersona?.avatar ? (
                      <img
                        src={userPersona.avatar}
                        alt={userPersona.name || "User"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <UserCircle2 size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 font-mono block">
                      User Persona
                    </span>
                    <p className="text-xs font-semibold text-gray-200 truncate">
                      {userPersona?.name || "User"}
                    </p>
                    {userPersona?.traits ? (
                      <p className="text-[10px] text-gray-400 truncate max-w-[150px]">
                        {userPersona.traits}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-500 italic">
                        Set roleplay identity...
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingUserPersona(true);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 group-hover:text-amber-300 hover:bg-[#252532] transition-colors shrink-0"
                  title="Edit User Persona"
                >
                  <Edit2 size={13} />
                </button>
              </div>

              {/* Scenarios & Worlds Button underneath User Persona */}
              <button
                type="button"
                onClick={() => setIsScenarioManagerOpen(true)}
                className="w-full px-3 py-2 rounded-xl bg-[#141418] hover:bg-[#1A1A22] text-gray-300 hover:text-white border border-[#272732] hover:border-amber-500/35 text-xs font-medium flex items-center justify-between transition-all group shadow-sm"
                title="Manage Roleplay Scenarios & Worlds"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin size={14} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate">Scenarios & Worlds</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1C24] text-gray-400 border border-[#2B2B36]">
                    {scenarios.length}
                  </span>
                  <Plus size={12} className="text-gray-400 group-hover:text-amber-300" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsLoreBookManagerOpen(true)}
                className="w-full px-3 py-2 rounded-xl bg-[#141418] hover:bg-[#1A1A22] text-gray-300 hover:text-white border border-[#272732] hover:border-emerald-500/35 text-xs font-medium flex items-center justify-between transition-all group shadow-sm"
                title="Manage Lore Books"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={14} className="text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate">Lore Books</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1C24] text-gray-400 border border-[#2B2B36]">
                    {loreBooks.length}
                  </span>
                  <Plus size={12} className="text-gray-400 group-hover:text-emerald-300" />
                </div>
              </button>

              <button
                type="button"
                id="sidebar-event-manager-btn"
                onClick={() => setIsEventManagerOpen(true)}
                className="w-full px-3 py-2 rounded-xl bg-[#141418] hover:bg-[#1A1A22] text-gray-300 hover:text-white border border-[#272732] hover:border-amber-500/35 text-xs font-medium flex items-center justify-between transition-all group shadow-sm"
                title="Manage Events & System Injections"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0 group-hover:scale-110 transition-transform">🎲</span>
                  <span className="truncate">Event Manager</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1C24] text-gray-400 border border-[#2B2B36]">
                    {events.length}
                  </span>
                  <Plus size={12} className="text-gray-400 group-hover:text-amber-300" />
                </div>
              </button>
            </div>

            {/* Characters Header */}
            <div className="p-3.5 border-b border-[#2A2A2E] bg-[#111114]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-semibold">Characters</h2>
                <span className="text-[10px] font-mono text-gray-500">{personalities.length} characters</span>
              </div>
              {/* New, Import, Export buttons underneath the heading, neatly spaced */}
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={openCreatePersonality}
                  className="py-1 px-1 text-[10px] leading-tight font-semibold rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors flex flex-col items-center justify-center gap-1 text-center shadow-sm h-12"
                  title="Create Roleplay Character"
                >
                  <Plus size={14} className="shrink-0" />
                  <span>New</span>
                </button>
                <button 
                  onClick={handleImportClick}
                  className="py-1 px-1 text-[10px] leading-tight font-medium rounded-md bg-[#1C1C20] hover:bg-[#25252B] text-gray-300 hover:text-white border border-[#2E2E35] transition-colors flex flex-col items-center justify-center gap-1 text-center shadow-sm h-12"
                  title="Restore Backup from JSON"
                >
                  <Upload size={14} className="shrink-0" />
                  <span>Restore<br/>Backup</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
                <button 
                  onClick={() => selectedPersonality && handleExportPersonality(selectedPersonality)}
                  disabled={!selectedPersonality}
                  className={`py-1 px-1 text-[10px] leading-tight font-medium rounded-md border transition-colors flex flex-col items-center justify-center gap-1 text-center shadow-sm h-12 ${
                    selectedPersonality 
                      ? "bg-[#1C1C20] hover:bg-[#25252B] text-gray-300 hover:text-white border-[#2E2E35]" 
                      : "bg-[#161619] text-gray-600 border-[#222226] cursor-not-allowed opacity-50"
                  }`}
                  title={selectedPersonality ? `Export Backup of ${selectedPersonality.name}` : "Select a character to export"}
                >
                  <Download size={14} className="shrink-0" />
                  <span>Export<br/>Backup</span>
                </button>
              </div>
            </div>

            {/* Personalities List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-1">
              <div 
                onClick={() => setSelectedPersonality(null)}
                className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors flex items-center gap-2.5 ${
                  selectedPersonality === null 
                    ? "bg-amber-500/10 border-l-2 border-amber-500 text-amber-100" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#18181C]"
                }`}
              >
                <span className="w-6 h-6 rounded bg-[#202025] border border-[#2F2F36] text-[10px] font-mono font-bold flex items-center justify-center text-gray-400 shrink-0">
                  AI
                </span>
                <span className="font-medium">Default AI</span>
              </div>
              
              {personalities.map((p) => (
                <div 
                  key={p.id}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors flex items-center gap-2.5 group ${
                    selectedPersonality?.id === p.id 
                      ? "bg-amber-500/10 border-l-2 border-amber-500 text-amber-100" 
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#18181C]"
                  }`}
                >
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPersonality(p);
                      }}
                      className="p-1 text-white hover:text-amber-300 hover:bg-[#25252B] rounded transition-colors"
                      title="Edit Character Details"
                    >
                      <Settings2 size={13} />
                    </button>
                  </div>
                  <div className="flex-1 flex items-center gap-3 min-w-0" onClick={() => setSelectedPersonality(p)}>
                    {p.avatar ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLightboxImage({
                            url: p.avatar!,
                            title: p.name,
                            subtitle: p.description || "Roleplay Character",
                          });
                        }}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-amber-500/30 shrink-0 bg-[#16161B] hover:border-amber-400 hover:ring-2 hover:ring-amber-500/50 transition-all cursor-zoom-in group/avatar relative"
                        title="Click to view full portrait"
                      >
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover/avatar:brightness-110 transition-all"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 size={13} className="text-amber-200 drop-shadow-md" />
                        </div>
                      </button>
                    ) : (
                      <span className="w-12 h-12 rounded-lg bg-amber-500/15 border border-amber-500/30 text-sm font-mono font-bold flex items-center justify-center text-amber-300 shrink-0">
                        {getInitials(p.name)}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-200">{p.name}</p>
                      {p.description ? (
                        <p className="text-[10px] text-gray-500 truncate">{p.description}</p>
                      ) : p.personality || p.traits ? (
                        <p className="text-[10px] text-gray-500 truncate">{p.personality || p.traits}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Footer: Active Model & Server Connection Status Indication Icon */}
            <div className="p-3 border-t border-[#2A2A2E] bg-[#0E0E12] text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Model</span>
                  
                  {/* Server connections status indication icon: green = connected, red = not connected, yellow = connected but slow */}
                  <div
                    onClick={checkServerConnection}
                    className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#2A2A32] cursor-pointer transition-colors group"
                    title={`Server Connection: ${
                      serverConnectionStatus === "connected"
                        ? "Connected (Normal Latency)"
                        : serverConnectionStatus === "slow"
                        ? "Connected but Slow"
                        : "Not Connected"
                    }${serverLatency !== null ? ` (${serverLatency}ms)` : ""} - Target: ${serverTarget}. Click to re-test.`}
                  >
                    {/* Status Indication Icon */}
                    <span className="relative flex h-2 w-2 shrink-0">
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
                      className={`text-[10px] font-medium font-mono leading-none ${
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
                        <span className="text-[9px] text-gray-400 ml-1">({serverLatency}ms)</span>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("settings")}
                  className="px-2 py-0.5 rounded bg-[#1C1C22] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#2E2E35] text-[10px] font-semibold transition-colors shrink-0"
                >
                  Settings
                </button>
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
                <span
                  className="font-mono text-amber-400/90 text-[11px] truncate block"
                  title={selectedModel}
                >
                  {selectedModel}
                </span>
              </div>
            </div>
          </aside>

        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden bg-[#0A0A0C]">
          {/* Side Panel: 25% area for personality details and status and everything else */}
          <div className="w-full md:w-[25%] md:min-w-[25%] md:max-w-[25%] border-r border-[#1F1F26] bg-[#0D0D11] overflow-y-auto flex flex-col p-3 gap-3 shrink-0">
            {selectedPersonality ? (
              <>
                {/* Active Persona Card */}
                <div className="bg-[#121216] border border-[#22222A] rounded-xl p-3 space-y-2.5 shadow-md shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <UserCircle2 size={13} className="text-amber-400" />
                      <span>Active Persona</span>
                    </div>
                  </div>

                  {/* Character Identity Row */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPersonality.avatar) {
                          setActiveLightboxImage({
                            url: selectedPersonality.avatar,
                            title: selectedPersonality.name,
                            subtitle: selectedPersonality.description || "Active Character Persona",
                          });
                        }
                      }}
                      disabled={!selectedPersonality.avatar}
                      className={`w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0 shadow-md overflow-hidden transition-all relative group ${
                        selectedPersonality.avatar ? "cursor-zoom-in hover:border-amber-400 hover:ring-2 hover:ring-amber-500/50 hover:scale-105" : ""
                      }`}
                      title={selectedPersonality.avatar ? "Click to view full portrait" : selectedPersonality.name}
                    >
                      {selectedPersonality.avatar ? (
                        <>
                          <img
                            src={selectedPersonality.avatar}
                            alt={selectedPersonality.name}
                            className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 size={13} className="text-amber-200 drop-shadow-md" />
                          </div>
                        </>
                      ) : (
                        selectedPersonality.name.slice(0, 2).toUpperCase()
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-100 text-sm leading-tight truncate">
                          {selectedPersonality.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => openEditPersonality(selectedPersonality)}
                          className="p-1 text-gray-400 hover:text-amber-300 hover:bg-[#202028] rounded-md transition-colors shrink-0 cursor-pointer"
                          title="Edit Character Details"
                        >
                          <Settings2 size={13} />
                        </button>
                      </div>
                      {selectedPersonality.description && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5" title={selectedPersonality.description}>
                          — {selectedPersonality.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row 1: Metrics, Palace, Quest Book */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setIsRelationshipMetricsOpen(true)}
                      className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 bg-rose-500/10 border border-rose-500/35 rounded-lg transition-colors font-medium shadow-xs cursor-pointer truncate"
                      title="Relationship Metrics & Visual Memory Board"
                    >
                      <HeartHandshake size={11} className="text-rose-400 shrink-0" />
                      <span className="truncate">Metrics</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMemPalaceOpen(true)}
                      className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/30 rounded-lg transition-colors font-medium shadow-xs cursor-pointer truncate"
                      title="View Memory Palace"
                    >
                      <Landmark size={11} className="text-amber-400 shrink-0" />
                      <span className="truncate">Palace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQuestModalOpen(true)}
                      className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/30 rounded-lg transition-colors font-medium shadow-xs cursor-pointer truncate"
                      title="Character Quest Book (Desires & Errands)"
                    >
                      <BookOpen size={11} className="text-amber-400 shrink-0" />
                      <span className="truncate">Quests</span>
                      {activeCharDesiresCount > 0 && (
                        <span className="px-1 py-0.2 rounded-full text-[9px] font-mono bg-amber-500/30 text-amber-300 border border-amber-500/40">
                          {activeCharDesiresCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Action Buttons Row 2: Export PDF, Edit Profile & Purge */}
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={isExportingPdf || messages.length === 0}
                      className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/35 rounded-lg transition-colors font-medium shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed truncate"
                      title="Export chat transcript to PDF"
                    >
                      {isExportingPdf ? (
                        <Loader2 size={11} className="text-amber-400 animate-spin shrink-0" />
                      ) : (
                        <FileDown size={11} className="text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">Export PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditPersonality(selectedPersonality)}
                      className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] text-gray-200 hover:text-white bg-[#1C1C22] hover:bg-[#26262E] border border-[#2D2D36] rounded-lg transition-colors font-medium shadow-xs cursor-pointer truncate"
                      title="Edit Character Profile"
                    >
                      <Settings2 size={11} className="text-amber-400 shrink-0" />
                      <span className="truncate">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPurgeModalOpen(true)}
                      className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-red-500/10 border border-red-500/35 rounded-lg transition-colors font-medium shadow-xs cursor-pointer truncate"
                      title="Purge Active Chat & Memories"
                    >
                      <Trash2 size={11} className="text-red-400 shrink-0" />
                      <span className="truncate">Purge</span>
                    </button>
                  </div>
                </div>

                {/* Pinned Active Quest Banner */}
                {inProgressQuest && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/35 via-[#161622] to-amber-950/20 border border-amber-500/40 shadow-sm flex flex-col gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/35 shrink-0 mt-0.5">
                        <Compass size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                            📌 Pinned Quest
                          </span>
                          <h4 className="text-xs font-semibold text-gray-100 truncate max-w-[180px]">
                            {inProgressQuest.title}
                          </h4>
                          {inProgressQuest.status === "pending_payout" ? (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-pulse">
                              Goal Satisfied
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                              Active Goal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                          {inProgressQuest.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
                      <span className="text-[10px] text-gray-400 italic">
                        Satisfy narrative in chat
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsQuestModalOpen(true)}
                        className="px-2 py-0.5 text-xs text-gray-300 hover:text-white bg-[#16161D] hover:bg-[#20202A] border border-[#2B2B38] rounded-lg transition-colors cursor-pointer"
                        title="View in Quest Book"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                )}

                {/* Proposed Quest Prompt Alert Banner */}
                {proposedQuest && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-sky-950/30 via-[#14141E] to-amber-950/20 border border-sky-500/35 shadow-sm flex flex-col gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/35 shrink-0 mt-0.5">
                        <BookOpen size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">
                            Desire Offered
                          </span>
                          <h4 className="text-xs font-semibold text-gray-100 truncate max-w-[180px]">
                            {proposedQuest.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-gray-300 italic mt-1 line-clamp-2">
                          "{proposedQuest.character_motivation || proposedQuest.description}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-sky-500/20">
                      <button
                        type="button"
                        onClick={() => handleDeclineProposedQuest(proposedQuest)}
                        className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-200 bg-[#16161D] hover:bg-[#20202A] border border-[#2B2B38] rounded-lg transition-colors cursor-pointer"
                        title="Decline"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsQuestModalOpen(true)}
                        className="px-2 py-0.5 text-xs text-sky-300 hover:text-white bg-[#16161D] hover:bg-[#20202A] border border-sky-500/30 rounded-lg transition-colors cursor-pointer"
                        title="View in Quest Book"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                )}

                {/* Scenario & Persona Details Card - Collapsed by default */}
                <div className="bg-[#121216] border border-[#22222A] rounded-xl shadow-md transition-all shrink-0">
                  <div
                    onClick={() => setIsScenarioDetailsExpanded(!isScenarioDetailsExpanded)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#16161D] transition-colors select-none"
                    title={isScenarioDetailsExpanded ? "Click to collapse details" : "Click to expand details"}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 min-w-0">
                      <Sparkles size={13} className="shrink-0" />
                      <span className="truncate">Scenario & Character Details</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditPersonality(selectedPersonality);
                        }}
                        className="text-[11px] text-gray-400 hover:text-amber-300 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-[#202028] cursor-pointer"
                        title="Edit Character & Scenario Details"
                      >
                        <Settings2 size={11} />
                        <span>Edit</span>
                      </button>
                      <div className="text-gray-400 hover:text-gray-200 transition-transform duration-200 p-0.5">
                        <ChevronDown
                          size={14}
                          className={`transform transition-transform duration-200 ${
                            isScenarioDetailsExpanded ? "rotate-180 text-amber-400" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary preview bar when collapsed (default state) */}
                  {!isScenarioDetailsExpanded && (
                    <div
                      onClick={() => setIsScenarioDetailsExpanded(true)}
                      className="px-3 pb-2.5 text-[11px] text-gray-400 flex items-center justify-between gap-2 cursor-pointer hover:text-gray-300 select-none border-t border-[#181820] pt-2"
                    >
                      <span className="truncate text-gray-400">
                        {activeScenario ? `Active: ${activeScenario.name}` : "Details collapsed. Click to expand."}
                      </span>
                      <span className="text-[10px] text-amber-400/80 hover:text-amber-300 shrink-0 font-medium">
                        Expand ↓
                      </span>
                    </div>
                  )}

                  {/* Detailed contents when expanded - shows all details completely without cutting off; block ends directly after the last detail */}
                  {isScenarioDetailsExpanded && (
                    <div className="px-3 pb-3 space-y-2.5 text-xs w-full min-w-0 box-border border-t border-[#1C1C22] pt-2.5">
                      {/* Character Overview / Description if available */}
                      {selectedPersonality.description && (
                        <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429] w-full min-w-0 box-border space-y-1">
                          <span className="text-gray-400 font-semibold flex items-center gap-1.5 text-[11px]">
                            <UserCircle2 size={12} className="text-amber-400 shrink-0" />
                            <span>Character Overview</span>
                          </span>
                          <p className="text-gray-200 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                            {selectedPersonality.description}
                          </p>
                        </div>
                      )}

                      {/* Character Persona & Psychological Traits */}
                      {(selectedPersonality.personality || selectedPersonality.traits) && (
                        <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429] w-full min-w-0 box-border space-y-1">
                          <span className="text-gray-400 font-semibold flex items-center gap-1.5 text-[11px]">
                            <Heart size={12} className="text-rose-400 shrink-0" />
                            <span>Character & Psychological Traits</span>
                          </span>
                          <p className="text-gray-200 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                            {selectedPersonality.personality || selectedPersonality.traits}
                          </p>
                        </div>
                      )}

                      {/* Age & Demographics */}
                      {selectedPersonality.age && (
                        <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429] w-full min-w-0 box-border space-y-1">
                          <span className="text-gray-400 font-semibold flex items-center gap-1.5 text-[11px]">
                            <Calendar size={12} className="text-amber-400 shrink-0" />
                            <span>Age & Demographics</span>
                          </span>
                          <p className="text-gray-200 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                            {selectedPersonality.age}
                          </p>
                        </div>
                      )}

                      {/* Appearance */}
                      {selectedPersonality.appearance && (
                        <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429] w-full min-w-0 box-border space-y-1">
                          <span className="text-gray-400 font-semibold flex items-center gap-1.5 text-[11px]">
                            <Eye size={12} className="text-sky-400 shrink-0" />
                            <span>Appearance & Physical Features</span>
                          </span>
                          <p className="text-gray-200 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                            {selectedPersonality.appearance}
                          </p>
                        </div>
                      )}

                      {/* Scene & Plot / Scenario Details */}
                      {activeScenario ? (
                        <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429] w-full min-w-0 box-border space-y-2">
                          <div className="text-gray-400 font-semibold flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 min-w-0 text-amber-400">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">Scene & Scenario: {activeScenario.name}</span>
                            </span>
                            <span className="text-[10px] text-amber-400/90 font-mono shrink-0 ml-1">Macros Active</span>
                          </div>

                          {(activeScenario.location || activeScenario.timeOfDay) && (
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                              {activeScenario.location && (
                                <span className="px-2 py-0.5 rounded bg-[#131317] border border-[#262630] text-gray-300 break-words">
                                  <span className="text-emerald-400 font-medium">Location:</span> {activeScenario.location}
                                </span>
                              )}
                              {activeScenario.timeOfDay && (
                                <span className="px-2 py-0.5 rounded bg-[#131317] border border-[#262630] text-gray-300 break-words">
                                  <span className="text-amber-400 font-medium">Time:</span> {activeScenario.timeOfDay}
                                </span>
                              )}
                            </div>
                          )}

                          {activeScenario.description && (
                            <div className="p-2 rounded bg-[#131317] border border-[#22222A] text-[11px] text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Overview</span>
                              {activeScenario.description}
                            </div>
                          )}
                          {activeScenario.relationship && (
                            <div className="p-2 rounded bg-[#131317] border border-[#22222A] text-[11px] text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                              <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mb-0.5"><Heart size={10} className="text-rose-400"/> Relationship</span>
                              {activeScenario.relationship}
                            </div>
                          )}

                          {activeScenario.context && (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                                Plot Setting & Narrative Context
                              </span>
                              <p className="text-gray-200 text-[11px] leading-relaxed break-words whitespace-pre-wrap bg-[#131317] p-2.5 rounded border border-[#24242E]">
                                {resolveRoleplayVariables(activeScenario.context, selectedPersonality.name, userPersona?.name || "User")}
                              </p>
                            </div>
                          )}

                          {activeScenario.firstMessage?.trim() && (
                            <div className="space-y-1 pt-1.5 border-t border-[#252530]">
                              <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                                <Sparkles size={11} />
                                First Message (Opening Starter)
                              </span>
                              <p className="text-amber-100/90 text-[11px] leading-relaxed break-words whitespace-pre-wrap italic bg-black/30 p-2.5 rounded border border-amber-500/25">
                                "{resolveRoleplayVariables(activeScenario.firstMessage, selectedPersonality.name, userPersona?.name || "User")}"
                              </p>
                            </div>
                          )}
                        </div>
                      ) : selectedPersonality.scenario ? (
                        <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429] w-full min-w-0 box-border space-y-1">
                          <span className="text-gray-400 font-semibold flex items-center gap-1.5 text-[11px]">
                            <MapPin size={12} className="text-amber-400 shrink-0" />
                            <span>Scene & Scenario Setting</span>
                          </span>
                          <p className="text-gray-200 text-[11px] leading-relaxed break-words whitespace-pre-wrap bg-[#131317] p-2.5 rounded border border-[#24242E]">
                            {resolveRoleplayVariables(selectedPersonality.scenario, selectedPersonality.name, userPersona?.name || "User")}
                          </p>
                        </div>
                      ) : null}

                      {/* System Instructions & Directives */}
                      {selectedPersonality.systemInstruction && (
                        <div className="bg-[#18181D] p-2.5 rounded-lg border border-[#242429] w-full min-w-0 box-border space-y-1">
                          <span className="text-gray-400 font-semibold flex items-center gap-1.5 text-[11px]">
                            <FileText size={12} className="text-amber-400 shrink-0" />
                            <span>System Directives & Context</span>
                          </span>
                          <p className="text-gray-200 text-[11px] leading-relaxed break-words whitespace-pre-wrap bg-[#131317] p-2.5 rounded border border-[#24242E]">
                            {selectedPersonality.systemInstruction}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Vitals & Status Card */}
                <div className="bg-[#121216] border border-[#22222A] rounded-xl p-3 space-y-2.5 shadow-md shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <Activity size={13} />
                      <span>Vitals & Status</span>
                    </div>
                  </div>

                  <div className="w-full">
                    <CharacterStateDisplay
                      personality={selectedPersonality}
                      onUpdatePersonality={(updated) => {
                        setSelectedPersonality(updated);
                        setPersonalities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                      }}
                      onViewAvatar={(url, title, subtitle) => {
                        setActiveLightboxImage({ url, title, subtitle });
                      }}
                      userPersonaName={userPersona?.name || "User"}
                      selectedModel={selectedModel}
                      customApiKey={geminiApiKey}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-[#121216] border border-[#22222A] rounded-xl p-4 space-y-3 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#202025] border border-[#2F2F36] text-xs font-mono font-bold flex items-center justify-center text-amber-400">
                    AI
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200">Default AI Assistant</h3>
                    <p className="text-[11px] text-gray-500">General conversation mode</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Select a character persona from the left sidebar to start a roleplay scenario with memories, quests, and dynamic statuses.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf || messages.length === 0}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export chat transcript to PDF"
                  >
                    {isExportingPdf ? (
                      <Loader2 size={12} className="text-amber-400 animate-spin" />
                    ) : (
                      <FileDown size={12} className="text-amber-400" />
                    )}
                    <span>PDF Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPurgeModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 bg-red-500/10 border border-red-500/30 rounded-lg transition-colors cursor-pointer"
                    title="Purge Active Chat"
                  >
                    <Trash2 size={12} className="text-red-400" />
                    <span>Purge</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Pane: 75% area purely for the chat window */}
          <div className="flex-1 w-full md:w-[75%] md:min-w-[75%] md:max-w-[75%] flex flex-col h-full overflow-hidden bg-[#0A0A0C]">
            {/* Top Chat Toolbar Bar */}
            <div className="px-4 py-2 border-b border-[#1E1E24] bg-[#0E0E12] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-200 truncate">
                  {selectedPersonality ? selectedPersonality.name : "Default AI Assistant"}
                </span>
                {activeScenario && (
                  <span className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full truncate max-w-[200px] hidden sm:inline-block">
                    Scenario: {activeScenario.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Processing Status Indicators */}
                <div className="flex items-center gap-2 mr-2" title="Engine Status">
                  <div 
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      engineErrors.chat || (apiError && !isLoading) 
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.25)]' 
                        : isLoading 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`} 
                    title={engineErrors.chat || (apiError && !isLoading ? apiError.message : "Chat Engine Operational")}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      engineErrors.chat || (apiError && !isLoading) 
                        ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' 
                        : isLoading 
                        ? 'bg-amber-400 animate-pulse' 
                        : 'bg-emerald-500'
                    }`} />
                    Chat
                  </div>
                  <div 
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      engineErrors.quests 
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.25)]' 
                        : isLoading 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`} 
                    title={engineErrors.quests || "Quest Engine Operational"}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      engineErrors.quests 
                        ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' 
                        : isLoading 
                        ? 'bg-amber-400 animate-pulse delay-75' 
                        : 'bg-emerald-500'
                    }`} />
                    Quests
                  </div>
                  <div 
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      engineErrors.vitals 
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.25)]' 
                        : isLoading 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`} 
                    title={engineErrors.vitals || "Vitals & Mood Engine Operational"}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      engineErrors.vitals 
                        ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' 
                        : isLoading 
                        ? 'bg-amber-400 animate-pulse delay-150' 
                        : 'bg-emerald-500'
                    }`} />
                    Vitals
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsChatFocused(!isChatFocused)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs border rounded-lg transition-colors cursor-pointer ${
                    isChatFocused 
                      ? "text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 bg-emerald-500/10 border-emerald-500/35" 
                      : "text-gray-400 hover:text-gray-300 hover:bg-[#202028] bg-[#16161C] border-[#2A2A32]"
                  }`}
                  title={isChatFocused ? "Exit Focus Mode" : "Focus on Chat"}
                >
                  <Monitor size={12} className={isChatFocused ? "text-emerald-400" : ""} />
                  <span className="hidden sm:inline">{isChatFocused ? "Focused" : "Focus"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || messages.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/35 rounded-lg transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Export chat transcript to PDF"
                >
                  {isExportingPdf ? (
                    <Loader2 size={12} className="text-amber-400 animate-spin" />
                  ) : (
                    <FileDown size={12} className="text-amber-400" />
                  )}
                  <span className="hidden sm:inline">PDF Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-red-500/10 border border-red-500/25 rounded-lg transition-colors cursor-pointer"
                  title="Purge Active Chat & Memories"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Purge</span>
                </button>
              </div>
            </div>
            {/* Chat Area */}
            <main
              className="flex-1 overflow-hidden relative flex flex-col"
            >
              {/* Base Background Color Layer */}
              <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                  backgroundColor: (!selectedPersonality?.customBackgroundUrl && themeSettings?.chatBackgroundType === 'solid')
                    ? (themeSettings?.chatBackgroundColor || '#0A0A0C')
                    : '#0A0A0C',
                }}
              />

              {/* Chat Background Layer (Character Custom Background or Global Theme) */}
              {(() => {
                const charBg = selectedPersonality?.customBackgroundUrl?.trim();
                const globalGradient = themeSettings?.chatBackgroundType === 'gradient' ? themeSettings?.chatBackgroundGradient : null;
                const globalImg = (themeSettings?.chatBackgroundType === 'image' && themeSettings?.chatBackgroundImageUrl) ? themeSettings.chatBackgroundImageUrl.trim() : null;

                const bgImage = charBg
                  ? (charBg.startsWith('url(') ? charBg : `url("${charBg}")`)
                  : globalGradient
                  ? globalGradient
                  : globalImg
                  ? (globalImg.startsWith('url(') ? globalImg : `url("${globalImg}")`)
                  : null;

                if (!bgImage) return null;

                // Opacity handling: if custom background, use character's customBackgroundOpacity (0..1 or 0..100)
                let effectiveOpacity = 1;
                if (charBg) {
                  if (typeof selectedPersonality?.customBackgroundOpacity === 'number') {
                    effectiveOpacity = selectedPersonality.customBackgroundOpacity > 1
                      ? selectedPersonality.customBackgroundOpacity / 100
                      : selectedPersonality.customBackgroundOpacity;
                  }
                } else if (typeof themeSettings?.chatBackgroundOpacity === 'number') {
                  effectiveOpacity = themeSettings.chatBackgroundOpacity > 1
                    ? themeSettings.chatBackgroundOpacity / 100
                    : themeSettings.chatBackgroundOpacity;
                }

                // Blur handling
                const blurPx = (!charBg && typeof themeSettings?.chatBackgroundBlur === 'number')
                  ? themeSettings.chatBackgroundBlur
                  : 0;

                return (
                  <div 
                    className="absolute inset-0 z-0 pointer-events-none transition-all duration-300"
                    style={{
                      backgroundImage: bgImage,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      opacity: effectiveOpacity,
                      filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                    }}
                  />
                );
              })()}

              {/* Scrollable Messages Area */}
              <div 
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto overscroll-contain relative z-10 w-full"
                onScroll={handleChatScroll}
              >
                <div className="px-4 sm:px-6 pt-4 pb-2 flex flex-col gap-5 w-full min-h-full">

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-6 opacity-50">
                  <div className="w-16 h-16 border-2 border-amber-500/20 border-t-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-amber-500/50 text-xs tracking-widest uppercase font-semibold">Idle</span>
                  </div>
                  <div>
                    <h2 className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2">Neural Link Established</h2>
                    <p className="text-gray-600 max-w-sm mx-auto text-sm italic font-serif">
                      {selectedPersonality 
                        ? `Connected to ${selectedPersonality.name}. Memory segment initialized.` 
                        : `Query the infinite memory to begin the session...`}
                    </p>
                  </div>
                </div>
              ) : (() => {
                // Compute the indices of the last user response and last personality response
                let lastUserIndex = -1;
                let lastModelIndex = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (lastUserIndex === -1 && messages[i].role === "user" && getTextContent(messages[i])) {
                    lastUserIndex = i;
                  }
                  if (lastModelIndex === -1 && messages[i].role === "model" && getTextContent(messages[i])) {
                    lastModelIndex = i;
                  }
                  if (lastUserIndex !== -1 && lastModelIndex !== -1) break;
                }

                const offset = Math.max(0, messages.length - visibleMessagesCount);
                const visibleMessages = messages.slice(offset);

                return (
                  <>
                    {offset > 0 && (
                      <div className="flex justify-center mb-4">
                        <button
                          onClick={() => setVisibleMessagesCount(prev => prev + 20)}
                          className="px-4 py-2 rounded-full text-xs font-semibold bg-[#1A1A22] text-gray-300 hover:text-amber-300 hover:bg-[#242430] border border-[#2E2E38] transition-all"
                        >
                          Load older messages ({offset} remaining)
                        </button>
                      </div>
                    )}
                    {visibleMessages.map((msg, idx) => {
                      const index = offset + idx;
                      // We only display messages that have text (ignore function calls/responses in UI)
                      const text = getTextContent(msg);
                      if (!text) return null;

                      const isUser = msg.role === "user";
                      const isLastUserMessage = isUser && index === lastUserIndex;
                      const isLastModelMessage = !isUser && index === lastModelIndex;
                      const isEditingThisMessage = editingMessageIndex === index;

                      return (
                        <div key={index} className={`w-full flex ${isUser ? "justify-end" : "justify-start"} group`}>
                      <div className={`w-1/2 min-w-[50%] max-w-[50%] flex items-start gap-2.5 sm:gap-3 min-w-0 ${
                        isUser 
                          ? "flex-row-reverse" 
                          : "flex-row"
                      }`}>
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center shadow-md ${
                          isUser
                            ? "bg-[#18181E] border border-[#2E2E38]"
                            : "bg-[#1A1A24] border-2 border-amber-500/40 shadow-black/40"
                        }`}>
                          {isUser ? (
                            userPersona?.avatar ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLightboxImage({
                                    url: userPersona.avatar!,
                                    title: userPersona.name || "User Persona",
                                    subtitle: userPersona.appearance || "Your Roleplay Persona",
                                  });
                                }}
                                className="w-full h-full cursor-zoom-in hover:opacity-90 group relative"
                                title="Click to view portrait"
                              >
                                <img
                                  src={userPersona.avatar}
                                  alt={userPersona.name || "User"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Maximize2 size={11} className="text-amber-200" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-amber-500/15 text-amber-300 font-bold text-xs">
                                {getInitials(userPersona?.name || "User")}
                              </div>
                            )
                          ) : (
                            selectedPersonality?.avatar ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLightboxImage({
                                    url: selectedPersonality.avatar!,
                                    title: selectedPersonality.name,
                                    subtitle: selectedPersonality.description || "Character Persona",
                                  });
                                }}
                                className="w-full h-full cursor-zoom-in hover:opacity-90 group relative"
                                title="Click to view character portrait"
                              >
                                <img
                                  src={selectedPersonality.avatar}
                                  alt={selectedPersonality.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Maximize2 size={11} className="text-amber-200" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600/25 to-amber-950/40 text-amber-300 font-bold text-xs italic">
                                {getInitials(selectedPersonality?.name || "AI")}
                              </div>
                            )
                          )}
                        </div>

                        {/* Message Column */}
                        <div className={`space-y-1.5 flex-1 min-w-0 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                          <div className={`flex items-center gap-2 mb-0.5 ${isUser ? "flex-row-reverse" : ""}`}>
                            <p className={`text-xs font-semibold tracking-wide ${isUser ? "text-gray-200" : "text-amber-400"}`}>
                              {isUser ? (userPersona?.name || "User") : (selectedPersonality?.name || "Unspecified Chat App Agent")}
                            </p>
                            {isUser ? (
                              <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-[#16161D] border border-[#262632]">
                                You
                              </span>
                            ) : (
                              selectedPersonality?.age && (
                                <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-[#16161D] border border-[#262632]">
                                  Age: {selectedPersonality.age}
                                </span>
                              )
                            )}
                          </div>

                          {isEditingThisMessage ? (
                            <div className="w-full bg-[#15151A] border border-amber-500/40 rounded-xl p-3.5 space-y-3 shadow-xl text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                  <Edit2 size={13} />
                                  {isUser ? "Edit message & branch response" : `Edit ${selectedPersonality?.name || "character"}'s response`}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  {isUser ? "Subsequent scene responses will recalculate" : "Saves edits to this turn in chat history"}
                                </span>
                              </div>
                              <textarea
                                value={editingMessageText}
                                onChange={(e) => setEditingMessageText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (isUser) {
                                      handleSaveAndRegenerateEdit(index);
                                    } else {
                                      handleSavePersonalityEdit(index);
                                    }
                                  } else if (e.key === "Escape") {
                                    handleCancelEditMessage();
                                  }
                                }}
                                autoFocus
                                rows={3}
                                className="w-full bg-[#0E0E11] border border-[#2A2A2E] focus:border-amber-500/70 rounded-lg p-3 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none transition-all resize-y min-h-[72px]"
                                placeholder={isUser ? "Edit your message..." : "Edit character response..."}
                              />
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-gray-500 hidden sm:inline">
                                  Press <kbd className="px-1.5 py-0.5 bg-[#202025] rounded text-gray-400 text-[10px] border border-[#2F2F36]">Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-[#202025] rounded text-gray-400 text-[10px] border border-[#2F2F36]">Esc</kbd> to cancel
                                </span>
                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    type="button"
                                    onClick={handleCancelEditMessage}
                                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-[#222228] rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => isUser ? handleSaveAndRegenerateEdit(index) : handleSavePersonalityEdit(index)}
                                    disabled={!editingMessageText.trim() || isLoading}
                                    className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {isUser ? <Sparkles size={12} /> : <Check size={12} />}
                                    <span>{isUser ? "Save & Regenerate" : "Save changes"}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Distinctive Bubble Containers for Right (User) and Left (Personality) */}
                              <div 
                                style={{
                                  backgroundColor: isUser ? (themeSettings?.userBubbleColor || '#181824') : (themeSettings?.botBubbleColor || '#121217'),
                                  color: isUser ? (themeSettings?.userTextColor || '#f3f4f6') : (themeSettings?.botTextColor || '#f3f4f6'),
                                  borderRadius: themeSettings?.bubbleRadius === 'sharp' ? '0px' : themeSettings?.bubbleRadius === 'pill' ? '24px' : '16px',
                                  padding: themeSettings?.messagePadding === 'compact' ? '0.5rem 0.75rem' : themeSettings?.messagePadding === 'relaxed' ? '1.5rem' : '1rem',
                                  borderWidth: `${themeSettings?.bubbleBorderWidth ?? 1}px`,
                                  boxShadow: themeSettings?.bubbleGlow ? `0 0 10px ${isUser ? themeSettings?.userBubbleColor : themeSettings?.botBubbleColor}` : 'none'
                                }}
                                className={`w-full text-left shadow-sm ${
                                isUser
                                  ? "border-[#2B2B3D]"
                                  : "border-[#202028]"
                              }`}>
                                <RoleplayMessage
                                  key={`${index}-${msg.activeVariationIndex ?? 0}`}
                                  content={text}
                                  isUser={isUser}
                                  characterName={selectedPersonality?.name}
                                  themeSettings={themeSettings}
                                />
                              </div>

                              {/* Action Toolbar for User Messages (Edit & Copy) */}
                              {isUser && (
                                <div className="flex items-center gap-2 pt-1 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                                  {/* Only the user's LAST response can be edited & regenerated */}
                                  {isLastUserMessage && (
                                    <button
                                      onClick={() => handleStartEditMessage(index, text)}
                                      disabled={isLoading}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-[#161619] hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 border border-[#2A2A2E] hover:border-amber-500/30 transition-all disabled:opacity-50 shadow-sm"
                                      title="Edit your last message and regenerate character response"
                                    >
                                      <Edit2 size={12} className="text-amber-400/80" />
                                      <span>Edit & Regenerate</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleCopyMessage(text, index)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-[#161619] hover:bg-[#25252B] text-gray-400 hover:text-gray-200 border border-[#2A2A2E] transition-all shadow-sm"
                                    title="Copy message to clipboard"
                                  >
                                    {copiedIndex === index ? (
                                      <>
                                        <Check size={12} className="text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* Action Toolbar for Model Messages (Edit Response, Regenerate Variation, Creative Variation, Copy, & Variations Indicator) */}
                          {!isUser && !isEditingThisMessage && (() => {
                            const vars = msg.variations && msg.variations.length > 0 ? msg.variations : (text ? [text] : []);
                            const totalVars = vars.length;
                            const currentVarIdx = typeof msg.activeVariationIndex === "number" ? msg.activeVariationIndex : totalVars - 1;

                            return (
                              <div className={`w-full flex items-center justify-between gap-2 pt-1.5 transition-opacity ${isLastModelMessage ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Only the personality's LAST response can be edited or regenerated */}
                                  {isLastModelMessage && (
                                    <>
                                      <button
                                        onClick={() => handleStartEditMessage(index, text)}
                                        disabled={isLoading}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-[#161619] hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 border border-[#2A2A2E] hover:border-amber-500/30 transition-all disabled:opacity-50 shadow-sm"
                                        title="Edit character's last response"
                                      >
                                        <Edit2 size={12} className="text-amber-400/80" />
                                        <span>Edit response</span>
                                      </button>

                                      <button
                                        onClick={() => handleRegenerate(index)}
                                        disabled={isLoading}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-[#161619] hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 border border-[#2A2A2E] hover:border-amber-500/30 transition-all disabled:opacity-50 shadow-sm"
                                        title="Regenerate this reply to get a new variation"
                                      >
                                        <RotateCcw size={12} className={isRegeneratingIndex === index ? "animate-spin text-amber-400" : "text-amber-400/80"} />
                                        <span>{isRegeneratingIndex === index ? "Synthesizing..." : "Regenerate variation"}</span>
                                      </button>

                                      <button
                                        onClick={() => handleRegenerate(index, 0.98)}
                                        disabled={isLoading}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-[#161619] hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 border border-[#2A2A2E] hover:border-amber-500/30 transition-all disabled:opacity-50 shadow-sm"
                                        title="High-creativity variation"
                                      >
                                        <Sparkles size={12} className="text-amber-400" />
                                        <span>Creative variation</span>
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => handleCopyMessage(text, index)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-[#161619] hover:bg-[#25252B] text-gray-400 hover:text-gray-200 border border-[#2A2A2E] transition-all shadow-sm"
                                    title="Copy message to clipboard"
                                  >
                                    {copiedIndex === index ? (
                                      <>
                                        <Check size={12} className="text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Variations Navigator: < 1/2 > */}
                                {totalVars > 1 && (
                                  <div
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#141418] border border-[#2A2A30] text-xs select-none shadow-sm ml-auto"
                                    onWheel={(e) => {
                                      if (totalVars <= 1 || isLoading) return;
                                      if (e.deltaY > 0 || e.deltaX > 0) {
                                        if (currentVarIdx < totalVars - 1) handleSelectVariation(index, currentVarIdx + 1);
                                      } else if (e.deltaY < 0 || e.deltaX < 0) {
                                        if (currentVarIdx > 0) handleSelectVariation(index, currentVarIdx - 1);
                                      }
                                    }}
                                    title="Switch variations: click < > or scroll"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSelectVariation(index, currentVarIdx - 1)}
                                      disabled={currentVarIdx <= 0 || isLoading}
                                      className="p-1 rounded hover:bg-[#222228] text-gray-400 hover:text-amber-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                      title="Previous variation (Left Arrow)"
                                      aria-label="Previous variation"
                                    >
                                      <ChevronLeft size={14} />
                                    </button>

                                    <span className="text-[11px] font-mono font-medium text-gray-200 tracking-wider px-1">
                                      {currentVarIdx + 1}/{totalVars}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleSelectVariation(index, currentVarIdx + 1)}
                                      disabled={currentVarIdx >= totalVars - 1 || isLoading}
                                      className="p-1 rounded hover:bg-[#222228] text-gray-400 hover:text-amber-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                      title="Next variation (Right Arrow)"
                                      aria-label="Next variation"
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </>
                );
              })()}
              {isLoading && (
                <div className="w-full flex justify-start">
                  <div className="w-1/2 min-w-[50%] max-w-[50%] flex items-start gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-800/50 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                    <div className="space-y-1.5 flex-1 bg-[#121217]/95 border border-[#202028] rounded-2xl rounded-tl-xs p-3.5 sm:p-4 shadow-sm">
                      <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold">{selectedPersonality?.name || "Unspecified Chat App Agent"}</p>
                      <div className="text-xs text-amber-200/60 uppercase tracking-[0.2em] animate-pulse">
                        {isRegeneratingIndex !== null ? "Synthesizing new variation..." : "Synthesizing..."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-1" />
                </div>
              </div>
            </main>

          {/* Input Area */}
          <footer className="px-4 pt-1.5 pb-4 sm:px-6 sm:pt-2 sm:pb-4 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/90 to-transparent sticky bottom-0 z-10 shrink-0">
            <div className="w-full relative">
              {/* Active Event Primed Visual Tag */}
              {activeEvent && (
                <div className="mb-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-lg shadow-black/40">
                    <span className="text-sm leading-none">🎲</span>
                    <span className="font-semibold text-amber-300">Active Event:</span>
                    <span className="text-white font-medium">{activeEvent.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${getTypeBadgeClass(activeEvent.type)}`}>
                      {activeEvent.type}
                    </span>
                    <button
                      type="button"
                      id="clear-active-event-tag-btn"
                      onClick={() => setActiveEvent(null)}
                      className="ml-1 p-0.5 rounded-full hover:bg-amber-500/30 text-amber-400 hover:text-white transition-colors"
                      title="Clear active event (x)"
                      aria-label="Clear active event"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Error & Rate Limit Notification Banner */}
              {apiError && (
                <div className="mb-3 bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-lg shadow-black/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertCircle size={16} className="text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-amber-300">
                        {apiError.isRateLimit ? "Gemini Rate Limit (429) Encountered" : "Chat Generation Error"}
                      </p>
                      <p className="text-[11px] text-amber-200/80 truncate">
                        {apiError.isRateLimit 
                          ? "API quota temporarily throttled. The server automatically retries with backoff and switches to Flash 1.5."
                          : apiError.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setInitialSettingsSection("error_logs");
                        setActiveTab("settings");
                      }}
                      className="px-2 py-1 rounded bg-[#1C1C22] hover:bg-[#25252E] text-gray-200 hover:text-amber-300 font-medium text-[11px] border border-[#2E2E36] transition-colors"
                      title="Navigate to Error Logs in Settings"
                    >
                      View in Error Logs
                    </button>
                    {apiError.isRateLimit && selectedModel !== "gemini-3.1-flash-lite" && (
                      <button
                        onClick={() => {
                          setSelectedModel("gemini-3.1-flash-lite");
                          setApiError(null);
                          handleRegenerate();
                        }}
                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-[11px] border border-amber-500/30 transition-colors"
                      >
                        Switch to Flash Lite & Retry
                      </button>
                    )}
                    {selectedModel !== (defaultModel || "gemini-3.8-flash") && (
                      <button
                        onClick={() => {
                          const target = defaultModel || "gemini-3.8-flash";
                          setSelectedModel(target);
                          localStorage.setItem("ACTIVE_INFERENCE_MODEL", target);
                          fetch("/api/active-model", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ model: target }),
                          }).catch(() => {});
                          setApiError(null);
                          handleRegenerate();
                        }}
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[11px] transition-colors"
                        title="Switch to default model and retry"
                      >
                        Switch to {defaultModel || "Gemini 3.8 Flash"} & Retry
                      </button>
                    )}
                    <button
                      onClick={() => setApiError(null)}
                      className="p-1 text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 rounded transition-colors"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-engine Error Notification Banner (Vitals, Quests) */}
              {(engineErrors.vitals || engineErrors.quests) && !apiError && (
                <div className="mb-3 bg-red-950/40 border border-red-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-200 animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-lg shadow-black/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-red-300">
                        {engineErrors.vitals && engineErrors.quests 
                          ? "Vitals & Quest Engine Failure" 
                          : engineErrors.vitals 
                          ? "Character State & Mood Engine Error" 
                          : "Quest Engine Error"}
                      </p>
                      <p className="text-[11px] text-red-200/80 truncate">
                        {engineErrors.vitals || engineErrors.quests}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setInitialSettingsSection("model_servers");
                        setActiveTab("settings");
                      }}
                      className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium text-[11px] border border-red-500/30 transition-colors cursor-pointer"
                      title="Adjust model or API keys in Neural Settings"
                    >
                      Configure Neural Models
                    </button>
                    <button
                      type="button"
                      onClick={() => setEngineErrors({ chat: null, quests: null, vitals: null })}
                      className="p-1 text-red-400 hover:text-red-200 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                {/* 🎲 Event Trigger Button & Popover */}
                <div className="relative shrink-0">
                  <button
                    id="chat-event-trigger-btn"
                    type="button"
                    onClick={() => setIsEventPopoverOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 h-12 px-3.5 sm:px-4 rounded-full text-xs font-semibold transition-all border shadow-lg ${
                      activeEvent
                        ? "bg-amber-500/25 border-amber-500 text-amber-300 shadow-amber-900/30 ring-1 ring-amber-500/50"
                        : isEventPopoverOpen
                        ? "bg-[#25252E] border-amber-500/60 text-amber-300"
                        : "bg-[#161618] hover:bg-[#202026] border-[#2A2A2E] text-gray-300 hover:text-white"
                    }`}
                    title="Select and prime an event for the next message"
                    aria-label="Event Selector"
                  >
                    <span className="text-sm leading-none">🎲</span>
                    <span className="hidden sm:inline">Event</span>
                    {activeEvent && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>

                  <EventSelectorPopover
                    isOpen={isEventPopoverOpen}
                    onClose={() => setIsEventPopoverOpen(false)}
                    events={events}
                    activeEvent={activeEvent}
                    onSelectEvent={(ev) => {
                      setActiveEvent(ev);
                      setIsEventPopoverOpen(false);
                    }}
                    onClearActiveEvent={() => setActiveEvent(null)}
                    onOpenManager={() => setIsEventManagerOpen(true)}
                    onQuickAutoGenerate={() => {
                      const ev = generateRandomEvent();
                      setEvents((prev) => [ev, ...prev]);
                      setActiveEvent(ev);
                    }}
                  />
                </div>

                {/* Main Text Input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      activeEvent
                        ? `[Active Event: ${activeEvent.name}] Add message or press send...`
                        : selectedPersonality
                        ? `Message ${selectedPersonality.name}...`
                        : "Query the infinite memory..."
                    }
                    style={{ '--tw-ring-color': themeSettings?.accentColor || '#f59e0b' } as React.CSSProperties}
                    className="w-full bg-[#161618] border border-[#2A2A2E] rounded-full py-3.5 pl-6 pr-14 text-sm focus:outline-none focus:ring-1 focus:border-transparent transition-colors shadow-2xl shadow-black/50 text-gray-200 placeholder-gray-600 focus:ring-[color:var(--tw-ring-color)]"
                    disabled={isLoading}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex gap-3">
                    <button
                      type="submit"
                      disabled={(!input.trim() && !activeEvent) || isLoading}
                      style={{ backgroundColor: (!input.trim() && !activeEvent) || isLoading ? undefined : (themeSettings?.accentColor || '#d97706') }}
                      className="disabled:bg-[#2A2A2E] disabled:text-gray-500 text-white p-2 rounded-full shadow-lg transition-colors flex items-center justify-center w-9 h-9"
                      title={activeEvent ? `Send with event: ${activeEvent.name}` : "Send message"}
                    >
                      <Send size={16} className={(input.trim() || activeEvent) && !isLoading ? "translate-x-0.5" : ""} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </footer>
          </div>
        </div>
      </div>
      )}

      {/* Local LLM & Jan Server Engine Settings Modal */}
      <LocalServerSettingsModal
        isOpen={isBrowsingLocalModels}
        onClose={() => setIsBrowsingLocalModels(false)}
        selectedModel={selectedModel}
        onSelectModel={(modelId) => setSelectedModel(modelId)}
      />
      <GlobalGenerationSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
      />

      <ScenarioManagerModal
        isOpen={isScenarioManagerOpen}
        onClose={() => setIsScenarioManagerOpen(false)}
        scenarios={scenarios}
        characters={personalities}
        onScenariosChange={async () => {
          await fetchScenarios();
          await fetchPersonalities();
        }}
        activeCharacterName={selectedPersonality?.name}
        activePersonalityName={selectedPersonality?.name}
        activeUserName={userPersona?.name || "User"}
      />

      <LoreBookManagerModal
        isOpen={isLoreBookManagerOpen}
        onClose={() => setIsLoreBookManagerOpen(false)}
        scenarios={scenarios}
        onLoreBooksChange={fetchLoreBooks}
      />

      {/* MemPalace Loci Memory System Modal */}
      <MemPalaceView
        personality={selectedPersonality}
        isOpen={isMemPalaceOpen}
        onClose={() => setIsMemPalaceOpen(false)}
        onOpenRelationshipMetrics={() => setIsRelationshipMetricsOpen(true)}
        onOpenSettings={() => {
          setIsMemPalaceOpen(false);
          setInitialSettingsSection("mempalace");
          setActiveTab("settings");
        }}
      />

      {/* Personality Full Relationship Metrics & Visual Memory Board Modal */}
      <RelationshipMetricsModal
        isOpen={isRelationshipMetricsOpen}
        onClose={() => setIsRelationshipMetricsOpen(false)}
        personality={selectedPersonality}
        userPersona={userPersona}
        onOpenMemPalace={() => setIsMemPalaceOpen(true)}
      />

      {/* Roleplay Character Profile Modal */}
      <PersonalityModal
        scenarios={scenarios}
        isOpen={isPersonalityModalOpen}
        onClose={() => setIsPersonalityModalOpen(false)}
        personality={editingPersonality}
        onSave={handleSavePersonality}
        onDelete={handleDeletePersonality}
      />

      {/* User Persona & Roleplay Identity Modal */}
      <UserPersonaModal
        isOpen={isEditingUserPersona}
        onClose={() => setIsEditingUserPersona(false)}
        userPersona={userPersona}
        onSave={async (persona) => {
          const res = await fetch("/api/user-persona", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(persona),
          });
          if (res.ok) {
            setUserPersona(persona);
          }
        }}
        onDelete={async (deletedId) => {
          if (userPersona?.id === deletedId) {
            const blankPersona = { id: "", name: "User", avatar: "", age: "", appearance: "", traits: "", background: "", gender: "Unspecified", orientation: "Unspecified" };
            const res = await fetch("/api/user-persona", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(blankPersona),
            });
            if (res.ok) {
              setUserPersona(blankPersona);
            }
          }
        }}
      />

      {/* Roleplay Events & System Injections Manager Modal */}
      <EventManagerModal
        isOpen={isEventManagerOpen}
        onClose={() => setIsEventManagerOpen(false)}
        events={events}
        onSaveEvent={handleSaveEvent}
        onDeleteEvent={handleDeleteEvent}
        onAutoGenerateEvent={handleAutoGenerateEvent}
        onSelectActiveEvent={(ev) => {
          setActiveEvent(ev);
          setIsEventManagerOpen(false);
        }}
        activeEventId={activeEvent?.id}
        onRestoreDefaults={handleRestoreDefaultEvents}
      />

      {/* Character Quests & Game Logic Engine Modal */}
      <QuestManagerModal
        isOpen={isQuestModalOpen}
        onClose={() => setIsQuestModalOpen(false)}
        personality={selectedPersonality}
        quests={quests}
        gameState={gameState}
        onGenerateQuests={handleGenerateQuests}
        onProposeQuest={handleProposeQuest}
        onAcceptQuest={handleAcceptQuest}
        onCompleteQuest={handleForceCompleteQuest}
        onDeleteQuest={handleDeleteQuest}
        onSaveQuest={handleSaveQuest}
        onDeleteItem={handleDeleteInventoryItem}
        onPurgeChatSpoils={handlePurgeChatSpoils}
        isGenerating={isGeneratingQuests}
      />

      {/* Purge Chat & Memories Confirmation Modal */}
      <PurgeConfirmationModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onConfirm={handleExecutePurge}
        character={selectedPersonality}
        isPurging={isPurging}
      />

      {/* Floating Purge Notification Toast */}
      {purgeToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#141419] border border-red-500/40 text-red-200 text-xs shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          <Trash2 size={14} className="text-red-400" />
          <span>{purgeToast}</span>
        </div>
      )}

      {/* Global Image Lightbox Modal for High-Resolution Portraits */}
      <ImageLightboxModal
        isOpen={!!activeLightboxImage}
        onClose={() => setActiveLightboxImage(null)}
        imageUrl={activeLightboxImage?.url || null}
        title={activeLightboxImage?.title}
        subtitle={activeLightboxImage?.subtitle}
      />
    </div>
  );
}

