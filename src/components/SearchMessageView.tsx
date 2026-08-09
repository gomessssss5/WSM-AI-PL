import React, { useState, useEffect, useRef } from 'react';
import { Message, SearchStep, WsmDocument } from '../types';
import { Globe, Check, ChevronDown, ChevronUp, ChevronRight, CheckCircle2 } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import TypewriterMarkdown from './TypewriterMarkdown';
import { extractWsmForm } from '../utils/formParser';
import { extractWsmDoc } from '../utils/docParser';
import { extractRaciocinio, cleanRaciocinioTags } from '../utils/raciocinioParser';
import { cleanWorkspaceTags } from '../utils/workspaceParser';
import { cleanHistoryTags } from '../utils/historyParser';
import { WorkspaceTasksBlock } from './WorkspaceTasksBlock';
import { ReasoningBlock } from './ReasoningBlock';
import { SearchImageCarousel } from './SearchImageCarousel';
import DocumentCard from './DocumentCard';
import ScheduledTaskCard from './ScheduledTaskCard';
import { extractWsmTasks } from '../utils/taskParser';

interface SearchMessageViewProps {
  message: Message;
  title: string;
  setLightboxImage: (url: string) => void;
  onSimulationComplete?: () => void;
  onStepChange?: () => void;
  onOpenSources?: (sources: { hostname: string; title: string; url: string; snippet?: string }[], query: string, count: number) => void;
  onOpenScheduledTasks?: () => void;
  onOpenDocument?: (doc: WsmDocument) => void;
  onOpenWorkspace?: () => void;
  attachedImages?: string[];
}

