import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Globe, Mic, ArrowUp, Pencil, Code, Image as ImageIcon, Brain, Languages, ChevronDown, Sparkles, Calculator, Clock, Video, Volume2, FileText, AlertCircle, X, Menu } from 'lucide-react';

interface MainHomeProps {
  onSendMessage: (text: string, isSearchEnabled: boolean, overrideMessages?: any, attachments?: any[]) => void;
  onSuggestionClick: (suggestionType: 'write' | 'code' | 'image' | 'analysis' | 'translate') => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onOpenMobileHistory?: () => void;
}

export default function MainHome({
  onSendMessage,
  onSuggestionClick,
  selectedModel,
  setSelectedModel,
  onOpenMobileHistory
}: MainHomeProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

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

    if (selectedModel !== 'WSM 1.6 Marte') {
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
    'WSM 1.6 Mercúrio',
    'WSM 1.6 Marte',
    'WSM 1.6 Saturno',
    'WSM 1.6 Júpiter'
  ];

  const modelDescriptions: Record<string, string> = {
    'WSM 1.6 Mercúrio': 'Modelo para o dia-a-dia, rápido, eficiente, e inteligente',
    'WSM 1.6 Marte': 'Modelo intermediário agêntico, para tarefas mais complexas',
    'WSM 1.6 Saturno': 'Modelo para tarefas pesadas, porém com limites de uso',
    'WSM 1.6 Júpiter': 'Modelo mais inteligente, para tarefas ultra-complexas e pesadas, mas com uso controlado'
  };

  const getFileType = (file: File) => {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileList: File[] = Array.from(files) as File[];
    
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

  const handleAttachClick = () => {
    const hasAccepted = localStorage.getItem('wsm_accepted_file_terms') === 'true';
    if (hasAccepted) {
      fileInputRef.current?.click();
    } else {
      setShowTermsModal(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && attachments.length === 0) return;
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
              <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:absolute md:inset-auto md:left-0 md:top-full md:mt-1.5 md:translate-y-0 w-auto max-w-[calc(100vw-2rem)] md:w-80 bg-white border border-gray-150 rounded-xl shadow-2xl md:shadow-lg z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Modelos Disponíveis
                </div>
                <div className="flex flex-col gap-0.5">
                  {modelsList.map((model) => {
                    const isActive = selectedModel === model;
                    const isClickable = model === 'WSM 1.6 Mercúrio' || model === 'WSM 1.6 Marte';
                    return (
                      <button 
                        key={model}
                        disabled={!isClickable}
                        onClick={() => handleSelectModel(model)}
                        className={`w-full flex flex-col gap-0.5 px-3 py-2 text-left rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-[#f0ede8] text-gray-900 font-semibold' 
                            : isClickable 
                              ? 'text-gray-600 hover:bg-gray-50' 
                              : 'text-gray-400 cursor-not-allowed opacity-50 bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#5c53e5]' : 'bg-transparent'}`} />
                            <span>{model}</span>
                          </div>
                          {model === 'WSM 1.6 Mercúrio' && (
                            <span className="text-[8px] bg-[#5c53e5]/10 text-[#5c53e5] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Padrão</span>
                          )}
                          {model === 'WSM 1.6 Marte' && (
                            <div className="flex items-center gap-0.5">
                              <span className="text-[8px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Novo</span>
                              <span className="text-[8px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Beta</span>
                            </div>
                          )}
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
          <div id="ghost" className="animate-ghost-orbit" style={{ scale: '0.45', position: 'absolute' }}>
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

        {/* Main Large Chat Input Box */}
        <form 
          onSubmit={handleSubmit}
          className="w-[calc(100%-2rem)] md:w-full md:max-w-xl bg-white border border-[#eae6e1] md:rounded-2xl rounded-[28px] shadow-lg md:shadow-[0_4px_16px_rgba(0,0,0,0.02)] p-3 md:p-2.5 focus-within:border-[#5c53e5]/50 focus-within:ring-1 focus-within:ring-[#5c53e5]/25 transition-all duration-200 absolute bottom-3 md:static z-50 mb-0 md:mb-4 left-4"
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
            <div className="w-full flex flex-wrap gap-2 mb-2 p-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 rounded-xl max-h-36 overflow-y-auto select-none">
              {attachments.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-lg p-1.5 pr-2 text-xs shadow-xxs shrink-0"
                >
                  {file.type === 'image' ? (
                    <img src={file.url} alt={file.name} className="w-7 h-7 rounded object-cover border border-gray-100 dark:border-gray-700 shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 shrink-0">
                      {file.type === 'video' && <Video className="w-3.5 h-3.5 text-purple-500" />}
                      {file.type === 'audio' && <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
                      {file.type === 'document' && <FileText className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 truncate w-24" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text Area Input */}
          <textarea
            id="chat-input-textarea"
            rows={2}
            value={inputValue}
            onChange={handleInputValueChange}
            onKeyDown={handleKeyDown}
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
                id="btn-voice-input"
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

              <button
                type="submit"
                id="btn-send-message"
                disabled={!inputValue.trim() && attachments.length === 0}
                className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all ${
                  inputValue.trim() || attachments.length > 0
                    ? 'bg-[#1f1e1d] text-white hover:bg-[#343230] cursor-pointer shadow-xs'
                    : 'bg-[#faf9f6] text-gray-300 cursor-not-allowed border border-[#eae6e1]'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

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
    </div>
  );
}
