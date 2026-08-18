import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Plus, List, X, MoreHorizontal, Settings, RefreshCw, RefreshCcw, Pencil, Play, Loader2 } from 'lucide-react';
import { ScheduledTask, TaskExecution, ChatSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { calculateNextRunAt } from '../lib/scheduledTasks';
import { logAuditEvent } from '../utils/auditLogger';
import { getAuthHeader } from '../lib/firebase';

interface ScheduledTasksDashboardProps {
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  sessions: ChatSession[];
  currentUserId?: string;
  onOpenMobileHistory?: () => void;
  onSaveTask: (task: ScheduledTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string, isActive: boolean) => void;
  onOpenSession: (sessionId: string) => void;
  onSessionCreated?: (session: ChatSession) => void;
  onExecutionCreated?: (execution: TaskExecution) => void;
}

export default function ScheduledTasksDashboard({
  tasks,
  executions,
  sessions,
  currentUserId,
  onOpenMobileHistory,
  onSaveTask,
  onDeleteTask,
  onToggleTask,
  onOpenSession,
  onSessionCreated,
  onExecutionCreated
}: ScheduledTasksDashboardProps) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks' | 'completed'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  
  // New task form state
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [scheduleType, setScheduleType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [time, setTime] = useState('08:00');
  
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState<number>(new Date().getDate());
  
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [executionStates, setExecutionStates] = useState<Record<string, 'iniciando' | 'executando' | 'concluido' | 'falhou' | null>>({});

  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [maxRetries, setMaxRetries] = useState(3);
  const [backoffSeconds, setBackoffSeconds] = useState(10);

  const handleExecuteNow = async (task: ScheduledTask) => {
    if (runningTaskId) return;
    setRunningTaskId(task.id);
    setExecutionStates(prev => ({ ...prev, [task.id]: 'iniciando' }));

    logAuditEvent({
      toolName: 'scheduler.trigger_now',
      riskLevel: 'medium',
      details: `Disparo manual imediato da tarefa agendada: "${task.title}". Status: Iniciando.`,
      status: 'executed',
      user_id: currentUserId,
      task_id: task.id
    });

    try {
      // Transition to 'executando' quickly
      setTimeout(() => {
        setExecutionStates(prev => {
          if (prev[task.id] === 'iniciando') {
            return { ...prev, [task.id]: 'executando' };
          }
          return prev;
        });
      }, 800);

      const authHeaders = await getAuthHeader();
      const res = await fetch('/api/scheduled-tasks/execute-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          userId: currentUserId || 'guest',
          taskId: task.id,
          taskData: task
        })
      });
      const data = await res.json();

      if (data.success) {
        setExecutionStates(prev => ({ ...prev, [task.id]: 'concluido' }));
        logAuditEvent({
          toolName: 'scheduler.trigger_now_success',
          riskLevel: 'low',
          details: `Disparo manual imediato da tarefa agendada "${task.title}" concluído com sucesso.`,
          status: 'executed',
          user_id: currentUserId,
          task_id: task.id
        });
      } else {
        setExecutionStates(prev => ({ ...prev, [task.id]: 'falhou' }));
        logAuditEvent({
          toolName: 'scheduler.trigger_now_failed',
          riskLevel: 'high',
          details: `Falha no disparo manual imediato da tarefa agendada "${task.title}". Erro: ${data.error || 'Erro interno'}`,
          status: 'blocked',
          user_id: currentUserId,
          task_id: task.id
        });
      }

      if (data.session && onSessionCreated) {
        onSessionCreated(data.session);
      }
      if (data.execution && onExecutionCreated) {
        onExecutionCreated(data.execution);
      }
      if (data.sessionId) {
        onOpenSession(data.sessionId);
      }

      // Reset status after a few seconds so it can be clicked again
      setTimeout(() => {
        setExecutionStates(prev => ({ ...prev, [task.id]: null }));
      }, 5000);

    } catch (e) {
      console.error('Erro ao executar tarefa agora:', e);
      setExecutionStates(prev => ({ ...prev, [task.id]: 'falhou' }));
      logAuditEvent({
        toolName: 'scheduler.trigger_now_failed',
        riskLevel: 'high',
        details: `Falha no disparo manual imediato da tarefa agendada "${task.title}". Erro de rede ou servidor.`,
        status: 'blocked',
        user_id: currentUserId,
        task_id: task.id
      });
      setTimeout(() => {
        setExecutionStates(prev => ({ ...prev, [task.id]: null }));
      }, 5000);
    } finally {
      setRunningTaskId(null);
    }
  };

  // Selected day on the calendar for active responsive/agenda view
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const parseDateSafely = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    if (typeof d?.toDate === 'function') {
      try { return d.toDate(); } catch { return null; }
    }
    if (typeof d === 'number') return new Date(d);
    if (typeof d === 'string') {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof d === 'object' && typeof d.seconds === 'number') {
      return new Date(d.seconds * 1000);
    }
    return null;
  };

  const getTasksForDay = (dayNum: number) => {
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    cellDate.setHours(0, 0, 0, 0);
    const yyyy = cellDate.getFullYear();
    const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
    const dd = String(cellDate.getDate()).padStart(2, '0');
    const cellDateString = `${yyyy}-${mm}-${dd}`;

    return tasks.filter(t => {
      // Don't show task on days before it was created
      const rawCreation = parseDateSafely(t.createdAt);
      if (rawCreation) {
        const creationDate = new Date(rawCreation);
        creationDate.setHours(0, 0, 0, 0);
        if (cellDate < creationDate) {
          return false;
        }
      }

      if (t.expirationDate) {
        const expDate = new Date(t.expirationDate + 'T23:59:59');
        if (!isNaN(expDate.getTime()) && expDate < cellDate) {
          return false;
        }
      }
      
      if (t.scheduleType === 'daily') return true;
      if (t.scheduleType === 'once') {
        if (t.date) {
          return t.date === cellDateString;
        }
        // Fallback: match nextRunAt or createdAt date if t.date is missing
        const targetDate = parseDateSafely(t.nextRunAt) || parseDateSafely(t.createdAt);
        if (targetDate) {
          const ty = targetDate.getFullYear();
          const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
          const td = String(targetDate.getDate()).padStart(2, '0');
          return `${ty}-${tm}-${td}` === cellDateString;
        }
        return false;
      }
      if (t.scheduleType === 'weekly') {
        if (t.daysOfWeek && t.daysOfWeek.length > 0) {
          return t.daysOfWeek.includes(cellDate.getDay());
        }
        const refDate = parseDateSafely(t.nextRunAt) || parseDateSafely(t.createdAt) || new Date();
        return cellDate.getDay() === refDate.getDay();
      }
      if (t.scheduleType === 'monthly') {
        const refDate = parseDateSafely(t.nextRunAt) || parseDateSafely(t.createdAt) || new Date();
        const targetDay = t.dayOfMonth || refDate.getDate();
        return cellDate.getDate() === targetDay;
      }
      return false;
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const handleEditClick = (task: ScheduledTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setPrompt(task.prompt);
    setScheduleType(task.scheduleType);
    setTime(task.time);
    setSelectedDate(task.date || getTodayDateString());
    setSelectedDaysOfWeek(task.daysOfWeek || []);
    setSelectedDayOfMonth(task.dayOfMonth || new Date().getDate());
    setHasExpiration(!!task.expirationDate);
    setExpirationDate(task.expirationDate || '');
    setTimezone(task.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    setMaxRetries(task.retryPolicy?.maxRetries || 3);
    setBackoffSeconds(task.retryPolicy?.backoffSeconds || 10);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !prompt.trim()) return;

    const nextRun = calculateNextRunAt(
      scheduleType,
      time,
      scheduleType === 'once' ? selectedDate : undefined,
      scheduleType === 'weekly' ? selectedDaysOfWeek : undefined,
      scheduleType === 'monthly' ? selectedDayOfMonth : undefined
    );

    const newTask: ScheduledTask = {
      id: editingTask ? editingTask.id : crypto.randomUUID(),
      title,
      prompt,
      scheduleType,
      time,
      timezone: timezone,
      date: scheduleType === 'once' ? selectedDate : undefined,
      daysOfWeek: scheduleType === 'weekly' && selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : undefined,
      dayOfMonth: scheduleType === 'monthly' ? selectedDayOfMonth : undefined,
      isActive: editingTask ? editingTask.isActive : true,
      createdAt: editingTask ? (editingTask.createdAt instanceof Date ? editingTask.createdAt : new Date(editingTask.createdAt)) : new Date(),
      nextRunAt: nextRun,
      expirationDate: hasExpiration ? expirationDate : undefined,
      retryPolicy: {
        maxRetries,
        backoffSeconds
      }
    };

    onSaveTask(newTask);

    logAuditEvent({
      toolName: 'Automação Agendada (Scheduler)',
      riskLevel: 'medium',
      details: `Tarefa Agendada "${title}" ${editingTask ? 'atualizada' : 'criada'} (Tipo: ${scheduleType}, Horário: ${time})`,
      status: 'executed',
      normalized_input: `Title: ${title}, Prompt: ${prompt}, Schedule: ${scheduleType} @ ${time}`,
      output: `Agendamento ativado para execução em ${nextRun?.toISOString() || 'próximo ciclo'}.`
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingTask(null);
    setTitle('');
    setPrompt('');
    setScheduleType('daily');
    setTime('08:00');
    setSelectedDate(getTodayDateString());
    setSelectedDaysOfWeek([]);
    setSelectedDayOfMonth(new Date().getDate());
    setHasExpiration(false);
    setExpirationDate('');
    setIsTypeDropdownOpen(false);
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setMaxRetries(3);
    setBackoffSeconds(10);
  };

  const formatShortTime = (d: Date | string | number) => {
    const date = new Date(d);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatShortDate = (d: Date | string | number) => {
    const date = new Date(d);
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex-1 bg-[#fafaf9] flex flex-col font-sans overflow-hidden">
      <div className="flex flex-col h-full max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="pt-6 pb-2 px-6 sm:px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Agendado
            </h1>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#18181b] hover:bg-black text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-[0.98] shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo agendamento
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 sm:px-10 border-b border-[#eae6e1] flex items-center gap-6 mt-4">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'calendar' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Calendário
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'tasks' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Tarefas
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'completed' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Histórico
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          
          {activeTab === 'calendar' && (
            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
              {/* Calendar Grid */}
              <div className="flex-1 bg-white border border-[#eae6e1] rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-[#eae6e1]">
                  <div className="flex items-center gap-4">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-900 min-w-[120px] text-center capitalize">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setCurrentDate(new Date());
                        setSelectedDay(new Date().getDate());
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-[#eae6e1] rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Hoje
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b border-[#eae6e1] bg-gray-50/50">
                  {daysOfWeek.map(day => (
                    <div key={day} className="py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr">
                  {calendarDays.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="border-b border-r border-[#eae6e1] bg-gray-50/30" />;
                    }

                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                    
                    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const yyyy = cellDate.getFullYear();
                    const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(cellDate.getDate()).padStart(2, '0');
                    const cellDateString = `${yyyy}-${mm}-${dd}`;

                    const dayTasks = getTasksForDay(day);

                    // Active tasks for display list/count
                    const activeDayTasks = dayTasks.filter(t => t.isActive);

                    return (
                      <button
                        key={`day-${day}`}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`border-b border-r border-[#eae6e1] p-1.5 sm:p-2 min-h-[50px] sm:min-h-[60px] md:min-h-[85px] lg:min-h-[100px] flex flex-col hover:bg-gray-50/50 transition-all text-left relative focus:outline-none ${
                          selectedDay === day 
                            ? 'bg-amber-50/10 ring-1 ring-inset ring-black/10' 
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-xs sm:text-sm font-medium flex items-center justify-center ${
                            isToday 
                              ? 'w-6 h-6 sm:w-7 h-7 bg-black text-white rounded-full font-bold shadow-sm' 
                              : selectedDay === day
                                ? 'w-6 h-6 sm:w-7 h-7 bg-gray-100 text-gray-900 rounded-full border border-gray-300 font-bold'
                                : 'text-gray-700 w-6 h-6 sm:w-7 h-7'
                          }`}>
                            {day}
                          </span>
                          
                          {/* Task status indicator on mobile (dot) */}
                          {dayTasks.length > 0 && (
                            <div className="md:hidden flex gap-0.5 shrink-0">
                              <span className={`h-1.5 w-1.5 rounded-full ${activeDayTasks.length > 0 ? 'bg-black' : 'bg-gray-300'}`}></span>
                            </div>
                          )}
                        </div>

                        {/* Desktop tasks list */}
                        <div className="hidden md:flex flex-col gap-1 overflow-y-auto max-h-[45px] lg:max-h-[70px] w-full">
                          {dayTasks.slice(0, 3).map((t, tidx) => (
                            <div 
                              key={tidx} 
                              className={`text-[10px] lg:text-[11px] leading-tight px-1.5 py-0.5 bg-white border border-[#eae6e1] rounded text-gray-700 truncate shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center gap-1 ${
                                !t.isActive ? 'opacity-40 line-through' : ''
                              }`}
                            >
                              <span className="font-semibold text-[9px] lg:text-[10px] text-gray-500 shrink-0">{t.time}</span>
                              <span className="truncate">{t.title}</span>
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[9px] text-gray-400 font-medium pl-1">+{dayTasks.length - 3} mais</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Agenda Pane */}
              <div className="w-full lg:w-80 shrink-0 bg-white border border-[#eae6e1] rounded-xl shadow-sm p-5 flex flex-col h-fit lg:max-h-[600px] overflow-hidden">
                <div className="border-b border-[#eae6e1] pb-3 mb-4 shrink-0">
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    Agenda de {selectedDay} de {monthNames[currentDate.getMonth()]}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {getTasksForDay(selectedDay).length} {getTasksForDay(selectedDay).length === 1 ? 'tarefa agendada' : 'tarefas agendadas'} para este dia
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 max-h-[300px] lg:max-h-none">
                  {getTasksForDay(selectedDay).length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-400 font-medium bg-gray-50/50 rounded-lg border border-dashed border-[#eae6e1]">
                      Nenhuma tarefa para este dia.
                    </div>
                  ) : (
                    getTasksForDay(selectedDay).map((t, idx) => (
                      <div 
                        key={t.id || idx} 
                        className={`p-3.5 rounded-xl border text-sm transition-all flex flex-col gap-2.5 ${
                          t.isActive 
                            ? 'bg-[#fafaf9] border-[#eae6e1] hover:border-black/20' 
                            : 'bg-gray-50/50 border-gray-200/60 opacity-65'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded ${
                              t.isActive 
                                ? 'text-emerald-700 border-emerald-200/60 bg-emerald-50/50' 
                                : 'text-gray-500 border-gray-200 bg-gray-100/50'
                            }`}>
                              {t.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              type="button"
                              onClick={() => handleExecuteNow(t)} 
                              disabled={runningTaskId === t.id}
                              className="text-gray-900 bg-gray-100 hover:bg-black hover:text-white px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Executar tarefa agora"
                            >
                              {executionStates[t.id] === 'iniciando' ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Iniciando...</span>
                                </>
                              ) : executionStates[t.id] === 'executando' ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                                  <span>Executando...</span>
                                </>
                              ) : executionStates[t.id] === 'concluido' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-600">Concluído</span>
                                </>
                              ) : executionStates[t.id] === 'falhou' ? (
                                <>
                                  <X className="w-3 h-3 text-red-500" />
                                  <span className="text-red-600">Falhou</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Rodar</span>
                                </>
                              )}
                            </button>

                            <label className="relative inline-flex items-center cursor-pointer scale-75">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={t.isActive}
                                onChange={(e) => onToggleTask(t.id, e.target.checked)}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                            </label>
                            
                            <button 
                              type="button"
                              onClick={() => handleEditClick(t)} 
                              className="text-gray-400 hover:text-black p-0.5 rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            
                            <button 
                              type="button"
                              onClick={() => onDeleteTask(t.id)} 
                              className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                              title="Excluir"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-gray-950 text-sm leading-snug flex items-center gap-1.5">
                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{t.time}</span>
                            <span className="truncate">{t.title}</span>
                          </h4>
                          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-normal whitespace-pre-line bg-white/60 p-2 rounded-lg border border-gray-100" title={t.prompt}>
                            {t.prompt}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                          <span className="capitalize">{t.scheduleType === 'once' ? 'Uma vez' : t.scheduleType === 'daily' ? 'Diário' : t.scheduleType === 'weekly' ? 'Semanal' : 'Mensal'}</span>
                          {t.expirationDate && (
                            <span>Expira: {t.expirationDate.split('-').reverse().slice(0,2).join('/')}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex flex-col gap-4 max-w-4xl">
              {tasks.length === 0 ? (
                <div className="text-center py-20 text-gray-500 bg-white border border-[#eae6e1] rounded-2xl">
                  Nenhuma tarefa agendada cadastrada no momento.
                </div>
              ) : (
                tasks.map(task => {
                  const lastExec = executions.filter(e => e.taskId === task.id)[0];
                  const durationStr = lastExec?.durationMs 
                    ? `${(lastExec.durationMs / 1000).toFixed(1)}s` 
                    : undefined;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={task.id} 
                      className="bg-white border border-[#eae6e1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3.5 h-3.5 rounded-full ${task.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 text-base">{task.title}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                runningTaskId === task.id
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                                  : task.isActive 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {runningTaskId === task.id ? 'executando' : task.isActive ? 'ativa' : 'pausada'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">ID: {task.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <button 
                            type="button"
                            onClick={() => handleExecuteNow(task)} 
                            disabled={runningTaskId === task.id}
                            className="flex items-center gap-1.5 bg-[#18181b] hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Executar tarefa imediatamente em Modo Teste com auditoria"
                          >
                            {executionStates[task.id] === 'iniciando' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Iniciando...</span>
                              </>
                            ) : executionStates[task.id] === 'executando' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>Executando Teste...</span>
                              </>
                            ) : executionStates[task.id] === 'concluido' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Concluído!</span>
                              </>
                            ) : executionStates[task.id] === 'falhou' ? (
                              <>
                                <X className="w-3.5 h-3.5 text-red-400" />
                                <span className="text-red-400">Falhou!</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current text-amber-400" />
                                <span>Modo Teste (Executar Agora)</span>
                              </>
                            )}
                          </button>

                          {task.isActive ? (
                            <button
                              type="button"
                              onClick={() => onToggleTask(task.id, false)}
                              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 transition-all cursor-pointer"
                              title="Pausar agendamento"
                            >
                              <span>Pausar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onToggleTask(task.id, true)}
                              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 transition-all cursor-pointer"
                              title="Retomar agendamento"
                            >
                              <span>Ativar</span>
                            </button>
                          )}

                          <button 
                            onClick={() => handleEditClick(task)} 
                            className="text-gray-400 hover:text-black transition-colors p-1 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200" 
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteTask(task.id)} 
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-gray-50 hover:bg-red-50 rounded-lg border border-gray-200" 
                            title="Excluir"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-[#fcfaf7] border border-[#f2ece4] rounded-xl p-3.5 text-xs text-gray-700 italic">
                        "{task.prompt}"
                      </div>

                      {/* Observability Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#faf9f6] border border-[#eae6e1] rounded-xl p-3.5 text-xs text-gray-600">
                        <div>
                          <p className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">Fuso Horário</p>
                          <p className="font-medium text-gray-800 mt-0.5 truncate">{task.timezone || 'Fuso Local'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">Retentativas (Retry)</p>
                          <p className="font-medium text-gray-800 mt-0.5">
                            {task.retryPolicy ? `${task.retryPolicy.maxRetries}x (${task.retryPolicy.backoffSeconds}s)` : '3x (10s backoff)'}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">Último Resultado</p>
                          <span className={`inline-flex items-center gap-1 font-semibold mt-0.5 ${
                            task.lastExecutionStatus === 'succeeded' ? 'text-emerald-600' :
                            task.lastExecutionStatus === 'failed' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {task.lastExecutionStatus === 'succeeded' ? `Sucesso ${durationStr ? `(${durationStr})` : ''}` :
                             task.lastExecutionStatus === 'failed' ? 'Falhou / Erro' : 'Nunca executado'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">Última Execução</p>
                          <p className="font-medium text-gray-800 mt-0.5">
                            {task.lastRunAt ? `${formatShortDate(task.lastRunAt)} às ${formatShortTime(task.lastRunAt)}` : 'Sem registros'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 mt-1 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5 font-medium">
                            <RefreshCw className="w-3.5 h-3.5 text-gray-400 shrink-0" /> 
                            {(() => {
                              const scheduleMap: Record<string, string> = {
                                once: 'Uma vez',
                                daily: 'Diariamente',
                                weekly: 'Semanalmente',
                                monthly: 'Mensalmente'
                              };
                              let label = scheduleMap[task.scheduleType] || task.scheduleType;
                              if (task.scheduleType === 'once' && task.date) {
                                const [y, m, d] = task.date.split('-');
                                label += ` (${d}/${m}/${y})`;
                              } else if (task.scheduleType === 'weekly' && task.daysOfWeek && task.daysOfWeek.length > 0) {
                                const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                label += ` (${task.daysOfWeek.map(d => dayNames[d]).join(', ')})`;
                              } else if (task.scheduleType === 'monthly' && task.dayOfMonth) {
                                label += ` (todo dia ${task.dayOfMonth})`;
                              }
                              const timeZone = task.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                              
                              let utcTimeStr = '';
                              if (task.time) {
                                try {
                                  const [h, m] = task.time.split(':').map(Number);
                                  const dateInTZ = new Date(new Date().toLocaleString('en-US', { timeZone }));
                                  const localNow = new Date();
                                  const tzOffsetMinutes = Math.round((localNow.getTime() - dateInTZ.getTime()) / 60000);
                                  
                                  const d = new Date();
                                  d.setHours(h, m, 0, 0);
                                  const utcDate = new Date(d.getTime() + tzOffsetMinutes * 60000);
                                  
                                  const utcHours = utcDate.getUTCHours().toString().padStart(2, '0');
                                  const utcMinutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
                                  utcTimeStr = ` / ${utcHours}:${utcMinutes} UTC`;
                                } catch(e) {}
                              }

                              return `${label} às ${task.time} (${timeZone}${utcTimeStr})`;
                            })()}
                          </span>
                          {task.nextRunAt && (
                            <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              Próxima execução: {formatShortDate(task.nextRunAt)} às {task.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div className="flex flex-col gap-4 max-w-4xl">
              {executions.length === 0 ? (
                <div className="text-center py-20 text-gray-500 bg-white border border-[#eae6e1] rounded-2xl p-8">
                  <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">Nenhuma execução registrada.</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Execute uma tarefa manualmente ou aguarde o próximo ciclo agendado.
                  </p>
                </div>
              ) : (
                executions.map(exec => {
                  const relatedSession = sessions.find(s => s.id === exec.sessionId);
                  const isSuccess = exec.status === 'succeeded';
                  const isFailed = exec.status === 'failed' || exec.status === 'error' as any;
                  const isRunning = exec.status === 'running' || exec.status === 'planning' || exec.status === 'waiting_approval' || exec.status === 'waiting_user';
                  const summaryText = exec.outputSummary || (relatedSession?.messages?.find(m => m.sender === 'ai')?.text) || 'Execução processada pelo agente em segundo plano.';

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={exec.id} 
                      className="bg-white border border-[#eae6e1] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {isSuccess ? (
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                          ) : isFailed ? (
                            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                              <X className="w-5 h-5 text-red-600" />
                            </div>
                          ) : isRunning ? (
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                              <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-base">{exec.taskTitle}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isSuccess ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                                isFailed ? 'bg-red-100 text-red-800 border border-red-200' :
                                isRunning ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {exec.status}
                              </span>
                              {exec.runId && (
                                <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                  {exec.runId}
                                </span>
                              )}
                              {exec.triggerType && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100">
                                  {exec.triggerType === 'manual' ? 'Disparo Manual' : 'Agendamento Automático'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Executado em {formatShortDate(exec.executedAt)} às {formatShortTime(exec.executedAt)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenSession(exec.sessionId)}
                          className="px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-all active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          Ver Conversa
                        </button>
                      </div>

                      {/* Telemetry Breakdown Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-[#fcfbf9] border border-[#eae6e1] rounded-xl p-3 text-[11px] font-mono text-gray-600">
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Duração (ms)</span>
                          <span className="font-bold text-gray-800">{exec.durationMs ? `${exec.durationMs} ms` : 'Rápida (<1s)'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Modo Execução</span>
                          <span className="font-semibold text-gray-800">{exec.triggerType === 'manual' ? 'Modo Teste' : 'Agendado'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Ferramentas</span>
                          <span className="font-medium text-gray-800 truncate block" title={exec.toolsInvoked?.join(', ') || 'Omnix Agent Tooling'}>
                            {exec.toolsInvoked?.length ? exec.toolsInvoked.join(', ') : 'Omnix Tooling'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Artefatos</span>
                          <span className="font-medium text-gray-800 truncate block">
                            {exec.generatedFiles?.length ? `${exec.generatedFiles.length} arquivo(s)` : 'Sem artefatos'}
                          </span>
                        </div>
                      </div>

                      {/* Summary output snippet */}
                      <div className="bg-[#f9f8f6] border border-[#eae6e1] rounded-xl p-3 text-xs text-gray-700 leading-relaxed font-normal">
                        <p className="font-bold text-gray-900 text-[11px] mb-1 uppercase tracking-wider">Resultado da Execução Agêntica:</p>
                        <p className="line-clamp-3 whitespace-pre-line">{summaryText}</p>
                      </div>

                      {exec.error && (
                        <p className="text-red-600 text-xs bg-red-50 p-2.5 rounded-xl border border-red-200 font-mono">
                          ⚠️ Erro: {exec.error}
                        </p>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#eae6e1] shrink-0">
                <h2 className="text-xl font-bold text-gray-900">{editingTask ? 'Editar tarefa agendada' : 'Nova tarefa agendada'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex flex-col gap-6">
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Título</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Resumo de e-mails não lidos"
                    className="w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Agendamento</label>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <button
                        type="button"
                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                        className="w-full flex items-center justify-between bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all cursor-pointer text-left h-full min-h-[46px]"
                      >
                        <span className="text-gray-900 font-medium">
                          {scheduleType === 'once' && 'Uma vez'}
                          {scheduleType === 'daily' && 'Diariamente'}
                          {scheduleType === 'weekly' && 'Semanalmente'}
                          {scheduleType === 'monthly' && 'Mensalmente'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isTypeDropdownOpen && (
                          <>
                            {/* Overlay backdrop to capture outside click */}
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setIsTypeDropdownOpen(false)}
                            />
                            
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              transition={{ duration: 0.12 }}
                              className="absolute left-0 right-0 mt-1.5 bg-white border border-[#eae6e1] rounded-xl shadow-lg overflow-hidden z-20 py-1"
                            >
                              {[
                                { value: 'once', label: 'Uma vez' },
                                { value: 'daily', label: 'Diariamente' },
                                { value: 'weekly', label: 'Semanalmente' },
                                { value: 'monthly', label: 'Mensalmente' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setScheduleType(option.value as any);
                                    setIsTypeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer ${
                                    scheduleType === option.value ? 'bg-gray-50 font-semibold text-black dark:text-white' : 'text-gray-700'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    <input 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-32 bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    />
                  </div>

                  {scheduleType === 'once' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-semibold text-gray-700 block">Data de Execução</label>
                      <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      />
                    </div>
                  )}

                  {scheduleType === 'weekly' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-semibold text-gray-700 block">Dias da Semana</label>
                      <div className="flex flex-wrap gap-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => {
                          const isSelected = selectedDaysOfWeek.includes(index);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setSelectedDaysOfWeek(prev => 
                                  prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-black text-white border-black' 
                                  : 'bg-[#f4f3f1] text-gray-700 border-[#eae6e1] hover:bg-gray-200'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {scheduleType === 'monthly' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-semibold text-gray-700 block">Dia do Mês</label>
                      <input 
                        type="number"
                        min={1}
                        max={31}
                        value={selectedDayOfMonth}
                        onChange={(e) => setSelectedDayOfMonth(Number(e.target.value))}
                        className="w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      />
                    </div>
                  )}
                  
                  <div className="pt-2 flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="hasExpiration"
                      checked={hasExpiration}
                      onChange={(e) => setHasExpiration(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <label htmlFor="hasExpiration" className="text-sm text-gray-600 cursor-pointer">
                      Definir data de validade
                    </label>
                  </div>

                  {hasExpiration && (
                    <input 
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="mt-2 w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 block">Fuso Horário (Timezone)</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all cursor-pointer"
                      >
                        <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                          Fuso Local ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                        </option>
                        <option value="America/Sao_Paulo">Brasília/São Paulo (BRT)</option>
                        <option value="America/New_York">Nova Iorque (EST/EDT)</option>
                        <option value="Europe/London">Londres (GMT/BST)</option>
                        <option value="UTC">UTC / GMT</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 block">Retentativas (Retry Policy)</label>
                      <div className="flex gap-2">
                        <select
                          value={maxRetries}
                          onChange={(e) => setMaxRetries(Number(e.target.value))}
                          className="flex-1 bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all cursor-pointer"
                        >
                          <option value={1}>Sem retentativa</option>
                          <option value={2}>1 retentativa</option>
                          <option value={3}>2 retentativas</option>
                          <option value={4}>3 retentativas</option>
                        </select>
                        <select
                          value={backoffSeconds}
                          onChange={(e) => setBackoffSeconds(Number(e.target.value))}
                          className="flex-1 bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all cursor-pointer"
                        >
                          <option value={10}>10s backoff</option>
                          <option value={30}>30s backoff</option>
                          <option value={60}>1 min backoff</option>
                          <option value={300}>5 min backoff</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Prompt</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="O que a IA deve fazer? Ex: Resuma os e-mails não lidos e destaque mensagens importantes."
                    className="w-full bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none min-h-[120px]"
                  />
                </div>

              </div>

              <div className="p-5 border-t border-[#eae6e1] shrink-0 flex justify-end gap-3 bg-gray-50/50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!title.trim() || !prompt.trim()}
                  className="bg-[#18181b] hover:bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {editingTask ? 'Salvar Alterações' : 'Agendar Tarefa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
