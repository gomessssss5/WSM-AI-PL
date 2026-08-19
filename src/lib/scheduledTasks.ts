import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { ScheduledTask, TaskExecution } from '../types';
import { logAuditEvent } from '../utils/auditLogger';

export const subscribeScheduledTasks = (
  userId: string,
  onUpdate: (tasks: ScheduledTask[]) => void
) => {
  try {
    const q = query(
      collection(db, 'users', userId, 'scheduledTasks'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const tasks: ScheduledTask[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tasks.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
          lastRunAt: data.lastRunAt?.toDate ? data.lastRunAt.toDate() : (data.lastRunAt ? new Date(data.lastRunAt) : undefined),
          nextRunAt: data.nextRunAt?.toDate ? data.nextRunAt.toDate() : (data.nextRunAt ? new Date(data.nextRunAt) : new Date()),
        } as ScheduledTask);
      });
      onUpdate(tasks);
    }, (error) => {
      console.warn('[subscribeScheduledTasks] Index/Query warning, falling back to simple collection snapshot:', error);
      const fallbackCol = collection(db, 'users', userId, 'scheduledTasks');
      return onSnapshot(fallbackCol, (snapshot) => {
        const tasks: ScheduledTask[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          tasks.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
            lastRunAt: data.lastRunAt?.toDate ? data.lastRunAt.toDate() : (data.lastRunAt ? new Date(data.lastRunAt) : undefined),
            nextRunAt: data.nextRunAt?.toDate ? data.nextRunAt.toDate() : (data.nextRunAt ? new Date(data.nextRunAt) : new Date()),
          } as ScheduledTask);
        });
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(tasks);
      });
    });
  } catch (e) {
    console.error('[subscribeScheduledTasks] Critical subscription error:', e);
    return () => {};
  }
};

export const subscribeTaskExecutions = (
  userId: string,
  onUpdate: (executions: TaskExecution[]) => void
) => {
  try {
    const q = query(
      collection(db, 'users', userId, 'taskExecutions'),
      orderBy('executedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const executions: TaskExecution[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        executions.push({
          ...data,
          id: doc.id,
          executedAt: data.executedAt?.toDate ? data.executedAt.toDate() : (data.executedAt ? new Date(data.executedAt) : new Date()),
          startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : (data.startedAt ? new Date(data.startedAt) : new Date()),
          finishedAt: data.finishedAt?.toDate ? data.finishedAt.toDate() : (data.finishedAt ? new Date(data.finishedAt) : undefined),
        } as TaskExecution);
      });
      onUpdate(executions);
    }, (error) => {
      console.warn('[subscribeTaskExecutions] Index/Query warning, falling back to simple collection snapshot:', error);
      const fallbackCol = collection(db, 'users', userId, 'taskExecutions');
      return onSnapshot(fallbackCol, (snapshot) => {
        const executions: TaskExecution[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          executions.push({
            ...data,
            id: doc.id,
            executedAt: data.executedAt?.toDate ? data.executedAt.toDate() : (data.executedAt ? new Date(data.executedAt) : new Date()),
            startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : (data.startedAt ? new Date(data.startedAt) : new Date()),
            finishedAt: data.finishedAt?.toDate ? data.finishedAt.toDate() : (data.finishedAt ? new Date(data.finishedAt) : undefined),
          } as TaskExecution);
        });
        executions.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
        onUpdate(executions);
      });
    });
  } catch (e) {
    console.error('[subscribeTaskExecutions] Critical subscription error:', e);
    return () => {};
  }
};

export const saveScheduledTask = async (userId: string, task: ScheduledTask) => {
  const taskRef = doc(db, 'users', userId, 'scheduledTasks', task.id);
  const secret = task.executionSecret || `task-secret-${self.crypto.randomUUID()}`;
  const data: any = {
    title: task.title,
    prompt: task.prompt,
    scheduleType: task.scheduleType,
    time: task.time,
    isActive: task.isActive,
    executionSecret: secret,
    createdAt: Timestamp.fromDate(task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt)),
    lastRunAt: task.lastRunAt ? Timestamp.fromDate(task.lastRunAt instanceof Date ? task.lastRunAt : new Date(task.lastRunAt)) : null,
    nextRunAt: Timestamp.fromDate(task.nextRunAt instanceof Date ? task.nextRunAt : new Date(task.nextRunAt))
  };

  if (task.date !== undefined) data.date = task.date;
  if (task.daysOfWeek !== undefined) data.daysOfWeek = task.daysOfWeek;
  if (task.dayOfMonth !== undefined) data.dayOfMonth = task.dayOfMonth;
  if (task.expirationDate !== undefined) data.expirationDate = task.expirationDate;

  // Clean undefined keys to prevent Firestore crashes
  Object.keys(data).forEach(key => {
    if (data[key] === undefined) {
      delete data[key];
    }
  });

  await setDoc(taskRef, data);
};

