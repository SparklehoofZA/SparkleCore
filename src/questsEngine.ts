import { CharacterQuest, QuestDifficulty, UserGameState, UserInventoryItem } from "./types";

const QUESTS_STORAGE_KEY = "ROLEPLAY_CHARACTER_QUESTS_V1";
const USER_GAME_STATE_KEY = "ROLEPLAY_USER_GAME_STATE_V1";

export const DEFAULT_USER_GAME_STATE: UserGameState = {
  inventory: [
    {
      id: "inv_starter_satchel",
      item_name: "Adventurer's Leather Satchel",
      item_description: "A well-stitched traveler's pouch with reinforced buckles for keeping keepsakes safe.",
      acquiredAt: new Date("2026-09-01T12:00:00Z").toISOString(),
      characterName: "System",
    },
    {
      id: "inv_scented_tallow",
      item_name: "Scented Rosemary Tallow Candle",
      item_description: "A soothing handcrafted candle that radiates a soft amber glow and crisp herb aroma.",
      acquiredAt: new Date("2026-09-02T15:00:00Z").toISOString(),
      characterName: "Aria Vance",
    },
  ],
};

export const DEFAULT_SAMPLE_QUESTS: CharacterQuest[] = [
  {
    quest_id: "quest_comforting_infusion",
    title: "A Soothing Evening Infusion",
    description: "Prepare or gather the dried herbs needed to brew a tranquil night infusion to ease high tension and fatigue.",
    character_motivation: "I have been running on frayed nerves all day, and the persistent stress is starting to cloud my focus.",
    difficulty: "Easy",
    trigger_prompt: "Inquire gently about their stress level and offer to brew a comforting starflower and chamomile infusion to help them unwind.",
    rewards: {
      relationship_metrics: {
        affinity: 8,
        trust: 6,
        harmonic_bond: 5,
      },
      items: [
        {
          item_name: "Aromatic Starflower Sachet",
          item_description: "A dried blend of night-blooming herbs that imparts a peaceful scent wherever carried.",
        },
      ],
    },
    status: "available",
    createdAt: new Date("2026-09-03T10:00:00Z").toISOString(),
  },
  {
    quest_id: "quest_cipher_decoding",
    title: "Decipher the Hidden Margin Notes",
    description: "Carefully inspect the encoded cipher left in the margins of the archived journal to reveal a forgotten location.",
    character_motivation: "There is an unresolved clue buried in these pages that could safeguard our position or warn us of trouble.",
    difficulty: "Medium",
    trigger_prompt: "Ask about the cipher they were reading, offering your eyes to examine the coded sequence together.",
    rewards: {
      relationship_metrics: {
        affinity: 14,
        trust: 16,
        harmonic_bond: 12,
      },
      items: [
        {
          item_name: "Brass Engraved Signet",
          item_description: "An antique cipher ring with rotating alphanumeric bands used by quiet operatives.",
        },
      ],
    },
    status: "available",
    createdAt: new Date("2026-09-03T11:00:00Z").toISOString(),
  },
  {
    quest_id: "quest_perimeter_vigil",
    title: "Confront the Shadow on the Perimeter",
    description: "Investigate the strange rustling and watchful presence lingering just beyond the edge of the courtyard lantern light.",
    character_motivation: "Someone has been tracking our footsteps, and I cannot rest while our sanctuary remains exposed.",
    difficulty: "Hard",
    trigger_prompt: "Bring up the strange noises from the courtyard perimeter and offer to stand shoulder-to-shoulder to investigate together.",
    rewards: {
      relationship_metrics: {
        affinity: 22,
        trust: 28,
        harmonic_bond: 25,
      },
      items: [
        {
          item_name: "Traveler's Twilight Cloak",
          item_description: "A weather-worn mantle of deep indigo fabric that dampens footfalls and blends into night mists.",
        },
      ],
    },
    status: "available",
    createdAt: new Date("2026-09-03T12:00:00Z").toISOString(),
  },
];

export function loadSavedQuests(): CharacterQuest[] {
  if (typeof window === "undefined") return DEFAULT_SAMPLE_QUESTS;
  try {
    const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_QUESTS));
      return DEFAULT_SAMPLE_QUESTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SAMPLE_QUESTS;
  } catch (err) {
    console.warn("Error reading quests from storage:", err);
    return DEFAULT_SAMPLE_QUESTS;
  }
}

export function saveSavedQuests(quests: CharacterQuest[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(quests));
  } catch (err) {
    console.warn("Error saving quests to storage:", err);
  }
}

export function loadUserGameState(): UserGameState {
  if (typeof window === "undefined") return DEFAULT_USER_GAME_STATE;
  try {
    const raw = localStorage.getItem(USER_GAME_STATE_KEY);
    if (!raw) {
      localStorage.setItem(USER_GAME_STATE_KEY, JSON.stringify(DEFAULT_USER_GAME_STATE));
      return DEFAULT_USER_GAME_STATE;
    }
    const parsed = JSON.parse(raw);
    return {
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : DEFAULT_USER_GAME_STATE.inventory,
    };
  } catch (err) {
    console.warn("Error reading user game state:", err);
    return DEFAULT_USER_GAME_STATE;
  }
}

