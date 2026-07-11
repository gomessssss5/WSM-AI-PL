import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Globe, Mic, ArrowUp, Sparkles, Copy, Check, ChevronDown, Download, ZoomIn, X, ChevronsLeft, XCircle, Calculator, Clock, ThumbsUp, ThumbsDown, Edit2, MoreVertical, Plus, Flag, Star, Trash2, Video, Volume2, FileText, AlertCircle, Image as ImageIcon, Menu, RotateCcw } from 'lucide-react';
import { Message, Draft } from '../types';
import { saveEvaluationToDb } from '../lib/chatService';
import MarkdownRenderer from './MarkdownRenderer';
import SearchMessageView from './SearchMessageView';
import TypewriterMarkdown from './TypewriterMarkdown';
import InteractiveForm from './InteractiveForm';
import DocumentCard from './DocumentCard';
import { extractWsmForm } from '../utils/formParser';
import { extractWsmDoc } from '../utils/docParser';

const UiverseLoader = ({ isThinking = false }: { isThinking?: boolean }) => (
  <div 
    className={`w-7 h-7 flex items-center justify-center shrink-0 relative overflow-visible ${isThinking ? 'animate-ghost-slide' : ''}`} 
    id="uiverse-custom-loader"
  >
    <div id="ghost">
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
);

const cleanWriterUpdateTags = (text: string) => {
  if (!text) return "";
  return text.replace(/<wsm_writer_update>[\s\S]*?<\/wsm_writer_update>/g, "").trim();
};

interface ChatWindowProps {
  key?: string;
  messages: Message[];
  title?: string;
  isThinking: boolean;
  onSendMessage: (text: string, isSearchEnabled: boolean, overrideMessages?: Message[], attachments?: any[]) => void;
  onBackToHome?: () => void;
  selectedModel: string;
  setSelectedModel?: (model: string) => void;
  onSearchSimulationComplete?: (messageId: string) => void;
  onCancelGeneration?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteSession?: () => void;
  isEmbedded?: boolean;
  attachedText?: string;
  onClearAttachedText?: () => void;
  onOpenMobileHistory?: () => void;
  initialDraft?: Draft;
  onSaveDraft?: (draft: Partial<Draft>) => void;
  onDeleteDraft?: () => void;
}

const displayUserText = (text: string) => {
  const match = text.match(/^\[Texto Anexado do Editor:\n"[\s\S]*?"\]\n\n([\s\S]*)$/);
  return match ? match[1] : text;
};

