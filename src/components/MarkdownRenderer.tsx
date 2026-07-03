import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check, Globe, Calculator, Clock } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  isTyping?: boolean;
}

export default function MarkdownRenderer({ content, isTyping = false }: MarkdownRendererProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to safely render KaTeX to HTML string
  const renderMathToHtml = (tex: string, displayMode: boolean): string => {
    try {
      return katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        trust: true,
      });
    } catch (err) {
      console.error('KaTeX rendering error:', err);
      return `<span class="text-red-500 font-mono text-xs">[Math Error: ${tex}]</span>`;
    }
  };

  // Parses inline elements (bold, italic, inline code, inline math, links)
  const renderInlineContent = (text: string): React.ReactNode[] => {
    if (!text) return [];

    let currentText = text;
    const elements: React.ReactNode[] = [];
    let keyIndex = 0;

    // Token structures
    interface MathToken { id: string; tex: string; }
    interface CodeToken { id: string; code: string; }
    interface LinkToken { id: string; text: string; url: string; }
    interface AgenticToken { id: string; type: 'web' | 'calc' | 'clock' | string; text: string; }

    const mathTokens: MathToken[] = [];
    const codeTokens: CodeToken[] = [];
    const linkTokens: LinkToken[] = [];
    const agenticTokens: AgenticToken[] = [];

    interface SlashToken { id: string; text: string; }
    const slashTokens: SlashToken[] = [];

    // Extract slash commands (e.g., /web, /calculadora, /relogio, /função)
    const slashRegex = /(?:^|\s)(\/[a-zA-Z0-9áéíóúâêîôûãõàèìòùäëïöüÿñçÇÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÄËÏÖÜŸÑ_]+)/gi;
    currentText = currentText.replace(slashRegex, (match, cmd) => {
      const id = `:::SLASHTOKEN-${slashTokens.length}:::`;
      slashTokens.push({ id, text: cmd });
      const space = match.startsWith(' ') ? ' ' : '';
      return space + id;
    });

    // 0. Extract agentic tags: [pesquisou na web], [calculando], [verificando relógio], and active states
    const agenticRegex = /\[(pesquisou na web|calculando|verificando relógio|pesquisando\.\.\.|calculando\.\.\.|verificando\.\.\.)\]/gi;
    currentText = currentText.replace(agenticRegex, (match, tagContent) => {
      const id = `:::AGENTICTOKEN-${agenticTokens.length}:::`;
      let type = 'web';
      if (tagContent.toLowerCase().includes('calculando') || tagContent.toLowerCase().includes('calculando...')) type = 'calc';
      if (tagContent.toLowerCase().includes('relógio') || tagContent.toLowerCase().includes('verificando...')) type = 'clock';
      agenticTokens.push({ id, type, text: tagContent });
      return id;
    });

    // 1. Extract inline math: $...$ or \(...\)
    const inlineMathRegex = /\$(.*?)\$|\\\\\((.*?)\\\\\)/g;
    currentText = currentText.replace(inlineMathRegex, (match, p1, p2) => {
      const tex = p1 || p2 || '';
      if (!tex.trim()) return match;
      const id = `:::MATHTOKEN-${mathTokens.length}:::`;
      mathTokens.push({ id, tex });
      return id;
    });

    // 2. Extract inline code: `code`
    const inlineCodeRegex = /`(.*?)`/g;
    currentText = currentText.replace(inlineCodeRegex, (match, code) => {
      if (!code.trim()) return match;
      const id = `:::CODETOKEN-${codeTokens.length}:::`;
      codeTokens.push({ id, code });
      return id;
    });

    // 3. Extract links: [text](url)
    const inlineLinkRegex = /\[(.*?)\]\((.*?)\)/g;
    currentText = currentText.replace(inlineLinkRegex, (match, textContent, url) => {
      if (!textContent.trim() || !url.trim()) return match;
      const id = `:::LINKTOKEN-${linkTokens.length}:::`;
      linkTokens.push({ id, text: textContent, url });
      return id;
    });

    // 4. Process Bold/Italic using splits
    // Split on **bold**
    const boldSplit = currentText.split(/\*\*(.*?)\*\*/g);
    
    boldSplit.forEach((boldChunk, bIdx) => {
      const isBold = bIdx % 2 === 1;

      // Split on *italic* or _italic_
      const italicSplit = boldChunk.split(/\*(.*?)\*|_(.*?)_/g);

      italicSplit.forEach((italicChunk, iIdx) => {
        // Since there are 2 capturing groups, every 3rd item is a match (iIdx % 3 !== 0)
        const isItalic = iIdx % 3 !== 0 && italicChunk !== undefined;
        if (italicChunk === undefined) return;

        // Render function to restore math, code, and link tokens
        const restoreTokens = (chunk: string): React.ReactNode[] => {
          if (!chunk) return [];
          
          // Split on tokens
          const tokenRegex = /(:::MATHTOKEN-\d+:::|:::CODETOKEN-\d+:::|:::LINKTOKEN-\d+:::|:::AGENTICTOKEN-\d+:::|:::SLASHTOKEN-\d+:::)/g;
          const parts = chunk.split(tokenRegex);

          return parts.map((part, pIdx) => {
            if (part.startsWith(':::SLASHTOKEN-')) {
              const token = slashTokens.find(t => t.id === part);
              if (token) {
                return (
                  <strong
                    key={`slash-${pIdx}-${keyIndex++}`}
                    className="text-blue-600 font-bold select-text inline-block"
                  >
                    {token.text}
                  </strong>
                );
              }
            } else if (part.startsWith(':::AGENTICTOKEN-')) {
              const token = agenticTokens.find(t => t.id === part);
              if (token) {
                let Icon = Globe;
                let displayType = 'Pesquisou na web';
                let isActive = false;
                
                if (token.type === 'calc') {
                  Icon = Calculator;
                  displayType = token.text.includes('...') ? 'Calculando...' : 'Calculando';
                  if (token.text.includes('...')) isActive = true;
                } else if (token.type === 'clock') {
                  Icon = Clock;
                  displayType = token.text.includes('...') ? 'Verificando...' : 'Verificando relógio';
                  if (token.text.includes('...')) isActive = true;
                } else {
                  displayType = token.text.includes('...') ? 'Pesquisando na web...' : 'Pesquisou na web';
                  if (token.text.includes('...')) isActive = true;
                }

                if (isActive) {
                  return (
                    <span
                      key={`agentic-${pIdx}-${keyIndex++}`}
                      className="flex w-fit items-center gap-1.5 text-[12px] font-medium py-1 px-3 rounded-full border transition-all select-none text-purple-700 bg-purple-50/50 border-purple-200 cursor-default shadow-3xs mx-0 my-3"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping shrink-0" />
                      <span><strong className="font-semibold">{displayType}</strong></span>
                    </span>
                  );
                }

                return (
                  <span
                    key={`agentic-${pIdx}-${keyIndex++}`}
                    className="flex w-fit items-center gap-1.5 text-[12px] font-medium py-1 px-3 rounded-full border transition-all select-none text-gray-500 bg-gray-50/50 hover:bg-gray-100/50 border-gray-150 cursor-default shadow-3xs mx-0 my-3"
                  >
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                    <span><strong className="font-semibold text-gray-600">{displayType}</strong></span>
                  </span>
                );
              }
            } else if (part.startsWith(':::MATHTOKEN-')) {
              const token = mathTokens.find(t => t.id === part);
              if (token) {
                const html = renderMathToHtml(token.tex, false);
                return (
                  <span
                    key={`math-${pIdx}-${keyIndex++}`}
                    className="inline-block px-1 select-text"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              }
            } else if (part.startsWith(':::CODETOKEN-')) {
              const token = codeTokens.find(t => t.id === part);
              if (token) {
                return (
                  <code
                    key={`code-${pIdx}-${keyIndex++}`}
                    className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-purple-600 dark:text-purple-400 font-mono text-[12px] rounded border border-gray-200 select-text"
                  >
                    {token.code}
                  </code>
                );
              }
            } else if (part.startsWith(':::LINKTOKEN-')) {
              const token = linkTokens.find(t => t.id === part);
              if (token) {
                let domain = '';
                try {
                  domain = new URL(token.url).hostname.replace('www.', '');
                } catch {
                  domain = token.text;
                }
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                return (
                  <a
                    key={`link-${pIdx}-${keyIndex++}`}
                    href={token.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#f0ede8] hover:bg-gray-200 border border-gray-200 rounded-full text-xs text-gray-700 font-medium transition-colors select-none mx-0.5 align-middle cursor-pointer"
                  >
                    <img
                      src={faviconUrl}
                      alt=""
                      className="w-3.5 h-3.5 rounded-full object-contain bg-white shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
                      }}
                    />
                    <span>{token.text}</span>
                  </a>
                );
              }
            }
            return <React.Fragment key={`text-${pIdx}-${keyIndex++}`}>{part}</React.Fragment>;
          });
        };

        const contentNodes = restoreTokens(italicChunk);

        if (isBold && isItalic) {
          elements.push(
            <strong key={`bi-${bIdx}-${iIdx}`} className="font-bold italic text-gray-900">
              {contentNodes}
            </strong>
          );
        } else if (isBold) {
          elements.push(
            <strong key={`b-${bIdx}-${iIdx}`} className="font-bold text-gray-900">
              {contentNodes}
            </strong>
          );
        } else if (isItalic) {
          elements.push(
            <em key={`i-${bIdx}-${iIdx}`} className="italic text-gray-800">
              {contentNodes}
            </em>
          );
        } else {
          elements.push(...contentNodes);
        }
      });
    });

    return elements;
  };

  // Parses block elements: headers, math blocks, code blocks, lists, blockquotes, tables, paragraphs
  const renderBlocks = (): React.ReactNode[] => {
    if (!content) return [];

    const lines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Skip completely empty lines
      if (line === '') {
        i++;
        continue;
      }

      // 2. Code Block: ```language
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        let code = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          code += lines[i] + '\n';
          i++;
        }
        i++; // skip ending ```
        
        const codeBlockId = `code-block-${i}`;
        blocks.push(
          <div key={`code-${i}`} className="my-4 bg-gray-950 rounded-xl overflow-hidden shadow-md border border-gray-850 w-full max-w-full">
            <div className="bg-gray-900 px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-400 border-b border-gray-800/60 select-none">
              <span className="font-mono text-purple-400 uppercase tracking-wider font-semibold">
                {lang || 'code'}
              </span>
              <button
                onClick={() => copyToClipboard(code.trim(), codeBlockId)}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-xs"
              >
                {copiedId === codeBlockId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar código</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[12.5px] text-gray-200 font-mono leading-relaxed bg-gray-950/60 select-text">
              <code>{code.trim()}</code>
            </pre>
          </div>
        );
        continue;
      }

      // 3. Math Block: $$ math $$
      if (trimmed.startsWith('$$')) {
        let mathContent = trimmed.slice(2);
        // If it closes on the same line
        if (mathContent.endsWith('$$') && mathContent.length >= 2) {
          mathContent = mathContent.slice(0, -2);
          const html = renderMathToHtml(mathContent, true);
          blocks.push(
            <div
              key={`mathb-${i}`}
              className="my-5 p-4 bg-gray-50/50 border border-[#eae6e1]/40 rounded-xl overflow-x-auto text-center select-text shadow-2xs"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
          i++;
          continue;
        }

        // Multi-line math block
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('$$')) {
          mathContent += '\n' + lines[i];
          i++;
        }
        i++; // skip ending $$
        const html = renderMathToHtml(mathContent, true);
        blocks.push(
          <div
            key={`mathb-${i}`}
            className="my-5 p-4 bg-gray-50/50 border border-[#eae6e1]/40 rounded-xl overflow-x-auto text-center select-text shadow-2xs animate-fade-in"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        continue;
      }

      // 4. Headers: #, ##, ###
      if (trimmed.startsWith('#')) {
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const text = trimmed.replace(/^#+\s*/, '');
        const inlineContent = renderInlineContent(text);

        if (level === 1) {
          blocks.push(
            <h1 key={`h1-${i}`} className="text-2xl font-extrabold text-gray-900 tracking-tight mt-6 mb-3 border-b border-gray-150 pb-2.5">
              {inlineContent}
            </h1>
          );
        } else if (level === 2) {
          blocks.push(
            <h2 key={`h2-${i}`} className="text-lg font-bold text-gray-800 tracking-tight mt-5 mb-2 flex items-center gap-2 border-l-3 border-[#5c53e5] pl-2.5">
              {inlineContent}
            </h2>
          );
        } else {
          blocks.push(
            <h3 key={`h3-${i}`} className="text-base font-bold text-gray-800 tracking-tight mt-4 mb-1.5">
              {inlineContent}
            </h3>
          );
        }
        i++;
        continue;
      }

      // 5. Blockquotes: > quote
      if (trimmed.startsWith('>')) {
        let quoteContent = '';
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteContent += lines[i].trim().replace(/^>\s*/, '') + '\n';
          i++;
        }
        blocks.push(
          <blockquote key={`quote-${i}`} className="my-4 border-l-4 border-[#5c53e5] bg-gray-50/70 py-3 pl-4 pr-3 rounded-r-xl italic text-gray-600 text-[13.5px] leading-relaxed shadow-3xs">
            {renderInlineContent(quoteContent.trim())}
          </blockquote>
        );
        continue;
      }

      // 6. Tables: lines with pipes |
      if (trimmed.startsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const parseRow = (rowLine: string) => {
            // Split by | but ignore escaped pipes if any
            const cells = rowLine.split('|').map(c => c.trim());
            // Remove first and last empty cells due to outer pipes
            if (cells[0] === '') cells.shift();
            if (cells[cells.length - 1] === '') cells.pop();
            return cells;
          };

          const headers = parseRow(tableLines[0]);
          // Check if second line is a delimiter like |---|---|
          const isDelimiter = tableLines[1].replace(/[\s\-\|:]/g, '') === '';
          const startIndex = isDelimiter ? 2 : 1;

          const rows = tableLines.slice(startIndex).map(parseRow);

          blocks.push(
            <div key={`table-${i}`} className="my-5 overflow-x-auto rounded-xl border border-[#eae6e1] shadow-2xs bg-white w-full max-w-full">
              <table className="min-w-full divide-y divide-gray-150">
                <thead className="bg-[#fcfbfa]">
                  <tr>
                    {headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider"
                      >
                        {renderInlineContent(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700 bg-white">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 font-medium leading-relaxed">
                          {renderInlineContent(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // 7. Unordered Lists: - item or * item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const listItems: string[] = [];
        while (
          i < lines.length &&
          (lines[i].trim().startsWith('- ') ||
            lines[i].trim().startsWith('* ') ||
            lines[i].trim().startsWith('• '))
        ) {
          listItems.push(lines[i].trim().replace(/^[-*•]\s*/, ''));
          i++;
        }

        blocks.push(
          <ul key={`ul-${i}`} className="my-3 pl-6 list-disc space-y-1.5 text-gray-700 text-[13.5px]">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed select-text marker:text-[#5c53e5]">
                {renderInlineContent(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 8. Ordered Lists: 1. item
      if (/^\d+\.\s+/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }

        blocks.push(
          <ol key={`ol-${i}`} className="my-3 pl-6 list-decimal space-y-1.5 text-gray-700 text-[13.5px]">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed select-text marker:font-bold marker:text-gray-400">
                {renderInlineContent(item)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 9. Paragraph default
      blocks.push(
        <p key={`p-${i}`} className="text-gray-700 leading-relaxed text-[13.5px] mb-3 select-text">
          {renderInlineContent(line)}
        </p>
      );
      i++;
    }

    if (isTyping && blocks.length > 0) {
      const lastIdx = blocks.length - 1;
      const lastBlock = blocks[lastIdx];

      const cursorEl = (
        <span key="typewriter-cursor" className="typewriter-cursor" />
      );

      if (React.isValidElement(lastBlock)) {
        const lastBlockProps = lastBlock.props as any;
        if (lastBlockProps && lastBlockProps.children !== undefined) {
          let updatedChildren;
          if (Array.isArray(lastBlockProps.children)) {
            updatedChildren = [...lastBlockProps.children, cursorEl];
          } else {
            updatedChildren = [lastBlockProps.children, cursorEl];
          }
          blocks[lastIdx] = React.cloneElement(lastBlock, lastBlock.props, updatedChildren);
        } else {
          blocks[lastIdx] = (
            <div key={`wrapped-last-${lastIdx}`} className="flex items-baseline flex-wrap">
              {lastBlock}
              {cursorEl}
            </div>
          );
        }
      } else {
        blocks.push(cursorEl);
      }
    }

    return blocks;
  };

  return (
    <div id="wsm-rendered-markdown" className="flex flex-col gap-1 w-full max-w-full">
      {renderBlocks()}
    </div>
  );
}
