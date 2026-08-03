const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf-8');

// Fix docJson to include format
content = content.replace(
  /const docJson = JSON\.stringify\(\{ title: dObj\.title, content: dObj\.content \}\);/,
  'const docJson = JSON.stringify({ title: dObj.title, content: dObj.content, format: dObj.format });'
);

// Prevent infinite list_documents loop
content = content.replace(
  '} else if (fc.name === "delete_document") {',
  `} else if (fc.name === "list_documents") {
              const docsList = Array.from(workspaceDocuments.values()).map(d => ({ title: d.title, length: d.content.length }));
              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: {
                    success: true,
                    total_documents: docsList.length,
                    documents: docsList
                  }
                }
              });
              // PREVENT LOOP: If AI is in ANY mode and keeps calling list_documents, force it out if it already listed it recently.
              // We'll just let it list but if it keeps doing it... wait, we can just add instruction not to loop.
            } else if (fc.name === "delete_document") {`
);

fs.writeFileSync('api/index.ts', content, 'utf-8');
