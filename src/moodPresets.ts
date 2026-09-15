import {
  Smile,
  Heart,
  Sparkles,
  Flame,
  Zap,
  Shield,
  Compass,
  CloudRain,
  Moon,
  Feather,
  Activity,
  Crown,
  Eye,
  AlertCircle,
  HelpCircle,
  Coffee,
  LucideIcon,
} from "lucide-react";

export interface MoodCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  colorClass: string;
  moods: string[];
}

export const MOOD_CATEGORIES: MoodCategory[] = [
  {
    id: "joy",
    name: "Joy & Excitement",
    icon: Sparkles,
    colorClass: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    moods: [
      "Excited",
      "Thrilled",
      "Ecstatic",
      "Joyful",
      "Cheerful",
      "Bubbly",
      "Triumphant",
      "Elated",
      "Exuberant",
      "Overjoyed",
    ],
  },
  {
    id: "playful",
    name: "Playful & Banter",
    icon: Smile,
    colorClass: "text-violet-400 border-violet-500/30 bg-violet-500/10",
    moods: [
      "Playful",
      "Teasing",
      "Mischievous",
      "Sarcastic",
      "Witty",
      "Flirty",
      "Charming",
      "Amused",
      "Cheeky",
      "Tongue-in-Cheek",
    ],
  },
  {
    id: "affection",
    name: "Affection & Romance",
    icon: Heart,
    colorClass: "text-pink-400 border-pink-500/30 bg-pink-500/10",
    moods: [
      "Affectionate",
      "Flustered",
      "Loving",
      "Smitten",
      "Tender",
      "Yearning",
      "Shy",
      "Passionate",
      "Infatuated",
      "Blushing",
      "Fond",
    ],
  },
  {
    id: "embarrassment",
    name: "Embarrassment & Awkwardness",
    icon: HelpCircle,
    colorClass: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    moods: [
      "Embarrassed",
      "Awkward",
      "Self-Conscious",
      "Sheepish",
      "Mortified",
      "Hesitant",
      "Speechless",
      "Bashful",
      "Flustered",
      "Chagrined",
    ],
  },
  {
    id: "pride",
    name: "Pride & Confidence",
    icon: Crown,
    colorClass: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    moods: [
      "Confident",
      "Smug",
      "Proud",
      "Bold",
      "Cocky",
      "Triumphant",
      "Self-Assured",
      "Audacious",
      "Defiant",
      "Imperious",
    ],
  },
  {
    id: "surprise",
    name: "Surprise & Shock",
    icon: Zap,
    colorClass: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    moods: [
      "Surprised",
      "Shocked",
      "Startled",
      "Stunned",
      "Flabbergasted",
      "Awestruck",
      "Bewildered",
      "Astonished",
      "Dumbfounded",
      "Disbelieving",
    ],
  },
  {
    id: "calm",
    name: "Calm & Serenity",
    icon: Feather,
    colorClass: "text-sky-400 border-sky-500/30 bg-sky-500/10",
    moods: [
      "Calm",
      "Peaceful",
      "Content",
      "Serene",
      "Reflective",
      "Nostalgic",
      "Pensive",
      "Relaxed",
      "Mellow",
      "Tranquil",
      "At Ease",
    ],
  },
  {
    id: "relief",
    name: "Relief & Gratitude",
    icon: Heart,
    colorClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    moods: [
      "Relieved",
      "Grateful",
      "Reassured",
      "Comforted",
      "Thankful",
      "Appreciative",
      "Hopeful",
      "Unburdened",
    ],
  },
  {
    id: "curious",
    name: "Curiosity & Wonder",
    icon: Compass,
    colorClass: "text-teal-400 border-teal-500/30 bg-teal-500/10",
    moods: [
      "Curious",
      "Intrigued",
      "Fascinated",
      "Inquisitive",
      "Piqued",
      "Searching",
      "Captivated",
      "Spellbound",
      "Speculative",
    ],
  },
  {
    id: "resolve",
    name: "Resolve & Vigilance",
    icon: Shield,
    colorClass: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
    moods: [
      "Stern",
      "Guarded",
      "Stoic",
      "Focused",
      "Resolute",
      "Suspicious",
      "Analytical",
      "Vigilant",
      "Determined",
      "Alert",
      "Serious",
    ],
  },
  {
    id: "devotion",
    name: "Devotion & Loyalty",
    icon: Shield,
    colorClass: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    moods: [
      "Protective",
      "Devoted",
      "Loyal",
      "Dutiful",
      "Reverent",
      "Dedicated",
      "Chivalrous",
      "Faithful",
    ],
  },
  {
    id: "fear",
    name: "Fear & Distress",
    icon: Flame,
    colorClass: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    moods: [
      "Scared",
      "Terrified",
      "Anxious",
      "Apprehensive",
      "Panicked",
      "Trembling",
      "Vulnerable",
      "Overwhelmed",
      "Nervous",
      "Dread-Filled",
      "Frightened",
    ],
  },
  {
    id: "melancholy",
    name: "Melancholy & Sorrow",
    icon: CloudRain,
    colorClass: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    moods: [
      "Melancholy",
      "Somber",
      "Sorrowful",
      "Heartbroken",
      "Dejected",
      "Wistful",
      "Lonely",
      "Despondent",
      "Grieving",
      "Disheartened",
      "Glum",
    ],
  },
  {
    id: "conflict",
    name: "Anger & Conflict",
    icon: Zap,
    colorClass: "text-red-400 border-red-500/30 bg-red-500/10",
    moods: [
      "Angry",
      "Irritated",
      "Frustrated",
      "Indignant",
      "Furious",
      "Annoyed",
      "Defiant",
      "Resentful",
      "Bitter",
      "Enraged",
      "Exasperated",
    ],
  },
  {
    id: "disgust",
    name: "Disgust & Skepticism",
    icon: AlertCircle,
    colorClass: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    moods: [
      "Disgusted",
      "Skeptical",
      "Repulsed",
      "Disdainful",
      "Unimpressed",
      "Contemptuous",
      "Appalled",
      "Dubious",
      "Scornful",
    ],
  },
  {
    id: "boredom",
    name: "Boredom & Indifference",
    icon: Moon,
    colorClass: "text-slate-400 border-slate-500/30 bg-slate-500/10",
    moods: [
      "Bored",
      "Indifferent",
      "Apathetic",
      "Detached",
      "Aloof",
      "Unfazed",
      "Dismissive",
      "Nonchalant",
      "Disinterested",
    ],
  },
  {
    id: "guilt",
    name: "Guilt & Secrecy",
    icon: Eye,
    colorClass: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    moods: [
      "Guilty",
      "Remorseful",
      "Secretive",
      "Conflicted",
      "Haunted",
      "Regretful",
      "Evasive",
      "Cryptic",
    ],
  },
  {
    id: "anticipation",
    name: "Anticipation & Yearning",
    icon: Coffee,
    colorClass: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    moods: [
      "Eager",
      "Anticipating",
      "Restless",
      "Impatient",
      "Longing",
      "Yearning",
      "Hungry",
      "Craving",
    ],
  },
  {
    id: "physical",
    name: "Physical & Sensation",
    icon: Activity,
    colorClass: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    moods: [
      "In Pain",
      "Exhausted",
      "Drowsy",
      "Invigorated",
      "Restless",
      "Weakened",
      "Lethargic",
      "Recharged",
      "Aching",
    ],
  },
];

