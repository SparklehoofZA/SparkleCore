sed -i -e '/customApiKey: geminiApiKey/a \          difficulty: questConfig?.questDifficulty || "Adaptive",\n          maxActiveQuests: questConfig?.maxActiveQuests || 3,' src/App.tsx
