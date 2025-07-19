// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

let app: App;

if (!getApps().length) {
  app = initializeApp({
    credential: cert(serviceAccount!),
  });
} else {
  app = getApp();
}

const db = getFirestore(app);

export { app, db };
