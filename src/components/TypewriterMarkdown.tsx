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

  // Helper to segment text into graphemes (user-perceived characters) safely
  const getSegments = (text: string): string[] => {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text)).map(s => s.segment);
    } catch (e) {
      try {
        const regex = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\s\S])(\u200D(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\s\S]))*/gu;
        return text.match(regex) || [];
      } catch (innerError) {
        return text.split('');
      }
    }
  };

  const initialSegments = getSegments(cleanText);
  const currentIndexRef = useRef(enabled ? 0 : initialSegments.length);
  const prevContentRef = useRef(enabled ? "" : cleanText);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const currentSegments = getSegments(cleanText);
    const currentTotalLen = currentSegments.length;

    if (!enabled) {
      setDisplayedText(cleanText);
      currentIndexRef.current = currentTotalLen;
      prevContentRef.current = cleanText;
      onCompleteRef.current?.();
      return;
    }
    
    if (currentTotalLen === 0) {
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

      if (currentIndexRef.current < currentTotalLen) {
        currentIndexRef.current += Math.max(1, Math.floor(delta * charsPerMs));
        if (currentIndexRef.current > currentTotalLen) {
          currentIndexRef.current = currentTotalLen;
        }
        const slicedText = currentSegments.slice(0, currentIndexRef.current).join('');
        setDisplayedText(slicedText);
      }

      if (currentIndexRef.current < currentTotalLen) {
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
