"use client";

import {
  addDoc, collection, doc, getDoc, getDocs, onSnapshot,
  orderBy, query, updateDoc, type Unsubscribe,
} from "firebase/firestore";
import { stripUndefined } from "@/lib/firestore/sanitize";
import { getDb } from "@/lib/firebase";
import type { Tournament, TopPlayer } from "@/lib/schemas/tournament";

function tournamentsRef(clubId: string) {
  return collection(getDb(), "clubs", clubId, "tournaments");
}

export async function getTournaments(clubId: string): Promise<Tournament[]> {
  const snap = await getDocs(query(tournamentsRef(clubId), orderBy("startDate", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
}

export function subscribeTournaments(clubId: string, cb: (tournaments: Tournament[]) => void): Unsubscribe {
  return onSnapshot(query(tournamentsRef(clubId), orderBy("startDate", "desc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament)));
  });
}

export function subscribeTournament(
  clubId: string,
  tournamentId: string,
  cb: (tournament: Tournament | null) => void,
): Unsubscribe {
  const ref = doc(getDb(), "clubs", clubId, "tournaments", tournamentId);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Tournament) : null);
  });
}

export async function getTournament(clubId: string, tournamentId: string): Promise<Tournament | null> {
  const snap = await getDoc(doc(getDb(), "clubs", clubId, "tournaments", tournamentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Tournament;
}

export async function createTournament(clubId: string, data: Omit<Tournament, "id">): Promise<string> {
  const payload = stripUndefined({ ...data, createdAt: Date.now(), updatedAt: Date.now() } as Record<string, unknown>);
  const ref = await addDoc(tournamentsRef(clubId), payload);
  return ref.id;
}

export async function updateTournament(clubId: string, tournamentId: string, data: Partial<Tournament>): Promise<void> {
  const payload = stripUndefined({ ...data, updatedAt: Date.now() } as Record<string, unknown>);
  await updateDoc(doc(getDb(), "clubs", clubId, "tournaments", tournamentId), payload);
}

export async function getTopPlayers(clubId: string, tournamentId: string): Promise<TopPlayer[]> {
  const snap = await getDocs(query(collection(getDb(), "clubs", clubId, "tournaments", tournamentId, "topPlayers")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TopPlayer));
}
