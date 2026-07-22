import React, { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReasoningBlockProps {
  id: string;
  raciocinio: string;
  isReasoningFinished: boolean; // true if </raciocinio> tag is reached or stream is done
  isHistorical: boolean;
  onSequenceComplete: () => void;
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
        // Fast chunk typing
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

      // Small pause before closing so user sees complete thought
      const timer = setTimeout(() => {
        setIsExpanded(false); // Collapse animation start
        setTimeout(() => {
          setIsSequenceDone(true);
          onSequenceCompleteRef.current?.();
        }, 250); // Framer Motion transition duration
      }, 400);

      return () => clearInterval(timer);
    }
  }, [isReasoningFinished, raciocinio.length, displayedText, isHistorical, isSequenceDone]);

  const estimatedSeconds = Math.max(1, Math.round(raciocinio.length / 65));
  const isCurrentlyStreaming = !isHistorical && !isSequenceDone && !isReasoningFinished;

  return (
    <div className="mb-4 w-full select-none" id={`raciocinio-container-${id}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-semibold text-[13px] transition-colors cursor-pointer select-none py-1 group focus:outline-none"
        >
          {isCurrentlyStreaming ? (
            <Brain className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500 animate-pulse" />
          ) : (
            <Brain className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400" />
          )}
          <span>
            {!isSequenceDone && isCurrentlyStreaming
              ? "Pensando passo a passo..."
              : `Pensou por ${estimatedSeconds} segundos`}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-500" />
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
            <div className="mt-2 pl-4 ml-1.5 border-l-2 border-gray-200 dark:border-gray-700 text-[13.5px] text-gray-500 dark:text-gray-400 font-sans leading-relaxed whitespace-pre-wrap select-text selection:bg-gray-100">
              {displayedText}
              {!isSequenceDone && (
                <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-1 animate-pulse" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