export function saveUserGameState(state: UserGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_GAME_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Error saving user game state:", err);
  }
}

export function getDifficultyBadgeClass(difficulty: QuestDifficulty) {
  switch (difficulty) {
    case "Easy":
      return {
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
        text: "text-emerald-400",
        border: "border-emerald-500/40",
        bg: "bg-emerald-950/20",
      };
    case "Medium":
      return {
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/35",
        text: "text-amber-400",
        border: "border-amber-500/40",
        bg: "bg-amber-950/20",
      };
    case "Hard":
      return {
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/35",
        text: "text-rose-400",
        border: "border-rose-500/40",
        bg: "bg-rose-950/20",
      };
    default:
      return {
        badge: "bg-blue-500/15 text-blue-300 border-blue-500/35",
        text: "text-blue-400",
        border: "border-blue-500/40",
        bg: "bg-blue-950/20",
      };
  }
}

export function buildQuestSteeringPrompt(quest: CharacterQuest): string {
  const goalDesc = quest.description ? ` Details/Goal: "${quest.description}".` : "";
  return `[SYSTEM ACTION: The user clicked on the quest "${quest.title}".${goalDesc} Do NOT auto-complete or forcibly start the quest. Instead, naturally bring up this request/task to the user in-character right now, explaining what you need and offering the reward if they agree to help. Let the user verbally respond to accept or decline.]`;
}

export function generateFallbackQuests(
  characterName: string,
  mood?: string,
  location?: string,
  characterId?: string
): CharacterQuest[] {
  const timestamp = new Date().toISOString();
  const loc = location || "our surroundings";
  const m = mood || "reflective";

  return [
    {
      quest_id: `quest_${Date.now()}_1`,
      title: `A Urgent Matter at ${loc}`,
      description: `Help ${characterName} resolve a pressing errand near ${loc}.`,
      character_motivation: `I've been feeling ${m} and running behind on preparations, and I need a steady hand to help me manage this.`,
      difficulty: "Easy",
      trigger_prompt: `Ask ${characterName} about what's pressing most heavily on their mind right now and offer your steady support.`,
      rewards: {
        relationship_metrics: {
          affinity: 15,
          trust: 10,
          harmonic_bond: 8,
        },
        items: [
          {
            item_name: `Special House Blend`,
            item_description: `A fragrant artisan blend crafted with care, offering warmth and renewed clarity.`,
          },
        ],
      },
      status: "available",
      characterId,
      characterName,
      createdAt: timestamp,
    },
    {
      quest_id: `quest_${Date.now()}_2`,
      title: `Stock Up on Essential Supplies`,
      description: `Procure necessary supplies from the local market supplier before current reserves run dry.`,
      character_motivation: `We're running dangerously low on our signature essentials, and the upcoming rush will be overwhelming without them!`,
      difficulty: "Medium",
      trigger_prompt: `Check in with ${characterName} about dwindling inventory and offer to head out to the supplier.`,
      rewards: {
        relationship_metrics: {
          affinity: 18,
          trust: 15,
          harmonic_bond: 10,
        },
        items: [
          {
            item_name: "Artisan Leather Pouch",
            item_description: "A finely stitched container ideal for keeping rare ingredients and personal treasures protected.",
          },
        ],
      },
      status: "available",
      characterId,
      characterName,
      createdAt: timestamp,
    },
    {
      quest_id: `quest_${Date.now()}_3`,
      title: `Test-Run a New Creation`,
      description: `Provide authentic feedback and assist in testing out a newly developed project together.`,
      character_motivation: `I value your perspective above anyone else's—I want to see your honest reaction before sharing it wider.`,
      difficulty: "Easy",
      trigger_prompt: `Offer to be ${characterName}'s first test partner and share your honest impressions.`,
      rewards: {
        relationship_metrics: {
          affinity: 20,
          trust: 12,
          harmonic_bond: 15,
        },
        items: [
          {
            item_name: "Handwritten Recipe Note",
            item_description: "Personal notes inscribed with secret proportions and intimate annotations.",
          },
        ],
      },
      status: "available",
      characterId,
      characterName,
      createdAt: timestamp,
    },
    {
      quest_id: `quest_${Date.now()}_4`,
      title: `Unravel the Curious Rumor`,
      description: `Investigate an intriguing whisper that reached ${characterName}'s ears earlier today.`,
      character_motivation: `Someone mentioned something strange occurring nearby, and I'd feel much safer if we looked into it together.`,
      difficulty: "Hard",
      trigger_prompt: `Ask ${characterName} what they heard earlier and offer to investigate the perimeter together.`,
      rewards: {
        relationship_metrics: {
          affinity: 25,
          trust: 22,
          harmonic_bond: 20,
        },
        items: [
          {
            item_name: "Gilded Scouting Compass",
            item_description: "An ornate pocket compass with an amber needle that never loses true orientation.",
          },
        ],
      },
      status: "available",
      characterId,
      characterName,
      createdAt: timestamp,
    },
  ];
}
