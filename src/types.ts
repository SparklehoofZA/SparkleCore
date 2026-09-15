export type Part = {
  text?: string;
  functionCall?: any;
  functionResponse?: any;
};

export type Content = {
  role: "user" | "model";
  parts: Part[];
  variations?: string[];
  activeVariationIndex?: number;
};

export type CharacterState = {
  health: number; // 0 to 100
  stamina: number; // 0 to 100
  statusEffects: string[];
  trust: number; // 0 to 100
  mood: string;
  stress: number; // 0 to 100
  location: string;
  activity: string;
  outfit: string;
  composure?: number; // 0 to 100
  attire?: string;
  status_effects?: string[];
};

export type Personality = {
  id: string;
  name: string;
  avatar?: string;
  scenarioId?: string;
  personality?: string;
  traits?: string; // Aliased for backwards compatibility
  scenario?: string;
  firstMessage?: string;
  appearance?: string;
  age?: string;
  gender?: string;
  orientation?: string;
  systemInstruction?: string;
  description?: string;
  state?: CharacterState;
  customBackgroundUrl?: string;
  customBackgroundOpacity?: number;
};

export type UserPersona = {
  id?: string;
  name: string;
  avatar?: string;
  age?: string;
  appearance?: string;
  traits?: string;
  background?: string;
  gender?: string;
  orientation?: string;
};

export type MemoryHall = "facts" | "events" | "discoveries" | "preferences";

export type MemoryDrawer = {
  id: string;
  wing: string;
  room: string;
  hall: MemoryHall;
  content: string;
  verbatimQuote?: string;
  entities: string[];
  importance: number; // 1 to 10
  timestamp: string;
  recallCount?: number;
  lastRecalledAt?: string;
};

export type EntityRelation = {
  id: string;
  source: string;
  relation: string;
  target: string;
  context?: string;
  timestamp: string;
  valid: boolean;
};

export type MemoryPalace = {
  personalityId: string;
  name: string;
  description?: string;
  wings: {
    id: string;
    name: string;
    rooms: string[];
  }[];
  drawers: MemoryDrawer[];
  entityGraph: EntityRelation[];
  lastConsolidatedAt?: string;
  stats?: {
    totalDrawers: number;
    hallCounts: Record<MemoryHall, number>;
    totalEntities: number;
    totalRecalls: number;
  };
};

export type RelationshipStage =
  | "First Encounters"
  | "Developing Acquaintances"
  | "Warm Companions"
  | "Playful Confidants"
  | "Deep Emotional Bond"
  | "Inseparable Partners"
  | "Soul Resonance";

export type EmotionalTrait = {
  trait: string;
  score: number; // 0 to 100
  color: string;
};

export type RelationshipMilestone = {
  id: string;
  title: string;
  content: string;
  quote?: string;
  date: string;
  significance: "critical" | "high" | "moderate";
  hall: MemoryHall;
  wing: string;
  room: string;
  importance: number;
};

export type RelationshipMetrics = {
  stage: RelationshipStage;
  stageSubtitle: string;
  stageDescription: string;
  affinityScore: number; // 0 to 100
  trustScore: number; // 0 to 100
  familiarityScore: number; // 0 to 100
  chemistryScore: number; // 0 to 100
  overallBondScore: number; // 0 to 100
  emotionalDynamics: EmotionalTrait[];
  totalSharedMemories: number;
  totalRecalls: number;
  sharedWingsCovered: number;
  knownFactsCount: number;
  secretsSharedCount: number;
  milestones: RelationshipMilestone[];
  knownAboutUser: string[];
  knownAboutPersonality: string[];
  mutualEntities: string[];
};

export type BoardNodeType = "user" | "personality" | "memory" | "entity" | "secret" | "milestone";

export type BoardNode = {
  id: string;
  type: BoardNodeType;
  label: string;
  sublabel?: string;
  content?: string;
  quote?: string;
  avatar?: string;
  importance?: number;
  hall?: MemoryHall;
  wing?: string;
  room?: string;
  recallCount?: number;
  x: number;
  y: number;
  color?: string;
  date?: string;
};

export type BoardLink = {
  id: string;
  source: string; // node id
  target: string; // node id
  label?: string;
  strength: number; // 1 - 10
  color?: string;
  style?: "solid" | "dashed" | "glowing" | "resonant";
  sentiment?: "positive" | "neutral" | "intimate" | "factual";
};

export type RecallResult = {
  drawer: MemoryDrawer;
  relevanceScore: number;
  matchedKeywords: string[];
};

export type LocalServerType = "jan" | "ollama" | "lmstudio" | "custom_openai" | "openrouter" | "ngrok";