/**
 * All flattened mood presets for easy iteration and quick search.
 */
export const ALL_MOOD_PRESETS: string[] = Array.from(
  new Set(MOOD_CATEGORIES.flatMap((c) => c.moods))
);

/**
 * Default common quick-pick presets displayed at the top level
 */
export const COMMON_MOOD_PRESETS: string[] = [
  "Excited",
  "Playful",
  "Affectionate",
  "Flustered",
  "Confident",
  "Smug",
  "Surprised",
  "Shocked",
  "Calm",
  "Relieved",
  "Curious",
  "Intrigued",
  "Stern",
  "Protective",
  "Scared",
  "Terrified",
  "Melancholy",
  "Somber",
  "Angry",
  "Frustrated",
  "Disgusted",
  "Skeptical",
  "Bored",
  "In Pain",
  "Exhausted",
];

export interface MoodVisualStyling {
  bg: string;
  icon: LucideIcon;
  iconColor: string;
  badge: string;
  pulse: boolean;
  borderHover: string;
}

/**
 * Derives comprehensive visual and thematic styling for any character mood.
 * Supports exact matches and semantic sub-string classification.
 */
export function getMoodStyling(mood: string, stress: number = 0): MoodVisualStyling {
  const m = (mood || "neutral").toLowerCase();

  // 1. Extreme fear / Peril / Panic (or high stress >= 70)
  if (
    m.includes("scared") ||
    m.includes("terrified") ||
    m.includes("fear") ||
    m.includes("panic") ||
    m.includes("horror") ||
    m.includes("petrified") ||
    m.includes("dread") ||
    stress >= 75
  ) {
    return {
      bg: "bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25",
      icon: Flame,
      iconColor: "text-rose-400",
      badge: "border-rose-500/50 bg-rose-950/60 text-rose-200",
      pulse: true,
      borderHover: "hover:border-rose-400",
    };
  }

  // 2. Anger / Conflict / Fury
  if (
    m.includes("angr") ||
    m.includes("furious") ||
    m.includes("irritat") ||
    m.includes("frustrat") ||
    m.includes("indignant") ||
    m.includes("defiant") ||
    m.includes("resentful") ||
    m.includes("enraged") ||
    m.includes("exasperat")
  ) {
    return {
      bg: "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25",
      icon: Zap,
      iconColor: "text-red-400",
      badge: "border-red-500/50 bg-red-950/60 text-red-200",
      pulse: false,
      borderHover: "hover:border-red-400",
    };
  }

  // 3. Melancholy / Sorrow / Somber / Heartbroken
  if (
    m.includes("melanchol") ||
    m.includes("somber") ||
    m.includes("sorrow") ||
    m.includes("heartbroken") ||
    m.includes("dejected") ||
    m.includes("wistful") ||
    m.includes("lonely") ||
    m.includes("despondent") ||
    m.includes("grief") ||
    m.includes("grieving") ||
    m.includes("glum") ||
    m.includes("sad")
  ) {
    return {
      bg: "bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25",
      icon: CloudRain,
      iconColor: "text-blue-400",
      badge: "border-blue-500/50 bg-blue-950/60 text-blue-200",
      pulse: false,
      borderHover: "hover:border-blue-400",
    };
  }

  // 4. Pride & Confidence & Smugness
  if (
    m.includes("smug") ||
    m.includes("confident") ||
    m.includes("proud") ||
    m.includes("cocky") ||
    m.includes("bold") ||
    m.includes("imperious") ||
    m.includes("self-assured") ||
    m.includes("audacious")
  ) {
    return {
      bg: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/25",
      icon: Crown,
      iconColor: "text-yellow-400",
      badge: "border-yellow-500/50 bg-yellow-950/60 text-yellow-200",
      pulse: false,
      borderHover: "hover:border-yellow-400",
    };
  }

  // 5. Surprise & Shock
  if (
    m.includes("surpris") ||
    m.includes("shock") ||
    m.includes("startl") ||
    m.includes("stun") ||
    m.includes("flabbergast") ||
    m.includes("astonish") ||
    m.includes("dumbfound") ||
    m.includes("disbelie")
  ) {
    return {
      bg: "bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25",
      icon: Zap,
      iconColor: "text-purple-400",
      badge: "border-purple-500/50 bg-purple-950/60 text-purple-200",
      pulse: true,
      borderHover: "hover:border-purple-400",
    };
  }

  // 6. Embarrassment & Awkwardness
  if (
    m.includes("embarrass") ||
    m.includes("awkward") ||
    m.includes("self-conscious") ||
    m.includes("sheepish") ||
    m.includes("mortifi") ||
    m.includes("bashful") ||
    m.includes("chagrin")
  ) {
    return {
      bg: "bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25",
      icon: HelpCircle,
      iconColor: "text-rose-400",
      badge: "border-rose-500/50 bg-rose-950/60 text-rose-200",
      pulse: false,
      borderHover: "hover:border-rose-400",
    };
  }

  // 7. Joy / Excitement / Ecstatic
  if (
    m.includes("excit") ||
    m.includes("thrill") ||
    m.includes("ecstatic") ||
    m.includes("joy") ||
    m.includes("cheerful") ||
    m.includes("bubbly") ||
    m.includes("triumphant") ||
    m.includes("elated") ||
    m.includes("exuberant")
  ) {
    return {
      bg: "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25",
      icon: Sparkles,
      iconColor: "text-amber-400",
      badge: "border-amber-500/50 bg-amber-950/60 text-amber-200",
      pulse: false,
      borderHover: "hover:border-amber-400",
    };
  }

  // 8. Affection / Romance / Flustered / Loving
  if (
    m.includes("fluster") ||
    m.includes("blush") ||
    m.includes("shy") ||
    m.includes("affection") ||
    m.includes("loving") ||
    m.includes("smitten") ||
    m.includes("tender") ||
    m.includes("yearning") ||
    m.includes("passionate") ||
    m.includes("infatuat") ||
    m.includes("fond")
  ) {
    return {
      bg: "bg-pink-500/15 border-pink-500/40 text-pink-300 hover:bg-pink-500/25",
      icon: Heart,
      iconColor: "text-pink-400",
      badge: "border-pink-500/50 bg-pink-950/60 text-pink-200",
      pulse: false,
      borderHover: "hover:border-pink-400",
    };
  }

  // 9. Relief & Gratitude
  if (
    m.includes("relie") ||
    m.includes("grateful") ||
    m.includes("reassur") ||
    m.includes("comfort") ||
    m.includes("thankful") ||
    m.includes("appreciat") ||
    m.includes("hopeful") ||
    m.includes("unburden")
  ) {
    return {
      bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25",
      icon: Heart,
      iconColor: "text-emerald-400",
      badge: "border-emerald-500/50 bg-emerald-950/60 text-emerald-200",
      pulse: false,
      borderHover: "hover:border-emerald-400",
    };
  }

  // 10. Playful / Teasing / Mischievous / Sarcastic
  if (
    m.includes("playful") ||
    m.includes("teas") ||
    m.includes("mischiev") ||
    m.includes("sarcastic") ||
    m.includes("witty") ||
    m.includes("flirt") ||
    m.includes("charm") ||
    m.includes("amused") ||
    m.includes("cheeky")
  ) {
    return {
      bg: "bg-violet-500/15 border-violet-500/40 text-violet-300 hover:bg-violet-500/25",
      icon: Smile,
      iconColor: "text-violet-400",
      badge: "border-violet-500/50 bg-violet-950/60 text-violet-200",
      pulse: false,
      borderHover: "hover:border-violet-400",
    };
  }

  // 11. Disgust & Skepticism
  if (
    m.includes("disgust") ||
    m.includes("skeptic") ||
    m.includes("repuls") ||
    m.includes("disdain") ||
    m.includes("unimpress") ||
    m.includes("contempt") ||
    m.includes("appall") ||
    m.includes("dubious") ||
    m.includes("scorn")
  ) {
    return {
      bg: "bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25",
      icon: AlertCircle,
      iconColor: "text-orange-400",
      badge: "border-orange-500/50 bg-orange-950/60 text-orange-200",
      pulse: false,
      borderHover: "hover:border-orange-400",
    };
  }

  // 12. Boredom & Apathy / Aloof
  if (
    m.includes("bore") ||
    m.includes("indiffer") ||
    m.includes("apath") ||
    m.includes("detach") ||
    m.includes("aloof") ||
    m.includes("unfaz") ||
    m.includes("dismiss") ||
    m.includes("nonchalant")
  ) {
    return {
      bg: "bg-slate-500/15 border-slate-500/40 text-slate-300 hover:bg-slate-500/25",
      icon: Moon,
      iconColor: "text-slate-400",
      badge: "border-slate-500/50 bg-slate-950/60 text-slate-200",
      pulse: false,
      borderHover: "hover:border-slate-400",
    };
  }

  // 13. Devotion / Loyalty / Protective
  if (
    m.includes("protect") ||
    m.includes("devot") ||
    m.includes("loyal") ||
    m.includes("dutiful") ||
    m.includes("reverent") ||
    m.includes("chivalr") ||
    m.includes("faith")
  ) {
    return {
      bg: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25",
      icon: Shield,
      iconColor: "text-cyan-400",
      badge: "border-cyan-500/50 bg-cyan-950/60 text-cyan-200",
      pulse: false,
      borderHover: "hover:border-cyan-400",
    };
  }

  // 14. Curiosity / Wonder / Intrigued
  if (
    m.includes("curious") ||
    m.includes("intrigued") ||
    m.includes("fascinat") ||
    m.includes("inquisitive") ||
    m.includes("awestruck") ||
    m.includes("bewilder") ||
    m.includes("amazed") ||
    m.includes("piqu") ||
    m.includes("spellbound")
  ) {
    return {
      bg: "bg-teal-500/15 border-teal-500/40 text-teal-300 hover:bg-teal-500/25",
      icon: Compass,
      iconColor: "text-teal-400",
      badge: "border-teal-500/50 bg-teal-950/60 text-teal-200",
      pulse: false,
      borderHover: "hover:border-teal-400",
    };
  }

  // 15. Vigilance / Stoic / Stern / Guarded
  if (
    m.includes("stern") ||
    m.includes("serious") ||
    m.includes("stoic") ||
    m.includes("guard") ||
    m.includes("focus") ||
    m.includes("resolute") ||
    m.includes("suspicious") ||
    m.includes("vigilant") ||
    m.includes("analytical") ||
    m.includes("alert") ||
    m.includes("determin")
  ) {
    return {
      bg: "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25",
      icon: Shield,
      iconColor: "text-indigo-400",
      badge: "border-indigo-500/50 bg-indigo-950/60 text-indigo-200",
      pulse: false,
      borderHover: "hover:border-indigo-400",
    };
  }

  // 16. Guilt & Secrecy
  if (
    m.includes("guilt") ||
    m.includes("remorse") ||
    m.includes("secret") ||
    m.includes("conflict") ||
    m.includes("haunt") ||
    m.includes("regret") ||
    m.includes("evasive") ||
    m.includes("cryptic")
  ) {
    return {
      bg: "bg-violet-900/25 border-violet-500/40 text-violet-300 hover:bg-violet-900/35",
      icon: Eye,
      iconColor: "text-violet-400",
      badge: "border-violet-500/50 bg-violet-950/80 text-violet-200",
      pulse: false,
      borderHover: "hover:border-violet-400",
    };
  }

  // 17. Physical / Exhaustion / Pain
  if (
    m.includes("pain") ||
    m.includes("exhaust") ||
    m.includes("drowsy") ||
    m.includes("weak") ||
    m.includes("restless") ||
    m.includes("fatigue") ||
    m.includes("ach") ||
    m.includes("letharg")
  ) {
    const isPain = m.includes("pain") || m.includes("ach");
    return {
      bg: isPain ? "bg-rose-950/40 border-rose-500/50 text-rose-300" : "bg-stone-500/15 border-stone-500/40 text-stone-300",
      icon: isPain ? Activity : Moon,
      iconColor: isPain ? "text-rose-400" : "text-stone-400",
      badge: isPain ? "border-rose-500/50 bg-rose-950/80 text-rose-200" : "border-stone-500/50 bg-stone-900/80 text-stone-200",
      pulse: isPain,
      borderHover: isPain ? "hover:border-rose-400" : "hover:border-stone-400",
    };
  }

  // 18. Calm / Peace / Content / Serene
  if (
    m.includes("calm") ||
    m.includes("peace") ||
    m.includes("relax") ||
    m.includes("content") ||
    m.includes("serene") ||
    m.includes("reflective") ||
    m.includes("nostalgic") ||
    m.includes("pensive") ||
    m.includes("mellow") ||
    m.includes("tranquil")
  ) {
    return {
      bg: "bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25",
      icon: Feather,
      iconColor: "text-sky-400",
      badge: "border-sky-500/50 bg-sky-950/60 text-sky-200",
      pulse: false,
      borderHover: "hover:border-sky-400",
    };
  }

  // Fallback: Neutral
  return {
    bg: "bg-[#18181D] border-[#2A2A32] text-gray-300 hover:border-amber-500/30",
    icon: Smile,
    iconColor: "text-amber-400/80",
    badge: "border-[#33333E] bg-[#141418] text-gray-300",
    pulse: false,
    borderHover: "hover:border-amber-400/40",
  };
}

