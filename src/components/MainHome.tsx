import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Globe, Mic, ArrowUp, Pencil, Code, Image as ImageIcon, Brain, Languages, ChevronDown, Sparkles, Calculator, Clock, Video, Volume2, FileText, AlertCircle, X, Menu } from 'lucide-react';
import { Draft } from '../types';

interface MainHomeProps {
  onSendMessage: (text: string, isSearchEnabled: boolean, overrideMessages?: any, attachments?: any[]) => void;
  onSuggestionClick: (suggestionType: 'write' | 'code' | 'image' | 'analysis' | 'translate') => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onOpenMobileHistory?: () => void;
  initialDraft?: Draft;
  onSaveDraft?: (draft: Partial<Draft>) => void;
  onDeleteDraft?: () => void;
}

export default function MainHome({
  onSendMessage,
  onSuggestionClick,
  selectedModel,
  setSelectedModel,
  onOpenMobileHistory,
  initialDraft,
  onSaveDraft,
  onDeleteDraft
}: MainHomeProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => {
            const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + transcript;
          });
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
           console.error("Speech recognition error", event.error);
           setIsListening(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Synchronize inputValue with the actual DOM value to prevent duplication from direct DOM manipulation (e.g. testing tools)
  useEffect(() => {
    const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const syncValue = () => {
      if (textarea.value !== inputValue) {
        setInputValue(textarea.value);
      }
    };

    textarea.addEventListener('focus', syncValue);
    textarea.addEventListener('mousedown', syncValue);
    textarea.addEventListener('touchstart', syncValue);
    textarea.addEventListener('input', syncValue);

    return () => {
      textarea.removeEventListener('focus', syncValue);
      textarea.removeEventListener('mousedown', syncValue);
      textarea.removeEventListener('touchstart', syncValue);
      textarea.removeEventListener('input', syncValue);
    };
  }, [inputValue]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Attachments States
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasInitializedRef.current && initialDraft !== undefined) {
      setInputValue(initialDraft?.inputValue || '');
      setAttachments(initialDraft?.attachments || []);
      hasInitializedRef.current = true;
    }
  }, [initialDraft]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (!inputValue.trim() && attachments.length === 0) {
        if (onDeleteDraft) onDeleteDraft();
      } else {
        if (onSaveDraft) {
          onSaveDraft({ inputValue, attachments });
        }
      }
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [inputValue, attachments, onSaveDraft, onDeleteDraft]);

  // Slash Menu State
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashSearchTerm, setSlashSearchTerm] = useState('');
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);

  const marteTools = [
    { id: '/web', name: 'web-search', description: 'Pesquisa na Web', icon: Globe, color: 'text-blue-500' },
    { id: '/calculadora', name: 'calculadora', description: 'Calculadora Matemática', icon: Calculator, color: 'text-emerald-500' },
    { id: '/relogio', name: 'relogio', description: 'Relógio e Data Atual', icon: Clock, color: 'text-orange-500' }
  ];

  const filteredTools = marteTools.filter(tool => tool.id.toLowerCase().includes(slashSearchTerm.toLowerCase()));

  const handleInputValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (selectedModel !== 'WSM 1.6 Pro') {
      if (slashMenuOpen) setSlashMenuOpen(false);
      return;
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    // Check if user is typing a slash command
    const slashMatch = textBeforeCursor.match(/(^|\s)\/([a-zA-Z0-9-]*)$/);

    if (slashMatch) {
      setSlashMenuOpen(true);
      setSlashSearchTerm(slashMatch[2] || '');
      setSlashMenuIndex(0);
    } else {
      setSlashMenuOpen(false);
    }
  };

  const handleToolSelect = (toolId: string) => {
    const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
    const cursorPosition = textarea?.selectionStart || inputValue.length;
    
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const textAfterCursor = inputValue.slice(cursorPosition);
    
    const slashMatch = textBeforeCursor.match(/(^|\s)\/([a-zA-Z0-9-]*)$/);
    if (slashMatch) {
      const matchIndex = slashMatch.index !== undefined ? slashMatch.index : 0;
      const spaceBefore = slashMatch[1]; // either '' or ' '
      
      const newText = textBeforeCursor.slice(0, matchIndex) + spaceBefore + toolId + ' ' + textAfterCursor;
      setInputValue(newText);
      setSlashMenuOpen(false);
      
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          const newPos = matchIndex + spaceBefore.length + toolId.length + 1;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const modelsList = [
    'WSM 1.6 Flash',
    'WSM 1.6 Pro'
  ];

  const modelDescriptions: Record<string, string> = {
    'WSM 1.6 Flash': 'Para uso do dia-a-dia',
    'WSM 1.6 Pro': 'Para tarefas complexas'
  };

  const getFileType = (file: File) => {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (fileList: File[]) => {
    const hasAccepted = localStorage.getItem('wsm_accepted_file_terms') === 'true';
    if (!hasAccepted) {
      setShowTermsModal(true);
      return;
    }

    let videoCount = 0;
    let imgDocCount = 0;
    let audioCount = 0;
    
    attachments.forEach(att => {
      if (att.type === 'video') videoCount++;
      else if (att.type === 'audio') audioCount++;
      else if (att.type === 'image' || att.type === 'document') imgDocCount++;
    });
    
    // First, validate limits
    for (const file of fileList) {
      const type = getFileType(file);
      if (type === 'video') {
        videoCount++;
        if (videoCount > 10) {
          setUploadError("Limite excedido: Máximo de 10 vídeos por mensagem.");
          return;
        }
      } else if (type === 'audio') {
        audioCount++;
        if (audioCount > 1) {
          setUploadError("Limite excedido: É permitido apenas 1 áudio por mensagem.");
          return;
        }
      } else if (type === 'image' || type === 'document') {
        imgDocCount++;
        if (imgDocCount > 10) {
          setUploadError("Limite excedido: Imagens e Documentos combinados possuem limite de até 10 arquivos.");
          return;
        }
      }
    }

    // Convert all to base64
    const promises = fileList.map((file) => {
      const type = getFileType(file);
      return new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve({
            name: file.name,
            type: type,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            url: URL.createObjectURL(file),
            base64: base64,
          });
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises)
      .then((newAttachments) => {
        setUploadError(null);
        setAttachments(prev => [...prev, ...newAttachments]);
      })
      .catch((err) => {
        console.error("Error reading files:", err);
        setUploadError("Erro ao processar os arquivos anexados.");
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileList = Array.from(files) as File[];
    processFiles(fileList);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      processFiles(pastedFiles);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const droppedFiles = Array.from(files) as File[];
      processFiles(droppedFiles);
    }
  };

  const handleAttachClick = () => {
    const hasAccepted = localStorage.getItem('wsm_accepted_file_terms') === 'true';
    if (hasAccepted) {
      fileInputRef.current?.click();
    } else {
      setShowTermsModal(true);
    }
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;
    if (inputValue.length > 1500) return;
    
    if (onDeleteDraft) onDeleteDraft();
    onSendMessage(inputValue, isSearchEnabled, undefined, attachments);
    setInputValue('');
    setAttachments([]);
    setUploadError(null);
    setSlashMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMenuOpen && filteredTools.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashMenuIndex((prev) => (prev + 1) % filteredTools.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenuIndex((prev) => (prev - 1 + filteredTools.length) % filteredTools.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleToolSelect(filteredTools[slashMenuIndex].id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenuOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
    setSlashMenuOpen(false);
  };

  return (
    <div id="wsm-main-home" className="flex-1 flex flex-col h-full bg-[#fcfbfa] relative overflow-hidden select-none dot-grid">
      
      {/* Ambient background glows */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] glow-left pointer-events-none rounded-full" />
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] glow-right pointer-events-none rounded-full" />

      {/* Top Header / Action Bar */}
      <header className="flex relative z-40 px-5 py-3.5 items-center justify-between">
        <div className="flex items-center gap-3 relative z-50">
          <button 
            onClick={onOpenMobileHistory} 
            className="md:hidden flex items-center justify-center p-2 -ml-2 text-gray-700 hover:bg-black/5 rounded-full active:opacity-70 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Model Dropdown Pill */}
          <div className="relative">
            <button
            id="model-selector-pill"
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#eae6e1] hover:border-gray-300 rounded-full text-[13px] font-semibold text-gray-700 shadow-2xs cursor-pointer transition-all duration-150 active:scale-[0.98]"
          >
            <Sparkles className="w-3 h-3 text-[#5c53e5] fill-[#5c53e5]/20 animate-pulse" />
            <span>{selectedModel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isModelDropdownOpen && (
            <>
              {/* Backdrop for mobile to close the selector when clicking outside */}
              <div 
                className="fixed inset-0 bg-black/40 z-40 md:hidden" 
                onClick={() => setIsModelDropdownOpen(false)} 
              />
              <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:absolute md:inset-auto md:left-0 md:top-full md:mt-1.5 md:translate-y-0 w-auto max-w-[calc(100vw-2rem)] md:w-56 bg-white border border-gray-150 rounded-xl shadow-2xl md:shadow-lg z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex flex-col gap-0.5">
                  {modelsList.map((model) => {
                    const isClickable = model === 'WSM 1.6 Flash' || model === 'WSM 1.6 Pro';
                    if (!isClickable) return null;
                    const isActive = selectedModel === model;
                    return (
                      <button 
                        key={model}
                        disabled={!isClickable}
                        onClick={() => handleSelectModel(model)}
                        className={`w-full flex flex-col gap-0.5 px-3 py-2 text-left rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-[#f0ede8] text-gray-900 font-semibold' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#5c53e5]' : 'bg-transparent'}`} />
                            <span>{model}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400 pl-3 leading-tight font-normal">
                          {modelDescriptions[model]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </header>

      {/* Main Center content area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full relative z-10 pb-8 md:pb-8 pb-32">
        
        {/* Animated Central squircle mock dashboard */}
        <div 
          id="center-avatar-card"
          className="hidden md:flex w-16 h-16 items-center justify-center mb-6 select-none relative z-50"
        >
          {/* Ghost animation centered and styled exactly as requested, loose with no borders or cards */}
          <div id="ghost" style={{ scale: '0.45', position: 'absolute' }}>
            <div id="red">
              <div id="pupil"></div>
              <div id="pupil1"></div>
              <div id="eye"></div>
              <div id="eye1"></div>
              <div id="top0"></div>
              <div id="top1"></div>
              <div id="top2"></div>
              <div id="top3"></div>
              <div id="top4"></div>
              <div id="st0"></div>
              <div id="st1"></div>
              <div id="st2"></div>
              <div id="st3"></div>
              <div id="st4"></div>
              <div id="st5"></div>
              <div id="an1"></div>
              <div id="an2"></div>
              <div id="an3"></div>
              <div id="an4"></div>
              <div id="an5"></div>
              <div id="an6"></div>
              <div id="an7"></div>
              <div id="an8"></div>
              <div id="an9"></div>
              <div id="an10"></div>
              <div id="an11"></div>
              <div id="an12"></div>
              <div id="an13"></div>
              <div id="an14"></div>
              <div id="an15"></div>
              <div id="an16"></div>
              <div id="an17"></div>
              <div id="an18"></div>
            </div>
            <div id="shadow"></div>
          </div>
        </div>

        {/* Brand Headline Typography */}
        <h1 id="home-headline" className="text-center mb-5 md:mb-5 select-none absolute top-[35%] md:static left-1/2 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 w-full md:w-auto">
          <div className="md:hidden">
             <span className="font-serif font-medium text-gray-800 tracking-tight text-[28px]">
                Como posso ajudar você?
             </span>
          </div>
          <div className="hidden md:block">
            <span className="font-sans font-extrabold text-gray-900 tracking-tight text-[1.95rem] md:text-[2.3rem]">
              Como posso{' '}
            </span>
            <span className="font-sans font-light text-gray-400 tracking-tight text-[1.95rem] md:text-[2.3rem]">
              ajudar?
            </span>
          </div>
        </h1>

        {/* Input area & news card container */}
        <div className="w-[calc(100%-2rem)] md:w-full md:max-w-xl flex flex-col gap-3.5 absolute bottom-3 md:relative z-50 left-4 md:left-auto">
          {/* Main Large Chat Input Box */}
          <form 
            onSubmit={handleSubmit}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="w-full bg-white border border-[#eae6e1] md:rounded-2xl rounded-[28px] shadow-lg md:shadow-[0_4px_16px_rgba(0,0,0,0.02)] p-3 md:p-2.5 focus-within:border-[#5c53e5]/50 focus-within:ring-1 focus-within:ring-[#5c53e5]/25 transition-all duration-200"
          >
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            className="hidden" 
          />

          {/* Slash Menu */}
          {slashMenuOpen && filteredTools.length > 0 && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 w-64 bg-white border border-gray-150 rounded-xl shadow-lg z-50 p-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              {filteredTools.map((tool, index) => {
                const isSelected = index === slashMenuIndex;
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolSelect(tool.id)}
                    className={`w-full flex flex-col gap-0.5 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${tool.color}`} />
                      <span className="text-[12px] font-semibold text-gray-800">{tool.id}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 pl-5.5">{tool.description}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="w-full flex items-center justify-between gap-2 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2 text-xs text-red-800 dark:text-red-300 mb-2 animate-in slide-in-from-bottom-2 duration-150 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="font-medium">{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Attachments list horizontal preview */}
          {attachments.length > 0 && (
            <div className="w-full flex flex-wrap gap-3 mb-3 p-2 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl max-h-48 overflow-y-auto select-none">
              {attachments.map((file, idx) => {
                const getExt = (name: string, type: string) => {
                  const parts = name.split('.');
                  if (parts.length > 1) {
                    const ext = parts[parts.length - 1].toUpperCase();
                    if (ext.length <= 4) return ext;
                  }
                  return type.toUpperCase();
                };

                return (
                  <div key={idx} className="shrink-0 relative">
                    {file.type === 'image' || file.type === 'video' ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden relative shadow-xs bg-gray-100 dark:bg-gray-800">
                        {file.type === 'image' ? (
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="relative w-full h-full bg-gray-900 overflow-hidden">
                            <video src={file.url} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Video className="w-5 h-5 text-white drop-shadow-md" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-20 p-2 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col justify-between shadow-xxs text-left">
                        <div className="font-sans font-medium text-gray-700 dark:text-gray-300 text-[10px] leading-tight break-all line-clamp-2" title={file.name}>
                          {file.name}
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-[8px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50 inline-block w-fit select-none">
                          {getExt(file.name, file.type)}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer z-20 shadow-xs"
                      title="Remover"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Text Area Input */}
          <textarea
            id="chat-input-textarea"
            rows={2}
            value={inputValue}
            onChange={handleInputValueChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Pergunte qualquer coisa ao ${selectedModel}...`}
            className="w-full bg-transparent outline-none resize-none text-gray-800 placeholder-gray-400 text-[13.5px] leading-relaxed pb-1.5 max-h-36"
          />

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            {/* Left Controls: Paperclip & Pesquisar Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-attach-file"
                onClick={handleAttachClick}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Anexar arquivos"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              {/* Toggleable Pesquisar Button */}
              <button
                type="button"
                id="btn-search-toggle"
                onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  isSearchEnabled
                    ? 'bg-[#5c53e5]/10 text-[#5c53e5] border border-[#5c53e5]/25 shadow-2xs'
                    : 'bg-[#eae7e2] text-gray-700 hover:bg-[#e1ded9]'
                }`}
                title="Ativar busca web em tempo real"
              >
                <Globe className={`w-3 h-3 ${isSearchEnabled ? 'text-[#5c53e5] animate-spin-slow' : 'text-gray-500'}`} />
                <span>Pesquisar</span>
              </button>
            </div>

            {/* Right Controls: Mic & Send Circular Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                                onClick={toggleListening}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isListening
                    ? 'text-red-500 bg-red-50 animate-pulse'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={isListening ? "Parar gravação" : "Digitar por voz"}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {inputValue.length >= 1300 && (
                <span className={`text-[10px] font-medium ${inputValue.length > 1500 ? 'text-red-500' : 'text-gray-400'} flex items-center`}>
                  {inputValue.length} / 1500
                </span>
              )}

              <button
                type="submit"
                id="btn-send-message"
                onClick={(e) => {
                  handleSubmit(e);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                disabled={(!inputValue.trim() && attachments.length === 0) || inputValue.length > 1500}
                className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all ${
                  (inputValue.trim() || attachments.length > 0) && inputValue.length <= 1500
                    ? 'bg-[#1f1e1d] text-white hover:bg-[#343230] cursor-pointer shadow-xs'
                    : 'bg-[#faf9f6] text-gray-300 cursor-not-allowed border border-[#eae6e1]'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {inputValue.length > 1500 && (
            <div className="absolute -bottom-8 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-top-2">
              <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm">
                O limite de caracteres é 1500. Você ultrapassou esse limite.
              </span>
            </div>
          )}

          {isDragging && (
            <div 
              className="absolute inset-0 bg-[#fbfbfa]/95 border-2 border-dashed border-[#5c53e5] rounded-[28px] md:rounded-2xl z-50 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-150 pointer-events-none"
            >
              <Paperclip className="w-6 h-6 text-[#5c53e5] animate-bounce" />
              <span className="text-xs font-semibold text-[#5c53e5]">Solte os arquivos aqui</span>
            </div>
          )}
          </form>

          {/* Card de novidades dos novos modelos */}
          <div 
            onClick={() => setIsNewsModalOpen(true)}
            className="w-full bg-gray-100/65 border border-[#eae6e1]/70 rounded-2xl p-4 flex items-center gap-4 select-none cursor-pointer hover:bg-gray-100/90 active:scale-[0.99] transition-all"
          >
            <img
              src="https://i.ibb.co/TMJBp2n7/38000-removebg-preview.png"
              alt="Novos Modelos"
              className="w-14 h-14 md:w-16 md:h-16 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col text-left">
              <h3 className="font-sans font-bold text-gray-900 text-[14px] md:text-[15px] tracking-tight leading-snug">
                Novos modelos: WSM 1.6 Flash e Pro
              </h3>
              <p className="font-sans text-gray-500 text-[12px] md:text-[12.5px] leading-relaxed mt-0.5">
                Conheça nossos 2 novos modelos da família 1.6, mais inteligentes e poderosos.
              </p>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}


      </main>

      {/* Terms of Attachment Consent Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#eae6e1] dark:border-gray-800 rounded-2xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-amber-500">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-sans">
                  Termos de Anexo de Arquivos
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                  IMPORTANTE • CONSENTIMENTO
                </p>
              </div>
            </div>
            
            <p className="text-[12.5px] leading-relaxed text-gray-600 dark:text-gray-300 font-sans mb-6">
              Antes de anexar arquivos, você concorda que é o único responsável pelo conteúdo enviado, garantindo que ele não possui dados pessoais sensíveis, imagens protegidas por direitos autorais, nudez ou conteúdos ofensivos. Você também aceita que seus arquivos serão processados pela inteligência artificial para gerar as respostas do chat, estando em conformidade com as regras de segurança e privacidade da plataforma.
            </p>
            
            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('wsm_accepted_file_terms', 'true');
                  setShowTermsModal(false);
                  setTimeout(() => {
                    fileInputRef.current?.click();
                  }, 100);
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#5c53e5] hover:bg-[#4b43c6] text-white rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Concordo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full screen news modal */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setIsNewsModalOpen(false)} />
          
          <div className="bg-white border border-[#eae6e1] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setIsNewsModalOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors z-20 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Image on top */}
            <div className="w-full bg-gray-100 relative overflow-hidden flex items-center justify-center p-4">
              <img 
                src="https://i.ibb.co/tw9yWNfj/38003.png" 
                alt="Novos modelos" 
                className="max-w-full max-h-[350px] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Content below */}
            <div className="p-6 border-t border-[#eae6e1]/60 text-center">
              <p className="font-sans font-bold text-gray-900 text-lg">
                Teste
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
