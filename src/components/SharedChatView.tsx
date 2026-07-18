import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatSession } from '../types';
import { Loader2, Bot, User as UserIcon } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface SharedChatViewProps {
  sessionId: string;
  uid: string;
}

export default function SharedChatView({ sessionId, uid }: SharedChatViewProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const docRef = doc(db, 'users', uid, 'sessions', sessionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isPublic) {
            setSession({ id: docSnap.id, ...data } as ChatSession);
          } else {
            setError("Este chat não é público.");
          }
        } else {
          setError("Chat não encontrado.");
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar chat.");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId, uid]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-gray-50 p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Ops!</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#fcfbfa] relative">
      <header className="flex items-center px-6 py-4 border-b border-gray-150 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-800 flex-1 truncate">
          {session.title || 'Chat Compartilhado'}
        </h1>
        <div className="bg-brand-50 text-brand-600 text-[10px] font-bold px-2 py-1 rounded tracking-wide uppercase">
          Visão Pública
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto pb-24 px-4 sm:px-6">
        <div className="py-6 space-y-6">
          {session.messages.map((msg, index) => (
            <div key={msg.id || index} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-100 text-gray-600' : 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white'}`}>
                  {msg.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-semibold text-gray-500 capitalize">{msg.role === 'user' ? 'Você' : 'WSM AI'}</span>
              </div>
              <div className="pl-8">
                {msg.role === 'assistant' ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#fcfbfa] via-[#fcfbfa]/90 to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto text-center pointer-events-auto">
          <p className="text-[11px] font-medium text-gray-500 bg-white/80 backdrop-blur-sm py-2 px-4 rounded-full inline-block shadow-sm border border-gray-150">
            Você está visualizando um chat compartilhado. O envio de mensagens está desabilitado.
          </p>
        </div>
      </div>
    </div>
  );
}
