import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let rtdb: Database | undefined;
let storage: FirebaseStorage | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") throw new Error("Firebase client unavailable on server");
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb(): Firestore {
  if (typeof window === "undefined") throw new Error("Firestore client unavailable on server");
  if (!db) {
    const a = getFirebaseApp();
    try {
      db = initializeFirestore(a, { experimentalForceLongPolling: true });
    } catch {
      db = getFirestore(a);
    }
  }
  return db;
}

export function getRtdb(): Database {
  if (typeof window === "undefined") throw new Error("RTDB client unavailable on server");
  if (!rtdb) rtdb = getDatabase(getFirebaseApp());
  return rtdb;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (typeof window === "undefined") throw new Error("Storage client unavailable on server");
  if (!storage) storage = getStorage(getFirebaseApp());
  return storage;
}
