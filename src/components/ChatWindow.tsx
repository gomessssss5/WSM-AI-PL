import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, Globe, Mic, ArrowUp, Sparkles, Copy, Check, ChevronDown, ChevronUp, ChevronRight, Brain, Lock, Download, ZoomIn, X, ChevronsLeft, XCircle, Calculator, Clock, ThumbsUp, ThumbsDown, Edit2, MoreVertical, Plus, Flag, Star, Trash2, Video, Volume2, FileText, AlertCircle, AlertTriangle, Image as ImageIcon, Menu, RotateCcw, CheckCircle2, Circle, Loader2, FileCode2, BookOpen, MessageCircleDashed, Share } from 'lucide-react';
import { Skill } from '../lib/skills';
import { Message, Draft } from '../types';
import { saveEvaluationToDb } from '../lib/chatService';
import MarkdownRenderer from './MarkdownRenderer';
import SearchMessageView from './SearchMessageView';
import TypewriterMarkdown from './TypewriterMarkdown';
import { ReasoningBlock } from './ReasoningBlock';
import InteractiveForm from './InteractiveForm';
import DocumentCard from './DocumentCard';
import ScheduledTaskCard from './ScheduledTaskCard';
import PacmanLoadingAnimation from './PacmanLoadingAnimation';
import { extractWsmForm } from '../utils/formParser';
import { extractWsmDoc } from '../utils/docParser';
import { extractWsmTask, extractWsmTasks, cleanWsmTaskTags } from '../utils/taskParser';
import { extractRaciocinio, cleanRaciocinioTags } from '../utils/raciocinioParser';
import { SearchImageCarousel } from './SearchImageCarousel';

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

const cleanTaskTags = (text: string) => {
  if (!text) return "";
  let clean = cleanWsmTaskTags(text);
  clean = clean.replace(/<task>[\s\S]*?<\/task>/g, "");
  if (clean.includes('<task>')) {
    const idx = clean.indexOf('<task>');
    clean = clean.slice(0, idx);
  }
  
  return clean.trim();
};

const cleanSkillTags = (text: string) => {
  if (!text) return "";
  let clean = text;
  
  // Clean [Lendo Skill: ...] tags
  clean = clean.replace(/\[Lendo Skill:\s*(.*?)\]/gi, "");

  // Clean wsm_skill_content
  clean = clean.replace(/<wsm_skill_content>[\s\S]*?<\/wsm_skill_content>/gi, "");
  if (clean.includes('<wsm_skill_content>')) {
    const idx = clean.toLowerCase().indexOf('<wsm_skill_content>');
    clean = clean.slice(0, idx);
  }
  
  // Clean skill_content
  clean = clean.replace(/<skill_content>[\s\S]*?<\/skill_content>/gi, "");
  if (clean.includes('<skill_content>')) {
    const idx = clean.toLowerCase().indexOf('<skill_content>');
    clean = clean.slice(0, idx);
  }
  
  // Clean skill
  clean = clean.replace(/<skill>[\s\S]*?<\/skill>/gi, "");
  if (clean.includes('<skill>')) {
    const idx = clean.toLowerCase().indexOf('<skill>');
    clean = clean.slice(0, idx);
  }
  
  return clean.trim();
};

interface TaskProgress {
  tasks: string[];
  activeIndex: number;
  completedCount: number;
  totalCount: number;
}

