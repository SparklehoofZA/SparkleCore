const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// The replacement was globally applied. We can find the endpoints by their catch blocks.
// For generate-event (look for "Error generating event")
content = content.replace(
  /res\.json\(\{\s*name:\s*"Generated Profile"[^}]+\}\);\s*return;\s*\}\s*\}\s*res\.json\(\{\s*name:\s*"Generated Profile"[^}]+\}\);\s*\}\s*catch\s*\(error:\s*any\)\s*\{\s*console\.error\("Error generating event"/g,
  `res.json({ name: "Unexpected Event", type: "Custom", description: "Something unexpected happens in the environment." });
           return;
        }
      }
      res.json({ name: "Unexpected Event", type: "Custom", description: "Something unexpected happens in the environment." });
    }
  } catch (error: any) {
    console.error("Error generating event"`
);

// For generate-lore-entry (look for "Error generating lore entry")
content = content.replace(
  /res\.json\(\{\s*name:\s*"Generated Profile"[^}]+\}\);\s*return;\s*\}\s*\}\s*res\.json\(\{\s*name:\s*"Generated Profile"[^}]+\}\);\s*\}\s*catch\s*\(error:\s*any\)\s*\{\s*console\.error\("Error generating lore entry"/g,
  `res.json({ name: "New Lore", content: "Information discovered." });
           return;
        }
      }
      res.json({ name: "New Lore", content: "Information discovered." });
    }
  } catch (error: any) {
    console.error("Error generating lore entry"`
);

fs.writeFileSync('server.ts', content);
