import {
  MemoryPalace,
  RelationshipMetrics,
  RelationshipStage,
  RelationshipMilestone,
} from "../types";

/**
 * Pure calculation utility to compute live relationship standing, bond score, and metrics
 * directly from a character's MemPalace memory repository.
 * Safe for both browser client and Node server usage (no fs/path dependencies).
 */
export function calculateRelationshipMetrics(
  palace: MemoryPalace,
  personalityName?: string,
  userName?: string
): RelationshipMetrics {
  const charName = personalityName || palace.name || "Character";
  const uName = userName || "User";
  const drawers = palace.drawers || [];
  const entityGraph = palace.entityGraph || [];

  const totalDrawers = drawers.length;
  const totalRecalls = drawers.reduce((sum, d) => sum + (d.recallCount || 0), 0);

  // Distinct wings covered
  const uniqueWings = new Set(drawers.map((d) => d.wing).filter(Boolean));
  const sharedWingsCovered = uniqueWings.size;

  // Categorize drawers
  const factsDrawers = drawers.filter((d) => d.hall === "facts");
  const eventsDrawers = drawers.filter((d) => d.hall === "events");
  const secretDrawers = drawers.filter(
    (d) =>
      d.wing?.toLowerCase().includes("secret") ||
      d.room?.toLowerCase().includes("vulnerab") ||
      d.room?.toLowerCase().includes("unspoken") ||
      d.room?.toLowerCase().includes("truth")
  );
  const bondDrawers = drawers.filter(
    (d) =>
      d.wing?.toLowerCase().includes("bond") ||
      d.room?.toLowerCase().includes("relationship") ||
      d.room?.toLowerCase().includes("promise")
  );

  // Analyze text sentiments across all memories
  let warmthHits = 0;
  let trustHits = 0;
  let chemistryHits = 0;
  let sincerityHits = 0;

  const warmthKeywords = [
    "smile", "warm", "laugh", "compliment", "adored", "cute", "dress", "sundress",
    "sweet", "charming", "grand", "fond", "delight", "love", "comfort", "gentle", "twirl", "bright"
  ];
  const trustKeywords = [
    "secret", "trust", "truth", "confide", "promise", "vulnerable", "scar", "reveal",
    "honest", "struggle", "faith", "rely", "admit", "deep"
  ];
  const chemistryKeywords = [
    "teas", "bold", "test", "joke", "banter", "clever", "witty", "blush", "flirt",
    "game", "challenge", "impressed", "spark", "rhythm", "curious"
  ];
  const sincerityKeywords = [
    "honest", "fact", "real", "adult", "years old", "work", "coffee", "genuine",
    "talk", "listen", "understand"
  ];

  for (const d of drawers) {
    const text = (d.content + " " + (d.verbatimQuote || "")).toLowerCase();
    for (const kw of warmthKeywords) if (text.includes(kw)) warmthHits++;
    for (const kw of trustKeywords) if (text.includes(kw)) trustHits++;
    for (const kw of chemistryKeywords) if (text.includes(kw)) chemistryHits++;
    for (const kw of sincerityKeywords) if (text.includes(kw)) sincerityHits++;
  }

  // 1. Familiarity Score (0-100): Volume of shared memories, topics/wings, and recall depth
  const drawerVolumeScore = Math.min(20, Math.pow(totalDrawers, 0.75) * 1.5);
  const wingDiversityScore = Math.min(15, sharedWingsCovered * 3);
  const recallDepthScore = Math.min(12, totalRecalls * 0.15);
  const familiarityScore = Math.max(
    0,
    Math.min(95, Math.round(drawerVolumeScore + wingDiversityScore + recallDepthScore))
  );

  // 2. Affinity Score (0-100): Warmth, compliments, shared joy, comfort
  const warmthScore = Math.min(25, warmthHits * 1.2);
  const bondExperienceScore = Math.min(28, bondDrawers.length * 4.0);
  const affinityScore = Math.max(
    5,
    Math.min(95, Math.round(8 + warmthScore + bondExperienceScore))
  );

  // 3. Trust Score (0-100): Earned through personal disclosures, vulnerabilities, shared secrets
  const factDisclosureScore = Math.min(18, factsDrawers.length * 1.4);
  const secretTrustScore = Math.min(45, secretDrawers.length * 10.0);
  const sentimentTrustScore = Math.min(15, trustHits * 1.0);
  const trustScore = Math.max(
    5,
    Math.min(95, Math.round(5 + factDisclosureScore + secretTrustScore + sentimentTrustScore))
  );

  // 4. Chemistry & Banter Score (0-100): Conversational spark, playful teasing, witty rhythm
  const chemistrySparkScore = Math.min(30, chemistryHits * 1.5);
  const activeEventScore = Math.min(18, eventsDrawers.length * 0.8);
  const chemistryScore = Math.max(
    5,
    Math.min(95, Math.round(8 + chemistrySparkScore + activeEventScore))
  );

  // 5. Overall Harmonic Bond Score (0-100)
  const rawBondScore = Math.round(
    affinityScore * 0.30 + trustScore * 0.30 + familiarityScore * 0.25 + chemistryScore * 0.15
  );
  const overallBondScore = Math.max(0, Math.min(100, rawBondScore));

  // Relationship Stage Determination with Reality Gating
  let stage: RelationshipStage = "First Encounters";
  let stageSubtitle = "Strangers Just Crossing Paths";
  let stageDescription = `${uName} and ${charName} have only just crossed paths. Impressions are fresh and exploratory, discovering initial introductions and immediate surroundings.`;

  if (
    overallBondScore >= 85 &&
    totalDrawers >= 35 &&
    sharedWingsCovered >= 4 &&
    secretDrawers.length >= 2 &&
    trustScore >= 65
  ) {
    stage = "Soul Resonance";
    stageSubtitle = "Unbreakable Harmonic Bond";
    stageDescription = `A profound, transcendent connection between ${uName} and ${charName}. Every memory is deeply anchored, vulnerabilities are cherished, and trust is absolute.`;
  } else if (
    overallBondScore >= 72 &&
    totalDrawers >= 24 &&
    sharedWingsCovered >= 3 &&
    secretDrawers.length >= 1 &&
    trustScore >= 50
  ) {
    stage = "Inseparable Partners";
    stageSubtitle = "Deep Confidants & Devoted Allies";
    stageDescription = `An exceptional bond forged through extensive shared encounters, mutual disclosures, and genuine devotion between ${uName} and ${charName}.`;
  } else if (
    overallBondScore >= 55 &&
    totalDrawers >= 16 &&
    sharedWingsCovered >= 3 &&
    trustScore >= 35 &&
    (bondDrawers.length >= 1 || secretDrawers.length >= 1)
  ) {
    stage = "Playful Confidants";
    stageSubtitle = "Mutual Affection & Spirited Banter";
    stageDescription = `A vibrant dynamic characterized by playful teasing, warm banter, comfortable familiarity, and mutual emotional safety.`;
  } else if (
    overallBondScore >= 38 &&
    totalDrawers >= 10 &&
    sharedWingsCovered >= 2 &&
    trustScore >= 25 &&
    (bondDrawers.length >= 1 || secretDrawers.length >= 1 || factsDrawers.length >= 6)
  ) {
    stage = "Warm Companions";
    stageSubtitle = "Growing Closeness & Shared Rhythms";
    stageDescription = `${charName} and ${uName} have established a comfortable rhythm, sharing personal details, pleasant encounters, and reciprocal interest.`;
  } else if (overallBondScore >= 16 || totalDrawers >= 2) {
    stage = "Developing Acquaintances";
    stageSubtitle = "Initial Spark & Casual Rapport";
    stageDescription = `${uName} and ${charName} have shared a few pleasant exchanges. A warm, curious dynamic is taking root with lighthearted banter and initial observations.`;
  }

  // Emotional Dynamics (0-100)
  const emotionalDynamics = [
    {
      trait: "Playfulness & Banter",
      score: Math.min(95, Math.max(10, Math.round(15 + chemistryHits * 2.5))),
      color: "#F59E0B", // amber
    },
    {
      trait: "Warmth & Empathy",
      score: Math.min(95, Math.max(12, Math.round(15 + warmthHits * 2.2))),
      color: "#EC4899", // pink
    },
    {
      trait: "Memory Attentiveness",
      score: Math.min(95, Math.max(8, familiarityScore)),
      color: "#10B981", // emerald
    },
    {
      trait: "Mutual Sincerity",
      score: Math.min(95, Math.max(10, Math.round(15 + sincerityHits * 2.0))),
      color: "#3B82F6", // blue
    },
    {
      trait: "Emotional Openness",
      score: Math.min(95, Math.max(8, trustScore)),
      color: "#8B5CF6", // purple
    },
  ];

  // Milestones: High importance and key narrative encounters
  const milestones: RelationshipMilestone[] = drawers
    .filter((d) => d.importance >= 6 || d.hall === "events" || d.wing?.includes("Bond"))
    .slice(0, 15)
    .map((d) => {
      let title = "Shared Memory";
      if (d.hall === "facts") title = "Personal Disclosure";
      else if (d.hall === "preferences") title = "Discovered Preference";
      else if (d.room?.includes("Encounters") || d.room?.includes("Recent")) title = "Spirited Encounter";
      else if (d.room?.includes("Identity")) title = "Identity Revealed";

      let significance: "critical" | "high" | "moderate" = "moderate";
      if (d.importance >= 8) significance = "critical";
      else if (d.importance >= 7) significance = "high";

      return {
        id: d.id,
        title,
        content: d.content,
        quote: d.verbatimQuote,
        date: d.timestamp,
        significance,
        hall: d.hall,
        wing: d.wing,
        room: d.room,
        importance: d.importance,
      };
    });

  // What is known about User
  const knownAboutUser = drawers
    .filter(
      (d) =>
        d.wing?.toLowerCase().includes("user") ||
        d.room?.toLowerCase().includes("user") ||
        d.entities?.some((e) => e.toLowerCase().includes("user"))
    )
    .map((d) => d.content)
    .slice(0, 10);

  // What is known about Personality
  const knownAboutPersonality = drawers
    .filter(
      (d) =>
        d.wing?.toLowerCase().includes("character") ||
        d.entities?.some((e) => e.toLowerCase().includes(charName.toLowerCase()))
    )
    .map((d) => d.content)
    .slice(0, 10);

  // Mutual entities
  const entitySet = new Set<string>();
  for (const rel of entityGraph) {
    if (rel.valid !== false) {
      if (rel.source) entitySet.add(rel.source);
      if (rel.target) entitySet.add(rel.target);
    }
  }
  for (const d of drawers) {
    if (d.entities) {
      for (const ent of d.entities) entitySet.add(ent);
    }
  }
  entitySet.delete(uName);
  entitySet.delete("User");
  entitySet.delete(charName);
  const mutualEntities = Array.from(entitySet).slice(0, 12);

  return {
    stage,
    stageSubtitle,
    stageDescription,
    affinityScore,
    trustScore,
    familiarityScore,
    chemistryScore,
    overallBondScore,
    emotionalDynamics,
    totalSharedMemories: totalDrawers,
    totalRecalls,
    sharedWingsCovered,
    knownFactsCount: factsDrawers.length,
    secretsSharedCount: secretDrawers.length,
    milestones,
    knownAboutUser,
    knownAboutPersonality,
    mutualEntities,
  };
}
