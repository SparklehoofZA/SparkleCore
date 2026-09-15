sed -i -e '/app.get("\/api\/quests",/i \
app.post("/api/quests/purge", async (req, res) => {\
  try {\
    const type = req.query.type as string;\
    let quests = await loadQuests();\
    if (type === "active") {\
      quests = quests.filter((q: any) => !["in_progress", "proposed", "active", "pending_payout"].includes(q.status));\
    } else if (type === "completed") {\
      quests = quests.filter((q: any) => q.status !== "completed");\
    } else if (type === "failed") {\
      quests = quests.filter((q: any) => q.status !== "failed");\
    } else if (type === "all") {\
      quests = [];\
    }\
    await saveQuests(quests);\
    res.json({ success: true });\
  } catch (error) {\
    res.status(500).json({ error: "Failed to purge quests" });\
  }\
});\
' server.ts
