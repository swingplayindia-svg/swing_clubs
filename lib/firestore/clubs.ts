"use client";

import {
  collection, doc, getDoc, getDocs, onSnapshot,
  orderBy, query, updateDoc, where, type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Club, ClubMember, JoinRequest } from "@/lib/schemas/club";

export function clubsRef() { return collection(getDb(), "clubs"); }
export function clubRef(clubId: string) { return doc(getDb(), "clubs", clubId); }
export function membersRef(clubId: string) { return collection(getDb(), "clubs", clubId, "members"); }
export function joinRequestsRef(clubId: string) { return collection(getDb(), "clubs", clubId, "joinRequests"); }

export async function getClub(clubId: string): Promise<Club | null> {
  const snap = await getDoc(clubRef(clubId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Club;
}

export async function getClubsForUser(uid: string): Promise<Club[]> {
  const owned = await getDocs(query(clubsRef(), where("ownerId", "==", uid)));
  return owned.docs.map((d) => ({ id: d.id, ...d.data() } as Club));
}

export async function getAdminClubsForUser(uid: string): Promise<Club[]> {
  const memberDocs = await getDocs(collection(getDb(), "clubs"));
  const results: Club[] = [];
  for (const clubDoc of memberDocs.docs) {
    const memberSnap = await getDoc(doc(getDb(), "clubs", clubDoc.id, "members", uid));
    if (memberSnap.exists()) {
      const role = memberSnap.data()?.role;
      if (["owner", "admin", "scorekeeper", "commentator"].includes(role)) {
        results.push({ id: clubDoc.id, ...clubDoc.data() } as Club);
      }
    }
  }
  return results;
}

export function subscribeClub(clubId: string, cb: (club: Club | null) => void): Unsubscribe {
  return onSnapshot(clubRef(clubId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Club) : null);
  });
}

export async function updateClub(clubId: string, data: Partial<Club>): Promise<void> {
  await updateDoc(clubRef(clubId), { ...data, updatedAt: Date.now() });
}

export async function getMembers(clubId: string): Promise<ClubMember[]> {
  const snap = await getDocs(query(membersRef(clubId), orderBy("joinedAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClubMember));
}

export function subscribeMembers(clubId: string, cb: (members: ClubMember[]) => void): Unsubscribe {
  return onSnapshot(query(membersRef(clubId), orderBy("joinedAt", "asc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClubMember)));
  });
}

export async function updateMemberRole(clubId: string, userId: string, role: string): Promise<void> {
  await updateDoc(doc(getDb(), "clubs", clubId, "members", userId), { role });
}

export async function getJoinRequests(clubId: string): Promise<JoinRequest[]> {
  const snap = await getDocs(query(joinRequestsRef(clubId), where("status", "==", "pending"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JoinRequest));
}

export function subscribeJoinRequests(clubId: string, cb: (reqs: JoinRequest[]) => void): Unsubscribe {
  return onSnapshot(query(joinRequestsRef(clubId), where("status", "==", "pending")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JoinRequest)));
  });
}

export async function resolveJoinRequest(clubId: string, requestId: string, status: "approved" | "rejected"): Promise<void> {
  await updateDoc(doc(getDb(), "clubs", clubId, "joinRequests", requestId), {
    status,
    updatedAt: Date.now(),
  });
}
