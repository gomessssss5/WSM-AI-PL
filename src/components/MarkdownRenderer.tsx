import React from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check, Globe, Calculator, Clock, FileCode2, CheckCircle2, X, AlertTriangle, FileCode } from 'lucide-react';
import HtmlCodeBlock from './HtmlCodeBlock';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AgenticSkillTagProps {
  key?: string;
  text: string;
  type: string;
}

export function AgenticSkillTag({ text, type }: AgenticSkillTagProps) {
  // Extract skill name
  const rawName = text.includes(':') ? text.split(':')[1] : text;
  const skillName = rawName.replace(/\]/g, '').trim();
  const skillId = skillName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const [status, setStatus] = React.useState<'active' | 'completed'>(() => {
    const lower = text.toLowerCase();
    if (lower.startsWith('criou') || lower.startsWith('editou') || lower.startsWith('excluiu')) {
      return 'completed';
    }
    return 'active';
  });

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [skillData, setSkillData] = React.useState<any>(null);
  const [loadingSkill, setLoadingSkill] = React.useState(false);
  const [errorLoading, setErrorLoading] = React.useState<string | null>(null);

  React.useEffect(() => {
    const lower = text.toLowerCase();
    if (lower.startsWith('criou') || lower.startsWith('editou') || lower.startsWith('excluiu')) {
      setStatus('completed');
      return;
    }
    
    // Auto transition from active (Criando/Editando/Excluindo) to completed (Criou/Editou/Excluiu) after 2.5s
    const timer = setTimeout(() => {
      setStatus('completed');
    }, 2500);

    return () => clearTimeout(timer);
  }, [text]);

  const handleOpenModal = async () => {
    if (type === 'skill_delete') return; // no content to view if deleted
    setIsModalOpen(true);
    setLoadingSkill(true);
    setErrorLoading(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setErrorLoading("Usuário não autenticado.");
        setLoadingSkill(false);
        return;
      }

      const docRef = doc(db, 'users', user.uid, 'skills', skillId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSkillData(docSnap.data());
      } else {
        setErrorLoading(`A Skill "${skillName}" ainda não foi salva no banco de dados ou não foi encontrada.`);
      }
    } catch (err: any) {
      console.error("Erro ao carregar skill:", err);
      setErrorLoading("Falha ao carregar o conteúdo da Skill.");
    } finally {
      setLoadingSkill(false);
    }
  };

  // Determine label texts based on status
  let labelText = '';
  if (status === 'active') {
    if (type === 'skill_create') labelText = `Criando Skill: ${skillName}`;
    else if (type === 'skill_edit') labelText = `Editando Skill: ${skillName}`;
    else if (type === 'skill_delete') labelText = `Excluindo Skill: ${skillName}`;
    else labelText = text;
  } else {
    if (type === 'skill_create') labelText = `Criou Skill: ${skillName}`;
    else if (type === 'skill_edit') labelText = `Editou Skill: ${skillName}`;
    else if (type === 'skill_delete') labelText = `Excluiu Skill: ${skillName}`;
    else labelText = text;
  }

  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium py-1 px-3 rounded-full border transition-all select-none text-purple-700 bg-purple-50 border-purple-200 cursor-default shadow-xs mx-0 my-3">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
        <span><strong className="font-semibold">{labelText}</strong></span>
      </span>
    );
  }

  // Completed style
  const isClickable = type !== 'skill_delete';
  return (
    <>
      <button
        onClick={isClickable ? handleOpenModal : undefined}
        disabled={!isClickable}
        className={`inline-flex items-center gap-1.5 text-[12px] font-medium py-1 px-3 rounded-full border transition-all select-none text-indigo-700 bg-indigo-50 border-indigo-200 shadow-xs mx-0 my-3 ${isClickable ? 'cursor-pointer hover:bg-indigo-100 hover:border-indigo-300 active:scale-98' : 'cursor-default opacity-80'}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span><strong className="font-semibold">{labelText}</strong></span>
        {isClickable && (
          <span className="text-[10px] text-indigo-400 font-normal ml-0.5">(Ver Skill)</span>
        )}
      </button>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 md:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Skill: <span className="text-indigo-600 font-mono text-base bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">{skillName}</span>
                  </h3>
                  <p className="text-xs text-gray-500">Visualização em tela cheia do conteúdo da Skill</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
              {loadingSkill ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 font-medium">Buscando informações da Skill...</p>
                </div>
              ) : errorLoading ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 max-w-md mx-auto">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-full mb-3">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 mb-1">Conteúdo não disponível</h4>
                  <p className="text-sm text-gray-500">{errorLoading}</p>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="prose prose-indigo max-w-none">
                  {skillData?.content ? (
                    <div className="font-sans text-[15px] text-gray-800 leading-relaxed bg-slate-50/50 border border-slate-100 rounded-xl p-6 shadow-2xs">
                      <MarkdownRenderer content={skillData.content} />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Esta Skill não possui nenhum conteúdo registrado.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {skillData?.updatedAt && (
                  <span>Última atualização: {new Date(skillData.updatedAt?.seconds ? skillData.updatedAt.seconds * 1000 : skillData.updatedAt).toLocaleString()}</span>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer hover:shadow-md"
              >
                Concluir Visualização
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}

interface ListItem {
  rawLine: string;
  indent: number;
  markerType: 'ordered' | 'unordered';
  markerText: string;
  text: string;
}

interface ListNode {
  item: ListItem;
  children: ListNode[];
}

const isListItem = (str: string): boolean => {
  const t = str.trim();
  return t.startsWith('- ') || t.startsWith('* ') || t.startsWith('+ ') || t.startsWith('• ') || /^\d+\.\s+/.test(t);
};

const buildListTree = (items: ListItem[]): ListNode[] => {
  const roots: ListNode[] = [];
  const stack: { node: ListNode; indent: number }[] = [];

  for (const item of items) {
    const node: ListNode = { item, children: [] };
    
    while (stack.length > 0 && stack[stack.length - 1].indent >= item.indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, indent: item.indent });
  }

  return roots;
};

const renderNodes = (
  nodes: ListNode[],
  renderInlineContent: (text: string) => React.ReactNode,
  depth: number = 0
): React.ReactNode => {
  if (nodes.length === 0) return null;

  const groups: { type: 'ordered' | 'unordered'; items: ListNode[] }[] = [];
  let currentGroup: { type: 'ordered' | 'unordered'; items: ListNode[] } | null = null;

  for (const node of nodes) {
    const type = node.item.markerType;
    if (!currentGroup || currentGroup.type !== type) {
      currentGroup = { type, items: [node] };
      groups.push(currentGroup);
    } else {
      currentGroup.items.push(node);
    }
  }

  return (
    <div className={`space-y-1.5 ${depth > 0 ? 'mt-1 ml-5' : ''}`}>
      {groups.map((group, groupIdx) => {
        if (group.type === 'ordered') {
          return (
            <ol key={`ol-${depth}-${groupIdx}`} className="list-none space-y-1 text-gray-700 text-[13.5px]">
              {group.items.map((node, nodeIdx) => {
                let markerColor = 'text-[#5c53e5]';
                if (depth === 1) {
                  markerColor = 'text-purple-600';
                } else if (depth === 2) {
                  markerColor = 'text-indigo-600';
                } else if (depth >= 3) {
                  markerColor = 'text-gray-500';
                }

                return (
                  <li key={nodeIdx} className="leading-relaxed">
                    <div className="flex items-start gap-2 select-text">
                      <span className={`${markerColor} font-semibold shrink-0 min-w-[1.25rem] text-right text-xs mt-[2px]`}>
                        {node.item.markerText}
                      </span>
                      <div className="flex-1 select-text">
                        {renderInlineContent(node.item.text)}
                        {renderNodes(node.children, renderInlineContent, depth + 1)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          );
        } else {
          return (
            <ul key={`ul-${depth}-${groupIdx}`} className="list-none space-y-1 text-gray-700 text-[13.5px]">
              {group.items.map((node, nodeIdx) => {
                let bullet = '•';
                let bulletColor = 'text-[#5c53e5]';
                
                if (depth === 1) {
                  bullet = '◦';
                  bulletColor = 'text-purple-600';
                } else if (depth === 2) {
                  bullet = '▪';
                  bulletColor = 'text-indigo-600';
                } else if (depth >= 3) {
                  bullet = '▫';
                  bulletColor = 'text-gray-500';
                }

                return (
                  <li key={nodeIdx} className="leading-relaxed">
                    <div className="flex items-start gap-2 select-text">
                      <span className={`${bulletColor} font-bold shrink-0 text-sm align-middle w-5 text-center`}>
                        {bullet}
                      </span>
                      <div className="flex-1 select-text">
                        {renderInlineContent(node.item.text)}
                        {renderNodes(node.children, renderInlineContent, depth + 1)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        }
      })}
    </div>
  );
};

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
        output: 'html',
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

    // 0. Extract agentic tags: [pesquisou na web], [calculando], [verificando relógio], and active/completed states
    const agenticRegex = /\[(pesquisou na web|calculando|verificando relógio|pesquisando\.\.\.|calculando\.\.\.|verificando\.\.\.|Criando Skill:.*?|Editando Skill:.*?|Excluindo Skill:.*?|Criou Skill:.*?|Editou Skill:.*?|Excluiu Skill:.*?|criando skill:.*?|editando skill:.*?|excluindo skill:.*?|criou skill:.*?|editou skill:.*?|excluiu skill:.*?)\]/gi;
    currentText = currentText.replace(agenticRegex, (match, tagContent) => {
      const id = `:::AGENTICTOKEN-${agenticTokens.length}:::`;
      let type = 'web';
      const lower = tagContent.toLowerCase();
      if (lower.includes('calculando') || lower.includes('calculando...')) type = 'calc';
      else if (lower.includes('relógio') || lower.includes('verificando...')) type = 'clock';
      else if (lower.includes('criando skill:') || lower.includes('criou skill:')) type = 'skill_create';
      else if (lower.includes('editando skill:') || lower.includes('editou skill:')) type = 'skill_edit';
      else if (lower.includes('excluindo skill:') || lower.includes('excluiu skill:')) type = 'skill_delete';
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

      // Split on *italic* or _italic_ (using lookbehinds/lookaheads to ignore underscores within word characters like area_principal)
      const italicSplit = boldChunk.split(/\*(.*?)\*|(?<!\w)_(?!\s)(.*?)(?<!\s)_(?!\w)/g);

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
                if (token.type.startsWith('skill_')) {
                  return (
                    <AgenticSkillTag
                      key={`skill-tag-${pIdx}-${keyIndex++}`}
                      text={token.text}
                      type={token.type}
                    />
                  );
                }

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
        const normalizedLang = lang.toLowerCase();

        if (normalizedLang === 'html' || normalizedLang === 'htm') {
          blocks.push(
            <div key={`html-code-${i}`}>
              <HtmlCodeBlock code={code.trim()} />
            </div>
          );
        } else {
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
        }
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

      // 7. Lists (Hierarchical: both Unordered & Ordered handled as a single block)
      if (isListItem(trimmed)) {
        const listLines: string[] = [];
        
        while (i < lines.length) {
          const currentLine = lines[i];
          const currentTrimmed = currentLine.trim();
          
          if (currentTrimmed === '') {
            // Peek ahead to see if there is another list item after the empty line(s)
            let peekIdx = i + 1;
            while (peekIdx < lines.length && lines[peekIdx].trim() === '') {
              peekIdx++;
            }
            if (peekIdx < lines.length && isListItem(lines[peekIdx])) {
              i = peekIdx;
              continue;
            } else {
              break;
            }
          }
          
          if (isListItem(currentLine)) {
            listLines.push(currentLine);
            i++;
          } else {
            break;
          }
        }

        const listItems: ListItem[] = listLines.map((lineStr) => {
          const indent = lineStr.match(/^\s*/)?.[0].length || 0;
          const trimmedLine = lineStr.trim();
          let markerType: 'ordered' | 'unordered' = 'unordered';
          let markerText = '•';
          let text = trimmedLine;

          const orderedMatch = trimmedLine.match(/^(\d+\.)\s+(.*)$/);
          if (orderedMatch) {
            markerType = 'ordered';
            markerText = orderedMatch[1];
            text = orderedMatch[2];
          } else {
            const unorderedMatch = trimmedLine.match(/^([-*+•])\s+(.*)$/);
            if (unorderedMatch) {
              markerType = 'unordered';
              markerText = unorderedMatch[1];
              text = unorderedMatch[2];
            }
          }

          return {
            rawLine: lineStr,
            indent,
            markerType,
            markerText,
            text,
          };
        });

        const roots = buildListTree(listItems);

        blocks.push(
          <div key={`list-block-${i}`} className="my-3 select-text">
            {renderNodes(roots, renderInlineContent)}
          </div>
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
