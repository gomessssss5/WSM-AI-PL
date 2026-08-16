import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { 
  isGmailUser, 
  sendWelcomeEmail, 
  sendInactivityEmail, 
  sendFeatureHighlightEmail, 
  sendMonthlyCampaignEmail 
} from './emailService.js';

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
      console.log('[EmailAutomation] Conectado ao Firestore Admin SDK para automações de e-mail.');
    }
  } catch (err) {
    console.warn('[EmailAutomation] Erro ao conectar ao Firestore Admin SDK:', err);
  }
  return dbInstance;
}

export async function runAllEmailAutomations(): Promise<{ processedUsers: number; emailsSent: number }> {
  const db = getDb();
  if (!db) {
    console.warn("[EmailAutomation] Firestore Admin SDK não configurado. Pulando ciclo de automação.");
    return { processedUsers: 0, emailsSent: 0 };
  }

  let processedUsers = 0;
  let emailsSent = 0;

  try {
    const usersSnapshot = await db.collection('users').get();
    const now = new Date();
    const currentDayOfMonth = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric' }).format(now));
    const todayCampaignKey = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

    for (const userDoc of usersSnapshot.docs) {
      const uData = userDoc.data();
      const email = uData.email;
      const userId = userDoc.id;

      // Strict Rule: ONLY send to @gmail.com users
      if (!email || !isGmailUser(email)) {
        continue;
      }

      processedUsers++;
      const userRef = db.collection('users').doc(userId);
      const updatesToSave: Record<string, any> = {};

      // 1. Welcome Email Check
      if (!uData.welcomeEmailSent) {
        console.log(`[EmailAutomation] Enviando e-mail de Boas-Vindas para ${email}`);
        const res = await sendWelcomeEmail(email, uData.displayName);
        if (res.success) {
          emailsSent++;
          updatesToSave.welcomeEmailSent = true;
        }
      }

      // 2. Inactivity Emails Check
      let lastActiveTime = now.getTime();
      if (uData.lastInteraction?.toDate) {
        lastActiveTime = uData.lastInteraction.toDate().getTime();
      } else if (uData.lastInteraction?.seconds) {
        lastActiveTime = uData.lastInteraction.seconds * 1000;
      } else if (typeof uData.lastInteraction === 'number') {
        lastActiveTime = uData.lastInteraction;
      } else if (uData.updatedAt?.toDate) {
        lastActiveTime = uData.updatedAt.toDate().getTime();
      }

      const daysInactive = Math.floor((now.getTime() - lastActiveTime) / (1000 * 60 * 60 * 24));

      if (daysInactive >= 150 && !uData.inactivity150Sent) {
        console.log(`[EmailAutomation] Enviando e-mail de inatividade (150 dias) para ${email}`);
        const res = await sendInactivityEmail(email, 150);
        if (res.success) {
          emailsSent++;
          updatesToSave.inactivity150Sent = true;
          updatesToSave.inactivity60Sent = true;
          updatesToSave.inactivity30Sent = true;
          updatesToSave.inactivity15Sent = true;
          updatesToSave.inactivity10Sent = true;
          updatesToSave.inactivity5Sent = true;
        }
      } else if (daysInactive >= 60 && !uData.inactivity60Sent) {
        console.log(`[EmailAutomation] Enviando e-mail de inatividade (60 dias) para ${email}`);
        const res = await sendInactivityEmail(email, 60);
        if (res.success) {
          emailsSent++;
          updatesToSave.inactivity60Sent = true;
          updatesToSave.inactivity30Sent = true;
          updatesToSave.inactivity15Sent = true;
          updatesToSave.inactivity10Sent = true;
          updatesToSave.inactivity5Sent = true;
        }
      } else if (daysInactive >= 30 && !uData.inactivity30Sent) {
        console.log(`[EmailAutomation] Enviando e-mail de inatividade (30 dias) para ${email}`);
        const res = await sendInactivityEmail(email, 30);
        if (res.success) {
          emailsSent++;
          updatesToSave.inactivity30Sent = true;
          updatesToSave.inactivity15Sent = true;
          updatesToSave.inactivity10Sent = true;
          updatesToSave.inactivity5Sent = true;
        }
      } else if (daysInactive >= 15 && !uData.inactivity15Sent) {
        console.log(`[EmailAutomation] Enviando e-mail de inatividade (15 dias) para ${email}`);
        const res = await sendInactivityEmail(email, 15);
        if (res.success) {
          emailsSent++;
          updatesToSave.inactivity15Sent = true;
          updatesToSave.inactivity10Sent = true;
          updatesToSave.inactivity5Sent = true;
        }
      } else if (daysInactive >= 10 && !uData.inactivity10Sent) {
        console.log(`[EmailAutomation] Enviando e-mail de inatividade (10 dias) para ${email}`);
        const res = await sendInactivityEmail(email, 10);
        if (res.success) {
          emailsSent++;
          updatesToSave.inactivity10Sent = true;
          updatesToSave.inactivity5Sent = true;
        }
      } else if (daysInactive >= 5 && !uData.inactivity5Sent) {
        console.log(`[EmailAutomation] Enviando e-mail de inatividade (5 dias) para ${email}`);
        const res = await sendInactivityEmail(email, 5);
        if (res.success) {
          emailsSent++;
          updatesToSave.inactivity5Sent = true;
        }
      }

      // 3. Feature Highlight Every 10 Days Check
      let lastHighlightTime = 0;
      if (uData.last10DayHighlightSent?.toDate) {
        lastHighlightTime = uData.last10DayHighlightSent.toDate().getTime();
      } else if (uData.last10DayHighlightSent?.seconds) {
        lastHighlightTime = uData.last10DayHighlightSent.seconds * 1000;
      }

      let createdTime = lastActiveTime;
      if (uData.createdAt?.toDate) {
        createdTime = uData.createdAt.toDate().getTime();
      } else if (uData.createdAt?.seconds) {
        createdTime = uData.createdAt.seconds * 1000;
      }

      const daysSinceLastHighlight = lastHighlightTime > 0 
        ? Math.floor((now.getTime() - lastHighlightTime) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - createdTime) / (1000 * 60 * 60 * 24));

      if (daysSinceLastHighlight >= 10) {
        console.log(`[EmailAutomation] Enviando e-mail de recurso (10 em 10 dias) para ${email}`);
        const res = await sendFeatureHighlightEmail(email);
        if (res.success) {
          emailsSent++;
          updatesToSave.last10DayHighlightSent = Timestamp.now();
        }
      }

      // 4. Monthly Campaign Check (Days 1, 10, 25)
      if ([1, 10, 25].includes(currentDayOfMonth) && uData.lastMonthlyCampaignKey !== todayCampaignKey) {
        console.log(`[EmailAutomation] Enviando e-mail de campanha mensal (dia ${currentDayOfMonth}) para ${email}`);
        const res = await sendMonthlyCampaignEmail(email);
        if (res.success) {
          emailsSent++;
          updatesToSave.lastMonthlyCampaignKey = todayCampaignKey;
        }
      }

      // Save user updates if any
      if (Object.keys(updatesToSave).length > 0) {
        await userRef.update(updatesToSave).catch((err: any) => console.warn(`[EmailAutomation] Error updating user ${userId}:`, err));
      }
    }
  } catch (err: any) {
    if (err?.code === 7 || (err?.message && (err.message.includes('PERMISSION_DENIED') || err.message.includes('Missing or insufficient permissions')))) {
      console.warn("[EmailAutomation] Firestore Admin SDK sem permissões de acesso ao banco (PERMISSION_DENIED). As automações de e-mail foram ignoradas com segurança. Para habilitá-las, configure as credenciais da Service Account do Firebase.");
    } else {
      console.error("[EmailAutomation] Erro ao executar automações de e-mail:", err?.message || err);
    }
  }

  return { processedUsers, emailsSent };
}
