"use client";

import {
  addDoc, collection, doc, getDocs, onSnapshot,
  orderBy, query, updateDoc, where, type Unsubscribe, getDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Match } from "@/lib/schemas/match";

function matchesRef(clubId: string, tournamentId?: string) {
  if (tournamentId) return collection(getDb(), "clubs", clubId, "tournaments", tournamentId, "matches");
  return collection(getDb(), "clubs", clubId, "matches");
}

export async function getMatches(clubId: string, tournamentId?: string): Promise<Match[]> {
  const snap = await getDocs(query(matchesRef(clubId, tournamentId), orderBy("matchDate", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));
}

export async function getMatch(clubId: string, matchId: string, tournamentId?: string): Promise<Match | null> {
  const ref = tournamentId
    ? doc(getDb(), "clubs", clubId, "tournaments", tournamentId, "matches", matchId)
    : doc(getDb(), "clubs", clubId, "matches", matchId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Match;
}

export function subscribeMatches(clubId: string, cb: (matches: Match[]) => void, tournamentId?: string): Unsubscribe {
  return onSnapshot(query(matchesRef(clubId, tournamentId), orderBy("matchDate", "asc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
  });
}

export function subscribeLiveMatches(clubId: string, cb: (matches: Match[]) => void): Unsubscribe {
  return onSnapshot(query(collection(getDb(), "clubs", clubId, "matches"), where("status", "==", "live")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
  });
}

export async function createMatch(clubId: string, data: Omit<Match, "id">, tournamentId?: string): Promise<string> {
  const ref = await addDoc(matchesRef(clubId, tournamentId), { ...data, createdAt: Date.now(), updatedAt: Date.now() });
  return ref.id;
}

export async function updateMatch(clubId: string, matchId: string, data: Partial<Match>, tournamentId?: string): Promise<void> {
  const ref = tournamentId
    ? doc(getDb(), "clubs", clubId, "tournaments", tournamentId, "matches", matchId)
    : doc(getDb(), "clubs", clubId, "matches", matchId);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function getUpcomingMatches(clubId: string, days = 7): Promise<Match[]> {
  const now  = Date.now();
  const end  = now + days * 86_400_000;
  const snap = await getDocs(
    query(collection(getDb(), "clubs", clubId, "matches"),
      where("matchDate", ">=", now),
      where("matchDate", "<=", end),
      where("status", "==", "scheduled"),
      orderBy("matchDate", "asc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));
}