const getTaskProgress = (text: string): TaskProgress | null => {
  if (!text) return null;
  const taskStartIndex = text.indexOf('<task>');
  if (taskStartIndex === -1) return null;

  let taskBlock = '';
  const taskEndIndex = text.indexOf('</task>');
  if (taskEndIndex !== -1) {
    taskBlock = text.slice(taskStartIndex + 6, taskEndIndex);
  } else {
    taskBlock = text.slice(taskStartIndex + 6);
  }

  const lines = taskBlock.split('\n');
  let tasks = lines
    .map(line => {
      const m = line.match(/\[(.*?)\]/);
      return m ? m[1].trim() : null;
    })
    .filter(Boolean) as string[];

  if (tasks.length === 0) return null;

  const textAfterTask = taskEndIndex !== -1 ? text.slice(taskEndIndex + 7) : '';

  // Dynamic parsing of new tags
  const newTasksMatches = [...textAfterTask.matchAll(/\[nova tarefa:\s*([\s\S]*?)\]/gi)];
  const removedTasksMatches = [...textAfterTask.matchAll(/\[tarefa removida:\s*([\s\S]*?)\]/gi)];
  
  for (const match of newTasksMatches) {
    if (match[1]) tasks.push(match[1].trim());
  }
  
  for (const match of removedTasksMatches) {
     if (match[1]) {
        const toRemove = match[1].trim().toLowerCase();
        tasks = tasks.filter(t => !t.toLowerCase().includes(toRemove));
     }
  }

  if (tasks.length === 0) return null;

  const stepCompletions = (textAfterTask.match(/\[passo concluído\]/gi) || []).length;
  
  const legacySearchCompletions = (textAfterTask.match(/\[pesquisou na web\]/g) || []).length;
  const legacyCalcCompletions = (textAfterTask.match(/\[calculando\]/g) || []).length;
  const legacyClockCompletions = (textAfterTask.match(/\[verificando relógio\]/g) || []).length;
  const legacyDebugCompletions = (textAfterTask.match(/\[código 100% verificado: sem erros\]/gi) || []).length;
  const legacyCompletions = legacySearchCompletions + legacyCalcCompletions + legacyClockCompletions + legacyDebugCompletions;

  let activeIndex = Math.max(stepCompletions, legacyCompletions);

  // We allow activeIndex to go up to tasks.length, which means ALL tasks are completed.
  activeIndex = Math.min(tasks.length, activeIndex);

  return {
    tasks,
    activeIndex,
    completedCount: activeIndex,
    totalCount: tasks.length
  };
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
  reasoningLevel?: string;
  setReasoningLevel?: (level: string) => void;
  onSearchSimulationComplete?: (messageId: string) => void;
  onCancelGeneration?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteSession?: () => void;
  onShareSession?: () => void;
  isEmbedded?: boolean;
  attachedText?: string;
  onClearAttachedText?: () => void;
  onOpenMobileHistory?: () => void;
  initialDraft?: Draft;
  onSaveDraft?: (draft: Partial<Draft>) => void;
  onDeleteDraft?: () => void;
  skills?: Skill[];
  onOpenStore?: () => void;
  onSaveTask?: (task: any) => void;
  onOpenScheduledTasks?: () => void;
  onStartTemporaryChat?: () => void;
  isTemporary?: boolean;
  isScheduled?: boolean;
  onOpenUpdateModal?: () => void;
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
  reasoningLevel = 'Mínimo',
  setReasoningLevel,
  onSearchSimulationComplete,
  onCancelGeneration,
  onEditMessage,
  onDeleteSession,
  onShareSession,
  isEmbedded = false,
  attachedText = '',
  onClearAttachedText,
  onOpenMobileHistory,
  initialDraft,
  onSaveDraft,
  onDeleteDraft,
  skills = [],
  onOpenStore,
  onSaveTask,
  onOpenScheduledTasks,
  onStartTemporaryChat,
  isTemporary = false,
  isScheduled = false,
  onOpenUpdateModal
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isEffortDropdownOpen, setIsEffortDropdownOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isTasksExpanded, setIsTasksExpanded] = useState(true);
  const [completedReasoningMsgIds, setCompletedReasoningMsgIds] = useState<Set<string>>(new Set());
  const [completedTypewriterMsgIds, setCompletedTypewriterMsgIds] = useState<Set<string>>(new Set());

  const lastVisibleUserIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'user' && !messages[i].isHidden) {
        return i;
      }
    }
    return -1;
  })();

  useEffect(() => {
    if (isThinking) {
      setIsTasksExpanded(true);
    }
  }, [isThinking]);

  // Attachments States
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(42).fill(3));
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (final) {
            setInputValue(prev => {
              const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
              return prev + space + final;
            });
          }
          setInterimTranscript(interim);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
        };
        
        recognitionRef.current.onerror = (event: any) => {
           console.error("Speech recognition error", event.error);
           setIsListening(false);
           setInterimTranscript('');
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [setInputValue]);

  useEffect(() => {
    if (!isListening) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setAudioLevels(Array(42).fill(3));
      return;
    }

    let isMounted = true;
    const barCount = 42;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!isMounted) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let maxVal = 0;
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
          if (dataArray[i] > maxVal) maxVal = dataArray[i];
        }
        const avgVolume = sum / dataArray.length;
        
        // High sensitivity scaling so speaking normally or loudly produces tall, prominent bars
        const volumeRatio = Math.min(1, Math.max(0, (avgVolume - 2) / 18) * 2.2);
        const maxRatio = Math.min(1, maxVal / 100);
        const combinedVol = Math.max(volumeRatio, maxRatio);

        const newLevels = Array.from({ length: barCount }, (_, i) => {
          const distFromCenter = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const centerMultiplier = Math.cos(distFromCenter * (Math.PI / 2.3));
          
          const rawFreq = dataArray[i % dataArray.length] || 0;
          const freqRatio = Math.min(1, (rawFreq / 80) * 2.2);

          const baseHeight = 3;
          const maxHeight = 30;

          const wavePhase = Math.sin(Date.now() / 120 + i * 0.35) * 0.15;
          const activeVol = Math.min(1, combinedVol * 1.5 + wavePhase);

          const signalHeight = (freqRatio * 0.5 + activeVol * 0.5) * centerMultiplier * (maxHeight - baseHeight);
          const jitter = (Math.random() - 0.5) * 5 * activeVol;

          const h = baseHeight + signalHeight * (0.2 + activeVol * 0.8) + jitter;
          return Math.max(3, Math.min(maxHeight, h));
        });

        setAudioLevels(newLevels);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    }).catch(() => {
      let step = 0;
      const fallbackTimer = setInterval(() => {
        step += 0.2;
        const simulatedVol = 0.65 + Math.sin(step) * 0.35;
        setAudioLevels(Array.from({ length: barCount }, (_, i) => {
          const distFromCenter = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const centerMultiplier = Math.cos(distFromCenter * (Math.PI / 2.3));
          const baseHeight = 3;
          const maxHeight = 30;
          const wave = Math.sin(step * 2.5 + i * 0.35) * 0.5 + 0.5;
          const h = baseHeight + (wave * simulatedVol) * centerMultiplier * (maxHeight - baseHeight);
          return Math.max(3, Math.min(maxHeight, h));
        }));
      }, 50);
      return () => clearInterval(fallbackTimer);
    });

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [isListening]);

  const cancelRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  const confirmRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    if (isListening) {
      confirmRecording();
    } else {
      try {
        setInterimTranscript('');
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
      if (msg.isHidden) return;
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
  const [isSucking, setIsSucking] = useState(false);
  const [suckingFiles, setSuckingFiles] = useState<{ id: string; url: string; isImage: boolean; name: string }[]>([]);

  const processFiles = (fileList: File[]) => {
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
    if (items) {
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
        return;
      }
    }

    // Check if pasted text exceeds 5000 characters
    const pastedText = e.clipboardData?.getData('text/plain');
    if (pastedText && pastedText.length > 5000) {
      e.preventDefault();
      const isCode = /[{};()</>=\[\]]/.test(pastedText) || 
                     pastedText.includes('function') || 
                     pastedText.includes('import') || 
                     pastedText.includes('const') || 
                     pastedText.includes('class') || 
                     pastedText.includes('def ') || 
                     pastedText.includes('return');
      
      const fileName = isCode 
        ? `codigo_anexado_${Date.now().toString().slice(-4)}.txt` 
        : `texto_colado_${Date.now().toString().slice(-4)}.txt`;
      
      const file = new File([pastedText], fileName, { type: 'text/plain' });
      processFiles([file]);
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

      const tempFiles = droppedFiles.map((file) => {
        const isImage = file.type.startsWith('image/');
        return {
          id: Math.random().toString(36).substring(7),
          url: isImage ? URL.createObjectURL(file) : '',
          isImage,
          name: file.name
        };
      });

      setSuckingFiles(tempFiles);
      setIsSucking(true);

      setTimeout(() => {
        processFiles(droppedFiles);
        setIsSucking(false);
        tempFiles.forEach(tf => {
          if (tf.url) {
            URL.revokeObjectURL(tf.url);
          }
        });
        setSuckingFiles([]);
      }, 800);
    }
  };

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isSkillsSubMenuOpen, setIsSkillsSubMenuOpen] = useState(false);
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);

  const handleAttachClick = () => {
    setIsAttachMenuOpen(!isAttachMenuOpen);
    setIsSkillsSubMenuOpen(false);
  };

  const handleAttachFileDirectly = () => {
    fileInputRef.current?.click();
  };

  // Slash Menu State
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashSearchTerm, setSlashSearchTerm] = useState('');
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [isSkillsHovered, setIsSkillsHovered] = useState(false);
  const skillsTimeoutRef = useRef<any>(null);

  const handleSkillsMouseEnter = () => {
    if (skillsTimeoutRef.current) clearTimeout(skillsTimeoutRef.current);
    setIsSkillsHovered(true);
  };

  const handleSkillsMouseLeave = () => {
    if (skillsTimeoutRef.current) clearTimeout(skillsTimeoutRef.current);
    skillsTimeoutRef.current = setTimeout(() => {
      setIsSkillsHovered(false);
    }, 400);
  };

  const marteTools = [
    { id: '/web', name: 'web-search', description: 'Pesquisa na Web', icon: Globe, color: 'text-blue-500' },
    { id: '/calculadora', name: 'calculadora', description: 'Calculadora Matemática', icon: Calculator, color: 'text-emerald-500' },
    { id: '/relogio', name: 'relogio', description: 'Relógio e Data Atual', icon: Clock, color: 'text-orange-500' },
    { id: '/gerar-imagem', name: 'gerar-imagem', description: 'Gerador de Imagens AI', icon: ImageIcon, color: 'text-purple-500' }
  ];

  const slashItems = [
    ...marteTools,
    ...skills.map(skill => ({
      id: `/${skill.id}`,
      name: skill.name,
      description: skill.description,
      icon: FileCode2,
      color: 'text-indigo-500',
      isSkill: true,
      skillObj: skill
    }))
  ];

  const filteredTools = slashItems.filter(item => item.id.toLowerCase().includes(slashSearchTerm.toLowerCase()));

  useEffect(() => {
    const textarea = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 220;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [inputValue]);

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

  const handleToolSelect = (item: any) => {
    const textarea = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
    const cursorPosition = textarea?.selectionStart || inputValue.length;
    
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const textAfterCursor = inputValue.slice(cursorPosition);
    
    const slashMatch = textBeforeCursor.match(/(^|\s)\/([a-zA-Z0-9-]*)$/);
    if (slashMatch) {
      const matchIndex = slashMatch.index !== undefined ? slashMatch.index : 0;
      const spaceBefore = slashMatch[1]; // either '' or ' '
      
      if (item.isSkill) {
        setActiveSkills(prev => {
          if (!prev.find(s => s.id === item.skillObj.id)) {
            return [...prev, item.skillObj];
          }
          return prev;
        });
        const newText = textBeforeCursor.slice(0, matchIndex) + spaceBefore + textAfterCursor;
        setInputValue(newText);
      } else {
        const newText = textBeforeCursor.slice(0, matchIndex) + spaceBefore + item.id + ' ' + textAfterCursor;
        setInputValue(newText);
      }
      
      setSlashMenuOpen(false);
      
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          const newPos = item.isSkill ? matchIndex + spaceBefore.length : matchIndex + spaceBefore.length + item.id.length + 1;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const processedTaskMessageIdsRef = useRef<Set<string>>(new Set());

  // Check for tasks
  useEffect(() => {
    if (!isThinking && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === 'ai' && !processedTaskMessageIdsRef.current.has(lastMsg.id)) {
        if (isScheduled) {
          // Do not re-schedule tasks from automated task execution sessions
          processedTaskMessageIdsRef.current.add(lastMsg.id);
          return;
        }

        const { raciocinio } = extractRaciocinio(lastMsg.text || "");
        const isHistorical = processedMessageIdsRef.current.has(lastMsg.id);
        const isReasoningDone = !raciocinio || isHistorical || completedReasoningMsgIds.has(lastMsg.id);
        const isTypewriterDone = isHistorical || completedTypewriterMsgIds.has(lastMsg.id);

        if (!isReasoningDone || !isTypewriterDone) return;

        const textToParse = lastMsg.finalSynthesis || lastMsg.text || "";
        const { taskObjs } = extractWsmTasks(textToParse);
        
        if (taskObjs && taskObjs.length > 0) {
          processedTaskMessageIdsRef.current.add(lastMsg.id);
          
          taskObjs.forEach(taskObj => {
            if (taskObj && taskObj.title && taskObj.prompt && taskObj.scheduleType && taskObj.time) {
              let nextRun = new Date();
              const [hours, minutes] = taskObj.time.split(':').map(Number);
              if (!isNaN(hours) && !isNaN(minutes)) {
                nextRun.setHours(hours, minutes, 0, 0);
                if (nextRun.getTime() < Date.now()) {
                  nextRun.setDate(nextRun.getDate() + 1);
                }
              }

              let taskDate = taskObj.date;
              if (taskObj.scheduleType === 'once' && !taskDate) {
                const yyyy = nextRun.getFullYear();
                const mm = String(nextRun.getMonth() + 1).padStart(2, '0');
                const dd = String(nextRun.getDate()).padStart(2, '0');
                taskDate = `${yyyy}-${mm}-${dd}`;
              }

              if (onSaveTask) {
                onSaveTask({
                  id: crypto.randomUUID(),
                  title: taskObj.title,
                  prompt: taskObj.prompt,
                  scheduleType: taskObj.scheduleType,
                  time: taskObj.time,
                  date: taskDate,
                  daysOfWeek: taskObj.daysOfWeek,
                  dayOfMonth: taskObj.dayOfMonth,
                  isActive: true,
                  createdAt: new Date(),
                  nextRunAt: nextRun
                });
              }
            }
          });
        }
      }
    }
  }, [messages, isThinking, onSaveTask, completedReasoningMsgIds, completedTypewriterMsgIds]);

  // Typewriter tracking logic to avoid re-triggering for historical messages
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (isInitialMountRef.current && messages.length > 0) {
      messages.forEach((m) => {
        // Only mark as processed if it's a historical message with actual text or final synthesis
        if (m.sender === 'ai' && (m.text || m.finalSynthesis)) {
          processedMessageIdsRef.current.add(m.id);
        }
      });
      isInitialMountRef.current = false;
    }
  }, [messages]);

  const handleTypewriterComplete = (messageId: string) => {
    processedMessageIdsRef.current.add(messageId);
    setCompletedTypewriterMsgIds(prev => new Set(prev).add(messageId));
    scrollToBottom('smooth');
  };

  const modelsList = [
    'WSM 1.6 Flash',
    'WSM 1.6 Pro'
  ];

  const modelDescriptions: Record<string, string> = {
    'WSM 1.6 Flash': 'Para uso do dia-a-dia',
    'WSM 1.6 Pro': 'Para tarefas complexas'
  };

  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
      isUserScrollingRef.current = isScrolledUp;
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (isUserScrollingRef.current) return;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesContainerRef.current) {
        // If we are getting called rapidly (e.g. streaming), smooth scroll can cause bouncing.
        // We will use auto if the distance is small, or just trust 'auto' for stream updates.
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'auto'
        });
      }
    }, 50);
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, isThinking]);

  // Auto-focus input on mount, when thinking stops, when switching conversations, or when sending/receiving messages
  useEffect(() => {
    const timer = setTimeout(() => {
      const textarea = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isThinking, title, messages.length]);

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    
    const textarea = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
    const currentText = textarea ? textarea.value : inputValue;
    
    if (!currentText.trim() && !attachedText && attachments.length === 0 && activeSkills.length === 0) return;
    if (currentText.length > 5000) return;
    
    let textToSend = '';
    if (attachedText && currentText.trim()) {
      textToSend = `[Texto Anexado do Editor:\n"${attachedText}"]\n\n${currentText}`;
    } else if (attachedText) {
      textToSend = `[Texto Anexado do Editor:\n"${attachedText}"]\n\nPor favor, analise ou revise o texto anexado acima.`;
    } else {
      textToSend = currentText;
    }

    if (activeSkills.length > 0) {
      const skillsText = activeSkills.map(s => '/' + s.name).join(', ');
      textToSend = `[Utilize as seguintes skills: ${skillsText}]\n\n${textToSend}`;
    }
    
    if (onDeleteDraft) onDeleteDraft();
    onSendMessage(textToSend, isSearchEnabled, undefined, attachments);
    
    // Synchronously clear the DOM value to prevent race conditions during rapid consecutive sends
    if (textarea) {
      textarea.value = '';
      textarea.focus();
    }
    setInputValue('');
    setAttachments([]);
    setUploadError(null);
    setActiveSkills([]);
    setIsSearchEnabled(false);
    setSlashMenuOpen(false);
    if (onClearAttachedText) {
      onClearAttachedText();
    }
    setTimeout(() => {
      const ta = document.getElementById('chat-input-textarea-floating') as HTMLTextAreaElement;
      if (ta) {
        ta.focus();
      }
    }, 50);
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
        handleToolSelect(filteredTools[slashMenuIndex]);
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

  const visibleMessages = messages.filter(m => !m.isHidden);
  let activeForm = null;
  for (let i = visibleMessages.length - 1; i >= 0; i--) {
    const m = visibleMessages[i];
    if (m.sender === 'user') {
      break; // User replied, so no form should be active anymore
    }
    if (m.sender === 'ai' && !m.isSimulatingSearch) {
      const { raciocinio } = extractRaciocinio(m.text || "");
      const isHistorical = processedMessageIdsRef.current.has(m.id);
      const isReasoningDone = !raciocinio || isHistorical || completedReasoningMsgIds.has(m.id);
      const isTypewriterDone = isHistorical || completedTypewriterMsgIds.has(m.id);

      if (!isReasoningDone || !isTypewriterDone) {
        break; // Wait until reasoning AND typewriter are finished
      }

      const textToParse = m.finalSynthesis || m.text || "";
      const { formObj } = extractWsmForm(textToParse);
      if (formObj) {
        activeForm = formObj;
        break; // Found the latest form
      }
    }
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
            {(() => {
              const hasMessages = messages && messages.length > 0;
              if (hasMessages) {
                return (
                  <div className="flex items-center px-1.5 py-1.5 text-[13px] font-extrabold text-gray-600 select-none tracking-tight">
                    {selectedModel === 'WSM 1.6 Pro' ? (
                      <>
                        <span className="font-extrabold text-gray-900">WSM 1.6 Pro</span>
                        {reasoningLevel !== 'Nenhum' && (
                          <span className="text-gray-400 font-normal ml-1">{reasoningLevel}</span>
                        )}
                      </>
                    ) : (
                      <span>{selectedModel}</span>
                    )}
                  </div>
                );
              }
              return (
                <button
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#eae6e1] rounded-full text-[13px] font-semibold text-gray-800 shadow-2xs hover:border-gray-300 cursor-pointer active:scale-95 transition-all"
                  title="Selecione o modelo"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-[#7c3aed] to-[#5c53e5] rounded-md flex items-center justify-center shadow-xs shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <span className="font-bold tracking-tight text-gray-900">
                    {selectedModel === 'WSM 1.6 Pro' ? 'WSM 1.6 Pro' : selectedModel}
                  </span>
                  {selectedModel === 'WSM 1.6 Pro' && reasoningLevel !== 'Nenhum' && (
                    <span className="text-gray-400 font-normal ml-0.5">{reasoningLevel}</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              );
            })()}

            {isModelDropdownOpen && (
              <>
                {/* Backdrop for mobile to close the selector when clicking outside */}
                <div 
                  className="fixed inset-0 bg-black/40 z-40 md:hidden" 
                  onClick={() => setIsModelDropdownOpen(false)} 
                />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:absolute md:inset-auto md:left-0 md:top-full md:mt-1.5 md:translate-y-0 w-auto max-w-[calc(100vw-2rem)] md:w-80 bg-white border border-gray-150 rounded-xl shadow-2xl md:shadow-lg z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
                  {modelsList.map((model) => {
                    const isClickable = model === 'WSM 1.6 Flash' || model === 'WSM 1.6 Pro';
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
                        </div>
                        <p className="text-[11px] text-gray-400 pl-2.5 leading-tight font-normal">
                          {modelDescriptions[model]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {isTemporary && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold rounded-full tracking-tight shadow-3xs select-none animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Chat Temporário
            </span>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 relative z-50">
          {/* Tag WSM 1.6.1 - Desktop Only */}
          <button
            onClick={onOpenUpdateModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50/25 border border-[#eae6e1] rounded-full text-xs font-bold text-gray-700 hover:text-indigo-600 transition-colors cursor-pointer shadow-3xs active:scale-95"
            title="Ver novidades da versão 1.6.1"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Atualização: WSM 1.6.1</span>
          </button>

          <button
            onClick={onStartTemporaryChat}
            disabled={isTemporary}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
              isTemporary 
                ? 'bg-amber-100/50 border-amber-200 text-amber-700 cursor-not-allowed opacity-80' 
                : 'bg-[#faf9f6] hover:bg-[#f0ede8] border-[#eae6e1] text-gray-700 hover:text-gray-900 shadow-2xs'
            }`}
            title={isTemporary ? "Você já está em um Chat temporário" : "Iniciar Chat temporário"}
          >
            <MessageCircleDashed className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Chat temporário</span>
          </button>

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
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onShareSession) onShareSession();
                    }}
                    className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Share className="w-4 h-4 text-gray-400" />
                    <span>Compartilhar chat</span>
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
        </div>
      </header>

      {/* Message List */}
      <div 
        ref={messagesContainerRef} 
        className={`flex-1 overflow-y-auto px-4 py-4 ${messages.length === 0 ? 'flex flex-col justify-center items-center' : 'space-y-4'}`}
      >
        {messages.length === 0 ? (
          isTemporary ? (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-md mx-auto flex flex-col items-center gap-5 select-none"
            >
              {/* Beautiful private/security icon or indicator */}
              <div className="relative flex items-center justify-center">
                {/* Outer animated halo ring */}
                <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" style={{ animationDuration: '3s' }} />
                
                {/* Icon Container */}
                <div className="w-16 h-16 bg-amber-50/90 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center shadow-md relative z-10">
                  <MessageCircleDashed className="w-8 h-8 animate-pulse" style={{ animationDuration: '4s' }} />
                </div>
              </div>

              {/* Central Title */}
              <div className="space-y-2">
                <h2 className="font-sans font-extrabold text-gray-900 tracking-tight text-3xl md:text-4xl">
                  Pergunte o que quiser
                </h2>
                <p className="font-sans font-medium text-amber-700/90 tracking-tight text-sm md:text-base flex items-center justify-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600 inline shrink-0" />
                  com 100% de privacidade
                </p>
              </div>

              <div className="text-[11.5px] text-gray-400 font-medium max-w-xs mt-1">
                Este chat é temporário. Nenhuma mensagem ou anexo será salvo no banco de dados ou histórico.
              </div>
            </motion.div>
          ) : null
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((message, index) => {
            if (message.isHidden) return null;
            const isUser = message.sender === 'user';
            return (
              <div
                key={message.id}
                id={`msg-container-${message.id}`}
                className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI Avatar */}
                {!isUser && (
                  !(message.text === "" && isThinking && message.id === messages[messages.length - 1]?.id) ? (
                    <UiverseLoader isThinking={false} />
                  ) : (
                    <div className="w-7 h-7 shrink-0" />
                  )
                )}

                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  {/* Bubble content */}
                  {true && (
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
                        {(() => {
                          const { cleanText, raciocinio, isFinished: isRaciocinioFinished } = extractRaciocinio(message.text);
                          const isCurrentlyGeneratingThisMsg = isThinking && message.id === messages[messages.length - 1]?.id;
                          const isHistorical = processedMessageIdsRef.current.has(message.id);
                          const isReasoningDone = !raciocinio || isHistorical || completedReasoningMsgIds.has(message.id);
                          const isTypewriterDone = isHistorical || completedTypewriterMsgIds.has(message.id);

                          return (
                            <>
                              {/* Tavily Search Images Carousel - only after typewriter completes */}
                              {isReasoningDone && isTypewriterDone && message.searchImages && message.searchImages.length > 0 && (
                                <SearchImageCarousel images={message.searchImages} onImageClick={setLightboxImage} />
                              )}

                              {/* Render rich formats if present */}
                              {message.text === "" && isThinking && message.id === messages[messages.length - 1].id ? (
                                <div className="flex items-center gap-2 text-gray-500 text-xs py-1">
                                  <PacmanLoadingAnimation />
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
                                  {/* 1. Reasoning Block */}
                                  {raciocinio && (
                                    <ReasoningBlock
                                      id={message.id}
                                      raciocinio={raciocinio}
                                      isReasoningFinished={isRaciocinioFinished || !isThinking}
                                      isHistorical={isHistorical}
                                      onSequenceComplete={() => {
                                        setCompletedReasoningMsgIds(prev => new Set(prev).add(message.id));
                                      }}
                                    />
                                  )}
                                  
                                  {/* 2. Skill reading banner - only after reasoning sequence completes */}
                                  {isReasoningDone && (() => {
                                    const match = /\[Lendo Skill:\s*(.*?)\]/i.exec(message.text);
                                    if (match) {
                                      const rawSkillName = match[1].replace(/\]/g, '').trim();
                                      return (
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-[13px] bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-150/50 dark:border-indigo-900/30 rounded-xl px-3.5 py-2 mb-3 w-fit select-none shadow-xxs">
                                          <BookOpen className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                                          <span>Lendo Skill: <strong className="font-semibold text-indigo-700 dark:text-indigo-300">{rawSkillName}</strong></span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* 3. Main AI Text response - only after reasoning sequence completes */}
                                  {isReasoningDone && (
                                    message.text.includes("WSM 1.6 está muito sobrecarregado") ? (
                                      <div className="bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-5 rounded-2xl flex items-start gap-3.5 shadow-xs my-1 animate-in fade-in duration-300">
                                        <AlertTriangle className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" size={20} />
                                        <div className="space-y-1">
                                          <p className="font-extrabold text-amber-900 dark:text-amber-100 text-[14px]">Alerta de Sobrecarga</p>
                                          <p className="text-[13px] text-amber-800 dark:text-amber-200 leading-relaxed font-semibold">
                                            WSM 1.6 está muito sobrecarregado agora. Tente novamente mais tarde.
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <TypewriterMarkdown
                                        content={cleanSkillTags(cleanTaskTags(cleanWriterUpdateTags(cleanRaciocinioTags(message.text))))}
                                        enabled={!isHistorical}
                                        onComplete={() => handleTypewriterComplete(message.id)}
                                      />
                                    )
                                  )}
                                  
                                  {/* 4. Document cards - only after reasoning AND typewriter complete */}
                                  {isReasoningDone && isTypewriterDone && (() => {
                                    const { docObjs } = extractWsmDoc(extractWsmForm(cleanRaciocinioTags(message.text)).cleanText);
                                    if (docObjs && docObjs.length > 0) {
                                      return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3 w-full">
                                          {docObjs.map((doc, idx) => (
                                            <DocumentCard key={idx} document={doc} />
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* 4b. Scheduled Task Cards - rendered when AI schedules a task */}
                                  {isReasoningDone && isTypewriterDone && (() => {
                                    const { taskObjs } = extractWsmTasks(message.text || message.finalSynthesis || "");
                                    if (taskObjs && taskObjs.length > 0) {
                                      return (
                                        <div className="flex flex-col gap-3 mt-3 w-full">
                                          {taskObjs.map((task, idx) => (
                                            <ScheduledTaskCard key={idx} task={task} onOpenScheduledTasks={onOpenScheduledTasks} />
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* 5. Thinking indicator - only while reasoning or typewriter are actively generating */}
                                  {isThinking && message.id === messages[messages.length - 1]?.id && isReasoningDone && !isTypewriterDone && (
                                    <div className="flex items-center gap-2 text-gray-500 text-xs py-2 mt-2">
                                      <PacmanLoadingAnimation />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 6. Rich format cards - only after reasoning AND typewriter complete */}
                              {isReasoningDone && isTypewriterDone && (
                                <>
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
                                </>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                  )}
                  
                  {!(isThinking && index > lastVisibleUserIndex) && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[9px] text-gray-400">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
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
                          <button onClick={() => copyToClipboard(cleanSkillTags(cleanRaciocinioTags(cleanTaskTags(cleanWriterUpdateTags(message.text)))), message.id)} className="text-gray-400 hover:text-gray-600 p-0.5" title="Copiar">
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
        )}
      </div>

      {/* Floating Input Area */}
      <footer className="p-0 md:p-3 bg-transparent md:bg-white border-none md:border-t border-[#eae6e1] relative z-10 flex flex-col items-center pb-4 md:pb-3">
        <AnimatePresence>
        {activeForm && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl mx-auto z-20"
          >
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
          </motion.div>
        )}
        </AnimatePresence>
        <AnimatePresence>
        {attachedText && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl mx-auto flex items-center justify-between gap-2 bg-blue-50/75 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-800 mb-2"
          >
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
          </motion.div>
        )}
        </AnimatePresence>
        {(() => {
          const lastVisibleMsg = visibleMessages[visibleMessages.length - 1];
          const lastMessageText = lastVisibleMsg?.text || "";
          const isPro = selectedModel === 'WSM 1.6 Pro';
          const taskProgress = (isPro && isThinking && lastVisibleMsg?.sender === 'ai')
            ? getTaskProgress(lastMessageText)
            : null;

          return (
            <div className={`w-[calc(100%-2rem)] md:w-full md:max-w-xl mx-auto absolute bottom-3 left-4 md:relative md:bottom-auto md:left-auto z-50 flex flex-col mb-0 ${
              taskProgress ? 'shadow-lg md:shadow-[0_1px_8px_rgba(0,0,0,0.01)] rounded-2xl' : ''
            }`}>
              <AnimatePresence>
              {taskProgress && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-t-2xl p-0 transition-all duration-300 overflow-hidden"
                >
                  {/* Header */}
                  <div 
                    onClick={() => setIsTasksExpanded(!isTasksExpanded)}
                    className="flex items-center justify-between px-4 py-3 md:py-2.5 cursor-pointer hover:bg-[#eae8e5] transition-colors rounded-t-2xl"
                  >
                    <div className="flex items-center">
                      <Flag className="w-4 h-4 text-gray-500 mr-2.5" />
                      <span className="text-sm font-semibold text-gray-700">Tarefas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded font-bold">
                        {taskProgress.completedCount}/{taskProgress.totalCount}
                      </span>
                      {isTasksExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Tasks List */}
                  <AnimatePresence initial={false}>
                  {isTasksExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pt-1 border-t border-[#eae6e1]/40 flex flex-col gap-2">
                        {taskProgress.tasks.map((task, idx) => {
                          const isCompleted = idx < taskProgress.activeIndex;
                          const isActive = idx === taskProgress.activeIndex;
                          const isFuture = idx > taskProgress.activeIndex;

                          return (
                            <motion.div 
                              initial={false}
                              animate={{ 
                                opacity: isFuture ? 0.5 : 1,
                                x: isActive ? 4 : 0
                              }}
                              key={idx} 
                              className="flex items-start py-0.5 text-left"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2.5 mt-0.5 shrink-0" />
                              ) : isActive ? (
                                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin mr-2.5 mt-0.5 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-300 mr-2.5 mt-0.5 shrink-0" />
                              )}
                              <span className={`text-sm ${
                                isCompleted 
                                  ? 'text-gray-400 line-through font-normal' 
                                  : isActive 
                                    ? 'text-gray-800 font-semibold' 
                                    : 'text-gray-500 font-normal'
                              }`}>
                                {task}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
              </motion.div>
            )}
            </AnimatePresence>
            <form
                onSubmit={handleSubmit}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full ${isListening ? 'bg-[#f5f6f8]' : 'bg-white'} border border-[#eae6e1] p-3 md:p-2.5 focus-within:border-gray-300 transition-all duration-200 z-50 ${
                  taskProgress 
                    ? 'rounded-b-[28px] md:rounded-b-[24px] border-t-0' 
                    : 'rounded-[28px] md:rounded-[26px] shadow-lg md:shadow-[0_1px_8px_rgba(0,0,0,0.01)]'
                }`}
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
            <>
              {/* MOBILE SLASH MENU */}
              <div className="md:hidden absolute bottom-[calc(100%+8px)] left-0 w-64 bg-white border border-gray-150 rounded-xl shadow-lg z-50 p-1 flex flex-col max-h-72 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200 scrollbar-thin">
                {(() => {
                  const toolsSection = filteredTools.filter(t => !('isSkill' in t));
                  const skillsSection = filteredTools.filter(t => 'isSkill' in t);
                  return (
                    <>
                      {toolsSection.length > 0 && (
                        <div className="flex flex-col">
                          <div className="text-[10px] font-bold text-gray-400 tracking-wider px-3 py-1.5 uppercase select-none">
                            Funcionalidades
                          </div>
                          {toolsSection.map((tool) => {
                            const globalIndex = filteredTools.indexOf(tool);
                            const isSelected = globalIndex === slashMenuIndex;
                            const Icon = tool.icon;
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => handleToolSelect(tool)}
                                className={`w-full flex flex-col gap-0.5 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                  isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-3.5 h-3.5 ${tool.color}`} />
                                  <span className="text-[12px] font-semibold text-gray-800">{tool.id}</span>
                                </div>
                                <span 
                                  className="text-[10px] text-gray-500 pl-5.5 line-clamp-1 truncate" 
                                  title={tool.description}
                                >
                                  {tool.description && tool.description.length > 75 
                                    ? tool.description.slice(0, 75) + '...' 
                                    : tool.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {toolsSection.length > 0 && skillsSection.length > 0 && (
                        <div className="h-px bg-gray-150 my-1 mx-2 shrink-0" />
                      )}

                      {skillsSection.length > 0 && (
                        <div className="flex flex-col">
                          <div className="text-[10px] font-bold text-gray-400 tracking-wider px-3 py-1.5 uppercase select-none">
                            Biblioteca de Skills
                          </div>
                          {skillsSection.map((tool) => {
                            const globalIndex = filteredTools.indexOf(tool);
                            const isSelected = globalIndex === slashMenuIndex;
                            const Icon = tool.icon;
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => handleToolSelect(tool)}
                                className={`w-full flex flex-col gap-0.5 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                  isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-3.5 h-3.5 ${tool.color}`} />
                                  <span className="text-[12px] font-semibold text-gray-800">{tool.id}</span>
                                </div>
                                <span 
                                  className="text-[10px] text-gray-500 pl-5.5 line-clamp-1 truncate" 
                                  title={tool.description}
                                >
                                  {tool.description && tool.description.length > 75 
                                    ? tool.description.slice(0, 75) + '...' 
                                    : tool.description}
                                </span>
                              </button>
                            );
                          })}
                          {onOpenStore && (
                            <>
                              <div className="h-px bg-gray-150 my-1 mx-2 shrink-0" />
                              <button
                                type="button"
                                onClick={() => {
                                  setSlashMenuOpen(false);
                                  onOpenStore();
                                }}
                                className="w-full flex items-center justify-center gap-2 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-brand-50 text-brand-600 font-medium text-xs mt-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Buscar skills novas
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* DESKTOP SLASH MENU */}
              <div className="hidden md:flex absolute bottom-[calc(100%+8px)] left-0 w-64 bg-white border border-gray-150 rounded-xl shadow-lg z-50 p-1 flex-col overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-200">
                {(() => {
                  const toolsSection = filteredTools.filter(t => !('isSkill' in t));
                  const skillsSection = filteredTools.filter(t => 'isSkill' in t);
                  return (
                    <>
                      {toolsSection.length > 0 && (
                        <div className="flex flex-col">
                          <div className="text-[10px] font-bold text-gray-400 tracking-wider px-3 py-1.5 uppercase select-none">
                            Funcionalidades
                          </div>
                          {toolsSection.map((tool) => {
                            const globalIndex = filteredTools.indexOf(tool);
                            const isSelected = globalIndex === slashMenuIndex;
                            const Icon = tool.icon;
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => handleToolSelect(tool)}
                                className={`w-full flex flex-col gap-0.5 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                  isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-3.5 h-3.5 ${tool.color}`} />
                                  <span className="text-[12px] font-semibold text-gray-800">{tool.id}</span>
                                </div>
                                <span 
                                  className="text-[10px] text-gray-500 pl-5.5 line-clamp-1 truncate" 
                                  title={tool.description}
                                >
                                  {tool.description && tool.description.length > 75 
                                    ? tool.description.slice(0, 75) + '...' 
                                    : tool.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {skillsSection.length > 0 && (
                        <>
                          <div className="h-px bg-gray-150 my-1 mx-2 shrink-0" />
                          <div 
                            className="relative"
                            onMouseEnter={handleSkillsMouseEnter}
                            onMouseLeave={handleSkillsMouseLeave}
                          >
                            <button
                              type="button"
                              className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[12px] font-semibold text-gray-800">Habilidades</span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            </button>

                            {/* Submenu de Habilidades no hover */}
                            {isSkillsHovered && (
                              <div className="absolute left-[100%] bottom-0 pl-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
                                <div className="w-64 bg-white border border-gray-150 rounded-xl shadow-lg p-1 flex flex-col max-h-72 overflow-y-auto scrollbar-thin select-none">
                                  <div className="text-[10px] font-bold text-gray-400 tracking-wider px-3 py-1.5 uppercase select-none">
                                    Biblioteca de Skills
                                  </div>
                                  {skillsSection.map((tool) => {
                                    const Icon = tool.icon;
                                    return (
                                      <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => {
                                          handleToolSelect(tool);
                                          setIsSkillsHovered(false);
                                        }}
                                        className="w-full flex flex-col gap-0.5 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Icon className={`w-3.5 h-3.5 ${tool.color}`} />
                                          <span className="text-[12px] font-semibold text-gray-800">{tool.id}</span>
                                        </div>
                                        <span 
                                          className="text-[10px] text-gray-500 pl-5.5 line-clamp-1 truncate" 
                                          title={tool.description}
                                        >
                                          {tool.description && tool.description.length > 75 
                                            ? tool.description.slice(0, 75) + '...' 
                                            : tool.description}
                                        </span>
                                      </button>
                                    );
                                  })}
                                  {onOpenStore && (
                                    <>
                                      <div className="h-px bg-gray-150 my-1 mx-2 shrink-0" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSlashMenuOpen(false);
                                          setIsSkillsHovered(false);
                                          onOpenStore();
                                        }}
                                        className="w-full flex items-center justify-center gap-2 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-brand-50 text-brand-600 font-medium text-xs mt-1"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Buscar skills novas
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
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

          {/* Active Skills Chips */}
          {activeSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-1 px-1">
              {activeSkills.map(skill => (
                <div 
                  key={skill.id}
                  className="flex items-center gap-1 bg-[#5c53e5]/10 text-[#5c53e5] px-2 py-0.5 rounded flex-shrink-0 cursor-pointer hover:bg-[#5c53e5]/20 transition-colors"
                  onClick={() => setActiveSkills(prev => prev.filter(s => s.id !== skill.id))}
                >
                  <span className="font-bold text-[13px]">/{skill.name}</span>
                  <X className="w-3 h-3" />
                </div>
              ))}
            </div>
          )}

          {/* Voice recording UI mode OR standard input area */}
          {isListening ? (
            <div className="w-full flex flex-col gap-2 p-1">
              <div className="text-gray-400 text-[13.5px] font-medium px-2 pt-0.5 select-none truncate">
                {interimTranscript || inputValue || "Estou a ouvir"}
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Cancel button */}
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 border border-gray-150 shadow-sm flex items-center justify-center text-gray-700 transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Cancelar gravação"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Dynamic Waveform Visualizer */}
                <div className="flex-1 flex items-center justify-center gap-[2.5px] h-9 px-1 overflow-hidden">
                  {audioLevels.map((height, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${height}px` }}
                      className="w-[2.5px] bg-gray-800 rounded-full transition-all duration-75"
                    />
                  ))}
                </div>

                {/* Confirm button */}
                <button
                  type="button"
                  onClick={confirmRecording}
                  className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Concluir gravação"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Textarea */}
              <textarea
                id="chat-input-textarea-floating"
                rows={1}
                value={inputValue}
                onChange={handleInputValueChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Pergunte ao ${selectedModel}...`}
                className="w-full bg-transparent outline-none resize-none text-gray-800 placeholder-gray-400 text-[13.5px] leading-relaxed pb-1 min-h-[38px] max-h-[220px]"
              />

              {/* Bottom Bar */}
              <div className="flex items-center justify-between pt-1">
                {/* Left Controls */}
                <div className="flex items-center gap-1 relative">
                  
                  {/* Attach Menu */}
                  {isAttachMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                      {!isSkillsSubMenuOpen ? (
                        <div className="p-1.5 flex flex-col gap-0.5">
                          <button
                            onClick={() => {
                              setIsAttachMenuOpen(false);
                              handleAttachFileDirectly();
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-gray-500" />
                              <span className="text-[13px] font-medium text-gray-700">Adicionar arquivos</span>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSkillsSubMenuOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <FileCode2 className="w-4 h-4 text-gray-500" />
                              <span className="text-[13px] font-medium text-gray-700">Skills</span>
                            </div>
                            <ChevronDown className="w-3 h-3 text-gray-400 -rotate-90" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSkillsSubMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 text-gray-500 transition-colors mb-1 border-b border-gray-50 cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                            <span className="text-[12px] font-medium">Voltar</span>
                          </button>
                          <div className="max-h-48 overflow-y-auto">
                            {skills.length === 0 ? (
                              <div className="px-3 py-4 text-center">
                                <p className="text-[12px] text-gray-500">Nenhuma Skill instalada</p>
                              </div>
                            ) : (
                              skills.map(skill => (
                                <button
                                  key={skill.id}
                                  onClick={() => {
                                    setActiveSkills(prev => { if(!prev.find(s=>s.id===skill.id)) return [...prev, skill]; return prev; });
                                    setIsAttachMenuOpen(false);
                                    setIsSkillsSubMenuOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                  <FileCode2 className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="text-[13px] font-medium text-gray-700">{skill.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Anexar arquivo"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                      isSearchEnabled
                        ? 'bg-[#5c53e5]/10 text-[#5c53e5] border border-[#5c53e5]/15'
                        : 'bg-[#eae7e2] text-gray-700 hover:bg-[#e1ded9]'
                    }`}
                    title="Ativar busca web"
                  >
                    <Globe className={`w-3.5 h-3.5 ${isSearchEnabled ? 'text-[#5c53e5] animate-spin-slow' : 'text-gray-500'}`} />
                    <span>Pesquisar</span>
                  </button>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1.5">
                  {/* Esforço Dropdown/Pill Selector (shows up only for WSM 1.6 Pro) */}
                  {selectedModel === 'WSM 1.6 Pro' && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsEffortDropdownOpen(!isEffortDropdownOpen)}
                        className="flex items-center gap-1 px-3 py-1 bg-[#eae7e2] hover:bg-[#e1ded9] rounded-full text-[12px] font-bold text-gray-700 transition-all cursor-pointer"
                        title="Seletor de esforço de raciocínio"
                      >
                        <span>Esforço</span>
                        <span className="text-gray-500 font-normal ml-0.5">{reasoningLevel}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>

                      {isEffortDropdownOpen && (
                        <>
                          {/* Backdrop to close the dropdown */}
                          <div className="fixed inset-0 z-40" onClick={() => setIsEffortDropdownOpen(false)} />
                          <div className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-xl shadow-xl z-50 p-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <div className="flex flex-col gap-0.5">
                              {['Nenhum', 'Mínimo', 'Baixo', 'Médio', 'Alto'].map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => {
                                    if (setReasoningLevel) {
                                      setReasoningLevel(level);
                                    }
                                    setIsEffortDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                                    reasoningLevel === level
                                      ? 'bg-gray-50 text-[#5c53e5] font-semibold'
                                      : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    title={isListening ? "Parar gravação" : "Voz"}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  {inputValue.length >= 4500 && (
                    <span className={`text-[10px] font-medium ${inputValue.length > 5000 ? 'text-red-500' : 'text-gray-400'} flex items-center`}>
                      {inputValue.length} / 5000
                    </span>
                  )}

                  <button
                    type={isThinking ? "button" : "submit"}
                    onClick={(e) => {
                      if (isThinking) {
                        onCancelGeneration?.();
                      }
                    }}
                    disabled={((!inputValue.trim() && !attachedText && attachments.length === 0) || inputValue.length > 5000) && !isThinking}
                    className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all ${
                      isThinking
                        ? 'bg-[#ff4d4d] hover:bg-[#ff3333] cursor-pointer'
                        : ((inputValue.trim() || attachedText || attachments.length > 0) && inputValue.length <= 5000)
                        ? 'bg-[#1f1e1d] text-white hover:bg-[#343230] cursor-pointer'
                        : 'bg-[#faf9f6] text-gray-300 border border-[#eae6e1]'
                    }`}
                  >
                    {isThinking ? (
                      <div className="w-3 h-3 bg-white rounded-sm" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {inputValue.length > 5000 && (
            <div className="absolute -bottom-8 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-top-2">
              <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm">
                O limite de caracteres é 5000. Você ultrapassou esse limite.
              </span>
            </div>
          )}

          

          {(isDragging || isSucking) && (
            <div className="wsm-drop-overlay">
              <div className="wsm-folder-container">
                <div className="wsm-folder-back"></div>
                <div className="wsm-folder-inside"></div>
                
                {suckingFiles.map((file) => (
                  <div key={file.id} className="wsm-dropped-file wsm-animate-drop">
                    {file.isImage ? (
                      <img 
                        src={file.url} 
                        alt="" 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center select-none">
                        <Paperclip className="w-8 h-8 text-[#168a8c]" />
                        <span className="text-[9px] text-gray-500 font-bold truncate max-w-[64px] mt-1">{file.name}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className={`wsm-folder-front ${(isDragging || isSucking) ? 'open' : ''}`}></div>
              </div>
              <span className="wsm-folder-instructions">
                {isSucking ? 'Enviando arquivos...' : 'Solte arquivos para dentro da pasta'}
              </span>
            </div>
          )}
        </form>
      </div>
    );
  })()}
        <div className="hidden md:block text-[9px] text-center text-gray-400 font-medium pt-1.5 select-none">
          {selectedModel} pode cometer erros. Verifique informações importantes.
        </div>
      </footer>

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
