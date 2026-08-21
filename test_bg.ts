import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";

// Need to initialize admin first if not already
try {
  admin.initializeApp();
} catch (e) {}

async function test() {
  const start = Date.now();
  try {
    await getAuth().verifyIdToken("OmnixInternalSchedulerBypassToken_2026");
  } catch (e: any) {
    console.log("Error:", e.message);
  }
  console.log("Took", Date.now() - start, "ms");
}
test();
