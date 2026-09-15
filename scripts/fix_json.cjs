const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// For /api/generate-scenario (line 580+)
content = content.replace(
  /res\.json\(parsedObj\);\s*return;\s*\}\s*catch\s*\(innerE\)\s*\{\s*throw e;\s*\}\s*\}\s*throw e;/g,
  `res.json(parsedObj);
           return;
        } catch (innerE) {
           res.json({
             name: "Generated Scenario",
             description: "A scenario generated dynamically.",
             location: "Unknown",
             timeOfDay: "Unknown",
             context: "The story continues...",
             firstMessage: "*looks around*"
           });
           return;
        }
      }
      res.json({
             name: "Generated Scenario",
             description: "A scenario generated dynamically.",
             location: "Unknown",
             timeOfDay: "Unknown",
             context: "The story continues...",
             firstMessage: "*looks around*"
           });
      return;`
);

// For /api/generate-event (line 637+)
content = content.replace(
  /res\.json\(JSON\.parse\(fixed\)\);\s*return;\s*\}\s*catch\s*\(innerE\)\s*\{\s*throw e;\s*\}\s*\}\s*throw e;/g,
  `res.json(JSON.parse(fixed));
           return;
        } catch (innerE) {
           res.json({ name: "Unexpected Event", type: "Custom", description: "Something unexpected happens in the environment." });
           return;
        }
      }
      res.json({ name: "Unexpected Event", type: "Custom", description: "Something unexpected happens in the environment." });
      return;`
);

// For /api/generate-quests (line 704+)
content = content.replace(
  /res\.json\(JSON\.parse\(fixed\)\);\s*return;\s*\}\s*catch\s*\(innerE\)\s*\{\s*throw e;\s*\}\s*\}\s*throw e;/g,
  `res.json(JSON.parse(fixed));
           return;
        } catch (innerE) {
           res.json([]);
           return;
        }
      }
      res.json([]);
      return;`
);

// For /api/extract-entities
content = content.replace(
  /parsed\s*=\s*JSON\.parse\(fixed\);\s*\}\s*catch\s*\(innerE\)\s*\{\s*throw e;\s*\}\s*\}\s*else\s*\{\s*throw e;\s*\}/g,
  `parsed = JSON.parse(fixed);
        } catch (innerE) {
          parsed = { memory_notes: [] };
        }
      } else {
        parsed = { memory_notes: [] };
      }`
);

fs.writeFileSync('server.ts', content);