/**
 * Returns prompt guidance string for AI state inference.
 */
export function getAiMoodPromptGuidance(charName: string): string {
  return `1. "mood": What is ${charName} feeling RIGHT NOW at the immediate end of the exchange?
   Pick the most accurate, nuanced emotional mood from or inspired by this comprehensive roleplay palette:
   • Joy & Energy: "Excited", "Thrilled", "Ecstatic", "Joyful", "Cheerful", "Bubbly", "Triumphant", "Elated"
   • Playful & Banter: "Playful", "Teasing", "Mischievous", "Sarcastic", "Witty", "Flirty", "Charming", "Amused"
   • Romance & Vulnerability: "Affectionate", "Flustered", "Loving", "Smitten", "Tender", "Yearning", "Shy", "Passionate"
   • Embarrassment & Awkward: "Embarrassed", "Awkward", "Self-Conscious", "Sheepish", "Mortified", "Hesitant", "Speechless", "Bashful"
   • Pride & Confidence: "Confident", "Smug", "Proud", "Bold", "Cocky", "Triumphant", "Self-Assured", "Audacious"
   • Surprise & Shock: "Surprised", "Shocked", "Startled", "Stunned", "Flabbergasted", "Awestruck", "Bewildered", "Astonished"
   • Calm & Contemplation: "Calm", "Peaceful", "Content", "Serene", "Reflective", "Nostalgic", "Pensive", "Relaxed", "Tranquil"
   • Relief & Gratitude: "Relieved", "Grateful", "Reassured", "Comforted", "Thankful", "Appreciative", "Hopeful"
   • Curiosity & Discovery: "Curious", "Intrigued", "Fascinated", "Inquisitive", "Spellbound", "Captivated"
   • Resolve & Vigilance: "Stern", "Guarded", "Stoic", "Focused", "Resolute", "Suspicious", "Analytical", "Vigilant", "Determined"
   • Devotion & Loyalty: "Protective", "Devoted", "Loyal", "Dutiful", "Reverent", "Dedicated"
   • Fear & Peril: "Scared", "Terrified", "Anxious", "Apprehensive", "Panicked", "Trembling", "Vulnerable", "Overwhelmed"
   • Melancholy & Sorrow: "Melancholy", "Somber", "Sorrowful", "Heartbroken", "Dejected", "Wistful", "Lonely", "Despondent"
   • Anger & Conflict: "Angry", "Irritated", "Frustrated", "Indignant", "Furious", "Annoyed", "Defiant", "Resentful", "Exasperated"
   • Disgust & Skepticism: "Disgusted", "Skeptical", "Repulsed", "Disdainful", "Unimpressed", "Dubious", "Scornful"
   • Boredom & Apathy: "Bored", "Indifferent", "Apathetic", "Detached", "Aloof", "Unfazed", "Dismissive"
   • Guilt & Secrecy: "Guilty", "Remorseful", "Secretive", "Conflicted", "Haunted", "Regretful", "Evasive"
   • Anticipation: "Eager", "Anticipating", "Restless", "Impatient", "Longing"
   • Physical & Fatigue: "In Pain", "Exhausted", "Drowsy", "Invigorated", "Restless", "Weakened", "Lethargic"
   Select the exact fitting mood (e.g. "Smug", "Relieved", "Surprised", "Flustered", "Protective", "Playful", "Melancholy", "Intrigued", "Resolute") that genuinely reflects ${charName}'s reaction.`;
}

