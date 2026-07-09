import React, { useState } from 'react';
import { X, Play, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

interface SecretApiTesterProps {
  onClose: () => void;
}

export default function SecretApiTester({ onClose }: SecretApiTesterProps) {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    key1?: { success: boolean; message: string };
    key2?: { success: boolean; message: string };
  } | null>(null);

  const handleTestKeys = async () => {
    setLoading(true);
    setTestResults(null);
    try {
      const response = await fetch('/api/test-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      } else {
        throw new Error('Falha na resposta do servidor.');
      }
    } catch (err: any) {
      setTestResults({
        key1: { success: false, message: `Erro ao conectar com o servidor: ${err.message}` },
        key2: { success: false, message: `Erro ao conectar com o servidor: ${err.message}` },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="secret-tester-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div id="secret-tester-modal" className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-zinc-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              WSM AI - Painel de Diagnóstico Secreto
            </h2>
          </div>
          <button 
            id="close-tester-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Configurações de Diagnóstico
            </h3>
            <p className="text-sm text-zinc-300">
              Este painel executa testes de requisição direta utilizando o modelo padrão de menor latência 
              <span className="mx-1.5 px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded font-mono text-xs">
                gemini-3.1-flash-lite
              </span>
              para verificar a validade, permissões e cota das suas chaves de API.
            </p>
          </div>

          <div className="space-y-4">
            {/* Key 1 Block */}
            <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-400 tracking-wider">CHAVE PRINCIPAL</span>
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-mono">IA_API_KEY</span>
              </div>
              
              {testResults?.key1 ? (
                <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                  testResults.key1.success 
                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300' 
                    : 'bg-red-950/20 border-red-900/50 text-red-400'
                }`}>
                  {testResults.key1.success ? (
                    <CheckCircle2 className="shrink-0 text-emerald-400 mt-0.5" size={18} />
                  ) : (
                    <ShieldAlert className="shrink-0 text-red-400 mt-0.5" size={18} />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {testResults.key1.success ? 'Conexão Estabelecida' : 'Erro de Autenticação'}
                    </p>
                    <p className="text-xs font-mono break-words leading-relaxed text-zinc-300">
                      {testResults.key1.message}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs font-mono">
                  Aguardando execução do teste...
                </div>
              )}
            </div>

            {/* Key 2 Block */}
            <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-400 tracking-wider">CHAVE RESERVA / FALLBACK</span>
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-mono">IA_API_KEY_2</span>
              </div>

              {testResults?.key2 ? (
                <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                  testResults.key2.success 
                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300' 
                    : 'bg-red-950/20 border-red-900/50 text-red-400'
                }`}>
                  {testResults.key2.success ? (
                    <CheckCircle2 className="shrink-0 text-emerald-400 mt-0.5" size={18} />
                  ) : (
                    <ShieldAlert className="shrink-0 text-red-400 mt-0.5" size={18} />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {testResults.key2.success ? 'Conexão Estabelecida' : 'Erro de Autenticação'}
                    </p>
                    <p className="text-xs font-mono break-words leading-relaxed text-zinc-300">
                      {testResults.key2.message}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs font-mono">
                  Aguardando execução do teste...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            id="run-api-test-btn"
            onClick={handleTestKeys}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:text-zinc-400 rounded-xl font-medium text-white transition-all shadow-lg shadow-indigo-600/15 font-sans"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                <span>Testando chaves com gemini-3.1-flash-lite...</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Testar Ambas as APIs</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
