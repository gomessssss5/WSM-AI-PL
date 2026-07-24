import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let db: any = null;

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
    db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
    console.log('[Ranking Virtual] Firebase/Firestore inicializado com sucesso no backend.');
  }
} catch (err) {
  console.warn('[Ranking Virtual] Não foi possível inicializar Firestore no backend:', err);
}

export interface QueueItem {
  id: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
}

class ImageRankingQueueManager {
  private queue: QueueItem[] = [];
  private activeProcessingCount = 0;
  private maxConcurrent = 3;

  async enqueue(prompt: string): Promise<string> {
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newItem: QueueItem = {
      id,
      prompt,
      status: 'queued',
      createdAt: Date.now()
    };

    this.queue.push(newItem);

    const position = this.getPosition(id);
    console.log(`[Ranking Virtual] Nova solicitação de imagem adicionada ao banco: ${id} | Posição no ranking: #${position}`);

    if (db) {
      try {
        await setDoc(doc(db, 'image_generation_ranking', id), {
          id,
          prompt,
          status: 'queued',
          position,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn(`[Ranking Virtual] Erro ao gravar item no banco (${id}):`, e);
      }
    }

    return id;
  }

  getPosition(id: string): number {
    const index = this.queue.findIndex(item => item.id === id);
    return index !== -1 ? index + 1 : 999;
  }

  async waitForTurn(id: string): Promise<void> {
    while (true) {
      const position = this.getPosition(id);
      
      // Top 3 (positions 1, 2, 3) are eligible to process if active processing < 3
      if (position <= this.maxConcurrent && this.activeProcessingCount < this.maxConcurrent) {
        const item = this.queue.find(i => i.id === id);
        if (item && item.status === 'queued') {
          item.status = 'processing';
          this.activeProcessingCount++;
          console.log(`[Ranking Virtual] Solicitação ${id} entrou no Top 3 (Posição #${position}). Encaminhando para geração no Horde AI... (Ativos: ${this.activeProcessingCount}/${this.maxConcurrent})`);

          if (db) {
            try {
              await updateDoc(doc(db, 'image_generation_ranking', id), {
                status: 'processing',
                startedAt: new Date().toISOString()
              });
            } catch (e) {
              console.warn(`[Ranking Virtual] Erro ao atualizar status no banco (${id}):`, e);
            }
          }
          return;
        }
      }

      // If position > 3 or max concurrent reached, keep waiting in the virtual ranking
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  async complete(id: string, success: boolean, resultUrl?: string, errorMsg?: string): Promise<void> {
    const itemIndex = this.queue.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      const item = this.queue[itemIndex];
      if (item.status === 'processing') {
        this.activeProcessingCount = Math.max(0, this.activeProcessingCount - 1);
      }
      // Remove from active queue list so subsequent requests advance in position
      this.queue.splice(itemIndex, 1);
      console.log(`[Ranking Virtual] Imagem gerada (${id}). Removida do ranking. Vaga liberada no Horde! (Ativos restantes: ${this.activeProcessingCount}/${this.maxConcurrent})`);
    }

    if (db) {
      try {
        await updateDoc(doc(db, 'image_generation_ranking', id), {
          status: success ? 'completed' : 'failed',
          resultUrl: resultUrl || '',
          error: errorMsg || '',
          completedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn(`[Ranking Virtual] Erro ao atualizar conclusão no banco (${id}):`, e);
      }
    }

    // Update remaining items' positions in the database background
    this.updateDbPositions();
  }

  private async updateDbPositions() {
    if (!db) return;
    try {
      for (let i = 0; i < this.queue.length; i++) {
        const item = this.queue[i];
        await updateDoc(doc(db, 'image_generation_ranking', item.id), {
          position: i + 1
        }).catch(() => {});
      }
    } catch (e) {
      // Ignore background position update errors
    }
  }
}

export const imageRankingQueue = new ImageRankingQueueManager();
