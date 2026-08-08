const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldCode1 = `            } else if (fc.name === "edit_document") {
              const args = fc.args as any;
              const title = String(args.title || 'Documento').trim();
              const content = String(args.content || '');
              const existingDoc = workspaceDocuments.get(title);
              const format = inferFormat(title, args.format || existingDoc?.format, content);
              workspaceDocuments.set(title, { title, content, format });`;

const newCode1 = `            } else if (fc.name === "edit_document") {
              const args = fc.args as any;
              let title = String(args.title || 'Documento').trim();
              let content = String(args.content || '');
              
              if (content.trim().startsWith('{') && content.trim().endsWith('}') && content.includes('"content"')) {
                 try {
                    const parsed = JSON.parse(content);
                    if (parsed && typeof parsed === 'object' && parsed.content) {
                       content = String(parsed.content);
                       if (parsed.title) title = String(parsed.title);
                    }
                 } catch(e) {}
              }
              
              const existingDoc = workspaceDocuments.get(title);
              const format = inferFormat(title, args.format || existingDoc?.format, content);
              workspaceDocuments.set(title, { title, content, format });`;

const oldCode2 = `            } else if (fc.name === "append_document") {
              const args = fc.args as any;
              const title = String(args.title || '').trim();
              const textToAppend = String(args.text || '');
              const existingDoc = workspaceDocuments.get(title);
              const newContent = existingDoc ? existingDoc.content + "\\n\\n" + textToAppend : textToAppend;
              const format = inferFormat(title, existingDoc?.format, newContent);
              workspaceDocuments.set(title, { title, content: newContent, format });`;

const newCode2 = `            } else if (fc.name === "append_document") {
              const args = fc.args as any;
              const title = String(args.title || '').trim();
              let textToAppend = String(args.text || '');
              
              if (textToAppend.trim().startsWith('{') && textToAppend.trim().endsWith('}') && textToAppend.includes('"content"')) {
                 try {
                    const parsed = JSON.parse(textToAppend);
                    if (parsed && typeof parsed === 'object' && parsed.content) {
                       textToAppend = String(parsed.content);
                    }
                 } catch(e) {}
              }
              
              const existingDoc = workspaceDocuments.get(title);
              const newContent = existingDoc ? existingDoc.content + "\\n\\n" + textToAppend : textToAppend;
              const format = inferFormat(title, existingDoc?.format, newContent);
              workspaceDocuments.set(title, { title, content: newContent, format });`;

code = code.replace(oldCode1, newCode1).replace(oldCode2, newCode2);
fs.writeFileSync('api/index.ts', code);
