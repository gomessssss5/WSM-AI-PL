const fs = require('fs');
let file = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

const target = `          <RightRunSidebar
            run={currentRun}
            isOpen={isRunSidebarOpen}
            isStreaming={isThinking}
          />`;

const replacement = `          <RightRunSidebar
            run={currentRun}
            isOpen={isRunSidebarOpen}
            onClose={() => setIsRunSidebarOpen(false)}
            isStreaming={isThinking}
          />`;

if (file.includes(target)) {
    file = file.replace(target, replacement);
    fs.writeFileSync('src/components/ChatWindow.tsx', file);
    console.log("Patched RightRunSidebar onClose correctly");
} else {
    console.log("Target not found");
}
