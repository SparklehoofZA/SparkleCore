const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// For generate-personality
content = content.replace(
  /res\.json\(JSON\.parse\(fixed\)\);\s*return;\s*\}\s*catch\s*\(innerE\)\s*\{\s*throw e;\s*\}\s*\}\s*throw e;/g,
  `res.json(JSON.parse(fixed));
           return;
        } catch (innerE) {
           throw new Error("JSON parse failed");
        }
      }
      throw new Error("JSON parse failed");`
);

fs.writeFileSync('server.ts', content);
