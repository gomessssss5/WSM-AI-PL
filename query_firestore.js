import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Try to initialize using the credentials if they exist
let db;
try {
  // Try default credentials first
  initializeApp();
  db = getFirestore();
} catch (e) {
  console.log("Could not init default firebase admin:", e);
}

async function run() {
  if (!db) return;
  const docs = await db.collection('documents').limit(10).get();
  docs.forEach(doc => {
    console.log(doc.id, doc.data().title);
  });
}
run();
