import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, query, where, orderBy, onSnapshot, getDoc } from 'firebase/firestore';

export interface WriterDocument {
  id: string;
  title: string;
  content: string;
  userId: string;
  updatedAt: number;
  chatSessionId: string | null; // Associates with a ChatSession id
}

export const subscribeWriterDocuments = (userId: string, callback: (docs: WriterDocument[]) => void) => {
  const q = query(
    collection(db, 'writer_documents'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as WriterDocument[];
    callback(docs);
  }, (error) => {
    console.error('Error subscribing to writer docs:', error);
    callback([]);
  });
};

export const saveWriterDocument = async (docData: WriterDocument) => {
  try {
    const docRef = doc(db, 'writer_documents', docData.id);
    await setDoc(docRef, docData);
  } catch (err) {
    console.error('Error saving writer document:', err);
  }
};

export const deleteWriterDocument = async (docId: string) => {
  try {
    const docRef = doc(db, 'writer_documents', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting writer document:', err);
  }
};