const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

code = code.replace(
  /const isInternalBypass = authHeader === 'Bearer OmnixInternalSchedulerBypassToken_2026' \|\|\s*internalSecret === 'OmnixInternalSchedulerBypassToken_2026';/,
  "const isInternalBypass = authHeader === 'Bearer OmnixInternalSchedulerBypassToken_2026' || internalSecret === 'OmnixInternalSchedulerBypassToken_2026';\n  console.log('[AuthMiddleware] authHeader:', authHeader, 'internalSecret:', internalSecret, 'isInternalBypass:', isInternalBypass, 'req.path:', req.path);"
);

fs.writeFileSync('api/index.ts', code);
console.log("Patched auth middleware with logging");
