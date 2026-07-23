import React from 'react';
import { Calendar, Clock, CheckCircle2, Sparkles, ArrowRight, ListTodo } from 'lucide-react';
import { ScheduledTask } from '../types';

interface ScheduledTaskCardProps {
  key?: React.Key;
  task: Partial<ScheduledTask>;
  onOpenScheduledTasks?: () => void;
}

export default function ScheduledTaskCard({ task, onOpenScheduledTasks }: ScheduledTaskCardProps) {
  const getScheduleLabel = (type?: string, time?: string) => {
    const timeStr = time ? ` às ${time}` : '';
    switch (type) {
      case 'daily':
        return `Diariamente${timeStr}`;
      case 'weekly':
        return `Toda semana${timeStr}`;
      case 'monthly':
        return `Todo mês${timeStr}`;
      case 'once':
      default:
        return `Execução única${timeStr}`;
    }
  };

  return (
    <div className="my-3.5 w-full rounded-2xl border border-orange-200/80 bg-gradient-to-b from-orange-50/90 via-white to-orange-50/30 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md animate-in fade-in duration-300">
      {/* Top Header Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-orange-100">
        <div className="flex items-center gap-2">
          {/* Tag 'Agendando Tarefa' explicitly requested by user */}
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            &lt;Agendando Tarefa&gt;
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Agendada pela IA
          </span>
        </div>
        <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-orange-500" />
          WSM 1.6 Pro
        </span>
      </div>

      {/* Main Content */}
      <div className="space-y-3">
        <div>
          <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">Título da Tarefa</div>
          <h4 className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-snug flex items-center gap-2">
            <ListTodo className="w-4.5 h-4.5 text-orange-600 shrink-0" />
            <span>{task.title || 'Nova Tarefa Agendada'}</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="bg-white/80 border border-orange-100 rounded-xl p-2.5">
            <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Frequência</span>
            <div className="text-[13px] font-bold text-orange-950 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>{getScheduleLabel(task.scheduleType, task.time)}</span>
            </div>
          </div>

          <div className="bg-white/80 border border-orange-100 rounded-xl p-2.5">
            <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Horário Programado</span>
            <div className="text-[13px] font-bold text-orange-950 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>{task.time || '09:00'} (Horário local)</span>
            </div>
          </div>
        </div>

        {task.prompt && (
          <div className="bg-white border border-gray-150 rounded-xl p-3 text-[12.5px] text-gray-700 leading-relaxed">
            <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Instrução Automática da IA</span>
            <p className="font-mono text-[12px] text-gray-800 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
              "{task.prompt}"
            </p>
          </div>
        )}
      </div>

      {/* Footer Action */}
      {onOpenScheduledTasks && (
        <div className="mt-4 pt-3 border-t border-orange-100 flex justify-end">
          <button
            onClick={onOpenScheduledTasks}
            className="inline-flex items-center gap-2 text-[12px] font-bold text-orange-700 hover:text-orange-800 bg-orange-100/70 hover:bg-orange-100 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer group"
          >
            <span>Ver em Tarefas Agendadas</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}
