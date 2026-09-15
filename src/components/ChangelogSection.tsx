import React, { useState, useMemo } from "react";
import {
  History,
  Sparkles,
  GitCommit,
  Tag,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  FileText,
  Sliders,
  Palette,
  Database,
  Activity,
  Brain,
  Zap,
  Server,
  UserCircle2
} from "lucide-react";
import { SettingsSection } from "./SettingsView";

export interface ChangelogEntry {
  version: string;
  delta: string;
  date: string;
  title: string;
  category: "roleplay" | "transcripts" | "theming" | "memory" | "quests" | "lorebooks" | "scenarios" | "events" | "inference" | "models" | "diagnostics" | "foundation";
  categoryLabel: string;
  summary: string;
  highlights: string[];
  changes: {
    type: "feature" | "enhancement" | "fix" | "system";
    text: string;
  }[];
  tags: string[];
  targetSection?: SettingsSection;
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "v0.58",
    delta: "+0.02",
    date: "September 2026",
    title: "Full System Verification & GitHub Readiness",
    category: "diagnostics",
    categoryLabel: "Diagnostics & Health",
    summary: "Performed a full-stack system verification to ensure all core functionalities, inference engines, memory schemas, and UI components are stable and free of hardcoded API keys ahead of the open-source GitHub release.",
    highlights: ["Full System Health Check", "API Key Sanitization", "TypeScript Compilation Verification", "Production Build Readiness"],
    changes: [
      { type: "system", text: "Successfully completed full system syntax and type-checking (TypeScript) to verify zero codebase errors." },
      { type: "system", text: "Compiled and verified the production build for Express and Vite with clean esbuild artifacts." },
      { type: "fix", text: "Sanitized the codebase to ensure no hardcoded proprietary API keys remain, strictly enforcing environment variables and custom user key inputs." },
      { type: "enhancement", text: "Updated version manifests and About & Changelog documentation reflecting a fully stable, verified release branch." }
    ],
    tags: ["GitHub", "System Test", "Sanitization", "Build", "Release"],
    targetSection: "status"
  },
  {
    version: "v0.56",
    delta: "+0.02",
    date: "September 2026",
    title: "Chat Pagination, PDF/DOCX Import & Unlimited Memory Harvesting",
    category: "roleplay",
    categoryLabel: "Chat Engine & Interface",
    summary: "Significantly boosted UI performance by introducing virtualized chat pagination, allowing seamless navigation of endless chat histories. Added intelligent PDF and DOCX parsing for character imports, and upgraded MemPalace to harvest memories across entire conversation histories.",
    highlights: ["Virtualized Chat Pagination", "Load Older Messages", "Intelligent PDF & DOCX Parsing", "Implicit Speaker Detection", "Unlimited Memory Harvesting"],
    changes: [
      { type: "enhancement", text: "Implemented high-performance message virtualization, rendering only the 20 most recent messages by default to drastically improve frame rates and memory usage." },
      { type: "feature", text: "Added 'Load older messages' pagination button with scroll anchoring to seamlessly inject older chat history without losing reading position." },
      { type: "feature", text: "Integrated PDF (pdfjs-dist) and DOCX (mammoth) parsing engines for character and chat imports directly in the browser." },
      { type: "enhancement", text: "Added intelligent style extraction algorithms for imported chats: dynamically captures font styling, italics, and non-black text colors to automatically wrap actions in asterisks." },
      { type: "feature", text: "Added implicit speaker detection for PDF/DOCX imports, accurately identifying character names on solitary lines without standard colon delimiters." },
      { type: "enhancement", text: "Updated the 'Consolidate Chat' mechanism in MemPalace to bypass the 100-message limit, allowing it to scan and harvest loci across the entire conversation history when triggered manually." }
    ],
    tags: ["Pagination", "Performance", "PDF Import", "DOCX Import", "Text Formatting", "MemPalace", "History Harvest"],
    targetSection: "data"
  },
  {
    version: "v0.54",
    delta: "+0.02",
    date: "September 2026",
    title: "Test Active Chat Model Censorship & Identity Boundaries",
    category: "diagnostics",
    categoryLabel: "Diagnostics & Identity",
    summary: "Introduced a robust Active Chat Model Censorship Test to explicitly verify if the connected LLM model is artificially censored against specific roleplay, taboo, or safety guidelines. Expanded the User Persona Identity Matrix with explicit Gender and Orientation tracking injected directly into system prompts.",
    highlights: ["Censorship Test Console", "Safety Rejection Detection", "Roleplay Filter Bypasses", "Gender Profile Injection", "Orientation Identity Selection"],
    changes: [
      { type: "feature", text: "Added dedicated 'Test Active Chat Model Censorship' execution block under system status section." },
      { type: "feature", text: "Implemented rejection detection matching >15 strict refusal phrases (e.g., 'as an ai', 'cannot fulfill', 'sexually explicit', 'non-consensual')." },
      { type: "feature", text: "Added explicit Gender and Orientation dropdown fields to the User Persona modal." },
      { type: "enhancement", text: "Dynamically inject user gender and orientation preferences straight into the core Roleplay prompt for accurate LLM identity alignment." },
      { type: "enhancement", text: "Tuned the censorship test prompt to explicitly target roleplay-specific dominant/submissive physical boundaries to expose deeply embedded filters." }
    ],
    tags: ["Censorship", "Diagnostics", "Identity", "Gender", "Orientation", "Safety Filters"],
    targetSection: "status"
  },
  {
    version: "v0.52",
    delta: "+0.02",
    date: "September 2026",
    title: "Universal Roleplay Identity Binding & Dialogue/Action Formatting Engine",
    category: "roleplay",
    categoryLabel: "Roleplay & Identity Standards",
    summary: "Resolved character/user context confusion by strictly binding 'character' to the active chat character and 'user' to the active user persona across all macro resolution, system instructions, scenario generations, and inference retries. Enforced strict roleplay formatting standards where spoken dialogue is enclosed in quotation marks \" \" while thoughts, actions, and scene narration are enclosed in asterisks * *.",
    highlights: ["Active Character Binding", "Active User Persona Binding", "Strict \"Dialogue\" Formatting", "Strict *Action* Asterisks", "Synchronized Macro Expansion", "Retry Prompt Hardening"],
    changes: [
      { type: "fix", text: "Resolved chat context error by strictly enforcing that 'character', 'personality', {{char}}, and {{character}} always bind to the active chat character, while 'user' and {{user}} always bind to the active user persona across all prompts, scenarios, lorebooks, and system instructions." },
      { type: "feature", text: "Implemented strict roleplay dialogue and action formatting standards: all words spoken out loud must be enclosed in double quotation marks \" \" while all internal thoughts, physical actions, body language, facial gestures, and narration must be enclosed in asterisks * *." },
      { type: "enhancement", text: "Synchronized dual-environment macro resolution across client (resolveRoleplayVariables in roleplayTemplate.ts) and server (resolveServerRoleplayMacros in server.ts) with full support for possessives ('character's, 'user's), bracketed macros, and dialogue speaker tags." },
      { type: "enhancement", text: "Hardened inference retry system prompts for both local model servers and Google Gemini cloud models to strictly require dialogue in quotes and actions in asterisks, preventing formatting drift or conversational degeneration." },
      { type: "feature", text: "Enhanced RoleplayMessage rendering component with dedicated inline spoken dialogue quotation highlighting and styled action asterisk formatting for clean typographic hierarchy." },
      { type: "enhancement", text: "Updated scenario generator prompt (/api/scenario/generate) to automatically produce scenarios respecting the active character and user persona bindings with compliant \" \" and * * formatting." },
      { type: "enhancement", text: "Updated scenario editor and character editor modals with live formatting badges, updated placeholders, and clarified context definition banners." },
      { type: "fix", text: "Updated conversation history clear and purge seeding routines to use active character name fallback instead of generic placeholder." }
    ],
    tags: ["Chat Context", "Identity Binding", "Dialogue Quotes", "Asterisks Actions", "Macro Resolution", "Prompt Hardening", "Formatting Standards"],
    targetSection: "persona"
  },
  {
    version: "v0.50",
    delta: "+0.02",
    date: "September 2026",
    title: "Dedicated Neural Pipeline Models & Multi-Model Engine Dispatcher",
    category: "models",
    categoryLabel: "Models & Neural Dispatcher",
    summary: "Decoupled secondary reasoning workloads from primary chat by introducing dedicated neural model selectors for the Quest Engine and Character State & Mood Engine.",
    highlights: ["Decoupled Model Architecture", "Dedicated Quest Engine Model", "Dedicated Character State Model", "Zero Chat Latency Degradation"],
    changes: [
      { type: "feature", text: "Introduced dedicated neural model dispatcher allowing independent model assignment for Quest Engine and Character State & Mood evaluation." },
      { type: "feature", text: "Added dedicated model selector controls under Active Interface Model in Neural Models & Servers settings with live configuration persistence." },
      { type: "feature", text: "Created persistent neural models configuration endpoint (/api/neural-models-config) storing separate model assignments for chat, quests, and character state." },
      { type: "enhancement", text: "Support for assigning fast lightweight models (e.g. Gemini 3.1 Flash-Lite) or private local models to secondary tasks while running powerful reasoning models for chat." },
      { type: "enhancement", text: "Eliminated prompt bloat and secondary latency overhead from the primary roleplay dialogue streaming loop." }
    ],
    tags: ["Neural Dispatcher", "Decoupled Pipeline", "Quest Model", "Character State Model", "Local Servers"],
    targetSection: "model_servers"
  },
  {
    version: "v0.48",
    delta: "+0.02",
    date: "September 2026",
    title: "Decoupled Quest State Synchronization & Three-Stage Pipeline Architecture",
    category: "quests",
    categoryLabel: "Quests & RPG Engine",
    summary: "Resolved quest completion race conditions by implementing an isolated Three-Stage Pipeline (Pre-Inference, Core Dialogue, Post-Inference) with automated conversational objective detection and narrative acknowledgment injection.",
    highlights: ["Three-Stage Pipeline", "Natural Quest Acceptance", "Automated Dialogue Completion", "Narrative Triumph Injection"],
    changes: [
      { type: "feature", text: "Architected isolated Three-Stage Chat Pipeline: Stage 1 (Pre-Inference State & Context), Stage 2 (Core Dialogue Stream), and Stage 3 (Post-Inference State & Quest Processing)." },
      { type: "feature", text: "Added automated verbal quest acceptance and decline detection in Stage 1, injecting in-character acknowledgment before dialogue generation." },
      { type: "feature", text: "Engineered post-turn conversational quest completion detection analyzing recent dialogue exchanges with automated status transition and spoils payout." },
      { type: "feature", text: "Built automated narrative injection queue (pendingNarrativeInjections) ensuring character immediately celebrates and acknowledges quest completion in the next response." },
      { type: "enhancement", text: "Created on-demand conversational quest evaluation endpoint (/api/quests/evaluate-chat) to manually evaluate active quests against chat history." }
    ],
    tags: ["Quests", "Three-Stage Pipeline", "Automated Detection", "Narrative Injections", "RPG Engine"],
    targetSection: "questing_system"
  },
  {
    version: "v0.46",
    delta: "+0.02",
    date: "September 2026",
    title: "Cogwheel Quick-Edit Controls & Character Terminology Unification",
    category: "roleplay",
    categoryLabel: "Roleplay & Character Setup",
    summary: "Replaced text-based edit buttons next to character names with intuitive cogwheel settings icons, and globally unified all legacy personality references into clear character terminology.",
    highlights: ["Cogwheel Edit Icon", "Unified Character Naming", "Macro Template Expansion", "Modal Terminology"],
    changes: [
      { type: "feature", text: "Replaced text-based 'Edit' buttons next to character names with a sleek cogwheel (<Settings2 />) icon in both the sidebar character roster and the active character details panel." },
      { type: "enhancement", text: "Globally standardized terminology from 'Personality' to 'Character' across character creation modals, scenario setup, lorebooks, and world events." },
      { type: "enhancement", text: "Updated roleplay template macros to support '{{character}}' and '\"character\"' alongside legacy formats for backward compatibility." },
      { type: "enhancement", text: "Added dedicated '{{character}}' and '{{user}}' quick-insert chips to Event Manager and LoreBook Manager entry editors." },
      { type: "enhancement", text: "Renamed 'Scenario & Persona Details' card to 'Scenario & Character Details' with integrated quick cogwheel edit triggers." }
    ],
    tags: ["Cogwheel Icon", "Character Terminology", "Quick Edit", "Macros", "UI Polish"],
    targetSection: "persona"
  },
  {
    version: "v0.44",
    delta: "+0.02",
    date: "September 2026",
    title: "100+ Character Mood Palette & Multi-Category AI Emotional Inference",
    category: "roleplay",
    categoryLabel: "Roleplay & Character States",
    summary: "Expanded character mood spectrum into 100+ rich presets across 19 emotional categories with dynamic AI state evaluation guidance and rule-based detection for nuanced interactions.",
    highlights: ["100+ Mood Presets", "19 Emotional Categories", "Surprise & Pride States", "AI Inference Guidance"],
    changes: [
      { type: "feature", text: "Expanded mood taxonomy to 100+ distinct presets across 19 categories including Embarrassment, Pride, Surprise, Relief, Devotion, Disgust, Boredom, Guilt, and Anticipation." },
      { type: "enhancement", text: "Updated AI state evaluation instructions in getAiMoodPromptGuidance so Gemini selects from the expanded mood categories based on conversation context." },
      { type: "enhancement", text: "Added rule-based fallback keyword detection in characterStateEngine.ts for surprise, embarrassment, pride/smugness, and relief." },
      { type: "enhancement", text: "Expanded quick mood selection pills in Character creation and editing modal to 16 curated starting emotional states." },
      { type: "enhancement", text: "Configured distinct color schemes, badges, and icon indicators for all new mood classifications." }
    ],
    tags: ["Mood System", "Emotional States", "AI Inference", "Vitals HUD", "Character Engine"],
    targetSection: "status"
  },
  {
    version: "v0.42",
    delta: "+0.02",
    date: "September 2026",
    title: "Expanded 60+ Character Mood Palette & Dynamic AI State Inference",
    category: "roleplay",
    categoryLabel: "Roleplay & Character States",
    summary: "Significantly expanded character emotional states from basic options into a vibrant 60+ mood palette across 10 psychological categories, accompanied by contextual AI state inference.",
    highlights: ["60+ Mood Presets", "10 Category Classifiers", "AI Prompt Guidance", "Stress Baseline Coupling"],
    changes: [
      { type: "feature", text: "Organized 60+ expressive character moods across 10 distinct psychological categories: Joy & Excitement, Playful & Banter, Affection & Romance, Calm & Serenity, Curiosity & Wonder, Resolve & Vigilance, Fear & Distress, Melancholy & Sorrow, Anger & Conflict, and Physical & Sensation." },
      { type: "feature", text: "Integrated interactive Mood Palette tuner in CharacterStateDisplay with live visual preview badges, Lucide category icons, and color-coded pulse effects." },
      { type: "feature", text: "Added real-time mood category tabs (Featured, All 60+, Joy, Romance, Calm, etc.) and live search input for instant filtering." },
      { type: "enhancement", text: "Updated server AI state evaluation instructions (getAiMoodPromptGuidance) to dynamically analyze dialogue exchanges and select the exact fitting emotional nuance." },
      { type: "enhancement", text: "Added rule-based fallback mood detection in characterStateEngine.ts for grief/melancholy, fury/anger, curiosity, playful banter, affection, exhaustion, and tranquility." },
      { type: "enhancement", text: "Coupled high-tension moods (e.g., Terrified, Furious) with automatic stress baseline elevations, and serene moods with stress relief." },
      { type: "enhancement", text: "Added quick-pick starting mood suggestion pills to PersonalityModal character creation and editing." }
    ],
    tags: ["Mood Palette", "AI Inference", "Character States", "Vitals", "Emotions"],
    targetSection: "status"
  },
  {
    version: "v0.40",
    delta: "+0.02",
    date: "September 2026",
    title: "Interactive PDF Chat Transcript Export & Client-Safe Metrics Engine",
    category: "transcripts",
    categoryLabel: "Transcripts & Export",
    summary: "Added professional one-click PDF conversation export with high-readability dialogue cards, status dossiers, and a client-safe relationship metrics calculator.",
    highlights: ["One-Click PDF Export", "End-of-Session Status Dossier", "Client-Safe Metrics Calc", "Multi-Page Layout"],
    changes: [
      { type: "feature", text: "Engineered one-click PDF conversational export utilizing jsPDF and autoTable formatting." },
      { type: "feature", text: "Implemented distinct styled dialogue cards for user and character, action narration italicization, metadata running headers, and multi-page pagination." },
      { type: "feature", text: "Built comprehensive end-of-transcript status dossier: Vitals (Health, Stamina, Trust), Mood & Composure rating, Scene & Setting context (Location, Activity, Outfit), and active status effects." },
      { type: "feature", text: "Integrated MemPalace Key Memory Board with verbatim quotes and full Relationship Metrics breakdown in exported dossiers." },
      { type: "fix", text: "Extracted relationship metrics computation into client-safe utility (src/utils/relationshipMetricsCalc.ts) to eliminate browser runtime crashes caused by Node.js fs/promises imports." },
      { type: "enhancement", text: "Added dedicated PDF export trigger buttons in the active character panel and top chat toolbar." }
    ],
    tags: ["PDF Export", "Transcripts", "jsPDF", "Relationship Metrics", "Vitals Dossier"],
    targetSection: "data"
  },
  {
    version: "v0.38",
    delta: "+0.02",
    date: "September 2026",
    title: "Custom Chat Theme & Visual UI Personalization Engine",
    category: "theming",
    categoryLabel: "Theme & UI Customization",
    summary: "Introduced a dedicated Theme & UI settings tab with real-time preview simulation canvas, granular message bubble styling, and curated atmospheric presets.",
    highlights: ["Theme Settings Section", "Live Preview Canvas", "Bubble Radius & Padding", "Atmospheric Presets"],
    changes: [
      { type: "feature", text: "Built dedicated ThemeSettingsSection in Settings with an interactive live chat preview simulator." },
      { type: "feature", text: "Granular color controls: user and assistant bubble backgrounds, text colors, and system announcement tints with hex and color-picker support." },
      { type: "feature", text: "Customizable layout geometry: bubble border radiuses (Sharp 6px, Rounded 12px, Soft Pill 20px) and message density padding (Compact, Balanced, Generous)." },
      { type: "feature", text: "Curated one-click theme presets: Cyberpunk Neon, Fantasy Parchment, Midnight AMOLED, Warm Amber Studio, and Minimalist Slate." },
      { type: "enhancement", text: "Added custom accent highlights for HUD vitals progress bars, status effect badges, and chat input field outlines." },
      { type: "enhancement", text: "Persistent theme configuration stored locally with instant reset to defaults capability." }
    ],
    tags: ["Themes", "Custom UI", "Message Bubbles", "Presets", "Visual Styling"],
    targetSection: "theme"
  },
  {
    version: "v0.36",
    delta: "+0.02",
    date: "September 2026",
    title: "Complete Character Bundle Export & Dependency-Rebuilding Import",
    category: "diagnostics",
    categoryLabel: "Data & Storage",
    summary: "Created full-ecosystem character bundle export and an intelligent dependency-rebuilding import engine that automatically recreates missing scenarios and lorebooks.",
    highlights: ["Full Ecosystem Bundle", "Dependency Rebuilding", "Lossless Restoration", "Cross-Installation Portability"],
    changes: [
      { type: "feature", text: "Engineered full-ecosystem character JSON bundles containing personality profile, full chat transcript, attached scenarios, linked lorebooks and entries, MemPalace memory rooms, active quests, and inventory state." },
      { type: "feature", text: "Built server-side dependency-rebuilding import engine: automatically detects missing scenarios or lorebooks and recreates them with original parameters." },
      { type: "enhancement", text: "Preserved unique IDs, scenario bindings, lorebook triggers, and memory weights losslessly across different app installations." },
      { type: "enhancement", text: "Added dedicated bundle export triggers in PersonalityModal and universal import triggers in Data & Memory settings." }
    ],
    tags: ["Bundle Export", "Dependency Import", "Auto-Creation", "Backup", "Portability"],
    targetSection: "data"
  },
  {
    version: "v0.34",
    delta: "+0.02",
    date: "September 2026",
    title: "Concurrency Atomic File Locks & Schema Resilience Test Suite",
    category: "diagnostics",
    categoryLabel: "Diagnostics & Health",
    summary: "Engineered automated testing suite validating atomic file locks, JSON schema integrity, and seamless session restoration across character swaps.",
    highlights: ["Atomic File Locks", "10-Way Parallel Benchmark", "JSON Schema Auditing", "Session Restoration Tests"],
    changes: [
      { type: "feature", text: "Implemented atomic lock benchmark in systemStatusEngine.ts testing 10-way parallel read/write file operations with zero data loss or file corruption." },
      { type: "feature", text: "Added automated JSON schema validator auditing all character cards, scenarios, quests, and transcripts with parser error recovery." },
      { type: "feature", text: "Added session restoration test simulating rapid character/scenario swaps to guarantee 100% state fidelity." },
      { type: "enhancement", text: "Verified AbortSignal timeout and cancellation handling to guarantee socket release during slow upstream model responses." }
    ],
    tags: ["Concurrency", "Atomic Locks", "Schema Validation", "Integrity", "Testing"],
    targetSection: "status"
  },
  {
    version: "v0.32",
    delta: "+0.02",
    date: "September 2026",
    title: "Full-Stack System Status, Latency Benchmarking & Storage Inspector",
    category: "diagnostics",
    categoryLabel: "Diagnostics & Health",
    summary: "Built comprehensive centralized diagnostics control room monitoring active neural engines, real-time roundtrip latencies, and physical storage allocations.",
    highlights: ["System Status Section", "Active-Only Monitoring", "Millisecond Latency Benchmarks", "Storage Sizing Inspector"],
    changes: [
      { type: "feature", text: "Built SystemStatusSection in Settings providing centralized full-stack infrastructure diagnostics." },
      { type: "feature", text: "Active-only interface filtering: pings only enabled servers to eliminate false offline alarms on unused endpoints." },
      { type: "feature", text: "Real-time roundtrip latency gauges benchmarking Gemini API and active local server ports in milliseconds." },
      { type: "feature", text: "Storage location inspector displaying exact absolute filesystem paths, file counts, and storage space utilized." },
      { type: "enhancement", text: "Real-time V8 heap memory meter (Used, RSS, Heap Limit) with warning threshold alerts and 500MB storage quota tracking." },
      { type: "enhancement", text: "One-click batch health testing with actionable troubleshooting recommendations." }
    ],
    tags: ["System Status", "Latency", "Storage Inspector", "V8 Heap", "Diagnostics"],
    targetSection: "status"
  },
  {
    version: "v0.30",
    delta: "+0.02",
    date: "September 2026",
    title: "Real-Time Error Logging & Diagnostics Viewer",
    category: "diagnostics",
    categoryLabel: "Diagnostics & Health",
    summary: "Integrated a centralized error capture store and diagnostics viewer with stack trace inspection, unread badge counters, and one-click log purges.",
    highlights: ["Centralized Error Store", "Stack Trace Inspector", "Unread Badge Counters", "Search & Filter Logs"],
    changes: [
      { type: "feature", text: "Built centralized errorLogStore.ts capturing client and server-side runtime errors, API timeouts, and network failures with high-resolution timestamps." },
      { type: "feature", text: "Created ErrorLogsView in Settings with severity filtering (Error, Warning, Info), searchable message logs, and expandable stack traces." },
      { type: "feature", text: "Added live unread error badge counter in the Settings navigation sidebar for instant awareness." },
      { type: "enhancement", text: "Added copy-to-clipboard actions and one-click error log purge and export." }
    ],
    tags: ["Error Logs", "Diagnostics", "Stack Traces", "Debugging", "Telemetry"],
    targetSection: "error_logs"
  },
  {
    version: "v0.28",
    delta: "+0.02",
    date: "September 2026",
    title: "MemPalace: Method of Loci Spatial Memory Architecture",
    category: "memory",
    categoryLabel: "Memory Architecture",
    summary: "Implemented cognitive episodic memory architecture organizing character memories into architectural rooms with 2D spatial visualizers and importance weighting.",
    highlights: ["Method of Loci Architecture", "Categorized Loci Rooms", "2D Spatial Visualizer", "Automated Fact Extraction"],
    changes: [
      { type: "feature", text: "Designed cognitive episodic memory architecture categorizing character memories into conceptual rooms: Hall of Bonds, Vault of Secrets, Archive of Lore, and Chamber of Quirks." },
      { type: "feature", text: "Built interactive 2D MemPalace visualizer (MemPalaceView.tsx) with room nodes and visual memory cards." },
      { type: "feature", text: "Implemented semantic importance weighting (1 to 10) to prioritize high-stakes narrative memories during LLM context assembly." },
      { type: "feature", text: "Added automated episodic extraction (extractEpisodicMemories) synthesizing key dialogue commitments and revelations after conversations." },
      { type: "enhancement", text: "Added direct memory node editor allowing players to view, edit, search, or purge specific character memories." }
    ],
    tags: ["MemPalace", "Method of Loci", "Cognitive Memory", "Episodic Recall", "Spatial Visualizer"],
    targetSection: "data"
  },
  {
    version: "v0.26",
    delta: "+0.02",
    date: "September 2026",
    title: "Narrative RPG Quests, Character Desires & Inventory System",
    category: "quests",
    categoryLabel: "Quests & RPG",
    summary: "Turned roleplay chats into living interactive adventures with dynamic character desires, multi-step quest progression, and persistent inventory spoils.",
    highlights: ["Narrative RPG Quests", "Multi-Step Objective Tracking", "In-Character Quest Proposing", "Player Inventory & Spoils"],
    changes: [
      { type: "feature", text: "Created questsEngine.ts and QuestManagerModal transforming chats into interactive stories." },
      { type: "feature", text: "Dynamic quest generator creating character-aligned personal dilemmas, desires, and multi-step objectives." },
      { type: "feature", text: "Multi-step objective progress tracking (Proposed, Active, Satisfied, Completed) with visual progress bars." },
      { type: "feature", text: "Autonomous in-character quest proposing: characters introduce quests naturally into dialogue." },
      { type: "feature", text: "Persistent player inventory and spoils ledger awarding collectible narrative keepsakes upon quest completion." }
    ],
    tags: ["Quests", "RPG Engine", "Inventory", "Objectives", "Narrative Progression"]
  },
  {
    version: "v0.24",
    delta: "+0.02",
    date: "September 2026",
    title: "Dynamic Character Vitals, Scene State & Status Effects Engine",
    category: "roleplay",
    categoryLabel: "Roleplay & Character States",
    summary: "Added living character vitals tracking Health, Stamina, Trust, and Stress alongside environmental scene conditions and active status effects.",
    highlights: ["Interactive Character HUD", "Live Vitals & Composure", "Scene Context (Location/Outfit)", "Status Effect System"],
    changes: [
      { type: "feature", text: "Built characterStateEngine.ts and interactive HUD tracking live Health, Stamina, Trust, Affection, and Stress (0-100)." },
      { type: "feature", text: "Added scene state parameters: current Location, Activity, and Outfit with dynamic system prompt injection." },
      { type: "feature", text: "Implemented active status effect system (Blushing, Alert, In Pain, Bleeding, Exhausted, Euphoric) with color-coded badges." },
      { type: "feature", text: "Added dynamic state inference endpoint (/api/personalities/:id/infer-state) evaluating changes in composure from chat exchanges." },
      { type: "enhancement", text: "Created status tuner modal for manual override and inspection of character conditions." }
    ],
    tags: ["Vitals", "Health", "Stress", "Scene State", "Status Effects"],
    targetSection: "status"
  },
  {
    version: "v0.22",
    delta: "+0.02",
    date: "September 2026",
    title: "World Info Keyword LoreBook Engine & AI Entry Generator",
    category: "lorebooks",
    categoryLabel: "LoreBooks & World Info",
    summary: "Engineered dynamic worldbuilding encyclopedia with keyword triggers, recursive entry scanning, and an AI-powered lore generator.",
    highlights: ["Multi-Entry LoreBooks", "Keyword Triggers", "AI Lore Generator", "Recursive Scanning"],
    changes: [
      { type: "feature", text: "Built dynamic worldbuilding encyclopedia (LoreBookManagerModal.tsx) with primary and secondary keyword triggers." },
      { type: "feature", text: "AI-powered lore entry generator synthesizing rich historical, magical, and faction entries from short prompts." },
      { type: "feature", text: "Granular entry lifecycle management with instant edit, reorder, and deletion synchronization." },
      { type: "enhancement", text: "Safe deletion confirmation with automatic cascade unlinking from characters." },
      { type: "enhancement", text: "Recursive keyword activation enabling lore entries to trigger related entries for rich context embedding." }
    ],
    tags: ["LoreBooks", "World Info", "AI Generator", "Keyword Trigger", "Encyclopedia"]
  },
  {
    version: "v0.20",
    delta: "+0.02",
    date: "September 2026",
    title: "AI Scenario Generator & Atmospheric Scene Synthesis",
    category: "scenarios",
    categoryLabel: "Scenarios & World Presets",
    summary: "Integrated AI-powered scenario synthesizer to generate rich atmospheric world settings, lighting parameters, and contextual opening starters from brief ideas.",
    highlights: ["AI Scenario Synthesizer", "Atmospheric Presets", "Lifecycle Safety", "Context Injection"],
    changes: [
      { type: "feature", text: "Integrated AI-powered Scenario Generator allowing users to craft detailed atmospheric scenes from single-sentence ideas." },
      { type: "feature", text: "Generates scene background, mood parameters, atmospheric lighting, and context-specific opening starter messages." },
      { type: "enhancement", text: "Added lifecycle protection preventing accidental deletion of scenarios actively bound to characters." }
    ],
    tags: ["Scenarios", "AI Generator", "World Presets", "Atmosphere", "Prompt Synthesis"]
  },
  {
    version: "v0.18",
    delta: "+0.02",
    date: "September 2026",
    title: "Interactive Scenario Manager & World Presets",
    category: "scenarios",
    categoryLabel: "Scenarios & World Presets",
    summary: "Added dedicated Scenario Manager with pre-crafted environmental scenes, atmospheric parameters, and macro token resolution.",
    highlights: ["Scenario Manager Modal", "Cyberpunk, Fantasy & Sci-Fi Presets", "Universal Macro Tokens", "Starting Scene Context"],
    changes: [
      { type: "feature", text: "Built ScenarioManagerModal with curated starter settings (Cyberpunk Noir, Fantasy Tavern, Orbital Research Station)." },
      { type: "feature", text: "Environmental parameter configuration: Location rules, atmospheric description, and scenario directives injected into model context." },
      { type: "feature", text: "Universal template macro token resolution: preview and replace {{char}}, {{user}}, {{scenario}}, and {{location}}." }
    ],
    tags: ["Scenarios", "Environment", "Macros", "World Settings", "Presets"]
  },
  {
    version: "v0.16",
    delta: "+0.02",
    date: "September 2026",
    title: "Multi-Variation Generation Carousel & Swiping (< 1/3 >)",
    category: "inference",
    categoryLabel: "Inference & Variations",
    summary: "Introduced response regeneration carousels with smooth swiping between variations and high-creativity alternative synthesis.",
    highlights: ["Variation Carousel (< 1/3 >)", "High-Creativity Re-roll", "Keyboard / Wheel Navigation", "Variation Persistence"],
    changes: [
      { type: "feature", text: "Added response regeneration carousel directly in RoleplayMessage component." },
      { type: "feature", text: "Navigate effortlessly between generated reply variations (< 1/3 >) with arrow buttons or keyboard hotkeys." },
      { type: "feature", text: "Added 'High-Creativity Alternative' re-roll button utilizing boosted temperature and alternative sampling." },
      { type: "enhancement", text: "Persisted active variation index in conversation history and state storage." }
    ],
    tags: ["Variations", "Swiping", "Re-roll", "Creative Forking", "Carousel"]
  },
  {
    version: "v0.14",
    delta: "+0.02",
    date: "September 2026",
    title: "Dynamic Roleplay Events & Real-Time Injections Popover",
    category: "events",
    categoryLabel: "Events & Injections",
    summary: "Spiced up conversations with spontaneous narrative curveballs, atmospheric dilemmas, and an AI event generator beside the chat input.",
    highlights: ["Event Selector Popover", "Atmospheric & Complication Events", "One-Click Injection", "AI Event Generator"],
    changes: [
      { type: "feature", text: "Built EventManagerModal and EventSelectorPopover placed immediately beside the chat input bar." },
      { type: "feature", text: "Library of categorized spontaneous plot twists: Atmospheric, Complication, Social, Mystery, and Supernatural." },
      { type: "feature", text: "One-click prompt injection: triggers sudden storms, unexpected courier arrivals, or moral dilemmas on the next response." },
      { type: "enhancement", text: "AI event generator tailoring spontaneous narrative curveballs to current scene location and character mood." }
    ],
    tags: ["Events", "Plot Twists", "Injections", "Spontaneous Prompts", "Narrative Tension"]
  },
  {
    version: "v0.12",
    delta: "+0.02",
    date: "September 2026",
    title: "Interactive Local Server Setup Guide & Terminal Quickstart",
    category: "models",
    categoryLabel: "Models & Local Servers",
    summary: "Provided step-by-step setup guides, copyable terminal commands, and CORS network troubleshooting for local LLM engines.",
    highlights: ["Setup Guide Modal", "Ollama, Jan, LM Studio, Kobold", "Copyable Terminal Commands", "CORS & Host Binding"],
    changes: [
      { type: "feature", text: "Created LocalServerSetupGuide modal with step-by-step installation instructions for Ollama, LM Studio, Jan, and Kobold.cpp." },
      { type: "feature", text: "Copyable terminal quickstart commands with one-click clipboard action." },
      { type: "enhancement", text: "Detailed network binding guide (setting OLLAMA_HOST=0.0.0.0 and configuring CORS headers)." },
      { type: "enhancement", text: "Integrated direct navigation links from System Status and Server Settings." }
    ],
    tags: ["Setup Guide", "Local Servers", "Terminal Commands", "Ollama", "Troubleshooting"],
    targetSection: "model_servers"
  },
  {
    version: "v0.10",
    delta: "+0.02",
    date: "September 2026",
    title: "Local Model Server Integration (Ollama, LM Studio, Jan, Kobold.cpp)",
    category: "models",
    categoryLabel: "Models & Local Servers",
    summary: "Added support for 100% private, offline inference through local model servers with dynamic model discovery and auto-failover.",
    highlights: ["100% Private Offline Inference", "Dynamic /v1/models Discovery", "Heartbeat Status Badges", "Automatic Failover"],
    changes: [
      { type: "feature", text: "Built localServerEngine.ts and LocalServerSettingsModal supporting 100% private, offline inference." },
      { type: "feature", text: "Configurable server entries with custom host URLs, port settings, API keys, and OpenAI-compatible endpoint paths." },
      { type: "feature", text: "Automated /v1/models dynamic endpoint discovery fetching available local models with one click." },
      { type: "feature", text: "Real-time server heartbeat pinging and visual status indicators (Online, Slow, Offline)." },
      { type: "enhancement", text: "Resilient failover: automatically falls back to default inference model if local server disconnects." }
    ],
    tags: ["Local LLM", "Ollama", "LM Studio", "Kobold.cpp", "Jan", "Failover"],
    targetSection: "model_servers"
  },
  {
    version: "v0.08",
    delta: "+0.02",
    date: "September 2026",
    title: "Studio Generation Samplers & Thinking Token Budgets",
    category: "inference",
    categoryLabel: "Samplers & Tuning",
    summary: "Delivered studio-grade sampling controls including Temperature, Top-P, Min-P, Repetition Penalties, and Gemini thinking token budgets.",
    highlights: ["Studio Sampler Controls", "Min-P & Repetition Penalties", "Context Window Clamping", "Thinking Mode Budgets"],
    changes: [
      { type: "feature", text: "Built GlobalGenerationSettingsModal providing precision controls over LLM text synthesis." },
      { type: "feature", text: "Sampling parameters: Temperature (0.0 - 2.0), Top-P (0.0 - 1.0), Top-K (1 - 100), Min-P (0.0 - 1.0), and Repetition Penalty (1.0 - 2.0)." },
      { type: "feature", text: "Context Window slider (2,048 to 131,072 tokens) and Max Output Tokens limiter." },
      { type: "feature", text: "Explicit Thinking Token Budget controls (0 to 64,000 tokens) for Gemini reasoning models with isolated CoT inspection." },
      { type: "enhancement", text: "Curated sampler presets: Balanced Roleplay, High Creativity & Flair, and Factual Coherence." }
    ],
    tags: ["Samplers", "Temperature", "Top-P", "Min-P", "Thinking Mode", "Reasoning"],
    targetSection: "samplers"
  },
  {
    version: "v0.06",
    delta: "+0.02",
    date: "September 2026",
    title: "Universal Prompt Macros & Template Variable Engine",
    category: "foundation",
    categoryLabel: "Roleplay Foundation",
    summary: "Introduced universal token interpolation to automatically substitute character, user, scenario, and location variables across all templates.",
    highlights: ["Macro Variable Engine", "{{char}} & {{user}} Substitution", "{{scenario}} & {{location}} Binding", "Real-Time Preview"],
    changes: [
      { type: "feature", text: "Created roleplayTemplate.ts with universal token interpolation for roleplay templates." },
      { type: "feature", text: "Automatically substitutes {{char}}, {{user}}, {{scenario}}, and {{location}} across character backgrounds, dialogue examples, and first messages." },
      { type: "enhancement", text: "Real-time preview mode showing how variables resolve before starting conversation." }
    ],
    tags: ["Macros", "Templates", "Variables", "Token Interpolation"]
  },
  {
    version: "v0.04",
    delta: "+0.02",
    date: "September 2026",
    title: "User Persona & Universal Identity Matrix",
    category: "foundation",
    categoryLabel: "Roleplay Foundation",
    summary: "Built the User Persona system allowing players to define persistent identities, pronouns, and backstories respected across all characters.",
    highlights: ["User Persona Modal", "Persistent Player Identity", "Pronoun Ingestion", "Universal Prompt Injection"],
    changes: [
      { type: "feature", text: "Built UserPersonaModal allowing players to establish their persistent roleplay identity." },
      { type: "feature", text: "Configurable display name, custom avatar, preferred pronouns, personality traits, and background lore." },
      { type: "enhancement", text: "Universal identity prompt injection ensuring all AI companions address the user by name and respect their defined persona traits." }
    ],
    tags: ["User Persona", "Identity", "Player Profile", "Pronouns", "Roleplay"]
  },
  {
    version: "v0.02",
    delta: "Base Version",
    date: "September 2026",
    title: "Core Roleplay Engine & Persona Foundation",
    category: "foundation",
    categoryLabel: "Core Foundation",
    summary: "Initial baseline release of the immersive character roleplay web application with streaming neural inference and atomic state persistence.",
    highlights: ["Express & Vite Full-Stack", "Google Gemini Integration", "Streaming Token Delivery", "Atomic JSON State"],
    changes: [
      { type: "system", text: "Initial release of the roleplay chat application built with React, Vite, Tailwind CSS, and Express backend." },
      { type: "feature", text: "Integration with Google Gemini neural models via server-side proxying." },
      { type: "feature", text: "Responsive dark theme layout with sidebar character selector and real-time streaming token delivery." },
      { type: "feature", text: "Atomic JSON filesystem persistence for conversation histories and character profiles." },
      { type: "feature", text: "Markdown rendering with dialogue quotation emphasis and action narration formatting." }
    ],
    tags: ["Foundation", "Gemini", "Vite", "Express", "Streaming", "Markdown"]
  }
];

