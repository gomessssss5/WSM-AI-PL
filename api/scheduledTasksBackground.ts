import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  collectionGroup,
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let dbInstance: any = null;

function getDb() {
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const app = getApps().length > 0 ? getApp() : initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      });
      dbInstance = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
      console.log('[ScheduledTasks] Conectado ao Firestore em segundo plano.');
    }
  } catch (err) {
    console.warn('[ScheduledTasks] Erro ao conectar ao Firestore:', err);
  }
  return dbInstance;
}

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

export async function executeScheduledTaskNow(userId: string, taskId: string, taskData: any): Promise<{ success: boolean; aiResponse?: string; error?: string; sessionId?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database instance unavailable' };

  const now = new Date();
  console.log(`[ScheduledTasks] Force executing task ${taskId} for user ${userId}`);

  const newSessionId = crypto.randomUUID();
  let newNextRunAt: Date | null = null;
  let newIsActive = true;

  if (taskData.scheduleType === 'once') {
    newIsActive = false;
  } else {
    newNextRunAt = calculateNextRunAt(
      taskData.scheduleType,
      taskData.time,
      taskData.date,
      taskData.daysOfWeek,
      taskData.dayOfMonth,
      now
    );
  }

  // Update task state in Firestore
  try {
    await updateDoc(doc(db, 'users', userId, 'scheduledTasks', taskId), {
      lastRunAt: Timestamp.fromDate(now),
      lastStatus: 'running',
      ...(newNextRunAt ? { nextRunAt: Timestamp.fromDate(newNextRunAt) } : {}),
      isActive: newIsActive
    });
  } catch (e) {
    console.warn('[ScheduledTasks] Warning updating task doc state:', e);
  }

  const executionId = crypto.randomUUID();
  const initialMessages = [
    {
      id: crypto.randomUUID(),
      sender: 'user',
      text: taskData.prompt,
      timestamp: Timestamp.fromDate(now)
    }
  ];

  try {
    await setDoc(doc(db, 'users', userId, 'sessions', newSessionId), {
      id: newSessionId,
      title: `[Execução Agendada] ${taskData.title}`,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      messages: initialMessages,
      isUnread: true,
      isTemporary: false
    });
  } catch (e) {
    console.warn('[ScheduledTasks] Warning creating session doc:', e);
  }

  let skills: any[] = [];
  try {
    const skillsSnapshot = await getDocs(collection(db, 'users', userId, 'skills'));
    skills = skillsSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Ignore skills error
  }

  let aiText = "";
  let aiFinalSynthesis = "";
  let executionStatus: 'success' | 'error' = 'success';
  let executionError = "";

  try {
    const res = await fetch("http://127.0.0.1:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: taskData.prompt,
        isSearchEnabled: true,
        isScheduledExecution: true,
        model: 'Omnix 1.6',
        skills: skills,
        userContext: `Execução automática de tarefa agendada em segundo plano.`,
        history: []
      })
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const data = await res.json();
        aiText = data.text || data.error || "Execução concluída com sucesso.";
        aiFinalSynthesis = data.finalSynthesis || data.text || "";
      } else if (res.body) {
        const reader = (res.body as any).getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanedLine = line.trim();
            if (!cleanedLine.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(cleanedLine.substring(6));
              if (data.type === "chunk" && data.text) {
                aiText += data.text;
              } else if (data.type === "final") {
                if (data.text) aiText = data.text;
                if (data.finalSynthesis) aiFinalSynthesis = data.finalSynthesis;
              } else if (data.text) {
                aiText += data.text;
              } else if (data.finalSynthesis) {
                aiFinalSynthesis = data.finalSynthesis;
              }
            } catch (e) {}
          }
        }
      }
    } else {
      executionStatus = 'error';
      executionError = `Erro HTTP ${res.status}: ${res.statusText}`;
      aiText = `⚠️ Erro ao executar tarefa: ${res.statusText}`;
    }
  } catch (e: any) {
    executionStatus = 'error';
    executionError = e?.message || String(e);
    aiText = `⚠️ Falha de execução: ${executionError}`;
  }

  const finalOutput = aiFinalSynthesis || aiText || "Tarefa processada em segundo plano.";

  // Update session with AI message
  try {
    initialMessages.push({
      id: crypto.randomUUID(),
      sender: 'ai',
      text: finalOutput,
      finalSynthesis: aiFinalSynthesis,
      timestamp: Timestamp.fromDate(new Date()),
      isSearchMessage: true
    } as any);

    await updateDoc(doc(db, 'users', userId, 'sessions', newSessionId), {
      messages: initialMessages,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (e) {
    console.warn('[ScheduledTasks] Warning updating session with AI message:', e);
  }

  // Record task execution log with complete agentic provenance
  const finishedAt = new Date();
  const runId = `run-${executionId.slice(0, 8)}`;
  try {
    await setDoc(doc(db, 'users', userId, 'taskExecutions', executionId), {
      id: executionId,
      runId: runId,
      taskId: taskId,
      taskTitle: taskData.title,
      executedAt: Timestamp.fromDate(now),
      startedAt: Timestamp.fromDate(now),
      finishedAt: Timestamp.fromDate(finishedAt),
      triggerType: taskData.triggerType || 'manual',
      sessionId: newSessionId,
      status: executionStatus,
      outputSummary: finalOutput.slice(0, 400),
      ...(executionError ? { error: executionError } : {})
    });

    await updateDoc(doc(db, 'users', userId, 'scheduledTasks', taskId), {
      lastStatus: executionStatus,
      lastOutput: finalOutput.slice(0, 200)
    });
  } catch (e) {
    console.warn('[ScheduledTasks] Warning recording task execution log:', e);
  }

  return {
    success: executionStatus === 'success',
    aiResponse: finalOutput,
    error: executionError,
    sessionId: newSessionId
  };
}

export async function processBackgroundTasks() {
  const db = getDb();
  if (!db) return;

  try {
    const now = new Date();
    const tasksToProcess: Array<{ userId: string; taskId: string; taskData: any }> = [];

    // Strategy 1: Attempt collectionGroup search for scheduledTasks
    try {
      const groupSnapshot = await getDocs(collectionGroup(db, 'scheduledTasks'));
      groupSnapshot.forEach((taskDoc) => {
        const taskData = taskDoc.data();
        if (!taskData.isActive) return;

        const userId = taskDoc.ref.parent.parent ? taskDoc.ref.parent.parent.id : 'guest';
        tasksToProcess.push({
          userId,
          taskId: taskDoc.id,
          taskData
        });
      });
    } catch (groupErr: any) {
      // Fallback silently or log simple note if collectionGroup is not available
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[ScheduledTasks] collectionGroup fallback to user iteration:', groupErr?.message || groupErr);
      }
    }

    // Strategy 2: If collectionGroup found nothing or failed, loop over known users + guest
    if (tasksToProcess.length === 0) {
      const userIds = ['guest'];
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.docs.forEach(d => {
          if (!userIds.includes(d.id)) userIds.push(d.id);
        });
      } catch (e) {}

      for (const uid of userIds) {
        try {
          const tasksSnapshot = await getDocs(collection(db, 'users', uid, 'scheduledTasks'));
          tasksSnapshot.docs.forEach((taskDoc) => {
            const taskData = taskDoc.data();
            if (taskData.isActive) {
              tasksToProcess.push({
                userId: uid,
                taskId: taskDoc.id,
                taskData
              });
            }
          });
        } catch (e) {}
      }
    }

    for (const item of tasksToProcess) {
      const { userId, taskId, taskData } = item;

      // Safe parse nextRunAt date
      let nextRunAtDate: Date | null = null;
      if (taskData.nextRunAt?.toDate && typeof taskData.nextRunAt.toDate === 'function') {
        nextRunAtDate = taskData.nextRunAt.toDate();
      } else if (taskData.nextRunAt?.seconds) {
        nextRunAtDate = new Date(taskData.nextRunAt.seconds * 1000);
      } else if (taskData.nextRunAt) {
        const parsed = new Date(taskData.nextRunAt);
        if (!isNaN(parsed.getTime())) nextRunAtDate = parsed;
      }

      if (!nextRunAtDate) continue;

      if (now.getTime() >= nextRunAtDate.getTime()) {
        console.log(`[ScheduledTasks] Executing scheduled task '${taskData.title}' (${taskId}) for user '${userId}'`);
        await executeScheduledTaskNow(userId, taskId, taskData);
      }
    }
  } catch (err) {
    console.error("[ScheduledTasks] Erro fatal na rotina de processamento:", err);
  }
}
