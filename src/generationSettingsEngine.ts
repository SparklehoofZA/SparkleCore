import path from "path";
import fs from "fs/promises";
import { GlobalGenerationSettings } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "generation_settings.json");

export const DEFAULT_GENERATION_SETTINGS: GlobalGenerationSettings = {
  maxTokens: 1500,
  temperature: 0.88,
  topP: 0.95,
  topK: 40,
  frequencyPenalty: 0.1,
  presencePenalty: 0.0,
  repetitionPenalty: 1.05,
  minP: 0.06,
  mirostat: 0,
  mirostatTau: 5.0,
  mirostatEta: 0.1,
  tfsZ: 0.95,
  logitBias: {},
  dryMultiplier: 0.9,
  dryBase: 1.75,
  dryAllowedLength: 2,
  drySequenceBreakers: ["\n", ":", "\"", "*"],
};

export async function getGenerationSettings(): Promise<GlobalGenerationSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(data);
    const settings = { ...DEFAULT_GENERATION_SETTINGS, ...parsed };
    // Automatically migrate legacy 250 maxTokens default to avoid cutting off reasoning models
    if (!settings.maxTokens || settings.maxTokens < 800) {
      settings.maxTokens = 1500;
      await saveGenerationSettings(settings);
    }
    return settings;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await saveGenerationSettings(DEFAULT_GENERATION_SETTINGS);
      return DEFAULT_GENERATION_SETTINGS;
    }
    console.error("Error reading generation settings:", err);
    return DEFAULT_GENERATION_SETTINGS;
  }
}

export async function saveGenerationSettings(settings: GlobalGenerationSettings): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving generation settings:", err);
    throw err;
  }
}
