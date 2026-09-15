sed -i -e '/customApiKey,/a \    difficulty,\n    maxActiveQuests,' server.ts
sed -i -e 's/Generate 3 to 5/Generate up to ${maxActiveQuests || 3}/g' server.ts
sed -i -e 's/containing 3 to 5/containing up to ${maxActiveQuests || 3}/g' server.ts
sed -i -e '/Produce lightweight objectives/a \2. Target Quest Difficulty: ${difficulty === "Adaptive" ? "Determine based on vitals and context" : difficulty}. Adjust the complexity of the tasks appropriately.' server.ts
