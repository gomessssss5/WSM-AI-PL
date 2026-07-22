import React, { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReasoningBlockProps {
  id: string;
  raciocinio: string;
  isFinishedGeneratingAll: boolean; // meaning the whole stream is done
  isHistorical: boolean;
  onSequenceComplete: () => void;
}

export function ReasoningBlock({ id, raciocinio, isFinishedGeneratingAll, isHistorical, onSequenceComplete }: ReasoningBlockProps) {
  const [displayedText, setDisplayedText] = useState(isHistorical ? raciocinio : '');
  const [isExpanded, setIsExpanded] = useState(!isHistorical);
  const [isSequenceDone, setIsSequenceDone] = useState(isHistorical);
  
  const currentIndexRef = useRef(isHistorical ? raciocinio.length : 0);
  const hasFinishedRef = useRef(isHistorical);
  
  // Typewriter effect that chases the incoming raciocinio text
  useEffect(() => {
    if (isHistorical || isSequenceDone) {
      setDisplayedText(raciocinio);
      return;
    }

    const currentLen = raciocinio.length;
    if (currentIndexRef.current < currentLen) {
      const interval = setInterval(() => {
        currentIndexRef.current += Math.floor(Math.random() * 2) + 3; // chunk 3-4 chars
        if (currentIndexRef.current > currentLen) {
          currentIndexRef.current = currentLen;
        }
        setDisplayedText(raciocinio.slice(0, currentIndexRef.current));
        
        if (currentIndexRef.current >= currentLen) {
          clearInterval(interval);
        }
      }, 15); // Fast typing
      return () => clearInterval(interval);
    }
  }, [raciocinio, isHistorical, isSequenceDone]);

  // Handle completion sequence
  useEffect(() => {
    if (isHistorical || isSequenceDone) return;
    
    // We are done when the parent says it's done AND our typewriter caught up
    if (isFinishedGeneratingAll && !hasFinishedRef.current && currentIndexRef.current >= raciocinio.length) {
      hasFinishedRef.current = true;
      // Wait 1 second, then close the card and signal completion
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setTimeout(() => {
          setIsSequenceDone(true);
          onSequenceComplete();
        }, 300); // give time for the collapse animation before showing text
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFinishedGeneratingAll, raciocinio.length, displayedText, isHistorical, isSequenceDone, onSequenceComplete]);

  const estimatedSeconds = Math.max(1, Math.round(raciocinio.length / 65));
  const isCurrentlyStreaming = !isHistorical && !isFinishedGeneratingAll;

  return (
    <div className="mb-4 w-full select-none" id={`raciocinio-container-${id}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-semibold text-[13px] transition-colors cursor-pointer select-none py-1 group focus:outline-none"
        >
          {isCurrentlyStreaming && !isSequenceDone ? (
            <Brain className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500 animate-pulse" />
          ) : (
            <Brain className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400" />
          )}
          <span>
            {!isSequenceDone
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
          transition={{ duration: 0.2 }}
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
