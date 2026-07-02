import React, { useState } from 'react';
import { Paperclip, Globe, Mic, ArrowUp, Pencil, Code, Image as ImageIcon, Brain, Languages, ChevronDown, Sparkles } from 'lucide-react';

interface MainHomeProps {
  onSendMessage: (text: string, isSearchEnabled: boolean) => void;
  onSuggestionClick: (suggestionType: 'write' | 'code' | 'image' | 'analysis' | 'translate') => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export default function MainHome({
  onSendMessage,
  onSuggestionClick,
  selectedModel,
  setSelectedModel
}: MainHomeProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue, isSearchEnabled);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
  };

  return (
    <div id="wsm-main-home" className="flex-1 flex flex-col h-full bg-[#fcfbfa] relative overflow-hidden select-none dot-grid">
      
      {/* Ambient background glows */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] glow-left pointer-events-none rounded-full" />
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] glow-right pointer-events-none rounded-full" />

      {/* Top Header / Action Bar */}
      <header className="relative z-40 px-5 py-3.5 flex items-center justify-between">
        {/* Model Dropdown Pill */}
        <div className="relative z-50">
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
            <div className="absolute left-0 mt-1.5 w-80 bg-white border border-gray-150 rounded-xl shadow-lg z-50 p-1">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Modelos Disponíveis
              </div>
              <div className="flex flex-col gap-0.5">
                {modelsList.map((model) => {
                  const isActive = selectedModel === model;
                  const isClickable = model === 'WSM 1.6 Mercúrio';
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
                      </div>
                      <p className="text-[11px] text-gray-400 pl-3 leading-tight font-normal">
                        {modelDescriptions[model]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Promo Purple Pill Banner */}
        <div 
          id="promo-banner"
          className="flex items-center gap-1.5 bg-[#5c53e5] hover:bg-[#4b42cc] text-white pl-1 pr-3 py-1 rounded-full shadow-[0_1px_5px_rgba(92,83,229,0.12)] transition-all cursor-pointer select-none active:scale-[0.99]"
        >
          <div className="bg-[#4139bd] text-[8px] font-extrabold tracking-wider px-2 py-0.5 rounded-full text-white uppercase shadow-inner">
            NOVO
          </div>
          <span className="text-[10px] font-medium tracking-wide">
            Geração de imagens WSM 1.6 ativa →
          </span>
        </div>
      </header>

      {/* Main Center content area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full relative z-10 pb-8">
        
        {/* Animated Central squircle mock dashboard */}
        <div 
          id="center-avatar-card"
          className="w-16 h-16 flex items-center justify-center mb-6 select-none relative z-50"
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
        <h1 id="home-headline" className="text-center mb-5 select-none">
          <span className="font-sans font-extrabold text-gray-900 tracking-tight text-[1.95rem] md:text-[2.3rem]">
            Como posso{' '}
          </span>
          <span className="font-sans font-light text-gray-400 tracking-tight text-[1.95rem] md:text-[2.3rem]">
            ajudar?
          </span>
        </h1>

        {/* Main Large Chat Input Box */}
        <form 
          onSubmit={handleSubmit}
          className="w-full max-w-xl bg-white border border-[#eae6e1] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] p-2.5 focus-within:border-[#5c53e5]/50 focus-within:ring-1 focus-within:ring-[#5c53e5]/25 transition-all duration-200 relative mb-4"
        >
          {/* Text Area Input */}
          <textarea
            id="chat-input-textarea"
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Digitar por voz"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              <button
                type="submit"
                id="btn-send-message"
                disabled={!inputValue.trim()}
                className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all ${
                  inputValue.trim()
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
        <div id="suggestion-chips-row" className="flex flex-wrap items-center justify-center gap-2 max-w-md">
          <button
            type="button"
            id="suggestion-write"
            onClick={() => onSuggestionClick('write')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#eae6e1] hover:border-gray-300 rounded-full text-[12.5px] font-semibold text-gray-700 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
          >
            <Pencil className="w-3 h-3 text-blue-500" />
            <span>Escrever</span>
          </button>

          <button
            type="button"
            id="suggestion-code"
            onClick={() => onSuggestionClick('code')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#eae6e1] hover:border-gray-300 rounded-full text-[12.5px] font-semibold text-gray-700 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
          >
            <Code className="w-3 h-3 text-emerald-500" />
            <span>Programar</span>
          </button>

          <button
            type="button"
            id="suggestion-image"
            onClick={() => onSuggestionClick('image')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#eae6e1] hover:border-gray-300 rounded-full text-[12.5px] font-semibold text-gray-700 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
          >
            <ImageIcon className="w-3 h-3 text-purple-500" />
            <span>Criar imagem</span>
          </button>

          <button
            type="button"
            id="suggestion-analysis"
            onClick={() => onSuggestionClick('analysis')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#eae6e1] hover:border-gray-300 rounded-full text-[12.5px] font-semibold text-gray-700 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
          >
            <Brain className="w-3 h-3 text-orange-500" />
            <span>Analisar</span>
          </button>

          <button
            type="button"
            id="suggestion-translate"
            onClick={() => onSuggestionClick('translate')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#eae6e1] hover:border-gray-300 rounded-full text-[12.5px] font-semibold text-gray-700 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
          >
            <Languages className="w-3 h-3 text-red-500" />
            <span>Traduzir</span>
          </button>
        </div>

      </main>
    </div>
  );
}
