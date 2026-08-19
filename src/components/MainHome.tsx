import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Globe, Monitor, Mic, ArrowUp, Pencil, Code, Image as ImageIcon, Brain, Languages, ChevronDown, ChevronRight, Sparkles, Calculator, Clock, Video, Volume2, FileText, AlertCircle, X, Check, Menu, FileCode2, Files, BookOpen, MessageCircleDashed, Plus, Camera, Bug, Search, Map, ScrollText } from 'lucide-react';
import { Skill } from '../lib/skills';
import { OFFICIAL_SKILLS } from '../lib/officialSkills';
import { DeclarativeSkillComposer } from './DeclarativeSkillComposer';
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
  onSendMessage: (
    text: string, 
    isSearchEnabled: boolean, 
    overrideMessages?: any, 
    attachments?: any[], 
    isHidden?: boolean, 
    isComputerEnabled?: boolean,
    activeSkills?: Skill[],
    skillMode?: 'uma_skill' | 'pipeline'
  ) => void;
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
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [currentHeadline] = useState("O que vamos criar hoje?");
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isComputerEnabled, setIsComputerEnabled] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isEffortDropdownOpen, setIsEffortDropdownOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isNewsCardDismissedLocal, setIsNewsCardDismissedLocal] = useState(() => {
    return localStorage.getItem('wsm_news_card_dismissed') === 'true';
  });

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isSkillsSubMenuOpen, setIsSkillsSubMenuOpen] = useState(false);
  const [attachMenuPlacement, setAttachMenuPlacement] = useState<'top' | 'bottom'>('top');
  const attachContainerRef = useRef<HTMLDivElement>(null);
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);
  const [skillMode, setSkillMode] = useState<'uma_skill' | 'pipeline'>('uma_skill');

  useEffect(() => {
    if (!isAttachMenuOpen) return;
    const checkAttachPos = () => {
      if (!attachContainerRef.current) return;
      const rect = attachContainerRef.current.getBoundingClientRect();
      if (rect.top < 220 && (window.innerHeight - rect.bottom) >= 200) {
        setAttachMenuPlacement('bottom');
      } else {
        setAttachMenuPlacement('top');
      }
    };
    checkAttachPos();
  }, [isAttachMenuOpen, isSkillsSubMenuOpen]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev + 1) % 2);
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
    const preloadImg3 = new Image();
    preloadImg3.src = "https://i.ibb.co/HptN09Wc/099453ef-f352-4d92-91d5-0ca21965c7db-removebg-preview.png";
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
  const isComposingRef = useRef<boolean>(false);

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
           if (event.error === 'not-allowed' || event.error === 'permission-denied') {
             setVoiceError('Permissão para uso do microfone foi negada no navegador. Habilite o microfone para gravar voz.');
           } else if (event.error !== 'no-speech') {
             setVoiceError(`Erro no reconhecimento de voz (${event.error}). Verifique o microfone.`);
           }
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
  const slashMenuContainerRef = useRef<HTMLDivElement>(null);

  const allSkillsList = useMemo(() => {
    const combined = [...OFFICIAL_SKILLS];
    skills.forEach(s => {
      if (!combined.find(os => os.id === s.id)) {
        combined.push(s);
      }
    });
    return combined;
  }, [skills]);

  interface SlashMenuItem {
    id: string;
    name: string;
    displayName?: string;
    description: string;
    icon: any;
    isAction?: string;
    isSkill?: boolean;
    skillObj?: any;
  }

  const slashItems: SlashMenuItem[] = useMemo(() => {
    return [
      {
        id: 'add-files',
        name: 'add-files',
        description: 'Abrir seletor de arquivos',
        icon: Paperclip,
        isAction: 'add-files'
      },
      ...allSkillsList.map(skill => ({
        id: skill.id,
        name: skill.id,
        displayName: skill.name,
        description: skill.description,
        icon: ScrollText,
        isSkill: true,
        skillObj: skill
      }))
    ];
  }, [allSkillsList]);

  const filteredTools: SlashMenuItem[] = useMemo(() => {
    const term = slashSearchTerm.toLowerCase().trim();
    if (!term) return slashItems;
    return slashItems.filter(item => 
      item.id.toLowerCase().includes(term) ||
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.displayName && item.displayName.toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term))
    );
  }, [slashItems, slashSearchTerm]);

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

    if (selectedModel !== 'Omnix 1.6' && selectedModel !== 'Omnix 1.6') {
      if (slashMenuOpen) setSlashMenuOpen(false);
      return;
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    // Check if user is typing a slash command (strictly at start of prompt or start of line)
    const slashMatch = textBeforeCursor.match(/(^|\n)\/([a-zA-Z0-9_-]*)$/);

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
    
    const slashMatch = textBeforeCursor.match(/(^|\n)\/([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      const matchIndex = slashMatch.index !== undefined ? slashMatch.index : 0;
      const prefixBefore = slashMatch[1]; // either '' or '\n'
      
      if (item.isAction === 'add-files') {
        const newText = textBeforeCursor.slice(0, matchIndex) + prefixBefore + textAfterCursor;
        setInputValue(newText);
        setSlashMenuOpen(false);
        fileInputRef.current?.click();
        setTimeout(() => {
          if (textarea) {
            textarea.focus();
            const newPos = matchIndex + prefixBefore.length;
            textarea.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      if (item.isSkill) {
        setActiveSkills(prev => {
          if (skillMode === 'uma_skill') return [item.skillObj];
          if (!prev.find(s => s.id === item.skillObj.id)) {
            return [...prev, item.skillObj];
          }
          return prev;
        });
        const newText = textBeforeCursor.slice(0, matchIndex) + prefixBefore + textAfterCursor;
        setInputValue(newText);
      } else {
        const newText = textBeforeCursor.slice(0, matchIndex) + prefixBefore + item.id + ' ' + textAfterCursor;
        setInputValue(newText);
      }
      
      setSlashMenuOpen(false);
      
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          const newPos = matchIndex + prefixBefore.length;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const modelsList = [
    'Omnix 1.6'
  ];

  const modelDescriptions: Record<string, string> = {
    'Omnix 1.6': 'Modelo ultra-inteligente e agêntico'
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
        reader.onloadend = async () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';

          let sha256Hash = '';
          try {
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          } catch (hashError) {
            let hashNum = 0;
            for (let i = 0; i < base64.length; i++) {
              hashNum = ((hashNum << 5) - hashNum) + base64.charCodeAt(i);
              hashNum |= 0;
            }
            sha256Hash = Math.abs(hashNum).toString(16).padStart(8, '0');
          }

          const url = URL.createObjectURL(file);

          if (type === 'image') {
            const img = new Image();
            img.onload = () => {
              resolve({
                name: file.name,
                type: type,
                size: file.size,
                mimeType: file.type || 'image/png',
                hash: sha256Hash,
                url: url,
                base64: base64,
                width: img.naturalWidth,
                height: img.naturalHeight,
                metadataSource: 'Decodificação Direta do Navegador (FileReader & HTMLImageElement)'
              });
            };
            img.onerror = () => {
              resolve({
                name: file.name,
                type: type,
                size: file.size,
                mimeType: file.type || 'image/png',
                hash: sha256Hash,
                url: url,
                base64: base64
              });
            };
            img.src = url;
          } else {
            resolve({
              name: file.name,
              type: type,
              size: file.size,
              mimeType: file.type || (type === 'document' ? 'text/plain' : 'application/octet-stream'),
              hash: sha256Hash,
              url: url,
              base64: base64
            });
          }
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

    // Allow rich multi-line text (code blocks, markdown, SQL, JSON) to paste directly into textarea
    // Only convert to attached file if text exceeds 50,000 characters
    const pastedText = e.clipboardData?.getData('text/plain');
    if (pastedText && pastedText.length > 50000) {
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
    if (inputValue.length > 100000) return;
    
    if (onDeleteDraft) onDeleteDraft();

    const skillsToPass = activeSkills.length > 0 ? [...activeSkills] : undefined;
    const modeToPass = activeSkills.length > 0 ? skillMode : undefined;

    onSendMessage(inputValue, isSearchEnabled, undefined, attachments, false, isComputerEnabled, skillsToPass, modeToPass);
    setInputValue('');
    setAttachments([]);
    setUploadError(null);
    setSlashMenuOpen(false);
    setActiveSkills([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. IME composition check (strict native check, ignore keyCode 229 false positives)
    if (e.nativeEvent && e.nativeEvent.isComposing) {
      return;
    }

    // 2. Touch device check
    const isTouchDevice = typeof window !== 'undefined' && (
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 || 
      window.innerWidth < 768
    );

    // 3. Slash menu navigation
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

    // 4. Shift+Enter should ALWAYS insert a newline
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }

    // 5. Plain Enter on desktop sends the message; on mobile it inserts newline
    if (e.key === 'Enter' && !e.shiftKey) {
      if (isTouchDevice) {
        return;
      }
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
          
          {/* Model Display Pill */}
          <div className="relative">
            <div
              id="model-selector-pill"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#eae6e1] rounded-full text-[13px] font-bold text-gray-900 shadow-2xs select-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-black dark:text-white fill-black/20" />
              <span>Omnix 1.6</span>
            </div>
          </div>
        </div>

        {/* Right side controls / Chat temporário */}
        <div className="flex items-center gap-2 relative z-50">
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
      <main className="flex-1 flex flex-col items-center justify-center -mt-10 md:-mt-20 px-4 max-w-2xl mx-auto w-full relative z-10 pb-8">
        
        {/* Central Logo Avatar - Empty */}
        <div 
          id="center-avatar-card"
          className="hidden"
        />

        {/* Brand Headline Typography */}
        <h1 id="home-headline" className="text-center mb-5 md:mb-5 select-none w-full md:w-auto px-4">
          <span className="font-sans font-extrabold text-gray-900 tracking-tight text-[1.8rem] sm:text-[1.95rem] md:text-[2.3rem]">
            {currentHeadline}
          </span>
        </h1>

        {/* Input area & news card container */}
        <div className="w-full md:max-w-2xl flex flex-col gap-3.5 relative z-50">
          {/* Main Large Chat Input Box */}
          <form 
            onSubmit={handleSubmit}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full ${isListening ? 'bg-[#f5f6f8]/80' : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md'} border border-[#eae6e1]/80 rounded-[28px] md:rounded-[26px] shadow-lg md:shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-3 md:p-2.5 focus-within:border-gray-400 transition-all duration-200`}
          >
          {/* Hidden File Input */}
          <input 
            id="omnix-home-file-input"
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".txt,.pdf,.doc,.docx,.csv,.xlsx,.json,.md,.png,.jpg,.jpeg,.gif,.webp,*/*"
            multiple 
            className="hidden" 
          />

          {/* Slash Menu */}
          {slashMenuOpen && filteredTools.length > 0 && (
            <div 
              ref={slashMenuContainerRef} 
              className="absolute top-[calc(100%+8px)] left-0 w-64 sm:w-72 bg-white dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col max-h-[min(340px,calc(100vh-140px))] overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-2 duration-150"
            >
              {filteredTools.map((tool, idx) => {
                const isSelected = idx === slashMenuIndex;
                const isAddFiles = tool.isAction === 'add-files';

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolSelect(tool)}
                    className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl transition-colors cursor-pointer select-none ${
                      isSelected ? 'bg-gray-100 dark:bg-neutral-800' : 'hover:bg-gray-50 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    {isAddFiles ? (
                      <>
                        <Paperclip className="w-4 h-4 text-gray-500 dark:text-neutral-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">add-files</span>
                          <span className="text-[11px] text-gray-400 dark:text-neutral-500">Abrir seletor de arquivos</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ScrollText className="w-4 h-4 text-gray-400 dark:text-neutral-500 shrink-0" />
                        <span className="text-[13px] font-medium text-gray-800 dark:text-neutral-200 truncate">
                          {tool.id}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}

              {onOpenStore && (
                <>
                  <div className="h-px bg-gray-100 dark:bg-neutral-800 my-1 mx-2 shrink-0" />
                  <button
                    type="button"
                    onClick={() => {
                      setSlashMenuOpen(false);
                      onOpenStore();
                    }}
                    className="w-full flex items-center justify-center gap-2 text-left px-3 py-2 rounded-xl transition-colors cursor-pointer hover:bg-brand-50 dark:hover:bg-neutral-800 text-brand-600 dark:text-brand-400 font-medium text-xs mt-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buscar skills novas
                  </button>
                </>
              )}
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

          {/* Declarative Skill / Pipeline Composer */}
          <DeclarativeSkillComposer
            activeSkills={activeSkills}
            setActiveSkills={setActiveSkills}
            skillMode={skillMode}
            setSkillMode={setSkillMode}
            availableSkills={allSkillsList}
            onOpenCatalog={onOpenStore}
          />

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
                  className="w-9 h-9 rounded-full bg-black hover:bg-neutral-800 text-white shadow-sm flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Concluir gravação"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {voiceError && (
                <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
                  <span>{voiceError}</span>
                  <button type="button" onClick={() => setVoiceError(null)} className="font-bold text-red-800 hover:text-black">✕</button>
                </div>
              )}
              {/* Text Area Input */}
              <textarea
                id="chat-input-textarea"
                rows={1}
                value={inputValue}
                onChange={handleInputValueChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => { isComposingRef.current = false; }}
                placeholder={`Pergunte ao ${selectedModel}...`}
                className="w-full bg-transparent outline-none resize-none text-gray-800 placeholder-gray-400 text-[13.5px] leading-relaxed pb-1 min-h-[38px] max-h-[220px]"
              />

              {/* Bottom Controls Bar */}
              <div className="flex items-center justify-between pt-1">
                {/* Left Controls: Paperclip & Pesquisar Button */}
                <div ref={attachContainerRef} className="flex items-center gap-1.5 relative">
                  
                  {/* Attach Menu */}
                  {isAttachMenuOpen && (
                    <div className={`absolute ${attachMenuPlacement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} left-0 w-56 bg-white border border-gray-100 rounded-xl shadow-xl animate-in fade-in duration-200 z-50`}>
                      {!isSkillsSubMenuOpen ? (
                        <div className="p-1.5 flex flex-col gap-0.5">
                          <label
                            htmlFor="omnix-home-file-input"
                            id="omnix-home-file-upload-label"
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
                          </label>
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
                            {allSkillsList.length === 0 ? (
                              <div className="px-3 py-4 text-center">
                                <p className="text-[12px] text-gray-500">Nenhuma Skill instalada</p>
                              </div>
                            ) : (
                              allSkillsList.map(skill => (
                                <button
                                  key={skill.id}
                                  onClick={() => {
                                    setActiveSkills(prev => {
                                      if (skillMode === 'uma_skill') return [skill];
                                      if (!prev.find(s => s.id === skill.id)) return [...prev, skill];
                                      return prev;
                                    });
                                    setIsAttachMenuOpen(false);
                                    setIsSkillsSubMenuOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileCode2 className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100" />
                                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200 font-mono">/{skill.name}</span>
                                  </div>
                                  {skill.version && (
                                    <span className="text-[10px] text-gray-400 font-mono">v{skill.version}</span>
                                  )}
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
                        ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white shadow-2xs'
                        : 'bg-white text-gray-700 border border-[#eae6e1] hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs'
                    }`}
                    title="Pesquisar na Web"
                  >
                    <Globe className={`w-3.5 h-3.5 ${isSearchEnabled ? 'text-black dark:text-white animate-spin-slow' : 'text-gray-500'}`} />
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
                    title={
                      inputValue.length > 5000
                        ? "Mensagem excede o limite máximo de 5.000 caracteres"
                        : (!inputValue.trim() && attachments.length === 0)
                        ? "Digite uma mensagem ou anexe um arquivo para enviar"
                        : "Enviar mensagem (Enter)"
                    }
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

          {/* Beautiful Stacked Portuguese Pre-Prompts List */}
          <div className="w-full flex flex-col bg-gray-50/65 border border-black/5 rounded-2xl overflow-hidden mt-1 shadow-xxs">
            {[
              { 
                icon: Camera, 
                text: "Descreva o que está acontecendo em uma imagem", 
                prompt: "Por favor, descreva detalhadamente o que está acontecendo nesta imagem e analise seus principais elementos." 
              },
              { 
                icon: Bug, 
                text: "Corrija meu código", 
                prompt: "Aqui está o meu código. Por favor, analise-o, identifique quaisquer bugs ou problemas de performance e forneça a versão corrigida com explicações das alterações." 
              },
              { 
                icon: Search, 
                text: "Dê feedback sobre um design", 
                prompt: "Gostaria de receber um feedback detalhado sobre este design. O que está funcionando bem e quais são os pontos de melhoria em termos de usabilidade, cores e layout?" 
              },
              { 
                icon: Map, 
                text: "Aprenda um novo idioma", 
                prompt: "Quero praticar e aprender um novo idioma. Por favor, atue como um tutor nativo paciente, sugira tópicos de conversação cotidianos e corrija meus erros de gramática ou pronúncia." 
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputValue(item.prompt);
                    const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.focus();
                    }
                    if (item.text.toLowerCase().includes('imagem') && attachments.length === 0) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 active:bg-gray-200/50 transition-all text-left group border-b border-black/[0.04] last:border-0 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon className="w-5 h-5 text-gray-500 shrink-0 transition-transform group-hover:scale-105" />
                    <span className="font-sans font-medium text-gray-700 group-hover:text-gray-900 text-[13.5px] truncate">
                      {item.text}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggestion Chips */}


      </main>

      {/* Full screen news modal */}
      <AnimatePresence>
        {isNewsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
            {/* Click outside to close */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
              onClick={() => setIsNewsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.08 }}
              className="bg-white border border-[#eae6e1] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative z-10 select-text"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsNewsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors z-20 cursor-pointer shadow-lg hover:rotate-90 duration-200"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Scrollable Container for all content */}
              <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200">
                {/* Image on top */}
                <div className="w-full bg-gray-50 flex items-center justify-center p-6 border-b border-[#eae6e1]/40">
                  <img 
                    src="https://i.ibb.co/tw9yWNfj/38003.png" 
                    alt="Omnix 1.6" 
                    className="max-w-full h-auto max-h-[400px] object-contain rounded-xl shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* Content area */}
                <div className="p-8 md:p-10">
                  <p className="font-sans text-gray-700 text-[15px] md:text-[16px] leading-relaxed whitespace-pre-line">
                    Conheça o Omnix 1.6, o pensador da casa. Ele raciocina e executa com profundidade. Diante de um problema complexo, ele não solta a primeira resposta que aparece: ele estrutura o pensamento, testa caminhos, analisa variáveis e só então entrega uma solução bem fundamentada.
                    {"\n\n"}
                    Quer programar uma aplicação completa? Resolver uma equação difícil? Escrever um contrato jurídico? Fazer uma análise crítica de um texto? Criar uma estratégia de negócio? O Pro é o seu parceiro intelectual, com um clique no botão "Raciocínio" você consegue ver todo o passo a passo dele, como se estivesse ouvindo um especialista pensar em voz alta.
                    {"\n\n"}
                    O modelo tem acesso a ferramentas poderosas: pesquisa em tempo real na web com dezenas de fontes verificáveis, navegação real em sites via navegador, leitura de PDFs e imagens com extração de texto, editor de documentos integrado com IA, memória de contexto que mantém a coerência ao longo de toda a conversa, e tudo isso em português brasileiro nativo.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
