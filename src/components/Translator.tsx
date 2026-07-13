import React, { useState, useEffect, useRef } from 'react';
import { 
  Languages, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  ArrowLeftRight, 
  Sparkles, 
  Clock, 
  ChevronDown, 
  Search, 
  Trash2, 
  History,
  CornerDownRight,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Language {
  code: string;
  name: string;
  native: string;
  bcp47: string;
}

const LANGUAGES_50: Language[] = [
  { code: 'en', name: 'Inglês', native: 'English', bcp47: 'en-US' },
  { code: 'zh', name: 'Mandarim (chinês)', native: '普通话', bcp47: 'zh-CN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'es', name: 'Espanhol', native: 'Español', bcp47: 'es-ES' },
  { code: 'fr', name: 'Francês', native: 'Français', bcp47: 'fr-FR' },
  { code: 'ar', name: 'Árabe', native: 'العربية', bcp47: 'ar-SA' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', bcp47: 'bn-IN' },
  { code: 'pt', name: 'Português', native: 'Português', bcp47: 'pt-BR' },
  { code: 'ru', name: 'Russo', native: 'Русский', bcp47: 'ru-RU' },
  { code: 'ur', name: 'Urdu', native: 'اردو', bcp47: 'ur-PK' },
  { code: 'id', name: 'Indonésio', native: 'Bahasa Indonesia', bcp47: 'id-ID' },
  { code: 'de', name: 'Alemão', native: 'Deutsch', bcp47: 'de-DE' },
  { code: 'ja', name: 'Japonês', native: '日本語', bcp47: 'ja-JP' },
  { code: 'sw', name: 'Suaíli (swahili)', native: 'Kiswahili', bcp47: 'sw-KE' },
  { code: 'mr', name: 'Marata (marathi)', native: 'मराठी', bcp47: 'mr-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'tr', name: 'Turco', native: 'Türkçe', bcp47: 'tr-TR' },
  { code: 'ta', name: 'Tâmil', native: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'vi', name: 'Vietnamita', native: 'Tiếng Việt', bcp47: 'vi-VN' },
  { code: 'ko', name: 'Coreano', native: '한국어', bcp47: 'ko-KR' },
  { code: 'it', name: 'Italiano', native: 'Italiano', bcp47: 'it-IT' },
  { code: 'th', name: 'Tailandês', native: 'ไทย', bcp47: 'th-TH' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', bcp47: 'gu-IN' },
  { code: 'fa', name: 'Persa (farsi)', native: 'فارسی', bcp47: 'fa-IR' },
  { code: 'pa', name: 'Panjabi', native: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN' },
  { code: 'pl', name: 'Polonês', native: 'Polski', bcp47: 'pl-PL' },
  { code: 'uk', name: 'Ucraniano', native: 'Українська', bcp47: 'uk-UA' },
  { code: 'ms', name: 'Malaio', native: 'Bahasa Melayu', bcp47: 'ms-MY' },
  { code: 'ro', name: 'Romeno', native: 'Română', bcp47: 'ro-RO' },
  { code: 'nl', name: 'Neerlandês (holandês)', native: 'Nederlands', bcp47: 'nl-NL' },
  { code: 'ha', name: 'Hausa', native: 'Hausa', bcp47: 'ha-NG' },
  { code: 'am', name: 'Amárico', native: 'አማርኛ', bcp47: 'am-ET' },
  { code: 'yo', name: 'Iorubá (yoruba)', native: 'Yorùbá', bcp47: 'yo-NG' },
  { code: 'ig', name: 'Igbo', native: 'Asụsụ Igbo', bcp47: 'ig-NG' },
  { code: 'my', name: 'Birmanês', native: 'မြန်မာစာ', bcp47: 'my-MM' },
  { code: 'uz', name: 'Uzbeque', native: 'Oʻzbekcha', bcp47: 'uz-UZ' },
  { code: 'ceb', name: 'Cebuano', native: 'Cebuano', bcp47: 'ceb-PH' },
  { code: 'tl', name: 'Tagalo (filipino)', native: 'Tagalog', bcp47: 'tl-PH' },
  { code: 'el', name: 'Grego', native: 'Ελληνικά', bcp47: 'el-GR' },
  { code: 'hu', name: 'Húngaro', native: 'Magyar', bcp47: 'hu-HU' },
  { code: 'cs', name: 'Tcheco', native: 'Čeština', bcp47: 'cs-CZ' },
  { code: 'sv', name: 'Sueco', native: 'Svenska', bcp47: 'sv-SE' },
  { code: 'he', name: 'Hebraico', native: 'עברית', bcp47: 'he-IL' },
  { code: 'sr', name: 'Sérvio-croata', native: 'Srpskohrvatski', bcp47: 'sr-RS' },
  { code: 'bg', name: 'Búlgaro', native: 'Български', bcp47: 'bg-BG' },
  { code: 'da', name: 'Dinamarquês', native: 'Dansk', bcp47: 'da-DK' },
  { code: 'fi', name: 'Finlandês', native: 'Suomi', bcp47: 'fi-FI' },
  { code: 'no', name: 'Norueguês', native: 'Norsk', bcp47: 'no-NO' },
  { code: 'si', name: 'Cingalês (sinhala)', native: 'සිංහල', bcp47: 'si-LK' },
  { code: 'so', name: 'Somali', native: 'Soomaaliga', bcp47: 'so-SO' }
];

const TONES = [
  { id: 'neutral', label: 'Neutro' },
  { id: 'formal', label: 'Formal' },
  { id: 'informal', label: 'Informal' },
  { id: 'professional', label: 'Profissional' },
  { id: 'creative', label: 'Criativo / Adaptativo' }
];

interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

interface TranslatorProps {
  onOpenMobileHistory?: () => void;
  onBack?: () => void;
}

export default function Translator({ onOpenMobileHistory, onBack }: TranslatorProps) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('auto'); // 'auto' means Auto detect
  const [targetLang, setTargetLang] = useState<string>('en'); // Default target is English
  const [tone, setTone] = useState<string>('neutral');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuerySource, setSearchQuerySource] = useState('');
  const [searchQueryTarget, setSearchQueryTarget] = useState('');
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize SpeechSynthesis and load local history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const savedHistory = localStorage.getItem('wsm_translation_history');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse translation history:', e);
        }
      }
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Filter languages for dropdowns
  const filteredLanguagesSource = LANGUAGES_50.filter(lang => 
    lang.name.toLowerCase().includes(searchQuerySource.toLowerCase()) || 
    lang.native.toLowerCase().includes(searchQuerySource.toLowerCase())
  );

  const filteredLanguagesTarget = LANGUAGES_50.filter(lang => 
    lang.name.toLowerCase().includes(searchQueryTarget.toLowerCase()) || 
    lang.native.toLowerCase().includes(searchQueryTarget.toLowerCase())
  );

  // Perform translation using API
  const handleTranslate = async (textToTranslate = sourceText) => {
    if (!textToTranslate.trim()) {
      setTranslatedText('');
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const sourceLangLabel = sourceLang === 'auto' 
      ? 'Detecção automática' 
      : LANGUAGES_50.find(l => l.code === sourceLang)?.name || sourceLang;
    
    const targetLangObj = LANGUAGES_50.find(l => l.code === targetLang);
    const targetLangLabel = targetLangObj?.name || targetLang;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLanguage: sourceLangLabel,
          targetLanguage: targetLangLabel,
          tone: TONES.find(t => t.id === tone)?.label || tone
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao conectar ao serviço de tradução.');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);

      // Stop current speech if any
      if (synthRef.current) {
        synthRef.current.cancel();
        setIsPlaying(false);
      }

      // Save to history
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        sourceText: textToTranslate,
        translatedText: data.translatedText,
        sourceLang: sourceLang,
        targetLang: targetLang,
        timestamp: Date.now()
      };

      const updatedHistory = [newItem, ...history].slice(0, 30); // Keep last 30
      setHistory(updatedHistory);
      localStorage.setItem('wsm_translation_history', JSON.stringify(updatedHistory));

    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message || 'Erro ao traduzir. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce translate or translate on command
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  };

  // Switch source and target languages
  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      // Cannot swap auto, default to English instead
      setSourceLang(targetLang);
      setTargetLang('pt');
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }

    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  // Copy translated text to clipboard
  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Speech synthesis play/stop
  const handleSpeak = () => {
    if (!translatedText || !synthRef.current) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      return;
    }

    const targetLangObj = LANGUAGES_50.find(l => l.code === targetLang);
    if (!targetLangObj) return;

    // Standard SpeechSynthesisUtterance setup
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utteranceRef.current = utterance;
    
    // Attempt to set matching voice BCP-47 tag
    utterance.lang = targetLangObj.bcp47;

    // Find custom voices for the language
    const voices = synthRef.current.getVoices();
    const matchingVoice = voices.find(v => 
      v.lang.toLowerCase() === targetLangObj.bcp47.toLowerCase() ||
      v.lang.toLowerCase().startsWith(targetLangObj.code.toLowerCase())
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    setIsPlaying(true);
    synthRef.current.speak(utterance);
  };

  // Select item from translation history
  const handleSelectHistory = (item: HistoryItem) => {
    setSourceText(item.sourceText);
    setTranslatedText(item.translatedText);
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setError(null);
  };

  // Delete individual history item
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('wsm_translation_history', JSON.stringify(updated));
  };

  // Clear all history
  const handleClearHistory = () => {
    if (confirm('Deseja limpar todo o histórico de traduções?')) {
      setHistory([]);
      localStorage.removeItem('wsm_translation_history');
    }
  };

  const currentSourceLangLabel = sourceLang === 'auto' 
    ? 'Detectar idioma' 
    : LANGUAGES_50.find(l => l.code === sourceLang)?.name || sourceLang;

  const currentTargetLangLabel = LANGUAGES_50.find(l => l.code === targetLang)?.name || targetLang;

  return (
    <div id="wsm-translator" className="flex-1 bg-[#FAF9F6] flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Voltar para Ferramentas"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5c53e5]">
            <Languages size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Tradutor WSM AI</h1>
            <p className="text-[11px] text-gray-500 font-medium">Tradução instantânea de alta precisão baseada em Inteligência Artificial</p>
          </div>
        </div>
        
        {onOpenMobileHistory && (
          <button 
            onClick={onOpenMobileHistory}
            className="md:hidden flex items-center gap-1 text-[13px] text-[#5c53e5] font-semibold"
          >
            ‹ Histórico
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col gap-6 max-w-5xl mx-auto w-full">
        {/* Workspace Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Source Panel */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 flex flex-col gap-4 min-h-[320px]">
            {/* Header: Lang selection */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 relative">
              <div className="relative">
                <button
                  onClick={() => {
                    setIsSourceDropdownOpen(!isSourceDropdownOpen);
                    setIsTargetDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-[13px] font-semibold text-gray-700 transition-colors"
                >
                  <span>{currentSourceLangLabel}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {/* Dropdown list */}
                <AnimatePresence>
                  {isSourceDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute left-0 mt-1.5 w-64 bg-white border border-gray-150 rounded-xl shadow-lg z-30 max-h-80 flex flex-col overflow-hidden"
                    >
                      <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-gray-50/50">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Buscar idioma..."
                          value={searchQuerySource}
                          onChange={(e) => setSearchQuerySource(e.target.value)}
                          className="w-full bg-transparent border-none text-[12px] text-gray-700 focus:outline-none focus:ring-0 p-0.5"
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        <button
                          onClick={() => {
                            setSourceLang('auto');
                            setIsSourceDropdownOpen(false);
                            setSearchQuerySource('');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                            sourceLang === 'auto' ? 'bg-indigo-50/60 text-[#5c53e5]' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          Detectar idioma automaticamente
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        {filteredLanguagesSource.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setSourceLang(lang.code);
                              setIsSourceDropdownOpen(false);
                              setSearchQuerySource('');
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${
                              sourceLang === lang.code ? 'bg-indigo-50/60 text-[#5c53e5] font-semibold' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span>{lang.name}</span>
                            <span className="text-[10px] text-gray-400 font-normal">{lang.native}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Character Count */}
              <span className="text-[11px] font-medium text-gray-400 font-mono">
                {sourceText.length}/5000
              </span>
            </div>

            {/* Input area */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value.slice(0, 5000))}
                onKeyDown={handleKeyDown}
                placeholder="Escreva ou cole o texto aqui para traduzir..."
                className="w-full flex-1 min-h-[160px] resize-none border-none text-[14.5px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 leading-relaxed p-1"
              />
            </div>

            {/* Bottom Actions for source */}
            <div className="flex items-center justify-between border-t border-gray-100/60 pt-3 mt-auto">
              <div className="flex items-center gap-1">
                {sourceText.trim() && (
                  <button
                    onClick={() => {
                      setSourceText('');
                      setTranslatedText('');
                      setError(null);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors text-xs font-semibold"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Tone Select Dropdown */}
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#5c53e5]/20 font-medium cursor-pointer"
                >
                  {TONES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleTranslate()}
                  disabled={isLoading || !sourceText.trim()}
                  className="px-4 py-1.5 bg-[#5c53e5] hover:bg-[#4b43c4] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-98 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Traduzindo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Traduzir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Target Panel */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 flex flex-col gap-4 min-h-[320px] relative">
            
            {/* Swap Floating Button in Between Panels */}
            <div className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 md:flex hidden z-20">
              <button
                onClick={handleSwapLanguages}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-[#5c53e5] shadow-xs flex items-center justify-center hover:scale-115 transition-all duration-200 cursor-pointer"
                title="Inverter idiomas"
              >
                <ArrowLeftRight size={13} />
              </button>
            </div>

            {/* Header: Lang selection */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 relative">
              <div className="relative">
                <button
                  onClick={() => {
                    setIsTargetDropdownOpen(!isTargetDropdownOpen);
                    setIsSourceDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-[13px] font-semibold text-[#5c53e5] transition-colors"
                >
                  <span>{currentTargetLangLabel}</span>
                  <ChevronDown size={14} className="text-[#5c53e5]/60" />
                </button>

                {/* Dropdown list */}
                <AnimatePresence>
                  {isTargetDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute left-0 mt-1.5 w-64 bg-white border border-gray-150 rounded-xl shadow-lg z-30 max-h-80 flex flex-col overflow-hidden"
                    >
                      <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-gray-50/50">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Buscar idioma..."
                          value={searchQueryTarget}
                          onChange={(e) => setSearchQueryTarget(e.target.value)}
                          className="w-full bg-transparent border-none text-[12px] text-gray-700 focus:outline-none focus:ring-0 p-0.5"
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        {filteredLanguagesTarget.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setTargetLang(lang.code);
                              setIsTargetDropdownOpen(false);
                              setSearchQueryTarget('');
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${
                              targetLang === lang.code ? 'bg-indigo-50/60 text-[#5c53e5] font-semibold' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span>{lang.name}</span>
                            <span className="text-[10px] text-gray-400 font-normal">{lang.native}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile swap button alternative */}
              <button
                onClick={handleSwapLanguages}
                className="md:hidden flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                title="Inverter idiomas"
              >
                <ArrowLeftRight size={14} />
              </button>
            </div>

            {/* Display translation area */}
            <div className="flex-1 flex flex-col relative">
              {isLoading ? (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-3xs flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#5c53e5] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-500 font-medium font-mono">Traduzindo texto...</span>
                </div>
              ) : null}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 mb-2 shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-red-700 font-medium">{error}</p>
                </div>
              )}

              <div className="w-full flex-1 min-h-[160px] text-[14.5px] text-gray-800 leading-relaxed overflow-y-auto whitespace-pre-wrap select-text p-1">
                {translatedText ? (
                  translatedText
                ) : (
                  <span className="text-gray-400 italic font-light text-[13px]">
                    Sua tradução aparecerá aqui...
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Actions for target */}
            <div className="flex items-center justify-between border-t border-gray-100/60 pt-3 mt-auto shrink-0">
              <div className="flex items-center gap-1.5">
                {/* Text to Speech */}
                <button
                  onClick={handleSpeak}
                  disabled={!translatedText}
                  className={`p-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isPlaying 
                      ? 'bg-red-50 text-red-500 border border-red-100' 
                      : 'hover:bg-gray-50 text-gray-500 hover:text-gray-800 border border-transparent'
                  } disabled:opacity-30 disabled:pointer-events-none`}
                  title={isPlaying ? "Parar leitura" : "Ouvir tradução"}
                >
                  {isPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  {isPlaying && <span className="text-[10px] font-bold uppercase tracking-wider animate-pulse px-0.5">Ouvindo...</span>}
                </button>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                disabled={!translatedText}
                className="px-3 py-1.5 hover:bg-gray-50 disabled:opacity-30 border border-gray-200 text-gray-600 hover:text-gray-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:pointer-events-none"
              >
                {isCopied ? (
                  <>
                    <Check size={13} className="text-emerald-500" />
                    <span className="text-emerald-600">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

        {/* Translation History Section */}
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-800">
              <History size={16} className="text-gray-500" />
              <h3 className="text-[13.5px] font-bold">Histórico Recente</h3>
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[11px] font-semibold text-red-500 hover:text-red-700 hover:underline transition-all"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-8 border border-dashed border-gray-200/80 rounded-2xl bg-white text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-medium">As suas traduções recentes serão arquivadas aqui localmente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto p-0.5 custom-scrollbar">
              {history.map((item) => {
                const srcName = item.sourceLang === 'auto' 
                  ? 'Detectado' 
                  : LANGUAGES_50.find(l => l.code === item.sourceLang)?.name || item.sourceLang;
                const tgtName = LANGUAGES_50.find(l => l.code === item.targetLang)?.name || item.targetLang;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistory(item)}
                    className="p-3.5 bg-white hover:bg-zinc-50/50 border border-gray-200/80 rounded-xl cursor-pointer transition-all flex flex-col gap-2 group text-left relative"
                  >
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span>{srcName}</span>
                        <CornerDownRight size={10} className="text-gray-300" />
                        <span className="text-[#5c53e5]">{tgtName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] text-gray-400 font-medium font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-1 text-gray-300 hover:text-red-500 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover do histórico"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:divide-x md:divide-gray-100">
                      <div className="text-gray-600 line-clamp-2 leading-relaxed pr-2">
                        {item.sourceText}
                      </div>
                      <div className="text-gray-800 font-medium line-clamp-2 leading-relaxed md:pl-4">
                        {item.translatedText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
