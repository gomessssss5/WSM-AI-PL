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

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(content);
      onCompleteRef.current?.();
      return;
    }

    const totalLen = content.length;
    if (totalLen === 0) {
      setDisplayedText("");
      return;
    }

    let animationFrameId: number;
    const speedMsPerChar = 8; // Faster: 8ms per character
    const startTime = Date.now();
    let lastLength = 0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const targetLength = Math.floor(elapsed / speedMsPerChar);

      if (targetLength >= totalLen) {
        setDisplayedText(content);
        onCompleteRef.current?.();
      } else {
        if (targetLength > lastLength) {
          setDisplayedText(content.slice(0, targetLength));
          lastLength = targetLength;
        }
        animationFrameId = requestAnimationFrame(tick);
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
