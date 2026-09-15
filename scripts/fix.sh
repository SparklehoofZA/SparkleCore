sed -i -e '1082,1085c\
  const prompt = `${basePromptTemplate}\\n\\n\\\n'\
'The generation prompt feeds on the character\\'s current state: Personality + Scene + Vitals/Effects + Lore Book + recent MemPalace entries.\\n\\\n'\
'### CURRENT CONTEXT:\\n\\\n'\
'- Character Name: ${character_name || "Character"}\\n\\\n'\
'- Character Personality: ${character_personality || "Complex, thoughtful"}\\n\\\n'\
'- Current Scene: ${current_scene || "Quiet room"}\\n\\\n'\
'- Current Vitals/Effects: ${current_vitals || "Healthy (100/100)"} / ${current_effects || "None"}\\n\\\n'\
'- Relevant Lore: ${lore_context || "Local regional history"}\\n\\\n'\
'- Recent Events/Memories: ${mem_palace_summary || "Recent shared dialogues"}\\n\\n\\\n'\
'### INSTRUCTIONS:\\n\\\n'\
'1. Generate exactly ${maxToGen} active desires or tasks that align tightly with the character\\'s immediate personal needs, current physical scene, vitals/mood, and lore.\\n\\\n'\
'2. Avoid generating duplicate quests. DO NOT generate quests similar to: ${avoidTitles || "None active currently"}.\\n\\\n'\
'3. ${questConfig.explicitObjectives ? "Provide strict, explicit text goals (e.g. \\"Fetch the water\\")." : "Provide open-ended, atmospheric objectives (e.g. \\"Find a way to quench the thirst\\")."}\\n\\\n'\
'4. Target Quest Difficulty: ${questConfig.dynamicObjectiveScaling ? "Adaptive based on current Vitals/Effects" : questConfig.questDifficulty || "Medium"}. Adjust the complexity appropriately.\\n\\\n'\
'5. Rewards must include relationship_metrics (Affinity, Trust, Harmonic_Bond).\\n\\\n'\
'6. Respond ONLY with a valid JSON array containing exactly ${maxToGen} quest objects. Do not include markdown.\\n\\n\\\n'\
'### JSON SCHEMA OUTPUT FORMAT:\\n\\\n'\
'[\\n\\\n'\
'  {\\n\\\n'\
'    "quest_id": "unique_string_slug",\\n\\\n'\
'    "title": "Quest Title",\\n\\\n'\
'    "description": "Objective description",\\n\\\n'\
'    "character_motivation": "Why they want this",\\n\\\n'\
'    "difficulty": "Easy" | "Medium" | "Hard",\\n\\\n'\
'    "trigger_prompt": "A natural question to organically introduce this quest.",\\n\\\n'\
'    "rewards": {\\n\\\n'\
'      "relationship_metrics": { "affinity": 15, "trust": 10, "harmonic_bond": 8 },\\n\\\n'\
'      "items": [ { "item_name": "Item", "item_description": "Description" } ]\\n\\\n'\
'    }\\n\\\n'\
'  }\\n\\\n'\
']`;\
' server.ts
