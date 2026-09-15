import fs from "fs/promises";
import path from "path";
import { ErrorLogEntry, ErrorLogSource } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const ERROR_LOGS_FILE = path.join(DATA_DIR, "error-logs.json");
const MAX_LOGS = 250;

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // Directory already exists
  }
}

export async function loadErrorLogs(): Promise<ErrorLogEntry[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(ERROR_LOGS_FILE, "utf-8");
    const logs = JSON.parse(data);
    if (Array.isArray(logs)) {
      return logs;
    }
    return [];
  } catch (e) {
    return [];
  }
}

export async function saveErrorLogs(logs: ErrorLogEntry[]): Promise<void> {
  await ensureDataDir();
  const trimmed = logs.slice(0, MAX_LOGS);
  await fs.writeFile(ERROR_LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

export async function logError(
  entry: Omit<ErrorLogEntry, "id" | "timestamp">
): Promise<ErrorLogEntry> {
  try {
    const currentLogs = await loadErrorLogs();
    const newEntry: ErrorLogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Prepend newest error first
    const updated = [newEntry, ...currentLogs].slice(0, MAX_LOGS);
    await saveErrorLogs(updated);
    return newEntry;
  } catch (e) {
    console.error("Failed to write error log to disk:", e);
    return {
      id: `err_fallback_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
  }
}

export async function getErrorLogsFiltered(options?: {
  source?: "all" | ErrorLogSource;
  search?: string;
}): Promise<ErrorLogEntry[]> {
  const logs = await loadErrorLogs();
  let result = logs;

  if (options?.source && options.source !== "all") {
    result = result.filter((l) => l.source === options.source);
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    result = result.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.message.toLowerCase().includes(q) ||
        (l.model && l.model.toLowerCase().includes(q)) ||
        (l.endpoint && l.endpoint.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.personalityName && l.personalityName.toLowerCase().includes(q))
    );
  }

  return result;
}

export async function clearErrorLogs(source?: "all" | ErrorLogSource): Promise<void> {
  if (!source || source === "all") {
    await saveErrorLogs([]);
    return;
  }
  const logs = await loadErrorLogs();
  const kept = logs.filter((l) => l.source !== source);
  await saveErrorLogs(kept);
}

export async function deleteErrorLogById(id: string): Promise<boolean> {
  const logs = await loadErrorLogs();
  const kept = logs.filter((l) => l.id !== id);
  if (kept.length !== logs.length) {
    await saveErrorLogs(kept);
    return true;
  }
  return false;
}
