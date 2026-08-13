import React, { useState } from 'react';
import { CodeContract, CodeExecutionResult } from '../types';
import { 
  FileCode, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  ShieldCheck, 
  Clock, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  FileDiff,
  Percent,
  Play
} from 'lucide-react';

interface CodeContractViewerProps {
  contract: CodeContract;
  executionResult?: CodeExecutionResult;
  onRunAudit?: () => void;
  isRunning?: boolean;
}

export const CodeContractViewer: React.FC<CodeContractViewerProps> = ({
  contract,
  executionResult,
  onRunAudit,
  isRunning = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'contract' | 'telemetry' | 'diff'>('contract');

  return (
    <div className="my-3 rounded-2xl border border-[#eae6e1] dark:border-[#2e2e2e] bg-[#faf9f6] dark:bg-[#161616] overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-white dark:bg-[#181818] border-b border-[#eae6e1] dark:border-[#242424] flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono">
                {contract.functionName}
              </span>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
                Contrato Extraído & Verificado
              </span>
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400">
              Assinatura: <code className="font-mono text-gray-700 dark:text-gray-300">{contract.signature}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRunAudit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRunAudit();
              }}
              disabled={isRunning}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            >
              <Play className="w-3 h-3 fill-current" />
              {isRunning ? 'Executando Suíte...' : 'Executar Testes Reais'}
            </button>
          )}
          <button type="button" className="text-gray-400 p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('contract')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'contract'
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              1. Invariantes & Contrato
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              2. Telemetria de Execução
              {executionResult && (
                <span className={`w-2 h-2 rounded-full ${executionResult.exitCode === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              )}
            </button>
            {contract.diffSummary && (
              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'diff'
                    ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <FileDiff className="w-3.5 h-3.5" />
                3. Diff Comparativo
              </button>
            )}
          </div>

          {/* TAB 1: CONTRACT DETAILS */}
          {activeTab === 'contract' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white dark:bg-[#1c1c1c] rounded-xl border border-gray-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Tipo de Retorno Esperado
                  </span>
                  <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {contract.expectedReturnType}
                  </code>
                </div>
                <div className="p-3 bg-white dark:bg-[#1c1c1c] rounded-xl border border-gray-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Comportamento Desejado
                  </span>
                  <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                    {contract.desiredBehavior}
                  </p>
                </div>
              </div>

              {/* Invariants */}
              <div className="p-3 bg-white dark:bg-[#1c1c1c] rounded-xl border border-gray-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Invariantes Estruturais:
                </span>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {contract.invariants.map((inv, idx) => (
                    <li key={idx}>{inv}</li>
                  ))}
                </ul>
              </div>

              {/* Edge Cases */}
              <div className="p-3 bg-white dark:bg-[#1c1c1c] rounded-xl border border-gray-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Casos-Limite (Edge Cases):
                </span>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {contract.edgeCases.map((ec, idx) => (
                    <li key={idx}>{ec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: EXECUTION TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-3">
              {executionResult ? (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between flex-wrap gap-2 ${
                    executionResult.exitCode === 0 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' 
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {executionResult.exitCode === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span>Exit Code: {executionResult.exitCode} ({executionResult.exitCode === 0 ? 'Sucesso Real' : 'Falha na Execução'})</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {executionResult.durationMs}ms
                      </span>
                      {executionResult.coveragePercentage !== undefined && (
                        <span className="flex items-center gap-1 font-bold">
                          <Percent className="w-3 h-3" /> Cobertura: {executionResult.coveragePercentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Test Assertions */}
                  <div className="p-3 bg-white dark:bg-[#1c1c1c] rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 dark:text-gray-300">
                      <span>Resultado das Asserções de Teste:</span>
                      <span>
                        {executionResult.testsStatus.passed} / {executionResult.testsStatus.total} passaram
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {executionResult.testsStatus.assertionsResults.map((res, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2 rounded-lg bg-[#fafafa] dark:bg-[#141414] border border-gray-100 dark:border-zinc-800/80 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            {res.status === 'passed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span className="text-gray-800 dark:text-gray-200 font-mono">{res.name}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            res.status === 'passed' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {res.status === 'passed' ? 'PASSOU' : 'FALHOU'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Terminal Output */}
                  <div className="p-3 bg-[#111] text-gray-200 rounded-xl font-mono text-[11px] space-y-2 overflow-x-auto">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-zinc-800 pb-1">
                      <span>$ {executionResult.command}</span>
                    </div>
                    {executionResult.stdout && (
                      <pre className="text-emerald-400 whitespace-pre-wrap">{executionResult.stdout}</pre>
                    )}
                    {executionResult.stderr && (
                      <pre className="text-rose-400 whitespace-pre-wrap">{executionResult.stderr}</pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 text-xs">
                  Nenhuma execução de teste registrada ainda. Clique em &quot;Executar Testes Reais&quot; para disparar o runner.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIFF */}
          {activeTab === 'diff' && contract.diffSummary && (
            <div className="p-3 bg-white dark:bg-[#1c1c1c] rounded-xl border border-gray-200 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Comparativo de AST & Diff Mínimo Aplicado:
              </span>
              <pre className="font-mono text-xs text-gray-800 dark:text-gray-200 bg-[#f5f5f5] dark:bg-[#121212] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {contract.diffSummary}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