interface ChangelogSectionProps {
  onNavigateToSection?: (section: SettingsSection) => void;
  onBackToChat?: () => void;
}

export function ChangelogSection({ onNavigateToSection, onBackToChat }: ChangelogSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    "v0.58": true,
    "v0.56": true,
    "v0.54": true,
  });
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const toggleExpand = (version: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    CHANGELOG_DATA.forEach((item) => {
      all[item.version] = true;
    });
    setExpandedVersions(all);
  };

  const collapseAll = () => {
    setExpandedVersions({});
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleCopyFullChangelog = () => {
    const markdown = CHANGELOG_DATA.map((entry) => {
      const bullets = entry.changes.map((c) => `- [${c.type.toUpperCase()}] ${c.text}`).join("\n");
      return `### ${entry.version} (${entry.date}) - ${entry.title}\n*Delta: ${entry.delta} | Category: ${entry.categoryLabel}*\n\n${entry.summary}\n\n**Key Highlights:** ${entry.highlights.join(", ")}\n\n${bullets}\n`;
    }).join("\n---\n\n");

    handleCopyText(markdown, "full");
  };

  const filteredEntries = useMemo(() => {
    return CHANGELOG_DATA.filter((entry) => {
      const matchesCat = selectedCategory === "all" || entry.category === selectedCategory;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        entry.version.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        entry.categoryLabel.toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q)) ||
        entry.highlights.some((h) => h.toLowerCase().includes(q)) ||
        entry.changes.some((c) => c.text.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = { all: CHANGELOG_DATA.length };
    CHANGELOG_DATA.forEach((entry) => {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    });

    return [
      { id: "all", label: "All Releases", count: counts["all"] || 0 },
      { id: "roleplay", label: "Roleplay & Moods", count: counts["roleplay"] || 0 },
      { id: "transcripts", label: "Transcripts & PDF", count: counts["transcripts"] || 0 },
      { id: "theming", label: "Theme & UI", count: counts["theming"] || 0 },
      { id: "memory", label: "MemPalace & Memory", count: counts["memory"] || 0 },
      { id: "quests", label: "Quests & RPG", count: counts["quests"] || 0 },
      { id: "lorebooks", label: "LoreBooks", count: counts["lorebooks"] || 0 },
      { id: "scenarios", label: "Scenarios", count: counts["scenarios"] || 0 },
      { id: "events", label: "Events", count: counts["events"] || 0 },
      { id: "inference", label: "Inference & Samplers", count: (counts["inference"] || 0) },
      { id: "models", label: "Models & Local Servers", count: counts["models"] || 0 },
      { id: "diagnostics", label: "Diagnostics & Storage", count: counts["diagnostics"] || 0 },
      { id: "foundation", label: "Core Foundation", count: counts["foundation"] || 0 },
    ].filter((c) => c.count > 0);
  }, []);

  const latestEntry = CHANGELOG_DATA[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-10 text-gray-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#181820] to-[#121216] border border-[#2A2A35] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Latest: {latestEntry.version}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-400 bg-[#1C1C22] border border-[#2E2E38]">
                {CHANGELOG_DATA.length} Releases Tracked (v0.02 → {latestEntry.version})
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
                Δ +0.02 / Release
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-100 flex items-center gap-2.5">
              <History size={22} className="text-amber-400" />
              <span>Application Changelog & Version History</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Complete chronological breakdown of every feature, engine enhancement, bugfix, and roleplay module implemented across the system.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopyText(latestEntry.version, "version")}
              className="px-3 py-1.5 rounded-lg bg-[#1C1C22] hover:bg-[#25252D] text-gray-300 hover:text-amber-300 border border-[#2E2E38] text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy current version string"
            >
              {copiedItem === "version" ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-amber-400" />
                  <span>Copy Version</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyFullChangelog}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Copy full changelog in markdown"
            >
              {copiedItem === "full" ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span>Changelog Copied!</span>
                </>
              ) : (
                <>
                  <Download size={13} className="text-amber-400" />
                  <span>Export Markdown</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121216] border border-[#262630] rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search updates by feature, tag, keyword, or version..."
              className="w-full bg-[#16161B] border border-[#282834] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 focus:border-amber-500 focus:outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-[#1A1A22] text-gray-300 hover:text-amber-300 border border-[#2A2A34] transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-[#1A1A22] text-gray-300 hover:text-amber-300 border border-[#2A2A34] transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#2E2E38]">
          <Filter size={12} className="text-gray-500 shrink-0 mr-1" />
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-amber-500 text-black font-semibold border-amber-400 shadow-sm"
                    : "bg-[#18181F] text-gray-400 border-[#262632] hover:text-gray-200 hover:border-[#3A3A48]"
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1 py-0.2 rounded-full text-[9px] font-mono ${
                  isSelected ? "bg-black/20 text-black font-bold" : "bg-[#23232C] text-gray-500"
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Changelog Entries Stream */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center bg-[#121216] border border-[#262630] rounded-xl space-y-2">
            <History size={32} className="mx-auto text-gray-600 mb-2" />
            <h3 className="text-sm font-semibold text-gray-300">No matching updates found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No changelog entries matched &quot;{searchQuery}&quot;. Try adjusting your search query or switching categories.
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              className="mt-2 text-xs text-amber-400 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const isExpanded = !!expandedVersions[entry.version];
            const isLatest = idx === 0 && selectedCategory === "all" && !searchQuery;

            return (
              <article
                key={entry.version}
                id={`changelog-${entry.version}`}
                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                  isLatest
                    ? "bg-gradient-to-b from-[#16161E] to-[#121216] border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : "bg-[#121216] border-[#24242E] hover:border-[#323240]"
                }`}
              >
                {/* Entry Header */}
                <div
                  onClick={() => toggleExpand(entry.version)}
                  className="p-4 md:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border ${
                        isLatest
                          ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                          : "bg-[#1A1A22] text-amber-400 border-amber-500/30"
                      }`}>
                        {entry.version}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
                        {entry.delta}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-gray-400 bg-[#181820] border border-[#262632]">
                        {entry.categoryLabel}
                      </span>

                      <span className="text-[11px] text-gray-500 flex items-center gap-1 ml-auto sm:ml-0 font-mono">
                        <Calendar size={11} />
                        {entry.date}
                      </span>
                    </div>

                    <h2 className="text-sm md:text-base font-semibold text-gray-100 pt-0.5">
                      {entry.title}
                    </h2>

                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                      {entry.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const note = `### ${entry.version} - ${entry.title}\n${entry.summary}\n\n` + entry.changes.map(c => `- ${c.text}`).join('\n');
                        handleCopyText(note, entry.version);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-[#1C1C24] transition-colors"
                      title="Copy release note"
                    >
                      {copiedItem === entry.version ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#1C1C24] transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 md:px-5 pb-5 pt-1 border-t border-[#1F1F28] space-y-4 animate-in fade-in duration-100">
                    {/* Highlights Pills */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">
                        Key Highlights
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.highlights.map((h, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1"
                          >
                            <Sparkles size={10} className="text-amber-400" />
                            <span>{h}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Change Log List */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">
                        Detailed Additions & Changes
                      </span>
                      <ul className="space-y-2">
                        {entry.changes.map((change, i) => {
                          const badgeColor =
                            change.type === "feature"
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
                              : change.type === "enhancement"
                              ? "bg-sky-950/60 text-sky-300 border-sky-800/50"
                              : change.type === "fix"
                              ? "bg-amber-950/60 text-amber-300 border-amber-800/50"
                              : "bg-purple-950/60 text-purple-300 border-purple-800/50";

                          return (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider shrink-0 mt-0.5 border ${badgeColor}`}>
                                {change.type}
                              </span>
                              <span className="flex-1">{change.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Tags & Jump Link */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C1C24]">
                      <div className="flex flex-wrap items-center gap-1">
                        <Tag size={11} className="text-gray-500 mr-1" />
                        {entry.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-[#181820] text-gray-400 border border-[#262632]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {entry.targetSection && onNavigateToSection && (
                        <button
                          type="button"
                          onClick={() => onNavigateToSection(entry.targetSection!)}
                          className="text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 ml-auto"
                        >
                          <span>Open in Settings ({entry.targetSection})</span>
                          <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
