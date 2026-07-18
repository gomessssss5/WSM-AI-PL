import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  Timestamp 
} from 'firebase/firestore';

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  updatedAt?: any;
  isOfficial?: boolean;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeSkills = (
  userId: string,
  onUpdate: (skills: Skill[]) => void
) => {
  const path = `users/${userId}/skills`;
  const skillsCollectionRef = collection(db, 'users', userId, 'skills');
  const q = query(skillsCollectionRef);

  return onSnapshot(q, (snapshot) => {
    const skillsList: Skill[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      skillsList.push({
        id: docSnap.id,
        name: data.name || docSnap.id,
        description: data.description || '',
        content: data.content || '',
        isOfficial: data.isOfficial || false,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date())
      });
    });
    onUpdate(skillsList);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const saveSkill = async (userId: string, skill: Skill): Promise<void> => {
  if (!userId) return;
  const path = `users/${userId}/skills/${skill.id}`;
  const skillDocRef = doc(db, 'users', userId, 'skills', skill.id);
  try {
    await setDoc(skillDocRef, {
      name: skill.name,
      description: skill.description,
      content: skill.content,
      isOfficial: skill.isOfficial || false,
      updatedAt: Timestamp.now()
    }, { merge: true });
    console.log(`[skills.ts] Saved skill ${skill.name} successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteSkillFromDb = async (userId: string, skillId: string): Promise<void> => {
  if (!userId) return;
  const path = `users/${userId}/skills/${skillId}`;
  const skillDocRef = doc(db, 'users', userId, 'skills', skillId);
  try {
    await deleteDoc(skillDocRef);
    console.log(`[skills.ts] Deleted skill ${skillId} successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
