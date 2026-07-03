import React, { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

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
  const [displayedText, setDisplayedText] = useState(enabled ? "" : content);
  const onCompleteRef = useRef(onComplete);
  const currentIndexRef = useRef(enabled ? 0 : content.length);
  const prevContentRef = useRef(enabled ? "" : content);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(content);
      currentIndexRef.current = content.length;
      prevContentRef.current = content;
      onCompleteRef.current?.();
      return;
    }

    const totalLen = content.length;
    if (totalLen === 0) {
      setDisplayedText("");
      currentIndexRef.current = 0;
      prevContentRef.current = content;
      return;
    }

    if (!content.startsWith(prevContentRef.current) && prevContentRef.current !== "") {
      currentIndexRef.current = 0;
      setDisplayedText("");
    }
    prevContentRef.current = content;

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
        setDisplayedText(content.substring(0, currentIndexRef.current));
      }

      if (currentIndexRef.current < totalLen) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current?.();
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [content, enabled]);

  // Check if typewriter animation is currently running
  const isTyping = enabled && displayedText.length < content.length;

  return (
    <div className="relative w-full">
      <MarkdownRenderer content={displayedText} isTyping={isTyping} />
    </div>
  );
}
