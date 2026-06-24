import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFirebaseAdminEnv } from "@/lib/firebase-admin-credentials";

const ADMIN_APP = "swing-org-admin";

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;
let adminRtdb: Database | undefined;
let initError: Error | undefined;

function resolveDatabaseUrl(projectId?: string): string | undefined {
  const e = process.env.FIREBASE_DATABASE_URL?.trim() || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
  if (e) return e;
  return projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined;
}

function resolveStorageBucket(projectId?: string): string {
  const e = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (e) return e.replace(/^gs:\/\//, "");
  if (projectId) return `${projectId}.firebasestorage.app`;
  throw new Error("Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
}

function ensureAdminApp(): App {
  if (adminApp) return adminApp;
  if (initError) throw initError;
  const existing = getApps().find((a) => a.name === ADMIN_APP);
  if (existing) { adminApp = existing; return adminApp; }

  const env = readFirebaseAdminEnv();
  if (!env) {
    initError = new Error("Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
    throw initError;
  }

  const databaseURL  = resolveDatabaseUrl(env.projectId);
  const storageBucket = resolveStorageBucket(env.projectId);

  try {
    adminApp = initializeApp(
      { projectId: env.projectId, credential: cert(env), storageBucket, ...(databaseURL ? { databaseURL } : {}) },
      ADMIN_APP,
    );
  } catch (err) {
    initError = err instanceof Error ? err : new Error("Firebase Admin init failed");
    throw initError;
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (!adminDb) adminDb = getFirestore(ensureAdminApp());
  return adminDb;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) adminAuth = getAuth(ensureAdminApp());
  return adminAuth;
}

export function getAdminRtdb(): Database {
  if (!adminRtdb) adminRtdb = getDatabase(ensureAdminApp());
  return adminRtdb;
}

export function getAdminBucket() {
  const env = readFirebaseAdminEnv();
  return getStorage(ensureAdminApp()).bucket(resolveStorageBucket(env?.projectId));
}
