const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const injection = `
app.post("/api/chat/import-format", async (req, res) => {
  const { messages, model, customApiKey } = req.body;
  try {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(401).json({ error: "No API key" });
    
    const { GoogleGenAI } = require("@google/genai");
    const genAI = new GoogleGenAI({ apiKey });
    
    const prompt = \`You are a roleplay text formatting assistant.
Your task is to take an array of raw chat messages and format them according to strict rules:
1. All spoken dialogue must be enclosed in double quotes (" ").
2. All actions, thoughts, and narration must be enclosed in asterisks (* *).
3. Do not change the meaning of the text, only add the formatting.

Input messages (JSON array of strings):
\${JSON.stringify(messages)}

Return ONLY a valid JSON array of strings containing the formatted messages in the exact same order. Do not include markdown formatting or backticks.\`;

    const response = await genAI.models.generateContent({
      model: model || "gemini-3.8-flash",
      contents: prompt,
      config: { temperature: 0.2 }
    });
    
    let text = response.text || "[]";
    text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    const formatted = JSON.parse(text);
    res.json({ formatted });
  } catch (err) {
    console.error("Format error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat/import-save", async (req, res) => {
  const { personalityId, history } = req.body;
  try {
    await saveHistory(personalityId, history);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('/api/chat/import-format')) {
  code = code.replace('app.post("/api/chat/select-variation"', injection + '\napp.post("/api/chat/select-variation"');
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("Injected");
} else {
  console.log("Already injected");
}
