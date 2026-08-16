const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

admin.initializeApp();
const db = getFirestore();

async function run() {
  try {
    const usersSnapshot = await db.collection('users').get();
    for (const userDoc of usersSnapshot.docs) {
      console.log("User:", userDoc.id);
      const skillsRef = db.collection('users').doc(userDoc.id).collection('skills');
      const skillsSnapshot = await skillsRef.get();
      
      for (const doc of skillsSnapshot.docs) {
        const data = doc.data();
        console.log("  Skill ID:", doc.id, "Name:", data.name);
      }
    }
  } catch(e) {
    console.error(e);
  }
}
run();
