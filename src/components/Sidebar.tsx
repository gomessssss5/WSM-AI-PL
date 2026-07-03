import React, { useState } from 'react';
import { Plus, Search, Image as ImageIcon, MessageSquare, Trash2, LogOut } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onNewChat: () => void;
  onToggleImagesView?: () => void;
  isImagesView?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  onSignOut?: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onToggleImagesView,
  isImagesView,
  userEmail,
  userName,
  onSignOut
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <aside 
      id="wsm-sidebar"
      className="w-60 bg-[#f3f0ec] border-r border-[#eae6e1] flex flex-col h-full select-none shrink-0"
    >
      {/* Brand Header */}
      <div className="p-4 pb-1.5 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#5c53e5] rounded-lg flex items-center justify-center shadow-xs">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            className="w-4 h-4 text-white"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <span className="font-sans font-bold text-sm text-gray-900 tracking-tight">
          WSM AI Hub
        </span>
      </div>

      {/* Primary Actions */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        <button
          id="btn-new-chat"
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-[#fafaf9] text-gray-800 py-2 px-3 rounded-lg border border-[#eae6e1] shadow-2xs transition-all duration-200 active:scale-[0.98] cursor-pointer font-semibold text-[12.5px]"
        >
          <Plus className="w-4 h-4 text-gray-500" />
          Nova conversa
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 py-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            id="search-conversations"
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#eae6e1] rounded-lg pl-8 pr-3 py-1.5 text-[12.5px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5c53e5] focus:ring-1 focus:ring-[#5c53e5]/25 transition-all"
          />
        </div>
      </div>

      {/* Recents List */}
      <div className="flex-1 overflow-y-auto px-1.5 py-3">
        <div className="px-2.5 mb-1.5 text-[9px] font-bold text-gray-400 tracking-wider uppercase">
          Recentes
        </div>

        <div className="flex flex-col gap-0.5">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => {
              const isActive = activeSessionId === session.id && !isImagesView;
              return (
                <div
                  key={session.id}
                  id={`chat-item-${session.id}`}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center gap-2 py-1.5 px-2.5 rounded-lg cursor-pointer transition-all duration-150 truncate ${
                    isActive
                      ? 'bg-[#eae6e1] text-gray-900 font-semibold'
                      : 'text-gray-600 hover:bg-[#eae6e1]/45 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
                  <span className="text-[12px] truncate pr-5 block flex-1">
                    {session.title}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="absolute right-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 p-0.5 rounded transition-all duration-150 text-gray-400 hover:text-red-500 cursor-pointer"
                    title="Excluir conversa"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-[10px] text-gray-400 px-2.5 py-1.5 italic">
              Nenhuma conversa encontrada
            </div>
          )}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-[#eae6e1] bg-[#f0ede8] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 truncate">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#5c53e5] to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-[12px] shadow-xs select-none shrink-0">
            {userName 
              ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
              : (userEmail ? userEmail.substring(0, 2).toUpperCase() : 'AI')}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-[12px] font-bold text-gray-800 truncate">
              {userName || userEmail || 'Usuário WSM AI'}
            </span>
            <span className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold truncate">
              {userEmail || 'Conectado'}
            </span>
          </div>
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="p-1.5 hover:bg-[#eae6e1] text-gray-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Sair da conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
