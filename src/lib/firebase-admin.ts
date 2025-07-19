// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let serviceAccount: any;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
    }
}


let app: App;

if (!getApps().length) {
    if (!serviceAccount) {
        throw new Error('Firebase service account key is not set or invalid. Please check your .env file.');
    }
  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApp();
}

const db = getFirestore(app);

export { app, db };