export type LocalServerConfig = {
  id: string;
  name: string;
  type: LocalServerType;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  customHeaders?: Record<string, string>;
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
};

export type LocalModelInfo = {
  id: string;
  name: string;
  modelIdentifier: string;
  serverId: string;
  serverName: string;
  serverType: LocalServerType;
  size?: string;
  details?: any;
};

export type GlobalGenerationSettings = {
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  repetitionPenalty: number;
  minP: number;
  mirostat: number;
  mirostatTau: number;
  mirostatEta: number;
  tfsZ: number;
  logitBias: Record<string, number>;
  dryMultiplier: number;
  dryBase: number;
  dryAllowedLength: number;
  drySequenceBreakers: string[];
};

export type LocalServerSettings = {
  servers: LocalServerConfig[];
  activeServerId?: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  autoDiscoverOnStartup: boolean;
};

export type Scenario = {
  location?: string;
  timeOfDay?: string;
  id: string;
  name: string;
  description?: string;
  context: string;
  firstMessage?: string;
  characterId?: string | null;
  relationship?: string;
  state?: CharacterState;
};

export type LoreEntry = {
  id: string;
  name: string;
  keywords: string;
  content: string;
};

export type LoreBook = {
  id: string;
  name: string;
  description?: string;
  scenarioId?: string;
  entries: LoreEntry[];
};

export type ErrorLogSource = "server" | "chat";

export type ErrorLogEntry = {
  id: string;
  timestamp: string; // ISO string
  source: ErrorLogSource;
  title: string;
  message: string;
  details?: string;
  model?: string;
  endpoint?: string;
  status?: number;
  personalityName?: string;
};

export type EventType =
  | "Environmental"
  | "Character Action"
  | "System Interrupt"
  | "Custom"
  | string;

export type Event = {
  id: string;
  name: string;
  type: EventType;
  description: string;
  created_at: string;
};

export type RoleplayEvent = Event;

export type QuestDifficulty = "Easy" | "Medium" | "Hard";

export type QuestStatus = "available" | "proposed" | "in_progress" | "pending_payout" | "active" | "completed" | "abandoned";

export type QuestRewardItem = {
  item_name: string;
  item_description: string;
};

export type QuestRewards = {
  relationship_metrics?: {
    affinity?: number;
    trust?: number;
    harmonic_bond?: number;
  };
  items?: QuestRewardItem[];
};

export type CharacterQuest = {
  quest_id: string;
  title: string;
  description: string;
  character_motivation: string;
  difficulty: QuestDifficulty;
  trigger_prompt: string;
  rewards: QuestRewards;
  status?: QuestStatus;
  characterId?: string;
  characterName?: string;
  createdAt?: string;
  completedAt?: string;
};

export type UserInventoryItem = {
  id: string;
  item_name: string;
  item_description: string;
  acquiredAt: string;
  questTitle?: string;
  characterName?: string;
  characterId?: string;
};

export type UserGameState = {
  inventory: UserInventoryItem[];
};

export type SystemHealthStatus = "operational" | "degraded" | "offline" | "testing" | "unknown";

export interface SystemItemStatus {
  id: string;
  name: string;
  category: "core" | "inference" | "storage" | "memory" | "server" | "logging";
  status: SystemHealthStatus;
  description: string;
  latencyMs?: number;
  details?: string;
  metrics?: Record<string, any>;
  lastChecked?: string;
  error?: string;
  possibleSolutions?: string[];
  actionLabel?: string;
  actionType?: "test" | "refresh" | "configure";
}

export interface ModelTestResult {
  success: boolean;
  model: string;
  provider: string;
  prompt: string;
  reply?: string;
  latencyMs: number;
  ttftMs?: number;
  streamLatencyMs?: number;
  tokensPerSecond?: number;
  tokenCount?: number;
  isStreamed?: boolean;
  timestamp: string;
  error?: string;
  errorCode?: string | number;
  possibleSolutions?: string[];
  details?: string;
}

export interface StorageLocationInfo {
  absolutePath: string;
  isReachable: boolean;
  isWritable: boolean;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  fileCount: number;
  subdirectories: { name: string; path: string; fileCount: number; sizeFormatted: string }[];
  lastVerified: string;
}

export interface MemoryAndStorageLimits {
  heapUsedMb: number;
  heapTotalMb: number;
  heapLimitMb: number;
  rssMb: number;
  heapUsagePercent: number;
  storageUsedBytes: number;
  storageUsedFormatted: string;
  storageWarningThresholdMb: number;
  isMemoryHealthy: boolean;
  isStorageHealthy: boolean;
}

