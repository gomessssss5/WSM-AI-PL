const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `              const args = fc.args as any;
              const title = String(args.title || 'Documento').trim();
              const content = String(args.content || '');
              const format = inferFormat(title, args.format, content);
              workspaceDocuments.set(title, { title, content, format });`;

const newCode = `              const args = fc.args as any;
              let title = String(args.title || 'Documento').trim();
              let content = String(args.content || '');
              let format = inferFormat(title, args.format, content);
              
              // Prevent JSON wrapper bug if model passed the JSON wrapper into the 'content' argument
              if (content.trim().startsWith('{') && content.trim().endsWith('}') && content.includes('"content"')) {
                 try {
                    const parsed = JSON.parse(content);
                    if (parsed && typeof parsed === 'object' && parsed.content) {
                       content = String(parsed.content);
                       if (parsed.title) title = String(parsed.title);
                       if (parsed.format) format = String(parsed.format).toLowerCase();
                    }
                 } catch(e) {}
              }
              
              workspaceDocuments.set(title, { title, content, format });`;

code = code.replace(oldCode, newCode).replace(oldCode, newCode); // replace both occurrences (if any)
fs.writeFileSync('api/index.ts', code);
