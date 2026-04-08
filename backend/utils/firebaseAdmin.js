const admin = require("firebase-admin");

let firebaseAdminApp = null;

const getFirebaseAdmin = () => {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : null;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  if (privateKey.startsWith("AIza")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY appears to be a Firebase web API key. Use the private_key value from a Firebase service account JSON instead."
    );
  }

  firebaseAdminApp = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

  return firebaseAdminApp;
};

module.exports = { getFirebaseAdmin };