export default function ChatWindow({
  messages,
  title = '',
  isThinking,
  onSendMessage,
  onBackToHome,
  selectedModel,
  setSelectedModel,
  onSearchSimulationComplete,
  onCancelGeneration,
  onEditMessage,
  onDeleteSession,
  isEmbedded = false,
  attachedText = '',
  onClearAttachedText,
  onOpenMobileHistory,
  initialDraft,
  onSaveDraft,
  onDeleteDraft
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
      if (!inputValue.trim() && !attachedText && attachments.length === 0) {
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
  }, [inputValue, attachedText, attachments, onSaveDraft, onDeleteDraft]);
  const [drawerSources, setDrawerSources] = useState<{
    sources: { hostname: string; title: string; url: string; snippet?: string }[];
    query: string;
    count: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState('');
  
  const [evaluations, setEvaluations] = useState<Record<string, 'up' | 'down'>>(() => {
    try {
      return JSON.parse(localStorage.getItem('wsm_evaluations') || '{}');
    } catch {
      return {};
    }
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

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
  }, [setInputValue]);

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

  const handleEvaluate = (msgId: string, rating: 'up' | 'down') => {
    const evals = { ...evaluations, [msgId]: rating };
    setEvaluations(evals);
    localStorage.setItem('wsm_evaluations', JSON.stringify(evals));
    try {
      const stored = JSON.parse(localStorage.getItem('wsm_evaluations_data') || '[]');
      const existingIdx = stored.findIndex((e: any) => e.msgId === msgId);
      const newEntry = { msgId, rating, conversation: messages.slice(0, messages.findIndex(m => m.id === msgId) + 1), timestamp: new Date().toISOString() };
      if (existingIdx >= 0) {
        stored[existingIdx] = newEntry;
      } else {
        stored.push(newEntry);
      }
      localStorage.setItem('wsm_evaluations_data', JSON.stringify(stored));
      saveEvaluationToDb(newEntry).catch(err => console.error("Error saving evaluation to Firestore:", err));
    } catch {}
  };

  const handleExportConversation = () => {
    let md = `# Conversa do WSM AI - ${title || 'Chat'}\n\n`;
    md += `**Modelo selecionado:** ${selectedModel}\n`;
    md += `**Exportado em:** ${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    messages.forEach((msg) => {
      const senderName = msg.sender === 'user' ? 'Usuário' : 'WSM AI';
      md += `### 👤 **${senderName}** (${new Date(msg.timestamp).toLocaleTimeString()})\n\n`;
      md += `${msg.text}\n\n`;
      
      if (msg.imageUrl) {
        md += `![Imagem Gerada](${msg.imageUrl})\n\n`;
      }
      
      if (msg.codeBlock) {
        md += `\`\`\`${msg.codeBlock.language || 'code'}\n${msg.codeBlock.code}\n\`\`\`\n\n`;
      }
      
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversa-${(title || 'wsm-ai').toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendReport = (text: string) => {
    if (!text.trim()) return;
    try {
      const stored = JSON.parse(localStorage.getItem('wsm_evaluations_data') || '[]');
      const newEntry = {
        msgId: `report-${Date.now()}`,
        rating: 'down' as 'up' | 'down',
        isReport: true,
        reportText: text,
        conversation: messages,
        timestamp: new Date().toISOString()
      };
      stored.push(newEntry);
      localStorage.setItem('wsm_evaluations_data', JSON.stringify(stored));
      saveEvaluationToDb(newEntry).catch(err => console.error("Error saving report to Firestore:", err));
      setIsReportModalOpen(false);
      setReportText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendRating = (stars: number, text: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem('wsm_evaluations_data') || '[]');
      const newEntry = {
        msgId: `eval-stars-${Date.now()}`,
        rating: (stars >= 4 ? 'up' : 'down') as 'up' | 'down',
        stars,
        feedbackText: text,
        conversation: messages,
        timestamp: new Date().toISOString()
      };
      stored.push(newEntry);
      localStorage.setItem('wsm_evaluations_data', JSON.stringify(stored));
      saveEvaluationToDb(newEntry).catch(err => console.error("Error saving rating to Firestore:", err));
      setIsRateModalOpen(false);
      setRatingComment('');
      setRatingStars(5);
    } catch (err) {
      console.error(err);
    }
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
    const textarea = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
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

  // Typewriter tracking logic to avoid re-triggering for historical messages
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (isInitialMountRef.current) {
      messages.forEach((m) => {
        // Only mark as processed if it's a historical message with actual text
        if (m.sender === 'ai' && m.text && m.text.length > 0) {
          processedMessageIdsRef.current.add(m.id);
        }
      });
      isInitialMountRef.current = false;
    }
  }, [messages]);

  const handleTypewriterComplete = (messageId: string) => {
    processedMessageIdsRef.current.add(messageId);
    scrollToBottom('smooth');
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

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior
        });
      }
    }, 50);
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isThinking]);

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    
    const textarea = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
    const currentText = textarea ? textarea.value : inputValue;
    
    if (!currentText.trim() && !attachedText && attachments.length === 0) return;
    if (currentText.length > 1500) return;
    
    let textToSend = '';
    if (attachedText && currentText.trim()) {
      textToSend = `[Texto Anexado do Editor:\n"${attachedText}"]\n\n${currentText}`;
    } else if (attachedText) {
      textToSend = `[Texto Anexado do Editor:\n"${attachedText}"]\n\nPor favor, analise ou revise o texto anexado acima.`;
    } else {
      textToSend = currentText;
    }
    
    if (onDeleteDraft) onDeleteDraft();
    onSendMessage(textToSend, isSearchEnabled, undefined, attachments);
    
    // Synchronously clear the DOM value to prevent race conditions during rapid consecutive sends
    if (textarea) {
      textarea.value = '';
    }
    setInputValue('');
    setAttachments([]);
    setUploadError(null);
    setIsSearchEnabled(false);
    setSlashMenuOpen(false);
    if (onClearAttachedText) {
      onClearAttachedText();
    }
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
      handleSubmit(e as any);
    }
  };

  const copyToClipboard = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(blockId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render a futuristic custom CSS/SVG generated city landscape for the AI image output
  const renderCyberpunkCityIllustration = () => (
    <div className="w-full max-w-md mt-3 bg-slate-950 rounded-xl overflow-hidden border border-purple-500/20 shadow-lg relative group">
      {/* City Canvas Stage */}
      <div className="w-full h-48 relative bg-gradient-to-b from-indigo-950 via-slate-900 to-purple-950 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:10px_18px]" />
        
        {/* Stars */}
        <div className="absolute top-6 left-1/4 w-0.5 h-0.5 bg-white rounded-full opacity-60 animate-ping" />
        <div className="absolute top-12 left-2/3 w-0.5 h-0.5 bg-white rounded-full opacity-40" />
        <div className="absolute top-18 left-1/2 w-1 h-1 bg-purple-400 rounded-full opacity-30 blur-xs" />

        {/* Big Neon Glowing Moon */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/15 rounded-full blur-xl" />
        <div className="absolute top-3 right-6 w-12 h-12 rounded-full border border-purple-400/25 bg-radial from-purple-900/30 to-transparent flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-purple-500/5 blur-xs" />
        </div>

        {/* Cyberpunk City Skyline with vector SVG */}
        <svg viewBox="0 0 400 200" className="absolute bottom-0 w-full h-36 text-slate-950 fill-current">
          {/* Back Buildings */}
          <path d="M0,200 L0,110 L25,110 L25,130 L55,130 L55,100 L95,100 L95,120 L135,120 L135,140 L160,140 L160,95 L200,95 L200,120 L240,120 L240,105 L285,105 L285,135 L330,135 L330,90 L365,90 L365,115 L400,115 L400,200 Z" className="text-purple-950/45" />
          
          {/* Midground Buildings with Neon Highlights */}
          <path d="M0,200 L0,130 L35,130 L35,150 L70,150 L70,120 L115,120 L115,135 L155,135 L155,110 L195,110 L195,140 L230,140 L230,115 L275,115 L275,145 L315,145 L315,125 L355,125 L355,140 L400,140 L400,200 Z" className="text-slate-900" />
          
          {/* Floating Towers */}
          <g className="text-[#8b5cf6]/15 animate-bounce" style={{ animationDuration: '4s' }}>
            <rect x="80" y="30" width="30" height="40" rx="3" className="fill-purple-900/30 stroke-[#a78bfa]/30 stroke-[0.5]" />
            <line x1="95" y1="20" x2="95" y2="30" className="stroke-[#a78bfa]/40 stroke-[0.5]" />
          </g>

          {/* Foreground Buildings */}
          <path d="M0,200 L0,150 L45,150 L45,165 L85,165 L85,135 L130,135 L130,155 L175,155 L175,130 L220,130 L220,150 L255,150 L255,140 L295,140 L295,160 L340,160 L340,145 L380,145 L380,165 L400,165 L400,200 Z" className="text-[#09070f]" />
        </svg>

        {/* Glowing Neon Lights and Windows */}
        <div className="absolute bottom-1.5 left-4 w-2 h-0.5 bg-[#8b5cf6] shadow-[0_0_6px_#8b5cf6] rounded-xxs animate-pulse" />
        <div className="absolute bottom-4 left-10 w-1.5 h-1.5 bg-purple-400 shadow-[0_0_4px_#8b5cf6] rounded-xxs" />
        <div className="absolute bottom-10 left-1/3 w-1 h-1 bg-[#5c53e5] shadow-[0_0_4px_#5c53e5] rounded-xxs animate-ping" />
        <div className="absolute bottom-6 left-1/2 w-3 h-0.5 bg-[#8b5cf6] shadow-[0_0_6px_#8b5cf6] rounded-xxs" />

        {/* Image Spec Label */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-[8px] text-purple-200 px-1.5 py-0.5 rounded font-mono border border-white/5 select-none flex items-center gap-1">
          <span className="w-1 h-1 bg-green-500 rounded-full block animate-pulse" />
          <span>1K PNG</span>
        </div>
        
        {/* Interaction HUD Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-2">
          <button className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/15 active:scale-95 cursor-pointer shadow-md">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="p-1.5 bg-[#5c53e5] hover:bg-[#4b42cc] text-white rounded-full transition-all active:scale-95 cursor-pointer shadow-md">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info footer */}
      <div className="p-2 bg-slate-900 border-t border-purple-500/10 flex items-center justify-between text-[11px] text-slate-400 font-medium px-3">
        <span>"Paisagem futurista com arranha-céus flutuantes"</span>
        <span className="text-purple-400 text-[9px] font-mono bg-purple-950/50 px-1.5 py-0.2 rounded border border-purple-500/10">WSM Geração</span>
      </div>
    </div>
  );

  const lastMessage = messages[messages.length - 1];
  let activeForm = null;
  if (lastMessage?.sender === 'ai' && !lastMessage.isSimulatingSearch) {
    const { formObj } = extractWsmForm(lastMessage.text);
    activeForm = formObj;
  }

  return (
    <div id="wsm-chat-window" className={`flex-1 flex flex-col h-full bg-[#fcfbfa] relative overflow-hidden ${!isEmbedded ? 'animate-in zoom-in-95 duration-200' : ''}`}>
      
      {/* Top Header */}
      <header className="flex px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-[#eae6e1] items-center justify-between relative z-40">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onOpenMobileHistory} 
            className="md:hidden flex items-center justify-center p-2 -ml-2 text-gray-700 hover:bg-black/5 rounded-full active:opacity-70 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* AI Model Selector Pill */}
          <div className="relative z-50">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#eae6e1] hover:border-gray-300 rounded-full text-[13px] font-semibold text-gray-800 shadow-2xs cursor-pointer transition-all active:scale-95"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-[#7c3aed] to-[#5c53e5] rounded-md flex items-center justify-center shadow-xs shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span className="font-bold tracking-tight text-gray-900">{selectedModel}</span>
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
                  {modelsList.map((model) => {
                    const isClickable = model === 'WSM 1.6 Mercúrio' || model === 'WSM 1.6 Marte';
                    if (!isClickable) return null;
                    const isActive = selectedModel === model;
                    return (
                      <button
                        key={model}
                        disabled={!isClickable}
                        onClick={() => {
                          if (isClickable) {
                            setSelectedModel(model);
                            setIsModelDropdownOpen(false);
                          }
                        }}
                        className={`w-full flex flex-col gap-0.5 px-3 py-2 text-left rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-[#f0ede8] text-gray-900 font-semibold' 
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                            <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[#5c53e5]' : 'bg-transparent'}`} />
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
                        <p className="text-[11px] text-gray-400 pl-2 leading-tight font-normal">
                          {modelDescriptions[model]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <span className="w-1 h-1 bg-emerald-500 rounded-full inline-block animate-ping" />
            Ativo
          </span>
        </div>

        {/* Options Button / 3-dots menu */}
        {messages.length === 0 ? (
          <button
            id="btn-back-home"
            onClick={onBackToHome}
            className="text-[11px] font-bold text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-[#eae6e1] px-3 py-1 rounded-full transition-all cursor-pointer active:scale-95 animate-in fade-in duration-200"
          >
            Nova conversa
          </button>
        ) : (
          <div className="relative">
            <button
              id="btn-chat-options"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-[#eae6e1] dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all cursor-pointer flex items-center justify-center"
              title="Opções do chat"
            >
              <MoreVertical size={16} />
            </button>
            
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-[#eae6e1] dark:border-gray-800 rounded-2xl shadow-lg py-1.5 z-30 font-sans select-none animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onBackToHome();
                    }}
                    className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-gray-400" />
                    <span>Nova conversa</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleExportConversation();
                    }}
                    className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                    <span>Exportar conversa (Markdown)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsReportModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Flag className="w-4 h-4 text-gray-400" />
                    <span>Denunciar chat</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsRateModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Star className="w-4 h-4 text-gray-400" />
                    <span>Avaliar chat (Estrelas)</span>
                  </button>

                  <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (confirm('Tem certeza de que deseja excluir este chat permanentemente?')) {
                        onDeleteSession?.();
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition-colors font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Excluir chat</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Message List */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <div
                key={message.id}
                id={`msg-container-${message.id}`}
                className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI Avatar */}
                {!isUser && (
                  message.text === "" && isThinking && message.id === messages[messages.length - 1]?.id ? (
                    <UiverseLoader isThinking={true} />
                  ) : (
                    <UiverseLoader isThinking={false} />
                  )
                )}

                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  {/* Bubble content */}
                  {!(message.text === "" && isThinking && message.id === messages[messages.length - 1]?.id) && (
                    <div
                      className={`rounded-xl px-3.5 py-2 text-[13.5px] leading-relaxed w-full ${
                        isUser
                          ? 'bg-[#f3f0ec] text-gray-800 shadow-[0_1px_1.5px_rgba(0,0,0,0.01)] border border-[#eae6e1]'
                          : 'text-gray-800'
                      }`}
                    >
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-3 select-none pb-1">
                        {message.attachments.map((file, idx) => {
                          const getExt = (name: string, type: string) => {
                            const parts = name.split('.');
                            if (parts.length > 1) {
                              const ext = parts[parts.length - 1].toUpperCase();
                              if (ext.length <= 4) return ext;
                            }
                            return type.toUpperCase();
                          };

                          return (
                            <div key={idx} className="shrink-0">
                              {file.type === 'image' || file.type === 'video' ? (
                                <div className="w-20 h-20 rounded-xl overflow-hidden relative shadow-xs bg-gray-100 dark:bg-gray-800">
                                  {file.type === 'image' ? (
                                    <button 
                                      type="button"
                                      onClick={() => setLightboxImage(file.url)}
                                      className="w-full h-full block focus:outline-none"
                                      title="Expandir imagem"
                                    >
                                      <img 
                                        src={file.url} 
                                        alt={file.name} 
                                        className="w-full h-full object-cover transition-opacity hover:opacity-95" 
                                      />
                                    </button>
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isUser && editingMessageId === message.id ? (
                      <div className="w-full flex flex-col gap-2 min-w-[250px]">
                        <textarea 
                          value={editInputValue}
                          onChange={(e) => setEditInputValue(e.target.value)}
                          className="w-full text-[13.5px] p-2 border border-[#eae6e1] rounded-lg bg-white resize-none outline-none focus:border-[#5c53e5] min-h-[60px]"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingMessageId(null)} className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded transition-colors border border-[#eae6e1]">Cancelar</button>
                          <button onClick={() => {
                             onEditMessage?.(message.id, editInputValue);
                             setEditingMessageId(null);
                          }} className="text-xs px-2 py-1 bg-[#5c53e5] text-white rounded hover:bg-[#4b43c6] transition-colors">Confirmar</button>
                        </div>
                      </div>
                    ) : message.isSearchMessage ? (
                      <SearchMessageView
                        message={message}
                        title={title}
                        setLightboxImage={setLightboxImage}
                        onSimulationComplete={() => {
                          onSearchSimulationComplete?.(message.id);
                          scrollToBottom('smooth');
                        }}
                        onStepChange={() => {
                          scrollToBottom('smooth');
                        }}
                        onOpenSources={(sources, query, count) => {
                          setDrawerSources({ sources, query, count });
                        }}
                      />
                    ) : (
                      <>
                        {/* Tavily Search Images Carousel */}
                        {message.searchImages && message.searchImages.length > 0 && (() => {
                          const displayableImages = message.searchImages.filter(img => {
                            try {
                              if (!img.startsWith("http://") && !img.startsWith("https://")) return false;
                              const lower = img.toLowerCase();
                              if (
                                lower.includes("instagram.com") ||
                                lower.includes("facebook.com") ||
                                lower.includes("twitter.com") ||
                                lower.includes("x.com") ||
                                lower.includes("tiktok.com") ||
                                lower.includes("youtube.com") ||
                                lower.includes("vimeo.com")
                              ) {
                                return false;
                              }
                              return true;
                            } catch {
                              return false;
                            }
                          });

                          if (displayableImages.length === 0) return null;

                          return (
                            <div className="mb-3 flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 select-none max-w-full">
                              {displayableImages.map((imgUrl, imgIdx) => (
                                <button
                                  key={imgIdx}
                                  type="button"
                                  onClick={() => setLightboxImage(imgUrl)}
                                  className="relative h-24 w-36 rounded-lg overflow-hidden border border-gray-150 shadow-xxs shrink-0 bg-gray-50 hover:opacity-90 transition-opacity cursor-pointer group"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Busca ${imgIdx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ZoomIn className="w-4.5 h-4.5 text-white filter drop-shadow-xs" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Render rich formats if present */}
                        {message.text === "" && isThinking && message.id === messages[messages.length - 1].id ? (
                          <div className="flex items-center gap-2 text-gray-500 text-xs py-1">
                            <span className="font-medium animate-pulse">Gerando resposta...</span>
                            <span className="flex gap-0.5 items-center">
                              <span className="w-1 h-1 bg-[#5c53e5] rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1 h-1 bg-[#5c53e5] rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1 h-1 bg-[#5c53e5] rounded-full animate-bounce" />
                            </span>
                          </div>
                        ) : message.text === "Você cancelou essa resposta" ? (
                          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm font-medium flex items-center gap-2 w-fit">
                            <XCircle className="w-4.5 h-4.5 shrink-0" />
                            <span>Você cancelou essa resposta</span>
                          </div>
                        ) : isUser ? (
                          <div className="prose max-w-none text-[14px] text-gray-800 w-full whitespace-pre-wrap">
                            {displayUserText(message.text)}
                          </div>
                        ) : (
                          <div className="prose max-w-none text-[14px] text-gray-800 w-full">
                            <TypewriterMarkdown
                              content={cleanWriterUpdateTags(message.text)}
                              enabled={!processedMessageIdsRef.current.has(message.id)}
                              onComplete={() => handleTypewriterComplete(message.id)}
                            />
                            {(() => {
                              const { docObj } = extractWsmDoc(extractWsmForm(message.text).cleanText);
                              if (docObj) {
                                return <DocumentCard document={docObj} />;
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </>
                    )}

                    {/* Table Render */}
                    {message.tableData && (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-gray-150 shadow-xxs">
                        <table className="min-w-full divide-y divide-gray-150 bg-white">
                          <thead className="bg-[#fcfbfa]">
                            <tr>
                              {message.tableData.headers.map((header, i) => (
                                <th
                                  key={i}
                                  className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 text-[11px]">
                            {message.tableData.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50 transition-colors">
                                {row.map((cell, j) => (
                                  <td
                                    key={j}
                                    className="px-3 py-1.5 font-medium text-gray-600"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Image Render */}
                    {message.imageUrl === 'cyberpunk_city' && renderCyberpunkCityIllustration()}

                    {/* Translation Render */}
                    {message.translationData && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-150">
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {message.translationData.sourceLang}
                          </div>
                          <p className="text-gray-600 italic text-[12px]">
                            "{message.translationData.original}"
                          </p>
                        </div>
                        <div className="bg-[#5c53e5]/5 p-3 rounded-lg border border-[#5c53e5]/10">
                          <div className="text-[9px] font-bold text-[#5c53e5] uppercase tracking-wider mb-1">
                            {message.translationData.targetLang}
                          </div>
                          <p className="text-gray-800 font-medium text-[12px]">
                            "{message.translationData.translated}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Code Block Render */}
                    {message.codeBlock && (
                      <div className="mt-3 bg-gray-900 rounded-lg overflow-hidden shadow-xs w-full max-w-xl border border-gray-800">
                        <div className="bg-gray-950 px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-400">
                          <span className="font-mono text-gray-500">
                            {message.codeBlock.language}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(message.codeBlock!.code, message.id)
                            }
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 overflow-x-auto text-[11px] text-gray-200 font-mono leading-relaxed bg-gray-900/40">
                          <code>{message.codeBlock.code}</code>
                        </pre>
                      </div>
                    )}

                    {/* Tavily Search Sources Pill footer */}
                    {!message.isSearchMessage && message.searchSources && message.searchSources.length > 0 && (
                      <div className="mt-3.5 pt-2 border-t border-gray-150 flex items-center justify-start">
                        {(() => {
                          const uniqueSources: { hostname: string; title: string; url: string; snippet?: string }[] = [];
                          message.searchSources.forEach(src => {
                            let hostname = '';
                            try {
                              hostname = new URL(src.url).hostname.replace('www.', '');
                            } catch {
                              hostname = src.title;
                            }
                            if (!uniqueSources.some(s => s.url === src.url)) {
                              uniqueSources.push({ hostname, title: src.title, url: src.url, snippet: src.snippet });
                            }
                          });

                          const count = uniqueSources.length;
                          const previewSources = uniqueSources.slice(0, 3);

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                const idx = messages.findIndex(m => m.id === message.id);
                                let userQuery = title || "busca";
                                if (idx > 0) {
                                  for (let i = idx - 1; i >= 0; i--) {
                                    if (messages[i].sender === 'user') {
                                      userQuery = messages[i].text;
                                      break;
                                    }
                                  }
                                }
                                setDrawerSources({ sources: uniqueSources, query: userQuery, count });
                              }}
                              className="flex items-center gap-2 px-2.5 py-1 bg-white hover:bg-[#f0ede8] border border-[#eae6e1] rounded-full text-xs font-semibold transition-all shadow-3xs cursor-pointer select-none active:scale-95"
                            >
                              {/* Overlapping Favicons */}
                              <div className="flex items-center -space-x-1.5">
                                {previewSources.map((src, pIdx) => {
                                  const favUrl = `https://www.google.com/s2/favicons?domain=${src.hostname}&sz=32`;
                                  return (
                                    <div 
                                      key={pIdx} 
                                      className="w-4.5 h-4.5 rounded-full border border-white bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-3xs"
                                    >
                                      <img
                                        src={favUrl}
                                        alt=""
                                        className="w-3 h-3 rounded-full object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
                                        }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-[#5c53e5] font-semibold text-[11.5px] pr-0.5">{count} {count === 1 ? 'fonte' : 'fontes'}</span>
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  )}
                  
                  {!(message.text === "" && isThinking && message.id === messages[messages.length - 1]?.id) && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[9px] text-gray-400">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {isUser && !editingMessageId && (
                        <div className="flex items-center justify-end gap-1.5 ml-1">
                          <button onClick={() => copyToClipboard(cleanWriterUpdateTags(message.text), message.id)} className="text-gray-400 hover:text-gray-600 p-0.5" title="Copiar">
                            {copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          <button onClick={() => { setEditingMessageId(message.id); setEditInputValue(displayUserText(message.text)); }} className="text-gray-400 hover:text-blue-600 p-0.5" title="Editar">
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}

                      {!isUser && (
                        <div className="flex items-center justify-start gap-1.5 ml-1">
                          <button onClick={() => copyToClipboard(cleanWriterUpdateTags(message.text), message.id)} className="text-gray-400 hover:text-gray-600 p-0.5" title="Copiar">
                            {copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          <button onClick={() => handleEvaluate(message.id, 'up')} className={`p-0.5 transition-colors ${evaluations[message.id] === 'up' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`} title="Boa resposta">
                            <ThumbsUp size={12} />
                          </button>
                          <button onClick={() => handleEvaluate(message.id, 'down')} className={`p-0.5 transition-colors ${evaluations[message.id] === 'down' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`} title="Resposta ruim">
                            <ThumbsDown size={12} />
                          </button>
                          {message.id === messages[messages.length - 1]?.id && !isThinking && (
                            <button
                              onClick={() => {
                                const lastUser = [...messages].reverse().find(m => m.sender === 'user');
                                if (lastUser) {
                                  onEditMessage?.(lastUser.id, lastUser.text);
                                }
                              }}
                              className="text-gray-400 hover:text-[#5c53e5] p-0.5"
                              title="Tentar novamente"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}



          {/* Spacing at the bottom of the container */}
          <div className="h-24 md:h-14" />
          {/* Empty scroll target */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Area */}
      <footer className="p-0 md:p-3 bg-transparent md:bg-white border-none md:border-t border-[#eae6e1] relative z-10 flex flex-col items-center pb-4 md:pb-3">
        {activeForm && (
          <div className="w-full max-w-xl mx-auto z-20">
            <InteractiveForm 
              form={activeForm} 
              onSubmit={(resp) => onSendMessage(resp, false)} 
              onCancel={() => {
                // If they cancel, we could clear it, but typing a message naturally dismisses it.
                // We'll just let them type.
                const textarea = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
                textarea?.focus();
              }}
            />
          </div>
        )}
        {attachedText && (
          <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-2 bg-blue-50/75 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-800 mb-2 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="font-bold shrink-0">Texto anexado:</span>
              <span className="truncate italic font-medium text-blue-900">"{attachedText}"</span>
            </div>
            <button
              type="button"
              onClick={onClearAttachedText}
              className="p-1 hover:bg-blue-100 rounded-lg text-blue-500 hover:text-blue-700 transition-colors cursor-pointer shrink-0"
              title="Limpar anexo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="w-[calc(100%-2rem)] md:w-full md:max-w-xl mx-auto bg-white border border-[#eae6e1] md:rounded-xl rounded-[28px] shadow-lg md:shadow-[0_1px_8px_rgba(0,0,0,0.01)] p-3 md:p-2 focus-within:border-[#5c53e5]/50 focus-within:ring-1 focus-within:ring-[#5c53e5]/15 transition-all duration-200 absolute bottom-3 md:relative z-50 mb-0 left-4"
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

          {/* Attachments horizontal list */}
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

          {/* Textarea */}
          <textarea
            id="chat-input-textarea-floating"
            rows={1}
            value={inputValue}
            onChange={handleInputValueChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Pergunte ao ${selectedModel}...`}
            className="w-full bg-transparent outline-none resize-none text-gray-800 placeholder-gray-400 text-[13.5px] leading-relaxed pb-1 max-h-24"
          />

          {/* Bottom Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            {/* Left Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAttachClick}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Anexar arquivo"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  isSearchEnabled
                    ? 'bg-[#5c53e5]/10 text-[#5c53e5] border border-[#5c53e5]/15'
                    : 'bg-[#eae7e2] text-gray-700 hover:bg-[#e1ded9]'
                }`}
                title="Ativar busca web"
              >
                <Globe className={`w-3 h-3 ${isSearchEnabled ? 'text-[#5c53e5] animate-spin-slow' : 'text-gray-500'}`} />
                <span>Pesquisar</span>
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title={isListening ? "Parar gravação" : "Voz"}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {inputValue.length >= 1300 && (
                <span className={`text-[10px] font-medium ${inputValue.length > 1500 ? 'text-red-500' : 'text-gray-400'} flex items-center`}>
                  {inputValue.length} / 1500
                </span>
              )}

              <button
                type={isThinking ? "button" : "submit"}
                onClick={(e) => {
                  if (isThinking) {
                    onCancelGeneration?.();
                  } else {
                    handleSubmit(e);
                  }
                }}
                onMouseDown={(e) => {
                  if (!isThinking) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                onTouchStart={(e) => {
                  if (!isThinking) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={((!inputValue.trim() && !attachedText && attachments.length === 0) || inputValue.length > 1500) && !isThinking}
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all ${
                  isThinking
                    ? 'bg-[#ff4d4d] hover:bg-[#ff3333] cursor-pointer'
                    : ((inputValue.trim() || attachedText || attachments.length > 0) && inputValue.length <= 1500)
                    ? 'bg-[#1f1e1d] text-white hover:bg-[#343230] cursor-pointer'
                    : 'bg-[#faf9f6] text-gray-300 border border-[#eae6e1]'
                }`}
              >
                {isThinking ? (
                  <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                )}
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
              className="absolute inset-0 bg-[#fbfbfa]/95 border-2 border-dashed border-[#5c53e5] rounded-[28px] md:rounded-xl z-50 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-150 pointer-events-none"
            >
              <Paperclip className="w-6 h-6 text-[#5c53e5] animate-bounce" />
              <span className="text-xs font-semibold text-[#5c53e5]">Solte os arquivos aqui</span>
            </div>
          )}
        </form>
        <div className="hidden md:block text-[9px] text-center text-gray-400 font-medium pt-1.5 select-none">
          {selectedModel} pode cometer erros. Verifique informações importantes.
        </div>
      </footer>

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

      {/* Sliding Lateral Sources Drawer */}
      {drawerSources && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-black/15 backdrop-blur-3xs z-40 transition-opacity animate-fade-in"
            onClick={() => setDrawerSources(null)}
          />

          {/* Drawer Panel */}
          <div 
            className="absolute top-0 right-0 h-full w-full sm:w-[380px] bg-white border-l border-[#eae6e1] shadow-2xl z-50 flex flex-col animate-slide-in"
            style={{
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.05)'
            }}
          >
            {/* Header (X Close, Chevrons left, Title) */}
            <div className="px-4 py-3.5 border-b border-[#eae6e1] flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setDrawerSources(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <button 
                type="button"
                onClick={() => setDrawerSources(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors cursor-pointer -ml-1"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-[15px] text-gray-800">
                {drawerSources.count} {drawerSources.count === 1 ? 'fonte' : 'fontes'}
              </span>
            </div>

            {/* Query Subtitle */}
            <div className="px-5 py-3 bg-[#faf9f6] border-b border-[#eae6e1]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Fontes para
              </span>
              <p className="text-[12px] text-gray-600 font-medium line-clamp-2 italic">
                "{drawerSources.query}"
              </p>
            </div>

            {/* Sources List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-gray-200">
              {drawerSources.sources.map((src, idx) => {
                const favUrl = `https://www.google.com/s2/favicons?domain=${src.hostname}&sz=32`;
                return (
                  <div 
                    key={idx} 
                    className="p-3.5 bg-white border border-[#eae6e1] hover:border-gray-300 rounded-xl transition-all hover:shadow-2xs group"
                  >
                    {/* Header (Favicon + Hostname) */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <img
                        src={favUrl}
                        alt=""
                        className="w-4 h-4 rounded-full object-contain bg-white shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
                        }}
                      />
                      <span className="text-[11px] font-semibold text-gray-400 truncate">
                        {src.hostname}
                      </span>
                    </div>

                    {/* Title */}
                    <a 
                      href={src.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-bold text-[13px] text-gray-900 group-hover:text-[#5c53e5] leading-snug transition-colors line-clamp-2 block mb-1.5 hover:underline"
                    >
                      {src.title}
                    </a>

                    {/* Excerpt/Snippet */}
                    {src.snippet ? (
                      <p className="text-[11.5px] text-gray-500 leading-relaxed line-clamp-3">
                        {src.snippet}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">
                        Nenhum trecho de texto disponível para esta fonte.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 select-none animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button in the corner */}
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all cursor-pointer border border-white/10 shadow-lg active:scale-95"
            title="Fechar Visualização"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Centered Image */}
          <div 
            className="relative max-w-full max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking the image itself
          >
            <img
              src={lightboxImage}
              alt="Visualização em Tela Cheia"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/5 animate-scale-up"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bottom helper text */}
          <div className="mt-4 text-xs font-semibold text-gray-400 tracking-wide">
            Clique em qualquer lugar ou no botão de fechar para voltar ao chat
          </div>
        </div>
      )}

      {/* Modal de Denúncia */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-[#eae6e1] dark:border-gray-800 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#eae6e1] dark:border-gray-800 pb-3">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-base">
                <Flag className="w-5 h-5 text-red-500 fill-red-500/10" />
                <span>Denunciar este chat</span>
              </h3>
              <button 
                onClick={() => setIsReportModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Encontrou algo incorreto ou impróprio que a IA falou? Descreva abaixo o problema para que possamos analisar a resposta.
            </p>

            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Descreva o erro ou problema com detalhes aqui..."
              className="w-full text-[13.5px] p-3 border border-[#eae6e1] dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 resize-none outline-none focus:border-red-500 min-h-[110px]"
            />

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-xs font-bold px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors border border-[#eae6e1] dark:border-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSendReport(reportText)}
                disabled={!reportText.trim()}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors text-white ${
                  reportText.trim() ? 'bg-red-600 hover:bg-red-700 cursor-pointer' : 'bg-red-300 dark:bg-red-900/40 cursor-not-allowed'
                }`}
              >
                Enviar Denúncia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação em Estrelas */}
      {isRateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-[#eae6e1] dark:border-gray-800 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#eae6e1] dark:border-gray-800 pb-3">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-base">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500/15" />
                <span>Avaliar este chat</span>
              </h3>
              <button 
                onClick={() => setIsRateModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed text-center">
              Como foi sua experiência de conversa com o **{selectedModel}** neste chat?
            </p>

            {/* Estrelas */}
            <div className="flex items-center justify-center gap-2.5 my-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  className="p-1 hover:scale-110 active:scale-95 transition-all text-amber-400 hover:text-amber-500 cursor-pointer"
                >
                  <Star 
                    className="w-8 h-8" 
                    fill={star <= ratingStars ? 'currentColor' : 'none'} 
                    stroke="currentColor" 
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Opcional: Escreva um feedback ou comentário aqui..."
              className="w-full text-[13.5px] p-3 border border-[#eae6e1] dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 resize-none outline-none focus:border-amber-500 min-h-[90px]"
            />

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="text-xs font-bold px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors border border-[#eae6e1] dark:border-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSendRating(ratingStars, ratingComment)}
                className="text-xs font-bold px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors cursor-pointer"
              >
                Enviar Avaliação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
