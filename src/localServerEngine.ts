import path from "path";
import fs from "fs/promises";
import { LocalServerConfig, LocalServerSettings, LocalModelInfo, LocalServerType, GlobalGenerationSettings } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_SERVERS_FILE = path.join(DATA_DIR, "local_servers.json");

export const DEFAULT_SERVERS: LocalServerConfig[] = [
  {
    id: "jan-default",
    name: "Jan AI (Local API Server)",
    type: "jan",
    baseUrl: "http://127.0.0.1:1337",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
  },
  {
    id: "ollama-default",
    name: "Ollama",
    type: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
  },
  {
    id: "lmstudio-default",
    name: "LM Studio",
    type: "lmstudio",
    baseUrl: "http://127.0.0.1:1234",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
  },
  {
    id: "openrouter-default",
    name: "OpenRouter (Multi-Model Gateway)",
    type: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    enabled: false,
    apiKey: "",
    temperature: 0.7,
    maxTokens: 2048,
    customHeaders: {
      "HTTP-Referer": "https://ai.studio",
      "X-Title": "AI Studio Roleplay",
    },
  },
  {
    id: "ngrok-default",
    name: "Ngrok Local Tunnel",
    type: "ngrok",
    baseUrl: "https://your-tunnel.ngrok-free.app",
    enabled: false,
    temperature: 0.7,
    maxTokens: 2048,
    customHeaders: {
      "ngrok-skip-browser-warning": "true",
    },
  },
];

export const DEFAULT_SETTINGS: LocalServerSettings = {
  servers: DEFAULT_SERVERS,
  defaultTemperature: 0.7,
  defaultMaxTokens: 2048,
  autoDiscoverOnStartup: true,
};

