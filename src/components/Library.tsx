import React, { useState, useMemo } from 'react';
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
  ChevronDown
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

interface LibraryFile {
  id: string;
  title: string;
  format: 'pdf' | 'html' | 'xlsx' | 'md' | 'code' | 'txt' | string;
  content: string;
  timestamp: Date;
  sessionTitle: string;
  sessionId: string;
}

export default function Library({ sessions, onOpenMobileHistory, onSelectSession, onNewChat }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tudo' | 'arquivos'>('tudo');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<LibraryFile | null>(null);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  // Dynamically extract all files from AI messages across all sessions
  const allFiles = useMemo(() => {
    const files: LibraryFile[] = [];
    
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.sender === 'ai') {
          // 1. Extract <wsm_doc> tags
          const { docObjs } = extractWsmDoc(msg.text);
          if (docObjs && docObjs.length > 0) {
            docObjs.forEach((doc, idx) => {
              files.push({
                id: `${msg.id}-doc-${idx}`,
                title: doc.title || 'Documento sem título',
                format: doc.format || 'pdf',
                content: doc.content,
                timestamp: new Date(msg.timestamp),
                sessionTitle: session.title,
                sessionId: session.id,
              });
            });
          }

          // 2. Extract tableData as XLSX/Planilha files
          if (msg.tableData) {
            files.push({
              id: `${msg.id}-table`,
              title: `Planilha - ${session.title}`,
              format: 'xlsx',
              content: JSON.stringify(msg.tableData),
              timestamp: new Date(msg.timestamp),
              sessionTitle: session.title,
              sessionId: session.id,
            });
          }

          // 3. Extract code block as code files (if it hasn't been extracted as <wsm_doc>)
          if (msg.codeBlock && (!docObjs || docObjs.length === 0)) {
            files.push({
              id: `${msg.id}-code`,
              title: `Código - ${msg.codeBlock.language.toUpperCase()}`,
              format: msg.codeBlock.language || 'code',
              content: msg.codeBlock.code,
              timestamp: new Date(msg.timestamp),
              sessionTitle: session.title,
              sessionId: session.id,
            });
          }
        }
      });
    });

    // Sort by timestamp descending (newest first)
    return files.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [sessions]);

  // Filter based on search query and active tab
  const filteredFiles = useMemo(() => {
    return allFiles.filter(file => {
      const matchesSearch = file.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            file.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'arquivos') {
        // Files category includes pdf, doc, xlsx, md, etc.
        return matchesSearch && ['pdf', 'xlsx', 'md', 'html', 'code', 'txt', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'css', 'json'].includes(file.format.toLowerCase());
      }
      return matchesSearch;
    });
  }, [allFiles, searchQuery, activeTab]);

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
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-800" />
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Biblioteca</h1>
          </div>
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

          {/* New Document Placeholder / Action Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Novo</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showCreateDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCreateDropdown(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-150 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                  <button 
                    onClick={() => { setShowCreateDropdown(false); onNewChat(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Iniciar novo chat
                  </button>
                </div>
              </>
            )}
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
        <div className="flex items-center justify-between border-b border-gray-200/60 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('tudo')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'tudo' 
                  ? 'bg-gray-900 text-white shadow-2xs' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tudo
            </button>
            <button 
              onClick={() => setActiveTab('arquivos')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'arquivos' 
                  ? 'bg-gray-900 text-white shadow-2xs' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Arquivos
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
                        className="bg-white border border-[#eae6e1] rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all h-48 select-none group/card cursor-pointer"
                        onClick={() => setSelectedFile(file)}
                      >
                        {/* Header Title */}
                        <div className="flex items-start justify-between">
                          <h3 className="font-sans font-bold text-gray-900 text-[14px] leading-snug line-clamp-2 pr-2">
                            {file.title}
                          </h3>
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
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                            {getFileIcon(file.format)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-sans font-semibold text-gray-900 text-[13.5px] truncate pr-2">
                              {file.title}
                            </h3>
                            <span className="text-[11px] text-gray-400">
                              Gerado em {file.timestamp.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(file); }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                            title="Baixar"
                          >
                            <Download className="w-4 h-4" />
                          </button>
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
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Nenhum arquivo na biblioteca</h3>
            <p className="text-gray-400 text-xs mt-1 max-w-xs leading-relaxed">
              Sua biblioteca é alimentada automaticamente com todos os documentos, planilhas, códigos e arquivos que a inteligência artificial gera nas suas conversas.
            </p>
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
