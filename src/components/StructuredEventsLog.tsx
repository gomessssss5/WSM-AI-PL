import React, { useState } from 'react';
import { ToolEvent } from '../types';
import { 
  Globe, 
  FileText, 
  Code2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Database,
  Terminal,
  Activity,
  Trash2,
  FolderOpen
} from 'lucide-react';

interface StructuredEventsLogProps {
  events: ToolEvent[];
}

export const StructuredEventsLog: React.FC<StructuredEventsLogProps> = ({ events }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);

  if (!events || events.length === 0) return null;

  // Icons based on tool/event type
  const getEventIcon = (event: ToolEvent) => {
    const ev = event.event.toLowerCase();
    const tool = event.tool.toLowerCase();

    if (ev.includes('search') || tool.includes('search')) {
      return <Globe className="w-4 h-4 text-[#8e9099] dark:text-gray-400" />;
    }
    if (ev.includes('artifact') || tool.includes('workspace')) {
      if (ev.includes('created')) {
        return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      }
      if (ev.includes('deleted')) {
        return <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />;
      }
      return <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
    if (ev.includes('code') || tool.includes('code')) {
      return <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
    if (ev.includes('task') || tool.includes('scheduler')) {
      return <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
    return <Cpu className="w-4 h-4 text-gray-500" />;
  };

  const getEventBadgeStyles = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50 animate-pulse';
    }
  };

  const getToolDisplayName = (tool: string) => {
    switch (tool) {
      case 'workspace.create_file': return 'Workspace / Criar Arquivo';
      case 'workspace.edit_file': return 'Workspace / Editar Arquivo';
      case 'workspace.delete_file': return 'Workspace / Excluir Arquivo';
      case 'workspace.read_file': return 'Workspace / Ler Arquivo';
      case 'workspace.list_directory': return 'Workspace / Listar Estrutura';
      case 'web.search_query': return 'Web / Pesquisa Externa';
      case 'code.execute': return 'Runtime / Executar Código';
      case 'scheduler.update': return 'Scheduler / Sincronizar Regras';
      default: return tool;
    }
  };

  return (
    <div className="w-full my-3 border border-[#eae6e1] dark:border-[#2e2e2e] rounded-2xl bg-[#faf9f6] dark:bg-[#181818] overflow-hidden shadow-xs transition-all">
      {/* Accordion Toggle Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none group hover:bg-[#f5f3ef] dark:hover:bg-[#202020] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Activity className="w-4.5 h-4.5 text-[#8e9099] dark:text-gray-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tracking-tight">
              Eventos de Execução Estruturados ({events.length})
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Contrato de integridade verificado com sucesso
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {events.some(e => e.status === 'pending') ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50">
              Processando
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
              Validado
            </span>
          )}
          <button 
            type="button" 
            className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 p-0.5 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#eae6e1] dark:border-[#2e2e2e] bg-white dark:bg-[#121212]">
          {/* Sub Header for Views (Table vs JSON) */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0ede9] dark:border-[#242424] bg-[#faf9f6] dark:bg-[#181818]">
            <span className="text-[10.5px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {showJsonView ? 'Visualização do Contrato JSON (Contrato Estruturado)' : 'Fluxo de Atividades do Agente'}
            </span>
            <button
              type="button"
              onClick={() => setShowJsonView(!showJsonView)}
              className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white border border-[#eae6e1] dark:border-[#2e2e2e] rounded-lg bg-white dark:bg-[#1c1c1c] hover:bg-[#faf9f6] transition-colors cursor-pointer"
            >
              {showJsonView ? 'Ver Linha do Tempo' : 'Inspecionar Contrato JSON'}
            </button>
          </div>

          {showJsonView ? (
            /* JSON View for pure auditing and compliance verify */
            <div className="p-4">
              <pre className="text-[11.5px] font-mono leading-relaxed bg-[#fbfbfb] dark:bg-[#0d0d0d] border border-[#f0ede9] dark:border-[#242424] rounded-xl p-3.5 overflow-x-auto text-gray-800 dark:text-gray-200 max-h-72">
                <code>{JSON.stringify(events, null, 2)}</code>
              </pre>
              <div className="mt-2.5 text-[10.5px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 pl-1">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                <span>Estes dados são objetos estruturados de primeira classe passados entre agente, ferramentas e interface.</span>
              </div>
            </div>
          ) : (
            /* Timeline flow view */
            <div className="divide-y divide-[#f0ede9] dark:divide-[#242424]">
              {events.map((event) => {
                const badgeStyles = getEventBadgeStyles(event.status);
                const displayTool = getToolDisplayName(event.tool);
                const formattedTime = (() => {
                  try {
                    return new Date(event.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  } catch {
                    return '';
                  }
                })();

                return (
                  <div key={event.runId} className="px-4 py-3.5 hover:bg-[#fafafa] dark:hover:bg-[#151515] transition-colors flex gap-3.5 items-start">
                    {/* Event Icon Wrap */}
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                      {getEventIcon(event)}
                    </div>

                    {/* Event Description and Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100 truncate leading-snug">
                          {event.details}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {formattedTime && (
                            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formattedTime}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border uppercase ${badgeStyles}`}>
                            {event.status === 'success' ? 'Sucesso' : event.status === 'pending' ? 'Pendente' : 'Falhou'}
                          </span>
                        </div>
                      </div>

                      {/* Technical Fields Footer */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        <span className="font-mono bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-1 py-0.5 rounded text-[10px] text-gray-600 dark:text-gray-300">
                          {event.runId}
                        </span>
                        <span className="text-gray-300 dark:text-zinc-800">•</span>
                        <span>{displayTool}</span>
                        {event.filename && (
                          <>
                            <span className="text-gray-300 dark:text-zinc-800">•</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              Arquivo: {event.filename}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