export const deleteScheduledTask = async (userId: string, taskId: string) => {
  const taskRef = doc(db, 'users', userId, 'scheduledTasks', taskId);
  let taskTitle = taskId;
  
  try {
    const snap = await getDoc(taskRef);
    if (snap.exists()) {
      taskTitle = snap.data().title || taskId;
    }
  } catch (e) {
    console.warn('Não foi possível obter dados da tarefa antes da exclusão:', e);
  }

  // Log explicit audit cancellation event
  const cancellationTime = new Date().toISOString();
  logAuditEvent({
    toolName: 'scheduler.cancel_task',
    riskLevel: 'high',
    details: `Cancelamento explícito da tarefa agendada "${taskTitle}" [ID: ${taskId}] ativado. Trava de execução (executionLock = CANCELLED) engatada.`,
    status: 'executed',
    user_id: userId,
    task_id: taskId,
    output: `Ator: wsmathenas@gmail.com | Versão: 1.0 | Timestamp: ${cancellationTime} | Trava: CANCELLED | Status: cancelada`
  });

  // Save explicit cancellation in execution history
  try {
    const cancelExecutionRef = doc(db, 'users', userId, 'taskExecutions', `cancel_${Date.now()}`);
    await setDoc(cancelExecutionRef, {
      taskId: taskId,
      taskTitle: `[CANCELADA] ${taskTitle}`,
      executedAt: Timestamp.fromDate(new Date()),
      sessionId: `cancel_session_${Date.now()}`,
      status: 'cancelada',
      error: `Tarefa cancelada explicitamente por wsmathenas@gmail.com em ${cancellationTime}. Trava de execução ativa.`
    });
  } catch (e) {
    console.error('Erro ao gravar histórico de cancelamento:', e);
  }

  await deleteDoc(taskRef);
};

export const saveTaskExecution = async (userId: string, execution: TaskExecution) => {
  const executionRef = doc(db, 'users', userId, 'taskExecutions', execution.id);
  const data: any = {
    taskId: execution.taskId,
    taskTitle: execution.taskTitle,
    executedAt: Timestamp.fromDate(execution.executedAt instanceof Date ? execution.executedAt : new Date(execution.executedAt)),
    sessionId: execution.sessionId,
    status: execution.status
  };
  if (execution.error !== undefined) {
    data.error = execution.error;
  }

  // Clean undefined keys to prevent Firestore crashes
  Object.keys(data).forEach(key => {
    if (data[key] === undefined) {
      delete data[key];
    }
  });

  await setDoc(executionRef, data);
};

export function calculateNextRunAt(
  type: 'once' | 'daily' | 'weekly' | 'monthly',
  timeStr: string,
  dateStr?: string,
  daysOfWeekArr?: number[],
  dayOfMonthNum?: number,
  baseDate?: Date
): Date {
  const now = baseDate || new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  if (type === 'once') {
    if (dateStr) {
      const nextRun = new Date(dateStr + 'T' + timeStr + ':00');
      if (isNaN(nextRun.getTime())) {
        const fallback = new Date(now);
        fallback.setHours(hours, minutes, 0, 0);
        if (fallback.getTime() <= now.getTime()) {
          fallback.setDate(fallback.getDate() + 1);
        }
        return fallback;
      }
      return nextRun;
    } else {
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun.getTime() <= now.getTime()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      return nextRun;
    }
  }
  
  if (type === 'daily') {
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
  }
  
  if (type === 'weekly') {
    const days = daysOfWeekArr && daysOfWeekArr.length > 0 ? [...daysOfWeekArr].sort() : [now.getDay()];
    // Find nearest day
    for (let offset = 0; offset <= 8; offset++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + offset);
      checkDate.setHours(hours, minutes, 0, 0);
      if (checkDate.getTime() > now.getTime() && days.includes(checkDate.getDay())) {
        return checkDate;
      }
    }
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
  }
  
  if (type === 'monthly') {
    const targetDay = dayOfMonthNum || 1;
    let nextRun = new Date(now.getFullYear(), now.getMonth(), targetDay, hours, minutes, 0, 0);
    if (nextRun.getTime() <= now.getTime()) {
      nextRun = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, hours, minutes, 0, 0);
    }
    return nextRun;
  }
  
  const fallback = new Date(now);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback;
}
