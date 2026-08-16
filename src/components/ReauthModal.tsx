import React from 'react';
import { ShieldAlert, Lock, RefreshCw, XCircle, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenewToken: () => Promise<boolean>;
  onCancel: () => void;
  cause?: string;
  stage?: string;
  recommendedAction?: string;
  isRenewing?: boolean;
  errorMessage?: string | null;
}

export default function ReauthModal({
  isOpen,
  onClose,
  onRenewToken,
  onCancel,
  cause = "Sessão de acesso expirada ou token de autenticação rejeitado pelo servidor (HTTP 401/419).",
  stage = "2. Autenticação e Comunicação com API Omnix OS",
  recommendedAction = "Efetue a renovação do token de acesso ou faça o login novamente para prosseguir com a execução agêntica.",
  isRenewing = false,
  errorMessage = null
}: ReauthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-amber-300 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-black/30 text-amber-100 tracking-wider uppercase">
                  HTTP 401 / 419
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white text-amber-900 tracking-wider uppercase">
                  Sessão Expirada
                </span>
              </div>
              <h2 className="text-base font-bold leading-snug mt-0.5">
                Reautenticação Necessária
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 bg-[#fcfbfa]">
          {/* Execution Frozen Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Execução Congelada e Estado Preservado</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Um agente autônomo não pode continuar o planejamento com credenciais inválidas. Seu prompt e o estado pendente foram congelados com segurança.
              </p>
            </div>
          </div>

          {/* Structured Error Breakdown */}
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-[#eae6e1] space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Causa da Falha
              </span>
              <p className="font-medium text-gray-800 leading-snug">
                {cause}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-[#eae6e1] space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Etapa de Interrupção
                </span>
                <p className="font-medium text-gray-800 text-[11px]">
                  {stage}
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#eae6e1] space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Ação Recomendada
                </span>
                <p className="font-medium text-amber-800 text-[11px]">
                  {recommendedAction}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Error Message display if renewal attempt fails */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Action Triggers */}
        <div className="p-4 bg-white border-t border-[#eae6e1] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRenewing}
            className="px-4 py-2.5 rounded-xl border border-[#eae6e1] text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar (Salvar auth_required)
          </button>

          <button
            type="button"
            onClick={onRenewToken}
            disabled={isRenewing}
            className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isRenewing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Renovando Credenciais...</span>
              </>
            ) : (
              <>
                <span>Renovar Token & Retomar</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
