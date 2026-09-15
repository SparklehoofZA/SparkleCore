sed -i '1081,1121c\
  const basePromptTemplate = questConfig.customPromptTemplate || "You are an underlying game logic engine for an interactive roleplay system. Your job is to analyze the character'\''s current state and generate contextually relevant desires or tasks.";\
  const maxToGen = (questConfig.maxActiveQuests || 3) - activeCharQuests.length;\
  const prompt = `${basePromptTemplate}\\n\\n'\
'The generation prompt feeds on the character'\''s current state: Personality + Scene + Vitals/Effects + Lore Book + recent MemPalace entries.\\n'\
'### CURRENT CONTEXT:\\n'\
'- Character Name: ${character_name || "Character"}\\n'\
'- Character Personality: ${character_personality || "Complex, thoughtful"}\\n'\
'- Current Scene: ${current_scene || "Quiet room"}\\n'\
'- Current Vitals/Effects: ${current_vitals || "Healthy (100/100)"} / ${current_effects || "None"}\\n'\
'- Relevant Lore: ${lore_context || "Local regional history"}\\n'\
'- Recent Events/Memories: ${mem_palace_summary || "Recent shared dialogues"}\\n\\n'\
'### INSTRUCTIONS:\\n'\
'1. Generate exactly ${maxToGen} active desires or tasks that align tightly with the character'\''s immediate personal needs, current physical scene, vitals/mood, and lore.\\n'\
'2. Avoid generating duplicate quests. DO NOT generate quests similar to: ${avoidTitles || "None active currently"}.\\n'\
'3. ${questConfig.explicitObjectives ? "Provide strict, explicit text goals (e.g. \"Fetch the water\")." : "Provide open-ended, atmospheric objectives (e.g. \"Find a way to quench the thirst\")."}\\n'\
'4. Target Quest Difficulty: ${questConfig.dynamicObjectiveScaling ? "Adaptive based on current Vitals/Effects" : questConfig.questDifficulty || "Medium"}. Adjust the complexity appropriately.\\n'\
'5. Rewards must include relationship_metrics (Affinity, Trust, Harmonic_Bond).\\n'\
'6. Respond ONLY with a valid JSON array containing exactly ${maxToGen} quest objects. Do not include markdown.\\n\\n'\
'### JSON SCHEMA OUTPUT FORMAT:\\n'\
'[\\n  {\\n    "quest_id": "unique_string_slug",\\n    "title": "Quest Title",\\n    "description": "Objective description",\\n    "character_motivation": "Why they want this",\\n    "difficulty": "Easy" | "Medium" | "Hard",\\n    "trigger_prompt": "A natural question to organically introduce this quest.",\\n    "rewards": {\\n      "relationship_metrics": { "affinity": 15, "trust": 10, "harmonic_bond": 8 },\\n      "items": [ { "item_name": "Item", "item_description": "Description" } ]\\n    }\\n  }\\n]`;\
' server.ts
