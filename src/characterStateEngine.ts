import {
  CharacterState,
  Personality,
  MemoryHall,
  MemoryDrawer,
  EntityRelation,
  MoodEngineConfig,
  DEFAULT_MOOD_ENGINE_CONFIG,
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { jsonrepair } from "jsonrepair";
import { getAiMoodPromptGuidance, REGISTERED_STATUS_EFFECTS } from "./moodPresets";

export const DEFAULT_CHARACTER_STATE: CharacterState = {
  health: 100,
  stamina: 100,
  statusEffects: [],
  trust: 50,
  mood: "Neutral",
  stress: 0,
  location: "Unknown",
  activity: "Idle",
  outfit: "Casual attire",
};

/**
 * Ensures a personality has a valid, fully populated CharacterState.
 */
export function ensureCharacterState(personality: Partial<Personality> | null | undefined): CharacterState {
  const existing = personality?.state;
  return {
    health: typeof existing?.health === "number" ? Math.max(0, Math.min(100, existing.health)) : 100,
    stamina: typeof existing?.stamina === "number" ? Math.max(0, Math.min(100, existing.stamina)) : 100,
    statusEffects: Array.isArray(existing?.statusEffects) ? existing.statusEffects.filter(Boolean) : [],
    trust: typeof existing?.trust === "number" ? Math.max(0, Math.min(100, existing.trust)) : 50,
    mood: (existing?.mood || "Neutral").trim(),
    stress: typeof existing?.stress === "number" ? Math.max(0, Math.min(100, existing.stress)) : 0,
    location: (existing?.location || "Unknown").trim(),
    activity: (existing?.activity || "Idle").trim(),
    outfit: (existing?.outfit || "Casual attire").trim(),
  };
}

/**
 * Formats the dynamic character state into a structured prompt instruction block.
 */
export function formatCharacterStateForPrompt(state: CharacterState, characterName: string): string {
  const statusStr = state.statusEffects.length > 0 ? state.statusEffects.join(", ") : "None (Stable)";
  
  return `
--- Current Dynamic Scene & Character Status ---
Character: ${characterName}
• Current Mood: ${state.mood} (Stress Level: ${state.stress}/100)
• Vitality / Health: ${state.health}/100 | Energy / Stamina: ${state.stamina}/100 | Trust & Bond with User: ${state.trust}/100
• Current Location: ${state.location}
• Current Activity: ${state.activity}
• Current Attire / Outfit: ${state.outfit}
• Active Status Effects: ${statusStr}

[DYNAMIC STATUS DIRECTIVE]:
You MUST embody this exact emotional state, physical condition, and location in your reactions:
- If your mood is "Scared", "Terrified", or stress is high: express palpable fear, hesitation, trembling, or anxious urgency in your dialogue and physical actions (*...*).
- If your mood is "Excited", "Thrilled", or "Joyful": express genuine eagerness, beaming enthusiasm, and lively expressions.
- If you move or travel: describe your physical movement and naturally transition your location and activity.
- If injured or tired: reflect physical fatigue or pain; if resting or eating/drinking, recover your energy.
------------------------------------------------
`.trim();
}

/**
 * Advanced rule-based fallback extractor implementing contextual understanding,
 * rolling window sentiment, sensory/nature topic protection, and status effect lifecycles.
 */
export function extractRuleBasedState(
  currentState: CharacterState,
  recentDialogue: { role: string; text: string }[],
  charName: string,
  userPersonaName: string,
  config: MoodEngineConfig = DEFAULT_MOOD_ENGINE_CONFIG
): {
  updatedState: CharacterState;
  shifts: string[];
  detectionMeta?: {
    windowDepth: number;
    overrideTriggered: boolean;
    activeTopicIntent?: string;
    narrativePhase?: string;
  };
} {
  const nextState: CharacterState = {
    ...currentState,
    statusEffects: [...currentState.statusEffects],
  };

  const shifts: string[] = [];
  const windowDepth = Math.max(1, Math.min(5, config?.windowDepth || 3));

  // Extract rolling dialogue window
  const windowMessages = recentDialogue.slice(-windowDepth * 2);
  const windowCombined = windowMessages.map((m) => m.text).join(" ").toLowerCase();

  // Support both "model" and "assistant" roles
  const latestModelMessages = recentDialogue.filter((m) => m.role === "model" || m.role === "assistant");
  const lastModelMsg = latestModelMessages[latestModelMessages.length - 1]?.text || "";
  const lastUserMsg = recentDialogue.filter((m) => m.role === "user").slice(-1)[0]?.text || "";
  const immediateCombined = `${lastUserMsg} ${lastModelMsg}`.toLowerCase();

  // Extract text inside asterisks (actions/gestures/scene details) from all participants
  const allActionMatches = ((lastModelMsg + " " + lastUserMsg).match(/\*([^*]+)\*/g) || []).map((m) =>
    m.replace(/\*/g, "").toLowerCase()
  );
  const actionText = allActionMatches.join(" ");
  const actionMatches = allActionMatches;

  // 1. DISAMBIGUATION: SENSORY & NATURE TOPIC RULES
  const natureKeywords = [
    "flower", "flowers", "rose", "roses", "blossom", "blossoms", "petal", "petals",
    "garden", "gardens", "meadow", "botany", "botanical", "tree", "trees", "plant", "plants",
    "scent", "fragrance", "perfume", "tea", "breeze", "sunlight", "blooming",
    "lavender", "lily", "lilies", "tulip", "tulips", "orchid", "orchids", "daisy", "daisies",
    "sunflower", "sunflowers", "herbal", "flora", "greenery", "bouquet", "camomile", "chamomile", "jasmine"
  ];
  const negativeNatureModifier = [
    "poison", "poisonous", "deadly", "toxic", "venom", "strangle", "suffocating",
    "carnivorous", "thorn scratch", "pricked", "allergic", "rash", "noxious", "assassin", "sword", "ambush", "attack"
  ].some((m) => immediateCombined.includes(m) || actionText.includes(m));

  const hasImmediateNature = natureKeywords.some((k) => immediateCombined.includes(k));
  const hasWindowNature = natureKeywords.some((k) => windowCombined.includes(k));
  const isPeacefulNatureTopic =
    config.sensoryNatureDisambiguation !== false &&
    (hasImmediateNature || (hasWindowNature && !immediateCombined.includes("attack") && !immediateCombined.includes("sword") && !immediateCombined.includes("assassin"))) &&
    !negativeNatureModifier;

  // 2. BUFFERING: SAFE SETTING & RELATIONSHIP BUFFERS
  const safeSettingKeywords = [
    "garden", "cafe", "coffee shop", "tavern", "inn", "home", "bedroom", "living room",
    "kitchen", "library", "park", "meadow", "beach", "cottage", "bakery", "shop", "sanctuary",
    "lounge", "patio", "courtyard", "terrace", "gazebo"
  ];
  const isSafeSetting =
    Boolean(config.safeSettingBuffering) &&
    (safeSettingKeywords.some((loc) => (currentState.location || "").toLowerCase().includes(loc)) ||
      safeSettingKeywords.some((loc) => immediateCombined.includes(loc)));

  const hasHighTrust = Boolean(config.relationshipTrustBuffering || config.relationshipBuffering) && (currentState.trust ?? 50) >= 55;

  // Stress factor scaling according to user sensitivity setting
  const stressFactor =
    config.stressSensitivity === "low" ? 0.35 : config.stressSensitivity === "high" ? 1.65 : 1.0;

  // 3. DRASTIC EVENT OVERRIDE
  const drasticViolenceRegex = /\b(stabbed|slashed with a (sword|dagger|knife|blade)|shot with|speared|choking on blood|decapitat|exploded|pinned down violently)\b/i;
  const hasDrasticEvent = drasticViolenceRegex.test(immediateCombined) || drasticViolenceRegex.test(actionText);

  // Combat / Peril detection
  const combatPerilKeywords = [
    "assassin", "assassins", "swords drawn", "blade drawn", "ambush", "ambushed",
    "under attack", "enemy attack", "intruder", "hostile", "weapon drawn", "aims a crossbow",
    "lunges with", "draws sword", "threatens to kill", "attacked by", "look out", "watch out"
  ];
  const hasCombatThreat = combatPerilKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k));

  const allowDrasticOverride = config.drasticEventOverride !== false;
  let overrideTriggered = (hasDrasticEvent && allowDrasticOverride) || (hasCombatThreat && !isSafeSetting);
  let activeTopicIntent = isPeacefulNatureTopic
    ? "Peaceful Nature & Sensory Conversation"
    : hasCombatThreat
    ? "Peril & Combat Threat"
    : "General Dialogue";
  let narrativePhase = (hasDrasticEvent && allowDrasticOverride)
    ? "Climax"
    : hasCombatThreat
    ? "High Tension / Combat"
    : isPeacefulNatureTopic
    ? "Calm Resolution"
    : "Casual Interaction";

  // If peaceful nature conversation and no direct attack or combat:
  if (isPeacefulNatureTopic && !hasDrasticEvent && !hasCombatThreat) {
    const stressDrop = Math.round(18 * (config.stressSensitivity === "low" ? 1.4 : 1.0));
    const oldStress = nextState.stress;
    nextState.stress = Math.max(0, nextState.stress - stressDrop);
    if (oldStress !== nextState.stress) {
      shifts.push(`Stress eased down to ${nextState.stress}% amid serene conversation`);
    }

    // Shift mood to serene or calm if previously stressed or neutral
    const sereneMoods = ["Calm", "Peaceful", "Serene", "Content"];
    const positiveMoods = ["Excited", "Playful", "Affectionate", "Joyful", "Cheerful", "Smitten"];
    if (!sereneMoods.includes(nextState.mood) && !positiveMoods.includes(nextState.mood)) {
      const chosenMood = windowCombined.includes("serene")
        ? "Serene"
        : windowCombined.includes("content")
        ? "Content"
        : windowCombined.includes("peace")
        ? "Peaceful"
        : "Calm";
      shifts.push(`Mood settled to "${chosenMood}" in pleasant surroundings`);
      nextState.mood = chosenMood;
    }

    // Clear alert / panic status effects
    nextState.statusEffects = nextState.statusEffects.filter(
      (e) => !["On High Alert", "Trembling", "Panicked", "Scared", "Terrified"].includes(e)
    );
    if (!nextState.statusEffects.includes("Relaxed") && !nextState.statusEffects.includes("Calm")) {
      nextState.statusEffects.push("Relaxed");
    }
  }

  // 3b. COMBAT / AMBUSH PERIL HANDLING
  if (hasCombatThreat && !hasDrasticEvent) {
    const perilMood = (nextState.stress >= 50 || (currentState.trust ?? 50) < 40) ? "Alarmed" : "On Guard";
    if (nextState.mood !== perilMood) {
      shifts.push(`Mood shifted from "${nextState.mood}" to "${perilMood}" (Combat threat)`);
      nextState.mood = perilMood;
    }
    const perilStress = Math.round(30 * stressFactor);
    const newStress = Math.min(100, Math.max(45, nextState.stress + perilStress));
    if (newStress !== nextState.stress) {
      shifts.push(`Stress spiked from ${nextState.stress}% to ${newStress}% (Combat Threat)`);
      nextState.stress = newStress;
    }
    if (!nextState.statusEffects.includes("On High Alert")) {
      nextState.statusEffects.push("On High Alert");
      shifts.push("Gained status effect: On High Alert");
    }
    nextState.statusEffects = nextState.statusEffects.filter(
      (e) => !["Relaxed", "Calm", "Peaceful", "Content"].includes(e)
    );
  }

  // 4. FEAR / SCARED DETECTION (Strictly requires direct character distress, not bare nouns like 'shadows')
  const directFearKeywords = [
    "screams in terror", "gasps in terror", "terrified", "petrified", "cowering",
    "flee in terror", "paralyzed with fear", "trembling with fear", "shivers with dread",
    "so scared", "frightened of", "monstrous roar", "lunges to kill",
    "bloodcurdling scream", "panics wildly", "dread washes over"
  ];
  const hasDirectFear =
    directFearKeywords.some((k) => actionText.includes(k) || immediateCombined.includes(k)) &&
    (!isSafeSetting || hasDrasticEvent);

  if ((hasDirectFear || hasDrasticEvent) && !isPeacefulNatureTopic) {
    const isExtreme =
      hasDrasticEvent ||
      ["terrified", "petrified", "bloodcurdling", "screams in terror", "paralyzed with fear"].some(
        (k) => immediateCombined.includes(k) || actionText.includes(k)
      );
    const newMood = isExtreme ? "Terrified" : "Scared";
    if (nextState.mood !== newMood) {
      shifts.push(`Mood shifted from "${nextState.mood}" to "${newMood}"`);
      nextState.mood = newMood;
    }
    const baseIncrease = isExtreme ? 40 : 25;
    const addedStress = Math.round(baseIncrease * stressFactor);
    const minStressThreshold = isExtreme ? 70 : 50;
    const newStress = Math.min(100, Math.max(minStressThreshold, nextState.stress + addedStress));
    if (newStress !== nextState.stress) {
      shifts.push(`Stress increased to ${newStress}%`);
      nextState.stress = newStress;
    }
    const fearEffect = isExtreme ? "Terrified" : "On High Alert";
    if (!nextState.statusEffects.includes(fearEffect)) {
      nextState.statusEffects.push(fearEffect);
      shifts.push(`Gained status effect: ${fearEffect}`);
    }
    if (actionText.includes("trembl") || actionText.includes("shiver")) {
      if (!nextState.statusEffects.includes("Trembling")) {
        nextState.statusEffects.push("Trembling");
        shifts.push("Gained status effect: Trembling");
      }
    }
    nextState.statusEffects = nextState.statusEffects.filter(
      (e) => !["Relaxed", "Calm", "Peaceful", "Content"].includes(e)
    );
  }

  // 5. EXCITEMENT DETECTION
  const exciteKeywords = [
    "excited", "thrilled", "can't wait", "eager", "eyes light up", "bouncing",
    "grin", "beaming", "hurray", "jumping", "delighted", "ecstatic", "celebrat",
    "yay", "woohoo", "cheering", "sparkling", "overjoyed", "so happy", "wonderful news"
  ];
  const hasExcitement = exciteKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k));
  if (hasExcitement && !hasDirectFear && !hasDrasticEvent) {
    const newMood = "Excited";
    if (nextState.mood !== newMood) {
      shifts.push(`Mood shifted from "${nextState.mood}" to "${newMood}"`);
      nextState.mood = newMood;
    }
    nextState.stress = Math.max(0, Math.min(25, Math.floor(nextState.stress * 0.5)));
    if (!nextState.statusEffects.includes("Excited")) {
      nextState.statusEffects.push("Excited");
      shifts.push("Gained status effect: Excited");
    }
    if (actionText.includes("grin") || actionText.includes("smile") || actionText.includes("beam")) {
      if (!nextState.statusEffects.includes("Beaming")) {
        nextState.statusEffects.push("Beaming");
      }
    }
    nextState.statusEffects = nextState.statusEffects.filter(
      (e) => !["Terrified", "Trembling", "Somber", "Bored"].includes(e)
    );
  }

  // 6. FLUSTERED / BLUSHING DETECTION
  const blushKeywords = [
    "blush", "fluster", "stammers", "shy", "cheeks redden", "cheeks turn red",
    "embarrass", "avert eyes", "look away nervously", "flushed red"
  ];
  if (blushKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k)) && !hasDirectFear) {
    if (nextState.mood !== "Flustered") {
      shifts.push(`Mood shifted to "Flustered"`);
      nextState.mood = "Flustered";
    }
    if (!nextState.statusEffects.includes("Blushing")) {
      nextState.statusEffects.push("Blushing");
      shifts.push("Gained status effect: Blushing");
    }
  }

  // 7. ANGER / IRRITATION DETECTION
  const angerKeywords = [
    "furious", "glare", "scowls", "snarls", "fumes", "clenches fists", "indignant",
    "infuriating", "pissed", "how dare you", "seething", "enraged"
  ];
  if (angerKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k)) && !hasDirectFear) {
    const isExtreme = ["furious", "enraged", "seething", "fuming"].some((k) => immediateCombined.includes(k));
    const newMood = isExtreme ? "Furious" : "Angry";
    if (nextState.mood !== newMood) {
      shifts.push(`Mood shifted from "${nextState.mood}" to "${newMood}"`);
      nextState.mood = newMood;
    }
    const angerStress = Math.round((isExtreme ? 25 : 15) * stressFactor);
    nextState.stress = Math.min(100, Math.max(40, nextState.stress + angerStress));
  }

  // 8. MELANCHOLY / SORROW / SOMBER DETECTION
  const sadKeywords = [
    "crying", "tears", "weeps", "sniffles", "sobbing", "melancholy", "somber",
    "heartbroken", "dejected", "wistful", "lonely", "sorrowful", "sighs heavily", "grief"
  ];
  if (sadKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k)) && !hasDirectFear) {
    const newMood = immediateCombined.includes("heartbroken")
      ? "Heartbroken"
      : immediateCombined.includes("somber")
      ? "Somber"
      : "Melancholy";
    if (nextState.mood !== newMood) {
      shifts.push(`Mood shifted from "${nextState.mood}" to "${newMood}"`);
      nextState.mood = newMood;
    }
    nextState.stress = Math.min(80, Math.max(25, nextState.stress + Math.round(8 * stressFactor)));
    nextState.statusEffects = nextState.statusEffects.filter((e) => !["Excited", "Beaming", "Happy"].includes(e));
  }

  // 9. CURIOSITY / INTRIGUED DETECTION
  const curiousKeywords = [
    "curious", "intrigued", "fascinated", "inquisitive", "tilts head", "eyebrow raises",
    "wonders", "investigate", "tell me more", "how does that work", "awestruck", "examines"
  ];
  if (
    curiousKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k)) &&
    !hasDirectFear &&
    !["Excited", "Flustered", "In Pain"].includes(nextState.mood)
  ) {
    const newMood = immediateCombined.includes("fascinat")
      ? "Fascinated"
      : immediateCombined.includes("intrigued")
      ? "Intrigued"
      : "Curious";
    if (nextState.mood !== newMood) {
      shifts.push(`Mood shifted to "${newMood}"`);
      nextState.mood = newMood;
    }
  }

  // 10. AFFECTION / TENDER / ROMANCE DETECTION
  const affectionKeywords = [
    "tender", "caress", "gentle embrace", "kisses", "leans in close", "holds hand",
    "warm gaze", "lovingly", "smitten", "soft smile", "cherish", "cuddles"
  ];
  if (affectionKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k)) && !hasDirectFear) {
    const newMood = immediateCombined.includes("smitten")
      ? "Smitten"
      : immediateCombined.includes("tender")
      ? "Tender"
      : "Affectionate";
    if (nextState.mood !== newMood) {
      shifts.push(`Mood shifted to "${newMood}"`);
      nextState.mood = newMood;
    }
    nextState.stress = Math.max(0, nextState.stress - 15);
  }

  // 11. PLAYFUL / BANTER / TEASING DETECTION
  const playfulKeywords = [
    "teases", "smirks playfully", "winks", "pokes fun", "giggles", "chuckles",
    "banter", "playful shove", "laughs mischievously"
  ];
  if (playfulKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k)) && !hasDirectFear && nextState.mood !== "Excited") {
    const newMood = immediateCombined.includes("mischiev") ? "Mischievous" : "Playful";
    if (nextState.mood !== newMood) {
      shifts.push(`Mood shifted to "${newMood}"`);
      nextState.mood = newMood;
    }
    nextState.stress = Math.max(0, Math.min(20, nextState.stress - 8));
  }

  // 12. STATUS EFFECT RESOLUTION CYCLE (Resting, Sleeping, Healing, Tea)
  const restKeywords = ["sits", "rests", "sips tea", "drinks tea", "drinks water", "relaxes", "sleeps", "naps", "reclines", "curls up"];
  if (restKeywords.some((k) => actionText.includes(k) || immediateCombined.includes(k))) {
    nextState.stamina = Math.min(100, nextState.stamina + 15);
    nextState.stress = Math.max(0, nextState.stress - 12);
    nextState.statusEffects = nextState.statusEffects.filter((e) => !["Exhausted", "Fatigued"].includes(e));
  }

  const healKeywords = ["bandage", "heals", "treats wound", "healing potion", "stitches", "cleans wound", "medicine"];
  if (healKeywords.some((k) => actionText.includes(k) || immediateCombined.includes(k))) {
    nextState.health = Math.min(100, nextState.health + 30);
    nextState.statusEffects = nextState.statusEffects.filter((e) => e !== "Bleeding");
    if (nextState.health >= 85) {
      nextState.statusEffects = nextState.statusEffects.filter((e) => e !== "Injured");
    }
    shifts.push("Wound treated: Bleeding halted and health restored");
  }

  // Physical exertion
  if (actionText.includes("running") || actionText.includes("sprints") || actionText.includes("dodges") || actionText.includes("fights")) {
    nextState.stamina = Math.max(10, nextState.stamina - 15);
    shifts.push(`Stamina spent on physical exertion (now ${nextState.stamina}%)`);
    if (nextState.stamina <= 25 && !nextState.statusEffects.includes("Fatigued")) {
      nextState.statusEffects.push("Fatigued");
    }
  }

  // Damage & Wounds
  const damageKeywords = ["bleed", "stabbed", "slashed", "severely wounded", "shot"];
  if (damageKeywords.some((k) => actionText.includes(k)) || drasticViolenceRegex.test(immediateCombined)) {
    nextState.health = Math.max(15, nextState.health - 25);
    if (!nextState.statusEffects.includes("Injured")) {
      nextState.statusEffects.push("Injured");
    }
    if (actionText.includes("bleed") || actionText.includes("stab") || actionText.includes("slash") || immediateCombined.includes("bleeding")) {
      if (!nextState.statusEffects.includes("Bleeding")) {
        nextState.statusEffects.push("Bleeding");
      }
    }
    nextState.statusEffects = nextState.statusEffects.filter(
      (e) => !["Happy", "Relaxed", "Excited", "Beaming", "Calm", "Peaceful"].includes(e)
    );
    nextState.mood = "In Pain";
    nextState.stress = Math.min(100, nextState.stress + Math.round(35 * stressFactor));
    shifts.push(`Took damage: Health decreased to ${nextState.health}%`);
  }

  // 13. TRUST & BOND ADJUSTMENTS
  const positiveBondKeywords = [
    "thank you", "thanks", "i'm here for you", "i'll protect you", "you're amazing",
    "you're beautiful", "love you", "hug", "comforts", "gentle", "smiles warmly", "protects",
    "care about you", "friend", "proud of you", "staying by my side", "stay by my side"
  ];
  if (positiveBondKeywords.some((k) => immediateCombined.includes(k) || actionText.includes(k))) {
    const boost = Math.floor(Math.random() * 3) + 2; // +2 to +4
    const currentTrustVal = typeof nextState.trust === "number" && !isNaN(nextState.trust) ? nextState.trust : 50;
    const newTrust = Math.min(100, currentTrustVal + boost);
    if (newTrust !== nextState.trust) {
      shifts.push(`Trust increased by +${boost}% (now ${newTrust}%)`);
      nextState.trust = newTrust;
    }

    if (!["Terrified", "In Pain", "Angry", "Furious", "On Guard", "Alarmed"].includes(nextState.mood)) {
      const newMood = immediateCombined.includes("protect") || immediateCombined.includes("staying by my side")
        ? "Touched"
        : immediateCombined.includes("love") || immediateCombined.includes("hug")
        ? "Affectionate"
        : "Grateful";
      if (nextState.mood !== newMood) {
        shifts.push(`Mood shifted from "${nextState.mood}" to "${newMood}" from warm appreciation`);
        nextState.mood = newMood;
      }
      nextState.stress = Math.max(0, nextState.stress - 10);
    }
  }

  // 14. LOCATION DETECTION
  if (config.liveMonitors?.trackLocation !== false) {
    const locationPatterns = [
      /(?:arrives at|walks into|enters|heads to|runs into|reaches|travels to|steps into|sitting in|inside) (?:the )?([A-Za-z0-9\s']{3,35})(?=[.,;*]|$)/i,
      /(?:let's go to|let us go to|we are now at|we arrive at) (?:the )?([A-Za-z0-9\s']{3,35})(?=[.,;*]|$)/i,
    ];
    for (const pat of locationPatterns) {
      const match = pat.exec(lastModelMsg) || pat.exec(lastUserMsg);
      if (match && match[1]) {
        const candidateLoc = match[1].trim();
        const cleaned = candidateLoc.replace(/^(the|a|an)\s+/i, "");
        const blacklist = ["room", "it", "them", "door", "back", "bed", "chair", "table", "counter", "window", "sight", "view", "ground", "shadows"];
        if (cleaned.length >= 3 && cleaned.length <= 30 && !blacklist.includes(cleaned.toLowerCase())) {
          const formattedLoc = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          if (formattedLoc.toLowerCase() !== nextState.location.toLowerCase()) {
            shifts.push(`Location changed from "${nextState.location}" to "${formattedLoc}"`);
            nextState.location = formattedLoc;
            break;
          }
        }
      }
    }
  } else {
    nextState.location = currentState.location;
  }

  // 15. ACTIVITY DETECTION
  if (config.liveMonitors?.trackActivity !== false) {
    if (actionMatches.length > 0) {
      const firstAction = actionMatches[0];
      if (firstAction.length > 4 && firstAction.length < 50) {
        const formattedAct = firstAction.charAt(0).toUpperCase() + firstAction.slice(1);
        nextState.activity = formattedAct;
      }
    }
  } else {
    nextState.activity = currentState.activity;
  }

  // 16. ATTIRE DETECTION
  const trackAttire = (config.liveMonitors?.trackAttire !== false) && (config.liveMonitors?.trackOutfit !== false);
  if (trackAttire) {
    const outfitDamageKeywords = [
      "rips shirt", "rip shirt", "tears shirt", "tear shirt", "shreds", "battered",
      "strips", "takes off clothes", "naked", "shirtless", "removes shirt", "undress",
      "bare chest", "ripped", "torn clothes", "torn tunic"
    ];
    const outfitRegex = new RegExp(`\\b(naked|shirtless|undress|strips|torn|ripped)\\b`, "i");
    if (outfitDamageKeywords.some((k) => actionText.includes(k) || immediateCombined.includes(k)) || outfitRegex.test(actionText)) {
      if (actionText.includes("naked") || actionText.includes("strips") || actionText.includes("undress")) {
        nextState.outfit = "Naked";
      } else {
        nextState.outfit = "Torn & Battered Clothes";
      }
      shifts.push(`Outfit updated to "${nextState.outfit}"`);
    } else {
      const outfitChangeMatch = /(?:puts on|changes into|slips into|dresses in|wearing) (?:a |an |the )?([A-Za-z0-9\s']{3,30})(?=[.,;*]|$)/i.exec(immediateCombined);
      if (outfitChangeMatch && outfitChangeMatch[1]) {
        const newAttire = outfitChangeMatch[1].trim();
        nextState.outfit = newAttire.charAt(0).toUpperCase() + newAttire.slice(1);
        shifts.push(`Attire updated to "${nextState.outfit}"`);
      }
    }
  } else {
    nextState.outfit = currentState.outfit;
  }

  // 17. STATUS EFFECTS MONITOR TOGGLE & CUSTOM EFFECTS
  if (config.liveMonitors?.trackStatusEffects === false) {
    nextState.statusEffects = [...currentState.statusEffects];
  } else {
    // Evaluate user-configured custom status effects
    if (Array.isArray(config.customStatusEffects)) {
      for (const customEff of config.customStatusEffects) {
        if (customEff.active !== false && customEff.tag) {
          const effNameLower = customEff.tag.toLowerCase();
          const descLower = (customEff.description || "").toLowerCase();
          if (immediateCombined.includes(effNameLower) || actionText.includes(effNameLower) || (descLower && immediateCombined.includes(descLower))) {
            if (!nextState.statusEffects.includes(customEff.tag)) {
              nextState.statusEffects.push(customEff.tag);
              shifts.push(`Applied custom status effect: ${customEff.tag}`);
            }
          }
        }
      }
    }
    nextState.statusEffects = Array.from(new Set(nextState.statusEffects));
  }

  // 18. CUSTOM MOOD OVERRIDES
  if (Array.isArray(config.customMoods)) {
    for (const customMood of config.customMoods) {
      if (customMood.active !== false && customMood.name) {
        const moodNameLower = customMood.name.toLowerCase();
        const descLower = (customMood.description || "").toLowerCase();
        if (immediateCombined.includes(moodNameLower) || actionText.includes(moodNameLower) || (descLower && immediateCombined.includes(descLower))) {
          if (nextState.mood !== customMood.name) {
            shifts.push(`Triggered custom mood: "${customMood.name}"`);
            nextState.mood = customMood.name;
            if (customMood.stressBias !== undefined) {
              nextState.stress = customMood.stressBias;
            }
            break;
          }
        }
      }
    }
  }

  // 19. MAX STRESS STEP PER TURN RATE LIMITING
  const isEmergency = hasDrasticEvent && allowDrasticOverride;
  const maxStep = config.maxStressStepPerTurn ?? 15;
  let rateLimitApplied = false;
  if (!isEmergency) {
    const rawDiff = nextState.stress - currentState.stress;
    if (Math.abs(rawDiff) > maxStep) {
      nextState.stress = currentState.stress + Math.sign(rawDiff) * maxStep;
      shifts.push(`Stress change capped at ±${maxStep}% by turn rate limit setting`);
      rateLimitApplied = true;
    }
  }

  // 20. MOOD TRANSITION SMOOTHING
  const smoothingEnabled = config.moodTransitionSmoothing !== false && config.transitionSmoothing !== false;
  let smoothingApplied = false;
  if (smoothingEnabled && !isEmergency) {
    const sereneMoods = ["Calm", "Peaceful", "Serene", "Content", "Joyful", "Happy"];
    const extremeNegativeMoods = ["Terrified", "Furious"];
    if (sereneMoods.includes(currentState.mood) && extremeNegativeMoods.includes(nextState.mood)) {
      const smoothedMood = nextState.mood === "Terrified" ? "Alarmed" : "Agitated";
      shifts.push(`Mood transition smoothed from "${currentState.mood}" to "${smoothedMood}" (preventing abrupt extreme swing)`);
      nextState.mood = smoothedMood;
      smoothingApplied = true;
    }
  }

  // 21. COMPOSURE & COMPOSURE RECOVERY RATE
  const stressDelta = nextState.stress - currentState.stress;
  const composureBase = currentState.composure ?? 80;
  const recoveryRate = config.composureRecoveryRate ?? 3;
  const naturalRecovery = (isPeacefulNatureTopic || isSafeSetting || nextState.stress <= currentState.stress) ? recoveryRate : 0;
  nextState.composure = Math.max(0, Math.min(100, Math.round(composureBase - stressDelta * 0.5 + naturalRecovery)));
  nextState.status_effects = nextState.statusEffects;
  nextState.attire = nextState.outfit;

  return {
    updatedState: nextState,
    shifts,
    detectionMeta: {
      windowDepth,
      overrideTriggered,
      activeTopicIntent,
      narrativePhase,
      isPeacefulNatureTopic,
      isSafeSetting,
      hasHighTrust,
      stressFactor,
      maxStepLimit: maxStep,
      rateLimitApplied,
      smoothingApplied,
      naturalRecoveryApplied: naturalRecovery,
    } as any,
  };
}

/**
 * Stage 1: Pre-Inference Character State Engine (Synchronous)
 * Prior to invoking the primary chat LLM, evaluate and resolve:
 * - Vitals & Status: Physical health, stamina, exhaustion, or active physical flags.
 * - Mood & Composure: Emotional baselines, stress levels, temperament shifts, and self-control.
 * - Scene & Setting: Environmental dynamics, location context, time, and spatial proximity.
 * - Active Status Effects: Temporary buffs, debuffs, or situational conditions.
 * Injects this evaluated state directly into the primary chat LLM system prompt.
 */
export async function evaluatePreInferenceCharacterState(options: {
  personality: Personality;
  incomingUserMessage: string;
  history?: any[];
  userPersonaName?: string;
  model?: string;
  customApiKey?: string;
  executeInference?: (opts: any) => Promise<string>;
  moodEngineConfig?: MoodEngineConfig;
}): Promise<{
  updatedState: CharacterState;
  shifts: string[];
}> {
  const {
    personality,
    incomingUserMessage,
    history = [],
    userPersonaName = "User",
    model,
    customApiKey,
    executeInference,
    moodEngineConfig = DEFAULT_MOOD_ENGINE_CONFIG,
  } = options;

  const currentState = ensureCharacterState(personality);
  const charName = personality.name || "Character";

  // If message is empty or system meta, return current state
  if (!incomingUserMessage || !incomingUserMessage.trim()) {
    return { updatedState: currentState, shifts: [] };
  }

  // 1. Fast rule-based evaluation of incoming user message
  const recentMsgs: { role: string; text: string }[] = [];
  for (const item of history.slice(-4)) {
    const text = item.parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "";
    if (text) recentMsgs.push({ role: item.role, text });
  }
  recentMsgs.push({ role: "user", text: incomingUserMessage });

  const ruleBased = extractRuleBasedState(
    currentState,
    recentMsgs,
    charName,
    userPersonaName,
    moodEngineConfig
  );

  let finalState: CharacterState = { ...ruleBased.updatedState };
  let shifts: string[] = [...ruleBased.shifts];

  // 2. If inference function is provided and model is designated, perform fast pre-inference state classification
  if (executeInference && model) {
    try {
      const prompt = `[STAGE 1: PRE-INFERENCE CHARACTER STATE EVALUATION]
You are the Pre-Inference State Classifier. The user has just taken an action or spoken to ${charName}.
Analyze the user's incoming message and determine immediate shifts in ${charName}'s state BEFORE ${charName} responds.

Current Character State:
- Health: ${currentState.health}/100
- Stamina: ${currentState.stamina}/100
- Stress: ${currentState.stress}/100
- Composure: ${currentState.composure ?? 80}/100
- Mood: "${currentState.mood}"
- Location: "${currentState.location}"
- Activity: "${currentState.activity}"
- Active Status Effects: ${JSON.stringify(currentState.statusEffects)}

User ("${userPersonaName}") Incoming Action/Dialogue:
"${incomingUserMessage}"

Evaluate immediate impacts:
1. Vitals: Did the user attack, harm, heal, offer food/drink, or physically exhaust the character?
2. Mood & Composure: Did the user startle, comfort, charm, insult, or intimidate?
3. Scene & Setting: Did the user move to a new place ("Let's go to the tavern"), change activity ("Sit down"), or alter the immediate environment?
4. Active Status Effects: Any new physical/emotional conditions to apply or remove?

Return strict JSON only:
{
  "health": number (0-100),
  "stamina": number (0-100),
  "stress": number (0-100),
  "composure": number (0-100),
  "mood": string,
  "location": string,
  "activity": string,
  "statusEffects": string[],
  "shifts": string[]
}`;

      const res = await executeInference({
        model,
        prompt,
        responseMimeType: "application/json",
        customApiKey,
        maxTokens: 300,
      });

      let parsed: any = null;
      let cleaned = res.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, "$1").trim();
      try {
        let repaired = cleaned;
        try { repaired = jsonrepair(cleaned); } catch(e) {}
        parsed = JSON.parse(repaired);
      } catch (e: any) {
        // Fallback to regex extraction
        parsed = {};
        const healthMatch = cleaned.match(/"health"\s*:\s*(\d+)/i);
        if (healthMatch) parsed.health = parseInt(healthMatch[1], 10);
        const staminaMatch = cleaned.match(/"stamina"\s*:\s*(\d+)/i);
        if (staminaMatch) parsed.stamina = parseInt(staminaMatch[1], 10);
        const stressMatch = cleaned.match(/"stress"\s*:\s*(\d+)/i);
        if (stressMatch) parsed.stress = parseInt(stressMatch[1], 10);
        const composureMatch = cleaned.match(/"composure"\s*:\s*(\d+)/i);
        if (composureMatch) parsed.composure = parseInt(composureMatch[1], 10);
        const moodMatch = cleaned.match(/"mood"\s*:\s*"([^"]+)"/i);
        if (moodMatch) parsed.mood = moodMatch[1];
        const locationMatch = cleaned.match(/"location"\s*:\s*"([^"]+)"/i);
        if (locationMatch) parsed.location = locationMatch[1];
        const activityMatch = cleaned.match(/"activity"\s*:\s*"([^"]+)"/i);
        if (activityMatch) parsed.activity = activityMatch[1];
      }

      if (parsed && typeof parsed === "object") {
        if (typeof parsed.health === "number") finalState.health = Math.max(0, Math.min(100, parsed.health));
        if (typeof parsed.stamina === "number") finalState.stamina = Math.max(0, Math.min(100, parsed.stamina));
        if (typeof parsed.stress === "number") finalState.stress = Math.max(0, Math.min(100, parsed.stress));
        if (typeof parsed.composure === "number") finalState.composure = Math.max(0, Math.min(100, parsed.composure));
        if (typeof parsed.mood === "string" && parsed.mood.trim()) finalState.mood = parsed.mood.trim();
        if (typeof parsed.location === "string" && parsed.location.trim()) finalState.location = parsed.location.trim();
        if (typeof parsed.activity === "string" && parsed.activity.trim()) finalState.activity = parsed.activity.trim();
        if (Array.isArray(parsed.statusEffects)) finalState.statusEffects = parsed.statusEffects.filter(Boolean);
        if (Array.isArray(parsed.shifts) && parsed.shifts.length > 0) {
          shifts = Array.from(new Set([...shifts, ...parsed.shifts]));
        }
      }
    } catch (e: any) {
      console.warn("Pre-inference character state evaluation error:", e?.message || e);
      // Fallback to ruleBased state instead of crashing
    }
  }

  return { updatedState: finalState, shifts };
}

