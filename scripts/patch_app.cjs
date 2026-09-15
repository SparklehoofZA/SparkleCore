const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  const handleDeleteQuest = async (questId: string) => {`;
const replacement = `  const handleForceCompleteQuest = async (quest: CharacterQuest) => {
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
  };

  const handleDeleteQuest = async (questId: string) => {`;

code = code.replace(targetStr, replacement);

const targetStr2 = `        onProposeQuest={handleProposeQuest}`;
const replacement2 = `        onProposeQuest={handleProposeQuest}
        onAcceptQuest={handleAcceptQuest}
        onCompleteQuest={handleForceCompleteQuest}`;

code = code.replace(targetStr2, replacement2);
fs.writeFileSync('src/App.tsx', code);
