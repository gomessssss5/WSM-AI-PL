import React, { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { extractWsmForm } from '../utils/formParser';
import { extractWsmDoc } from '../utils/docParser';

interface TypewriterMarkdownProps {
  content: string;
  enabled?: boolean;
  onComplete?: () => void;
}

export default function TypewriterMarkdown({
  content,
  enabled = true,
  onComplete
}: TypewriterMarkdownProps) {
  let { cleanText } = extractWsmForm(content);
  cleanText = extractWsmDoc(cleanText).cleanText;
  
  const [displayedText, setDisplayedText] = useState(enabled ? "" : cleanText);
  const onCompleteRef = useRef(onComplete);
  const currentIndexRef = useRef(enabled ? 0 : cleanText.length);
  const prevContentRef = useRef(enabled ? "" : cleanText);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(cleanText);
      currentIndexRef.current = cleanText.length;
      prevContentRef.current = cleanText;
      onCompleteRef.current?.();
      return;
    }

    const totalLen = cleanText.length;
    
    if (totalLen === 0) {
      setDisplayedText("");
      currentIndexRef.current = 0;
      prevContentRef.current = cleanText;
      return;
    }

    if (!cleanText.startsWith(prevContentRef.current) && prevContentRef.current !== "") {
      currentIndexRef.current = 0;
      setDisplayedText("");
    }

    prevContentRef.current = cleanText;

    let animationFrameId: number;
    let lastTime = Date.now();
    const charsPerMs = 0.25;

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      if (currentIndexRef.current < totalLen) {
        currentIndexRef.current += Math.max(1, Math.floor(delta * charsPerMs));
        if (currentIndexRef.current > totalLen) {
          currentIndexRef.current = totalLen;
        }
        setDisplayedText(cleanText.substring(0, currentIndexRef.current));
      }

      if (currentIndexRef.current < totalLen) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current?.();
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [cleanText, enabled]);

  // Check if typewriter animation is currently running
  const isTyping = enabled && displayedText.length < cleanText.length;

  return (
    <div className="relative w-full">
      <MarkdownRenderer content={displayedText} isTyping={isTyping} />
    </div>
  );
}
