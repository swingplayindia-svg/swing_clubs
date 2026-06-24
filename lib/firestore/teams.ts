"use client";

import {
  addDoc, collection, deleteDoc, doc, getDocs,
  onSnapshot, orderBy, query, updateDoc, where, type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Team } from "@/lib/schemas/team";

function teamsRef(clubId: string, tournamentId?: string) {
  if (tournamentId) return collection(getDb(), "clubs", clubId, "tournaments", tournamentId, "teams");
  return collection(getDb(), "clubs", clubId, "teams");
}

export async function getTeams(clubId: string, tournamentId?: string): Promise<Team[]> {
  const snap = await getDocs(query(teamsRef(clubId, tournamentId), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}

export function subscribeTeams(clubId: string, cb: (teams: Team[]) => void, tournamentId?: string): Unsubscribe {
  return onSnapshot(query(teamsRef(clubId, tournamentId), orderBy("createdAt", "asc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team)));
  });
}

export async function createTeam(clubId: string, data: Omit<Team, "id">, tournamentId?: string): Promise<string> {
  const ref = await addDoc(teamsRef(clubId, tournamentId), { ...data, createdAt: Date.now(), updatedAt: Date.now() });
  return ref.id;
}

export async function updateTeam(clubId: string, teamId: string, data: Partial<Team>, tournamentId?: string): Promise<void> {
  const ref = tournamentId
    ? doc(getDb(), "clubs", clubId, "tournaments", tournamentId, "teams", teamId)
    : doc(getDb(), "clubs", clubId, "teams", teamId);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteTeam(clubId: string, teamId: string, tournamentId?: string): Promise<void> {
  const ref = tournamentId
    ? doc(getDb(), "clubs", clubId, "tournaments", tournamentId, "teams", teamId)
    : doc(getDb(), "clubs", clubId, "teams", teamId);
  await deleteDoc(ref);
}

export async function getTeamsBySport(clubId: string, sport: string): Promise<Team[]> {
  const snap = await getDocs(query(collection(getDb(), "clubs", clubId, "teams"), where("sport", "==", sport)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}
