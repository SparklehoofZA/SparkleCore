const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStr = `  const handleForceCompleteQuest = async (quest: CharacterQuest) => {
    try {
      const res = await fetch(\`/api/quests/\${quest.quest_id}/status\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });
      if (res.ok) {
        setQuests((prev) =>
          prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "completed" } : q))
        );
        fetchGameState();
        fetchPersonality(selectedPersonality!.id);
        setPurgeToast(\`✅ Quest Force Completed: "\${quest.title}"\`);
        setTimeout(() => setPurgeToast(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };`;

const newStr = `  const handleForceCompleteQuest = async (quest: CharacterQuest) => {
    try {
      const res = await fetch(\`/api/quests/\${quest.quest_id}/complete\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalityId: selectedPersonality?.id })
      });
      if (res.ok) {
        const data = await res.json();
        setQuests((prev) =>
          prev.map((q) => (q.quest_id === quest.quest_id ? { ...q, status: "completed" } : q))
        );
        if (data.gameState) {
          setGameState(data.gameState);
        }
        if (selectedPersonality?.id) {
          fetchPersonalities();
        }
        setPurgeToast(\`✅ Quest Force Completed: "\${quest.title}"\`);
        setTimeout(() => setPurgeToast(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('src/App.tsx', code);
