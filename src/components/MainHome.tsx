import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Globe, Mic, ArrowUp, Pencil, Code, Image as ImageIcon, Brain, Languages, ChevronDown, ChevronRight, Sparkles, Calculator, Clock, Video, Volume2, FileText, AlertCircle, X, Check, Menu, FileCode2, Files, BookOpen, MessageCircleDashed, Plus } from 'lucide-react';
import { Skill } from '../lib/skills';
import { Draft } from '../types';

const RANDOM_HEADLINES = [
  "Como posso ajudar?",
  "Desperte ideias",
  "Como vai?",
  "O que criar hoje?",
  "No que está pensando?",
  "Vamos começar!",
  "Qual sua próxima ideia?",
  "Tire ideias do papel",
  "O que te inspira?",
  "Crie algo novo!",
  "Solte a imaginação",
  "O que vamos escrever?",
  "Vamos construir algo incrível?",
  "Em que posso ser útil?",
  "Acelere seus resultados",
  "Simplifique suas tarefas",
  "Qual o foco de hoje?",
  "Vamos resolver desafios?",
  "Simplifique tudo!",
  "O que você precisa agora?",
  "Explore novas possibilidades",
  "O que deseja descobrir?",
  "Em que posso te acompanhar?",
  "O que quer aprender hoje?",
  "Pronto para a próxima aventura?",
  "Tire suas dúvidas",
  "Clareie suas ideias",
  "Vamos superar expectativas?",
  "Olá! Como posso ajudar?",
  "Vamos transformar ideias em realidade?"
];

interface MainHomeProps {
  onSendMessage: (text: string, isSearchEnabled: boolean, overrideMessages?: any, attachments?: any[]) => void;
  onSuggestionClick: (suggestionType: 'write' | 'code' | 'image' | 'analysis' | 'translate') => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  reasoningLevel?: string;
  setReasoningLevel?: (level: string) => void;
  onOpenMobileHistory?: () => void;
  initialDraft?: Draft;
  onSaveDraft?: (draft: Partial<Draft>) => void;
  onDeleteDraft?: () => void;
  userProfile?: any;
  onDismissNewsCard?: () => void;
  skills?: Skill[];
  onOpenStore?: () => void;
  onStartTemporaryChat?: () => void;
  isProfileLoading?: boolean;
  onOpenUpdateModal?: () => void;
}