/**
 * Intelligent Dynamic Character State Evaluator:
 * Uses Gemini AI with enhanced contextual disambiguation, rolling window sentiment,
 * and structured variable extraction. Automatically falls back to the robust rule-based engine.
 */
export async function evaluateDynamicCharacterState(options: {
  personality: Personality;
  history: any[];
  userPersonaName?: string;
  model?: string;
  customApiKey?: string;
  executeInference?: (opts: any) => Promise<string>;
  aiClient?: any;
  moodEngineConfig?: MoodEngineConfig;
}): Promise<{
  updatedState: CharacterState;
  shifts: string[];
  memoryNotes: {
    content: string;
    hall: MemoryHall;
    wing: string;
    room: string;
    importance: number;
    entities: string[];
  }[];
  detectionMeta?: {
    windowDepth: number;
    overrideTriggered: boolean;
    activeTopicIntent?: string;
    narrativePhase?: string;
  };
}> {
  const {
    personality,
    history,
    userPersonaName = "User",
    model,
    customApiKey,
    executeInference,
    aiClient,
    moodEngineConfig = DEFAULT_MOOD_ENGINE_CONFIG,
  } = options;

  const currentState = ensureCharacterState(personality);
  const charName = personality.name || "Character";
  const windowDepth = Math.max(1, Math.min(5, moodEngineConfig?.windowDepth || 3));

  // Excerpt dialogue within configured rolling window depth
  const recentDialogue: { role: string; text: string }[] = [];
  for (const item of history.slice(-windowDepth * 2)) {
    const text = item.parts?.map((p: any) => p.text).filter(Boolean).join(" ") || "";
    if (text) {
      recentDialogue.push({ role: item.role, text });
    }
  }

  if (recentDialogue.length === 0) {
    return {
      updatedState: currentState,
      shifts: [],
      memoryNotes: [],
      detectionMeta: { windowDepth, overrideTriggered: false },
    };
  }

  let finalState: CharacterState = { ...currentState };
  let shifts: string[] = [];
  let aiSucceeded = false;
  let detectionMeta: {
    windowDepth: number;
    overrideTriggered: boolean;
    activeTopicIntent?: string;
    narrativePhase?: string;
  } = {
    windowDepth,
    overrideTriggered: false,
    activeTopicIntent: "General Interaction",
    narrativePhase: "Casual Interaction",
  };

  const dialogueExcerpt = recentDialogue
    .map((m) => `${m.role === "user" ? userPersonaName : charName}: ${m.text}`)
    .join("\n\n");

  const prompt = `You are the Advanced Dynamic Character State & Mood Engine for a roleplay system.
Analyze the rolling dialogue window between "${userPersonaName}" and "${charName}".
Infer the exact updated dynamic state of ${charName}.

Current State before this exchange:
${JSON.stringify(currentState, null, 2)}

Active Mood Engine Configuration:
- Detection Window Depth: ${windowDepth} messages
- Stress Sensitivity: ${moodEngineConfig.stressSensitivity} (distinguish casual tone vs actual peril)
- Safe Setting Buffering: ${moodEngineConfig.safeSettingBuffering ? "Enabled (gardens, cafes, taverns buffer against stress spikes)" : "Disabled"}
- Relationship Buffering: ${moodEngineConfig.relationshipBuffering ? "Enabled (high mutual trust buffers against unwarranted panic)" : "Disabled"}
- Transition Smoothing: ${moodEngineConfig.transitionSmoothing ? "Enabled (prevent abrupt swings based on isolated keywords)" : "Disabled"}

Recent Dialogue Window to analyze (last ${recentDialogue.length} messages):
${dialogueExcerpt}

CRITICAL PARSING RULES & CONTEXTUAL UNDERSTANDING:
1. KEYWORD VS. INTENT DISAMBIGUATION:
   - Differentiate between a topic casually or intellectually discussed (e.g. botany, flowers, dark history, shadows in nature, fairy tales, lore) and the character's ACTUAL personal emotional state.
   - Discussing peaceful or sensory subjects (flowers, gardens, nature, scents, tea, memories) MUST maintain a calm, relaxed, intrigued, or joyful state. NEVER default to [Stressed] or [Scared] for peaceful or sensory discussions!
2. SENSORY & NATURE TOPIC RULES:
   - Descriptions of nature, gardens, flowers, blossoms, scents, breeze, or quiet settings are inherently relaxing and soothing by default.
   - When discussing peaceful topics, stress MUST decrease towards 0-15%.
3. MOOD TRANSITION SMOOTHING:
   - Evaluate cumulative emotional progression across the window. Do NOT perform abrupt mood swings based on isolated words.
   - DRASTIC EVENT OVERRIDE: If direct physical violence, ambush, or severe shock occurs in the immediate turn, bypass smoothing and jump directly to the peak emotion (e.g., "In Pain", "Terrified", "Furious").
4. ACTIVE STATUS EFFECTS:
   - Maintain condition persistence. Status effects persist until resolved (e.g. resting removes "Exhausted", bandaging stops "Bleeding", calming down removes "Trembling").
5. LIVE EXTRACTION TRACKING:
   - "scene_location": Current scene location. Update only if they actually moved or traveled.
   - "activity": Concise summary of what ${charName} is doing right now.
   - "attire": Current outfit. Update only if clothes were physically changed, damaged, or removed.
   - "status_effects": Array of active condition tags. Remove conflicting positive effects if injured or panicked.

PALETTE SELECTION GUIDANCE:
${getAiMoodPromptGuidance(charName)}

Output ONLY a JSON object matching this schema:
{
  "detection_config": {
    "window_depth": ${windowDepth},
    "override_triggered": false
  },
  "character_state": {
    "mood": "string",
    "scene_location": "string",
    "activity": "string",
    "attire": "string",
    "status_effects": ["string"],
    "health": 100,
    "stamina": 100,
    "trust": 50,
    "stress": 10
  },
  "narrative_context": {
    "active_topic_intent": "string",
    "narrative_phase": "Casual Interaction"
  }
}`;

  let responseText = "";

  if (executeInference) {
    try {
      responseText = await executeInference({
        model,
        prompt,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.15,
        maxTokens: 1000,
        responseMimeType: "application/json",
        customApiKey,
        personalityName: charName,
      });
    } catch (execErr: any) {
      console.warn("Universal dynamic state inference error:", execErr?.message || execErr);
      throw execErr;
    }
  } else if (aiClient && model) {
    try {
      const res = await aiClient.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      });
      responseText = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (mErr: any) {
      console.warn(`Dynamic state model ${model} error:`, mErr?.message || mErr);
      throw mErr;
    }
  }

  if (responseText) {
    let parsed: any = null;
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }

    try {
      let sanitized = cleaned.replace(/[\n\r]+/g, " ");
      try {
        sanitized = jsonrepair(sanitized);
      } catch(e) {}
      parsed = JSON.parse(sanitized);
    } catch (parseErr: any) {
      try {
        parsed = {};
        const moodMatch = cleaned.match(/"mood"\s*:\s*"([^"]+)"/i);
        if (moodMatch) parsed.mood = moodMatch[1];
        const stressMatch = cleaned.match(/"stress"\s*:\s*(\d+)/i);
        if (stressMatch) parsed.stress = parseInt(stressMatch[1], 10);
        const trustMatch = cleaned.match(/"trust"\s*:\s*(\d+)/i);
        if (trustMatch) parsed.trust = parseInt(trustMatch[1], 10);
        const healthMatch = cleaned.match(/"health"\s*:\s*(\d+)/i);
        if (healthMatch) parsed.health = parseInt(healthMatch[1], 10);
        const staminaMatch = cleaned.match(/"stamina"\s*:\s*(\d+)/i);
        if (staminaMatch) parsed.stamina = parseInt(staminaMatch[1], 10);
        const locationMatch = cleaned.match(/"(?:scene_location|location)"\s*:\s*"([^"]+)"/i);
        if (locationMatch) parsed.location = locationMatch[1];
        const activityMatch = cleaned.match(/"activity"\s*:\s*"([^"]+)"/i);
        if (activityMatch) parsed.activity = activityMatch[1];
        const outfitMatch = cleaned.match(/"(?:attire|outfit)"\s*:\s*"([^"]+)"/i);
        if (outfitMatch) parsed.outfit = outfitMatch[1];
      } catch (fallbackErr) {
        console.warn("Failed to parse dynamic state JSON output:", parseErr.message);
      }
    }

    if (parsed) {
      const charState = parsed.character_state || parsed;
      const detConfig = parsed.detection_config || {};
      const narrCtx = parsed.narrative_context || {};

      if (charState.mood || typeof charState.health === "number" || typeof charState.stress === "number") {
        finalState = {
          health: typeof charState.health === "number" ? Math.max(0, Math.min(100, Math.round(charState.health))) : currentState.health,
          stamina: typeof charState.stamina === "number" ? Math.max(0, Math.min(100, Math.round(charState.stamina))) : currentState.stamina,
          statusEffects: Array.isArray(charState.status_effects || charState.statusEffects)
            ? Array.from(new Set((charState.status_effects || charState.statusEffects).filter(Boolean)))
            : currentState.statusEffects,
          trust: typeof charState.trust === "number" ? Math.max(0, Math.min(100, Math.round(charState.trust))) : currentState.trust,
          mood: String(charState.mood || currentState.mood).trim(),
          stress: typeof charState.stress === "number" ? Math.max(0, Math.min(100, Math.round(charState.stress))) : currentState.stress,
          location: String(charState.scene_location || charState.location || currentState.location).trim(),
          activity: String(charState.activity || currentState.activity).trim(),
          outfit: String(charState.attire || charState.outfit || currentState.outfit).trim(),
        };

        // Enforce live extraction monitors
        if (moodEngineConfig.liveMonitors?.trackLocation === false) {
          finalState.location = currentState.location;
        }
        if (moodEngineConfig.liveMonitors?.trackActivity === false) {
          finalState.activity = currentState.activity;
        }
        if (moodEngineConfig.liveMonitors?.trackOutfit === false) {
          finalState.outfit = currentState.outfit;
        }
        if (moodEngineConfig.liveMonitors?.trackStatusEffects === false) {
          finalState.statusEffects = currentState.statusEffects;
        }

        detectionMeta = {
          windowDepth,
          overrideTriggered: Boolean(detConfig.override_triggered),
          activeTopicIntent: narrCtx.active_topic_intent || "Roleplay Conversation",
          narrativePhase: narrCtx.narrative_phase || "Casual Interaction",
        };

        // Calculate state shifts
        if (finalState.mood !== currentState.mood) {
          shifts.push(`Mood shifted from "${currentState.mood}" to "${finalState.mood}"`);
        }
        if (Math.abs(finalState.stress - currentState.stress) >= 12) {
          shifts.push(`Stress level adjusted to ${finalState.stress}%`);
        }
        if (finalState.location.toLowerCase() !== currentState.location.toLowerCase()) {
          shifts.push(`Location moved to "${finalState.location}"`);
        }
        if (finalState.outfit !== currentState.outfit) {
          shifts.push(`Outfit updated to "${finalState.outfit}"`);
        }
        if (Math.abs(finalState.trust - currentState.trust) >= 2) {
          shifts.push(`Trust/Affection adjusted to ${finalState.trust}%`);
        }

        aiSucceeded = true;
      }
    }
  }

  // Fallback to enhanced rule-based engine if AI did not succeed
  if (!aiSucceeded) {
    const ruleResult = extractRuleBasedState(
      currentState,
      recentDialogue,
      charName,
      userPersonaName,
      moodEngineConfig
    );
    finalState = ruleResult.updatedState;
    shifts = ruleResult.shifts;
    if (ruleResult.detectionMeta) {
      detectionMeta = ruleResult.detectionMeta;
    }
  }

  // Generate Memory Notes for the Memory Palace alongside state changes
  const memoryNotes: {
    content: string;
    hall: MemoryHall;
    wing: string;
    room: string;
    importance: number;
    entities: string[];
  }[] = [];

  // If location shifted, record in Memory Palace
  if (finalState.location.toLowerCase() !== currentState.location.toLowerCase() && finalState.location !== "Unknown") {
    memoryNotes.push({
      content: `${charName} and ${userPersonaName} arrived at ${finalState.location}.`,
      hall: "events",
      wing: "World, Items & Locations",
      room: "Places & Havens",
      importance: 6,
      entities: [charName, userPersonaName, finalState.location],
    });
  }

  // If character experienced acute distress or fear
  const isNowScared = ["scared", "terrified", "frightened", "panicked"].some((m) =>
    finalState.mood.toLowerCase().includes(m)
  );
  const wasScared = ["scared", "terrified", "frightened", "panicked"].some((m) =>
    currentState.mood.toLowerCase().includes(m)
  );
  if (isNowScared && !wasScared) {
    memoryNotes.push({
      content: `${charName} experienced intense fear and alarm during the encounter.`,
      hall: "discoveries",
      wing: "Secrets & Epiphanies",
      room: "Vulnerabilities",
      importance: 7,
      entities: [charName, "Fear", "Emotional Response"],
    });
  }

  // If character became excited/thrilled
  const isNowExcited = ["excited", "thrilled", "overjoyed", "ecstatic"].some((m) =>
    finalState.mood.toLowerCase().includes(m)
  );
  const wasExcited = ["excited", "thrilled", "overjoyed", "ecstatic"].some((m) =>
    currentState.mood.toLowerCase().includes(m)
  );
  if (isNowExcited && !wasExcited) {
    memoryNotes.push({
      content: `${charName} was thrilled and visibly excited about recent events with ${userPersonaName}.`,
      hall: "preferences",
      wing: "Character Identity & Lore",
      room: "Core Traits & Persona",
      importance: 6,
      entities: [charName, userPersonaName, "Excitement"],
    });
  }

  // If trust reached a milestone (e.g. passed 75 or 90)
  if (finalState.trust >= 75 && currentState.trust < 75) {
    memoryNotes.push({
      content: `A deep bond of trust has solidified between ${charName} and ${userPersonaName}.`,
      hall: "facts",
      wing: "User Profile & Bond",
      room: "Relationship History",
      importance: 8,
      entities: [charName, userPersonaName, "Trust Bond"],
    });
  }

  return {
    updatedState: finalState,
    shifts,
    memoryNotes,
    detectionMeta,
  };
}

