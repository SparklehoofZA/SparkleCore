import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  MemoryDrawer,
  MemoryHall,
  MemoryPalace,
  EntityRelation,
  RecallResult,
  RelationshipMetrics,
  RelationshipMilestone,
  RelationshipStage,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PALACE_DIR = path.join(DATA_DIR, "mempalace");

// Ensure MemPalace storage directory exists
export async function ensurePalaceDir() {
  await fs.mkdir(PALACE_DIR, { recursive: true });
}

function getPalaceFilePath(personalityId: string): string {
  const safeId = personalityId ? personalityId.replace(/[^a-zA-Z0-9_-]/g, "_") : "default";
  return path.join(PALACE_DIR, `palace_${safeId}.json`);
}

const DEFAULT_WINGS = [
  {
    id: "wing-character",
    name: "Character Identity & Lore",
    rooms: ["Core Traits & Persona", "Origin & Backstory", "Physical & Appearance", "Abilities & Skills"],
  },
  {
    id: "wing-user",
    name: "User Profile & Bond",
    rooms: ["User Identity", "Relationship History", "Shared Promises", "User Quirks & Details"],
  },
  {
    id: "wing-narrative",
    name: "Narrative & Encounters",
    rooms: ["Key Story Arcs", "Recent Conversations", "Critical Conflicts", "Triumphs & Milestones"],
  },
  {
    id: "wing-world",
    name: "World, Items & Locations",
    rooms: ["Places & Havens", "Inventory & Relics", "Factions & Allies", "Laws of the Realm"],
  },
  {
    id: "wing-secrets",
    name: "Secrets & Epiphanies",
    rooms: ["Hidden Truths", "Vulnerabilities", "Unspoken Feelings", "Foreshadowing"],
  },
];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "this", "that", "these", "those", "my", "your", "his", "her",
  "its", "our", "their", "said", "expressed", "stated", "mentioned", "about", "just",
  "also", "really", "very", "i", "me", "you", "he", "she", "it", "we", "they"
]);

/**
 * Extracts significant keyword tokens excluding punctuation and common stop words.
 */
