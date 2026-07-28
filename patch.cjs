const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');
code = code.replace(
  'const hasNativeCalls = modelContent && modelContent.parts && modelContent.parts.some((p: any) => p.functionCall);',
  'console.log("[DEBUG] modelContent.parts:", JSON.stringify(modelContent?.parts));\n          const hasNativeCalls = modelContent && modelContent.parts && modelContent.parts.some((p: any) => p.functionCall);'
);
fs.writeFileSync('api/index.ts', code);
