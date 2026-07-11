import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ChatSession, Message, Draft } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Converts firestore document data to local ChatSession object
const mapDocToSession = (id: string, data: any): ChatSession => {
  return {
    id,
    title: data.title || '',
    category: data.category || 'general',
    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp || Date.now()),
    messages: (data.messages || []).map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp || Date.now()),
      ...(msg.tableData && {
        tableData: {
          headers: msg.tableData.headers || [],
          rows: (msg.tableData.rows || []).map((r: any) => Array.isArray(r) ? r : (r.cells || []))
        }
      }),
      searchImages: msg.searchImages || [],
      searchSources: msg.searchSources || [],
      attachments: msg.attachments || []
    }))
  };
};

// Converts local ChatSession object to Firestore document data
const mapSessionToDoc = (session: ChatSession): any => {
  return {
    title: session.title,
    category: session.category || 'general',
    timestamp: Timestamp.fromDate(session.timestamp instanceof Date ? session.timestamp : new Date(session.timestamp)),
    messages: session.messages.map((msg) => ({
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      timestamp: Timestamp.fromDate(msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)),
      ...(msg.imageUrl && { imageUrl: msg.imageUrl }),
      ...(msg.codeBlock && { codeBlock: msg.codeBlock }),
      ...(msg.translationData && { translationData: msg.translationData }),
      ...(msg.tableData && { 
        tableData: {
          headers: msg.tableData.headers || [],
          rows: (msg.tableData.rows || []).map((row: any) => ({ cells: Array.isArray(row) ? row : [] }))
        }
      }),
      ...(msg.searchImages && { searchImages: msg.searchImages }),
      ...(msg.searchSources && { searchSources: msg.searchSources }),
      ...(msg.isSearchMessage !== undefined && { isSearchMessage: msg.isSearchMessage }),
      ...(msg.searchIntro && { searchIntro: msg.searchIntro }),
      ...(msg.searchSteps && { searchSteps: msg.searchSteps }),
      ...(msg.finalSynthesis && { finalSynthesis: msg.finalSynthesis }),
      ...(msg.isSimulatingSearch !== undefined && { isSimulatingSearch: msg.isSimulatingSearch }),
      ...(msg.attachments && { attachments: msg.attachments.map((a: any) => ({
        name: a.name,
        type: a.type,
        size: a.size,
        mimeType: a.mimeType || '',
        url: a.url || '',
      })) })
    }))
  };
};

/**
 * Subscribes to real-time updates for a user's chat sessions
 */
export const subscribeSessions = (
  userId: string,
  onUpdate: (sessions: ChatSession[]) => void
) => {
  const path = `users/${userId}/sessions`;
  const sessionsCollectionRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsCollectionRef, orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const sessionsList: ChatSession[] = [];
    snapshot.forEach((docSnap) => {
      sessionsList.push(mapDocToSession(docSnap.id, docSnap.data()));
    });
    onUpdate(sessionsList);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

/**
 * Creates or updates an entire chat session document in Firestore
 */
export const saveSession = async (userId: string, session: ChatSession): Promise<void> => {
  if (!userId) return;
  const path = `users/${userId}/sessions/${session.id}`;
  const sessionDocRef = doc(db, 'users', userId, 'sessions', session.id);
  const docData = mapSessionToDoc(session);
  try {
    await setDoc(sessionDocRef, docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Deletes a chat session from Firestore
 */
export const deleteSessionFromDb = async (userId: string, sessionId: string): Promise<void> => {
  if (!userId) return;
  const path = `users/${userId}/sessions/${sessionId}`;
  const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
  try {
    await deleteDoc(sessionDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeDrafts = (
  userId: string,
  onUpdate: (drafts: Record<string, Draft>) => void
) => {
  const path = `users/${userId}/drafts`;
  const draftsCollectionRef = collection(db, 'users', userId, 'drafts');
  
  return onSnapshot(draftsCollectionRef, (snapshot) => {
    const draftsMap: Record<string, Draft> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      draftsMap[docSnap.id] = {
        id: docSnap.id,
        inputValue: data.inputValue || '',
        attachedText: data.attachedText || '',
        attachments: data.attachments || [],
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp || Date.now()),
      };
    });
    onUpdate(draftsMap);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const saveDraft = async (userId: string, draftId: string, draft: Partial<Draft>): Promise<void> => {
  if (!userId || !draftId) return;
  const path = `users/${userId}/drafts/${draftId}`;
  const draftRef = doc(db, 'users', userId, 'drafts', draftId);
  
  try {
    await setDoc(draftRef, {
      ...draft,
      timestamp: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteDraft = async (userId: string, draftId: string): Promise<void> => {
  if (!userId || !draftId) return;
  const path = `users/${userId}/drafts/${draftId}`;
  const draftRef = doc(db, 'users', userId, 'drafts', draftId);
  
  try {
    await deleteDoc(draftRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
