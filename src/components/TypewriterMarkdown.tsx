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
      if (cleanText.length > 0 && prevContentRef.current.length > 0 && cleanText[0] === prevContentRef.current[0]) {
        // They share a prefix (e.g. an inline tag was replaced). Adjust index instead of restarting.
        const prevSegments = getSegments(prevContentRef.current);
        const lenDiff = currentTotalLen - prevSegments.length;
        currentIndexRef.current = Math.max(0, Math.min(currentTotalLen, currentIndexRef.current + lenDiff));
      } else {
        currentIndexRef.current = 0;
        setDisplayedText("");
      }
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
        
        const slicedTextForCheck = currentSegments.slice(0, currentIndexRef.current).join('');
        const codeBlockMatch = slicedTextForCheck.match(/```/g) || [];
        const isInsideCodeBlock = codeBlockMatch.length % 2 !== 0;
        
        if (isInsideCodeBlock) {
          // Pause the typing exactly at the start of the code block
          // until the closing triple backticks are available in the stream
          let foundClosing = false;
          let closingIndex = -1;
          for (let i = currentIndexRef.current; i < currentTotalLen - 2; i++) {
            if (currentSegments[i] === '`' && currentSegments[i+1] === '`' && currentSegments[i+2] === '`') {
              closingIndex = i + 3;
              foundClosing = true;
              break;
            }
          }
          
          if (foundClosing) {
            // Instantly reveal the entire code block
            currentIndexRef.current = closingIndex;
          } else {
            // Keep the index right before the opening backticks so the block doesn't render partially
            const lastBacktickStart = slicedTextForCheck.lastIndexOf('```');
            if (lastBacktickStart !== -1) {
              currentIndexRef.current = lastBacktickStart;
            }
          }
        }

        // Check for agentic tags to buffer them
        let lastOpenBracketIndex = -1;
        for (let i = currentIndexRef.current - 1; i >= 0; i--) {
          if (currentSegments[i] === '[') {
            lastOpenBracketIndex = i;
            break;
          } else if (currentSegments[i] === ']') {
            break; 
          }
        }

        if (lastOpenBracketIndex !== -1) {
           const textInside = currentSegments.slice(lastOpenBracketIndex + 1).join('').toLowerCase();
           const prefixes = [
              "pesquisou na web", "calculando", "verificando",
              "código 100% verificado", "corrigindo erro",
              "sandbox de depuração", "criando skill", "editando skill",
              "excluindo skill", "criou skill", "editou skill", "excluiu skill",
              "nova tarefa", "tarefa removida", "passo concluído",
              "pesquisando...", "calculando...", "verificando...", "verificando possíveis erros no código..."
           ];
           const isAgentic = prefixes.some(p => p.startsWith(textInside) || textInside.startsWith(p));
           
           if (isAgentic) {
              let foundClosing = false;
              let closingIndex = -1;
              for (let i = lastOpenBracketIndex; i < currentTotalLen; i++) {
                if (currentSegments[i] === ']') {
                  closingIndex = i + 1;
                  foundClosing = true;
                  break;
                }
              }

              if (foundClosing) {
                 currentIndexRef.current = Math.max(currentIndexRef.current, closingIndex);
              } else {
                 currentIndexRef.current = lastOpenBracketIndex;
              }
           }
        }

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
