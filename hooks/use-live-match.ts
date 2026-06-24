"use client";

import { useEffect, useRef, useState } from "react";
import {
  subscribeLiveMatch, subscribeMatchMeta,
  updateMatchMeta, incrementScore, pushEvent, undoLastEvent,
  startMatch, pauseMatch, halfTimeMatch, resumeMatch, endMatch,
  claimScorekeeper, releaseScorekeeper,
} from "@/lib/rtdb/live-match";
import { subscribePresence, joinPresence } from "@/lib/rtdb/presence";
import { addCommentaryEntry, subscribeCommentary, autoCommentary } from "@/lib/rtdb/commentary";
import type { LiveMatchData, LiveMatchMeta, LiveEvent, CommentaryEntry, PresenceEntry } from "@/lib/schemas/live-match";

export function useLiveMatch(matchId: string | null) {
  const [data,        setData]        = useState<LiveMatchData | null>(null);
  const [meta,        setMeta]        = useState<LiveMatchMeta | null>(null);
  const [commentary,  setCommentary]  = useState<CommentaryEntry[]>([]);
  const [presence,    setPresence]    = useState<Record<string, PresenceEntry>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(subscribeLiveMatch(matchId, (d) => { setData(d); setIsConnected(true); }));
    unsubs.push(subscribeMatchMeta(matchId, setMeta));
    unsubs.push(subscribeCommentary(matchId, setCommentary));
    unsubs.push(subscribePresence(matchId, setPresence));

    return () => unsubs.forEach((u) => u());
  }, [matchId]);

  const events = data?.events
    ? Object.values(data.events).sort((a, b) => b.timestamp - a.timestamp)
    : [];

  return {
    data, meta, events, commentary, presence, isConnected,
    // Actions
    updateMeta: (u: Partial<LiveMatchMeta>) => matchId && updateMatchMeta(matchId, u),
    score: (team: "home" | "away", delta?: number) => matchId && incrementScore(matchId, team, delta),
    addEvent: (e: Omit<LiveEvent, "id">) => matchId && pushEvent(matchId, e),
    undoEvent: () => matchId && undoLastEvent(matchId),
    addCommentary: (e: Omit<CommentaryEntry, "id">) => matchId && addCommentaryEntry(matchId, e),
    start:    () => matchId && startMatch(matchId),
    pause:    () => matchId && pauseMatch(matchId),
    halfTime: () => matchId && halfTimeMatch(matchId),
    resume:   (period: string) => matchId && resumeMatch(matchId, period),
    end:      () => matchId && endMatch(matchId),
    claim:    (uid: string, name: string) => matchId && claimScorekeeper(matchId, uid, name),
    release:  () => matchId && releaseScorekeeper(matchId),
  };
}

export function useMatchClock(meta: LiveMatchMeta | null) {
  const [clock, setClock] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!meta) return;
    setClock(meta.clock ?? 0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (meta.status === "live") {
      const base = meta.clock ?? 0;
      const start = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setClock(base + elapsed);
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [meta?.status, meta?.clock]);

  return clock;
}
