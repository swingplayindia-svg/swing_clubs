"use client";

import { get, onValue, ref, set, update } from "firebase/database";
import { getRtdb } from "@/lib/firebase";
import type { LiveLineupPlayer, MatchLineups, TeamLineup } from "@/lib/schemas/live-lineup";
import { pushEvent } from "@/lib/rtdb/live-match";

export const lineupsPath = (matchId: string) => `liveMatches/${matchId}/lineups`;

export function subscribeLineups(
  matchId: string,
  cb: (lineups: MatchLineups | null) => void,
): () => void {
  return onValue(ref(getRtdb(), lineupsPath(matchId)), (snap) => {
    cb(snap.exists() ? (snap.val() as MatchLineups) : null);
  });
}

export async function updateTeamLineup(
  matchId: string,
  side: "home" | "away",
  lineup: Partial<TeamLineup>,
): Promise<void> {
  await update(ref(getRtdb(), `${lineupsPath(matchId)}/${side}`), {
    ...lineup,
    updatedAt: Date.now(),
  });
}

export async function setMatchLineups(matchId: string, lineups: MatchLineups): Promise<void> {
  await set(ref(getRtdb(), lineupsPath(matchId)), lineups);
}

export async function assignPlayerToSlot(
  matchId: string,
  side: "home" | "away",
  lineup: TeamLineup,
  player: LiveLineupPlayer,
  slotIndex: number,
): Promise<TeamLineup> {
  const slots = formationSlotCount(lineup);
  const onField = lineup.onField.filter((p) => p.userId !== player.userId);
  const bench = lineup.bench.filter((p) => p.userId !== player.userId);

  const displaced = onField.find((p) => p.slotIndex === slotIndex);
  const nextOnField = onField.filter((p) => p.slotIndex !== slotIndex);
  const placed: LiveLineupPlayer = {
    ...player,
    slotIndex,
    position: player.position,
  };
  nextOnField.push(placed);

  const nextBench = [...bench];
  if (displaced) {
    const { slotIndex: _s, ...rest } = displaced;
    nextBench.push(rest);
  }

  const updated: TeamLineup = {
    ...lineup,
    onField: nextOnField.sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99)),
    bench: nextBench,
    updatedAt: Date.now(),
  };

  await updateTeamLineup(matchId, side, updated);
  return updated;
}

export async function movePlayerToBench(
  matchId: string,
  side: "home" | "away",
  lineup: TeamLineup,
  userId: string,
): Promise<TeamLineup> {
  const player = lineup.onField.find((p) => p.userId === userId);
  if (!player) return lineup;

  const { slotIndex: _s, ...rest } = player;
  const updated: TeamLineup = {
    ...lineup,
    onField: lineup.onField.filter((p) => p.userId !== userId),
    bench: [...lineup.bench, rest],
    updatedAt: Date.now(),
  };
  await updateTeamLineup(matchId, side, updated);
  return updated;
}

export async function substitutePlayer(
  matchId: string,
  side: "home" | "away",
  lineup: TeamLineup,
  offUserId: string,
  onPlayer: LiveLineupPlayer,
  opts: { teamName: string; period: string; authorId: string; authorName: string },
): Promise<TeamLineup> {
  const off = lineup.onField.find((p) => p.userId === offUserId);
  const slotIndex = off?.slotIndex ?? lineup.onField.length;

  let updated = await movePlayerToBench(matchId, side, lineup, offUserId);
  updated = await assignPlayerToSlot(matchId, side, updated, onPlayer, slotIndex);

  await pushEvent(matchId, {
    type: "substitution",
    timestamp: Date.now(),
    teamId: side,
    teamName: opts.teamName,
    playerId: onPlayer.userId,
    playerName: onPlayer.displayName,
    description: `Substitution — ${onPlayer.displayName} on for ${off?.displayName ?? "player"}`,
    period: opts.period,
    undone: false,
    meta: { offUserId, onUserId: onPlayer.userId },
  });

  return updated;
}

function formationSlotCount(lineup: TeamLineup): number {
  return Math.max(
    lineup.onField.reduce((m, p) => Math.max(m, (p.slotIndex ?? 0) + 1), 0),
    lineup.onField.length + 1,
  );
}

export async function changeFormation(
  matchId: string,
  side: "home" | "away",
  lineup: TeamLineup,
  formation: string,
): Promise<void> {
  await updateTeamLineup(matchId, side, { formation, updatedAt: Date.now() });
}
