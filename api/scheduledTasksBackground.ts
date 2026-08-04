import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
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

export async function processBackgroundTasks() {
  const db = getDb();
  if (!db) return;

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const now = new Date();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userEmail = userDoc.data()?.email;
      
      const tasksSnapshot = await getDocs(collection(db, 'users', userId, 'scheduledTasks'));
      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();
        if (!taskData.isActive) continue;
        
        const nextRunAt = taskData.nextRunAt?.toDate ? taskData.nextRunAt.toDate() : new Date(taskData.nextRunAt);
        
        if (now.getTime() >= nextRunAt.getTime()) {
          console.log(`[ScheduledTasks] Executing task ${taskDoc.id} for user ${userId} in background`);
          
          const newSessionId = crypto.randomUUID();
          
          let newNextRunAt: Date | null = null;
          let newIsActive = true;
          
          if (taskData.scheduleType === 'once') {
            newIsActive = false;
            newNextRunAt = nextRunAt;
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
          
          await updateDoc(doc(db, 'users', userId, 'scheduledTasks', taskDoc.id), {
            lastRunAt: Timestamp.fromDate(now),
            nextRunAt: newNextRunAt ? Timestamp.fromDate(newNextRunAt) : taskData.nextRunAt,
            isActive: newIsActive
          });
          
          const executionId = crypto.randomUUID();
          await setDoc(doc(db, 'users', userId, 'taskExecutions', executionId), {
            taskId: taskDoc.id,
            taskTitle: taskData.title,
            executedAt: Timestamp.fromDate(now),
            sessionId: newSessionId,
            status: 'success'
          });
          
          const initialMessages = [
            {
              id: crypto.randomUUID(),
              sender: 'user',
              text: taskData.prompt,
              timestamp: Timestamp.fromDate(now)
            }
          ];
          
          await setDoc(doc(db, 'users', userId, 'sessions', newSessionId), {
            id: newSessionId,
            title: `[Em Segundo Plano] Tarefa: ${taskData.title}`,
            createdAt: Timestamp.fromDate(now),
            updatedAt: Timestamp.fromDate(now),
            messages: initialMessages,
            isUnread: true,
            isTemporary: false
          });
          
          let skills: any[] = [];
          try {
            const skillsSnapshot = await getDocs(collection(db, 'users', userId, 'skills'));
            skills = skillsSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          } catch (e) {
            console.error("Erro ao buscar skills do usuário:", e);
          }

          try {
            const res = await fetch("http://127.0.0.1:3000/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: taskData.prompt,
                isSearchEnabled: true,
                isScheduledExecution: true,
                model: 'WSM 1.6',
                skills: skills,
                userContext: `Usuário está offline. Esta é uma tarefa rodando automaticamente em segundo plano.`,
                history: []
              })
            });
            
            let aiText = "";
            let aiFinalSynthesis = "";
            let aiSearchSources: any[] = [];
            let aiSearchImages: any[] = [];
            let aiSearchSteps: any[] = [];
            
            if (res.ok) {
              const contentType = res.headers.get("content-type") || "";
              if (!contentType.includes("text/event-stream")) {
                const data = await res.json();
                aiText = data.text || data.error || "Nenhuma resposta gerada.";
                aiFinalSynthesis = data.text || data.finalSynthesis || "";
                aiSearchSources = data.searchSources || [];
                aiSearchImages = data.searchImages || [];
              } else {
                if (res.body) {
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
                        if (data.type === "plan") {
                          if (data.searchSteps) aiSearchSteps = data.searchSteps;
                        } else if (data.type === "step_complete") {
                          if (aiSearchSteps[data.index]) {
                            aiSearchSteps[data.index].sources = data.sources;
                            aiSearchSteps[data.index].isCompleted = true;
                          }
                        } else if (data.type === "chunk" && data.text) {
                          aiText += data.text;
                        } else if (data.type === "final") {
                          if (data.text) aiText = data.text;
                          if (data.finalSynthesis) aiFinalSynthesis = data.finalSynthesis;
                          if (data.searchSources) aiSearchSources = data.searchSources;
                          if (data.searchImages) aiSearchImages = data.searchImages;
                        } else if (data.text) {
                          aiText += data.text;
                        } else if (data.finalSynthesis) {
                          aiFinalSynthesis = data.finalSynthesis;
                        }
                      } catch (e) {}
                    }
                  }
                }
              }
            } else {
              aiText = `⚠️ Erro ao executar: ${res.statusText}`;
            }
            
            if (!aiText && !aiFinalSynthesis) {
              aiText = "Tarefa processada em segundo plano, mas nenhuma resposta de texto foi retornada.";
            }
            
            initialMessages.push({
              id: crypto.randomUUID(),
              sender: 'ai',
              text: aiText,
              finalSynthesis: aiFinalSynthesis,
              timestamp: Timestamp.fromDate(new Date()),
              isSearchMessage: true,
              searchSources: aiSearchSources,
              searchImages: aiSearchImages,
              searchSteps: aiSearchSteps,
              isSimulatingSearch: false
            } as any);
            
            await updateDoc(doc(db, 'users', userId, 'sessions', newSessionId), {
              messages: initialMessages,
              updatedAt: Timestamp.fromDate(new Date())
            });
            
            if (userEmail) {
               fetch("http://127.0.0.1:3000/api/send-scheduled-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  toEmail: userEmail,
                  taskTitle: taskData.title,
                  taskPrompt: taskData.prompt,
                  aiResponse: aiFinalSynthesis || aiText
                })
               }).catch(e => console.error("Erro ao enviar email em background", e));
            }
            
          } catch (e) {
            console.error("Fetch error to /api/chat na rotina de background:", e);
          }
        }
      }
    }
  } catch (err) {
    console.error("[ScheduledTasks] Erro fatal na rotina de processamento:", err);
  }
}
