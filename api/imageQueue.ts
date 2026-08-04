import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: any = null;

export function getDb() {
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
      console.log('[Ranking Virtual] Firebase/Firestore backend conectado com sucesso!');
    }
  } catch (err) {
    console.warn('[Ranking Virtual] Erro ao conectar Firestore backend:', err);
  }
  return dbInstance;
}

export async function getCachedGeneratedImage(prompt: string): Promise<string | null> {
  const db = getDb();
  if (!db || !prompt) return null;
  try {
    const promptHash = Buffer.from(prompt.trim().toLowerCase()).toString('hex').substring(0, 40);
    const docSnap = await getDoc(doc(db, 'generated_images', promptHash));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.imgUrl) {
        return data.imgUrl;
      }
    }
  } catch (e) {
    console.warn('[ImagePersistence] Failed to get cached image:', e);
  }
  return null;
}

export async function saveGeneratedImageAndSyncSession(
  prompt: string,
  imgUrl: string,
  userInfo?: { uid?: string; email?: string; displayName?: string },
  sessionId?: string
): Promise<void> {
  const db = getDb();
  if (!db || !prompt || !imgUrl) return;
  try {
    const promptHash = Buffer.from(prompt.trim().toLowerCase()).toString('hex').substring(0, 40);
    
    // 1. Save image to global cache
    await setDoc(doc(db, 'generated_images', promptHash), {
      prompt,
      imgUrl,
      createdAt: new Date().toISOString(),
      userId: userInfo?.uid || '',
      userEmail: userInfo?.email || ''
    }, { merge: true });

    // 2. Sync to session document in Firestore if userId & sessionId exist
    if (userInfo?.uid && sessionId) {
      const sessionRef = doc(db, 'users', userInfo.uid, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        if (Array.isArray(sessionData.messages)) {
          let updated = false;
          const escapedPrompt = prompt.replace(/"/g, '&quot;');
          const updatedMessages = sessionData.messages.map((m: any) => {
            if (typeof m.text === 'string' && m.text.includes('<wsm_image')) {
              const replacedText = m.text
                .replace(/<wsm_image\s+prompt="[^"]*"\s+imgUrl=""\s*\/>/gi, `<wsm_image prompt="${escapedPrompt}" imgUrl="${imgUrl}" />`)
                .replace(/<wsm_image\s+prompt="[^"]*"\s+imgUrl=''\s*\/>/gi, `<wsm_image prompt="${escapedPrompt}" imgUrl="${imgUrl}" />`);
              
              if (replacedText !== m.text) {
                updated = true;
                return { ...m, text: replacedText };
              }
            }
            return m;
          });

          if (updated) {
            await updateDoc(sessionRef, {
              messages: updatedMessages,
              updatedAt: new Date().toISOString()
            });
            console.log(`[ImagePersistence] Session ${sessionId} for user ${userInfo.uid} directly synced in Firestore!`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[ImagePersistence] Failed to sync generated image to Firestore session:', err);
  }
}

export interface QueueItem {
  id: string;
  prompt: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
}

class ImageRankingQueueManager {
  private queue: QueueItem[] = [];
  private activeProcessingCount = 0;
  private maxConcurrent = 3;

  async enqueue(prompt: string, userInfo?: { email?: string; displayName?: string; uid?: string }): Promise<string> {
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const userEmail = userInfo?.email || 'Anônimo';
    const userName = userInfo?.displayName || (userInfo?.email ? userInfo.email.split('@')[0] : 'Usuário WSM');
    const userId = userInfo?.uid || '';

    const newItem: QueueItem = {
      id,
      prompt,
      userEmail,
      userName,
      userId,
      status: 'queued',
      createdAt: Date.now()
    };

    this.queue.push(newItem);

    const position = this.getPosition(id);
    console.log(`[Ranking Virtual] Nova solicitação adicionada ao ranking: ${id} | Posição: #${position} | Usuário: ${userEmail}`);

    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, 'image_generation_ranking', id), {
          id,
          prompt,
          userEmail,
          userName,
          userId,
          status: 'queued',
          position,
          createdAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[Ranking Virtual] Salvo no banco de dados Firestore com sucesso (${id})`);
      } catch (e) {
        console.error(`[Ranking Virtual] Erro ao gravar item no banco (${id}):`, e);
      }
    }

    return id;
  }

  getPosition(id: string): number {
    const index = this.queue.findIndex(item => item.id === id);
    return index !== -1 ? index + 1 : 999;
  }

  async waitForTurn(id: string, timeoutMs = 120000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const position = this.getPosition(id);
      
      // Top 3 (positions 1, 2, 3) are eligible to process if active processing < 3
      if (position <= this.maxConcurrent && this.activeProcessingCount < this.maxConcurrent) {
        const item = this.queue.find(i => i.id === id);
        if (item && item.status === 'queued') {
          item.status = 'processing';
          this.activeProcessingCount++;
          console.log(`[Ranking Virtual] Solicitação ${id} entrou no Top 3 (Posição #${position}). Encaminhando para geração no Horde AI... (Ativos: ${this.activeProcessingCount}/${this.maxConcurrent})`);

          const db = getDb();
          if (db) {
            try {
              await setDoc(doc(db, 'image_generation_ranking', id), {
                status: 'processing',
                startedAt: new Date().toISOString()
              }, { merge: true });
            } catch (e) {
              console.error(`[Ranking Virtual] Erro ao atualizar status no banco (${id}):`, e);
            }
          }
          return;
        }
      }

      // Wait 300ms before checking position again
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error("Tempo limite de espera na fila do ranking excedido.");
  }

  async complete(id: string, success: boolean, resultUrl?: string, errorMsg?: string): Promise<void> {
    const itemIndex = this.queue.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      const item = this.queue[itemIndex];
      if (item.status === 'processing') {
        this.activeProcessingCount = Math.max(0, this.activeProcessingCount - 1);
      }
      this.queue.splice(itemIndex, 1);
      console.log(`[Ranking Virtual] Imagem processada (${id}). Removida da fila ativa. (Ativos restantes: ${this.activeProcessingCount}/${this.maxConcurrent})`);
    }

    const db = getDb();
    if (db) {
      try {
        await deleteDoc(doc(db, 'image_generation_ranking', id));
        console.log(`[Ranking Virtual] Solicitação removida do banco de dados Firestore (${id})`);
      } catch (e) {
        console.error(`[Ranking Virtual] Erro ao remover item do banco (${id}):`, e);
      }
    }

    this.updateDbPositions();
  }

  private async updateDbPositions() {
    const db = getDb();
    if (!db) return;
    try {
      for (let i = 0; i < this.queue.length; i++) {
        const item = this.queue[i];
        await setDoc(doc(db, 'image_generation_ranking', item.id), {
          position: i + 1
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      // Ignore background position update errors
    }
  }
}

export const imageRankingQueue = new ImageRankingQueueManager();
