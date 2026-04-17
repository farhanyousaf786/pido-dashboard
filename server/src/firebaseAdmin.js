import admin from 'firebase-admin';
import fs from 'node:fs';

let initialized = false;

export function getAdminApp() {
  if (initialized) return admin;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountJson && String(serviceAccountJson).trim()) {
    const serviceAccount = JSON.parse(String(serviceAccountJson));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (serviceAccountPath) {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Will work only if Application Default Credentials are available
    admin.initializeApp();
  }

  initialized = true;
  return admin;
}
