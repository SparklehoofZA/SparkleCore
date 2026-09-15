import React, { useState, useMemo } from "react";
import {
  Info,
  Sparkles,
  Server,
  Database,
  Brain,
  BookOpen,
  Sliders,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  Search,
  Activity,
  HardDrive,
  UserCircle2,
  Lock,
  Timer,
  AlertTriangle,
  RotateCcw,
  Check,
  Copy,
  ExternalLink,
  Github,
  Download
} from "lucide-react";
import { SettingsSection } from "./SettingsView";

interface AboutSectionProps {
  onNavigateToSection?: (section: SettingsSection) => void;
  onBackToChat?: () => void;
  selectedModel?: string;
}

interface FeatureItem {
  id: string;
  name: string;
  category: "models" | "memory" | "roleplay" | "quests" | "lorebooks" | "events" | "samplers" | "diagnostics";
  summary: string;
  description: string;
  capabilities: string[];
  status: "active" | "operational" | "ready";
  tags: string[];
  targetSection?: SettingsSection;
}

const APP_FEATURES: FeatureItem[] = [
  // 1. Neural Models & Inference
  {
    id: "multi_provider_llm",
    name: "Multi-Provider Neural LLM Inference",
    category: "models",
    summary: "Seamless support for Google Gemini, local offline engines, and OpenRouter cloud aggregators.",
    description: "Connect to cutting-edge Gemini 3.8 Flash, 3.1 Flash-Lite, and 3.1 Pro preview models, or run 100% locally with Ollama, Jan, LM Studio, Kobold.cpp, and Text Generation WebUI.",
    capabilities: [
      "Gemini 3.8 Flash, 3.1 Flash-Lite, & 3.1 Pro server-side proxying",
      "Local server integrations: Ollama, Jan, LM Studio, Kobold.cpp, vLLM, Aphrodite",
      "OpenRouter aggregator support with custom headers and dynamic pricing limits",
      "OpenAI-compatible endpoints with custom URLs and bearer token authentication"
    ],
    status: "active",
    tags: ["Gemini", "Local LLM", "Ollama", "Jan", "OpenRouter"],
    targetSection: "model_servers"
  },
  {
    id: "streaming_telemetry",
    name: "Real-Time Streaming & Latency Telemetry",
    category: "models",
    summary: "Chunked token delivery with millisecond Time-To-First-Token (TTFT) and speed gauges.",
    description: "High-performance Server-Sent-Events (SSE) and stream buffering deliver character responses as they are synthesized, tracking generation latency, TTFT, and tokens/sec throughput.",
    capabilities: [
      "Native chunked streaming without browser thread locking",
      "Time-To-First-Token (TTFT) tracking for immediate responsiveness feedback",
      "Tokens-per-second real-time calculation and throughput measurement",
      "Auto-reconnect and stream abort signaling upon cancellation"
    ],
    status: "active",
    tags: ["Streaming", "TTFT", "Throughput", "SSE"],
    targetSection: "status"
  },
  {
    id: "auto_discovery_failover",
    name: "Model Auto-Discovery & Resilient Failover",
    category: "models",
    summary: "Automated engine health pinging with transparent fallback to default models.",
    description: "The engine constantly polls enabled model servers, checks endpoint responsiveness, and automatically fails over to the configured default model if a local server goes offline.",
    capabilities: [
      "Dynamic /v1/models endpoint querying for one-click model selection",
      "Visual status badges (Online, Slow, Offline) with live millisecond roundtrip ping",
      "Default model preservation across restarts via persistent configuration",
      "Seamless error recovery: automatically prompts or swaps to backup models upon failure"
    ],
    status: "active",
    tags: ["Failover", "Auto-Discovery", "Heartbeat", "Resilience"],
    targetSection: "model_servers"
  },
  {
    id: "thinking_reasoning",
    name: "Thinking Mode & Chain-of-Thought Budgets",
    category: "models",
    summary: "Control explicit reasoning budgets for Gemini thinking models.",
    description: "Configure thinking budgets to allow the model to deliberate on complex narrative twists, character secrets, and logical dialogue constraints before outputting in-character prose.",
    capabilities: [
      "Configurable thinking token budgets (0 to 64k tokens)",
      "Transparent thinking block inspection and isolation",
      "Ideal for complex mystery roleplay and intricate puzzle-solving"
    ],
    status: "ready",
    tags: ["Thinking Mode", "Reasoning", "Gemini 3.8", "Deep CoT"],
    targetSection: "samplers"
  },
  {
    id: "decoupled_neural_pipeline",
    name: "Decoupled Neural Dispatcher & Sub-Models",
    category: "models",
    summary: "Assign standalone specialized models to the Quest Engine and Character State & Mood evaluation.",
    description: "Offload secondary computational workloads from the primary roleplay model. Configure independent models (e.g. Gemini 3.1 Flash-Lite or local Ollama instances) solely dedicated to analyzing quest progression and emotional transitions without increasing chat dialogue latency.",
    capabilities: [
      "Dedicated Quest Engine Model selector nested under Active Interface Model",
      "Dedicated Character State & Mood Engine Model selector for emotional inference",
      "Persistent neural models configuration saved to server endpoint (/api/neural-models-config)",
      "Zero prompt bloat or reasoning latency degradation on the primary creative roleplay stream",
      "Independent failover: secondary models fall back to active chat model if unconfigured or offline"
    ],
    status: "active",
    tags: ["Neural Dispatcher", "Decoupled Pipeline", "Quest Model", "Character State Model", "Multi-Model"],
    targetSection: "model_servers"
  },

  // 2. Memory & MemPalace
  {
    id: "mempalace_loci",
    name: "MemPalace: Method of Loci Spatial Memory",
    category: "memory",
    summary: "Cognitive episodic memory graph organizing character memories into architectural rooms.",
    description: "Inspired by the classical Method of Loci, MemPalace organizes conversations, facts, emotional memories, and shared secrets into distinct conceptual rooms for instant associative retrieval. The consolidation engine seamlessly scans and harvests loci across your entire conversation history.",
    capabilities: [
      "Interactive 2D Memory Palace room visualizer with categorized memory nodes",
      "Categorized loci rooms: Hall of Bonds, Vault of Secrets, Archive of Lore, Chamber of Quirks",
      "Semantic importance weighting (1 to 10) to prioritize high-stakes memories",
      "Direct memory editor: add, update, search, or purge specific memory nodes",
      "Unlimited Memory Harvesting: Manual consolidation bypasses depth limits to scan entire chat histories"
    ],
    status: "active",
    tags: ["MemPalace", "Method of Loci", "Cognitive Memory", "Episodic Recall", "History Harvest"],
    targetSection: "mempalace"
  },
  {
    id: "episodic_extraction",
    name: "Automated Episodic Fact & Bond Extraction",
    category: "memory",
    summary: "Synthesizes key dialogue milestones into long-term memory nodes automatically.",
    description: "After conversational turns, the system extracts critical facts, user preferences, relationship milestones, and promises, persisting them to the character's memory matrix without manual logging.",
    capabilities: [
      "Background semantic extraction of user identity, lore revelations, and character commitments",
      "Automatic association with existing memory nodes to update evolving relationships",
      "Token-efficient memory pruning to stay within context bounds without memory amnesia"
    ],
    status: "operational",
    tags: ["Fact Extraction", "Autonomous Recall", "Context Ingestion"]
  },

  // 3. Roleplay & Personas
  {
    id: "virtualized_chat_pagination",
    name: "Virtualized Chat Pagination & History",
    category: "roleplay",
    summary: "High-performance dynamic message rendering with seamless chronological lazy loading.",
    description: "Keeps the application running at peak frame rates regardless of conversation length by rendering only the most recent 20 messages. Older context is seamlessly paginated with a zero-layout-shift scroll anchoring system, ensuring massive chat sessions remain completely fluid without degrading browser memory.",
    capabilities: [
      "Limits DOM rendering to the 20 most recent conversational turns by default",
      "One-click 'Load older messages' lazy-loading injection with exact remaining counts",
      "Zero layout shift scroll-anchoring preserves exact reading position during historical data fetches",
      "Auto-resets pagination boundaries intelligently when swapping active characters",
      "Maintains full, un-truncated context access for background operations (PDF Export, MemPalace extraction)"
    ],
    status: "active",
    tags: ["Performance", "Virtualization", "Pagination", "Lazy Loading", "UI Optimization"],
  },
  {
    id: "pdf_docx_chat_import",
    name: "Intelligent PDF & DOCX Chat Import Engine",
    category: "roleplay",
    summary: "Direct browser-based extraction of rich-text chat logs (PDF, DOCX) with implicit speaker and dynamic action parsing.",
    description: "Drag and drop complex PDF or Word documents directly into the app. The extraction engine traverses the raw document layout and node structure to detect implicit speaker names (headers without colons) and dynamically maps document formatting (colored text, italicized nodes) into correctly wrapped roleplay actions (*like this*).",
    capabilities: [
      "Native browser-based document parsing via pdf.js and Mammoth for rich text",
      "Dynamic color thresholding: Converts non-black typography directly into physical action wrappers",
      "Typography analysis: Automatically maps document italics into standard roleplay asterisks",
      "Implicit speaker detection recognizes capitalized character names isolated on standalone header lines",
      "Direct integration with the existing mapping interface to assign imported speakers to the active character"
    ],
    status: "active",
    tags: ["PDF Import", "DOCX Import", "Rich Text Extraction", "Style Mapping", "Data Ingestion"],
    targetSection: "data"
  },
  {
    id: "roleplay_identity_and_formatting",
    name: "Roleplay Identity Binding & Strict Dialogue/Action Formatting Engine",
    category: "roleplay",
    summary: "Strict binding of 'character' to active chat character and 'user' to active user persona, with universal dialogue (\" \") and thought/action (* *) enforcement.",
    description: "Eliminates roleplay identity confusion across all prompts, scenarios, lorebooks, and system instructions. Guarantees that 'character', 'personality', {{char}}, and {{character}} strictly map to the active chat character, while 'user' and {{user}} strictly map to the active user persona. Enforces universal formatting rules requiring all spoken words out loud to be wrapped in double quotes \" \", and all thoughts, physical actions, gestures, and narration to be wrapped in asterisks * * across streaming responses, retry routines, and scenario generation.",
    capabilities: [
      "Strict context definitions: 'character' and {{char}} always bind to the active chat character; 'user' and {{user}} always bind to the active user persona",
      "Spoken dialogue standard: All spoken words out loud must be enclosed in double quotation marks \" \"",
      "Thoughts & actions standard: All physical gestures, expressions, scene descriptions, and internal thoughts must be enclosed in asterisks * *",
      "Synchronized dual-environment macro resolution: Resolves possessives ('character's, 'user's) and bracketed macros across client and server",
      "Hardened inference retries: System retry prompts reinforce quotation marks for dialogue and asterisks for actions to prevent formatting drift",
      "Typographic UI rendering: Spoken dialogue is emphasized with clean typographic clarity while actions preserve italic asterisks"
    ],
    status: "active",
    tags: ["Identity Binding", "Dialogue Quotes", "Asterisks Actions", "Macro Resolution", "Formatting Standards", "Roleplay"],
    targetSection: "persona"
  },
  {
    id: "complete_character_bundle",
    name: "Complete Character Bundle Export & Dependency-Rebuilding Import",
    category: "roleplay",
    summary: "Export 100% of character-linked data in a unified bundle; import auto-creates missing scenarios, lorebooks, and memories.",
    description: "Every dimension of a character is preserved: psychological traits, full chat history, attached scenarios, linked lorebooks and all entries, MemPalace memory rooms, active quests, and inventory state. Upon import, any missing scenario or lorebook is automatically recreated with original specifications and relinked seamlessly.",
    capabilities: [
      "Full ecosystem export: Personality profile, complete chat transcript, linked scenario, all attached lorebooks and keyword entries, MemPalace nodes, quests, and inventory",
      "Intelligent dependency recreation: Automatically detects missing scenarios or lorebooks and recreates them with exact original parameters upon import",
      "Lossless relationship preservation: Preserves unique IDs, scenario bindings, lorebook triggers, and memory weights without data corruption",
      "Cross-device & cross-session portability: Move entire character worlds between installations with zero setup"
    ],
    status: "active",
    tags: ["Bundle Export", "Dependency Import", "Auto-Creation", "Full Ecosystem", "Portability"],
    targetSection: "data"
  },
  {
    id: "pdf_chat_export",
    name: "Interactive PDF Chat Transcript Export",
    category: "roleplay",
    summary: "Export rich, beautifully styled conversational transcripts into easy-to-read PDF documents with complete end-of-session vitals and relationship intelligence.",
    description: "Export active character conversations into beautifully formatted, printable PDF documents with one click. Transcripts include character headers, roleplay timestamps, distinct stylized dialogue cards for user and character, clean printable typography, and a comprehensive end-of-transcript dossier containing real-time character vitals, mood & composure, scene setting, active status effects, key memory board, and detailed metrics breakdown.",
    capabilities: [
      "One-click PDF export buttons integrated directly in the active character panel and top chat toolbar",
      "Formatted readability layout with character header, dialogue bubbles, and action narration",
      "End-of-transcript status dossier: Vitals (Health, Stamina, Trust), Mood & Composure rating, and Scene & Setting (Location, Activity, Outfit)",
      "Active status effect badges, MemPalace Key Memory Board with verbatim quotes, and full Relationship Metrics breakdown",
      "Automatic multi-page splitting, metadata stamps, running headers, and dynamic page footers"
    ],
    status: "active",
    tags: ["PDF Export", "Chat Transcripts", "Vitals & Composure", "Memory Board", "Metrics Breakdown", "Roleplay Logs"],
    targetSection: "data"
  },
  {
    id: "three_stage_chat_engine",
    name: "Three-Stage Isolated Inference Pipeline",
    category: "roleplay",
    summary: "Modular three-stage dialogue lifecycle with pre-inference context, pure streaming, and post-inference quest resolution.",
    description: "Separates conversation turns into three isolated execution stages: Stage 1 (Pre-Inference Context & Verbal Quest Acceptance), Stage 2 (Core Dialogue Stream with unhindered persona voice), and Stage 3 (Post-Inference State Updates, Conversational Quest Completion Detection, and Narrative Injection Queue).",
    capabilities: [
      "Stage 1: Ingests dynamic vitals, active status effects, and automatically detects verbal quest acceptance/refusal",
      "Stage 2: Generates pure, in-character conversational dialogue without multi-turn state race conditions",
      "Stage 3: Evaluates quest objective fulfillment and schedules narrative celebration injections for the subsequent turn",
      "Automated narrative injection queue (pendingNarrativeInjections) ensuring character acknowledges triumphs naturally",
      "On-demand conversational quest evaluation via /api/quests/evaluate-chat"
    ],
    status: "active",
    tags: ["Three-Stage Pipeline", "State Sync", "Pre-Inference", "Post-Inference", "Narrative Queue"],
    targetSection: "questing_system"
  },
  {
    id: "custom_chat_themes",
    name: "Custom Chat Theme & Visual UI Personalization",
    category: "roleplay",
    summary: "Interactive chat theme simulator with granular bubble colors, border geometry, density, and atmospheric presets.",
    description: "Personalize the chat interface with custom bubble colors for user and assistant messages, adjustable border radiuses (Sharp 6px, Rounded 12px, Soft Pill 20px), message density padding, and curated themes (Cyberpunk Neon, Fantasy Parchment, Midnight AMOLED, Warm Amber Studio, Minimalist Slate).",
    capabilities: [
      "Dedicated Theme & UI settings tab with real-time live preview canvas simulator",
      "Granular user/assistant bubble background, text, and system announcement color pickers",
      "Adjustable bubble geometry radiuses and padding density scales",
      "Curated 1-click theme presets and instant reset to defaults",
      "Persistent styling configuration across sessions"
    ],
    status: "active",
    tags: ["Themes", "Custom UI", "Message Bubbles", "Presets", "Visual Styling"],
    targetSection: "theme"
  },
  {
    id: "rich_character_profiles",
    name: "High-Fidelity Character Personality Engine",
    category: "roleplay",
    summary: "Deep persona profiles with avatars, backstories, speech patterns, and custom instructions.",
    description: "Create and customize characters with distinct psychological archetypes, speech quirks, core desires, boundaries, starting scenarios, and dedicated system directives.",
    capabilities: [
      "Full character card customization (Avatar, Tagline, Background, Speaking Style)",
      "Opening starter dialogue presets with contextual user starter prompts",
      "Import & Export via industry-standard JSON character cards and full ecosystem bundles",
      "Universal template variables: {{char}}, {{user}}, {{scenario}}, and {{location}}"
    ],
    status: "active",
    tags: ["Personas", "Character Cards", "Roleplay", "JSON Import/Export"]
  },
  {
    id: "user_persona_system",
    name: "User Persona & Identity Matrix",
    category: "roleplay",
    summary: "Universal user identity injected across all characters and scenarios.",
    description: "Define your own roleplay identity, including your preferred display name, avatar, personality traits, background history, gender, and orientation, which are seamlessly respected by all AI companions.",
    capabilities: [
      "Dedicated User Persona modal with real-time profile persistence",
      "Explicit Gender and Orientation identity selections for accurate dynamic representation",
      "Automatic pronoun and identity injection into LLM system prompts",
      "Seamless persona switching for playing different characters in different worlds"
    ],
    status: "active",
    tags: ["User Identity", "Pronouns", "Avatars", "Gender", "Orientation", "Player Persona"]
  },
  {
    id: "vitals_and_moods",
    name: "Dynamic Vitals, Affection & 100+ Mood Palette",
    category: "roleplay",
    summary: "Living character vitals with real-time sentiment transitions, composure tuning, and 100+ emotional presets.",
    description: "Characters dynamically react to your words: their mood shifts across an expanded palette of 100+ nuanced emotional states (Excited, Playful, Affectionate, Flustered, Curious, Intrigued, Stoic, Vigilant, Scared, Melancholy, Furious, In Pain, Embarrassed, Proud, Relieved, Devoted, Guilty, Anticipatory, etc.) categorized across 19 emotional psychological classifications with dedicated composure volatility tuning.",
    capabilities: [
      "Interactive Character HUD displaying live Health, Stress, Trust, Affection, and Stamina",
      "Expanded 100+ mood palette across 19 categories with live badges, category filters, and quick search",
      "AI dynamic state inference automatically selecting fitting emotional nuances after every chat round",
      "Composure Volatility and Baseline Drift tuning in Status Settings",
      "Sentiment-driven emotional state transitions reflecting narrative tension",
      "Relationship Metrics Modal visualizing bonding levels and mutual milestone history"
    ],
    status: "active",
    tags: ["Vitals", "Affection", "Mood Tracking", "Character HUD", "100+ Mood Palette"],
    targetSection: "status"
  },

  // 4. Narrative Quests & Game Progression
  {
    id: "rpg_quest_system",
    name: "Narrative RPG Quests & Automated Chat Sync",
    category: "quests",
    summary: "Turn chats into engaging stories with dynamic character quests, verbal acceptance, and automated dialogue objective checks.",
    description: "Characters formulate in-world desires, dilemmas, and multi-step quests. As you roleplay, objectives are detected and resolved through natural dialogue, granting narrative payoffs, items, and inventory spoils.",
    capabilities: [
      "Dynamic quest generation aligned with character personality, mood, and scenario context",
      "Multi-step objective progress bars with status tracking (Proposed, Active, Satisfied, Completed)",
      "Automated verbal quest acceptance: accepting a quest in chat immediately activates it and queues narrative acknowledgment",
      "Automated conversational quest completion: post-inference detection checks chat history against active quest objectives",
      "Autonomous in-character quest proposing: characters introduce quests naturally into dialogue",
      "Hidden quest steering prompts that subtly guide characters toward narrative resolution"
    ],
    status: "active",
    tags: ["Quests", "RPG Engine", "Progression", "Objectives", "Chat Sync", "Three-Stage"],
    targetSection: "questing_system"
  },
  {
    id: "inventory_game_state",
    name: "Persistent Inventory & Player Game State",
    category: "quests",
    summary: "Collect items, artifacts, and keepsakes earned through roleplay accomplishments.",
    description: "Completed quests award tangible narrative items and badges that are permanently logged in the player's game state, complete with descriptions, acquisition timestamps, and character provenance.",
    capabilities: [
      "Player inventory log with item descriptions, rarity, and associated character lore",
      "Quest spoils management with one-click purge and re-organization options",
      "Inventory persistence across chat sessions and character switching"
    ],
    status: "active",
    tags: ["Inventory", "Loot", "Game State", "Spoils"]
  },

  // 5. World Info & LoreBooks
  {
    id: "lorebook_engine",
    name: "World Info & Keyword LoreBook Engine",
    category: "lorebooks",
    summary: "Dynamic worldbuilding encyclopedia with keyword triggers, AI entry generation, and granular entry management.",
    description: "Construct extensive world lore, historical events, factions, magic systems, and regional lore that automatically insert into the model's context window whenever relevant keywords are mentioned in conversation.",
    capabilities: [
      "Multi-entry LoreBooks with primary/secondary activation keys and scenario binding",
      "AI-Powered Lore Entry Generator: Instantly synthesize rich lore entries from optional thematic guidelines",
      "Granular entry lifecycle: Edit, reorder, or delete individual lore entries with immediate UI synchronization",
      "In-modal safe deletion: Confirmation dialog with automatic cascade unlinking to prevent dangling personality references",
      "Recursive entry scanning: entries can trigger related lore entries for deep narrative immersion"
    ],
    status: "active",
    tags: ["LoreBook", "World Info", "AI Lore Generator", "Keyword Trigger", "Entry Management"]
  },
  {
    id: "scenarios_world_settings",
    name: "Interactive Scenarios & World Presets",
    category: "lorebooks",
    summary: "Pre-crafted environmental scenes, atmospheric parameters, AI scenario generation, and lifecycle management.",
    description: "Launch adventures instantly in custom settings (Cyberpunk Noir, High Fantasy Tavern, Abandoned Orbital Colony) with customized scenario context, atmospheric conditions, and curated opening scenes.",
    capabilities: [
      "Scenario Manager with scene backgrounds, location/time rules, and starting first messages",
      "AI-Powered Scenario Generator: Create complete atmospheric scenes from brief prompts with one click",
      "In-modal deletion safety: Two-step confirmation with automatic cascade unlinking from characters and lorebooks",
      "Macro token resolution: Automatic preview and replacement of {{char}}, {{user}}, 'personality', and 'user' variables"
    ],
    status: "active",
    tags: ["Scenarios", "AI Generator", "Macro Resolution", "Lifecycle Safety", "World Context"]
  },

  // 6. Dynamic Events & System Injections
  {
    id: "roleplay_events",
    name: "Dynamic Roleplay Events & Injections",
    category: "events",
    summary: "Inject spontaneous atmospheric dilemmas, NPC arrivals, and twists into the next turn.",
    description: "Spice up conversations with one-click narrative curveballs: sudden storms, courier deliveries, mysterious comms transmissions, or moral choices injected directly into the LLM prompt.",
    capabilities: [
      "One-click Event Selector popover right beside the chat input",
      "Event Manager with built-in library (Atmospheric, Complication, Social, Mystery, Supernatural)",
      "Auto-generate random roleplay events tailored to current mood and location",
      "Custom event creator to save reusable narrative triggers"
    ],
    status: "active",
    tags: ["Events", "Plot Twists", "Injections", "Spontaneous Prompts"]
  },
  {
    id: "reply_variations",
    name: "Multi-Variation Generation & Swiping",
    category: "events",
    summary: "Generate multiple responses, swipe between variations, or trigger creative alternative takes.",
    description: "Never settle for an average reply: re-roll any model message with standard or high-creativity samplers, navigate effortlessly between generated variations (< 1/3 >), or wheel-scroll to select.",
    capabilities: [
      "Regenerate variation button with real-time synthesis loader",
      "High-creativity alternative variation synthesizer (boosted temperature & top-p)",
      "Smooth variation carousel with left/right keyboard arrows and mouse-wheel switching",
      "Active variation state preservation in conversation transcript"
    ],
    status: "active",
    tags: ["Variations", "Swiping", "Re-roll", "Creative Forking"]
  },

  // 7. Generation Samplers
  {
    id: "advanced_samplers",
    name: "Comprehensive Inference Sampler Controls",
    category: "samplers",
    summary: "Fine-tune Temperature, Top-P, Top-K, Min-P, Repetition Penalty, and Context Clamping.",
    description: "Dial in the exact nuance of AI creativity and coherence with studio-grade sampling controls, preset profiles, and configurable token limits.",
    capabilities: [
      "Temperature (0.0 to 2.0) for balancing factual precision and creative flourish",
      "Top-P, Top-K, and Min-P nucleus filtering to prune low-probability hallucinations",
      "Repetition, Frequency, and Presence penalties to prevent repetitive loops",
      "Context Window slider (2k to 128k tokens) and Max Output Tokens limiter",
      "Configurable custom stop sequences and system prompt override"
    ],
    status: "active",
    tags: ["Temperature", "Top-P", "Min-P", "Repetition Penalty", "Context Window"],
    targetSection: "samplers"
  },

  // 8. Diagnostics, Health & Storage
  {
    id: "system_status_suite",
    name: "Full-Stack System Status & Health Diagnostics",
    category: "diagnostics",
    summary: "Real-time engine health checks, live latency benchmarks, and active-only interface validation.",
    description: "A centralized control room monitoring API keys, local LLM backends, filesystem storage reachability, memory allocations, and network latency with one-click testing suites.",
    capabilities: [
      "Active-only interface monitoring (disregards disabled servers to prevent false alarms)",
      "Real-time latency benchmarking for Gemini API and active local server ports",
      "Storage location inspector: exact absolute filesystem path, file count, and folder sizing",
      "One-click batch health testing with actionable troubleshooting recommendations"
    ],
    status: "active",
    tags: ["Health Diagnostics", "Active Monitoring", "Storage Inspector", "Benchmarks"],
    targetSection: "status"
  },
  {
    id: "concurrency_schema_resilience",
    name: "Concurrency Locks & Schema Resilience Suite",
    category: "diagnostics",
    summary: "Automated test suite validating atomic file locks, JSON schemas, and session restoration.",
    description: "Built for zero-data-loss peace of mind: test parallel read/write concurrency, validate all entity schemas, and verify 100% preservation of character vitals and dialogue during switches.",
    capabilities: [
      "Concurrency & Lock Testing: 10-way parallel operation benchmark with zero file corruptions",
      "JSON Schema Validation: audits character cards, scenarios, quests, and transcripts with parser fallback",
      "Session Restoration Testing: simulates character/scenario swaps to guarantee 100% state fidelity",
      "Generation Timeout Handling: verifies AbortSignal cancellation and socket release during slow responses"
    ],
    status: "active",
    tags: ["Concurrency", "Atomic Locks", "Schema Validation", "Session State"],
    targetSection: "status"
  },
  {
    id: "memory_disk_limits",
    name: "Process Memory & Disk Quota Limit Monitors",
    category: "diagnostics",
    summary: "Live V8 heap memory meters and configurable storage warning thresholds.",
    description: "Monitors V8 process heap memory (Used, RSS, Heap Limit) alongside data directory size against warning thresholds, ensuring optimal container performance and zero crashes.",
    capabilities: [
      "Live V8 heap memory usage gauge with Optimal/Warning visual statuses",
      "Disk storage quota tracking with 500MB configurable warning limits",
      "Subdirectory partition analytics (Characters, Scenarios, Transcripts, MemPalace)",
      "Comprehensive error logger with stack trace inspection and direct purge options"
    ],
    status: "active",
    tags: ["V8 Heap", "Memory Limits", "Disk Quota", "Error Logs"],
    targetSection: "status"
  },
  {
    id: "backup_data_privacy",
    name: "Zero-Telemetry Data Privacy & Backup Management",
    category: "diagnostics",
    summary: "100% local persistence with portable JSON backups and selective purge controls.",
    description: "Your conversations, characters, and memories belong exclusively to you. All state is saved locally with atomic filesystem writes—no external tracking, with one-click export and import.",
    capabilities: [
      "Full JSON bundle export for characters, chat histories, linked scenarios, lorebooks, memories, and quests",
      "Comprehensive import engine: automatically creates missing scenarios, lorebooks, and memory palaces",
      "Selective Chat & Memory purge: clear transcripts while preserving character cards and settings",
      "Completely private: server proxies API keys securely without client-side exposure"
    ],
    status: "active",
    tags: ["Privacy", "JSON Export", "Local Storage", "Purge Controls"],
    targetSection: "data"
  },
  {
    id: "censorship_diagnostic_engine",
    name: "Active Chat Model Censorship Testing",
    category: "diagnostics",
    summary: "Roleplay-specific censorship and safety policy detection.",
    description: "Send a targeted, highly descriptive test prompt designed to push into male/female power dynamics and taboo themes to verify if your connected LLM is uncensored or restricted by safety guidelines.",
    capabilities: [
      "Dedicated 'Test Active Chat Model Censorship' execution console",
      "Robust rejection detection engine parsing over 15+ common safety refusal phrases",
      "Roleplay-specific boundary testing (NSFW, intimate physical, non-consensual filters)",
      "Clear visual pass/fail indicators and raw response inspection"
    ],
    status: "active",
    tags: ["Censorship", "Diagnostics", "Safety Filters", "NSFW Testing"],
    targetSection: "status"
  }
];

