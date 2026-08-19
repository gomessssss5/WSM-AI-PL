import React from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check, Globe, Calculator, Clock, FileCode2, CheckCircle2, X, AlertTriangle, FileCode, MapPin, TvMinimalPlay, Image as ImageIcon, Loader2, Download, ZoomIn, MousePointer2, Keyboard, ScanEye, ArrowDownUp, FileText, FilePlus, FolderOpen, Edit3, Trash2, BookOpen, ChevronDown, ChevronRight, Sparkles, Cpu, Terminal } from 'lucide-react';
import WsmMapComponent from './WsmMapComponent';
import WsmChartComponent from './WsmChartComponent';
import WsmMindmapComponent from './WsmMindmapComponent';
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
      <span className="inline-block text-[14px] font-medium select-none my-1.5">
        <span className="shimmer-text">{labelText}</span>
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
        className={`inline-flex items-center gap-1 text-[14px] font-medium text-[#6b7076] dark:text-gray-400 transition-colors select-none p-0 bg-transparent border-0 my-1.5 ${isClickable ? 'cursor-pointer hover:text-black dark:hover:text-white' : 'cursor-default'}`}
      >
        <span>{labelText}</span>
        {isClickable && (
          <span className="text-[12px] text-gray-400 font-normal ml-0.5">(Ver Skill)</span>
        )}
      </button>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 md:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 text-black rounded-lg">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Skill: <span className="text-black font-mono text-base bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{skillName}</span>
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
                  <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
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
                <div className="prose prose-neutral max-w-none">
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
                className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer hover:shadow-md"
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

interface AgenticSearchTagProps {
  key?: string;
  text: string;
  isActive: boolean;
  fullContent?: string;
  searchSources?: Array<{ title: string; url: string; snippet?: string }>;
  searchSteps?: Array<{ tag: string; sources: Array<{ title: string; url: string }> }>;
  isTyping?: boolean;
}

