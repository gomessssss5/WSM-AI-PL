import React, { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReasoningBlockProps {
  id: string;
  raciocinio: string;
  isReasoningFinished: boolean; // true if </raciocinio> tag is reached or stream is done
  isHistorical: boolean;
  onSequenceComplete: () => void;
}

interface StepItem {
  id: string;
  title: string;
  subItems: Array<{
    icon: string;
    text: string;
  }>;
  summaryText?: string;
}

function parseSteps(text: string): StepItem[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split('\n');
  const items: StepItem[] = [];
  let currentStep: StepItem | null = null;

  for (let rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const isStepHeader =
      /^(?:\d+[\.\)]|#+|\*|-|\[x\]|✓)\s+/.test(line) ||
      /^(Definir|Executar|Pesquisar|Elaborar|Entregar|Analisar|Verificar|Criar|Atualizar|Carregar|Processar|Mapear|Identificar)/i.test(line);

    const isSubItem = /^[🧭💡📄⚡🔍]\s*/.test(line) || (/^[-*]\s+/.test(line) && currentStep && currentStep.subItems.length > 0);

    if (isSubItem && currentStep) {
      let icon = '🧭';
      if (line.includes('💡') || line.toLowerCase().includes('conhecimento')) icon = '💡';
      else if (line.includes('📄') || line.toLowerCase().includes('editando') || line.toLowerCase().includes('arquivo')) icon = '📄';
      else if (line.includes('🔍') || line.toLowerCase().includes('pesquis')) icon = '🔍';
      else if (line.includes('⚡')) icon = '⚡';

      const cleanText = line.replace(/^[🧭💡📄⚡🔍\-*]\s*/, '').trim();
      currentStep.subItems.push({ icon, text: cleanText });
    } else if (isStepHeader || !currentStep) {
      const cleanTitle = line.replace(/^(?:\d+[\.\)]|#+|- \[x\]|✓|-|\*)\s*/, '').trim();
      currentStep = {
        id: `step-${items.length}`,
        title: cleanTitle,
        subItems: [],
      };
      items.push(currentStep);
    } else {
      if (currentStep) {
        if (currentStep.summaryText) {
          currentStep.summaryText += ' ' + line;
        } else {
          currentStep.summaryText = line;
        }
      }
    }
  }

  return items;
}

export function ReasoningBlock({
  id,
  raciocinio,
  isReasoningFinished,
  isHistorical,
  onSequenceComplete,
}: ReasoningBlockProps) {
  const [displayedText, setDisplayedText] = useState(isHistorical ? raciocinio : '');
  const [isExpanded, setIsExpanded] = useState(!isHistorical);
  const [isSequenceDone, setIsSequenceDone] = useState(isHistorical);
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});

  const currentIndexRef = useRef(isHistorical ? raciocinio.length : 0);
  const hasTriggeredCloseRef = useRef(isHistorical);
  const onSequenceCompleteRef = useRef(onSequenceComplete);

  useEffect(() => {
    onSequenceCompleteRef.current = onSequenceComplete;
  }, [onSequenceComplete]);

  // Handle immediate sequence completion if historical
  useEffect(() => {
    if (isHistorical) {
      onSequenceCompleteRef.current?.();
    }
  }, [isHistorical]);

  // Typewriter effect chasing incoming raciocinio text
  useEffect(() => {
    if (isHistorical || isSequenceDone) {
      setDisplayedText(raciocinio);
      return;
    }

    const currentLen = raciocinio.length;
    if (currentIndexRef.current < currentLen) {
      const interval = setInterval(() => {
        currentIndexRef.current += Math.floor(Math.random() * 3) + 3;
        if (currentIndexRef.current >= currentLen) {
          currentIndexRef.current = currentLen;
          clearInterval(interval);
        }
        setDisplayedText(raciocinio.slice(0, currentIndexRef.current));
      }, 15);

      return () => clearInterval(interval);
    }
  }, [raciocinio, isHistorical, isSequenceDone]);

  // Trigger auto-collapse when reasoning generation & typing are both finished
  useEffect(() => {
    if (isHistorical || isSequenceDone || hasTriggeredCloseRef.current) return;

    const isTypingComplete = currentIndexRef.current >= raciocinio.length;

    if (isReasoningFinished && isTypingComplete) {
      hasTriggeredCloseRef.current = true;

      const timer = setTimeout(() => {
        setIsExpanded(false);
        setTimeout(() => {
          setIsSequenceDone(true);
          onSequenceCompleteRef.current?.();
        }, 250);
      }, 400);

      return () => clearInterval(timer);
    }
  }, [isReasoningFinished, raciocinio.length, displayedText, isHistorical, isSequenceDone]);

  const toggleStepExpand = (stepId: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const estimatedSeconds = Math.max(1, Math.round(raciocinio.length / 65));
  const isCurrentlyStreaming = !isHistorical && !isSequenceDone && !isReasoningFinished;
  const parsedSteps = parseSteps(displayedText);

  return (
    <div className="mb-4 w-full select-none" id={`raciocinio-container-${id}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-[14px] font-medium transition-colors cursor-pointer select-none py-0.5 group focus:outline-none border-0 bg-transparent p-0"
        >
          {isCurrentlyStreaming ? (
            <Brain className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-pulse shrink-0" />
          ) : (
            <Brain className="w-4 h-4 text-[#6b7076] dark:text-gray-400 shrink-0" />
          )}
          <span>
            {!isSequenceDone && isCurrentlyStreaming ? (
              <span className="shimmer-text">Pensando passo a passo...</span>
            ) : (
              <span className="text-[#6b7076] dark:text-gray-400">Pensou por {estimatedSeconds} segundos</span>
            )}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400" />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {parsedSteps.length > 0 ? (
              <div className="mt-2.5 flex flex-col space-y-1 w-full max-w-2xl">
                {parsedSteps.map((step) => {
                  const isStepExpanded = !!expandedStepIds[step.id];
                  return (
                    <div key={step.id} className="flex flex-col w-full text-left">
                      {/* Step Row / Header */}
                      <button
                        type="button"
                        onClick={() => toggleStepExpand(step.id)}
                        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer select-none border-0 bg-transparent text-left group"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-zinc-700/80 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-gray-700 dark:text-gray-200" />
                          </div>
                          <span className="text-[13.5px] font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-black dark:group-hover:text-white">
                            {step.title}
                          </span>
                        </div>

                        <div className="text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 shrink-0">
                          {isStepExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* Indented Sub-Items & Details */}
                      {isStepExpanded && (
                        <div className="mt-1 mb-2 pl-7 pr-2 py-1 flex flex-col space-y-2 text-[13px] text-gray-700 dark:text-gray-300 border-l-2 border-gray-200 dark:border-zinc-700 ml-3.5 animate-fade-in">
                          {step.subItems.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2 py-0.5">
                              <span className="shrink-0 text-sm">{sub.icon}</span>
                              <span className="flex-1 min-w-0 leading-relaxed font-medium">{sub.text}</span>
                            </div>
                          ))}

                          {step.summaryText && (
                            <p className="text-[13px] text-gray-600 dark:text-gray-400 font-normal leading-relaxed pt-0.5">
                              {step.summaryText}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 pl-4 ml-1.5 border-l-2 border-gray-200 dark:border-gray-700 text-[13.5px] text-gray-500 dark:text-gray-400 font-sans leading-relaxed whitespace-pre-wrap select-text selection:bg-gray-100">
                {displayedText}
                {!isSequenceDone && (
                  <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-1 animate-pulse" />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
