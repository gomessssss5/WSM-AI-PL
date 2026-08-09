import React, { useState, useRef } from 'react';
import { X, Camera, User as UserIcon, Mail, Shield, Check, LogOut, RefreshCw, Copy, Sparkles } from 'lucide-react';
import { User } from '../lib/firebase';
import { saveUserProfile } from '../lib/chatService';

interface UserProfileModalProps {
  currentUser: User | null;
  userProfile?: any;
  onClose: () => void;
  onSignOut?: () => void;
}

export function getDiceBearAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed || 'omnix')}`;
}

export default function UserProfileModal({
  currentUser,
  userProfile,
  onClose,
  onSignOut
}: UserProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const defaultDiceBear = getDiceBearAvatar(currentUser?.uid || currentUser?.email || 'omnix');
  const currentPhoto = userProfile?.photoURL || currentUser?.photoURL || defaultDiceBear;
  
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuário Omnix'
  );
  const [photoURL, setPhotoURL] = useState<string>(currentPhoto);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem selecionada é muito grande. Escolha uma imagem de até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setPhotoURL(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDiceBear = () => {
    setPhotoURL(defaultDiceBear);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await saveUserProfile(currentUser.uid, {
        displayName: displayName.trim(),
        photoURL: photoURL
      });
      setIsSavedSuccess(true);
      setTimeout(() => {
        setIsSavedSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-white dark:bg-gray-900 border border-[#eae6e1] dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-md w-full relative z-10 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Informações da Conta</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie seu perfil e dados pessoais</p>
          </div>
        </div>

        {/* Avatar Selection Section */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-500/20 shadow-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
              <img
                src={photoURL}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold">
                <Camera className="w-6 h-6 mb-1" />
                <span>Alterar</span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="absolute bottom-0 right-0 p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Carregar foto do dispositivo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp, image/gif"
            className="hidden"
          />

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              Enviar foto do dispositivo
            </button>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <button
              type="button"
              onClick={handleResetToDiceBear}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline flex items-center gap-1 cursor-pointer"
              title="Gerar avatar DiceBear padrão"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Usar DiceBear
            </button>
          </div>
        </div>

        {/* User Details Form */}
        <div className="space-y-4">
          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Nome de Exibição
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-3.5 py-2.5 pl-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
              />
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Email Display */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              E-mail da Conta
            </label>
            <div className="relative">
              <input
                type="email"
                value={currentUser?.email || ''}
                readOnly
                className="w-full px-3.5 py-2.5 pl-10 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* User UID */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              ID do Usuário (UID)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={currentUser?.uid || ''}
                  readOnly
                  className="w-full px-3.5 py-2 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl text-xs font-mono text-gray-500 dark:text-gray-400 cursor-not-allowed truncate"
                />
                <Shield className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-2.5" />
              </div>
              <button
                type="button"
                onClick={copyUid}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1 font-medium"
                title="Copiar ID"
              >
                {copiedUid ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Security Management */}
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Segurança e Privacidade</h4>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="text-left px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between cursor-pointer"
                onClick={() => alert("Função em desenvolvimento. Será possível alterar a senha em breve.")}
              >
                <span>Alterar Senha</span>
                <span className="text-[10px] text-gray-400 font-normal">Recomendado</span>
              </button>
              <button
                type="button"
                className="text-left px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between cursor-pointer"
                onClick={() => alert("A Autenticação em Duas Etapas (2FA) estará disponível na próxima atualização.")}
              >
                <span>Autenticação em Duas Etapas (2FA)</span>
                <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[9px] font-bold text-gray-500 uppercase">Em breve</span>
              </button>
              <button
                type="button"
                className="text-left px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between cursor-pointer"
                onClick={() => alert("Para encerrar sessões em outros dispositivos, você precisará confirmar sua identidade.")}
              >
                <span>Histórico de Sessões / Desconectar Todos</span>
              </button>
              <button
                type="button"
                className="text-left px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-semibold text-red-600 dark:text-red-400 flex items-center justify-between cursor-pointer mt-2"
                onClick={() => {
                  if(confirm("Tem certeza que deseja solicitar a exclusão permanente da sua conta? Todos os seus dados serão apagados de acordo com a LGPD e não poderão ser recuperados.")) {
                    alert("Solicitação registrada. Sua conta será excluída em até 30 dias.");
                  }
                }}
              >
                <span>Excluir conta permanentemente (LGPD)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-7 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSavedSuccess ? (
              <>
                <Check className="w-4 h-4 text-green-400 dark:text-green-600" />
                <span>Salvo!</span>
              </>
            ) : isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
