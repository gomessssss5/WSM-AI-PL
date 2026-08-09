const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceTasksBlock.tsx', 'utf8');

code = code.replace(
  "import { SiReact, SiPython, SiHtml5, SiCss3, SiJavascript, SiTypescript } from '@icons-pack/react-simple-icons';",
  ""
);

code = code.replace("case 'html': return <SiHtml5 className=\"w-4 h-4 text-[#E34F26]\" />;", "case 'html': return <FileText className=\"w-4 h-4 text-[#E34F26]\" />;");
code = code.replace("case 'css': return <SiCss3 className=\"w-4 h-4 text-[#1572B6]\" />;", "case 'css': return <FileText className=\"w-4 h-4 text-[#1572B6]\" />;");
code = code.replace("case 'js': return <SiJavascript className=\"w-4 h-4 text-[#F7DF1E]\" />;", "case 'js': return <FileText className=\"w-4 h-4 text-[#F7DF1E]\" />;");
code = code.replace("case 'ts':\n    case 'tsx': return <SiTypescript className=\"w-4 h-4 text-[#3178C6]\" />;", "case 'ts':\n    case 'tsx': return <FileText className=\"w-4 h-4 text-[#3178C6]\" />;");
code = code.replace("case 'jsx': return <SiReact className=\"w-4 h-4 text-[#61DAFB]\" />;", "case 'jsx': return <FileText className=\"w-4 h-4 text-[#61DAFB]\" />;");
code = code.replace("case 'py': return <SiPython className=\"w-4 h-4 text-[#3776AB]\" />;", "case 'py': return <FileText className=\"w-4 h-4 text-[#3776AB]\" />;");

fs.writeFileSync('src/components/WorkspaceTasksBlock.tsx', code);
