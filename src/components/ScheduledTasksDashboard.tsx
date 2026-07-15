import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight, Plus, List, X, MoreHorizontal, Settings, RefreshCw, RefreshCcw, Pencil } from 'lucide-react';
import { ScheduledTask, TaskExecution, ChatSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { calculateNextRunAt } from '../lib/scheduledTasks';

interface ScheduledTasksDashboardProps {
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  sessions: ChatSession[];
  onOpenMobileHistory?: () => void;
  onSaveTask: (task: ScheduledTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string, isActive: boolean) => void;
  onOpenSession: (sessionId: string) => void;
}

export default function ScheduledTasksDashboard({
  tasks,
  executions,
  sessions,
  onOpenMobileHistory,
  onSaveTask,
  onDeleteTask,
  onToggleTask,
  onOpenSession
}: ScheduledTasksDashboardProps) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks' | 'completed'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  
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

  // Selected day on the calendar for active responsive/agenda view
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getTasksForDay = (dayNum: number) => {
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    const yyyy = cellDate.getFullYear();
    const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
    const dd = String(cellDate.getDate()).padStart(2, '0');
    const cellDateString = `${yyyy}-${mm}-${dd}`;

    return tasks.filter(t => {
      // Don't show task on days before it was created
      const creationDate = new Date(t.createdAt);
      creationDate.setHours(0, 0, 0, 0);
      if (cellDate < creationDate) {
        return false;
      }

      if (t.expirationDate && new Date(t.expirationDate + 'T23:59:59') < cellDate) {
        return false;
      }
      
      if (t.scheduleType === 'daily') return true;
      if (t.scheduleType === 'once') {
        return t.date === cellDateString;
      }
      if (t.scheduleType === 'weekly') {
        if (t.daysOfWeek && t.daysOfWeek.length > 0) {
          return t.daysOfWeek.includes(cellDate.getDay());
        }
        return cellDate.getDay() === new Date(t.createdAt).getDay();
      }
      if (t.scheduleType === 'monthly') {
        return cellDate.getDate() === (t.dayOfMonth || 1);
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
      date: scheduleType === 'once' ? selectedDate : undefined,
      daysOfWeek: scheduleType === 'weekly' && selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : undefined,
      dayOfMonth: scheduleType === 'monthly' ? selectedDayOfMonth : undefined,
      isActive: editingTask ? editingTask.isActive : true,
      createdAt: editingTask ? (editingTask.createdAt instanceof Date ? editingTask.createdAt : new Date(editingTask.createdAt)) : new Date(),
      nextRunAt: nextRun,
      expirationDate: hasExpiration ? expirationDate : undefined
    };

    onSaveTask(newTask);
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Agendado
          </h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#18181b] hover:bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] shadow-sm"
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
            Concluídas
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

                    const dayTasks = getTasksForDate(cellDate);

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
                    {getTasksForDay(selectedDay).length} tarefas agendadas para este dia
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
                <div className="text-center py-20 text-gray-500">
                  Nenhuma tarefa agendada.
                </div>
              ) : (
                tasks.map(task => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={task.id} 
                    className="bg-white border border-[#eae6e1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900 text-base">{task.title}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={task.isActive}
                              onChange={(e) => onToggleTask(task.id, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                        <button onClick={() => handleEditClick(task)} className="text-gray-400 hover:text-black transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm leading-relaxed">{task.prompt}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2 border-t border-[#eae6e1] pt-3">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5" /> 
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
                            return `${label} às ${task.time}`;
                          })()}
                        </span>
                        {task.nextRunAt && (
                          <span className="flex items-center gap-1.5">Próxima execução: {formatShortDate(task.nextRunAt)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div className="flex flex-col gap-4 max-w-4xl">
              {executions.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  Nenhuma execução registrada.
                </div>
              ) : (
                executions.map(exec => {
                  const relatedSession = sessions.find(s => s.id === exec.sessionId);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={exec.id} 
                      onClick={() => onOpenSession(exec.sessionId)}
                      className="bg-white border border-[#eae6e1] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {exec.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-900 text-base">{exec.taskTitle}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Executado em {formatShortDate(exec.executedAt)} às {formatShortTime(exec.executedAt)}</p>
                          </div>
                        </div>
                        {relatedSession?.isUnread && (
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5"></div>
                        )}
                      </div>
                      {exec.error && (
                        <p className="text-red-500 text-xs bg-red-50 p-2 rounded-md border border-red-100">{exec.error}</p>
                      )}
                    </motion.div>
                  )
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
                    <select 
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value as any)}
                      className="flex-1 bg-[#f4f3f1] border border-[#eae6e1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all appearance-none"
                    >
                      <option value="once">Uma vez</option>
                      <option value="daily">Diariamente</option>
                      <option value="weekly">Semanalmente</option>
                      <option value="monthly">Mensalmente</option>
                    </select>
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
