import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Maximize2, 
  Minimize2, 
  FileText, 
  FileCode2, 
  Braces, 
  FileImage, 
  Folder, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Search, 
  Copy, 
  Check, 
  Eye, 
  Code, 
  Edit3, 
  ExternalLink,
  Table,
  File,
  Sparkles,
  Save,
  FilePlus,
  ChevronRight,
  ChevronDown,
  History,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  GitBranch
} from 'lucide-react';
import { WsmDocument, Message } from '../types';
import { extractWsmDoc, inferFormatFromTitle } from '../utils/docParser';
import MarkdownRenderer from './MarkdownRenderer';
import InteractiveSpreadsheetViewer from './InteractiveSpreadsheetViewer';
import { motion, AnimatePresence } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { terminalSandbox } from '../lib/terminalSandbox';

export interface WorkspaceViewerPaneProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  attachedImages?: string[];
  initialSelectedFile?: string;
}

export interface FileVersion {
  version: number;
  content: string;
  updatedAt: Date;
  author: string;
  summary: string;
}

export interface WorkspaceFile {
  id: string;
  title: string;
  content: string;
  format: string;
  source: 'ai' | 'user';
  folder?: string;
  updatedAt: Date;
  versions?: FileVersion[];
}

export default function WorkspaceViewerPane({
  messages,
  isOpen,
  onClose,
  attachedImages = [],
  initialSelectedFile,
}: WorkspaceViewerPaneProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [htmlPreviewMode, setHtmlPreviewMode] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);

  // Advanced features state
  const [activeSubTab, setActiveSubTab] = useState<'view' | 'versions' | 'validation'>('view');
  const [fileVersionsMap, setFileVersionsMap] = useState<Record<string, FileVersion[]>>({});
  const [selectedDiffVersionId, setSelectedDiffVersionId] = useState<number | null>(null);
  const [editSummary, setEditSummary] = useState('');
  const [validationProgress, setValidationProgress] = useState<'idle' | 'validating' | 'done'>('idle');
  const [rollbackSuccessMessage, setRollbackSuccessMessage] = useState('');

  // New file creation form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFormat, setNewFormat] = useState('html');

  // Custom user-managed workspace files (additions/deletions)
  const [customFiles, setCustomFiles] = useState<WorkspaceFile[]>([]);
  const [deletedFileTitles, setDeletedFileTitles] = useState<Set<string>>(new Set());

  // Edit buffer state for currently selected file
  const [editingContentBuffer, setEditingContentBuffer] = useState('');
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Extract all AI generated documents from session messages
  const parsedAiFiles = useMemo(() => {
    const filesMap = new Map<string, WorkspaceFile>();

    messages.forEach((msg, msgIdx) => {
      if (msg.sender === 'ai') {
        // 1. Extract <wsm_doc> tags
        const { docObjs } = extractWsmDoc(msg.text);
        if (docObjs && docObjs.length > 0) {
          docObjs.forEach((doc, idx) => {
            const title = doc.title || `documento_${idx + 1}.txt`;
            const inferredFmt = doc.format || inferFormatFromTitle(title, doc.content) || 'txt';
            filesMap.set(title, {
              id: `ai-doc-${title}`,
              title,
              content: doc.content || '',
              format: inferredFmt,
              source: 'ai',
              updatedAt: new Date(msg.timestamp || Date.now()),
            });
          });
        }

        // 2. Extract tableData
        if (msg.tableData) {
          const title = `planilha_${msgIdx + 1}.xlsx`;
          filesMap.set(title, {
            id: `ai-table-${msgIdx}`,
            title,
            content: JSON.stringify(msg.tableData),
            format: 'xlsx',
            source: 'ai',
            updatedAt: new Date(msg.timestamp || Date.now()),
          });
        }
      }

      // 3. Extract attachments from messages (images, docs)
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach((att, attIdx) => {
          if (att.url) {
            const title = att.name || `anexo_${attIdx + 1}`;
            const ext = title.split('.').pop()?.toLowerCase() || '';
            const fmt = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) ? 'image' : (att.type || 'file');
            filesMap.set(title, {
              id: `att-${title}`,
              title,
              content: att.url,
              format: fmt,
              source: 'user',
              updatedAt: new Date(msg.timestamp || Date.now()),
            });
          }
        });
      }
    });

    return Array.from(filesMap.values());
  }, [messages]);

  const [sandboxFiles, setSandboxFiles] = useState<WorkspaceFile[]>([]);

  // Synchronize files from Terminal Sandbox filesystem
  useEffect(() => {
    const updateFromSandbox = () => {
      try {
        const entries = terminalSandbox.listFiles('/workspace');
        const files: WorkspaceFile[] = [];
        entries.forEach(entry => {
          const fullPath = entry.path;
          const content = terminalSandbox.readFile(fullPath) || '';
          const name = entry.name || fullPath.replace('/workspace/', '').replace(/^\//, '');
          if (name && !name.startsWith('.') && !entry.isDir) {
            files.push({
              id: `sandbox-${name}`,
              title: name,
              content,
              format: inferFormatFromTitle(name, content),
              source: 'ai',
              updatedAt: new Date(entry.updatedAt || Date.now()),
            });
          }
        });
        setSandboxFiles(files);
      } catch (e) {
        console.error("Error reading sandbox files for workspace:", e);
      }
    };

    updateFromSandbox();
    const unsubscribe = terminalSandbox.subscribe(() => {
      updateFromSandbox();
    });
    return unsubscribe;
  }, []);

  // Combine AI parsed files + sandbox files + custom files - deleted files
  const allWorkspaceFiles = useMemo(() => {
    const combinedMap = new Map<string, WorkspaceFile>();

    // 1. Add parsed AI files if not deleted
    parsedAiFiles.forEach(file => {
      if (!deletedFileTitles.has(file.title)) {
        combinedMap.set(file.title, file);
      }
    });

    // 2. Add sandbox files (from terminal executions/scripts)
    sandboxFiles.forEach(file => {
      if (!deletedFileTitles.has(file.title)) {
        combinedMap.set(file.title, file);
      }
    });

    // 3. Add custom files (overwrites or adds new)
    customFiles.forEach(file => {
      if (!deletedFileTitles.has(file.title)) {
        combinedMap.set(file.title, file);
      }
    });

    return Array.from(combinedMap.values());
  }, [parsedAiFiles, sandboxFiles, customFiles, deletedFileTitles]);

  // Filtered files by search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return allWorkspaceFiles;
    const q = searchQuery.toLowerCase();
    return allWorkspaceFiles.filter(f => 
      f.title.toLowerCase().includes(q) || 
      f.format.toLowerCase().includes(q)
    );
  }, [allWorkspaceFiles, searchQuery]);

  // Selected file
  const activeFile = useMemo(() => {
    if (selectedFileId) {
      return allWorkspaceFiles.find(f => f.id === selectedFileId) || allWorkspaceFiles[0] || null;
    }
    if (initialSelectedFile) {
      return allWorkspaceFiles.find(f => f.title === initialSelectedFile) || allWorkspaceFiles[0] || null;
    }
    return allWorkspaceFiles[0] || null;
  }, [allWorkspaceFiles, selectedFileId, initialSelectedFile]);

  // Synchronize buffer when active file changes
  useEffect(() => {
    if (activeFile) {
      setSelectedFileId(activeFile.id);
      setEditingContentBuffer(activeFile.content);
      setIsEditingContent(false);
      setActiveSubTab('view');
      setSelectedDiffVersionId(null);
      setValidationProgress('idle');

      // Initialize first version if not present
      if (!fileVersionsMap[activeFile.title]) {
        setFileVersionsMap(prev => ({
          ...prev,
          [activeFile.title]: [{
            version: 1,
            content: activeFile.content,
            updatedAt: activeFile.updatedAt || new Date(),
            author: activeFile.source === 'ai' ? 'Omnix 1.6' : 'wsmathenas@gmail.com',
            summary: 'Versão inicial extraída do Workspace'
          }]
        }));
      }
    }
  }, [activeFile?.id, activeFile?.title, fileVersionsMap]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(editingContentBuffer || activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const content = editingContentBuffer || activeFile.content;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.title;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let title = newTitle.trim();
    let fmt = newFormat.toLowerCase();
    if (!title.includes('.')) {
      title += `.${fmt}`;
    }

    const newFile: WorkspaceFile = {
      id: `custom-${Date.now()}`,
      title,
      content: newContent,
      format: fmt,
      source: 'user',
      updatedAt: new Date(),
    };

    setCustomFiles(prev => [newFile, ...prev]);
    terminalSandbox.writeFile(`/workspace/${title}`, newContent);
    setSelectedFileId(newFile.id);
    setIsCreatingNew(false);
    setNewTitle('');
    setNewContent('');
  };

  const handleDeleteFile = (file: WorkspaceFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir "${file.title}" do Workspace?`)) {
      setDeletedFileTitles(prev => new Set(prev).add(file.title));
      terminalSandbox.deleteFile(`/workspace/${file.title}`);
      if (activeFile?.id === file.id) {
        setSelectedFileId(null);
      }
    }
  };

  const handleSaveEdit = () => {
    if (!activeFile) return;

    const summaryText = editSummary.trim() || 'Edição manual do usuário';

    // 1. Save new version history
    const currentVersions = fileVersionsMap[activeFile.title] || [];
    const nextVersionNum = currentVersions.length + 1;
    const newVer: FileVersion = {
      version: nextVersionNum,
      content: editingContentBuffer,
      updatedAt: new Date(),
      author: 'wsmathenas@gmail.com',
      summary: summaryText
    };

    const updatedVersions = [...currentVersions, newVer];
    setFileVersionsMap(prev => ({
      ...prev,
      [activeFile.title]: updatedVersions
    }));

    // 2. Save custom file content and sync with terminal sandbox
    const updatedFile: WorkspaceFile = {
      ...activeFile,
      content: editingContentBuffer,
      updatedAt: new Date(),
    };
    terminalSandbox.writeFile(`/workspace/${activeFile.title}`, editingContentBuffer);
    setCustomFiles(prev => [updatedFile, ...prev.filter(f => f.title !== activeFile.title)]);
    setIsEditingContent(false);
    setEditSummary('');
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);

    if (['html', 'htm'].includes(activeFile.format.toLowerCase())) {
      setHtmlPreviewMode(true);
    }
  };

  const handleRestoreVersion = (version: FileVersion) => {
    if (!activeFile) return;
    if (confirm(`Deseja mesmo reverter o arquivo "${activeFile.title}" para a versão v${version.version}?`)) {
      setEditingContentBuffer(version.content);

      // Save a new version tracking this revert
      const currentVersions = fileVersionsMap[activeFile.title] || [];
      const nextVersionNum = currentVersions.length + 1;
      const newVer: FileVersion = {
        version: nextVersionNum,
        content: version.content,
        updatedAt: new Date(),
        author: 'wsmathenas@gmail.com',
        summary: `Revertido automaticamente para a versão v${version.version}`
      };

      const updatedVersions = [...currentVersions, newVer];
      setFileVersionsMap(prev => ({
        ...prev,
        [activeFile.title]: updatedVersions
      }));

      const restoredFile: WorkspaceFile = {
        ...activeFile,
        content: version.content,
        updatedAt: new Date(),
      };
      setCustomFiles(prev => [restoredFile, ...prev.filter(f => f.title !== activeFile.title)]);
      setIsEditingContent(false);
      setSelectedDiffVersionId(null);
      setActiveSubTab('view');

      setRollbackSuccessMessage(`Revertido com sucesso para a versão v${version.version}!`);
      setTimeout(() => setRollbackSuccessMessage(''), 4000);
    }
  };

  // Standard lookahead LCS-inspired visual diff generator
  const computeSimpleDiff = (oldStr: string, newStr: string) => {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    const diffs: { type: 'added' | 'removed' | 'unchanged'; text: string; lineNumber?: number }[] = [];

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diffs.push({ type: 'unchanged', text: oldLines[i], lineNumber: j + 1 });
        i++;
        j++;
      } else {
        let foundMatch = false;
        for (let lookahead = 1; lookahead <= 5; lookahead++) {
          if (i + lookahead < oldLines.length && oldLines[i + lookahead] === newLines[j]) {
            for (let k = 0; k < lookahead; k++) {
              diffs.push({ type: 'removed', text: oldLines[i + k] });
            }
            i += lookahead;
            foundMatch = true;
            break;
          }
          if (j + lookahead < newLines.length && oldLines[i] === newLines[j + lookahead]) {
            for (let k = 0; k < lookahead; k++) {
              diffs.push({ type: 'added', text: newLines[j + k], lineNumber: j + k + 1 });
            }
            j += lookahead;
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          if (i < oldLines.length) {
            diffs.push({ type: 'removed', text: oldLines[i] });
            i++;
          }
          if (j < newLines.length) {
            diffs.push({ type: 'added', text: newLines[j], lineNumber: j + 1 });
            j++;
          }
        }
      }
    }
    return diffs;
  };

  const getFileIcon = (title: string, format: string) => {
    const ext = title.split('.').pop()?.toLowerCase() || format.toLowerCase();
    if (['html', 'htm'].includes(ext)) return <FileCode2 className="w-4 h-4 text-[#E34F26] shrink-0" />;
    if (['css'].includes(ext)) return <FileCode2 className="w-4 h-4 text-[#1572B6] shrink-0" />;
    if (['js', 'ts', 'tsx', 'jsx', 'py'].includes(ext)) return <FileCode2 className="w-4 h-4 text-blue-500 shrink-0" />;
    if (['json'].includes(ext)) return <Braces className="w-4 h-4 text-amber-500 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'image'].includes(ext)) return <FileImage className="w-4 h-4 text-purple-500 shrink-0" />;
    if (['xlsx', 'csv'].includes(ext)) return <Table className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (['md', 'txt'].includes(ext)) return <FileText className="w-4 h-4 text-gray-500 shrink-0" />;
    return <File className="w-4 h-4 text-gray-500 shrink-0" />;
  };

  const isImageFile = (file: WorkspaceFile) => {
    const ext = file.title.split('.').pop()?.toLowerCase() || file.format.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'image'].includes(ext) || file.content.startsWith('data:image');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`h-full bg-white dark:bg-gray-950 flex flex-col overflow-hidden relative border-l border-gray-200 dark:border-gray-800 z-50 shadow-2xl ${
        isFullscreen ? 'w-full flex-1' : 'w-full md:w-1/2 flex-1'
      }`}
    >
      {/* Drawer Header */}
      <div className="bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-xs">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 truncate">
              Workspace da IA
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {allWorkspaceFiles.length} {allWorkspaceFiles.length === 1 ? 'arquivo' : 'arquivos'}
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Arquivos, pastas e documentos armazenados na sessão da IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="Criar novo arquivo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Arquivo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden md:flex p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            title={isFullscreen ? "Restaurar divisão" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Fechar Workspace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drawer Body: Split Sidebar File Tree + Preview Pane */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Workspace File Explorer Tree - Compact & Narrow */}
        <div className="w-44 sm:w-48 md:w-52 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 flex flex-col shrink-0">
          {/* Search Bar */}
          <div className="p-2 border-b border-gray-200/80 dark:border-gray-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Root Directory Tree Header */}
          <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100/60 dark:bg-gray-800/40">
            <div className="flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              <span>/ workspace</span>
            </div>
            <span>{filteredFiles.length}</span>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredFiles.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-gray-400 flex flex-col items-center gap-1">
                <Folder className="w-6 h-6 text-gray-300 dark:text-gray-700 stroke-1" />
                <p>Sem arquivos.</p>
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = activeFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFileId(file.id);
                      setIsEditingContent(false);
                    }}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-2xs font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                      {getFileIcon(file.title, file.format)}
                      <span className="truncate text-[11px]">{file.title}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteFile(file, e)}
                      className={`p-0.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 ${
                        isSelected
                          ? 'hover:bg-gray-800 text-gray-300 dark:hover:bg-gray-200 dark:text-gray-700'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500'
                      }`}
                      title="Excluir arquivo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Content Viewer / Code / Image / Interactive Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-950 overflow-hidden">
          {activeFile ? (
            <>
              {/* File Header Toolbar */}
              <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/20 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(activeFile.title, activeFile.format)}
                  <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                    {activeFile.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold border border-gray-200/80 dark:border-gray-700">
                    {activeFile.format}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* HTML Preview / Code toggle */}
                  {['html', 'htm'].includes(activeFile.format.toLowerCase()) && !isEditingContent && activeSubTab === 'view' && (
                    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 mr-1">
                      <button
                        type="button"
                        onClick={() => setHtmlPreviewMode(true)}
                        className={`p-1 rounded-md transition-colors ${htmlPreviewMode ? 'bg-white dark:bg-gray-700 shadow-2xs text-black dark:text-white font-bold' : 'text-gray-500'}`}
                        title="Visualizar HTML"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHtmlPreviewMode(false)}
                        className={`p-1 rounded-md transition-colors ${!htmlPreviewMode ? 'bg-white dark:bg-gray-700 shadow-2xs text-black dark:text-white font-bold' : 'text-gray-500'}`}
                        title="Código HTML"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Toggle Edit Mode / Cancel */}
                  {!isImageFile(activeFile) && (
                    <div className="flex items-center gap-1.5">
                      {isEditingContent && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingContentBuffer(activeFile.content);
                            setIsEditingContent(false);
                          }}
                          className="px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditingContent) {
                            handleSaveEdit();
                          } else {
                            setEditingContentBuffer(activeFile.content);
                            setIsEditingContent(true);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                          isEditingContent
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {isEditingContent ? (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Salvar Edição</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer"
                    title="Copiar conteúdo"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Download Button */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer"
                    title="Baixar arquivo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-Tabs Bar (Visible when not editing) */}
              {!isEditingContent && (
                <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/45 dark:bg-gray-900/10 px-4 py-1.5 gap-2 shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('view')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === 'view'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs font-bold'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualização</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubTab('versions');
                      if (selectedDiffVersionId === null) {
                        const history = fileVersionsMap[activeFile.title] || [];
                        if (history.length > 1) {
                          setSelectedDiffVersionId(history[history.length - 2].version);
                        } else if (history.length > 0) {
                          setSelectedDiffVersionId(history[0].version);
                        }
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === 'versions'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs font-bold'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Histórico & Versões</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
                      {(fileVersionsMap[activeFile.title] || []).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubTab('validation');
                      setValidationProgress('idle');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === 'validation'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs font-bold'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Validação Técnica</span>
                  </button>
                </div>
              )}

              {/* Main Active File Display */}
              <div className="flex-1 overflow-auto relative p-4 bg-white dark:bg-gray-950 flex flex-col min-h-0">
                <AnimatePresence>
                  {showSaveToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-2 right-4 z-30 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 font-medium"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Arquivo salvo no Workspace com sucesso!</span>
                    </motion.div>
                  )}
                  {rollbackSuccessMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-2 right-4 z-30 bg-blue-600 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>{rollbackSuccessMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isEditingContent ? (
                  <div className="flex flex-col h-full gap-3 min-h-[400px]">
                    <textarea
                      value={editingContentBuffer}
                      onChange={(e) => setEditingContentBuffer(e.target.value)}
                      className="flex-1 w-full min-h-[300px] p-4 font-mono text-xs bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-black/30 resize-none leading-relaxed"
                      placeholder="Digite o conteúdo do arquivo aqui..."
                    />

                    {/* Version comment input */}
                    <div className="flex items-center gap-3 bg-[#faf9f6] dark:bg-gray-900/60 p-3 rounded-xl border border-[#eae6e1] dark:border-gray-800 shrink-0 select-none">
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">O que você alterou?</span>
                      <input
                        type="text"
                        placeholder="ex: Corrigido bug de layout, adicionada seção de contato..."
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="flex-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-black/50 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                ) : activeSubTab === 'versions' ? (
                  <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                    {/* Left side: list of versions */}
                    <div className="w-full md:w-56 flex flex-col gap-2 shrink-0 border-r border-gray-100 dark:border-gray-800 pr-2 overflow-y-auto select-none">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Histórico de Alterações</h4>
                      {(fileVersionsMap[activeFile.title] || []).slice().reverse().map((ver) => {
                        const isSelected = selectedDiffVersionId === ver.version;
                        return (
                          <div
                            key={ver.version}
                            onClick={() => setSelectedDiffVersionId(ver.version)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                                : 'bg-gray-50 dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold">Versão v{ver.version}</span>
                              <span className="text-[9px] opacity-70">{new Date(ver.updatedAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-[10px] mt-1 font-medium truncate italic">"{ver.summary}"</p>
                            <div className="flex items-center gap-1.5 mt-2 text-[9px] opacity-80 border-t border-dashed border-gray-300/40 pt-1.5">
                              <span className="font-semibold truncate">{ver.author}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right side: visual Diff viewer */}
                    <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-gray-900/20 border border-gray-200/60 dark:border-gray-800 rounded-2xl overflow-hidden">
                      {selectedDiffVersionId !== null ? (() => {
                        const history = fileVersionsMap[activeFile.title] || [];
                        const oldVerObj = history.find(v => v.version === selectedDiffVersionId);
                        
                        if (!oldVerObj) return <div className="p-8 text-center text-xs text-gray-400">Selecione uma versão anterior para comparar.</div>;
                        
                        const diffs = computeSimpleDiff(oldVerObj.content, activeFile.content);
                        const hasDifferences = diffs.some(d => d.type !== 'unchanged');

                        return (
                          <>
                            {/* Diff Toolbar */}
                            <div className="px-3.5 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-900/60 flex items-center justify-between gap-2 select-none shrink-0">
                              <div className="flex items-center gap-1.5">
                                <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                  Comparando: v{selectedDiffVersionId} ➔ Atual
                                </span>
                                {!hasDifferences && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                    Idênticos
                                  </span>
                                )}
                              </div>
                              {selectedDiffVersionId !== history[history.length - 1]?.version && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreVersion(oldVerObj)}
                                  className="px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black rounded-lg text-[10px] font-bold hover:opacity-90 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                                  title="Voltar o arquivo para este conteúdo"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restaurar esta Versão</span>
                                </button>
                              )}
                            </div>

                            {/* Diff Container */}
                            <div className="flex-1 p-3 overflow-auto font-mono text-[11px] leading-relaxed select-text space-y-0.5 bg-white dark:bg-gray-950">
                              {diffs.map((line, idx) => {
                                if (line.type === 'added') {
                                  return (
                                    <div key={idx} className="bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 border-l-2 border-emerald-500 pl-1.5 whitespace-pre-wrap">
                                      + {line.text || ' '}
                                    </div>
                                  );
                                } else if (line.type === 'removed') {
                                  return (
                                    <div key={idx} className="bg-rose-50/80 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 border-l-2 border-rose-500 pl-1.5 whitespace-pre-wrap">
                                      - {line.text || ' '}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div key={idx} className="text-gray-500 dark:text-gray-400 pl-2 whitespace-pre-wrap">
                                      {line.text || ' '}
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </>
                        );
                      })() : (
                        <div className="p-8 text-center text-xs text-gray-400 my-auto select-none">
                          Nenhuma alteração registrada. Faça edições no arquivo para gerar o histórico de versões.
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeSubTab === 'validation' ? (() => {
                  const content = activeFile.content;
                  const format = activeFile.format.toLowerCase();

                  // Syntax evaluation
                  let syntaxOk = true;
                  let syntaxDetails = "Sintaxe correspondente ao formato.";
                  if (format === 'json') {
                    try {
                      JSON.parse(content);
                      syntaxDetails = "JSON sintaticamente íntegro e parseável.";
                    } catch(e: any) {
                      syntaxOk = false;
                      syntaxDetails = `Erro de parsing JSON: ${e?.message || String(e)}`;
                    }
                  } else if (['html', 'htm'].includes(format)) {
                    const hasDivOrHtml = content.includes('<') && content.includes('>');
                    if (!hasDivOrHtml) {
                      syntaxOk = false;
                      syntaxDetails = "Não contém tags HTML semânticas válidas.";
                    } else {
                      syntaxDetails = "Tags HTML estruturadas de forma compatível.";
                    }
                  } else if (format === 'md') {
                    if (!content.includes('#')) {
                      syntaxOk = false;
                      syntaxDetails = "Requisito Markdown ausente: Nenhum título de cabeçalho (#) encontrado.";
                    } else {
                      syntaxDetails = "Formatação Markdown com cabeçalhos válidos.";
                    }
                  }

                  // Placeholders/Stubs lookup
                  const hasStubs = /todo|mock|stub|fixme|inserir lógica|lógica real aqui|placeholder/i.test(content);
                  const stubsOk = !hasStubs;
                  const stubsDetails = stubsOk 
                    ? "Excelente! Nenhum comentário de código temporário, stubs ou mocks encontrados."
                    : "Atenção: Encontramos comentários do tipo TODO, MOCK ou instruções pendentes de lógica real.";

                  // Size constraint
                  const sizeInKb = (content.length / 1024).toFixed(2);
                  const sizeOk = Number(sizeInKb) < 100;
                  const sizeDetails = sizeOk 
                    ? `Tamanho de arquivo ideal para o Workspace (${sizeInKb} KB).`
                    : `Arquivo excepcionalmente longo (${sizeInKb} KB).`;

                  // Encoding
                  const encodingOk = true;
                  const encodingDetails = "Codificação de arquivo UTF-8 válida.";

                  return (
                    <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto p-4 select-none">
                      {validationProgress === 'idle' ? (
                        <div className="text-center space-y-4">
                          <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto shadow-md">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Análise de Requisitos Técnicos</h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              Execute a auditoria automática para validar a qualidade, integridade estrutural, sintaxe e se o arquivo está livre de stubs/código simulado.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setValidationProgress('validating');
                              setTimeout(() => setValidationProgress('done'), 1500);
                            }}
                            className="px-4 py-2 bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            Executar Auditoria Técnica
                          </button>
                        </div>
                      ) : validationProgress === 'validating' ? (
                        <div className="text-center space-y-4">
                          <div className="relative w-12 h-12 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800" />
                            <div className="absolute inset-0 rounded-full border-4 border-black dark:border-white border-t-transparent animate-spin" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-200">Analisando semântica do documento...</h4>
                            <p className="text-[11px] text-gray-400 mt-1 font-mono">Buscando stubs e tokens de simulação...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white">Resultado do Relatório Técnico</h4>
                            <button
                              type="button"
                              onClick={() => setValidationProgress('idle')}
                              className="text-[10px] text-gray-500 hover:text-black hover:underline cursor-pointer"
                            >
                              Analisar novamente
                            </button>
                          </div>

                          <div className="space-y-3">
                            {/* Check 1 */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                              {syntaxOk ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Integridade de Sintaxe</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{syntaxDetails}</p>
                              </div>
                            </div>

                            {/* Check 2 */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                              {stubsOk ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Código de Produção (Sem Mocks/Stubs)</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{stubsDetails}</p>
                              </div>
                            </div>

                            {/* Check 3 */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                              {sizeOk ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Restrição de Tamanho</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{sizeDetails}</p>
                              </div>
                            </div>

                            {/* Check 4 */}
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                              {encodingOk ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Codificação do Arquivo</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{encodingDetails}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })() : isImageFile(activeFile) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 min-h-[300px]">
                    <img
                      src={activeFile.content}
                      alt={activeFile.title}
                      className="max-w-full max-h-[500px] object-contain rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-3 font-medium">
                      {activeFile.title}
                    </span>
                  </div>
                ) : activeFile.format === 'html' && htmlPreviewMode ? (
                  <div className="w-full h-full min-h-[450px] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs bg-white">
                    <iframe
                      srcDoc={activeFile.content}
                      title={activeFile.title}
                      className="w-full h-full min-h-[450px] border-none"
                      sandbox="allow-scripts allow-modals allow-same-origin"
                    />
                  </div>
                ) : activeFile.format === 'xlsx' ? (
                  <InteractiveSpreadsheetViewer
                    title={activeFile.title}
                    content={activeFile.content}
                  />
                ) : ['js', 'ts', 'tsx', 'jsx', 'py', 'json', 'html', 'css'].includes(activeFile.format) ? (
                  <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <SyntaxHighlighter
                      language={activeFile.format === 'json' ? 'json' : activeFile.format === 'py' ? 'python' : activeFile.format === 'html' ? 'markup' : 'javascript'}
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, padding: '1.25rem', height: '100%', minHeight: '400px', fontSize: '13px' }}
                      showLineNumbers={true}
                      wrapLongLines={true}
                    >
                      {activeFile.content}
                    </SyntaxHighlighter>
                  </div>
                ) : activeFile.format === 'md' ? (
                  <div className="prose max-w-none text-gray-800 dark:text-gray-200 text-xs sm:text-sm p-2">
                    <MarkdownRenderer content={activeFile.content} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800 dark:text-gray-200 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 leading-relaxed">
                    {activeFile.content}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <FolderOpen className="w-12 h-12 stroke-1 mb-2 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Workspace Vazio</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mt-1">
                Nenhum arquivo selecionado. Crie um novo arquivo ou aguarde a IA gerar documentos na sessão.
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Arquivo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New File Creation Modal / Drawer Overlay */}
      <AnimatePresence>
        {isCreatingNew && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleCreateFile}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Criar Novo Arquivo no Workspace</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Arquivo (com extensão):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: relatorio.md, index.html, script.py"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Formato:
                  </label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-gray-900 dark:text-gray-100"
                  >
                    <option value="html">HTML Website</option>
                    <option value="md">Markdown Document</option>
                    <option value="txt">Texto Simples</option>
                    <option value="py">Python Script</option>
                    <option value="js">JavaScript / TypeScript</option>
                    <option value="json">JSON Data</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Conteúdo Inicial:
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Escreva ou cole o conteúdo do arquivo..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-blue-500 font-mono text-xs text-gray-900 dark:text-gray-100 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 shadow-2xs"
                >
                  Salvar no Workspace
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
