sed -i -e '/const targetModel =/a \
  const questConfig = await loadQuestingSystemConfig();\
  const existingQuests = await loadQuests();\
  const activeCharQuests = existingQuests.filter((q: any) => q.characterId === personalityId && ["in_progress", "proposed", "active"].includes(q.status));\
  if (activeCharQuests.length >= (questConfig.maxActiveQuests || 3)) {\
    return res.json([]);\
  }\
  const avoidTitles = activeCharQuests.map((q: any) => `"${q.title}"`).join(", ");\
' server.ts
