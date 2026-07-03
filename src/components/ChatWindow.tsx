import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Globe, Mic, ArrowUp, Sparkles, Copy, Check, ChevronDown, Download, ZoomIn, X, ChevronsLeft, XCircle } from 'lucide-react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import SearchMessageView from './SearchMessageView';
import TypewriterMarkdown from './TypewriterMarkdown';

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

interface ChatWindowProps {
  key?: string;
  messages: Message[];
  title: string;
  isThinking: boolean;
  onSendMessage: (text: string, isSearchEnabled: boolean) => void;
  onBackToHome: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onSearchSimulationComplete?: (messageId: string) => void;
  onCancelGeneration?: () => void;
}

export default function ChatWindow({
  messages,
  title,
  isThinking,
  onSendMessage,
  onBackToHome,
  selectedModel,
  setSelectedModel,
  onSearchSimulationComplete,
  onCancelGeneration
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [drawerSources, setDrawerSources] = useState<{
    sources: { hostname: string; title: string; url: string; snippet?: string }[];
    query: string;
    count: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue, isSearchEnabled);
    setInputValue('');
    setIsSearchEnabled(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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

  return (
    <div id="wsm-chat-window" className="flex-1 flex flex-col h-full bg-[#fcfbfa] relative overflow-hidden">
      
      {/* Top Header */}
      <header className="px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-[#eae6e1] flex items-center justify-between relative z-40">
        <div className="flex items-center gap-2.5">
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
              <div className="absolute left-0 mt-1 w-80 bg-white border border-gray-150 rounded-xl shadow-lg z-50 p-1">
                {modelsList.map((model) => {
                  const isActive = selectedModel === model;
                  const isClickable = model === 'WSM 1.6 Mercúrio';
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
                          : isClickable 
                            ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-50' 
                            : 'text-gray-400 cursor-not-allowed opacity-50 bg-gray-50/50'
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
                      </div>
                      <p className="text-[11px] text-gray-400 pl-2 leading-tight font-normal">
                        {modelDescriptions[model]}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <span className="w-1 h-1 bg-emerald-500 rounded-full inline-block animate-ping" />
            Ativo
          </span>
        </div>

        {/* Back Button */}
        <button
          id="btn-back-home"
          onClick={onBackToHome}
          className="text-[11px] font-bold text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-[#eae6e1] px-3 py-1 rounded-full transition-all cursor-pointer active:scale-95"
        >
          Nova conversa
        </button>
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
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
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
                    {message.isSearchMessage ? (
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
                        ) : (
                          <div className="prose max-w-none text-[14px] text-gray-800 w-full">
                            <TypewriterMarkdown
                              content={message.text}
                              enabled={!processedMessageIdsRef.current.has(message.id)}
                              onComplete={() => handleTypewriterComplete(message.id)}
                            />
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
                            if (!uniqueSources.some(s => s.hostname === hostname)) {
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
                  
                  {/* Timestamp */}
                  {!(message.text === "" && isThinking && message.id === messages[messages.length - 1]?.id) && (
                    <span className="text-[9px] text-gray-400 mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}



          {/* Spacing at the bottom of the container */}
          <div className="h-14" />
          {/* Empty scroll target */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Area */}
      <footer className="p-3 bg-white border-t border-[#eae6e1] relative z-10">
        <form
          onSubmit={handleSubmit}
          className="max-w-xl mx-auto bg-white border border-[#eae6e1] rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.01)] p-2 focus-within:border-[#5c53e5]/50 focus-within:ring-1 focus-within:ring-[#5c53e5]/15 transition-all duration-200"
        >
          {/* Textarea */}
          <textarea
            id="chat-input-textarea-floating"
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Pergunte ao ${selectedModel}...`}
            className="w-full bg-transparent outline-none resize-none text-gray-800 placeholder-gray-400 text-[13.5px] leading-relaxed pb-1 max-h-24"
          />

          {/* Bottom Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            {/* Left Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
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
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Voz"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              <button
                type={isThinking ? "button" : "submit"}
                onClick={isThinking ? onCancelGeneration : undefined}
                disabled={!inputValue.trim() && !isThinking}
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all ${
                  isThinking
                    ? 'bg-[#ff4d4d] hover:bg-[#ff3333] cursor-pointer'
                    : inputValue.trim()
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
        </form>
        <div className="text-[9px] text-center text-gray-400 font-medium pt-1.5 select-none">
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
    </div>
  );
}