export function AgenticSearchTag({
  text,
  isActive,
  fullContent = '',
  searchSources,
  searchSteps,
  isTyping
}: AgenticSearchTagProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Extract sources from props AND fullContent markdown links
  const sources = React.useMemo(() => {
    const result: { title: string; url: string }[] = [];

    // 1. Add from searchSources prop if provided
    if (searchSources && Array.isArray(searchSources)) {
      searchSources.forEach(s => {
        if (s && s.url) {
          result.push({ title: s.title || s.url, url: s.url });
        }
      });
    }

    // 2. Add from searchSteps prop if provided
    if (searchSteps && Array.isArray(searchSteps)) {
      searchSteps.forEach(st => {
        if (st && Array.isArray(st.sources)) {
          st.sources.forEach(s => {
            if (s && s.url) {
              result.push({ title: s.title || s.url, url: s.url });
            }
          });
        }
      });
    }

    // 3. Extract markdown links [title](url) from fullContent
    if (fullContent) {
      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(fullContent)) !== null) {
        if (match[1] && match[2]) {
          result.push({ title: match[1], url: match[2] });
        }
      }
    }

    // Deduplicate by URL
    return result.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
  }, [searchSources, searchSteps, fullContent]);

  const cleanDisplay = isActive ? 'Pesquisando na web' : (isTyping ? 'Processando resposta...' : 'Pesquisou na web');

  if (isActive) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none my-1 searching">
        <Globe className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
        <span className="shimmer-text">{cleanDisplay}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1.5 w-full my-1 animate-fade-in">
      {/* Tag button with Globe icon and arrow */}
      <div className="flex items-center justify-start py-0.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6b7076] hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors select-none p-0 bg-transparent border-0 cursor-pointer"
        >
          <Globe className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
          <span>{cleanDisplay}</span>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#6b7076] dark:text-gray-400 shrink-0" />
          )}
        </button>
      </div>

      {/* Expanded invisible card with white background interior */}
      {isOpen && (
        <div className="flex gap-3 pl-1 py-1.5 animate-fade-in w-full max-w-2xl">
          {/* Left timeline thread */}
          <div className="flex flex-col items-center shrink-0 w-5">
            <div className="w-5 h-5 flex items-center justify-center shrink-0 my-0.5">
              <Globe className="w-4 h-4 text-[#8e9099] shrink-0" />
            </div>
            <div className="w-[1px] flex-1 bg-gray-200 dark:bg-zinc-700 my-1" />
            <div className="w-5 h-5 flex items-center justify-center shrink-0 my-0.5">
              <CheckCircle2 className="w-4 h-4 text-[#8e9099] shrink-0" />
            </div>
          </div>

          {/* Right content column */}
          <div className="flex-1 min-w-0 pr-1">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2 select-none h-5">
              <span className="text-[13.5px] font-medium text-gray-800 dark:text-gray-200 truncate mr-2">
                pesquisa na web
              </span>
              <span className="text-[12px] text-gray-400 dark:text-gray-500 shrink-0">
                {sources.length} {sources.length === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>

            {/* White card containing sources */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border-0 my-1 w-full space-y-0.5">
              {sources.length > 0 ? (
                sources.map((src, sIdx) => {
                  let domain = '';
                  try {
                    domain = new URL(src.url).hostname.replace(/^www\./, '');
                  } catch {
                    domain = src.url;
                  }
                  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                  return (
                    <a
                      key={sIdx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <img
                          src={favicon}
                          alt=""
                          className="w-4 h-4 object-contain rounded-xs shrink-0 bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
                          }}
                        />
                        <span className="text-[13px] font-normal text-gray-800 dark:text-gray-200 truncate group-hover:text-black dark:group-hover:text-blue-400">
                          {src.title}
                        </span>
                      </div>
                      <span className="text-[12px] text-gray-400 dark:text-gray-500 font-normal shrink-0">
                        {domain}
                      </span>
                    </a>
                  );
                })
              ) : (
                <div className="py-2 px-2.5 text-[12.5px] text-gray-400 italic select-none">
                  Fontes pesquisadas na web
                </div>
              )}
            </div>

            {/* Bottom row */}
            <div className="flex items-center h-5 mt-1 select-none">
              <span className="text-[13px] font-medium text-[#8e9099] dark:text-gray-400">
                Concluído
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AgenticDebugTagProps {
  key?: string;
  text: string;
  fullContent: string;
  isTyping?: boolean;
}

export function AgenticDebugTag({ text, fullContent, isTyping = false }: AgenticDebugTagProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Split base64 payload if present
  const { cleanText, htmlPayload } = React.useMemo(() => {
    if (text.includes('| HTML_BASE64:')) {
      const parts = text.split('| HTML_BASE64:');
      const clean = parts[0].trim();
      let payload = parts[1] || '';
      // Strip any trailing bracket
      payload = payload.replace(/\]$/, '').trim();
      return { cleanText: clean, htmlPayload: payload };
    }
    return { cleanText: text, htmlPayload: null };
  }, [text]);

  const lowerText = cleanText.toLowerCase();
  const isVerified = lowerText.includes('100% verificado') || lowerText.includes('sem erros');
  
  const displayType = isVerified ? 'Código 100% verificado' : 'Arrumando erros';

  // Decode the base64 payload
  const decodedHtml = React.useMemo(() => {
    if (!htmlPayload) return null;
    try {
      return decodeURIComponent(escape(window.atob(htmlPayload)));
    } catch (e) {
      try {
        return window.atob(htmlPayload);
      } catch (err) {
        console.error("Failed to decode HTML payload:", err);
        return null;
      }
    }
  }, [htmlPayload]);
  
  // Extract relevant html block from markdown if base64 payload is not available
  const fallbackHtml = React.useMemo(() => {
    if (!fullContent) return null;
    const lines = fullContent.split('\n');
    const htmlBlocks: string[] = [];
    let inHtml = false;
    let currentHtmlLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('```html') || trimmed.startsWith('```htm')) {
        inHtml = true;
        currentHtmlLines = [];
      } else if (trimmed.startsWith('```') && inHtml) {
        inHtml = false;
        htmlBlocks.push(currentHtmlLines.join('\n'));
      } else if (inHtml) {
        currentHtmlLines.push(line);
      }
    }

    if (htmlBlocks.length === 0) return null;
    
    if (isVerified) {
      return htmlBlocks[htmlBlocks.length - 1];
    } else {
      return htmlBlocks[0];
    }
  }, [fullContent, isVerified]);

  const verifiedHtml = decodedHtml || fallbackHtml;

  // Extract error message if present after the colon
  const errorMessage = React.useMemo(() => {
    if (!cleanText.includes(':')) return null;
    return cleanText.split(':').slice(1).join(':').replace(/\]$/, '').trim();
  }, [cleanText]);

  const isActive = isTyping && (
    cleanText.trim().endsWith('...') || 
    cleanText.trim().endsWith('...]') || 
    lowerText.includes('verificando possíveis erros') ||
    lowerText.includes('pesquisando...')
  );

  if (isActive) {
    return (
      <span className="inline-block text-[14px] font-medium select-none my-1.5">
        <span className="shimmer-text">{displayType}</span>
      </span>
    );
  }

  const hasHtml = !!verifiedHtml;

  return (
    <div className="w-full flex flex-col items-start gap-2 my-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-[14px] font-medium text-[#6b7076] dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors select-none p-0 bg-transparent border-0 cursor-pointer"
      >
        <span>{displayType}</span>
        <span className="text-[12px] text-gray-400 font-normal ml-0.5">
          {isOpen ? '(Ocultar visualização)' : '(Clique para abrir visualização)'}
        </span>
      </button>

      {/* Expanded Container with live iframe rendering of HTML */}
      {isOpen && (
        isVerified ? (
          <div className="w-full bg-[#fdfdfd] border border-gray-200 rounded-2xl shadow-lg overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-3 duration-300 max-w-full">
            {/* Mock Browser Title bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-150 text-xs text-gray-500 select-none">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 block shrink-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 block shrink-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block shrink-0" />
                </div>
                <span className="w-[1px] h-3 bg-gray-200 mx-1.5" />
                <span className="font-mono text-[11px] text-gray-400 bg-white border border-gray-150 rounded px-2.5 py-0.5 flex items-center gap-1.5 shadow-3xs">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                  <span>sandbox://html-verificado.local</span>
                </span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => {
                    if (verifiedHtml) {
                      navigator.clipboard.writeText(verifiedHtml);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors cursor-pointer text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar HTML'}</span>
                </button>
              </div>
            </div>

            {/* Render Area */}
            <div className="p-1 bg-gray-100 flex-1 flex items-center justify-center relative min-h-[300px]">
              {hasHtml ? (
                <iframe
                  srcDoc={verifiedHtml}
                  title="Verified HTML Sandbox"
                  className="w-full h-[320px] bg-white rounded-xl shadow-xs border border-gray-200"
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-sm mx-auto">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-2.5 shrink-0" />
                  <p className="text-xs font-semibold text-gray-800">HTML correspondente não encontrado no corpo da mensagem.</p>
                  <p className="text-[11px] text-gray-500 mt-1">O código HTML está sendo finalizado ou não pôde ser localizado para esta etapa.</p>
                </div>
              )}
            </div>
            
            {/* Footer Info */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-150 flex items-center justify-between text-[10.5px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full block bg-emerald-500" />
                <span>Código verificado com sucesso absoluto</span>
              </span>
              <span>Pronto para produção</span>
            </div>
          </div>
        ) : (
          /* For "Arrumando erros": Render ONLY the iframe to act as a clean visual "print" of the HTML and nothing else! */
          <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 max-w-full">
            {hasHtml ? (
              <iframe
                srcDoc={verifiedHtml}
                title="Debugging HTML Sandbox Print"
                className="w-full h-[320px] bg-white border-0 block"
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-sm mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2.5 shrink-0" />
                <p className="text-xs font-semibold text-gray-800">HTML correspondente não encontrado no corpo da mensagem.</p>
                <p className="text-[11px] text-gray-500 mt-1">O código sob análise não pôde ser localizado para esta etapa.</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
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
  return t.startsWith('- ') || t.startsWith('* ') || t.startsWith('+ ') || t.startsWith('• ') || /^\d+[\.\)]\s+/.test(t);
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
    <div className={`space-y-1.5 ${depth > 0 ? 'mt-1 ml-5' : ''}`} style={{ listStyle: 'none', listStyleType: 'none' }}>
      {groups.map((group, groupIdx) => {
        if (group.type === 'ordered') {
          return (
            <ol key={`ol-${depth}-${groupIdx}`} className="list-none space-y-1 text-black dark:text-gray-100 text-[14.5px]" style={{ listStyle: 'none', listStyleType: 'none' }}>
              {group.items.map((node, nodeIdx) => {
                let markerColor = 'text-black dark:text-white';
                if (depth === 1) {
                  markerColor = 'text-gray-700 dark:text-gray-300';
                } else if (depth === 2) {
                  markerColor = 'text-black';
                } else if (depth >= 3) {
                  markerColor = 'text-gray-500';
                }

                return (
                  <li key={nodeIdx} className="leading-relaxed" style={{ listStyle: 'none', listStyleType: 'none' }}>
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
            <ul key={`ul-${depth}-${groupIdx}`} className="list-none space-y-1 text-gray-700 text-[13.5px]" style={{ listStyle: 'none', listStyleType: 'none' }}>
              {group.items.map((node, nodeIdx) => {
                let bullet = '•';
                let bulletColor = 'text-black dark:text-white';
                
                if (depth === 1) {
                  bullet = '◦';
                  bulletColor = 'text-gray-700 dark:text-gray-300';
                } else if (depth === 2) {
                  bullet = '▪';
                  bulletColor = 'text-black';
                } else if (depth >= 3) {
                  bullet = '▫';
                  bulletColor = 'text-gray-500';
                }

                return (
                  <li key={nodeIdx} className="leading-relaxed" style={{ listStyle: 'none', listStyleType: 'none' }}>
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
  searchSources?: Array<{ title: string; url: string; snippet?: string }>;
  searchSteps?: Array<{ tag: string; sources: Array<{ title: string; url: string }> }>;
}

export default function MarkdownRenderer({
  content,
  isTyping = false,
  searchSources,
  searchSteps
}: MarkdownRendererProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const cleanStepTags = (text: string) => {
    if (!text) return "";
    let clean = text;
    // Remove agentic step tags
    clean = clean.replace(/\[nova tarefa:[\s\S]*?\]/gi, "");
    clean = clean.replace(/\[tarefa removida:[\s\S]*?\]/gi, "");
    clean = clean.replace(/\[passo concluído\]/gi, "");
    return clean;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to safely render KaTeX to HTML string
  const renderMathToHtml = (tex: string, displayMode: boolean): string => {
    try {
      // Fix unescaped JS control sequences in TeX strings from JSON/string serialization
      let cleanTex = tex
        .replace(/\x09ext/g, '\\text')
        .replace(/\x09extbf/g, '\\textbf')
        .replace(/\x09extit/g, '\\textit')
        .replace(/\x08egin/g, '\\begin')
        .replace(/\x0crac/g, '\\frac')
        .replace(/\x0dight/g, '\\right')
        .replace(/\x0eft/g, '\\left');

      return katex.renderToString(cleanTex, {
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

    // 0. Extract slash commands (e.g., /web, /calculadora, /relogio, /função)
    const slashRegex = /(?:^|\s)(\/[a-zA-Z0-9áéíóúâêîôûãõàèìòùäëïöüÿñçÇÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÄËÏÖÜŸÑ_]+)/gi;
    currentText = currentText.replace(slashRegex, (match, cmd) => {
      const id = `:::SLASHTOKEN-${slashTokens.length}:::`;
      slashTokens.push({ id, text: cmd });
      const space = match.startsWith(' ') ? ' ' : '';
      return space + id;
    });

    // 0.1 Extract markdown images: ![alt](url) FIRST
    const inlineImageRegex = /!\[([^\[\]]*)\]\(([^)]+)\)/g;
    currentText = currentText.replace(inlineImageRegex, (match, altText, url) => {
      // If it's a base64 data URI, strip it completely so raw base64 text is never dumped into chat text
      if (url.trim().startsWith('data:image/')) {
        return '';
      }
      const id = `:::LINKTOKEN-${linkTokens.length}:::`;
      linkTokens.push({ id, text: altText || 'Imagem', url });
      return id;
    });

    // 0.2 Extract links: [text](url) FIRST so agenticRegex does not swallow citation links [Title...](url)
    // Use [^\[\]]+ to ensure nested brackets [ [Title](url) ] are not matched across outer brackets
    const inlineLinkRegex = /\[([^\[\]]+)\]\(([^)]+)\)/g;
    currentText = currentText.replace(inlineLinkRegex, (match, textContent, url) => {
      if (!textContent.trim() || !url.trim()) return match;
      if (url.trim().startsWith('data:image/')) return '';
      const cleanUrl = url.trim();
      const lowerUrl = cleanUrl.toLowerCase();
      if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('vbscript:') || lowerUrl.startsWith('data:text/html')) {
        return `${textContent.trim()} [javascript removido]`;
      }
      const id = `:::LINKTOKEN-${linkTokens.length}:::`;
      linkTokens.push({ id, text: textContent.trim(), url: cleanUrl });
      return id;
    });

    // 0.3 Extract standalone citation numbers [1], [2], [1, 2] or [Fonte #1]
    const standaloneCitationRegex = /\[(?:Fonte\s*:?\s*#?|#)?\s*(\d+)(?:\s*,\s*#?\s*(\d+))?\]/gi;
    currentText = currentText.replace(standaloneCitationRegex, (match, n1, n2) => {
      const nums = [n1, n2].filter(Boolean);
      let replacement = '';
      for (const numStr of nums) {
        const idx = parseInt(numStr, 10) - 1;
        const src = (searchSources && searchSources[idx]) ? searchSources[idx] : null;
        let domain = '';
        let url = '#';
        let label = `Fonte #${numStr}`;

        if (src && src.url) {
          url = src.url;
          try {
            domain = new URL(src.url).hostname.replace(/^www\./, '');
          } catch {
            domain = src.url;
          }
          label = src.title || domain || `Fonte #${numStr}`;
        }

        const id = `:::LINKTOKEN-${linkTokens.length}:::`;
        linkTokens.push({ id, text: label, url });
        replacement += (replacement ? ' ' : '') + id;
      }
      return replacement || match;
    });

    // 0.4 Strip outer brackets wrapping link tokens, e.g. [ :::LINKTOKEN-0::: ] or [ :::LINKTOKEN-0::: , :::LINKTOKEN-1::: ]
    const outerBracketsLinkRegex = /\[\s*((?::::LINKTOKEN-\d+:::|[\s,;])+)\]/g;
    currentText = currentText.replace(outerBracketsLinkRegex, (match, inner) => {
      const cleanInner = inner.replace(/\s+,/g, ',').trim();
      return cleanInner ? ` ${cleanInner}` : match;
    });

    // Clean up trailing spaces before punctuation
    currentText = currentText.replace(/(:::LINKTOKEN-\d+:::)\s+([.,;!])/g, '$1$2');

    // 1. Extract agentic tags: [pesquisou na web], [calculando], [verificando relógio], and active/completed states
    // Note negative lookahead (?!\s*\() to prevent matching markdown link text [Text](url)
    const agenticRegex = /\[(pesquisou na web|pesquisando[\s\S]*?|acessando site[\s\S]*?|acessando[\s\S]*?|abrindo site[\s\S]*?|lendo página[\s\S]*?|lendo conteúdo[\s\S]*?|preparando resumo[\s\S]*?|preparando[\s\S]*?|elaborando resposta[\s\S]*?|elaborando[\s\S]*?|analisando[\s\S]*?|processando[\s\S]*?|sintetizando[\s\S]*?|extraindo[\s\S]*?|buscando[\s\S]*?|calculando[\s\S]*?|calculou[\s\S]*?|verificando[\s\S]*?|verificou[\s\S]*?|clicando[\s\S]*?|digitando[\s\S]*?|rolando[\s\S]*?|aguardando[\s\S]*?|aguardou[\s\S]*?|criando arquivo[\s\S]*?|criou o arquivo[\s\S]*?|criou arquivo[\s\S]*?|salvando arquivo[\s\S]*?|salvou arquivo[\s\S]*?|lendo arquivo[\s\S]*?|leu arquivo[\s\S]*?|editando arquivo[\s\S]*?|editou arquivo[\s\S]*?|excluindo arquivo[\s\S]*?|excluiu arquivo[\s\S]*?|executando[\s\S]*?|executou[\s\S]*?|rodando[\s\S]*?|rodou[\s\S]*?|testando[\s\S]*?|testou[\s\S]*?|compilando[\s\S]*?|compilou[\s\S]*?|iniciando[\s\S]*?|iniciou[\s\S]*?|gerando[\s\S]*?|gerou[\s\S]*?|validando[\s\S]*?|validou[\s\S]*?|instalando[\s\S]*?|instalou[\s\S]*?|criando skill[\s\S]*?|editando skill[\s\S]*?|excluindo skill[\s\S]*?|criou skill[\s\S]*?|editou skill[\s\S]*?|excluiu skill[\s\S]*?|criando documento[\s\S]*?|criou documento[\s\S]*?|lendo documento[\s\S]*?|leu documento[\s\S]*?|editando documento[\s\S]*?|editou documento[\s\S]*?|excluindo documento[\s\S]*?|excluiu documento[\s\S]*?|listando documentos[\s\S]*?|listou documentos[\s\S]*?|código 100% verificado[\s\S]*?|corrigindo erro[\s\S]*?|sandbox de depuração[\s\S]*?|nova tarefa[\s\S]*?|passo concluído[\s\S]*?|documento não encontrado[\s\S]*?)\](?!\s*\()/gi;
    const seenAgenticTypes = new Set<string>();
    currentText = currentText.replace(agenticRegex, (match, tagContent) => {
      let finalTagContent = tagContent;
      const linkMatches = finalTagContent.match(/:::LINKTOKEN-\d+:::/g);
      if (linkMatches) {
        linkMatches.forEach(tok => {
          const t = linkTokens.find(l => l.id === tok);
          if (t) finalTagContent = finalTagContent.replace(tok, t.text);
        });
      }

      const id = `:::AGENTICTOKEN-${agenticTokens.length}:::`;
      let type = 'web';
      const lower = finalTagContent.toLowerCase();
      if (lower.includes('calculando') || lower.includes('calculou')) type = 'calc';
      else if (lower.includes('relógio') || lower.includes('verificando')) type = 'clock';
      else if (lower.includes('erros no código') || lower.includes('100% verificado') || lower.includes('depuração') || lower.includes('corrigindo erro')) type = 'debug';
      else if (lower.includes('executand') || lower.includes('executou') || lower.includes('rodand') || lower.includes('rodou') || lower.includes('testand') || lower.includes('testou') || lower.includes('compiland') || lower.includes('compilou')) type = 'terminal_exec';
      else if ((lower.includes('arquivo') && (lower.includes('criand') || lower.includes('criou') || lower.includes('salvand') || lower.includes('salvou') || lower.includes('lend') || lower.includes('leu') || lower.includes('editand') || lower.includes('editou') || lower.includes('exclu'))) || lower.includes('salvando arquivo') || lower.includes('criando arquivo')) type = 'terminal_file';
      else if (lower.includes('criando skill') || lower.includes('criou skill')) type = 'skill_create';
      else if (lower.includes('editando skill') || lower.includes('editou skill')) type = 'skill_edit';
      else if (lower.includes('excluindo skill') || lower.includes('excluiu skill')) type = 'skill_delete';
      else if (lower.includes('nova tarefa') || lower.includes('tarefa removida') || lower.includes('passo concluído')) type = 'task_update';
      else if (lower.includes('abrindo site') || lower.includes('acessando site') || lower.includes('acessando')) type = 'pw_open';
      else if (lower.includes('clicando')) type = 'pw_click';
      else if (lower.includes('digitando')) type = 'pw_type';
      else if (lower.includes('rolando')) type = 'pw_scroll';
      else if (lower.includes('lendo página') || lower.includes('lendo conteúdo') || lower.includes('extraindo')) type = 'pw_read';
      else if (lower.includes('preparando') || lower.includes('elaborando') || lower.includes('sintetizando')) type = 'preparing';
      else if (lower.includes('analisando') || lower.includes('processando')) type = 'analyzing';
      else if (lower.includes('aguardando') || lower.includes('aguardou')) type = 'pw_wait';
      else if (lower.includes('criando documento') || lower.includes('criou documento')) type = 'doc_create';
      else if (lower.includes('lendo documento') || lower.includes('leu documento')) type = 'doc_read';
      else if (lower.includes('editando documento') || lower.includes('editou documento')) type = 'doc_edit';
      else if (lower.includes('excluindo documento') || lower.includes('excluiu documento')) type = 'doc_delete';
      else if (lower.includes('listando documentos') || lower.includes('listou documentos')) type = 'doc_list';

      if (type === 'calc' || type === 'clock' || type === 'web' || type === 'debug') {
        if (seenAgenticTypes.has(type)) {
          return ''; // Collapse all 2nd..Nth duplicate tool chips into a single chip
        }
        seenAgenticTypes.add(type);
      } else if (type === 'terminal_exec' || type === 'terminal_file') {
        // Keep sequential execution and file tags inline in the conversation stream
      } else {
        if (seenAgenticTypes.has(finalTagContent.toLowerCase()) || seenAgenticTypes.has(type)) {
          return ''; // Completely remove duplicate tag from text
        }
        seenAgenticTypes.add(finalTagContent.toLowerCase());
        seenAgenticTypes.add(type);
      }
      agenticTokens.push({ id, type, text: finalTagContent });
      
      return id;
    });

    // 1.1 Extract XML terminal tags: <wsm_terminal_exec .../> or <wsm_terminal_file .../>
    const xmlTerminalRegex = /<wsm_terminal_(?:exec|file)\s+[^>]*?(?:\/>|>[\s\S]*?<\/wsm_terminal_(?:exec|file)>)/gi;
    currentText = currentText.replace(xmlTerminalRegex, (match) => {
      const id = `:::AGENTICTOKEN-${agenticTokens.length}:::`;
      if (match.includes('wsm_terminal_exec')) {
        const cmdMatch = match.match(/command="([^"]*)"/i) || match.match(/cmd="([^"]*)"/i);
        const statusMatch = match.match(/status="([^"]*)"/i);
        const exitMatch = match.match(/exitCode="([^"]*)"/i);
        const cmd = cmdMatch ? cmdMatch[1] : 'script';
        const status = statusMatch ? statusMatch[1].toLowerCase() : 'done';
        const exitCode = exitMatch ? exitMatch[1] : undefined;
        const isFailed = status === 'failed' || status === 'timed_out' || (exitCode !== undefined && exitCode !== '0');

        if (isFailed) {
          agenticTokens.push({
            id,
            type: 'terminal_exec_failed',
            text: `Falha no terminal (${cmd}${exitCode ? ' - Exit ' + exitCode : ''})`
          });
        } else {
          agenticTokens.push({ id, type: 'terminal_exec', text: `Executou no terminal: ${cmd}` });
        }
      } else {
        const pathMatch = match.match(/path="([^"]*)"/i) || match.match(/filename="([^"]*)"/i);
        const p = pathMatch ? pathMatch[1] : 'arquivo';
        agenticTokens.push({ id, type: 'terminal_file', text: `Criou arquivo ${p}` });
      }
      return id;
    });

    // 0.1 Extract parenthesized process messages (e.g. (Gerando e validando...), (Corrigindo...))
    const parenStatusRegex = /\(((?:Gerando|Corrigindo|Validando|Processando|Analisando|Criando|Executando|Ajustando|Testando)[\s\S]*?)\)/gi;
    currentText = currentText.replace(parenStatusRegex, (match, tagContent) => {
      let finalTagContent = tagContent;
      const linkMatches = finalTagContent.match(/:::LINKTOKEN-\d+:::/g);
      if (linkMatches) {
        linkMatches.forEach(tok => {
          const t = linkTokens.find(l => l.id === tok);
          if (t) finalTagContent = finalTagContent.replace(tok, t.text);
        });
      }

      const id = `:::AGENTICTOKEN-${agenticTokens.length}:::`;
      agenticTokens.push({ id, type: 'paren_status', text: finalTagContent });
      return id;
    });

    // 1. Extract inline math: $...$ or \(...\)
    const inlineMathRegex = /(?<![A-Za-z0-9\\$])\$([^\s$]|(?:[^\s$](?:[^$]|\\\$)*?[^\s$]))\$(?![0-9])|\\\((.*?)\\\)/g;
    currentText = currentText.replace(inlineMathRegex, (match, p1, p2) => {
      let tex = (p1 !== undefined ? p1 : p2) || '';
      tex = tex.trim()
        .replace(/\x09ext/g, '\\text')
        .replace(/\x09extbf/g, '\\textbf')
        .replace(/\x09extit/g, '\\textit')
        .replace(/\x08egin/g, '\\begin')
        .replace(/\x0crac/g, '\\frac')
        .replace(/\x0dight/g, '\\right')
        .replace(/\x0eft/g, '\\left');
      if (!tex) return match;

      // Ignore currency expressions (e.g. "R$ 50,00 e R$ 10,00", "$10 e $20", etc.)
      if (p1 !== undefined) {
        if (/\b(e|ou|and|or|de|com|por|em|para|desconto|preço|preco|custo|valor|totais|total|reais|dólares|dolares)\b/i.test(tex)) {
          return match;
        }
        if (/^\d[\d.,]*\b[\s\S]*\b\d[\d.,]*$/.test(tex) && !/[=+\-*\/\\^_<>≤≥≠≈±÷×]/.test(tex)) {
          return match;
        }
      }

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
                    className="text-black font-bold select-text inline-block"
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

                if (token.type === 'debug') {
                  return (
                    <AgenticDebugTag
                      key={`debug-tag-${pIdx}-${keyIndex++}`}
                      text={token.text}
                      fullContent={content}
                      isTyping={isTyping}
                    />
                  );
                }

                if (token.type === 'paren_status') {
                  return (
                    <span
                      key={`paren-status-${pIdx}-${keyIndex++}`}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium py-1 px-3 rounded-full border transition-all select-none text-gray-900 bg-gray-100 border-gray-300 cursor-default shadow-3xs mx-0 my-3"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-1000 animate-pulse shrink-0" />
                      <span><strong className="font-semibold">{token.text}</strong></span>
                    </span>
                  );
                }

                let Icon = Globe;
                let displayType = 'Pesquisou na web';
                let isActive = false;
                
                if (token.type === 'calc') {
                  if (!isTyping) return null;
                  Icon = Calculator;
                  displayType = 'Calculando...';
                  isActive = true;
                } else if (token.type === 'clock') {
                  if (!isTyping) return null;
                  Icon = Clock;
                  displayType = 'Verificando...';
                  isActive = true;
                } else if (token.type === 'skill_create' || token.type === 'skill_edit' || token.type === 'skill_delete') {
                  Icon = CheckCircle2;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText.charAt(0).toUpperCase() + rawText.slice(1);
                } else if (token.type === 'task_update') {
                  Icon = CheckCircle2;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText.charAt(0).toUpperCase() + rawText.slice(1);
                } else if (token.type === 'pw_open') {
                  Icon = Globe;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping;
                } else if (token.type === 'pw_click') {
                  Icon = MousePointer2;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping;
                } else if (token.type === 'pw_type') {
                  Icon = Keyboard;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping;
                } else if (token.type === 'pw_scroll') {
                  Icon = ArrowDownUp;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping;
                } else if (token.type === 'pw_read') {
                  Icon = ScanEye;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.includes('...');
                } else if (token.type === 'preparing') {
                  Icon = Sparkles;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.includes('...');
                } else if (token.type === 'analyzing') {
                  Icon = Cpu;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.includes('...');
                } else if (token.type === 'pw_wait') {
                  Icon = Clock;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.includes('...');
                } else if (token.type === 'terminal_exec') {
                  Icon = Terminal;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && (token.text.includes('...') || token.text.toLowerCase().startsWith('executando') || token.text.toLowerCase().startsWith('rodando'));
                } else if (token.type === 'terminal_file') {
                  Icon = FileCode;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && (token.text.includes('...') || token.text.toLowerCase().startsWith('criando') || token.text.toLowerCase().startsWith('salvando'));
                } else if (token.type === 'doc_create') {
                  Icon = FilePlus;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.endsWith('...');
                } else if (token.type === 'doc_read') {
                  Icon = FolderOpen;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.endsWith('...');
                } else if (token.type === 'doc_edit') {
                  Icon = Edit3;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.endsWith('...');
                } else if (token.type === 'doc_delete') {
                  Icon = Trash2;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.endsWith('...');
                } else if (token.type === 'doc_list') {
                  Icon = FileText;
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText;
                  isActive = isTyping && token.text.endsWith('...');
                } else {
                  let rawText = token.text.replace(/\[|\]/g, '');
                  displayType = rawText || ((isTyping && token.text.includes('...')) ? 'Pesquisando na web...' : 'Pesquisou na web');
                  isActive = isTyping && token.text.includes('...');
                }

                if (token.type === 'web' || displayType.startsWith('Pesquis')) {
                  return (
                    <AgenticSearchTag
                      key={`search-tag-${pIdx}-${keyIndex++}`}
                      text={token.text}
                      isActive={isActive}
                      fullContent={content}
                      searchSources={searchSources}
                      searchSteps={searchSteps}
                      isTyping={isTyping}
                    />
                  );
                }

                if (token.type === 'terminal_exec_failed') {
                  return (
                    <div key={`agentic-${pIdx}-${keyIndex++}`} className="flex items-center gap-2.5 my-1.5 flex-wrap">
                      <span
                        onClick={() => window.dispatchEvent(new CustomEvent('open_terminal'))}
                        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-red-600 dark:text-red-400 select-none cursor-pointer hover:underline transition-colors"
                        title="Clique para ver detalhes no Terminal Sandbox"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span>{displayType}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                      </span>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open_terminal'))}
                        className="px-2.5 py-1 text-[12px] font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60 rounded-md border border-red-200 dark:border-red-800/80 transition-colors cursor-pointer shadow-3xs"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  );
                }

                if (token.type === 'terminal_file') {
                  const rawFilename = token.text.replace(/^(Criou arquivo|Criando arquivo|Salvou arquivo|Salvando arquivo)\s*/i, '').trim();
                  const cleanFilename = rawFilename.replace('/workspace/', '').replace(/^\//, '');

                  if (isActive) {
                    return (
                      <div
                        key={`agentic-${pIdx}-${keyIndex++}`}
                        onClick={() => window.dispatchEvent(new CustomEvent('open_terminal'))}
                        className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none my-1 searching cursor-pointer hover:opacity-90 transition-opacity"
                        title="Clique para abrir o Terminal Sandbox"
                      >
                        <FileText className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
                        <span className="shimmer-text">{displayType}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={`agentic-${pIdx}-${keyIndex++}`} className="inline-flex items-center gap-2 my-1 flex-wrap">
                      <span
                        onClick={() => window.dispatchEvent(new CustomEvent('open_terminal'))}
                        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6b7076] dark:text-gray-400 select-none cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
                        title="Clique para abrir o Terminal Sandbox"
                      >
                        <FileText className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0 group-hover:text-emerald-500 transition-colors" />
                        <span>{displayType}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </span>
                      {cleanFilename && (
                        <a
                          href={`/api/download/${encodeURIComponent(cleanFilename)}`}
                          download={cleanFilename}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                          title={`Baixar ${cleanFilename}`}
                        >
                          <Download className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Baixar</span>
                        </a>
                      )}
                    </div>
                  );
                }

                if (token.type === 'terminal_exec') {
                  if (isActive) {
                    return (
                      <div
                        key={`agentic-${pIdx}-${keyIndex++}`}
                        onClick={() => window.dispatchEvent(new CustomEvent('open_terminal'))}
                        className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none my-1 searching cursor-pointer hover:opacity-90 transition-opacity"
                        title="Clique para abrir o Terminal Sandbox"
                      >
                        <Icon className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
                        <span className="shimmer-text">{displayType}</span>
                      </div>
                    );
                  }

                  return (
                    <span
                      key={`agentic-${pIdx}-${keyIndex++}`}
                      onClick={() => window.dispatchEvent(new CustomEvent('open_terminal'))}
                      className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6b7076] dark:text-gray-400 select-none my-1 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
                      title="Clique para abrir o Terminal Sandbox"
                    >
                      <Icon className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0 group-hover:text-emerald-500 transition-colors" />
                      <span>{displayType}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </span>
                  );
                }

                if (isActive) {
                  return (
                    <div
                      key={`agentic-${pIdx}-${keyIndex++}`}
                      className="inline-flex items-center gap-1.5 text-[14px] font-medium select-none my-1 searching"
                    >
                      <Icon className="w-4 h-4 text-[#8e9099] dark:text-gray-400 shrink-0" />
                      <span className="shimmer-text">{displayType}</span>
                    </div>
                  );
                }

                return (
                  <span
                    key={`agentic-${pIdx}-${keyIndex++}`}
                    className="inline-block text-[14px] font-medium text-[#6b7076] dark:text-gray-400 select-none my-1"
                  >
                    <span>{displayType}</span>
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
                    className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-850 text-gray-800 dark:text-gray-200 font-mono text-[12px] rounded border border-gray-200 dark:border-gray-850 select-text"
                  >
                    {token.code}
                  </code>
                );
              }
            } else if (part.startsWith(':::LINKTOKEN-')) {
              const token = linkTokens.find(t => t.id === part);
              if (token) {
                const lowerUrl = token.url.toLowerCase().trim();
                if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('vbscript:') || lowerUrl.startsWith('data:text/html')) {
                  return (
                    <span key={`link-${pIdx}-${keyIndex++}`} className="text-gray-600 font-medium select-text">
                      {token.text} <span className="text-xs text-red-500 font-mono">[javascript removido]</span>
                    </span>
                  );
                }

                const isWorkspaceLink = lowerUrl.startsWith('/workspace/') || 
                  lowerUrl.startsWith('/api/download/') || 
                  lowerUrl.startsWith('/api/workspace/download/') || 
                  lowerUrl.includes('/workspace/') ||
                  /\.(md|csv|xlsx|xls|pdf|json|txt|py|js|ts|zip)$/i.test(lowerUrl.split('?')[0]);

                if (isWorkspaceLink) {
                  const rawFilename = token.url.split('/').pop()?.split('?')[0] || token.text || 'arquivo';
                  const filename = decodeURIComponent(rawFilename).replace(/^(\/workspace\/|\/workspace|workspace\/)/i, '');
                  const extMatch = filename.match(/\.([a-z0-9]+)$/i);
                  const ext = extMatch ? extMatch[1].toUpperCase() : 'DOC';
                  const downloadUrl = `/api/download/${encodeURIComponent(filename)}`;

                  return (
                    <a
                      key={`link-${pIdx}-${keyIndex++}`}
                      href={downloadUrl}
                      download={filename}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 mx-0.5 bg-blue-50/90 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 rounded-lg text-[13px] font-medium text-blue-900 dark:text-blue-100 transition-all select-none cursor-pointer align-middle no-underline shadow-3xs group"
                      title={`Baixar ${filename}`}
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-blue-800 dark:text-blue-200">{token.text.includes('.') ? token.text : filename}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-200/80 dark:bg-blue-800/80 text-blue-800 dark:text-blue-200 rounded font-mono uppercase leading-none">
                        {ext}
                      </span>
                    </a>
                  );
                }

                let domain = '';
                try {
                  domain = new URL(token.url).hostname.replace(/^www\./, '');
                } catch {
                  domain = token.text;
                }

                let displayText = token.text.trim();
                // Clean up raw URLs to domain
                if (displayText.startsWith('http://') || displayText.startsWith('https://')) {
                  displayText = domain;
                }

                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

                return (
                  <a
                    key={`link-${pIdx}-${keyIndex++}`}
                    href={token.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 my-0.5 mx-1 bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 border border-gray-200/80 dark:border-zinc-700/80 rounded-full text-[12px] font-medium text-gray-700 dark:text-gray-300 transition-all select-none cursor-pointer align-baseline max-w-full truncate no-underline shadow-2xs"
                    title={displayText}
                  >
                    <img
                      src={faviconUrl}
                      alt=""
                      className="w-3.5 h-3.5 rounded-full object-contain bg-white shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
                      }}
                    />
                    <span className="truncate">{displayText}</span>
                  </a>
                );
              }
              return null;
            }

            if (part.startsWith(':::') && part.endsWith(':::')) {
              return null;
            }

            const cleanPart = part.replace(/:::[A-Z]+-\d+:::/g, '');
            if (!cleanPart) return null;
            return <React.Fragment key={`text-${pIdx}-${keyIndex++}`}>{cleanPart}</React.Fragment>;
          });
        };

        const contentNodes = restoreTokens(italicChunk);

        if (isBold && isItalic) {
          elements.push(
            <strong key={`bi-${bIdx}-${iIdx}`} className="font-bold italic text-gray-900 dark:text-gray-100">
              {contentNodes}
            </strong>
          );
        } else if (isBold) {
          elements.push(
            <strong key={`b-${bIdx}-${iIdx}`} className="font-bold text-gray-900 dark:text-gray-100">
              {contentNodes}
            </strong>
          );
        } else if (isItalic) {
          elements.push(
            <em key={`i-${bIdx}-${iIdx}`} className="italic text-gray-800 dark:text-gray-200">
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

    const cleanedContent = cleanStepTags(content);
    
    let formattedContent = cleanedContent;

    // Remove markdown horizontal rules (---) which are visually inelegant
    formattedContent = formattedContent.replace(/\n\s*---\s*\n/g, '\n\n').replace(/^\s*---\s*\n/g, '');

    // Fix malformed AI links (e.g. [Site](url], or [Site](url, extra] -> [Site](url))
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)\]\,]+)[^\)]*\]/g, '[$1]($2)');

    // Auto-close incomplete markdown links at the very end of the text while streaming to avoid raw URL dumping
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]*)$/, '[$1]($2)');

    // Pre-sanitize duplicated list markers (e.g. "- •", "- -", "1. 1.", "2. 2.", "• •", "* -")
    formattedContent = formattedContent.replace(/^(\s*)(?:[-*+•]|\d+[\.\)])\s+((?:[-*+•]|\d+[\.\)])\s+)+/gm, (match, p1) => {
      const firstMarkerMatch = match.trim().match(/^(\d+[\.\)]|[-*+•])\s+/);
      return p1 + (firstMarkerMatch ? firstMarkerMatch[0] : '- ');
    });

    // Ensure wsm tags are on their own lines so text before/after them doesn't get swallowed
    const tagNames = ['wsm_chart', 'wsm_map', 'wsm_form', 'wsm_task', 'wsm_mindmap'];
    tagNames.forEach(tagName => {
      // Matches both self-closing <wsm_chart ... /> and matching <wsm_chart ...>...</wsm_chart>
      const selfClosingRegex = new RegExp(`(<${tagName}[\\s\\S]*?\\/>)`, 'gi');
      const openCloseRegex = new RegExp(`(<${tagName}[\\s\\S]*?>[\\s\\S]*?<\\/${tagName}>)`, 'gi');
      formattedContent = formattedContent.replace(selfClosingRegex, '\n$1\n');
      formattedContent = formattedContent.replace(openCloseRegex, '\n$1\n');
    });

    const lines = formattedContent.split('\n');
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

        // Render Mindmap directly if code block is markmap or mindmap or mermaid
        if (normalizedLang === 'markmap' || normalizedLang === 'mindmap' || normalizedLang === 'mermaid') {
          blocks.push(
            <WsmMindmapComponent
              key={`mindmap-code-${i}`}
              title="Mapa Mental Interativo"
              markdown={code.trim()}
            />
          );
          continue;
        }

        // Render Chart directly if code block is chart or chartjs
        if (normalizedLang === 'chart' || normalizedLang === 'chartjs') {
          blocks.push(
            <WsmChartComponent
              key={`chart-code-${i}`}
              type="bar"
              title="Gráfico Interativo"
              data={code.trim()}
            />
          );
          continue;
        }

        // Render Map directly if code block is map or leaflet or geojson
        if (normalizedLang === 'map' || normalizedLang === 'leaflet' || normalizedLang === 'geojson') {
          try {
            const mapObj = JSON.parse(code.trim());
            const latVal = mapObj.lat || (mapObj.length && mapObj[0].lat) || -23.5505;
            const lonVal = mapObj.lon || (mapObj.length && mapObj[0].lon) || -46.6333;
            blocks.push(
              <WsmMapComponent
                key={`map-code-${i}`}
                lat={latVal}
                lon={lonVal}
                zoom={mapObj.zoom || 10}
                place={mapObj.place || mapObj.title || 'Localização'}
                wiki={mapObj.wiki || ''}
                text={mapObj.text || ''}
                markers={Array.isArray(mapObj) ? mapObj : (mapObj.markers || [])}
              />
            );
            continue;
          } catch (e) {
            // fallback
          }
        }

        // Try to infer map or chart from generic JSON blocks
        if (normalizedLang === 'json') {
          try {
            const parsed = JSON.parse(code.trim());
            if (Array.isArray(parsed) && parsed.length > 0) {
              const first = parsed[0];
              // Detect Map
              if ('lat' in first && 'lon' in first) {
                blocks.push(
                  <WsmMapComponent
                    key={`map-json-${i}`}
                    lat={first.lat}
                    lon={first.lon}
                    zoom={10}
                    place={first.cidade || first.title || first.name || 'Localização'}
                    markers={parsed}
                  />
                );
                continue;
              }
              // Detect simple Chart
              if (('valor' in first || 'value' in first) && ('name' in first || 'label' in first || 'categoria' in first)) {
                blocks.push(
                  <WsmChartComponent
                    key={`chart-json-${i}`}
                    type="bar"
                    title="Gráfico Interativo"
                    data={code.trim()}
                  />
                );
                continue;
              }
            }
          } catch (e) {
            // Not a valid JSON or parsing failed, fallback to normal code block
          }
        }

        blocks.push(
          <div key={`code-${i}`} className="my-4 bg-gray-950 rounded-xl overflow-hidden shadow-md border border-gray-850 w-full max-w-full">
            <div className="bg-gray-900 px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-400 border-b border-gray-800/60 select-none">
              <span className="font-mono text-gray-400 uppercase tracking-wider font-semibold">
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
            <pre className="p-4 overflow-x-auto text-[12.5px] text-gray-200 font-mono leading-relaxed bg-gray-950/60 select-text max-w-full w-full block scrollbar-thin">
              <code className="whitespace-pre overflow-x-auto block font-mono min-w-0 max-w-full">{code.trim()}</code>
            </pre>
          </div>
        );
        continue;
      }

      // 3. Math Block: $$ math $$
      if (trimmed.startsWith('$$') || trimmed.startsWith('\\[')) {
        const isBracket = trimmed.startsWith('\\[');
        const endStr = isBracket ? '\\]' : '$$';
        let mathContent = trimmed.slice(2);
        // If it closes on the same line
        if (mathContent.endsWith(endStr) && mathContent.length >= 2) {
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
        while (i < lines.length && !lines[i].trim().startsWith(endStr)) {
          if (lines[i].trim().endsWith(endStr)) {
            mathContent += '\n' + lines[i].replace(new RegExp(endStr.replace(/\\/g, '\\\\') + '$'), '');
            i++;
            break;
          }
          mathContent += '\n' + lines[i];
          i++;
        }
        if (i < lines.length && lines[i].trim().startsWith(endStr)) {
           i++; // skip ending line if it was just the end string
        }
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
            <h2 key={`h2-${i}`} className="text-lg font-bold text-gray-800 tracking-tight mt-5 mb-2 flex items-center gap-2 border-l-3 border-black dark:border-white pl-2.5">
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
          <blockquote key={`quote-${i}`} className="my-4 border-l-4 border-black dark:border-white bg-gray-50/70 py-3 pl-4 pr-3 rounded-r-xl italic text-gray-600 text-[13.5px] leading-relaxed shadow-3xs">
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
          let cleanText = trimmedLine;

          const primaryMatch = trimmedLine.match(/^(\d+[\.\)]|[-*+•])\s+(.*)$/);
          if (primaryMatch) {
            const firstMarker = primaryMatch[1];
            if (/^\d+/.test(firstMarker)) {
              markerType = 'ordered';
              markerText = firstMarker.endsWith('.') ? firstMarker : `${firstMarker.slice(0, -1)}.`;
            } else {
              markerType = 'unordered';
              markerText = firstMarker;
            }
            cleanText = primaryMatch[2];

            // Strip any additional residual markers left in cleanText (e.g. "- •", "1. 1.")
            while (/^\s*(\d+[\.\)]|[-*+•])\s+/.test(cleanText)) {
              cleanText = cleanText.replace(/^\s*(\d+[\.\)]|[-*+•])\s+/, '').trim();
            }
          }

          return {
            rawLine: lineStr,
            indent,
            markerType,
            markerText,
            text: cleanText,
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

      // 8. Custom Map Tag: <wsm_map ... />
      if (trimmed.startsWith('<wsm_map') || trimmed.includes('<wsm_map')) {
        let mapLine = line;
        // If it doesn't close on this line, gather lines
        while (i < lines.length && !mapLine.includes('/>') && !mapLine.includes('</wsm_map>')) {
          i++;
          if (i < lines.length) {
            mapLine += '\n' + lines[i];
          }
        }

        const parseAttr = (str: string, attr: string): string => {
          const regexSingle = new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'i');
          const regexDouble = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i');
          
          const matchSingle = str.match(regexSingle);
          if (matchSingle) return matchSingle[1];
          
          const matchDouble = str.match(regexDouble);
          if (matchDouble) return matchDouble[1];
          
          return '';
        };

        let latVal = parseFloat(parseAttr(mapLine, 'lat'));
        let lonVal = parseFloat(parseAttr(mapLine, 'lon'));
        const zoomVal = parseInt(parseAttr(mapLine, 'zoom')) || 13;
        const placeVal = parseAttr(mapLine, 'place');
        const wikiVal = parseAttr(mapLine, 'wiki');
        const textVal = parseAttr(mapLine, 'text');
        const disableExtrasAttr = parseAttr(mapLine, 'disableExtras');
        const showExtrasAttr = parseAttr(mapLine, 'showExtras');
        
        let markersVal: any[] = [];
        const markersAttr = parseAttr(mapLine, 'markers');
        if (markersAttr) {
          try {
             const decoded = markersAttr.replace(/&quot;/g, '"');
             markersVal = JSON.parse(decoded);
          } catch(e) {
             console.error("Failed to parse map markers:", e);
          }
        }

        const disableExtras = disableExtrasAttr === 'true' || showExtrasAttr === 'false' || (markersVal.length > 0 && !wikiVal);

        if (isNaN(latVal) || isNaN(lonVal)) {
          if (markersVal.length > 0 && typeof markersVal[0].lat === 'number') {
            latVal = markersVal[0].lat;
            lonVal = markersVal[0].lon;
          } else {
            const combinedSearch = (placeVal + ' ' + wikiVal + ' ' + textVal).toLowerCase();
            if (combinedSearch.includes('rio de janeiro') || combinedSearch.includes('rj')) {
              latVal = -22.9068;
              lonVal = -43.1729;
            } else if (combinedSearch.includes('brasilia') || combinedSearch.includes('brasília')) {
              latVal = -15.7975;
              lonVal = -47.8919;
            } else {
              latVal = -23.5505;
              lonVal = -46.6333;
            }
          }
        }

        if (markersVal.length === 0) {
          markersVal = [{ lat: latVal, lon: lonVal, title: placeVal || wikiVal || "Localização" }];
        }

        blocks.push(
          <WsmMapComponent
            key={`map-${i}`}
            lat={latVal}
            lon={lonVal}
            zoom={zoomVal}
            place={placeVal}
            wiki={wikiVal}
            text={textVal}
            markers={markersVal}
            disableExtras={disableExtras}
          />
        );
        i++;
        continue;
      }

      // 9. Custom Chart Tag: <wsm_chart ... />
      if (trimmed.startsWith('<wsm_chart') || trimmed.includes('<wsm_chart')) {
        let chartLine = line;
        while (i < lines.length && !chartLine.includes('/>') && !chartLine.includes('</wsm_chart>')) {
          i++;
          if (i < lines.length) {
            chartLine += '\n' + lines[i];
          }
        }

        const parseAttr = (str: string, attr: string): string => {
          const regexSingle = new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'i');
          const regexDouble = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i');
          const regexBacktick = new RegExp(`${attr}\\s*=\\s*\`([^\`]*)\``, 'i');
          
          const matchSingle = str.match(regexSingle);
          if (matchSingle) return matchSingle[1];
          
          const matchDouble = str.match(regexDouble);
          if (matchDouble) return matchDouble[1];

          const matchBacktick = str.match(regexBacktick);
          if (matchBacktick) return matchBacktick[1];
          
          return '';
        };

        const typeVal = parseAttr(chartLine, 'type') || 'bar';
        const titleVal = parseAttr(chartLine, 'title') || 'Gráfico Interativo';
        const subtitleVal = parseAttr(chartLine, 'subtitle');
        const xAxisVal = parseAttr(chartLine, 'xAxis') || parseAttr(chartLine, 'x') || parseAttr(chartLine, 'xlabel') || parseAttr(chartLine, 'eixo_x') || parseAttr(chartLine, 'eixox');
        const yAxisVal = parseAttr(chartLine, 'yAxis') || parseAttr(chartLine, 'y') || parseAttr(chartLine, 'ylabel') || parseAttr(chartLine, 'eixo_y') || parseAttr(chartLine, 'eixoy');
        let dataVal = parseAttr(chartLine, 'data');

        if (!dataVal) {
          const matchData = chartLine.match(/data\s*=\s*(['"`])([\s\S]*?)\1/i);
          if (matchData) {
            dataVal = matchData[2];
          }
        }

        if (dataVal) {
          blocks.push(
            <WsmChartComponent
              key={`chart-${i}`}
              type={typeVal}
              title={titleVal}
              subtitle={subtitleVal}
              xAxis={xAxisVal}
              yAxis={yAxisVal}
              data={dataVal}
            />
          );
          i++;
          continue;
        } else {
          blocks.push(
            <div key={`chart-skeleton-${i}`} className="my-3 w-full h-[350px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center border border-gray-200 shadow-xs animate-pulse">
              <span className="text-xs text-gray-500 font-medium">Renderizando gráfico do Omnix Pro...</span>
            </div>
          );
          i++;
          continue;
        }
      }

      // 9.5. Custom Mindmap Tag: <wsm_mindmap ...> ... </wsm_mindmap> or <wsm_mindmap ... />
      if (trimmed.startsWith('<wsm_mindmap') || trimmed.includes('<wsm_mindmap')) {
        let mindmapLine = line;
        while (i < lines.length && !mindmapLine.includes('/>') && !mindmapLine.includes('</wsm_mindmap>')) {
          i++;
          if (i < lines.length) {
            mindmapLine += '\n' + lines[i];
          }
        }

        const parseAttr = (str: string, attr: string): string => {
          const regexSingle = new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'i');
          const regexDouble = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i');
          const matchSingle = str.match(regexSingle);
          if (matchSingle) return matchSingle[1];
          const matchDouble = str.match(regexDouble);
          if (matchDouble) return matchDouble[1];
          return '';
        };

        const titleVal = parseAttr(mindmapLine, 'title');
        let dataVal = parseAttr(mindmapLine, 'data');

        if (!dataVal) {
          dataVal = mindmapLine
            .replace(/<wsm_mindmap[^>]*>/i, '')
            .replace(/<\/wsm_mindmap>/i, '')
            .replace(/\/>/i, '')
            .trim();
        }

        if (dataVal) {
          blocks.push(
            <WsmMindmapComponent
              key={`mindmap-${i}`}
              title={titleVal || 'Mapa Mental Interativo'}
              markdown={dataVal}
            />
          );
          i++;
          continue;
        }
      }

      // 10. Paragraph default
      blocks.push(
        <div key={`p-${i}`} className="text-black dark:text-gray-100 leading-relaxed text-[14.5px] mb-3 select-text">
          {renderInlineContent(line)}
        </div>
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
    <div id="wsm-rendered-markdown" className="flex flex-col gap-1 max-w-full min-w-0 overflow-x-hidden w-full break-words">
      {renderBlocks()}
    </div>
  );
}