export async function getLocalServerSettings(): Promise<LocalServerSettings> {
  try {
    const data = await fs.readFile(LOCAL_SERVERS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    
    // Ensure all default servers exist if missing
    const existingIds = new Set(parsed.servers?.map((s: LocalServerConfig) => s.id) || []);
    const mergedServers = [...(parsed.servers || [])];
    
    for (const def of DEFAULT_SERVERS) {
      if (!existingIds.has(def.id)) {
        mergedServers.push(def);
      }
    }

    return {
      servers: mergedServers,
      activeServerId: parsed.activeServerId,
      defaultTemperature: parsed.defaultTemperature ?? 0.7,
      defaultMaxTokens: parsed.defaultMaxTokens ?? 2048,
      autoDiscoverOnStartup: parsed.autoDiscoverOnStartup ?? true,
    };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveLocalServerSettings(settings: LocalServerSettings): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_SERVERS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export function cleanUrl(url: string): string {
  let cleaned = (url || "").trim();
  if (!cleaned) return "";
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, "");
}

function getRequestHeaders(server: LocalServerConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(server.customHeaders || {}),
  };
  if (server.apiKey && server.apiKey.trim()) {
    headers["Authorization"] = `Bearer ${server.apiKey.trim()}`;
  }
  if (server.type === "openrouter") {
    if (!headers["HTTP-Referer"]) headers["HTTP-Referer"] = "https://ai.studio";
    if (!headers["X-Title"]) headers["X-Title"] = "AI Studio Roleplay";
  }
  if (server.type === "ngrok") {
    headers["ngrok-skip-browser-warning"] = "true";
  }
  return headers;
}

export async function testServer(server: LocalServerConfig): Promise<{
  success: boolean;
  latencyMs: number;
  models: LocalModelInfo[];
  error?: string;
}> {
  const baseUrl = cleanUrl(server.baseUrl);
  if (!baseUrl) {
    return { success: false, latencyMs: 0, models: [], error: "Base URL is required" };
  }

  const startTime = Date.now();
  const headers = getRequestHeaders(server);

  try {
    if (server.type === "ollama") {
      // Try Ollama native endpoint first
      let url = `${baseUrl}/api/tags`;
      let res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);

      if (!res || !res.ok) {
        // Fallback to OpenAI compatible models endpoint
        url = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
        res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);
      }

      if (!res || !res.ok) {
        throw new Error(`Ollama server at ${baseUrl} is unreachable or returned status ${res?.status || "connection failed"}`);
      }

      const latencyMs = Date.now() - startTime;
      const data = await res.json();

      let models: LocalModelInfo[] = [];
      if (Array.isArray(data.models)) {
        models = data.models.map((m: any) => ({
          id: `ollama:${m.name}`,
          name: `Ollama: ${m.name}`,
          modelIdentifier: m.name,
          serverId: server.id,
          serverName: server.name,
          serverType: server.type,
          size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined,
          details: m.details,
        }));
      } else if (Array.isArray(data.data)) {
        models = data.data.map((m: any) => ({
          id: `ollama:${m.id}`,
          name: `Ollama: ${m.id}`,
          modelIdentifier: m.id,
          serverId: server.id,
          serverName: server.name,
          serverType: server.type,
        }));
      }

      return { success: true, latencyMs, models };
    }

    if (server.type === "jan") {
      // Jan OpenAI-compatible endpoints: /v1/models or /models
      let url = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
      let res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);

      if (!res || !res.ok) {
        url = `${baseUrl}/models`;
        res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);
      }

      if (!res || !res.ok) {
        throw new Error(`Jan server at ${baseUrl} is unreachable. Make sure Jan is running and Local API Server is enabled in Jan Settings -> Local API Server (default port: 1337).`);
      }

      const latencyMs = Date.now() - startTime;
      const data = await res.json();

      let models: LocalModelInfo[] = [];
      const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      
      models = list.map((m: any) => {
        const id = m.id || m.name;
        const displayName = m.name || m.id;
        const sizeFormatted = m.size ? (typeof m.size === "number" ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : m.size) : undefined;
        return {
          id: `jan:${id}`,
          name: `Jan: ${displayName}`,
          modelIdentifier: id,
          serverId: server.id,
          serverName: server.name,
          serverType: server.type,
          size: sizeFormatted,
          details: { format: m.format, engine: m.engine },
        };
      });

      return { success: true, latencyMs, models };
    }

    if (server.type === "lmstudio") {
      let url = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
      let res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);

      if (!res || !res.ok) {
        url = `${baseUrl}/models`;
        res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);
      }

      if (!res || !res.ok) {
        throw new Error(`LM Studio server at ${baseUrl} is unreachable. Ensure the Local Server is started in LM Studio (default port: 1234).`);
      }

      const latencyMs = Date.now() - startTime;
      const data = await res.json();

      const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      const models: LocalModelInfo[] = list.map((m: any) => ({
        id: `lmstudio:${m.id}`,
        name: `LM Studio: ${m.id}`,
        modelIdentifier: m.id,
        serverId: server.id,
        serverName: server.name,
        serverType: server.type,
      }));

      return { success: true, latencyMs, models };
    }

    if (server.type === "openrouter") {
      if (!server.apiKey || !server.apiKey.trim()) {
        return {
          success: false,
          latencyMs: 0,
          models: [],
          error: "OpenRouter API Key is missing. Please enter your OpenRouter API Key in server settings to discover and use OpenRouter models.",
        };
      }

      const url = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) }).catch((e) => {
        throw new Error(`Failed to connect to OpenRouter at ${url}: ${e.message}`);
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenRouter returned HTTP ${res.status}: ${errText || "Invalid API key or network failure"}`);
      }

      const latencyMs = Date.now() - startTime;
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : [];

      const models: LocalModelInfo[] = list.map((m: any) => ({
        id: `openrouter:${m.id}`,
        name: `OpenRouter: ${m.name || m.id}`,
        modelIdentifier: m.id,
        serverId: server.id,
        serverName: server.name,
        serverType: server.type,
        size: m.context_length ? `${Math.round(m.context_length / 1024)}k ctx` : undefined,
        details: { context_length: m.context_length, pricing: m.pricing },
      }));

      return { success: true, latencyMs, models };
    }

    if (server.type === "ngrok") {
      let url = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
      let res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) }).catch(() => null);

      if (!res || !res.ok) {
        url = `${baseUrl}/models`;
        res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) }).catch(() => null);
      }

      let isOllama = false;
      if (!res || !res.ok) {
        const ollamaUrl = `${baseUrl}/api/tags`;
        const oRes = await fetch(ollamaUrl, { headers, signal: AbortSignal.timeout(6000) }).catch(() => null);
        if (oRes && oRes.ok) {
          res = oRes;
          isOllama = true;
        }
      }

      if (!res || !res.ok) {
        throw new Error(`Ngrok tunnel at ${baseUrl} is unreachable or offline. Verify your local LLM and ngrok tunnel are both active.`);
      }

      const latencyMs = Date.now() - startTime;
      const data = await res.json();
      let models: LocalModelInfo[] = [];

      if (isOllama && Array.isArray(data.models)) {
        models = data.models.map((m: any) => ({
          id: `ngrok:${server.id}:${m.name}`,
          name: `Ngrok (Ollama): ${m.name}`,
          modelIdentifier: m.name,
          serverId: server.id,
          serverName: server.name,
          serverType: server.type,
          size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined,
        }));
      } else {
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        models = list.map((m: any) => ({
          id: `ngrok:${server.id}:${m.id || m.name}`,
          name: `Ngrok: ${m.name || m.id}`,
          modelIdentifier: m.id || m.name,
          serverId: server.id,
          serverName: server.name,
          serverType: server.type,
        }));
      }

      return { success: true, latencyMs, models };
    }

    // Custom OpenAI compatible server (vLLM, llama.cpp, text-gen-webui, etc.)
    let url = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
    let res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);

    if (!res || !res.ok) {
      url = `${baseUrl}/models`;
      res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) }).catch(() => null);
    }

    if (!res || !res.ok) {
      throw new Error(`Custom server at ${baseUrl} failed with status ${res?.status || "connection refused"}`);
    }

    const latencyMs = Date.now() - startTime;
    const data = await res.json();
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

    const models: LocalModelInfo[] = list.map((m: any) => ({
      id: `custom:${server.id}:${m.id}`,
      name: `${server.name}: ${m.id}`,
      modelIdentifier: m.id,
      serverId: server.id,
      serverName: server.name,
      serverType: server.type,
    }));

    return { success: true, latencyMs, models };

  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      models: [],
      error: err.message || "Failed to connect to local server",
    };
  }
}

export async function discoverAllLocalModels(): Promise<LocalModelInfo[]> {
  const settings = await getLocalServerSettings();
  const enabledServers = settings.servers.filter((s) => s.enabled);

  const results = await Promise.allSettled(
    enabledServers.map(async (server) => {
      const test = await testServer(server);
      return test.models;
    })
  );

  const allModels: LocalModelInfo[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      allModels.push(...r.value);
    }
  }

  return allModels;
}

export async function executeLocalChat(
  modelId: string,
  messages: { role: string; content: string }[],
  options?: Partial<GlobalGenerationSettings>
): Promise<string> {
  const settings = await getLocalServerSettings();

  // 1. Identify which server handles this model
  let serverType: LocalServerType | null = null;
  let rawModelName = modelId;
  let matchedServer: LocalServerConfig | undefined;

  if (modelId.startsWith("jan:")) {
    serverType = "jan";
    rawModelName = modelId.replace(/^jan:/, "");
    matchedServer = settings.servers.find((s) => s.type === "jan" && s.enabled) || settings.servers.find((s) => s.type === "jan");
  } else if (modelId.startsWith("ollama:")) {
    serverType = "ollama";
    rawModelName = modelId.replace(/^ollama:/, "");
    matchedServer = settings.servers.find((s) => s.type === "ollama" && s.enabled) || settings.servers.find((s) => s.type === "ollama");
  } else if (modelId.startsWith("lmstudio:")) {
    serverType = "lmstudio";
    rawModelName = modelId.replace(/^lmstudio:/, "");
    matchedServer = settings.servers.find((s) => s.type === "lmstudio" && s.enabled) || settings.servers.find((s) => s.type === "lmstudio");
  } else if (modelId.startsWith("custom:")) {
    const parts = modelId.split(":");
    if (parts.length >= 3) {
      const sId = parts[1];
      rawModelName = parts.slice(2).join(":");
      matchedServer = settings.servers.find((s) => s.id === sId);
    }
    serverType = "custom_openai";
  } else if (modelId.startsWith("openrouter:")) {
    serverType = "openrouter";
    rawModelName = modelId.replace(/^openrouter:/, "");
    matchedServer = settings.servers.find((s) => s.type === "openrouter" && s.enabled) || settings.servers.find((s) => s.type === "openrouter");
  } else if (modelId.startsWith("ngrok:")) {
    serverType = "ngrok";
    const parts = modelId.split(":");
    if (parts.length >= 3) {
      const sId = parts[1];
      rawModelName = parts.slice(2).join(":");
      matchedServer = settings.servers.find((s) => s.id === sId);
    } else {
      rawModelName = modelId.replace(/^ngrok:/, "");
      matchedServer = settings.servers.find((s) => s.type === "ngrok" && s.enabled) || settings.servers.find((s) => s.type === "ngrok");
    }
  }

  if (!matchedServer) {
    // Fallback search
    matchedServer = settings.servers.find((s) => s.enabled);
  }

  if (!matchedServer) {
    throw new Error(`No configured local server found for model: ${modelId}. Open Local LLM Settings to configure and enable your server.`);
  }

  const baseUrl = cleanUrl(matchedServer.baseUrl);
  const headers = getRequestHeaders(matchedServer);
  const temperature = options?.temperature ?? matchedServer.temperature ?? settings.defaultTemperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? matchedServer.maxTokens ?? settings.defaultMaxTokens ?? 2048;

  const buildOpenAiBody = () => {
    const body: any = {
      model: rawModelName,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: options?.topP ?? 1.0,
      frequency_penalty: options?.frequencyPenalty ?? 0.0,
      presence_penalty: options?.presencePenalty ?? 0.0,
      stream: false,
    };
    if (options?.logitBias && Object.keys(options.logitBias).length > 0) body.logit_bias = options.logitBias;
    if (options?.minP) body.min_p = options.minP;
    if (options?.topK) body.top_k = options.topK;
    if (options?.repetitionPenalty) body.repetition_penalty = options.repetitionPenalty;
    if (options?.dryMultiplier) {
      body.dry_multiplier = options.dryMultiplier;
      body.dry_base = options.dryBase;
      body.dry_allowed_length = options.dryAllowedLength;
      body.dry_sequence_breakers = options.drySequenceBreakers;
    }
    return body;
  };

  // Jan execution
  if (matchedServer.type === "jan") {
    const chatUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const body = buildOpenAiBody();

    let response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    }).catch((e) => {
      throw new Error(`Failed to communicate with Jan API Server at ${baseUrl}: ${e.message}. Verify Jan is running on port 1337.`);
    });

    if (!response.ok) {
      // Try fallback /chat/completions directly if /v1 failed
      const altUrl = `${baseUrl}/chat/completions`;
      response = await fetch(altUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      }).catch((e) => {
        throw new Error(`Jan server error (${response?.status}): ${e.message}`);
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Jan server returned HTTP ${response.status}: ${errText || "Check selected model in Jan"}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Ollama execution
  if (matchedServer.type === "ollama") {
    const chatUrl = `${baseUrl}/api/chat`;
    const body: any = {
      model: rawModelName,
      messages,
      options: {
        temperature,
        num_predict: maxTokens,
        top_p: options?.topP ?? 1.0,
        top_k: options?.topK ?? 40,
        presence_penalty: options?.presencePenalty ?? 0.0,
        frequency_penalty: options?.frequencyPenalty ?? 0.0,
        repeat_penalty: options?.repetitionPenalty ?? 1.1,
        min_p: options?.minP ?? 0.05,
        mirostat: options?.mirostat ?? 0,
        mirostat_tau: options?.mirostatTau ?? 5.0,
        mirostat_eta: options?.mirostatEta ?? 0.1,
        tfs_z: options?.tfsZ ?? 1.0,
      },
      stream: false,
    };

    const response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    }).catch((e) => {
      throw new Error(`Failed to communicate with Ollama at ${baseUrl}: ${e.message}`);
    });

    if (!response.ok) {
      // Try OpenAI compatibility endpoint
      const openAiUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
      const altRes = await fetch(openAiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(buildOpenAiBody()),
        signal: AbortSignal.timeout(60000),
      }).catch(() => null);

      if (altRes && altRes.ok) {
        const altData = await altRes.json();
        return altData.choices?.[0]?.message?.content || "";
      }

      const errText = await response.text().catch(() => "");
      throw new Error(`Ollama returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.message?.content || "";
  }

  // OpenRouter execution
  if (serverType === "openrouter" || matchedServer.type === "openrouter") {
    if (!matchedServer.apiKey || !matchedServer.apiKey.trim()) {
      throw new Error("OpenRouter API key is missing. Please enter your OpenRouter API Key in Neural Model & Server Settings.");
    }
    const chatUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const body = buildOpenAiBody();

    const response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    }).catch((e) => {
      throw new Error(`Failed to communicate with OpenRouter API: ${e.message}`);
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`OpenRouter returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Ngrok execution (supports OpenAI-compatible or Ollama-compatible backends)
  if (serverType === "ngrok" || matchedServer.type === "ngrok") {
    const chatUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const body = buildOpenAiBody();

    let response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    }).catch((e) => {
      throw new Error(`Failed to communicate with Ngrok tunnel at ${baseUrl}: ${e.message}`);
    });

    if (!response.ok && response.status === 404) {
      // Fallback: try Ollama endpoint behind ngrok
      const ollamaUrl = `${baseUrl}/api/chat`;
      const oBody: any = {
        model: rawModelName,
        messages,
        options: { temperature, num_predict: maxTokens },
        stream: false,
      };
      const oRes = await fetch(ollamaUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(oBody),
        signal: AbortSignal.timeout(90000),
      }).catch(() => null);

      if (oRes && oRes.ok) {
        const data = await oRes.json();
        return data.message?.content || "";
      }
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Ngrok endpoint returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // LM Studio & Custom OpenAI execution
  const chatUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const body = buildOpenAiBody();

  const response = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  }).catch((e) => {
    throw new Error(`Failed to communicate with ${matchedServer?.name || "Local Server"} at ${baseUrl}: ${e.message}`);
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`${matchedServer.name} returned HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
