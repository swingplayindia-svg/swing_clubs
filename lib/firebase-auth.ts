"use client";

import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";

let persistenceReady: Promise<void> | null = null;

async function ensurePersistence(): Promise<void> {
  if (!persistenceReady) {
    persistenceReady = setPersistence(getAuth(getFirebaseApp()), browserLocalPersistence).catch(() => undefined);
  }
  await persistenceReady;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  await ensurePersistence();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(getFirebaseAuth(), provider);
  return cred.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function waitForSignedInUser(timeoutMs = 12_000): Promise<FirebaseUser> {
  return ensurePersistence().then(
    () =>
      new Promise((resolve, reject) => {
        const auth = getFirebaseAuth();
        if (auth.currentUser) { resolve(auth.currentUser); return; }
        const t = setTimeout(() => { unsub(); reject(new Error("Auth timeout")); }, timeoutMs);
        const unsub = onAuthStateChanged(auth, (u) => {
          if (!u) return;
          clearTimeout(t);
          unsub();
          resolve(u);
        });
      }),
  );
}

export async function requireFirebaseUser(): Promise<FirebaseUser> {
  await ensurePersistence();
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  return waitForSignedInUser();
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = await requireFirebaseUser();
  return user.getIdToken();
}

export function subscribeToFirebaseAuth(cb: (u: FirebaseUser | null) => void): () => void {
  void ensurePersistence();
  return onAuthStateChanged(getFirebaseAuth(), cb);
}
