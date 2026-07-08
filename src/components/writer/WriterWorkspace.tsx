import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from '../ChatWindow';
import { WriterDocument, saveWriterDocument } from '../../lib/writerService';
import { 
  ArrowLeft, Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, MessageSquare, 
  Sparkles, Check, X, Heading1, Heading2, Heading3, Link2, Undo2, Redo2, Paintbrush, 
  Highlighter, Eraser, Search, Replace, HelpCircle, AlignVerticalSpaceAround, CaseSensitive,
  ChevronDown, Type, Eye, Sparkle, PlusCircle, Trash2
} from 'lucide-react';
import { ChatSession } from '../../types';

interface WriterWorkspaceProps {
  document: WriterDocument;
  sessions: ChatSession[];
  onBack: () => void;
  onUpdateDocument: (doc: WriterDocument) => void;
  onNewMessage: (text: string, isSearch: boolean) => Promise<void>;
  isThinking: boolean;
  onCancelGeneration: () => void;
  onOpenMobileHistory?: () => void;
}

interface CustomPresetStyle {
  id: string;
  name: string;
  styles: Record<string, string>;
}

export default function WriterWorkspace({
  document: writerDoc,
  sessions,
  onBack,
  onUpdateDocument,
  onNewMessage,
  isThinking,
  onCancelGeneration,
  onOpenMobileHistory
}: WriterWorkspaceProps) {
  const [content, setContent] = useState(writerDoc.content);
  const [title, setTitle] = useState(writerDoc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [attachedText, setAttachedText] = useState('');
  
  // Ribbon Navigation state (Word style tabs)
  const [activeTab, setActiveTab] = useState<'font' | 'paragraph' | 'styles' | 'editing'>('font');
  
  // Selection popover states
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showPopover, setShowPopover] = useState(false);

  // Advanced formatting state toggles
  const [showFormattingMarks, setShowFormattingMarks] = useState(false);
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [fontSize, setFontSize] = useState('16px');
  
  // Color presets
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlightColor, setHighlightColor] = useState('transparent');

  // Find & Replace state
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [searchMatchesCount, setSearchMatchesCount] = useState<number | null>(null);

  // Custom quick styles
  const [customStyles, setCustomStyles] = useState<CustomPresetStyle[]>([
    { id: 'style-citation', name: 'Citação Recuada', styles: { 'border-left': '4px solid #3b82f6', 'padding-left': '1rem', 'font-style': 'italic', 'color': '#475569', 'margin-top': '0.75rem', 'margin-bottom': '0.75rem' } },
    { id: 'style-code', name: 'Bloco de Código', styles: { 'background-color': '#f1f5f9', 'padding': '0.5rem 1rem', 'font-family': 'monospace', 'border-radius': '0.375rem', 'color': '#0f172a', 'margin-top': '0.75rem', 'margin-bottom': '0.75rem', 'display': 'block' } },
    { id: 'style-editorial', name: 'Sublinhado Elegante', styles: { 'font-family': 'Georgia', 'border-bottom': '2px dashed #3b82f6', 'padding-bottom': '2px', 'color': '#1e3a8a' } }
  ]);
  const [newStyleName, setNewStyleName] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Sync state and editor DOM when document ID changes
  useEffect(() => {
    setTitle(writerDoc.title);
    setContent(writerDoc.content);
    if (editorRef.current) {
      editorRef.current.innerHTML = writerDoc.content || '';
    }
    setShowPopover(false);
  }, [writerDoc.id]);

  // Sync external updates (e.g. from AI edit) when content changes in props
  useEffect(() => {
    if (writerDoc.content !== content) {
      setContent(writerDoc.content);
      // Only set innerHTML if user is not currently focusing the editor to avoid breaking typing
      if (editorRef.current && window.document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = writerDoc.content || '';
      }
    }
  }, [writerDoc.content]);

  // Handle direct text saving
  const triggerSave = async (newContent: string, newTitle: string) => {
    setIsSaving(true);
    const updatedDoc = {
      ...writerDoc,
      content: newContent,
      title: newTitle,
      updatedAt: Date.now()
    };
    await saveWriterDocument(updatedDoc);
    onUpdateDocument(updatedDoc);
    setIsSaving(false);
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const val = e.currentTarget.innerHTML;
    setContent(val);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(val, title);
    }, 1000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(content, val);
    }, 1000);
  };

  // Keyboard shortcut listener for formatting & TAB paragraph spacing
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Tab key paragraph break / indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Check if we are inside a list - if so, standard indent
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        let node: Node | null = selection.anchorNode;
        let isInList = false;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'LI' || node.nodeName === 'UL' || node.nodeName === 'OL') {
            isInList = true;
            break;
          }
          node = node?.parentNode || null;
        }
        
        if (isInList) {
          applyStyle('indent');
          return;
        }
      }
      
      // Separar por parágrafo ao pressionar Tab
      applyStyle('insertParagraph');
    }
  };

  // Check selection to show or hide the floating popover (focused on attachment)
  const handleSelectionCheck = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setShowPopover(false);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setShowPopover(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (editorContainerRef.current) {
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        
        // Position the popover 55px above the selection and center it horizontally
        const popoverWidth = 160; // Popover width for "Anexar ao Chat"
        const relativeTop = rect.top - containerRect.top - 55;
        const relativeLeft = rect.left - containerRect.left + (rect.width / 2) - (popoverWidth / 2);

        // Bound-checking to ensure popover stays inside the editor
        const safeLeft = Math.max(10, Math.min(relativeLeft, containerRect.width - popoverWidth - 10));

        setPopoverCoords({
          top: relativeTop,
          left: safeLeft
        });
        setSelectedText(text);
        setShowPopover(true);
      }
    }, 10);
  };

  // Actions for the selection popover
  const handleAttachToChat = () => {
    if (!selectedText) return;
    setAttachedText(selectedText);
    setShowPopover(false);
  };

  // Apply rich text formatting via standard execCommand
  const applyStyle = (command: string, value: string = '') => {
    window.document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      const val = editorRef.current.innerHTML;
      setContent(val);
      triggerSave(val, title);
    }
  };

  // Apply inline styles to selection via wrapping Span - robust HTML injection
  const applyCustomStyle = (styleKey: string, styleValue: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    
    if (styleKey === 'style') {
      span.style.cssText = styleValue;
    } else {
      span.style.setProperty(styleKey, styleValue);
    }
    
    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      
      // Reselect the newly formatted text
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    } catch (err) {
      // Fallback
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      span.innerHTML = container.innerHTML;
      range.deleteContents();
      range.insertNode(span);
    }
    
    if (editorRef.current) {
      const val = editorRef.current.innerHTML;
      setContent(val);
      triggerSave(val, title);
    }
  };

  // Apply block-level styles (like text-align, line-height, margins, borders, shadows) to selected paragraphs
  const applyBlockStyle = (styleKey: string, styleValue: string) => {
    const selection = window.getSelection();
    if (!selection) return;

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range) return;

    // Helper to check if node is block element
    const isBlockElement = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const tag = (node as Element).tagName.toUpperCase();
      return ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'UL', 'OL'].includes(tag);
    };

    const blockElements: HTMLElement[] = [];
    
    // Check if the common ancestor or its parents are block elements
    let parent: Node | null = range.commonAncestorContainer;
    while (parent && parent !== editorRef.current) {
      if (isBlockElement(parent)) {
        blockElements.push(parent as HTMLElement);
        break;
      }
      parent = parent.parentNode;
    }

    // Recursively find block elements inside range contents
    const traverse = (node: Node) => {
      if (isBlockElement(node)) {
        if (!blockElements.includes(node as HTMLElement)) {
          blockElements.push(node as HTMLElement);
        }
      }
      let child = node.firstChild;
      while (child) {
        traverse(child);
        child = child.nextSibling;
      }
    };

    const df = range.cloneContents();
    traverse(df);

    // Check all block elements in the editor that intersect with the selection
    if (editorRef.current) {
      const allElems = Array.from(editorRef.current.querySelectorAll('*')) as HTMLElement[];
      allElems.forEach((elem) => {
        if (isBlockElement(elem) && selection.containsNode(elem as Node, true)) {
          if (!blockElements.includes(elem as HTMLElement)) {
            blockElements.push(elem as HTMLElement);
          }
        }
      });
    }

    if (blockElements.length > 0) {
      blockElements.forEach((el) => {
        el.style.setProperty(styleKey, styleValue);
      });
    } else {
      // If no block elements are found, wrap selection contents in a styled div
      const div = document.createElement('div');
      div.style.setProperty(styleKey, styleValue);
      try {
        const fragment = range.extractContents();
        div.appendChild(fragment);
        range.insertNode(div);
      } catch (err) {
        // Fallback
      }
    }

    if (editorRef.current) {
      const val = editorRef.current.innerHTML;
      setContent(val);
      triggerSave(val, title);
    }
  };

  // Robust "Clear all formatting" that strips custom inline styles and spans
  const clearSelectedFormatting = () => {
    // 1. Run standard removeFormat
    applyStyle('removeFormat');
    
    // 2. Clear inline style attributes on selection
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    try {
      const range = selection.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      
      // Remove all style attributes and nested formatting spans
      const elements = Array.from(container.querySelectorAll('*'));
      elements.forEach((el) => {
        el.removeAttribute('style');
        if (el.tagName === 'SPAN') {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
        }
      });
      
      applyStyle('insertHTML', container.innerHTML);
    } catch (err) {
      console.warn('Fallback standard clear:', err);
    }
  };

  // Alternate upper/lower case
  const toggleTextCase = (mode: 'upper' | 'lower' | 'capitalize') => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    let txt = selection.toString();
    if (mode === 'upper') {
      txt = txt.toUpperCase();
    } else if (mode === 'lower') {
      txt = txt.toLowerCase();
    } else if (mode === 'capitalize') {
      txt = txt.replace(/\b\w/g, c => c.toUpperCase());
    }

    applyStyle('insertHTML', txt);
  };

  // Insert standard anchor link
  const handleInsertLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      alert("Por favor, selecione uma palavra ou frase primeiro para transformá-la em link.");
      return;
    }
    const url = prompt("Insira o endereço completo da URL do link:", "https://");
    if (url) {
      applyStyle('createLink', url);
    }
  };

  // Sort paragraph list alphabetically (Ascending/Descending)
  const sortSelectedList = (direction: 'asc' | 'desc') => {
    const selection = window.getSelection();
    if (!selection) return;

    let range;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      return;
    }

    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    // Find if we have LI elements to sort
    const items = Array.from(container.querySelectorAll('li'));
    if (items.length > 0) {
      items.sort((a, b) => {
        const textA = a.textContent || '';
        const textB = b.textContent || '';
        return direction === 'asc' ? textA.localeCompare(textB) : textB.localeCompare(textA);
      });

      container.innerHTML = '';
      items.forEach(item => container.appendChild(item));
      applyStyle('insertHTML', container.innerHTML);
    } else {
      // Just split selection by lines/paragraphs and sort
      const text = selection.toString().trim();
      if (!text) return;

      const lines = text.split('\n').filter(l => l.trim() !== '');
      lines.sort((a, b) => direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
      applyStyle('insertHTML', lines.map(line => `<div>${line}</div>`).join(''));
    }
  };

  // Create customized style dynamically
  const handleCreateCustomStyle = () => {
    if (!newStyleName.trim()) {
      alert('Por favor, digite um nome para o estilo customizado.');
      return;
    }
    
    // Grab some custom styles dynamically based on chosen color/highlight
    const stylesToSave: Record<string, string> = {
      'color': textColor,
      'background-color': highlightColor !== 'transparent' ? highlightColor : 'transparent',
      'font-family': fontFamily,
      'font-size': fontSize,
      'border-left': '3px solid ' + textColor,
      'padding-left': '0.5rem'
    };

    const newStyle: CustomPresetStyle = {
      id: `style-custom-${Date.now()}`,
      name: newStyleName.trim(),
      styles: stylesToSave
    };

    setCustomStyles(prev => [...prev, newStyle]);
    setNewStyleName('');
    alert(`Estilo "${newStyle.name}" foi criado! Para aplicar, selecione um trecho de texto e clique no estilo criado na aba de estilos.`);
  };

  const applyPresetStyle = (preset: CustomPresetStyle) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      alert('Selecione uma parte do texto para aplicar este estilo customizado.');
      return;
    }
    
    const styleString = Object.entries(preset.styles)
      .map(([key, val]) => `${key}: ${val}`)
      .join('; ');

    applyCustomStyle('style', styleString);
  };

  const deleteCustomStyle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomStyles(prev => prev.filter(s => s.id !== id));
  };

  // Find & Replace functionality
  const handleFindReplace = (replaceAll: boolean = false) => {
    if (!findText) {
      alert('Insira o texto que deseja localizar.');
      return;
    }
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const escapedFind = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedFind, replaceAll ? 'g' : '');

    if (!html.includes(findText)) {
      setSearchMatchesCount(0);
      alert(`Nenhuma ocorrência encontrada para: "${findText}"`);
      return;
    }

    const matchCount = (html.match(new RegExp(escapedFind, 'g')) || []).length;
    setSearchMatchesCount(matchCount);

    const updatedHtml = html.replace(regex, replaceText);
    editorRef.current.innerHTML = updatedHtml;
    setContent(updatedHtml);
    triggerSave(updatedHtml, title);

    if (replaceAll) {
      alert(`Substituídas ${matchCount} ocorrência(s) de "${findText}" por "${replaceText}".`);
    } else {
      alert(`Substituída uma ocorrência de "${findText}" por "${replaceText}".`);
    }
  };

  // Find the chat session associated with this document, or active session
  const activeChatSession = sessions.find(s => s.id === writerDoc.chatSessionId);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f3f7fa]">
      
      {/* Dynamic styling for formatting marks ¶ */}
      <style>{`
        .editor-formatting-marks p::after {
          content: " ¶";
          color: #a5b4fc;
          font-weight: 300;
          font-family: monospace;
          font-size: 13px;
        }
        .editor-formatting-marks div::after {
          content: " ¶";
          color: #a5b4fc;
          font-weight: 300;
          font-family: monospace;
          font-size: 13px;
        }
        .prose h1, .prose h2, .prose h3, .prose h4 {
          margin-top: 1.2rem;
          margin-bottom: 0.6rem;
          font-weight: 700;
          color: #1e293b;
        }
        .prose ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
        }
        .prose ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
        }
      `}</style>

      {/* Editor Side - larger */}
      <div 
        ref={editorContainerRef}
        className="flex-[3] flex flex-col border-r border-blue-100 h-full bg-white relative overflow-hidden"
      >
        {/* Editor Top Bar */}
        <div className="hidden md:flex h-14 border-b border-blue-50 items-center justify-between px-4 bg-slate-50/70 backdrop-blur-sm relative z-10 shrink-0">
          <div className="flex items-center gap-3 w-full max-w-xl">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-500 transition-all active:scale-95 cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              value={title}
              onChange={handleTitleChange}
              className="flex-1 bg-transparent font-bold text-slate-800 focus:outline-none focus:border-blue-400 border-b border-transparent px-1 py-0.5 text-lg"
              placeholder="Título do Documento"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {isSaving ? (
              <span className="flex items-center gap-1.5 text-blue-500">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Salvo no Firestore
              </span>
            )}
          </div>
        </div>

        {/* Top Header / Action Bar - Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-transparent w-full relative z-40 border-b border-gray-100/50 shrink-0">
          <button onClick={onOpenMobileHistory} className="flex items-center gap-1.5 text-gray-800 text-[16px] font-normal active:opacity-70">
            <span className="text-[20px] font-light mr-1">‹</span>
            WSM Writer <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
          </button>
          <div className="flex items-center gap-3">
            {isSaving ? (
              <span className="text-xs font-semibold text-blue-500 flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-500">Salvo</span>
            )}
          </div>
        </div>

        {/* Word-level Fixed Ribbon Toolbar (Always Visible) */}
        <div className="bg-slate-50 border-b border-slate-200 z-10 select-none shrink-0">
          
          {/* Toolbar Ribbon Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200/60 px-4 pt-1 bg-slate-100/70">
            <button
              onClick={() => setActiveTab('font')}
              className={`px-3 py-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'font' 
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-md' 
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Fonte
            </button>
            <button
              onClick={() => setActiveTab('paragraph')}
              className={`px-3 py-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'paragraph' 
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-md' 
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Parágrafo
            </button>
            <button
              onClick={() => setActiveTab('styles')}
              className={`px-3 py-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'styles' 
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-md' 
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Estilos Rápidos
            </button>
            <button
              onClick={() => setActiveTab('editing')}
              className={`px-3 py-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'editing' 
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-md' 
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Localizar & Substituir
            </button>
          </div>

          {/* Tab Contents: Fixed Height and Layout Grid like Office Word */}
          <div className="px-4 py-2 bg-white min-h-[56px] flex items-center justify-between gap-4">
            
            {/* TAB 1: FONTE */}
            {activeTab === 'font' && (
              <div className="flex items-center gap-2 flex-wrap text-slate-700">
                {/* Desfazer / Refazer */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('undo'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Desfazer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('redo'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Refazer"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Font Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Tipo:</span>
                  <select
                    value={fontFamily}
                    onChange={(e) => {
                      setFontFamily(e.target.value);
                      applyCustomStyle('font-family', e.target.value);
                    }}
                    className="bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium"
                  >
                    <option value="sans-serif">Inter (Padrão)</option>
                    <option value="Georgia">Georgia (Serif)</option>
                    <option value="'Courier New'">Courier (Mono)</option>
                    <option value="'Space Grotesk'">Space Grotesk (Tech)</option>
                    <option value="'Playfair Display'">Playfair (Elegante)</option>
                    <option value="'JetBrains Mono'">JetBrains (Código)</option>
                  </select>
                </div>

                {/* Font Size Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Tam:</span>
                  <select
                    value={fontSize}
                    onChange={(e) => {
                      setFontSize(e.target.value);
                      applyCustomStyle('font-size', e.target.value);
                    }}
                    className="bg-slate-50 border border-slate-200 text-slate-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium"
                  >
                    <option value="12px">12</option>
                    <option value="14px">14</option>
                    <option value="16px">16 (Padrão)</option>
                    <option value="18px">18</option>
                    <option value="20px">20</option>
                    <option value="24px">24</option>
                    <option value="28px">28</option>
                    <option value="32px">32</option>
                    <option value="48px">48</option>
                  </select>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Core Styles Group */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('bold'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer font-bold"
                    title="Negrito"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('italic'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Itálico"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('underline'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Sublinhado"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('strikeThrough'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Tachado"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Advanced Underlines */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-0.5 text-xs">
                  <span className="px-1 font-semibold text-slate-400 text-[10px]">U+</span>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyCustomStyle('text-decoration', 'underline double'); }}
                    className="px-1 py-0.5 rounded hover:bg-blue-100 text-blue-800 font-bold border-b-2 border-double border-slate-800"
                    title="Sublinhado Duplo"
                  >
                    =
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyCustomStyle('text-decoration', 'underline dashed'); }}
                    className="px-1 py-0.5 rounded hover:bg-blue-100 text-blue-800 font-bold border-b border-dashed border-slate-800"
                    title="Sublinhado Tracejado"
                  >
                    -
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyCustomStyle('text-decoration', 'underline wavy'); }}
                    className="px-1 py-0.5 rounded hover:bg-blue-100 text-blue-800 font-bold border-b border-slate-800"
                    style={{ textDecoration: 'underline wavy' }}
                    title="Sublinhado Ondulado"
                  >
                    ~
                  </button>
                </div>

                {/* Superscript & Subscript */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('superscript'); }}
                    className="p-1 rounded hover:bg-slate-200 text-slate-700 font-semibold text-[10px]"
                    title="Sobrescrito (X²)"
                  >
                    x²
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('subscript'); }}
                    className="p-1 rounded hover:bg-slate-200 text-slate-700 font-semibold text-[10px]"
                    title="Subscrito (X₂)"
                  >
                    x₂
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Text Colors */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-1">
                  <Paintbrush className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      applyCustomStyle('color', e.target.value);
                    }}
                    className="w-5 h-5 border border-slate-300 rounded cursor-pointer p-0"
                    title="Cor da Fonte"
                  />
                  <Highlighter className="w-3.5 h-3.5 text-yellow-500 shrink-0 ml-1" />
                  <select
                    value={highlightColor}
                    onChange={(e) => {
                      setHighlightColor(e.target.value);
                      applyCustomStyle('background-color', e.target.value);
                    }}
                    className="bg-transparent text-[10px] text-slate-600 border-none outline-none cursor-pointer"
                    title="Cor de Realce"
                  >
                    <option value="transparent">Sem Realce</option>
                    <option value="#fef08a">Amarelo</option>
                    <option value="#bbf7d0">Verde</option>
                    <option value="#bfdbfe">Azul</option>
                    <option value="#fbcfe8">Rosa</option>
                    <option value="#fed7aa">Laranja</option>
                  </select>
                </div>

                {/* Case Transformer */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); toggleTextCase('upper'); }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 text-[10px] font-bold"
                    title="MAIÚSCULAS"
                  >
                    AA
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); toggleTextCase('lower'); }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 text-[10px] font-medium"
                    title="minúsculas"
                  >
                    aa
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); toggleTextCase('capitalize'); }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 text-[10px] font-semibold"
                    title="Primeira Letra Maiúscula"
                  >
                    Aa
                  </button>
                </div>

                {/* Typography Effects: Glow, Shadow */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-0.5 text-xs">
                  <Sparkle className="w-3 h-3 text-amber-500 ml-1" />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyCustomStyle('text-shadow', '2px 2px 4px rgba(0,0,0,0.25)'); }}
                    className="px-1.5 py-0.5 rounded hover:bg-amber-100 text-[10px] font-semibold"
                    title="Adicionar Sombra"
                  >
                    Sombra
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyCustomStyle('text-shadow', '0 0 8px rgba(59,130,246,0.6)'); }}
                    className="px-1.5 py-0.5 rounded hover:bg-blue-100 text-[10px] font-semibold text-blue-600"
                    title="Efeito Brilho Azul"
                  >
                    Brilho
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyCustomStyle('letter-spacing', '2px'); }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 text-[10px] font-medium"
                    title="Aumentar Espaçamento de Caracteres"
                  >
                    Espaçado
                  </button>
                </div>

                {/* Reset Formatting */}
                <button
                  onMouseDown={(e) => { e.preventDefault(); clearSelectedFormatting(); }}
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-600 border border-red-100"
                  title="Limpar Toda a Formatação"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 2: PARÁGRAFO */}
            {activeTab === 'paragraph' && (
              <div className="flex items-center gap-2 flex-wrap text-slate-700">
                {/* Alignments */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('justifyLeft'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Alinhar à Esquerda"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('justifyCenter'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Centralizar"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('justifyRight'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Alinhar à Direita"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('justifyFull'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Justificar"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Lists & Indentation */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('insertUnorderedList'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Lista com Marcadores"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('insertOrderedList'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Lista Numerada"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('outdent'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer text-[10px] font-bold"
                    title="Diminuir Recuo"
                  >
                    &larr; Recuo
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('indent'); }}
                    className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer text-[10px] font-bold"
                    title="Aumentar Recuo"
                  >
                    Recuo &rarr;
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Line & Paragraph spacing */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1">
                  <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Espaço:</span>
                  <select
                    onChange={(e) => {
                      applyBlockStyle('line-height', e.target.value);
                    }}
                    className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
                    title="Espaçamento entre linhas"
                  >
                    <option value="1.15">1.15</option>
                    <option value="1.0">1.0</option>
                    <option value="1.5">1.5</option>
                    <option value="2.0">2.0</option>
                  </select>

                  <select
                    onChange={(e) => {
                      applyBlockStyle('margin-bottom', e.target.value);
                    }}
                    className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-1"
                    title="Espaçamento entre parágrafos"
                  >
                    <option value="0.5rem">Margem P</option>
                    <option value="1rem">Margem M</option>
                    <option value="1.5rem">Margem G</option>
                  </select>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Borders & Shadows on Paragraph block */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-0.5 text-xs">
                  <button
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      applyBlockStyle('border', '1px solid #cbd5e1'); 
                      applyBlockStyle('padding', '0.5rem 1rem'); 
                      applyBlockStyle('border-radius', '6px'); 
                    }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 text-[10px] font-semibold"
                    title="Adicionar Caixa de Borda"
                  >
                    Borda
                  </button>
                  <button
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      applyBlockStyle('box-shadow', '0 4px 6px -1px rgb(0 0 0 / 0.1)'); 
                      applyBlockStyle('padding', '0.5rem 1rem'); 
                    }}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-200 text-[10px] font-semibold"
                    title="Adicionar Sombreamento"
                  >
                    Sombra Parágrafo
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Alphabetical list sorting */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-0.5">
                  <span className="text-[10px] font-bold text-slate-400 px-1">Ordenar:</span>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); sortSelectedList('asc'); }}
                    className="px-1 py-0.5 rounded hover:bg-slate-200 text-[10px] font-bold"
                    title="Ordenar de A a Z"
                  >
                    A&darr;
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); sortSelectedList('desc'); }}
                    className="px-1 py-0.5 rounded hover:bg-slate-200 text-[10px] font-bold"
                    title="Ordenar de Z a A"
                  >
                    Z&darr;
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-0.5" />

                {/* Show formatting marks ¶ */}
                <button
                  onClick={() => setShowFormattingMarks(!showFormattingMarks)}
                  className={`p-1.5 rounded border transition-colors flex items-center gap-1 text-[11px] font-bold ${
                    showFormattingMarks 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Mostrar/Ocultar Marcas de Formatação (¶)"
                >
                  <span className="font-semibold text-xs font-mono">¶</span>
                  <span>{showFormattingMarks ? 'Marcas Ativas' : 'Mostrar Marcas'}</span>
                </button>
              </div>
            )}

            {/* TAB 3: ESTILOS RÁPIDOS */}
            {activeTab === 'styles' && (
              <div className="flex items-center gap-3 flex-wrap text-slate-700 w-full overflow-x-auto py-0.5">
                {/* Standard heading triggers */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Padrões:</span>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('formatBlock', 'h2'); }}
                    className="px-2 py-1 text-xs font-bold border border-slate-200 hover:bg-slate-50 rounded bg-white text-slate-800 cursor-pointer"
                    title="Título 1"
                  >
                    Título 1
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('formatBlock', 'h3'); }}
                    className="px-2 py-1 text-xs font-bold border border-slate-200 hover:bg-slate-50 rounded bg-white text-slate-600 cursor-pointer"
                    title="Título 2"
                  >
                    Título 2
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('formatBlock', 'p'); }}
                    className="px-2 py-1 text-xs border border-slate-200 hover:bg-slate-50 rounded bg-white text-slate-500 cursor-pointer"
                    title="Texto Normal"
                  >
                    Normal
                  </button>
                </div>

                {/* Dynamic Style preset list */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Customizados:</span>
                  {customStyles.map(style => (
                    <div 
                      key={style.id}
                      onClick={() => applyPresetStyle(style)}
                      className="group flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-800 rounded text-xs border border-blue-200/50 hover:bg-blue-100 cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      <span className="font-medium">{style.name}</span>
                      <button
                        onClick={(e) => deleteCustomStyle(style.id, e)}
                        className="p-0.5 rounded text-blue-500 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        title="Deletar estilo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick style creator */}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-3 ml-auto">
                  <input
                    type="text"
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    placeholder="Nome do estilo..."
                    className="bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-32 font-medium"
                  />
                  <button
                    onClick={handleCreateCustomStyle}
                    className="flex items-center gap-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Salvar Seleção como Estilo
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: LOCALIZAR E SUBSTITUIR */}
            {activeTab === 'editing' && (
              <div className="flex items-center gap-3 flex-wrap text-slate-700 w-full">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Localizar texto..."
                    className="bg-transparent border-none text-slate-700 outline-none text-xs w-40 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                  <Replace className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Substituir por..."
                    className="bg-transparent border-none text-slate-700 outline-none text-xs w-40 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleFindReplace(false)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                  >
                    Localizar / Substituir Próximo
                  </button>
                  <button
                    onClick={() => handleFindReplace(true)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Substituir Todos
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); applyStyle('selectAll'); }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Selecionar Tudo
                  </button>
                </div>

                {searchMatchesCount !== null && (
                  <span className="text-[11px] font-semibold text-slate-500 ml-2 animate-pulse bg-slate-100 rounded-full px-2.5 py-0.5">
                    {searchMatchesCount} correspondência(s)
                  </span>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Floating Text Selection Popover focused solely on Attachments to AI Chat */}
        {showPopover && popoverCoords && (
          <div 
            style={{ top: `${popoverCoords.top}px`, left: `${popoverCoords.left}px` }}
            className="absolute z-50 flex items-center gap-1.5 bg-slate-900 text-white rounded-xl py-1.5 px-2.5 shadow-xl border border-slate-800 animate-in zoom-in-95 duration-150"
          >
            <button
              onClick={handleAttachToChat}
              className="flex items-center gap-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Anexa essa parte como foco no chat da IA"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Anexar ao Chat para Pergunta
            </button>
          </div>
        )}

        {/* ContentEditable Rich Editor Area */}
        <div className="flex-1 w-full overflow-y-auto bg-slate-50/50 p-6 flex justify-center">
          <div className="w-full max-w-[800px] min-h-[1056px] bg-white border border-slate-200 shadow-sm rounded-xl p-12 md:p-16 relative">
            
            {/* Live Document Reference Indicators */}
            <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-300 pointer-events-none select-none flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-blue-200" />
              FOLHA DE REDAÇÃO ATIVA (A4)
            </div>

            <div 
              ref={editorRef}
              contentEditable={true}
              onInput={handleEditorInput}
              onKeyDown={handleEditorKeyDown}
              onMouseUp={handleSelectionCheck}
              onKeyUp={handleSelectionCheck}
              placeholder="Comece a escrever aqui... Selecione qualquer trecho para anexá-lo ao chat ou use as ferramentas do Word acima."
              className={`w-full outline-none text-slate-800 font-sans leading-relaxed text-[15px] prose max-w-none focus:ring-0 select-text ${
                showFormattingMarks ? 'editor-formatting-marks' : ''
              }`}
              style={{ minHeight: '900px' }}
            />
          </div>
        </div>
      </div>

      {/* Chat Side - smaller */}
      <div className="flex-[2] h-full relative">
        <ChatWindow 
          messages={activeChatSession?.messages || []}
          isThinking={isThinking}
          selectedModel="WSM 1.6 Mercúrio"
          onSendMessage={onNewMessage}
          onCancelGeneration={onCancelGeneration}
          onBackToHome={onBack}
          isEmbedded={true}
          title="Assistente do Escritor"
          attachedText={attachedText}
          onClearAttachedText={() => setAttachedText('')}
        />
      </div>
    </div>
  );
}
