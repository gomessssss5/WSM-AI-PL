import React, { useState, useEffect } from 'react';
import { Plus, Search, Image as ImageIcon, MessageSquare, Trash2, LogOut, Clock, BookOpen, Folder, MessageSquarePlus, User, X, Wrench, Menu, Download } from 'lucide-react';
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
  onOpenWriterArea?: () => void;
  onOpenTools?: () => void;
  isMobileHistoryOpen?: boolean;
  onCloseMobileHistory?: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    sessions,
    activeSessionId,
    onSelectSession,
    onDeleteSession,
    onNewChat,
    onToggleImagesView,
    isImagesView,
    userEmail,
    userName,
    onSignOut,
    onOpenWriterArea,
    onOpenTools,
    isMobileHistoryOpen,
    onCloseMobileHistory
  } = props;
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert("Para instalar, use a opção 'Adicionar à tela inicial' no menu de opções do seu navegador.");
      setShowInstallModal(false);
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallModal(false);
    }
  };

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('wsm-sidebar-collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem('wsm-sidebar-collapsed', String(newValue));
  };

  const isCurrentlyCollapsed = isCollapsed && (!isMobile || !isMobileHistoryOpen);

  // Filter sessions based on search
  const normalizeString = (str: string | undefined | null) => {
    if (!str) return '';
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const normalizedQuery = normalizeString(searchQuery);

  const filteredSessions = sessions.filter(session => {
    if (!normalizedQuery) return true;
    const titleMatch = normalizeString(session.title).includes(normalizedQuery);
    const messagesMatch = Array.isArray(session.messages) && session.messages.some(m => normalizeString(m.text).includes(normalizedQuery));
    return titleMatch || messagesMatch;
  });

  if (isCurrentlyCollapsed) {
    return (
      <aside 
        id="wsm-sidebar"
        className="hidden md:flex md:w-14 bg-[#f3f0ec] md:border-r border-[#eae6e1] flex-col h-full select-none shrink-0 transition-all duration-300 items-center justify-between overflow-hidden"
      >
        {/* Top Section */}
        <div className="flex flex-col items-center w-full gap-2.5 pt-3">
          {/* Toggle Expand Button */}
          <button
            onClick={handleToggleCollapse}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            title="Expandir painel"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Logo */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src="https://i.ibb.co/Q34b6rBW/37990-removebg-preview.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Divider */}
          <div className="w-7 h-[1px] bg-gray-200" />

          {/* Navigation / Action Icons */}
          <div className="flex flex-col items-center gap-1.5 w-full px-2">
            <button
              onClick={onNewChat}
              className="w-9 h-9 flex items-center justify-center bg-white hover:bg-[#fafaf9] text-gray-800 rounded-full border border-[#eae6e1] shadow-2xs transition-all duration-200 active:scale-[0.95] cursor-pointer"
              title="Nova conversa"
            >
              <Plus className="w-4.5 h-4.5 text-gray-600" />
            </button>

            <button
              onClick={() => { if (onOpenTools) onOpenTools(); }}
              className="w-9 h-9 flex items-center justify-center bg-white hover:bg-[#fafaf9] text-gray-800 rounded-full border border-[#eae6e1] shadow-2xs transition-all duration-200 active:scale-[0.95] cursor-pointer"
              title="Ferramentas"
            >
              <Wrench className="w-4 h-4 text-gray-600" />
            </button>

            <button
              onClick={() => {
                handleToggleCollapse();
                setTimeout(() => {
                  document.getElementById('search-conversations')?.focus();
                }, 150);
              }}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-black/5 rounded-lg transition-all cursor-pointer"
              title="Buscar conversas"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggleCollapse}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-black/5 rounded-lg transition-all cursor-pointer"
              title="Ver conversas recentes"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="w-full flex flex-col items-center gap-3 pb-3 border-t border-[#eae6e1] bg-[#f0ede8] pt-3">
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <div 
            className="w-7 h-7 bg-gradient-to-tr from-[#5c53e5] to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-xs select-none shrink-0"
            title={userName || userEmail || 'Usuário WSM AI'}
          >
            {userName 
              ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
              : (userEmail ? userEmail.substring(0, 2).toUpperCase() : 'AI')}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      id="wsm-sidebar"
      className={`
        ${isMobileHistoryOpen ? 'flex w-full absolute inset-0 z-50' : 'hidden md:flex'} 
        md:relative md:w-60 bg-[#f3f0ec] md:border-r border-[#eae6e1] flex-col h-full select-none shrink-0 transition-all duration-300
      `}
    >
      {/* Desktop Sidebar */}
      <div className="flex flex-col h-full overflow-hidden w-full">
        {/* Brand Header */}
        <div className="p-4 pb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src="https://i.ibb.co/Q34b6rBW/37990-removebg-preview.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-sans font-bold text-sm text-gray-900 tracking-tight">
              WSM AI
            </span>
          </div>
          
          {/* Toggle Collapse Button on Desktop */}
          <button
            onClick={handleToggleCollapse}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-black/5 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            title="Recolher painel"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          
          {onCloseMobileHistory && (
            <button 
              onClick={onCloseMobileHistory}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 active:opacity-70 transition-colors"
            >
              <X className="w-5 h-5 text-gray-700" strokeWidth={2} />
            </button>
          )}
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
          <button
            id="btn-writer-area"
            onClick={() => {
              if (onOpenTools) onOpenTools();
            }}
            className="flex w-full items-center justify-center gap-1.5 bg-white hover:bg-[#fafaf9] text-gray-800 py-2 px-3 rounded-lg border border-[#eae6e1] shadow-2xs transition-all duration-200 active:scale-[0.98] cursor-pointer font-semibold text-[12.5px]"
          >
            <Wrench className="w-4 h-4 text-gray-500" />
            Ferramentas
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

        {/* Install App Button */}
        <div className="px-3 py-2 border-t border-[#eae6e1] bg-[#fbfbfa]">
          <button
            onClick={() => setShowInstallModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#5c53e5] hover:bg-[#4d45c7] text-white py-2 px-3 rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer font-semibold text-[12px]"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar App
          </button>
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
      </div>

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowInstallModal(false)} />
          <div className="bg-white border border-[#eae6e1] rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm">
                <img 
                  src="https://i.ibb.co/Q34b6rBW/37990-removebg-preview.png" 
                  alt="WSM AI Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-sans font-bold text-gray-900 text-lg">Instalar WSM AI</h3>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                  Instale o WSM AI no seu celular para acessar de forma mais rápida, direto da sua tela inicial e ter uma experiência melhor.
                </p>
              </div>
              
              {deferredPrompt ? (
                <button
                  onClick={handleInstallApp}
                  className="w-full bg-[#5c53e5] hover:bg-[#4d45c7] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] mt-2"
                >
                  Instalar Agora
                </button>
              ) : (
                <div className="w-full text-left bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                  <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-gray-500" />
                    Como instalar manualmente
                  </h4>
                  <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                    <li>Se estiver no <strong>Safari / iOS</strong>, toque no ícone de <strong>Compartilhar</strong> na barra do navegador e escolha <strong>Adicionar à Tela de Início</strong>.</li>
                    <li>Se estiver no <strong>Chrome / Android</strong>, abra as opções do navegador (três pontinhos) e toque em <strong>Adicionar à tela inicial</strong>.</li>
                  </ol>
                  <button
                    onClick={() => setShowInstallModal(false)}
                    className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition-all active:scale-[0.98]"
                  >
                    Entendi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </aside>
  );
}
