const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const injection = `
const SCENARIOS_FILE = path.join(DATA_DIR, "scenarios.json");

async function loadScenarios() {
  try {
    const data = await fs.readFile(SCENARIOS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveScenarios(scenarios: any[]) {
  await fs.writeFile(SCENARIOS_FILE, JSON.stringify(scenarios, null, 2), "utf-8");
}

app.get("/api/scenarios", async (req, res) => {
  const scenarios = await loadScenarios();
  res.json(scenarios);
});

app.post("/api/scenarios", async (req, res) => {
  const { name, description, context } = req.body;
  if (!name || !context) {
    return res.status(400).json({ error: "Name and context are required" });
  }
  const scenarios = await loadScenarios();
  const newScenario = {
    id: uuidv4(),
    name: name.trim(),
    description: (description || "").trim(),
    context: context.trim(),
  };
  scenarios.push(newScenario);
  await saveScenarios(scenarios);
  res.json(newScenario);
});

app.put("/api/scenarios/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, context } = req.body;
  
  if (!name || !context) {
    return res.status(400).json({ error: "Name and context are required" });
  }

  const scenarios = await loadScenarios();
  const index = scenarios.findIndex((s: any) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Scenario not found" });
  }
  
  scenarios[index] = {
    ...scenarios[index],
    name: name.trim(),
    description: (description || "").trim(),
    context: context.trim(),
  };
  
  await saveScenarios(scenarios);
  res.json(scenarios[index]);
});

app.delete("/api/scenarios/:id", async (req, res) => {
  const { id } = req.params;
  const scenarios = await loadScenarios();
  const filtered = scenarios.filter((s: any) => s.id !== id);
  await saveScenarios(filtered);
  res.json({ success: true, id });
});

const USER_PERSONA_FILE_REF = path.join(DATA_DIR, "user_persona.json"); // Just finding the insertion point
`;

content = content.replace('const USER_PERSONA_FILE = path.join(DATA_DIR, "user_persona.json");', injection.replace('const USER_PERSONA_FILE_REF = path.join(DATA_DIR, "user_persona.json"); // Just finding the insertion point', 'const USER_PERSONA_FILE = path.join(DATA_DIR, "user_persona.json");'));

fs.writeFileSync('server.ts', content, 'utf8');
