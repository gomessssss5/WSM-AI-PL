import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnapshot.docs) {
      console.log("User:", userDoc.id);
      const skillsRef = collection(db, 'users', userDoc.id, 'skills');
      const skillsSnapshot = await getDocs(skillsRef);
      
      for (const docSnapshot of skillsSnapshot.docs) {
        const data = docSnapshot.data();
        console.log("  Skill ID:", docSnapshot.id, "Name:", data.name);
        if ((data.name && data.name.toLowerCase() === 'user') || docSnapshot.id.toLowerCase() === 'user') {
          console.log("  => Deleting skill:", docSnapshot.id);
          await deleteDoc(doc(db, 'users', userDoc.id, 'skills', docSnapshot.id));
        }
      }
    }
    console.log("Done");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
