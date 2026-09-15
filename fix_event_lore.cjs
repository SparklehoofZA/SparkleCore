const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Use precise substring replacement for the erroneous fallback objects generated earlier
content = content.replace(
  /res\.json\(\{ name: "Generated Profile", description: "Personality profile generated\.", age: "Unknown", gender: "Unknown" \}\);\s*return;\s*\}\s*\}\s*res\.json\(\{ name: "Generated Profile", description: "Personality profile generated\.", age: "Unknown", gender: "Unknown" \}\);\s*\}\s*catch\s*\(error:\s*any\)\s*\{\s*console\.error\("Error generating event"/g,
  `res.json({ name: "Unexpected Event", type: "Custom", description: "Something unexpected happens in the environment." });
           return;
        }
      }
      res.json({ name: "Unexpected Event", type: "Custom", description: "Something unexpected happens in the environment." });
    }
  } catch (error: any) {
    console.error("Error generating event"`
);

content = content.replace(
  /res\.json\(\{ name: "Generated Profile", description: "Personality profile generated\.", age: "Unknown", gender: "Unknown" \}\);\s*return;\s*\}\s*\}\s*res\.json\(\{ name: "Generated Profile", description: "Personality profile generated\.", age: "Unknown", gender: "Unknown" \}\);\s*\}\s*catch\s*\(error:\s*any\)\s*\{\s*console\.error\("Error generating lore entry"/g,
  `res.json({ name: "New Lore", content: "Information discovered." });
           return;
        }
      }
      res.json({ name: "New Lore", content: "Information discovered." });
    }
  } catch (error: any) {
    console.error("Error generating lore entry"`
);

content = content.replace(
  /res\.json\(\{ name: "Generated Profile", description: "Personality profile generated\.", age: "Unknown", gender: "Unknown" \}\);\s*return;\s*\}\s*\}\s*res\.json\(\{ name: "Generated Profile", description: "Personality profile generated\.", age: "Unknown", gender: "Unknown" \}\);\s*\}\s*catch\s*\(error:\s*any\)\s*\{\s*console\.error\("Error generating quests"/g,
  `res.json([]);
           return;
        }
      }
      res.json([]);
    }
  } catch (error: any) {
    console.error("Error generating quests"`
);


fs.writeFileSync('server.ts', content);
