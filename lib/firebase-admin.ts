import * as admin from "firebase-admin";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (serviceAccountJson || projectId) {
  if (!admin.apps.length) {
    try {
      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, "").replace(/\\n/g, "\n")?.replace(/\\"/g, '"'),
          }),
        });
      }
    } catch (error) {
      console.error("Firebase admin initialization error", error);
    }
  }
}

// Export getters or conditionally set to prevent build crashes
const adminDb = admin.apps.length ? admin.firestore() : ({} as admin.firestore.Firestore);
const adminAuth = admin.apps.length ? admin.auth() : ({} as admin.auth.Auth);

export { adminDb, adminAuth, admin };