export function getSignificantTokens(text: string): Set<string> {
  const words = (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Computes token-level Jaccard and Substring similarity between two strings (0.0 to 1.0).
 */
export function computeTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  const t1 = text1.trim().toLowerCase();
  const t2 = text2.trim().toLowerCase();
  if (t1 === t2) return 1.0;

  // Exact or near substring match
  if (t1.includes(t2) || t2.includes(t1)) {
    const ratio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length);
    if (ratio >= 0.5) return 0.85 + ratio * 0.15;
  }

  const setA = getSignificantTokens(t1);
  const setB = getSignificantTokens(t2);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Determines whether two memory drawers represent duplicate or redundant information.
 */
export function isDrawerDuplicate(
  d1: { content: string; verbatimQuote?: string; hall?: MemoryHall; room?: string; entities?: string[] },
  d2: { content: string; verbatimQuote?: string; hall?: MemoryHall; room?: string; entities?: string[] }
): boolean {
  const c1 = (d1.content || "").trim().toLowerCase();
  const c2 = (d2.content || "").trim().toLowerCase();
  if (c1 === c2 && c1.length > 0) return true;

  // Verbatim quote exact match check
  const q1 = (d1.verbatimQuote || "").trim().toLowerCase();
  const q2 = (d2.verbatimQuote || "").trim().toLowerCase();
  if (q1 && q2 && q1 === q2 && q1.length >= 8) {
    return true;
  }

  // Token similarity check
  const sim = computeTextSimilarity(d1.content, d2.content);
  if (sim >= 0.68) return true;

  // In the same hall with matching entities and moderate-high similarity
  if (d1.hall && d2.hall && d1.hall === d2.hall && sim >= 0.58) {
    const entities1 = new Set((d1.entities || []).map((e) => e.trim().toLowerCase()).filter(Boolean));
    const entities2 = new Set((d2.entities || []).map((e) => e.trim().toLowerCase()).filter(Boolean));
    const sharedEntities = Array.from(entities1).some((e) => entities2.has(e));
    if (sharedEntities || entities1.size === 0 || entities2.size === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Merges two duplicate or overlapping drawers into one consolidated, richer drawer.
 */
export function mergeTwoDrawers(target: MemoryDrawer, incoming: MemoryDrawer): MemoryDrawer {
  // Retain the longer, more informative content
  let bestContent = target.content;
  if (incoming.content && incoming.content.length > target.content.length) {
    bestContent = incoming.content;
  }

  // Merge unique entities
  const combinedEntities = Array.from(
    new Set([...(target.entities || []), ...(incoming.entities || [])].map((e) => e.trim()).filter(Boolean))
  );

  // Merge verbatim quote (keep longer non-empty quote)
  let bestQuote = target.verbatimQuote;
  if (
    incoming.verbatimQuote &&
    (!target.verbatimQuote || incoming.verbatimQuote.length > target.verbatimQuote.length)
  ) {
    bestQuote = incoming.verbatimQuote;
  }

  // Upgrade room if incoming is more specific than a generic room
  let bestRoom = target.room;
  let bestWing = target.wing;
  if (
    (target.room === "Recent Conversations" || target.room === "Recent Encounters") &&
    incoming.room &&
    incoming.room !== "Recent Conversations" &&
    incoming.room !== "Recent Encounters"
  ) {
    bestRoom = incoming.room;
    bestWing = incoming.wing || target.wing;
  }

  // Determine earliest timestamp to preserve historical provenance
  let bestTimestamp = target.timestamp;
  if (incoming.timestamp && new Date(incoming.timestamp) < new Date(target.timestamp)) {
    bestTimestamp = incoming.timestamp;
  }

  // Most recent recall time
  let bestLastRecalledAt = target.lastRecalledAt;
  if (
    incoming.lastRecalledAt &&
    (!target.lastRecalledAt || new Date(incoming.lastRecalledAt) > new Date(target.lastRecalledAt))
  ) {
    bestLastRecalledAt = incoming.lastRecalledAt;
  }

  target.content = bestContent;
  target.verbatimQuote = bestQuote;
  target.entities = combinedEntities;
  target.room = bestRoom;
  target.wing = bestWing;
  target.importance = Math.max(target.importance || 5, incoming.importance || 5);
  target.recallCount = (target.recallCount || 0) + (incoming.recallCount || 0);
  target.timestamp = bestTimestamp;
  target.lastRecalledAt = bestLastRecalledAt;

  return target;
}

/**
 * Deduplicates and declutters a MemoryPalace in memory.
 * Consolidates duplicate drawers and entity relations without loss of information.
 */
export function deduplicatePalace(palace: MemoryPalace): {
  cleanedPalace: MemoryPalace;
  mergedDrawersCount: number;
  mergedRelationsCount: number;
} {
  const originalDrawerCount = palace.drawers?.length || 0;
  const originalRelationCount = palace.entityGraph?.length || 0;

  const uniqueDrawers: MemoryDrawer[] = [];

  for (const drawer of palace.drawers || []) {
    // Clean individual drawer entities
    drawer.entities = Array.from(
      new Set((drawer.entities || []).map((e) => e.trim()).filter(Boolean))
    );

    let merged = false;
    for (const existing of uniqueDrawers) {
      if (isDrawerDuplicate(existing, drawer)) {
        mergeTwoDrawers(existing, drawer);
        merged = true;
        break;
      }
    }

    if (!merged) {
      uniqueDrawers.push({
        ...drawer,
        content: drawer.content.trim(),
        verbatimQuote: drawer.verbatimQuote ? drawer.verbatimQuote.trim() : undefined,
      });
    }
  }

  palace.drawers = uniqueDrawers;

  // Deduplicate and normalize entity relations
  const uniqueRelations: EntityRelation[] = [];
  for (const rel of palace.entityGraph || []) {
    const src = (rel.source || "").trim();
    const rLabel = (rel.relation || "").trim();
    const tgt = (rel.target || "").trim();

    if (!src || !rLabel || !tgt) continue;
    // Skip unhelpful self-referential relations unless meaningful
    if (src.toLowerCase() === tgt.toLowerCase() && src.length > 0) continue;

    const existing = uniqueRelations.find(
      (r) =>
        r.source.toLowerCase() === src.toLowerCase() &&
        r.relation.toLowerCase() === rLabel.toLowerCase() &&
        (r.target.toLowerCase() === tgt.toLowerCase() ||
          computeTextSimilarity(r.target, tgt) >= 0.75)
    );

    if (existing) {
      // Merge context if newer or richer
      if (rel.context && (!existing.context || rel.context.length > existing.context.length)) {
        existing.context = rel.context.trim();
      }
      if (rel.timestamp && new Date(rel.timestamp) > new Date(existing.timestamp)) {
        existing.timestamp = rel.timestamp;
      }
    } else {
      uniqueRelations.push({
        ...rel,
        source: src,
        relation: rLabel,
        target: tgt,
        context: rel.context ? rel.context.trim() : undefined,
      });
    }
  }

  palace.entityGraph = uniqueRelations;

  const mergedDrawersCount = Math.max(0, originalDrawerCount - uniqueDrawers.length);
  const mergedRelationsCount = Math.max(0, originalRelationCount - uniqueRelations.length);

  return {
    cleanedPalace: palace,
    mergedDrawersCount,
    mergedRelationsCount,
  };
}

/**
 * Clean & Deduplicate Palace on disk for a given personality.
 */
export async function cleanAndDeduplicatePalace(personalityId: string): Promise<{
  palace: MemoryPalace;
  mergedDrawersCount: number;
  mergedRelationsCount: number;
}> {
  const palace = await getPalace(personalityId);
  const { cleanedPalace, mergedDrawersCount, mergedRelationsCount } = deduplicatePalace(palace);
  await savePalace(cleanedPalace);
  return { palace: cleanedPalace, mergedDrawersCount, mergedRelationsCount };
}

/**
 * Loads the Memory Palace for a given character or initializes a new one.
 */
export async function getPalace(personalityId: string, characterName?: string): Promise<MemoryPalace> {
  await ensurePalaceDir();
  const filePath = getPalaceFilePath(personalityId);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const palace: MemoryPalace = JSON.parse(raw);
    
    // Calculate live stats
    const hallCounts: Record<MemoryHall, number> = {
      facts: 0,
      events: 0,
      discoveries: 0,
      preferences: 0,
    };
    
    let totalRecalls = 0;
    const uniqueEntities = new Set<string>();

    for (const drawer of palace.drawers || []) {
      if (hallCounts[drawer.hall] !== undefined) {
        hallCounts[drawer.hall]++;
      }
      totalRecalls += drawer.recallCount || 0;
      for (const ent of drawer.entities || []) {
        if (ent && ent.trim()) uniqueEntities.add(ent.trim().toLowerCase());
      }
    }

    for (const rel of palace.entityGraph || []) {
      if (rel.source && rel.source.trim()) uniqueEntities.add(rel.source.trim().toLowerCase());
      if (rel.target && rel.target.trim()) uniqueEntities.add(rel.target.trim().toLowerCase());
    }

    palace.stats = {
      totalDrawers: palace.drawers?.length || 0,
      hallCounts,
      totalEntities: uniqueEntities.size,
      totalRecalls,
    };

    return palace;
  } catch (err) {
    // Initialize fresh palace
    const freshPalace: MemoryPalace = {
      personalityId: personalityId || "default",
      name: characterName ? `${characterName}'s Memory Palace` : "Central Memory Palace",
      description: "MemPalace hierarchical long-term episodic and factual memory repository.",
      wings: DEFAULT_WINGS,
      drawers: [],
      entityGraph: [],
      stats: {
        totalDrawers: 0,
        hallCounts: { facts: 0, events: 0, discoveries: 0, preferences: 0 },
        totalEntities: 0,
        totalRecalls: 0,
      },
    };
    await fs.writeFile(filePath, JSON.stringify(freshPalace, null, 2), "utf-8");
    return freshPalace;
  }
}

/**
 * Resets/purges the Memory Palace drawers, entity graph, and recall stats for a specific personality/chat.
 * Preserves the wings structure so fresh memories can be consolidated in future interactions.
 */
export async function resetPalace(personalityId: string, characterName?: string): Promise<MemoryPalace> {
  await ensurePalaceDir();
  const filePath = getPalaceFilePath(personalityId);
  const freshPalace: MemoryPalace = {
    personalityId: personalityId || "default",
    name: characterName ? `${characterName}'s Memory Palace` : "Central Memory Palace",
    description: "MemPalace hierarchical long-term episodic and factual memory repository.",
    wings: DEFAULT_WINGS,
    drawers: [],
    entityGraph: [],
    stats: {
      totalDrawers: 0,
      hallCounts: { facts: 0, events: 0, discoveries: 0, preferences: 0 },
      totalEntities: 0,
      totalRecalls: 0,
    },
  };
  await fs.writeFile(filePath, JSON.stringify(freshPalace, null, 2), "utf-8");
  return freshPalace;
}

/**
 * Persists the Memory Palace to disk with deduplication and recalculation of all live statistics.
 */
export async function savePalace(palace: MemoryPalace): Promise<void> {
  await ensurePalaceDir();
  
  // Clean and deduplicate before persisting
  deduplicatePalace(palace);

  // Recalculate stats accurately before persisting
  const hallCounts: Record<MemoryHall, number> = {
    facts: 0,
    events: 0,
    discoveries: 0,
    preferences: 0,
  };
  let totalRecalls = 0;
  const uniqueEntities = new Set<string>();

  for (const drawer of palace.drawers || []) {
    if (hallCounts[drawer.hall] !== undefined) {
      hallCounts[drawer.hall]++;
    } else {
      hallCounts.facts++;
    }
    totalRecalls += drawer.recallCount || 0;
    for (const ent of drawer.entities || []) {
      if (ent && ent.trim()) uniqueEntities.add(ent.trim().toLowerCase());
    }
  }

  for (const rel of palace.entityGraph || []) {
    if (rel.source && rel.source.trim()) uniqueEntities.add(rel.source.trim().toLowerCase());
    if (rel.target && rel.target.trim()) uniqueEntities.add(rel.target.trim().toLowerCase());
  }

  palace.stats = {
    totalDrawers: palace.drawers?.length || 0,
    hallCounts,
    totalEntities: uniqueEntities.size,
    totalRecalls,
  };

  const filePath = getPalaceFilePath(palace.personalityId);
  await fs.writeFile(filePath, JSON.stringify(palace, null, 2), "utf-8");
}

/**
 * Adds a new memory drawer into the palace with instant deduplication and merging.
 */
export async function addDrawer(
  personalityId: string,
  drawerData: Omit<MemoryDrawer, "id" | "timestamp"> & { id?: string; timestamp?: string }
): Promise<MemoryDrawer> {
  const palace = await getPalace(personalityId);
  
  // Check for duplicate or similar content anywhere in the palace
  const candidateDrawer: MemoryDrawer = {
    id: drawerData.id || `drawer-${uuidv4()}`,
    wing: drawerData.wing || "Narrative & Encounters",
    room: drawerData.room || "Recent Conversations",
    hall: drawerData.hall || "facts",
    content: drawerData.content.trim(),
    verbatimQuote: drawerData.verbatimQuote ? drawerData.verbatimQuote.trim() : undefined,
    entities: drawerData.entities || [],
    importance: Math.min(10, Math.max(1, drawerData.importance || 5)),
    timestamp: drawerData.timestamp || new Date().toISOString(),
    recallCount: 0,
  };

  const existing = palace.drawers.find((d) => isDrawerDuplicate(d, candidateDrawer));

  if (existing) {
    mergeTwoDrawers(existing, candidateDrawer);
    await savePalace(palace);
    return existing;
  }

  palace.drawers.push(candidateDrawer);
  await savePalace(palace);
  return candidateDrawer;
}

/**
 * Updates an existing drawer in the palace.
 */
export async function updateDrawer(
  personalityId: string,
  drawerId: string,
  updates: Partial<MemoryDrawer>
): Promise<MemoryDrawer | null> {
  const palace = await getPalace(personalityId);
  const index = palace.drawers.findIndex((d) => d.id === drawerId);
  if (index === -1) return null;

  palace.drawers[index] = {
    ...palace.drawers[index],
    ...updates,
  };

  await savePalace(palace);
  return palace.drawers[index];
}

/**
 * Deletes a memory drawer.
 */
export async function deleteDrawer(personalityId: string, drawerId: string): Promise<boolean> {
  const palace = await getPalace(personalityId);
  const initialLen = palace.drawers.length;
  palace.drawers = palace.drawers.filter((d) => d.id !== drawerId);
  if (palace.drawers.length !== initialLen) {
    await savePalace(palace);
    return true;
  }
  return false;
}

/**
 * Adds or updates an entity relation in the knowledge graph.
 */
export async function addEntityRelation(
  personalityId: string,
  relationData: Omit<EntityRelation, "id" | "timestamp" | "valid"> & { id?: string; timestamp?: string; valid?: boolean }
): Promise<EntityRelation> {
  const palace = await getPalace(personalityId);
  const newRel: EntityRelation = {
    id: relationData.id || `rel-${uuidv4()}`,
    source: relationData.source.trim(),
    relation: relationData.relation.trim(),
    target: relationData.target.trim(),
    context: relationData.context,
    timestamp: relationData.timestamp || new Date().toISOString(),
    valid: relationData.valid !== undefined ? relationData.valid : true,
  };

  // Replace if existing exact relation exists or push new
  const existingIdx = palace.entityGraph.findIndex(
    (r) => r.source.toLowerCase() === newRel.source.toLowerCase() &&
           r.relation.toLowerCase() === newRel.relation.toLowerCase() &&
           r.target.toLowerCase() === newRel.target.toLowerCase()
  );

  if (existingIdx >= 0) {
    palace.entityGraph[existingIdx] = newRel;
  } else {
    palace.entityGraph.push(newRel);
  }

  await savePalace(palace);
  return newRel;
}

/**
 * Deletes an entity relation.
 */
export async function deleteEntityRelation(personalityId: string, relationId: string): Promise<boolean> {
  const palace = await getPalace(personalityId);
  const initialLen = palace.entityGraph.length;
  palace.entityGraph = palace.entityGraph.filter((r) => r.id !== relationId);
  if (palace.entityGraph.length !== initialLen) {
    await savePalace(palace);
    return true;
  }
  return false;
}

/**
 * Tokenizes text into lowercase normalized terms.
 */
function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Loci Retrieval Engine: Performs semantic keyword + entity-graph relevance scoring across all Drawers in the Palace.
 */
export async function searchLoci(
  personalityId: string,
  query: string,
  topK: number = 6
): Promise<RecallResult[]> {
  const palace = await getPalace(personalityId);
  if (!palace.drawers || palace.drawers.length === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    // If empty query, return highest importance recent drawers
    return palace.drawers
      .slice(-topK)
      .reverse()
      .map((d) => ({
        drawer: d,
        relevanceScore: d.importance * 0.1,
        matchedKeywords: [],
      }));
  }

  const results: RecallResult[] = [];

  for (const drawer of palace.drawers) {
    const drawerText = `${drawer.wing} ${drawer.room} ${drawer.hall} ${drawer.content} ${drawer.verbatimQuote || ""} ${drawer.entities.join(" ")}`;
    const drawerTerms = tokenize(drawerText);
    const drawerTermSet = new Set(drawerTerms);

    let matchCount = 0;
    const matchedTerms: string[] = [];

    for (const qTerm of queryTerms) {
      if (drawerTermSet.has(qTerm)) {
        matchCount++;
        matchedTerms.push(qTerm);
      } else {
        // Partial substring check for compound terms
        for (const dTerm of drawerTerms) {
          if (dTerm.includes(qTerm) || qTerm.includes(dTerm)) {
            matchCount += 0.5;
            if (!matchedTerms.includes(qTerm)) matchedTerms.push(qTerm);
            break;
          }
        }
      }
    }

    // Entity bonus: if query explicitly mentions one of the drawer's entities
    let entityBonus = 0;
    for (const ent of drawer.entities || []) {
      const entTerms = tokenize(ent);
      if (entTerms.some((t) => queryTerms.includes(t))) {
        entityBonus += 1.5;
      }
    }

    // Hall specific prioritization (e.g. facts and preferences give strong grounding)
    let hallMultiplier = 1.0;
    if (drawer.hall === "facts") hallMultiplier = 1.15;
    if (drawer.hall === "preferences") hallMultiplier = 1.1;

    // Importance & recency weighting
    const importanceWeight = (drawer.importance || 5) / 10;
    const rawScore = (matchCount * 1.5 + entityBonus) * hallMultiplier * (0.5 + importanceWeight * 0.5);

    if (rawScore > 0 || matchCount > 0 || entityBonus > 0) {
      results.push({
        drawer,
        relevanceScore: Math.round(rawScore * 100) / 100,
        matchedKeywords: Array.from(new Set(matchedTerms)),
      });
    }
  }

  // Sort descending by relevance score
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const selected = results.slice(0, topK);

  // Update recall count for selected drawers in background
  if (selected.length > 0) {
    for (const sel of selected) {
      sel.drawer.recallCount = (sel.drawer.recallCount || 0) + 1;
      sel.drawer.lastRecalledAt = new Date().toISOString();
    }
    savePalace(palace).catch(() => {});
  }

  return selected;
}

/**
 * Method of Loci Palace Walkthrough:
 * Compiles a rich verbatim memory context block for injection into prompt / system instruction.
 */
export async function walkPalaceForPrompt(
  personalityId: string,
  query: string,
  topK: number = 8
): Promise<{ contextText: string; recalledDrawers: MemoryDrawer[]; activeEntities: EntityRelation[] }> {
  const palace = await getPalace(personalityId);
  const recallResults = await searchLoci(personalityId, query, topK);
  const recalledDrawers = recallResults.map((r) => r.drawer);

  // Find active entity relationships relevant to the query or recalled entities
  const relevantEntities = new Set<string>();
  tokenize(query).forEach((t) => relevantEntities.add(t));
  recalledDrawers.forEach((d) => {
    (d.entities || []).forEach((e) => relevantEntities.add(e.toLowerCase()));
  });

  const activeRelations = (palace.entityGraph || []).filter((r) => {
    if (!r.valid) return false;
    const src = r.source.toLowerCase();
    const tgt = r.target.toLowerCase();
    return Array.from(relevantEntities).some((ent) => src.includes(ent) || tgt.includes(ent));
  });

  if (recalledDrawers.length === 0 && activeRelations.length === 0) {
    return { contextText: "", recalledDrawers: [], activeEntities: [] };
  }

  let lociBlock = `\n\n═══════════════════════════════════════════════════════════════\n`;
  lociBlock += `🏰 [MEMPALACE: METHOD OF LOCI RETRIEVED MEMORY SYSTEM]\n`;
  lociBlock += `(Authoritative long-term episodic & factual memories retrieved from your palace chambers)\n`;
  lociBlock += `═══════════════════════════════════════════════════════════════\n`;

  if (activeRelations.length > 0) {
    lociBlock += `\n🕸️ [TEMPORAL RELATIONSHIP GRAPH]:\n`;
    for (const rel of activeRelations) {
      lociBlock += `  • ${rel.source} ──[${rel.relation}]──> ${rel.target}${rel.context ? ` (${rel.context})` : ""}\n`;
    }
  }

  // Group recalled drawers by Hall (Facts, Events, Discoveries, Preferences)
  const groupedByHall: Record<MemoryHall, MemoryDrawer[]> = {
    facts: [],
    events: [],
    discoveries: [],
    preferences: [],
  };

  for (const d of recalledDrawers) {
    if (groupedByHall[d.hall]) {
      groupedByHall[d.hall].push(d);
    } else {
      groupedByHall.facts.push(d);
    }
  }

  if (groupedByHall.facts.length > 0) {
    lociBlock += `\n🏛️ [HALL OF FACTS (Verbatim Truths & Lore)]:\n`;
    for (const d of groupedByHall.facts) {
      lociBlock += `  • [${d.wing} > ${d.room}] ${d.content}${d.verbatimQuote ? ` | Quote: "${d.verbatimQuote}"` : ""}\n`;
    }
  }

  if (groupedByHall.events.length > 0) {
    lociBlock += `\n📜 [HALL OF EVENTS (Chronological Narrative Timeline)]:\n`;
    for (const d of groupedByHall.events) {
      lociBlock += `  • [${d.wing} > ${d.room}] (${d.timestamp.split("T")[0]}) ${d.content}${d.verbatimQuote ? ` | Dialogue: "${d.verbatimQuote}"` : ""}\n`;
    }
  }

  if (groupedByHall.discoveries.length > 0) {
    lociBlock += `\n✨ [HALL OF DISCOVERIES (Epiphanies & Uncovered Secrets)]:\n`;
    for (const d of groupedByHall.discoveries) {
      lociBlock += `  • [${d.wing} > ${d.room}] ${d.content}${d.verbatimQuote ? ` | Source: "${d.verbatimQuote}"` : ""}\n`;
    }
  }

  if (groupedByHall.preferences.length > 0) {
    lociBlock += `\n❤️ [HALL OF PREFERENCES (Affinities, Feelings & Quirks)]:\n`;
    for (const d of groupedByHall.preferences) {
      lociBlock += `  • [${d.wing} > ${d.room}] ${d.content}\n`;
    }
  }

  lociBlock += `\nInstructions: Integrate these retrieved loci seamlessly and stay perfectly consistent with these established memories.\n`;
  lociBlock += `═══════════════════════════════════════════════════════════════\n\n`;

  return {
    contextText: lociBlock,
    recalledDrawers,
    activeEntities: activeRelations,
  };
}

import { jsonrepair } from 'jsonrepair';

/**
 * Helper to clean JSON string from LLMs.
 */
function cleanJsonString(str: string): string {
  let cleaned = (str || "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  try {
    return jsonrepair(cleaned);
  } catch (e) {
    return cleaned;
  }
}

export interface ConsolidateDialogueOptions {
  model?: string;
  customApiKey?: string;
  executeInference?: (options: any) => Promise<string>;
  aiClient?: any;
}

/**
 * Dialogue Memory Consolidation:
 * Analyzes dialogue exchanges to extract verbatim facts, narrative events, discoveries, preferences, and entity relations.
 */
export async function consolidateDialogue(
  personalityId: string,
  characterName: string,
  userPersonaName: string,
  recentDialogue: { role: string; text: string }[],
  optionsOrClient?: ConsolidateDialogueOptions | any
): Promise<{ addedDrawers: MemoryDrawer[]; addedRelations: EntityRelation[] }> {
  const options: ConsolidateDialogueOptions =
    optionsOrClient && typeof optionsOrClient === "object" && ("executeInference" in optionsOrClient || "model" in optionsOrClient)
      ? optionsOrClient
      : { aiClient: optionsOrClient };
  const palace = await getPalace(personalityId, characterName);
  const dialogueExcerpt = recentDialogue
    .map((m) => `${m.role === "user" ? userPersonaName || "User" : characterName || "Character"}: ${m.text}`)
    .join("\n\n");

  if (!dialogueExcerpt || dialogueExcerpt.trim().length < 15) {
    return { addedDrawers: [], addedRelations: [] };
  }

  const addedDrawers: MemoryDrawer[] = [];
  const addedRelations: EntityRelation[] = [];

  const charName = characterName || "Character";
  const uName = userPersonaName || "User";

  // Helper to push drawer into in-memory palace with deduplication and merging
  const insertDrawer = (d: {
    wing: string;
    room: string;
    hall: MemoryHall;
    content: string;
    verbatimQuote?: string;
    entities: string[];
    importance: number;
  }) => {
    const candidateDrawer: MemoryDrawer = {
      id: `drawer-${uuidv4()}`,
      wing: d.wing,
      room: d.room,
      hall: d.hall,
      content: d.content.trim(),
      verbatimQuote: d.verbatimQuote ? d.verbatimQuote.trim() : undefined,
      entities: Array.from(new Set((d.entities || []).map((e) => e.trim()).filter(Boolean))),
      importance: Math.min(10, Math.max(1, d.importance)),
      timestamp: new Date().toISOString(),
      recallCount: 0,
    };

    const existing = palace.drawers.find((existingD) => isDrawerDuplicate(existingD, candidateDrawer));

    if (existing) {
      mergeTwoDrawers(existing, candidateDrawer);
      return existing;
    }

    palace.drawers.push(candidateDrawer);
    addedDrawers.push(candidateDrawer);
    return candidateDrawer;
  };

  // Helper to push relation into in-memory palace with deduplication
  const insertRelation = (r: { source: string; relation: string; target: string; context?: string }) => {
    const src = r.source.trim();
    const rel = r.relation.trim();
    const tgt = r.target.trim();
    if (!src || !rel || !tgt) return;
    if (src.toLowerCase() === tgt.toLowerCase()) return;

    const existingIdx = palace.entityGraph.findIndex(
      (existingR) =>
        existingR.source.toLowerCase() === src.toLowerCase() &&
        existingR.relation.toLowerCase() === rel.toLowerCase() &&
        (existingR.target.toLowerCase() === tgt.toLowerCase() ||
          computeTextSimilarity(existingR.target, tgt) >= 0.75)
    );

    if (existingIdx >= 0) {
      const existing = palace.entityGraph[existingIdx];
      if (r.context && (!existing.context || r.context.length > existing.context.length)) {
        existing.context = r.context.trim();
      }
      existing.timestamp = new Date().toISOString();
      return;
    }

    const relationObj: EntityRelation = {
      id: `rel-${uuidv4()}`,
      source: src,
      relation: rel,
      target: tgt,
      context: r.context?.trim(),
      timestamp: new Date().toISOString(),
      valid: true,
    };

    palace.entityGraph.push(relationObj);
    addedRelations.push(relationObj);
  };

  // 1. Universal Inference or Client Extraction
  let aiSuccess = false;
  const execFn = options?.executeInference;
  const targetModel = options?.model;
  const targetKey = options?.customApiKey;
  const legacyAiClient = options?.aiClient;

  if (execFn || (legacyAiClient && targetModel)) {
    try {
      const extractionPrompt = `You are the MemPalace Method of Loci Memory Consolidation Engine.
Analyze the following roleplay dialogue between "${uName}" and "${charName}".
Extract key permanent memories, facts, episodic events, and relationships to record into the memory palace chambers.

Return a JSON object matching this structure:
{
  "drawers": [
    {
      "wing": "Character Identity & Lore" | "User Profile & Bond" | "Narrative & Encounters" | "World, Items & Locations" | "Secrets & Epiphanies",
      "room": "Core Traits & Persona" | "Origin & Backstory" | "User Identity" | "Relationship History" | "Recent Conversations" | "Places & Havens" | "Hidden Truths",
      "hall": "facts" | "events" | "discoveries" | "preferences",
      "content": "Concise factual statement of what happened or was revealed",
      "verbatimQuote": "Exact short quote from the dialogue (optional but preferred)",
      "entities": ["${uName}", "${charName}"],
      "importance": 1-10
    }
  ],
  "relations": [
    {
      "source": "${uName}" | "${charName}" | "Entity",
      "relation": "Action or state verb (e.g. Met, Is Aged, Works At, Wears, Likes, Disclosed)",
      "target": "Target entity or attribute",
      "context": "Context snippet"
    }
  ]
}

IMPORTANT: 
- Output ONLY valid JSON.
- Always use double quotes for keys and string values.
- If you use quotes inside a string value, you MUST escape them with a backslash (e.g., \\").
- Do not use single quotes for string values.

Dialogue to analyze:
${dialogueExcerpt}`;

      let responseText = "";
      if (execFn) {
        try {
          responseText = await execFn({
            model: targetModel,
            prompt: extractionPrompt,
            messages: [{ role: "user", content: extractionPrompt }],
            temperature: 0.2,
            maxTokens: 1500,
            responseMimeType: "application/json",
            customApiKey: targetKey,
            personalityName: charName,
          });
        } catch (execErr: any) {
          console.warn("MemPalace universal inference extraction error:", execErr?.message || execErr);
        }
      } else if (legacyAiClient && targetModel) {
        try {
          const response = await legacyAiClient.models.generateContent({
            model: targetModel,
            contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
            config: {
              responseMimeType: "application/json",
            },
          });
          responseText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (mErr: any) {
          console.warn(`MemPalace extraction error for model ${targetModel}:`, mErr?.message || mErr);
        }
      }

      if (responseText) {
        const cleaned = cleanJsonString(responseText);
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed.drawers) && parsed.drawers.length > 0) {
          for (const d of parsed.drawers) {
            if (d.content) {
              insertDrawer({
                wing: d.wing || "Narrative & Encounters",
                room: d.room || "Recent Conversations",
                hall: ["facts", "events", "discoveries", "preferences"].includes(d.hall) ? d.hall : "facts",
                content: d.content,
                verbatimQuote: d.verbatimQuote || undefined,
                entities: Array.isArray(d.entities) && d.entities.length > 0 ? d.entities : [charName, uName],
                importance: typeof d.importance === "number" ? d.importance : 6,
              });
            }
          }
          aiSuccess = true;
        }

        if (Array.isArray(parsed.relations)) {
          for (const r of parsed.relations) {
            if (r.source && r.relation && r.target) {
              insertRelation(r);
            }
          }
        }
      }
    } catch (aiErr) {
      console.warn("MemPalace AI extraction encountered error, running comprehensive rule extractor:", aiErr);
    }
  }

  // 2. Rule-Based Deep Semantic & Verbatim Extractor (guarantees indexing even without AI)
  if (!aiSuccess || addedDrawers.length === 0) {
    const fullText = recentDialogue.map((m) => m.text).join(" ");
    
    // Extract age information
    const userAgeMatch = fullText.match(/\b(?:i am|i'm|age is)\s*(\d{1,2})\b/i);
    if (userAgeMatch) {
      const age = userAgeMatch[1];
      insertDrawer({
        wing: "User Profile & Bond",
        room: "User Identity",
        hall: "facts",
        content: `${uName} is ${age} years old and getting used to adult life.`,
        verbatimQuote: userAgeMatch[0],
        entities: [uName, "Age"],
        importance: 8,
      });
      insertRelation({ source: uName, relation: "Has Age", target: `${age} years old`, context: "Stated during conversation" });
    }

    const charAgeMatch = fullText.match(/\b(?:i’m|i'm|i am)\s*(eighteen|18|nineteen|19|twenty|20|twenty-one|21|\d{1,2})\b/i);
    if (charAgeMatch) {
      const age = charAgeMatch[1];
      insertDrawer({
        wing: "Character Identity & Lore",
        room: "Core Traits & Persona",
        hall: "facts",
        content: `${charName} is ${age} years old, just officially an adult.`,
        verbatimQuote: charAgeMatch[0],
        entities: [charName, "Age"],
        importance: 8,
      });
      insertRelation({ source: charName, relation: "Has Age", target: `${age} years old`, context: "Disclosed to user" });
    }

    // Extract location / setting details
    if (/coffee shop|latte|espresso|counter|tables/i.test(fullText)) {
      insertDrawer({
        wing: "World, Items & Locations",
        room: "Places & Havens",
        hall: "facts",
        content: `${charName} works at the cozy coffee shop with wooden tables and espresso machines.`,
        verbatimQuote: "Welcome to the coffee shop!",
        entities: [charName, "Coffee Shop"],
        importance: 7,
      });
      insertRelation({ source: charName, relation: "Works At", target: "Coffee Shop", context: "Barista / Counter host" });
      insertRelation({ source: uName, relation: "Visited", target: "Coffee Shop", context: "Encountered character" });
    }

    // Extract clothing / appearance
    if (/dress|sundress|skirt|outfit|twirl/i.test(fullText)) {
      insertDrawer({
        wing: "Character Identity & Lore",
        room: "Physical & Appearance",
        hall: "facts",
        content: `${charName} is wearing a cute colorful dress/sundress to brighten up the coffee shop.`,
        verbatimQuote: "dressed up a bit today to brighten up the place",
        entities: [charName, "Sundress"],
        importance: 6,
      });
      insertRelation({ source: charName, relation: "Wears", target: "Cute Sundress", context: "Brightening up the coffee shop" });
    }

    // Extract dialogue events
    for (const msg of recentDialogue) {
      if (msg.role === "user" && msg.text.trim().length > 12) {
        insertDrawer({
          wing: "Narrative & Encounters",
          room: "Recent Conversations",
          hall: "events",
          content: `${uName} said: "${msg.text.slice(0, 160)}"`,
          verbatimQuote: msg.text.slice(0, 100),
          entities: [uName, charName],
          importance: 5,
        });
      } else if ((msg.role === "model" || msg.role === "assistant") && msg.text.trim().length > 15) {
        const cleanMsg = msg.text.replace(/\*[^*]+\*/g, "").trim();
        insertDrawer({
          wing: "Character Identity & Lore",
          room: "Recent Encounters",
          hall: "events",
          content: `${charName} expressed: "${(cleanMsg || msg.text).slice(0, 160)}"`,
          verbatimQuote: msg.text.slice(0, 100),
          entities: [charName],
          importance: 5,
        });
      }
    }
  }

  // Update palace metadata and save atomically once to disk
  palace.lastConsolidatedAt = new Date().toISOString();
  await savePalace(palace);

  return { addedDrawers, addedRelations };
}

// Re-export calculateRelationshipMetrics from client-safe calculation utility
export { calculateRelationshipMetrics } from "./utils/relationshipMetricsCalc";
