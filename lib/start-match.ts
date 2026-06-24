"use client";

import { getFirebaseIdToken } from "@/lib/firebase-auth";

type StartMatchInput = {
  id: string;
  clubId: string;
  tournamentId?: string | null;
};

export async function startMatchLive(match: StartMatchInput): Promise<void> {
  const token = await getFirebaseIdToken();
  const res = await fetch(`/api/matches/${match.id}/start`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clubId:       match.clubId,
      tournamentId: match.tournamentId ?? null,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Failed to start match");
  }
}