const CATEGORIES = [
  { id: "all", label: "All Features", icon: Layers, count: APP_FEATURES.length },
  { id: "models", label: "Neural Models", icon: Server, count: APP_FEATURES.filter(f => f.category === "models").length },
  { id: "memory", label: "MemPalace & Memory", icon: Brain, count: APP_FEATURES.filter(f => f.category === "memory").length },
  { id: "roleplay", label: "Personas & Vitals", icon: UserCircle2, count: APP_FEATURES.filter(f => f.category === "roleplay").length },
  { id: "quests", label: "Quests & RPG", icon: Sparkles, count: APP_FEATURES.filter(f => f.category === "quests").length },
  { id: "lorebooks", label: "Lore & World Info", icon: BookOpen, count: APP_FEATURES.filter(f => f.category === "lorebooks").length },
  { id: "events", label: "Events & Injections", icon: Zap, count: APP_FEATURES.filter(f => f.category === "events").length },
  { id: "samplers", label: "Samplers & Tuning", icon: Sliders, count: APP_FEATURES.filter(f => f.category === "samplers").length },
  { id: "diagnostics", label: "Diagnostics & Health", icon: Activity, count: APP_FEATURES.filter(f => f.category === "diagnostics").length }
];

export function AboutSection({ onNavigateToSection, onBackToChat, selectedModel }: AboutSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);
  const [hasCopiedVersion, setHasCopiedVersion] = useState<boolean>(false);
  const [hasCopiedMarkdown, setHasCopiedMarkdown] = useState<boolean>(false);

  // Filter features based on category and search query
  const filteredFeatures = useMemo(() => {
    return APP_FEATURES.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q)) ||
        item.capabilities.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  const handleCopyAppVersion = () => {
    navigator.clipboard.writeText("Roleplay Chat & Character Quests v0.58");
    setHasCopiedVersion(true);
    setTimeout(() => setHasCopiedVersion(false), 2000);
  };

  const handleExportMarkdown = () => {
    const markdown = APP_FEATURES.map((feature) => {
      const capabilities = feature.capabilities.map((c) => `- ${c}`).join("\n");
      const categoryLabel = CATEGORIES.find(c => c.id === feature.category)?.label || feature.category;
      return `### ${feature.name}\n*Category: ${categoryLabel} | Status: ${feature.status.toUpperCase()}*\n\n${feature.summary}\n\n${feature.description}\n\n**Capabilities:**\n${capabilities}\n\n**Tags:** ${feature.tags.join(", ")}\n`;
    }).join("\n---\n\n");

    const header = `# Roleplay Chat & Character Quests\n\nSparkleCore is a local-first neural roleplay studio uniting state-of-the-art LLM inference with cognitive MemPalace (Method of Loci) long-term memory, narrative RPG quests, real-time character vitals, keyword LoreBooks, and full-fidelity local server integrations.\n\nThis project was created as a personal solution to a frustrating problem: online chatbots that constantly suffer from memory amnesia and charge expensive monthly fees. SparkleCore was built as a completely free, offline-first alternative designed to never forget you or your adventures.\n\n---\n\n`;

    navigator.clipboard.writeText(header + markdown);
    setHasCopiedMarkdown(true);
    setTimeout(() => setHasCopiedMarkdown(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150 pb-8 text-gray-200">
      {/* ============================================================ */}
      {/* 1. HERO BRAND & SYSTEM IDENTITY BANNER */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#16161E] via-[#121217] to-[#0A0A0D] border border-[#2B2B38] p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-5">
          {/* Header Row */}
          <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shadow-md">
                <Brain size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-100 flex items-center gap-2">
                  Roleplay Chat & Character Quests
                </h1>
                <div className="text-xs text-amber-400/90 font-mono flex items-center flex-wrap gap-2 mt-0.5">
                  <span>Version 0.58 • 29 Releases Tracked (v0.02 → v0.58)</span>
                  <button
                    type="button"
                    onClick={handleCopyAppVersion}
                    className="text-gray-400 hover:text-amber-300 transition-colors cursor-pointer p-0.5 rounded hover:bg-black/30"
                    title="Copy version info"
                  >
                    {hasCopiedVersion ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                  {onNavigateToSection && (
                    <button
                      type="button"
                      onClick={() => onNavigateToSection("changelog")}
                      className="ml-1 px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-[10px] font-mono transition-colors"
                    >
                      View Changelog →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center flex-wrap gap-3">
            {selectedModel && (
              <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-2">
                <Server size={13} className="text-amber-400" />
                <span className="text-gray-400">Active Engine:</span>
                <strong className="text-amber-300">{selectedModel}</strong>
              </div>
            )}
            <a
              href="https://github.com/SparklehoofZA/SparkleCore"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Github size={13} />
              <span>GitHub</span>
            </a>
            <button
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export About & Features as Markdown"
            >
              {hasCopiedMarkdown ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span>Exported!</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Export Markdown</span>
                </>
              )}
            </button>
            {onBackToChat && (
              <button
                type="button"
                onClick={onBackToChat}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Enter Chat</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="space-y-3 max-w-3xl">
            <p className="text-sm text-gray-300 leading-relaxed">
              <strong>SparkleCore</strong> is a local-first neural roleplay studio uniting state-of-the-art LLM inference with cognitive 
              <strong> MemPalace (Method of Loci)</strong> long-term memory, narrative RPG quests, real-time character 
              vitals, keyword LoreBooks, and full-fidelity local server integrations.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              This project was created as a personal solution to a frustrating problem: online chatbots that constantly suffer from memory amnesia and charge expensive monthly fees. SparkleCore was built as a completely free, offline-first alternative designed to never forget you or your adventures.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#0E0E12] border border-[#242430] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-semibold">Core Modules</span>
              <p className="text-base font-bold text-gray-100 flex items-center gap-1.5">
                <Layers size={14} className="text-amber-400" />
                <span>8 Major Engines</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0E0E12] border border-[#242430] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-semibold">Total Functions</span>
              <p className="text-base font-bold text-sky-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-sky-400" />
                <span>{APP_FEATURES.length} Verified Features</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0E0E12] border border-[#242430] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-semibold">Inference Coverage</span>
              <p className="text-base font-bold text-purple-400 flex items-center gap-1.5">
                <Server size={14} className="text-purple-400" />
                <span>Gemini + Local + OpenRouter</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0E0E12] border border-[#242430] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-semibold">Persistence</span>
              <p className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <HardDrive size={14} className="text-emerald-400" />
                <span>Atomic File Locks</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SEARCH & CATEGORY FILTER TABS */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Sparkles size={15} className="text-amber-400" />
              <span>Full Features & Functionality Directory</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Explore the complete architecture, modules, and capabilities of your roleplay environment.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features, tools, tags..."
              className="w-full bg-[#121216] border border-[#262632] focus:border-amber-500/50 rounded-xl py-2 pl-9 pr-8 text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "bg-[#14141A] text-gray-400 hover:text-gray-200 hover:bg-[#1C1C24] border border-[#242430]"
                }`}
              >
                <Icon size={13} className={isSelected ? "text-amber-400" : "text-gray-500"} />
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-amber-500/30 text-amber-200" : "bg-[#1C1C26] text-gray-500"
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. FEATURE CARDS GRID */}
      {/* ============================================================ */}
      <div className="space-y-3">
        {filteredFeatures.length === 0 ? (
          <div className="p-8 text-center bg-[#121216] border border-[#22222A] rounded-xl space-y-2">
            <Info size={20} className="text-gray-500 mx-auto" />
            <p className="text-sm font-semibold text-gray-300">No matching features found</p>
            <p className="text-xs text-gray-500">
              Try searching with another keyword or selecting a different category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs border border-amber-500/30 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredFeatures.map((feat) => {
            const isExpanded = expandedFeatureId === feat.id;
            return (
              <div
                key={feat.id}
                className={`bg-[#121216] border transition-all rounded-xl p-4 sm:p-5 space-y-3 ${
                  isExpanded ? "border-amber-500/40 shadow-lg bg-[#14141A]" : "border-[#242430] hover:border-[#323242]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-100">{feat.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="capitalize">{feat.status}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-[#1A1A22] border border-[#2A2A36]">
                        {feat.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{feat.summary}</p>
                  </div>

                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedFeatureId(isExpanded ? null : feat.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                        isExpanded
                          ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-sm"
                          : "bg-[#181822] hover:bg-[#22222E] text-gray-300 hover:text-gray-100 border-[#2B2B38]"
                      }`}
                      title={isExpanded ? "Collapse feature details" : "Expand feature details"}
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                    </button>
                  </div>
                </div>

                {/* Expanded Capabilities and Details */}
                {isExpanded && (
                  <div className="pt-3 border-t border-[#22222E] space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs text-gray-400 leading-relaxed">{feat.description}</p>

                    <div className="space-y-1.5 bg-[#0D0D12] p-3 rounded-lg border border-[#22222C]">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-semibold block">
                        Functional Highlights & Capabilities
                      </span>
                      <ul className="space-y-1 text-xs text-gray-300">
                        {feat.capabilities.map((cap, cIdx) => (
                          <li key={cIdx} className="flex items-start gap-2">
                            <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tag Pills */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {feat.tags.map((tag, tIdx) => (
                          <span key={tIdx} className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-[#16161E] border border-[#262636]">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {feat.targetSection && onNavigateToSection && (
                        <button
                          type="button"
                          onClick={() => onNavigateToSection(feat.targetSection!)}
                          className="px-2.5 py-1 rounded-md bg-[#161620] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#282836] text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                        >
                          <span>Open in Settings</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. ARCHITECTURE & TECHNICAL FOUNDATIONS */}
      {/* ============================================================ */}
      <div className="bg-[#121216] border border-[#262632] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#22222E]">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/35 flex items-center justify-center text-purple-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-100">Architecture & Technical Stack</h2>
            <p className="text-xs text-gray-400">
              Modern full-stack TypeScript infrastructure built for zero latency, data privacy, and extensibility.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-[#0E0E12] border border-[#242430] space-y-1">
            <span className="text-[10px] uppercase font-mono text-gray-500 font-semibold">Frontend Tier</span>
            <p className="text-xs font-medium text-gray-200">React 18 + TypeScript + Tailwind CSS</p>
            <p className="text-[11px] text-gray-400">Vite SPA bundling, Lucide icons, and responsive desktop/mobile HUD layout.</p>
          </div>

          <div className="p-3 rounded-lg bg-[#0E0E12] border border-[#242430] space-y-1">
            <span className="text-[10px] uppercase font-mono text-gray-500 font-semibold">Backend Engine</span>
            <p className="text-xs font-medium text-gray-200">Express 5 + Google GenAI SDK</p>
            <p className="text-[11px] text-gray-400">Server-side key security, chunked SSE streaming, and AbortSignal cancellation.</p>
          </div>

          <div className="p-3 rounded-lg bg-[#0E0E12] border border-[#242430] space-y-1">
            <span className="text-[10px] uppercase font-mono text-gray-500 font-semibold">Persistence Layer</span>
            <p className="text-xs font-medium text-gray-200">Atomic Local JSON Storage</p>
            <p className="text-[11px] text-gray-400">Concurrent file-locking, memory palace nodes, and automatic corrupted schema recovery.</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. QUICK NAVIGATION SHORTCUTS FOOTER */}
      {/* ============================================================ */}
      {onNavigateToSection && (
        <div className="p-4 rounded-xl bg-[#0E0E12] border border-[#242430] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            <span>Quick Configuration: </span>
            <span className="text-gray-300">Jump directly into any settings module to calibrate parameters.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateToSection("status")}
              className="px-2.5 py-1 rounded bg-[#181820] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#282834] text-xs transition-colors cursor-pointer"
            >
              Diagnostics
            </button>
            <button
              type="button"
              onClick={() => onNavigateToSection("model_servers")}
              className="px-2.5 py-1 rounded bg-[#181820] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#282834] text-xs transition-colors cursor-pointer"
            >
              Model Servers
            </button>
            <button
              type="button"
              onClick={() => onNavigateToSection("samplers")}
              className="px-2.5 py-1 rounded bg-[#181820] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#282834] text-xs transition-colors cursor-pointer"
            >
              Samplers
            </button>
            <button
              type="button"
              onClick={() => onNavigateToSection("data")}
              className="px-2.5 py-1 rounded bg-[#181820] hover:bg-amber-500/15 text-gray-300 hover:text-amber-300 border border-[#282834] text-xs transition-colors cursor-pointer"
            >
              Data & Backup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