export interface StatusEffectPreset {
  tag: string;
  category: "Physical" | "Psychological" | "Environmental";
  description: string;
}

export const REGISTERED_STATUS_EFFECTS: StatusEffectPreset[] = [
  // Psychological / Emotional
  { tag: "Calm", category: "Psychological", description: "Peaceful mental state with low stress response." },
  { tag: "Relaxed", category: "Psychological", description: "Physically and mentally at ease." },
  { tag: "Content", category: "Psychological", description: "Satisfied with current surroundings and interaction." },
  { tag: "Alert", category: "Psychological", description: "Attentive to surroundings, ready to react." },
  { tag: "On High Alert", category: "Psychological", description: "Heightened vigilance anticipating imminent danger." },
  { tag: "Excited", category: "Psychological", description: "Elevated positive arousal and enthusiasm." },
  { tag: "Beaming", category: "Psychological", description: "Bright, radiant happiness and beaming expression." },
  { tag: "Blushing", category: "Psychological", description: "Warm flush from shyness, affection, or embarrassment." },
  { tag: "Flustered", category: "Psychological", description: "Momentarily discomposed by romantic or awkward remarks." },
  { tag: "Trembling", category: "Psychological", description: "Shivering from acute fear, shock, or high distress." },
  { tag: "Panicked", category: "Psychological", description: "Overwhelmed by acute danger or terror." },
  { tag: "Heartbroken", category: "Psychological", description: "Profound sorrow from loss, rejection, or betrayal." },
  { tag: "Guarded", category: "Psychological", description: "Defensive posture, cautious about sharing feelings." },
  { tag: "Focused", category: "Psychological", description: "Deeply concentrated on an ongoing task or objective." },
  { tag: "Adrenaline Spike", category: "Psychological", description: "Sudden burst of fight-or-flight energy." },

  // Physical Conditions
  { tag: "Injured", category: "Physical", description: "Sustained physical trauma requiring medical care." },
  { tag: "Bleeding", category: "Physical", description: "Active open wound requiring bandaging." },
  { tag: "Exhausted", category: "Physical", description: "Near total depletion of physical energy reserves." },
  { tag: "Fatigued", category: "Physical", description: "Tired muscles from prolonged exertion or travel." },
  { tag: "Drowsy", category: "Physical", description: "Struggling to stay awake; ready for sleep." },
  { tag: "Intoxicated", category: "Physical", description: "Impaired coordination and inhibitions from alcohol." },
  { tag: "Invigorated", category: "Physical", description: "Refreshed and bursting with vitality." },
  { tag: "Aching", category: "Physical", description: "Dull physical pain from strain or minor bruises." },

  // Environmental
  { tag: "Chilled", category: "Environmental", description: "Shivering from cold rain, snow, or damp draft." },
  { tag: "Overheated", category: "Environmental", description: "Sweltering under oppressive desert or combat heat." },
  { tag: "Soaked", category: "Environmental", description: "Clothes and hair dripping wet from storm or water." },
  { tag: "Sheltered", category: "Environmental", description: "Protected within a safe, secure haven." },
];
