import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Plus, 
  MessageSquare, 
  PenTool, 
  Code2, 
  Image as ImageIcon, 
  Sparkles, 
  Languages, 
  Bot,
  Calendar,
  Compass,
  Cpu
} from 'lucide-react';
import { ChatSession } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onNewChat
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = session.title?.toLowerCase().includes(query);
    
    // Check message content too!
    const messageMatch = session.messages?.some(msg => 
      msg.text?.toLowerCase().includes(query)
    );
    
    return titleMatch || messageMatch;
  });

  // Group sessions by date
  const getSessionGroup = (dateInput: Date | string | number) => {
    const date = new Date(dateInput);
    const now = new Date();
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (compareDate.getTime() === today.getTime()) {
      return 'Hoje';
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return 'Ontem';
    } else if (compareDate.getTime() >= sevenDaysAgo.getTime()) {
      return 'Últimos 7 dias';
    } else {
      return 'Mais antigas';
    }
  };

  // Format date/time
  const formatSessionTime = (dateInput: Date | string | number) => {
    const date = new Date(dateInput);
    const now = new Date();
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    if (compareDate.getTime() === today.getTime()) {
      return timeStr;
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return `Ontem, ${timeStr}`;
    } else {
      const weekdays = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
      const weekday = weekdays[date.getDay()];
      return `${weekday}, ${timeStr}`;
    }
  };

  // Get message snippet (last user or AI message text)
  const getMessageSnippet = (session: ChatSession) => {
    if (!session.messages || session.messages.length === 0) {
      return 'Nenhuma mensagem nesta conversa';
    }
    // Try to find the first non-hidden message from user/ai, or just use last message
    const validMsgs = session.messages.filter(m => !m.isHidden);
    const lastMsg = validMsgs.length > 0 ? validMsgs[validMsgs.length - 1] : session.messages[session.messages.length - 1];
    
    if (!lastMsg || !lastMsg.text) return 'Conversa vazia';
    
    // Clean markdown bold, lists, headers to make snippet look clean
    const cleaned = lastMsg.text
      .replace(/[\*\#\`\_\-\>\[\]\(\)]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    if (cleaned.length > 100) {
      return cleaned.substring(0, 100) + '...';
    }
    return cleaned;
  };

  // Render Category Icon
  const renderCategoryIcon = (category?: string) => {
    switch (category) {
      case 'write':
        return <PenTool className="w-4 h-4 text-amber-500" />;
      case 'code':
        return <Cpu className="w-4 h-4 text-blue-500" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-500" />;
      case 'analysis':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'translate':
        return <Languages className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bot className="w-4 h-4 text-gray-500" />;
    }
  };

  // Grouped sessions object
  const groups: { [key: string]: ChatSession[] } = {
    'Hoje': [],
    'Ontem': [],
    'Últimos 7 dias': [],
    'Mais antigas': []
  };

  // Sort sessions by timestamp descending, then group
  const sortedSessions = [...filteredSessions].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  sortedSessions.forEach(session => {
    const groupName = getSessionGroup(session.timestamp);
    if (groups[groupName]) {
      groups[groupName].push(session);
    } else {
      groups['Mais antigas'].push(session);
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 md:px-0">
          {/* Backdrop Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[75vh] overflow-hidden z-10 relative"
          >
            {/* Header / Search Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 shrink-0">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Pesquisar tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors text-[11px] font-medium border border-gray-200/50"
              >
                Esc
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar flex flex-col gap-4">
              {/* "Nova conversa" (or Nova tarefa) Button */}
              <div className="px-1 shrink-0">
                <button
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-xl transition-all text-left font-medium text-[13.5px] border border-dashed border-gray-200 hover:border-gray-300"
                >
                  <Plus className="w-4.5 h-4.5 text-gray-500" />
                  <span>Nova conversa</span>
                </button>
              </div>

              {/* Grouped Lists */}
              {Object.entries(groups).map(([groupName, groupSessions]) => {
                if (groupSessions.length === 0) return null;

                return (
                  <div key={groupName} className="flex flex-col gap-1">
                    {/* Section Label */}
                    <span className="px-3 py-1 text-[11px] font-bold text-gray-400 tracking-wider uppercase">
                      {groupName}
                    </span>

                    {/* Group Items */}
                    <div className="flex flex-col gap-0.5">
                      {groupSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => {
                            onSelectSession(session.id);
                            onClose();
                          }}
                          className="w-full flex items-start gap-3.5 p-3 rounded-xl hover:bg-gray-50/80 transition-all text-left group"
                        >
                          {/* Circle Icon */}
                          <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-white border border-gray-100 group-hover:border-gray-200/60 shadow-2xs flex items-center justify-center shrink-0 transition-colors">
                            {renderCategoryIcon(session.category)}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-[13px] font-semibold text-gray-800 truncate group-hover:text-black transition-colors leading-tight">
                                {session.title || 'Nova conversa'}
                              </h4>
                              <span className="text-[10px] text-gray-400 group-hover:text-gray-500 shrink-0 font-medium font-mono">
                                {formatSessionTime(session.timestamp)}
                              </span>
                            </div>
                            
                            <p className="text-[11.5px] text-gray-500 group-hover:text-gray-600 transition-colors mt-0.5 line-clamp-2 leading-relaxed">
                              {getMessageSnippet(session)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* No sessions matching search */}
              {filteredSessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <Search className="w-10 h-10 text-gray-300 mb-3" />
                  <h3 className="font-bold text-gray-800 text-[14px]">Nenhuma conversa encontrada</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Não encontramos resultados para "{searchQuery}". Tente pesquisar com termos diferentes.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
