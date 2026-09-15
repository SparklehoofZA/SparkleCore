import { Event } from "./types";

/**
 * Default sample events loaded on first startup so the app is never empty.
 */
export const DEFAULT_SAMPLE_EVENTS: Event[] = [
  {
    id: "event_thunderstorm_01",
    name: "Sudden Thunderstorm",
    type: "Environmental",
    description:
      "A violent thunderstorm suddenly erupts outside. Heavy rain lashes furiously against the glass, rolling thunder rattles the walls, and the room lights momentarily flicker as power dips.",
    created_at: new Date("2026-09-01T10:00:00Z").toISOString(),
  },
  {
    id: "event_urgent_knock_02",
    name: "Urgent Knock at the Door",
    type: "System Interrupt",
    description:
      "A sharp, rapid knocking echoes through the entrance, startling the room and cutting off the conversation mid-sentence. Someone unexpected has arrived.",
    created_at: new Date("2026-09-01T10:15:00Z").toISOString(),
  },
  {
    id: "event_unexpected_keepsake_03",
    name: "Unexpected Keepsake",
    type: "Character Action",
    description:
      "A small, carefully wrapped keepsake is retrieved from a coat pocket and offered forward with a hesitant, deeply meaningful look.",
    created_at: new Date("2026-09-01T10:30:00Z").toISOString(),
  },
  {
    id: "event_blackout_04",
    name: "Sudden Power Outage",
    type: "Environmental",
    description:
      "The lights abruptly die with a dull electrical buzz, plunging the entire space into darkness except for the faint glow of moonlight through the windows.",
    created_at: new Date("2026-09-01T10:45:00Z").toISOString(),
  },
  {
    id: "event_whispers_corridor_05",
    name: "Whispers in the Corridor",
    type: "System Interrupt",
    description:
      "Muffled, hurried whispers and shuffling footsteps are detected just outside in the hallway, suggesting someone is eavesdropping.",
    created_at: new Date("2026-09-01T11:00:00Z").toISOString(),
  },
];

/**
 * Internal pool of preset prompt templates for "⚡ Auto-Generate Event".
 */
export const RANDOM_EVENT_PRESETS: Array<{
  name: string;
  type: string;
  description: string;
}> = [
  {
    name: "Shattered Glass Accident",
    type: "Environmental",
    description:
      "A glass or ceramic vessel slips from a shelf or counter, crashing loudly onto the floor and scattering shards everywhere, breaking the silence abruptly.",
  },
  {
    name: "Unscheduled Phone Ring",
    type: "System Interrupt",
    description:
      "A nearby telephone begins ringing shrilly with an unrecognized, urgent caller ID, refusing to stop and demanding attention.",
  },
  {
    name: "Impulsive Confession",
    type: "Character Action",
    description:
      "A sudden crack in composure occurs; emotional vulnerability overwhelms the persona and an impulsive, raw confession slips out.",
  },
  {
    name: "Dense Fog Inversion",
    type: "Environmental",
    description:
      "An unnaturally thick wall of sea fog rolls past the windows, blocking out the sun and shrouding the world outside in dense grey obscurity.",
  },
  {
    name: "Subterranean Tremor",
    type: "Environmental",
    description:
      "A low, vibrating rumble shakes the floor beneath your feet, rattling picture frames on the walls for several tense seconds before subsiding.",
  },
  {
    name: "Urgent Courier Delivery",
    type: "System Interrupt",
    description:
      "A courier rings the doorbell insistently, calling out an urgent delivery package requiring immediate signature and retrieval.",
  },
  {
    name: "Dropped Mask of Composure",
    type: "Character Action",
    description:
      "For a fleeting heartbeat, all guarded composure drops, revealing a glimpse of intense vulnerability and unspoken emotion.",
  },
  {
    name: "Spilled Hot Beverage",
    type: "Environmental",
    description:
      "A steaming cup of tea or coffee is accidentally jostled, spilling dark liquid across the tabletop and documents in an awkward scramble.",
  },
  {
    name: "Hidden Letter Discovered",
    type: "Custom",
    description:
      "A loose floorboard or book spine gives way, revealing an old, sealed handwritten letter addressed to someone in the room.",
  },
  {
    name: "Chilling Sudden Draft",
    type: "Environmental",
    description:
      "A sudden freezing draft sweeps through the room as if an unseen entryway swung open, causing the ambient temperature to plunge instantly.",
  },
  {
    name: "Eerie Antique Music Box",
    type: "Custom",
    description:
      "An antique music box or brass instrument on a distant shelf clicks to life entirely on its own, playing a slow, haunting melody.",
  },
  {
    name: "Prolonged Eye Contact",
    type: "Character Action",
    description:
      "A quiet pause hangs in the air; eyes meet across the room and neither person breaks the gaze, charging the atmosphere with unspoken tension.",
  },
  {
    name: "Sirens in the Distance",
    type: "Environmental",
    description:
      "A convoy of emergency vehicles speeds past on the avenue outside, their blue and red lights painting the ceiling through the blinds as sirens wail.",
  },
  {
    name: "Emergency Broadcast Buzz",
    type: "System Interrupt",
    description:
      "A cellular phone emits a screeching emergency broadcast siren tone, alerting everyone to an urgent regional advisory.",
  },
];

