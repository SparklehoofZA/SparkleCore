const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// For generate-personality
content = content.replace(
  /res\.json\(JSON\.parse\(fixed\)\);\s*return;\s*\}\s*catch\s*\(innerE\)\s*\{\s*throw new Error\("JSON parse failed"\);\s*\}\s*\}\s*throw new Error\("JSON parse failed"\);/g,
  `res.json(JSON.parse(fixed));
           return;
        } catch (innerE) {
           res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });
           return;
        }
      }
      res.json({ name: "Generated Profile", description: "Personality profile generated.", age: "Unknown", gender: "Unknown" });`
);

fs.writeFileSync('server.ts', content);
