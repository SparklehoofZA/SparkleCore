import express from "express";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { jsonrepair } from 'jsonrepair';
import { CharacterState, Personality, MoodEngineConfig, DEFAULT_MOOD_ENGINE_CONFIG, QuestingSystemConfig, DEFAULT_QUESTING_SYSTEM_CONFIG, NeuralModelsConfig, DEFAULT_NEURAL_MODELS_CONFIG, MemPalaceConfig, DEFAULT_MEMPALACE_CONFIG } from "./src/types";
import {
  ensureCharacterState,
  formatCharacterStateForPrompt,
  evaluatePreInferenceCharacterState,
  evaluateDynamicCharacterState,
  DEFAULT_CHARACTER_STATE,
} from "./src/characterStateEngine";
import {
  getPalace,
  savePalace,
  resetPalace,
  addDrawer,
  updateDrawer,
  deleteDrawer,
  addEntityRelation,
  deleteEntityRelation,
  searchLoci,
  walkPalaceForPrompt,
  consolidateDialogue,
  cleanAndDeduplicatePalace,
  calculateRelationshipMetrics,
} from "./src/mempalaceEngine";
import {
  getLocalServerSettings,
  saveLocalServerSettings,
  testServer,
  discoverAllLocalModels,
  executeLocalChat,
} from "./src/localServerEngine";
import { getGenerationSettings, saveGenerationSettings } from "./src/generationSettingsEngine";
import {
  logError,
  getErrorLogsFiltered,
  clearErrorLogs,
  deleteErrorLogById,
} from "./src/errorLogStore";
import {
  executeUniversalInference,
  getActiveSessionModel,
  setActiveSessionModel,
  getActiveSessionApiKey,
  isLocalOrCustomModel,
} from "./src/inferenceAdapter";
import {
  getComprehensiveSystemStatus,
  executeTestChatModel,
  testIndividualSystem,
  executeConcurrencyTest,
  executeSchemaValidation,
  executeSessionRestorationTest,
  executeTimeoutHandlingTest,
} from "./src/systemStatusEngine";


const app = express();
const isPkg = typeof (process as any).pkg !== "undefined";