export default function SearchMessageView({
  message,
  title,
  setLightboxImage,
  onSimulationComplete,
  onStepChange,
  onOpenSources,
  onOpenScheduledTasks,
  onOpenDocument,
  onOpenWorkspace,
  attachedImages
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
      if ((import.meta as any).env?.DEV) console.log('[SearchMessageView] Loading historical/completed search message instantly.');
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
        if ((import.meta as any).env?.DEV) console.log("[SearchMessageView] All steps done, final synthesis arrived. Completing simulation.");
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
        if ((import.meta as any).env?.DEV) console.log(`[SearchMessageView] Completing step ${currentStepIndex} (tag="${currentStep.tag}")`);
        setCompletedSteps(prev => {
          if (prev[currentStepIndex]) return prev;
          return { ...prev, [currentStepIndex]: true };
        });
        onStepChangeRef.current?.();

        // Pause for 800ms transition, then advance to the next step
        const timer = setTimeout(() => {
          if ((import.meta as any).env?.DEV) console.log(`[SearchMessageView] Advancing from step ${currentStepIndex} to ${currentStepIndex + 1}`);
          activeStepStartTimeRef.current = Date.now();
          setCurrentStepIndex(prev => prev + 1);
          onStepChangeRef.current?.();
        }, 800);

        return () => clearTimeout(timer);
      } else {
        // Backend completed the search fast, so wait for the remainder of the 1.2s visual delay
        const remaining = minPaceDelay - elapsed;
        if ((import.meta as any).env?.DEV) console.log(`[SearchMessageView] Step ${currentStepIndex} completed on backend. Visual pacing delay remaining: ${remaining}ms`);
        const timer = setTimeout(() => {
          setCompletedSteps(prev => {
            if (prev[currentStepIndex]) return prev;
            return { ...prev, [currentStepIndex]: true };
          });
          onStepChangeRef.current?.();

          const nextTimer = setTimeout(() => {
            if ((import.meta as any).env?.DEV) console.log(`[SearchMessageView] Advancing from step ${currentStepIndex} to ${currentStepIndex + 1}`);
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
                <div className="prose max-w-none text-[14.5px] text-black dark:text-gray-100 leading-relaxed w-full">
                  <MarkdownRenderer content={extractWsmDoc(extractWsmForm(cleanRaciocinioTags(message.text || message.finalSynthesis || "Erro na pesquisa.")).cleanText).cleanText} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 w-full animate-fade-in py-1">
                <div className="flex items-center gap-1.5 text-[14px] font-medium select-none searching">
                  <Globe className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
                  <span className="shimmer-text">Planejando a melhor estratégia de pesquisa na web...</span>
                </div>
              </div>
            )
          ) : (
            <>
              {/* 2. Introduction Narrative Paragraph */}
              {message.searchIntro && (
                <div className="prose max-w-none text-[14.5px] text-black dark:text-gray-100 leading-relaxed w-full">
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
              {isActive ? (
                <div className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none searching">
                  <Globe className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
                  <span className="shimmer-text">Pesquisando na web</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => isDone && toggleExpand(idx)}
                  disabled={!isDone}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors select-none border-0 bg-transparent p-0 cursor-pointer text-[#6b7076] hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  <Globe className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
                  <span>Pesquisou na web</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
                  )}
                </button>
              )}
            </div>

            {/* Timeline expanded detail view */}
            {isDone && isExpanded && (
              <div className="flex gap-3 pl-1 py-1.5 animate-fade-in w-full max-w-2xl">
                {/* Left vertical timeline column */}
                <div className="flex flex-col items-center shrink-0 w-5">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 my-0.5">
                    <Globe className="w-4 h-4 text-[#8e9099] shrink-0" />
                  </div>
                  <div className="w-[1px] flex-1 bg-gray-200 dark:bg-zinc-700 my-1" />
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 my-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#8e9099] shrink-0" />
                  </div>
                </div>

                {/* Right content column */}
                <div className="flex-1 min-w-0 pr-1">
                  {/* Top row: step tag (query) on left, count on right */}
                  <div className="flex items-center justify-between mb-2 select-none h-5">
                    <span className="text-[13.5px] font-medium text-gray-800 dark:text-gray-200 truncate mr-2">
                      {step.tag}
                    </span>
                    <span className="text-[12px] text-gray-400 dark:text-gray-500 shrink-0">
                      {step.sources.length} {step.sources.length === 1 ? 'resultado' : 'resultados'}
                    </span>
                  </div>

                  {/* White Card containing sources */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border-0 my-1 w-full space-y-0.5">
                    {step.sources.map((src, sIdx) => {
                      const domain = getDomain(src.url);
                      return (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors text-left group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-3">
                            <img
                              src={getFaviconUrl(src.url)}
                              alt=""
                              className="w-4 h-4 object-contain rounded-xs shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
                              }}
                            />
                            <span className="text-[13px] font-normal text-gray-800 dark:text-gray-200 truncate group-hover:text-black dark:group-hover:text-blue-400">
                              {src.title}
                            </span>
                          </div>
                          <span className="text-[12px] text-gray-400 dark:text-gray-500 font-normal shrink-0">
                            {domain}
                          </span>
                        </a>
                      );
                    })}
                  </div>

                  {/* Bottom row: Concluído */}
                  <div className="flex items-center h-5 mt-1 select-none">
                    <span className="text-[13px] font-medium text-[#8e9099] dark:text-gray-400">
                      Concluído
                    </span>
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
        <>
        <WorkspaceTasksBlock text={message.finalSynthesis || message.text} onOpenWorkspace={onOpenWorkspace} />
        
        <div className="prose max-w-none text-[14px] text-gray-800 leading-relaxed w-full mt-3 pt-3 border-t border-gray-150/50 animate-fade-in">
          <TypewriterMarkdown
            content={cleanHistoryTags(cleanWorkspaceTags(extractWsmDoc(extractWsmForm(message.finalSynthesis || message.text || "").cleanText).cleanText))}
            searchSources={message.searchSources}
            searchSteps={message.searchSteps}
            enabled={message.isSimulatingSearch}
            onComplete={onStepChange}
          />
        </div>
        </>
      )}

      {/* 5b. Document Cards Grid */}
      {(showFinal || !message.isSimulatingSearch) && (() => {
        const { docObjs } = extractWsmDoc(extractWsmForm(cleanRaciocinioTags(message.finalSynthesis || message.text || "")).cleanText);
        if (docObjs && docObjs.length > 0) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3 w-full">
              {docObjs.map((doc, idx) => (
                <DocumentCard key={idx} document={doc} onOpenDocument={onOpenDocument} attachedImages={attachedImages} />
              ))}
            </div>
          );
        }
        return null;
      })()}

      {/* 5c. Scheduled Task Cards */}
      {(showFinal || !message.isSimulatingSearch) && (() => {
        const { taskObjs } = extractWsmTasks(message.finalSynthesis || message.text || "");
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
                <span className="text-black dark:text-white font-semibold text-[11.5px] pr-0.5">{count} {count === 1 ? 'fonte' : 'fontes'}</span>
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