export interface ComprehensiveSystemStatus {
  overallStatus: "healthy" | "warning" | "error";
  timestamp: string;
  activeModel: string;
  systems: SystemItemStatus[];
  storageLocation: StorageLocationInfo;
  memoryAndStorageLimits: MemoryAndStorageLimits;
}

export interface ConcurrencyTestResult {
  success: boolean;
  operationsCount: number;
  durationMs: number;
  successfulOps: number;
  failedOps: number;
  opsPerSecond: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  dataIntegrityVerified: boolean;
  corruptedFilesCount: number;
  details: string;
  timestamp: string;
}

export interface SchemaValidationFileReport {
  fileName: string;
  path: string;
  itemCount: number;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface SchemaValidationResult {
  success: boolean;
  filesValidated: number;
  totalEntitiesChecked: number;
  passedCount: number;
  warningCount: number;
  errorCount: number;
  reports: SchemaValidationFileReport[];
  resilienceTestPassed: boolean;
  resilienceDetails: string;
  timestamp: string;
}

export interface SessionRestorationTestResult {
  success: boolean;
  originalSessionId: string;
  switchTargetSessionId: string;
  stateIntegrityPercentage: number;
  vitalsPreserved: boolean;
  dialogueHistoryPreserved: boolean;
  scenarioContextPreserved: boolean;
  questProgressPreserved: boolean;
  latencyMs: number;
  details: string;
  timestamp: string;
}

export interface TimeoutHandlingTestResult {
  success: boolean;
  configuredTimeoutMs: number;
  actualDurationMs: number;
  timeoutTriggeredCleanly: boolean;
  errorCode: string;
  cancellationVerified: boolean;
  details: string;
  possibleSolutions: string[];
  timestamp: string;
}

export type ThemeSettings = {
  // 1. Core Message Bubble Customization
  userBubbleColor: string;
  userTextColor: string;
  botBubbleColor: string;
  botTextColor: string;
  bubbleRadius: "sharp" | "rounded" | "pill";
  messagePadding: "compact" | "normal" | "relaxed";
  systemTextColor: string;
  bubbleBorderWidth: number;
  bubbleGlow: boolean;

  // 2. Dynamic & Contextual UI Elements
  accentColor: string;
  codeTheme: "dracula" | "monokai" | "nord" | "github-dark";
  roleTagBackground: string;

  // 3. Chat Window & Background Options
  chatBackgroundType: "solid" | "gradient" | "image";
  chatBackgroundColor: string;
  chatBackgroundGradient: string;
  chatBackgroundImageUrl?: string;
  chatBackgroundOpacity: number;
  chatBackgroundBlur: number;

  // 4. Pre-built Theme Presets
  activePreset?: string;
};

export interface CustomMoodEntry {
  id?: string;
  name: string;
  category?: string;
  description?: string;
  composureBias?: number;
  stressBias?: number;
  active?: boolean;
}

export interface CustomStatusEffectEntry {
  id?: string;
  tag: string;
  type?: "physical" | "mental" | "environmental";
  category?: "Physical" | "Psychological" | "Environmental" | string;
  description?: string;
  severity?: "Low" | "Moderate" | "High" | "Severe";
  active?: boolean;
}

export interface QuestingSystemConfig {
  manualOverrideFinishQuests: boolean;
  autoGenerateQuests: boolean;
  questDifficulty: "Easy" | "Medium" | "Hard" | "Adaptive";
  maxActiveQuests: number;

  // Generation & Autonomy Controls
  generationTriggerMode: "Automatic" | "Event-Based" | "Manual Only";
  generationCooldownTurns: number;
  aiPushiness: "Passive" | "Moderate" | "Aggressive" | "Relentless";
  autoAcceptanceThreshold: number; // 0-100

  // Difficulty, Progression & Rewards
  dynamicObjectiveScaling: boolean;
  rewardMultipliers: {
    affinity: number;
    trust: number;
    bond: number;
  };
  rewardTypes: {
    personalityTraits: boolean;
    loreBooks: boolean;
    sceneUnlocks: boolean;
    titleAccolades: boolean;
  };
  questFailureEngine: boolean;

  // Narrative Context & Integration
  memoryContextDepth: number; // 1-20
  explicitObjectives: boolean;
  autoResolutionSensitivity: number; // 1 (Low) to 5 (High)
  enableAutomatedQuestNarrativeInjections: boolean;

