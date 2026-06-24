"use client";

import { ref, set, remove, onValue, onDisconnect } from "firebase/database";
import { getRtdb } from "@/lib/firebase";
import { presencePath } from "@/lib/rtdb/live-match";
import type { PresenceEntry } from "@/lib/schemas/live-match";

export function joinPresence(matchId: string, uid: string, entry: Omit<PresenceEntry, "connectedAt">): () => void {
  const db      = getRtdb();
  const myRef   = ref(db, `${presencePath(matchId)}/${uid}`);
  const payload = { ...entry, connectedAt: Date.now() };
  void set(myRef, payload);
  void onDisconnect(myRef).remove();
  return () => { void remove(myRef); };
}

export function subscribePresence(matchId: string, cb: (users: Record<string, PresenceEntry>) => void): () => void {
  const db = getRtdb();
  return onValue(ref(db, presencePath(matchId)), (snap) => {
    cb(snap.exists() ? (snap.val() as Record<string, PresenceEntry>) : {});
  });
}
