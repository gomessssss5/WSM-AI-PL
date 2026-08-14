const fs = require('fs');

const content = `import React, { useState, useMemo } from 'react';
import { 
  Activity,
  ChevronDown,
  ChevronRight,
  FilePlus,
  Trash2,
  Folder,
  Eye,
  Edit3,
  FileCode2,
  Braces,
  FileImage
} from 'lucide-react';
import { extractWsmDoc } from '../utils/docParser';

export interface WorkspaceTasksBlockProps {
  text?: string;
  onOpenWorkspace?: () => void;
}

const getItemIcon = (type: string, file: string) => {
  if (type === 'list') return <Folder className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
  if (type === 'delete') return <Trash2 className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
  if (type === 'read') return <Eye className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
  if (type === 'edit') return <Edit3 className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
  
  const ext = file.split('.').pop()?.toLowerCase();
  if (ext === 'json') return <Braces className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
  if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) return <FileImage className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css'].includes(ext || '')) return <FileCode2 className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
  
  return <FilePlus className="w-3.5 h-3.5 text-[#8e9099] dark:text-gray-400 shrink-0" />;
};

const getActionLabel = (type: string, file: string) => {
  switch (type) {
    case 'create': return \`Criou \${file}\`;
    case 'read': return \`Leu \${file}\`;
    case 'edit': return \`Editou \${file}\`;
    case 'delete': return \`Excluiu \${file}\`;
    case 'list': return \`Listou Workspace\`;
    default: return \`Trabalhou em \${file}\`;
  }
};

export const WorkspaceTasksBlock: React.FC<WorkspaceTasksBlockProps> = ({ text, onOpenWorkspace }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = useMemo(() => {
    if (!text) return [];
    
    // 1. Parse workspace tools actions
    const regex = /<wsm_workspace_action\\s+status="([^"]+)"\\s+type="([^"]+)"\\s+file="([^"]+)"\\s*\\/>/g;
    const matches = [...text.matchAll(regex)];
    const workspaceActions = matches.map(m => ({
      status: m[1],
      type: m[2],
      file: m[3],
    }));

    // 2. Parse inline docs
    const { docObjs } = extractWsmDoc(text);
    const docActions = (docObjs || []).map(doc => ({
      status: 'completed',
      type: 'create',
      file: doc.title || 'documento.md'
    }));

    // Merge and deduplicate by filename to avoid showing "Criou Redacao.pdf" twice if both tool and doc were used
    const allActions = [...workspaceActions, ...docActions];
    const uniqueActions = [];
    const seenFiles = new Set();

    for (const a of allActions) {
      const key = \`\${a.type}-\${a.file}\`;
      if (!seenFiles.has(key)) {
        seenFiles.add(key);
        uniqueActions.push(a);
      }
    }

    return uniqueActions;
  }, [text]);

  if (actions.length === 0) return null;

  const isWorking = actions.some(a => a.status === 'working');
  const cleanDisplay = isWorking ? 'Trabalhando no Workspace' : 'Trabalhou no Workspace';

  if (isWorking) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none my-1 searching">
        <Activity className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
        <span className="shimmer-text">{cleanDisplay}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 w-full my-1 animate-fade-in">
      <div className="flex items-center justify-start py-0.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6b7076] hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors select-none p-0 bg-transparent border-0 cursor-pointer"
        >
          <Activity className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
          <span>{cleanDisplay}</span>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-1.5 pl-6 py-1 animate-fade-in">
          {actions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[13.5px] font-medium text-gray-800 dark:text-gray-200">
              {getItemIcon(action.type, action.file)}
              <span className="truncate">{getActionLabel(action.type, action.file)}</span>
            </div>
          ))}
          {onOpenWorkspace && (
            <button
              onClick={onOpenWorkspace}
              className="mt-1 text-[12.5px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-left w-fit transition-colors"
            >
              Abrir arquivos no Workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync('src/components/WorkspaceTasksBlock.tsx', content);
console.log("WorkspaceTasksBlock rewritten.");