const STORAGE_KEY = "ROLEPLAY_SAVED_EVENTS";

/**
 * Load events from persistent client storage, falling back to default sample events.
 */
export function loadSavedEvents(): Event[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveSavedEvents(DEFAULT_SAMPLE_EVENTS);
      return [...DEFAULT_SAMPLE_EVENTS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveSavedEvents(DEFAULT_SAMPLE_EVENTS);
    return [...DEFAULT_SAMPLE_EVENTS];
  } catch (err) {
    console.warn("Failed to load events from localStorage, using defaults:", err);
    return [...DEFAULT_SAMPLE_EVENTS];
  }
}

/**
 * Persist events array to client storage.
 */
export function saveSavedEvents(events: Event[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error("Failed to save events to localStorage:", err);
  }
}

/**
 * Programmatically generates an event from preset templates, optionally matching a guideline.
 */
export function generateRandomEvent(guideline?: string): Event {
  let template = RANDOM_EVENT_PRESETS[Math.floor(Math.random() * RANDOM_EVENT_PRESETS.length)];
  if (guideline && guideline.trim()) {
    const q = guideline.toLowerCase().trim();
    const matched = RANDOM_EVENT_PRESETS.find(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    );
    if (matched) {
      template = matched;
    } else {
      const trimmedTitle =
        guideline.trim().length > 35 ? guideline.trim().substring(0, 35) + "..." : guideline.trim();
      template = {
        name: trimmedTitle,
        type: "Environmental",
        description: `A scene disruption unfolds: ${guideline.trim()}. The surrounding environment and atmosphere immediately react.`,
      };
    }
  }

  const uniqueId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: uniqueId,
    name: template.name,
    type: template.type,
    description: template.description,
    created_at: new Date().toISOString(),
  };
}

export interface ChatPayloadParams {
  userInput: string;
  activeEvent: Event | null;
  personalityId?: string;
  systemInstruction?: string;
  model?: string;
  geminiApiKey?: string;
  temperature?: number;
  [key: string]: any;
}

export interface ChatPayloadResult {
  /** The final message string formatted for the model */
  formattedMessage: string;
  /** Complete body payload ready for POST /api/chat */
  apiPayload: {
    message: string;
    personalityId?: string;
    systemInstruction?: string;
    model?: string;
    geminiApiKey?: string;
    temperature?: number;
    activeEvent?: {
      id: string;
      name: string;
      type: string;
      description: string;
    };
    [key: string]: any;
  };
}

/**
 * 4. Payload Injection Logic
 * Constructs the final API payload sent to the model:
 * - If an active event is attached to the input:
 *   Formats the payload so the event description is injected as a system directive or pre-pended tag:
 *   `[SYSTEM EVENT INJECTION: <Event Description>]`
 * - Retains clean user input and returns the structured payload.
 */
export function constructChatPayload(params: ChatPayloadParams): ChatPayloadResult {
  const {
    userInput,
    activeEvent,
    personalityId,
    systemInstruction,
    model,
    geminiApiKey,
    temperature,
    ...extra
  } = params;

  const trimmedText = (userInput || "").trim();

  let formattedMessage = trimmedText;

  if (activeEvent && activeEvent.description && activeEvent.description.trim()) {
    const injectionTag = `[SYSTEM EVENT INJECTION: ${activeEvent.description.trim()}]`;
    if (trimmedText) {
      formattedMessage = `${injectionTag}\n\n${trimmedText}`;
    } else {
      formattedMessage = injectionTag;
    }
  }

  return {
    formattedMessage,
    apiPayload: {
      message: formattedMessage,
      personalityId,
      systemInstruction,
      model,
      geminiApiKey,
      temperature,
      ...(activeEvent
        ? {
            activeEvent: {
              id: activeEvent.id,
              name: activeEvent.name,
              type: activeEvent.type,
              description: activeEvent.description,
            },
          }
        : {}),
      ...extra,
    },
  };
}
