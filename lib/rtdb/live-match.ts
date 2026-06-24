"use client";

import {
  ref, set, update, onValue, push, remove, get,
  serverTimestamp, type Database, type Unsubscribe,
} from "firebase/database";
import { getRtdb } from "@/lib/firebase";
import type { LiveMatchMeta, LiveEvent, LiveMatchData, LiveEventType } from "@/lib/schemas/live-match";

// ── Path helpers ──────────────────────────────────────────────────
export const matchPath    = (matchId: string) => `liveMatches/${matchId}`;
export const metaPath     = (matchId: string) => `liveMatches/${matchId}/meta`;
export const eventsPath   = (matchId: string) => `liveMatches/${matchId}/events`;
export const commentaryPath = (matchId: string) => `liveMatches/${matchId}/commentary`;
export const presencePath = (matchId: string) => `liveMatches/${matchId}/presence`;

// ── Initialise a live match in RTDB ──────────────────────────────
export async function initialiseLiveMatch(matchId: string, meta: Omit<LiveMatchMeta, "startedAt" | "updatedAt">): Promise<void> {
  const db = getRtdb();
  await set(ref(db, metaPath(matchId)), {
    ...meta,
    homeScore:       0,
    awayScore:       0,
    period:          "pre",
    clock:           0,
    scorekeeperUid:  null,
    scorekeeperName: null,
    status:          "live",
    startedAt:       Date.now(),
    updatedAt:       Date.now(),
  });
}

// ── Subscribe to all live match data ─────────────────────────────
export function subscribeLiveMatch(matchId: string, cb: (data: LiveMatchData | null) => void): () => void {
  const db = getRtdb();
  const unsub = onValue(ref(db, matchPath(matchId)), (snap) => {
    if (!snap.exists()) { cb(null); return; }
    const raw = snap.val() as LiveMatchData;
    cb({
      meta:       raw.meta       ?? ({} as LiveMatchMeta),
      events:     raw.events     ?? {},
      commentary: raw.commentary ?? {},
      presence:   raw.presence   ?? {},
    });
  });
  return unsub;
}

export function subscribeMatchMeta(matchId: string, cb: (meta: LiveMatchMeta | null) => void): () => void {
  const db = getRtdb();
  return onValue(ref(db, metaPath(matchId)), (snap) => {
    cb(snap.exists() ? (snap.val() as LiveMatchMeta) : null);
  });
}

// ── Update meta fields ────────────────────────────────────────────
export async function updateMatchMeta(matchId: string, updates: Partial<LiveMatchMeta>): Promise<void> {
  await update(ref(getRtdb(), metaPath(matchId)), { ...updates, updatedAt: Date.now() });
}

// ── Score mutations ───────────────────────────────────────────────
export async function incrementScore(matchId: string, team: "home" | "away", delta = 1): Promise<void> {
  const db    = getRtdb();
  const snap  = await get(ref(db, metaPath(matchId)));
  if (!snap.exists()) return;
  const meta  = snap.val() as LiveMatchMeta;
  const field = team === "home" ? "homeScore" : "awayScore";
  const next  = Math.max(0, (meta[field] ?? 0) + delta);
  await update(ref(db, metaPath(matchId)), { [field]: next, updatedAt: Date.now() });
}

// ── Push an event ────────────────────────────────────────────────
export async function pushEvent(
  matchId: string,
  event: Omit<LiveEvent, "id">,
): Promise<string> {
  const db  = getRtdb();
  const key = push(ref(db, eventsPath(matchId))).key!;
  await set(ref(db, `${eventsPath(matchId)}/${key}`), { ...event, id: key });
  return key;
}

// ── Undo last event ───────────────────────────────────────────────
export async function undoLastEvent(matchId: string): Promise<void> {
  const db   = getRtdb();
  const snap = await get(ref(db, eventsPath(matchId)));
  if (!snap.exists()) return;
  const events = Object.entries(snap.val() as Record<string, LiveEvent>)
    .filter(([, e]) => !e.undone)
    .sort(([, a], [, b]) => b.timestamp - a.timestamp);
  if (!events.length) return;
  const [key, event] = events[0];
  await update(ref(db, `${eventsPath(matchId)}/${key}`), { undone: true });
  // Reverse score effect
  if (event.type === "goal" || event.type === "penalty_goal") {
    await incrementScore(matchId, event.teamId as "home" | "away", -1);
  }
}

// ── Match status controls ─────────────────────────────────────────
export async function startMatch(matchId: string): Promise<void> {
  await updateMatchMeta(matchId, { status: "live", period: "first_half", startedAt: Date.now() });
}

export async function pauseMatch(matchId: string): Promise<void> {
  await updateMatchMeta(matchId, { status: "paused" });
}

export async function halfTimeMatch(matchId: string): Promise<void> {
  await updateMatchMeta(matchId, { status: "halftime", period: "halftime" });
}

export async function resumeMatch(matchId: string, period: string): Promise<void> {
  await updateMatchMeta(matchId, { status: "live", period });
}

export async function endMatch(matchId: string): Promise<void> {
  await updateMatchMeta(matchId, { status: "completed", period: "fulltime" });
}

// ── Scorekeeper lock ──────────────────────────────────────────────
export async function claimScorekeeper(matchId: string, uid: string, name: string): Promise<boolean> {
  const db   = getRtdb();
  const snap = await get(ref(db, metaPath(matchId)));
  if (!snap.exists()) return false;
  const meta = snap.val() as LiveMatchMeta;
  if (meta.scorekeeperUid && meta.scorekeeperUid !== uid) return false;
  await update(ref(db, metaPath(matchId)), { scorekeeperUid: uid, scorekeeperName: name, updatedAt: Date.now() });
  return true;
}

export async function releaseScorekeeper(matchId: string): Promise<void> {
  await update(ref(getRtdb(), metaPath(matchId)), { scorekeeperUid: null, scorekeeperName: null, updatedAt: Date.now() });
}
