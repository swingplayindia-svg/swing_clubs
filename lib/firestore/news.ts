"use client";

import {
  addDoc, collection, deleteDoc, doc, getDocs,
  onSnapshot, orderBy, query, updateDoc, type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { NewsPost } from "@/lib/schemas/news";

function newsRef(clubId: string) { return collection(getDb(), "clubs", clubId, "news"); }

export async function getNews(clubId: string): Promise<NewsPost[]> {
  const snap = await getDocs(query(newsRef(clubId), orderBy("publishedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsPost));
}

export function subscribeNews(clubId: string, cb: (posts: NewsPost[]) => void): Unsubscribe {
  return onSnapshot(query(newsRef(clubId), orderBy("publishedAt", "desc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsPost)));
  });
}

export async function createNewsPost(clubId: string, data: Omit<NewsPost, "id">): Promise<string> {
  const ref = await addDoc(newsRef(clubId), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updateNewsPost(clubId: string, postId: string, data: Partial<NewsPost>): Promise<void> {
  await updateDoc(doc(getDb(), "clubs", clubId, "news", postId), { ...data, updatedAt: Date.now() });
}

export async function deleteNewsPost(clubId: string, postId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "clubs", clubId, "news", postId));
}
