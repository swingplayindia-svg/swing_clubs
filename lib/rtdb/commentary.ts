"use client";

import { ref, set, push, update, onValue, get } from "firebase/database";
import { getRtdb } from "@/lib/firebase";
import { commentaryPath } from "@/lib/rtdb/live-match";
import type { CommentaryEntry } from "@/lib/schemas/live-match";

export function subscribeCommentary(matchId: string, cb: (entries: CommentaryEntry[]) => void): () => void {
  const db = getRtdb();
  return onValue(ref(db, commentaryPath(matchId)), (snap) => {
    if (!snap.exists()) { cb([]); return; }
    const entries = Object.values(snap.val() as Record<string, CommentaryEntry>)
      .sort((a, b) => b.createdAt - a.createdAt);
    cb(entries);
  });
}

export async function addCommentaryEntry(
  matchId: string,
  entry: Omit<CommentaryEntry, "id">,
): Promise<string> {
  const db  = getRtdb();
  const key = push(ref(db, commentaryPath(matchId))).key!;
  await set(ref(db, `${commentaryPath(matchId)}/${key}`), { ...entry, id: key });
  return key;
}

export async function pinCommentaryEntry(matchId: string, entryId: string, pinned: boolean): Promise<void> {
  await update(ref(getRtdb(), `${commentaryPath(matchId)}/${entryId}`), { pinned });
}

export async function highlightCommentaryEntry(matchId: string, entryId: string, highlighted: boolean): Promise<void> {
  await update(ref(getRtdb(), `${commentaryPath(matchId)}/${entryId}`), { highlighted });
}

// Auto-generate commentary text from an event
export function autoCommentary(sport: string, eventType: string, teamName: string, playerName?: string, value?: number): string {
  switch (sport.toLowerCase()) {
    case "football": {
      if (eventType === "goal") return `GOAL! ${teamName}${playerName ? ` — ${playerName}` : ""} scores!`;
      if (eventType === "yellow_card") return `Yellow card for ${playerName ?? teamName}.`;
      if (eventType === "red_card") return `RED CARD! ${playerName ?? teamName} is off!`;
      if (eventType === "substitution") return `Substitution for ${teamName}.`;
      break;
    }
    case "cricket": {
      if (eventType === "wicket") return `WICKET! ${playerName ?? "Batter"} is out! ${teamName} take a wicket.`;
      if (eventType === "run") return `${value ?? 0} run${(value ?? 0) !== 1 ? "s" : ""} off the bat.`;
      if (eventType === "wide") return `Wide ball! Extra run to ${teamName}.`;
      if (eventType === "no_ball") return `No ball! Free hit incoming.`;
      if (eventType === "four") return `FOUR! ${playerName ?? "Batter"} hits through the covers!`;
      if (eventType === "six") return `SIX! ${playerName ?? "Batter"} launches it over the boundary!`;
      if (eventType === "over_complete") return `Over complete. End of over.`;
      break;
    }
    case "padel": {
      if (eventType === "point") return `Point to ${teamName}.`;
      if (eventType === "game") return `Game ${teamName}!`;
      if (eventType === "set") return `SET ${teamName}!`;
      break;
    }
    case "basketball": {
      if (eventType === "two_points") return `2 points for ${teamName}${playerName ? ` — ${playerName}` : ""}!`;
      if (eventType === "three_points") return `THREE! ${teamName}${playerName ? ` — ${playerName}` : ""}!`;
      if (eventType === "free_throw") return `Free throw converted by ${playerName ?? teamName}.`;
      if (eventType === "foul") return `Foul called on ${teamName}.`;
      break;
    }
    case "badminton": case "pickleball": {
      if (eventType === "point") return `Point to ${teamName}.`;
      if (eventType === "set") return `SET ${teamName}!`;
      break;
    }
  }
  return `${eventType} — ${teamName}`;
}