  // Data & Lifecycle Management
  customPromptTemplate: string;
}

export const DEFAULT_QUESTING_SYSTEM_CONFIG: QuestingSystemConfig = {
  manualOverrideFinishQuests: true,
  autoGenerateQuests: true,
  questDifficulty: "Adaptive",
  maxActiveQuests: 3,

  generationTriggerMode: "Automatic",
  generationCooldownTurns: 3,
  aiPushiness: "Moderate",
  autoAcceptanceThreshold: 40,

  dynamicObjectiveScaling: true,
  rewardMultipliers: {
    affinity: 1.0,
    trust: 1.0,
    bond: 1.0,
  },
  rewardTypes: {
    personalityTraits: true,
    loreBooks: true,
    sceneUnlocks: false,
    titleAccolades: false,
  },
  questFailureEngine: false,

  memoryContextDepth: 5,
  explicitObjectives: true,
  autoResolutionSensitivity: 4,
  enableAutomatedQuestNarrativeInjections: true,

  customPromptTemplate: "You are an underlying game logic engine for an interactive roleplay system. Your job is to analyze the character's current state and generate contextually relevant desires or tasks.",
};

export type NeuralModelsConfig = {
  defaultModel: string;
  characterStateModel: string;
  questEngineModel: string;
  fallbackModel: string;
  mempalaceModel?: string;
};

export const DEFAULT_NEURAL_MODELS_CONFIG: NeuralModelsConfig = {
  defaultModel: "gemini-3.8-flash",
  characterStateModel: "gemini-3.8-flash",
  questEngineModel: "gemini-3.8-flash",
  fallbackModel: "none",
  mempalaceModel: "gemini-3.8-flash",
};

export interface MoodEngineConfig {
  windowDepth: number; // Range: 1 to 5, Default: 3
  stressSensitivity: "low" | "normal" | "high"; // Default: "normal"
  customMoods: CustomMoodEntry[];
  customStatusEffects: CustomStatusEffectEntry[];
  liveMonitors: {
    trackLocation: boolean;
    trackActivity: boolean;
    trackOutfit: boolean;
    trackAttire?: boolean;
    trackStatusEffects: boolean;
  };
  transitionSmoothing: boolean;
  moodTransitionSmoothing?: boolean;
  narrativeProgressionTracking: boolean;
  safeSettingBuffering: boolean;
  relationshipBuffering: boolean;
  relationshipTrustBuffering?: boolean;
  drasticEventOverride?: boolean;
  sensoryNatureDisambiguation?: boolean;
  maxStressStepPerTurn?: number;
  composureRecoveryRate?: number;
}

export const DEFAULT_MOOD_ENGINE_CONFIG: MoodEngineConfig = {
  windowDepth: 3,
  stressSensitivity: "normal",
  customMoods: [],
  customStatusEffects: [],
  liveMonitors: {
    trackLocation: true,
    trackActivity: true,
    trackOutfit: true,
    trackAttire: true,
    trackStatusEffects: true,
  },
  transitionSmoothing: true,
  moodTransitionSmoothing: true,
  narrativeProgressionTracking: true,
  safeSettingBuffering: true,
  relationshipBuffering: true,
  relationshipTrustBuffering: true,
  drasticEventOverride: true,
  sensoryNatureDisambiguation: true,
  maxStressStepPerTurn: 15,
  composureRecoveryRate: 3,
};

export type MemPalaceConsolidateMode = "auto" | "message_count" | "manual_only";

export interface MemPalaceConfig {
  autoConsolidateMode: MemPalaceConsolidateMode; // "auto" (debounce per turn), "message_count" (every N turns/messages), "manual_only" (only manual clicks)
  messageThreshold: number; // Number of chat turns/messages before auto-consolidate runs (e.g. 2, 4, 6, 8, 10, 15, 20)
  dialogueHistoryDepth: number; // Number of recent messages to analyze during consolidation (default: 25, range: 6 - 80)
  autoConsolidateDelayMs: number; // Debounce delay in ms when in "auto" mode (default: 2500, range: 800 - 10000)
  autoDeduplicate: boolean; // Automatically clean & deduplicate memory drawers after consolidation (default: true)
  minMessageLength: number; // Minimum character length of dialogue to trigger consolidation (default: 15)
  importanceThreshold: number; // Minimum importance score (1-10) to anchor into palace (default: 1)
  enableQuoteExtraction: boolean; // Prefer extracting verbatim quotes from dialogue (default: true)
  model?: string; // Optional dedicated model override for MemPalace consolidation, or empty for system default
}

export const DEFAULT_MEMPALACE_CONFIG: MemPalaceConfig = {
  autoConsolidateMode: "auto",
  messageThreshold: 6,
  dialogueHistoryDepth: 25,
  autoConsolidateDelayMs: 2500,
  autoDeduplicate: true,
  minMessageLength: 15,
  importanceThreshold: 1,
  enableQuoteExtraction: true,
  model: "",
};



