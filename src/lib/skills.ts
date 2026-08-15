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
  version?: string;
  scope?: string;
  permissions?: string[];
  allowed_tools?: string[];
  input_schema?: string;
  output_schema?: string;
  estimated_time?: string;
  estimated_cost?: string;
  compatibility?: string;
  limits?: string;
  approval_policy?: string;
  acceptance_tests?: string[];
  expected_artifacts?: string[];
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

export function buildDeclarativeSkillManifest(skills: Skill[], mode: 'uma_skill' | 'pipeline'): string {
  if (!skills || skills.length === 0) return '';
  
  if (mode === 'uma_skill' || skills.length === 1) {
    const s = skills[0];
    return `[PACOTE_SKILL_DECLARATIVO: modo="uma_skill", id="${s.id}"]
- Nome: ${s.name} (v${s.version || '1.6.0'})
- Descrição: ${s.description}
- Escopo: ${s.scope || 'Módulo Agêntico'}
- Ferramentas Permitidas: ${s.allowed_tools?.join(', ') || 'Nenhuma'}
- Schema de Entrada: ${s.input_schema || '{}'}
- Schema de Saída: ${s.output_schema || '{}'}
- Permissões: ${s.permissions?.join(', ') || 'Nenhuma'}
- Custo Estimado: ${s.estimated_cost || 'Grátis'}
- Tempo Estimado: ${s.estimated_time || '< 10s'}
- Política de Aprovação: ${s.approval_policy || 'Aprovação Automática'}
- Testes de Aceitação: ${s.acceptance_tests?.join(' | ') || 'Validação padrão'}
- Artefatos Esperados: ${s.expected_artifacts?.join(', ') || 'Nenhum'}

--- DIRETRIZES DA SKILL ---
${s.content}`;
  } else {
    const stepsManifest = skills.map((s, idx) => `
--- PASSO ${idx + 1} DE ${skills.length}: SKILL "${s.name}" (v${s.version || '1.6.0'}) ---
- Precedência de Execução: Passo ${idx + 1} ${idx === 0 ? '(Execução Primária / Geradora)' : `(Execução Secundária - Consome saída do Passo ${idx}: ${skills[idx - 1].name})`}
- Ferramentas Permitidas: ${s.allowed_tools?.join(', ') || 'Nenhuma'}
- Schema de Entrada: ${s.input_schema || '{}'}
- Schema de Saída: ${s.output_schema || '{}'}
- Permissões: ${s.permissions?.join(', ') || 'Nenhuma'}
- Política de Aprovação: ${s.approval_policy || 'Aprovação Automática'}
- Testes de Aceitação: ${s.acceptance_tests?.join(' | ') || 'Validação padrão'}
- Artefatos Esperados: ${s.expected_artifacts?.join(', ') || 'Nenhum'}

--- DIRETRIZES DO PASSO ${idx + 1} ---
${s.content}
`).join('\n');

    return `[PIPELINE_DE_SKILLS_DECLARATIVO: modo="pipeline", total_passos=${skills.length}]
${stepsManifest}

[PIPELINE_DATA_FLOW & PRECEDÊNCIA]:
As skills acima formam uma esteira de execução sequencial (Pipeline).
1. O Passo 1 é executado primeiro, produzindo seus artefatos e saídas tipadas.
2. Cada passo subsequente N consome os resultados do passo N-1 como contexto de entrada.
3. Todos os artefatos finais declarados nos passos devem ser validados contra os testes de aceitação antes da entrega final.`;
  }
}

