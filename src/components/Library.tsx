import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  FileCode2, 
  Table, 
  FileCode, 
  Search, 
  Download, 
  Eye, 
  ChevronRight, 
  Grid, 
  List, 
  BookOpen, 
  Menu,
  X,
  Plus,
  ChevronDown,
  Trash2,
  Edit2,
  Link,
  MoreVertical,
  CheckSquare,
  Square,
  Upload,
  Paperclip,
  Share2,
  File,
  FolderOpen,
  Send
} from 'lucide-react';
import { ChatSession, Message } from '../types';
import { extractWsmDoc } from '../utils/docParser';
import { generatePdfBlob } from '../utils/pdfGenerator';
import { generateExcelBlob } from '../utils/excelGenerator';
import DocumentViewerPane from './DocumentViewerPane';

interface LibraryProps {
  sessions: ChatSession[];
  onOpenMobileHistory?: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export interface LibraryFile {
  id: string;
  title: string;
  format: 'pdf' | 'html' | 'xlsx' | 'md' | 'code' | 'txt' | string;
  content: string;
  timestamp: Date;
  sessionTitle: string;
  sessionId: string;
  origin?: 'ai_doc' | 'user_attachment' | 'workspace_upload';
  fileSize?: string;
}

export default function Library({ sessions, onOpenMobileHistory, onSelectSession, onNewChat }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tudo' | 'fontes' | 'documentos' | 'planilhas' | 'codigo'>('tudo');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<LibraryFile | null>(null);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [deletedFileIds, setDeletedFileIds] = useState<Set<string>>(new Set());
  const [renamedFiles, setRenamedFiles] = useState<Record<string, string>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [hideIntermediate, setHideIntermediate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom uploaded workspace files stored locally
  const [workspaceUploads, setWorkspaceUploads] = useState<LibraryFile[]>(() => {
    try {
      const saved = localStorage.getItem('wsm_workspace_library_uploads');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {}
    return [];
  });

  const saveWorkspaceUploads = (newUploads: LibraryFile[]) => {
    setWorkspaceUploads(newUploads);
    try {
      localStorage.setItem('wsm_workspace_library_uploads', JSON.stringify(newUploads));
    } catch (e) {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = (event.target?.result as string) || '';
        const ext = file.name.split('.').pop() || 'txt';
        const newFile: LibraryFile = {
          id: `workspace-upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: file.name,
          format: ext.toLowerCase(),
          content: textContent,
          timestamp: new Date(),
          sessionTitle: 'Workspace do Agente',
          sessionId: 'workspace-root',
          origin: 'workspace_upload',
          fileSize: `${(file.size / 1024).toFixed(1)} KB`
        };
        saveWorkspaceUploads([newFile, ...workspaceUploads]);
      };
      reader.readAsText(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowCreateDropdown(false);
  };

  // Helper to identify intermediate technical scripts vs final documents
  const isIntermediateFile = (file: LibraryFile) => {
    const fmt = file.format.toLowerCase();
    const title = file.title.toLowerCase();
    const isScriptExt = ['py', 'js', 'ts', 'jsx', 'tsx', 'code', 'script'].includes(fmt);
    const isScriptTitle = title.startsWith('gerar_') || title.startsWith('gerador_') || title.includes('_script') || title.startsWith('script_');
    return isScriptExt || isScriptTitle;
  };

  // Helper to ensure all filenames in the library have their proper extension appended
  const ensureFileExtension = (rawTitle: string, format: string): string => {
    if (!rawTitle) return `documento.${format || 'pdf'}`;
    let ext = (format || '').toLowerCase();
    if (ext === 'markdown') ext = 'md';
    else if (ext === 'excel' || ext === 'csv' || ext === 'sheet' || ext === 'planilha') ext = 'xlsx';
    else if (ext === 'python') ext = 'py';
    else if (ext === 'javascript') ext = 'js';
    else if (ext === 'typescript') ext = 'ts';
    
    if (!ext || ext === 'code' || ext === 'documento') return rawTitle;

    const dotExt = `.${ext}`;
    if (!rawTitle.toLowerCase().endsWith(dotExt)) {
      return `${rawTitle}${dotExt}`;
    }
    return rawTitle;
  };

  // Dynamically extract all files from messages (AI + User attachments) across all sessions + Workspace uploads
  const allFiles = useMemo(() => {
    const files: LibraryFile[] = [...workspaceUploads];
    
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        // Parse User / Session Attachments
        if (msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach((att, idx) => {
            const fileId = `${msg.id}-att-${idx}`;
            if (!deletedFileIds.has(fileId)) {
              const ext = att.name.split('.').pop() || 'txt';
              const baseTitle = renamedFiles[fileId] || att.name;
              files.push({
                id: fileId,
                title: ensureFileExtension(baseTitle, ext),
                format: ext.toLowerCase(),
                content: att.base64 || att.url || `[Conteúdo do anexo: ${att.name}]`,
                timestamp: new Date(msg.timestamp),
                sessionTitle: session.title,
                sessionId: session.id,
                origin: 'user_attachment',
                fileSize: att.size ? `${(att.size / 1024).toFixed(1)} KB` : undefined
              });
            }
          });
        }

        // Parse AI generated documents
        if (msg.sender === 'ai') {
          // 1. Extract <wsm_doc> tags
          const { docObjs } = extractWsmDoc(msg.text);
          if (docObjs && docObjs.length > 0) {
            docObjs.forEach((doc, idx) => {
              const fileId = `${msg.id}-doc-${idx}`;
              if (!deletedFileIds.has(fileId)) {
                const fmt = doc.format || 'pdf';
                const baseTitle = renamedFiles[fileId] || doc.title || 'Documento sem título';
                files.push({
                  id: fileId,
                  title: ensureFileExtension(baseTitle, fmt),
                  format: fmt,
                  content: doc.content,
                  timestamp: new Date(msg.timestamp),
                  sessionTitle: session.title,
                  sessionId: session.id,
                  origin: 'ai_doc'
                });
              }
            });
          }

          // 2. Extract tableData as XLSX/Planilha files
          if (msg.tableData) {
            const fileId = `${msg.id}-table`;
            if (!deletedFileIds.has(fileId)) {
              const fmt = 'xlsx';
              const baseTitle = renamedFiles[fileId] || `Planilha - ${session.title}`;
              files.push({
                id: fileId,
                title: ensureFileExtension(baseTitle, fmt),
                format: fmt,
                content: JSON.stringify(msg.tableData),
                timestamp: new Date(msg.timestamp),
                sessionTitle: session.title,
                sessionId: session.id,
                origin: 'ai_doc'
              });
            }
          }

          // 3. Extract code block as code files
          if (msg.codeBlock && (!docObjs || docObjs.length === 0)) {
            const fileId = `${msg.id}-code`;
            if (!deletedFileIds.has(fileId)) {
              const fmt = msg.codeBlock.language || 'code';
              const baseTitle = renamedFiles[fileId] || `Código - ${msg.codeBlock.language.toUpperCase()}`;
              files.push({
                id: fileId,
                title: ensureFileExtension(baseTitle, fmt),
                format: fmt,
                content: msg.codeBlock.code,
                timestamp: new Date(msg.timestamp),
                sessionTitle: session.title,
                sessionId: session.id,
                origin: 'ai_doc'
              });
            }
          }
        }
      });
    });

    // Sort by timestamp descending (newest first)
    return files.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [sessions, deletedFileIds, renamedFiles, workspaceUploads]);

  // Filter based on search query, active tab, and intermediate script filter
  const filteredFiles = useMemo(() => {
    return allFiles.filter(file => {
      if (hideIntermediate && isIntermediateFile(file)) {
        return false;
      }

      const matchesSearch = file.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            file.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      const fmt = file.format.toLowerCase();
      if (activeTab === 'fontes') {
        return file.origin === 'user_attachment' || file.origin === 'workspace_upload';
      }
      if (activeTab === 'documentos') {
        return ['pdf', 'doc', 'docx', 'md', 'html', 'txt'].includes(fmt);
      }
      if (activeTab === 'planilhas') {
        return ['xlsx', 'xls', 'csv', 'tsv', 'json'].includes(fmt);
      }
      if (activeTab === 'codigo') {
        return ['code', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'css', 'json', 'sql', 'sh', 'bash'].includes(fmt);
      }
      return true;
    });
  }, [allFiles, searchQuery, activeTab, hideIntermediate]);

  // Group files by session (separados por seções de cada chat)
  const groupedFiles = useMemo(() => {
    const groups: { [sessionId: string]: { sessionTitle: string; files: LibraryFile[] } } = {};
    
    filteredFiles.forEach(file => {
      if (!groups[file.sessionId]) {
        groups[file.sessionId] = {
          sessionTitle: file.sessionTitle,
          files: []
        };
      }
      groups[file.sessionId].files.push(file);
    });

    return Object.entries(groups).map(([sessionId, group]) => ({
      sessionId,
      ...group
    }));
  }, [filteredFiles]);

  // Icon selector helper
  const getFileIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-rose-500" />;
      case 'xlsx':
      case 'csv':
        return <Table className="w-8 h-8 text-emerald-600" />;
      case 'html':
        return <FileCode className="w-8 h-8 text-sky-500" />;
      case 'md':
      case 'markdown':
        return <FileText className="w-8 h-8 text-amber-500" />;
      case 'code':
      case 'js':
      case 'ts':
      case 'py':
        return <FileCode2 className="w-8 h-8 text-slate-600" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  // Download logic for documents
  const handleDownload = async (file: LibraryFile) => {
    try {
      let blob: Blob;
      let filename = file.title;

      if (file.format === 'pdf') {
        blob = await generatePdfBlob(file.title, file.content);
        if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';
      } else if (file.format === 'xlsx') {
        blob = await generateExcelBlob(file.title, file.content);
        if (!filename.toLowerCase().endsWith('.xlsx')) filename += '.xlsx';
      } else {
        // Default plain text / code / HTML
        blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
        const ext = file.format === 'html' ? '.html' : file.format === 'md' ? '.md' : '.txt';
        if (!filename.toLowerCase().endsWith(ext)) filename += ext;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Falha ao baixar arquivo:", err);
    }
  };

  const handleRename = (file: LibraryFile) => {
    const newTitle = prompt("Digite o novo nome para o arquivo:", file.title);
    if (newTitle && newTitle.trim() !== "") {
      setRenamedFiles(prev => ({ ...prev, [file.id]: newTitle.trim() }));
    }
    setActiveMenuId(null);
  };

  const handleDelete = (fileId: string) => {
    setDeletedFileIds(prev => {
      const next = new Set(prev);
      next.add(fileId);
      return next;
    });
    setActiveMenuId(null);
  };

  const handleDeleteSelected = () => {
    if (selectedFileIds.size === 0) return;
    if (confirm(`Tem certeza que deseja excluir ${selectedFileIds.size} arquivo(s)?`)) {
      setDeletedFileIds(prev => {
        const next = new Set(prev);
        selectedFileIds.forEach(id => next.add(id));
        return next;
      });
      setSelectedFileIds(new Set());
    }
  };

  const toggleSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#faf9f6] overflow-hidden select-none">
      {/* Header Area */}
      <header className="px-6 py-4 border-b border-[#eae6e1] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMobileHistory}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {selectedFileIds.size > 0 ? (
            <div className="flex items-center gap-3 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
              <button onClick={toggleSelectAll} className="p-1 hover:bg-blue-100 rounded text-blue-600 cursor-pointer" title="Selecionar todos">
                {selectedFileIds.size === filteredFiles.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
              <span className="text-sm font-semibold">{selectedFileIds.size} selecionado{selectedFileIds.size > 1 ? 's' : ''}</span>
              <div className="w-px h-4 bg-blue-200 mx-1"></div>
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 p-1 hover:bg-red-100 hover:text-red-600 rounded text-blue-600 cursor-pointer transition-colors"
                title="Excluir selecionados"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Excluir</span>
              </button>
              <button onClick={() => setSelectedFileIds(new Set())} className="p-1 hover:bg-blue-100 rounded ml-2 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-800" />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Biblioteca</h1>
            </div>
          )}
        </div>

        {/* Search, Action and Filter tools */}
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative hidden sm:block w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-hidden focus:ring-1 focus:ring-gray-300 focus:bg-white transition-all"
            />
          </div>
        </div>
      </header>

      {/* Main Body Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Mobile Search Input */}
        <div className="relative sm:hidden w-full shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Pesquisar na biblioteca..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden shadow-3xs"
          />
        </div>

        {/* Filter Tabs and Layout Controls */}
        <div className="flex flex-wrap items-center justify-between border-b border-gray-200/60 pb-3 gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              onClick={() => setActiveTab('tudo')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'tudo' 
                  ? 'bg-gray-900 text-white shadow-2xs' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tudo ({allFiles.length})
            </button>
            <button 
              onClick={() => setActiveTab('fontes')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'fontes' 
                  ? 'bg-gray-900 text-white shadow-2xs' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Paperclip className="w-3 h-3" />
              Fontes & Anexos
            </button>
            <button 
              onClick={() => setActiveTab('documentos')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'documentos' 
                  ? 'bg-gray-900 text-white shadow-2xs' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Documentos
            </button>
            <button 
              onClick={() => setActiveTab('planilhas')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'planilhas' 
                  ? 'bg-gray-900 text-white shadow-2xs' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Planilhas
            </button>
            <button 
              onClick={() => setActiveTab('codigo')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'codigo' 
                  ? 'bg-gray-900 text-white shadow-2xs' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Código
            </button>
            <button 
              onClick={() => setHideIntermediate(!hideIntermediate)}
              className={`ml-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center gap-1 border ${
                hideIntermediate 
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold' 
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
              }`}
              title="Filtrar ou exibir arquivos e scripts intermediários"
            >
              <span>{hideIntermediate ? 'Ocultando Scripts' : 'Exibir Scripts'}</span>
            </button>
          </div>

          {/* View Mode Toggle Button */}
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/40 select-none">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-gray-800 shadow-3xs' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-3xs' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Groups by Chat Section */}
        {groupedFiles.length > 0 ? (
          <div className="space-y-8 pb-12">
            {groupedFiles.map(group => (
              <div key={group.sessionId} className="space-y-3.5">
                <div 
                  onClick={() => onSelectSession(group.sessionId)}
                  className="inline-flex items-center gap-1.5 group cursor-pointer"
                >
                  <h2 className="text-sm font-bold text-gray-800 group-hover:text-black transition-colors">
                    {group.sessionTitle}
                  </h2>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform group-hover:translate-x-0.5" />
                </div>

                {viewMode === 'grid' ? (
                  /* Grid layout matches user image */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.files.map(file => (
                      <div 
                        key={file.id}
                        className={`bg-white border ${selectedFileIds.has(file.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[#eae6e1]'} rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all h-48 select-none group/card cursor-pointer relative`}
                        onClick={() => setSelectedFile(file)}
                      >
                        {/* Header Title with Checkbox & Menu */}
                        <div className="flex items-start justify-between">
                          <button 
                            className="mr-2 p-1 text-gray-400 hover:text-blue-600 rounded"
                            onClick={(e) => { e.stopPropagation(); toggleSelection(file.id); }}
                          >
                            {selectedFileIds.has(file.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                          </button>
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-sans font-bold text-gray-900 text-[14px] leading-snug line-clamp-2">
                              {file.title}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                                {file.format}
                              </span>
                              {file.origin === 'user_attachment' && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-0.5">
                                  <Paperclip className="w-2.5 h-2.5" /> Anexo
                                </span>
                              )}
                              {file.origin === 'workspace_upload' && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-0.5">
                                  <Upload className="w-2.5 h-2.5" /> Fonte
                                </span>
                              )}
                              {isIntermediateFile(file) && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  Script Intermediário
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <button 
                              className="p-1 text-gray-400 hover:text-black rounded"
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id); }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuId === file.id && (
                              <div className="absolute right-0 top-6 bg-white shadow-lg border border-gray-100 rounded-lg py-1 w-36 z-10" onClick={e => e.stopPropagation()}>
                                <button className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2 font-medium" onClick={() => { setActiveMenuId(null); onNewChat(); }}>
                                  <Send className="w-3.5 h-3.5 text-black" /> Usar no Chat
                                </button>
                                <button className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2" onClick={() => handleRename(file)}>
                                  <Edit2 className="w-3.5 h-3.5" /> Renomear
                                </button>
                                <button className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={() => handleDelete(file.id)}>
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Centered Document Icon */}
                        <div className="flex items-center justify-center py-2">
                          <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover/card:bg-gray-100/50 transition-colors">
                            {getFileIcon(file.format)}
                          </div>
                        </div>

                        {/* Footer timestamp and actions */}
                        <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-50 pt-2 shrink-0">
                          <span>
                            {file.timestamp.toLocaleDateString('pt-BR', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedFile(file); }}
                              className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-black transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                              className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-black transition-colors"
                              title="Baixar"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List layout */
                  <div className="bg-white border border-[#eae6e1] rounded-2xl divide-y divide-gray-100 overflow-hidden">
                    {group.files.map(file => (
                      <div 
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedFileIds.has(file.id) ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <button 
                            className="mr-1 p-1 text-gray-400 hover:text-blue-600 rounded"
                            onClick={(e) => { e.stopPropagation(); toggleSelection(file.id); }}
                          >
                            {selectedFileIds.has(file.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                          </button>
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                            {getFileIcon(file.format)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-sans font-semibold text-gray-900 text-[13.5px] truncate">
                                {file.title}
                              </h3>
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                                {file.format}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400">
                              Gerado em {file.timestamp.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                            title="Baixar"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          
                          <div className="relative">
                            <button 
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id); }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuId === file.id && (
                              <div className="absolute right-0 top-10 bg-white shadow-lg border border-gray-100 rounded-lg py-1 w-32 z-10" onClick={e => e.stopPropagation()}>
                                <button className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2" onClick={() => handleRename(file)}>
                                  <Edit2 className="w-3.5 h-3.5" /> Renomear
                                </button>
                                <button className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={() => handleDelete(file.id)}>
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 border border-gray-150">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Nenhum arquivo na área de trabalho</h3>
            <p className="text-gray-400 text-xs mt-1 max-w-sm leading-relaxed">
              Esta biblioteca é sua área de trabalho do agente. Ela centraliza arquivos e documentos anexados por você, fontes enviadas e todos os relatórios, planilhas e códigos gerados em suas conversas.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Fazer Upload de Arquivo / Fonte
            </button>
          </div>
        )}
      </div>

      {/* Elegant File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setSelectedFile(null)} />
          <div className="bg-[#f4f3f1] dark:bg-gray-950 border border-[#eae6e1] dark:border-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full h-[85vh] flex flex-col relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <DocumentViewerPane
              document={{
                title: selectedFile.title,
                content: selectedFile.content,
                format: selectedFile.format
              }}
              isFullscreen={true}
              onToggleFullscreen={() => {}}
              onClose={() => setSelectedFile(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
