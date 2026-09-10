import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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
      const app = getApps().length > 0 ? getApps()[0] : initializeApp({
        projectId: config.projectId
      });
      dbInstance = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
      console.log('[ScheduledTasks] Conectado ao Firestore Admin SDK em segundo plano.');
    }
  } catch (err) {
    console.warn('[ScheduledTasks] Erro ao conectar ao Firestore Admin SDK:', err);
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

export async function executeScheduledTaskNow(
  userId: string, 
  taskId: string, 
  taskData: any, 
  userAuthToken?: string,
  reqContext?: any
): Promise<{ success: boolean; aiResponse?: string; error?: string; sessionId?: string; session?: any; execution?: any }> {
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

  let secret = taskData.executionSecret;
  if (!secret) {
    secret = `task-secret-${crypto.randomUUID()}`;
    taskData.executionSecret = secret;
  }

  // Update task state in Firestore to 'iniciada' (running) while keeping isActive=true during execution
  try {
    await db.collection('users').doc(userId).collection('scheduledTasks').doc(taskId).update({
      lastRunAt: Timestamp.fromDate(now),
      lastStatus: 'iniciada',
      ...(newNextRunAt ? { nextRunAt: Timestamp.fromDate(newNextRunAt) } : {}),
      isActive: true, // Keep active while executing
      executionSecret: secret
    });
  } catch (e) {
    console.warn('[ScheduledTasks] Warning updating task doc state:', e);
  }

  const executionId = crypto.randomUUID();
  const runId = `run-${executionId.slice(0, 8)}`;
  const startedAt = new Date();
  const maxRetries = taskData.retryPolicy?.maxRetries || 3;
  const backoffSeconds = taskData.retryPolicy?.backoffSeconds || 10;

  // Create initial execution record with 'iniciada' status so the frontend shows state progression in real-time
  try {
    await db.collection('users').doc(userId).collection('taskExecutions').doc(executionId).set({
      id: executionId,
      runId: runId,
      taskId: taskId,
      taskTitle: taskData.title,
      executedAt: Timestamp.fromDate(startedAt),
      startedAt: Timestamp.fromDate(startedAt),
      status: 'iniciada',
      triggerType: taskData.triggerType || 'manual',
      sessionId: newSessionId,
      attempts: 1,
      maxRetries: maxRetries,
      outputSummary: "Iniciando execução...",
      generatedFiles: [],
      logs: [
        `[${startedAt.toISOString()}] Execução iniciada. Tipo: ${taskData.triggerType || 'manual'}.`,
        `[${startedAt.toISOString()}] Iniciando tentativa 1 de ${maxRetries}...`
      ]
    });
    console.log(`[ScheduledTasks] Created initial running taskExecution ${runId}`);
  } catch (e) {
    console.warn('[ScheduledTasks] Warning creating initial taskExecution record:', e);
  }

  const initialMessages = [
    {
      id: crypto.randomUUID(),
      sender: 'user',
      text: taskData.prompt,
      timestamp: Timestamp.fromDate(now)
    }
  ];

  let skills: any[] = [];
  try {
    const skillsSnapshot = await db.collection('users').doc(userId).collection('skills').get();
    skills = skillsSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Ignore skills error
  }

  let aiText = "";
  let aiFinalSynthesis = "";
  let executionStatus: 'success' | 'error' | 'needs_auth' = 'success';
  let executionError = "";
  let attempts = 0;

  const shouldForceFailure = taskData.prompt?.toLowerCase().includes("simular falha") || taskData.prompt?.toLowerCase().includes("force_failure");

  // Determine candidate URLs for connection
  const port = process.env.PORT || '3000';
  const candidateUrls: string[] = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  if (reqContext?.get && typeof reqContext.get === 'function') {
    const host = reqContext.get('host');
    if (host && !host.includes('127.0.0.1') && !host.includes('localhost')) {
      const proto = reqContext.protocol || (host.includes('localhost') ? 'http' : 'https');
      candidateUrls.push(`${proto}://${host}`);
    }
  }
  if (process.env.BASE_URL && !candidateUrls.includes(process.env.BASE_URL)) {
    candidateUrls.push(process.env.BASE_URL);
  }
  if (process.env.VERCEL_URL) {
    const vercelUrl = `https://${process.env.VERCEL_URL}`;
    if (!candidateUrls.includes(vercelUrl)) {
      candidateUrls.push(vercelUrl);
    }
  }

  // Determine effective auth header
  let effectiveAuthHeader = "Bearer OmnixInternalSchedulerBypassToken_2026";
  if (userAuthToken && userAuthToken.trim()) {
    effectiveAuthHeader = userAuthToken.startsWith('Bearer ') ? userAuthToken.trim() : `Bearer ${userAuthToken.trim()}`;
  } else if (taskData.userAuthToken) {
    effectiveAuthHeader = taskData.userAuthToken.startsWith('Bearer ') ? taskData.userAuthToken.trim() : `Bearer ${taskData.userAuthToken.trim()}`;
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": effectiveAuthHeader,
    "x-internal-secret": "OmnixInternalSchedulerBypassToken_2026",
    "x-task-execution-secret": taskData.executionSecret || "",
    "x-scheduled-task-id": taskId,
    "x-scheduled-task-user-id": userId,
    "x-scheduled-task-user-email": taskData.userEmail || taskData.createdByUserEmail || `${userId}@omnix.internal`
  };
  if (userAuthToken) {
    requestHeaders["x-user-auth-token"] = userAuthToken;
  }

  while (attempts < maxRetries) {
    attempts++;
    console.log(`[ScheduledTasks] Executing task ${taskId} (Attempt ${attempts}/${maxRetries})...`);
    try {
      if (shouldForceFailure && attempts < maxRetries) {
        throw new Error(`[Simulação de Falha] Erro forçado na tentativa ${attempts} de ${maxRetries} para testar a política de retentativas.`);
      }

      const requestPayload = {
        text: taskData.prompt,
        isSearchEnabled: true,
        isScheduledExecution: true,
        model: 'Omnix 1.6',
        skills: skills,
        userId: userId,
        userContext: `Execução automática de tarefa agendada em segundo plano. Tentativa ${attempts}/${maxRetries}.`,
        history: []
      };

      let res: any = null;
      let lastFetchErr: any = null;

      for (const base of candidateUrls) {
        try {
          const testRes = await fetch(`${base}/api/chat`, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(requestPayload)
          });
          res = testRes;
          break;
        } catch (fetchErr: any) {
          lastFetchErr = fetchErr;
        }
      }

      if (!res) {
        throw new Error(`Falha de conexão com os serviços internos: ${lastFetchErr?.message || lastFetchErr}`);
      }

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
        executionStatus = 'success';
        executionError = "";
        break; // exit loop on success
      } else {
        if (res.status === 401 || res.status === 419) {
          executionStatus = 'needs_auth';
          executionError = `[HTTP ${res.status} Unauthorized]: Falha de autenticação. Token de sessão do usuário expirado ou inválido. Reautenticação necessária.`;
          console.warn(`[ScheduledTasks] HTTP ${res.status} encountered for task ${taskId}. Halting execution.`);
          break; // Do not retry on 401/419 auth failure
        }
        throw new Error(`Erro HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (e: any) {
      if (executionStatus !== 'needs_auth') {
        executionStatus = 'error';
        executionError = e?.message || String(e);
      }
      aiText = `⚠️ Falha de execução: ${executionError}`;
      console.log(`[ScheduledTasks] Attempt ${attempts} failed: ${executionError}`);

      if (executionStatus === 'needs_auth') {
        break;
      }

      if (attempts < maxRetries) {
        console.log(`[ScheduledTasks] Backing off for ${backoffSeconds}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
      }
    }
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const finalOutput = aiFinalSynthesis || aiText || "Tarefa processada em segundo plano.";
  const searchSources: any[] = [];

  let createdSessionObj: any = null;

  // Create audit session document on both success and failure so "Ver Conversa" always opens the execution audit trail
  try {
    const isSuccess = executionStatus === 'success';
    const userMsg = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: taskData.prompt,
      timestamp: Timestamp.fromDate(now)
    };

    const aiMsgText = isSuccess 
      ? finalOutput 
      : `⚠️ [Falha na Execução Agendada]\n\n${executionError || 'Ocorreu uma falha no processamento da tarefa em segundo plano.'}\n\n**Detalhes da Execução:**\n- Status: ${executionStatus === 'needs_auth' ? 'Falha de Autenticação (HTTP 401/419)' : 'Falhou'}\n- Tentativas: ${attempts} de ${maxRetries}\n- Duração: ${(durationMs / 1000).toFixed(1)}s\n- ID da Tarefa: \`${taskId}\``;

    const aiMsg = {
      id: crypto.randomUUID(),
      sender: 'ai',
      text: aiMsgText,
      finalSynthesis: isSuccess ? (aiFinalSynthesis || '') : '',
      timestamp: Timestamp.fromDate(finishedAt),
      isSearchMessage: searchSources.length > 0,
      searchSources: searchSources
    };

    const sessionMessages = [userMsg, aiMsg];

    await db.collection('users').doc(userId).collection('sessions').doc(newSessionId).set({
      id: newSessionId,
      title: isSuccess ? `[Execução Agendada] ${taskData.title}` : `[Falha Agendada] ${taskData.title}`,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(finishedAt),
      timestamp: Timestamp.fromDate(finishedAt),
      messages: sessionMessages,
      isUnread: true,
      isTemporary: false,
      isScheduled: true
    });

    createdSessionObj = {
      id: newSessionId,
      title: isSuccess ? `[Execução Agendada] ${taskData.title}` : `[Falha Agendada] ${taskData.title}`,
      createdAt: now,
      updatedAt: finishedAt,
      timestamp: finishedAt,
      messages: [
        { ...userMsg, timestamp: now },
        { ...aiMsg, timestamp: finishedAt }
      ],
      isUnread: true,
      isTemporary: false,
      isScheduled: true
    };
  } catch (e) {
    console.warn('[ScheduledTasks] Warning creating session doc:', e);
  }

  // Record task execution log with complete agentic provenance

  // Extract generated files from AI response
  const generatedFiles: string[] = [];
  const fileRegex = /criou o arquivo `([^`]+)`|arquivo `([^`]+)` gravado|salvo em `([^`]+)`|gravou `([^`]+)`/gi;
  let fileMatch;
  while ((fileMatch = fileRegex.exec(finalOutput)) !== null) {
    const filename = fileMatch[1] || fileMatch[2] || fileMatch[3] || fileMatch[4];
    if (filename && !generatedFiles.includes(filename)) {
      generatedFiles.push(filename);
    }
  }

  try {
    await db.collection('users').doc(userId).collection('taskExecutions').doc(executionId).set({
      id: executionId,
      runId: runId,
      taskId: taskId,
      taskTitle: taskData.title,
      executedAt: Timestamp.fromDate(startedAt),
      startedAt: Timestamp.fromDate(startedAt),
      finishedAt: Timestamp.fromDate(finishedAt),
      durationMs: durationMs,
      triggerType: taskData.triggerType || 'manual',
      sessionId: newSessionId,
      status: executionStatus === 'success' ? 'succeeded' : executionStatus === 'needs_auth' ? 'needs_auth' : 'failed',
      attempts: attempts,
      maxRetries: maxRetries,
      outputSummary: finalOutput.slice(0, 400),
      generatedFiles: generatedFiles,
      logs: [
        `[${startedAt.toISOString()}] Execução iniciada. Tipo: ${taskData.triggerType || 'manual'}.`,
        `[${startedAt.toISOString()}] Tentativas executadas: ${attempts} de ${maxRetries}.`,
        ...(executionStatus === 'success' 
          ? [`[${finishedAt.toISOString()}] Execução concluída com sucesso. Duração: ${durationMs}ms.`]
          : executionStatus === 'needs_auth'
          ? [`[${finishedAt.toISOString()}] FALHA DE AUTENTICAÇÃO (HTTP 401/419): Reautenticação necessária.`]
          : [`[${finishedAt.toISOString()}] Falha na execução: ${executionError}`])
      ],
      ...(executionError ? { error: executionError, errorDetails: executionError } : {})
    });

    const isOnceTask = taskData.scheduleType === 'once';
    await db.collection('users').doc(userId).collection('scheduledTasks').doc(taskId).update({
      lastStatus: executionStatus === 'success' ? 'succeeded' : executionStatus === 'needs_auth' ? 'needs_auth' : 'failed',
      lastRunAt: Timestamp.fromDate(startedAt),
      lastOutput: finalOutput.slice(0, 200),
      lastExecutionDurationMs: durationMs,
      lastExecutionStatus: executionStatus === 'success' ? 'succeeded' : executionStatus === 'needs_auth' ? 'needs_auth' : 'failed',
      ...(isOnceTask ? { isActive: false } : {}),
      ...(executionError ? { lastErrorDetails: executionError } : {})
    });
  } catch (e) {
    console.warn('[ScheduledTasks] Warning recording task execution log:', e);
  }

  const createdExecutionObj = {
    id: executionId,
    runId: runId,
    taskId: taskId,
    taskTitle: taskData.title,
    executedAt: startedAt,
    startedAt: startedAt,
    finishedAt: finishedAt,
    durationMs: durationMs,
    triggerType: taskData.triggerType || 'manual',
    sessionId: newSessionId,
    status: executionStatus === 'success' ? 'succeeded' : executionStatus === 'needs_auth' ? 'needs_auth' : 'failed',
    attempts: attempts,
    maxRetries: maxRetries,
    outputSummary: finalOutput.slice(0, 400),
    generatedFiles: generatedFiles,
    ...(executionError ? { error: executionError, errorDetails: executionError } : {})
  };

  return {
    success: executionStatus === 'success',
    aiResponse: executionStatus === 'success' ? finalOutput : undefined,
    error: executionError,
    sessionId: newSessionId,
    session: createdSessionObj,
    execution: createdExecutionObj
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
      const groupSnapshot = await db.collectionGroup('scheduledTasks').get();
      groupSnapshot.forEach((taskDoc: any) => {
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
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[ScheduledTasks] collectionGroup fallback to user iteration:', groupErr?.message || groupErr);
      }
    }

    // Strategy 2: If collectionGroup found nothing or failed, loop over known users + guest
    if (tasksToProcess.length === 0) {
      const userIds = ['guest'];
      try {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.docs.forEach((d: any) => {
          if (!userIds.includes(d.id)) userIds.push(d.id);
        });
      } catch (e) {}

      for (const uid of userIds) {
        try {
          const tasksSnapshot = await db.collection('users').doc(uid).collection('scheduledTasks').get();
          tasksSnapshot.docs.forEach((taskDoc: any) => {
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
