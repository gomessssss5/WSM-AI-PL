import React, { useState, useEffect, useRef } from 'react';
import { Message, SearchStep } from '../types';
import { Globe, Check, ChevronDown, ChevronUp, ZoomIn } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import TypewriterMarkdown from './TypewriterMarkdown';
import { extractWsmForm } from '../utils/formParser';
import { extractWsmDoc } from '../utils/docParser';
import { extractRaciocinio, cleanRaciocinioTags } from '../utils/raciocinioParser';
import { ReasoningBlock } from './ReasoningBlock';
import { SearchImageCarousel } from './SearchImageCarousel';
import DocumentCard from './DocumentCard';

interface SearchMessageViewProps {
  message: Message;
  title: string;
  setLightboxImage: (url: string) => void;
  onSimulationComplete?: () => void;
  onStepChange?: () => void;
  onOpenSources?: (sources: { hostname: string; title: string; url: string; snippet?: string }[], query: string, count: number) => void;
}

export default function SearchMessageView({
  message,
  title,
  setLightboxImage,
  onSimulationComplete,
  onStepChange,
  onOpenSources
}: SearchMessageViewProps) {
  const steps = message.searchSteps || [];
  const totalSteps = steps.length;

  const rawSearchText = message.text || message.finalSynthesis || "";
  const { cleanText, raciocinio, isFinished: isRaciocinioFinished } = extractRaciocinio(rawSearchText);

  const [isReasoningDone, setIsReasoningDone] = useState<boolean>(() => {
    return !raciocinio || !message.isSimulatingSearch;
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [showFinal, setShowFinal] = useState(false);

  // Refs to avoid React hook stale closure issues in async streaming loops
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const finalSynthesisRef = useRef(message.finalSynthesis);
  finalSynthesisRef.current = message.finalSynthesis;

  const isSimulatingSearchRef = useRef(message.isSimulatingSearch);
  isSimulatingSearchRef.current = message.isSimulatingSearch;

  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  const onSimulationCompleteRef = useRef(onSimulationComplete);
  onSimulationCompleteRef.current = onSimulationComplete;

  const hasStartedRef = useRef<string | null>(null);

  // Helper to extract domain names
  const getDomain = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      return urlStr;
    }
  };

  const getFaviconUrl = (urlStr: string) => {
    const domain = getDomain(urlStr);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  // We can track the last message ID to reset states on message change
  const lastMessageIdRef = useRef<string | null>(null);
  const activeStepStartTimeRef = useRef<number>(0);

  if (lastMessageIdRef.current !== message.id) {
    lastMessageIdRef.current = message.id;
    // Reset state directly during render to avoid extra renders or latency
    setCurrentStepIndex(0);
    setCompletedSteps({});
    setShowFinal(false);
    activeStepStartTimeRef.current = Date.now();
    setIsReasoningDone(!raciocinio || !message.isSimulatingSearch);
  }

  useEffect(() => {
    if (!message.isSimulatingSearch) {
      // Historical messages load instantly
      console.log('[SearchMessageView] Loading historical/completed search message instantly.');
      const allDone: Record<number, boolean> = {};
      for (let i = 0; i < totalSteps; i++) {
        allDone[i] = true;
      }
      setCompletedSteps(allDone);
      setCurrentStepIndex(totalSteps);
      setShowFinal(true);
      return;
    }

    if (!isReasoningDone) {
      // Do NOT start search simulation steps until reasoning finishes and auto-closes
      return;
    }

    if (totalSteps === 0) return;

    // We are simulating search. Check if current step has completed on the backend
    const currentStep = steps[currentStepIndex];
    if (!currentStep) {
      // All search steps have been processed sequentially
      // Now wait for the final synthesis from the backend
      if (message.finalSynthesis && !showFinal) {
        console.log("[SearchMessageView] All steps done, final synthesis arrived. Completing simulation.");
        setShowFinal(true);
        onStepChangeRef.current?.();
        onSimulationCompleteRef.current?.();
      }
      return;
    }

    // Is the current step completed on the backend?
    const isCompletedOnBackend = currentStep.isCompleted !== undefined 
      ? currentStep.isCompleted 
      : !!(currentStep.sources && currentStep.sources.length > 0);

    if (isCompletedOnBackend) {
      // Backend completed this step! Verify if the minimum visual pacing duration (1.2 seconds) has passed
      const now = Date.now();
      const elapsed = now - activeStepStartTimeRef.current;
      const minPaceDelay = 1200;

      if (elapsed >= minPaceDelay) {
        // Yes, 1.2s visual delay is satisfied. Complete this step visually
        console.log(`[SearchMessageView] Completing step ${currentStepIndex} (tag="${currentStep.tag}")`);
        setCompletedSteps(prev => {
          if (prev[currentStepIndex]) return prev;
          return { ...prev, [currentStepIndex]: true };
        });
        onStepChangeRef.current?.();

        // Pause for 800ms transition, then advance to the next step
        const timer = setTimeout(() => {
          console.log(`[SearchMessageView] Advancing from step ${currentStepIndex} to ${currentStepIndex + 1}`);
          activeStepStartTimeRef.current = Date.now();
          setCurrentStepIndex(prev => prev + 1);
          onStepChangeRef.current?.();
        }, 800);

        return () => clearTimeout(timer);
      } else {
        // Backend completed the search fast, so wait for the remainder of the 1.2s visual delay
        const remaining = minPaceDelay - elapsed;
        console.log(`[SearchMessageView] Step ${currentStepIndex} completed on backend. Visual pacing delay remaining: ${remaining}ms`);
        const timer = setTimeout(() => {
          setCompletedSteps(prev => {
            if (prev[currentStepIndex]) return prev;
            return { ...prev, [currentStepIndex]: true };
          });
          onStepChangeRef.current?.();

          const nextTimer = setTimeout(() => {
            console.log(`[SearchMessageView] Advancing from step ${currentStepIndex} to ${currentStepIndex + 1}`);
            activeStepStartTimeRef.current = Date.now();
            setCurrentStepIndex(prev => prev + 1);
            onStepChangeRef.current?.();
          }, 800);
        }, remaining);

        return () => clearTimeout(timer);
      }
    } else {
      // Backend is still working on this step. Do nothing, just wait for backend/prop updates to trigger re-run
      console.log(`[SearchMessageView] Step ${currentStepIndex} is still running on the backend. Waiting for data...`);
    }
  }, [
    message.id,
    totalSteps,
    message.isSimulatingSearch,
    currentStepIndex,
    steps,
    message.finalSynthesis,
    showFinal
  ]);

  // Handle collapsible state of a step
  const toggleExpand = (idx: number) => {
    setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
    setTimeout(() => onStepChangeRef.current?.(), 50);
  };

  // Dynamic conditions for rendering
  const isStepVisible = (idx: number) => {
    if (!message.isSimulatingSearch) return true;
    return idx <= currentStepIndex;
  };

  const isStepActive = (idx: number) => {
    if (!message.isSimulatingSearch) return false;
    return idx === currentStepIndex && !completedSteps[idx];
  };

  const isStepDone = (idx: number) => {
    if (!message.isSimulatingSearch) return true;
    return !!completedSteps[idx];
  };

  return (
    <div className="w-full flex flex-col space-y-3.5 animate-fade-in">
      {/* 0. Reasoning Block */}
      {raciocinio && (
        <ReasoningBlock
          id={message.id}
          raciocinio={raciocinio}
          isReasoningFinished={isRaciocinioFinished || !message.isSimulatingSearch}
          isHistorical={!message.isSimulatingSearch}
          onSequenceComplete={() => {
            setIsReasoningDone(true);
          }}
        />
      )}

      {/* Gate everything else on isReasoningDone */}
      {isReasoningDone && (
        <>
          {/* 1. Initial Loading Placeholder before Research Plan Arrives */}
          {totalSteps === 0 ? (
            !message.isSimulatingSearch ? (
              <div className="w-full flex flex-col space-y-3.5 animate-fade-in">
                <div className="prose max-w-none text-[14px] text-gray-800 leading-relaxed w-full">
                  <MarkdownRenderer content={extractWsmDoc(extractWsmForm(cleanRaciocinioTags(message.text || message.finalSynthesis || "Erro na pesquisa.")).cleanText).cleanText} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-3.5 w-full animate-fade-in py-1">
                <div className="flex items-center gap-2.5 text-gray-500 text-[14px] font-medium select-none">
                  <Globe className="w-4.5 h-4.5 text-purple-500 animate-spin" />
                  <span className="italic">Planejando a melhor estratégia de pesquisa na web...</span>
                </div>
                <div className="h-14 w-full bg-gray-50/55 border border-gray-150 rounded-xl animate-pulse" />
              </div>
            )
          ) : (
            <>
              {/* 2. Introduction Narrative Paragraph */}
              {message.searchIntro && (
                <div className="prose max-w-none text-[14px] text-gray-800 leading-relaxed w-full">
                  <MarkdownRenderer content={message.searchIntro} />
                </div>
              )}

              {/* 3. Interactive Steps Stream */}
      {steps.map((step, idx) => {
        if (!isStepVisible(idx)) return null;

        const isActive = isStepActive(idx);
        const isDone = isStepDone(idx);
        const isExpanded = !!expandedSteps[idx];

        return (
          <div key={idx} className="flex flex-col space-y-1.5 w-full animate-fade-in">
            {/* Tag Pill Row */}
            <div className="flex items-center justify-start py-0.5">
              <button
                type="button"
                onClick={() => isDone && toggleExpand(idx)}
                disabled={!isDone}
                className={`inline-flex items-center gap-1.5 text-[12px] font-medium py-1 px-2.5 rounded-full border transition-all select-none ${
                  isActive
                    ? 'text-purple-600 bg-purple-50/30 border-purple-150 italic cursor-default'
                    : isDone
                    ? 'text-gray-500 bg-gray-50/50 hover:bg-gray-100/50 border-gray-150 cursor-pointer active:scale-97 shadow-3xs'
                    : 'text-gray-400 bg-transparent border-transparent cursor-default'
                }`}
              >
                {isActive ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    <span>Pesquisando na web: <strong className="font-semibold text-purple-700">"{step.tag}"</strong></span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span>Pesquisou na web: <strong className="font-semibold text-gray-600">"{step.tag}"</strong></span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-1 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1 shrink-0" />
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Timeline expanded detail view */}
            {isDone && isExpanded && (
              <div className="flex gap-3 pl-3.5 py-1.5 animate-fade-in w-full">
                {/* Left timeline thread column */}
                <div className="flex flex-col items-center shrink-0 w-6">
                  {/* Globe circle */}
                  <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 mt-1 select-none">
                    <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                  </div>
                  {/* Connector line */}
                  <div className="w-[1.5px] flex-1 bg-gray-150/70 my-1" />
                  {/* Check circle */}
                  <div className="w-5 h-5 rounded-full bg-green-50/50 flex items-center justify-center border border-green-150 mb-1 select-none">
                    <Check className="w-2.5 h-2.5 text-green-500 shrink-0" />
                  </div>
                </div>

                {/* Right content box */}
                <div className="flex-1 min-w-0">
                  {/* Header text */}
                  <div className="text-[11px] text-gray-400 font-medium select-none mb-0.5">
                    Pesquisou na web
                  </div>

                  {/* Subtitle tag and count */}
                  <div className="flex items-center justify-between mb-2 select-none pr-1">
                    <span className="text-[13px] font-bold text-gray-700 truncate mr-2">
                      {step.tag}
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {step.sources.length} resultados
                    </span>
                  </div>

                  {/* Sources List Box */}
                  <div className="border border-gray-150 rounded-xl bg-[#faf9f6]/40 overflow-hidden shadow-2xs divide-y divide-gray-150/40">
                    {step.sources.map((src, sIdx) => {
                      const domain = getDomain(src.url);
                      return (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 hover:bg-gray-100/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-3">
                            <div className="w-4.5 h-4.5 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden shadow-3xs">
                              <img
                                src={getFaviconUrl(src.url)}
                                alt=""
                                className="w-2.5 h-2.5 object-contain rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
                                }}
                              />
                            </div>
                            <span className="text-[12px] font-semibold text-gray-700 truncate hover:text-[#5c53e5]">
                              {src.title}
                            </span>
                          </div>
                          <span className="text-[10.5px] text-gray-400 hover:text-gray-600 font-mono shrink-0 select-none">
                            {domain}
                          </span>
                        </a>
                      );
                    })}
                  </div>

                  {/* Concluído row */}
                  <div className="text-[11.5px] text-gray-400/95 font-bold mt-2 select-none">
                    Concluído
                  </div>
                </div>
              </div>
            )}

            {/* Transition/Bridge Paragraph */}
            {isDone && step.transition && (
              <div className="prose max-w-none text-[13.5px] text-gray-700 italic pl-1 leading-relaxed py-1 animate-fade-in">
                {step.transition}
              </div>
            )}
          </div>
        );
      })}

      {/* 4. Tavily Search Images Carousel (only at the end of the simulation) */}
      {(showFinal || !message.isSimulatingSearch) && message.searchImages && message.searchImages.length > 0 && (
        <SearchImageCarousel images={message.searchImages} onImageClick={setLightboxImage} />
      )}

      {/* 5. Final Synthesized Markdown Answer */}
      {(showFinal || !message.isSimulatingSearch) && (message.finalSynthesis || message.text) && (
        <div className="prose max-w-none text-[14px] text-gray-800 leading-relaxed w-full mt-3 pt-3 border-t border-gray-150/50 animate-fade-in">
          <TypewriterMarkdown
            content={extractWsmDoc(extractWsmForm(message.finalSynthesis || message.text || "").cleanText).cleanText}
            enabled={message.isSimulatingSearch}
            onComplete={onStepChange}
          />
        </div>
      )}

      {/* 5b. Document Cards Grid */}
      {(showFinal || !message.isSimulatingSearch) && (() => {
        const { docObjs } = extractWsmDoc(extractWsmForm(cleanRaciocinioTags(message.finalSynthesis || message.text || "")).cleanText);
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

      {/* 6. Tavily Search Sources Pill footer */}
      {(showFinal || !message.isSimulatingSearch) && message.searchSources && message.searchSources.length > 0 && onOpenSources && (
        <div className="mt-3 pt-3 border-t border-gray-150/50 flex items-center justify-start animate-fade-in">
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
                  onOpenSources(uniqueSources, title, count);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-white hover:bg-[#f0ede8] border border-[#eae6e1] rounded-full text-xs font-semibold transition-all shadow-3xs cursor-pointer select-none active:scale-95 text-gray-700"
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
      )}
    </div>
  );
}
