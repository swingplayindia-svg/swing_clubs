"use client";

import {
  addDoc, collection, doc, getDocs, onSnapshot,
  orderBy, query, updateDoc, type Unsubscribe,
} from "firebase/firestore";
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

export async function createTournament(clubId: string, data: Omit<Tournament, "id">): Promise<string> {
  const ref = await addDoc(tournamentsRef(clubId), { ...data, createdAt: Date.now(), updatedAt: Date.now() });
  return ref.id;
}

export async function updateTournament(clubId: string, tournamentId: string, data: Partial<Tournament>): Promise<void> {
  await updateDoc(doc(getDb(), "clubs", clubId, "tournaments", tournamentId), { ...data, updatedAt: Date.now() });
}

export async function getTopPlayers(clubId: string, tournamentId: string): Promise<TopPlayer[]> {
  const snap = await getDocs(query(collection(getDb(), "clubs", clubId, "tournaments", tournamentId, "topPlayers")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TopPlayer));
}
