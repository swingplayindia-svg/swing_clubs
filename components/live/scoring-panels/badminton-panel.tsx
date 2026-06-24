"use client";

import { updateMatchMeta, pushEvent } from "@/lib/rtdb/live-match";
import { addCommentaryEntry } from "@/lib/rtdb/commentary";
import type { LiveMatchMeta, BadmintonMeta } from "@/lib/schemas/live-match";

interface BadmintonPanelProps {
  matchId: string;
  meta: LiveMatchMeta;
  authorId: string;
  authorName: string;
  sport?: string;
}

export function BadmintonPanel({ matchId, meta, authorId, authorName, sport = "Badminton" }: BadmintonPanelProps) {
  const bm: BadmintonMeta = {
    sets: (meta.sportMeta as Partial<BadmintonMeta>)?.sets ?? [],
    currentSet: (meta.sportMeta as Partial<BadmintonMeta>)?.currentSet ?? 0,
    pointsHome: (meta.sportMeta as Partial<BadmintonMeta>)?.pointsHome ?? 0,
    pointsAway: (meta.sportMeta as Partial<BadmintonMeta>)?.pointsAway ?? 0,
  };

  const winThreshold = sport.toLowerCase() === "pickleball" ? 11 : 21;

  const awardPoint = async (team: "home" | "away") => {
    const newPtsHome = bm.pointsHome + (team === "home" ? 1 : 0);
    const newPtsAway = bm.pointsAway + (team === "away" ? 1 : 0);
    const teamName = team === "home" ? meta.homeTeamName : meta.awayTeamName;

    const checkWin = (h: number, a: number) =>
      (h >= winThreshold && h - a >= 2) || h >= winThreshold + 2 ||
      (a >= winThreshold && a - h >= 2) || a >= winThreshold + 2;

    if (checkWin(newPtsHome, newPtsAway)) {
      const winner = newPtsHome > newPtsAway ? "home" : "away";
      const newSets = [...bm.sets, [newPtsHome, newPtsAway] as [number, number]];
      const homeSets = newSets.filter(([h, a]) => h > a).length;
      const awaySets = newSets.filter(([h, a]) => a > h).length;

      const newBm: BadmintonMeta = { sets: newSets, currentSet: bm.currentSet + 1, pointsHome: 0, pointsAway: 0 };
      await updateMatchMeta(matchId, {
        sportMeta: newBm,
        homeScore: homeSets,
        awayScore: awaySets,
        ...(homeSets === 2 || awaySets === 2 ? { status: "completed" as any } : {}),
      });
      await Promise.all([
        pushEvent(matchId, {
          type: "set", timestamp: Date.now(), teamId: winner, teamName: winner === "home" ? meta.homeTeamName : meta.awayTeamName,
          description: `Set won! ${newPtsHome}-${newPtsAway}`, period: `Set ${bm.currentSet + 1}`, undone: false, meta: {},
        }),
        addCommentaryEntry(matchId, {
          authorId, authorName, authorRole: "auto", type: "milestone",
          text: `SET ${winner === "home" ? meta.homeTeamName : meta.awayTeamName}! ${newPtsHome}-${newPtsAway}`,
          period: `Set ${bm.currentSet + 1}`, visibility: "public", pinned: true, highlighted: true, createdAt: Date.now(),
        }),
      ]);
    } else {
      await updateMatchMeta(matchId, { sportMeta: { ...bm, pointsHome: newPtsHome, pointsAway: newPtsAway } });
      await addCommentaryEntry(matchId, {
        authorId, authorName, authorRole: "auto", type: "auto",
        text: `${newPtsHome}-${newPtsAway} — Point ${teamName}`,
        period: `Set ${bm.currentSet + 1}`, visibility: "public", pinned: false, highlighted: false, createdAt: Date.now(),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Current set score */}
      <div className="rounded-xl bg-muted/30 border border-border p-4 text-center">
        <p className="text-xs text-muted-foreground mb-2">Set {bm.currentSet + 1}</p>
        <div className="grid grid-cols-3 items-center gap-2">
          <p className="text-4xl font-bold text-foreground score-digits">{bm.pointsHome}</p>
          <p className="text-muted-foreground font-bold">—</p>
          <p className="text-4xl font-bold text-foreground score-digits">{bm.pointsAway}</p>
        </div>
        <div className="flex justify-between mt-2 px-2 text-xs text-muted-foreground">
          <span className="truncate">{meta.homeTeamName}</span>
          <span className="truncate">{meta.awayTeamName}</span>
        </div>
      </div>

      {/* Previous sets */}
      {bm.sets.length > 0 && (
        <div className="flex items-center gap-2 justify-center">
          {bm.sets.map(([h, a], i) => (
            <div key={i} className="rounded-lg bg-muted px-2 py-0.5 text-xs font-bold text-foreground">{h}-{a}</div>
          ))}
        </div>
      )}

      {/* Point buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => awardPoint("home")}
          className="py-5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold text-lg transition active:scale-95"
        >
          +1 {meta.homeTeamName.split(" ")[0]}
        </button>
        <button
          onClick={() => awardPoint("away")}
          className="py-5 rounded-xl bg-chart-3/20 hover:bg-chart-3/30 text-chart-3 border border-chart-3/30 font-bold text-lg transition active:scale-95"
        >
          +1 {meta.awayTeamName.split(" ")[0]}
        </button>
      </div>
      <p className="text-xs text-center text-muted-foreground">Win at {winThreshold} pts (2-point clear)</p>
    </div>
  );
}
