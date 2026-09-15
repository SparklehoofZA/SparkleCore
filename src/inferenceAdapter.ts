import { GoogleGenAI } from "@google/genai";
import { executeLocalChat } from "./localServerEngine";
import { getGenerationSettings } from "./generationSettingsEngine";
import { logError } from "./errorLogStore";

// Global / Session dynamic default state
let sessionActiveModel: string = process.env.DEFAULT_MODEL || "";
let sessionCustomApiKey: string | undefined = undefined;

/**
 * Returns the currently active model from session state, falling back to process.env.DEFAULT_MODEL.
 */
export function getActiveSessionModel(): string {
  return sessionActiveModel || process.env.DEFAULT_MODEL || "";
}

/**
 * Updates the global/session default model state so that any background worker,
 * sub-agent, or status updater automatically targets this model.
 */
export function setActiveSessionModel(model: string, customApiKey?: string): void {
  if (model && typeof model === "string" && model.trim()) {
    sessionActiveModel = model.trim();
  }
  if (customApiKey !== undefined) {
    sessionCustomApiKey = customApiKey?.trim() || undefined;
  }
}

export function getActiveSessionApiKey(): string | undefined {
  return sessionCustomApiKey;
}

/**
 * Checks whether a given model string corresponds to a local or custom inference provider
 * (Jan, Ollama, LM Studio, OpenRouter, Ngrok, or custom server endpoint).
 */
export function isLocalOrCustomModel(modelId: string): boolean {
  if (!modelId) return false;
  const m = modelId.toLowerCase();
  return (
    m.startsWith("jan:") ||
    m.startsWith("ollama:") ||
    m.startsWith("lmstudio:") ||
    m.startsWith("custom:") ||
    m.startsWith("custom_openai:") ||
    m.startsWith("openrouter:") ||
    m.startsWith("ngrok:")
  );
}

export interface UniversalInferenceOptions {
  model?: string;
  messages?: { role: string; content: string }[];
  prompt?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseMimeType?: string;
  customApiKey?: string;
  personalityName?: string;
  fallbackModel?: string;
}

/**
 * Universal Central Provider Adapter:
 * Abstract inference execution that strictly honors the user's active selectedModel
 * and routes to the appropriate provider (OpenRouter, local servers, custom endpoints, or Gemini),
 * with graceful failover to process.env.DEFAULT_MODEL without hardcoded fallback model strings.
 */
export async function executeUniversalInference(
  options: UniversalInferenceOptions
): Promise<string> {
  let modelToUse =
    (options.model && options.model.trim()) ||
    getActiveSessionModel() ||
    process.env.DEFAULT_MODEL ||
    "";

  if (!modelToUse) {
    throw new Error(
      "No inference model selected and PROCESS.ENV.DEFAULT_MODEL is not configured. Please select an Active Model in settings."
    );
  }

  const customKeyToUse = options.customApiKey || sessionCustomApiKey;
  const genSettings = await getGenerationSettings().catch(() => ({} as any));
  const effectiveTemp =
    typeof options.temperature === "number"
      ? options.temperature
      : genSettings.temperature ?? 0.7;
  const effectiveMaxTokens =
    typeof options.maxTokens === "number"
      ? options.maxTokens
      : genSettings.maxTokens ?? 1500;

  // Format messages
  let messages: { role: string; content: string }[] = [];
  if (options.messages && options.messages.length > 0) {
    messages = [...options.messages];
    if (options.systemInstruction) {
      messages.unshift({ role: "system", content: options.systemInstruction });
    }
  } else if (options.prompt) {
    if (options.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    messages.push({ role: "user", content: options.prompt });
  }

  // Determine provider: Check for local, custom OpenAI, OpenRouter, or ngrok
  const isCustomOrLocal = isLocalOrCustomModel(modelToUse);
  const isExplicitGemini = modelToUse.startsWith("gemini-");

  if (isCustomOrLocal || !isExplicitGemini) {
    // Route through universal local/OpenRouter/custom server provider engine
    try {
      const responseText = await executeLocalChat(modelToUse, messages, {
        temperature: effectiveTemp,
        maxTokens: effectiveMaxTokens,
        topP: options.topP ?? genSettings.topP,
      });
      return responseText || "";
    } catch (err: any) {
      logError({
        source: "server",
        title: "Universal Provider Inference Error",
        message: err?.message || String(err),
        model: modelToUse,
        personalityName: options.personalityName,
      }).catch(() => {});

      if (options.fallbackModel && options.fallbackModel !== "none" && options.fallbackModel !== modelToUse) {
        console.warn(
          `[Universal Inference Auto-Recovery] Model "${modelToUse}" failed: ${err?.message}. Gracefully falling back to configured fallback model ${options.fallbackModel}.`
        );
        return await executeUniversalInference({
          ...options,
          model: options.fallbackModel,
          fallbackModel: "none",
        });
      } else {
        throw err;
      }
    }
  }

  // Route strictly through Google Gemini client using the requested selectedModel
  const effectiveKey = customKeyToUse?.trim() || undefined;
  if (!effectiveKey) {
    const errorMsg = "GEMINI_API_KEY is not configured and no custom API key provided.";
    logError({
      source: "server",
      title: "Gemini Key Missing",
      message: errorMsg,
      model: modelToUse,
      personalityName: options.personalityName,
    }).catch(() => {});
    throw new Error(errorMsg);
  }

  const aiClient = new GoogleGenAI({ apiKey: effectiveKey });

  // Format contents for Gemini
  const contents =
    options.prompt && (!options.messages || options.messages.length === 0)
      ? [{ role: "user", parts: [{ text: options.prompt }] }]
      : (options.messages || []).map((m) => ({
          role: m.role === "assistant" ? "model" : m.role === "system" ? "user" : m.role,
          parts: [{ text: m.content }],
        }));

  const config: any = {
    temperature: Math.min(2.0, Math.max(0.0, effectiveTemp)),
    maxOutputTokens: effectiveMaxTokens,
  };
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }
  if (typeof options.topP === "number") {
    config.topP = options.topP;
  }

  // Strictly invoke selectedModel with backoff on retryable rate limits
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await aiClient.models.generateContent({
        model: modelToUse,
        contents,
        config,
      });

      const responseText =
        response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return responseText;
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.status === 429 ||
        String(err?.message || "").includes("429") ||
        String(err?.message || "").includes("RESOURCE_EXHAUSTED");

      if (attempt < 2 && isRetryable) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      break;
    }
  }

  logError({
    source: "server",
    title: `Gemini Inference Error (${modelToUse})`,
    message: lastError?.message || String(lastError),
    model: modelToUse,
    status: lastError?.status || 500,
    personalityName: options.personalityName,
  }).catch(() => {});

  if (options.fallbackModel && options.fallbackModel !== "none" && options.fallbackModel !== modelToUse) {
    console.warn(
      `[Universal Inference Auto-Recovery] Gemini model "${modelToUse}" failed: ${lastError?.message}. Gracefully falling back to configured fallback model ${options.fallbackModel}.`
    );
    return await executeUniversalInference({
      ...options,
      model: options.fallbackModel,
      fallbackModel: "none",
    });
  }

  throw lastError || new Error(`Inference failed on model '${modelToUse}'`);
}
