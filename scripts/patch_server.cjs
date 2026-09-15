const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startRegex = /app\.post\("\/api\/generate-quests", async \(req, res\) => \{/;
const endRegex = /app\.get\("\/api\/questing-system\/config",/;

const startIndex = code.search(startRegex);
const endIndex = code.search(endRegex);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `app.post("/api/generate-quests", async (req, res) => {
  const {
    character_name,
    character_personality,
    current_scene,
    current_vitals,
    current_effects,
    lore_context,
    mem_palace_summary,
    personalityId,
    model,
    customApiKey,
  } = req.body || {};

  const targetModel = model || getActiveSessionModel() || process.env.DEFAULT_MODEL || "gemini-3.8-flash";
  const questConfig = await loadQuestingSystemConfig();
  const existingQuests = await loadQuests();
  const activeCharQuests = existingQuests.filter((q: any) => q.characterId === personalityId && ["in_progress", "proposed", "active"].includes(q.status));
  
  if (activeCharQuests.length >= (questConfig.maxActiveQuests || 3)) {
    return res.json([]);
  }

  const avoidTitles = activeCharQuests.map((q: any) => \`"\${q.title}"\`).join(", ");
  const basePromptTemplate = questConfig.customPromptTemplate || "You are an underlying game logic engine for an interactive roleplay system. Your job is to analyze the character's current state and generate contextually relevant desires or tasks.";
  const maxToGen = (questConfig.maxActiveQuests || 3) - activeCharQuests.length;

  const prompt = \`\$\{basePromptTemplate\}

The generation prompt feeds on the character's current state: Personality + Scene + Vitals/Effects + Lore Book + recent MemPalace entries.

### CURRENT CONTEXT:
- Character Name: \$\{character_name || "Character"\}
- Character Personality: \$\{character_personality || "Complex, thoughtful"\}
- Current Scene: \$\{current_scene || "Quiet room"\}
- Current Vitals/Effects: \$\{current_vitals || "Healthy (100/100)"\} / \$\{current_effects || "None"\}
- Relevant Lore: \$\{lore_context || "Local regional history"\}
- Recent Events/Memories: \$\{mem_palace_summary || "Recent shared dialogues"\}

### INSTRUCTIONS:
1. Generate exactly \$\{maxToGen\} active desires or tasks that align tightly with the character's immediate personal needs, current physical scene, vitals/mood, and lore.
2. Avoid generating duplicate quests. DO NOT generate quests similar to: \$\{avoidTitles || "None active currently"\}.
3. \$\{questConfig.explicitObjectives ? "Provide strict, explicit text goals (e.g. 'Fetch the water')." : "Provide open-ended, atmospheric objectives (e.g. 'Find a way to quench the thirst')."\}
4. Target Quest Difficulty: \$\{questConfig.dynamicObjectiveScaling ? "Adaptive based on current Vitals/Effects" : questConfig.questDifficulty || "Medium"\}. Adjust the complexity appropriately.
5. Rewards must include relationship_metrics (Affinity, Trust, Harmonic_Bond).
6. Respond ONLY with a valid JSON array containing exactly \$\{maxToGen\} quest objects. Do not include markdown.

### JSON SCHEMA OUTPUT FORMAT:
[
  {
    "quest_id": "unique_string_slug",
    "title": "Quest Title",
    "description": "Objective description",
    "character_motivation": "Why they want this",
    "difficulty": "Easy" | "Medium" | "Hard",
    "trigger_prompt": "A natural question to organically introduce this quest.",
    "rewards": {
      "relationship_metrics": { "affinity": 15, "trust": 10, "harmonic_bond": 8 },
      "items": [ { "item_name": "Item", "item_description": "Description" } ]
    }
  }
]\`;

  try {
    const responseText = await executeUniversalInference({
      model: targetModel,
      prompt,
      responseMimeType: "application/json",
      customApiKey,
      maxTokens: 3000,
    });
    
    let cleaned = responseText.trim();
    if (cleaned.startsWith("\`\`\`json")) {
      cleaned = cleaned.replace(/^\`\`\`json\\s*/, "").replace(/\\s*\`\`\`$/, "").trim();
    } else if (cleaned.startsWith("\`\`\`")) {
      cleaned = cleaned.replace(/^\`\`\`\\s*/, "").replace(/\\s*\`\`\`$/, "").trim();
    }

    let parsed: any;
    try {
      cleaned = jsonrepair(cleaned);
      parsed = JSON.parse(cleaned);
    } catch (e: any) {
      if (e.message.includes("Unterminated string") || e.message.includes("Unexpected end of JSON")) {
        try {
          let fixed = cleaned;
          if ((fixed.match(/"/g) || []).length % 2 !== 0) {
            fixed += '"';
          }
          if (!fixed.endsWith("]")) {
            if (!fixed.endsWith("}")) fixed += "\\n}";
            fixed += "\\n]";
          }
          parsed = JSON.parse(fixed);
        } catch (innerE) {
          throw e;
        }
      } else {
        throw e;
      }
    }

    let questArray: any[] = [];
    if (Array.isArray(parsed)) {
      questArray = parsed;
    } else if (parsed && Array.isArray(parsed.quests)) {
      questArray = parsed.quests;
    } else if (parsed && typeof parsed === "object") {
      questArray = [parsed];
    }
    
    questArray = questArray.filter(q => q && q.quest_id);

    questArray.forEach(q => {
      q.characterId = personalityId;
      q.status = "proposed";
      q.progress = 0;
    });

    const allQuests = await loadQuests();
    const existingIds = new Set(allQuests.map((q: any) => q.quest_id));
    const newOnes = questArray.filter(q => !existingIds.has(q.quest_id));
    
    if (newOnes.length > 0) {
      allQuests.push(...newOnes);
      await saveQuests(allQuests);
    }
    
    res.json(newOnes);
  } catch (error: any) {
    console.error("Game Logic Engine - Quest Generation Error:", error);
    res.status(500).json({ error: "Failed to generate dynamic quests", details: error.message });
  }
});

`;
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync('server.ts', code);
    console.log("Successfully replaced generate-quests block!");
} else {
    console.log("Regex search failed.", startIndex, endIndex);
}
