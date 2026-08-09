import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  ExternalLink, 
  FilePlus, 
  FileText, 
  FileCode2, 
  Braces, 
  Trash2, 
  Folder, 
  Eye, 
  Edit3,
  Loader2,
  FileImage
} from 'lucide-react';

export interface WorkspaceTasksBlockProps {
  text?: string;
  onOpenWorkspace?: () => void;
}

const getItemIcon = (type: string, file: string) => {
  if (type === 'list') {
    return <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
  }
  if (type === 'delete') {
    return <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
  }
  if (type === 'read') {
    return <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
  }
  if (type === 'edit') {
    return <Edit3 className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
  }

  // Create or general file
  const ext = file.split('.').pop()?.toLowerCase();
  if (ext === 'json') {
    return <Braces className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) {
    return <FileImage className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
  }
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css'].includes(ext || '')) {
    return <FileCode2 className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
  }
  return <FilePlus className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />;
};

const getActionLabel = (type: string, file: string) => {
  switch (type) {
    case 'create': return `Criou ${file}`;
    case 'read': return `Leu ${file}`;
    case 'edit': return `Editou ${file}`;
    case 'delete': return `Excluiu ${file}`;
    case 'list': return `Listou Workspace`;
    default: return `Trabalhou em ${file}`;
  }
};

export const WorkspaceTasksBlock: React.FC<WorkspaceTasksBlockProps> = ({ text, onOpenWorkspace }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const actions = useMemo(() => {
    if (!text) return [];
    const regex = /<wsm_workspace_action\s+status="([^"]+)"\s+type="([^"]+)"\s+file="([^"]+)"\s*\/>/g;
    const matches = [...text.matchAll(regex)];
    return matches.map(m => ({
      status: m[1],
      type: m[2],
      file: m[3],
    }));
  }, [text]);

  if (actions.length === 0) return null;

  const isWorking = actions.some(a => a.status === 'working');

  return (
    <div className="w-full my-3 border border-gray-200/90 dark:border-gray-800/80 rounded-2xl p-3.5 sm:p-4 bg-transparent shadow-2xs transition-all">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none py-0.5 group"
      >
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-gray-700 dark:text-gray-300 fill-gray-700/10 dark:fill-gray-300/10" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {isWorking ? 'Trabalhando no Workspace' : 'Trabalhou no Workspace'}
          </span>
        </div>
        <button 
          type="button" 
          className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 p-1 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded List Items */}
      {isExpanded && (
        <div className="mt-3 ml-2.5 pl-3.5 border-l border-gray-200 dark:border-gray-700 space-y-2 py-0.5">
          {actions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-medium">
              {getItemIcon(action.type, action.file)}
              <span>{getActionLabel(action.type, action.file)}</span>
              {action.status === 'working' && (
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer Row */}
      <div className="mt-4 pt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
          {isWorking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Em andamento</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-[#10b981]" />
              <span>Done</span>
            </>
          )}
        </div>

        {onOpenWorkspace && (
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            <span>Abrir Workspace da IA</span>
          </button>
        )}
      </div>
    </div>
  );
};
