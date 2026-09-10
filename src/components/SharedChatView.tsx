import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, Bot, User as UserIcon, MessageSquare, ExternalLink } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface SharedChatViewProps {
  sharedId?: string | null;
  sessionId?: string | null;
  uid?: string | null;
}

export default function SharedChatView({ sharedId, sessionId, uid }: SharedChatViewProps) {
  const [chatData, setChatData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchChat() {
      setLoading(true);
      setError(null);

      try {
        // 1. Primary lookup: sharedChats collection by sharedId
        if (sharedId) {
          try {
            const docRef = doc(db, 'sharedChats', sharedId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && isMounted) {
              setChatData({ id: docSnap.id, ...docSnap.data() });
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("[SharedChatView] Error fetching sharedChats:", e);
          }
        }

        // 2. Secondary lookup: fallback to users/:uid/sessions/:sessionId (legacy links)
        if (uid && sessionId && sessionId !== 'chat') {
          try {
            const legacyDocRef = doc(db, 'users', uid, 'sessions', sessionId);
            const legacySnap = await getDoc(legacyDocRef);
            if (legacySnap.exists() && isMounted) {
              const data = legacySnap.data();
              if (data.isPublic) {
                setChatData({ id: legacySnap.id, ...data });
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn("[SharedChatView] Error fetching legacy session:", e);
          }
        }

        if (isMounted) {
          setError("Ops! Este chat compartilhado não foi encontrado ou o link expirou/foi desativado.");
        }
      } catch (err) {
        console.error("[SharedChatView] Error:", err);
        if (isMounted) {
          setError("Erro ao carregar o chat compartilhado.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchChat();

    return () => {
      isMounted = false;
    };
  }, [sharedId, sessionId, uid]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[#fcfbfa] dark:bg-gray-950">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 animate-pulse">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Carregando conversa compartilhada...</span>
        </div>
      </div>
    );
  }

  if (error || !chatData) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[#fcfbfa] dark:bg-gray-950 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-gray-800 text-stone-500 flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chat não encontrado</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
          {error || "O link fornecido não corresponde a uma conversa pública ativa."}
        </p>
        <a
          href="/"
          className="px-5 py-2.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-semibold text-xs rounded-xl shadow-sm transition-all"
        >
          Ir para o Omnix AI
        </a>
      </div>
    );
  }

  const messages = chatData.messages || [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#fcfbfa] dark:bg-gray-950 text-gray-900 dark:text-gray-100 relative selection:bg-blue-100 dark:selection:bg-blue-900/40">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-stone-200/80 dark:border-gray-800 bg-[#fcfbfa]/90 dark:bg-gray-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <a href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shadow-xs">
              Ω
            </div>
            <span className="text-xs font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
              Omnix AI
            </span>
          </a>
          <span className="text-stone-300 dark:text-gray-700">/</span>
          <h1 className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 truncate">
            {chatData.title || 'Chat Compartilhado'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Link Público
          </span>
          <a
            href="/"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold rounded-lg transition-all"
          >
            <span>Usar Omnix AI</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Messages Conversation Stream */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32">
        <div className="space-y-6">
          {messages.map((msg: any, index: number) => {
            const isUser = msg.sender === 'user' || msg.role === 'user';
            const textContent = msg.text || msg.content || '';

            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%] sm:max-w-[75%]' : 'w-full max-w-[92%]'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      {isUser ? 'Você' : (chatData.model || 'Omnix AI 1.6')}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-tr-xs shadow-xs'
                        : 'bg-white dark:bg-gray-900 border border-stone-200/80 dark:border-gray-800 rounded-tl-xs text-gray-800 dark:text-gray-200 shadow-xs'
                    }`}
                  >
                    {!isUser ? (
                      <MarkdownRenderer content={textContent} />
                    ) : (
                      <p className="whitespace-pre-wrap">{textContent}</p>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-stone-200 dark:bg-gray-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Banner */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#fcfbfa] dark:from-gray-950 via-[#fcfbfa]/95 dark:via-gray-950/95 to-transparent pointer-events-none z-20">
        <div className="max-w-2xl mx-auto text-center pointer-events-auto flex items-center justify-between gap-3 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-2xl p-3 px-4 shadow-lg shadow-black/5">
          <p className="text-xs text-stone-600 dark:text-stone-300 text-left">
            Visualização somente leitura. Inicie sua própria conversa com a inteligência do Omnix AI.
          </p>
          <a
            href="/"
            className="shrink-0 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            Iniciar Chat
          </a>
        </div>
      </footer>
    </div>
  );
}
