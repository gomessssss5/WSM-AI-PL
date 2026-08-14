const fs = require('fs');
let file = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

const target = `                        {(() => {
                          const { docObjs } = extractWsmDoc(message.text);
                          if (!docObjs || docObjs.length === 0) return null;
                          return (
                            <div className="space-y-2 my-2">
                              {docObjs.map((doc, docIdx) => (
                                <ArtifactPersistenceCard
                                  key={\`art_card_\${message.id}_\${docIdx}\`}
                                  filename={doc.title || \`documento_\${docIdx + 1}.md\`}
                                  title={doc.title}
                                  content={doc.content || ''}
                                  format={doc.format}
                                  conversationId={sessionId || 'session_general'}
                                />
                              ))}
                            </div>
                          );
                        })()}`;

const replacement = `                        {/* ArtifactPersistenceCard removido a pedido do usuário */}`;

if (file.includes(target)) {
    file = file.replace(target, replacement);
    fs.writeFileSync('src/components/ChatWindow.tsx', file);
    console.log("Patched correctly");
} else {
    console.log("Target not found");
}