const args = process.argv.slice(2);
const portArg = args.find(a => a.startsWith('--port='));
const PORT = portArg ? parseInt(portArg.split('=')[1], 10) : 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const ai = new GoogleGenAI({
  apiKey: undefined,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const DATA_DIR = path.join(process.cwd(), "data");
const MEMORIES_DIR = path.join(DATA_DIR, "memories");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const PERSONALITIES_FILE = path.join(DATA_DIR, "personalities.json");
const THEME_SETTINGS_FILE = path.join(DATA_DIR, "theme_settings.json");
const MOOD_ENGINE_CONFIG_FILE = path.join(DATA_DIR, "mood_engine_config.json");
const QUESTING_SYSTEM_CONFIG_FILE = path.join(DATA_DIR, "questing_system_config.json");
const MEMPALACE_CONFIG_FILE = path.join(DATA_DIR, "mempalace_config.json");

async function loadMoodEngineConfig(): Promise<MoodEngineConfig> {
  try {
    const data = await fs.readFile(MOOD_ENGINE_CONFIG_FILE, "utf-8");
    return { ...DEFAULT_MOOD_ENGINE_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_MOOD_ENGINE_CONFIG };
  }
}

async function saveMoodEngineConfig(config: MoodEngineConfig): Promise<void> {
  await fs.writeFile(MOOD_ENGINE_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

async function loadQuestingSystemConfig(): Promise<QuestingSystemConfig> {
  try {
    const data = await fs.readFile(QUESTING_SYSTEM_CONFIG_FILE, "utf-8");
    return { ...DEFAULT_QUESTING_SYSTEM_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_QUESTING_SYSTEM_CONFIG };
  }
}

async function saveQuestingSystemConfig(config: QuestingSystemConfig): Promise<void> {
  await fs.writeFile(QUESTING_SYSTEM_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

async function loadMemPalaceConfig(): Promise<MemPalaceConfig> {
  try {
    const data = await fs.readFile(MEMPALACE_CONFIG_FILE, "utf-8");
    return { ...DEFAULT_MEMPALACE_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_MEMPALACE_CONFIG };
  }
}

async function saveMemPalaceConfig(config: Partial<MemPalaceConfig>): Promise<MemPalaceConfig> {
  const current = await loadMemPalaceConfig();
  const merged: MemPalaceConfig = {
    ...current,
    ...config,
    messageThreshold: Math.max(1, Math.min(100, Number(config.messageThreshold) || current.messageThreshold || 6)),
    dialogueHistoryDepth: Math.max(6, Math.min(100, Number(config.dialogueHistoryDepth) || current.dialogueHistoryDepth || 25)),
    autoConsolidateDelayMs: Math.max(500, Math.min(15000, Number(config.autoConsolidateDelayMs) || current.autoConsolidateDelayMs || 2500)),
    minMessageLength: Math.max(1, Math.min(200, Number(config.minMessageLength) || current.minMessageLength || 15)),
    importanceThreshold: Math.max(1, Math.min(10, Number(config.importanceThreshold) || current.importanceThreshold || 1)),
  };
  await fs.writeFile(MEMPALACE_CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

// Ensure directories exist
async function ensureDirs() {
  await fs.mkdir(MEMORIES_DIR, { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}
ensureDirs();

// Serve uploaded and generated profile pictures / avatars
app.use("/api/images", express.static(IMAGES_DIR));

// Endpoint to upload / save character or user avatar
app.post("/api/upload-avatar", async (req, res) => {
  try {
    const { image, name } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Handle base64 data URLs
    if (image.startsWith("data:image/")) {
      const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 image data" });
      }

      let ext = matches[1].toLowerCase();
      if (ext === "jpeg") ext = "jpg";
      const buffer = Buffer.from(matches[2], "base64");
      const filename = `avatar_${Date.now()}_${uuidv4().substring(0, 8)}.${ext}`;
      const filePath = path.join(IMAGES_DIR, filename);
      await fs.writeFile(filePath, buffer);
      return res.json({ url: `/api/images/${filename}`, success: true });
    }

    // If it's already an HTTP / HTTPS or relative URL, return it
    if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("/api/images/")) {
      return res.json({ url: image, success: true });
    }

    return res.status(400).json({ error: "Unsupported image format" });
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload avatar" });
  }
});

function getHistoryFile(personalityId: string) {
  return path.join(MEMORIES_DIR, `chat_${personalityId || "default"}.json`);
}

async function loadHistory(personalityId: string) {
  try {
    const data = await fs.readFile(getHistoryFile(personalityId), "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveHistory(personalityId: string, history: any[]) {
  await fs.writeFile(getHistoryFile(personalityId), JSON.stringify(history, null, 2), "utf-8");
}

async function loadPersonalities() {
  try {
    const data = await fs.readFile(PERSONALITIES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function savePersonalities(personalities: any[]) {
  await fs.writeFile(PERSONALITIES_FILE, JSON.stringify(personalities, null, 2), "utf-8");
}

app.get("/api/personalities", async (req, res) => {
  const personalities = await loadPersonalities();
  res.json(personalities);
});


const SCENARIOS_FILE = path.join(DATA_DIR, "scenarios.json");

const LOREBOOKS_FILE = path.join(DATA_DIR, "lorebooks.json");

async function loadScenarios() {
  try {
    const data = await fs.readFile(SCENARIOS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveScenarios(scenarios: any[]) {
  await fs.writeFile(SCENARIOS_FILE, JSON.stringify(scenarios, null, 2), "utf-8");
}

async function loadLoreBooks() {
  try {
    const data = await fs.readFile(LOREBOOKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveLoreBooks(lorebooks: any[]) {
  await fs.writeFile(LOREBOOKS_FILE, JSON.stringify(lorebooks, null, 2), "utf-8");
}

app.get("/api/scenarios", async (req, res) => {
  const scenarios = await loadScenarios();
  res.json(scenarios);
});

app.post("/api/scenarios", async (req, res) => {
  const { name, description, location, timeOfDay, context, firstMessage, characterId, relationship, state } = req.body;
  if (!name || !context) {
    return res.status(400).json({ error: "Name and context are required" });
  }
  const scenarios = await loadScenarios();
  const newScenario = {
    id: uuidv4(),
    name: name.trim(),
    description: (description || "").trim(),
    location: (location || "").trim(),
    timeOfDay: (timeOfDay || "").trim(),
    context: context.trim(),
    firstMessage: (firstMessage || "").trim(),
    characterId: characterId || null,
    relationship: (relationship || "").trim(),
    state: state || null,
  };
  scenarios.push(newScenario);
  await saveScenarios(scenarios);

  // If allocated to a character, also link the character's scenarioId
  if (characterId) {
    const personalities = await loadPersonalities();
    const targetChar = personalities.find((p: any) => p.id === characterId);
    if (targetChar) {
      targetChar.scenarioId = newScenario.id;
      if (state) {
        targetChar.state = { ...(targetChar.state || {}), ...state };
      }
      await savePersonalities(personalities);
    }
  }

  res.json(newScenario);
});

app.put("/api/scenarios/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, location, timeOfDay, context, firstMessage, characterId, relationship, state } = req.body;
  
  if (!name || !context) {
    return res.status(400).json({ error: "Name and context are required" });
  }

  const scenarios = await loadScenarios();
  const index = scenarios.findIndex((s: any) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Scenario not found" });
  }
  
  const prevCharacterId = scenarios[index].characterId;

  scenarios[index] = {
    ...scenarios[index],
    name: name.trim(),
    description: (description || "").trim(),
    location: (location || "").trim(),
    timeOfDay: (timeOfDay || "").trim(),
    context: context.trim(),
    firstMessage: (firstMessage || "").trim(),
    characterId: characterId || null,
    relationship: (relationship || "").trim(),
    state: state || null,
  };
  
  await saveScenarios(scenarios);

  // Sync personality allocations if characterId changed or is set
  const personalities = await loadPersonalities();
  let pChanged = false;
  if (prevCharacterId && prevCharacterId !== characterId) {
    const prevChar = personalities.find((p: any) => p.id === prevCharacterId);
    if (prevChar && prevChar.scenarioId === id) {
      prevChar.scenarioId = null;
      pChanged = true;
    }
  }
  if (characterId) {
    const targetChar = personalities.find((p: any) => p.id === characterId);
    if (targetChar) {
      targetChar.scenarioId = id;
      if (state) {
        targetChar.state = { ...(targetChar.state || {}), ...state };
      }
      pChanged = true;
    }
  }
  if (pChanged) {
    await savePersonalities(personalities);
  }

  res.json(scenarios[index]);
});

app.delete("/api/scenarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const scenarios = await loadScenarios();
    const filtered = scenarios.filter((s: any) => s.id !== id);
    await saveScenarios(filtered);

    // Unlink any personality or lorebook referencing this scenario
    const personalities = await loadPersonalities();
    let pChanged = false;
    for (const p of personalities) {
      if (p.scenarioId === id) {
        p.scenarioId = null;
        pChanged = true;
      }
    }
    if (pChanged) {
      await savePersonalities(personalities);
    }

    const lorebooks = await loadLoreBooks();
    let lbChanged = false;
    for (const lb of lorebooks) {
      if (lb.scenarioId === id) {
        lb.scenarioId = null;
        lbChanged = true;
      }
    }
    if (lbChanged) {
      await saveLoreBooks(lorebooks);
    }

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Error deleting scenario:", err);
    res.status(500).json({ error: err.message || "Failed to delete scenario" });
  }
});

app.get("/api/lorebooks", async (req, res) => {
  const lorebooks = await loadLoreBooks();
  res.json(lorebooks);
});

app.post("/api/lorebooks", async (req, res) => {
  const { name, description, scenarioId, entries } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  const lorebooks = await loadLoreBooks();
  const newLoreBook = {
    id: uuidv4(),
    name: name.trim(),
    description: (description || "").trim(),
    scenarioId: scenarioId || null,
    entries: entries || [],
  };
  lorebooks.push(newLoreBook);
  await saveLoreBooks(lorebooks);
  res.json(newLoreBook);
});

app.put("/api/lorebooks/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, scenarioId, entries } = req.body;
  
  const lorebooks = await loadLoreBooks();
  const index = lorebooks.findIndex((lb: any) => lb.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Lore book not found" });
  }
  
  lorebooks[index] = {
    ...lorebooks[index],
    name: name.trim(),
    description: (description || "").trim(),
    scenarioId: scenarioId || lorebooks[index].scenarioId,
    entries: entries || lorebooks[index].entries,
  };
  
  await saveLoreBooks(lorebooks);
  res.json(lorebooks[index]);
});

app.delete("/api/lorebooks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lorebooks = await loadLoreBooks();
    const filtered = lorebooks.filter((lb: any) => lb.id !== id);
    await saveLoreBooks(filtered);

    // Unlink any personality referencing this lorebook
    const personalities = await loadPersonalities();
    let pChanged = false;
    for (const p of personalities) {
      if (p.lorebookId === id) {
        p.lorebookId = null;
        pChanged = true;
      }
      if (Array.isArray(p.lorebookIds) && p.lorebookIds.includes(id)) {
        p.lorebookIds = p.lorebookIds.filter((lid: string) => lid !== id);
        pChanged = true;
      }
    }
    if (pChanged) {
      await savePersonalities(personalities);
    }

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Error deleting lorebook:", err);
    res.status(500).json({ error: err.message || "Failed to delete lorebook" });
  }
});

app.post("/api/generate-personality", async (req, res) => {
  const { details, model, customApiKey } = req.body;
  const targetModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";

  try {
    const prompt = `Generate a detailed roleplay character personality based on these basic details: ${details}.
Provide a JSON object with this exact structure:
{
  "name": "Character Name",
  "personality": "Personality summary",
  "appearance": "Visual description",
  "age": "Age string or number",
  "description": "Short bio or summary",
  "systemInstruction": "Detailed character roleplay system prompt"
}`;
    const responseText = await executeUniversalInference({ fallbackModel: (await loadNeuralModelsConfig()).fallbackModel,
      model: targetModel,
      prompt,
      responseMimeType: "application/json",
      customApiKey,
      maxTokens: 4000,
    });
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }
    try {
      cleaned = jsonrepair(cleaned);
      res.json(JSON.parse(cleaned));
    } catch (e: any) {
      if (e.message.includes("Unterminated string") || e.message.includes("Unexpected end of JSON")) {
        try {
           let fixed = cleaned;
           if ((fixed.match(/"/g) || []).length % 2 !== 0) {
              fixed += '"';
           }
           if (!fixed.endsWith("}")) {
              fixed += "\n}";
           }
           res.json(JSON.parse(fixed));
           return;
        } catch (innerE) {
           res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });
           return;
        }
      }
      res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });
    }
  } catch (error: any) {
    console.error("Error generating personality:", error);
    res.status(500).json({ error: error?.message || "Failed to generate personality" });
  }
});

app.post("/api/generate-scenario", async (req, res) => {
  const { details, model, customApiKey } = req.body;
  const targetModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";

  try {
    const prompt = `Generate a detailed roleplay scenario based on these basic details: ${details}.
Important Conventions:
- You MUST use the literal string {{char}} to refer to the active chat character in all descriptions and text. Never use their real name.
- You MUST use the literal string {{user}} to refer to the active user persona. Never use their real name.
- All words being said (spoken dialogue) MUST be enclosed between single double quotes (" "). Do NOT use consecutive double quotes ("").
- All thoughts, physical actions, body language, facial gestures, and narration MUST always be enclosed between single asterisks (* *). Do NOT use double asterisks (** **).

Provide a JSON object with this exact structure:
{
  "name": "Scenario Name",
  "description": "Scenario overview (using \\"character\\" and \\"user\\")",
  "location": "Starting setting or place",
  "timeOfDay": "Time of day (e.g. Evening, Noon, Midnight)",
  "context": "Contextual plot hook or premise (using \\"character\\" and \\"user\\")",
  "firstMessage": "The initial in-character dialogue or action that \\"character\\" performs to start the chat (dialogue in \\" \\" and actions in * *)."
}`;
    const responseText = await executeUniversalInference({ fallbackModel: (await loadNeuralModelsConfig()).fallbackModel,
      model: targetModel,
      prompt,
      responseMimeType: "application/json",
      customApiKey,
      maxTokens: 3000,
    });
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }
    try {
      cleaned = jsonrepair(cleaned);
      const parsedObj = JSON.parse(cleaned);
      for (const key in parsedObj) {
        if (typeof parsedObj[key] === "string") {
          parsedObj[key] = parsedObj[key].replace(/\*\*/g, "*");
          parsedObj[key] = parsedObj[key].replace(/""/g, '"');
        }
      }
      res.json(parsedObj);
    } catch (e: any) {
      if (e.message.includes("Unterminated string") || e.message.includes("Unexpected end of JSON")) {
        try {
           let fixed = cleaned;
           if ((fixed.match(/"/g) || []).length % 2 !== 0) {
              fixed += '"';
           }
           if (!fixed.endsWith("}")) {
              fixed += "\n}";
           }
           const parsedObj = JSON.parse(fixed);
           for (const key in parsedObj) {
             if (typeof parsedObj[key] === "string") {
               parsedObj[key] = parsedObj[key].replace(/\*\*/g, "*");
               parsedObj[key] = parsedObj[key].replace(/""/g, '"');
             }
           }
           res.json(parsedObj);
           return;
        } catch (innerE) {
           res.json({
             name: "Generated Scenario",
             description: "A scenario generated dynamically.",
             location: "Unknown",
             timeOfDay: "Unknown",
             context: "The story continues...",
             firstMessage: "*looks around*"
           });
           return;
        }
      }
      res.json({
             name: "Generated Scenario",
             description: "A scenario generated dynamically.",
             location: "Unknown",
             timeOfDay: "Unknown",
             context: "The story continues...",
             firstMessage: "*looks around*"
           });
      return;
    }
  } catch (error: any) {
    console.error("Error generating scenario:", error);
    res.status(500).json({ error: error?.message || "Failed to generate scenario" });
  }
});

// Auto-generate Event Endpoint with optional guideline
app.post("/api/generate-event", async (req, res) => {
  const { guideline, model, customApiKey } = req.body || {};
  const targetModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";

  try {
    const prompt = `You are an expert creative narrative director for interactive roleplay.
Generate a creative, immersive roleplay scene event or system interrupt.${guideline ? ` The user provided this specific guideline/theme: "${guideline}". Follow it closely.` : " Invent an engaging, unexpected twist or environmental shift."}

Provide a JSON object with this exact structure:
{
  "name": "Short Event Title (e.g., Sudden Power Outage, Cryptic Knocking, Heavy Fog, Urgent Message)",
  "type": "Environmental" | "Character Action" | "System Interrupt" | "Custom",
  "description": "2-3 sentences of vivid narrative event instructions describing what abruptly happens in the scene and instructing the AI character how to react"
}`;
    const responseText = await executeUniversalInference({ fallbackModel: (await loadNeuralModelsConfig()).fallbackModel,
      model: targetModel,
      prompt,
      responseMimeType: "application/json",
      customApiKey,
      maxTokens: 2000,
    });
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }
    try {
      cleaned = jsonrepair(cleaned);
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (e: any) {
      if (e.message.includes("Unterminated string") || e.message.includes("Unexpected end of JSON")) {
        try {
           let fixed = cleaned;
           if ((fixed.match(/"/g) || []).length % 2 !== 0) {
              fixed += '"';
           }
           if (!fixed.endsWith("}")) {
              fixed += "\n}";
           }
           res.json(JSON.parse(fixed));
           return;
        } catch (innerE) {
           res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });
           return;
        }
      }
      res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });
    }
  } catch (error: any) {
    console.error("Error generating event:", error);
    const fallbackName = guideline
      ? guideline.length > 35
        ? guideline.substring(0, 35) + "..."
        : guideline
      : "Unexpected Disturbance";
    res.json({
      name: fallbackName,
      type: "Environmental",
      description: guideline
        ? `A sudden scene development occurs: ${guideline}. The environment and conversation immediately reflect this abrupt shift.`
        : "An unexpected tremor shakes the room, causing glasses to clatter on the table as ambient lighting momentarily flickers.",
    });
  }
});

// Auto-generate Lore Entry Endpoint with optional guideline
app.post("/api/generate-lore-entry", async (req, res) => {
  const { guideline, bookName, bookDescription, scenarioContext, model, customApiKey } = req.body || {};
  const targetModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";

  try {
    const prompt = `You are a master world-builder and lore archivist.
Generate a rich, imaginative world-building lore entry for a roleplay lore book.${bookName ? ` Book Title: "${bookName}".` : ""}${bookDescription ? ` Book Description: "${bookDescription}".` : ""}${scenarioContext ? ` World/Scenario Context: "${scenarioContext}".` : ""}${guideline ? ` User Guideline/Theme: "${guideline}". Follow this topic closely.` : " Invent an intriguing faction, artifact, forbidden secret, location, spell, or historical event."}

Provide a JSON object with this exact structure:
{
  "name": "Title of the lore entry (e.g., Order of the Silver Dawn, The Sunken Vault, Moonveil Elixir)",
  "keywords": "comma, separated, trigger, keywords, matching, this, topic",
  "content": "Rich, detailed lore entry (1-3 paragraphs, up to 1500 characters) detailing origin, sensory details, significance, and secrets."
}`;
    const responseText = await executeUniversalInference({ fallbackModel: (await loadNeuralModelsConfig()).fallbackModel,
      model: targetModel,
      prompt,
      responseMimeType: "application/json",
      customApiKey,
      maxTokens: 3000,
    });
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }
    try {
      cleaned = jsonrepair(cleaned);
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (e: any) {
      if (e.message.includes("Unterminated string") || e.message.includes("Unexpected end of JSON")) {
        try {
           let fixed = cleaned;
           if ((fixed.match(/"/g) || []).length % 2 !== 0) {
              fixed += '"';
           }
           if (!fixed.endsWith("}")) {
              fixed += "\n}";
           }
           res.json(JSON.parse(fixed));
           return;
        } catch (innerE) {
           res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });
           return;
        }
      }
      res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });
    }
  } catch (error: any) {
    console.error("Error generating lore entry:", error);
    const name = guideline
      ? guideline.length > 35
        ? guideline.substring(0, 35)
        : guideline
      : "Chronicle of the Realm";
    const kw = guideline
      ? guideline
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 4)
          .join(", ")
      : "history, lore, archive";
    res.json({
      name,
      keywords: kw || "lore, record",
      content: guideline
        ? `Ancient archives and regional records preserve significant details regarding ${guideline}. Chroniclers and travelers speak of its lasting influence across the surrounding realm.`
        : "An ancient manuscript detailing foundational history, notable figures, and mysterious secrets across the world.",
    });
  }
});

// --- Character Quests & Game Logic Engine ---
const QUESTS_FILE = path.join(DATA_DIR, "quests.json");
const USER_GAME_STATE_FILE = path.join(DATA_DIR, "user_game_state.json");

async function loadQuests(): Promise<any[]> {
  try {
    const data = await fs.readFile(QUESTS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQuests(quests: any[]): Promise<void> {
  await fs.writeFile(QUESTS_FILE, JSON.stringify(quests, null, 2), "utf-8");
}

async function loadUserGameState(): Promise<{ inventory: any[] }> {
  try {
    const data = await fs.readFile(USER_GAME_STATE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    let inventory = Array.isArray(parsed.inventory) ? parsed.inventory : [];

    // Ensure items are properly linked to characterId
    let modified = false;
    for (const item of inventory) {
      if (!item.characterId && item.characterName) {
        const lowerName = item.characterName.toLowerCase();
        if (lowerName === "lilly") {
          item.characterId = "d2e4bf08-1f07-400e-85d9-11c6ff21d0ab";
          modified = true;
        } else if (lowerName === "rose") {
          item.characterId = "15a30606-5132-495f-9dc9-e48a4dad90b2";
          modified = true;
        } else if (lowerName.includes("aria")) {
          item.characterId = "aria_vance";
          modified = true;
        }
      }
    }
    if (modified) {
      await fs.writeFile(USER_GAME_STATE_FILE, JSON.stringify({ inventory }, null, 2), "utf-8").catch(() => {});
    }

    return {
      inventory,
    };
  } catch {
    return {
      inventory: [
        {
          id: "inv_starter_satchel",
          item_name: "Adventurer's Leather Satchel",
          item_description: "A well-stitched traveler's pouch with reinforced buckles for keeping keepsakes safe.",
          acquiredAt: new Date().toISOString(),
          characterName: "System",
        },
      ],
    };
  }
}

async function saveUserGameState(state: { inventory: any[] }): Promise<void> {
  await fs.writeFile(USER_GAME_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// --- Quest Completion & Evaluation Logic ---

function extractQuestKeywords(quest: any, contextText?: string): Set<string> {
  const words = new Set<string>([
    "task", "quest", "objective", "errand", "favor", "supplies", "items", "reward"
  ]);
  const addTokens = (text?: string) => {
    if (!text) return;
    const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
    for (const t of tokens) words.add(t);
  };
  addTokens(quest.title);
  addTokens(quest.description);
  addTokens(quest.character_motivation);
  if (Array.isArray(quest.rewards?.items)) {
    for (const it of quest.rewards.items) {
      addTokens(it.item_name);
    }
  }
  // Common roleplay errand goods that might be discussed
  const commonGoods = [
    "bean", "beans", "coffee", "latte", "satchel", "gem", "gems", "relic", "relics",
    "potion", "potions", "flower", "flowers", "herb", "herbs", "recipe", "recipes",
    "map", "ore", "ores", "crystal", "crystals", "scroll", "scrolls", "artifact",
    "pass", "crag", "crags", "sample", "token", "ingredient", "ingredients", "supplies"
  ];
  const lowerCtx = (contextText || "").toLowerCase();
  for (const g of commonGoods) {
    if (lowerCtx.includes(g)) words.add(g);
  }
  return words;
}

function parseQuestEvalResponse(respText: string): { quest_completed: boolean; confidence_reason?: string } | null {
  if (!respText) return null;
  const cleaned = respText.trim();
  try {
    const direct = JSON.parse(cleaned);
    if (typeof direct.quest_completed === "boolean") return direct;
  } catch {}

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (typeof parsed.quest_completed === "boolean") return parsed;
    } catch {}
  }

  const jsonRegex = /\{[\s\S]*?"quest_completed"\s*:\s*(true|false)[\s\S]*?\}/i;
  const match = cleaned.match(jsonRegex);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.quest_completed === "boolean") return parsed;
    } catch {
      return { quest_completed: match[1].toLowerCase() === "true" };
    }
  }

  if (cleaned.toLowerCase().includes('"quest_completed": true') || cleaned.toLowerCase().includes('"quest_completed":true')) {
    return { quest_completed: true };
  }
  if (cleaned.toLowerCase().includes('"quest_completed": false') || cleaned.toLowerCase().includes('"quest_completed":false')) {
    return { quest_completed: false };
  }

  return null;
}

function heuristicCheckQuestCompletion(
  activeQuest: any,
  userMessage: string,
  assistantReply?: string,
  recentHistoryText?: string
): { completed: boolean; reason: string } {
  const combinedContext = `${recentHistoryText || ""}\n${userMessage || ""}\n${assistantReply || ""}`;
  const keywords = extractQuestKeywords(activeQuest, combinedContext);

  // 1. Character acknowledgement signals in assistant reply or recent assistant dialogue
  if (assistantReply || recentHistoryText) {
    const assistantText = `${assistantReply || ""}\n${recentHistoryText || ""}`.toLowerCase();
    const charConfirmRegex = /\b(?:you (?:actually )?found (?:them|it|the|this)|you brought (?:them|it|the|this)|by the stars.*they're real|take(?:s)? the satchel|take(?:s)? the.*from you|thank you for (?:bringing|finding|getting|helping|completing|collecting|solving|calming|making|brewing)|here(?:'s| is) your reward|completed the (?:task|quest|objective|errand)|finished the (?:task|quest|errand)|you (?:actually )?did it|grateful for your help|efficiently you handled the task|on the house as promised|secret reserve|reward for your trouble|promise is a promise|deal is a deal|i don't know how to thank you|you're a lifesaver|you are a lifesaver|couldn't have done (?:it|this) without you|means the world to me|this is exactly what i needed|feels? so much better|relief to have this done|smells? (?:wonderful|amazing|so good)|tastes? (?:wonderful|amazing|so good)|splendid work|wonderful job)\b/i;
    if (charConfirmRegex.test(assistantText)) {
      return { completed: true, reason: "Character explicitly confirmed receiving items or acknowledged quest completion in dialogue." };
    }
  }

  // 2. User turn-in / delivery action in user message
  if (userMessage) {
    const lowerUser = userMessage.toLowerCase();

    // Explicit task completion declaration
    const taskDoneRegex = /\b(?:finished|completed|done with|accomplished|fulfilled|sorted out|took care of|resolved|handled)\s+(?:the|this|your)?\s*(?:task|quest|objective|mission|errand|favor|job|beans|satchel|supplies|riddle|notes|patrol)\b/i;
    if (taskDoneRegex.test(lowerUser)) {
      return { completed: true, reason: "User explicitly reported finishing the task/quest in message." };
    }

    // Handing over / giving / bringing items or reporting ready
    const turnInActionRegex = /\b(?:giving|giv(?:e|es|en)|hand(?:s|ed)?(?:\s+over)?|brought|bring(?:s|ing)?|deliver(?:s|ed|ing)?|present(?:s|ed|ing)?|return(?:s|ed|ing)?\s+with|collected|got|found|brewed|made|crafted|prepared|here is|here are|here's|here you go|got you|all set)\b/i;
    if (turnInActionRegex.test(lowerUser)) {
      for (const kw of keywords) {
        if (kw.length >= 3 && lowerUser.includes(kw)) {
          return { completed: true, reason: `User performed delivery/completion action with relevant quest keyword: "${kw}".` };
        }
      }
    }
  }

  return { completed: false, reason: "No heuristic match" };
}

async function finalizeQuestCompletion(questId: string, personalityId?: string): Promise<{
  quest: any;
  gameState: any;
  rewardItems: any[];
  relationshipMetrics: any;
  characterState?: any;
  personality?: any;
}> {
  const quests = await loadQuests();
  const quest = quests.find((q: any) => q.quest_id === questId);
  if (!quest) throw new Error("Quest not found");

  quest.status = "completed";
  quest.completedAt = new Date().toISOString();
  await saveQuests(quests);

  const targetPid = personalityId || quest.characterId;

  // Apply Inventory Rewards
  const gameState = await loadUserGameState();
  if (Array.isArray(quest.rewards?.items) && quest.rewards.items.length > 0) {
    for (const item of quest.rewards.items) {
      gameState.inventory.unshift({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        item_name: item.item_name,
        item_description: item.item_description,
        acquiredAt: new Date().toISOString(),
        questTitle: quest.title,
        characterName: quest.characterName || "Character",
        characterId: targetPid,
      });
    }
    await saveUserGameState(gameState);
  }

  // Record Memory Palace Drawer & Character State Shift
  let characterState: any = null;
  let updatedPersonality: any = null;
  if (targetPid) {
    try {
      await addDrawer(targetPid, {
        hall: "events",
        wing: "Companionship & Deeds",
        room: "Heroic Triumphs",
        content: `Completed Quest: "${quest.title}". Accomplished the objective: ${quest.description}. This deepened mutual trust and proved their dependable bond.`,
        entities: [quest.characterName || "Character", "User", quest.title],
        importance: quest.difficulty === "Hard" ? 9 : quest.difficulty === "Medium" ? 7 : 5,
      }).catch(() => {});

      const personalities = await loadPersonalities();
      const character = personalities.find((p: any) => p.id === targetPid);
      if (character) {
        const charState = ensureCharacterState(character);
        const metrics = quest.rewards?.relationship_metrics || {};
        const trustBonus = metrics.trust ?? (quest.difficulty === "Hard" ? 15 : quest.difficulty === "Medium" ? 10 : 6);
        const stressRelief = quest.difficulty === "Hard" ? 20 : quest.difficulty === "Medium" ? 12 : 8;
        charState.trust = Math.min(100, (charState.trust || 50) + trustBonus);
        charState.stress = Math.max(0, (charState.stress || 20) - stressRelief);
        charState.mood = `Appreciative and fulfilled after completing "${quest.title}"`;
        character.state = charState;
        characterState = charState;
        updatedPersonality = character;
        await savePersonalities(personalities);
      }
    } catch (memErr) {
      console.warn("Could not record quest completion to memory palace/state:", memErr);
    }
  }

  return {
    quest,
    gameState,
    rewardItems: quest.rewards?.items || [],
    relationshipMetrics: quest.rewards?.relationship_metrics || {},
    characterState,
    personality: updatedPersonality,
  };
}

async function evaluateQuestCompletion(params: {
  questConfig?: any;
  activeQuest: any;
  characterName: string;
  userName: string;
  recentHistoryStr: string;
  userMessage: string;
  assistantReply?: string;
  model?: string;
  apiKey?: string;
}): Promise<{ completed: boolean; reason: string }> {
  const { activeQuest, characterName, userName, recentHistoryStr, userMessage, assistantReply, model, apiKey } = params;

  // 1. First run fast heuristic check
  const heuristic = heuristicCheckQuestCompletion(activeQuest, userMessage, assistantReply, recentHistoryStr);
  if (heuristic.completed) {
    return heuristic;
  }

  // 2. If heuristic was inconclusive, run dedicated Quest Engine neural model evaluation
  try {
    const rewardNames = (activeQuest.rewards?.items || []).map((i: any) => i.item_name).join(", ") || "token of gratitude";
    const sensitivity = params.questConfig?.autoResolutionSensitivity || 4;
    const leniencyGuidance = sensitivity >= 4 ? 
        "Evaluate generously. If the user implies, attempts, or narratively delivers on the objective, consider it complete." :
        (sensitivity <= 2 ? "Evaluate strictly. The user must explicitly perform the actions required to complete the objective in clear terms." : "Evaluate normally.");
    
    const evalPrompt = `[STAGE 3: QUEST ENGINE OBJECTIVE RESOLUTION EVALUATOR]
Sensitivity Guidance: ${leniencyGuidance}

Character: ${characterName}
User: ${userName}
Active Quest Title: "${activeQuest.title}"
Active Quest Goal/Description: "${activeQuest.description}"
Offered Reward: ${rewardNames}

Roleplay Narrative Context:
In narrative roleplay, the user and character may adapt, negotiate, or specify the quest objective in dialogue (e.g., fetching items, brewing tea, investigating a sound, calming tension, solving a riddle, or delivering supplies).

Recent Conversation Context:
${recentHistoryStr}
${userMessage ? `${userName}: ${userMessage}` : ""}
${assistantReply ? `${characterName}: ${assistantReply}` : ""}

Task:
Determine whether the quest objective has been fulfilled, delivered, or accomplished in the narrative.
Mark COMPLETED if ANY of the following are true:
1. The user has brought, handed over, delivered, collected, or reported completion of the required item(s) or task.
2. The user has explicitly or through action satisfied what the character asked for in the narrative.
3. The character in recent dialogue has recognized, accepted, or confirmed the task as done (e.g. thanking them for the items, admiring the delivery, celebrating completion, or bestowing the reward).

Respond strictly in JSON:
{"quest_completed": true | false, "confidence_reason": "brief explanation"}`;

    const neuralCfg = await loadNeuralModelsConfig();
    const evalModel = model || neuralCfg.questEngineModel || neuralCfg.defaultModel || "";

    const evalResp = await executeUniversalInference({
      fallbackModel: neuralCfg.fallbackModel,
      model: evalModel,
      prompt: evalPrompt,
      responseMimeType: "application/json",
      customApiKey: apiKey,
      maxTokens: 250,
    });

    const parsed = parseQuestEvalResponse(evalResp);
    if (parsed && typeof parsed.quest_completed === "boolean") {
      return { completed: parsed.quest_completed, reason: parsed.confidence_reason || "Quest model evaluated completion" };
    }
  } catch (err: any) {
    console.warn("Dedicated Quest Engine evaluation encountered an error:", err);
    throw err;
  }

  return { completed: false, reason: "Inconclusive" };
}

/**
 * Isolated Quest Engine Turn Service:
 * Routes chat inputs and outputs to a dedicated neural model tasked strictly with evaluating
 * quest objective fulfillment, acceptance, or narrative milestones.
 */
async function evaluateQuestEngineTurn(params: {
  questConfig: QuestingSystemConfig;
  allQuests: any[];
  personalityId: string;
  characterName: string;
  userName: string;
  userMessage: string;
  assistantReply?: string;
  recentHistoryStr: string;
  questEngineModel?: string;
  apiKey?: string;
}): Promise<{
  acceptedQuest?: any;
  declinedQuest?: any;
  completedQuest?: any;
  systemInjectionNote?: string;
}> {
  const {
    questConfig,
    allQuests,
    personalityId,
    characterName,
    userName,
    userMessage,
    assistantReply,
    recentHistoryStr,
    questEngineModel,
    apiKey,
  } = params;

  let acceptedQuest: any = null;
  let declinedQuest: any = null;
  let completedQuest: any = null;
  let systemInjectionNote: string | undefined = undefined;

  // 1. Evaluate Proposed Quest Acceptance / Refusal
  const proposedQuest = allQuests.find((q: any) => q.characterId === personalityId && q.status === "proposed");
  if (proposedQuest && userMessage) {
    const lower = userMessage.toLowerCase();
    const affirmativeRegex = /\b(sure|yes|yeah|yep|ok|okay|i can|i will|i'll|i'd love to|help|deal|gladly|happy to|count me in|on it|let's do it|sounds good|absolutely|of course|no problem|consider it done|agreed|take care of it|ready|count on me)\b/i;
    const refusalRegex = /\b(no|can't|cannot|refuse|nah|decline|don't want to|not now|never|won't|skip|pass|sorry|busy|not interested|another time|not going to)\b/i;

    if (affirmativeRegex.test(lower) && !refusalRegex.test(lower)) {
      proposedQuest.status = "in_progress";
      await saveQuests(allQuests);
      acceptedQuest = proposedQuest;
    } else if (refusalRegex.test(lower) && !affirmativeRegex.test(lower)) {
      proposedQuest.status = "available";
      await saveQuests(allQuests);
      declinedQuest = proposedQuest;
    }
  }

  // 2. Evaluate Active Quest Completion
  const activeQuests = allQuests.filter(
    (q: any) => q.characterId === personalityId && (q.status === "in_progress" || q.status === "pending_payout" || q.status === "active")
  );

  for (const activeQuest of activeQuests) {
    const evalResult = await evaluateQuestCompletion({
      questConfig,
      activeQuest,
      characterName,
      userName,
      recentHistoryStr,
      userMessage,
      assistantReply,
      model: questEngineModel,
      apiKey,
    });

    if (evalResult.completed) {
      const finalizeResult = await finalizeQuestCompletion(activeQuest.quest_id, personalityId);
      completedQuest = finalizeResult.quest;

      if (questConfig.enableAutomatedQuestNarrativeInjections !== false) {
        const rewardSummary = (completedQuest.rewards?.items || []).map((i: any) => i.item_name).filter(Boolean).join(", ") || "relationship rewards";
        systemInjectionNote = `[SYSTEM NOTE: Quest "${completedQuest.title}" Completed. User fulfilled: "${completedQuest.description}". Rewards Granted: ${rewardSummary}. Acknowledge this triumph and transition seamlessly in your next response.]`;
      }
      break;
    }
  }

  return {
    acceptedQuest,
    declinedQuest,
    completedQuest,
    systemInjectionNote,
  };
}

// Generate contextually relevant character quests via Game Logic Engine
app.post("/api/generate-quests", async (req, res) => {
  const {
    character_name,
    character_personality,
    current_scene,
    current_vitals,
    current_effects,
    lore_context,
    mem_palace_summary,
    personalityId,
    model,
    customApiKey,
  } = req.body || {};

  const neuralConfig = await loadNeuralModelsConfig();
  const targetModel = model || neuralConfig.questEngineModel || neuralConfig.defaultModel || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";
  const questConfig = await loadQuestingSystemConfig();
  const existingQuests = await loadQuests();
  const activeCharQuests = existingQuests.filter((q: any) => q.characterId === personalityId && ["in_progress", "proposed", "active"].includes(q.status));
  
  if (activeCharQuests.length >= (questConfig.maxActiveQuests || 3)) {
    return res.json([]);
  }

  const avoidTitles = activeCharQuests.map((q: any) => `"${q.title}"`).join(", ");
  const basePromptTemplate = questConfig.customPromptTemplate || "You are an underlying game logic engine for an interactive roleplay system. Your job is to analyze the character's current state and generate contextually relevant desires or tasks.";
  const maxToGen = (questConfig.maxActiveQuests || 3) - activeCharQuests.length;

  const prompt = `${basePromptTemplate}

The generation prompt feeds on the character's current state: Personality + Scene + Vitals/Effects + Lore Book + recent MemPalace entries.

### CURRENT CONTEXT:
- Character Name: ${character_name || "Character"}
- Character Personality: ${character_personality || "Complex, thoughtful"}
- Current Scene: ${current_scene || "Quiet room"}
- Current Vitals/Effects: ${current_vitals || "Healthy (100/100)"} / ${current_effects || "None"}
- Relevant Lore: ${lore_context || "Local regional history"}
- Recent Events/Memories: ${mem_palace_summary || "Recent shared dialogues"}

### INSTRUCTIONS:
1. Generate exactly ${maxToGen} active desires or tasks that align tightly with the character's immediate personal needs, current physical scene, vitals/mood, and lore.
2. Avoid generating duplicate quests. DO NOT generate quests similar to: ${avoidTitles || "None active currently"}.
3. ${questConfig.explicitObjectives ? "Provide strict, explicit text goals (e.g. 'Fetch the water')." : "Provide open-ended, atmospheric objectives (e.g. 'Find a way to quench the thirst')."}
4. Target Quest Difficulty: ${questConfig.dynamicObjectiveScaling ? "Adaptive based on current Vitals/Effects" : questConfig.questDifficulty || "Medium"}. Adjust the complexity appropriately.
5. Rewards must include relationship_metrics (Affinity, Trust, Harmonic_Bond).
6. Respond ONLY with a valid JSON array containing exactly ${maxToGen} quest objects. Do not include markdown.

### JSON SCHEMA OUTPUT FORMAT:
[
  {
    "quest_id": "unique_string_slug",
    "title": "Quest Title",
    "description": "Objective description",
    "character_motivation": "Why they want this",
    "difficulty": "Easy" | "Medium" | "Hard",
    "trigger_prompt": "A natural question to organically introduce this quest.",
    "rewards": {
      "relationship_metrics": { "affinity": 15, "trust": 10, "harmonic_bond": 8 },
      "items": [ { "item_name": "Item", "item_description": "Description" } ]
    }
  }
]`;

  try {
    const responseText = await executeUniversalInference({ fallbackModel: (await loadNeuralModelsConfig()).fallbackModel,
      model: targetModel,
      prompt,
      responseMimeType: "application/json",
      customApiKey,
      maxTokens: 3000,
    });
    
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }

    let parsed: any;
    try {
      cleaned = jsonrepair(cleaned);
      parsed = JSON.parse(cleaned);
    } catch (e: any) {
      if (e.message.includes("Unterminated string") || e.message.includes("Unexpected end of JSON")) {
        try {
          let fixed = cleaned;
          if ((fixed.match(/"/g) || []).length % 2 !== 0) {
            fixed += '"';
          }
          if (!fixed.endsWith("]")) {
            if (!fixed.endsWith("}")) fixed += "\n}";
            fixed += "\n]";
          }
          parsed = JSON.parse(fixed);
        } catch (innerE) {
          parsed = { memory_notes: [] };
        }
      } else {
        parsed = { memory_notes: [] };
      }
    }

    let questArray: any[] = [];
    if (Array.isArray(parsed)) {
      questArray = parsed;
    } else if (parsed && Array.isArray(parsed.quests)) {
      questArray = parsed.quests;
    } else if (parsed && typeof parsed === "object") {
      questArray = [parsed];
    }
    
    questArray = questArray.filter(q => q && q.quest_id);

    questArray.forEach(q => {
      q.characterId = personalityId;
      q.status = "proposed";
      q.progress = 0;
    });

    const allQuests = await loadQuests();
    const existingIds = new Set(allQuests.map((q: any) => q.quest_id));
    const newOnes = questArray.filter(q => !existingIds.has(q.quest_id));
    
    if (newOnes.length > 0) {
      allQuests.push(...newOnes);
      await saveQuests(allQuests);
    }
    
    res.json(newOnes);
  } catch (error: any) {
    console.error("Game Logic Engine - Quest Generation Error:", error);
    res.status(500).json({ error: "Failed to generate dynamic quests", details: error.message });
  }
});

app.get("/api/questing-system/config", async (req, res) => {
  const config = await loadQuestingSystemConfig();
  res.json(config);
});

app.post("/api/questing-system/config", async (req, res) => {
  try {
    const config: QuestingSystemConfig = { ...DEFAULT_QUESTING_SYSTEM_CONFIG, ...req.body };
    await saveQuestingSystemConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: "Failed to save questing system config" });
  }
});

// Get all quests or by personality
app.post("/api/quests/purge", async (req, res) => {
  try {
    const type = req.query.type as string;
    let quests = await loadQuests();
    if (type === "active") {
      quests = quests.filter((q: any) => !["in_progress", "proposed", "active", "pending_payout"].includes(q.status));
    } else if (type === "completed") {
      quests = quests.filter((q: any) => q.status !== "completed");
    } else if (type === "failed") {
      quests = quests.filter((q: any) => q.status !== "failed");
    } else if (type === "all") {
      quests = [];
    }
    await saveQuests(quests);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to purge quests" });
  }
});

app.get("/api/quests", async (req, res) => {
  try {
    const { personalityId } = req.query;
    let quests = await loadQuests();

    // Catch-up check: If any in_progress/pending_payout/active quest already has completion dialogue in recent chat history, finalize it
    const targetPid = typeof personalityId === "string" ? personalityId : undefined;
    const activeQuests = quests.filter((q: any) => 
      (q.status === "in_progress" || q.status === "pending_payout" || q.status === "active") &&
      (!targetPid || q.characterId === targetPid)
    );

    let hasUpdates = false;
    for (const aq of activeQuests) {
      if (aq.characterId) {
        try {
          const hist = await loadHistory(aq.characterId);
          if (hist && hist.length > 0) {
            const recentText = hist.slice(-6).map((c: any) => {
              const role = c.role === "user" ? "User" : (aq.characterName || "Character");
              const text = c.parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "";
              return `${role}: ${text}`;
            }).join("\n\n");

            const check = heuristicCheckQuestCompletion(aq, "", "", recentText);
            if (check.completed) {
              await finalizeQuestCompletion(aq.quest_id, aq.characterId);
              hasUpdates = true;
            }
          }
        } catch (syncErr) {
          console.warn("Could not check quest sync from history:", syncErr);
        }
      }
    }

    if (hasUpdates) {
      quests = await loadQuests();
    }

    if (personalityId) {
      return res.json(quests.filter((q: any) => q.characterId === personalityId));
    }
    res.json(quests);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// Explicit on-demand quest evaluation against recent chat history using dedicated Quest Engine Model
app.post("/api/quests/evaluate-chat", async (req, res) => {
  try {
    const { personalityId, characterName, userName, customApiKey } = req.body || {};
    if (!personalityId) {
      return res.status(400).json({ error: "personalityId is required" });
    }
    const allQuests = await loadQuests();
    const activeQuests = allQuests.filter(
      (q: any) => q.characterId === personalityId && (q.status === "in_progress" || q.status === "pending_payout" || q.status === "active")
    );

    if (activeQuests.length === 0) {
      return res.json({ completedQuests: [] });
    }

    const hist = await loadHistory(personalityId);
    const recentHistoryStr = hist.slice(-8).map((c: any) => {
      const role = c.role === "user" ? (userName || "User") : (characterName || "Character");
      const text = c.parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "";
      return `${role}: ${text}`;
    }).join("\n\n");

    const questConfig = await loadQuestingSystemConfig();
    const neuralConfig = await loadNeuralModelsConfig();
    const completedQuests: any[] = [];

    for (const aq of activeQuests) {
      const evalResult = await evaluateQuestCompletion({
        questConfig,
        activeQuest: aq,
        characterName: characterName || "Character",
        userName: userName || "User",
        recentHistoryStr,
        userMessage: "",
        model: neuralConfig.questEngineModel,
        apiKey: customApiKey,
      });

      if (evalResult.completed) {
        const result = await finalizeQuestCompletion(aq.quest_id, personalityId);
        completedQuests.push(result.quest);
      }
    }

    res.json({ success: true, completedQuests });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to evaluate quests" });
  }
});

// Save or create a quest
app.post("/api/quests", async (req, res) => {
  try {
    const quest = req.body;
    if (!quest || !quest.title) {
      return res.status(400).json({ error: "Title is required" });
    }
    const quests = await loadQuests();
    const qId = quest.quest_id || `quest_${Date.now()}`;
    const normalized = {
      ...quest,
      quest_id: qId,
      status: quest.status || "available",
      createdAt: quest.createdAt || new Date().toISOString(),
    };
    const idx = quests.findIndex((q: any) => q.quest_id === qId);
    if (idx >= 0) {
      quests[idx] = normalized;
    } else {
      quests.unshift(normalized);
    }
    await saveQuests(quests);
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// Update quest status
app.patch("/api/quests/:questId/status", async (req, res) => {
  try {
    const { questId } = req.params;
    const { status } = req.body;
    const quests = await loadQuests();
    const quest = quests.find((q: any) => q.quest_id === questId);
    if (!quest) return res.status(404).json({ error: "Quest not found" });

    quest.status = status;
    if (status === "completed") {
      quest.completedAt = new Date().toISOString();
    }
    await saveQuests(quests);
    res.json(quest);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// Complete a quest and claim rewards (items, relationship metrics, memory palace)
app.post("/api/quests/:questId/complete", async (req, res) => {
  try {
    const { questId } = req.params;
    const { personalityId } = req.body || {};
    const result = await finalizeQuestCompletion(questId, personalityId);

    res.json({
      success: true,
      quest: result.quest,
      gameState: result.gameState,
      rewardItems: result.rewardItems,
      relationshipMetrics: result.relationshipMetrics,
      characterState: result.characterState,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// Delete a quest
app.delete("/api/quests/:questId", async (req, res) => {
  try {
    const { questId } = req.params;
    const quests = await loadQuests();
    const filtered = quests.filter((q: any) => q.quest_id !== questId);
    await saveQuests(filtered);
    res.json({ success: true, quest_id: questId });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// User Game State (Inventory)
app.get("/api/user-game-state", async (req, res) => {
  try {
    const state = await loadUserGameState();
    const { personalityId } = req.query;
    if (personalityId && typeof personalityId === "string") {
      const personalities = await loadPersonalities();
      const p = personalities.find((x: any) => x.id === personalityId);
      const filtered = state.inventory.filter((item: any) => {
        if (item.characterId && item.characterId === personalityId) return true;
        if (p && item.characterName && item.characterName.toLowerCase() === p.name?.toLowerCase()) return true;
        return false;
      });
      return res.json({ inventory: filtered });
    }
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/user-game-state", async (req, res) => {
  try {
    const { inventory } = req.body || {};
    const state = await loadUserGameState();
    if (Array.isArray(inventory)) state.inventory = inventory;
    await saveUserGameState(state);
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// Delete a specific inventory item
app.delete("/api/user-game-state/items/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const state = await loadUserGameState();
    state.inventory = state.inventory.filter((item: any) => item.id !== itemId);
    await saveUserGameState(state);
    res.json({ success: true, inventory: state.inventory });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// Purge inventory items linked to a specific personality / chat
app.delete("/api/user-game-state/items", async (req, res) => {
  try {
    const { personalityId } = req.query;
    const state = await loadUserGameState();
    if (personalityId && typeof personalityId === "string") {
      const personalities = await loadPersonalities();
      const p = personalities.find((x: any) => x.id === personalityId);
      state.inventory = state.inventory.filter((item: any) => {
        if (item.characterId && item.characterId === personalityId) return false;
        if (p && item.characterName && item.characterName.toLowerCase() === p.name?.toLowerCase()) return false;
        return true;
      });
    } else {
      state.inventory = [];
    }
    await saveUserGameState(state);
    res.json({ success: true, inventory: state.inventory });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

const USER_PERSONA_FILE = path.join(DATA_DIR, "user_persona.json");
const USER_PERSONAS_LIST_FILE = path.join(DATA_DIR, "user_personas_list.json");

app.get("/api/user-personas", async (req, res) => {
  try {
    const data = await fs.readFile(USER_PERSONAS_LIST_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    try {
      // Fallback: migrate from single active persona
      const activeData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
      const activePersona = JSON.parse(activeData);
      if (!activePersona.id) activePersona.id = Date.now().toString();
      res.json([activePersona]);
    } catch {
      res.json([]);
    }
  }
});

app.post("/api/user-personas", async (req, res) => {
  try {
    await fs.writeFile(USER_PERSONAS_LIST_FILE, JSON.stringify(req.body, null, 2), "utf-8");
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: "Failed to save user personas list" });
  }
});

app.get("/api/user-persona", async (req, res) => {
  try {
    const data = await fs.readFile(USER_PERSONA_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.json({ name: "User" });
  }
});

app.post("/api/user-persona", async (req, res) => {
  try {
    await fs.writeFile(USER_PERSONA_FILE, JSON.stringify(req.body, null, 2), "utf-8");
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: "Failed to save user persona" });
  }
});

app.put("/api/personalities/:id", async (req, res) => {
  const { id } = req.params;
  const { name, personality, traits, scenario, scenarioId, appearance, age, gender, orientation, systemInstruction, description, avatar, state, customBackgroundUrl, customBackgroundOpacity } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const personalities = await loadPersonalities();
  const index = personalities.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Personality not found" });
  }
  
  const personalityVal = (personality || traits || "").trim();
  const prevScenarioId = personalities[index].scenarioId;
  const newScenarioId = (scenarioId || "").trim();

  personalities[index] = {
    ...personalities[index],
    name: name.trim(),
    personality: personalityVal,
    traits: personalityVal,
    scenario: (scenario || "").trim(),
    scenarioId: newScenarioId,
    appearance: (appearance || "").trim(),
    age: (age || "").trim(),
    gender: (gender || "").trim(),
    orientation: (orientation || "").trim(),
    systemInstruction: (systemInstruction || "").trim(),
    description: (description || "").trim(),
    avatar: avatar !== undefined ? (avatar || "").trim() : personalities[index].avatar,
    customBackgroundUrl: customBackgroundUrl !== undefined ? (customBackgroundUrl || "").trim() : personalities[index].customBackgroundUrl,
    customBackgroundOpacity: customBackgroundOpacity !== undefined ? customBackgroundOpacity : personalities[index].customBackgroundOpacity,
    state: state !== undefined ? ensureCharacterState({ ...personalities[index], state }) : ensureCharacterState(personalities[index]),
  };
  
  await savePersonalities(personalities);

  // Synchronize scenario allocations
  const scenarios = await loadScenarios();
  let scenariosChanged = false;

  // If previous scenario changed or was unallocated, clear its characterId
  if (prevScenarioId && prevScenarioId !== newScenarioId) {
    const prevScen = scenarios.find((s: any) => s.id === prevScenarioId);
    if (prevScen && prevScen.characterId === id) {
      prevScen.characterId = null;
      scenariosChanged = true;
    }
  }

  // If new scenario is selected, allocate this character to it
  if (newScenarioId) {
    const targetScen = scenarios.find((s: any) => s.id === newScenarioId);
    if (targetScen) {
      // If another character was previously allocated to this scenario, clear their scenarioId
      if (targetScen.characterId && targetScen.characterId !== id) {
        const otherChar = personalities.find((p: any) => p.id === targetScen.characterId);
        if (otherChar) {
          otherChar.scenarioId = "";
          await savePersonalities(personalities);
        }
      }
      targetScen.characterId = id;
      scenariosChanged = true;
    }
  }

  if (scenariosChanged) {
    await saveScenarios(scenarios);
  }

  res.json(personalities[index]);
});

app.post("/api/personalities", async (req, res) => {
  const { name, personality, traits, scenario, scenarioId, appearance, age, gender, orientation, systemInstruction, description, avatar, state, customBackgroundUrl, customBackgroundOpacity } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const personalities = await loadPersonalities();
  const personalityVal = (personality || traits || "").trim();
  const targetScenarioId = (scenarioId || "").trim();
  const newPersonality = {
    id: uuidv4(),
    name: name.trim(),
    personality: personalityVal,
    traits: personalityVal,
    scenario: (scenario || "").trim(),
    scenarioId: targetScenarioId,
    appearance: (appearance || "").trim(),
    age: (age || "").trim(),
    gender: (gender || "").trim(),
    orientation: (orientation || "").trim(),
    systemInstruction: (systemInstruction || "").trim(),
    description: (description || "").trim(),
    avatar: (avatar || "").trim(),
    customBackgroundUrl: (customBackgroundUrl || "").trim(),
    customBackgroundOpacity: customBackgroundOpacity !== undefined ? customBackgroundOpacity : 1,
    state: state ? ensureCharacterState({ state }) : ensureCharacterState({}),
  };
  personalities.push(newPersonality);
  await savePersonalities(personalities);

  // Synchronize scenario allocation if a scenario was allocated
  if (targetScenarioId) {
    const scenarios = await loadScenarios();
    const targetScen = scenarios.find((s: any) => s.id === targetScenarioId);
    if (targetScen) {
      if (targetScen.characterId) {
        const otherChar = personalities.find((p: any) => p.id === targetScen.characterId);
        if (otherChar) {
          otherChar.scenarioId = "";
          await savePersonalities(personalities);
        }
      }
      targetScen.characterId = newPersonality.id;
      await saveScenarios(scenarios);
    }
  }

  res.json(newPersonality);
});

// Dedicated dynamic character state endpoints
app.get("/api/personalities/:id/state", async (req, res) => {
  const { id } = req.params;
  const personalities = await loadPersonalities();
  const personality = personalities.find((p: any) => p.id === id);
  if (!personality) {
    return res.status(404).json({ error: "Personality not found" });
  }
  const state = ensureCharacterState(personality);
  res.json({ state, personality });
});

app.put("/api/personalities/:id/state", async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;
  if (!state || typeof state !== "object") {
    return res.status(400).json({ error: "State object is required" });
  }
  const personalities = await loadPersonalities();
  const index = personalities.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Personality not found" });
  }
  const validatedState = ensureCharacterState({ state });
  personalities[index].state = validatedState;
  await savePersonalities(personalities);
  res.json({ success: true, state: validatedState, personality: personalities[index] });
});

app.post("/api/personalities/:id/infer-state", async (req, res) => {
  try {
    const { id } = req.params;
    const { model, customApiKey } = req.body || {};
    const personalities = await loadPersonalities();
    const index = personalities.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Personality not found" });
    }
    const personality = personalities[index];
    let userPersona: any = { name: "User" };
    try {
      const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
      userPersona = JSON.parse(uData);
    } catch {}

    const contents = await loadHistory(id);
    const neuralConfig = await loadNeuralModelsConfig();
    const targetModel = model || neuralConfig.characterStateModel || neuralConfig.defaultModel || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";

    if (model) {
      setActiveSessionModel(model, customApiKey);
    }

    const evalResult = await evaluateDynamicCharacterState({
      personality,
      history: contents,
      userPersonaName: userPersona?.name || "User",
      model: targetModel,
      customApiKey,
      executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: (await loadNeuralModelsConfig()).fallbackModel }),
      moodEngineConfig: await loadMoodEngineConfig(),
    });

    personalities[index].state = evalResult.updatedState;
    await savePersonalities(personalities);

    // If there were state shifts recorded into memory notes, save to palace
    if (evalResult.memoryNotes && evalResult.memoryNotes.length > 0) {
      for (const note of evalResult.memoryNotes) {
        await addDrawer(id, note).catch(() => {});
      }
    }

    res.json({
      success: true,
      state: evalResult.updatedState,
      shifts: evalResult.shifts,
      personality: personalities[index],
      modelUsed: targetModel,
    });
  } catch (err: any) {
    console.error("Failed to infer character state:", err);
    res.status(500).json({ error: err.message || "Failed to infer character state" });
  }
});

// Dynamic Default State & Neural Models Configuration
const DEFAULT_MODEL_FILE = path.join(DATA_DIR, "default_model.json");

async function loadNeuralModelsConfig(): Promise<NeuralModelsConfig> {
  try {
    const data = await fs.readFile(DEFAULT_MODEL_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return {
      defaultModel: (parsed.defaultModel && typeof parsed.defaultModel === "string") ? parsed.defaultModel.trim() : (process.env.DEFAULT_MODEL || DEFAULT_NEURAL_MODELS_CONFIG.defaultModel),
      characterStateModel: (parsed.characterStateModel && typeof parsed.characterStateModel === "string") ? parsed.characterStateModel.trim() : (process.env.CHARACTER_STATE_MODEL || DEFAULT_NEURAL_MODELS_CONFIG.characterStateModel),
      questEngineModel: (parsed.questEngineModel && typeof parsed.questEngineModel === "string") ? parsed.questEngineModel.trim() : (process.env.QUEST_ENGINE_MODEL || DEFAULT_NEURAL_MODELS_CONFIG.questEngineModel),
      fallbackModel: (parsed.fallbackModel && typeof parsed.fallbackModel === "string") ? parsed.fallbackModel.trim() : (process.env.FALLBACK_MODEL || DEFAULT_NEURAL_MODELS_CONFIG.fallbackModel),
      mempalaceModel: (parsed.mempalaceModel && typeof parsed.mempalaceModel === "string") ? parsed.mempalaceModel.trim() : (process.env.MEMPALACE_MODEL || parsed.defaultModel || DEFAULT_NEURAL_MODELS_CONFIG.mempalaceModel || "gemini-3.8-flash"),
    };
  } catch {
    return { ...DEFAULT_NEURAL_MODELS_CONFIG };
  }
}

async function saveNeuralModelsConfig(updates: Partial<NeuralModelsConfig>): Promise<NeuralModelsConfig> {
  const current = await loadNeuralModelsConfig();
  const merged: NeuralModelsConfig = {
    defaultModel: (updates.defaultModel && typeof updates.defaultModel === "string" && updates.defaultModel.trim())
      ? updates.defaultModel.trim()
      : current.defaultModel,
    characterStateModel: (updates.characterStateModel && typeof updates.characterStateModel === "string" && updates.characterStateModel.trim())
      ? updates.characterStateModel.trim()
      : current.characterStateModel,
    questEngineModel: (updates.questEngineModel && typeof updates.questEngineModel === "string" && updates.questEngineModel.trim())
      ? updates.questEngineModel.trim()
      : current.questEngineModel,
    fallbackModel: (updates.fallbackModel && typeof updates.fallbackModel === "string" && updates.fallbackModel.trim())
      ? updates.fallbackModel.trim()
      : current.fallbackModel,
    mempalaceModel: (updates.mempalaceModel && typeof updates.mempalaceModel === "string" && updates.mempalaceModel.trim())
      ? updates.mempalaceModel.trim()
      : (current.mempalaceModel || current.defaultModel),
  };

  await fs.writeFile(
    DEFAULT_MODEL_FILE,
    JSON.stringify({ ...merged, updatedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );

  if (updates.defaultModel) {
    setActiveSessionModel(merged.defaultModel);
  }

  return merged;
}

async function loadPersistedDefaultModel(): Promise<string> {
  const config = await loadNeuralModelsConfig();
  return config.defaultModel;
}

async function savePersistedDefaultModel(model: string): Promise<void> {
  await saveNeuralModelsConfig({ defaultModel: model });
}

// Automatically sync persisted default model into active session state on startup
loadNeuralModelsConfig().then((cfg) => {
  if (cfg.defaultModel) setActiveSessionModel(cfg.defaultModel);
}).catch(() => {});

app.get("/api/neural-models-config", async (req, res) => {
  try {
    const config = await loadNeuralModelsConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load neural models config" });
  }
});

app.post("/api/neural-models-config", async (req, res) => {
  try {
    const updates = req.body || {};
    const updated = await saveNeuralModelsConfig(updates);
    res.json({ success: true, ...updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save neural models config" });
  }
});

app.get("/api/default-model", async (req, res) => {
  const defaultModel = await loadPersistedDefaultModel();
  res.json({ defaultModel });
});

app.post("/api/default-model", async (req, res) => {
  const { defaultModel } = req.body || {};
  if (defaultModel && typeof defaultModel === "string" && defaultModel.trim()) {
    const trimmed = defaultModel.trim();
    await savePersistedDefaultModel(trimmed);
    res.json({ success: true, defaultModel: trimmed });
  } else {
    res.status(400).json({ error: "Invalid or missing defaultModel" });
  }
});

app.get("/api/active-model", (req, res) => {
  res.json({
    model: getActiveSessionModel() || process.env.DEFAULT_MODEL || "",
  });
});

app.post("/api/active-model", (req, res) => {
  const { model, customApiKey } = req.body || {};
  if (model) {
    setActiveSessionModel(model, customApiKey);
  }
  res.json({
    success: true,
    model: getActiveSessionModel(),
  });
});

app.delete("/api/personalities/:id", async (req, res) => {
  const { id } = req.params;
  const personalities = await loadPersonalities();
  const filtered = personalities.filter((p: any) => p.id !== id);
  await savePersonalities(filtered);

  // Clear scenario allocations pointing to this deleted character
  const scenarios = await loadScenarios();
  let scenariosChanged = false;
  for (const s of scenarios) {
    if (s.characterId === id) {
      s.characterId = null;
      scenariosChanged = true;
    }
  }
  if (scenariosChanged) {
    await saveScenarios(scenarios);
  }

  res.json({ success: true, id });
});

app.get("/api/personalities/:id/export", async (req, res) => {
  try {
    const { id } = req.params;
    const personalities = await loadPersonalities();
    const personality = personalities.find((p: any) => p.id === id);
    if (!personality) {
      return res.status(404).json({ error: "Personality not found" });
    }

    // 1. All chat history linked to this personality
    const chatHistory = await loadHistory(id);

    // 2. All memories / MemPalace linked to this personality
    const mempalace = await getPalace(id, personality.name);

    // 3. Scenarios linked to this personality
    const scenarios = await loadScenarios();
    const linkedScenarios: any[] = [];
    if (personality.scenarioId) {
      const primary = scenarios.find((s: any) => s.id === personality.scenarioId);
      if (primary) linkedScenarios.push(primary);
    }
    for (const s of scenarios) {
      if (!linkedScenarios.some((ls: any) => ls.id === s.id)) {
        if (s.characterId === id || s.personalityId === id) {
          linkedScenarios.push(s);
        }
      }
    }
    // If no scenario found in scenarios.json, but personality has an inline scenario string
    if (linkedScenarios.length === 0 && personality.scenario && personality.scenario.trim().length > 0) {
      linkedScenarios.push({
        id: personality.scenarioId || uuidv4(),
        name: `${personality.name}'s Scenario`,
        description: personality.scenario.trim(),
        location: personality.state?.location || "Unknown",
        timeOfDay: "Day",
        context: personality.scenario.trim(),
        firstMessage: personality.firstMessage || "",
      });
    }

    // 4. Lore Books linked to this personality or its scenario(s)
    const lorebooks = await loadLoreBooks();
    const scenarioIds = new Set(linkedScenarios.map((s: any) => s.id));
    if (personality.scenarioId) scenarioIds.add(personality.scenarioId);

    const linkedLoreBooks = lorebooks.filter((lb: any) => {
      if (lb.scenarioId && scenarioIds.has(lb.scenarioId)) return true;
      if (lb.characterId === id || lb.personalityId === id) return true;
      if (personality.lorebookId && personality.lorebookId === lb.id) return true;
      if (Array.isArray(personality.lorebookIds) && personality.lorebookIds.includes(lb.id)) return true;
      if (lb.name && lb.name.toLowerCase().includes(personality.name.toLowerCase())) return true;
      return false;
    });

    // 5. Quests linked to this personality
    const quests = await loadQuests();
    const linkedQuests = quests.filter((q: any) =>
      q.characterId === id ||
      (q.characterName && q.characterName.toLowerCase() === personality.name.toLowerCase())
    );

    // 6. User Game State (Inventory items) awarded by or linked to this character
    const userGameState = await loadUserGameState();
    const linkedInventory = (userGameState.inventory || []).filter((item: any) =>
      item.characterId === id ||
      (item.characterName && item.characterName.toLowerCase() === personality.name.toLowerCase())
    );

    // 7. Dynamic character state (vitals, mood, trust, location, outfit, status effects)
    const characterState = personality.state || ensureCharacterState(personality);

    const exportData = {
      version: "2.0",
      type: "neverforget_export",
      exportedAt: new Date().toISOString(),
      personality,
      characterState,
      chatHistory,
      mempalace,
      scenario: linkedScenarios[0] || null,
      scenarios: linkedScenarios,
      lorebook: linkedLoreBooks[0] || null,
      lorebooks: linkedLoreBooks,
      quests: linkedQuests,
      inventory: linkedInventory,
    };

    res.json(exportData);
  } catch (err: any) {
    console.error("Error exporting personality:", err);
    res.status(500).json({ error: err.message || "Failed to export personality" });
  }
});

app.post("/api/personalities/import", async (req, res) => {
  try {
    const body = req.body || {};
    
    // 1. Resolve personality object
    let personality = body.personality;
    if (!personality) {
      if (body.data && body.data.name) {
        // TavernAI / Character Card V2 format
        const d = body.data;
        personality = {
          id: d.id || uuidv4(),
          name: d.name,
          personality: d.personality || d.description || "",
          traits: d.personality || d.description || "",
          appearance: d.appearance || "",
          systemInstruction: d.system_prompt || d.post_history_instructions || "",
          description: d.creator_notes || d.description || "",
          scenario: d.scenario || "",
          firstMessage: d.first_mes || "",
          avatar: d.avatar || "",
        };
      } else if (body.name && (body.personality || body.systemInstruction || body.description)) {
        personality = {
          id: body.id || uuidv4(),
          name: body.name,
          personality: body.personality || body.description || "",
          traits: body.traits || body.personality || body.description || "",
          appearance: body.appearance || "",
          systemInstruction: body.systemInstruction || "",
          description: body.description || "",
          scenario: body.scenario || "",
          firstMessage: body.firstMessage || "",
          avatar: body.avatar || "",
          scenarioId: body.scenarioId,
          state: body.state || body.characterState,
        };
      }
    }

    if (!personality || !personality.name) {
      return res.status(400).json({ error: "Invalid file format: No character personality found." });
    }

    if (!personality.id) {
      personality.id = uuidv4();
    }

    // 2. Scenarios: Import or create if does not exist
    const importedScenarios: any[] = [];
    if (Array.isArray(body.scenarios)) {
      for (const s of body.scenarios) {
        if (s && (s.name || s.context || s.description)) importedScenarios.push(s);
      }
    }
    if (body.scenario && typeof body.scenario === "object" && (body.scenario.name || body.scenario.context)) {
      if (!importedScenarios.some((s: any) => s.id === body.scenario.id)) {
        importedScenarios.push(body.scenario);
      }
    }
    // Fallback: If personality has inline scenario text and no scenario provided
    if (importedScenarios.length === 0 && personality.scenario && personality.scenario.trim().length > 0) {
      importedScenarios.push({
        id: personality.scenarioId || uuidv4(),
        name: `${personality.name}'s Scenario`,
        description: personality.scenario.trim(),
        location: personality.state?.location || "Unknown",
        timeOfDay: "Day",
        context: personality.scenario.trim(),
        firstMessage: personality.firstMessage || "",
      });
    }

    const existingScenarios = await loadScenarios();
    const createdScenarios: any[] = [];

    for (const scen of importedScenarios) {
      let existingScen = existingScenarios.find((s: any) => s.id === scen.id);
      if (!existingScen && scen.name) {
        existingScen = existingScenarios.find(
          (s: any) => s.name.trim().toLowerCase() === scen.name.trim().toLowerCase()
        );
      }

      if (!existingScen) {
        // Create new scenario with original details
        const newScen = {
          id: scen.id || uuidv4(),
          name: (scen.name || `${personality.name}'s Scenario`).trim(),
          description: (scen.description || "").trim(),
          location: (scen.location || "").trim(),
          timeOfDay: (scen.timeOfDay || "").trim(),
          context: (scen.context || scen.description || "").trim(),
          firstMessage: (scen.firstMessage || "").trim(),
        };
        existingScenarios.push(newScen);
        createdScenarios.push(newScen);
        if (!personality.scenarioId || personality.scenarioId === scen.id) {
          personality.scenarioId = newScen.id;
        }
      } else {
        // Link to existing scenario
        if (!personality.scenarioId || personality.scenarioId === scen.id) {
          personality.scenarioId = existingScen.id;
        }
      }
    }
    await saveScenarios(existingScenarios);

    // 3. Lore Books: Import or create if does not exist
    const importedLoreBooks: any[] = [];
    if (Array.isArray(body.lorebooks)) {
      for (const lb of body.lorebooks) {
        if (lb && lb.name) importedLoreBooks.push(lb);
      }
    }
    if (body.lorebook && typeof body.lorebook === "object" && body.lorebook.name) {
      if (!importedLoreBooks.some((lb: any) => lb.id === body.lorebook.id)) {
        importedLoreBooks.push(body.lorebook);
      }
    }

    const existingLoreBooks = await loadLoreBooks();
    const createdLoreBooks: any[] = [];

    for (const lb of importedLoreBooks) {
      let existingLb = existingLoreBooks.find((item: any) => item.id === lb.id);
      if (!existingLb && lb.name) {
        existingLb = existingLoreBooks.find(
          (item: any) => item.name.trim().toLowerCase() === lb.name.trim().toLowerCase()
        );
      }

      if (!existingLb) {
        // Create new lorebook with original details
        const newLb = {
          id: lb.id || uuidv4(),
          name: lb.name.trim(),
          description: (lb.description || "").trim(),
          scenarioId: lb.scenarioId || personality.scenarioId || null,
          entries: Array.isArray(lb.entries) ? lb.entries : [],
        };
        existingLoreBooks.push(newLb);
        createdLoreBooks.push(newLb);
      } else {
        // Merge missing entries into existing lorebook
        if (Array.isArray(lb.entries)) {
          const existingEntryKeys = new Set(
            existingLb.entries.map((e: any) => (e.keys || []).join("|"))
          );
          for (const entry of lb.entries) {
            const keySig = (entry.keys || []).join("|");
            if (!existingEntryKeys.has(keySig)) {
              existingLb.entries.push({
                ...entry,
                id: entry.id || uuidv4(),
              });
              existingEntryKeys.add(keySig);
            }
          }
        }
      }
    }
    await saveLoreBooks(existingLoreBooks);

    // 4. Save / Update Personality
    personality.state = ensureCharacterState({
      ...personality,
      state: body.characterState || personality.state,
    });

    const personalities = await loadPersonalities();
    let pIndex = personalities.findIndex((p: any) => p.id === personality.id);
    if (pIndex === -1) {
      pIndex = personalities.findIndex(
        (p: any) => p.name.trim().toLowerCase() === personality.name.trim().toLowerCase()
      );
    }

    if (pIndex === -1) {
      personalities.push(personality);
    } else {
      personalities[pIndex] = { ...personalities[pIndex], ...personality };
      personality = personalities[pIndex];
    }
    await savePersonalities(personalities);

    // 5. Chat History: Save imported chat or initialize first message
    const importedChat = body.chatHistory || body.history || body.chat;
    let finalChatCount = 0;
    if (Array.isArray(importedChat) && importedChat.length > 0) {
      await saveHistory(personality.id, importedChat);
      finalChatCount = importedChat.length;
    } else {
      const existingHistory = await loadHistory(personality.id);
      if (existingHistory.length === 0) {
        const candidateFirstMsg =
          personality.firstMessage ||
          createdScenarios[0]?.firstMessage ||
          importedScenarios[0]?.firstMessage;
        if (candidateFirstMsg && candidateFirstMsg.trim().length > 0) {
          const starter = [
            {
              role: "model",
              parts: [{ text: candidateFirstMsg.trim() }],
            },
          ];
          await saveHistory(personality.id, starter);
          finalChatCount = 1;
        } else {
          await saveHistory(personality.id, []);
        }
      } else {
        finalChatCount = existingHistory.length;
      }
    }

    // 6. Memories / MemPalace
    const importedPalace = body.mempalace || body.memories || body.memoryPalace;
    if (importedPalace && typeof importedPalace === "object") {
      importedPalace.personalityId = personality.id;
      if (!importedPalace.name) {
        importedPalace.name = `${personality.name}'s Memory Palace`;
      }
      await savePalace(importedPalace);
    } else {
      // Ensure palace file exists
      await getPalace(personality.id, personality.name);
    }

    // 7. Character Quests
    const importedQuests = body.quests || body.characterQuests;
    let questsImportedCount = 0;
    if (Array.isArray(importedQuests) && importedQuests.length > 0) {
      const existingQuests = await loadQuests();
      for (const q of importedQuests) {
        const qId = q.quest_id || q.id;
        const qIndex = existingQuests.findIndex(
          (item: any) => (item.quest_id && item.quest_id === qId) || item.id === qId
        );
        const sanitized = {
          ...q,
          characterId: personality.id,
          characterName: personality.name,
          quest_id: q.quest_id || q.id || `quest_${uuidv4().substring(0, 8)}`,
          id: q.id || q.quest_id || `quest_${uuidv4().substring(0, 8)}`,
        };
        if (qIndex === -1) {
          existingQuests.push(sanitized);
          questsImportedCount++;
        } else {
          existingQuests[qIndex] = { ...existingQuests[qIndex], ...sanitized };
        }
      }
      await saveQuests(existingQuests);
    }

    // 8. User Game State / Inventory Spoils
    const importedInventory = body.inventory || body.userGameState?.inventory;
    let inventoryImportedCount = 0;
    if (Array.isArray(importedInventory) && importedInventory.length > 0) {
      const gameState = await loadUserGameState();
      const existingIds = new Set((gameState.inventory || []).map((i: any) => i.id));
      for (const item of importedInventory) {
        if (!existingIds.has(item.id)) {
          gameState.inventory.push({
            ...item,
            characterId: item.characterId || personality.id,
            characterName: item.characterName || personality.name,
          });
          existingIds.add(item.id);
          inventoryImportedCount++;
        }
      }
      await saveUserGameState(gameState);
    }

    res.json({
      success: true,
      personality,
      createdScenariosCount: createdScenarios.length,
      createdLoreBooksCount: createdLoreBooks.length,
      chatMessagesCount: finalChatCount,
      hasMemories: Boolean(importedPalace),
      questsImportedCount,
      inventoryImportedCount,
      message: `Successfully imported "${personality.name}" with all linked chat, scenarios, lorebooks, memories, and quests.`,
    });
  } catch (err: any) {
    console.error("Error importing personality:", err);
    res.status(500).json({ error: err.message || "Failed to import character" });
  }
});

app.get("/api/chat/history", async (req, res) => {
  const personalityId = req.query.personalityId as string || "default";
  const scenarioId = req.query.scenarioId as string | undefined;
  let history = await loadHistory(personalityId);
  
  if (history.length === 0 && personalityId !== "default") {
    try {
      const personalities = await loadPersonalities();
      const p = personalities.find((x: any) => x.id === personalityId);
      const targetScenarioId = p?.scenarioId || scenarioId;
      if (targetScenarioId || (p && p.firstMessage)) {
        const scenarios = await loadScenarios();
        const s = targetScenarioId ? scenarios.find((x: any) => x.id === targetScenarioId) : null;
        const candidateFirstMsg = (s && s.firstMessage) || (p && p.firstMessage);
        if (candidateFirstMsg && candidateFirstMsg.trim().length > 0) {
          let userPersona: any = { name: "User" };
          try {
            const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
            userPersona = JSON.parse(uData);
          } catch {}
          
          let firstMsgText = candidateFirstMsg.trim();
          firstMsgText = resolveServerRoleplayMacros(firstMsgText, p?.name || "Character", userPersona?.name || "User");
          
          const initialMsg = {
            role: "model",
            parts: [{ text: firstMsgText }],
          };
          history = [initialMsg];
          await saveHistory(personalityId, history);
        }
      }
    } catch (e) {
      console.error("Error auto-seeding firstMessage:", e);
    }
  }

  res.json(history);
});

app.post("/api/chat/clear", async (req, res) => {
  try {
    const { personalityId, scenarioId } = req.body;
    const pId = personalityId || "default";

    const personalities = await loadPersonalities();
    const currentPersonality = personalities.find((p: any) => p.id === pId);
    const targetScenarioId = currentPersonality?.scenarioId || scenarioId;

    // 1. Clear chat history for the active character and seed firstMessage if applicable
    let initialHistory: any[] = [];
    if (targetScenarioId || (currentPersonality && currentPersonality.firstMessage)) {
      try {
        const scenarios = await loadScenarios();
        const s = targetScenarioId ? scenarios.find((x: any) => x.id === targetScenarioId) : null;
        const candidateFirstMsg = (s && s.firstMessage) || (currentPersonality && currentPersonality.firstMessage);
        if (candidateFirstMsg && candidateFirstMsg.trim().length > 0) {
          let userPersona: any = { name: "User" };
          try {
            const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
            userPersona = JSON.parse(uData);
          } catch {}
          let firstMsgText = candidateFirstMsg.trim();
          firstMsgText = resolveServerRoleplayMacros(firstMsgText, currentPersonality?.name || "Character", userPersona?.name || "User");
          initialHistory = [{ role: "model", parts: [{ text: firstMsgText }] }];
        }
      } catch (e) {
        console.error("Error auto-seeding firstMessage on clear:", e);
      }
    }
    
    await saveHistory(pId, initialHistory);

    // 2. Clear memory linked to that chat (MemPalace episodic & entity memories)
    const reset = await resetPalace(pId, currentPersonality?.name);

    // 3. Purge all quests and quest data linked to this character
    try {
      const allQuests = await loadQuests();
      const updatedQuests = allQuests.filter((q: any) => q.characterId !== pId);
      await saveQuests(updatedQuests);
    } catch (questPurgeErr) {
      console.warn("Could not purge character quests:", questPurgeErr);
    }

    // 4. Purge all spoils and inventory items linked to this character/chat
    let remainingInventory: any[] = [];
    try {
      const userGameState = await loadUserGameState();
      remainingInventory = userGameState.inventory.filter((item: any) => {
        if (item.characterId && item.characterId === pId) return false;
        if (currentPersonality && item.characterName && item.characterName.toLowerCase() === currentPersonality.name?.toLowerCase()) return false;
        return true;
      });
      userGameState.inventory = remainingInventory;
      await saveUserGameState(userGameState);
    } catch (invPurgeErr) {
      console.warn("Could not purge character inventory on clear:", invPurgeErr);
    }

    res.json({
      success: true,
      personalityId: pId,
      message: "Active chat history, linked memories, quests, and spoils cleared successfully.",
      palace: reset,
      inventory: remainingInventory,
      history: initialHistory,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/chat/purge", async (req, res) => {
  try {
    const { personalityId, scenarioId } = req.body;
    const pId = personalityId || "default";

    // 0. Cancel any pending background memory consolidation
    const existingTimer = consolidationTimers.get(pId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      consolidationTimers.delete(pId);
    }

    const personalities = await loadPersonalities();
    let currentPersonality = personalities.find((p: any) => p.id === pId);
    const targetScenarioId = currentPersonality?.scenarioId || scenarioId;

    // 1. Clear chat history for the active character and seed firstMessage if applicable
    let initialHistory: any[] = [];
    if (targetScenarioId || (currentPersonality && currentPersonality.firstMessage)) {
      try {
        const scenarios = await loadScenarios();
        const s = targetScenarioId ? scenarios.find((x: any) => x.id === targetScenarioId) : null;
        const candidateFirstMsg = (s && s.firstMessage) || (currentPersonality && currentPersonality.firstMessage);
        if (candidateFirstMsg && candidateFirstMsg.trim().length > 0) {
          let userPersona: any = { name: "User" };
          try {
            const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
            userPersona = JSON.parse(uData);
          } catch {}
          let firstMsgText = candidateFirstMsg.trim();
          firstMsgText = resolveServerRoleplayMacros(firstMsgText, currentPersonality?.name || "Character", userPersona?.name || "User");
          initialHistory = [{ role: "model", parts: [{ text: firstMsgText }] }];
        }
      } catch (e) {
        console.error("Error auto-seeding firstMessage on purge:", e);
      }
    }

    await saveHistory(pId, initialHistory);

    // 2. Clear memory linked to that chat (MemPalace episodic & entity memories)
    
    // 3. Reset the dynamic character state
    if (currentPersonality) {
      currentPersonality.state = { ...DEFAULT_CHARACTER_STATE };
      try {
        const scenarios = await loadScenarios();
        const s = targetScenarioId ? scenarios.find((x: any) => x.id === targetScenarioId) : null;
        if (s && s.state) {
          currentPersonality.state = { ...DEFAULT_CHARACTER_STATE, ...s.state };
        }
      } catch (e) {
        console.error("Error setting initial state from scenario on purge:", e);
      }
      await savePersonalities(personalities);
    }

    const reset = await resetPalace(pId, currentPersonality?.name);

    // 4. Purge all quests and quest tracking data linked to this character
    try {
      const allQuests = await loadQuests();
      const updatedQuests = allQuests.filter((q: any) => q.characterId !== pId);
      await saveQuests(updatedQuests);
    } catch (questPurgeErr) {
      console.warn("Could not purge character quests:", questPurgeErr);
    }

    // 5. Purge all spoils and inventory items linked to this character/chat
    let remainingInventory: any[] = [];
    try {
      const userGameState = await loadUserGameState();
      remainingInventory = userGameState.inventory.filter((item: any) => {
        if (item.characterId && item.characterId === pId) return false;
        if (currentPersonality && item.characterName && item.characterName.toLowerCase() === currentPersonality.name?.toLowerCase()) return false;
        return true;
      });
      userGameState.inventory = remainingInventory;
      await saveUserGameState(userGameState);
    } catch (invPurgeErr) {
      console.warn("Could not purge character inventory on purge:", invPurgeErr);
    }

    res.json({
      success: true,
      personalityId: pId,
      message: "Active chat history, linked memories, quests, character state, and spoils purged successfully.",
      palace: reset,
      state: currentPersonality?.state || DEFAULT_CHARACTER_STATE,
      inventory: remainingInventory,
      history: initialHistory,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.get("/api/local-servers/config", async (req, res) => {
  try {
    const config = await getLocalServerSettings();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/local-servers/config", async (req, res) => {
  try {
    await saveLocalServerSettings(req.body);
    res.json({ success: true, settings: req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/local-servers/test", async (req, res) => {
  try {
    const result = await testServer(req.body);
    if (!result.success) {
      logError({
        source: "server",
        title: `Local Server Test Failed (${req.body.name || req.body.type || "server"})`,
        message: result.error || "Connection test failed",
        details: `Server URL: ${req.body.baseUrl || "unknown"}\nServer Type: ${req.body.type || "unknown"}`,
        endpoint: "/api/local-servers/test",
        status: 503,
      }).catch(() => {});
    }
    res.json(result);
  } catch (err: any) {
    logError({
      source: "server",
      title: `Local Server Exception (${req.body?.name || req.body?.type || "server"})`,
      message: err.message,
      details: err.stack,
      endpoint: "/api/local-servers/test",
      status: 500,
    }).catch(() => {});
    res.status(500).json({ success: false, latencyMs: 0, models: [], error: err.message });
  }
});

app.post("/api/gemini/validate-key", async (req, res) => {
  try {
    const { apiKey, model } = req.body || {};
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return res.status(400).json({ valid: false, error: "Gemini API key is required" });
    }
    const cleanKey = apiKey.trim();
    const testModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "gemini-2.0-flash";
    const startTime = Date.now();
    const testAi = new GoogleGenAI({ apiKey: cleanKey });
    const response = await testAi.models.generateContent({
      model: testModel,
      contents: "Respond with 'OK' to confirm connection.",
    });
    const latencyMs = Math.max(1, Date.now() - startTime);
    return res.json({
      valid: true,
      latencyMs,
      model: testModel,
      reply: (response?.text || "").trim(),
    });
  } catch (err: any) {
    const msg = err.message || "Failed to connect using provided Gemini API Key";
    return res.status(400).json({
      valid: false,
      error: msg,
    });
  }
});

app.get("/api/server-status", async (req, res) => {
  const model = (req.query.model as string) || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";
  const customKey = (req.headers["x-gemini-api-key"] as string) || (req.query.customApiKey as string);
  const startTime = Date.now();

  try {
    const isGemini = model.startsWith("gemini-") || model === "default" || model === "";
    if (isGemini) {
      const hasKey = !!(customKey?.trim() || getActiveSessionApiKey() || undefined);
      if (!hasKey) {
        return res.json({
          connected: false,
          status: "disconnected",
          latencyMs: 0,
          error: "GEMINI_API_KEY is not configured",
          target: "Gemini Cloud API",
        });
      }
      const latencyMs = Math.max(1, Date.now() - startTime);
      return res.json({
        connected: true,
        status: latencyMs >= 800 ? "slow" : "connected",
        latencyMs,
        target: customKey?.trim() ? "User Custom Gemini Key" : "Gemini Cloud API",
      });
    }

    const localSettings = await getLocalServerSettings();
    let targetServer = localSettings.servers.find(
      (s) => model.startsWith(s.id) || model.startsWith(s.type)
    );
    if (!targetServer && localSettings.servers.length > 0) {
      targetServer = localSettings.servers.find((s) => s.enabled) || localSettings.servers[0];
    }

    if (targetServer) {
      const testResult = await testServer(targetServer);
      const latencyMs = testResult.latencyMs || Math.max(1, Date.now() - startTime);
      return res.json({
        connected: testResult.success,
        status: !testResult.success ? "disconnected" : latencyMs >= 800 ? "slow" : "connected",
        latencyMs: testResult.success ? latencyMs : 0,
        error: testResult.error,
        target: targetServer.name || targetServer.baseUrl,
      });
    }

    const latencyMs = Math.max(1, Date.now() - startTime);
    return res.json({
      connected: true,
      status: latencyMs >= 800 ? "slow" : "connected",
      latencyMs,
      target: "Local Server",
    });
  } catch (err: any) {
    return res.json({
      connected: false,
      status: "disconnected",
      latencyMs: 0,
      error: err.message,
      target: "Server",
    });
  }
});

app.get("/api/local-models", async (req, res) => {
  try {
    const models = await discoverAllLocalModels();
    res.json(models);
  } catch (e: any) {
    res.json([]);
  }
});

app.get("/api/generation-settings", async (req, res) => {
  try {
    const settings = await getGenerationSettings();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get generation settings" });
  }
});

app.post("/api/generation-settings", async (req, res) => {
  try {
    await saveGenerationSettings(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save generation settings" });
  }
});

// --- State & Mood Detection Engine API Endpoints ---
app.get("/api/mood-engine/config", async (req, res) => {
  try {
    const config = await loadMoodEngineConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load mood engine config" });
  }
});

app.post("/api/mood-engine/config", async (req, res) => {
  try {
    const existing = await loadMoodEngineConfig();
    const updated = {
      ...existing,
      ...req.body,
      windowDepth: Math.max(1, Math.min(5, Number(req.body.windowDepth) || 3)),
      liveMonitors: {
        ...existing.liveMonitors,
        ...(req.body.liveMonitors || {}),
      },
    };
    await saveMoodEngineConfig(updated);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save mood engine config" });
  }
});

app.post("/api/mood-engine/reset", async (req, res) => {
  try {
    await saveMoodEngineConfig(DEFAULT_MOOD_ENGINE_CONFIG);
    res.json({ success: true, config: DEFAULT_MOOD_ENGINE_CONFIG });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset mood engine config" });
  }
});

// --- Error Logs API Endpoints ---
app.get("/api/error-logs", async (req, res) => {
  try {
    const source = (req.query.source as any) || "all";
    const search = req.query.search as string | undefined;
    const logs = await getErrorLogsFiltered({ source, search });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch error logs", logs: [] });
  }
});

app.post("/api/error-logs", async (req, res) => {
  try {
    const { source, title, message, details, model, endpoint, status, personalityName } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const newLog = await logError({
      source: source === "chat" ? "chat" : "server",
      title: title || (source === "chat" ? "Chat Error" : "Server Error"),
      message: String(message),
      details: details ? String(details) : undefined,
      model: model ? String(model) : undefined,
      endpoint: endpoint ? String(endpoint) : undefined,
      status: typeof status === "number" ? status : undefined,
      personalityName: personalityName ? String(personalityName) : undefined,
    });
    res.json({ success: true, log: newLog });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create error log" });
  }
});

app.delete("/api/error-logs", async (req, res) => {
  try {
    const id = req.query.id as string | undefined;
    const source = req.query.source as any;
    if (id) {
      await deleteErrorLogById(id);
    } else {
      await clearErrorLogs(source);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear error logs" });
  }
});

app.post("/api/error-logs/simulate", async (req, res) => {
  try {
    const type = req.body.type || "server";
    let simulatedLog;
    if (type === "chat") {
      simulatedLog = await logError({
        source: "chat",
        title: "Rate Limit Exhaustion (429)",
        message: "Resource exhausted: Quota exceeded for model 'gemini-3.8-flash'. Please retry or switch to Gemini Flash-Lite.",
        details: "GoogleGenAIError: [429 Too Many Requests] Rate limit tokens per minute reached. at callGeminiContentWithRetry (server.ts:600)\n  at executeChatRound (server.ts:705)\n  at /api/chat (server.ts:760)",
        model: "gemini-3.8-flash",
        endpoint: "/api/chat",
        status: 429,
        personalityName: req.body.personalityName || "Aria Vance",
      });
    } else {
      simulatedLog = await logError({
        source: "server",
        title: "Local Server Connection Refused",
        message: "Failed to connect to local Ollama inference server at http://127.0.0.1:11434 (ECONNREFUSED)",
        details: "FetchError: request to http://127.0.0.1:11434/api/tags failed, reason: connect ECONNREFUSED 127.0.0.1:11434\n  at ClientRequest.<anonymous> (localServerEngine.ts:182)\n  at testServer (localServerEngine.ts:210)",
        model: "ollama:llama3",
        endpoint: "/api/local-servers/test",
        status: 503,
      });
    }
    res.json({ success: true, log: simulatedLog });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to simulate error log" });
  }
});

// --- System Status & Diagnostic Endpoints ---
app.get("/api/systems/status", async (req, res) => {
  try {
    const status = await getComprehensiveSystemStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve system status" });
  }
});

app.post("/api/systems/test-model", async (req, res) => {
  try {
    const { model, prompt } = req.body || {};
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || req.body?.customApiKey;
    const result = await executeTestChatModel({
      model,
      prompt,
      customApiKey,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to test chat model",
      possibleSolutions: [
        "Verify your model settings and inference endpoint configuration in Settings.",
        "Check Settings -> Error Logs for stack trace details.",
      ],
    });
  }
});

app.post("/api/systems/test-system", async (req, res) => {
  try {
    const { systemId, model } = req.body || {};
    const customApiKey = (req.headers["x-gemini-api-key"] as string) || req.body?.customApiKey;
    if (!systemId) {
      return res.status(400).json({ error: "systemId is required" });
    }
    const result = await testIndividualSystem(systemId, { model, customApiKey });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      status: "offline",
      latencyMs: 0,
      details: err.message || "Test failed",
      error: err.message,
    });
  }
});

app.post("/api/systems/test-concurrency", async (req, res) => {
  try {
    const result = await executeConcurrencyTest();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      details: err.message || "Concurrency test failed",
    });
  }
});

app.post("/api/systems/validate-schemas", async (req, res) => {
  try {
    const result = await executeSchemaValidation();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      details: err.message || "Schema validation failed",
    });
  }
});

app.post("/api/systems/test-session-restoration", async (req, res) => {
  try {
    const result = await executeSessionRestorationTest();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      details: err.message || "Session restoration test failed",
    });
  }
});

app.post("/api/systems/test-timeout", async (req, res) => {
  try {
    const timeoutMs = typeof req.body?.timeoutMs === "number" ? req.body.timeoutMs : 1200;
    const result = await executeTimeoutHandlingTest(timeoutMs);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      details: err.message || "Timeout handling test failed",
    });
  }
});

// --- MemPalace API Endpoints ---
app.get("/api/mempalace/config", async (req, res) => {
  try {
    const config = await loadMemPalaceConfig();
    const neuralCfg = await loadNeuralModelsConfig();
    const personalityId = req.query.personalityId as string;
    const pendingTurns = personalityId ? (characterMessageCounts.get(personalityId) || 0) : 0;
    res.json({
      ...config,
      effectiveModel: config.model || neuralCfg.mempalaceModel || neuralCfg.defaultModel,
      pendingTurns,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load MemPalace config" });
  }
});

app.post("/api/mempalace/config", async (req, res) => {
  try {
    const updated = await saveMemPalaceConfig(req.body);
    if (req.body && typeof req.body.model === "string") {
      const neuralCfg = await loadNeuralModelsConfig();
      await saveNeuralModelsConfig({ ...neuralCfg, mempalaceModel: req.body.model.trim() });
    }
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save MemPalace config" });
  }
});

app.get("/api/mempalace/:personalityId", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const palace = await getPalace(personalityId);
    res.json(palace);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.get("/api/mempalace/:personalityId/relationship-metrics", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const palace = await getPalace(personalityId);
    const personalities = await loadPersonalities();
    const activePersonality = personalities.find((p: any) => p.id === personalityId);

    let userPersona: any = { name: "User" };
    try {
      const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
      userPersona = JSON.parse(uData);
    } catch (e) {}

    const metrics = calculateRelationshipMetrics(
      palace,
      activePersonality?.name || palace.name || "Character",
      userPersona?.name || "User"
    );

    res.json({
      metrics,
      palace,
      personality: activePersonality || { id: personalityId, name: palace.name },
      userPersona,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/mempalace/:personalityId/drawers", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const drawer = await addDrawer(personalityId, req.body);
    res.json(drawer);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.put("/api/mempalace/:personalityId/drawers/:drawerId", async (req, res) => {
  try {
    const { personalityId, drawerId } = req.params;
    const updated = await updateDrawer(personalityId, drawerId, req.body);
    if (!updated) return res.status(404).json({ error: "Drawer not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.delete("/api/mempalace/:personalityId/drawers/:drawerId", async (req, res) => {
  try {
    const { personalityId, drawerId } = req.params;
    const success = await deleteDrawer(personalityId, drawerId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/mempalace/:personalityId/relations", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const rel = await addEntityRelation(personalityId, req.body);
    res.json(rel);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.delete("/api/mempalace/:personalityId/relations/:relationId", async (req, res) => {
  try {
    const { personalityId, relationId } = req.params;
    const success = await deleteEntityRelation(personalityId, relationId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/mempalace/:personalityId/search", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const { query, topK } = req.body;
    const results = await searchLoci(personalityId, query || "", topK || 6);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/mempalace/:personalityId/consolidate", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const history = await loadHistory(personalityId);
    const personalities = await loadPersonalities();
    const activePersonality = personalities.find((p: any) => p.id === personalityId);
    
    let userPersona = { name: "User" };
    try {
      const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
      userPersona = JSON.parse(uData);
    } catch (e) {}

    const mempalaceConfig = await loadMemPalaceConfig();
    const neuralCfg = await loadNeuralModelsConfig();
    
    let depth;
    if (req.body?.full) {
      depth = history.length;
    } else {
      depth = Math.max(6, Math.min(100, Number(req.body?.depth) || mempalaceConfig.dialogueHistoryDepth || 50));
    }

    const recentDialogue: { role: string; text: string }[] = [];
    for (const item of history.slice(-depth)) {
      const text = item.parts?.map((p: any) => p.text).filter(Boolean).join(" ");
      if (text && text.trim().length >= (mempalaceConfig.minMessageLength || 1)) {
        recentDialogue.push({ role: item.role, text });
      }
    }

    const { model, customApiKey } = req.body || {};
    const targetModel =
      model ||
      mempalaceConfig.model ||
      neuralCfg.mempalaceModel ||
      neuralCfg.defaultModel ||
      getActiveSessionModel() ||
      process.env.DEFAULT_MODEL ||
      "";

    if (model) {
      setActiveSessionModel(model, customApiKey);
    }

    const CHUNK_SIZE = 40;
    const allAddedDrawers = [];
    const allAddedRelations = [];

    // Process the dialogue in manageable chunks sequentially to ensure we don't hit token output caps 
    // or context window limitations on the extraction model.
    for (let i = 0; i < recentDialogue.length; i += CHUNK_SIZE) {
      const dialogueChunk = recentDialogue.slice(i, i + CHUNK_SIZE);
      const chunkOutcome = await consolidateDialogue(
        personalityId,
        activePersonality?.name || "Character",
        userPersona.name || "User",
        dialogueChunk,
        {
          model: targetModel,
          customApiKey,
          executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: (await loadNeuralModelsConfig()).fallbackModel }),
        }
      );
      
      if (chunkOutcome.addedDrawers) allAddedDrawers.push(...chunkOutcome.addedDrawers);
      if (chunkOutcome.addedRelations) allAddedRelations.push(...chunkOutcome.addedRelations);
    }

    // Auto-deduplicate if configured
    let deduplicateResult = null;
    if (mempalaceConfig.autoDeduplicate) {
      deduplicateResult = await cleanAndDeduplicatePalace(personalityId).catch(() => null);
    }

    // Reset pending turn count since chat has been consolidated
    characterMessageCounts.set(personalityId, 0);

    res.json({
      addedDrawers: allAddedDrawers,
      addedRelations: allAddedRelations,
      deduplicated: !!deduplicateResult,
      dialogueDepthUsed: depth,
      targetModelUsed: targetModel,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/mempalace/:personalityId/deduplicate", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const result = await cleanAndDeduplicatePalace(personalityId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/mempalace/:personalityId/reset", async (req, res) => {
  try {
    const { personalityId } = req.params;
    const personalities = await loadPersonalities();
    const currentPersonality = personalities.find((p: any) => p.id === personalityId);
    const result = await resetPalace(personalityId, currentPersonality?.name);
    res.json({ success: true, palace: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

/**
 * Resilient Gemini Content Generator with Exponential Backoff & Intelligent Model Fallback
 */
async function callGeminiContentWithRetry(options: {
  models: string[];
  contents: any;
  config: any;
  maxAttemptsPerModel?: number;
  customApiKey?: string;
}): Promise<{ response: any; successfulModel: string }> {
  const { models, contents, config, maxAttemptsPerModel = 2, customApiKey } = options;
  let lastError: any = null;

  // Use custom Gemini API client if user provided their own key, otherwise fall back to environment default
  const targetAi = (customApiKey && customApiKey.trim())
    ? new GoogleGenAI({ apiKey: customApiKey.trim() })
    : ai;

  // Filter and deduplicate models
  const candidateModels = Array.from(new Set(models.filter(Boolean)));

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const response = await targetAi.models.generateContent({
          model,
          contents,
          config,
        });

        if (response) {
          return { response, successfulModel: model };
        }
      } catch (err: any) {
        lastError = err;
        const errStatus = err?.status;
        const errMsg = String(err?.message || err);
        const isRetryable = errStatus === 429 || errStatus === 503 || errStatus === 500 || errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("UNAVAILABLE") || errMsg.includes("fetch failed");

        if (isRetryable) {
          // Exponential backoff + jitter for rate limits
          const backoff = 1000 * Math.pow(1.5, attempt) + Math.random() * 500;
          console.log(`[Retryable Error] Model '${model}' attempt ${attempt} failed. Backing off ${(backoff / 1000).toFixed(1)}s...`);
          await new Promise((r) => setTimeout(r, backoff));
        } else {
          console.warn(`Model '${model}' attempt ${attempt} error:`, errMsg);
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
  }

  const finalError = lastError || new Error("All Gemini candidate models failed to generate content.");
  logError({
    source: "server",
    title: "Gemini Model Pipeline Failure",
    message: String(finalError?.message || finalError),
    details: finalError?.stack,
    endpoint: "/api/chat",
    status: (finalError as any)?.status || 500,
  }).catch(() => {});

  throw finalError;
}

const consolidationTimers = new Map<string, NodeJS.Timeout>();
const characterMessageCounts = new Map<string, number>();

async function executeConsolidationNow(
  pId: string,
  contents: any[],
  selectedModel?: string,
  customApiKey?: string
) {
  try {
    const mempalaceConfig = await loadMemPalaceConfig();
    const personalities = await loadPersonalities();
    const activePersonality = personalities.find((p: any) => p.id === pId);
    let userPersona = { name: "User" };
    try {
      const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
      userPersona = JSON.parse(uData);
    } catch (e) {}

    const depth = Math.max(6, Math.min(100, mempalaceConfig.dialogueHistoryDepth || 25));
    const recentDialogue = contents.slice(-depth).map((c: any) => ({
      role: c.role,
      text: c.parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "",
    })).filter((m) => m.text.trim().length >= (mempalaceConfig.minMessageLength || 1));

    if (recentDialogue.length === 0) return;

    const neuralCfg = await loadNeuralModelsConfig();
    const targetModel =
      mempalaceConfig.model ||
      neuralCfg.mempalaceModel ||
      selectedModel ||
      neuralCfg.defaultModel ||
      getActiveSessionModel() ||
      process.env.DEFAULT_MODEL ||
      "";

    await consolidateDialogue(
      pId,
      activePersonality?.name || "Character",
      userPersona.name || "User",
      recentDialogue,
      {
        model: targetModel,
        customApiKey,
        executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: neuralCfg.fallbackModel }),
      }
    );

    if (mempalaceConfig.autoDeduplicate) {
      await cleanAndDeduplicatePalace(pId).catch((err) => {
        console.warn("Auto-deduplication error:", err);
      });
    }

    if (activePersonality) {
      const evalResult = await evaluateDynamicCharacterState({
        personality: activePersonality,
        history: contents,
        userPersonaName: userPersona?.name || "User",
        model: neuralCfg.characterStateModel || neuralCfg.defaultModel || targetModel,
        customApiKey,
        executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: neuralCfg.fallbackModel }),
        moodEngineConfig: await loadMoodEngineConfig(),
      });

      if (evalResult.updatedState) {
        activePersonality.state = evalResult.updatedState;
        const currentPersonalities = await loadPersonalities();
        const idx = currentPersonalities.findIndex((p: any) => p.id === pId);
        if (idx !== -1) {
          currentPersonalities[idx] = activePersonality;
          await savePersonalities(currentPersonalities);
        }
      }

      if (evalResult.memoryNotes && evalResult.memoryNotes.length > 0) {
        for (const note of evalResult.memoryNotes) {
          await addDrawer(pId, note).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.warn("Background consolidation error:", e);
  } finally {
    consolidationTimers.delete(pId);
  }
}

async function triggerBackgroundConsolidation(
  pId: string,
  contents: any[],
  selectedModel?: string,
  customApiKey?: string
) {
  try {
    const mempalaceConfig = await loadMemPalaceConfig();

    // 1. Manual only mode: skip background consolidation completely
    if (mempalaceConfig.autoConsolidateMode === "manual_only") {
      const existing = consolidationTimers.get(pId);
      if (existing) {
        clearTimeout(existing);
        consolidationTimers.delete(pId);
      }
      return;
    }

    // 2. Chat Amount / Message Count mode: consolidate every N chat turns
    if (mempalaceConfig.autoConsolidateMode === "message_count") {
      const currentCount = (characterMessageCounts.get(pId) || 0) + 1;
      const threshold = Math.max(1, mempalaceConfig.messageThreshold || 6);

      if (currentCount >= threshold) {
        characterMessageCounts.set(pId, 0);
        executeConsolidationNow(pId, contents, selectedModel, customApiKey);
      } else {
        characterMessageCounts.set(pId, currentCount);
      }
      return;
    }

    // 3. Auto mode (per-turn debounce)
    const existing = consolidationTimers.get(pId);
    if (existing) clearTimeout(existing);

    const delay = Math.max(500, Math.min(15000, mempalaceConfig.autoConsolidateDelayMs || 2500));
    const timer = setTimeout(() => {
      executeConsolidationNow(pId, contents, selectedModel, customApiKey);
    }, delay);

    consolidationTimers.set(pId, timer);
  } catch (err) {
    console.warn("Error scheduling background consolidation:", err);
  }
}

interface ChatRoundOptions {
  contents: any[];
  pId: string;
  selectedModel: string;
  finalSystemInstruction: string;
  temperature?: number;
  geminiApiKey?: string;
}

async function executeChatRound({
  contents,
  pId,
  selectedModel,
  finalSystemInstruction,
  temperature,
  geminiApiKey,
}: ChatRoundOptions) {
  let isLocalModel =
    selectedModel.startsWith("jan:") ||
    selectedModel.startsWith("ollama:") ||
    selectedModel.startsWith("lmstudio:") ||
    selectedModel.startsWith("custom:") ||
    selectedModel.startsWith("custom_openai:") ||
    selectedModel.startsWith("openrouter:") ||
    selectedModel.startsWith("ngrok:");

  const genSettings = await getGenerationSettings();
  const effectiveTemp = typeof temperature === "number" ? temperature : (genSettings.temperature ?? 0.88);
  const effectiveMaxTokens = Math.max(1200, genSettings.maxTokens && genSettings.maxTokens >= 500 ? genSettings.maxTokens : 1500);

  if (isLocalModel) {
    try {
      const messages = [{ role: "system", content: finalSystemInstruction }];
      for (const item of contents) {
        if (item.role === "user")
          messages.push({
            role: "user",
            content: item.parts.map((p: any) => p.text || JSON.stringify(p)).join("\n"),
          });
        if (item.role === "model")
          messages.push({
            role: "assistant",
            content: item.parts.map((p: any) => p.text || JSON.stringify(p)).join("\n"),
          });
      }

      let responseText = await executeLocalChat(selectedModel, messages, {
        ...genSettings,
        temperature: effectiveTemp,
        maxTokens: effectiveMaxTokens,
      });

      if (!responseText.trim() || responseText.trim().split(/\s+/).length < 4) {
        messages.push({
          role: "user",
          content: "[System: Please provide a complete, multi-sentence in-character roleplay response. Words being said must be enclosed between double quotes \" \", while all thoughts and actions must always be enclosed between asterisks * *. Do not output single words or acknowledgments.]"
        });
        const retryText = await executeLocalChat(selectedModel, messages, {
          ...genSettings,
          temperature: effectiveTemp,
          maxTokens: effectiveMaxTokens,
        });
        if (retryText && retryText.trim().split(/\s+/).length >= 4) {
          responseText = retryText;
        }
      }

      contents.push({ role: "model", parts: [{ text: responseText }] });
      await saveHistory(pId, contents);
      triggerBackgroundConsolidation(pId, contents, selectedModel, geminiApiKey);
      return contents;
    } catch (localErr: any) {
      console.warn(`[Local Server Failure] Model "${selectedModel}" failed:`, localErr?.message);
      const neuralCfg = await loadNeuralModelsConfig();
      const fallbackModel = neuralCfg.fallbackModel;

      if (!fallbackModel || fallbackModel === "none" || fallbackModel === selectedModel) {
        throw localErr;
      }

      console.log(`[Auto-Recovery] Falling back from "${selectedModel}" to "${fallbackModel}"...`);
      logError({
        source: "chat",
        title: `Auto-Recovery: ${selectedModel} Unavailable`,
        message: `${localErr?.message || "Model unavailable"}. Automatically switched to fallback model ${fallbackModel}.`,
        model: selectedModel,
        endpoint: "/api/chat",
        status: 200,
        personalityName: pId,
      }).catch(() => {});

      selectedModel = fallbackModel;
      isLocalModel = isLocalOrCustomModel(selectedModel);
      if (isLocalModel) {
        const messages = [{ role: "system", content: finalSystemInstruction }];
        for (const item of contents) {
          if (item.role === "user")
            messages.push({
              role: "user",
              content: item.parts.map((p: any) => p.text || JSON.stringify(p)).join("\n"),
            });
          if (item.role === "model")
            messages.push({
              role: "assistant",
              content: item.parts.map((p: any) => p.text || JSON.stringify(p)).join("\n"),
            });
        }
        let responseText = await executeLocalChat(selectedModel, messages, {
          ...genSettings,
          temperature: effectiveTemp,
          maxTokens: effectiveMaxTokens,
        });
        contents.push({ role: "model", parts: [{ text: responseText }] });
        await saveHistory(pId, contents);
        triggerBackgroundConsolidation(pId, contents, selectedModel, geminiApiKey);
        return contents;
      }
    }
  }

  const candidateModels = [
    selectedModel,
  ];

  const geminiConfig: any = {
    systemInstruction: finalSystemInstruction,
    temperature: Math.min(1.5, Math.max(0.1, effectiveTemp)),
    topP: typeof genSettings.topP === "number" && genSettings.topP > 0 ? genSettings.topP : 0.95,
    maxOutputTokens: effectiveMaxTokens,
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.LOW,
    },
  };

  if (genSettings.topK && genSettings.topK > 0) {
    geminiConfig.topK = genSettings.topK;
  }

  let { response } = await callGeminiContentWithRetry({
    models: candidateModels,
    contents,
    config: geminiConfig,
    maxAttemptsPerModel: 2,
    customApiKey: geminiApiKey,
  });

  let responseContent = response.candidates?.[0]?.content;
  let responseText = response.text || responseContent?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";

  // Validation: if response is degenerate or just 1-3 words, re-prompt to ensure full scene dialogue & actions
  if (!responseText.trim() || responseText.trim().split(/\s+/).length < 4) {
    console.warn(`[Chat] Detected unusually brief response ("${responseText.trim()}"). Re-prompting for full scene response...`);
    try {
      const retryResult = await callGeminiContentWithRetry({
        models: [selectedModel],
        contents,
        config: {
          ...geminiConfig,
          systemInstruction: finalSystemInstruction + "\n\n[MANDATORY FORMAT REQUIREMENT]: You MUST provide a complete in-character response. Words being said must be enclosed between quotation marks \" \", while all thoughts, physical actions, and narration MUST always be enclosed between asterisks * *. Do NOT output a single word, confirmation, or empty reply. Proceed immediately in-character:",
          temperature: Math.min(1.2, effectiveTemp + 0.05),
        },
        maxAttemptsPerModel: 2,
        customApiKey: geminiApiKey,
      });
      const retryContent = retryResult.response.candidates?.[0]?.content;
      const retryText = retryResult.response.text || retryContent?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";
      if (retryText.trim() && retryText.trim().split(/\s+/).length >= 4) {
        responseContent = retryContent;
      }
    } catch (retryErr) {
      console.warn("Retry failed, keeping initial response content:", retryErr);
    }
  }

  if (responseContent) {
    contents.push(responseContent);
  }

  await saveHistory(pId, contents);
  triggerBackgroundConsolidation(pId, contents, selectedModel, geminiApiKey);
  return contents;
}

function resolveServerRoleplayMacros(text: string, personalityName: string, userName: string): string {
  if (!text) return "";
  const cName = (personalityName || "Character").trim();
  const uName = (userName || "User").trim();

  let resolved = text;

  // 1. Quoted and macro possessive forms: "character's", {{char}}'s, "user's", {{user}}'s
  resolved = resolved.replace(/["'“”](character|personality|char)['’]s["'“”]/gi, `${cName}'s`);
  resolved = resolved.replace(/["'“”](character|personality|char)["'“”]['’]s/gi, `${cName}'s`);
  resolved = resolved.replace(/\{\{\s*(character|personality|char)['’]?s\s*\}\}/gi, `${cName}'s`);
  resolved = resolved.replace(/\{\{\s*(character|personality|char)\s*\}\}['’]s/gi, `${cName}'s`);
  resolved = resolved.replace(/\[\s*(character|personality|char)['’]?s\s*\]/gi, `${cName}'s`);

  resolved = resolved.replace(/["'“”]user['’]s["'“”]/gi, `${uName}'s`);
  resolved = resolved.replace(/["'“”]user["'“”]['’]s/gi, `${uName}'s`);
  resolved = resolved.replace(/\{\{\s*user['’]?s\s*\}\}/gi, `${uName}'s`);
  resolved = resolved.replace(/\{\{\s*user\s*\}\}['’]s/gi, `${uName}'s`);
  resolved = resolved.replace(/\[\s*user['’]?s\s*\]/gi, `${uName}'s`);

  // 2. Standard quoted definitions: "character", "personality", and "user"
  resolved = resolved.replace(/["'“”](character|personality|char)["'“”]/gi, cName);
  resolved = resolved.replace(/["'“”]user["'“”]/gi, uName);

  // 3. Bracketed & macro variants: {{character}}, {{char}}, {{personality}}, <character>, <char>, [character], [user]
  resolved = resolved.replace(/\{\{\s*(character|personality|char)\s*\}\}/gi, cName);
  resolved = resolved.replace(/\{\s*(character|personality|char)\s*\}/gi, cName);
  resolved = resolved.replace(/<\s*(character|personality|char)\s*>/gi, cName);
  resolved = resolved.replace(/\[\s*(character|personality|char)\s*\]/gi, cName);

  resolved = resolved.replace(/\{\{\s*user\s*\}\}/gi, uName);
  resolved = resolved.replace(/\{\s*user\s*\}/gi, uName);
  resolved = resolved.replace(/<\s*user\s*>/gi, uName);
  resolved = resolved.replace(/\[\s*user\s*\]/gi, uName);

  // 4. Standalone speaker tags: Character: / User:
  resolved = resolved.replace(/^\s*(character|personality|char):\s*/gim, `${cName}: `);
  resolved = resolved.replace(/^\s*user:\s*/gim, `${uName}: `);

  // 5. Open text possessive forms
  resolved = resolved.replace(/\b(character|personality)['’]s\b/gi, `${cName}'s`);
  resolved = resolved.replace(/\buser['’]s\b/gi, `${uName}'s`);

  // 6. Contextual word-boundary replacements for unquoted user/character/personality when used as actors/subjects
  resolved = resolved.replace(/\b(where|when|while|if) user and (character|personality|char)\b/gi, `where ${uName} and ${cName}`);
  resolved = resolved.replace(/\b(where|when|while|if) (character|personality|char) and user\b/gi, `where ${cName} and ${uName}`);
  resolved = resolved.replace(/\buser and (character|personality|char)\b/gi, `${uName} and ${cName}`);
  resolved = resolved.replace(/\b(character|personality|char) and user\b/gi, `${cName} and ${uName}`);
  resolved = resolved.replace(/\bbetween user and (character|personality|char)\b/gi, `between ${uName} and ${cName}`);
  resolved = resolved.replace(/\bbetween (character|personality|char) and user\b/gi, `between ${cName} and ${uName}`);
  resolved = resolved.replace(/\bwhen user walks in\b/gi, `when ${uName} walks in`);
  resolved = resolved.replace(/\bas user walks in\b/gi, `as ${uName} walks in`);
  resolved = resolved.replace(/\bwhen "user" walks in\b/gi, `when ${uName} walks in`);
  resolved = resolved.replace(/\b(with|to|from|about|for|by|when|as)\s+user\b/gi, `$1 ${uName}`);
  resolved = resolved.replace(/\b(with|to|from|about|for|by|when|as)\s+(character|personality|char)\b/gi, `$1 ${cName}`);
  resolved = resolved.replace(/\buser\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|walks|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\b/gi, `${uName} $1`);
  resolved = resolved.replace(/\b(character|personality|char)\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|works|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\b/gi, `${cName} $2`);

  return resolved;
}

const pendingNarrativeInjections: Record<string, string[]> = {};

app.post("/api/chat", async (req, res) => {
  const {
    message,
    personalityId,
    systemInstruction,
    model,
    temperature,
    geminiApiKey,
    characterStateModel: clientCharStateModel,
    questEngineModel: clientQuestEngineModel,
    userPersona: clientUserPersona,
  } = req.body;

  const userApiKey = (typeof geminiApiKey === "string" && geminiApiKey.trim())
    ? geminiApiKey.trim()
    : ((req.headers["x-gemini-api-key"] as string) || undefined);

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const pId = personalityId || "default";

  // Neural Models Configuration Resolution
  const neuralConfig = await loadNeuralModelsConfig();
  const selectedModel = model || neuralConfig.defaultModel || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";
  const characterStateModel = neuralConfig.characterStateModel || neuralConfig.defaultModel || selectedModel;
  const questEngineModel = neuralConfig.questEngineModel || neuralConfig.defaultModel || selectedModel;

  if (model) {
    setActiveSessionModel(model, userApiKey);
  }

  let baseSystemInstruction =
    systemInstruction ||
    "You are a helpful chat assistant with perfect memory.";

  try {
    let engineErrors: any = { chat: null, quests: null, vitals: null };
    // Resolve any remaining raw roleplay macros in systemInstruction using active personality & user persona
    const personalities = await loadPersonalities();
    const activePersonality = personalities.find((p: any) => p.id === pId);
    let userPersona: any = clientUserPersona?.name ? clientUserPersona : { name: "User" };
    if (!userPersona?.name || userPersona.name === "User") {
      try {
        const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
        const parsed = JSON.parse(uData);
        if (parsed?.name) userPersona = parsed;
      } catch {}
    }

    const charName = activePersonality?.name || "Character";
    const userName = userPersona?.name || "User";

    if (activePersonality) {
      baseSystemInstruction = resolveServerRoleplayMacros(
        baseSystemInstruction,
        charName,
        userName
      );
    }

    const identityAndFormattingRules = `\n\n--- Strict Roleplay Identity & Dialogue/Action Standards ---
- ACTIVE CHAT CHARACTER (YOU): You are ${charName}. In all scenario setups, lore books, character context, and prompts, the macro {{char}} (and {{character}}) ALWAYS refers directly to YOU (${charName}). If a scenario says "{{char}} is injured", it means YOU (${charName}) are injured.
- ACTIVE USER PERSONA: The person you are interacting with is ${userName}. In all scenario setups, lore books, user profiles, and prompts, the macro {{user}} ALWAYS refers directly to the active user persona (${userName}). If a scenario says "{{user}} is injured", it means ${userName} is injured.
- IDENTITY RULE: NEVER confuse your identity. You are ALWAYS ${charName} (the active chat character) and you are talking to ${userName} (the user persona). Do not act as the user, and do not attribute the character's actions or states to the user.
- SPOKEN WORDS: ALL words being spoken out loud MUST be enclosed between quotation marks " " (e.g., "Hello," she murmured, "how have you been?").
- THOUGHTS & ACTIONS: ALL thoughts, internal monologues, physical actions, body language, facial gestures, and narration MUST ALWAYS be enclosed between asterisks * * (e.g., *smiles warmly and takes a step closer, feeling relieved to see you*).
- Maintain this standard with 100% consistency across all responses.`;

    if (!baseSystemInstruction.includes("--- Strict Roleplay Identity & Dialogue/Action Standards ---")) {
      baseSystemInstruction += identityAndFormattingRules;
    }

    // ==========================================
    // STAGE 1: PRE-INFERENCE STATE & CONTEXT ENGINE
    // ==========================================
    // Evaluates vitals, mood & composure, scene/setting, active status effects,
    // and verbal quest acceptance BEFORE the primary chat inference.

    let characterState = activePersonality ? ensureCharacterState(activePersonality) : undefined;
    let preStateShifts: string[] = [];

    if (activePersonality) {
      try {
        const moodEngineConfig = await loadMoodEngineConfig();
        const preInferenceResult = await evaluatePreInferenceCharacterState({
          personality: activePersonality,
          incomingUserMessage: message,
          userPersonaName: userPersona?.name || "User",
          model: characterStateModel,
          customApiKey: userApiKey,
          executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: (await loadNeuralModelsConfig()).fallbackModel }),
          moodEngineConfig,
        });

        activePersonality.state = preInferenceResult.updatedState;
        characterState = preInferenceResult.updatedState;
        preStateShifts = preInferenceResult.shifts;

        // Persist Stage 1 state adjustments immediately
        const currentPersonalities = await loadPersonalities();
        const pIdx = currentPersonalities.findIndex((p: any) => p.id === pId);
        if (pIdx !== -1) {
          currentPersonalities[pIdx] = activePersonality;
          await savePersonalities(currentPersonalities);
        }
      } catch (preErr: any) {
        engineErrors.vitals = preErr.message || "Stage 1 Vitals Error";
        console.warn("Stage 1 Pre-Inference Character State evaluation skipped or failed:", preErr);
      }
    }

    // 1. MemPalace Method of Loci Walkthrough: Retrieve relevant episodic facts, events, discoveries, and preferences
    const { contextText: palaceLociContext, recalledDrawers, activeEntities } = await walkPalaceForPrompt(
      pId,
      message
    );

    // 2. Lore Book Search: Retrieve relevant lore based on message keywords
    const loreBooks = await loadLoreBooks();
    let loreContext = "\n\n[Relevant Lore Details]:";
    let foundLore = false;
    for (const book of loreBooks) {
      for (const entry of book.entries) {
        if (!entry.keywords) continue;
        const kw = entry.keywords.split(',').map(s => s.trim().toLowerCase());
        if (kw.some(k => k && message.toLowerCase().includes(k))) {
            loreContext += `\n- Lore: ${entry.name}\nContent: ${entry.content}`;
            foundLore = true;
        }
      }
    }
    
    const dynamicStateBlock = activePersonality
      ? `\n\n${formatCharacterStateForPrompt(ensureCharacterState(activePersonality), activePersonality.name || "Character")}`
      : "";

    let contents = await loadHistory(pId);

    // Prune unused variations when chat continues: keep only the chosen active variation in history
    let hasUnusedVariations = false;
    for (const item of contents) {
      if (item.variations) {
        delete item.variations;
        delete item.activeVariationIndex;
        hasUnusedVariations = true;
      }
    }
    if (hasUnusedVariations) {
      await saveHistory(pId, contents);
    }

    // Stage 1 Quest Processing: Acceptance/Rejection & Pre-Turn Delivery Check
    let acceptedQuest: any = null;
    let declinedQuest: any = null;
    let completedQuest: any = null;
    let questInstructionInjection = "";
    let systemInjectionNote: string | undefined = undefined;
    const questConfig = await loadQuestingSystemConfig();

    const isSystemAction = typeof message === "string" && (message.includes("[SYSTEM ACTION:") || message.includes("[SYSTEM EVENT INJECTION:"));

    if (!isSystemAction && pId) {
      try {
        const allQuests = await loadQuests();
        const characterName = activePersonality?.name || "Character";
        const userName = userPersona?.name || "User";
        const recentHistoryStr = contents.slice(-6).map((c: any) => {
          const sender = c.role === "user" ? userName : characterName;
          const text = c.parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "";
          return `${sender}: ${text}`;
        }).join("\n\n");

        const stage1QuestResult = await evaluateQuestEngineTurn({
          questConfig,
          allQuests,
          personalityId: pId,
          characterName,
          userName,
          userMessage: message,
          recentHistoryStr,
          questEngineModel,
          apiKey: userApiKey,
        });

        if (stage1QuestResult.acceptedQuest) {
          acceptedQuest = stage1QuestResult.acceptedQuest;
          questInstructionInjection += `\n\n[SYSTEM: The user has verbally agreed to help with "${acceptedQuest.title}". Acknowledge their acceptance warmly in character and proceed with the task in-progress.]`;
        }

        if (stage1QuestResult.declinedQuest) {
          declinedQuest = stage1QuestResult.declinedQuest;
          questInstructionInjection += `\n\n[SYSTEM: The user has indicated they cannot help with "${declinedQuest.title}". Acknowledge their refusal politely and continue the dialogue without holding it against them.]`;
        }

        if (stage1QuestResult.completedQuest) {
          completedQuest = stage1QuestResult.completedQuest;
          systemInjectionNote = stage1QuestResult.systemInjectionNote;
          questInstructionInjection += `\n\n[SYSTEM: The user has completed or brought the required items/task for "${completedQuest.title}". Formally acknowledge this in your dialogue, express your sincere gratitude, take the items or celebrate their success, and bestow their reward.]`;
        }
      } catch (err: any) {
        engineErrors.quests = err.message || "Stage 1 Quest Error";
        console.warn("Error during Stage 1 pre-chat quest evaluation:", err);
      }
    }

    // Consume any pending narrative injections for this character
    let pendingNarrativeBlock = "";
    if (pendingNarrativeInjections[pId] && pendingNarrativeInjections[pId].length > 0) {
      pendingNarrativeBlock = "\n\n" + pendingNarrativeInjections[pId].join("\n\n");
      pendingNarrativeInjections[pId] = [];
    }

    const finalSystemInstruction =
      baseSystemInstruction +
      (foundLore ? loreContext : "") +
      (palaceLociContext || "") +
      dynamicStateBlock +
      questInstructionInjection +
      pendingNarrativeBlock;

    // Add new user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // ==========================================
    // STAGE 2: CORE DIALOGUE STREAM
    // ==========================================
    // Generates dialogue and actions using the dedicated active chat LLM
    // with injected Stage 1 character state and narrative directions.

    contents = await executeChatRound({
      contents,
      pId,
      selectedModel,
      finalSystemInstruction,
      temperature: temperature ? parseFloat(temperature) : 0.75,
      geminiApiKey: userApiKey,
    });

    // Initialize variations list on newly generated model response
    const lastContent = contents[contents.length - 1];
    let lastModelText = "";
    if (lastContent && lastContent.role === "model") {
      lastModelText = lastContent.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";
      if (lastModelText) {
        lastContent.variations = [lastModelText];
        lastContent.activeVariationIndex = 0;
        await saveHistory(pId, contents);
      }
    }

    // ==========================================
    // STAGE 3: POST-INFERENCE STATE & QUEST ENGINE
    // ==========================================
    // Decoupled evaluation of post-turn character dynamic state shifts and
    // dedicated neural quest engine objective resolution.

    let updatedPersonality = activePersonality;
    let postStateShifts: string[] = [];

    if (activePersonality) {
      try {
        const evalResult = await evaluateDynamicCharacterState({
          personality: activePersonality,
          history: contents,
          userPersonaName: userPersona?.name || "User",
          model: characterStateModel,
          customApiKey: userApiKey,
          executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: (await loadNeuralModelsConfig()).fallbackModel }),
          moodEngineConfig: await loadMoodEngineConfig(),
        });

        activePersonality.state = evalResult.updatedState;
        characterState = evalResult.updatedState;
        postStateShifts = evalResult.shifts;

        const currentPersonalities = await loadPersonalities();
        const pIdx = currentPersonalities.findIndex((p: any) => p.id === pId);
        if (pIdx !== -1) {
          currentPersonalities[pIdx] = activePersonality;
          await savePersonalities(currentPersonalities);
        }
        updatedPersonality = activePersonality;

        // Record any notable state shift memories directly into the Memory Palace
        if (evalResult.memoryNotes && evalResult.memoryNotes.length > 0) {
          for (const note of evalResult.memoryNotes) {
            await addDrawer(pId, note).catch(() => {});
          }
        }
      } catch (stErr: any) {
        engineErrors.vitals = stErr.message || "Stage 3 Vitals Error";
        console.warn("Stage 3 Dynamic Character State evaluation error:", stErr);
      }
    }

    // Stage 3 Quest Engine Resolution:
    // If not already resolved in Stage 1, evaluate the complete turn using the dedicated Quest Engine model
    if (!completedQuest && pId) {
      try {
        const allQuests = await loadQuests();
        const characterName = activePersonality?.name || "Character";
        const userName = userPersona?.name || "User";
        const recentHistoryStr = contents.slice(-6).map((c: any) => {
          const sender = c.role === "user" ? userName : characterName;
          const text = c.parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "";
          return `${sender}: ${text}`;
        }).join("\n\n");

        const stage3QuestResult = await evaluateQuestEngineTurn({
          questConfig,
          allQuests,
          personalityId: pId,
          characterName,
          userName,
          userMessage: message,
          assistantReply: lastModelText,
          recentHistoryStr,
          questEngineModel,
          apiKey: userApiKey,
        });

        if (stage3QuestResult.completedQuest) {
          completedQuest = stage3QuestResult.completedQuest;
          systemInjectionNote = stage3QuestResult.systemInjectionNote;

          // Automated Quest Narrative Injection:
          // Queue a narrative note so the character's subsequent response immediately acknowledges the triumph
          if (questConfig.enableAutomatedQuestNarrativeInjections !== false && systemInjectionNote) {
            pendingNarrativeInjections[pId] = pendingNarrativeInjections[pId] || [];
            pendingNarrativeInjections[pId].push(systemInjectionNote);
          }
        }
      } catch (questFinalizeErr: any) {
        engineErrors.quests = questFinalizeErr.message || "Stage 3 Quest Error";
        console.warn("Stage 3 Quest Engine evaluation error:", questFinalizeErr);
      }
    }

    res.json({
      contents,
      recalledDrawers,
      activeEntities,
      characterState,
      personality: updatedPersonality,
      stateShifts: [...preStateShifts, ...postStateShifts],
      acceptedQuest,
      declinedQuest,
      completedQuest,
      systemInjectionNote,
      gameState: await loadUserGameState(),
      engineErrors,
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    logError({
      source: "chat",
      title: `Chat Generation Failure (${selectedModel})`,
      message: err.message || "Failed to generate chat response",
      details: err.stack || String(err),
      model: selectedModel,
      endpoint: "/api/chat",
      status: err.status || 500,
      personalityName: pId,
    }).catch(() => {});
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});




app.post("/api/chat/import-save", async (req, res) => {
  const { personalityId, history } = req.body;
  try {
    await saveHistory(personalityId, history);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat/select-variation", async (req, res) => {
  try {
    const { personalityId, messageIndex, variationIndex } = req.body;
    const pId = personalityId || "default";
    const contents = await loadHistory(pId);
    const targetIdx = typeof messageIndex === "number" ? messageIndex : contents.length - 1;

    if (targetIdx >= 0 && targetIdx < contents.length) {
      const msg = contents[targetIdx];
      if (
        msg &&
        msg.role === "model" &&
        Array.isArray(msg.variations) &&
        typeof variationIndex === "number" &&
        variationIndex >= 0 &&
        variationIndex < msg.variations.length
      ) {
        msg.activeVariationIndex = variationIndex;
        msg.parts = [{ text: msg.variations[variationIndex] }];
        await saveHistory(pId, contents);
        return res.json({ success: true, contents });
      }
    }
    res.status(400).json({ error: "Invalid variation selection" });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/chat/regenerate", async (req, res) => {
  const { personalityId, systemInstruction, model, messageIndex, temperature, geminiApiKey, userPersona: clientUserPersona } = req.body;
  const userApiKey = (typeof geminiApiKey === "string" && geminiApiKey.trim())
    ? geminiApiKey.trim()
    : ((req.headers["x-gemini-api-key"] as string) || undefined);
  const pId = personalityId || "default";
  const selectedModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";
  if (model) {
    setActiveSessionModel(model, userApiKey);
  }
  let baseSystemInstruction =
    systemInstruction ||
    "You are a helpful chat assistant with perfect memory.";

  try {
    const personalities = await loadPersonalities();
    const activePersonality = personalities.find((p: any) => p.id === pId);
    let userPersona: any = clientUserPersona?.name ? clientUserPersona : { name: "User" };
    if (!userPersona?.name || userPersona.name === "User") {
      try {
        const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
        const parsed = JSON.parse(uData);
        if (parsed?.name) userPersona = parsed;
      } catch {}
    }

    const charName = activePersonality?.name || "Character";
    const userName = userPersona?.name || "User";

    if (activePersonality) {
      baseSystemInstruction = resolveServerRoleplayMacros(
        baseSystemInstruction,
        charName,
        userName
      );
    }

    const identityAndFormattingRules = `\n\n--- Strict Roleplay Identity & Dialogue/Action Standards ---
- ACTIVE CHAT CHARACTER (YOU): You are ${charName}. In all scenario setups, lore books, character context, and prompts, the macro {{char}} (and {{character}}) ALWAYS refers directly to YOU (${charName}). If a scenario says "{{char}} is injured", it means YOU (${charName}) are injured.
- ACTIVE USER PERSONA: The person you are interacting with is ${userName}. In all scenario setups, lore books, user profiles, and prompts, the macro {{user}} ALWAYS refers directly to the active user persona (${userName}). If a scenario says "{{user}} is injured", it means ${userName} is injured.
- IDENTITY RULE: NEVER confuse your identity. You are ALWAYS ${charName} (the active chat character) and you are talking to ${userName} (the user persona). Do not act as the user, and do not attribute the character's actions or states to the user.
- SPOKEN WORDS: ALL words being spoken out loud MUST be enclosed between quotation marks " " (e.g., "Hello," she murmured, "how have you been?").
- THOUGHTS & ACTIONS: ALL thoughts, internal monologues, physical actions, body language, facial gestures, and narration MUST ALWAYS be enclosed between asterisks * * (e.g., *smiles warmly and takes a step closer, feeling relieved to see you*).
- Maintain this standard with 100% consistency across all responses.`;

    if (!baseSystemInstruction.includes("--- Strict Roleplay Identity & Dialogue/Action Standards ---")) {
      baseSystemInstruction += identityAndFormattingRules;
    }

    let contents = await loadHistory(pId);
    if (!contents || contents.length === 0) {
      return res.status(400).json({ error: "No chat history found to regenerate from" });
    }

    // Find the last user and model message indices in contents
    let lastUserIdx = -1;
    let lastModelIdx = -1;
    for (let i = contents.length - 1; i >= 0; i--) {
      if (lastUserIdx === -1 && contents[i].role === "user" && contents[i].parts?.some((p: any) => p.text)) {
        lastUserIdx = i;
      }
      if (lastModelIdx === -1 && contents[i].role === "model" && contents[i].parts?.some((p: any) => p.text)) {
        lastModelIdx = i;
      }
      if (lastUserIdx !== -1 && lastModelIdx !== -1) break;
    }

    if (lastUserIdx === -1) {
      return res.status(400).json({ error: "No user message found to regenerate from" });
    }

    // Enforce: only the last turn (either user's last message or personality's last message) can be regenerated
    if (typeof messageIndex === "number") {
      if (messageIndex !== lastModelIdx && messageIndex !== lastUserIdx) {
        return res.status(400).json({ error: "Only the last response can be regenerated." });
      }
    }

    const targetUserIdx = lastUserIdx;

    // Capture existing variations from the model message right after targetUserIdx
    let existingVariations: string[] = [];
    const targetModelIdx = targetUserIdx + 1;
    if (targetModelIdx < contents.length && contents[targetModelIdx].role === "model") {
      const existingModelMsg = contents[targetModelIdx];
      if (Array.isArray(existingModelMsg.variations) && existingModelMsg.variations.length > 0) {
        existingVariations = [...existingModelMsg.variations];
      } else {
        const prevText = existingModelMsg.parts?.map((p: any) => p.text).filter(Boolean).join("\n");
        if (prevText) {
          existingVariations = [prevText];
        }
      }
    }

    // Slice contents up to and including targetUserIdx for the new LLM prompt
    contents = contents.slice(0, targetUserIdx + 1);

    const lastUserText =
      contents[targetUserIdx].parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "";

    // 1. MemPalace Method of Loci Walkthrough
    const { contextText: palaceLociContext, recalledDrawers, activeEntities } = await walkPalaceForPrompt(
      pId,
      lastUserText
    );

    // Variation Directive:
    // Explicitly prompt the model to produce a full, engaging alternative response with dialogue and actions in asterisks.
    let reconsiderationDirective = "";
    if (existingVariations.length > 0) {
      const priorAttempts = existingVariations
        .slice(-2)
        .map((v, i) => `[Previous Variation #${i + 1}]:\n"${v.slice(0, 600)}"`)
        .join("\n\n");

      reconsiderationDirective = `\n\n[MANDATORY REGENERATION & VARIATION DIRECTIVE]:
The user requested a fresh alternative response for this scene turn.
${priorAttempts}

CRITICAL RULES:
1. Provide a FULL, ENGAGING, IN-CHARACTER scene response with spoken dialogue and rich physical actions/expressions wrapped in asterisks (*...*).
2. Take a new creative angle or emotional tone compared to the previous attempt(s).
3. Do NOT repeat the opening phrase or identical structure from the previous attempt.
4. STRICTLY PROHIBITED: Do NOT output conversational analysis, meta-commentary, apologies, confirmation phrases, or single-word answers (e.g., NEVER output "Okay", "Understood", "Certainly", or just one sentence). Dive straight into character with full substance.`;
    }

    const dynamicStateBlock = activePersonality
      ? `\n\n${formatCharacterStateForPrompt(ensureCharacterState(activePersonality), activePersonality.name || "Character")}`
      : "";
    const finalSystemInstruction = baseSystemInstruction + (palaceLociContext || "") + dynamicStateBlock + reconsiderationDirective;

    // Use higher temperature (default 0.95 or passed temperature) for distinct creative exploration during regeneration
    const genTemp = temperature ? parseFloat(temperature) : 0.95;

    contents = await executeChatRound({
      contents,
      pId,
      selectedModel,
      finalSystemInstruction,
      temperature: genTemp,
      geminiApiKey: userApiKey,
    });

    // Append the newly generated reply to the variations list
    const newModelMsg = contents[contents.length - 1];
    if (newModelMsg && newModelMsg.role === "model") {
      const newText = newModelMsg.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";
      if (newText) {
        if (!existingVariations.includes(newText)) {
          existingVariations.push(newText);
        }
        newModelMsg.variations = existingVariations;
        newModelMsg.activeVariationIndex = existingVariations.length - 1;
        await saveHistory(pId, contents);
      }
    }

    // Immediately evaluate dynamic character status shifts for regenerated response
    let updatedPersonality = activePersonality;
    let characterState = activePersonality ? ensureCharacterState(activePersonality) : undefined;
    let stateShifts: string[] = [];
    const engineErrors: { chat: string | null; quests: string | null; vitals: string | null } = {
      chat: null,
      quests: null,
      vitals: null,
    };

    if (activePersonality) {
      try {
        const neuralCfg = await loadNeuralModelsConfig();
        const evalResult = await evaluateDynamicCharacterState({
          personality: activePersonality,
          history: contents,
          userPersonaName: userPersona?.name || "User",
          model: neuralCfg.characterStateModel || neuralCfg.defaultModel || selectedModel,
          customApiKey: userApiKey,
          executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: neuralCfg.fallbackModel }),
          moodEngineConfig: await loadMoodEngineConfig(),
        });

        activePersonality.state = evalResult.updatedState;
        characterState = evalResult.updatedState;
        stateShifts = evalResult.shifts;

        const currentPersonalities = await loadPersonalities();
        const pIdx = currentPersonalities.findIndex((p: any) => p.id === pId);
        if (pIdx !== -1) {
          currentPersonalities[pIdx] = activePersonality;
          await savePersonalities(currentPersonalities);
        }
        updatedPersonality = activePersonality;

        if (evalResult.memoryNotes && evalResult.memoryNotes.length > 0) {
          for (const note of evalResult.memoryNotes) {
            await addDrawer(pId, note).catch(() => {});
          }
        }
      } catch (stErr: any) {
        engineErrors.vitals = stErr?.message || "Failed to evaluate character dynamic status after regeneration";
        console.warn("Failed to evaluate character dynamic status after regeneration:", stErr);
      }
    }

    res.json({
      contents,
      recalledDrawers,
      activeEntities,
      characterState,
      personality: updatedPersonality,
      stateShifts,
      engineErrors,
    });
  } catch (err: any) {
    console.error("Regenerate error:", err);
    logError({
      source: "chat",
      title: `Chat Regeneration Failure (${selectedModel})`,
      message: err.message || "Failed to regenerate chat response",
      details: err.stack || String(err),
      model: selectedModel,
      endpoint: "/api/chat/regenerate",
      status: err.status || 500,
      personalityName: pId,
    }).catch(() => {});
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/chat/edit", async (req, res) => {
  const { messageIndex, newMessage, personalityId, systemInstruction, model, temperature, geminiApiKey, userPersona: clientUserPersona } = req.body;
  const userApiKey = (typeof geminiApiKey === "string" && geminiApiKey.trim())
    ? geminiApiKey.trim()
    : ((req.headers["x-gemini-api-key"] as string) || undefined);

  if (typeof messageIndex !== "number" || !newMessage || !newMessage.trim()) {
    return res.status(400).json({ error: "messageIndex and non-empty newMessage are required" });
  }

  const pId = personalityId || "default";
  const selectedModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "";
  if (model) {
    setActiveSessionModel(model, userApiKey);
  }
  let baseSystemInstruction =
    systemInstruction ||
    "You are a helpful chat assistant with perfect memory.";

  try {
    const personalities = await loadPersonalities();
    const activePersonality = personalities.find((p: any) => p.id === pId);
    let userPersona: any = clientUserPersona?.name ? clientUserPersona : { name: "User" };
    if (!userPersona?.name || userPersona.name === "User") {
      try {
        const uData = await fs.readFile(USER_PERSONA_FILE, "utf-8");
        const parsed = JSON.parse(uData);
        if (parsed?.name) userPersona = parsed;
      } catch {}
    }

    const charName = activePersonality?.name || "Character";
    const userName = userPersona?.name || "User";

    if (activePersonality) {
      baseSystemInstruction = resolveServerRoleplayMacros(
        baseSystemInstruction,
        charName,
        userName
      );
    }

    const identityAndFormattingRules = `\n\n--- Strict Roleplay Identity & Dialogue/Action Standards ---
- ACTIVE CHAT CHARACTER (YOU): You are ${charName}. In all scenario setups, lore books, character context, and prompts, the macro {{char}} (and {{character}}) ALWAYS refers directly to YOU (${charName}). If a scenario says "{{char}} is injured", it means YOU (${charName}) are injured.
- ACTIVE USER PERSONA: The person you are interacting with is ${userName}. In all scenario setups, lore books, user profiles, and prompts, the macro {{user}} ALWAYS refers directly to the active user persona (${userName}). If a scenario says "{{user}} is injured", it means ${userName} is injured.
- IDENTITY RULE: NEVER confuse your identity. You are ALWAYS ${charName} (the active chat character) and you are talking to ${userName} (the user persona). Do not act as the user, and do not attribute the character's actions or states to the user.
- SPOKEN WORDS: ALL words being spoken out loud MUST be enclosed between quotation marks " " (e.g., "Hello," she murmured, "how have you been?").
- THOUGHTS & ACTIONS: ALL thoughts, internal monologues, physical actions, body language, facial gestures, and narration MUST ALWAYS be enclosed between asterisks * * (e.g., *smiles warmly and takes a step closer, feeling relieved to see you*).
- Maintain this standard with 100% consistency across all responses.`;

    if (!baseSystemInstruction.includes("--- Strict Roleplay Identity & Dialogue/Action Standards ---")) {
      baseSystemInstruction += identityAndFormattingRules;
    }

    let contents = await loadHistory(pId);
    if (!contents || contents.length === 0 || messageIndex < 0 || messageIndex >= contents.length) {
      return res.status(400).json({ error: "Invalid message index or empty chat history" });
    }

    // Determine the last user message index
    let lastUserIdx = -1;
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === "user" && contents[i].parts?.some((p: any) => p.text)) {
        lastUserIdx = i;
        break;
      }
    }

    // Enforce: ONLY the user's last response can be edited and regenerated
    if (messageIndex !== lastUserIdx) {
      return res.status(400).json({ error: "Only the user's last response can be edited and regenerated" });
    }

    // Truncate history up to and including the message being edited
    contents = contents.slice(0, messageIndex + 1);

    // Update target user message
    contents[messageIndex] = {
      role: "user",
      parts: [{ text: newMessage.trim() }],
    };

    // 1. MemPalace Method of Loci Walkthrough for edited text
    const { contextText: palaceLociContext, recalledDrawers, activeEntities } = await walkPalaceForPrompt(
      pId,
      newMessage.trim()
    );
    const dynamicStateBlock = activePersonality
      ? `\n\n${formatCharacterStateForPrompt(ensureCharacterState(activePersonality), activePersonality.name || "Character")}`
      : "";
    const finalSystemInstruction = baseSystemInstruction + (palaceLociContext || "") + dynamicStateBlock;

    contents = await executeChatRound({
      contents,
      pId,
      selectedModel,
      finalSystemInstruction,
      temperature: temperature ? parseFloat(temperature) : 0.75,
      geminiApiKey: userApiKey,
    });

    // Initialize variations for newly generated reply
    const lastContent = contents[contents.length - 1];
    if (lastContent && lastContent.role === "model") {
      const generatedText = lastContent.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";
      if (generatedText) {
        lastContent.variations = [generatedText];
        lastContent.activeVariationIndex = 0;
        await saveHistory(pId, contents);
      }
    }

    // Immediately evaluate dynamic character status shifts for edited turn
    let updatedPersonality = activePersonality;
    let characterState = activePersonality ? ensureCharacterState(activePersonality) : undefined;
    let stateShifts: string[] = [];
    const engineErrors: { chat: string | null; quests: string | null; vitals: string | null } = {
      chat: null,
      quests: null,
      vitals: null,
    };

    if (activePersonality) {
      try {
        const neuralCfg = await loadNeuralModelsConfig();
        const evalResult = await evaluateDynamicCharacterState({
          personality: activePersonality,
          history: contents,
          userPersonaName: userPersona?.name || "User",
          model: neuralCfg.characterStateModel || neuralCfg.defaultModel || selectedModel,
          customApiKey: userApiKey,
          executeInference: async (opts) => executeUniversalInference({ ...opts, fallbackModel: neuralCfg.fallbackModel }),
          moodEngineConfig: await loadMoodEngineConfig(),
        });

        activePersonality.state = evalResult.updatedState;
        characterState = evalResult.updatedState;
        stateShifts = evalResult.shifts;

        const currentPersonalities = await loadPersonalities();
        const pIdx = currentPersonalities.findIndex((p: any) => p.id === pId);
        if (pIdx !== -1) {
          currentPersonalities[pIdx] = activePersonality;
          await savePersonalities(currentPersonalities);
        }
        updatedPersonality = activePersonality;

        if (evalResult.memoryNotes && evalResult.memoryNotes.length > 0) {
          for (const note of evalResult.memoryNotes) {
            await addDrawer(pId, note).catch(() => {});
          }
        }
      } catch (stErr: any) {
        engineErrors.vitals = stErr?.message || "Failed to evaluate character dynamic status after edit";
        console.warn("Failed to evaluate character dynamic status after edit:", stErr);
      }
    }

    res.json({
      contents,
      recalledDrawers,
      activeEntities,
      characterState,
      personality: updatedPersonality,
      stateShifts,
      engineErrors,
    });
  } catch (err: any) {
    console.error("Chat edit error:", err);
    logError({
      source: "chat",
      title: `Chat Edit & Retry Failure (${selectedModel})`,
      message: err.message || "Failed to regenerate edited response",
      details: err.stack || String(err),
      model: selectedModel,
      endpoint: "/api/chat/edit",
      status: err.status || 500,
      personalityName: pId,
    }).catch(() => {});
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

app.post("/api/chat/message/update", async (req, res) => {
  try {
    const { personalityId, messageIndex, newText } = req.body;
    if (typeof messageIndex !== "number" || !newText || !newText.trim()) {
      return res.status(400).json({ error: "messageIndex and non-empty newText are required" });
    }
    const pId = personalityId || "default";
    const contents = await loadHistory(pId);
    if (!contents || contents.length === 0 || messageIndex < 0 || messageIndex >= contents.length) {
      return res.status(400).json({ error: "Invalid message index or empty chat history" });
    }

    let lastUserIdx = -1;
    let lastModelIdx = -1;
    for (let i = contents.length - 1; i >= 0; i--) {
      if (lastUserIdx === -1 && contents[i].role === "user") lastUserIdx = i;
      if (lastModelIdx === -1 && contents[i].role === "model") lastModelIdx = i;
    }

    const msg = contents[messageIndex];
    if (msg.role === "user" && messageIndex !== lastUserIdx) {
      return res.status(400).json({ error: "Only the user's last response can be edited" });
    }
    if (msg.role === "model" && messageIndex !== lastModelIdx) {
      return res.status(400).json({ error: "Only the personality's last response can be edited" });
    }

    const trimmed = newText.trim();
    msg.parts = [{ text: trimmed }];

    if (msg.role === "model") {
      if (Array.isArray(msg.variations) && msg.variations.length > 0) {
        const activeIdx = typeof msg.activeVariationIndex === "number" ? msg.activeVariationIndex : msg.variations.length - 1;
        if (activeIdx >= 0 && activeIdx < msg.variations.length) {
          msg.variations[activeIdx] = trimmed;
        } else {
          msg.variations.push(trimmed);
        }
      } else {
        msg.variations = [trimmed];
        msg.activeVariationIndex = 0;
      }
    }

    await saveHistory(pId, contents);
    res.json({ success: true, contents });
  } catch (err: any) {
    res.status(500).json({ error: err.message, engineErrors: { chat: err.message || "Stage 2 Chat Error", quests: null, vitals: null } });
  }
});

// Theme Settings Routes
const DEFAULT_THEME_SETTINGS = {
  userBubbleColor: "#181824",
  userTextColor: "#f3f4f6",
  botBubbleColor: "#121217",
  botTextColor: "#f3f4f6",
  bubbleRadius: "rounded",
  messagePadding: "normal",
  systemTextColor: "#9ca3af",
  bubbleBorderWidth: 1,
  bubbleGlow: false,
  accentColor: "#f59e0b",
  codeTheme: "github-dark",
  roleTagBackground: "#1e1e28",
  chatBackgroundType: "solid",
  chatBackgroundColor: "#0a0a0c",
  chatBackgroundGradient: "linear-gradient(to bottom right, #0a0a0c, #121217)",
  chatBackgroundImageUrl: "",
  chatBackgroundOpacity: 1,
  chatBackgroundBlur: 0,
  activePreset: "default"
};

app.get("/api/theme", async (req, res) => {
  try {
    const data = await fs.readFile(THEME_SETTINGS_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (e: any) {
    if (e.code === "ENOENT") {
      await fs.writeFile(THEME_SETTINGS_FILE, JSON.stringify(DEFAULT_THEME_SETTINGS, null, 2), "utf-8");
      res.json(DEFAULT_THEME_SETTINGS);
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

app.post("/api/theme", async (req, res) => {
  try {
    const merged = { ...DEFAULT_THEME_SETTINGS, ...req.body };
    await fs.writeFile(THEME_SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
    res.json(merged);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production" && !isPkg) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const __dirnameFallback = typeof __dirname !== 'undefined' ? __dirname : "";
    const distPath = isPkg ? __dirnameFallback : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
