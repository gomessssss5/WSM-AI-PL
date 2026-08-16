const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp();
const db = getFirestore();

async function run() {
  try {
    const usersSnapshot = await db.collection('users').get();
    for (const userDoc of usersSnapshot.docs) {
      console.log("Checking user:", userDoc.id);
      const skillsRef = db.collection('users').doc(userDoc.id).collection('skills');
      const skillsSnapshot = await skillsRef.get();
      
      for (const doc of skillsSnapshot.docs) {
        const data = doc.data();
        console.log("  Found skill:", doc.id, data.name);
        if ((data.name && data.name.toLowerCase() === 'user') || doc.id.toLowerCase() === 'user') {
          console.log("  => Deleting skill:", doc.id);
          await skillsRef.doc(doc.id).delete();
        }
      }
    }
    console.log("Done");
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