export default function MainHome({
  onSendMessage,
  onSuggestionClick,
  selectedModel,
  setSelectedModel,
  reasoningLevel = 'Mínimo',
  setReasoningLevel,
  onOpenMobileHistory,
  initialDraft,
  onSaveDraft,
  onDeleteDraft,
  userProfile,
  onDismissNewsCard,
  skills = [],
  onOpenStore,
  onStartTemporaryChat,
  isProfileLoading = false,
  onOpenUpdateModal
}: MainHomeProps) {
  const [inputValue, setInputValue] = useState('');
  const [currentHeadline] = useState(() => {
    const randomIndex = Math.floor(Math.random() * RANDOM_HEADLINES.length);
    return RANDOM_HEADLINES[randomIndex];
  });
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isEffortDropdownOpen, setIsEffortDropdownOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isNewsCardDismissedLocal, setIsNewsCardDismissedLocal] = useState(() => {
    return localStorage.getItem('wsm_news_card_dismissed') === 'true';
  });

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isSkillsSubMenuOpen, setIsSkillsSubMenuOpen] = useState(false);
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDismissNewsCard = () => {
    // Disabled dismiss as per request
  };

  const shouldShowNewsCard = true;

  // Preload the news card images so they load instantly from browser cache
  useEffect(() => {
    const preloadImg1 = new Image();
    preloadImg1.src = "https://i.ibb.co/TMJBp2n7/38000-removebg-preview.png";
    const preloadImg2 = new Image();
    preloadImg2.src = "https://i.ibb.co/tw9yWNfj/38003.png";
  }, []);

  // Speech Recognition States & Waveform
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
  }, []);

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

  // Auto-focus the textarea on mount and whenever selectedModel changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedModel]);

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
    const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
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
    const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
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

  const handleAttachClick = () => {
    setIsAttachMenuOpen(!isAttachMenuOpen);
    setIsSkillsSubMenuOpen(false);
  };
  
  const handleAttachFileDirectly = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() && attachments.length === 0 && activeSkills.length === 0) return;
    if (inputValue.length > 5000) return;
    
    if (onDeleteDraft) onDeleteDraft();

    let textToSend = inputValue;
    if (activeSkills.length > 0) {
      const skillsText = activeSkills.map(s => '/' + s.name).join(', ');
      textToSend = `[Utilize as seguintes skills: ${skillsText}]\n\n${inputValue}`;
    }

    onSendMessage(textToSend, isSearchEnabled, undefined, attachments);
    setInputValue('');
    setAttachments([]);
    setUploadError(null);
    setSlashMenuOpen(false);
    setActiveSkills([]);
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
            {selectedModel === 'WSM 1.6 Pro' ? (
              <>
                <span className="font-bold text-gray-900">WSM 1.6 Pro</span>
                {reasoningLevel !== 'Nenhum' && (
                  <span className="text-gray-400 font-normal ml-0.5">{reasoningLevel}</span>
                )}
              </>
            ) : (
              <span>{selectedModel}</span>
            )}
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

        {/* Right side controls / Chat temporário */}
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#faf9f6] border border-[#eae6e1] rounded-full text-xs font-bold text-gray-700 hover:text-gray-950 shadow-3xs transition-all cursor-pointer active:scale-95"
            title="Iniciar Chat temporário"
          >
            <MessageCircleDashed className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span className="hidden sm:inline">Chat temporário</span>
          </button>
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
        <h1 id="home-headline" className="text-center mb-5 md:mb-5 select-none absolute top-[35%] md:static left-1/2 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 w-full md:w-auto px-4">
          <span className="font-sans font-extrabold text-gray-900 tracking-tight text-[1.8rem] sm:text-[1.95rem] md:text-[2.3rem]">
            {currentHeadline}
          </span>
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
            className={`w-full ${isListening ? 'bg-[#f5f6f8]' : 'bg-white'} border border-[#eae6e1] rounded-[28px] md:rounded-[26px] shadow-lg md:shadow-[0_4px_16px_rgba(0,0,0,0.02)] p-3 md:p-2.5 focus-within:border-gray-300 transition-all duration-200 order-2 md:order-1`}
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

          {/* Active Skills Chips */}
          {activeSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-1">
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
              {/* Text Area Input */}
              <textarea
                id="chat-input-textarea"
                rows={1}
                value={inputValue}
                onChange={handleInputValueChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Pergunte ao ${selectedModel}...`}
                className="w-full bg-transparent outline-none resize-none text-gray-800 placeholder-gray-400 text-[13.5px] leading-relaxed pb-1 min-h-[38px] max-h-[220px]"
              />

              {/* Bottom Controls Bar */}
              <div className="flex items-center justify-between pt-1">
                {/* Left Controls: Paperclip & Pesquisar Button */}
                <div className="flex items-center gap-1.5 relative">
                  
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
                    id="btn-attach-file"
                    onClick={handleAttachClick}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Anexar arquivo"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Toggleable Pesquisar Button */}
                  <button
                    type="button"
                    id="btn-search-toggle"
                    onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                      isSearchEnabled
                        ? 'bg-[#5c53e5]/10 text-[#5c53e5] border border-[#5c53e5]/25 shadow-2xs'
                        : 'bg-[#eae7e2] text-gray-700 hover:bg-[#e1ded9]'
                    }`}
                    title="Ativar busca web em tempo real"
                  >
                    <Globe className={`w-3.5 h-3.5 ${isSearchEnabled ? 'text-[#5c53e5] animate-spin-slow' : 'text-gray-500'}`} />
                    <span>Pesquisar</span>
                  </button>
                </div>

                {/* Right Controls: Mic & Send Circular Button */}
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
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      isListening
                        ? 'text-red-500 bg-red-50 animate-pulse'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
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
                    type="submit"
                    id="btn-send-message"
                    onClick={(e) => {
                      handleSubmit(e);
                    }}
                    disabled={(!inputValue.trim() && attachments.length === 0) || inputValue.length > 5000}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      (inputValue.trim() || attachments.length > 0) && inputValue.length <= 5000
                        ? 'bg-[#1f1e1d] text-white hover:bg-[#343230] cursor-pointer shadow-xs'
                        : 'bg-[#faf9f6] text-gray-300 cursor-not-allowed border border-[#eae6e1]'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
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

          {/* Card de novidades dos novos modelos */}
          {shouldShowNewsCard && currentCardIndex === 0 && (
            <div 
              onClick={() => setIsNewsModalOpen(true)}
              className="w-full bg-gray-100/65 rounded-2xl p-4 flex items-center gap-4 select-none cursor-pointer hover:bg-gray-100/90 active:scale-[0.99] transition-all relative order-1 md:order-2 animate-in fade-in duration-500"
            >
              <img
                src="https://i.ibb.co/TMJBp2n7/38000-removebg-preview.png"
                alt="Novos Modelos"
                className="w-14 h-14 md:w-16 md:h-16 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col text-left pr-6">
                <h3 className="font-sans font-bold text-gray-900 text-[14px] md:text-[15px] tracking-tight leading-snug">
                  Novos modelos: WSM 1.6 Flash e Pro
                </h3>
                <p className="font-sans text-gray-500 text-[12px] md:text-[12.5px] leading-relaxed mt-0.5">
                  Conheça nossos 2 novos modelos da família 1.6, mais inteligentes e poderosos.
                </p>
              </div>
            </div>
          )}

          {shouldShowNewsCard && currentCardIndex === 1 && (
            <div 
              onClick={() => window.location.href = '/benchmark'}
              className="w-full bg-gray-100/65 rounded-2xl p-4 flex items-center gap-4 select-none cursor-pointer hover:bg-gray-100/90 active:scale-[0.99] transition-all relative order-1 md:order-2 animate-in fade-in duration-500"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center bg-white border border-[#eae6e1] rounded-xl shadow-sm">
                <Sparkles className="w-7 h-7 text-[#5c53e5]" />
              </div>
              <div className="flex flex-col text-left pr-6">
                <h3 className="font-sans font-bold text-gray-900 text-[14px] md:text-[15px] tracking-tight leading-snug">
                  Venha conferir WSM 1.6 Pro comparado ao GPT e Gemini
                </h3>
                <p className="font-sans text-gray-500 text-[12px] md:text-[12.5px] leading-relaxed mt-0.5">
                  Veja a avaliação completa e os benchmarks com dezenas de testes
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}


      </main>

      {/* Full screen news modal */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Click outside to close */}
          <div className="fixed inset-0" onClick={() => setIsNewsModalOpen(false)} />
          
          <div className="bg-white border border-[#eae6e1] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setIsNewsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors z-20 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Scrollable Container for all content */}
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200">
              {/* Image on top */}
              <div className="w-full bg-gray-50 flex items-center justify-center p-6 border-b border-[#eae6e1]/40">
                <img 
                  src="https://i.ibb.co/tw9yWNfj/38003.png" 
                  alt="Novos modelos" 
                  className="max-w-full h-auto max-h-[400px] object-contain rounded-xl shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Content area */}
              <div className="p-8 md:p-10">
                <p className="font-sans text-gray-700 text-[15px] md:text-[16px] leading-relaxed whitespace-pre-line">
                  Conheça os dois novos membros da família WSM 1.6, criados para acompanhar você em qualquer desafio do dia. O Flash é aquele amigo rápido e prático, sempre pronto pra te tirar de um aperto: escreve aquele e-mail urgente, resume um texto longo, traduz uma frase, dá uma ideia criativa e te ajuda a organizar a cabeça quando o tempo está correndo. Ele é leve, direto e não te deixa esperando — perfeito para o dia a dia, seja no trabalho, nos estudos ou na vida pessoal.
                  {"\n\n"}
                  O Pro, por outro lado, é o pensador da casa. Ele raciocina. Diante de um problema complexo, ele não solta a primeira resposta que aparece: ele estrutura o pensamento, testa caminhos, analisa variáveis e só então entrega uma solução bem fundamentada. Quer programar uma aplicação completa? Resolver uma equação difícil? Escrever um contrato jurídico? Fazer uma análise crítica de um texto? Criar uma estratégia de negócio? O Pro é o seu parceiro intelectual, e o melhor: com um clique no botão "Raciocínio", você consegue ver todo o passo a passo dele, como se estivesse ouvindo um especialista pensar em voz alta.
                  {"\n\n"}
                  Os dois modelos têm acesso às mesmas ferramentas poderosas: pesquisa em tempo real na web com dezenas de fontes verificáveis, leitura de PDFs e imagens com extração de texto, editor de documentos integrado com IA, memória de contexto que mantém a coerência ao longo de toda a conversa, e tudo isso em português brasileiro nativo. Escolha o Flash quando precisar de velocidade, e o Pro quando precisar de profundidade. E não se preocupe: você pode alternar entre eles quando quiser, na mesma conversa, sem perder nada do que já foi discutido.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
