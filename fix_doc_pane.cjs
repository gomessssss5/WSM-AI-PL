const fs = require('fs');
let content = fs.readFileSync('src/components/DocumentViewerPane.tsx', 'utf-8');

// 1. Import syntax highlighter
if (!content.includes('react-syntax-highlighter')) {
  content = content.replace(
    "import { motion } from 'motion/react';",
    "import { motion } from 'motion/react';\nimport { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';\nimport { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';"
  );
}

// 2. Add header toggles
const headerInfoRegex = /(<div className="flex items-center gap-2\.5 min-w-0 flex-1">)[\s\S]*?(<div className="min-w-0 flex flex-col">)/;
content = content.replace(headerInfoRegex, (match, p1, p2) => {
  return `        {/* Eye/Code toggle for HTML */}
        {format === 'html' && (
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 mr-2 shrink-0">
            <button
              onClick={() => setHtmlPreviewMode(true)}
              className={\`p-1.5 rounded-md flex items-center justify-center transition-colors \${htmlPreviewMode ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}\`}
              title="Visualizar HTML"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHtmlPreviewMode(false)}
              className={\`p-1.5 rounded-md flex items-center justify-center transition-colors \${!htmlPreviewMode ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}\`}
              title="Código HTML"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>
        )}
` + match;
});

// 3. Remove the old toggle bar in the code section and update the code renderer
const oldToggleRegex = /<div className="flex-1 flex flex-col w-full h-full bg-\[#1e1e1e\]">[\s\S]*?\{format === 'html' && \([\s\S]*?<\/div>\s*\)\}\s*<div className="flex-1 overflow-auto relative">/;

const newCodeContainer = `<div className="flex-1 flex flex-col w-full h-full bg-white dark:bg-[#1e1e1e]">
            <div className="flex-1 overflow-auto relative">`;

content = content.replace(oldToggleRegex, newCodeContainer);

// 4. Update the pre block to SyntaxHighlighter
const oldPreRegex = /<pre className="p-4 text-\[#d4d4d4\] font-mono text-\[13px\] leading-relaxed whitespace-pre-wrap break-all h-full w-full">\s*<code>\{docContent\}<\/code>\s*<\/pre>/;

const newSyntax = `<SyntaxHighlighter 
                  language={format === 'html' ? 'markup' : format === 'js' ? 'javascript' : format === 'ts' ? 'typescript' : format === 'py' ? 'python' : format} 
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1rem', minHeight: '100%', fontSize: '13.5px', background: 'transparent' }}
                  showLineNumbers={true}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {docContent}
                </SyntaxHighlighter>`;

content = content.replace(oldPreRegex, newSyntax);

// Set default preview to false
content = content.replace('const [htmlPreviewMode, setHtmlPreviewMode] = useState<boolean>(true);', 'const [htmlPreviewMode, setHtmlPreviewMode] = useState<boolean>(false);');

fs.writeFileSync('src/components/DocumentViewerPane.tsx', content, 'utf-8');
